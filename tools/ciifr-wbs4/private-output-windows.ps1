param(
  [Parameter(Mandatory = $true)][ValidateSet('Create', 'Verify')][string]$Action,
  [Parameter(Mandatory = $true)][string]$Directory
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$created = $false

# Native creation applies the protected DACL before the directory becomes available.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CiiPrivateDirectory {
    [StructLayout(LayoutKind.Sequential)]
    public struct SecurityAttributes {
        public int Length;
        public IntPtr Descriptor;
        [MarshalAs(UnmanagedType.Bool)] public bool InheritHandle;
    }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool CreateDirectoryW(string path, ref SecurityAttributes attributes);
}
'@

function Assert-PrivateObject([string]$Path, [bool]$IsDirectory) {
  $attributes = [IO.File]::GetAttributes($Path)
  $isContainer = ($attributes -band [IO.FileAttributes]::Directory) -ne 0
  if ($isContainer -ne $IsDirectory -or
      ($attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe object' }
  $acl = if ($IsDirectory) { [IO.Directory]::GetAccessControl($Path) } else {
    [IO.File]::GetAccessControl($Path)
  }
  $owner = $acl.GetOwner([Security.Principal.SecurityIdentifier])
  $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  if ($owner.Value -ne $script:currentSid.Value -or $rules.Count -ne 1 -or
      ($IsDirectory -and !$acl.AreAccessRulesProtected)) { throw 'Unsafe descriptor' }
  $rule = $rules[0]
  if ($rule.IdentityReference.Value -ne $script:currentSid.Value -or
      $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
      $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl) {
    throw 'Unsafe access rule'
  }
}

try {
  $script:currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  if (![IO.Path]::IsPathRooted($Directory)) { throw 'Absolute path required' }
  if ($Action -eq 'Create') {
    $security = New-Object Security.AccessControl.DirectorySecurity
    $security.SetOwner($script:currentSid)
    $security.SetAccessRuleProtection($true, $false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule(
      $script:currentSid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $security.AddAccessRule($rule)
    $bytes = $security.GetSecurityDescriptorBinaryForm()
    $memory = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    try {
      [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $memory, $bytes.Length)
      $attributes = New-Object CiiPrivateDirectory+SecurityAttributes
      $attributes.Length = [Runtime.InteropServices.Marshal]::SizeOf($attributes)
      $attributes.Descriptor = $memory
      if (![CiiPrivateDirectory]::CreateDirectoryW($Directory, [ref]$attributes)) {
        throw 'Secure directory creation failed'
      }
      $created = $true
    } finally {
      [Runtime.InteropServices.Marshal]::FreeHGlobal($memory)
    }
  }
  Assert-PrivateObject $Directory $true
  if ($Action -eq 'Verify') {
    Assert-PrivateObject (Join-Path $Directory 'private-report.json') $false
    Assert-PrivateObject (Join-Path $Directory 'public-summary.json') $false
  }
  [Console]::WriteLine('PRIVATE_OUTPUT_ACL_OK')
} catch {
  if ($created) {
    try { [IO.Directory]::Delete($Directory, $false) } catch {
      [Console]::Error.WriteLine('PRIVATE_OUTPUT_EMPTY_DIRECTORY_RETAINED')
    }
  }
  [Console]::Error.WriteLine('PRIVATE_OUTPUT_ACL_REJECTED')
  exit 1
}

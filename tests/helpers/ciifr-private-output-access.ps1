param(
  [Parameter(Mandatory = $true)][string]$Directory,
  [ValidateSet('Check', 'Broaden')][string]$Action = 'Check'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# A real restricted token supplies a second Windows access check without changing accounts.
# This is a bounded token/DACL oracle, not a claim about all privileged machine principals.
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Principal;
public static class CiiAccessOracle {
    [StructLayout(LayoutKind.Sequential)]
    struct Mapping { public uint Read, Write, Execute, All; }
    [StructLayout(LayoutKind.Sequential)]
    struct SidAttributes { public IntPtr Sid; public uint Attributes; }
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError = true)]
    static extern bool OpenProcessToken(IntPtr process, uint rights, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true)]
    static extern bool DuplicateToken(IntPtr token, int level, out IntPtr duplicate);
    [DllImport("advapi32.dll", SetLastError = true)]
    static extern bool CreateRestrictedToken(IntPtr token, uint flags, uint disabled,
        IntPtr disabledSids, uint deleted, IntPtr privileges, uint restricted,
        ref SidAttributes restrictedSids, out IntPtr result);
    [DllImport("advapi32.dll")] static extern void MapGenericMask(ref uint access, ref Mapping mapping);
    [DllImport("advapi32.dll", SetLastError = true)]
    static extern bool AccessCheck(byte[] descriptor, IntPtr token, uint desired,
        ref Mapping mapping, byte[] privileges, ref uint length, out uint granted,
        [MarshalAs(UnmanagedType.Bool)] out bool allowed);

    static void Require(bool success) {
        if (!success) throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    static bool ReadAllowed(byte[] descriptor, IntPtr token) {
        var mapping = new Mapping { Read = 0x120089, Write = 0x120116,
            Execute = 0x1200a0, All = 0x1f01ff };
        uint desired = 1, length = 1024, granted;
        bool allowed;
        MapGenericMask(ref desired, ref mapping);
        Require(AccessCheck(descriptor, token, desired, ref mapping,
            new byte[length], ref length, out granted, out allowed));
        return allowed;
    }
    public static bool[] ReadChecks(byte[] descriptor) {
        IntPtr primary = IntPtr.Zero, current = IntPtr.Zero, restricted = IntPtr.Zero;
        IntPtr restrictedPrimary = IntPtr.Zero;
        IntPtr world = IntPtr.Zero;
        try {
            Require(OpenProcessToken(GetCurrentProcess(), 10, out primary));
            Require(DuplicateToken(primary, 2, out current));
            var sid = new SecurityIdentifier("S-1-1-0");
            var bytes = new byte[sid.BinaryLength];
            sid.GetBinaryForm(bytes, 0);
            world = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, world, bytes.Length);
            var restriction = new SidAttributes { Sid = world, Attributes = 0 };
            // DuplicateToken grants QUERY/IMPERSONATE, not DUPLICATE. Use the primary
            // handle for restriction, then obtain the impersonation token AccessCheck needs.
            Require(CreateRestrictedToken(primary, 1, 0, IntPtr.Zero, 0,
                IntPtr.Zero, 1, ref restriction, out restrictedPrimary));
            Require(DuplicateToken(restrictedPrimary, 2, out restricted));
            return new[] { ReadAllowed(descriptor, current), ReadAllowed(descriptor, restricted) };
        } finally {
            if (restricted != IntPtr.Zero) CloseHandle(restricted);
            if (restrictedPrimary != IntPtr.Zero) CloseHandle(restrictedPrimary);
            if (current != IntPtr.Zero) CloseHandle(current);
            if (primary != IntPtr.Zero) CloseHandle(primary);
            if (world != IntPtr.Zero) Marshal.FreeHGlobal(world);
        }
    }
}
'@
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$privatePath = [IO.Path]::Combine($Directory, 'private-report.json')
if ($Action -eq 'Broaden') {
  # The contrary fixture must be explicitly synthetic, never an actual inspector report.
  $data = [IO.File]::ReadAllText($privatePath) | ConvertFrom-Json
  if ($data.SYNTHETIC_ONLY -ne $true) { throw 'Synthetic fixture required' }
  $security = [IO.File]::GetAccessControl($privatePath)
  $world = New-Object Security.Principal.SecurityIdentifier('S-1-1-0')
  $security.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule(
    $world, 'Read', 'Allow')))
  [IO.File]::SetAccessControl($privatePath, $security)
}
$paths = @($Directory, $privatePath, [IO.Path]::Combine($Directory, 'public-summary.json'))
$result = for ($index = 0; $index -lt $paths.Count; $index++) {
  $security = if ($index -eq 0) { [IO.Directory]::GetAccessControl($paths[$index]) } else {
    [IO.File]::GetAccessControl($paths[$index])
  }
  $rules = @($security.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  $ownerOnly = $security.GetOwner([Security.Principal.SecurityIdentifier]).Value -eq $currentSid.Value
  $ownerOnly = $ownerOnly -and $rules.Count -eq 1 -and
    $rules[0].IdentityReference.Value -eq $currentSid.Value -and
    $rules[0].AccessControlType.ToString() -eq 'Allow'
  $checks = [CiiAccessOracle]::ReadChecks($security.GetSecurityDescriptorBinaryForm())
  [pscustomobject]@{ ownerOnly = $ownerOnly; currentRead = $checks[0]
    worldRestrictedRead = $checks[1]; inheritanceProtected = $security.AreAccessRulesProtected }
}
ConvertTo-Json -InputObject @($result) -Compress

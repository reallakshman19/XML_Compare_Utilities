<#
.SYNOPSIS
  I121 original CII Owner Windows Edge smoke and evidence collector.
.DESCRIPTION
  Tests checked-out Writer2 using genuine SHA-pinned Benchmark CII.
  No product edits, merges, invented bases, or Owner sign-off.
#>
[CmdletBinding()]
param(
  [switch]$HeadfulInspect,
  [switch]$SkipNpmInstall
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $repo

$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$root = Join-Path $repo ('test-results/i121-owner-edge-local/' + $stamp)
New-Item -ItemType Directory -Path $root -Force | Out-Null
$expected = [ordered]@{
  'S1.CII' = '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b'
  'S2.CII' = '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd'
  'S3.CII' = 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa'
  'T.CII' = 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060'
}
$tests = @(
  'tests/cii-workspace-i121-owner-edge-committed-inspect.test.mjs',
  'tests/cii-workspace-i121-wp2b-postinspect-revocation-hosted-edge.test.mjs',
  'tests/cii-workspace-i121-method-c-postinspect-heartbeat-native.test.mjs'
)
$results = New-Object System.Collections.ArrayList
$hashes = New-Object System.Collections.ArrayList
$state = [ordered]@{
  schema = 'I121.OwnerLocalEdgeEvidence.v1'
  status = 'NOT_RUN'
  timestamp_utc = (Get-Date).ToUniversalTime().ToString('o')
  repo = 'reallakshman19/XML_Compare_Utilities'
  target_issue = 121
  expected_qa_pr = 133
  git_head = ''
  git_branch = ''
  operating_system = [Environment]::OSVersion.VersionString
  powershell = $PSVersionTable.PSVersion.ToString()
  node = ''
  edge_version = ''
  edge_executable = ''
  original_files = $hashes
  tests = $results
  owner_local_interactive_acceptance = 'NOT_PERFORMED_BY_SCRIPT'
  independent_p2 = 'NOT_PERFORMED_BY_SCRIPT'
  full_compare_review_transfer = 'NOT_PERFORMED_BY_SCRIPT'
  failure = ''
}
$success = $false
try {
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'I121_REQUIRES_LOCAL_WINDOWS'
  }
  foreach ($tool in @('git','node','npm.cmd')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "I121_MISSING_TOOL_$tool" }
  }
  $state.git_head = ((& git rev-parse HEAD) | Select-Object -First 1).Trim()
  $state.git_branch = ((& git branch --show-current) | Select-Object -First 1).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $state.git_head) { throw 'I121_GIT_HEAD_UNAVAILABLE' }
  $dirty = @(& git status --porcelain --untracked-files=no)
  if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) {
    throw 'I121_TRACKED_CHECKOUT_DIRTY_USE_ISOLATED_CHECKOUT'
  }
  $state.node = ((& node --version) | Select-Object -First 1).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'I121_NODE_NOT_AVAILABLE' }
  $nodeMajor = [int]($state.node.TrimStart('v').Split('.')[0])
  if ($nodeMajor -lt 22) { throw 'I121_REQUIRES_NODE_22_OR_NEWER' }
  $edgePaths = @(
    (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft/Edge/Application/msedge.exe'),
    (Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Microsoft/Edge/Application/msedge.exe')
  )
  $edge = $edgePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $edge) { throw 'I121_MICROSOFT_EDGE_NOT_INSTALLED' }
  $state.edge_executable = $edge
  $state.edge_version = (Get-Item -LiteralPath $edge).VersionInfo.ProductVersion

  foreach ($name in $expected.Keys) {
    $file = Join-Path (Join-Path $repo 'Benchmark') $name
    if (-not (Test-Path -LiteralPath $file)) { throw "I121_MISSING_ORIGINAL_FILE_$name" }
    $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    [void]$hashes.Add([ordered]@{ file=$name; sha256=$actual; expected_sha256=$expected[$name]; exact=($actual -eq $expected[$name]) })
    if ($actual -ne $expected[$name]) {
      throw "I121_ORIGINAL_SHA_MISMATCH_$name : check Git line-ending conversion; do not normalize source bytes"
    }
  }
  foreach ($file in $tests) {
    if (-not (Test-Path -LiteralPath (Join-Path $repo $file))) { throw "I121_MISSING_TEST_$file" }
  }
  Write-Host "I121 exact original CII SHA receipts verified (4/4)."
  Write-Host "Git HEAD: $($state.git_head)"
  Write-Host "Microsoft Edge: $($state.edge_version)"
  if (-not $SkipNpmInstall) {
    Write-Host 'Installing pinned npm dependencies; this does not change tracked source.'
    & npm.cmd ci --ignore-scripts --no-audit --no-fund *> (Join-Path $root 'npm-ci.log')
    if ($LASTEXITCODE -ne 0) { throw 'I121_NPM_CI_FAILED_CHECK_LOG' }
  }
  $env:I121_BROWSER_CHANNEL = 'msedge'
  $env:I121_EDGE_HEADFUL = $(if($HeadfulInspect){'1'}else{'0'})
  foreach ($file in $tests) {
    $name = [IO.Path]::GetFileNameWithoutExtension($file)
    $log = Join-Path $root ($name+'.log')
    Write-Host "Running $name on actual Microsoft Edge..."
    & node --test $file *> $log
    $code = $LASTEXITCODE
    [void]$results.Add([ordered]@{ file=$file; exit_code=$code; result=$(if($code -eq 0){'PASS'}else{'FAIL'}); log=[IO.Path]::GetFileName($log) })
    if ($code -ne 0) { throw "I121_EDGE_TEST_FAILED_$name; see $log" }
    Write-Host "PASS: $name"
  }
  $success = $true
  $state.status = 'AUTOMATED_TESTS_PASS_OWNER_MANUAL_ACCEPTANCE_PENDING'
} catch {
  $state.status = 'FAIL_OR_INCOMPLETE'
  $state.failure = $_.Exception.Message
  Write-Warning $state.failure
} finally {
  $state.timestamp_completed_utc = (Get-Date).ToUniversalTime().ToString('o')
  $state | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'receipt.json') -Encoding UTF8
  $archive = $root + '.zip'
  try {
    Compress-Archive -Path (Join-Path $root '*') -DestinationPath $archive -Force
    Write-Host "I121 Owner Edge evidence archive: $archive"
  } catch {
    Write-Warning "Archive failed: $($_.Exception.Message); evidence directory remains $root"
  }
  Write-Host "Automated status: $($state.status)"
  Write-Host 'Owner sign-off, independent P2 and complete physically qualified Compare/Review/Transfer are NOT established by this script.'
}
if (-not $success) { exit 1 }

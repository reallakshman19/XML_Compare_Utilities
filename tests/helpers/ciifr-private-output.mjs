import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/** Independent native oracle: real descriptors and current/restricted-token AccessCheck. */
export function windowsOutputAccess(directory, action = 'Check') {
  const script = readFileSync(fileURLToPath(new URL('./ciifr-private-output-access.ps1', import.meta.url)), 'utf8');
  const data = Buffer.from(JSON.stringify({ directory, action })).toString('base64');
  const command = "$r=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" +
    data + "'))|ConvertFrom-Json; & {\n" + script + '\n} -Directory $r.directory -Action $r.action';
  const executable = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const child = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive',
    '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')],
  { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 16384 });
  assert.equal(child.status, 0, 'Independent Windows access oracle failed: ' + child.stderr);
  return JSON.parse(child.stdout);
}

export function assertPrivateOutputSecurity(directory) {
  if (process.platform === 'win32') {
    const objects = windowsOutputAccess(directory);
    assert.equal(objects.length, 3);
    for (const object of objects) {
      assert.equal(object.ownerOnly, true);
      assert.equal(object.currentRead, true);
      assert.equal(object.worldRestrictedRead, false);
    }
    assert.equal(objects[0].inheritanceProtected, true);
    return;
  }
  const paths = [directory, join(directory, 'private-report.json'), join(directory, 'public-summary.json')];
  for (const [index, path] of paths.entries()) {
    const info = statSync(path);
    assert.equal(info.mode & 0o777, index === 0 ? 0o700 : 0o600);
    assert.equal(info.uid, process.getuid());
  }
}

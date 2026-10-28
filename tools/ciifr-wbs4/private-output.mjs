import { mkdtemp, open, lstat, unlink, rmdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const reportNames = ['private-report.json', 'public-summary.json'];
const rejected = () => Error('FIVE_FIELD_PRIVATE_OUTPUT_REJECTED');

function windowsAcl(action, directory) {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !isAbsolute(systemRoot)) throw rejected();
  const executable = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = fileURLToPath(new URL('./private-output-windows.ps1', import.meta.url));
  const data = Buffer.from(JSON.stringify({ action, directory }), 'utf8').toString('base64');
  const command = "$request=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" +
    data + "'))|ConvertFrom-Json; & {\n" + readFileSync(script, 'utf8') +
    '\n} -Action $request.action -Directory $request.directory';
  // Literal commands are supported under Restricted policy; no policy setting is changed.
  const encoded = Buffer.from(command, 'utf16le').toString('base64');
  const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive',
    '-EncodedCommand', encoded],
  { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 8192 });
  if (result.error || result.status !== 0 || result.stdout.trim() !== 'PRIVATE_OUTPUT_ACL_OK') {
    throw rejected();
  }
}

async function createPrivateDirectory() {
  if (process.platform !== 'win32') return mkdtemp(join(tmpdir(), 'ciifr-five-field-'));
  const directory = join(tmpdir(), 'ciifr-five-field-' + randomBytes(12).toString('hex'));
  windowsAcl('Create', directory);
  return directory;
}

/** Validate custody before content is written; Windows mode bits are not an ACL oracle. */
export async function verifyPrivateOutput(directory) {
  if (process.platform === 'win32') return windowsAcl('Verify', directory);
  const paths = [directory, ...reportNames.map(name => join(directory, name))];
  for (const [index, path] of paths.entries()) {
    const info = await lstat(path);
    if (info.isSymbolicLink() || (index === 0 ? !info.isDirectory() : !info.isFile()) ||
      info.uid !== process.getuid() || (info.mode & 0o777) !== (index === 0 ? 0o700 : 0o600)) {
      throw rejected();
    }
  }
}

async function closeFiles(handles) {
  await Promise.all(handles.map(handle => handle.close()));
}

async function removeCreated(directory, names) {
  try {
    for (const name of names) await unlink(join(directory, name));
    await rmdir(directory);
  } catch {
    // Preserve unrelated contents and keep filesystem paths out of the rejection.
    throw rejected();
  }
}

/** Uses only fresh exclusive files; failure removes exact files owned by this operation. */
export async function writePrivateReports(report, summary) {
  const directory = await createPrivateDirectory();
  let handles = [];
  const created = [];
  try {
    for (const name of reportNames) {
      handles.push(await open(join(directory, name), 'wx', 0o600));
      created.push(name);
    }
    await verifyPrivateOutput(directory);
    for (const [index, value] of [report, summary].entries()) {
      await handles[index].writeFile(JSON.stringify(value, null, 2) + '\n', 'utf8');
    }
    return directory;
  } catch {
    await closeFiles(handles);
    handles = [];
    await removeCreated(directory, created);
    throw rejected();
  } finally {
    await closeFiles(handles);
  }
}

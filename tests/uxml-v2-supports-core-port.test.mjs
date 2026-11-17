// Batch 1: the real PlainDom core must match every recorded boundary call.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHES } from '../scripts/uxml-v2-benches.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtures = BENCHES
  .map((bench) => `fixtures/uxml-v2-supports/core-calls/${bench}.core-calls.json`);

test('restraint core port matches all 3,922 calls, mutations and callback events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-core-port-'));
  const reportPath = join(dir, 'gate-core.json');
  try {
    execFileSync(process.execPath, [
      'scripts/uxml-v2-core-calls-gate.mjs', 'uxml/v2/supports/core/index.js',
      ...fixtures, '--json', reportPath,
    ], { cwd: root, stdio: 'pipe' });
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.files, 7);
    assert.equal(report.calls, 3922);
    assert.equal(report.fail, 0);
    assert.equal(Object.keys(report.perFunction).length, 12);
    assert.deepEqual(report.firstFails, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

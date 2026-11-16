// Step 4 port: the engineering resolvers in uxml/v2/engineering give today's answer on every recorded call.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = ['G30', 'G30-NOJSON', 'G30-CUSTOM', 'RMS-BLOW-1', 'ACTIVE-AUDIT']
  .map((b) => `fixtures/uxml-v2-supports/core-calls/${b}.engineering-calls.json`);

function gate(impl) {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-eng-'));
  try {
    const out = join(dir, 'r.json');
    spawnSync(process.execPath, ['scripts/uxml-v2-core-calls-gate.mjs', impl, ...FILES, '--except', 'xmlCiiAncestorBranchName', '--json', out],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(readFileSync(out, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('engineering port: PASS 6,457 recorded calls over 24 functions, 0 failures', () => {
  const port = gate('uxml/v2/engineering/index.js');
  assert.equal(port.verdict, 'PASS');
  assert.equal(port.calls, 6457);
  assert.equal(port.fail, 0);
  assert.equal(Object.keys(port.perFunction).length, 24);
});

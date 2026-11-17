// Step 4 recordings: the engineering call gate passes its own replay and fails a port that refuses everything.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHES } from '../scripts/uxml-v2-benches.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = BENCHES
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

test('engineering recordings: replay PASS 37,456 calls over 24 functions; refuse FAIL every call', () => {
  const replay = gate('replay');
  assert.equal(replay.verdict, 'PASS');
  assert.equal(replay.calls, 37456);
  assert.equal(Object.keys(replay.perFunction).length, 24);
  const refuse = gate('refuse');
  assert.equal(refuse.verdict, 'FAIL');
  assert.equal(refuse.fail, 37456);
});

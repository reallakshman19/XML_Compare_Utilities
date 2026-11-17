// UXML step 3: the sub-step gate for buddy batches 2 and 3 passes today's own outputs and fails wrong ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GATE = fileURLToPath(new URL('../scripts/uxml-v2-substep-gate.mjs', import.meta.url));
const gate = (impl, substep) => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'substep-gate-')), 'r.json');
  try { execFileSync(process.execPath, [GATE, impl, substep, '--json', out], { stdio: 'pipe' }); } catch { /* exit 1 on FAIL */ }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
};

for (const substep of ['parent-loop', 'dtxr', 'atta', 'mds']) {
  test(`${substep}: today's recorded output passes on all 7 models`, () => {
    const r = gate('recorded', substep);
    assert.equal(r.verdict, 'PASS');
    assert.equal(Object.keys(r.perBench).length, 7);
  });
}

test('an unchanged input fails where today changes supports; a refusal fails everywhere', () => {
  assert.deepEqual(gate('identity', 'parent-loop').failing, ['G30', 'G30-NOJSON', 'G30-CUSTOM', 'ACTIVE-AUDIT', 'EF05']);
  assert.equal(gate('refuse', 'mds').failing.length, 7);
});

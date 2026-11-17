import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BENCHES } from '../scripts/uxml-v2-benches.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const impl = 'uxml/v2/supports/closures/index.js';
const recordings = BENCHES
  .map((bench) => `fixtures/uxml-v2-supports/core-calls/${bench}.substep-calls.json`);

function runGate(args, reportPath) {
  const result = spawnSync(process.execPath, [...args, '--json', reportPath], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output);
  return { result, output, reportPath };
}

function assertPass({ result, output, reportPath }) {
  assert.ifError(result.error);
  assert.equal(result.status, 0, output);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (Object.hasOwn(report, 'verdict')) assert.equal(report.verdict, 'PASS');
  assert.match(`${output}\n${JSON.stringify(report)}`, /\bPASS\b/);
  return report;
}

test('ATTA default closure, MDS closure and supportKindFromMember match the oracle', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxml-v2-closures-'));
  try {
    const atta = runGate(['scripts/uxml-v2-substep-gate.mjs', impl, 'atta'], path.join(tmp, 'gate-atta.json'));
    const mds = runGate(['scripts/uxml-v2-substep-gate.mjs', impl, 'mds'], path.join(tmp, 'gate-mds.json'));
    const member = runGate(['scripts/uxml-v2-core-calls-gate.mjs', impl, ...recordings, '--only', 'supportKindFromMember', '--inject-core=supportKindFromMember'], path.join(tmp, 'gate-member.json'));
    assertPass(atta);
    assertPass(mds);
    const memberReport = assertPass(member);
    assert.equal(memberReport.verdict, 'PASS');
    assert.equal(memberReport.calls, 65);
    assert.equal(memberReport.fail, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

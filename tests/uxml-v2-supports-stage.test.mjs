// The wired supports stage (branch pass -> parent loop + finish -> DTXR -> ATTA -> MDS) gives today's exact support table
// after every sub-stage on all 5 public models; the no-change control fails.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function gate(impl, ...more) {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-stage-'));
  const reportPath = join(dir, 'gate.json');
  try {
    const r = spawnSync(process.execPath, ['scripts/uxml-v2-supports-stage-gate.mjs', ...(impl === 'stage' ? [] : [impl]), ...more, '--json', reportPath],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { status: r.status, report: JSON.parse(readFileSync(reportPath, 'utf8')), out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('supports stage: exact support tables after every sub-stage on all 5 models', () => {
  const { status, report, out } = gate('stage');
  assert.equal(status, 0, out);
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
});

test('supports stage gate: the no-change control fails on every model', () => {
  const { report } = gate('identity');
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.failing.length, 5);
});

test('supports stage run again on its own output gives the same XML and support table (Owner 16 Nov)', () => {
  const { status, report, out } = gate('--rerun');
  assert.equal(status, 0, out);
  assert.equal(report.mode, 'rerun');
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
});

test('supports stage: every numbered node length equals its CII element length (Owner 16 Nov)', () => {
  const { status, report, out } = gate('--lengths');
  assert.equal(status, 0, out);
  assert.equal(report.mode, 'lengths');
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
});

test("lengths and rerun gates: the stage with today's length labels fail both on the four models with renumbered valve/flange nodes", () => {
  const RENUMBERED = ['G30', 'G30-CUSTOM', 'G30-NOJSON', 'RMS-BLOW-1'];
  for (const mode of ['--lengths', '--rerun']) {
    const { report } = gate('today-lengths', mode);
    assert.equal(report.verdict, 'FAIL', mode);
    assert.deepEqual(report.failing, RENUMBERED, mode);
  }
  assert.equal(gate('identity', '--lengths').report.verdict, 'FAIL');
});

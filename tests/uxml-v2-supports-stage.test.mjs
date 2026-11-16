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

test('supports stage records where each support value came from, with none unexplained (Owner 16 Nov)', () => {
  const { status, report, out } = gate('--provenance');
  assert.equal(status, 0, out);
  assert.equal(report.mode, 'provenance');
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
  // GOLDEN-30: 114 support values + 36 restraints; node 560's XML Z restraint is rewritten in place to CAESAR Y.
  assert.deepEqual(report.counts.G30.bySrc, { staged: 145, supportMapper: 2, psi116: 3 });
  assert.equal(report.counts.G30.rewritten, 1);
});

test('provenance gate: a record that calls everything input, and provenance without the diagnostics, both fail', () => {
  for (const impl of ['flat-provenance', 'no-evidence']) {
    const { report } = gate(impl, '--provenance');
    assert.equal(report.verdict, 'FAIL', impl);
    assert.equal(report.failing.length, 5, impl);
  }
});

test("supports stage writes today's process block and node facts: every value after every sub-stage equals today's (Owner 16 Nov)", () => {
  const { status, report, out } = gate('--fields');
  assert.equal(status, 0, out);
  assert.equal(report.mode, 'fields');
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
});

test("fields gate: the stage without today's preview run parity rows fails on every model", () => {
  const { report } = gate('no-preview-parity', '--fields');
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.failing.length, 5);
});

test("fields gate: the stage without today's process parity after DTXR fails on every model, from 03 on", () => {
  const { report } = gate('no-process-parity', '--fields');
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.failing.length, 5);
  for (const problems of Object.values(report.perBench)) assert.deepEqual(problems.map((p) => p.sub), ['03-atta-default', '04-mds-closure']);
});

test("supports stage warns about staged supports that became no restraint, and records duplicate removals, as today (Owner 14 Nov)", () => {
  const { status, report, out } = gate('--warnings');
  assert.equal(status, 0, out);
  assert.equal(report.mode, 'warnings');
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
});

test('warnings gate: the stage without the unmatched-support warnings fails on both GOLDEN-30 models with the orphan support', () => {
  const { report } = gate('no-unmatched-warnings', '--warnings');
  assert.equal(report.verdict, 'FAIL');
  assert.deepEqual(report.failing, ['G30', 'G30-CUSTOM']);
});

// The CII gate needs today's CII writer (a 3D_Converters checkout): UXML_CII_WRITER=<path to xml_to_cii2019_runtime_custody.py>.
const writer = process.env.UXML_CII_WRITER;
function ciiGate(...args) {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-cii-'));
  const reportPath = join(dir, 'gate.json');
  try {
    const r = spawnSync(process.execPath, ['scripts/uxml-v2-supports-cii-gate.mjs', ...args, '--writer', writer, '--json', reportPath], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { status: r.status, report: JSON.parse(readFileSync(reportPath, 'utf8')), out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("CII gate: today's CII writer gives the same CII from the stage as from today's XML on all 5 models", { skip: !writer && 'UXML_CII_WRITER not set' }, () => {
  const { status, report, out } = ciiGate();
  assert.equal(status, 0, out);
  assert.equal(report.benches, 5);
});
test("CII gate: the stage without today's process parity fails", { skip: !writer && 'UXML_CII_WRITER not set' }, () => {
  const { report } = ciiGate('no-process-parity');
  assert.equal(report.verdict, 'FAIL');
  assert.ok(report.failing.length >= 4);
});

// The supports stage writes exactly the rigid weights today's Run writes from the popup choices (GOLDEN-30: 5 suggested,
// RMS-BLOW-1: 20 typed), and nothing else changes; without the choices the gate fails.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function gate(...args) {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-weights-'));
  const reportPath = join(dir, 'gate.json');
  try {
    const r = spawnSync(process.execPath, ['scripts/uxml-v2-weights-gate.mjs', ...args, '--json', reportPath],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { status: r.status, report: JSON.parse(readFileSync(reportPath, 'utf8')), out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('weights gate: popup weights equal today on GOLDEN-30 and RMS-BLOW-1', () => {
  const { status, report, out } = gate();
  assert.equal(status, 0, out);
  assert.equal(report.verdict, 'PASS');
  assert.deepEqual(report.results.map((r) => [r.model, r.weightsRight, r.expectedWeights]), [['G30', 5, 5], ['RMS-BLOW-1', 20, 20]]);
});

test('weights gate control: without the popup choices it fails on every model', () => {
  const { status, report } = gate('no-choices');
  assert.equal(status, 1);
  assert.equal(report.verdict, 'FAIL');
  assert.ok(report.results.every((r) => r.verdict === 'FAIL' && r.differences.Weight === r.expectedWeights));
});

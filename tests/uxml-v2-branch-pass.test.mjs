// The step-4 branch pass port gives today's XML at the parent-loop start on all 5 public models; the no-change control fails.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function gate(impl) {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-branch-'));
  const reportPath = join(dir, 'gate.json');
  try {
    const r = spawnSync(process.execPath, ['scripts/uxml-v2-branch-pass-gate.mjs', impl, '--json', reportPath],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { status: r.status, report: JSON.parse(readFileSync(reportPath, 'utf8')), out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('branch pass port: PASS on all 5 models, each changed by today', () => {
  const { status, report, out } = gate('uxml/v2/engineering/BranchPass.js');
  assert.equal(status, 0, out);
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.benches, 5);
  assert.ok(Object.values(report.perBench).every((b) => b.changedByToday));
});

test('branch pass gate: the no-change control fails on every model', () => {
  const { report } = gate('identity');
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.failing.length, 5);
});

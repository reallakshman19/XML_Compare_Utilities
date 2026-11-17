// The four sub-steps on the real ports (no replay) give today's oracle tables on all 7 models.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMPL = 'uxml/v2/supports/SupportsChain.js';

for (const step of ['parent-loop', 'dtxr', 'atta', 'mds']) {
  test(`supports chain on the real ports: ${step} PASS on all models`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'uxml-v2-chain-'));
    const reportPath = join(dir, `gate-${step}.json`);
    try {
      const r = spawnSync(process.execPath, ['scripts/uxml-v2-substep-gate.mjs', IMPL, step, '--json', reportPath],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
      assert.equal(JSON.parse(readFileSync(reportPath, 'utf8')).verdict, 'PASS');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

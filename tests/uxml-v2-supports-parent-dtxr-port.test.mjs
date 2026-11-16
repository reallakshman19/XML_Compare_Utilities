import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHES } from '../scripts/uxml-v2-benches.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const recordings = (group) => BENCHES.map((bench) => `fixtures/uxml-v2-supports/core-calls/${bench}.${group}-calls.json`);
const GATES = [
  ['config', 'scripts/uxml-v2-core-calls-gate.mjs', 'uxml/v2/supports/config/EnrichmentConfig.js', ...recordings('config'), '--inject-core=parseXmlCiiEnrichmentConfig'],
  ['ledger', 'scripts/uxml-v2-core-calls-gate.mjs', 'uxml/v2/supports/ledger/index.js', ...recordings('ledger'), '--inject-core=decorateJsonTraceMember,decorateJsonTraceLedger'],
  ['parent', 'scripts/uxml-v2-substep-gate.mjs', 'uxml/v2/supports/parent/ParentSupportLoop.js', 'parent-loop'],
  ['dtxr', 'scripts/uxml-v2-substep-gate.mjs', 'uxml/v2/supports/dtxr/index.js', 'dtxr'],
];

test('S3 batch 2: config, ledger, parent loop and DTXR ports pass the four oracle gates', () => {
  const output = mkdtempSync(join(tmpdir(), 'uxml-b2-gates-'));
  try {
    const results = GATES.map(([name, ...args]) => {
      const reportPath = join(output, `gate-${name}.json`);
      const result = spawnSync(process.execPath, [...args, '--json', reportPath], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      });
      process.stdout.write(`\n--- ${name} ---\n${result.stdout || ''}`);
      process.stderr.write(result.stderr || '');
      let verdict;
      try { verdict = JSON.parse(readFileSync(reportPath, 'utf8')).verdict; } catch { verdict = 'NO_REPORT'; }
      return { name, status: result.status, verdict };
    });
    assert.deepEqual(results, GATES.map(([name]) => ({ name, status: 0, verdict: 'PASS' })));
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

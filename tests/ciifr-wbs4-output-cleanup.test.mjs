import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function failureChild(root, unrelated) {
  const helper = new URL('../tools/ciifr-wbs4/private-output.mjs', import.meta.url).href;
  const code = [
    'import {writePrivateReports} from ' + JSON.stringify(helper) + ';',
    "import {readdirSync,readFileSync,writeFileSync} from 'node:fs';",
    "import {join} from 'node:path';import {tmpdir} from 'node:os';",
    'let firstWritten=false;const summary={toJSON(){',
    'const d=join(tmpdir(),readdirSync(tmpdir())[0]);',
    "firstWritten=JSON.parse(readFileSync(join(d,'private-report.json'))).SYNTHETIC_ONLY===true;",
    unrelated ? "writeFileSync(join(d,'unrelated.txt'),'KEEP_SYNTHETIC');" : '',
    "throw Error('SYNTHETIC_PRIVATE_SENTINEL')}};",
    'try{await writePrivateReports({SYNTHETIC_ONLY:true},summary);process.exitCode=2}',
    "catch(error){console.log(JSON.stringify({firstWritten,neutral:error.message==='FIVE_FIELD_PRIVATE_OUTPUT_REJECTED',pathExposed:error.message.includes(tmpdir()),sentinelExposed:error.message.includes('SYNTHETIC_PRIVATE_SENTINEL')}))}"
  ].join('');
  const overrides = process.platform === 'win32' ? { TEMP: root, TMP: root } : { TMPDIR: root };
  return spawnSync(process.execPath, ['--input-type=module', '-e', code],
    { encoding: 'utf8', env: { ...process.env, ...overrides } });
}

for (const unrelated of [false, true]) {
  test('second-report failure preserves privacy and exact custody; unrelated=' + unrelated, () => {
    const root = mkdtempSync(join(tmpdir(), 'ciifr-output-cleanup-test-'));
    try {
      const child = failureChild(root, unrelated);
      assert.equal(child.status, 0, child.stderr);
      assert.equal(child.stderr, '');
      const observed = JSON.parse(child.stdout);
      const entries = readdirSync(root);
      if (unrelated) {
        assert.equal(entries.length, 1);
        assert(entries[0].startsWith('ciifr-five-field-'));
        const directory = join(root, entries[0]);
        assert.deepEqual(readdirSync(directory), ['unrelated.txt']);
        assert.equal(readFileSync(join(directory, 'unrelated.txt'), 'utf8'), 'KEEP_SYNTHETIC');
      } else {
        assert.deepEqual(entries, []);
      }
      assert.deepEqual(observed,
        { firstWritten: true, neutral: true, pathExposed: false, sentinelExposed: false });
    } finally {
      assert(root.startsWith(join(tmpdir(), 'ciifr-output-cleanup-test-')));
      rmSync(root, { recursive: true });
    }
  });
}

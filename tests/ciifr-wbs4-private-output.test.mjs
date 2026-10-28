import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writePrivateReports, verifyPrivateOutput } from '../tools/ciifr-wbs4/private-output.mjs';
import { assertPrivateOutputSecurity, windowsOutputAccess } from './helpers/ciifr-private-output.mjs';

test('private outputs have native owner access and deny the restricted-token read case', async () => {
  const directory = await writePrivateReports({ SYNTHETIC_ONLY: true }, { safe: true });
  try {
    assertPrivateOutputSecurity(directory);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'private-report.json'))),
      { SYNTHETIC_ONLY: true });
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'public-summary.json'))), { safe: true });
  } finally {
    assert(directory.startsWith(join(tmpdir(), 'ciifr-five-field-')));
    rmSync(directory, { recursive: true });
  }
});

test('independent native access oracle detects a real permissive synthetic-file contrast', async () => {
  const directory = await writePrivateReports({ SYNTHETIC_ONLY: true }, { safe: true });
  try {
    if (process.platform === 'win32') {
      const objects = windowsOutputAccess(directory, 'Broaden');
      assert.equal(objects[1].worldRestrictedRead, true);
    } else {
      chmodSync(join(directory, 'private-report.json'), 0o644);
    }
    assert.throws(() => assertPrivateOutputSecurity(directory), assert.AssertionError);
    await assert.rejects(verifyPrivateOutput(directory), /FIVE_FIELD_PRIVATE_OUTPUT_REJECTED/);
  } finally {
    assert(directory.startsWith(join(tmpdir(), 'ciifr-five-field-')));
    rmSync(directory, { recursive: true });
  }
});

test('partial serialization failure closes handles and removes exact newly created outputs', () => {
  const root = mkdtempSync(join(tmpdir(), 'ciifr-output-failure-'));
  try {
    const url = new URL('../tools/ciifr-wbs4/private-output.mjs', import.meta.url).href;
    const code = 'const {writePrivateReports}=await import(' + JSON.stringify(url) + ');' +
      'const value={SYNTHETIC_ONLY:true};value.self=value;' +
      "try{await writePrivateReports(value,{safe:true});process.exitCode=2}" +
      "catch(error){if(error.message!=='FIVE_FIELD_PRIVATE_OUTPUT_REJECTED')throw error}";
    const overrides = process.platform === 'win32' ? { TEMP: root, TMP: root } : { TMPDIR: root };
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code],
      { encoding: 'utf8', env: { ...process.env, ...overrides } });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, '');
    assert.deepEqual(readdirSync(root), []);
  } finally {
    assert(root.startsWith(join(tmpdir(), 'ciifr-output-failure-')));
    rmSync(root, { recursive: true });
  }
});

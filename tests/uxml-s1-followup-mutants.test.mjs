/**
 * UXML-S1-FOLLOWUP permanent mutation-kill tests.
 *
 * Each test starts with a GREEN positive check against an isolated copy of
 * the actual production CLI + mapper and the actual existing byte/parity
 * regression. It then changes exactly ONE parser expression in that private
 * temporary copy and REQUIRES the underlying regression to go RED. No
 * mutated code is ever committed or run against the live checkout.
 *
 * Synthetic fixtures only; no Owner PSI116 file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const FILES = [
  'uxml/UxmlConstants.js',
  'uxml/UxmlTypes.js',
  'uxml/UxmlProfileDetector.js',
  'uxml/UxmlValidationGate.js',
  'uxml/UxmlPsi116SchemaMapper.js',
  'tools/psi116-to-uxml.mjs',
  'tests/uxml-psi116-s1.test.mjs',
];

function inIsolatedReader(fn) {
  const root = mkdtempSync(join(tmpdir(), 'uxml-s1-mutant-'));
  try {
    for (const dir of ['uxml', 'tools', 'tests']) mkdirSync(join(root, dir));
    for (const file of FILES) copyFileSync(join(PROJECT_ROOT, file), join(root, file));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
    return fn(root);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

function runExistingParity(root, pattern) {
  return spawnSync(process.execPath, [
    '--test', '--test-name-pattern=' + pattern,
    'tests/uxml-psi116-s1.test.mjs',
  ], {
    cwd: root, encoding: 'utf8', timeout: 45_000, maxBuffer: 4 * 1024 * 1024,
    // Parent CI itself uses node --test. Do not inherit its worker marker:
    // otherwise Node silently skips the nested named regression tests.
    env: Object.fromEntries(Object.entries(process.env)
      .filter(([name]) => name !== 'NODE_TEST_CONTEXT')),
  });
}

function requireSingleMutation(root, file, before, after) {
  const path = join(root, file);
  const text = readFileSync(path, 'utf8');
  assert.equal(text.split(before).length - 1, 1, 'production mutation pin must match exactly once');
  writeFileSync(path, text.replace(before, after));
}

function assertKilled(root, pattern, mutantName) {
  const mutant = runExistingParity(root, pattern);
  assert.equal(mutant.error, undefined, mutant.error?.message);
  const logs = mutant.stdout + '\n' + mutant.stderr;
  assert.notEqual(mutant.status, 0,
    mutantName + ' survived: the original parity assertion was not sensitive\n' + logs);
  assert.match(logs, /^not ok \d+ -/m,
    mutantName + ' must fail the targeted original test, not a setup step');
  assert.match(logs, /# fail 1\b/,
    mutantName + ' must fail exactly the one selected positive test');
  // Keep evidence inside GREEN CI logs even though the nested regression ran RED.
  process.stdout.write('RED_VERIFIED ' + mutantName + ' status=' + mutant.status +
    ' targeted original test failed; ' +
    (logs.match(/# fail \d+/)?.[0] || 'missing fail count') + '\n');
}

test('MUTANT_KILL_IGNORE_BOM: removing ignoreBOM must fail actual byte-SHA regression', () => {
  inIsolatedReader(root => {
    const pattern = 'CLI raw file-byte SHA exactly matches';
    const clean = runExistingParity(root, pattern);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.match(clean.stdout, /# pass 1\b/, 'positive regression MUST actually execute');
    requireSingleMutation(root, 'tools/psi116-to-uxml.mjs',
      '{fatal: true, ignoreBOM: true}', '{fatal: true}');
    assertKilled(root, pattern, 'NO_IGNORE_BOM');
  });
});

test('MUTANT_KILL_CRLF_TEXT: removing physical CRLF normalisation must fail actual XML parity regression', () => {
  inIsolatedReader(root => {
    const pattern = 'XML 1.0 CRLF/lone CR in text';
    const clean = runExistingParity(root, pattern);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.match(clean.stdout, /# pass 1\b/, 'positive regression MUST actually execute');
    requireSingleMutation(root, 'uxml/UxmlPsi116SchemaMapper.js',
      "decodeEntities(text.slice(at, until).replace(/\\r\\n?/g, '\\n'))",
      'decodeEntities(text.slice(at, until))');
    assertKilled(root, pattern, 'NO_CRLF_NORMALIZATION');
  });
});

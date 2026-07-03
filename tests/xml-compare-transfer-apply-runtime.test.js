import assert from 'node:assert/strict';
import fs from 'node:fs';

// Verifies the browser transfer runtime exposes the explicit staged workflow:
// stage, clear, apply, export patched XML, and audit export are all wired to the
// click handler rather than being passive markup.

const source = fs.readFileSync('tabs/xml-compare-transfer-apply-runtime.js', 'utf8');

for (const action of [
  'stage-scoped-transfer',
  'clear-staged-transfer',
  'apply-scoped-transfer',
  'export-scoped-transfer',
  'export-transfer-audit',
]) {
  assert.match(source, new RegExp(`data-xml-compare-action="${action}"`));
  assert.match(source, new RegExp(`\\[data-xml-compare-action="${action}"\\]`));
}

assert.match(source, /Stage Transfer before applying or exporting/);
assert.match(source, /xml-compare-transfer-audit\.json/);
assert.match(source, /application\/json;charset=utf-8/);

console.log('XML Compare transfer apply runtime tests passed');

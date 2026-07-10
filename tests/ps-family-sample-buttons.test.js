import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyInputReadinessFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { loadSampleTextIntoTextarea, loadTextFileIntoTextarea } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-file-io.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
  PS_FAMILY_SAMPLE_INPUTS,
  listPsFamilySampleInputs,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

function normalizeText(value) {
  return String(value).replace(/\r\n/g, '\n').trimEnd();
}

function assertSampleMatchesFile(sampleText, path) {
  assert.equal(normalizeText(sampleText), normalizeText(readFileSync(path, 'utf8')));
}

assert.equal(listPsFamilySampleInputs().length, 3);
assert.ok(PS_FAMILY_SAMPLE_INPUTS.xml.text.includes('Sample Clash 1'));
assert.ok(PS_FAMILY_SAMPLE_INPUTS.expected.text.includes('PS-90001.1'));
assert.ok(PS_FAMILY_SAMPLE_INPUTS.details.text.includes('SAMPLE-100-D90001'));

assertSampleMatchesFile(PS_FAMILY_SAMPLE_CLASH_XML, 'samples/ps-family-clash-audit/sample-clash.xml');
assertSampleMatchesFile(PS_FAMILY_SAMPLE_EXPECTED_CSV, 'samples/ps-family-clash-audit/sample-expected.csv');
assertSampleMatchesFile(PS_FAMILY_SAMPLE_DETAIL_CSV, 'samples/ps-family-clash-audit/sample-element-detail.csv');

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('Load sample clash XML'));
assert.ok(shell.includes('Load sample expected CSV'));
assert.ok(shell.includes('Load sample detail CSV'));

const textarea = { value: 'manual value' };
const statusNode = { textContent: 'No file selected' };
loadSampleTextIntoTextarea(PS_FAMILY_SAMPLE_INPUTS.xml, textarea, statusNode);
assert.equal(textarea.value, PS_FAMILY_SAMPLE_CLASH_XML);
assert.equal(statusNode.textContent, 'Official sample clash XML loaded');

await loadTextFileIntoTextarea({ name: 'manual.xml', size: 6, text: async () => 'manual' }, textarea, statusNode);
assert.equal(textarea.value, 'manual');
assert.equal(statusNode.textContent, 'manual.xml (6 bytes)');

const readiness = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

assert.equal(readiness.blocking, false);
assert.equal(readiness.summary.sourceFamily, 'PS-90001');
assert.equal(readiness.summary.xmlClashCount, 2);
assert.equal(readiness.summary.expectedCount, 3);
assert.equal(readiness.summary.detailCount, 3);
assert.equal(readiness.summary.errorCount, 0);

console.log('ps-family-sample-buttons tests passed');

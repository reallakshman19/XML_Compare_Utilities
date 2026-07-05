import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyInputReadinessFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { renderPsFamilyReadiness } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';

function diagnosticCodes(readiness) {
  return new Set(readiness.diagnostics.map((item) => item.code));
}

const sampleReadiness = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: readFileSync('samples/ps-family-clash-audit/sample-clash.xml', 'utf8'),
  expectedCsvText: readFileSync('samples/ps-family-clash-audit/sample-expected.csv', 'utf8'),
  detailCsvText: readFileSync('samples/ps-family-clash-audit/sample-element-detail.csv', 'utf8'),
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

assert.equal(sampleReadiness.blocking, false);
assert.equal(sampleReadiness.summary.sourceFamily, 'PS-90001');
assert.equal(sampleReadiness.summary.xmlClashCount, 2);
assert.equal(sampleReadiness.summary.expectedCount, 3);
assert.equal(sampleReadiness.summary.detailCount, 3);
assert.equal(sampleReadiness.summary.positionParsedCount, 3);
assert.equal(sampleReadiness.summary.posFamilyCount, 2);
assert.match(renderPsFamilyReadiness(sampleReadiness), /Input Readiness/);
assert.match(renderPsFamilyReadiness(sampleReadiness), /PS-90001/);

const emptyReadiness = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: '',
  expectedCsvText: '',
  detailCsvText: '',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
assert.equal(emptyReadiness.blocking, true);
assert.ok(diagnosticCodes(emptyReadiness).has('EMPTY_CLASH_XML'));
assert.ok(diagnosticCodes(emptyReadiness).has('EMPTY_EXPECTED_CSV'));
assert.ok(diagnosticCodes(emptyReadiness).has('EMPTY_ELEMENT_DETAIL_CSV'));
assert.ok(diagnosticCodes(emptyReadiness).has('UNKNOWN_SOURCE_FAMILY'));

const badExpected = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: '<exchange><clashresult name="C"></clashresult></exchange>',
  expectedCsvText: 'Other\nPS-A\n',
  detailCsvText: 'Name of the element,Position\nPS-A,E 0mm S 0mm U 0mm\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
assert.ok(diagnosticCodes(badExpected).has('EXPECTED_NAME_HEADER_MISSING'));

const badDetails = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: '<exchange><clashresult name="C"></clashresult></exchange>',
  expectedCsvText: 'Item Name\n/PS-1.1\n',
  detailCsvText: 'Other,Position\nPS-1.1,E 0mm S 0mm U 0mm\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
assert.ok(diagnosticCodes(badDetails).has('DETAIL_NAME_HEADER_MISSING'));

const badPosition = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: '<exchange><clashresult name="C"></clashresult></exchange>',
  expectedCsvText: 'Item Name\n/PS-1.1\n',
  detailCsvText: 'Name of the element,Position\nPS-1.1,bad position\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
assert.ok(diagnosticCodes(badPosition).has('POSITION_PARSE_FAILED'));
assert.equal(badPosition.summary.positionMissingCount, 1);

const noPositionHeader = createPsFamilyInputReadinessFromTextInputs({
  clashXmlText: '<exchange><clashresult name="C"></clashresult></exchange>',
  expectedCsvText: 'Item Name\n/PS-1.1\n',
  detailCsvText: 'Name of the element\nPS-1.1\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});
assert.ok(diagnosticCodes(noPositionHeader).has('POSITION_HEADER_MISSING'));

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.match(shell, /Check Readiness/);
assert.match(shell, /data-psfa="readiness"/);

console.log('ps-family-readiness tests passed');

import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { createPsFamilyActiveReportExport, createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const coverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(coverage.includes('<details>'));
assert.ok(coverage.includes('View details for PS-90001.1'));
assert.ok(coverage.includes('<b>Line family</b>'));
assert.ok(coverage.includes('D90001'));
assert.ok(coverage.includes('<b>POSFamily ID</b>'));
assert.ok(coverage.includes('<b>Pipe</b>'));
assert.ok(coverage.includes('SAMPLE-100-D90001-31441C4-PP-01'));
assert.ok(coverage.includes('<b>Support text</b>'));
assert.ok(coverage.includes('Sample guide'));
assert.ok(coverage.includes('<b>Reference</b>'));
assert.ok(coverage.includes('=SAMPLE/1'));

const clashRows = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(clashRows.includes('View details for Sample Clash 1'));
assert.ok(clashRows.includes('<b>Source path hierarchy</b>'));
assert.ok(clashRows.includes('SAMPLE-CU-SU'));
assert.ok(clashRows.includes('<b>Against path hierarchy</b>'));
assert.ok(clashRows.includes('SAMPLE-CU-PI'));
assert.ok(clashRows.includes('<b>Branch node</b>'));
assert.ok(clashRows.includes('SAMPLE-100-D90001-31441C4-PP-01/B1'));
assert.ok(clashRows.includes('<b>Distance</b>'));
assert.ok(clashRows.includes('-0.01'));
assert.ok(clashRows.includes('<b>Point</b>'));
assert.ok(clashRows.includes('X 1 / Y 2 / Z 3'));

const filteredClashRows = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, 'D90001');
assert.ok(filteredClashRows.includes('Showing 1 of 1 matched rows from 2 total rows.'));
assert.ok(filteredClashRows.includes('View details for Sample Clash 1'));
assert.ok(!filteredClashRows.includes('View details for Sample Clash 2'));
assert.ok(!filteredClashRows.includes('PS-90002.1'));

const exports = createPsFamilyAuditExports(audit);
assert.equal(createPsFamilyActiveReportExport(audit, 'coverage').text, exports.coverageCsv);
assert.equal(createPsFamilyActiveReportExport(audit, 'clashRows').text, exports.clashRowsCsv);
assert.match(exports.clashRowsCsv, /PS-90002\.1/);

console.log('ps-family-row-details tests passed');

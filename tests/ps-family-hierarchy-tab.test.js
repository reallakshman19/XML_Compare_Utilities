import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.some((tab) => tab.key === 'hierarchy'));
assert.ok(shell.includes('Hierarchy'));

const hierarchy = renderPsFamilyReports(audit, 'hierarchy', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(hierarchy.includes('Source hierarchy'));
assert.ok(hierarchy.includes('Against hierarchy'));
assert.ok(hierarchy.includes('Source Path Evidence'));
assert.ok(hierarchy.includes('Against Path Evidence'));
assert.ok(hierarchy.includes('SAMPLE-CU-SU'));
assert.ok(hierarchy.includes('PS-90001-BAR-1'));
assert.ok(hierarchy.includes('SAMPLE-CU-PI'));
assert.ok(hierarchy.includes('SAMPLE-100-D90001-31441C4-PP-01/B1'));
assert.ok(hierarchy.includes('D90001'));
assert.ok(hierarchy.includes('PS-90001.1'));
assert.ok(hierarchy.includes('Hierarchy search filters source and against evidence rows by visible row values.'));

const filtered = renderPsFamilyReports(audit, 'hierarchy', PS_FAMILY_CLASH_AUDIT_CONFIG, 'D90001');
assert.ok(filtered.includes('Showing 0 of 0 matched rows from 2 total rows.'));
assert.ok(filtered.includes('Showing 1 of 1 matched rows from 2 total rows.'));
assert.ok(filtered.includes('SAMPLE-100-D90001-31441C4-PP-01/B1'));
assert.ok(!filtered.includes('SAMPLE-50-P90002-31441C4-PP-01/B1'));

const coverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
const clashRows = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(coverage.includes('View details for PS-90001.1'));
assert.ok(clashRows.includes('View details for Sample Clash 1'));

console.log('ps-family-hierarchy-tab tests passed');

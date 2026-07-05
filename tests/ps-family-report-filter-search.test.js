import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import {
  PS_FAMILY_SAMPLE_CLASH_XML,
  PS_FAMILY_SAMPLE_DETAIL_CSV,
  PS_FAMILY_SAMPLE_EXPECTED_CSV,
} from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { filterPsFamilyRows, renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  clashXmlText: PS_FAMILY_SAMPLE_CLASH_XML,
  expectedCsvText: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  detailCsvText: PS_FAMILY_SAMPLE_DETAIL_CSV,
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('Report search'));
assert.ok(shell.includes('data-psfa="report-search"'));

const coverageByLine = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, 'd90001');
assert.ok(coverageByLine.includes('Showing 3 of 3 matched rows from 3 total rows.'));
assert.ok(coverageByLine.includes('PS-90001.1'));
assert.ok(coverageByLine.includes('Copy-(2)-of-PS-90001.3'));

const coverageByMember = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, 'ps-90001.1');
assert.ok(coverageByMember.includes('Showing 1 of 1 matched rows from 3 total rows.'));
assert.ok(coverageByMember.includes('PS-90001.1'));
assert.ok(!coverageByMember.includes('PS-90001.2</td>'));

const clashByLine = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, 'D90001');
assert.ok(clashByLine.includes('Showing 1 of 1 matched rows from 2 total rows.'));
assert.ok(clashByLine.includes('PS-90001.1'));
assert.ok(!clashByLine.includes('PS-90002.1'));

const clashByMember = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, 'ps-90001.1');
assert.ok(clashByMember.includes('Showing 1 of 1 matched rows from 2 total rows.'));
assert.ok(clashByMember.includes('SAMPLE-100-D90001-31441C4-PP-01/B1'));

const unfilteredCoverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(unfilteredCoverage.includes('Showing 3 of 3 rows.'));
assert.ok(unfilteredCoverage.includes('PS-90001.2'));
assert.ok(unfilteredCoverage.includes('Copy-(2)-of-PS-90001.3'));

const rows = [{ value: 'Alpha' }, { value: 'beta' }];
const headers = [{ label: 'Value', value: (row) => row.value }];
assert.deepEqual(filterPsFamilyRows(headers, rows, 'ALPHA'), [rows[0]]);
assert.equal(filterPsFamilyRows(headers, rows, '').length, 2);

const exports = createPsFamilyAuditExports(audit);
assert.match(exports.coverageCsv, /PS-90001\.2/);
assert.match(exports.coverageCsv, /Copy-\(2\)-of-PS-90001\.3/);
assert.match(exports.clashRowsCsv, /PS-90002\.1/);

console.log('ps-family-report-filter-search tests passed');

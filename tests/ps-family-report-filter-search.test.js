import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { filterPsFamilyRows, renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = {
  summary: { sourceFamily: 'PS-90001', coveragePct: 33.33, expectedCount: 3, foundExactCount: 1, missingCount: 2, outOfFamilyCount: 1, duplicateMemberCount: 0, unexpectedInFamilyCount: 0, posFamilyCount: 2 },
  coverageRows: [
    { expectedMember: 'PS-90001.1', status: 'FOUND', clashNames: ['Sample Clash 1'], posFamilyId: 'POSF-000001', lineFamily: 'D90001', lineFamilies: [], fullLineTags: [], pipe: 'SAMPLE-100-D90001-31441C4-PP-01', supportText: 'Sample guide' },
    { expectedMember: 'PS-90001.2', status: 'MISSING', clashNames: [], posFamilyId: 'POSF-000001', lineFamily: 'D90001', lineFamilies: [], fullLineTags: [], pipe: 'SAMPLE-100-D90001-31441C4-PP-01', supportText: 'Sample missing support' },
    { expectedMember: 'Copy-(2)-of-PS-90001.3', status: 'MISSING', clashNames: [], posFamilyId: 'POSF-000002', lineFamily: 'D90001', lineFamilies: [], fullLineTags: [], pipe: 'SAMPLE-100-D90001-31441C4-PP-01', supportText: 'Sample copy support' },
  ],
  clashRows: [
    { clashName: 'Sample Clash 1', distance: -0.01, familyStatus: 'IN_FAMILY', source: { familyRoot: 'PS-90001', objectName: 'PS-90001-BAR-1', path: [] }, against: { memberName: 'PS-90001.1', pipe: { lineFamily: 'D90001', fullBranchNode: 'SAMPLE-100-D90001-31441C4-PP-01/B1' }, path: [] }, elementDetail: { posFamilyId: 'POSF-000001', lineFamily: 'D90001' } },
    { clashName: 'Sample Clash 2', distance: -0.005, familyStatus: 'OUT_OF_FAMILY', source: { familyRoot: 'PS-90001', objectName: 'PS-90001-BAR-1', path: [] }, against: { memberName: 'PS-90002.1', pipe: { lineFamily: 'P90002', fullBranchNode: 'SAMPLE-50-P90002-31441C4-PP-01/B1' }, path: [] }, elementDetail: { posFamilyId: '', lineFamily: '' } },
  ],
  missingRows: [],
  outOfFamilyRows: [],
  duplicateRows: [],
  lineFamilyRows: [],
  posFamilyRows: [],
  sourceVsPosFamilyRows: [],
  diagnostics: [],
};

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('Report search'));
assert.ok(shell.includes('data-psfa="report-search"'));

const coverageByLine = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, 'd90001');
assert.ok(coverageByLine.includes('Showing 3 of 3 matched rows from 3 total rows.'));
assert.ok(coverageByLine.includes('PS-90001.1'));
assert.ok(coverageByLine.includes('Copy-(2)-of-PS-90001.3'));

const coverageByMember = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, 'PS-90001.1');
assert.ok(coverageByMember.includes('Showing 1 of 1 matched rows from 3 total rows.'));
assert.ok(coverageByMember.includes('PS-90001.1'));
assert.ok(!coverageByMember.includes('PS-90001.2</td>'));

const clashByLine = renderPsFamilyReports(audit, 'clashRows', PS_FAMILY_CLASH_AUDIT_CONFIG, 'D90001');
assert.ok(clashByLine.includes('Showing 1 of 1 matched rows from 2 total rows.'));
assert.ok(clashByLine.includes('PS-90001.1'));
assert.ok(!clashByLine.includes('PS-90002.1'));

const unfilteredCoverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(unfilteredCoverage.includes('Showing 3 of 3 rows.'));
assert.ok(unfilteredCoverage.includes('PS-90001.2'));
assert.ok(unfilteredCoverage.includes('Copy-(2)-of-PS-90001.3'));

const rows = [{ value: 'Alpha' }, { value: 'beta' }];
const headers = [{ label: 'Value', value: (row) => row.value }];
assert.deepEqual(filterPsFamilyRows(headers, rows, 'ALPHA'), [rows[0]]);
assert.equal(filterPsFamilyRows(headers, rows, '').length, 2);

const tabSource = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
assert.match(tabSource, /createPsFamilyAuditExports\(state\.audit\)/);

const exports = createPsFamilyAuditExports(audit);
assert.match(exports.coverageCsv, /PS-90001\.2/);
assert.match(exports.coverageCsv, /Copy-\(2\)-of-PS-90001\.3/);
assert.match(exports.clashRowsCsv, /PS-90002\.1/);

console.log('ps-family-report-filter-search tests passed');

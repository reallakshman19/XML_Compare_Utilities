import assert from 'node:assert/strict';
import { createPsFamilyActiveReportExport, createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = {
  summary: { sourceFamily: 'PS-90001', coveragePct: 50, expectedCount: 2, foundExactCount: 1, missingCount: 1, outOfFamilyCount: 0, duplicateMemberCount: 0, unexpectedInFamilyCount: 0, posFamilyCount: 1 },
  coverageRows: [
    { expectedMember: 'PS-90001.1', status: 'FOUND', clashNames: ['Sample Clash 1'], againstMembers: ['PS-90001.1'], sourceObjects: ['PS-90001-BAR-1'], lineFamily: 'D90001', lineFamilies: ['D90001'], fullLineTags: ['SAMPLE-100-D90001-31441C4-PP-01'], branchNodes: ['SAMPLE-100-D90001-31441C4-PP-01/B1'], posFamilyId: 'POSF-000001', p1bore: 100, pipe: 'SAMPLE-100-D90001-31441C4-PP-01', supportText: 'Sample guide', supportGap: '10', reference: '=SAMPLE/1', position: { e: 1000, s: 2000, u: 3000 }, isometricNotes: 'Sample note', remarks: 'Expected member found in clash XML.' },
    { expectedMember: 'PS-90001.2', status: 'MISSING', clashNames: [], againstMembers: [], sourceObjects: [], lineFamily: 'D90001', lineFamilies: ['D90001'], fullLineTags: ['SAMPLE-100-D90001-31441C4-PP-01'], branchNodes: [], posFamilyId: 'POSF-000001', p1bore: 100, pipe: 'SAMPLE-100-D90001-31441C4-PP-01', supportText: 'Sample missing support', supportGap: '', reference: '=SAMPLE/2', position: { e: 1020, s: 2000, u: 3000 }, isometricNotes: '', remarks: 'Expected member not found in clash XML.' },
  ],
  clashRows: [
    { clashName: 'Sample Clash 1', distance: -0.01, point: { x: 1, y: 2, z: 3 }, familyStatus: 'IN_FAMILY', source: { familyRoot: 'PS-90001', objectName: 'PS-90001-BAR-1', path: ['File', 'SAMPLE.rvm', 'SAMPLE-CU-SU', 'PS-90001', 'PS-90001/MAIN', 'PS-90001-BAR-1'] }, against: { memberName: 'PS-90001.1', pipe: { lineFamily: 'D90001', fullLineTag: 'SAMPLE-100-D90001-31441C4-PP-01', fullBranchNode: 'SAMPLE-100-D90001-31441C4-PP-01/B1' }, path: ['File', 'SAMPLE.rvm', 'SAMPLE-CU-PI', 'SAMPLE-100-D90001-31441C4-PP-01', 'SAMPLE-100-D90001-31441C4-PP-01/B1', 'PS-90001.1'] }, elementDetail: { posFamilyId: 'POSF-000001', p1bore: 100, pipe: 'SAMPLE-100-D90001-31441C4-PP-01', lineFamily: 'D90001', supportText: 'Sample guide', supportGap: '10', reference: '=SAMPLE/1', position: { e: 1000, s: 2000, u: 3000 }, isometricNotes: 'Sample note' } },
    { clashName: 'Sample Clash 2', distance: -0.005, point: { x: 4, y: 5, z: 6 }, familyStatus: 'OUT_OF_FAMILY', source: { familyRoot: 'PS-90001', objectName: 'PS-90001-BAR-1', path: ['File', 'SAMPLE.rvm', 'SAMPLE-CU-SU'] }, against: { memberName: 'PS-90002.1', pipe: { lineFamily: 'P90002', fullLineTag: 'SAMPLE-50-P90002-31441C4-PP-01', fullBranchNode: 'SAMPLE-50-P90002-31441C4-PP-01/B1' }, path: ['File', 'SAMPLE.rvm', 'SAMPLE-CU-PI', 'SAMPLE-50-P90002-31441C4-PP-01/B1', 'PS-90002.1'] }, elementDetail: { posFamilyId: '', lineFamily: '' } },
  ],
  missingRows: [],
  outOfFamilyRows: [],
  duplicateRows: [],
  lineFamilyRows: [],
  posFamilyRows: [],
  sourceVsPosFamilyRows: [],
  diagnostics: [],
};

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

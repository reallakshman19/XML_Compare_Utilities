import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  expectedCsvText: 'Item Name\n/PS-11147.1\n',
  detailCsvText: 'Name of the element,p1bore,pipe,Position\nPS-11147.1,25,ASIM-1835-1IN-D8810311-31441C4-PP-01,E 10mm S 20mm U 30mm\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const exports = createPsFamilyAuditExports(audit);

assert.ok(exports.coverageCsv.startsWith('SourceFamily,ExpectedMember,Status,ClashCount'));
assert.ok(exports.coverageCsv.includes('POSFamilyId'));
assert.ok(exports.coverageCsv.includes('LineFamily'));
assert.ok(exports.coverageCsv.includes('PS-11147.1'));
assert.ok(exports.coverageCsv.includes('MISSING'));
assert.ok(exports.sourceVsPosFamilyCsv.startsWith('Source,POSFamilyCount,ElementCount'));
assert.ok(exports.sourceVsPosFamilyCsv.includes('PS-11147'));
assert.equal(audit.summary.sourceFamily, 'PS-11147');
assert.equal(audit.summary.expectedCount, 1);
assert.equal(audit.summary.missingCount, 1);
assert.equal(audit.summary.posFamilyCount, 1);
assert.match(exports.auditJson, /"schema": "ps-family-clash-audit\/v1"/);
assert.match(exports.auditJson, /"coveragePct": "0.00"/);
assert.match(exports.auditJson, /"sourceFamily": "PS-11147"/);

console.log('ps-family-output-fixtures tests passed');

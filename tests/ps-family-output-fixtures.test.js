import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  expectedCsvText: 'Item Name\n/PS-11147.1\n',
  detailCsvText: 'Name of the element,p1bore,pipe,Position\nPS-11147.1,25,ASIM-1835-1IN-D8810311-31441C4-PP-01,E 10mm S 20mm U 30mm\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const exports = createPsFamilyAuditExports(audit);
const coverageLines = exports.coverageCsv.trimEnd().split('\n');
const sourceVsPosLines = exports.sourceVsPosFamilyCsv.trimEnd().split('\n');

assert.equal(coverageLines[0], 'SourceFamily,ExpectedMember,Status,ClashCount,ClashRows,POSFamilyId,p1bore,Pipe,LineFamily,SupportText,SupportGap,Reference,PositionE,PositionS,PositionU,AgainstMembers,LineFamilies,FullLineTags,BranchNodes,SourceObjects,Remarks');
assert.equal(sourceVsPosLines[0], 'Source,POSFamilyCount,ElementCount,FoundElementCount,MissingElementCount,ClashCount,OutOfFamilyCount,POSFamilyIds,LineFamilies,Remarks');
assert.equal(coverageLines.length, 2);
assert.equal(sourceVsPosLines.length, 2);
assert.match(coverageLines[1], /PS-11147,PS-11147\.1,MISSING/);
assert.match(coverageLines[1], /POSF-000001/);
assert.match(coverageLines[1], /D8810311/);
assert.match(coverageLines[1], /No clash row found for expected member\./);
assert.match(sourceVsPosLines[1], /PS-11147,1,1,0,1,0,0,POSF-000001,D8810311/);
assert.equal(audit.summary.sourceFamily, 'PS-11147');
assert.equal(audit.summary.expectedCount, 1);
assert.equal(audit.summary.missingCount, 1);
assert.equal(audit.summary.posFamilyCount, 1);
assert.match(exports.auditJson, /"schema": "ps-family-clash-audit\/v1"/);
assert.match(exports.auditJson, /"coveragePct": "0.00"/);
assert.match(exports.auditJson, /"posFamilyId": "POSF-000001"/);

console.log('ps-family-output-fixtures tests passed');

import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  expectedCsvText: 'Item Name\n/PS-11147.1\n',
  detailCsvText: 'Name of the element,p1bore,pipe,Position\nPS-11147.1,25,ASIM-1835-1"-D8810311-31441C4-PP-01,E 10mm S 20mm U 30mm\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const exports = createPsFamilyAuditExports(audit);

const expectedCoverage = `SourceFamily,ExpectedMember,Status,ClashCount,ClashRows,POSFamilyId,p1bore,Pipe,LineFamily,SupportText,SupportGap,Reference,PositionE,PositionS,PositionU,AgainstMembers,LineFamilies,FullLineTags,BranchNodes,SourceObjects,Remarks
PS-11147,PS-11147.1,MISSING,0,,POSF-000001,25,"ASIM-1835-1""-D8810311-31441C4-PP-01",D8810311,,,,10,20,30,,,,,,No clash row found for expected member.
`;

const expectedSourceVsPos = `Source,POSFamilyCount,ElementCount,FoundElementCount,MissingElementCount,ClashCount,OutOfFamilyCount,POSFamilyIds,LineFamilies,Remarks
PS-11147,1,1,0,1,0,0,POSF-000001,D8810311,
`;

assert.equal(exports.coverageCsv, expectedCoverage);
assert.equal(exports.sourceVsPosFamilyCsv, expectedSourceVsPos);
assert.equal(audit.summary.sourceFamily, 'PS-11147');
assert.equal(audit.summary.expectedCount, 1);
assert.equal(audit.summary.missingCount, 1);
assert.equal(audit.summary.posFamilyCount, 1);
assert.match(exports.auditJson, /"schema": "ps-family-clash-audit\/v1"/);
assert.match(exports.auditJson, /"coveragePct": "0.00"/);
assert.match(exports.auditJson, /"posFamilyId": "POSF-000001"/);

console.log('ps-family-output-fixtures tests passed');

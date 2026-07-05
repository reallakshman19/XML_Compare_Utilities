import assert from 'node:assert/strict';
import { PS_FAMILY_CLASH_AUDIT_SCHEMA } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-contract.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = {
  schema: PS_FAMILY_CLASH_AUDIT_SCHEMA,
  summary: { sourceFamily: 'PS-11147', coveragePct: '0.00' },
  coverageRows: [],
  clashRows: [],
  missingRows: [],
  outOfFamilyRows: [],
  duplicateRows: [],
  lineFamilyRows: [],
  posFamilyRows: [],
  sourceVsPosFamilyRows: [],
  diagnostics: [],
};

const exports = createPsFamilyAuditExports(audit);

assert.equal(exports.coverageCsv, 'SourceFamily,ExpectedMember,Status,ClashCount,ClashRows,POSFamilyId,p1bore,Pipe,LineFamily,SupportText,SupportGap,Reference,PositionE,PositionS,PositionU,AgainstMembers,LineFamilies,FullLineTags,BranchNodes,SourceObjects,Remarks');
assert.equal(exports.sourceVsPosFamilyCsv, 'Source,POSFamilyCount,ElementCount,FoundElementCount,MissingElementCount,ClashCount,OutOfFamilyCount,POSFamilyIds,LineFamilies,Remarks');
assert.match(exports.auditJson, /"schema": "ps-family-clash-audit\/v1"/);
assert.match(exports.auditJson, /"sourceFamily": "PS-11147"/);
assert.match(exports.auditJson, /"coveragePct": "0.00"/);

console.log('ps-family-output-fixtures tests passed');

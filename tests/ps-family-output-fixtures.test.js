import assert from 'node:assert/strict';
import { PS_FAMILY_CLASH_AUDIT_SCHEMA } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-contract.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = {
  schema: PS_FAMILY_CLASH_AUDIT_SCHEMA,
  summary: { sourceFamily: 'PS-14396', supportGroupCount: 1 },
  supportSummaryRows: [{ no: 1, line: 'LINE-1', branchNode: 'LINE-1/B1', lineFamily: 'S8810011', psRoot: 'PS-14396', supportGroup: 'S8810011_PS-14396', structuralGroupCount: 1, supportCount: 2, supportMembers: ['PS-14396.1'], evidenceClashes: ['Clash1'], status: 'OK', remarks: 'Valid' }],
  lineSupportTreeRows: [{ supportGroup: 'S8810011_PS-14396', treeText: 'Line: LINE-1\n└─ SupportGroup: S8810011_PS-14396' }],
  supportExceptionRows: [],
  inputEvidenceRows: [{ sourceInput: 'Clash within Supports', clashName: 'Clash1', objectAType: 'Support', objectBType: 'Support', lineFamily: 'S8810011', branchNode: 'LINE-1/B1', supportGroup: 'S8810011_PS-14396', distance: -0.1, parsedEdge: 'A ↔ B' }],
  structureContactRows: [],
  supportChainRows: [],
  supportMemberRows: [],
  connectivityMatrixRows: [],
  coverageRows: [],
  clashRows: [],
  psClashReportRows: [],
  missingRows: [],
  outOfFamilyRows: [],
  duplicateRows: [],
  unexpectedInFamilyRows: [],
  lineFamilyRows: [],
  posFamilyRows: [],
  sourceVsPosFamilyRows: [],
  diagnostics: [],
};

const result = createPsFamilyAuditExports(audit);
assert.ok(result.supportSummaryCsv.startsWith('No,Line,BranchNode'));
assert.ok(result.supportSummaryCsv.includes('S8810011_PS-14396'));
assert.ok(result.lineSupportTreeText.includes('SupportGroup: S8810011_PS-14396'));
assert.ok(result.supportExceptionsCsv.startsWith('ExceptionCode,Severity,SupportGroup'));
assert.ok(result.inputEvidenceCsv.startsWith('SourceInput,ClashName,ObjectAType'));
assert.ok(result.clashRowsCsv.startsWith('ClashName,Source,SourceObject'));
assert.ok(result.auditJson.includes('ps-family-clash-audit/v1'));
assert.ok(result.auditJson.includes('PS-14396'));

console.log('ps-family-output-fixtures tests passed');

import assert from 'node:assert/strict';
import { PS_FAMILY_CLASH_AUDIT_SCHEMA } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-contract.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';
import { createZipBlob } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-save.js';

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

const zip = createZipBlob([
  { name: 'support-summary.csv', text: result.supportSummaryCsv },
  { name: 'audit.json', text: result.auditJson },
]);
assert.equal(zip.type, 'application/zip');
const zipBytes = new Uint8Array(await zip.arrayBuffer());
assert.deepEqual(Array.from(zipBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
const zipText = new TextDecoder().decode(zipBytes);
assert.ok(zipText.includes('support-summary.csv'));
assert.ok(zipText.includes('audit.json'));
assert.ok(zipText.includes('S8810011_PS-14396'));

console.log('ps-family-output-fixtures tests passed');

import assert from 'node:assert/strict';
import { PS_FAMILY_CLASH_AUDIT_SCHEMA } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-contract.js';
import { createPsFamilyAuditExports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = {
  schema: PS_FAMILY_CLASH_AUDIT_SCHEMA,
  summary: { sourceFamily: 'PS-11147', coveragePct: '0.00' },
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
assert.ok(result.coverageCsv.startsWith('SourceFamily,ExpectedMember,Status'));
assert.ok(result.coverageCsv.includes('POSFamilyId'));
assert.ok(result.psClashReportCsv.startsWith('PSClashName,Source,SourceObject'));
assert.ok(result.sourceVsPosFamilyCsv.startsWith('Source,POSFamilyCount'));
assert.ok(result.auditJson.includes('ps-family-clash-audit/v1'));
assert.ok(result.auditJson.includes('PS-11147'));

console.log('ps-family-output-fixtures tests passed');

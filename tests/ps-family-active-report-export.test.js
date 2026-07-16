import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { createPsFamilyActiveReportExport, createPsFamilyAuditExports, PS_FAMILY_ACTIVE_EXPORTS } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-export.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
const allExports = createPsFamilyAuditExports(audit);
const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);

assert.ok(shell.includes('Export Active Report CSV'));
assert.ok(shell.includes('data-psfa="export-active"'));
assert.ok(shell.includes('Export current report as CSV'));
assert.ok(shell.includes('data-psfa="report-export-csv"'));

for (const tab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) {
  const active = createPsFamilyActiveReportExport(audit, tab.key);
  const mapping = PS_FAMILY_ACTIVE_EXPORTS[tab.key];
  assert.ok(mapping, `${tab.key} must be exportable from the report workspace`);
  assert.equal(active.activeTab, tab.key);
  assert.equal(active.exportKey, mapping.exportKey);
  assert.equal(active.mime, 'text/csv');
  assert.equal(active.text, allExports[mapping.exportKey]);
}

const summary = createPsFamilyActiveReportExport(audit, 'supportSummary');
assert.equal(summary.suffix, 'supportgroup-summary');
assert.match(summary.text, /S8810011_PS-14396/);

const lineTree = createPsFamilyActiveReportExport(audit, 'lineSupportTree');
assert.equal(lineTree.suffix, 'line-tree');
assert.match(lineTree.text, /^Line,LineFamily,BranchNode,SupportGroup,Tree/m);
assert.match(lineTree.text, /SupportGroup: S8810011_PS-14396/);

const structureTree = createPsFamilyActiveReportExport(audit, 'structureTree');
assert.equal(structureTree.suffix, 'structure-tree');
assert.match(structureTree.text, /^StructureGroup,StructureNames,Line,LineFamily,BranchNode,SupportGroup,RepresentativeSupport,NearbySupports,StructurePath/m);
assert.match(structureTree.text, /S8810011_PS-14396/);

const proximity = createPsFamilyActiveReportExport(audit, 'structureLineProximity');
assert.match(proximity.text, /TotalSupportCount/);

const evidence = createPsFamilyActiveReportExport(audit, 'inputEvidence');
assert.match(evidence.text, /Clash603/);
assert.match(evidence.text, /Clash1429/);

assert.equal(createPsFamilyActiveReportExport(audit, 'unknown-tab'), null);
console.log('ps-family-active-report-export tests passed');

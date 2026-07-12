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
assert.ok(shell.includes('Export Active Report'));
assert.ok(shell.includes('data-psfa="export-active"'));
assert.ok(shell.includes('SupportGroup Summary CSV'));
assert.ok(shell.includes('Line Support Tree TXT'));
assert.ok(shell.includes('SupportChange Exceptions CSV'));
assert.ok(shell.includes('Input Evidence Ledger CSV'));
assert.ok(shell.includes('Audit JSON'));

for (const tab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) {
  const active = createPsFamilyActiveReportExport(audit, tab.key);
  const mapping = PS_FAMILY_ACTIVE_EXPORTS[tab.key];
  if (!mapping) {
    assert.equal(active.activeTab, 'supportSummary');
    assert.equal(active.exportKey, 'supportSummaryCsv');
    assert.equal(active.text, allExports.supportSummaryCsv);
    continue;
  }
  assert.equal(active.activeTab, tab.key);
  assert.equal(active.exportKey, mapping.exportKey);
  assert.equal(active.text, allExports[mapping.exportKey]);
}

const summary = createPsFamilyActiveReportExport(audit, 'supportSummary');
assert.equal(summary.suffix, 'supportgroup-summary');
assert.equal(summary.mime, 'text/csv');
assert.match(summary.text, /S8810011_PS-14396/);

const tree = createPsFamilyActiveReportExport(audit, 'lineSupportTree');
assert.equal(tree.suffix, 'line-support-tree');
assert.equal(tree.mime, 'text/plain');
assert.match(tree.text, /SupportGroup: S8810011_PS-14396/);

const evidence = createPsFamilyActiveReportExport(audit, 'inputEvidence');
assert.match(evidence.text, /Clash603/);
assert.match(evidence.text, /Clash1429/);

const unknown = createPsFamilyActiveReportExport(audit, 'unknown-tab');
assert.equal(unknown.activeTab, 'supportSummary');
assert.equal(unknown.exportKey, 'supportSummaryCsv');
assert.equal(unknown.text, allExports.supportSummaryCsv);

console.log('ps-family-active-report-export tests passed');

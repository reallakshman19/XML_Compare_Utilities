import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs.some((tab) => tab.key === 'lineSupportTree'));
assert.ok(shell.includes('Line Support Tree'));
assert.ok(shell.includes('SupportGroup Summary'));

const tree = renderPsFamilyReports(audit, 'lineSupportTree', PS_FAMILY_CLASH_AUDIT_CONFIG, '');
assert.ok(tree.includes('Line Support Tree'));
assert.ok(tree.includes('SupportGroup: S8810011_PS-14396'));
assert.ok(tree.includes('StructuralGroup'));
assert.ok(tree.includes('GENSEC 2 of FRMWORK 1 of STRUCTURE /PS-14396'));
assert.ok(tree.includes('PS-14396.4'));
assert.ok(tree.includes('ASIM-1836-6&quot;-S8810011-91261M7-HC-01/B6'));

const filtered = renderPsFamilyReports(audit, 'lineSupportTree', PS_FAMILY_CLASH_AUDIT_CONFIG, 'S8810011');
assert.ok(filtered.includes('Showing 1 of 1 matched rows from 1 total rows.'));
assert.ok(filtered.includes('S8810011_PS-14396'));

const evidence = renderPsFamilyReports(audit, 'inputEvidence', PS_FAMILY_CLASH_AUDIT_CONFIG, 'Clash603');
assert.ok(evidence.includes('StructureGroup vs Supports'));
assert.ok(evidence.includes('GENSEC 2 of FRMWORK 1 of STRUCTURE /PS-14396'));
assert.ok(!evidence.includes('Clash4</td>'));

const members = renderPsFamilyReports(audit, 'supportMembers', PS_FAMILY_CLASH_AUDIT_CONFIG, 'Representative');
assert.ok(members.includes('PS-14396.4'));
assert.ok(members.includes('Representative support'));

console.log('ps-family-hierarchy-tab tests passed');

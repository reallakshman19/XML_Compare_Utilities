import assert from 'node:assert/strict';

import { _test as modalTest, renderXmlCompareTransferModalPopupHtml } from '../xml-compare/XmlCompareTransferModalPopup.js';
import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';

const input = {
  source: { fileName: 'source.xml' },
  target: { fileName: 'target.xml', text: '<Target />' },
  targetText: '<Target />',
  aim: { transferBlocks: ['RestraintsBlock'] },
  transferModal: { activeTab: 'transfer-compare' },
  transferWorkflowGate: { blockers: [] },
};
const staged = { transferStage: { scope: 'node', selectedBlocks: ['RestraintsBlock'] } };
const applied = {
  ...staged,
  transferAudit: { updatedCount: 2, skippedCount: 1, blockerCount: 0 },
  transferLastResult: { ok: true, scope: 'node', updatedCount: 2, skippedCount: 1, blockedCount: 0, patchedTargetText: '<Target><Patched>true</Patched></Target>' },
};

const noStageHtml = renderXmlCompareTransferModalPopupHtml({ input, tState: {}, stageScope: 'node', transferPreview: {} });
assert.ok(noStageHtml.includes('Transfer Output Dashboard'));
assert.ok(noStageHtml.includes('What to do next'));
assert.ok(noStageHtml.includes('Stage transfer to make output evidence visible.'));
assert.ok(noStageHtml.includes('data-transfer-evidence="none"'));
assert.ok(noStageHtml.includes('Start transfer'));
assert.ok(noStageHtml.includes('Output, export, diff, ledger, receipt, and history panels will appear after a transfer is staged or applied.'));
assert.ok(noStageHtml.includes('Advanced readiness evidence'));
assert.ok(noStageHtml.includes('data-xml-compare-dashboard-card="stage"'));
assert.ok(noStageHtml.includes('data-xml-compare-dashboard-card="patched-target"'));
assert.ok(!noStageHtml.includes('Detailed export preflight'), 'no-stage view must not render downstream export panel');
assert.ok(!noStageHtml.includes('Transfer change ledger details'), 'no-stage view must not render downstream ledger panel');
assert.ok(!noStageHtml.includes('Patched Target diff details'), 'no-stage view must not render downstream diff panel');
assert.ok(!noStageHtml.includes('Last output receipt'), 'no-stage view must not render receipt panel');
assert.ok(!noStageHtml.includes('Export history'), 'no-stage view must not render history panel');
assert.ok(!noStageHtml.includes('Export patched Target XML'), 'no-stage view must not render disabled export buttons');
assert.ok(!noStageHtml.includes('Patched Target preview'), 'no-stage view must not render patched preview placeholder');

const stagedHtml = renderXmlCompareTransferModalPopupHtml({ input, tState: staged, stageScope: 'node', transferPreview: {} });
assert.ok(stagedHtml.includes('data-transfer-evidence="available"'));
assert.ok(stagedHtml.includes('Apply staged transfer to generate patched Target XML.'));
assert.ok(stagedHtml.includes('RestraintsBlock staged'));
assert.ok(stagedHtml.includes('Detailed export preflight'));
assert.ok(!stagedHtml.includes('Export patched Target XML'), 'staged-only view should not show export buttons before apply evidence exists');

const appliedHtml = renderXmlCompareTransferModalPopupHtml({ input, tState: applied, stageScope: 'node', transferPreview: { summary: { previewCount: 4 } } });
assert.ok(appliedHtml.includes('Export the needed artifact from the action bar'));
assert.ok(appliedHtml.includes('target_patched_target.xml'));
assert.ok(appliedHtml.includes('0 changed line(s)') || appliedHtml.includes('changed line'));
assert.ok(appliedHtml.includes('history row(s), preview fields 4'));
assert.ok(appliedHtml.includes('Export change ledger JSON'));
assert.ok(appliedHtml.includes('Export diff summary JSON'));
assert.ok(appliedHtml.includes('Patched Target preview'));

const dashboard = modalTest.dashboardPanel(input, applied, { summary: { previewCount: 4 } });
assert.ok(dashboard.includes('Transfer Output Dashboard'));
assert.ok(dashboard.includes('data-xml-compare-dashboard-card="ledger"'));
assert.ok(dashboard.includes('Use the export action buttons.'));
assert.equal(modalTest.dashboardNextAction({ hasStage: false }, {}, {}, {}), 'Stage transfer to make output evidence visible.');
assert.equal(modalTest.dashboardNextAction({ hasStage: true, hasAppliedResult: false }, {}, {}, {}), 'Apply staged transfer to generate patched Target XML.');
assert.equal(modalTest.hasTransferEvidence(input, {}), false);
assert.equal(modalTest.hasTransferEvidence(input, staged), true);

const candidateA = modalTest.candidateTab(input, true);
const candidateB = modalTest.candidateTab({ ...input, transferModal: { ...input.transferModal, activeTab: 'transfer-compare' } }, true);
assert.equal(candidateA, candidateB, 'Tab 1 Candidate Review markup is unchanged by dashboard state');

const shellInput = { source: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, target: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, navStates: {}, compareFields: [], anchor: { sourceUid: 'S1', targetUid: 'T1' }, selectedRecords: {}, availableConnectors: [{ field: 'lineNo', label: 'LineNo', sourceValue: 'L1', targetValue: 'L1' }], enabledConnectorFields: ['lineNo'], aim: { connectionType: 'numeric', basis: 'coordinate' } };
const shellHtml = renderXmlCompareWorkspaceShellHtml(shellInput);
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="source"'));
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="target"'));
assert.ok(shellHtml.includes('data-xml-compare-main-connector'));

console.log('XML Compare transfer output dashboard progressive disclosure tests passed');

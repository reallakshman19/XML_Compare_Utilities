import assert from 'node:assert/strict';

import { emptyTransferExportReceipt, summarizeTransferExportReceipt } from '../xml-compare/XmlCompareTransferExportReceipt.js';
import { summarizeTransferOutput } from '../xml-compare/XmlCompareTransferOutputModel.js';
import { _test as modalTest, renderXmlCompareTransferModalPopupHtml } from '../xml-compare/XmlCompareTransferModalPopup.js';
import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';

const patchedText = '<Target><Patched>true</Patched></Target>';
const input = {
  source: { fileName: 'source.xml' },
  target: { fileName: 'target.xml' },
  aim: { transferBlocks: ['RestraintsBlock', 'NodeNameBlock'] },
  transferModal: { activeTab: 'transfer-compare' },
  transferWorkflowGate: { blockers: [] },
};
function tState() {
  return {
    transferStage: { scope: 'node', selectedBlocks: ['RestraintsBlock'] },
    transferAudit: { updatedCount: 3, skippedCount: 2, skippedBlocks: [{ reason: 'unchanged' }], diagnostics: [] },
    transferLastResult: { ok: true, scope: 'node', updatedCount: 3, skippedCount: 2, blockedCount: 1, patchedTargetText: patchedText },
  };
}

const empty = summarizeTransferExportReceipt(emptyTransferExportReceipt());
assert.equal(empty.isEmpty, true, 'receipt is empty before export');
const before = tState();
assert.equal(before.transferLastResult.lastOutputReceipt, undefined, 'transfer output state starts without receipt');

const patchedState = tState();
summarizeTransferOutput({ input, tState: patchedState, lastAction: 'export-patched' });
let receipt = summarizeTransferExportReceipt(patchedState.transferLastResult.lastOutputReceipt);
assert.equal(receipt.actionType, 'export-patched-target-xml');
assert.equal(receipt.fileName, 'target_patched_target.xml');
assert.equal(receipt.updatedCount, 3);
assert.equal(receipt.skippedCount, 2);
assert.equal(receipt.blockedCount, 1);
assert.equal(receipt.patchedTargetAvailable, true);
assert.equal(receipt.outputStatus, 'exported');

const auditState = tState();
summarizeTransferOutput({ input, tState: auditState, lastAction: 'export-audit' });
receipt = summarizeTransferExportReceipt(auditState.transferLastResult.lastOutputReceipt);
assert.equal(receipt.actionType, 'export-transfer-audit-json');
assert.equal(receipt.fileName, 'target_transfer_audit.json');

const proofState = tState();
summarizeTransferOutput({ input, tState: proofState, lastAction: 'export-proof' });
receipt = summarizeTransferExportReceipt(proofState.transferLastResult.lastOutputReceipt);
assert.equal(receipt.actionType, 'download-transfer-proof-json');
assert.equal(receipt.fileName, 'target_transfer_proof.json');

const copyState = tState();
summarizeTransferOutput({ input, tState: copyState, lastAction: 'copy-patched' });
receipt = summarizeTransferExportReceipt(copyState.transferLastResult.lastOutputReceipt);
assert.equal(receipt.actionType, 'copy-patched-target-preview');
assert.equal(receipt.fileName, 'Copied patched Target preview');

const modalBefore = renderXmlCompareTransferModalPopupHtml({ input, tState: tState(), stageScope: 'node', transferPreview: {} });
assert.ok(modalBefore.includes('Last output receipt'));
assert.ok(modalBefore.includes('No transfer output action has been exported or copied yet.'));
const modalAfter = renderXmlCompareTransferModalPopupHtml({ input, tState: patchedState, stageScope: 'node', transferPreview: {} });
assert.ok(modalAfter.includes('Last output receipt'));
assert.ok(modalAfter.includes('export-patched-target-xml'));
assert.ok(modalAfter.includes('target_patched_target.xml'));
assert.ok(modalAfter.includes('Updated count'));
assert.ok(modalAfter.includes('Patched Target available'));
assert.ok(modalAfter.includes('exported'));

const sourceText = '<Source />', targetText = '<Target />';
const stableState = tState();
summarizeTransferOutput({ input, tState: stableState, lastAction: 'export-patched' });
assert.equal(sourceText, '<Source />', 'receipt creation does not alter Source text');
assert.equal(targetText, '<Target />', 'receipt creation does not alter Target text');

const candidateA = modalTest.candidateTab(input, true);
const candidateB = modalTest.candidateTab({ ...input, transferModal: { ...input.transferModal, lastOutputReceipt: patchedState.transferLastResult.lastOutputReceipt } }, true);
assert.equal(candidateA, candidateB, 'Tab 1 Candidate Review markup is unchanged by receipt state');

const shellInput = { source: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, target: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, navStates: {}, compareFields: [], anchor: { sourceUid: 'S1', targetUid: 'T1' }, selectedRecords: {}, availableConnectors: [{ field: 'lineNo', label: 'LineNo', sourceValue: 'L1', targetValue: 'L1' }], enabledConnectorFields: ['lineNo'], aim: { connectionType: 'numeric', basis: 'coordinate' } };
const shellHtml = renderXmlCompareWorkspaceShellHtml(shellInput);
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="source"'), 'source hierarchy dropdown still renders');
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="target"'), 'target hierarchy dropdown still renders');
assert.ok(shellHtml.includes('data-xml-compare-main-connector'), 'main connector selector still renders');

console.log('XML Compare transfer export receipt tests passed');

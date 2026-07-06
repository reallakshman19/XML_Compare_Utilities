import assert from 'node:assert/strict';

import { _test as tabTest } from '../tabs/xml-compare-tab.js';
import { appendTransferExportHistory, emptyTransferExportHistory, serializeTransferExportHistoryJson, summarizeTransferExportHistory } from '../xml-compare/XmlCompareTransferExportHistory.js';
import { createTransferExportReceipt } from '../xml-compare/XmlCompareTransferExportReceipt.js';
import { _test as modalTest, renderXmlCompareTransferModalPopupHtml } from '../xml-compare/XmlCompareTransferModalPopup.js';
import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';

const summary = Object.freeze({
  scope: 'node',
  selectedBlocks: Object.freeze(['RestraintsBlock']),
  updatedCount: 2,
  skippedCount: 1,
  blockedCount: 0,
  hasPatchedTargetText: true,
  outputStatus: 'exported',
});
const input = { source: { fileName: 'source.xml' }, target: { fileName: 'target.xml' }, aim: { transferBlocks: ['RestraintsBlock'] }, transferModal: { activeTab: 'transfer-compare' }, transferWorkflowGate: { blockers: [] } };
const transferState = { transferStage: { scope: 'node', selectedBlocks: ['RestraintsBlock'] }, transferAudit: { updatedCount: 2, skippedCount: 1, skippedBlocks: [], diagnostics: [] }, transferLastResult: { ok: true, scope: 'node', updatedCount: 2, skippedCount: 1, blockedCount: 0, patchedTargetText: '<Target><Patched>true</Patched></Target>' } };
function appendViaSetter(state, actionType, fileName) {
  tabTest.setOutputReceipt(state, actionType, fileName, summary, '2026-07-06T00:00:00.000Z');
}

const empty = summarizeTransferExportHistory(emptyTransferExportHistory());
assert.equal(empty.isEmpty, true, 'history empty before export');
const emptyHtml = renderXmlCompareTransferModalPopupHtml({ input, tState: transferState, stageScope: 'node', transferPreview: {} });
assert.ok(emptyHtml.includes('Export history'));
assert.ok(emptyHtml.includes('No export history in this active tab session.'));

const state = { transferModal: { lastOutputReceipt: null, exportHistory: emptyTransferExportHistory() }, textA: '<Source />', textB: '<Target />' };
appendViaSetter(state, 'export-patched-target-xml', 'target_patched_target.xml');
appendViaSetter(state, 'export-transfer-audit-json', 'target_transfer_audit.json');
appendViaSetter(state, 'download-transfer-proof-json', 'target_transfer_proof.json');
appendViaSetter(state, 'copy-patched-target-preview', 'Copied patched Target preview');
appendViaSetter(state, 'export-transfer-artifact-bundle', 'target_transfer_manifest.json');
let history = summarizeTransferExportHistory(state.transferModal.exportHistory);
assert.equal(history.rowCount, 5, 'each export/copy appends one history row');
assert.deepEqual(history.rows.map((row) => row.actionType), ['export-patched-target-xml', 'export-transfer-audit-json', 'download-transfer-proof-json', 'copy-patched-target-preview', 'export-transfer-artifact-bundle']);
assert.equal(history.rows[0].fileName, 'target_patched_target.xml');
assert.equal(history.rows[4].fileName, 'target_transfer_manifest.json');
assert.equal(history.rows[4].updatedCount, 2);
assert.equal(history.rows[4].skippedCount, 1);
assert.equal(history.rows[4].blockedCount, 0);
assert.equal(history.rows[4].outputStatus, 'exported');
assert.equal(state.textA, '<Source />', 'Source text is not mutated by history');
assert.equal(state.textB, '<Target />', 'Target text is not mutated by history');

const historyPayload = JSON.parse(serializeTransferExportHistoryJson(state.transferModal.exportHistory));
assert.deepEqual(historyPayload.rows.map((row) => row.actionType), history.rows.map((row) => row.actionType), 'export history JSON contains all visible rows');
const beforeClearReceipt = state.transferModal.lastOutputReceipt;
tabTest.clearOutputHistory(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rowCount, 0, 'clear history clears only history');
assert.equal(state.transferModal.lastOutputReceipt, beforeClearReceipt, 'clear history leaves last receipt intact');

let capped = emptyTransferExportHistory();
for (let i = 0; i < 25; i += 1) capped = appendTransferExportHistory(capped, createTransferExportReceipt({ actionType: `row-${i}`, fileName: `file-${i}.json`, timestamp: `2026-07-06T00:00:${String(i).padStart(2, '0')}.000Z`, summary, outputStatus: 'exported' }));
history = summarizeTransferExportHistory(capped);
assert.equal(history.rowCount, 20, 'history is capped at 20 rows');
assert.equal(history.rows[0].actionType, 'row-5');
assert.equal(history.rows[19].actionType, 'row-24');
assert.equal(JSON.parse(serializeTransferExportHistoryJson(capped)).rows.length, 20);

const historyHtml = modalTest.historyPanel({ transferModal: { exportHistory: capped } });
assert.ok(historyHtml.includes('Clear export history'));
assert.ok(historyHtml.includes('Export history JSON'));
assert.ok(historyHtml.includes('row-24'));

const candidateA = modalTest.candidateTab(input, true);
const candidateB = modalTest.candidateTab({ ...input, transferModal: { ...input.transferModal, exportHistory: capped } }, true);
assert.equal(candidateA, candidateB, 'Tab 1 Candidate Review markup is unchanged by export history');

const shellInput = { source: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, target: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, navStates: {}, compareFields: [], anchor: { sourceUid: 'S1', targetUid: 'T1' }, selectedRecords: {}, availableConnectors: [{ field: 'lineNo', label: 'LineNo', sourceValue: 'L1', targetValue: 'L1' }], enabledConnectorFields: ['lineNo'], aim: { connectionType: 'numeric', basis: 'coordinate' } };
const shellHtml = renderXmlCompareWorkspaceShellHtml(shellInput);
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="source"'), 'source hierarchy dropdown still renders');
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="target"'), 'target hierarchy dropdown still renders');
assert.ok(shellHtml.includes('data-xml-compare-main-connector'), 'main connector selector still renders');

console.log('XML Compare transfer export history tests passed');

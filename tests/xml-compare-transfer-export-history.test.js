import assert from 'node:assert/strict';

import { _test as tabTest } from '../tabs/xml-compare-tab.js';
import { appendTransferExportHistory, emptyTransferExportHistory, serializeTransferExportHistoryJson, summarizeTransferExportHistory } from '../xml-compare/XmlCompareTransferExportHistory.js';
import { createTransferExportReceipt } from '../xml-compare/XmlCompareTransferExportReceipt.js';
import { _test as modalTest, renderXmlCompareTransferModalPopupHtml } from '../xml-compare/XmlCompareTransferModalPopup.js';
import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';

const patchedText = '<Target><Patched>true</Patched></Target>';
const sourceText = '<Source><A /></Source>';
const targetText = '<Target><Old /></Target>';
const input = { source: { fileName: 'source.xml' }, target: { fileName: 'target.xml' }, aim: { transferBlocks: ['RestraintsBlock'] }, transferModal: { activeTab: 'transfer-compare' }, transferWorkflowGate: { blockers: [] } };
function transferState() { return { transferStage: { scope: 'node', selectedBlocks: ['RestraintsBlock'] }, transferAudit: { updatedCount: 2, skippedCount: 1, skippedBlocks: [], diagnostics: [] }, transferLastResult: { ok: true, scope: 'node', updatedCount: 2, skippedCount: 1, blockedCount: 0, patchedTargetText } }; }
function installDownloadStubs() {
  const savedDocument = globalThis.document;
  const savedUrl = globalThis.URL;
  const savedNavigator = globalThis.navigator;
  const savedClipboard = savedNavigator?.clipboard;
  const blobByUrl = new Map();
  const downloads = [];
  globalThis.URL = { createObjectURL(blob) { const url = `blob:test-${blobByUrl.size}`; blobByUrl.set(url, blob); return url; }, revokeObjectURL() {} };
  globalThis.document = { createElement() { return { href: '', download: '', click() { downloads.push({ fileName: this.download, blob: blobByUrl.get(this.href) }); }, remove() {} }; }, body: { append() {} } };
  if (!globalThis.navigator) Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
  Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
  return { downloads, restore() { globalThis.document = savedDocument; globalThis.URL = savedUrl; if (savedNavigator) Object.defineProperty(globalThis.navigator, 'clipboard', { value: savedClipboard, configurable: true }); } };
}
function makeState() {
  const state = tabTest.createInitialState();
  state.fileA = { name: 'source.xml', size: sourceText.length };
  state.fileB = { name: 'target.xml', size: targetText.length };
  state.textA = sourceText;
  state.textB = targetText;
  state.aim = input.aim;
  state.canvasState = { ...state.canvasState, ...transferState() };
  return state;
}

const empty = summarizeTransferExportHistory(emptyTransferExportHistory());
assert.equal(empty.isEmpty, true, 'history empty before export');
const emptyHtml = renderXmlCompareTransferModalPopupHtml({ input, tState: transferState(), stageScope: 'node', transferPreview: {} });
assert.ok(emptyHtml.includes('Export history'));
assert.ok(emptyHtml.includes('No export history in this active tab session.'));

const io = installDownloadStubs();
const state = makeState();
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rowCount, 0);
tabTest.exportPatchedTargetXml(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rows.at(-1).actionType, 'export-patched-target-xml');
tabTest.downloadTransferAuditExport(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rows.at(-1).actionType, 'export-transfer-audit-json');
tabTest.downloadTransferProof(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rows.at(-1).actionType, 'download-transfer-proof-json');
tabTest.copyPatchedTargetPreview(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rows.at(-1).actionType, 'copy-patched-target-preview');
tabTest.exportTransferArtifactBundle(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rows.at(-1).actionType, 'export-transfer-artifact-bundle');
let history = summarizeTransferExportHistory(state.transferModal.exportHistory);
assert.equal(history.rowCount, 5, 'each export/copy appends one history row');
assert.deepEqual(history.rows.map((row) => row.actionType), ['export-patched-target-xml', 'export-transfer-audit-json', 'download-transfer-proof-json', 'copy-patched-target-preview', 'export-transfer-artifact-bundle']);
assert.equal(history.rows[0].fileName, 'target_patched_target.xml');
assert.equal(history.rows[4].fileName, 'target_transfer_manifest.json');
assert.equal(history.rows[4].updatedCount, 2);
assert.equal(history.rows[4].skippedCount, 1);
assert.equal(history.rows[4].blockedCount, 0);
assert.equal(history.rows[4].outputStatus, 'exported');
assert.equal(state.textA, sourceText, 'Source text is not mutated by history');
assert.equal(state.textB, targetText, 'Target text is not mutated by history');

const beforeClearReceipt = state.transferModal.lastOutputReceipt;
tabTest.downloadTransferExportHistory(state);
const historyDownload = io.downloads.find((item) => item.fileName === 'xml_compare_transfer_export_history.json');
assert.ok(historyDownload, 'export history JSON is downloaded');
const historyPayload = JSON.parse(await historyDownload.blob.text());
assert.deepEqual(historyPayload.rows.map((row) => row.actionType), history.rows.map((row) => row.actionType), 'export history JSON contains all visible rows');
tabTest.clearOutputHistory(state);
assert.equal(summarizeTransferExportHistory(state.transferModal.exportHistory).rowCount, 0, 'clear history clears only history');
assert.equal(state.transferModal.lastOutputReceipt, beforeClearReceipt, 'clear history leaves last receipt intact');
io.restore();

let capped = emptyTransferExportHistory();
const summary = tabTest.currentTransferSummary(makeState(), 'export-patched');
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

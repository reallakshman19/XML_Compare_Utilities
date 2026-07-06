import assert from 'node:assert/strict';

import { createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { createTransferAuditExport } from '../xml-compare/XmlCompareTransferAuditExport.js';
import { createTransferProofExport } from '../xml-compare/XmlCompareTransferProofExport.js';
import { buildTransferOutputFileNames, summarizeTransferOutput } from '../xml-compare/XmlCompareTransferOutputModel.js';
import { renderXmlCompareTransferModalPopupHtml } from '../xml-compare/XmlCompareTransferModalPopup.js';
import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';
import { _test as tabTest } from '../tabs/xml-compare-tab.js';

const input = { source: { fileName: 'source-categorized.xml' }, target: { fileName: 'target-categorized.xml' }, aim: { transferBlocks: ['RestraintsBlock', 'NodeNameBlock'] }, transferModal: { activeTab: 'transfer-compare' }, transferWorkflowGate: { blockers: [] } };
const noStage = summarizeTransferOutput({ input, tState: {} });
assert.equal(noStage.outputStatus, 'no-stage');
assert.equal(noStage.hasPatchedTargetText, false);
const stagedState = { transferStage: { plan: { transferCases: [] }, scope: 'node', selectedBlocks: ['RestraintsBlock'] } };
const staged = summarizeTransferOutput({ input, tState: stagedState });
assert.equal(staged.outputStatus, 'staged');
assert.deepEqual(staged.selectedBlocks, ['RestraintsBlock']);
const patchedText = '<CategorizedInputXML><Line id="L1"><Element>patched</Element></Line></CategorizedInputXML>';
const appliedState = { ...stagedState, transferAudit: { schema: 'transfer-patch-audit/v1', changedBlocks: [{ status: 'updated', changedBlocks: [{ blockName: 'RestraintsBlock', status: 'updated' }] }], skippedBlocks: [{ status: 'skipped', reason: 'unchanged' }], diagnostics: [] }, postTransferValidation: { diagnostics: [] }, transferLastResult: { ok: true, scope: 'node', updatedCount: 1, skippedCount: 1, blockedCount: 0, patchedTargetText: patchedText, resultHash: 'hash-1' } };
const applied = summarizeTransferOutput({ input, tState: appliedState });
assert.equal(applied.outputStatus, 'applied');
assert.equal(applied.hasPatchedTargetText, true);
assert.equal(applied.updatedCount, 1);
assert.equal(applied.skippedCount, 1);
assert.equal(applied.blockedCount, 0);
assert.equal(buildTransferOutputFileNames({ targetFileName: 'target-categorized.xml' }).patchedTargetXml, 'target-categorized_patched_target.xml');
const emptyModal = renderXmlCompareTransferModalPopupHtml({ input, tState: {}, stageScope: 'node', transferPreview: {} });
assert.ok(emptyModal.includes('Output status'));
assert.ok(emptyModal.includes('No stage yet'));
assert.ok(emptyModal.includes('Export patched Target XML'));
assert.ok(emptyModal.includes('disabled'));
const appliedModal = renderXmlCompareTransferModalPopupHtml({ input, tState: appliedState, stageScope: 'node', transferPreview: {} });
assert.ok(appliedModal.includes('Patched Target preview'));
assert.ok(appliedModal.includes('patched'));
assert.ok(appliedModal.includes('Export transfer audit JSON'));
assert.ok(appliedModal.includes('Export transfer proof JSON'));
assert.ok(appliedModal.includes('Copy patched Target preview'));
const auditExport = createTransferAuditExport({ input, tState: appliedState, generatedAt: '2026-07-06T00:00:00.000Z' });
assert.equal(auditExport.sourceFileName, 'source-categorized.xml');
assert.equal(auditExport.targetFileName, 'target-categorized.xml');
assert.equal(auditExport.scope, 'node');
assert.deepEqual(auditExport.selectedBlocks, ['RestraintsBlock']);
assert.equal(auditExport.updatedCount, 1);
assert.equal(auditExport.skippedCount, 1);
assert.equal(auditExport.hierarchyConnectorAnchorMutatedByExport, false);
const proofExport = createTransferProofExport({ input, tState: appliedState, generatedAt: '2026-07-06T00:00:00.000Z' });
assert.equal(proofExport.updatedCount, 1);
assert.equal(proofExport.skippedCount, 1);
assert.equal(proofExport.blockedCount, 0);
assert.deepEqual(proofExport.selectedBlocks, ['RestraintsBlock']);

const originalDocument = globalThis.document;
const downloads = [];
try {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement() { return { download: '', href: '', click() {}, remove() {} }; }, body: { append(link) { downloads.push({ name: link.download }); } } } });
  const state = tabTest.createInitialState();
  state.fileA = { name: 'source-categorized.xml', size: 10 };
  state.fileB = { name: 'target-categorized.xml', size: 10 };
  state.canvasState = createXmlCompareCanvasState(appliedState);
  assert.equal(tabTest.currentTransferSummary(state).patchedTargetText, patchedText, 'patched XML export source equals patched target text');
  tabTest.exportPatchedTargetXml(state);
  assert.equal(downloads.at(-1).name, 'target-categorized_patched_target.xml');
  tabTest.downloadTransferAuditExport(state);
  assert.equal(downloads.at(-1).name, 'target-categorized_transfer_audit.json');
  tabTest.downloadTransferProof(state);
  assert.equal(downloads.at(-1).name, 'target-categorized_transfer_proof.json');
} finally {
  if (originalDocument === undefined) delete globalThis.document;
  else Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
}

const shellInput = { source: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, target: { records: [], levelView: { levelId: 'line', hierarchyProfile: { levels: [{ levelId: 'line', label: 'Line', recordCount: 1 }] }, fields: ['lineNo'] } }, navStates: {}, compareFields: [], anchor: { sourceUid: 'S1', targetUid: 'T1' }, selectedRecords: {}, availableConnectors: [{ field: 'lineNo', label: 'LineNo', sourceValue: 'L1', targetValue: 'L1' }], enabledConnectorFields: ['lineNo'], aim: { connectionType: 'numeric', basis: 'coordinate' } };
const shellHtml = renderXmlCompareWorkspaceShellHtml(shellInput);
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="source"'));
assert.ok(shellHtml.includes('data-xml-compare-level-select="levelId" data-xml-compare-side="target"'));
assert.ok(shellHtml.includes('data-xml-compare-main-connector'));
console.log('XML Compare transfer output hardening tests passed');

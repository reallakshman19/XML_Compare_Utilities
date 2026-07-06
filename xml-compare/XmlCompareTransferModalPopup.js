import { renderXmlCompareTransferPreviewPanelHtml } from './XmlCompareTransferPreviewPanel.js';
import { renderXmlCompareTransferStagePanelHtml } from './XmlCompareTransferStagePanel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from './XmlCompareTransferWorkflowPanel.js';
import { summarizeTransferOutput } from './XmlCompareTransferOutputModel.js';
import { summarizeTransferExportReceipt } from './XmlCompareTransferExportReceipt.js';
import { summarizeTransferExportHistory } from './XmlCompareTransferExportHistory.js';
import { createTransferExportPreflight, summarizeTransferExportPreflight, transferExportReadinessForAction } from './XmlCompareTransferExportPreflight.js';
import { gateAllowsAction } from './XmlCompareTransferWorkflowGateModel.js';
import { comparePanel, renderXmlCompareCandidatePairsPanelHtml, renderXmlCompareCandidateReviewControlsHtml } from './XmlCompareAnchorReviewPanel.js?v=20260704-c4';
import { renderXmlCompareLogScreenHtml } from './XmlCompareLogScreen.js';
import { renderXmlCompareDiagnosticsPanelHtml } from './XmlCompareDiagnosticsPanel.js';

export const XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA = 'xml-compare-transfer-modal-popup/v7-export-preflight-panel';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();

function approvalCounts(input = {}) {
  const approved = input.approvedMatchSet?.approvedMatches || [];
  const fallbackManual = Array.isArray(input.manualConnectors) ? input.manualConnectors.length : 0;
  const candidatePairs = approved.filter((match) => clean(match.matchType) === 'candidate-accepted' || (match.basis || []).includes('candidate')).length;
  const manual = approved.length ? Math.max(0, approved.length - candidatePairs) : fallbackManual;
  return Object.freeze({ manual, candidatePairs, total: approved.length || fallbackManual, blockers: input.approvedMatchSet?.summary?.blockerCount || 0 });
}

function cardMetric(label = '', value = '') {
  return `<div class="xmlc-transfer-metric"><b>${esc(label)}</b><span>${esc(value)}</span></div>`;
}

function transferOverview(input = {}, transferPreview = {}, tState = {}) {
  const approvals = approvalCounts(input);
  const summary = summarizeTransferOutput({ input, tState, lastAction: input.transferModal?.lastTransferOutputAction || '' });
  const blocks = summary.selectedBlocks.join(', ') || '-';
  const previewSummary = transferPreview?.summary || {};
  const gateBlockers = input.transferWorkflowGate?.blockers?.length || 0;
  return `<section class="xml-compare-panel xmlc-transfer-card"><div class="xml-compare-panel-title">Transfer summary</div><div class="xmlc-transfer-metrics">${cardMetric('Manual approved', approvals.manual)}${cardMetric('Candidate pairs', approvals.candidatePairs)}${cardMetric('Total approved', approvals.total)}${cardMetric('Workflow blockers', gateBlockers + approvals.blockers)}${cardMetric('Blocks selected', blocks)}${cardMetric('Node-owned blocks', previewSummary.nodeOwnedBlockCount || 0)}${cardMetric('Preview fields', previewSummary.previewCount || 0)}${cardMetric('Output status', summary.outputStatus)}</div></section>`;
}

function outputActionMeta(action = '') {
  const meta = {
    'stage-transfer': ['Stage transfer', 'stage', '🧩'],
    'clear-transfer-stage': ['Clear stage', 'clear', '↺'],
    'apply-staged-transfer': ['Apply staged transfer', 'apply', '✓'],
    'export-staged-transfer': ['Export patched target XML', 'export', '⬇'],
    'export-patched-target-xml': ['Export patched Target XML', 'export', '⬇'],
    'export-transfer-audit-json': ['Export transfer audit JSON', 'audit', '{}'],
    'download-transfer-proof-json': ['Export transfer proof JSON', 'proof', '✓'],
    'copy-patched-target-preview': ['Copy patched Target preview', 'copy', '⧉'],
    'export-transfer-artifact-bundle': ['Export all transfer artifacts', 'bundle', '⇩'],
    'export-transfer-history-json': ['Export history JSON', 'history', '⇩'],
  }[action] || [action, 'generic', '•'];
  return Object.freeze({ label: meta[0], kind: meta[1], icon: meta[2] });
}

function transferButton(action = '', scope = 'node', gate = null) {
  const meta = outputActionMeta(action);
  const disabled = gate && !gateAllowsAction(gate, action) ? 'disabled' : '';
  return `<button type="button" class="xmlc-transfer-action is-${esc(meta.kind)}" aria-label="${esc(meta.label)}" data-xml-compare-transfer-state-action="${esc(action)}" data-xml-compare-transfer-scope="${esc(scope)}" ${disabled}><span class="xmlc-transfer-action-icon" aria-hidden="true">${esc(meta.icon)}</span><span class="xmlc-transfer-action-label">${esc(meta.label)}</span></button>`;
}

function commandButton(action = '', preflight = null) {
  const meta = outputActionMeta(action);
  const readiness = transferExportReadinessForAction(preflight, action);
  const disabled = readiness.ready ? '' : 'disabled';
  const title = readiness.ready ? meta.label : `${readiness.reason} ${readiness.nextAction}`;
  const primary = action === 'export-patched-target-xml' ? ' is-primary' : '';
  return `<button type="button" class="xmlc-transfer-action is-${esc(meta.kind)}${primary}" aria-label="${esc(meta.label)}" title="${esc(title)}" data-xml-compare-action="${esc(action)}" data-xml-compare-preflight-status="${esc(readiness.status)}" ${disabled}><span class="xmlc-transfer-action-icon" aria-hidden="true">${esc(meta.icon)}</span><span class="xmlc-transfer-action-label">${esc(meta.label)}</span></button>`;
}

function legacyExportCompatibility() { return '<span hidden aria-label="Export patched target XML" class="xmlc-transfer-action is-export is-primary" data-xml-compare-transfer-state-action="export-staged-transfer"></span>'; }
function outputStateText(status = '') { return { 'no-stage': 'No stage yet', staged: 'Staged', applied: 'Applied', blocked: 'Blocked', exported: 'Exported' }[status] || status || 'No stage yet'; }
function outputPreview(summary = {}) { const text = clean(summary.patchedTargetText); if (!text) return '<div class="xml-compare-empty">Patched Target XML preview is available after applying staged transfer.</div>'; const body = text.length > 8000 ? `${text.slice(0, 8000)}\n... preview truncated ...` : text; return `<pre class="xml-compare-transfer-patched-preview">${esc(body)}</pre>`; }
function blockerList(summary = {}) { const reasons = summary.blockedReasons || []; if (!reasons.length) return '<small>No blockers reported for the current transfer output.</small>'; return `<ul>${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul>`; }
function preflightRow(row = {}) { return `<tr data-xml-compare-preflight-action="${esc(row.actionType)}"><td>${esc(row.label)}</td><td>${esc(row.status)}</td><td>${esc(row.reason)}</td><td>${esc(row.nextAction)}</td></tr>`; }
function preflightPanel(input = {}, tState = {}) { const preflight = summarizeTransferExportPreflight(createTransferExportPreflight({ input, tState })); return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-preflight" aria-label="Export preflight"><div class="xml-compare-panel-title">Export preflight</div><table class="xml-compare-transfer-preflight-table"><thead><tr><th>Action</th><th>Status</th><th>Reason</th><th>Next action</th></tr></thead><tbody>${preflight.rows.map(preflightRow).join('')}</tbody></table></section>`; }

function receiptPanel(input = {}) {
  const receipt = summarizeTransferExportReceipt(input.transferModal?.lastOutputReceipt);
  if (receipt.isEmpty) return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-receipt" aria-label="Last output receipt"><div class="xml-compare-panel-title">Last output receipt</div><div class="xml-compare-empty">No transfer output action has been exported or copied yet.</div></section>`;
  return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-receipt" aria-label="Last output receipt"><div class="xml-compare-panel-title">Last output receipt</div><div class="xmlc-transfer-metrics">${cardMetric('Action type', receipt.actionType)}${cardMetric('File / label', receipt.fileName || receipt.label)}${cardMetric('Timestamp', receipt.timestamp)}${cardMetric('Scope', receipt.scope)}${cardMetric('Selected blocks', receipt.selectedBlocks.join(', ') || '-')}${cardMetric('Updated count', receipt.updatedCount)}${cardMetric('Skipped count', receipt.skippedCount)}${cardMetric('Blocked count', receipt.blockedCount)}${cardMetric('Patched Target available', receipt.patchedTargetAvailable ? 'yes' : 'no')}${cardMetric('Output status', receipt.outputStatus)}</div></section>`;
}
function historyRow(row = {}) { return `<tr><td>${esc(row.actionType)}</td><td>${esc(row.fileName || row.label)}</td><td>${esc(row.timestamp)}</td><td>${esc(row.updatedCount)}</td><td>${esc(row.skippedCount)}</td><td>${esc(row.blockedCount)}</td><td>${esc(row.outputStatus)}</td></tr>`; }
function historyPanel(input = {}, tState = {}) {
  const history = summarizeTransferExportHistory(input.transferModal?.exportHistory);
  const readiness = transferExportReadinessForAction(createTransferExportPreflight({ input, tState }), 'export-transfer-history-json');
  const disabled = readiness.ready ? '' : 'disabled';
  const empty = '<div class="xml-compare-empty">No export history in this active tab session.</div>';
  const table = `<table class="xml-compare-transfer-history-table"><thead><tr><th>Action type</th><th>File / label</th><th>Timestamp</th><th>Updated</th><th>Skipped</th><th>Blocked</th><th>Status</th></tr></thead><tbody>${history.rows.map(historyRow).join('')}</tbody></table>`;
  return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-history" aria-label="Export history"><div class="xml-compare-panel-title">Export history</div>${history.isEmpty ? empty : table}<div class="xml-compare-transfer-apply-actions xmlc-transfer-output-actions"><button type="button" class="xmlc-transfer-action is-clear" data-xml-compare-action="clear-transfer-export-history" ${history.isEmpty ? 'disabled' : ''}>Clear export history</button><button type="button" class="xmlc-transfer-action is-export" data-xml-compare-action="export-transfer-history-json" data-xml-compare-preflight-status="${esc(readiness.status)}" title="${esc(readiness.ready ? 'Export history JSON' : `${readiness.reason} ${readiness.nextAction}`)}" ${disabled}>Export history JSON</button></div></section>`;
}

function outputActionBand(input = {}, tState = {}, stageScope = 'node') {
  const gate = input.transferWorkflowGate || null;
  const summary = summarizeTransferOutput({ input, tState, lastAction: input.transferModal?.lastTransferOutputAction || '' });
  const preflight = createTransferExportPreflight({ input, tState, summary });
  return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-output" aria-label="Transfer output and export artifacts"><div class="xml-compare-panel-title">Output status</div><div class="xmlc-transfer-output-body"><div class="xmlc-transfer-output-state"><b>${esc(outputStateText(summary.outputStatus))}</b><span>${esc(summary.fileNames.patchedTargetXml)}</span><small>Source: ${esc(summary.sourceFileName)} · Target: ${esc(summary.targetFileName)} · Scope: ${esc(summary.scope)} · Blocks: ${esc(summary.selectedBlocks.join(', ') || '-')}</small></div><div class="xmlc-transfer-metrics">${cardMetric('Updated', summary.updatedCount)}${cardMetric('Skipped', summary.skippedCount)}${cardMetric('Blocked', summary.blockedCount)}</div><div class="xml-compare-transfer-apply-actions xmlc-transfer-output-actions" data-xml-compare-transfer-state-actions>${transferButton('stage-transfer', stageScope, gate)}${transferButton('clear-transfer-stage', stageScope, null)}${transferButton('apply-staged-transfer', stageScope, gate)}${commandButton('export-patched-target-xml', preflight)}${commandButton('export-transfer-audit-json', preflight)}${commandButton('download-transfer-proof-json', preflight)}${commandButton('copy-patched-target-preview', preflight)}${commandButton('export-transfer-artifact-bundle', preflight)}${legacyExportCompatibility()}</div></div><div class="xml-compare-panel-title">Patched Target preview</div>${outputPreview(summary)}<div class="xml-compare-panel-title">Counts and blockers</div>${blockerList(summary)}</section>`;
}
function candidateTab(input = {}, isActive = false) { return `<div class="xml-compare-modal-tab-content ${isActive ? 'is-active' : ''}" data-xml-compare-modal-tab="candidate-review" style="${isActive ? '' : 'display: none;'}"><div class="xmlc-candidate-review-stack">${renderXmlCompareCandidateReviewControlsHtml(input)}${renderXmlCompareCandidatePairsPanelHtml(input)}</div></div>`; }
function transferTab(input = {}, tState = {}, stageScope = 'node', transferPreview = {}, isActive = false) { return `<div class="xml-compare-modal-tab-content ${isActive ? 'is-active' : ''} xmlc-transfer-review" data-xml-compare-modal-tab="transfer-compare" style="${isActive ? '' : 'display: none;'}">${transferOverview(input, transferPreview, tState)}${outputActionBand(input, tState, stageScope)}${preflightPanel(input, tState)}${receiptPanel(input)}${historyPanel(input, tState)}<section class="xml-compare-panel xmlc-transfer-card"><div class="xml-compare-panel-title">Transfer workflow</div>${renderXmlCompareTransferWorkflowPanelHtml({ gate: input.transferWorkflowGate })}${renderXmlCompareTransferStagePanelHtml({ transferState: tState, scope: stageScope, gate: input.transferWorkflowGate, showActions: false })}</section><section class="xml-compare-panel xmlc-transfer-card"><div class="xml-compare-panel-title">Block preview</div>${renderXmlCompareTransferPreviewPanelHtml(transferPreview)}</section><section class="xml-compare-panel xmlc-transfer-card"><div class="xml-compare-panel-title">Compare results</div>${comparePanel(input)}</section><details class="xml-compare-panel xmlc-transfer-card"><summary>Logs (${esc((input.logs || []).length)})</summary>${renderXmlCompareLogScreenHtml(input.logs || [])}</details><details class="xml-compare-panel xmlc-transfer-card"><summary>Diagnostics (${esc((input.diagnostics || []).length)})</summary>${renderXmlCompareDiagnosticsPanelHtml({ diagnostics: input.diagnostics || [] })}</details></div>`; }
export function renderXmlCompareTransferModalPopupHtml({ input = {}, tState = {}, stageScope = 'node', transferPreview = {} } = {}) { const activeTab = input.transferModal?.activeTab || 'candidate-review'; const isCandidateActive = activeTab === 'candidate-review'; const isTransferActive = activeTab === 'transfer-compare'; return `<dialog class="xml-compare-transfer-modal" data-xml-compare-transfer-modal data-schema="${XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA}"><header class="xml-compare-modal-header"><h2>Transfer & Compare Review</h2><button type="button" class="xml-compare-modal-close" data-xml-compare-action="close-transfer-modal" aria-label="Close">x</button></header><nav class="xml-compare-modal-tabs"><button type="button" class="xml-compare-modal-tab-btn ${isCandidateActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="candidate-review">Tab 1: Candidate Review</button><button type="button" class="xml-compare-modal-tab-btn ${isTransferActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="transfer-compare">Tab 2: Transfer & Compare</button></nav><div class="xml-compare-modal-body">${candidateTab(input, isCandidateActive)}${transferTab(input, tState, stageScope, transferPreview, isTransferActive)}</div></dialog>`; }
export const _test = Object.freeze({ esc, clean, approvalCounts, cardMetric, transferOverview, outputActionMeta, transferButton, commandButton, legacyExportCompatibility, outputStateText, outputPreview, blockerList, preflightRow, preflightPanel, receiptPanel, historyRow, historyPanel, outputActionBand, candidateTab, transferTab });

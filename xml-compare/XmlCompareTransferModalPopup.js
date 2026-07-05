import { renderXmlCompareTransferPreviewPanelHtml } from './XmlCompareTransferPreviewPanel.js';
import { renderXmlCompareTransferStagePanelHtml } from './XmlCompareTransferStagePanel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from './XmlCompareTransferWorkflowPanel.js';
import { gateAllowsAction } from './XmlCompareTransferWorkflowGateModel.js';
import { comparePanel, renderXmlCompareCandidatePairsPanelHtml, renderXmlCompareCandidateReviewControlsHtml } from './XmlCompareAnchorReviewPanel.js?v=20260704-c4';
import { renderXmlCompareLogScreenHtml } from './XmlCompareLogScreen.js';
import { renderXmlCompareDiagnosticsPanelHtml } from './XmlCompareDiagnosticsPanel.js';

export const XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA = 'xml-compare-transfer-modal-popup/v2-output-actions';

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
  const blocks = (input.aim?.transferBlocks || []).join(', ') || '-';
  const previewSummary = transferPreview?.summary || {};
  const stageStatus = tState.transferLastResult?.ok ? 'Applied in memory' : (tState.transferStage?.plan ? 'Staged' : 'Not staged');
  const gateBlockers = input.transferWorkflowGate?.blockers?.length || 0;
  return `<section class="xml-compare-panel xmlc-transfer-card">
    <div class="xml-compare-panel-title">Transfer summary</div>
    <div class="xmlc-transfer-metrics">
      ${cardMetric('Manual approved', approvals.manual)}
      ${cardMetric('Candidate pairs', approvals.candidatePairs)}
      ${cardMetric('Total approved', approvals.total)}
      ${cardMetric('Workflow blockers', gateBlockers + approvals.blockers)}
      ${cardMetric('Blocks selected', blocks)}
      ${cardMetric('Node-owned blocks', previewSummary.nodeOwnedBlockCount || 0)}
      ${cardMetric('Preview fields', previewSummary.previewCount || 0)}
      ${cardMetric('Stage status', stageStatus)}
    </div>
  </section>`;
}

function outputStatus(tState = {}) {
  if (tState.transferLastResult?.ok && tState.transferLastResult?.patchedTargetText) return 'Ready to export';
  if (tState.transferLastResult?.ok === false) return 'Blocked';
  if (tState.transferStage?.plan) return 'Staged - apply before export';
  return 'Stage transfer first';
}

function outputActionMeta(action = '') {
  const meta = {
    'stage-transfer': ['Stage transfer', 'stage', '🧩'],
    'clear-transfer-stage': ['Clear stage', 'clear', '↺'],
    'apply-staged-transfer': ['Apply staged transfer', 'apply', '✓'],
    'export-staged-transfer': ['Export patched target XML', 'export', '⬇'],
    'export-transfer-audit': ['Export transfer audit JSON', 'audit', '{}'],
  }[action] || [action, 'generic', '•'];
  return Object.freeze({ label: meta[0], kind: meta[1], icon: meta[2] });
}

function outputButton(action = '', label = '', scope = 'node', gate = null, primary = false) {
  const meta = outputActionMeta(action);
  const text = clean(label) || meta.label;
  const disabled = gate && !gateAllowsAction(gate, action) ? 'disabled' : '';
  const classes = ['xmlc-transfer-action', `is-${meta.kind}`, primary ? 'is-primary' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="${esc(classes)}" aria-label="${esc(text)}" data-xml-compare-transfer-state-action="${esc(action)}" data-xml-compare-transfer-scope="${esc(scope)}" ${disabled}><span class="xmlc-transfer-action-icon" aria-hidden="true">${esc(meta.icon)}</span><span class="xmlc-transfer-action-label">${esc(text)}</span></button>`;
}

function outputActionBand(input = {}, tState = {}, stageScope = 'node') {
  const gate = input.transferWorkflowGate || null;
  const name = tState.transferLastResult?.downloadName || 'target_transferred_categorized.xml';
  return `<section class="xml-compare-panel xmlc-transfer-card xmlc-transfer-output" aria-label="Output target XML actions">
    <div class="xml-compare-panel-title">Output target XML</div>
    <div class="xmlc-transfer-output-body">
      <div class="xmlc-transfer-output-state">
        <b>${esc(outputStatus(tState))}</b>
        <span>${esc(name)}</span>
      </div>
      <div class="xml-compare-transfer-apply-actions xmlc-transfer-output-actions" data-xml-compare-transfer-state-actions>
        ${outputButton('stage-transfer', '', stageScope, gate, false)}
        ${outputButton('clear-transfer-stage', '', stageScope, null, false)}
        ${outputButton('apply-staged-transfer', '', stageScope, gate, false)}
        ${outputButton('export-staged-transfer', '', stageScope, gate, true)}
        ${outputButton('export-transfer-audit', '', stageScope, null, false)}
      </div>
    </div>
  </section>`;
}

function candidateTab(input = {}, isActive = false) {
  return `<div class="xml-compare-modal-tab-content ${isActive ? 'is-active' : ''}" data-xml-compare-modal-tab="candidate-review" style="${isActive ? '' : 'display: none;'}">
    <div class="xmlc-candidate-review-stack">
      ${renderXmlCompareCandidateReviewControlsHtml(input)}
      ${renderXmlCompareCandidatePairsPanelHtml(input)}
    </div>
  </div>`;
}

function transferTab(input = {}, tState = {}, stageScope = 'node', transferPreview = {}, isActive = false) {
  return `<div class="xml-compare-modal-tab-content ${isActive ? 'is-active' : ''} xmlc-transfer-review" data-xml-compare-modal-tab="transfer-compare" style="${isActive ? '' : 'display: none;'}">
    ${transferOverview(input, transferPreview, tState)}
    ${outputActionBand(input, tState, stageScope)}
    <section class="xml-compare-panel xmlc-transfer-card">
      <div class="xml-compare-panel-title">Transfer workflow</div>
      ${renderXmlCompareTransferWorkflowPanelHtml({ gate: input.transferWorkflowGate })}
      ${renderXmlCompareTransferStagePanelHtml({ transferState: tState, scope: stageScope, gate: input.transferWorkflowGate, showActions: false })}
    </section>
    <section class="xml-compare-panel xmlc-transfer-card">
      <div class="xml-compare-panel-title">Block preview</div>
      ${renderXmlCompareTransferPreviewPanelHtml(transferPreview)}
    </section>
    <section class="xml-compare-panel xmlc-transfer-card">
      <div class="xml-compare-panel-title">Compare results</div>
      ${comparePanel(input)}
    </section>
    <details class="xml-compare-panel xmlc-transfer-card">
      <summary>Logs (${esc((input.logs || []).length)})</summary>
      ${renderXmlCompareLogScreenHtml(input.logs || [])}
    </details>
    <details class="xml-compare-panel xmlc-transfer-card">
      <summary>Diagnostics (${esc((input.diagnostics || []).length)})</summary>
      ${renderXmlCompareDiagnosticsPanelHtml({ diagnostics: input.diagnostics || [] })}
    </details>
  </div>`;
}

export function renderXmlCompareTransferModalPopupHtml({ input = {}, tState = {}, stageScope = 'node', transferPreview = {} } = {}) {
  const activeTab = input.transferModal?.activeTab || 'candidate-review';
  const isCandidateActive = activeTab === 'candidate-review';
  const isTransferActive = activeTab === 'transfer-compare';

  return `<dialog class="xml-compare-transfer-modal" data-xml-compare-transfer-modal data-schema="${XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA}">
    <header class="xml-compare-modal-header">
      <h2>Transfer & Compare Review</h2>
      <button type="button" class="xml-compare-modal-close" data-xml-compare-action="close-transfer-modal" aria-label="Close">x</button>
    </header>
    <nav class="xml-compare-modal-tabs">
      <button type="button" class="xml-compare-modal-tab-btn ${isCandidateActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="candidate-review">Tab 1: Candidate Review</button>
      <button type="button" class="xml-compare-modal-tab-btn ${isTransferActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="transfer-compare">Tab 2: Transfer & Compare</button>
    </nav>
    <div class="xml-compare-modal-body">
      ${candidateTab(input, isCandidateActive)}
      ${transferTab(input, tState, stageScope, transferPreview, isTransferActive)}
    </div>
  </dialog>`;
}

export const _test = Object.freeze({ esc, clean, approvalCounts, cardMetric, transferOverview, outputActionMeta, outputButton, outputActionBand, candidateTab, transferTab });

import { renderXmlCompareTransferPreviewPanelHtml } from './XmlCompareTransferPreviewPanel.js';
import { renderXmlCompareTransferStagePanelHtml } from './XmlCompareTransferStagePanel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from './XmlCompareTransferWorkflowPanel.js';
import { renderXmlCompareAnchorReviewPanelHtml, comparePanel } from './XmlCompareAnchorReviewPanel.js';
import { renderXmlCompareLogScreenHtml } from './XmlCompareLogScreen.js';
import { renderXmlCompareDiagnosticsPanelHtml } from './XmlCompareDiagnosticsPanel.js';

export const XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA = 'xml-compare-transfer-modal-popup/v1';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function renderXmlCompareTransferModalPopupHtml({ input = {}, tState = {}, stageScope = 'node', transferPreview = {}, validationCandidatesHtml = '' } = {}) {
  const activeTab = input.transferModal?.activeTab || 'candidate-review';
  const isCandidateActive = activeTab === 'candidate-review';
  const isTransferActive = activeTab === 'transfer-compare';
  
  // Tab 1 Content: Candidate Review
  const tab1Content = `
    <div class="xml-compare-modal-tab-content ${isCandidateActive ? 'is-active' : ''}" data-xml-compare-modal-tab="candidate-review" style="${isCandidateActive ? '' : 'display: none;'}">
      <div class="xmlc-workspace-columns">
        ${validationCandidatesHtml}
        <section class="xml-compare-panel xmlc-col xmlc-col-right">
          ${renderXmlCompareAnchorReviewPanelHtml(input)}
        </section>
      </div>
    </div>
  `;

  // Tab 2 Content: Transfer & Compare
  const tab2Content = `
    <div class="xml-compare-modal-tab-content ${isTransferActive ? 'is-active' : ''}" data-xml-compare-modal-tab="transfer-compare" style="${isTransferActive ? 'display: flex; flex-direction: column; gap: 16px; padding: 16px; height: 100%; overflow: auto;' : 'display: none;'}">
      
      <!-- Compare Panel -->
      <section class="xml-compare-panel" style="margin: 0;">
        <div class="xmlc-subtitle">Compare (approved pairs · selected fields)</div>
        ${comparePanel(input)}
      </section>

      <!-- Side-by-side: Transfer Preview and XML Compare Log -->
      <div class="xmlc-workspace-columns" style="display: flex; gap: 16px; min-height: 350px;">
        <section class="xml-compare-panel xmlc-col" style="flex: 1; overflow: auto; border: 1px solid rgba(147, 197, 253, 0.2); border-radius: 8px; background: rgba(15, 23, 42, 0.4); padding: 12px;">
          ${renderXmlCompareTransferPreviewPanelHtml(transferPreview)}
        </section>
        <section class="xml-compare-panel xmlc-col" style="flex: 1; overflow: auto; border: 1px solid rgba(147, 197, 253, 0.2); border-radius: 8px; background: rgba(15, 23, 42, 0.4); padding: 12px;">
          ${renderXmlCompareLogScreenHtml(input.logs || [])}
        </section>
      </div>

      <!-- Side-by-side: Readiness/Stage and Diagnostics -->
      <div class="xmlc-workspace-columns" style="display: flex; gap: 16px;">
        <section class="xml-compare-panel xmlc-col" style="flex: 1; border: 1px solid rgba(147, 197, 253, 0.2); border-radius: 8px; background: rgba(15, 23, 42, 0.4); padding: 12px;">
          <div class="xml-compare-panel-title" style="margin-top: 0;">Transfer Workflow Readiness</div>
          ${renderXmlCompareTransferWorkflowPanelHtml({ gate: input.transferWorkflowGate })}
          ${renderXmlCompareTransferStagePanelHtml({ transferState: tState, scope: stageScope, gate: input.transferWorkflowGate })}
        </section>
        <section class="xml-compare-panel xmlc-col" style="flex: 1; border: 1px solid rgba(147, 197, 253, 0.2); border-radius: 8px; background: rgba(15, 23, 42, 0.4); padding: 12px;">
          ${renderXmlCompareDiagnosticsPanelHtml({ diagnostics: input.diagnostics || [] })}
        </section>
      </div>

    </div>
  `;

  return `
    <dialog class="xml-compare-transfer-modal" data-xml-compare-transfer-modal data-schema="${XML_COMPARE_TRANSFER_MODAL_POPUP_SCHEMA}">
      <header class="xml-compare-modal-header">
        <h2>Transfer & Compare Review</h2>
        <button type="button" class="xml-compare-modal-close" data-xml-compare-action="close-transfer-modal" aria-label="Close">×</button>
      </header>
      <nav class="xml-compare-modal-tabs">
        <button type="button" class="xml-compare-modal-tab-btn ${isCandidateActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="candidate-review">Tab 1: Candidate Review</button>
        <button type="button" class="xml-compare-modal-tab-btn ${isTransferActive ? 'is-active' : ''}" data-xml-compare-action="switch-modal-tab" data-tab-target="transfer-compare">Tab 2: Transfer & Compare</button>
      </nav>
      <div class="xml-compare-modal-body">
        ${tab1Content}
        ${tab2Content}
      </div>
    </dialog>
  `;
}

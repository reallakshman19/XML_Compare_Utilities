import { renderXmlCompareGraphCanvasHtml } from './XmlCompareGraphCanvas.js';
import { renderXmlCompareGraphConnectorLaneHtml } from './XmlCompareGraphConnectorLane.js';
import { renderXmlCompareDebugPanelHtml } from './XmlCompareDebugPanel.js';
import { renderXmlCompareDetailsPanelHtml } from './XmlCompareDetailsPanel.js';
import { renderXmlCompareDiagnosticsPanelHtml } from './XmlCompareDiagnosticsPanel.js';
import { renderXmlCompareLogScreenHtml } from './XmlCompareLogScreen.js';
import { createXmlCompareTransferPreview } from './XmlCompareTransferPreview.js';
import { renderXmlCompareTransferPreviewPanelHtml } from './XmlCompareTransferPreviewPanel.js';
import { renderXmlCompareTransferStagePanelHtml } from './XmlCompareTransferStagePanel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from './XmlCompareTransferWorkflowPanel.js';
import { renderXmlCompareManualValidationBuilderHtml } from './XmlCompareManualValidationBuilderPanel.js';
import { renderXmlCompareAnchorReviewPanelHtml } from './XmlCompareAnchorReviewPanel.js';
import { availableCompareFields, normalizeCompareFields } from './XmlCompareFieldCompareModel.js';
import { normalizeToleranceMm, normalizeValidationLayer } from './XmlCompareValidationModel.js';

export const XML_COMPARE_WORKSPACE_SHELL_SCHEMA = 'xml-compare-workspace-shell/v29-manual-validation-runtime';
let loadDiagnosticsPromise = null, loadSamplePickersPromise = null, loadCategorizedConverterPromise = null, loadTableCategorizedPromise = null, loadToolbarGatePromise = null, loadTransferApplyPromise = null, loadCandidateReviewPromise = null, loadLinewiseInfoRulePromise = null, loadManualValidationBuilderPromise = null;
function loadTabDiagnostics() { if (typeof document !== 'undefined' && !loadDiagnosticsPromise) loadDiagnosticsPromise = import('../tabs/xml-compare-load-diagnostics-runtime.js?v=20260628-xml-compare-load-diagnostics-3').catch(() => null); }
function loadSamplePickers() { if (typeof document !== 'undefined' && !loadSamplePickersPromise) loadSamplePickersPromise = import('../tabs/xml-compare-enriched-sample-pickers.js?v=20260701-bm-cii-categorized-samples-1').catch(() => null); }
function loadCategorizedConverter() { if (typeof document !== 'undefined' && !loadCategorizedConverterPromise) loadCategorizedConverterPromise = import('../tabs/xml-compare-categorized-converter-runtime.js?v=20260630-clean-workflow-ui-1').catch(() => null); }
function loadTableCategorizedXml() { if (typeof document !== 'undefined' && !loadTableCategorizedPromise) loadTableCategorizedPromise = import('../tabs/xml-compare-table-categorized-runtime.js?v=20260703-extra-tools-1').catch(() => null); }
function loadToolbarGate() { if (typeof document !== 'undefined' && !loadToolbarGatePromise) loadToolbarGatePromise = import('../tabs/xml-compare-linewise-toolbar-gate.js?v=20260703-converter-shortcut-routing-1').catch(() => null); }
function loadTransferApplyRuntime() { if (typeof document !== 'undefined' && !loadTransferApplyPromise) loadTransferApplyPromise = import('../tabs/xml-compare-transfer-apply-runtime.js?v=20260703-state-backed-transfer-1').catch(() => null); }
function loadCandidateReviewRuntime() { if (typeof document !== 'undefined' && !loadCandidateReviewPromise) loadCandidateReviewPromise = import('../tabs/xml-compare-candidate-review-runtime.js?v=20260703-approved-connector-1').catch(() => null); }
function loadLinewiseInfoRuleRuntime() { if (typeof document !== 'undefined' && !loadLinewiseInfoRulePromise) loadLinewiseInfoRulePromise = import('../tabs/xml-compare-linewise-info-rule-runtime.js?v=20260701-linewise-rule-info-1').catch(() => null); }
function loadManualValidationBuilderRuntime() { if (typeof document !== 'undefined' && !loadManualValidationBuilderPromise) loadManualValidationBuilderPromise = import('../tabs/xml-compare-manual-validation-builder-runtime.js?v=20260703-manual-validation-builder-1').catch(() => null); }
const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
function loadLazyRuntimes() { loadTabDiagnostics(); loadSamplePickers(); loadCategorizedConverter(); loadTableCategorizedXml(); loadToolbarGate(); loadTransferApplyRuntime(); loadCandidateReviewRuntime(); loadLinewiseInfoRuleRuntime(); loadManualValidationBuilderRuntime(); }
function createManualState(input = {}) { return Object.freeze({ connectors: Object.freeze(Array.isArray(input.manualConnectors) ? input.manualConnectors : []), pendingSourceUid: input.pendingConnectorPreview ? input.pendingConnectorPreview.sourceUid : String(input.navStates?.source?.selectedUid || ''), pendingConnectorPreview: input.pendingConnectorPreview || null, approvedMatchSet: input.approvedMatchSet || null, approvedValidationModel: input.approvedValidationModel || null, candidateDecisions: input.candidateDecisions || null }); }
function transferState(input = {}) { return Object.freeze({ transferPreviewPlans: input.transferPreviewPlans || {}, transferStage: input.transferStage || null, transferAudit: input.transferAudit || null, postTransferValidation: input.postTransferValidation || null, transferLastResult: input.transferLastResult || null }); }
function sideCard(side, title, data = {}, navState = null, manualState = null) { return `<section class="xml-compare-workspace-side is-${esc(side)}">${renderXmlCompareGraphCanvasHtml({ side, title, data, navState, manualState })}</section>`; }
function compareFieldOptions(source = null, target = null, compareFields = []) { const selected = new Set(normalizeCompareFields(compareFields)), fields = availableCompareFields([...(source?.levelView?.fields || []), ...(target?.levelView?.fields || [])]); return fields.map((field) => `<option value="${esc(field)}" ${selected.has(field) ? 'disabled' : ''}>${esc(field)}</option>`).join(''); }
function validationFromRequest(matchMap = null) { return Object.freeze({ layer: normalizeValidationLayer(matchMap?.request?.validationLayer || 'current'), toleranceMm: normalizeToleranceMm(matchMap?.request?.toleranceMm), textRules: matchMap?.request?.textRules || {} }); }
function validationLayerOptions(selected = 'current') { return [['current', 'Current View Level'], ['lineBlock', 'LineBlock'], ['element', 'Element'], ['node', 'Node'], ['nodeEvidence', 'Node Evidence']].map(([value, label]) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(label)}</option>`).join(''); }
function validationControls(matchMap = null) { const settings = validationFromRequest(matchMap), downloads = matchMap?.request ? '<button type="button" data-xml-compare-action="download-validation-json">Download validation JSON</button><button type="button" data-xml-compare-action="download-validation-csv">Download validation CSV</button>' : '', presets = '<button type="button" data-xml-compare-compare-field-preset="coordinates">Coordinates preset</button><button type="button" data-xml-compare-compare-field-preset="element-endpoints">Element endpoints preset</button><button type="button" data-xml-compare-compare-field-preset="line-identity">Line identity preset</button><button type="button" data-xml-compare-compare-field-preset="support">Support preset</button>'; return `<div class="xml-compare-validation-controls" data-xml-compare-validation-controls><label>Applicable Hierarchy Layer<select data-xml-compare-validation-layer>${validationLayerOptions(settings.layer)}</select></label><label>Coordinate tolerance <input type="number" min="0" step="0.1" value="${esc(settings.toleranceMm)}" data-xml-compare-validation-tolerance-mm> mm</label>${presets}${downloads}</div>`; }
function compareFieldControls(source = null, target = null, compareFields = [], matchMap = null, validationBuilder = null, selectedRecords = {}, validation = {}) { const selected = normalizeCompareFields(compareFields); return `<div class="xml-compare-compare-field-controls" data-xml-compare-compare-fields><label>Compare fields<select data-xml-compare-compare-field-picker>${compareFieldOptions(source, target, selected)}</select></label><button type="button" data-xml-compare-add-compare-field>Add Field</button><div class="xml-compare-compare-field-list">${selected.map((field) => `<span class="xml-compare-compare-field-pill" data-xml-compare-compare-field="${esc(field)}">${esc(field)} <button type="button" data-xml-compare-remove-compare-field="${esc(field)}" aria-label="Remove ${esc(field)}">×</button></span>`).join('') || '<small>No compare fields selected.</small>'}</div>${renderXmlCompareManualValidationBuilderHtml({ builder: validationBuilder, compareFields: selected, selectedRecords, validation })}${validationControls(matchMap)}</div>`; }
function patchConnectorLaneActions(html = '', source = null, target = null, compareFields = [], matchMap = null, validationBuilder = null, selectedRecords = {}, validation = {}) { return String(html).replace(/<div class="xml-compare-auto-map-actions">([\s\S]*?)<\/div>/, (panel, body) => `<div class="xml-compare-auto-map-actions">${body}${compareFieldControls(source, target, compareFields, matchMap, validationBuilder, selectedRecords, validation)}</div>`); }
function connectorLane(input = {}, manualState = null) { return renderXmlCompareGraphConnectorLaneHtml({ manualState }); }
function validationCandidatesPanel(input = {}) { return `<section class="xml-compare-panel xmlc-col xmlc-col-left"><div class="xml-compare-panel-title">Validation candidates</div>${compareFieldControls(input.source, input.target, input.compareFields, input.matchMap, input.validationBuilder, input.selectedRecords, input.validation || {})}</section>`; }
import { renderXmlCompareTransferModalPopupHtml } from './XmlCompareTransferModalPopup.js';

export function renderXmlCompareWorkspaceShellHtml(input = {}) { loadLazyRuntimes(); const manualState = createManualState(input), tState = transferState(input), transferPreview = createXmlCompareTransferPreview({ source: input.source, target: input.target, manualConnectors: input.manualConnectors }), stageScope = tState.transferStage?.scope || 'node'; 
const validationCandidatesHtml = validationCandidatesPanel(input);
const approvedCount = manualState?.approvedMatchSet?.summary?.approvedCount || manualState?.connectors?.length || 0;
const reviewButton = `<button type="button" class="xml-compare-review-btn" data-xml-compare-action="open-transfer-modal">Review & Transfer (${approvedCount} approved)</button>`;

return `<section class="xml-compare-workspace-shell is-rebuilt" data-xml-compare-workspace-shell data-xml-compare-workspace-shell-schema="${XML_COMPARE_WORKSPACE_SHELL_SCHEMA}">
<div class="xml-compare-workspace-grid is-two-canvas">
  ${sideCard('source', 'Source', input.source || {}, input.navStates?.source, manualState)}
  <div class="xml-compare-connector-lane-container">
    ${connectorLane(input, manualState)}
    ${reviewButton}
  </div>
  ${sideCard('target', 'Target', input.target || {}, input.navStates?.target, manualState)}
</div>
${renderXmlCompareTransferModalPopupHtml({ input, tState, stageScope, transferPreview, validationCandidatesHtml })}
</section>`; }
export const _test = Object.freeze({ esc, createManualState, transferState, compareFieldOptions, compareFieldControls, validationFromRequest, validationLayerOptions, validationControls, patchConnectorLaneActions, loadLazyRuntimes, loadManualValidationBuilderRuntime });

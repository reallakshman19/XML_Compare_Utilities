import { applyXmlCompareCanvasAction, createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { applyXmlCompareSideload, buildXmlCompareSideloadFileName } from '../xml-compare/XmlCompareSideloadEnricher.js';
import { createEnrichmentConfig } from '../xml-compare/XmlCompareEnrichmentConfig.js';
import { applyXmlCompareEnrichment } from '../xml-compare/XmlCompareEnrichmentApply.js';
import { createXmlCompareWorkspaceModel } from '../xml-compare/XmlCompareWorkspaceModel.js';
import { createXmlCompareValidationModel } from '../xml-compare/XmlCompareValidationModel.js';
import { createValidationAudit, downloadValidationAuditCsv, downloadValidationAuditJson } from '../xml-compare/XmlCompareValidationAuditExport.js';
import { applyCompareFieldPreset } from '../xml-compare/XmlCompareCompareFieldPresets.js';
import { bytes, renderXmlCompareTabView } from '../xml-compare/XmlCompareTabView.js';
import { createInputReadinessAuditFromWorkspace, serializeInputReadinessAuditJson } from '../xml-compare/input/create-input-readiness-audit-from-workspace.js';
import {
  DEFAULT_XML_COMPARE_FILTERS,
  XML_COMPARE_BLOCK_CODES,
  XML_COMPARE_SCHEMA,
  buildTopologyIssuesCsv,
  buildXmlCompareReport,
  compareXmlDatasets,
  filterTopologyIssues,
  normalizeXmlCompareDatasetFromText,
  topologyIssueComponentIds,
  topologyIssuePassesFilters,
} from '../xml-compare/XmlCompareTopologyReportModel.js';

export {
  DEFAULT_XML_COMPARE_FILTERS,
  XML_COMPARE_BLOCK_CODES,
  XML_COMPARE_SCHEMA,
  buildTopologyIssuesCsv,
  buildXmlCompareReport,
  compareXmlDatasets,
  filterTopologyIssues,
  normalizeXmlCompareDatasetFromText,
  topologyIssueComponentIds,
  topologyIssuePassesFilters,
};

const APPROVED_CONNECTOR_ACTIONS = new Set(['approve-pending-connector', 'reject-pending-connector', 'clear-pending-connector']);
const ENRICHMENT_STORAGE_KEY = 'xml-compare-enrichment-config';
const clean = (value) => String(value ?? '').trim();

function loadEnrichmentFromStorage() {
  try { const raw = typeof localStorage !== 'undefined' && localStorage.getItem(ENRICHMENT_STORAGE_KEY); return raw ? JSON.parse(raw) || {} : {}; }
  catch { return {}; }
}

function saveEnrichmentToStorage(cfg) {
  try { if (typeof localStorage !== 'undefined') { const { open: _open, activeEnrTab: _tab, ...rest } = cfg; localStorage.setItem(ENRICHMENT_STORAGE_KEY, JSON.stringify(rest)); } }
  catch {}
}

function createInitialState() {
  return { fileA: null, fileB: null, textA: '', textB: '', report: null, filters: { ...DEFAULT_XML_COMPARE_FILTERS }, selectedIssueId: '', hiddenComponentIds: new Set(), canvasState: createXmlCompareCanvasState(), sideload: { open: false, side: 'a', lineIdText: '', nodeNameText: '', restraintTagText: '', lastReport: null }, enrichmentConfig: createEnrichmentConfig(loadEnrichmentFromStorage()), status: { kind: 'info', message: 'Load XML files to compare topology.' } };
}

function downloadText(name, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function workspaceFromState(state) {
  return createXmlCompareWorkspaceModel({ fileA: state.fileA, textA: state.textA, fileB: state.fileB, textB: state.textB, report: state.report, canvasState: state.canvasState });
}

function filteredIssues(report, state) {
  return filterTopologyIssues(report?.topologyIssues?.issues || [], state.filters).filter((issue) => !state.hiddenComponentIds.has(issue.componentId));
}

function render(container, state) {
  const workspace = workspaceFromState(state);
  container.innerHTML = renderXmlCompareTabView({ state, workspace, issues: filteredIssues(state.report, state) });
}

function canvasSideFrom(target) {
  return target.closest('[data-xml-compare-canvas-host]')?.dataset.xmlCompareCanvasHost === 'target' ? 'target' : 'source';
}

function recordsForSide(state, side) {
  const workspace = workspaceFromState(state);
  return workspace[side]?.records || [];
}

function applyCanvasStateAction(state, action, message = 'XML Compare state updated.') {
  state.canvasState = applyXmlCompareCanvasAction(state.canvasState, action);
  state.status = { kind: 'info', message };
  return true;
}

function applyCanvasClick(event, state) {
  const recordButton = event.target.closest('[data-xml-compare-record-uid]');
  const modeButton = event.target.closest('[data-xml-compare-nav-mode]');
  const actionButton = event.target.closest('[data-xml-compare-nav-action]');
  if (!recordButton && !modeButton && !actionButton) return false;
  const side = canvasSideFrom(recordButton || modeButton || actionButton);
  if (recordButton) return applyCanvasStateAction(state, { type: 'select-record', side, uid: recordButton.dataset.xmlCompareRecordUid, records: recordsForSide(state, side) }, `${side} record selected.`);
  if (modeButton) return applyCanvasStateAction(state, { type: 'set-mode', side, mode: modeButton.dataset.xmlCompareNavMode }, `${side} canvas mode: ${modeButton.dataset.xmlCompareNavMode}`);
  if (actionButton?.dataset.xmlCompareNavAction === 'fit-all') return applyCanvasStateAction(state, { type: 'fit-all', side, records: recordsForSide(state, side) }, `${side} canvas fit-all command prepared.`);
  return false;
}

function requestAutoMap(state, scope) {
  state.canvasState = applyXmlCompareCanvasAction(state.canvasState, { type: 'request-auto-map', scope });
  const workspace = workspaceFromState(state);
  const request = workspace.matchMap?.request;
  state.status = request ? { kind: 'ok', message: `Auto Map ${request.scope}: ${workspace.matchMap?.summary?.matchCount || 0} connector(s).` } : { kind: 'error', message: 'Select Source and Target before Auto Map.' };
}

function currentValidationAudit(state) {
  const workspace = workspaceFromState(state);
  const request = workspace.matchMap?.request || {};
  const validationModel = workspace.approvedValidationModel || createXmlCompareValidationModel({ source: workspace.source, target: workspace.target, matchMap: workspace.matchMap, compareFields: workspace.compareFields, validationLayer: request.validationLayer || 'current', toleranceMm: request.toleranceMm ?? 1, textRules: request.textRules || {} });
  return createValidationAudit({ sourceName: workspace.source?.fileName || 'Source A', targetName: workspace.target?.fileName || 'Target B', validationModel, compareFields: workspace.compareFields, validationLayer: request.validationLayer || 'current', toleranceMm: request.toleranceMm ?? 1 });
}

function downloadInputReadinessAudit(state) {
  const workspace = workspaceFromState(state);
  const audit = createInputReadinessAuditFromWorkspace({ state, workspace, generatedAt: new Date().toISOString() });
  downloadText('xml-input-readiness-audit.json', serializeInputReadinessAuditJson(audit), 'application/json;charset=utf-8');
  state.status = { kind: audit.summary.readyForConnector ? 'ok' : 'warn', message: `Input readiness JSON downloaded. ${audit.summary.blockerCount} blocker(s), ${audit.summary.warningCount} warning(s).` };
}

async function loadSelectedFile(input, state, container) {
  const file = input.files?.[0];
  if (!file) return;
  const side = input.dataset.xmlCompareLoad === 'b' ? 'b' : 'a';
  state.status = { kind: 'info', message: `Reading ${side === 'a' ? 'Source A' : 'Target B'}: ${file.name} ...` };
  render(container, state);
  try { await storeLoadedFile(file, side, state); }
  catch (error) { state.status = { kind: 'error', message: `Failed to read ${file.name}: ${error?.message || String(error)}` }; }
  render(container, state);
}

async function storeLoadedFile(file, side, state) {
  const text = await file.text();
  if (side === 'a') { state.fileA = file; state.textA = text; } else { state.fileB = file; state.textB = text; }
  state.report = null;
  state.canvasState = createXmlCompareCanvasState({ compareFields: state.canvasState.compareFields, validation: state.canvasState.validation });
  state.status = { kind: 'ok', message: `${side === 'a' ? 'Source A' : 'Target B'} loaded: ${file.name} (${bytes(file.size)}, ${text.length.toLocaleString()} chars).` };
}

function actionAndRender(container, state, action, message) {
  applyCanvasStateAction(state, action, message);
  render(container, state);
  return true;
}

function setCanvasLevel(container, state, select) {
  const side = select.dataset.xmlCompareSide === 'target' ? 'target' : 'source';
  const key = select.dataset.xmlCompareLevelSelect;
  state.canvasState = applyXmlCompareCanvasAction(state.canvasState, { type: 'set-level-view', side, selection: { [key]: select.value } });
  state.status = { kind: 'info', message: `${side} canvas ${key}: ${select.value}` };
  render(container, state);
  return true;
}

function handleChange(event, state, container) {
  const input = event.target.closest('[data-xml-compare-load]');
  if (input && container.contains(input)) return loadSelectedFile(input, state, container);
  const validationLayer = event.target.closest('[data-xml-compare-validation-layer]');
  if (validationLayer && container.contains(validationLayer)) return actionAndRender(container, state, { type: 'set-validation-layer', layer: validationLayer.value }, `Validation layer: ${clean(validationLayer.value) || 'current'}.`);
  const levelSelect = event.target.closest('[data-xml-compare-level-select]');
  if (levelSelect && container.contains(levelSelect)) return setCanvasLevel(container, state, levelSelect);
  const side = event.target.closest('[data-xml-compare-sideload-side]');
  if (side && container.contains(side)) { state.sideload = { ...state.sideload, side: side.value === 'b' ? 'b' : 'a', lastReport: null }; render(container, state); return true; }
  return false;
}

function handleInput(event, state, container) {
  const tolerance = event.target.closest('[data-xml-compare-validation-tolerance-mm]');
  if (tolerance && container.contains(tolerance)) return actionAndRender(container, state, { type: 'set-validation-tolerance-mm', toleranceMm: tolerance.value }, `Validation tolerance: ${clean(tolerance.value) || '1'} mm.`);
  const search = event.target.closest('[data-xml-compare-topology-filter="search"]');
  if (search && container.contains(search)) { state.filters = { ...state.filters, search: clean(search.value) }; render(container, state); return true; }
  const field = event.target.closest('[data-xml-compare-sideload-field]');
  if (field && container.contains(field)) { state.sideload = { ...state.sideload, [field.dataset.xmlCompareSideloadField]: field.value, lastReport: null }; return true; }
  return false;
}

function addCompareFieldFromPicker(container, state) {
  const field = clean(container.querySelector('[data-xml-compare-compare-field-picker]')?.value);
  return actionAndRender(container, state, { type: 'add-compare-field', field }, field ? `Compare field selected: ${field}.` : 'Choose a compare field before adding.');
}

function removeCompareFieldFromButton(container, state, button) {
  const field = clean(button?.dataset?.xmlCompareRemoveCompareField);
  return actionAndRender(container, state, { type: 'remove-compare-field', field }, field ? `Compare field removed: ${field}.` : 'No compare field was selected.');
}

function applyComparePresetFromButton(container, state, button) {
  const preset = clean(button?.dataset?.xmlCompareCompareFieldPreset);
  const fields = applyCompareFieldPreset(state.canvasState.compareFields, preset);
  return actionAndRender(container, state, { type: 'set-compare-fields', fields }, `Compare preset applied: ${preset}.`);
}

function handleClick(event, state, container) {
  const addField = event.target.closest('[data-xml-compare-add-compare-field]');
  if (addField && container.contains(addField)) return addCompareFieldFromPicker(container, state);
  const removeField = event.target.closest('[data-xml-compare-remove-compare-field]');
  if (removeField && container.contains(removeField)) return removeCompareFieldFromButton(container, state, removeField);
  const preset = event.target.closest('[data-xml-compare-compare-field-preset]');
  if (preset && container.contains(preset)) return applyComparePresetFromButton(container, state, preset);
  if (applyCanvasClick(event, state)) { render(container, state); return true; }
  return handleActionClick(event, state, container);
}

function handleActionClick(event, state, container) {
  const action = event.target.closest('[data-xml-compare-action]')?.dataset.xmlCompareAction;
  const topologyAction = event.target.closest('[data-xml-compare-topology-action]')?.dataset.xmlCompareTopologyAction;
  const row = event.target.closest('[data-xml-compare-topology-row]');
  if (row && container.contains(row)) { state.selectedIssueId = row.dataset.componentId || ''; render(container, state); return true; }
  if (APPROVED_CONNECTOR_ACTIONS.has(action)) return actionAndRender(container, state, { type: action }, `Connector action: ${action}.`);
  if (action === 'auto-map-node') { requestAutoMap(state, 'node'); render(container, state); return true; }
  if (action === 'clear-auto-map') return actionAndRender(container, state, { type: 'clear-auto-map' }, 'Auto Map result cleared.');
  return handleGeneralAction(action || topologyAction, state, container, event);
}

function handleGeneralAction(action, state, container, event) {
  if (!action) return false;
  if (action === 'compare') state.report = buildXmlCompareReport({ fileNameA: state.fileA?.name || 'xml-a.xml', textA: state.textA, fileNameB: state.fileB?.name || 'xml-b.xml', textB: state.textB, toleranceMm: 6 });
  else if (action === 'download-input-readiness-json') { downloadInputReadinessAudit(state); render(container, state); return true; }
  else if (action === 'download-validation-json') downloadValidationAuditJson(currentValidationAudit(state));
  else if (action === 'download-validation-csv') downloadValidationAuditCsv(currentValidationAudit(state));
  else if (action === 'open-sideload-a' || action === 'open-sideload-b') state.sideload = { ...state.sideload, open: true, side: action === 'open-sideload-b' ? 'b' : 'a' };
  else if (action === 'close-sideload') state.sideload = { ...state.sideload, open: false };
  else if (action === 'open-enrichment') state.enrichmentConfig = { ...state.enrichmentConfig, open: true };
  else if (action === 'close-enrichment') state.enrichmentConfig = { ...state.enrichmentConfig, open: false };
  else if (action === 'save-enrichment') saveEnrichment(state);
  else return handleExportOrVisibility(action, state, event);
  updateCompareStatus(state);
  render(container, state);
  return true;
}

function updateCompareStatus(state) {
  if (state.report) state.status = { kind: state.report.ok ? 'ok' : 'warn', message: `Comparison complete. ${state.report.topologyIssues.summary.issueCount} issue(s).` };
}

function saveEnrichment(state) {
  saveEnrichmentToStorage(state.enrichmentConfig);
  state.enrichmentConfig = { ...state.enrichmentConfig, open: false };
}

function handleExportOrVisibility(action, state, event) {
  if (action === 'apply-sideload') return Boolean(runSideload(state, { mutate: true }));
  if (action === 'export-sideload') { const result = runSideload(state, { mutate: false }); if (result) downloadText(result.fileName, result.xmlText, 'application/xml;charset=utf-8'); return true; }
  if (action === 'export-filtered-csv') { if (state.report) downloadText('xml-compare-filtered-topology-issues.csv', currentReportCsv(state), 'text/csv;charset=utf-8'); return true; }
  if (action === 'show-all') state.hiddenComponentIds = new Set();
  if (action === 'hide-filtered') state.hiddenComponentIds = new Set([...state.hiddenComponentIds, ...topologyIssueComponentIds(filterTopologyIssues(state.report?.topologyIssues?.issues || [], state.filters))]);
  if (action === 'enr-switch-tab') { const tabKey = event.target.closest('[data-enr-tab-key]')?.dataset.enrTabKey; if (tabKey) state.enrichmentConfig = { ...state.enrichmentConfig, activeEnrTab: tabKey }; }
  return true;
}

function runSideload(state, { mutate = false } = {}) {
  const side = state.sideload.side === 'b' ? 'b' : 'a';
  const sourceText = side === 'a' ? state.textA : state.textB;
  const sourceFile = side === 'a' ? state.fileA : state.fileB;
  if (!clean(sourceText)) { state.status = { kind: 'error', message: `Load ${side === 'a' ? 'Source A' : 'Target B'} XML before sideload.` }; return null; }
  const sideloadResult = applyXmlCompareSideload(sourceText, { lineIdText: state.sideload.lineIdText, nodeNameText: state.sideload.nodeNameText, restraintTagText: state.sideload.restraintTagText });
  const enrichResult = applyXmlCompareEnrichment(sideloadResult.xmlText, state.enrichmentConfig);
  const finalText = enrichResult.xmlText;
  state.sideload = { ...state.sideload, lastReport: { ...sideloadResult.report, enrichment: enrichResult.report } };
  if (mutate) { if (side === 'a') state.textA = finalText; else state.textB = finalText; state.report = null; }
  return { ...sideloadResult, xmlText: finalText, fileName: buildXmlCompareSideloadFileName(sourceFile?.name || `${side}-source.xml`), side };
}

function bind(container, state, signal) {
  container.addEventListener('change', async (event) => { await handleChange(event, state, container); }, { signal });
  container.addEventListener('input', (event) => { handleInput(event, state, container); }, { signal });
  container.addEventListener('click', (event) => { if (event.target.closest('[data-xml-compare-load]') || event.target.closest('.xml-compare-file-btn')) return; if (handleClick(event, state, container)) render(container, state); }, { signal });
  document.addEventListener('xml-compare:state-action', (event) => { if (event?.detail?.type) { applyCanvasStateAction(state, event.detail, `Semantic action: ${event.detail.type}.`); render(container, state); } }, { signal });
}

export function renderXmlCompareTab(container) {
  const state = createInitialState();
  const ctrl = new AbortController();
  render(container, state);
  bind(container, state, ctrl.signal);
  return () => { ctrl.abort(); container.innerHTML = ''; };
}

export const _test = Object.freeze({ createInitialState, normalizeXmlCompareDatasetFromText, compareXmlDatasets, buildXmlCompareReport, topologyIssuePassesFilters, filterTopologyIssues, topologyIssueComponentIds, buildTopologyIssuesCsv });

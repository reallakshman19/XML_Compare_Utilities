import { applyXmlCompareCanvasAction, createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { applyXmlCompareSideload, buildXmlCompareSideloadFileName } from '../xml-compare/XmlCompareSideloadEnricher.js';
import { createEnrichmentConfig } from '../xml-compare/XmlCompareEnrichmentConfig.js';
import { applyXmlCompareEnrichment } from '../xml-compare/XmlCompareEnrichmentApply.js';
import { createXmlCompareWorkspaceModel } from '../xml-compare/XmlCompareWorkspaceModel.js';
import { createXmlCompareValidationModel } from '../xml-compare/XmlCompareValidationModel.js';
import { createValidationAudit, downloadValidationAuditCsv, downloadValidationAuditJson } from '../xml-compare/XmlCompareValidationAuditExport.js';
import { applyCompareFieldPreset } from '../xml-compare/XmlCompareCompareFieldPresets.js';
import { bytes, renderXmlCompareTabView } from '../xml-compare/XmlCompareTabView.js';
import { buildInputReadinessGateSnapshot, serializeInputReadinessGateSnapshotJson } from '../xml-compare/input/build-input-readiness-gate-snapshot.js';
import { createInputReadinessAuditFromWorkspace, serializeInputReadinessAuditJson } from '../xml-compare/input/create-input-readiness-audit-from-workspace.js';
import { createTransferProof, serializeTransferProofJson } from '../xml-compare/XmlCompareTransferProofModel.js';
import { createTransferProofSampleLoadState, loadTransferProofSampleTexts } from '../xml-compare/XmlCompareTransferProofSampleLoader.js';
import { gateAllowsAction } from '../xml-compare/XmlCompareTransferWorkflowGateModel.js';
import { DEFAULT_XML_COMPARE_FILTERS, XML_COMPARE_BLOCK_CODES, XML_COMPARE_SCHEMA, buildTopologyIssuesCsv, buildXmlCompareReport, compareXmlDatasets, filterTopologyIssues, normalizeXmlCompareDatasetFromText, topologyIssueComponentIds, topologyIssuePassesFilters } from '../xml-compare/XmlCompareTopologyReportModel.js';

export { DEFAULT_XML_COMPARE_FILTERS, XML_COMPARE_BLOCK_CODES, XML_COMPARE_SCHEMA, buildTopologyIssuesCsv, buildXmlCompareReport, compareXmlDatasets, filterTopologyIssues, normalizeXmlCompareDatasetFromText, topologyIssueComponentIds, topologyIssuePassesFilters };
const APPROVED_CONNECTOR_ACTIONS = new Set(['approve-pending-connector', 'reject-pending-connector', 'clear-pending-connector']);
const TRANSFER_ACTIONS = new Set(['build-transfer-plan', 'stage-transfer', 'clear-transfer-stage', 'apply-staged-transfer', 'export-staged-transfer', 'export-transfer-audit']);
const GATED_ACTIONS = new Set(['stage-transfer', 'apply-staged-transfer', 'export-staged-transfer', 'download-transfer-proof-json', 'copy-patched-target-preview']);
const ENRICHMENT_STORAGE_KEY = 'xml-compare-enrichment-config';
const CACHE_KEY_A = 'xml-compare-cached-file-a';
const CACHE_KEY_B = 'xml-compare-cached-file-b';
const MAX_CACHE_BYTES = 5 * 1024 * 1024; // 5MB cap
const clean = (value) => String(value ?? '').trim();

function saveFileToStorage(key, file, text) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (text.length > MAX_CACHE_BYTES) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify({ name: file?.name || 'cached.xml', text }));
      }
    }
  } catch (e) { console.warn('Failed to cache file', e); }
}

function loadFileFromStorage(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.text) return { file: new File([data.text], data.name, { type: 'text/plain' }), text: data.text };
      }
    }
  } catch {}
  return null;
}

function loadEnrichmentFromStorage() { try { const raw = typeof localStorage !== 'undefined' && localStorage.getItem(ENRICHMENT_STORAGE_KEY); return raw ? JSON.parse(raw) || {} : {}; } catch { return {}; } }
function saveEnrichmentToStorage(cfg) { try { if (typeof localStorage !== 'undefined') { const { open: _open, activeEnrTab: _tab, ...rest } = cfg; localStorage.setItem(ENRICHMENT_STORAGE_KEY, JSON.stringify(rest)); } } catch {} }

function createInitialState() { 
  const cacheA = loadFileFromStorage(CACHE_KEY_A);
  const cacheB = loadFileFromStorage(CACHE_KEY_B);
  return { 
    fileA: cacheA?.file || null, 
    fileB: cacheB?.file || null, 
    textA: cacheA?.text || '', 
    textB: cacheB?.text || '', 
    workspaceRevision: (cacheA || cacheB) ? 1 : 0, 
    report: null, 
    filters: { ...DEFAULT_XML_COMPARE_FILTERS }, 
    selectedIssueId: '', 
    hiddenComponentIds: new Set(), 
    canvasState: createXmlCompareCanvasState(), 
    sideload: { open: false, side: 'a', lineIdText: '', nodeNameText: '', restraintTagText: '', lastReport: null }, 
    enrichmentConfig: createEnrichmentConfig(loadEnrichmentFromStorage()), 
    transferModal: { open: false, activeTab: 'candidate-review' },
    aim: { basis: 'coordinate', nameField: 'nodeName', nameDelimiter: '.', namePosition: 0, transferBlocks: ['RestraintsBlock'] },
    status: { kind: 'info', message: (cacheA || cacheB) ? 'Restored files from cache. Click Compare to rebuild topology.' : 'Load XML files to compare topology.' }
  };
}
function downloadText(name, text, type = 'text/plain;charset=utf-8') { const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function workspaceFromState(state) { return createXmlCompareWorkspaceModel({ fileA: state.fileA, textA: state.textA, fileB: state.fileB, textB: state.textB, report: state.report, canvasState: state.canvasState, transferModal: state.transferModal, aim: state.aim }); }
function transferGateFromState(state) { return workspaceFromState(state).transferWorkflowGate; }
function transferActionBlocked(action, state) { const gate = transferGateFromState(state); return GATED_ACTIONS.has(action) && !gateAllowsAction(gate, action) ? gate.nextAction : ''; }
function filteredIssues(report, state) { return filterTopologyIssues(report?.topologyIssues?.issues || [], state.filters).filter((issue) => !state.hiddenComponentIds.has(issue.componentId)); }
function currentReportCsv(state) { return buildTopologyIssuesCsv(filterTopologyIssues(state.report?.topologyIssues?.issues || [], state.filters)); }
function childPath(container, node) { const path = []; let el = node; while (el && el !== container) { const parent = el.parentElement; if (!parent) return null; path.unshift([...parent.children].indexOf(el)); el = parent; } return el === container ? path : null; }
function nodeAtPath(container, path) { let el = container; for (const index of path) { el = el?.children?.[index]; } return el || null; }
function captureRenderState(container) {
  const scrolls = [];
  const walk = (el, path) => { if (el.scrollTop || el.scrollLeft) scrolls.push([path, el.scrollTop, el.scrollLeft]); [...el.children].forEach((child, index) => walk(child, [...path, index])); };
  walk(container, []);
  const active = document.activeElement;
  const focusPath = active && container.contains(active) ? childPath(container, active) : null;
  const selection = focusPath && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  return { scrolls, winX: window.scrollX, winY: window.scrollY, focusPath, selection };
}
function restoreRenderState(container, saved) {
  for (const [path, top, left] of saved.scrolls) { const el = nodeAtPath(container, path); if (el) { el.scrollTop = top; el.scrollLeft = left; } }
  if (saved.focusPath) { const el = nodeAtPath(container, saved.focusPath); if (el?.focus) { el.focus({ preventScroll: true }); if (saved.selection && 'setSelectionRange' in el) { try { el.setSelectionRange(saved.selection[0], saved.selection[1]); } catch {} } } }
  window.scrollTo(saved.winX, saved.winY);
}
import { paintXmlCompareConnectorCanvas } from '../xml-compare/XmlCompareGraphConnectorLane.js';

function render(container, state) { 
  const saved = captureRenderState(container); 
  const workspace = workspaceFromState(state); 
  container.innerHTML = renderXmlCompareTabView({ state, workspace, issues: filteredIssues(state.report, state) }); 
  
  // Paint the canvas connectors if the element is present
  const canvas = container.querySelector('.xml-compare-graph-connector-canvas');
  if (canvas) {
    try {
      const payloadStr = canvas.dataset.xmlCompareCanvasPayload;
      if (payloadStr) {
        // Unescape the dataset payload (since we use our `esc()` function which replaces quotes)
        const unescaped = payloadStr.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
        const payload = JSON.parse(unescaped);
        paintXmlCompareConnectorCanvas(canvas, payload.connectors, payload.pendingPreview);
      }
    } catch (e) {
      console.warn('Failed to paint connector canvas', e);
    }
  }

  // Open the modal if the state says so
  if (state.transferModal?.open) {
    const modal = container.querySelector('.xml-compare-transfer-modal');
    if (modal && typeof modal.showModal === 'function') {
      try {
        modal.showModal();
      } catch (err) {}
    }
  }

  restoreRenderState(container, saved); 
}
function canvasSideFrom(target) { return target.closest('[data-xml-compare-canvas-host]')?.dataset.xmlCompareCanvasHost === 'target' ? 'target' : 'source'; }
function recordsForSide(state, side) { const workspace = workspaceFromState(state); return workspace[side]?.records || []; }
function applyCanvasStateAction(state, action, message = 'XML Compare state updated.') { state.canvasState = applyXmlCompareCanvasAction(state.canvasState, action); state.status = { kind: 'info', message }; return true; }
function syncNavStateToDom(container, state) {
  const sUid = state.canvasState.selectedRecords?.source?.uid;
  const tUid = state.canvasState.selectedRecords?.target?.uid;
  const hSrcUid = state.canvasState.hoverRecords?.source?.uid;
  const hTgtUid = state.canvasState.hoverRecords?.target?.uid;
  container.querySelectorAll('[data-xml-compare-canvas-host] [data-xml-compare-record-uid]').forEach(btn => {
    const side = canvasSideFrom(btn);
    const uid = btn.dataset.xmlCompareRecordUid;
    const isSelected = (side === 'source' && uid === sUid) || (side === 'target' && uid === tUid);
    const isHovered = (side === 'source' && uid === hSrcUid) || (side === 'target' && uid === hTgtUid);
    btn.classList.toggle('is-selected', isSelected);
    btn.classList.toggle('is-hovered', isHovered);
  });
}
function applyCanvasClick(event, state) { const recordButton = event.target.closest('[data-xml-compare-record-uid]'), modeButton = event.target.closest('[data-xml-compare-nav-mode]'), actionButton = event.target.closest('[data-xml-compare-nav-action]'); if (!recordButton && !modeButton && !actionButton) return false; const side = canvasSideFrom(recordButton || modeButton || actionButton); if (recordButton) { applyCanvasStateAction(state, { type: 'select-record', side, uid: recordButton.dataset.xmlCompareRecordUid, records: recordsForSide(state, side) }, `${side} record selected.`); return 'render'; } if (modeButton) { applyCanvasStateAction(state, { type: 'set-mode', side, mode: modeButton.dataset.xmlCompareNavMode }, `${side} canvas mode: ${modeButton.dataset.xmlCompareNavMode}`); return 'render'; } if (actionButton?.dataset.xmlCompareNavAction === 'fit-all') { applyCanvasStateAction(state, { type: 'fit-all', side, records: recordsForSide(state, side) }, `${side} canvas fit-all command prepared.`); return 'render'; } return false; }
function requestAutoMap(state, scope) { state.canvasState = applyXmlCompareCanvasAction(state.canvasState, { type: 'request-auto-map', scope }); const workspace = workspaceFromState(state), request = workspace.matchMap?.request; state.status = request ? { kind: 'ok', message: `Auto Map ${request.scope}: ${workspace.matchMap?.summary?.matchCount || 0} connector(s).` } : { kind: 'error', message: 'Select Source and Target before Auto Map.' }; }
function currentValidationAudit(state) { const workspace = workspaceFromState(state), request = workspace.matchMap?.request || {}, validationModel = workspace.approvedValidationModel || createXmlCompareValidationModel({ source: workspace.source, target: workspace.target, matchMap: workspace.matchMap, compareFields: workspace.compareFields, validationLayer: request.validationLayer || 'current', toleranceMm: request.toleranceMm ?? 1, textRules: request.textRules || {} }); return createValidationAudit({ sourceName: workspace.source?.fileName || 'Source A', targetName: workspace.target?.fileName || 'Target B', validationModel, compareFields: workspace.compareFields, validationLayer: request.validationLayer || 'current', toleranceMm: request.toleranceMm ?? 1 }); }
function currentTransferProof(state) { return createTransferProof({ transferAudit: state.canvasState.transferAudit, postTransferValidation: state.canvasState.postTransferValidation, transferLastResult: state.canvasState.transferLastResult, generatedAt: new Date().toISOString() }); }
function currentInputReadinessAudit(state) { const workspace = workspaceFromState(state); return createInputReadinessAuditFromWorkspace({ state, workspace, generatedAt: new Date().toISOString() }); }
function downloadInputReadinessAudit(state) { const audit = currentInputReadinessAudit(state); downloadText('xml-input-readiness-audit.json', serializeInputReadinessAuditJson(audit), 'application/json;charset=utf-8'); state.status = { kind: audit.summary.readyForConnector ? 'ok' : 'warn', message: `Input readiness JSON downloaded. ${audit.summary.blockerCount} blocker(s), ${audit.summary.warningCount} warning(s).` }; }
function downloadReadinessGateSnapshot(state) { const snapshot = buildInputReadinessGateSnapshot(currentInputReadinessAudit(state)); downloadText('xml-input-readiness-gate-snapshot.json', serializeInputReadinessGateSnapshotJson(snapshot), 'application/json;charset=utf-8'); state.status = { kind: snapshot.gate.status === 'PASS' ? 'ok' : 'warn', message: `Readiness gate ${snapshot.gate.status}. ${snapshot.gate.blockerCount} blocker(s), ${snapshot.gate.warningCount} warning(s).` }; }
function downloadTransferProof(state) { const proof = currentTransferProof(state); downloadText('xml-compare-transfer-proof.json', serializeTransferProofJson(proof), 'application/json;charset=utf-8'); state.status = { kind: proof.ok ? 'ok' : 'warn', message: `Transfer proof JSON downloaded. ${proof.updatedCount} updated, ${proof.skippedCount} skipped, ${proof.blockedCount} blocked.` }; }
function copyPatchedTargetPreview(state) { const text = state.canvasState.transferLastResult?.patchedTargetText || ''; if (!text) { state.status = { kind: 'warn', message: 'No patched Target B preview is available to copy.' }; return; } if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {}); state.status = { kind: 'ok', message: 'Patched Target B preview copy requested.' }; }
async function loadTransferProofSample(state, container) { state.status = { kind: 'info', message: 'Loading transfer proof sample...' }; render(container, state); try { const sample = await loadTransferProofSampleTexts(); Object.assign(state, createTransferProofSampleLoadState({ ...sample, previousRevision: state.workspaceRevision })); state.canvasState = createXmlCompareCanvasState({ compareFields: state.canvasState.compareFields, validation: state.canvasState.validation }); } catch (error) { state.status = { kind: 'error', message: `Failed to load transfer proof sample: ${error?.message || String(error)}` }; } render(container, state); }
async function loadSelectedFile(input, state, container) { const file = input.files?.[0]; if (!file) return; const side = input.dataset.xmlCompareLoad === 'b' ? 'b' : 'a'; state.status = { kind: 'info', message: `Reading ${side === 'a' ? 'Source A' : 'Target B'}: ${file.name} ...` }; render(container, state); try { await storeLoadedFile(file, side, state); } catch (error) { state.status = { kind: 'error', message: `Failed to read ${file.name}: ${error?.message || String(error)}` }; } render(container, state); }
async function storeLoadedFile(file, side, state) { const text = await file.text(); if (side === 'a') { state.fileA = file; state.textA = text; saveFileToStorage(CACHE_KEY_A, file, text); } else { state.fileB = file; state.textB = text; saveFileToStorage(CACHE_KEY_B, file, text); } state.workspaceRevision += 1; state.report = null; state.canvasState = createXmlCompareCanvasState({ compareFields: state.canvasState.compareFields, validation: state.canvasState.validation }); state.status = { kind: 'ok', message: `${side === 'a' ? 'Source A' : 'Target B'} loaded: ${file.name} (${bytes(file.size)}, ${text.length.toLocaleString()} chars).` }; }
function actionAndRender(container, state, action, message) { applyCanvasStateAction(state, action, message); render(container, state); return true; }
function setCanvasLevel(container, state, select) { const side = select.dataset.xmlCompareSide === 'target' ? 'target' : 'source', key = select.dataset.xmlCompareLevelSelect; state.canvasState = applyXmlCompareCanvasAction(state.canvasState, { type: 'set-level-view', side, selection: { [key]: select.value } }); state.status = { kind: 'info', message: `${side} canvas ${key}: ${select.value}` }; render(container, state); return true; }
function updateAim(state, patch) { state.aim = { ...state.aim, ...patch }; }
function handleAimChange(event, state, container) {
  const basis = event.target.closest('[data-xml-compare-aim-basis]');
  if (basis && container.contains(basis)) { updateAim(state, { basis: basis.value }); state.status = { kind: 'info', message: `Match basis: ${basis.value}.` }; render(container, state); return true; }
  const block = event.target.closest('[data-xml-compare-aim-block]');
  if (block && container.contains(block)) { const name = clean(block.dataset.xmlCompareAimBlock); const set = new Set(state.aim.transferBlocks || []); if (block.checked) set.add(name); else set.delete(name); updateAim(state, { transferBlocks: [...set] }); state.status = { kind: 'info', message: `Transfer blocks: ${[...set].join(', ') || 'none'}.` }; render(container, state); return true; }
  const nameField = event.target.closest('[data-xml-compare-aim-name-field]');
  if (nameField && container.contains(nameField)) { updateAim(state, { nameField: nameField.value }); render(container, state); return true; }
  return false;
}
function handleAimInput(event, state, container) {
  const delim = event.target.closest('[data-xml-compare-aim-name-delimiter]');
  if (delim && container.contains(delim)) { updateAim(state, { nameDelimiter: delim.value }); render(container, state); return true; }
  const pos = event.target.closest('[data-xml-compare-aim-name-position]');
  if (pos && container.contains(pos)) { updateAim(state, { namePosition: Number(pos.value) || 0 }); render(container, state); return true; }
  return false;
}
function handleChange(event, state, container) { if (handleAimChange(event, state, container)) return true; const input = event.target.closest('[data-xml-compare-load]'); if (input && container.contains(input)) return loadSelectedFile(input, state, container); const validationLayer = event.target.closest('[data-xml-compare-validation-layer]'); if (validationLayer && container.contains(validationLayer)) return actionAndRender(container, state, { type: 'set-validation-layer', layer: validationLayer.value }, `Validation layer: ${clean(validationLayer.value) || 'current'}.`); const levelSelect = event.target.closest('[data-xml-compare-level-select]'); if (levelSelect && container.contains(levelSelect)) return setCanvasLevel(container, state, levelSelect); const side = event.target.closest('[data-xml-compare-sideload-side]'); if (side && container.contains(side)) { state.sideload = { ...state.sideload, side: side.value === 'b' ? 'b' : 'a', lastReport: null }; render(container, state); return true; } return false; }
function handleInput(event, state, container) { if (handleAimInput(event, state, container)) return true; const tolerance = event.target.closest('[data-xml-compare-validation-tolerance-mm]'); if (tolerance && container.contains(tolerance)) return actionAndRender(container, state, { type: 'set-validation-tolerance-mm', toleranceMm: tolerance.value }, `Validation tolerance: ${clean(tolerance.value) || '1'} mm.`); const candNumThresh = event.target.closest('[data-xml-compare-candidate-bulk-numeric-threshold]'); if (candNumThresh && container.contains(candNumThresh)) return actionAndRender(container, state, { type: 'set-candidate-tolerance-mm', toleranceMm: Number(candNumThresh.value) }, `Candidate tolerance: ${candNumThresh.value} mm.`); const candTextThresh = event.target.closest('[data-xml-compare-candidate-bulk-text-threshold]'); if (candTextThresh && container.contains(candTextThresh)) return actionAndRender(container, state, { type: 'set-candidate-text-threshold', textMatchThreshold: Number(candTextThresh.value) / 100 }, `Candidate text threshold: ${candTextThresh.value}%.`); const search = event.target.closest('[data-xml-compare-topology-filter="search"]'); if (search && container.contains(search)) { state.filters = { ...state.filters, search: clean(search.value) }; render(container, state); return true; } const field = event.target.closest('[data-xml-compare-sideload-field]'); if (field && container.contains(field)) { state.sideload = { ...state.sideload, [field.dataset.xmlCompareSideloadField]: field.value, lastReport: null }; return true; } return false; }
function addCompareFieldFromPicker(container, state) { const field = clean(container.querySelector('[data-xml-compare-compare-field-picker]')?.value); return actionAndRender(container, state, { type: 'add-compare-field', field }, field ? `Compare field selected: ${field}.` : 'Choose a compare field before adding.'); }
function removeCompareFieldFromButton(container, state, button) { const field = clean(button?.dataset?.xmlCompareRemoveCompareField); return actionAndRender(container, state, { type: 'remove-compare-field', field }, field ? `Compare field removed: ${field}.` : 'No compare field was selected.'); }
function applyComparePresetFromButton(container, state, button) { const preset = clean(button?.dataset?.xmlCompareCompareFieldPreset), fields = applyCompareFieldPreset(state.canvasState.compareFields, preset); return actionAndRender(container, state, { type: 'set-compare-fields', fields }, `Compare preset applied: ${preset}.`); }
function candidateFromButton(button) { const d = button.dataset; return { id: `candidate:${clean(d.sourceUid)}=>${clean(d.targetUid)}`, sourceUid: clean(d.sourceUid), targetUid: clean(d.targetUid), sourceStableKey: clean(d.sourceStable), targetStableKey: clean(d.targetStable), sourceLabel: clean(d.sourceLabel), targetLabel: clean(d.targetLabel), status: clean(d.status), score: 0.85, identityConfidence: 0.85 }; }
function handleCandidateClick(event, state, container) { const approve = event.target.closest('[data-xml-compare-candidate-approve]'); if (approve && container.contains(approve)) { const candidate = candidateFromButton(approve); applyCanvasStateAction(state, { type: 'accept-candidate', candidate }, `Candidate approved: ${candidate.sourceLabel} → ${candidate.targetLabel}.`); render(container, state); return true; } const reject = event.target.closest('[data-xml-compare-candidate-reject]'); if (reject && container.contains(reject)) { const candidate = candidateFromButton(reject); applyCanvasStateAction(state, { type: 'reject-candidate', candidate, candidateId: candidate.id }, `Candidate rejected: ${candidate.sourceLabel}.`); render(container, state); return true; } const bulkApprove = event.target.closest('[data-xml-compare-action="bulk-approve-candidate-pairs"]'); if (bulkApprove && container.contains(bulkApprove)) { const workspace = workspaceFromState(state); const pairs = workspace.candidatePairs?.pairs || []; const validCandidates = pairs.filter(p => p.status === 'valid' && !p.isAnchor); if (validCandidates.length > 0) { applyCanvasStateAction(state, { type: 'bulk-approve-candidate-pairs', candidates: validCandidates }, `Bulk approved ${validCandidates.length} candidate pairs.`); render(container, state); } return true; } return false; }
function handleClick(event, state, container) { const addField = event.target.closest('[data-xml-compare-add-compare-field]'), removeField = event.target.closest('[data-xml-compare-remove-compare-field]'), preset = event.target.closest('[data-xml-compare-compare-field-preset]'); if (addField && container.contains(addField)) return addCompareFieldFromPicker(container, state); if (removeField && container.contains(removeField)) return removeCompareFieldFromButton(container, state, removeField); if (preset && container.contains(preset)) return applyComparePresetFromButton(container, state, preset); if (handleCandidateClick(event, state, container)) return true; const canvasClick = applyCanvasClick(event, state); if (canvasClick === 'nav') { syncNavStateToDom(container, state); return 'nav'; } if (canvasClick === 'render') { render(container, state); return 'nav'; } return handleActionClick(event, state, container); }
function handleActionClick(event, state, container) { const action = event.target.closest('[data-xml-compare-action]')?.dataset.xmlCompareAction, topologyAction = event.target.closest('[data-xml-compare-topology-action]')?.dataset.xmlCompareTopologyAction, row = event.target.closest('[data-xml-compare-topology-row]'); if (row && container.contains(row)) { state.selectedIssueId = row.dataset.componentId || ''; render(container, state); return 'nav'; } if (APPROVED_CONNECTOR_ACTIONS.has(action)) return actionAndRender(container, state, { type: action }, `Connector action: ${action}.`); if (action === 'auto-map-node') { requestAutoMap(state, 'node'); render(container, state); return 'nav'; } if (action === 'clear-auto-map') return actionAndRender(container, state, { type: 'clear-auto-map' }, 'Auto Map result cleared.'); return handleGeneralAction(action || topologyAction, state, container, event); }
function handleGeneralAction(action, state, container, event) { 
  if (!action) return false; 
  const blocked = transferActionBlocked(action, state); 
  if (blocked) { state.status = { kind: 'warn', message: blocked }; render(container, state); return 'nav'; } 
  if (action === 'compare') state.report = buildXmlCompareReport({ fileNameA: state.fileA?.name || 'xml-a.xml', textA: state.textA, fileNameB: state.fileB?.name || 'xml-b.xml', textB: state.textB, toleranceMm: 6 }); 
  else if (action === 'load-transfer-proof-sample') return loadTransferProofSample(state, container); 
  else if (action === 'download-input-readiness-json') { downloadInputReadinessAudit(state); render(container, state); return 'nav'; } 
  else if (action === 'download-readiness-gate-json') { downloadReadinessGateSnapshot(state); render(container, state); return 'nav'; } 
  else if (action === 'download-transfer-proof-json') { downloadTransferProof(state); render(container, state); return 'nav'; } 
  else if (action === 'copy-patched-target-preview') { copyPatchedTargetPreview(state); render(container, state); return 'nav'; } 
  else if (action === 'download-validation-json') downloadValidationAuditJson(currentValidationAudit(state)); 
  else if (action === 'download-validation-csv') downloadValidationAuditCsv(currentValidationAudit(state)); 
  else if (action === 'open-sideload-a' || action === 'open-sideload-b') state.sideload = { ...state.sideload, open: true, side: action === 'open-sideload-b' ? 'b' : 'a' }; 
  else if (action === 'close-sideload') state.sideload = { ...state.sideload, open: false }; 
  else if (action === 'open-enrichment') state.enrichmentConfig = { ...state.enrichmentConfig, open: true }; 
  else if (action === 'close-enrichment') state.enrichmentConfig = { ...state.enrichmentConfig, open: false }; 
  else if (action === 'save-enrichment') saveEnrichment(state); 
  else if (action === 'open-transfer-modal') state.transferModal = { ...state.transferModal, open: true }; 
  else if (action === 'close-transfer-modal') state.transferModal = { ...state.transferModal, open: false }; 
  else if (action === 'switch-modal-tab') { 
    event.preventDefault();
    const targetTab = event.target.closest('[data-tab-target]')?.dataset.tabTarget;
    if (targetTab) {
      state.transferModal = { ...state.transferModal, activeTab: targetTab };
      const modal = container.querySelector('.xml-compare-transfer-modal');
      if (modal) {
        modal.querySelectorAll('.xml-compare-modal-tab-btn').forEach(b => b.classList.toggle('is-active', b.dataset.tabTarget === targetTab));
        modal.querySelectorAll('.xml-compare-modal-tab-content').forEach(c => {
          const isActive = c.dataset.xmlCompareModalTab === targetTab;
          c.classList.toggle('is-active', isActive);
          c.style.display = isActive ? '' : 'none';
        });
      }
    }
    return 'nav';
  }
  else return handleExportOrVisibility(action, state, event); 

  updateCompareStatus(state); 
  render(container, state); 
  return 'nav'; 
}
function updateCompareStatus(state) { if (state.report) state.status = { kind: state.report.ok ? 'ok' : 'warn', message: `Comparison complete. ${state.report.topologyIssues.summary.issueCount} issue(s).` }; }
function saveEnrichment(state) { saveEnrichmentToStorage(state.enrichmentConfig); state.enrichmentConfig = { ...state.enrichmentConfig, open: false }; }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function buildCompareCsv(state) { const report = workspaceFromState(state).compareReport; if (!report?.pairCount) return ''; const lines = ['sourceUid,targetUid,field,sourceValue,targetValue,delta,matchPct,status']; for (const pair of report.pairs) for (const row of pair.rows) lines.push([pair.sourceUid, pair.targetUid, row.field, csvCell(row.sourceValue), csvCell(row.targetValue), row.delta ?? '', row.matchPct ?? '', row.status].join(',')); return `${lines.join('\n')}\n`; }
function handleExportOrVisibility(action, state, event) { if (action === 'export-compare-csv') { const csv = buildCompareCsv(state); if (csv) downloadText('xml-compare-field-compare.csv', csv, 'text/csv;charset=utf-8'); state.status = { kind: csv ? 'ok' : 'warn', message: csv ? 'Compare CSV downloaded.' : 'Approve pairs before exporting compare.' }; return 'nav'; } if (action === 'export-compare-json') { const report = workspaceFromState(state).compareReport; downloadText('xml-compare-field-compare.json', `${JSON.stringify(report, null, 2)}\n`, 'application/json;charset=utf-8'); state.status = { kind: 'ok', message: 'Compare JSON downloaded.' }; return 'nav'; } if (action === 'apply-sideload') { runSideload(state, { mutate: true }); return true; } if (action === 'export-sideload') { const result = runSideload(state, { mutate: false }); if (result) downloadText(result.fileName, result.xmlText, 'application/xml;charset=utf-8'); return 'nav'; } if (action === 'export-filtered-csv') { if (state.report) downloadText('xml-compare-filtered-topology-issues.csv', currentReportCsv(state), 'text/csv;charset=utf-8'); return 'nav'; } if (action === 'show-all') state.hiddenComponentIds = new Set(); if (action === 'hide-filtered') state.hiddenComponentIds = new Set([...state.hiddenComponentIds, ...topologyIssueComponentIds(filterTopologyIssues(state.report?.topologyIssues?.issues || [], state.filters))]); if (action === 'enr-switch-tab') { const tabKey = event.target.closest('[data-enr-tab-key]')?.dataset.enrTabKey; if (tabKey) state.enrichmentConfig = { ...state.enrichmentConfig, activeEnrTab: tabKey }; } return true; }
function runSideload(state, { mutate = false } = {}) { const side = state.sideload.side === 'b' ? 'b' : 'a', sourceText = side === 'a' ? state.textA : state.textB, sourceFile = side === 'a' ? state.fileA : state.fileB; if (!clean(sourceText)) { state.status = { kind: 'error', message: `Load ${side === 'a' ? 'Source A' : 'Target B'} XML before sideload.` }; return null; } const sideloadResult = applyXmlCompareSideload(sourceText, { lineIdText: state.sideload.lineIdText, nodeNameText: state.sideload.nodeNameText, restraintTagText: state.sideload.restraintTagText }), enrichResult = applyXmlCompareEnrichment(sideloadResult.xmlText, state.enrichmentConfig), finalText = enrichResult.xmlText; state.sideload = { ...state.sideload, lastReport: { ...sideloadResult.report, enrichment: enrichResult.report } }; if (mutate) { if (side === 'a') state.textA = finalText; else state.textB = finalText; state.workspaceRevision += 1; state.report = null; } return { ...sideloadResult, xmlText: finalText, fileName: buildXmlCompareSideloadFileName(sourceFile?.name || `${side}-source.xml`), side }; }
function transferDownloadName(state) { const name = clean(state.fileB?.name || 'target-categorized.xml').replace(/\.(xml|txt)$/i, ''); return `${name}_transferred_categorized.xml`; }
function enrichTransferAction(detail, state) { if (!TRANSFER_ACTIONS.has(detail.type)) return detail; const workspace = workspaceFromState(state); const selectedBlocks = state.aim?.transferBlocks?.length ? state.aim.transferBlocks : (detail.selectedBlocks?.length ? detail.selectedBlocks : undefined); return { ...detail, selectedBlocks, sourceText: state.textA, targetText: state.textB, workspaceRevision: state.workspaceRevision, approvedMatchSet: workspace.approvedMatchSet, approvedValidationModel: workspace.approvedValidationModel, sourceRecords: workspace.source.records, targetRecords: workspace.target.records, downloadName: transferDownloadName(state) }; }
function afterStateAction(detail, state) { if (detail.type === 'export-staged-transfer' && state.canvasState.transferLastResult?.ok) downloadText(state.canvasState.transferLastResult.downloadName, state.canvasState.transferLastResult.patchedTargetText, 'application/xml;charset=utf-8'); if (detail.type === 'export-transfer-audit' && state.canvasState.transferAudit) downloadText('xml-compare-transfer-patch-audit.json', `${JSON.stringify(state.canvasState.transferAudit, null, 2)}\n`, 'application/json;charset=utf-8'); }
function handleStateEvent(event, state, container) { if (!event?.detail?.type) return; const blocked = transferActionBlocked(event.detail.type, state); if (blocked) { state.status = { kind: 'warn', message: blocked }; render(container, state); return; } const detail = enrichTransferAction(event.detail, state); applyCanvasStateAction(state, detail, `Semantic action: ${detail.type}.`); afterStateAction(detail, state); render(container, state); }
function bind(container, state, signal) { 
  container.addEventListener('change', async (event) => { await handleChange(event, state, container); }, { signal }); 
  container.addEventListener('input', (event) => { handleInput(event, state, container); }, { signal }); 
  container.addEventListener('mouseover', (event) => {
    const recordButton = event.target.closest('[data-xml-compare-record-uid]');
    if (recordButton) {
      const side = canvasSideFrom(recordButton);
      applyCanvasStateAction(state, { type: 'hover-record', side, uid: recordButton.dataset.xmlCompareRecordUid, records: recordsForSide(state, side) }, `${side} record hovered.`);
      syncNavStateToDom(container, state);
    }
  }, { signal });
  container.addEventListener('mouseout', (event) => {
    const recordButton = event.target.closest('[data-xml-compare-record-uid]');
    if (recordButton && !event.relatedTarget?.closest?.('[data-xml-compare-record-uid]')) {
      const side = canvasSideFrom(recordButton);
      applyCanvasStateAction(state, { type: 'hover-record', side, uid: '', records: recordsForSide(state, side) }, `${side} record unhovered.`);
      syncNavStateToDom(container, state);
    }
  }, { signal });
  container.addEventListener('click', (event) => { 
    if (event.target.closest('[data-xml-compare-load]') || event.target.closest('.xml-compare-file-btn')) return; 
    const result = handleClick(event, state, container);
    if (result === true) render(container, state); 
  }, { signal }); 
  document.addEventListener('xml-compare:state-action', (event) => handleStateEvent(event, state, container), { signal }); 
}
export function renderXmlCompareTab(container) { const state = createInitialState(), ctrl = new AbortController(); render(container, state); bind(container, state, ctrl.signal); return () => { ctrl.abort(); container.innerHTML = ''; }; }
export const _test = Object.freeze({ createInitialState, normalizeXmlCompareDatasetFromText, compareXmlDatasets, buildXmlCompareReport, topologyIssuePassesFilters, filterTopologyIssues, topologyIssueComponentIds, buildTopologyIssuesCsv, enrichTransferAction, transferDownloadName, downloadInputReadinessAudit, downloadReadinessGateSnapshot, currentTransferProof, downloadTransferProof, copyPatchedTargetPreview, transferGateFromState, transferActionBlocked, loadTransferProofSample });

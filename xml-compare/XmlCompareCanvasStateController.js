import { createXmlCompareNavigationState, reduceXmlCompareNavigationState } from './XmlCompareCanvasNavigation.js';
import { selectXmlCompareCanvasRecord, hoverXmlCompareCanvasRecord } from './XmlCompareCanvasRecordInteraction.js';
import { createXmlCompareFitCommand } from './XmlCompareFitController.js';
import { addCompareField, normalizeCompareFields, removeCompareField } from './XmlCompareFieldCompareModel.js';
import { normalizeToleranceMm, normalizeValidationLayer } from './XmlCompareValidationModel.js';
import { compileTextRule, createDefaultTextRule } from './XmlCompareTextValidationRules.js';
import {
  acceptCandidateConnector,
  approvePendingConnector,
  createPendingConnectorPreview,
  normalizeApprovedConnectorState,
  projectApprovedConnectors,
  rejectCandidateConnector,
  rejectPendingConnector,
} from './XmlCompareApprovedConnectorModel.js';
import { applyXmlCompareTransferStateAction, normalizeTransferState } from './XmlCompareTransferStateModel.js';

export const XML_COMPARE_CANVAS_STATE_CONTROLLER_SCHEMA = 'xml-compare-canvas-state-controller/v10';
const clean = (value) => String(value ?? '').trim();
function log(code, message, side = '') { return Object.freeze({ ts: '', level: 'info', code: clean(code), source: clean(side), message: clean(message) }); }
function sideState(side, input = {}) { return createXmlCompareNavigationState({ side, ...input }); }
function levelView(input = {}) { return Object.freeze({ levelId: clean(input.levelId), displayField: clean(input.displayField), keyField: clean(input.keyField) }); }
function levelViews(input = {}) { return Object.freeze({ source: levelView(input.source), target: levelView(input.target) }); }
function textRules(input = {}) { return Object.freeze(Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [clean(key), compileTextRule({ ...value, field: clean(value?.field || key) })]))); }
function validation(input = {}) { return Object.freeze({ layer: normalizeValidationLayer(input.layer || 'current'), toleranceMm: normalizeToleranceMm(input.toleranceMm), textRules: textRules(input.textRules) }); }
function candidateDecisions(input = {}) { return Object.freeze({ rejectedCandidateIds: Object.freeze((input.rejectedCandidateIds || []).map(clean).filter(Boolean)) }); }
function rejectCandidateId(decisions = {}, candidateId = '') { const id = clean(candidateId), current = candidateDecisions(decisions); if (!id || current.rejectedCandidateIds.includes(id)) return current; return candidateDecisions({ rejectedCandidateIds: [...current.rejectedCandidateIds, id] }); }
function ruleUpdate(current = {}, field = '', patch = {}) { const nextField = clean(field); if (!nextField) return textRules(current); const base = current[nextField] || createDefaultTextRule(nextField); return textRules({ ...current, [nextField]: compileTextRule({ ...base, ...patch, field: nextField }) }); }
function autoMapRequest(scope, sourceRecord, targetRecord, compareFields = [], validationSettings = {}) {
  const v = validation(validationSettings);
  return Object.freeze({ scope: scope === 'line' ? 'line' : 'node', sourceUid: clean(sourceRecord?.uid), targetUid: clean(targetRecord?.uid), sourceLineNo: clean(sourceRecord?.lineNo), targetLineNo: clean(targetRecord?.lineNo), compareFields: normalizeCompareFields(compareFields), validationLayer: v.layer, toleranceMm: v.toleranceMm, textRules: v.textRules, createdAt: Date.now() });
}
function approvedFields(input = {}) {
  const approved = normalizeApprovedConnectorState(input);
  return { pendingConnectorPreview: approved.pendingConnectorPreview, matchCandidates: approved.matchCandidates, matchDecisions: approved.matchDecisions, approvedMatchSet: approved.approvedMatchSet, manualConnectors: projectApprovedConnectors(approved.approvedMatchSet) };
}
function transferFields(input = {}) {
  const transfer = normalizeTransferState(input);
  return { transferPreviewPlans: transfer.transferPreviewPlans, transferStage: transfer.transferStage, transferAudit: transfer.transferAudit, postTransferValidation: transfer.postTransferValidation, transferLastResult: transfer.transferLastResult };
}
export function createXmlCompareCanvasState(input = {}) {
  return Object.freeze({ schema: XML_COMPARE_CANVAS_STATE_CONTROLLER_SCHEMA, source: sideState('source', input.source), target: sideState('target', input.target), levelViews: levelViews(input.levelViews), compareFields: normalizeCompareFields(input.compareFields || []), validation: validation(input.validation), logs: Object.freeze(input.logs || []), fitCommands: Object.freeze(input.fitCommands || {}), selectedRecords: Object.freeze(input.selectedRecords || {}), hoverRecords: Object.freeze(input.hoverRecords || {}), candidateDecisions: candidateDecisions(input.candidateDecisions), autoMapRequest: input.autoMapRequest || null, ...approvedFields(input), ...transferFields(input) });
}
function updateTextRule(current, action, patch) { const next = validation({ ...current.validation, textRules: ruleUpdate(current.validation.textRules, action.field, patch) }); return createXmlCompareCanvasState({ ...current, validation: next, logs: [...current.logs, log('XML-COMPARE-VALIDATION-TEXT-RULE', `Text rule ${clean(action.field)} updated.`, 'validation')] }); }
function applyCompareFieldAction(current, action) { if (action.type === 'add-compare-field') return updateCompareFields(current, addCompareField(current.compareFields, action.field), 'ADD', action.field); if (action.type === 'remove-compare-field') return updateCompareFields(current, removeCompareField(current.compareFields, action.field), 'REMOVE', action.field); if (action.type === 'set-compare-fields') return updateCompareFields(current, normalizeCompareFields(action.fields || []), 'SET', ''); return null; }
function updateCompareFields(current, compareFields, code, field) { const message = code === 'SET' ? `${compareFields.length} compare field(s) selected.` : `Compare field ${clean(field)} ${code === 'ADD' ? 'selected' : 'removed'}.`; return createXmlCompareCanvasState({ ...current, compareFields, logs: [...current.logs, log(`XML-COMPARE-COMPARE-FIELD-${code}`, message, 'compare-fields')] }); }
function applyValidationAction(current, action) {
  if (action.type === 'set-validation-layer') return setValidation(current, { layer: action.layer }, 'LAYER', `Validation layer ${normalizeValidationLayer(action.layer)}.`);
  if (action.type === 'set-validation-tolerance-mm') return setValidation(current, { toleranceMm: action.toleranceMm }, 'TOLERANCE', `Validation tolerance ${normalizeToleranceMm(action.toleranceMm)} mm.`);
  if (action.type === 'set-validation-text-mode') return updateTextRule(current, action, { mode: action.mode });
  if (action.type === 'set-validation-text-pattern') return updateTextRule(current, action, { pattern: action.pattern });
  if (action.type === 'set-validation-text-group-spec') return updateTextRule(current, action, { groupSpec: action.groupSpec });
  if (action.type === 'set-validation-text-direction') return updateTextRule(current, action, { direction: action.direction });
  if (action.type === 'set-validation-text-case-sensitive') return updateTextRule(current, action, { caseSensitive: Boolean(action.caseSensitive) });
  return null;
}
function setValidation(current, patch, code, message) { const next = validation({ ...current.validation, ...patch }); return createXmlCompareCanvasState({ ...current, validation: next, logs: [...current.logs, log(`XML-COMPARE-VALIDATION-${code}`, message, 'validation')] }); }
function applyConnectorAction(current, action) {
  if (action.type === 'preview-connector') return previewConnector(current, action);
  if (action.type === 'approve-pending-connector') return connectorStateUpdate(current, approvePendingConnector(current), 'XML-COMPARE-LINK-APPROVE', 'Approved Link created.');
  if (action.type === 'reject-pending-connector') return connectorStateUpdate(current, rejectPendingConnector(current), 'XML-COMPARE-LINK-REJECT', 'Pending Link rejected.');
  if (action.type === 'clear-pending-connector') return createXmlCompareCanvasState({ ...current, pendingConnectorPreview: null, logs: [...current.logs, log('XML-COMPARE-LINK-CLEAR', 'Pending Link cleared.', 'connector')] });
  if (action.type === 'accept-candidate') return connectorStateUpdate(current, acceptCandidateConnector(current, action.candidate), 'XML-COMPARE-CANDIDATE-ACCEPT', 'Candidate accepted through MatchDecision.v1.');
  if (action.type === 'reject-candidate') return rejectCandidateAction(current, action);
  return null;
}
function previewConnector(current, action) { const preview = createPendingConnectorPreview(action); return createXmlCompareCanvasState({ ...current, pendingConnectorPreview: preview, logs: [...current.logs, log('XML-COMPARE-LINK-PREVIEW', preview ? `${preview.sourceLabel} → ${preview.targetLabel}` : 'Preview unavailable.', 'connector')] }); }
function connectorStateUpdate(current, approvedState, code, message) { return createXmlCompareCanvasState({ ...current, ...approvedState, logs: [...current.logs, log(code, message, 'connector')] }); }
function rejectCandidateAction(current, action) { const candidateDecisionsNext = rejectCandidateId(current.candidateDecisions, action.candidateId || action.candidate?.id); const approvedState = rejectCandidateConnector(current, action.candidate || { id: action.candidateId }); return createXmlCompareCanvasState({ ...current, ...approvedState, candidateDecisions: candidateDecisionsNext, logs: [...current.logs, log('XML-COMPARE-CANDIDATE-REJECT', `Rejected ${clean(action.candidateId || action.candidate?.id)}`, 'candidate')] }); }
function applyTransferAction(current, action) { const next = applyXmlCompareTransferStateAction(current, action); if (!next) return null; return createXmlCompareCanvasState({ ...current, ...next, logs: [...current.logs, log('XML-COMPARE-TRANSFER-STATE', `Transfer action ${clean(action.type)}.`, 'transfer')] }); }
function applyNavigationAction(current, action, side) {
  if (action.type === 'set-level-view') { const nextView = levelView({ ...current.levelViews[side], ...action.selection }); return createXmlCompareCanvasState({ ...current, levelViews: { ...current.levelViews, [side]: nextView }, autoMapRequest: null, logs: [...current.logs, log('XML-COMPARE-CANVAS-LEVEL', `${side} level ${nextView.levelId || 'auto'}`, side)] }); }
  if (action.type === 'set-mode') { const next = reduceXmlCompareNavigationState(current[side], { type: 'SET_MODE', mode: action.mode }); return createXmlCompareCanvasState({ ...current, [side]: next, logs: [...current.logs, log('XML-COMPARE-CANVAS-MODE', `${side} mode ${next.mode}`, side)] }); }
  return null;
}
function applyFitOrMapAction(current, action, side) {
  if (action.type === 'fit-all') { const command = createXmlCompareFitCommand({ side, records: action.records || [] }); return createXmlCompareCanvasState({ ...current, fitCommands: { ...current.fitCommands, [side]: command }, logs: [...current.logs, log(command.ok ? 'XML-COMPARE-CANVAS-FIT-ALL' : 'XML-COMPARE-CANVAS-FIT-EMPTY', `${side} fit all ${command.ok ? 'ready' : 'empty'}`, side)] }); }
  if (action.type === 'request-auto-map') return requestAutoMap(current, action);
  if (action.type === 'clear-auto-map') return createXmlCompareCanvasState({ ...current, autoMapRequest: null, logs: [...current.logs, log('XML-COMPARE-AUTO-MAP-CLEAR', 'Auto Map result cleared.', 'auto-map')] });
  return null;
}
function requestAutoMap(current, action) {
  const sourceRecord = current.selectedRecords.source || null, targetRecord = current.selectedRecords.target || null;
  if (!sourceRecord || !targetRecord) return createXmlCompareCanvasState({ ...current, logs: [...current.logs, log('XML-COMPARE-AUTO-MAP-NEEDS-SELECTION', 'Select one Source item and one Target item before Auto Map.', 'auto-map')] });
  const request = autoMapRequest(action.scope, sourceRecord, targetRecord, current.compareFields, current.validation);
  return createXmlCompareCanvasState({ ...current, autoMapRequest: request, logs: [...current.logs, log('XML-COMPARE-AUTO-MAP-REQUEST', `Auto Map ${request.scope}: ${clean(sourceRecord.uid)} → ${clean(targetRecord.uid)}`, 'auto-map')] });
}
function selectRecord(current, action, side) { const result = selectXmlCompareCanvasRecord(current[side], action.records || [], action.uid); const selectedRecords = { ...current.selectedRecords, [side]: result.record }; const other = side === 'source' ? selectedRecords.target : selectedRecords.source; const sourceRecord = side === 'source' ? result.record : other; const targetRecord = side === 'target' ? result.record : other; const preview = sourceRecord && targetRecord ? createPendingConnectorPreview({ sourceRecord, targetRecord }) : null; const logs = [...current.logs, result.log]; if (preview) logs.push(log('XML-COMPARE-LINK-PREVIEW', `${preview.sourceLabel} → ${preview.targetLabel}`, 'connector')); return createXmlCompareCanvasState({ ...current, [side]: result.navState, selectedRecords, pendingConnectorPreview: preview, logs }); }
export function applyXmlCompareCanvasAction(state = {}, action = {}) { const current = createXmlCompareCanvasState(state); const side = clean(action.side) === 'target' ? 'target' : 'source'; return applyCompareFieldAction(current, action) || applyValidationAction(current, action) || applyConnectorAction(current, action) || applyTransferAction(current, action) || applyNavigationAction(current, action, side) || applyFitOrMapAction(current, action, side) || applyRecordAction(current, action, side); }
function applyRecordAction(current, action, side) { if (action.type === 'select-record') return selectRecord(current, action, side); if (action.type === 'hover-record') { const result = hoverXmlCompareCanvasRecord(current[side], action.records || [], action.uid); return createXmlCompareCanvasState({ ...current, [side]: result.navState, hoverRecords: { ...current.hoverRecords, [side]: result.record }, logs: [...current.logs, result.log] }); } return current; }
export const _test = Object.freeze({ clean, log, sideState, levelView, levelViews, validation, textRules, candidateDecisions, rejectCandidateId, ruleUpdate, autoMapRequest, approvedFields, transferFields });

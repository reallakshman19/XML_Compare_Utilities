/** Lifecycle owner for explicit component/subgraph rotation preview and supervised apply. */
import { createSequentialRotationApplicationService } from './sequential-rotation-application.js';
import { createSequentialRotationApplicationPanel } from './sequential-rotation-application-panel.js';
import { createSequentialRotationDraftStore } from './sequential-rotation-draft.js';
import { createSequentialRotationPanel } from './sequential-rotation-panel.js';
import { selectSequentialRotationTarget, validateSequentialRotationTarget } from './sequential-rotation-target.js';

export const SEQUENTIAL_ROTATION_FEATURE_SCHEMA = 'SequentialRotationFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function requiredMethods(value, names, label) {
  names.forEach((name) => requiredFunction(value?.[name], `${label}.${name}`)); return value;
}
function targetInput(state) { return { readModel: state.readModel(), scene: state.readScene() }; }
function exactTarget(state) {
  if (!state.target) throw new RangeError('Select confirmed geometry before rotation preview.');
  state.target = validateSequentialRotationTarget(state.target, targetInput(state));
  return state.target;
}
function renderPreview(state, preview, notice = null) {
  state.panel.setPreview(preview, notice);
  state.applicationPanel.setPreview(preview);
  state.onDraftChanged(state.draftStore.getDraft()); return preview;
}
function previewRotation(state, input = {}) {
  const preview = state.draftStore.stage({ ...input, target: exactTarget(state) });
  return renderPreview(state, preview,
    'Rigid rotation preview created. Nothing was published.');
}
function cancelPreview(state, reason = 'cancelled') {
  if (state.destroyed) return null;
  state.draftStore.cancel(reason);
  state.applicationPanel.invalidate(`Rotation application invalidated: ${reason}.`);
  state.panel.setPreview(null, `Rotation preview cleared: ${reason}.`);
  state.onDraftChanged(null); return null;
}
function selectTarget(state, objectId) {
  if (state.destroyed) throw new Error('Rotation feature is destroyed.');
  cancelPreview(state, 'target-change'); state.selectedObjectId = objectId;
  state.target = selectSequentialRotationTarget({
    objectId, scope: state.panel.getScope(), ...targetInput(state),
  });
  state.panel.setTarget(state.target); return state.target;
}
function scopeChanged(state) {
  if (!state.selectedObjectId) { state.target = null; state.panel.clearTarget(); return null; }
  return selectTarget(state, state.selectedObjectId);
}
function clearTarget(state, reason = null) {
  if (state.destroyed) return null;
  cancelPreview(state, reason || 'target-cleared');
  state.target = null; state.selectedObjectId = null;
  state.panel.clearTarget(reason); return null;
}
function setFeatureActive(state, value) {
  state.active = value === true && !state.destroyed;
  if (!state.active) clearTarget(state, 'Rotation cleared because Draft Edit 3D closed.');
  state.panel.setActive(state.active); state.applicationPanel.setActive(state.active);
  return state.active;
}
function createApplication(state) {
  const boundary = state.geometryEditBoundary;
  state.applicationService = createSequentialRotationApplicationService({
    readCurrentState: boundary.readCurrentState, readView: boundary.readView,
    readJournal: boundary.readJournal, publishCandidate: boundary.publishCandidate,
    now: state.applicationNow,
  });
  return createSequentialRotationApplicationPanel({
    root: state.root, onPrepare: state.applicationService.prepare,
    onAccept: state.applicationService.accept,
    onCommitted: () => clearTarget(state, 'accepted-rotation'),
  });
}
function initializeState(options) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Rotation feature requires a root.');
  const state = {
    root,
    readScene: requiredFunction(options.readScene, 'readScene'),
    readModel: requiredFunction(options.readModel, 'readModel'),
    onDraftChanged: requiredFunction(options.onDraftChanged, 'onDraftChanged'),
    geometryEditBoundary: requiredMethods(options.geometryEditBoundary,
      ['readCurrentState', 'readView', 'readJournal', 'publishCandidate'], 'geometryEditBoundary'),
    applicationNow: requiredFunction(options.applicationNow, 'applicationNow'),
    draftStore: createSequentialRotationDraftStore(),
    target: null, selectedObjectId: null, active: false, destroyed: false,
  };
  state.panel = createSequentialRotationPanel({
    root,
    onPreview: (input) => previewRotation(state, input),
    onCancel: (reason) => cancelPreview(state, reason),
    onScopeChange: () => scopeChanged(state),
  });
  state.applicationPanel = createApplication(state);
  return state;
}
function destroyFeature(state) {
  if (state.destroyed) return false;
  state.target = null; state.selectedObjectId = null; state.active = false;
  state.applicationPanel.destroy(); state.panel.destroy(); state.draftStore.destroy();
  state.onDraftChanged(null); state.destroyed = true; return true;
}
function stateSnapshot(state) {
  return Object.freeze({
    active: state.active, scope: state.panel.getState().scope,
    targetId: state.target?.rotationTargetId || null,
    seedComponentId: state.target?.seedComponentId || null,
    affectedComponentCount: state.target?.affectedComponentIds.length || 0,
    operationId: state.draftStore.getPreview()?.operationId || null,
    panel: state.panel.getState(), application: state.applicationPanel.getState(),
    destroyed: state.destroyed,
  });
}
export function createSequentialRotationFeature(options = {}) {
  const state = initializeState(options);
  return Object.freeze({
    schema: SEQUENTIAL_ROTATION_FEATURE_SCHEMA,
    setActive: (value) => setFeatureActive(state, value),
    select: (objectId) => selectTarget(state, objectId),
    clearTarget: (reason) => clearTarget(state, reason),
    cancel: (reason) => cancelPreview(state, reason),
    preview: (input) => previewRotation(state, input),
    invalidate: (reason) => clearTarget(state, reason || 'authority-change'),
    getDraft: state.draftStore.getDraft,
    getPreview: state.draftStore.getPreview,
    getState: () => stateSnapshot(state),
    destroy: () => destroyFeature(state),
  });
}

/** Lifecycle owner for explicit component/subgraph rotation preview and supervised apply. */
import { createSequentialRotationApplicationService } from './sequential-rotation-application.js';
import { createSequentialRotationApplicationPanel } from './sequential-rotation-application-panel.js';
import { createSequentialRotationDraftStore } from './sequential-rotation-draft.js';
import { createSequentialRotationPanel } from './sequential-rotation-panel.js';
import {
  selectSequentialRotationTarget,
  validateSequentialRotationTarget,
} from './sequential-rotation-target.js';
import { sequentialDraftEditRecoveryTargetMatches } from './sequential-draft-edit-recovery-contract.js';

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
function recoveryEvidence(target) {
  return Object.freeze({
    targetId: target.rotationTargetId,
    authorityId: target.authorityId,
    snapshotFingerprint: target.snapshotFingerprint,
    sceneRevision: target.sceneRevision,
    seedComponentId: target.seedComponentId,
    affectedComponentIds: target.affectedComponentIds,
    eligibilityIds: target.eligibilityIds,
  });
}
function recoveryDescriptor(preview) {
  return Object.freeze({
    selector: Object.freeze({ objectId: preview.target.selectedObjectId, scope: preview.target.scope }),
    targetEvidence: recoveryEvidence(preview.target),
    input: Object.freeze({
      pivot: preview.transform.pivot,
      axis: preview.transform.axis,
      angleDegrees: preview.transform.angleDegrees,
      profile: preview.transform.profile,
    }),
  });
}
function notifyRecovery(state, preview) {
  if (!state.restoring) state.onRecoveryDraft(recoveryDescriptor(preview));
}
function renderPreview(state, preview, notice = null) {
  state.panel.setPreview(preview, notice);
  state.applicationPanel.setPreview(preview);
  state.onDraftChanged(state.draftStore.getDraft());
  notifyRecovery(state, preview);
  return preview;
}
function previewRotation(state, input = {}) {
  const preview = state.draftStore.stage({ ...input, target: exactTarget(state) });
  return renderPreview(state, preview,
    'Rigid rotation preview created. Nothing was published.');
}
function cancelPreview(state, reason = 'cancelled') {
  if (state.destroyed) return null;
  const hadPreview = Boolean(state.draftStore.getPreview());
  state.draftStore.cancel(reason);
  state.applicationPanel.invalidate(`Rotation application invalidated: ${reason}.`);
  state.panel.setPreview(null, `Rotation preview cleared: ${reason}.`);
  state.onDraftChanged(null);
  if (hadPreview && !state.restoring) state.onRecoveryClear(reason);
  return null;
}
function selectTargetWithScope(state, objectId, scope) {
  cancelPreview(state, 'target-change'); state.selectedObjectId = objectId;
  state.target = selectSequentialRotationTarget({ objectId, scope, ...targetInput(state) });
  state.panel.setTarget(state.target); return state.target;
}
function selectTarget(state, objectId) {
  if (state.destroyed) throw new Error('Rotation feature is destroyed.');
  return selectTargetWithScope(state, objectId, state.panel.getScope());
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
function setField(root, selector, value) {
  const field = root.querySelector(selector);
  if (field) field.value = String(value);
}
function restorePanelValues(state, record) {
  setField(state.root, '[data-ssk-rotation-scope]', record.selector.scope);
  for (const axis of ['x', 'y', 'z']) {
    setField(state.root, `[data-ssk-rotation-pivot-${axis}]`, record.input.pivot[axis]);
    setField(state.root, `[data-ssk-rotation-axis-${axis}]`, record.input.axis[axis]);
  }
  setField(state.root, '[data-ssk-rotation-angle]', record.input.angleDegrees);
  setField(state.root, '[data-ssk-rotation-tolerance]', record.input.profile.boundaryTolerance);
}
function restoreRecovery(state, record) {
  if (record?.kind !== 'ROTATE_SUBGRAPH') throw new TypeError('Rotation recovery kind is invalid.');
  state.restoring = true;
  try {
    restorePanelValues(state, record);
    const target = selectTargetWithScope(state, record.selector.objectId, record.selector.scope);
    if (!sequentialDraftEditRecoveryTargetMatches(record, recoveryEvidence(target))) {
      throw new RangeError('Rotation recovery target differs from current eligibility evidence.');
    }
    const preview = previewRotation(state, record.input);
    state.onRecoveryDraft(recoveryDescriptor(preview));
    return preview;
  } finally { state.restoring = false; }
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
    onRecoveryDraft: requiredFunction(options.onRecoveryDraft || (() => {}), 'onRecoveryDraft'),
    onRecoveryClear: requiredFunction(options.onRecoveryClear || (() => {}), 'onRecoveryClear'),
    geometryEditBoundary: requiredMethods(options.geometryEditBoundary,
      ['readCurrentState', 'readView', 'readJournal', 'publishCandidate'], 'geometryEditBoundary'),
    applicationNow: requiredFunction(options.applicationNow, 'applicationNow'),
    draftStore: createSequentialRotationDraftStore(),
    target: null, selectedObjectId: null, active: false, destroyed: false, restoring: false,
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
    restoreRecovery: (record) => restoreRecovery(state, record),
    invalidate: (reason) => clearTarget(state, reason || 'authority-change'),
    getDraft: state.draftStore.getDraft,
    getPreview: state.draftStore.getPreview,
    getState: () => stateSnapshot(state),
    destroy: () => destroyFeature(state),
  });
}

export const _test = Object.freeze({ recoveryDescriptor, recoveryEvidence });

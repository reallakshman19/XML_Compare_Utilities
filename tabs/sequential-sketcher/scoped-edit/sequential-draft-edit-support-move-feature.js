/** Lifecycle owner for exact support selection, draft preview and contained panel. */
import { createSequentialDraftEditSupportMoveDraftStore } from './sequential-draft-edit-support-move-draft.js';
import { createSequentialDraftEditSupportMovePanel } from './sequential-draft-edit-support-move-panel.js';
import {
  selectSequentialDraftEditSupportMoveTarget,
  validateSequentialDraftEditSupportMoveTarget,
} from './sequential-draft-edit-support-move-target.js';

export const SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_FEATURE_SCHEMA =
  'SequentialDraftEditSupportMoveFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}

export function createSequentialDraftEditSupportMoveFeature(options = {}) {
  const readScene = requiredFunction(options.readScene, 'readScene');
  const readModel = requiredFunction(options.readModel, 'readModel');
  const readCurrentState = requiredFunction(options.readCurrentState, 'readCurrentState');
  const onDraftChanged = requiredFunction(options.onDraftChanged, 'onDraftChanged');
  const draftStore = createSequentialDraftEditSupportMoveDraftStore();
  let target = null;
  let active = false;
  let destroyed = false;

  function targetInput() {
    return {
      readModel: readModel(),
      scene: readScene(),
      currentState: readCurrentState(),
    };
  }
  function exactTarget() {
    if (!target) throw new RangeError('Select one exact confirmed support before previewing a move draft.');
    target = validateSequentialDraftEditSupportMoveTarget(target, targetInput());
    return target;
  }
  function cancel(reason = 'cancelled') {
    if (destroyed) return null;
    draftStore.cancel(reason);
    panel.setPreview(null);
    onDraftChanged(null);
    return null;
  }
  function preview(input = {}) {
    const current = exactTarget();
    const result = draftStore.stage({ ...input, target: current });
    panel.setPreview(result);
    onDraftChanged(result);
    return result;
  }
  const panel = createSequentialDraftEditSupportMovePanel({
    root: options.root,
    onPreview: preview,
    onCancel: cancel,
  });

  function select(objectId) {
    if (destroyed) throw new Error('Support move feature is destroyed.');
    cancel('target-change');
    target = selectSequentialDraftEditSupportMoveTarget({ objectId, ...targetInput() });
    panel.setTarget(target);
    return target;
  }
  function clearTarget(reason = null) {
    if (destroyed) return null;
    cancel(reason || 'target-cleared');
    target = null;
    panel.clearTarget(reason);
    return null;
  }
  function setActive(value) {
    active = value === true && !destroyed;
    if (!active) clearTarget('Support move target and draft cleared because Draft Edit 3D closed.');
    panel.setActive(active);
    return active;
  }
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_SUPPORT_MOVE_FEATURE_SCHEMA,
    setActive,
    select,
    clearTarget,
    cancel,
    invalidate: clearTarget,
    getDraft: draftStore.getDraft,
    getPreview: draftStore.getPreview,
    getState: () => Object.freeze({
      active,
      targetId: target?.supportMoveTargetId || null,
      supportId: target?.supportId || null,
      operationId: draftStore.getPreview()?.operationId || null,
      panel: panel.getState(),
      destroyed,
    }),
    destroy() {
      if (destroyed) return false;
      destroyed = true; target = null; active = false;
      panel.destroy(); draftStore.destroy(); onDraftChanged(null);
      return true;
    },
  });
}

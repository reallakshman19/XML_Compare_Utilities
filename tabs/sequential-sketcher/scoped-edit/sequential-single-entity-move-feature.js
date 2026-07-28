/** Lifecycle owner for selected-component pointer and numeric move previews. */
import { createSequentialSingleEntityMoveDraftStore } from './sequential-single-entity-move-draft.js';
import { createSequentialSingleEntityMoveDragSession } from './sequential-single-entity-move-drag.js';
import { createSequentialSingleEntityMovePanel } from './sequential-single-entity-move-panel.js';
import {
  selectSequentialSingleEntityMoveTarget,
  validateSequentialSingleEntityMoveTarget,
} from './sequential-single-entity-move-target.js';

export const SEQUENTIAL_SINGLE_ENTITY_MOVE_FEATURE_SCHEMA =
  'SequentialSingleEntityMoveFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function transient(preview) {
  const start = preview.pivot;
  const end = {
    x: start.x + preview.delta.x,
    y: start.y + preview.delta.y,
    z: start.z + preview.delta.z,
  };
  return {
    lines: [{ points: [[start.x, start.y, start.z], [end.x, end.y, end.z]] }],
    spheres: [{ position: [end.x, end.y, end.z], radiusMm: 18 }],
  };
}
function targetInput(state) {
  return { readModel: state.readModel(), scene: state.readScene() };
}
function exactTarget(state) {
  if (!state.target) throw new RangeError('Select one confirmed pipe or fitting before move preview.');
  state.target = validateSequentialSingleEntityMoveTarget(state.target, targetInput(state));
  return state.target;
}
function renderPreview(state, preview, notice = null) {
  state.panel.setPreview(preview, notice);
  state.readViewer()?.setTransient?.(transient(preview));
  state.onDraftChanged(state.draftStore.getDraft());
  return preview;
}
function stagePreview(state, input = {}) {
  const preview = state.draftStore.stage({ ...input, target: exactTarget(state) });
  const notice = input.interaction?.kind === 'pointer'
    ? 'Pointer draft updated. Release ends drag without publication.'
    : 'Exact numeric draft created. Nothing was published.';
  return renderPreview(state, preview, notice);
}
function previewNumeric(state, input = {}) {
  return stagePreview(state, {
    ...input,
    interaction: { kind: 'numeric', source: 'exact-xyz' },
  });
}
function cancelPreview(state, reason = 'cancelled') {
  if (state.destroyed) return null;
  state.drag.cancel(reason);
  state.draftStore.cancel(reason);
  state.readViewer()?.setTransient?.(null);
  state.panel.setPreview(null, `Move preview cleared: ${reason}.`);
  state.onDraftChanged(null);
  return null;
}
function selectTarget(state, objectId) {
  if (state.destroyed) throw new Error('Single-entity move feature is destroyed.');
  cancelPreview(state, 'target-change');
  state.target = selectSequentialSingleEntityMoveTarget({ objectId, ...targetInput(state) });
  state.panel.setTarget(state.target);
  return state.target;
}
function clearTarget(state, reason = null) {
  if (state.destroyed) return null;
  cancelPreview(state, reason || 'target-cleared');
  state.target = null;
  state.panel.clearTarget(reason);
  return null;
}
function pointerDown(state, event) {
  if (!state.active || !state.target || event.button !== 0 || state.draftStore.getPreview()) return;
  try {
    state.drag.begin({
      target: exactTarget(state),
      constraint: state.panel.getConstraint(),
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    event.target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  } catch (error) {
    state.panel.setPreview(null,
      `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`);
  }
}
function pointerMove(state, event) {
  if (state.drag.getState().status !== 'dragging') return;
  try {
    state.drag.update({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    event.preventDefault();
    event.stopImmediatePropagation();
  } catch (error) {
    cancelPreview(state, error.code || error.message || 'pointer-drag-failed');
  }
}
function pointerEnd(state, event) {
  if (state.drag.getState().status !== 'dragging') return;
  state.drag.end(event.pointerId);
  event.target?.releasePointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopImmediatePropagation();
}
function pointerCancel(state, event) {
  if (state.drag.getState().status !== 'dragging') return;
  event.target?.releasePointerCapture?.(event.pointerId);
  cancelPreview(state, 'pointer-cancel');
  event.preventDefault();
  event.stopImmediatePropagation();
}
function setFeatureActive(state, value) {
  state.active = value === true && !state.destroyed;
  if (!state.active) clearTarget(state, 'Move preview cleared because Draft Edit 3D closed.');
  state.panel.setActive(state.active);
  return state.active;
}
function bindFeature(state) {
  state.surface.addEventListener('pointerdown', state.handlers.down, true);
  state.surface.addEventListener('pointermove', state.handlers.move, true);
  state.surface.addEventListener('pointerup', state.handlers.end, true);
  state.surface.addEventListener('pointercancel', state.handlers.cancel, true);
  state.window?.addEventListener('keydown', state.handlers.key);
}
function unbindFeature(state) {
  state.surface.removeEventListener('pointerdown', state.handlers.down, true);
  state.surface.removeEventListener('pointermove', state.handlers.move, true);
  state.surface.removeEventListener('pointerup', state.handlers.end, true);
  state.surface.removeEventListener('pointercancel', state.handlers.cancel, true);
  state.window?.removeEventListener('keydown', state.handlers.key);
}
function destroyFeature(state) {
  if (state.destroyed) return false;
  unbindFeature(state);
  state.target = null;
  state.active = false;
  state.drag.destroy();
  state.panel.destroy();
  state.draftStore.destroy();
  state.readViewer()?.setTransient?.(null);
  state.onDraftChanged(null);
  state.destroyed = true;
  return true;
}

function initializeFeatureState(options) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Single-entity move feature requires a root.');
  const surface = root.querySelector('[data-ssk-draft-edit-3d-host]');
  if (!surface) throw new Error('Single-entity move pointer surface is missing.');
  const state = {
    root, surface, window: root.ownerDocument.defaultView,
    readScene: requiredFunction(options.readScene, 'readScene'),
    readModel: requiredFunction(options.readModel, 'readModel'),
    readViewer: requiredFunction(options.readViewer, 'readViewer'),
    onDraftChanged: requiredFunction(options.onDraftChanged, 'onDraftChanged'),
    draftStore: createSequentialSingleEntityMoveDraftStore(),
    target: null, active: false, destroyed: false,
  };
  state.drag = createSequentialSingleEntityMoveDragSession({
    readViewer: state.readViewer,
    onPreview: (input) => stagePreview(state, input),
  });
  state.panel = createSequentialSingleEntityMovePanel({
    root,
    onPreview: (input) => previewNumeric(state, input),
    onCancel: (reason) => cancelPreview(state, reason),
  });
  state.handlers = {
    down: (event) => pointerDown(state, event),
    move: (event) => pointerMove(state, event),
    end: (event) => pointerEnd(state, event),
    cancel: (event) => pointerCancel(state, event),
    key: (event) => {
      if (event.key === 'Escape' && (state.target || state.draftStore.getPreview())) {
        cancelPreview(state, 'escape');
      }
    },
  };
  return state;
}
function featureStateSnapshot(state) {
  return Object.freeze({
    active: state.active,
    targetId: state.target?.moveTargetId || null,
    componentId: state.target?.componentId || null,
    operationId: state.draftStore.getPreview()?.operationId || null,
    drag: state.drag.getState(),
    panel: state.panel.getState(),
    destroyed: state.destroyed,
  });
}
function createFeatureApi(state) {
  return Object.freeze({
    schema: SEQUENTIAL_SINGLE_ENTITY_MOVE_FEATURE_SCHEMA,
    setActive: (value) => setFeatureActive(state, value),
    select: (objectId) => selectTarget(state, objectId),
    clearTarget: (reason) => clearTarget(state, reason),
    cancel: (reason) => cancelPreview(state, reason),
    previewNumeric: (input) => previewNumeric(state, input),
    invalidate: (reason) => clearTarget(state, reason),
    getDraft: state.draftStore.getDraft,
    getPreview: state.draftStore.getPreview,
    getState: () => featureStateSnapshot(state),
    destroy: () => destroyFeature(state),
  });
}

export function createSequentialSingleEntityMoveFeature(options = {}) {
  const state = initializeFeatureState(options);
  bindFeature(state);
  return createFeatureApi(state);
}

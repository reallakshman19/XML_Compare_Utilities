/**
 * Lifecycle controller connecting manipulator handles to the existing move drag session.
 */
import {
  createSequentialMoveManipulator,
  createSequentialMoveManipulatorHandleStart,
  SEQUENTIAL_MOVE_MANIPULATOR_HANDLES,
} from './sequential-move-manipulator-contract.js';
import { createSequentialMoveManipulatorOverlay } from './sequential-move-manipulator-overlay.js';

export const SEQUENTIAL_MOVE_MANIPULATOR_CONTROLLER_SCHEMA =
  'SequentialMoveManipulatorController.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function handleValue(value) {
  const handle = String(value || '').trim().toUpperCase();
  if (!SEQUENTIAL_MOVE_MANIPULATOR_HANDLES.includes(handle)) {
    throw new TypeError(`Unsupported manipulator constraint: ${value}`);
  }
  return handle;
}
function pointer(event) {
  return {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
  };
}
function isAvailable(state) {
  return Boolean(state.active && state.readTarget() && state.readViewer());
}
function stop(event) {
  event.preventDefault?.(); event.stopImmediatePropagation?.();
}
function render(state) {
  if (state.destroyed || !isAvailable(state)) {
    state.model = null; state.overlay.hide(); return false;
  }
  try {
    const model = createSequentialMoveManipulator(state.readTarget());
    state.model = model; state.overlay.setModel(model, state.readViewer());
    state.overlay.setActiveHandle(state.constraint.value);
    state.lastError = null; return true;
  } catch (error) {
    state.lastError = error; state.model = null; state.overlay.hide(); return false;
  }
}
function schedule(state) {
  if (state.frame || state.destroyed || !state.active) return;
  const frame = state.window?.requestAnimationFrame?.bind(state.window);
  if (!frame) return;
  const tick = () => {
    state.frame = null;
    if (state.destroyed || !state.active) return;
    render(state); state.frame = frame(tick);
  };
  state.frame = frame(tick);
}
function cancelFrame(state) {
  if (!state.frame) return;
  state.window?.cancelAnimationFrame?.(state.frame); state.frame = null;
}
function setConstraint(state, value) {
  const handle = handleValue(value);
  state.constraint.value = handle;
  state.overlay.setActiveHandle(handle);
  return handle;
}
function begin(state, handleId, event) {
  if (!state.model || state.dragging) return null;
  const target = state.readTarget();
  const selected = setConstraint(state, handleId);
  const handleStart = createSequentialMoveManipulatorHandleStart({
    target, handleId: selected, pointer: pointer(event),
  });
  try {
    const result = state.beginDrag({ target, handleStart, pointerId: event.pointerId,
      clientX: event.clientX, clientY: event.clientY });
    state.dragging = { handleId: selected, pointerId: event.pointerId };
    stop(event); return result;
  } catch (error) {
    state.lastError = error; state.dragging = null; throw error;
  }
}
function update(state, event) {
  if (!state.dragging || event.pointerId !== state.dragging.pointerId) return null;
  const result = state.updateDrag(pointer(event)); stop(event); return result;
}
function end(state, event) {
  if (!state.dragging || event.pointerId !== state.dragging.pointerId) return null;
  const result = state.endDrag(event.pointerId);
  state.dragging = null; stop(event); render(state); return result;
}
function cancel(state, eventOrReason = 'manipulator-cancel') {
  if (!state.dragging) return null;
  const reason = typeof eventOrReason === 'string'
    ? eventOrReason : eventOrReason?.type || 'manipulator-cancel';
  state.dragging = null;
  const result = state.cancelDrag(reason);
  if (typeof eventOrReason !== 'string') stop(eventOrReason);
  render(state); return result;
}
function bind(state) {
  state.onConstraintChange = () => {
    try { setConstraint(state, state.constraint.value); }
    catch (error) { state.lastError = error; }
  };
  state.constraint.addEventListener('change', state.onConstraintChange);
}
function destroy(state) {
  if (state.destroyed) return false;
  state.destroyed = true; cancelFrame(state);
  state.constraint.removeEventListener('change', state.onConstraintChange);
  state.overlay.destroy(); return true;
}
function createControllerState(options, root, host, constraint) {
  return {
    root, host, constraint, window: host.ownerDocument.defaultView,
    readViewer: requiredFunction(options.readViewer, 'readViewer'),
    readTarget: requiredFunction(options.readTarget, 'readTarget'),
    beginDrag: requiredFunction(options.beginDrag, 'beginDrag'),
    updateDrag: requiredFunction(options.updateDrag, 'updateDrag'),
    endDrag: requiredFunction(options.endDrag, 'endDrag'),
    cancelDrag: requiredFunction(options.cancelDrag, 'cancelDrag'),
    active: false, model: null, dragging: null, frame: null,
    lastError: null, destroyed: false, onConstraintChange: null, overlay: null,
  };
}
function installControllerOverlay(state) {
  state.overlay = createSequentialMoveManipulatorOverlay({
    host: state.host,
    onPointerDown: (handleId, event) => begin(state, handleId, event),
    onPointerMove: (event) => update(state, event),
    onPointerEnd: (event) => end(state, event),
    onPointerCancel: (event) => cancel(state, event),
    onKeyboardSelect: (handleId) => setConstraint(state, handleId),
  });
}
function controllerApi(state) {
  return Object.freeze({
    schema: SEQUENTIAL_MOVE_MANIPULATOR_CONTROLLER_SCHEMA,
    setActive(value) {
      state.active = value === true && !state.destroyed;
      if (!state.active) { cancel(state, 'manipulator-inactive'); cancelFrame(state); }
      else schedule(state);
      return render(state);
    },
    refresh: () => render(state),
    clear(reason = 'manipulator-cleared') {
      cancel(state, reason); state.model = null; state.overlay.hide(); return true;
    },
    setConstraint: (value) => setConstraint(state, value),
    cancel: (reason) => cancel(state, reason),
    getState: () => Object.freeze({
      active: state.active, visible: state.overlay.getState().visible,
      manipulatorId: state.model?.manipulatorId || null,
      constraint: state.constraint.value, dragging: state.dragging,
      lastError: state.lastError?.message || null, destroyed: state.destroyed,
      overlay: state.overlay.getState(),
    }),
    destroy: () => destroy(state),
  });
}
export function createSequentialMoveManipulatorController(options = {}) {
  const root = options.root;
  const host = options.host || root?.querySelector?.('[data-ssk-draft-edit-3d-host]');
  const constraint = root?.querySelector?.('[data-ssk-single-move-constraint]');
  if (!host?.ownerDocument || !constraint) {
    throw new TypeError('Manipulator controller requires the Draft Edit host and move constraint.');
  }
  const state = createControllerState(options, root, host, constraint);
  installControllerOverlay(state); bind(state); return controllerApi(state);
}

export const _test = Object.freeze({ handleValue, isAvailable, pointer });

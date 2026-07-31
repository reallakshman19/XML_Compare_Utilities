/**
 * Accessible HTML/SVG overlay for the canonical translation manipulator.
 */
export const SEQUENTIAL_MOVE_MANIPULATOR_OVERLAY_SCHEMA =
  'SequentialMoveManipulatorOverlay.v1';

const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_RADIUS_PX = 58;
const PLANE_RADIUS_PX = 35;
const HIT_RADIUS_PX = 13;
const FALLBACK_DIRECTIONS = Object.freeze({
  X: Object.freeze({ x: 1, y: 0 }),
  Y: Object.freeze({ x: 0, y: -1 }),
  Z: Object.freeze({ x: -0.72, y: 0.72 }),
});

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function svgElement(documentRef, name, attributes = {}) {
  const element = documentRef.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}
function finitePoint(value, label) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError(`${label} must be a projected screen point.`);
  }
  return { x: value.x, y: value.y };
}
function vectorLength(value) {
  return Math.hypot(value.x, value.y);
}
function normalizedDirection(pivot, projected, fallback) {
  const vector = { x: projected.x - pivot.x, y: projected.y - pivot.y };
  const length = vectorLength(vector);
  return length >= 2
    ? { x: vector.x / length, y: vector.y / length, fallback: false }
    : { ...fallback, fallback: true };
}
function addScaled(point, direction, distance) {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}
function axisPoint(model, axis) {
  const span = Number(model.projectionSpan) || 1;
  return [model.pivot.x + (axis === 'X' ? span : 0),
    model.pivot.y + (axis === 'Y' ? span : 0),
    model.pivot.z + (axis === 'Z' ? span : 0)];
}
function planeDirection(left, right) {
  const combined = { x: left.x + right.x, y: left.y + right.y };
  const length = vectorLength(combined);
  if (length >= 0.2) return { x: combined.x / length, y: combined.y / length };
  return { x: -left.y, y: left.x };
}
function projection(model, viewer) {
  const project = viewer.projectPoint || viewer.worldToScreen;
  if (typeof project !== 'function') {
    throw new TypeError('Manipulator viewer projection API is unavailable.');
  }
  const pivot = finitePoint(project.call(viewer, [model.pivot.x, model.pivot.y, model.pivot.z]),
    'Manipulator pivot');
  const directions = {};
  for (const axis of ['X', 'Y', 'Z']) {
    const point = finitePoint(project.call(viewer, axisPoint(model, axis)),
      `Manipulator ${axis} axis`);
    directions[axis] = normalizedDirection(pivot, point, FALLBACK_DIRECTIONS[axis]);
  }
  return { pivot, directions };
}
function handleScreenPoint(handle, projected) {
  if (handle.kind === 'axis') {
    return addScaled(projected.pivot, projected.directions[handle.handleId], AXIS_RADIUS_PX);
  }
  const direction = planeDirection(
    projected.directions[handle.axes[0]],
    projected.directions[handle.axes[1]],
  );
  return addScaled(projected.pivot, direction, PLANE_RADIUS_PX);
}
function setPosition(element, point) {
  element.setAttribute('transform', `translate(${point.x} ${point.y})`);
}
function renderAxis(state, handle, point, projected) {
  const line = state.axisLines.get(handle.handleId);
  const direction = projected.directions[handle.handleId];
  line.setAttribute('x1', projected.pivot.x);
  line.setAttribute('y1', projected.pivot.y);
  line.setAttribute('x2', point.x - direction.x * HIT_RADIUS_PX);
  line.setAttribute('y2', point.y - direction.y * HIT_RADIUS_PX);
}
function renderHandleState(state) {
  for (const [id, element] of state.handles) {
    const active = id === state.activeHandle;
    const dragging = id === state.draggingHandle;
    element.setAttribute('aria-pressed', active ? 'true' : 'false');
    element.setAttribute('data-active', active ? 'true' : 'false');
    element.setAttribute('data-dragging', dragging ? 'true' : 'false');
    element.style.opacity = dragging ? '1' : active ? '.96' : '.78';
    element.style.filter = active ? 'drop-shadow(0 0 5px rgba(255,255,255,.75))' : '';
  }
}
function hide(state) {
  state.svg.hidden = true;
  state.svg.setAttribute('aria-hidden', 'true');
  state.model = null;
}
function createHandleGroup(state, handle) {
  const group = svgElement(state.document, 'g', {
    'data-ssk-move-manipulator-handle': handle.handleId,
    role: 'button',
    tabindex: '0',
    'aria-label': handle.label,
    'aria-pressed': 'false',
  });
  group.style.cursor = 'grab';
  const shape = handle.kind === 'axis'
    ? svgElement(state.document, 'circle', {
      r: HIT_RADIUS_PX, fill: 'rgba(15,23,42,.92)', stroke: 'white', 'stroke-width': 2,
    })
    : svgElement(state.document, 'rect', {
      x: -14, y: -11, width: 28, height: 22, rx: 5,
      fill: 'rgba(15,23,42,.92)', stroke: 'white', 'stroke-width': 2,
    });
  const label = svgElement(state.document, 'text', {
    x: 0, y: 4, 'text-anchor': 'middle', fill: 'white',
    'font-size': 10, 'font-family': 'system-ui, sans-serif', 'font-weight': 700,
    'pointer-events': 'none',
  });
  label.textContent = handle.handleId;
  group.append(shape, label);
  state.handleLayer.appendChild(group);
  state.handles.set(handle.handleId, group);
}
function install(host) {
  const documentRef = host.ownerDocument;
  const svg = svgElement(documentRef, 'svg', {
    'data-ssk-move-manipulator': '',
    'aria-label': 'Translation manipulator',
    role: 'group',
  });
  svg.style.cssText = 'position:absolute;inset:0;z-index:11;width:100%;height:100%;overflow:visible;pointer-events:none';
  const lineLayer = svgElement(documentRef, 'g', { 'pointer-events': 'none' });
  const handleLayer = svgElement(documentRef, 'g', { 'pointer-events': 'all' });
  const pivot = svgElement(documentRef, 'circle', {
    r: 4, fill: 'white', stroke: 'rgba(15,23,42,.9)', 'stroke-width': 2,
  });
  lineLayer.appendChild(pivot); svg.append(lineLayer, handleLayer); host.appendChild(svg);
  return { documentRef, svg, lineLayer, handleLayer, pivot };
}
function bind(state) {
  state.onPointerDown = (event) => {
    const element = event.target?.closest?.('[data-ssk-move-manipulator-handle]');
    if (!element || state.destroyed) return;
    const handleId = element.dataset.sskMoveManipulatorHandle;
    state.draggingHandle = handleId; renderHandleState(state);
    element.setPointerCapture?.(event.pointerId);
    try { state.pointerDown(handleId, event); }
    catch (error) {
      state.draggingHandle = null; renderHandleState(state); throw error;
    }
  };
  state.onPointerMove = (event) => {
    if (state.draggingHandle) state.pointerMove(event);
  };
  state.onPointerEnd = (event) => {
    if (!state.draggingHandle) return;
    state.draggingHandle = null; renderHandleState(state); state.pointerEnd(event);
  };
  state.onPointerCancel = (event) => {
    if (!state.draggingHandle) return;
    state.draggingHandle = null; renderHandleState(state); state.pointerCancel(event);
  };
  state.onKeyDown = (event) => {
    const element = event.target?.closest?.('[data-ssk-move-manipulator-handle]');
    if (event.key === 'Escape') state.pointerCancel(event);
    else if (element && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.keyboardSelect(element.dataset.sskMoveManipulatorHandle);
    }
  };
  state.svg.addEventListener('pointerdown', state.onPointerDown);
  state.svg.addEventListener('pointermove', state.onPointerMove);
  state.svg.addEventListener('pointerup', state.onPointerEnd);
  state.svg.addEventListener('pointercancel', state.onPointerCancel);
  state.svg.addEventListener('keydown', state.onKeyDown);
}
function unbind(state) {
  state.svg.removeEventListener('pointerdown', state.onPointerDown);
  state.svg.removeEventListener('pointermove', state.onPointerMove);
  state.svg.removeEventListener('pointerup', state.onPointerEnd);
  state.svg.removeEventListener('pointercancel', state.onPointerCancel);
  state.svg.removeEventListener('keydown', state.onKeyDown);
}
function createOverlayState(options, host) {
  const installed = install(host);
  return {
    host, document: installed.documentRef, svg: installed.svg,
    lineLayer: installed.lineLayer, handleLayer: installed.handleLayer,
    pivotElement: installed.pivot, handles: new Map(), axisLines: new Map(),
    pointerDown: requiredFunction(options.onPointerDown, 'onPointerDown'),
    pointerMove: requiredFunction(options.onPointerMove, 'onPointerMove'),
    pointerEnd: requiredFunction(options.onPointerEnd, 'onPointerEnd'),
    pointerCancel: requiredFunction(options.onPointerCancel, 'onPointerCancel'),
    keyboardSelect: requiredFunction(options.onKeyboardSelect || (() => {}), 'onKeyboardSelect'),
    model: null, activeHandle: null, draggingHandle: null, destroyed: false,
  };
}
function installAxisLines(state) {
  for (const axis of ['X', 'Y', 'Z']) {
    const line = svgElement(state.document, 'line', {
      stroke: axis === 'X' ? '#ef4444' : axis === 'Y' ? '#22c55e' : '#3b82f6',
      'stroke-width': 3,
    });
    state.lineLayer.appendChild(line); state.axisLines.set(axis, line);
  }
}
function setModel(state, model, viewer) {
  if (state.destroyed) return false;
  if (!model) { hide(state); return false; }
  if (state.handles.size === 0) model.handles.forEach((row) => createHandleGroup(state, row));
  const projected = projection(model, viewer);
  state.model = model; state.svg.hidden = false; state.svg.setAttribute('aria-hidden', 'false');
  state.pivotElement.setAttribute('cx', projected.pivot.x);
  state.pivotElement.setAttribute('cy', projected.pivot.y);
  for (const handle of model.handles) {
    const point = handleScreenPoint(handle, projected);
    setPosition(state.handles.get(handle.handleId), point);
    if (handle.kind === 'axis') renderAxis(state, handle, point, projected);
  }
  renderHandleState(state); return true;
}
function destroyOverlay(state) {
  if (state.destroyed) return false;
  state.destroyed = true; unbind(state); state.svg.remove(); return true;
}
function overlayApi(state) {
  return Object.freeze({
    schema: SEQUENTIAL_MOVE_MANIPULATOR_OVERLAY_SCHEMA,
    setModel: (model, viewer) => setModel(state, model, viewer),
    setActiveHandle(value) {
      state.activeHandle = value || null; renderHandleState(state); return state.activeHandle;
    },
    hide: () => hide(state),
    getState: () => Object.freeze({
      visible: !state.svg.hidden, manipulatorId: state.model?.manipulatorId || null,
      activeHandle: state.activeHandle, draggingHandle: state.draggingHandle,
      handleCount: state.handles.size, destroyed: state.destroyed,
    }),
    destroy: () => destroyOverlay(state),
  });
}

export function createSequentialMoveManipulatorOverlay(options = {}) {
  const host = options.host;
  if (!host?.ownerDocument) throw new TypeError('Manipulator overlay requires a host.');
  const state = createOverlayState(options, host);
  installAxisLines(state); bind(state); return overlayApi(state);
}

export const _test = Object.freeze({
  axisPoint, handleScreenPoint, normalizedDirection, planeDirection, projection,
});

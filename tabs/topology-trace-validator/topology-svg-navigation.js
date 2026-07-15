/**
 * Functionality: adds browser-coordinate pan and zoom to one rendered SVG.
 * Input is the current SVG element. Output is a disposable navigation API.
 * Fallback: Fit restores the renderer's original fixed viewBox. Navigation
 * changes browser presentation only and never reads or mutates topology data.
 */

const MIN_SCALE = 0.05;
const MAX_SCALE = 12;
const ZOOM_STEP = 0.8;

/** @param {string} value @returns {{x:number,y:number,width:number,height:number}} */
function parseViewBox(value) {
  const values = value.trim().split(/\s+/).map(Number);
  if (values.length !== 4 || values.some((number) => !Number.isFinite(number)) || values[2] <= 0 || values[3] <= 0) {
    throw new TypeError(`Invalid SVG viewBox: ${value}.`);
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

/** @param {SVGElement} svg @param {{x:number,y:number,width:number,height:number}} box @returns {void} */
function writeViewBox(svg, box) {
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  svg.style.setProperty('--ttv-inverse-scale', box.width / 1200);
}

/** @param {SVGElement} svg @param {{clientX:number,clientY:number}} point @param {{x:number,y:number,width:number,height:number}} box @returns {{x:number,y:number}} */
function clientToView(svg, point, box) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return {
    x: box.x + ((point.clientX - rect.left) / rect.width) * box.width,
    y: box.y + ((point.clientY - rect.top) / rect.height) * box.height,
  };
}

/** @param {{x:number,y:number,width:number,height:number}} base @param {{x:number,y:number,width:number,height:number}} current @param {number} factor @param {{x:number,y:number}} anchor @returns {{x:number,y:number,width:number,height:number}} */
function zoomedBox(base, current, factor, anchor) {
  const requestedScale = (current.width * factor) / base.width;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, requestedScale));
  const width = base.width * scale, height = base.height * scale;
  const xRatio = current.width ? (anchor.x - current.x) / current.width : 0.5;
  const yRatio = current.height ? (anchor.y - current.y) / current.height : 0.5;
  const box = { x: anchor.x - xRatio * width, y: anchor.y - yRatio * height, width, height };
  box.x = Math.max(base.x - base.width, Math.min(base.x + base.width * 2, box.x));
  box.y = Math.max(base.y - base.height, Math.min(base.y + base.height * 2, box.y));
  return box;
}

/** @param {SVGElement} svg @param {Record<string, unknown>} state @param {number} factor @param {{clientX:number,clientY:number}|null} clientPoint @returns {void} */
function applyZoom(svg, state, factor, clientPoint) {
  const current = state.current;
  const anchor = clientPoint ? clientToView(svg, clientPoint, current) : { x: current.x + current.width / 2, y: current.y + current.height / 2 };
  state.current = zoomedBox(state.base, current, factor, anchor);
  writeViewBox(svg, state.current);
}

/** @param {SVGElement} svg @param {Record<string, unknown>} state @param {PointerEvent} event @returns {void} */
function movePan(svg, state, event) {
  const drag = state.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dx = event.clientX - drag.clientX, dy = event.clientY - drag.clientY;
  if (Math.hypot(dx, dy) > 3) state.suppressClick = true;
  let newX = drag.box.x - dx * drag.box.width / rect.width;
  let newY = drag.box.y - dy * drag.box.height / rect.height;
  newX = Math.max(state.base.x - state.base.width, Math.min(state.base.x + state.base.width * 2, newX));
  newY = Math.max(state.base.y - state.base.height, Math.min(state.base.y + state.base.height * 2, newY));
  state.current = { ...drag.box, x: newX, y: newY };
  writeViewBox(svg, state.current);
}

/** @param {SVGElement} svg @param {Record<string, unknown>} state @param {PointerEvent} event @returns {void} */
function endPan(svg, state, event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  state.drag = null;
  svg.classList.remove('is-panning');
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
}

/** @param {SVGElement} svg @param {Record<string, unknown>} state @returns {Record<string, EventListener>} */
function navigationHandlers(svg, state) {
  const onWheel = (event) => {
    event.preventDefault();
    applyZoom(svg, state, event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, event);
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('[data-object-key]')) return;
    state.drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, box: { ...state.current } };
    state.suppressClick = false;
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-panning');
  };
  const onClickCapture = (event) => {
    if (!state.suppressClick) return;
    state.suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onKeyDown = (event) => {
    if (event.key === '+' || event.key === '=') applyZoom(svg, state, ZOOM_STEP, null);
    else if (event.key === '-') applyZoom(svg, state, 1 / ZOOM_STEP, null);
    else if (event.key === '0') { state.current = { ...state.base }; writeViewBox(svg, state.current); }
    else return;
    event.preventDefault();
  };
  return { onWheel, onPointerDown, onPointerMove: (event) => movePan(svg, state, event), endPointer: (event) => endPan(svg, state, event), onClickCapture, onKeyDown };
}

/** @param {SVGElement} svg @returns {Readonly<Record<string, Function>>} */
export function wireTopologySvgNavigation(svg) {
  const base = parseViewBox(svg.getAttribute('viewBox') ?? '');
  const state = { base, current: { ...base }, drag: null, suppressClick: false };
  const handlers = navigationHandlers(svg, state);
  const fit = () => { state.current = { ...base }; writeViewBox(svg, state.current); };
  const { onWheel, onPointerDown, onPointerMove, endPointer, onClickCapture, onKeyDown } = handlers;
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('click', onClickCapture, true);
  svg.addEventListener('keydown', onKeyDown);
  const destroy = () => {
    svg.removeEventListener('wheel', onWheel);
    svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove);
    svg.removeEventListener('pointerup', endPointer);
    svg.removeEventListener('pointercancel', endPointer);
    svg.removeEventListener('click', onClickCapture, true);
    svg.removeEventListener('keydown', onKeyDown);
  };
  return Object.freeze({ fit, zoomIn: () => applyZoom(svg, state, ZOOM_STEP, null), zoomOut: () => applyZoom(svg, state, 1 / ZOOM_STEP, null), destroy });
}

export const _test = Object.freeze({ parseViewBox, clientToView, zoomedBox, applyZoom, movePan, endPan });

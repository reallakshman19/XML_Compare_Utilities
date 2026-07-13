import {
  formatStation,
  interpolateCumulativeFromAbsoluteH,
} from './pipeline-3d-model-cad-math.js';
import { PipelineCadController } from './pipeline-3d-model-cad-controller.js';
import {
  buildEngineeringTicks,
  buildPipelineCadInspection,
  interpolateEngineeringProfile,
} from './pipeline-3d-model-cad-engineering-review.js';

export const PIPELINE_CAD_PREVIEW_MODE_SCHEMA = 'PipelineCadPreviewMode.v1';
export const PIPELINE_CAD_PREVIEW_MODE_BUILD = '2026.07.13-preview-modes-1';
export const PIPELINE_CAD_PREVIEW_MODE_STORAGE_KEY = 'pipeline3dCadPreviewModeV1';
export const PIPELINE_CAD_PREVIEW_MODE_TABLE2 = 'table2x';
export const PIPELINE_CAD_PREVIEW_MODE_TABLE3 = 'table3x';
export const PIPELINE_CAD_PREVIEW_MODE_SIDE_BY_SIDE = 'side-by-side';
export const PIPELINE_CAD_PREVIEW_MODE_OVERLAY = 'overlay';
export const PIPELINE_CAD_OVERLAY_FORMULA = 'Projected elevation = Z-origin elevation + Z';

const MODES = Object.freeze([
  PIPELINE_CAD_PREVIEW_MODE_TABLE2,
  PIPELINE_CAD_PREVIEW_MODE_TABLE3,
  PIPELINE_CAD_PREVIEW_MODE_SIDE_BY_SIDE,
  PIPELINE_CAD_PREVIEW_MODE_OVERLAY,
]);
const CONTROLLER_PATCH = Symbol.for('pipeline3d.cad.preview-modes.controller.patch.v1');
const CONTROLLER_BOUND = Symbol.for('pipeline3d.cad.preview-modes.controller.bound.v1');
const ENGINEERING_INSPECTION = Symbol.for('pipeline3d.cad.engineering-review.inspection.v1');
const STYLE_ID = 'pipeline-3d-cad-preview-modes-style';
const DIALOG_STATES = new WeakMap();
const PATCHED_DIALOGS = new WeakSet();

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeGet(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch {
    return false;
  }
}

function normalizeMode(value) {
  const mode = String(value || '').toLowerCase();
  return MODES.includes(mode) ? mode : PIPELINE_CAD_PREVIEW_MODE_TABLE2;
}

export function normalizePipelineCadPreviewMode(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    schema: PIPELINE_CAD_PREVIEW_MODE_SCHEMA,
    build: PIPELINE_CAD_PREVIEW_MODE_BUILD,
    mode: normalizeMode(source.mode),
    zOriginElevation: finite(source.zOriginElevation),
  });
}

export function readPipelineCadPreviewMode(storage = globalThis.localStorage) {
  const raw = safeGet(storage, PIPELINE_CAD_PREVIEW_MODE_STORAGE_KEY);
  if (!raw) return normalizePipelineCadPreviewMode();
  try {
    return normalizePipelineCadPreviewMode(JSON.parse(raw));
  } catch {
    return normalizePipelineCadPreviewMode();
  }
}

export function writePipelineCadPreviewMode(value, storage = globalThis.localStorage) {
  const normalized = normalizePipelineCadPreviewMode(value);
  safeSet(storage, PIPELINE_CAD_PREVIEW_MODE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function projectPipelineCadZToElevation(zOriginElevation, z) {
  const origin = Number(zOriginElevation);
  const zValue = Number(z);
  if (!Number.isFinite(origin) || !Number.isFinite(zValue)) return null;
  return origin + zValue;
}

export function derivePipelineCadDefaultZOrigin(model) {
  const rows = (model?.table2Rows || [])
    .filter((row) => Number.isFinite(row.stationValue) && Number.isFinite(row.elevationValue))
    .sort((a, b) => Number(a.stationValue) - Number(b.stationValue));
  return rows.length ? Number(rows[0].elevationValue) : 0;
}

function table2Points(model) {
  return (model?.table2Rows || [])
    .filter((row) => Number.isFinite(row.stationValue) && Number.isFinite(row.elevationValue))
    .map((row) => ({
      id: row.id,
      x: Number(row.stationValue),
      y: Number(row.elevationValue),
      stationText: row.stationText,
    }))
    .sort((a, b) => a.x - b.x);
}

function table3ProjectedPoints(model, zOriginElevation) {
  const map = model?.coordinateMap;
  if (!map) return [];
  return (model?.table3DepthRows || [])
    .filter((row) => Number.isFinite(row.absoluteH) && Number.isFinite(row.z))
    .map((row) => ({
      id: row.id,
      x: interpolateCumulativeFromAbsoluteH(row.absoluteH, map),
      z: Number(row.z),
      y: projectPipelineCadZToElevation(zOriginElevation, row.z),
      zText: row.zText,
      absoluteH: Number(row.absoluteH),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);
}

function table3Markers(model) {
  const map = model?.coordinateMap;
  if (!map) return [];
  return (model?.table3MarkerRows || [])
    .filter((row) => Number.isFinite(row.absoluteH))
    .map((row) => ({
      id: row.id,
      x: interpolateCumulativeFromAbsoluteH(row.absoluteH, map),
      markerText: row.markerText,
      absoluteH: Number(row.absoluteH),
    }))
    .filter((marker) => Number.isFinite(marker.x))
    .sort((a, b) => a.x - b.x);
}

function paddedRange(values, options = {}) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  if (!finiteValues.length) return { min: 0, max: 1 };
  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);
  if (!(max > min)) {
    const half = Math.max(0.5, Math.abs(min) * 0.01);
    min -= half;
    max += half;
  }
  const span = max - min;
  const pad = Math.max(Number(options.minimumPad) || 0, span * (Number(options.ratio) || 0.08));
  return { min: min - pad, max: max + pad };
}

export function buildPipelineCadOverlayModel(model, zOriginElevation) {
  const origin = finite(zOriginElevation, derivePipelineCadDefaultZOrigin(model));
  const elevationPoints = table2Points(model);
  const projectedZPoints = table3ProjectedPoints(model, origin);
  const markers = table3Markers(model);
  const xRange = paddedRange([
    ...elevationPoints.map((point) => point.x),
    ...projectedZPoints.map((point) => point.x),
    ...markers.map((marker) => marker.x),
  ], { ratio: 0.025, minimumPad: 0.5 });
  const yRange = paddedRange([
    ...elevationPoints.map((point) => point.y),
    ...projectedZPoints.map((point) => point.y),
    origin,
  ], { ratio: 0.1, minimumPad: 0.4 });
  return Object.freeze({
    schema: 'PipelineCadElevationOverlay.v1',
    build: PIPELINE_CAD_PREVIEW_MODE_BUILD,
    formula: PIPELINE_CAD_OVERLAY_FORMULA,
    zOriginElevation: origin,
    elevationPoints: Object.freeze(elevationPoints.map(Object.freeze)),
    projectedZPoints: Object.freeze(projectedZPoints.map(Object.freeze)),
    markers: Object.freeze(markers.map(Object.freeze)),
    xRange: Object.freeze(xRange),
    yRange: Object.freeze(yRange),
  });
}

function compact(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function ensureStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-cad-preview-body{position:relative;display:block;flex:1;min-height:0;overflow:hidden}
.p3d-cad-preview-body>.p3d-x-content{height:100%;min-height:0}
.p3d-cad-preview-body[data-preview-mode="side-by-side"]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
.p3d-cad-preview-body[data-preview-mode="side-by-side"]>.p3d-x-content[data-x-content="table2x"],
.p3d-cad-preview-body[data-preview-mode="side-by-side"]>.p3d-x-content[data-x-content="table3x"]{display:block!important;border:1px solid rgba(148,163,184,.26);border-radius:8px;overflow:hidden}
.p3d-cad-preview-body[data-preview-mode="overlay"]>.p3d-x-content[data-x-content="overlay"]{display:block!important}
.p3d-cad-overlay-stage{position:relative;width:100%;height:100%;min-height:340px;background:#07111f;overflow:hidden}
.p3d-cad-overlay-stage canvas{display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:crosshair}
.p3d-cad-overlay-controls{position:absolute;z-index:4;left:12px;top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;max-width:calc(100% - 340px);padding:7px 9px;border:1px solid rgba(148,163,184,.36);border-radius:8px;background:rgba(15,23,42,.94);box-shadow:0 8px 24px rgba(0,0,0,.3);color:#e2e8f0;font:11px ui-monospace,monospace}
.p3d-cad-overlay-controls label{display:flex;align-items:center;gap:6px;color:#bfdbfe}
.p3d-cad-overlay-controls input{width:92px;border:1px solid rgba(148,163,184,.45);border-radius:5px;background:#020617;color:#f8fafc;padding:4px 6px;font:12px ui-monospace,monospace}
.p3d-cad-overlay-controls button{border:1px solid rgba(148,163,184,.4);border-radius:5px;background:#1e293b;color:#e2e8f0;padding:4px 8px;cursor:pointer;font-size:11px}
.p3d-cad-overlay-formula{color:#fdba74;white-space:nowrap}
.p3d-cad-overlay-legend{position:absolute;z-index:3;left:14px;bottom:10px;display:flex;gap:14px;align-items:center;padding:5px 8px;border-radius:6px;background:rgba(2,6,23,.76);color:#cbd5e1;font:10px ui-monospace,monospace;pointer-events:none}
.p3d-cad-overlay-legend span{display:inline-flex;align-items:center;gap:5px}
.p3d-cad-overlay-swatch{display:inline-block;width:22px;height:0;border-top:2px solid currentColor}
.p3d-cad-overlay-swatch[data-kind="elevation"]{color:#38bdf8}
.p3d-cad-overlay-swatch[data-kind="projected-z"]{color:#fb923c;border-top-style:dashed}
.p3d-cad-overlay-swatch[data-kind="origin"]{color:#a78bfa;border-top-style:dotted}
.p3d-cad-overlay-status{position:absolute;right:12px;bottom:10px;z-index:3;padding:4px 7px;border-radius:5px;background:rgba(2,6,23,.76);color:#94a3b8;font:10px ui-monospace,monospace;pointer-events:none}
.p3d-x-tab[data-x-tab="overlay"]{border-color:rgba(251,146,60,.55)}
.p3d-x-tab[data-x-tab="side-by-side"]{border-color:rgba(56,189,248,.55)}
.p3d-cad-coordinate-inspector [data-p3d-cad-overlay-only="true"]{display:none}
.p3d-x-modal[data-p3d-cad-preview-mode="overlay"] .p3d-cad-coordinate-inspector [data-p3d-cad-overlay-only="true"]{display:block}
@media (max-width:900px){.p3d-cad-overlay-controls{max-width:calc(100% - 24px)}}
`;
  doc.head.appendChild(style);
}

function stateForDialog(dialog) {
  let state = DIALOG_STATES.get(dialog);
  if (state) return state;
  const saved = readPipelineCadPreviewMode();
  state = {
    dialog,
    modal: null,
    body: null,
    controller: null,
    graphs: { table2x: null, table3x: null },
    mode: saved.mode,
    zOriginElevation: saved.zOriginElevation,
    overlayHost: null,
    overlayCanvas: null,
    overlayContext: null,
    overlayResizeObserver: null,
    activeOverlayCumulative: null,
    cleanup: [],
  };
  DIALOG_STATES.set(dialog, state);
  return state;
}

function persistState(state) {
  return writePipelineCadPreviewMode({
    mode: state.mode,
    zOriginElevation: state.zOriginElevation,
  });
}

function ensureInspectorOverlayField(state) {
  const inspector = state.modal?.querySelector?.('[data-p3d-cad-coordinate-inspector]');
  const list = inspector?.querySelector?.('dl');
  if (!list || list.querySelector('[data-p3d-cad-inspector-field="projectedElevation"]')) return inspector;
  const doc = state.dialog.ownerDocument || globalThis.document;
  const dt = doc.createElement('dt');
  const dd = doc.createElement('dd');
  dt.textContent = 'Projected Z elevation';
  dt.dataset.p3dCadOverlayOnly = 'true';
  dd.textContent = '—';
  dd.dataset.p3dCadOverlayOnly = 'true';
  dd.dataset.p3dCadInspectorField = 'projectedElevation';
  list.append(dt, dd);
  return inspector;
}

function updateOverlayInspector(state, detail, projectedElevation) {
  const inspector = ensureInspectorOverlayField(state);
  if (!inspector) return;
  inspector.dataset.active = detail ? 'true' : 'false';
  if (!detail) return;
  const values = {
    cumulative: `${detail.cumulative.toFixed(1)} m`,
    station: detail.stationText,
    absoluteH: detail.absoluteH.toFixed(3),
    elevation: Number.isFinite(detail.elevation) ? `${detail.elevation.toFixed(2)} m` : '—',
    depth: Number.isFinite(detail.depthZ) ? `${detail.depthText} (Z ${detail.depthZ.toFixed(2)} m)` : '—',
    projectedElevation: Number.isFinite(projectedElevation) ? `${projectedElevation.toFixed(2)} m` : '—',
    segment: detail.segment ? `${detail.segment.fromH.toFixed(3)} → ${detail.segment.toH.toFixed(3)}` : '—',
    segmentLength: detail.segment ? `${detail.segment.hLength.toFixed(1)} m` : '—',
    item: detail.marker?.markerText || '—',
  };
  Object.entries(values).forEach(([name, value]) => {
    const field = inspector.querySelector(`[data-p3d-cad-inspector-field="${name}"]`);
    if (field) field.textContent = value;
  });
}

function clearGraphInspection(state) {
  Object.values(state.graphs).filter(Boolean).forEach((graph) => {
    graph[ENGINEERING_INSPECTION] = null;
    graph.render?.();
  });
}

function sizeOverlay(state) {
  const { overlayCanvas: canvas, overlayHost: host } = state;
  if (!canvas || !host) return false;
  const rect = host.getBoundingClientRect?.() || {};
  const width = Math.max(640, Math.round(host.clientWidth || rect.width || 1000));
  const height = Math.max(340, Math.round(host.clientHeight || rect.height || 500));
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
  if (canvas.width === Math.round(width * dpr)
      && canvas.height === Math.round(height * dpr)
      && canvas.style.width === `${width}px`
      && canvas.style.height === `${height}px`) return false;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.dataset.p3dCadOverlayWidth = String(width);
  canvas.dataset.p3dCadOverlayHeight = String(height);
  return true;
}

function screenPoint(plot, model, point) {
  return {
    x: plot.left + ((point.x - model.xRange.min) / (model.xRange.max - model.xRange.min)) * plot.width,
    y: plot.bottom - ((point.y - model.yRange.min) / (model.yRange.max - model.yRange.min)) * plot.height,
  };
}

function drawPolyline(context, points, plot, model, options = {}) {
  if (!points.length) return;
  context.save();
  context.strokeStyle = options.stroke || '#fff';
  context.fillStyle = options.fill || options.stroke || '#fff';
  context.lineWidth = options.lineWidth || 2;
  context.setLineDash(options.dash || []);
  context.beginPath();
  points.forEach((point, index) => {
    const screen = screenPoint(plot, model, point);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.stroke();
  context.setLineDash([]);
  points.forEach((point) => {
    const screen = screenPoint(plot, model, point);
    context.beginPath();
    context.arc(screen.x, screen.y, options.radius || 3.5, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawOverlay(state) {
  if (state.mode !== PIPELINE_CAD_PREVIEW_MODE_OVERLAY || !state.controller?.model) return false;
  sizeOverlay(state);
  const { overlayCanvas: canvas, overlayContext: context } = state;
  if (!canvas || !context) return false;
  const width = Number(canvas.dataset.p3dCadOverlayWidth) || 1000;
  const height = Number(canvas.dataset.p3dCadOverlayHeight) || 500;
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
  const origin = finite(state.zOriginElevation, derivePipelineCadDefaultZOrigin(state.controller.model));
  state.zOriginElevation = origin;
  const model = buildPipelineCadOverlayModel(state.controller.model, origin);
  const plot = { left: 70, right: width - 28, top: 68, bottom: height - 54 };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#07111f';
  context.fillRect(0, 0, width, height);

  const xTicks = buildEngineeringTicks(model.xRange.min, model.xRange.max, Math.max(5, Math.min(10, Math.floor(plot.width / 110))));
  const yTicks = buildEngineeringTicks(model.yRange.min, model.yRange.max, Math.max(5, Math.min(9, Math.floor(plot.height / 60))));
  context.save();
  context.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  context.lineWidth = 1;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  for (const tick of xTicks) {
    const x = plot.left + ((tick - model.xRange.min) / (model.xRange.max - model.xRange.min)) * plot.width;
    context.strokeStyle = 'rgba(148,163,184,.14)';
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.fillStyle = '#cbd5e1';
    context.fillText(formatStation(tick, 1), x, plot.bottom + 8);
  }
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const tick of yTicks) {
    const y = plot.bottom - ((tick - model.yRange.min) / (model.yRange.max - model.yRange.min)) * plot.height;
    context.strokeStyle = 'rgba(148,163,184,.14)';
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.fillStyle = '#cbd5e1';
    context.fillText(compact(tick, 2), plot.left - 8, y);
  }
  context.strokeStyle = 'rgba(148,163,184,.8)';
  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();

  const originY = screenPoint(plot, model, { x: model.xRange.min, y: origin }).y;
  if (originY >= plot.top && originY <= plot.bottom) {
    context.strokeStyle = '#a78bfa';
    context.setLineDash([2, 4]);
    context.beginPath();
    context.moveTo(plot.left, originY);
    context.lineTo(plot.right, originY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#c4b5fd';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(`Z=0 origin ${origin.toFixed(2)} m`, plot.left + 8, originY - 4);
  }

  drawPolyline(context, model.elevationPoints, plot, model, {
    stroke: '#38bdf8', fill: '#7dd3fc', lineWidth: 2.2, radius: 3.2,
  });
  drawPolyline(context, model.projectedZPoints, plot, model, {
    stroke: '#fb923c', fill: '#fdba74', lineWidth: 2.2, radius: 4, dash: [8, 5],
  });

  context.font = '10px ui-monospace, monospace';
  model.markers.forEach((marker) => {
    const x = screenPoint(plot, model, { x: marker.x, y: model.yRange.min }).x;
    context.strokeStyle = 'rgba(192,132,252,.7)';
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#d8b4fe';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(String(marker.markerText || ''), x, plot.top + 4);
  });

  if (Number.isFinite(state.activeOverlayCumulative)) {
    const cumulative = Math.min(model.xRange.max, Math.max(model.xRange.min, state.activeOverlayCumulative));
    const x = screenPoint(plot, model, { x: cumulative, y: model.yRange.min }).x;
    const elevation = interpolateEngineeringProfile(model.elevationPoints, cumulative);
    const projectedElevation = interpolateEngineeringProfile(model.projectedZPoints, cumulative);
    context.strokeStyle = '#f8fafc';
    context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.setLineDash([]);
    for (const [value, color] of [[elevation, '#38bdf8'], [projectedElevation, '#fb923c']]) {
      if (!Number.isFinite(value)) continue;
      const y = screenPoint(plot, model, { x: cumulative, y: value }).y;
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = '#f8fafc';
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  context.fillStyle = '#e2e8f0';
  context.font = '600 12px ui-monospace, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.fillText('Station / Chainage (m)', plot.left + plot.width / 2, height - 8);
  context.save();
  context.translate(16, plot.top + plot.height / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Elevation / Projected Z Elevation (m)', 0, 0);
  context.restore();
  context.restore();

  canvas.dataset.p3dCadOverlayOrigin = origin.toFixed(3);
  canvas.dataset.p3dCadOverlayElevationPoints = String(model.elevationPoints.length);
  canvas.dataset.p3dCadOverlayProjectedZPoints = String(model.projectedZPoints.length);
  canvas.dataset.p3dCadOverlayMarkers = String(model.markers.length);
  canvas.dataset.p3dCadOverlayReviewOnly = 'true';
  canvas.dataset.p3dCadOverlayFormula = PIPELINE_CAD_OVERLAY_FORMULA;
  const status = state.overlayHost.querySelector('[data-p3d-cad-overlay-status]');
  if (status) {
    status.textContent = `${model.elevationPoints.length} elevation points · ${model.projectedZPoints.length} projected Z points · review only`;
  }
  return true;
}

function resizeGraphs(state) {
  Object.entries(state.graphs).forEach(([name, graph]) => {
    if (!graph) return;
    const holder = state.dialog.querySelector(`[data-p3d-split="${name}-preview"]`);
    const rect = holder?.getBoundingClientRect?.() || {};
    graph.setSize?.(
      Math.max(320, Math.round(holder?.clientWidth || rect.width || 640)),
      Math.max(340, Math.round(holder?.clientHeight || rect.height || 500)),
    );
  });
}

function scheduleLayout(state) {
  const schedule = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout?.(callback, 0));
  schedule(() => schedule(() => {
    if (state.mode === PIPELINE_CAD_PREVIEW_MODE_OVERLAY) drawOverlay(state);
    else resizeGraphs(state);
  }));
}

function setContentActive(content, active) {
  if (content) content.dataset.active = active ? 'true' : 'false';
}

export function applyPipelineCadPreviewMode(state, mode, options = {}) {
  const nextMode = normalizeMode(mode);
  state.mode = nextMode;
  if (state.modal) state.modal.dataset.p3dCadPreviewMode = nextMode;
  if (state.body) state.body.dataset.previewMode = nextMode;
  state.modal?.querySelectorAll?.('.p3d-x-tab[data-x-tab]').forEach((tab) => {
    const active = tab.dataset.xTab === nextMode;
    tab.dataset.active = active ? 'true' : 'false';
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  setContentActive(
    state.body?.querySelector?.('[data-x-content="table2x"]'),
    nextMode === PIPELINE_CAD_PREVIEW_MODE_TABLE2 || nextMode === PIPELINE_CAD_PREVIEW_MODE_SIDE_BY_SIDE,
  );
  setContentActive(
    state.body?.querySelector?.('[data-x-content="table3x"]'),
    nextMode === PIPELINE_CAD_PREVIEW_MODE_TABLE3 || nextMode === PIPELINE_CAD_PREVIEW_MODE_SIDE_BY_SIDE,
  );
  setContentActive(
    state.body?.querySelector?.('[data-x-content="overlay"]'),
    nextMode === PIPELINE_CAD_PREVIEW_MODE_OVERLAY,
  );
  state.activeOverlayCumulative = null;
  updateOverlayInspector(state, null, null);
  if (nextMode === PIPELINE_CAD_PREVIEW_MODE_OVERLAY) clearGraphInspection(state);
  if (options.persist !== false) persistState(state);
  scheduleLayout(state);
  return nextMode;
}

function ensureOverlayDom(state) {
  const modal = state.modal;
  if (!modal) return false;
  const doc = state.dialog.ownerDocument || globalThis.document;
  ensureStyle(doc);
  const tabs = modal.querySelector('.p3d-x-tabs');
  if (!tabs) return false;
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Table 2X and Table 3X preview modes');
  for (const [mode, label] of [
    [PIPELINE_CAD_PREVIEW_MODE_SIDE_BY_SIDE, 'Side by Side'],
    [PIPELINE_CAD_PREVIEW_MODE_OVERLAY, 'Overlay'],
  ]) {
    if (tabs.querySelector(`[data-x-tab="${mode}"]`)) continue;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'p3d-x-tab';
    button.dataset.xTab = mode;
    button.dataset.active = 'false';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.textContent = label;
    tabs.appendChild(button);
  }
  tabs.querySelectorAll('.p3d-x-tab[data-x-tab]').forEach((tab) => tab.setAttribute('role', 'tab'));

  let body = modal.querySelector('[data-p3d-cad-preview-body]');
  if (!body) {
    body = doc.createElement('div');
    body.className = 'p3d-cad-preview-body';
    body.dataset.p3dCadPreviewBody = '1';
    const contents = Array.from(modal.querySelectorAll(':scope > .p3d-x-content'));
    if (!contents.length) return false;
    modal.insertBefore(body, contents[0]);
    contents.forEach((content) => body.appendChild(content));
  }
  state.body = body;

  let overlayContent = body.querySelector('[data-x-content="overlay"]');
  if (!overlayContent) {
    overlayContent = doc.createElement('div');
    overlayContent.className = 'p3d-x-content';
    overlayContent.dataset.xContent = PIPELINE_CAD_PREVIEW_MODE_OVERLAY;
    overlayContent.dataset.active = 'false';
    overlayContent.innerHTML = `<div class="p3d-cad-overlay-stage" data-p3d-cad-overlay-stage>
  <div class="p3d-cad-overlay-controls">
    <label>Z-origin elevation (m)<input type="number" step="0.1" inputmode="decimal" data-p3d-cad-z-origin aria-label="Z-origin elevation in metres"></label>
    <button type="button" data-p3d-cad-z-origin-start>Use Table 2 start</button>
    <span class="p3d-cad-overlay-formula">${PIPELINE_CAD_OVERLAY_FORMULA}</span>
  </div>
  <canvas data-p3d-cad-overlay-canvas tabindex="0" role="img" aria-label="Review-only overlay of Table 2X elevation and Table 3X projected Z elevation"></canvas>
  <div class="p3d-cad-overlay-legend" aria-hidden="true">
    <span><i class="p3d-cad-overlay-swatch" data-kind="elevation"></i>Table 2X elevation</span>
    <span><i class="p3d-cad-overlay-swatch" data-kind="projected-z"></i>Table 3X projected Z</span>
    <span><i class="p3d-cad-overlay-swatch" data-kind="origin"></i>Z=0 origin</span>
  </div>
  <div class="p3d-cad-overlay-status" data-p3d-cad-overlay-status>Overlay waiting for model</div>
</div>`;
    body.appendChild(overlayContent);
  }
  state.overlayHost = overlayContent.querySelector('[data-p3d-cad-overlay-stage]');
  state.overlayCanvas = overlayContent.querySelector('[data-p3d-cad-overlay-canvas]');
  state.overlayContext = state.overlayCanvas?.getContext?.('2d') || null;
  const input = overlayContent.querySelector('[data-p3d-cad-z-origin]');
  if (input && Number.isFinite(state.zOriginElevation)) input.value = String(state.zOriginElevation);

  if (!state.overlayResizeObserver && typeof globalThis.ResizeObserver === 'function' && state.overlayHost) {
    const ResizeObserverCtor = globalThis.ResizeObserver;
    state.overlayResizeObserver = new ResizeObserverCtor(() => {
      if (state.mode === PIPELINE_CAD_PREVIEW_MODE_OVERLAY) drawOverlay(state);
    });
    state.overlayResizeObserver.observe(state.overlayHost);
    state.cleanup.push(() => state.overlayResizeObserver?.disconnect?.());
  }
  return true;
}

function bindOverlayInteraction(state) {
  const canvas = state.overlayCanvas;
  if (!canvas || canvas.dataset.p3dCadOverlayBound === '1') return;
  canvas.dataset.p3dCadOverlayBound = '1';
  const onPointerMove = (event) => {
    if (state.mode !== PIPELINE_CAD_PREVIEW_MODE_OVERLAY || !state.controller?.model) return;
    const rect = canvas.getBoundingClientRect();
    const width = Number(canvas.dataset.p3dCadOverlayWidth) || rect.width;
    const left = 70;
    const right = width - 28;
    const localX = event.clientX - rect.left;
    if (localX < left || localX > right) return;
    const overlay = buildPipelineCadOverlayModel(state.controller.model, state.zOriginElevation);
    const ratio = (localX - left) / Math.max(1, right - left);
    const requested = overlay.xRange.min + ratio * (overlay.xRange.max - overlay.xRange.min);
    const detail = buildPipelineCadInspection(state.controller.model, requested, { sourceGraph: 'overlay' });
    state.activeOverlayCumulative = detail?.cumulative ?? requested;
    const projectedElevation = interpolateEngineeringProfile(overlay.projectedZPoints, state.activeOverlayCumulative);
    updateOverlayInspector(state, detail, projectedElevation);
    drawOverlay(state);
  };
  const onPointerLeave = () => {
    state.activeOverlayCumulative = null;
    updateOverlayInspector(state, null, null);
    drawOverlay(state);
  };
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  state.cleanup.push(() => {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    delete canvas.dataset.p3dCadOverlayBound;
  });
}

function bindModalControls(state) {
  const modal = state.modal;
  if (!modal || modal.dataset.p3dCadPreviewModesBound === '1') return;
  modal.dataset.p3dCadPreviewModesBound = '1';
  const onClickCapture = (event) => {
    const tab = event.target?.closest?.('.p3d-x-tab[data-x-tab]');
    if (tab && modal.contains(tab)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      applyPipelineCadPreviewMode(state, tab.dataset.xTab);
      return;
    }
    if (event.target?.closest?.('[data-p3d-cad-z-origin-start]')) {
      const origin = derivePipelineCadDefaultZOrigin(state.controller?.model);
      state.zOriginElevation = origin;
      const input = modal.querySelector('[data-p3d-cad-z-origin]');
      if (input) input.value = String(origin);
      persistState(state);
      drawOverlay(state);
    }
  };
  const onOriginChange = (event) => {
    const input = event.target?.closest?.('[data-p3d-cad-z-origin]');
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) {
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.removeAttribute('aria-invalid');
    state.zOriginElevation = value;
    persistState(state);
    drawOverlay(state);
  };
  modal.addEventListener('click', onClickCapture, true);
  modal.addEventListener('change', onOriginChange);
  state.cleanup.push(() => {
    modal.removeEventListener('click', onClickCapture, true);
    modal.removeEventListener('change', onOriginChange);
    delete modal.dataset.p3dCadPreviewModesBound;
  });
}

function bindDialogOpen(state) {
  const dialog = state.dialog;
  if (dialog.dataset.p3dCadPreviewModesOpenBound === '1') return;
  dialog.dataset.p3dCadPreviewModesOpenBound = '1';
  const onClick = (event) => {
    if (event.target?.closest?.('[data-p3d-split="btn-preview-x"], [data-p3d-split="x-reload"]')) {
      queueMicrotask(() => scheduleLayout(state));
    }
  };
  dialog.addEventListener('click', onClick, true);
  state.cleanup.push(() => {
    dialog.removeEventListener('click', onClick, true);
    delete dialog.dataset.p3dCadPreviewModesOpenBound;
  });
}

function renderForControllerChange(state) {
  if (!state.controller?.model) return;
  if (!Number.isFinite(state.zOriginElevation)) {
    state.zOriginElevation = derivePipelineCadDefaultZOrigin(state.controller.model);
    const input = state.modal?.querySelector?.('[data-p3d-cad-z-origin]');
    if (input) input.value = String(state.zOriginElevation);
    persistState(state);
  }
  if (state.mode === PIPELINE_CAD_PREVIEW_MODE_OVERLAY) drawOverlay(state);
  else scheduleLayout(state);
}

function releaseDialogState(state) {
  state.cleanup.splice(0).forEach((dispose) => dispose());
  state.overlayResizeObserver?.disconnect?.();
  state.overlayResizeObserver = null;
  state.activeOverlayCumulative = null;
  PATCHED_DIALOGS.delete(state.dialog);
  DIALOG_STATES.delete(state.dialog);
}

function bindControllerState(controller) {
  const dialog = controller?.dialog;
  if (!dialog) return null;
  const state = stateForDialog(dialog);
  state.controller = controller;
  state.graphs = { ...controller.graphs };
  patchDialog(dialog);
  if (controller[CONTROLLER_BOUND]) {
    renderForControllerChange(state);
    return state;
  }
  Object.defineProperty(controller, CONTROLLER_BOUND, { value: true });
  const events = ['modelChanged', 'commandCommitted', 'historyApplied', 'graphsReloaded'];
  const listener = () => renderForControllerChange(state);
  events.forEach((name) => controller.addEventListener(name, listener));
  const previousDestroy = controller.destroy.bind(controller);
  controller.destroy = (...args) => {
    events.forEach((name) => controller.removeEventListener(name, listener));
    releaseDialogState(state);
    return previousDestroy(...args);
  };
  renderForControllerChange(state);
  return state;
}

export function installPipelineCadPreviewModeControllerPatch() {
  const prototype = PipelineCadController.prototype;
  if (prototype[CONTROLLER_PATCH]) return false;
  Object.defineProperty(prototype, CONTROLLER_PATCH, { value: true });
  const originalAttachGraphs = prototype.attachGraphs;
  prototype.attachGraphs = function attachGraphsWithPreviewModes(graphs, ...args) {
    const result = originalAttachGraphs.call(this, graphs, ...args);
    bindControllerState(this);
    return result;
  };
  return true;
}

function patchDialog(dialog) {
  if (!dialog?.querySelector) return false;
  const modal = dialog.querySelector('[data-p3d-split="x-modal"]');
  if (!modal) return false;
  const state = stateForDialog(dialog);
  state.modal = modal;
  if (!ensureOverlayDom(state)) return false;
  if (!PATCHED_DIALOGS.has(dialog)) {
    PATCHED_DIALOGS.add(dialog);
    bindModalControls(state);
    bindDialogOpen(state);
    bindOverlayInteraction(state);
  }
  if (!Number.isFinite(state.zOriginElevation) && state.controller?.model) {
    state.zOriginElevation = derivePipelineCadDefaultZOrigin(state.controller.model);
    const input = modal.querySelector('[data-p3d-cad-z-origin]');
    if (input) input.value = String(state.zOriginElevation);
  }
  applyPipelineCadPreviewMode(state, state.mode, { persist: false });
  return true;
}

export function installPipelineCadPreviewModeObserver(doc = globalThis.document) {
  if (!doc?.body || doc.body.dataset.p3dCadPreviewModeObserver === '1') return null;
  doc.body.dataset.p3dCadPreviewModeObserver = '1';
  ensureStyle(doc);
  const patchAll = () => doc.querySelectorAll('.pipeline-3d-model-dialog').forEach(patchDialog);
  patchAll();
  const MutationObserverCtor = globalThis.MutationObserver;
  if (typeof MutationObserverCtor !== 'function') return null;
  const observer = new MutationObserverCtor(patchAll);
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}

installPipelineCadPreviewModeControllerPatch();
if (globalThis.document?.body) installPipelineCadPreviewModeObserver(globalThis.document);
else globalThis.document?.addEventListener?.('DOMContentLoaded', () => installPipelineCadPreviewModeObserver(globalThis.document), { once: true });

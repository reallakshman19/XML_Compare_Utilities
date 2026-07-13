import {
  clamp,
  formatDepth,
  formatStation,
  interpolateAbsoluteHFromCumulative,
  interpolateCumulativeFromAbsoluteH,
} from './pipeline-3d-model-cad-math.js';
import { Table2XCanvas } from './pipeline-3d-model-table2x-canvas.js';
import { Table3XCanvas } from './pipeline-3d-model-table3x-canvas.js';

export const PIPELINE_CAD_ENGINEERING_REVIEW_BUILD = '2026.07.13-engineering-review-1';
export const PIPELINE_CAD_TABLE2_X_AXIS_LABEL = 'Station / Chainage (m)';
export const PIPELINE_CAD_TABLE2_Y_AXIS_LABEL = 'Elevation (m)';
export const PIPELINE_CAD_TABLE3_X_AXIS_LABEL = 'HLength Cumulative (m)';
export const PIPELINE_CAD_TABLE3_Y_AXIS_LABEL = 'Depth / Z (m)';

const PATCH = Symbol.for('pipeline3d.cad.engineering-review.patch.v1');
const BOUND = Symbol.for('pipeline3d.cad.engineering-review.bound.v1');
const INSPECTION = Symbol.for('pipeline3d.cad.engineering-review.inspection.v1');
const STYLE_ID = 'pipeline-3d-cad-engineering-review-style';
const DIALOG_STATES = new WeakMap();

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function graphName(graph) {
  return graph instanceof Table3XCanvas ? 'table3x' : 'table2x';
}

function compactNumber(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function niceEngineeringTickStep(span, targetTicks = 7) {
  const range = Math.abs(finite(span, 0));
  if (!(range > 0)) return 1;
  const target = Math.max(2, Math.floor(finite(targetTicks, 7)));
  const rough = range / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * power;
}

export function buildEngineeringTicks(minimum, maximum, targetTicks = 7) {
  const min = finite(minimum, 0);
  const max = finite(maximum, min + 1);
  if (!(max > min)) return Object.freeze([min]);
  const step = niceEngineeringTickStep(max - min, targetTicks);
  const first = Math.ceil((min - step * 1e-9) / step) * step;
  const ticks = [];
  for (let value = first, guard = 0; value <= max + step * 1e-9 && guard < 100; value += step, guard += 1) {
    ticks.push(Math.abs(value) < step * 1e-10 ? 0 : Number(value.toPrecision(12)));
  }
  return Object.freeze(ticks);
}

export function interpolateEngineeringProfile(points, x) {
  const value = Number(x);
  const rows = (Array.isArray(points) ? points : [])
    .filter((point) => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)))
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    .sort((a, b) => a.x - b.x);
  if (!rows.length || !Number.isFinite(value)) return null;
  if (rows.length === 1) return rows[0].y;
  if (value <= rows[0].x) return rows[0].y;
  if (value >= rows.at(-1).x) return rows.at(-1).y;
  for (let index = 0; index < rows.length - 1; index += 1) {
    const start = rows[index];
    const end = rows[index + 1];
    if (value < start.x || value > end.x) continue;
    const span = end.x - start.x;
    if (Math.abs(span) < 1e-12) return start.y;
    const ratio = (value - start.x) / span;
    return start.y + ratio * (end.y - start.y);
  }
  return null;
}

export function resolvePipelineCadLengthSegment(rows, cumulative) {
  const value = Number(cumulative);
  if (!Number.isFinite(value)) return null;
  let start = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Number.isFinite(row?.fromH) || !Number.isFinite(row?.toH) || !Number.isFinite(row?.hLength)) continue;
    const end = start + Number(row.hLength);
    if (value >= start - 1e-9 && value <= end + 1e-9) {
      return Object.freeze({
        id: row.id,
        sourceLine: row.sourceLine,
        cumulativeFrom: start,
        cumulativeTo: end,
        fromH: Number(row.fromH),
        toH: Number(row.toH),
        hLength: Number(row.hLength),
      });
    }
    start = end;
  }
  return null;
}

function table2Profile(model) {
  return (model?.table2Rows || [])
    .filter((row) => Number.isFinite(row.stationValue) && Number.isFinite(row.elevationValue))
    .map((row) => ({ x: Number(row.stationValue), y: Number(row.elevationValue), id: row.id }));
}

function table3DepthProfile(model) {
  const map = model?.coordinateMap;
  if (!map) return [];
  return (model?.table3DepthRows || [])
    .filter((row) => Number.isFinite(row.absoluteH) && Number.isFinite(row.z))
    .map((row) => ({
      x: interpolateCumulativeFromAbsoluteH(row.absoluteH, map),
      y: Number(row.z),
      id: row.id,
      text: row.zText,
    }));
}

function nearestMarker(model, cumulative) {
  const map = model?.coordinateMap;
  if (!map) return null;
  const markers = (model?.table3MarkerRows || [])
    .filter((row) => Number.isFinite(row.absoluteH))
    .map((row) => ({
      id: row.id,
      markerText: row.markerText,
      absoluteH: Number(row.absoluteH),
      cumulative: interpolateCumulativeFromAbsoluteH(row.absoluteH, map),
    }));
  if (!markers.length) return null;
  const domain = Math.max(1, Number(map.cumulativeMax) - Number(map.cumulativeMin));
  const tolerance = Math.max(0.75, domain * 0.025);
  const nearest = markers
    .map((marker) => ({ ...marker, delta: Math.abs(marker.cumulative - cumulative) }))
    .sort((a, b) => a.delta - b.delta)[0];
  return nearest?.delta <= tolerance ? Object.freeze(nearest) : null;
}

export function buildPipelineCadInspection(model, cumulative, options = {}) {
  if (!model?.coordinateMap) return null;
  const domainMin = Number(model.coordinateMap.cumulativeMin);
  const domainMax = Number(model.coordinateMap.cumulativeMax);
  const requested = Number(cumulative);
  if (!Number.isFinite(requested)) return null;
  const position = clamp(requested, domainMin, domainMax);
  const absoluteH = interpolateAbsoluteHFromCumulative(position, model.coordinateMap);
  const elevation = interpolateEngineeringProfile(table2Profile(model), position);
  const depthZ = interpolateEngineeringProfile(table3DepthProfile(model), position);
  const segment = resolvePipelineCadLengthSegment(model.table3LengthRows, position);
  const marker = nearestMarker(model, position);
  return Object.freeze({
    schema: 'PipelineCadCoordinateInspection.v1',
    build: PIPELINE_CAD_ENGINEERING_REVIEW_BUILD,
    sourceGraph: options.sourceGraph || '',
    cumulative: position,
    stationText: formatStation(position, 1),
    absoluteH,
    elevation,
    depthZ,
    depthText: Number.isFinite(depthZ) ? formatDepth(depthZ) : '—',
    segment,
    marker,
  });
}

function visibleWorldRange(graph) {
  const plot = graph.getPlotRect();
  const lowerLeft = graph.screenToWorld({ x: plot.left, y: plot.bottom });
  const upperRight = graph.screenToWorld({ x: plot.right, y: plot.top });
  return {
    plot,
    minX: Math.min(lowerLeft.x, upperRight.x),
    maxX: Math.max(lowerLeft.x, upperRight.x),
    minY: Math.min(lowerLeft.y, upperRight.y),
    maxY: Math.max(lowerLeft.y, upperRight.y),
  };
}

function decimalsForStep(step, maximum = 3) {
  const value = Math.abs(Number(step));
  if (!(value > 0)) return 1;
  if (value >= 2) return 0;
  if (value >= 0.2) return 1;
  if (value >= 0.02) return 2;
  return maximum;
}

function appendAxisAria(canvas, xLabel, yLabel) {
  if (!canvas) return;
  canvas.dataset.p3dCadXAxisLabel = xLabel;
  canvas.dataset.p3dCadYAxisLabel = yLabel;
  const current = String(canvas.getAttribute?.('aria-label') || '').trim();
  const additions = [];
  if (current && !current.includes(`X axis: ${xLabel}`)) additions.push(`X axis: ${xLabel}.`);
  if (current && !current.includes(`Y axis: ${yLabel}`)) additions.push(`Y axis: ${yLabel}.`);
  if (additions.length) canvas.setAttribute?.('aria-label', `${current}. ${additions.join(' ')}`);
}

export function drawPipelineCadEngineeringAxes(graph, options = {}) {
  const context = graph?.context;
  if (!context?.fillText || !graph?.getPlotRect || !graph?.screenToWorld) return false;
  const table3 = options.graphName === 'table3x' || graph instanceof Table3XCanvas;
  const xLabel = table3 ? PIPELINE_CAD_TABLE3_X_AXIS_LABEL : PIPELINE_CAD_TABLE2_X_AXIS_LABEL;
  const yLabel = table3 ? PIPELINE_CAD_TABLE3_Y_AXIS_LABEL : PIPELINE_CAD_TABLE2_Y_AXIS_LABEL;
  const range = visibleWorldRange(graph);
  const xTarget = Math.max(4, Math.min(9, Math.floor(range.plot.width / 105)));
  const yTarget = Math.max(4, Math.min(8, Math.floor(range.plot.height / 68)));
  const xTicks = buildEngineeringTicks(range.minX, range.maxX, xTarget);
  const yTicks = buildEngineeringTicks(range.minY, range.maxY, yTarget);
  const xStep = xTicks.length > 1 ? Math.abs(xTicks[1] - xTicks[0]) : 1;
  const yStep = yTicks.length > 1 ? Math.abs(yTicks[1] - yTicks[0]) : 1;

  context.save?.();
  context.strokeStyle = 'rgba(148,163,184,.72)';
  context.fillStyle = '#cbd5e1';
  context.lineWidth = 1;
  context.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  context.textBaseline = 'top';

  context.beginPath();
  context.moveTo(range.plot.left, range.plot.top);
  context.lineTo(range.plot.left, range.plot.bottom);
  context.lineTo(range.plot.right, range.plot.bottom);
  context.stroke();

  context.textAlign = 'center';
  for (const tick of xTicks) {
    const point = graph.worldToScreen({ x: tick, y: range.minY });
    if (point.x < range.plot.left - 1 || point.x > range.plot.right + 1) continue;
    context.beginPath();
    context.moveTo(point.x, range.plot.bottom);
    context.lineTo(point.x, range.plot.bottom + 5);
    context.stroke();
    const label = table3
      ? compactNumber(tick, decimalsForStep(xStep, 2))
      : formatStation(tick, xStep < 1 ? 1 : 0);
    context.fillText(label, point.x, range.plot.bottom + 7);
  }

  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const tick of yTicks) {
    const point = graph.worldToScreen({ x: range.minX, y: tick });
    if (point.y < range.plot.top - 1 || point.y > range.plot.bottom + 1) continue;
    context.beginPath();
    context.moveTo(range.plot.left - 5, point.y);
    context.lineTo(range.plot.left, point.y);
    context.stroke();
    context.fillText(compactNumber(tick, decimalsForStep(yStep, 2)), range.plot.left - 8, point.y);
  }

  context.fillStyle = '#e2e8f0';
  context.font = '600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  if (!table3) {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(xLabel, range.plot.left + range.plot.width / 2, Math.max(range.plot.bottom + 34, graph.height - 14));
  }
  context.save?.();
  context.translate?.(16, range.plot.top + range.plot.height / 2);
  context.rotate?.(-Math.PI / 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(yLabel, 0, 0);
  context.restore?.();
  context.restore?.();

  appendAxisAria(graph.canvas, xLabel, yLabel);
  if (graph.canvas) {
    graph.canvas.dataset.p3dCadXTickCount = String(xTicks.length);
    graph.canvas.dataset.p3dCadYTickCount = String(yTicks.length);
  }
  return true;
}

function drawInspectionCrosshair(graph) {
  const detail = graph?.[INSPECTION];
  const context = graph?.context;
  if (!detail || !context) {
    if (graph?.canvas) delete graph.canvas.dataset.p3dCadInspectionCumulative;
    return false;
  }
  const plot = graph.getPlotRect();
  const point = graph.worldToScreen({ x: detail.cumulative, y: 0 });
  if (point.x < plot.left || point.x > plot.right) return false;
  const yValue = graph instanceof Table3XCanvas ? detail.depthZ : detail.elevation;

  context.save?.();
  context.strokeStyle = '#fb923c';
  context.lineWidth = 1.5;
  context.setLineDash?.([6, 4]);
  context.beginPath();
  context.moveTo(point.x, plot.top);
  context.lineTo(point.x, plot.bottom);
  context.stroke();
  context.setLineDash?.([]);

  if (Number.isFinite(yValue)) {
    const profilePoint = graph.worldToScreen({ x: detail.cumulative, y: yValue });
    if (profilePoint.y >= plot.top && profilePoint.y <= plot.bottom) {
      context.beginPath();
      context.arc(profilePoint.x, profilePoint.y, 5, 0, Math.PI * 2);
      context.fillStyle = '#fb923c';
      context.fill();
      context.strokeStyle = '#fff7ed';
      context.lineWidth = 2;
      context.stroke();
    }
  }
  context.restore?.();
  if (graph.canvas) graph.canvas.dataset.p3dCadInspectionCumulative = detail.cumulative.toFixed(3);
  return true;
}

function ensureStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.p3d-cad-coordinate-inspector{position:absolute;z-index:6;right:16px;top:72px;width:min(300px,calc(100% - 32px));box-sizing:border-box;padding:9px 11px;border:1px solid rgba(251,146,60,.65);border-radius:8px;background:rgba(7,17,31,.94);box-shadow:0 10px 30px rgba(0,0,0,.4);color:#e2e8f0;font:11px/1.35 ui-monospace,monospace;pointer-events:none;opacity:0;transform:translateY(-4px);transition:opacity .12s ease,transform .12s ease}
.p3d-cad-coordinate-inspector[data-active="true"]{opacity:1;transform:translateY(0)}
.p3d-cad-coordinate-inspector strong{display:block;margin-bottom:6px;color:#fed7aa;font-size:12px}
.p3d-cad-coordinate-inspector dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 9px;margin:0}
.p3d-cad-coordinate-inspector dt{color:#94a3b8}
.p3d-cad-coordinate-inspector dd{margin:0;color:#f8fafc;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
  doc.head.appendChild(style);
}

function ensureInspector(dialog) {
  if (!dialog?.querySelector) return null;
  const host = dialog.querySelector('[data-p3d-split="x-modal"]') || dialog;
  let inspector = host.querySelector('[data-p3d-cad-coordinate-inspector]');
  if (inspector) return inspector;
  const doc = dialog.ownerDocument || globalThis.document;
  ensureStyle(doc);
  inspector = doc.createElement('aside');
  inspector.className = 'p3d-cad-coordinate-inspector';
  inspector.dataset.p3dCadCoordinateInspector = '1';
  inspector.dataset.active = 'false';
  inspector.setAttribute('aria-label', 'Pipeline CAD coordinate inspector');
  inspector.innerHTML = `<strong>Coordinate Inspector</strong><dl>
<dt>Cumulative HLength</dt><dd data-p3d-cad-inspector-field="cumulative">—</dd>
<dt>Station / Chainage</dt><dd data-p3d-cad-inspector-field="station">—</dd>
<dt>Absolute H</dt><dd data-p3d-cad-inspector-field="absoluteH">—</dd>
<dt>Elevation</dt><dd data-p3d-cad-inspector-field="elevation">—</dd>
<dt>Depth / Z</dt><dd data-p3d-cad-inspector-field="depth">—</dd>
<dt>Segment</dt><dd data-p3d-cad-inspector-field="segment">—</dd>
<dt>Segment HLength</dt><dd data-p3d-cad-inspector-field="segmentLength">—</dd>
<dt>Item</dt><dd data-p3d-cad-inspector-field="item">—</dd>
</dl>`;
  host.appendChild(inspector);
  return inspector;
}

function updateInspector(inspector, detail) {
  if (!inspector) return;
  inspector.dataset.active = detail ? 'true' : 'false';
  if (!detail) return;
  const values = {
    cumulative: `${detail.cumulative.toFixed(1)} m`,
    station: detail.stationText,
    absoluteH: detail.absoluteH.toFixed(3),
    elevation: Number.isFinite(detail.elevation) ? `${detail.elevation.toFixed(2)} m` : '—',
    depth: Number.isFinite(detail.depthZ) ? `${detail.depthText} (Z ${detail.depthZ.toFixed(2)} m)` : '—',
    segment: detail.segment ? `${detail.segment.fromH.toFixed(3)} → ${detail.segment.toH.toFixed(3)}` : '—',
    segmentLength: detail.segment ? `${detail.segment.hLength.toFixed(1)} m` : '—',
    item: detail.marker?.markerText || '—',
  };
  Object.entries(values).forEach(([name, value]) => {
    const field = inspector.querySelector(`[data-p3d-cad-inspector-field="${name}"]`);
    if (field) field.textContent = value;
  });
}

function dialogState(graph) {
  const dialog = graph?.canvas?.closest?.('.pipeline-3d-model-dialog');
  if (!dialog) return null;
  let state = DIALOG_STATES.get(dialog);
  if (!state) {
    state = {
      dialog,
      graphs: { table2x: null, table3x: null },
      inspector: ensureInspector(dialog),
      activeCumulative: null,
      frame: null,
      pending: null,
    };
    DIALOG_STATES.set(dialog, state);
  }
  state.graphs[graphName(graph)] = graph;
  return state;
}

function commonDomain(state, model) {
  const minima = [];
  const maxima = [];
  if (model?.coordinateMap) {
    minima.push(Number(model.coordinateMap.cumulativeMin));
    maxima.push(Number(model.coordinateMap.cumulativeMax));
  }
  if (model?.table2StationMap) {
    minima.push(Number(model.table2StationMap.cumulativeMin));
    maxima.push(Number(model.table2StationMap.cumulativeMax));
  }
  Object.values(state?.graphs || {}).filter(Boolean).forEach((graph) => {
    minima.push(Number(graph.bounds?.minX));
    maxima.push(Number(graph.bounds?.maxX));
  });
  const finiteMinima = minima.filter(Number.isFinite);
  const finiteMaxima = maxima.filter(Number.isFinite);
  const min = finiteMinima.length ? Math.max(...finiteMinima) : 0;
  const max = finiteMaxima.length ? Math.min(...finiteMaxima) : min + 1;
  return max > min ? { min, max } : { min, max: min + 1 };
}

function renderInspectionState(state, cumulative, sourceGraph) {
  const graph = state.graphs[sourceGraph] || state.graphs.table2x || state.graphs.table3x;
  const model = graph?.model;
  if (!model) return;
  const domain = commonDomain(state, model);
  const value = clamp(Number(cumulative), domain.min, domain.max);
  const detail = buildPipelineCadInspection(model, value, { sourceGraph });
  state.activeCumulative = detail?.cumulative ?? null;
  updateInspector(state.inspector, detail);
  Object.values(state.graphs).filter(Boolean).forEach((candidate) => {
    candidate[INSPECTION] = detail;
    candidate.render?.();
  });
}

function queueInspection(state, cumulative, sourceGraph) {
  state.pending = { cumulative, sourceGraph };
  if (state.frame != null) return;
  const schedule = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout?.(callback, 0));
  state.frame = schedule(() => {
    state.frame = null;
    const pending = state.pending;
    state.pending = null;
    if (pending) renderInspectionState(state, pending.cumulative, pending.sourceGraph);
  });
}

function clearInspection(state) {
  state.activeCumulative = null;
  state.pending = null;
  updateInspector(state.inspector, null);
  Object.values(state.graphs).filter(Boolean).forEach((graph) => {
    graph[INSPECTION] = null;
    graph.render?.();
  });
}

function selectedCumulative(graph, detail = {}) {
  const id = detail.entityId;
  if (!id) return null;
  if (graph instanceof Table2XCanvas) {
    return graph.currentNodes?.().find((node) => node.id === id)?.x ?? null;
  }
  return [
    ...(graph.markerNodes?.() || []),
    ...(graph.depthNodes?.() || []),
  ].find((node) => node.id === id)?.x ?? null;
}

function bindEngineeringInteraction(graph) {
  if (!graph?.canvas || graph[BOUND]) return;
  Object.defineProperty(graph, BOUND, { value: true });
  const state = dialogState(graph);
  if (!state) return;
  const canvas = graph.canvas;
  const name = graphName(graph);

  const onPointerMove = (event) => {
    const screen = graph.eventToScreen(event);
    const plot = graph.getPlotRect();
    if (screen.x < plot.left || screen.x > plot.right || screen.y < plot.top || screen.y > plot.bottom) return;
    const world = graph.screenToWorld(screen);
    queueInspection(state, world.x, name);
  };
  const onPointerLeave = () => {
    if (!graph.pointerState) clearInspection(state);
  };
  const onSelection = (event) => {
    const cumulative = selectedCumulative(graph, event.detail || {});
    if (Number.isFinite(cumulative)) queueInspection(state, cumulative, name);
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  graph.addEventListener('selectionChanged', onSelection);
  graph.destroyCallbacks?.push?.(() => {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    graph.removeEventListener('selectionChanged', onSelection);
    if (state.graphs[name] === graph) state.graphs[name] = null;
    if (!state.graphs.table2x && !state.graphs.table3x) {
      state.inspector?.remove?.();
      DIALOG_STATES.delete(state.dialog);
    }
  });
}

function patchGraphPrototype(prototype, name) {
  if (prototype[PATCH]) return false;
  Object.defineProperty(prototype, PATCH, { value: true });

  const originalSetModel = prototype.setModel;
  prototype.setModel = function setModelWithEngineeringReview(...args) {
    const result = originalSetModel.apply(this, args);
    bindEngineeringInteraction(this);
    const state = dialogState(this);
    if (state?.activeCumulative != null) renderInspectionState(state, state.activeCumulative, name);
    return result;
  };

  const originalRender = prototype.render;
  prototype.render = function renderWithEngineeringReview(...args) {
    const result = originalRender.apply(this, args);
    drawPipelineCadEngineeringAxes(this, { graphName: name });
    drawInspectionCrosshair(this);
    return result;
  };
  return true;
}

export function installPipelineCadEngineeringReview() {
  return Object.freeze({
    table2x: patchGraphPrototype(Table2XCanvas.prototype, 'table2x'),
    table3x: patchGraphPrototype(Table3XCanvas.prototype, 'table3x'),
  });
}

installPipelineCadEngineeringReview();

/**
 * Primary interactive 3D canvas for the Edit Draft tab (replaces the SVG
 * surface). The original canonical model renders as the ghosted source, the
 * draft as the target; every gesture emits an existing reversible edit
 * command through the controller — the scene itself is never mutated.
 */

import { asArray, cleanText, objectRecord } from './topology-validator-values.js';
import { buildCanonicalRestraintGeometry } from './topology-3d-visual-model.js?v=20260717-ttv-components-v1';
import { wireTopologyEditGestures } from './topology-edit-3d-gestures.js?v=20260717-ttv-components-v1';
import { addTopologyMeasurementPoint, bindTopologyMeasurement, formatTopologyMeasurement,
  resetTopologyMeasurement, syncTopologyMeasurement } from './topology-edit-measurement.js?v=20260717-ttv-components-v1';

let viewer = null;
let viewerHost = null;
let disposeGestures = () => {};
let callbacksRef = null;
let currentInput = null;

const boreMm = (value) => { const parsed = Number.parseFloat(String(value ?? '')); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; };
const pointArray = (value) => {
  const point = objectRecord(value);
  return [point.x, point.y, point.z].every((part) => Number.isFinite(Number(part)))
    ? [Number(point.x), Number(point.y), Number(point.z)] : null;
};

export const COMPONENT_COLORS = Object.freeze({
  PIPE: 0x64748b, VALVE: 0xcc2222, FLANGE: 0xb7b7b7, GASK: 0xe5e7eb, INST: 0xf59e0b,
  ELBOW: 0x8b5cf6, TEE: 0x14b8a6, OLET: 0x0ea5e9, REDUCER: 0xa855f7,
});

/**
 * sourcePath ("$[i].children[j]") → { aMm, lMm, apos } from the staged source.
 * CanonicalTopology.v1 drops bore data, so pipe sizes are re-joined from the
 * source components via each edge's sourcePaths.
 */
export function buildBoreIndex(sourceBranches) {
  const index = new Map();
  asArray(sourceBranches).map(objectRecord).forEach((branch, branchIndex) => {
    const children = asArray(branch.children).map(objectRecord);
    const branchBoreMm = children.map((child) => objectRecord(child.attributes))
      .map((attributes) => Math.max(boreMm(attributes.ABORE), boreMm(attributes.LBORE)))
      .find((diameterMm) => diameterMm > 0) ?? 0;
    index.set(`$[${branchIndex}]`, { branchBoreMm, type: 'BRANCH' });
    children.forEach((child, childIndex) => {
      const attributes = objectRecord(child.attributes);
      index.set(`$[${branchIndex}].children[${childIndex}]`, {
        aMm: boreMm(attributes.ABORE), lMm: boreMm(attributes.LBORE),
        apos: pointArray(attributes.APOS), pos: pointArray(attributes.POS), lpos: pointArray(attributes.LPOS),
        type: cleanText(child.type || attributes.RAW_TYPE || attributes.TYPE).toUpperCase(),
        dtxr: cleanText(attributes.DTXR).toUpperCase(),
      });
    });
  });
  return index;
}

/** @param {Record<string, unknown>} canonical @param {Record<string, unknown>|null} validation @param {string} verticalAxis @param {Map<string, Record<string, unknown>>} boreIndex @param {number} supportScale @returns {Readonly<Record<string, unknown>>} */
export function visualGeometry(canonical, validation, verticalAxis, boreIndex, supportScale) {
  const nodes = asArray(canonical.nodes).map(objectRecord);
  const nodeIndex = new Map(nodes.map((node) => [cleanText(node.id), node]));
  const allEdges = asArray(canonical.edges).map(objectRecord);
  const sourceRows = (edge) => asArray(edge.sourcePaths).map((path) => boreIndex.get(cleanText(path))).filter(Boolean);
  const edgeBore = (edge) => {
    const rows = sourceRows(edge);
    if (/CREF_BRANCH_CONNECTION/i.test(cleanText(edge.segmentRole))) {
      const branchDiameter = [...rows].reverse().find((row) => Number(row.branchBoreMm) > 0)?.branchBoreMm;
      if (branchDiameter) return Number(branchDiameter);
    }
    const componentRows = rows.filter((row) => row.type !== 'BRANCH');
    const candidates = (componentRows.length ? componentRows : rows).flatMap((row) => [row.aMm, row.lMm, row.branchBoreMm]);
    return Math.max(Number(edge.diameterMm) || 0, ...candidates.map(Number).filter(Number.isFinite));
  };
  const edgeRadius = (edge) => Math.max(edgeBore(edge) > 0 ? edgeBore(edge) / 2 : 24, 4);
  const routeSegments = allEdges.flatMap((edge) => {
    const from = nodeIndex.get(cleanText(edge.fromNodeId)), to = nodeIndex.get(cleanText(edge.toNodeId));
    if (!from || !to) return [];
    const kind = componentKindForEdge(edge);
    const segment = {
      objectId: cleanText(edge.id),
      start: [from.position.x, from.position.y, from.position.z],
      end: [to.position.x, to.position.y, to.position.z],
      radiusMm: edgeRadius(edge),
      kind,
      pathId: asArray(edge.branchIds)[0] ?? '',
      colorInt: COMPONENT_COLORS[kind] ?? COMPONENT_COLORS.PIPE,
    };
    if (kind === 'ELBOW') {
      const elbow = sourceRows(edge).find((row) => /ELBO|BEND/.test(`${row.type} ${row.dtxr}`) && row.apos && row.pos && row.lpos);
      if (elbow) {
        segment.start = elbow.apos;
        segment.end = elbow.lpos;
        segment.center = elbow.pos;
        segment.curveRange = /RUN_IN/i.test(cleanText(edge.segmentRole)) ? [0, 0.5]
          : /RUN_OUT/i.test(cleanText(edge.segmentRole)) ? [0.5, 1] : [0, 1];
      }
    }
    if (kind === 'REDUCER') {
      // The reducer's own component gives both bores and the orientation:
      // ABORE belongs to the APOS end.
      const own = asArray(edge.sourcePaths).map((path) => boreIndex.get(cleanText(path)))
        .find((bore) => bore && bore.aMm > 0 && bore.lMm > 0 && bore.aMm !== bore.lMm);
      if (own) {
        const large = Math.max(own.aMm, own.lMm), small = Math.min(own.aMm, own.lMm);
        const fromIsApos = own.apos
          ? Math.hypot(from.position.x - own.apos[0], from.position.y - own.apos[1], from.position.z - own.apos[2])
            <= Math.hypot(to.position.x - own.apos[0], to.position.y - own.apos[1], to.position.z - own.apos[2])
          : true;
        const largeAtFrom = fromIsApos ? own.aMm >= own.lMm : own.lMm >= own.aMm;
        if (!largeAtFrom) { const flip = segment.start; segment.start = segment.end; segment.end = flip; }
        segment.radiusMm = large / 2;
        segment.radiusMm2 = small / 2;
      } else {
        segment.radiusMm2 = segment.radiusMm * 0.6;
      }
    }
    return [segment];
  });
  const nodeMarkers = nodes.map((node) => ({
    objectId: cleanText(node.id),
    nodeId: cleanText(node.id),
    kind: 'NODE',
    position: [node.position.x, node.position.y, node.position.z],
    sizeMm: 20,
  }));
  const restraintGeometry = buildCanonicalRestraintGeometry(canonical, { verticalAxis, supportScale });
  const fittings = fittingSegments(canonical, nodeIndex, edgeRadius);
  const issueMarkers = asArray(validation?.findings).map(objectRecord).flatMap((issue) => {
    const objectId = asArray(issue.objectIds).map(cleanText).find(Boolean), node = nodeIndex.get(objectId);
    const edge = asArray(canonical.edges).map(objectRecord).find((row) => cleanText(row.id) === objectId);
    const from = edge ? nodeIndex.get(cleanText(edge.fromNodeId)) : null, to = edge ? nodeIndex.get(cleanText(edge.toNodeId)) : null;
    const position = node ? [node.position.x, node.position.y, node.position.z]
      : from && to ? [(from.position.x + to.position.x) / 2, (from.position.y + to.position.y) / 2, (from.position.z + to.position.z) / 2] : null;
    return position ? [{ objectId, kind: 'ISSUE_BADGE', position, label: cleanText(issue.code), colorInt: Number.parseInt(cleanText(issue.color).replace('#', ''), 16), sizeMm: 34, isObjectMarker: true }] : [];
  });
  const segments = [...routeSegments, ...fittings, ...restraintGeometry.segments], markers = [...nodeMarkers, ...restraintGeometry.markers, ...issueMarkers];
  const points = [...segments.flatMap((row) => [row.start, row.end]), ...markers.map((row) => row.position)];
  const axes = [0, 1, 2].map((axis) => points.map((value) => Number(value[axis])));
  return Object.freeze({
    schema: 'VisualGeometryModel.v1',
    segments: Object.freeze(segments),
    markers: Object.freeze(markers),
    bounds: Object.freeze({
      min: axes.map((values) => values.length ? Math.min(...values) : 0),
      max: axes.map((values) => values.length ? Math.max(...values) : 1),
    }),
  });
}

/** Render valve/flange/bend/instrument edges with their fitting shapes in 3D. */
function componentKindForEdge(edge) {
  const role = cleanText(edge.segmentRole).toUpperCase();
  const types = asArray(edge.sourceTypes).map(cleanText).join(' ').toUpperCase();
  if (/VALV/.test(role)) return 'VALVE';
  if (/INST/.test(role)) return 'INST';
  if (/GASK/.test(role)) return 'GASK';
  if (/FLAN/.test(role)) return 'FLANGE';
  if (/REDU/.test(role)) return 'REDUCER';
  if (/BEND|ELBO/.test(role)) return 'ELBOW';
  if (/TEE/.test(role) || /\bTEE\b/.test(types)) return 'TEE';
  return 'PIPE';
}

const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vScale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vLen = (a) => Math.hypot(a[0], a[1], a[2]);
const vUnit = (a) => { const l = vLen(a); return l > 1e-9 ? vScale(a, 1 / l) : null; };
const nodeXyz = (node) => [node.position.x, node.position.y, node.position.z];

/** Tee collars and OLET tapers derived from canonical incidence and branch bore. */
function fittingSegments(canonical, nodeIndex, edgeRadius) {
  const edges = asArray(canonical.edges).map(objectRecord);
  const segments = [];
  const otherEnd = (edge, nodeId) => nodeIndex.get(cleanText(edge.fromNodeId) === nodeId ? cleanText(edge.toNodeId) : cleanText(edge.fromNodeId));
  for (const junction of asArray(canonical.junctions).map(objectRecord)) {
    const nodeId = cleanText(junction.nodeId), node = nodeIndex.get(nodeId);
    if (!node) continue;
    const incident = edges.filter((edge) => cleanText(edge.fromNodeId) === nodeId || cleanText(edge.toNodeId) === nodeId);
    const junctionKind = cleanText(junction.kind).toUpperCase();
    if (junctionKind === 'OLET') {
      const branchEdge = incident.find((edge) => /CREF_BRANCH_CONNECTION/i.test(cleanText(edge.segmentRole)));
      const other = branchEdge ? otherEnd(branchEdge, nodeId) : null;
      if (!branchEdge || !other) continue;
      const direction = vUnit(vSub(nodeXyz(other), nodeXyz(node)));
      if (!direction) continue;
      const branchRadius = edgeRadius(branchEdge);
      const taperLength = Math.min(branchRadius * 4, vLen(vSub(nodeXyz(other), nodeXyz(node))) * 0.4);
      segments.push({
        objectId: cleanText(branchEdge.id), start: nodeXyz(node), end: vAdd(nodeXyz(node), vScale(direction, taperLength)),
        radiusMm: branchRadius * 2, radiusMm2: branchRadius, kind: 'OLET', pathId: cleanText(junction.id), colorInt: COMPONENT_COLORS.OLET,
      });
      continue;
    }
    if (junctionKind !== 'TEE') continue;
    for (const edge of incident.slice(0, 3)) {
      const other = otherEnd(edge, nodeId);
      if (!other) continue;
      const dir = vUnit(vSub(nodeXyz(other), nodeXyz(node)));
      if (!dir) continue;
      const pipeRadius = edgeRadius(edge);
      const stub = Math.min(pipeRadius * 2.5, 0.35 * vLen(vSub(nodeXyz(other), nodeXyz(node))));
      segments.push({ objectId: cleanText(edge.id), start: nodeXyz(node), end: vAdd(nodeXyz(node), vScale(dir, stub)), radiusMm: pipeRadius * 1.12, kind: 'TEE_COLLAR', pathId: cleanText(junction.id), colorInt: COMPONENT_COLORS.TEE });
    }
  }
  return segments;
}

async function ensureViewer(host) {
  if (viewer && viewerHost === host) return;
  disposeTopologyEditCanvas();
  host.innerHTML = '<div class="ttv-edit-3d-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></div>'
    + '<div class="ttv-edit-3d-controls" style="position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:6px;z-index:10;">'
    + '<button type="button" class="ttv-3d-btn" data-view="fit">Fit</button><button type="button" class="ttv-3d-btn" data-view="iso">ISO</button></div>'
    + '<aside class="ttv-measure-panel" data-ttv-measure-panel hidden><header><b>Measure</b><span data-ttv-measure-state></span></header>'
    + '<div class="ttv-measure-summary"><span data-ttv-measure-count>0 points</span><strong data-ttv-measure-total>0 mm</strong></div>'
    + '<table><tbody data-ttv-measure-segments><tr><td colspan="2">No segments yet.</td></tr></tbody></table>'
    + '<button type="button" data-ttv-measure-clear>Clear</button></aside>';
  if (!host.style.position) host.style.position = 'relative';
  const canvasHost = host.querySelector('.ttv-edit-3d-canvas');
  const { createWorkbenchViewer } = await import('../../workbench3d/viewer/workbench-viewer.js?v=20260717-ttv-components-v1');
  viewer = await createWorkbenchViewer(canvasHost, {});
  viewerHost = host;
  disposeGestures = wireTopologyEditGestures({
    host: canvasHost,
    viewer: () => viewer,
    callbacks: () => callbacksRef,
    input: () => currentInput,
  });
  host.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    if (button.getAttribute('data-view') === 'fit') viewer?.fitAll();
    else viewer?.setStandardView('iso');
  }));
  bindTopologyMeasurement(viewer, host);
}

/**
 * @param {Element} host
 * @param {{ original: Record<string, unknown>, draft: Record<string, unknown>,
 *           validation: Record<string, unknown>|null, selection: ReadonlyArray<Record<string,string>>,
 *           verticalAxis: string, supportScale: number, ghost?: Record<string, unknown>|null,
 *           callbacks: Record<string, Function> }} input
 * @returns {Promise<void>}
 */
export async function renderTopologyEditCanvas(host, input) {
  callbacksRef = Object.freeze({ ...input.callbacks, onMeasurePoint: addTopologyMeasurementPoint });
  currentInput = input;
  await ensureViewer(host);
  viewer.setVerticalAxis(input.verticalAxis);
  const boreIndex = buildBoreIndex(input.sourceBranches);
  viewer.setModels({
    source: visualGeometry(input.original, null, input.verticalAxis, boreIndex, input.supportScale),
    target: visualGeometry(input.draft, input.validation, input.verticalAxis, boreIndex, input.supportScale),
    registrationTranslation: [0, 0, 0],
  });
  viewer.setGhostModel(input.ghost ?? null);
  syncTopologyMeasurement();
  selectTopologyEditObjects(input.selection.map((row) => row.id));
  if (!host.dataset.fitted) {
    viewer.fitAll();
    host.dataset.fitted = 'true';
  }
}

export function selectTopologyEditObjects(ids) {
  const clean = asArray(ids).map(cleanText).filter(Boolean);
  viewer?.setSelection(clean.at(-1) ?? '', clean.slice(0, -1));
}

export function topologyEditCanvasNavigation() {
  return Object.freeze({
    fit: () => viewer?.fitAll(),
    zoomIn: () => viewer?.zoomBy(1 / 1.2),
    zoomOut: () => viewer?.zoomBy(1.2),
    fitObjectKey: (key) => { const id = cleanText(key).split(':').pop(); if (id) viewer?.fitObject(id); },
    setStandardView: (view) => viewer?.setStandardView(view),
    destroy: () => {},
  });
}
export function setTopologyEditGhostModel(model) {
  viewer?.setGhostModel(model ?? null);
}
export function projectTopologyEditPoint(xyz) {
  return viewer?.projectPoint(xyz) ?? null;
}
export function getTopologyEditViewer() { return viewer; }
/** @returns {void} */
export function disposeTopologyEditCanvas() {
  disposeGestures();
  disposeGestures = () => {};
  resetTopologyMeasurement();
  viewer?.dispose();
  viewer = null;
  viewerHost = null;
  callbacksRef = null;
  currentInput = null;
}
export const _test = Object.freeze({ visualGeometry, componentKindForEdge, formatTopologyMeasurement });

/** Builds trace 3D geometry, including directional restraint arrows. */

import { asArray, cleanText, objectRecord } from './topology-validator-values.js';

/** @param {number[]} value @returns {number[]|null} */
function unit(value) {
  const length = Math.hypot(...value);
  return length > 1e-9 ? value.map((part) => part / length) : null;
}

/** @param {Record<string, unknown>} support @param {Map<string,Record<string,unknown>>} nodes @param {Record<string, unknown>[]} edges @returns {number[]|null} */
function pipeAxis(support, nodes, edges) {
  const nodeId = cleanText(support.nodeId), node = nodes.get(nodeId);
  if (!node) return null;
  const edge = edges.find((row) => cleanText(row.fromNodeId) === nodeId || cleanText(row.toNodeId) === nodeId);
  if (!edge) return null;
  const otherId = cleanText(edge.fromNodeId) === nodeId ? cleanText(edge.toNodeId) : cleanText(edge.fromNodeId), other = nodes.get(otherId);
  return other ? unit([other.position.x - node.position.x, other.position.y - node.position.y, other.position.z - node.position.z]) : null;
}

/** @param {number[]} axis @returns {number[]} */
function lateralAxis(axis) {
  const reference = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return unit([
    (axis[1] * reference[2]) - (axis[2] * reference[1]),
    (axis[2] * reference[0]) - (axis[0] * reference[2]),
    (axis[0] * reference[1]) - (axis[1] * reference[0]),
  ]);
}

/** @param {number[]} direction @returns {number[]} */
function opposite(direction) {
  return direction.map((value) => value === 0 ? 0 : -value);
}

/** @param {Record<string, unknown>} restraint @param {number[]|null} axis @returns {number[][]} */
function restraintDirections(restraint, axis) {
  const token = cleanText(restraint.direction || restraint.type).toUpperCase();
  const explicit = { '+X': [1, 0, 0], '-X': [-1, 0, 0], '+Y': [0, 1, 0], '-Y': [0, -1, 0], '+Z': [0, 0, 1], '-Z': [0, 0, -1], X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] }[token];
  if (explicit) return [explicit];
  const kind = cleanText(restraint.kind).toUpperCase();
  if (kind === 'GUIDE' && axis) { const lateral = lateralAxis(axis); return lateral ? [lateral, opposite(lateral)] : []; }
  if (kind === 'LINESTOP' && axis) return [axis, opposite(axis)];
  return [];
}

/** @param {Record<string, unknown>} canonical @returns {{segments:Record<string,unknown>[],markers:Record<string,unknown>[]}} */
export function buildCanonicalRestraintGeometry(canonical) {
  const nodes = new Map(asArray(canonical.nodes).map(objectRecord).map((node) => [cleanText(node.id), node]));
  const edges = asArray(canonical.edges).map(objectRecord), segments = [], markers = [];
  for (const support of asArray(canonical.supports).map(objectRecord)) {
    const node = nodes.get(cleanText(support.nodeId));
    if (!node) continue;
    const position = [node.position.x, node.position.y, node.position.z], axis = pipeAxis(support, nodes, edges);
    markers.push({ objectId: cleanText(support.id), nodeId: cleanText(support.nodeId), kind: 'SUPPORT', position, sizeMm: 28, isObjectMarker: true });
    asArray(support.restraints).map(objectRecord).forEach((restraint, index) => {
      for (const direction of restraintDirections(restraint, axis)) {
        const length = 120, tip = position.map((value, axisIndex) => value + (direction[axisIndex] * length));
        const shaftEnd = position.map((value, axisIndex) => value + (direction[axisIndex] * (length - 24)));
        segments.push({ objectId: cleanText(support.id), start: position, end: shaftEnd, radiusMm: 7, kind: 'restraint', pathId: cleanText(support.id) });
        markers.push({ objectId: cleanText(support.id), nodeId: cleanText(support.nodeId), kind: 'RESTRAINT_ARROW', position: tip, direction, restraintKind: cleanText(restraint.kind), restraintIndex: index, sizeMm: 34, isObjectMarker: true });
      }
    });
  }
  return { segments, markers };
}

/** @param {Record<string, unknown>} viewModel @returns {Record<string, unknown>} */
export function build3dVisualGeometryModel(viewModel) {
  const segments = [], markers = [], nodeMap = new Map(viewModel.canonicalNodes.map((node) => [cleanText(node.id), node]));
  if (viewModel.visibility.source !== false) {
    for (const component of viewModel.sourceComponents) {
      const positions = objectRecord(component.positions), start = positions.APOS, end = positions.LPOS, center = positions.POS;
      const objectId = component.sourceEntityId || component.sourcePath, category = cleanText(component.componentCategory), type = cleanText(component.type);
      const symbolKinds = { VALVE: 'VALVE', FLANGE: 'FLANGE', SUPPORT: 'SUPPORT', REDUCER: 'REDUCER', INST: 'INSTRUMENT_CIRCLE', TEE: 'TEE_DIAMOND' };
      if (category === 'SUPPORT') continue;
      if (viewModel.showComponentSymbols && center && symbolKinds[category]) markers.push({ objectId, kind: symbolKinds[category], position: [center.x, center.y, center.z], sizeMm: 50, isObjectMarker: true });
      else if (start && end) {
        const radiusMm = component.attributes.DIAMETER ? Number(component.attributes.DIAMETER) / 2 : 25, pathId = component.sourceBranch;
        if (center && (type === 'ELBO' || type === 'BEND' || category === 'ELBO/BEND')) {
          if (viewModel.showComponentSymbols) markers.push({ objectId, kind: 'BEND', position: [center.x, center.y, center.z], sizeMm: 50, isObjectMarker: true });
          segments.push({ objectId, start: [start.x, start.y, start.z], end: [center.x, center.y, center.z], radiusMm, kind: 'source-route', pathId });
          segments.push({ objectId, start: [center.x, center.y, center.z], end: [end.x, end.y, end.z], radiusMm, kind: 'source-route', pathId });
        } else segments.push({ objectId, start: [start.x, start.y, start.z], end: [end.x, end.y, end.z], radiusMm, kind: 'source-route', pathId });
      }
    }
  }
  if (viewModel.visibility.canonical !== false) {
    for (const edge of viewModel.canonicalEdges) {
      const from = nodeMap.get(cleanText(edge.fromNodeId)), to = nodeMap.get(cleanText(edge.toNodeId));
      if (from && to) segments.push({ objectId: edge.id, start: [from.position.x, from.position.y, from.position.z], end: [to.position.x, to.position.y, to.position.z], radiusMm: edge.diameterMm ? edge.diameterMm / 2 : 30, kind: 'canonical-edge' });
    }
    for (const node of viewModel.canonicalNodes) markers.push({ objectId: node.id, kind: 'NODE', position: [node.position.x, node.position.y, node.position.z], nodeId: node.id, sizeMm: 24 });
    const restraintGeometry = buildCanonicalRestraintGeometry({ nodes: viewModel.canonicalNodes, edges: viewModel.canonicalEdges, supports: viewModel.supports });
    segments.push(...restraintGeometry.segments); markers.push(...restraintGeometry.markers);
  }
  for (const [visible, rows, kind] of [
    [viewModel.visibility.junctions !== false, viewModel.junctions, 'ANCHOR_JUNCTION'],
    [viewModel.visibility.pointFeatures !== false, viewModel.pointFeatures, 'NODE'],
    [viewModel.visibility.boundaries !== false, viewModel.boundaries, 'NODE'],
  ]) if (visible) for (const row of rows) markers.push({ objectId: row.id, kind, position: [row.position.x, row.position.y, row.position.z], nodeId: row.nodeId, sizeMm: 50, isObjectMarker: true });
  if (viewModel.labels) for (const node of viewModel.canonicalNodes) markers.push({ objectId: node.id, kind: 'LABEL', position: [node.position.x, node.position.y, node.position.z], label: cleanText(node.id), sizeMm: 0 });
  for (const issue of asArray(viewModel.issues).map(objectRecord)) {
    const id = asArray(issue.canonicalIds).map(cleanText).find((value) => nodeMap.has(value)), node = nodeMap.get(id);
    if (node) markers.push({ objectId: id, kind: 'ISSUE_BADGE', position: [node.position.x, node.position.y, node.position.z], label: cleanText(issue.code) || 'ISSUE', sizeMm: 40, isObjectMarker: true });
  }
  for (const [rows, kind] of [[viewModel.topologyGaps, 'GAP'], [viewModel.topologyOverlaps, 'OVERLAP']]) for (const row of asArray(rows).map(objectRecord)) if (row.position) markers.push({ objectId: row.id || kind.toLowerCase(), kind, position: [row.position.x, row.position.y, row.position.z], sizeMm: 50, isObjectMarker: true });
  const points = [...segments.flatMap((row) => [row.start, row.end]), ...markers.map((row) => row.position)], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const point of points) for (let axis = 0; axis < 3; axis += 1) { min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis]); }
  return { contract: 'VisualGeometryModel.v1', modelId: 'topology-3d', unit: 'mm', segments, markers, bounds: Number.isFinite(min[0]) ? { min, max } : { min: [0, 0, 0], max: [0, 0, 0] } };
}

export const _test = Object.freeze({ unit, pipeAxis, lateralAxis, opposite, restraintDirections });

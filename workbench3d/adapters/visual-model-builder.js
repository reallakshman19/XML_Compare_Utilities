/**
 * visual-model-builder.js — CanonicalObjectGraph.v1 → VisualGeometryModel.v1.
 *
 * Pure view-model derivation: centerline segments, node markers, and property
 * packet markers. Never mutates the canonical graph; never touches Three.js.
 */

import { CONTRACT_VERSIONS } from '../contracts/contracts.js';

const PACKET_MARKER_KINDS = Object.freeze(['RIGID', 'BEND', 'SIF', 'RESTRAINT', 'HANGER']);

export function buildVisualModel(graph) {
  const nodeCoord = new Map(graph.nodes.map((n) => [n.nodeId, n.coordMm]));
  const segments = [];
  const markers = [];
  for (const object of graph.objects) {
    const start = nodeCoord.get(object.fromNode);
    const end = nodeCoord.get(object.toNode);
    if (!start || !end) continue;
    segments.push({
      objectId: object.objectId,
      start: [...start],
      end: [...end],
      radiusMm: object.diameterMm ? object.diameterMm / 2 : 25,
      kind: object.kind,
      pathId: object.pathId,
    });
    const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
    for (const packet of object.packets) {
      if (!PACKET_MARKER_KINDS.includes(packet.kind)) continue;
      markers.push({ objectId: object.objectId, kind: packet.kind, position: mid, consumedFrom: packet.consumedFrom ?? null });
    }
  }
  for (const anchor of graph.anchors) {
    markers.push({ objectId: null, kind: `ANCHOR_${anchor.anchorType}`, position: [...anchor.coordMm], nodeId: anchor.nodeId });
  }
  return {
    contract: CONTRACT_VERSIONS.VisualGeometryModel,
    modelId: graph.modelId,
    unit: 'mm',
    segments,
    markers,
    bounds: computeBounds(segments),
  };
}

function computeBounds(segments) {
  if (!segments.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const seg of segments) {
    for (const point of [seg.start, seg.end]) {
      for (let i = 0; i < 3; i += 1) {
        if (point[i] < min[i]) min[i] = point[i];
        if (point[i] > max[i]) max[i] = point[i];
      }
    }
  }
  return { min, max };
}

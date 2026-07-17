/**
 * visual-model-builder.js — CanonicalObjectGraph.v1 → VisualGeometryModel.v1.
 *
 * Pure view-model derivation: centerline segments, node markers, and property
 * packet markers. Never mutates the canonical graph; never touches Three.js.
 *
 * Options (all optional):
 *   markerPlacement    'from' | 'to' | 'mid' (default) | 'text'
 *   packetMarkerKinds  string[] allowlist of packet kinds to render (null = default set)
 *   showAllNodes       emit a NODE marker for every graph node
 *   nodeMarkerSizeMm   marker radius for node/packet markers
 */

import { CONTRACT_VERSIONS } from '../contracts/contracts.js';

const PACKET_MARKER_KINDS = Object.freeze(['RIGID', 'BEND', 'SIF', 'RESTRAINT', 'HANGER', 'SUPPORT']);

function normalizeNodeText(value) {
  const num = Number(String(value ?? '').trim());
  if (Number.isFinite(num)) return String(Math.round(num));
  const text = String(value ?? '').trim();
  return text || '';
}

/**
 * Resolve where a packet marker sits on its host object.
 * 'text' mode reads the packet's NODE/CNODE attribute and resolves it against
 * the GLOBAL node coordinate map; unknown nodes fall back to midpoint with
 * fallback:true so the UI can flag them.
 */
export function resolvePacketPosition(packet, object, nodeCoord, placement = 'mid') {
  const start = nodeCoord.get(object.fromNode);
  const end = nodeCoord.get(object.toNode);
  const mid = start && end
    ? [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]
    : (start ?? end ?? [0, 0, 0]);
  if (placement === 'from' && start) return { position: [...start], resolvedNodeId: object.fromNode, fallback: false };
  if (placement === 'to' && end) return { position: [...end], resolvedNodeId: object.toNode, fallback: false };
  if (placement === 'text') {
    const nodeText = packet.attrs?.NODE ?? packet.attrs?.CNODE ?? null;
    if (nodeText !== null && nodeText !== undefined && String(nodeText).trim() !== '') {
      const nodeId = normalizeNodeText(nodeText);
      const coord = nodeCoord.get(nodeId);
      if (coord) return { position: [...coord], resolvedNodeId: nodeId, fallback: false };
      return { position: mid, resolvedNodeId: nodeId, fallback: true };
    }
    return { position: mid, resolvedNodeId: null, fallback: true };
  }
  return { position: mid, resolvedNodeId: null, fallback: false };
}

export function buildVisualModel(graph, options = {}) {
  const placement = options.markerPlacement ?? 'mid';
  const allowedKinds = Array.isArray(options.packetMarkerKinds) ? options.packetMarkerKinds : PACKET_MARKER_KINDS;
  const markerSize = Number.isFinite(options.nodeMarkerSizeMm) ? options.nodeMarkerSizeMm : null;
  const nodeCoord = new Map(graph.nodes.map((n) => [n.nodeId, n.coordMm]));
  const segments = [];
  const markers = [];
  for (const object of graph.objects) {
    const start = nodeCoord.get(object.fromNode);
    const end = nodeCoord.get(object.toNode);
    if (!start || !end) continue;
    const isPoint = object.fromNode === object.toNode || object.lengthMm === 0;
    if (isPoint) {
      // Zero-length (node-set) object: render as a pickable object marker.
      markers.push({
        objectId: object.objectId,
        kind: 'NODE',
        nodeId: object.fromNode,
        position: [...start],
        isObjectMarker: true,
        sizeMm: markerSize ?? 60,
      });
    } else {
      let resolvedKind = object.kind;
      if (object.kind === 'RIGID') {
        const rigidPacket = object.packets?.find((p) => p.kind === 'RIGID');
        if (rigidPacket) {
          const typeAttr = String(rigidPacket.attrs?.TYPE || rigidPacket.attrs?.type || '').toUpperCase();
          const nameAttr = String(object.name || '').toUpperCase();
          if (/VALVE/.test(typeAttr) || /VALVE/.test(nameAttr)) {
            resolvedKind = 'VALVE';
          } else if (/FLANGE/.test(typeAttr) || /FLAN/.test(typeAttr) || /FLANGE/.test(nameAttr) || /FLAN/.test(nameAttr)) {
            resolvedKind = 'FLANGE';
          }
        }
      }
      segments.push({
        objectId: object.objectId,
        start: [...start],
        end: [...end],
        radiusMm: object.diameterMm ? object.diameterMm / 2 : 25,
        kind: resolvedKind,
        pathId: object.pathId,
        center: object.attrs?.centerPoint || object.attrs?.centrePoint || object.attrs?.center || object.attrs?.centre || null,
        attrs: object.attrs ? { ...object.attrs } : null,
      });
    }
    for (const packet of object.packets) {
      if (!allowedKinds.includes(packet.kind)) continue;
      const resolved = resolvePacketPosition(packet, object, nodeCoord, placement);
      markers.push({
        objectId: object.objectId,
        kind: packet.kind,
        position: resolved.position,
        nodeId: resolved.resolvedNodeId,
        fallback: resolved.fallback,
        consumedFrom: packet.consumedFrom ?? null,
        sizeMm: markerSize ?? undefined,
      });
    }
  }
  for (const anchor of graph.anchors) {
    markers.push({ objectId: null, kind: `ANCHOR_${anchor.anchorType}`, position: [...anchor.coordMm], nodeId: anchor.nodeId });
  }
  if (options.showAllNodes) {
    const anchorIds = new Set(graph.anchors.map((a) => a.nodeId));
    for (const node of graph.nodes) {
      if (anchorIds.has(node.nodeId)) continue;
      markers.push({ objectId: null, kind: 'NODE', position: [...node.coordMm], nodeId: node.nodeId, sizeMm: markerSize ?? 24 });
    }
  }
  return {
    contract: CONTRACT_VERSIONS.VisualGeometryModel,
    modelId: graph.modelId,
    unit: 'mm',
    segments,
    markers,
    bounds: computeBounds(segments, markers),
  };
}

function computeBounds(segments, markers = []) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const include = (point) => {
    for (let i = 0; i < 3; i += 1) {
      if (point[i] < min[i]) min[i] = point[i];
      if (point[i] > max[i]) max[i] = point[i];
    }
  };
  for (const seg of segments) { include(seg.start); include(seg.end); }
  for (const marker of markers) include(marker.position);
  if (!Number.isFinite(min[0])) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

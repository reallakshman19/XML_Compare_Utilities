import { CII_WORKSPACE_SCHEMAS, compareNodeIds, uniqueStrings } from './cii-workspace-contracts.js';

function nodeId(value) { return String(Math.round(Number(value))); }
function round(value, places = 6) { return Number(Number(value || 0).toFixed(places)); }
function otherNode(edge, node) { return edge.from === node ? edge.to : edge.from; }
function orderedPair(a, b) { return compareNodeIds(a, b) <= 0 ? [a, b] : [b, a]; }

function auxiliaryForElement(document, element) {
  return document?.auxiliaryEvidence?.elements?.[Number(element?.index)] || null;
}
function rigidEvidence(auxiliary) {
  const record = auxiliary?.rigidRecord;
  if (!record) return Object.freeze({ status: 'NONE' });
  return Object.freeze({
    status: 'POINTER_BOUND_RECORD',
    pointer: Number(record.pointer),
    weight: Number(record.weight),
    mass: Number(record.weight),
    rawFields: record.rawFields || Object.freeze([]),
    authority: 'ELEMENT_RIGID_POINTER_TO_RIGID_RECORD',
  });
}
function rawEdge(element, auxiliary) {
  const rigid = rigidEvidence(auxiliary);
  const componentKind = rigid.status === 'POINTER_BOUND_RECORD' ? 'RIGID' : (element.hasBend ? 'BEND' : 'PIPE');
  const packetEvidence = uniqueStrings([
    element.hasBend ? 'BEND' : '',
    rigid.status === 'POINTER_BOUND_RECORD' ? 'RIGID' : '',
    auxiliary?.sifTeeRecord ? 'SIF_TEE' : '',
  ]);
  return {
    from: nodeId(element.from), to: nodeId(element.to),
    canonicalFrom: nodeId(element.from), canonicalTo: nodeId(element.to),
    normalizedFromTo: `${nodeId(element.from)}->${nodeId(element.to)}`,
    dx: Number(element.dx || 0), dy: Number(element.dy || 0), dz: Number(element.dz || 0),
    lengthMm: Number(element.length || Math.hypot(element.dx || 0, element.dy || 0, element.dz || 0)),
    diameter: Number(element.od || 0), wall: Number(element.wall || 0),
    P1: Number(element.P1 || 0), T1: Number(element.T1 || 0),
    fromPos: element.fromPos || null, toPos: element.toPos || null,
    componentKind,
    packetEvidence, flags: packetEvidence,
    parsedElementIndex: Number(element.index),
    auxiliaryPointers: auxiliary?.pointers || null,
    sifTeeEvidence: auxiliary?.sifTeeRecord || null,
    rigidEvidence: rigid,
  };
}

function canonicalEdgeKey(edge) {
  const [a, b] = orderedPair(edge.from, edge.to);
  return [
    a, b, `${edge.from}->${edge.to}`, edge.componentKind,
    round(edge.lengthMm), round(edge.diameter), round(edge.wall), round(edge.P1), round(edge.T1),
    round(edge.dx), round(edge.dy), round(edge.dz),
  ].join('|');
}

function canonicalizeElements(document) {
  const rows = (document?.parsed?.elements || []).map((element) => rawEdge(element, auxiliaryForElement(document, element)));
  rows.sort((a, b) => canonicalEdgeKey(a).localeCompare(canonicalEdgeKey(b), undefined, { numeric: true, sensitivity: 'base' }));
  return rows.map((edge, index) => ({ ...edge, elementId: `E${index + 1}:${edge.from}->${edge.to}`, index: index + 1 }));
}

function buildIncidence(elements) {
  const adjacency = new Map();
  const add = (node, edge) => {
    const key = nodeId(node); if (!adjacency.has(key)) adjacency.set(key, []); adjacency.get(key).push(edge);
  };
  for (const edge of elements) { add(edge.from, edge); add(edge.to, edge); }
  for (const rows of adjacency.values()) rows.sort((a, b) => a.elementId.localeCompare(b.elementId, undefined, { numeric: true }));
  return adjacency;
}

function nodeToken(node, edge, adjacency) {
  const next = otherNode(edge, node); const degree = (adjacency.get(node) || []).length; const nextDegree = (adjacency.get(next) || []).length;
  // Network/Gang identity is structural. OD and wall are independent evidence
  // and must not be embedded here or they would be double-counted by M2.
  return `D${degree}->D${nextDegree}|${edge.componentKind}`;
}

function neighbourhoodLayers(start, adjacency, maxDepth = 3) {
  const visited = new Set([start]); let frontier = [start]; const layers = [];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth += 1) {
    const tokens = []; const nextFrontier = [];
    for (const node of frontier.sort(compareNodeIds)) {
      for (const edge of adjacency.get(node) || []) {
        tokens.push(nodeToken(node, edge, adjacency)); const next = otherNode(edge, node);
        if (!visited.has(next)) { visited.add(next); nextFrontier.push(next); }
      }
    }
    layers.push(Object.freeze(uniqueStrings(tokens))); frontier = uniqueStrings(nextFrontier).sort(compareNodeIds);
  }
  return Object.freeze(layers);
}

function contextFor(node, adjacency) {
  const incident = adjacency.get(node) || []; const diameters = incident.map((edge) => round(edge.diameter)).sort((a, b) => a - b);
  return Object.freeze({
    nodeId: node, degree: incident.length,
    inDegree: incident.filter((edge) => edge.to === node).length, outDegree: incident.filter((edge) => edge.from === node).length,
    lengths: incident.map((edge) => round(edge.lengthMm)).sort((a, b) => a - b), diameters,
    sizeTransition: new Set(diameters).size > 1, componentKinds: uniqueStrings(incident.map((edge) => edge.componentKind)),
    neighbourhoodLayers: neighbourhoodLayers(node, adjacency),
  });
}

function attachContexts(edges, adjacency) {
  for (const edge of edges) {
    edge.fromContext = contextFor(edge.from, adjacency); edge.toContext = contextFor(edge.to, adjacency);
    edge.anchorFlags = uniqueStrings([
      edge.fromContext.degree === 1 ? 'FROM_TERMINAL' : '', edge.toContext.degree === 1 ? 'TO_TERMINAL' : '',
      edge.fromContext.degree >= 3 ? 'FROM_BRANCH' : '', edge.toContext.degree >= 3 ? 'TO_BRANCH' : '',
      edge.fromContext.sizeTransition ? 'FROM_SIZE_TRANSITION' : '', edge.toContext.sizeTransition ? 'TO_SIZE_TRANSITION' : '',
      edge.componentKind !== 'PIPE' ? 'PROPERTY_ANCHOR' : '',
    ]);
    edge.isAnchorElement = edge.anchorFlags.length > 0;
  }
}

export function adaptCiiDocumentToTopologyGraph(document) {
  if (document?.schema !== CII_WORKSPACE_SCHEMAS.document) throw new Error('CII_WORKSPACE_DOCUMENT_REQUIRED');
  const edges = canonicalizeElements(document); const adjacency = buildIncidence(edges);
  attachContexts(edges, adjacency); const orderedNodes = [...adjacency.keys()].sort(compareNodeIds);
  return {
    schema: CII_WORKSPACE_SCHEMAS.graph, side: document.side, documentId: `${document.side}:${document.contentSha256}`,
    edges, adjacency,
    nodes: orderedNodes.map((id) => Object.freeze({
      id, degree: adjacency.get(id).length, position: document.parsed.nodes?.[id] || null,
      nodeName: document.nodeNames?.[id] || '', neighbourhoodLayers: neighbourhoodLayers(id, adjacency),
    })),
    summary: Object.freeze({ nodeCount: orderedNodes.length, elementCount: edges.length }),
  };
}

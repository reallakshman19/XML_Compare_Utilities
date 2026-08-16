import { CII_WORKSPACE_SCHEMAS, compareNodeIds, uniqueStrings } from './cii-workspace-contracts.js';

function nodeId(value) { return String(Math.round(Number(value))); }
function edgeId(element) { return `E${Number(element.index) + 1}:${nodeId(element.from)}->${nodeId(element.to)}`; }
function round(value, places = 6) { return Number(Number(value || 0).toFixed(places)); }

function buildIncidence(elements) {
  const adjacency = new Map();
  const add = (node, edge) => {
    const key = nodeId(node);
    if (!adjacency.has(key)) adjacency.set(key, []);
    adjacency.get(key).push(edge);
  };
  for (const edge of elements) { add(edge.from, edge); add(edge.to, edge); }
  for (const rows of adjacency.values()) rows.sort((a, b) => a.elementId.localeCompare(b.elementId));
  return adjacency;
}

function rigidEvidenceFor(edge, rigidByNode, adjacency) {
  const candidates = [];
  for (const endpoint of [edge.from, edge.to]) {
    const records = rigidByNode.get(endpoint) || [];
    if (records.length === 1 && (adjacency.get(endpoint) || []).length === 1) {
      candidates.push({ endpoint, record: records[0] });
    }
  }
  if (candidates.length !== 1) return Object.freeze({ status: candidates.length ? 'AMBIGUOUS' : 'NONE' });
  return Object.freeze({ status: 'UNIQUE_TERMINAL_RECORD', nodeId: candidates[0].endpoint, mass: Number(candidates[0].record.mass) });
}

function contextFor(node, adjacency) {
  const incident = adjacency.get(node) || [];
  const diameters = incident.map((edge) => round(edge.diameter)).sort((a, b) => a - b);
  return Object.freeze({
    nodeId: node,
    degree: incident.length,
    inDegree: incident.filter((edge) => edge.to === node).length,
    outDegree: incident.filter((edge) => edge.from === node).length,
    lengths: incident.map((edge) => round(edge.lengthMm)).sort((a, b) => a - b),
    diameters,
    sizeTransition: new Set(diameters).size > 1,
    componentKinds: uniqueStrings(incident.map((edge) => edge.componentKind)),
  });
}

function attachContexts(edges, adjacency) {
  for (const edge of edges) {
    edge.fromContext = contextFor(edge.from, adjacency);
    edge.toContext = contextFor(edge.to, adjacency);
    edge.anchorFlags = uniqueStrings([
      edge.fromContext.degree === 1 ? 'FROM_TERMINAL' : '',
      edge.toContext.degree === 1 ? 'TO_TERMINAL' : '',
      edge.fromContext.degree >= 3 ? 'FROM_BRANCH' : '',
      edge.toContext.degree >= 3 ? 'TO_BRANCH' : '',
      edge.componentKind !== 'PIPE' ? 'PROPERTY_ANCHOR' : '',
    ]);
    edge.isAnchorElement = edge.anchorFlags.length > 0;
  }
}

export function adaptCiiDocumentToTopologyGraph(document) {
  if (document?.schema !== 'CIIWorkspaceDocument.v1') throw new Error('CII_WORKSPACE_DOCUMENT_REQUIRED');
  const rigidByNode = new Map();
  for (const record of document.parsed.rigids || []) {
    const key = nodeId(record.node);
    if (!rigidByNode.has(key)) rigidByNode.set(key, []);
    rigidByNode.get(key).push(record);
  }
  const edges = document.parsed.elements.map((element) => ({
    elementId: edgeId(element),
    index: Number(element.index) + 1,
    from: nodeId(element.from), to: nodeId(element.to),
    canonicalFrom: nodeId(element.from), canonicalTo: nodeId(element.to),
    normalizedFromTo: `${nodeId(element.from)}->${nodeId(element.to)}`,
    dx: Number(element.dx || 0), dy: Number(element.dy || 0), dz: Number(element.dz || 0),
    lengthMm: Number(element.length || Math.hypot(element.dx || 0, element.dy || 0, element.dz || 0)),
    diameter: Number(element.od || 0), wall: Number(element.wall || 0),
    P1: Number(element.P1 || 0), T1: Number(element.T1 || 0),
    fromPos: element.fromPos || null, toPos: element.toPos || null,
    componentKind: element.hasBend ? 'BEND' : 'PIPE',
    packetEvidence: element.hasBend ? ['BEND'] : [],
    flags: element.hasBend ? ['BEND'] : [],
  }));
  const adjacency = buildIncidence(edges);
  for (const edge of edges) {
    edge.rigidEvidence = rigidEvidenceFor(edge, rigidByNode, adjacency);
    if (edge.rigidEvidence.status === 'UNIQUE_TERMINAL_RECORD') {
      edge.componentKind = 'RIGID'; edge.packetEvidence = ['RIGID']; edge.flags = ['RIGID'];
    }
  }
  attachContexts(edges, adjacency);
  const orderedNodes = [...adjacency.keys()].sort(compareNodeIds);
  return {
    schema: CII_WORKSPACE_SCHEMAS.graph,
    side: document.side,
    documentId: `${document.side}:${document.contentSha256}`,
    edges,
    adjacency,
    nodes: orderedNodes.map((id) => Object.freeze({
      id,
      degree: adjacency.get(id).length,
      position: document.parsed.nodes?.[id] || null,
      nodeName: document.nodeNames?.[id] || '',
    })),
    summary: Object.freeze({ nodeCount: orderedNodes.length, elementCount: edges.length }),
  };
}

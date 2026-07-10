/**
 * canonical-graph-builder.js — raw element records → CanonicalObjectGraph.v1.
 *
 * Responsibilities (Phase 1):
 *  - derive absolute node coordinates from relative DELTA vectors
 *  - consume short/zero elements within tolerance (preserving packet evidence)
 *  - derive anchors (endpoints / branch nodes), paths (anchor→anchor chains),
 *    path stations, and hierarchy grouping
 *
 * Pure module: no DOM, no rendering, no matching.
 */

import { CONTRACT_VERSIONS } from '../contracts/contracts.js';

function addVec(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

/**
 * Walk the element graph to assign absolute coordinates per node.
 * Disconnected components each start at origin; componentId recorded per node.
 */
function solveNodeCoordinates(records) {
  const adjacency = new Map(); // node -> [{record, forward}]
  const pushEdge = (node, record, forward) => {
    if (!adjacency.has(node)) adjacency.set(node, []);
    adjacency.get(node).push({ record, forward });
  };
  for (const record of records) {
    if (!record.fromNode || !record.toNode) continue;
    pushEdge(record.fromNode, record, true);
    pushEdge(record.toNode, record, false);
  }
  const coords = new Map();
  const componentOf = new Map();
  let componentIndex = 0;
  for (const startNode of adjacency.keys()) {
    if (coords.has(startNode)) continue;
    componentIndex += 1;
    const componentId = `C${componentIndex}`;
    coords.set(startNode, [0, 0, 0]);
    componentOf.set(startNode, componentId);
    const queue = [startNode];
    while (queue.length) {
      const node = queue.shift();
      const base = coords.get(node);
      for (const { record, forward } of adjacency.get(node) ?? []) {
        const other = forward ? record.toNode : record.fromNode;
        if (coords.has(other)) continue;
        const delta = forward ? record.deltaMm : record.deltaMm.map((v) => -v);
        coords.set(other, addVec(base, delta));
        componentOf.set(other, componentId);
        queue.push(other);
      }
    }
  }
  return { coords, componentOf };
}

/**
 * Consume short/zero elements within tolerance.
 * The dropped node is remapped onto the retained node; property packets of the
 * consumed element re-attach to the nearest surviving neighbor element.
 */
function consumeShortElements(records, toleranceMm) {
  const nodeAlias = new Map(); // dropped node -> retained node
  const resolve = (node) => {
    let current = node;
    while (nodeAlias.has(current)) current = nodeAlias.get(current);
    return current;
  };
  const degree = new Map();
  for (const record of records) {
    degree.set(record.fromNode, (degree.get(record.fromNode) ?? 0) + 1);
    degree.set(record.toNode, (degree.get(record.toNode) ?? 0) + 1);
  }
  const consumedRows = [];
  const surviving = [];
  const orphanPackets = []; // packets awaiting re-attachment
  for (const record of records) {
    const isShort = record.lengthMm <= toleranceMm;
    if (!isShort || !record.fromNode || !record.toNode || record.fromNode === record.toNode) {
      surviving.push(record);
      continue;
    }
    // Retain the busier node so branch topology is preserved.
    const fromDeg = degree.get(record.fromNode) ?? 0;
    const toDeg = degree.get(record.toNode) ?? 0;
    const retained = resolve(toDeg > fromDeg ? record.toNode : record.fromNode);
    const dropped = resolve(toDeg > fromDeg ? record.fromNode : record.toNode);
    if (retained !== dropped) nodeAlias.set(dropped, retained);
    consumedRows.push({
      elementName: record.name || `#${record.index}`,
      fromTo: `${record.fromNode}->${record.toNode}`,
      retainedNode: retained,
      droppedNode: dropped,
      lengthMm: Number(record.lengthMm.toFixed(3)),
      toleranceMm,
      packetEvidence: record.packets.map((p) => p.kind).join('+') || '',
      action: 'CONSUMED',
    });
    if (record.packets.length) orphanPackets.push({ nearNode: retained, packets: record.packets, from: record });
  }
  // Remap surviving endpoints through aliases.
  for (const record of surviving) {
    record.fromNode = resolve(record.fromNode);
    record.toNode = resolve(record.toNode);
  }
  // Re-attach orphan packets to the nearest surviving neighbor element.
  for (const orphan of orphanPackets) {
    const host = surviving.find((r) => r.fromNode === orphan.nearNode || r.toNode === orphan.nearNode) ?? surviving[0];
    if (!host) continue;
    for (const packet of orphan.packets) {
      host.packets.push({ ...packet, consumedFrom: orphan.from.name || `#${orphan.from.index}` });
    }
  }
  return { surviving, consumedRows };
}

function buildPaths(records, degree) {
  const isAnchor = (node) => (degree.get(node) ?? 0) !== 2;
  const byNode = new Map();
  for (const record of records) {
    for (const node of [record.fromNode, record.toNode]) {
      if (!byNode.has(node)) byNode.set(node, []);
      byNode.get(node).push(record);
    }
  }
  const visited = new Set();
  const paths = [];
  const walk = (startNode, firstRecord) => {
    const elements = [];
    let node = startNode;
    let record = firstRecord;
    while (record && !visited.has(record)) {
      visited.add(record);
      const forward = record.fromNode === node;
      const nextNode = forward ? record.toNode : record.fromNode;
      elements.push({ record, forward });
      node = nextNode;
      if (isAnchor(node)) break;
      record = (byNode.get(node) ?? []).find((r) => !visited.has(r));
    }
    return { elements, endNode: node };
  };
  const anchorNodes = Array.from(byNode.keys()).filter(isAnchor);
  for (const anchor of anchorNodes) {
    for (const record of byNode.get(anchor) ?? []) {
      if (visited.has(record)) continue;
      const { elements, endNode } = walk(anchor, record);
      if (elements.length) paths.push({ startNode: anchor, endNode, elements });
    }
  }
  // Pure loops (no anchors) — start anywhere.
  for (const record of records) {
    if (visited.has(record)) continue;
    const { elements, endNode } = walk(record.fromNode, record);
    if (elements.length) paths.push({ startNode: record.fromNode, endNode, elements });
  }
  return paths;
}

function anchorType(node, degree, restraintNodes) {
  const deg = degree.get(node) ?? 0;
  if (restraintNodes.has(node)) return deg >= 3 ? 'BRANCH+RESTRAINT' : 'RESTRAINT';
  if (deg >= 3) return 'BRANCH';
  if (deg === 1) return 'ENDPOINT';
  return 'ROUTE';
}

/**
 * Build CanonicalObjectGraph.v1 from raw records.
 * @param {string} modelId 'source' | 'target' | any
 * @param {Array} rawRecords records from parseInputXmlRecords
 * @param {object} options { shortElementToleranceMm }
 */
export function buildCanonicalGraph(modelId, rawRecords, options = {}) {
  const toleranceMm = Number(options.shortElementToleranceMm ?? 6);
  // Deep-ish copy so canonicalization never mutates adapter output.
  const records = rawRecords.map((r) => ({ ...r, deltaMm: [...r.deltaMm], packets: r.packets.map((p) => ({ ...p, attrs: { ...p.attrs } })), properties: { ...r.properties } }));
  const { surviving, consumedRows } = consumeShortElements(records, toleranceMm);

  const { coords, componentOf } = solveNodeCoordinates(surviving);
  const degree = new Map();
  for (const record of surviving) {
    degree.set(record.fromNode, (degree.get(record.fromNode) ?? 0) + 1);
    degree.set(record.toNode, (degree.get(record.toNode) ?? 0) + 1);
  }
  const restraintNodes = new Set();
  for (const record of surviving) {
    for (const packet of record.packets) {
      if (packet.kind === 'RESTRAINT' && packet.attrs.NODE) restraintNodes.add(String(Math.round(Number(packet.attrs.NODE))));
    }
  }

  const rawPaths = buildPaths(surviving, degree);
  const objects = [];
  const objectByRecord = new Map();
  const paths = rawPaths.map((path, pathIndex) => {
    const pathId = `${modelId}:P${pathIndex + 1}`;
    let station = 0;
    const elementIds = [];
    let totalLength = 0;
    path.elements.forEach(({ record, forward }, seq) => {
      const objectId = `${modelId}:E${objects.length + 1}`;
      const startNode = forward ? record.fromNode : record.toNode;
      const endNode = forward ? record.toNode : record.fromNode;
      const object = {
        objectId,
        kind: record.packets.some((p) => p.kind === 'RIGID') ? 'RIGID'
          : record.packets.some((p) => p.kind === 'BEND') ? 'BEND' : 'PIPE',
        fromNode: startNode,
        toNode: endNode,
        canonicalFromTo: `${startNode}->${endNode}`,
        lengthMm: Number(record.lengthMm.toFixed(3)),
        diameterMm: Number.isFinite(record.diameterMm) ? record.diameterMm : null,
        wallThickMm: Number.isFinite(record.wallThickMm) ? record.wallThickMm : null,
        name: record.name,
        lineId: record.lineId,
        pathId,
        pathSequence: seq,
        stationMm: Number(station.toFixed(3)),
        packets: record.packets,
        properties: record.properties,
        rawIndex: record.index,
      };
      station += record.lengthMm;
      totalLength += record.lengthMm;
      objects.push(object);
      objectByRecord.set(record, object);
      elementIds.push(objectId);
    });
    return {
      pathId,
      startNode: path.startNode,
      endNode: path.endNode,
      startAnchorType: anchorType(path.startNode, degree, restraintNodes),
      endAnchorType: anchorType(path.endNode, degree, restraintNodes),
      elementIds,
      elementCount: elementIds.length,
      totalLengthMm: Number(totalLength.toFixed(3)),
      packetSequence: path.elements.flatMap(({ record }) => record.packets.map((p) => p.kind)).join('>'),
    };
  });

  const nodes = Array.from(coords.entries()).map(([nodeId, xyz]) => ({
    nodeId,
    coordMm: xyz.map((v) => Number(v.toFixed(3))),
    degree: degree.get(nodeId) ?? 0,
    componentId: componentOf.get(nodeId) ?? 'C1',
    anchorType: anchorType(nodeId, degree, restraintNodes),
  }));
  const anchors = nodes.filter((n) => n.anchorType !== 'ROUTE');

  // Hierarchy: line -> path -> element
  const lineIds = Array.from(new Set(objects.map((o) => o.lineId || '(model)')));
  const hierarchy = lineIds.map((lineId) => ({
    lineId,
    paths: paths
      .filter((p) => objects.some((o) => o.pathId === p.pathId && (o.lineId || '(model)') === lineId))
      .map((p) => ({ pathId: p.pathId, elementIds: p.elementIds })),
  }));

  return {
    contract: CONTRACT_VERSIONS.CanonicalObjectGraph,
    modelId,
    unit: 'mm',
    rawElementCount: rawRecords.length,
    canonicalElementCount: objects.length,
    consumedRows,
    normalizationRule: `consume elements with length <= ${toleranceMm} mm; packets re-attach to nearest surviving element`,
    objects,
    nodes,
    anchors,
    paths,
    hierarchy,
  };
}

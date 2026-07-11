// Marker placement modes (incl. text-resolve via global node lookup),
// packet-kind filtering, node markers, block grouping, node info index.
import assert from 'assert';
import { parseInputXmlRecords } from '../workbench3d/adapters/inputxml-adapter.js';
import { buildCanonicalGraph } from '../workbench3d/adapters/canonical-graph-builder.js';
import { buildVisualModel, resolvePacketPosition } from '../workbench3d/adapters/visual-model-builder.js';
import { resolvePacketNode, buildNodeInfoIndex } from '../workbench3d/adapters/node-resolver.js';
import { groupObjectBlocks } from '../workbench3d/adapters/block-grouper.js';

// Route 10→20→30 with a RESTRAINT at node 30 hosted on element 10→20 (far node —
// only the GLOBAL lookup can place it) and a RIGID on 20→30.
const xml = `<CAESARII XML_TYPE="Input"><PIPINGMODEL>
  <PIPINGELEMENT FROM_NODE="10.000000" TO_NODE="20.000000" DELTA_X="1000.000000" DIAMETER="114.3" NAME="E1">
    <RESTRAINT NUM="1" NODE="30.000000" TYPE="2.000000" YCOSINE="1.000000"/>
  </PIPINGELEMENT>
  <PIPINGELEMENT FROM_NODE="20.000000" TO_NODE="30.000000" DELTA_Z="800.000000" DIAMETER="114.3" NAME="E2">
    <RIGID WEIGHT="55.000000" TYPE="Valve"/>
  </PIPINGELEMENT>
</PIPINGMODEL></CAESARII>`;

const graph = buildCanonicalGraph('source', parseInputXmlRecords(xml).records, {});
const nodeCoord = new Map(graph.nodes.map((n) => [n.nodeId, n.coordMm]));
const host = graph.objects.find((o) => o.packets.some((p) => p.kind === 'RESTRAINT'));
const restraint = host.packets.find((p) => p.kind === 'RESTRAINT');

// ── resolvePacketPosition: all four modes ────────────────────────────────
const fromPos = resolvePacketPosition(restraint, host, nodeCoord, 'from');
assert.deepStrictEqual(fromPos.position, nodeCoord.get(host.fromNode));
assert.strictEqual(fromPos.fallback, false);
const toPos = resolvePacketPosition(restraint, host, nodeCoord, 'to');
assert.deepStrictEqual(toPos.position, nodeCoord.get(host.toNode));
const midPos = resolvePacketPosition(restraint, host, nodeCoord, 'mid');
const expectedMid = nodeCoord.get(host.fromNode).map((v, i) => (v + nodeCoord.get(host.toNode)[i]) / 2);
assert.deepStrictEqual(midPos.position, expectedMid);

// text mode: NODE="30.000000" resolves GLOBALLY to node 30 (not on this element)
const textPos = resolvePacketPosition(restraint, host, nodeCoord, 'text');
assert.strictEqual(textPos.resolvedNodeId, '30');
assert.deepStrictEqual(textPos.position, nodeCoord.get('30'), 'global lookup places at node 30');
assert.strictEqual(textPos.fallback, false);

// text mode fallback: unknown node → midpoint + flagged
const ghostPacket = { kind: 'RESTRAINT', attrs: { NODE: '9999.000000' } };
const ghostPos = resolvePacketPosition(ghostPacket, host, nodeCoord, 'text');
assert.strictEqual(ghostPos.fallback, true);
assert.deepStrictEqual(ghostPos.position, expectedMid);

// ── buildVisualModel options ─────────────────────────────────────────────
const visualText = buildVisualModel(graph, { markerPlacement: 'text' });
const restraintMarker = visualText.markers.find((m) => m.kind === 'RESTRAINT');
assert.deepStrictEqual(restraintMarker.position, nodeCoord.get('30'), 'marker at text-resolved node');

const filtered = buildVisualModel(graph, { packetMarkerKinds: ['RIGID'] });
assert.ok(!filtered.markers.some((m) => m.kind === 'RESTRAINT'), 'RESTRAINT filtered out');
assert.ok(filtered.markers.some((m) => m.kind === 'RIGID'), 'RIGID kept');

const withNodes = buildVisualModel(graph, { showAllNodes: true, nodeMarkerSizeMm: 12 });
const nodeMarkers = withNodes.markers.filter((m) => m.kind === 'NODE');
assert.ok(nodeMarkers.length > 0, 'node markers emitted');
assert.ok(nodeMarkers.every((m) => m.nodeId), 'node markers carry nodeId');

// zero-length object → object marker, and bounds include markers
const pointGraph = {
  modelId: 'target',
  objects: [{ objectId: 'target:N1', kind: 'NODE', fromNode: 'PS-01', toNode: 'PS-01', lengthMm: 0, diameterMm: null, packets: [], properties: {} }],
  nodes: [{ nodeId: 'PS-01', coordMm: [5000, 6000, 7000], degree: 0, anchorType: 'NODE', componentId: 'C1' }],
  anchors: [],
};
const pointVisual = buildVisualModel(pointGraph, {});
assert.strictEqual(pointVisual.segments.length, 0);
const objMarker = pointVisual.markers.find((m) => m.objectId === 'target:N1');
assert.ok(objMarker?.isObjectMarker, 'zero-length object rendered as object marker');
assert.deepStrictEqual(pointVisual.bounds.max, [5000, 6000, 7000], 'bounds include markers');

// ── node resolver ────────────────────────────────────────────────────────
const known = new Set(graph.nodes.map((n) => n.nodeId));
assert.deepStrictEqual(resolvePacketNode(restraint, host, known), { nodeId: '30', resolvedBy: 'NODE' });
const rigidHost = graph.objects.find((o) => o.packets.some((p) => p.kind === 'RIGID'));
assert.deepStrictEqual(resolvePacketNode(rigidHost.packets[0], rigidHost, known), { nodeId: rigidHost.fromNode, resolvedBy: 'FROM' });

const index = buildNodeInfoIndex(graph);
assert.strictEqual(index.get('20').degree, 2);
assert.strictEqual(index.get('20').connectedObjectIds.length, 2, 'node 20 touches both elements');
assert.ok(index.get('30').packets.some((p) => p.kind === 'RESTRAINT' && p.resolvedBy === 'NODE'), 'restraint resolved to node 30');

// ── block grouper ────────────────────────────────────────────────────────
// raw InputXML pseudo-blocks
const rawGroups = groupObjectBlocks(graph.objects[0]);
const names = rawGroups.map((g) => g.blockName);
assert.ok(names.includes('Name') && names.includes('Geometry') && names.includes('Section'), `pseudo-blocks present (${names})`);
assert.ok(names.includes('Restraint'), 'packet block present');

// categorized: retained blocks with sentinel filtering + [n] instances
const categorizedObject = {
  name: '1210->1220', lineId: 'L1', canonicalFromTo: '1210->1220', lengthMm: 100, pathId: 'p', stationMm: 0,
  properties: {},
  packets: [],
  blocks: [
    { name: 'NameBlock', entries: [['NAME', '1210->1220']], instances: [] },
    { name: 'RestraintsBlock', entries: [], instances: [
      { name: 'RESTRAINT', attrs: { NUM: '1', NODE: '1220.000000', TYPE: '10.000000', STIFFNESS: '-1.010100' } },
      { name: 'RESTRAINT', attrs: { NUM: '2', NODE: '1220.000000', TYPE: '2.000000' } },
    ] },
  ],
};
const catGroups = groupObjectBlocks(categorizedObject);
const nameBlock = catGroups.find((g) => g.blockName === 'Name');
assert.deepStrictEqual(nameBlock.instances[0].entries, [['NAME', '1210->1220']]);
const restraintBlock = catGroups.find((g) => g.blockName === 'Restraint');
assert.strictEqual(restraintBlock.instances.length, 2, 'two restraint instances');
assert.strictEqual(restraintBlock.instances[0].label, '[1]');
assert.ok(!restraintBlock.instances[0].entries.some(([k]) => k === 'STIFFNESS'), 'sentinel attr hidden');

console.log('workbench3d-visual-markers.test.js passed');

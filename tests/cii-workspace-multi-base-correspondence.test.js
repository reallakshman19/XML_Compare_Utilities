import assert from 'assert';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';
import { buildCiiMultiBaseCorrespondence } from '../tabs/cii-workspace/cii-workspace-multi-base-correspondence.js';
import { arbitrateCiiLoopCorrespondences } from '../tabs/cii-workspace/cii-workspace-correspondence-arbitration.js';
import { compareLockedCiiAnchorSpan } from '../tabs/cii-workspace/cii-workspace-topology.js';

function point(x = 0, y = 0, z = 0) { return { x, y, z }; }
function segment(from, to, fromPos, toPos, od = 100, wall = 6) {
  const dx = toPos.x - fromPos.x; const dy = toPos.y - fromPos.y; const dz = toPos.z - fromPos.z;
  return { from, to, dx, dy, dz, length: Math.hypot(dx, dy, dz), od, wall, fromPos, toPos };
}
function document(side, id, elements) {
  const nodes = {};
  for (const element of elements) { nodes[element.from] = element.fromPos; nodes[element.to] = element.toPos; }
  return { schema: 'CIIWorkspaceDocument.v1', side, contentSha256: id, nodeNames: {}, parsed: { elements, nodes, rigids: [] } };
}
function graph(side, id, elements) { return adaptCiiDocumentToTopologyGraph(document(side, id, elements)); }
function nodePosition(graphValue, id) { return graphValue.nodes.find((node) => String(node.id) === String(id)).position; }
function aPair(sourceGraph, targetGraph, sourceNodeId, targetNodeId, od = 100) {
  return { sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId), source: nodePosition(sourceGraph, sourceNodeId),
    target: nodePosition(targetGraph, targetNodeId), sourceOdMm: od };
}

const source = graph('SOURCE', 'source-L', [
  segment(10, 20, point(0, 0, 0), point(1000, 0, 0)),
  segment(20, 30, point(1000, 0, 0), point(1000, 1000, 0)),
]);
const target = graph('TARGET', 'target-L', [
  segment(110, 120, point(0, 0, 0), point(1000, 0, 0)),
  segment(120, 130, point(1000, 0, 0), point(1000, 1000, 0)),
]);

// Method A alone: a local non-collinear three-anchor basis must drive only its own locked-span correspondence.
const aBase = { baseId: 'A-L', anchorPairs: [
  aPair(source, target, 10, 110), aPair(source, target, 20, 120), aPair(source, target, 30, 130),
] };
const aAuthority = qualifyCiiMultiBaseAuthority({ sourceGraph: source, targetGraph: target, methodABases: [aBase] });
assert.strictEqual(aAuthority.status, 'READY');
const aCorrespondence = buildCiiMultiBaseCorrespondence(source, target, aAuthority);
assert.strictEqual(aCorrespondence.status, 'READY');
assert.deepStrictEqual(aCorrespondence.contributingLoopIds, ['A-L']);
assert(aCorrespondence.nodeRows.some((row) => row.sourceNodeId === '20' && row.targetNodeId === '120'));

// Symmetric X+Y arms qualify the independent Method B *basis* but do NOT uniquely
// determine frontier element identity. Preserve the ambiguity gate as a negative.
const bAuthority = qualifyCiiMultiBaseAuthority({ sourceGraph: source, targetGraph: target,
  methodBAnchors: [{ baseId: 'B-L', sourceNodeId: '20', targetNodeId: '120' }] });
assert.strictEqual(bAuthority.status, 'READY');
assert.strictEqual(bAuthority.loops[0].evidence.source.independentAxisRunCount, 2);
assert.strictEqual(bAuthority.loops[0].evidence.target.independentAxisRunCount, 2);
const bCorrespondence = buildCiiMultiBaseCorrespondence(source, target, bAuthority);
assert.strictEqual(bCorrespondence.status, 'UNRESOLVED');
assert.strictEqual(bCorrespondence.readyLoopCount, 0);
assert.strictEqual(bCorrespondence.unresolvedReadyBaseLoopCount, 1);
assert.deepStrictEqual(bCorrespondence.contributingLoopIds, []);
assert.deepStrictEqual(bCorrespondence.nodeRows, []);
assert.deepStrictEqual(bCorrespondence.elementRows, []);
assert(bCorrespondence.blockers.includes('NO_READY_LOOP_CORRESPONDENCE'));
const ambiguous = bCorrespondence.loopResults[0].correspondence;
for (const reason of ['FRONTIER_WINNER_GAP_NOT_SATISFIED', 'PROPAGATION_AMBIGUITY_RETAINED',
  'SOURCE_COMPONENT_NOT_FULLY_PROPAGATED']) assert(ambiguous.blockers.includes(reason));

// Distinct physical signed path lengths and ODs identify a genuine two-axis B
// propagation without relaxing required winner gap or claiming Method C identity.
const distinctiveSource = graph('SOURCE', 'source-distinctive-L', [
  segment(10, 20, point(0, 0, 0), point(1000, 0, 0), 100),
  segment(20, 30, point(1000, 0, 0), point(1000, 1400, 0), 130),
]);
const distinctiveTarget = graph('TARGET', 'target-distinctive-L', [
  segment(110, 120, point(0, 0, 0), point(1000, 0, 0), 100),
  segment(120, 130, point(1000, 0, 0), point(1000, 1400, 0), 130),
]);
const distinctAnchor = { baseId: 'B-DISTINCT', sourceNodeId: '20', targetNodeId: '120' };
const distinctB = qualifyCiiMultiBaseAuthority({sourceGraph: distinctiveSource, targetGraph: distinctiveTarget,
  methodBAnchors: [distinctAnchor]});
assert.strictEqual(distinctB.status, 'READY');
assert.strictEqual(distinctB.loops[0].evidence.source.independentAxisRunCount, 2);
assert.strictEqual(distinctB.loops[0].evidence.target.independentAxisRunCount, 2);
const distinctCorrespondence = buildCiiMultiBaseCorrespondence(distinctiveSource, distinctiveTarget, distinctB);
assert.strictEqual(distinctCorrespondence.status, 'READY');
assert.strictEqual(distinctCorrespondence.readyLoopCount, 1);
assert.strictEqual(distinctCorrespondence.unresolvedReadyBaseLoopCount, 0);
assert.deepStrictEqual(distinctCorrespondence.contributingLoopIds, ['B-DISTINCT']);
assert.strictEqual(distinctCorrespondence.nodeRows.length, 3);
assert.strictEqual(distinctCorrespondence.elementRows.filter(r=>r.sourceElementId&&r.targetElementIds?.length).length,2);
assert.deepStrictEqual(new Set(distinctCorrespondence.nodeRows.map(r=>r.sourceNodeId)),new Set(['10','20','30']));

// A OR B with independently distinctive physical elements corroborates one
// canonical identity rather than duplicating or guessing symmetric arm pairs.
const distinctABase = { baseId: 'A-DISTINCT', anchorPairs: [
  aPair(distinctiveSource, distinctiveTarget, 10, 110, 100),
  aPair(distinctiveSource, distinctiveTarget, 20, 120, 100),
  aPair(distinctiveSource, distinctiveTarget, 30, 130, 130),
] };
const abAuthority = qualifyCiiMultiBaseAuthority({sourceGraph: distinctiveSource, targetGraph: distinctiveTarget,
  methodABases:[distinctABase],methodBAnchors:[distinctAnchor]});
assert.strictEqual(abAuthority.status,'READY');
const abCorrespondence = buildCiiMultiBaseCorrespondence(distinctiveSource, distinctiveTarget, abAuthority);
assert.strictEqual(abCorrespondence.status,'READY');
assert.strictEqual(abCorrespondence.readyLoopCount,2);
assert.deepStrictEqual(new Set(abCorrespondence.contributingLoopIds),new Set(['A-DISTINCT','B-DISTINCT']));
const central=abCorrespondence.nodeRows.find(r=>r.sourceNodeId==='20'&&r.targetNodeId==='120');
assert(central,'central A+B pair must survive canonical arbitration');
assert.strictEqual(central.basisMethod,'METHOD_A_AND_B');
assert.strictEqual(central.authority,'MULTI_BASE_CORROBORATED');
assert.deepStrictEqual(new Set(central.evidence.multiBaseProvenance.map(row=>row.method)),
 new Set(['METHOD_A_SPATIAL','METHOD_B_NETWORK']),
 'independent A and B methods must each substantiate the same physical NODE identity');

// Existing flat anchorPairs must keep their old row identities/authorities when routed through the new engine.
{
  const anchors = [{ sourceNodeId: '10', targetNodeId: '110' }, { sourceNodeId: '20', targetNodeId: '120' }, { sourceNodeId: '30', targetNodeId: '130' }];
  const direct = compareLockedCiiAnchorSpan(source, target, anchors, { geometryTransform: aAuthority.loops[0].geometry });
  const legacyAuthority = { status: 'READY', loops: [{ loopId: 'LEGACY_LOCKED_BASE_1', method: 'USER_LOCKED_LEGACY', status: 'READY',
    geometry: aAuthority.loops[0].geometry, anchorPairs: anchors }] };
  const routed = buildCiiMultiBaseCorrespondence(source, target, legacyAuthority);
  assert.strictEqual(routed.combination, 'LEGACY_SINGLE_LOOP_COMPATIBILITY');
  assert.deepStrictEqual(routed.nodeRows.map((row) => [row.correspondenceId, row.authority]),
    direct.nodeRows.map((row) => [row.correspondenceId, row.authority]));
  assert.deepStrictEqual(routed.elementRows.map((row) => [row.correspondenceId, row.authority]),
    direct.elementRows.map((row) => [row.correspondenceId, row.authority]));
}

function mockLoop(loopId, method, correspondence) { return { loop: { loopId, method, status: 'READY' }, correspondence }; }
function mockCorrespondence(nodeRows = [], elementRows = [], status = 'READY') {
  return { schema: 'CIIWorkspaceCorrespondence.v1', status, blockers: [], nodeRows, elementRows };
}
function nodeRow(sourceNodeId, targetNodeId) {
  return { correspondenceId: `n:${sourceNodeId}:${targetNodeId}`, kind: 'NODE', sourceNodeId, targetNodeId, status: 'HIGH', authority: 'TEST' };
}
function elementRow(sourceElementId, targetElementId) {
  return { correspondenceId: `e:${sourceElementId}:${targetElementId}`, kind: 'ELEMENT', sourceElementId,
    targetElementIds: [targetElementId], status: 'HIGH', authority: 'TEST' };
}

// Cross-loop source-node collision: no majority/first-loop winner is permitted.
{
  const result = arbitrateCiiLoopCorrespondences([
    mockLoop('A1', 'METHOD_A_SPATIAL', mockCorrespondence([nodeRow('1', '101')], [])),
    mockLoop('B1', 'METHOD_B_NETWORK', mockCorrespondence([nodeRow('1', '202')], [])),
  ]);
  assert.strictEqual(result.status, 'AMBIGUOUS');
  assert(result.conflicts.some((row) => row.kind === 'SOURCE_NODE_TO_MULTIPLE_TARGETS'));
}

// Cross-loop target-node collision is equally disqualifying for one-to-one node custody.
{
  const result = arbitrateCiiLoopCorrespondences([
    mockLoop('A1', 'METHOD_A_SPATIAL', mockCorrespondence([nodeRow('1', '101')], [])),
    mockLoop('B1', 'METHOD_B_NETWORK', mockCorrespondence([nodeRow('2', '101')], [])),
  ]);
  assert.strictEqual(result.status, 'AMBIGUOUS');
  assert(result.conflicts.some((row) => row.kind === 'TARGET_NODE_TO_MULTIPLE_SOURCES'));
}

// Element identity conflicts are vetoes too; duplicate agreement collapses to one canonical writer-facing row.
{
  const duplicate = arbitrateCiiLoopCorrespondences([
    mockLoop('A1', 'METHOD_A_SPATIAL', mockCorrespondence([], [elementRow('E1', 'T1')])),
    mockLoop('B1', 'METHOD_B_NETWORK', mockCorrespondence([], [elementRow('E1', 'T1')])),
  ]);
  assert.strictEqual(duplicate.status, 'READY');
  assert.strictEqual(duplicate.elementRows.length, 1);
  assert.strictEqual(duplicate.elementRows[0].basisMethod, 'METHOD_A_AND_B');

  const conflict = arbitrateCiiLoopCorrespondences([
    mockLoop('A1', 'METHOD_A_SPATIAL', mockCorrespondence([], [elementRow('E1', 'T1')])),
    mockLoop('B1', 'METHOD_B_NETWORK', mockCorrespondence([], [elementRow('E1', 'T2')])),
  ]);
  assert.strictEqual(conflict.status, 'AMBIGUOUS');
  assert(conflict.conflicts.some((row) => row.kind === 'SOURCE_ELEMENT_TO_MULTIPLE_TARGETS'));
}

// OR semantics: an unresolved READY base loop is retained diagnostically but cannot poison another loop's READY correspondence.
{
  const result = arbitrateCiiLoopCorrespondences([
    mockLoop('A1', 'METHOD_A_SPATIAL', mockCorrespondence([nodeRow('1', '101')], [])),
    mockLoop('B2', 'METHOD_B_NETWORK', mockCorrespondence([], [], 'UNRESOLVED')),
  ]);
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.readyLoopCount, 1);
  assert.strictEqual(result.unresolvedReadyBaseLoopCount, 1);
  assert.deepStrictEqual(result.contributingLoopIds, ['A1']);
}

console.log('CII multi-base correspondence orchestration checks passed.');

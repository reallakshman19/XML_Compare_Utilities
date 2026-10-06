import assert from 'assert';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';
import { buildCiiMultiBaseCorrespondence } from '../tabs/cii-workspace/cii-workspace-multi-base-correspondence.js';
import { arbitrateCiiLoopCorrespondences } from '../tabs/cii-workspace/cii-workspace-correspondence-arbitration.js';
import { compareLockedCiiAnchorSpan } from '../tabs/cii-workspace/cii-workspace-topology.js';
import { ciiIdentityBound, ciiIdentityConfidence } from '../tabs/cii-workspace/cii-workspace-engineering-delta.js';

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

const rawMethodA = aCorrespondence.loopResults[0].correspondence;
const automaticAnchorRows = rawMethodA.nodeRows.filter((row) => row.authority === 'METHOD_A_QUALIFIED_ANCHOR');
assert.strictEqual(automaticAnchorRows.length, 3, 'all qualified Method-A base anchors must be projected away from USER_LOCKED authority');
assert(automaticAnchorRows.every((row) => row.status === 'REVIEW'));
assert(automaticAnchorRows.every((row) => row.evidence?.identityConfidence === aAuthority.loops[0].confidence));
assert(automaticAnchorRows.every((row) => row.evidence?.identityEvidenceBasis === 'METHOD_A_QUALIFIED_BASE_ANCHOR'));
assert(automaticAnchorRows.every((row) => row.evidence?.identitySupported === ['HIGH', 'MEDIUM'].includes(aAuthority.loops[0].confidence)));
assert(!rawMethodA.nodeRows.some((row) => row.authority === 'USER_LOCKED_ANCHOR'),
  'automatic Method-A correspondence must not surface manual USER_LOCKED authority');

// Method B alone: a genuine X+Y local run basis at the central node must qualify and propagate independently.
const bAuthority = qualifyCiiMultiBaseAuthority({ sourceGraph: source, targetGraph: target,
  methodBAnchors: [{ baseId: 'B-L', sourceNodeId: '20', targetNodeId: '120' }] });
assert.strictEqual(bAuthority.status, 'READY');
assert.strictEqual(bAuthority.loops[0].evidence.source.independentAxisRunCount, 2);
const bCorrespondence = buildCiiMultiBaseCorrespondence(source, target, bAuthority);
assert.strictEqual(bCorrespondence.status, 'READY');
assert.deepStrictEqual(bCorrespondence.contributingLoopIds, ['B-L']);

// A OR B with the same physical identity must corroborate, not duplicate, the canonical pair.
const abAuthority = qualifyCiiMultiBaseAuthority({ sourceGraph: source, targetGraph: target,
  methodABases: [aBase], methodBAnchors: [{ baseId: 'B-L', sourceNodeId: '20', targetNodeId: '120' }] });
assert.strictEqual(abAuthority.status, 'READY');
const abCorrespondence = buildCiiMultiBaseCorrespondence(source, target, abAuthority);
assert.strictEqual(abCorrespondence.status, 'READY');
assert.strictEqual(abCorrespondence.readyLoopCount, 2);
const central = abCorrespondence.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
assert(central, 'central A+B pair must survive canonical arbitration');
assert.strictEqual(central.basisMethod, 'METHOD_A_AND_B');
assert.strictEqual(central.authority, 'MULTI_BASE_CORROBORATED');
assert.strictEqual(central.evidence.multiBaseProvenance.length, 2);

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
  assert(direct.nodeRows.some((row) => row.authority === 'USER_LOCKED_ANCHOR' && row.status === 'LOCKED'),
    'manual legacy span must retain explicit USER_LOCKED authority');
}

{
  const reviewLoop = { ...aAuthority.loops[0], loopId: 'A-REVIEW', status: 'READY', confidence: 'REVIEW' };
  const reviewAuthority = { status: 'READY', loops: [reviewLoop] };
  const reviewCorrespondence = buildCiiMultiBaseCorrespondence(source, target, reviewAuthority);
  const reviewRaw = reviewCorrespondence.loopResults[0].correspondence;
  const reviewAnchors = reviewRaw.nodeRows.filter((row) => row.authority === 'METHOD_A_QUALIFIED_ANCHOR');
  assert.strictEqual(reviewAnchors.length, 3);
  assert(reviewAnchors.every((row) => row.status === 'REVIEW'));
  assert(reviewAnchors.every((row) => row.evidence?.identityConfidence === 'REVIEW'));
  assert(reviewAnchors.every((row) => row.evidence?.identitySupported === false),
    'REVIEW-confidence Method-A bases must not manufacture automatic identity support');
}

{
  const mediumLoop = { ...aAuthority.loops[0], loopId: 'A-MEDIUM', status: 'READY', confidence: 'MEDIUM' };
  const mediumCorrespondence = buildCiiMultiBaseCorrespondence(source, target, { status: 'READY', loops: [mediumLoop] });
  const endpoint = mediumCorrespondence.nodeRows.find((row) => row.sourceNodeId === '10' && row.targetNodeId === '110');
  assert(endpoint, 'Method-A endpoint must survive canonical arbitration');
  assert.strictEqual(endpoint.status, 'REVIEW');
  assert.strictEqual(endpoint.evidence?.identityEvidenceBasis, 'METHOD_A_QUALIFIED_BASE_ANCHOR');
  assert.strictEqual(ciiIdentityBound(endpoint), true);
  assert.strictEqual(ciiIdentityConfidence(endpoint), 'MEDIUM');

  const boundary = mediumCorrespondence.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
  assert(boundary, 'Method-A adjacent boundary must survive canonical arbitration');
  assert.strictEqual(boundary.evidence?.identityEvidenceBasis, 'METHOD_A_ADJACENT_MATCH_BOUNDARY');
  assert.strictEqual(boundary.evidence?.identitySupported, true);
  assert.strictEqual(boundary.evidence?.identityConfidence, 'HIGH');
  assert.strictEqual(ciiIdentityBound(boundary), true);
  assert.strictEqual(ciiIdentityConfidence(boundary), 'HIGH');
  assert(boundary.evidence?.multiBaseProvenance?.some((row) => row.rowAuthority === 'ADJACENT_MATCH_BOUNDARY'));
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

// Boundary-shaped evidence from a non-Method-A loop must not be promoted by the Method-A adapter.
{
  const boundaryEvidence = {
    leftElement: { identitySupported: true, identityConfidence: 'HIGH' },
    rightElement: { identitySupported: true, identityConfidence: 'HIGH' },
  };
  const result = arbitrateCiiLoopCorrespondences([
    mockLoop('B-BOUNDARY', 'METHOD_B_NETWORK', mockCorrespondence([{
      correspondenceId: 'n:b:1:101', kind: 'NODE', sourceNodeId: '1', targetNodeId: '101',
      status: 'REVIEW', authority: 'ADJACENT_MATCH_BOUNDARY', evidence: boundaryEvidence,
    }], [])),
  ]);
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.nodeRows[0].evidence?.identitySupported, undefined);
  assert.strictEqual(ciiIdentityBound(result.nodeRows[0]), false);
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

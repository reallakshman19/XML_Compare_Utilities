import assert from 'node:assert/strict';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';
import { buildCiiMultiBaseCorrespondence } from '../tabs/cii-workspace/cii-workspace-multi-base-correspondence.js';
import { buildCiiEngineeringDeltas, ciiIdentityBound, ciiIdentityConfidence } from '../tabs/cii-workspace/cii-workspace-engineering-delta.js';
import { buildCiiCompareReviewModel } from '../tabs/cii-workspace/cii-workspace-compare-review.js';

function qualifiedCapabilities() {
  const qualified = { state: 'PARSED', qualification: 'QUALIFIED', limitations: [] };
  return { families: {
    restraints: { state: 'NOT_PARSED', qualification: 'NONE', limitations: [] },
    hangers: { state: 'NOT_PARSED', qualification: 'NONE', limitations: [] },
    sifTee: { state: 'NOT_PARSED', qualification: 'NONE', limitations: [] },
    weightData: { state: 'NOT_PARSED', qualification: 'NONE', limitations: [] },
    lineNumbers: { state: 'NOT_PARSED', qualification: 'NONE', limitations: [] },
    process: { state: 'PARSED', qualification: 'PARTIAL', limitations: [] },
    nodeNames: qualified, pipeProperties: qualified, rigidMass: qualified,
  } };
}
function point(x, y, z = 0) { return { x, y, z }; }
function segment(from, to, fromPos, toPos, od = 100, wall = 6) {
  const dx = toPos.x - fromPos.x; const dy = toPos.y - fromPos.y; const dz = toPos.z - fromPos.z;
  return { from, to, dx, dy, dz, length: Math.hypot(dx, dy, dz), od, wall, fromPos, toPos };
}
function document(side, id, elements, nodeNames = {}) {
  const nodes = {};
  for (const element of elements) { nodes[element.from] = element.fromPos; nodes[element.to] = element.toPos; }
  return {
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: id, fileName: `${side}.CII`,
    summary: { nodeCount: Object.keys(nodes).length, elementCount: elements.length },
    nodeNames, capabilities: qualifiedCapabilities(), parsed: { elements, nodes, rigids: [], restraints: [] },
  };
}
function graph(doc) { return adaptCiiDocumentToTopologyGraph(doc); }
function nodePosition(graphValue, id) { return graphValue.nodes.find((node) => String(node.id) === String(id)).position; }
function pair(sourceGraph, targetGraph, sourceNodeId, targetNodeId) {
  return {
    sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId),
    source: nodePosition(sourceGraph, sourceNodeId), target: nodePosition(targetGraph, targetNodeId), sourceOdMm: 100,
  };
}

const sourceDoc = document('SOURCE', 'source-1279', [
  segment(10, 20, point(0, 0), point(1000, 0)),
  segment(20, 30, point(1000, 0), point(1000, 1000)),
  segment(30, 40, point(1000, 1000), point(2000, 1000)),
], { 20: 'OLD-BOUNDARY' });
const targetDoc = document('TARGET', 'target-1279', [
  segment(110, 120, point(500, 200), point(1500, 200)),
  segment(120, 130, point(1500, 200), point(1500, 1200)),
  segment(130, 140, point(1500, 1200), point(2500, 1200)),
], { 120: 'NEW-BOUNDARY' });
const sourceGraph = graph(sourceDoc); const targetGraph = graph(targetDoc);

const methodAAnchors = [
  pair(sourceGraph, targetGraph, 10, 110),
  pair(sourceGraph, targetGraph, 30, 130),
  pair(sourceGraph, targetGraph, 40, 140),
];
const methodAAuthority = qualifyCiiMultiBaseAuthority({
  sourceGraph, targetGraph, methodABases: [{ baseId: 'A-1279', anchorPairs: methodAAnchors }],
});
assert.strictEqual(methodAAuthority.status, 'READY');
assert(['HIGH', 'MEDIUM'].includes(methodAAuthority.loops[0].confidence));

const automatic = buildCiiMultiBaseCorrespondence(sourceGraph, targetGraph, methodAAuthority);
assert.strictEqual(automatic.status, 'READY');

const projectedAnchor = automatic.nodeRows.find((row) => row.sourceNodeId === '10' && row.targetNodeId === '110');
assert(projectedAnchor);
assert.notStrictEqual(projectedAnchor.status, 'LOCKED');
assert.strictEqual(projectedAnchor.evidence?.identitySupported, true);
assert.strictEqual(projectedAnchor.evidence?.identityConfidence, methodAAuthority.loops[0].confidence);

const boundary = automatic.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
assert(boundary, 'non-anchor Method-A boundary must survive #1252 arbitration');
assert.strictEqual(boundary.status, 'REVIEW');
assert.strictEqual(boundary.evidence?.identitySupported, true);
assert.strictEqual(boundary.evidence?.identityConfidence, methodAAuthority.loops[0].confidence);
assert.strictEqual(boundary.evidence?.identityEvidenceBasis, 'METHOD_A_QUALIFIED_ADJACENT_BOUNDARY');
assert.strictEqual(ciiIdentityBound(boundary), true);
assert.strictEqual(ciiIdentityConfidence(boundary), methodAAuthority.loops[0].confidence);

const deltas = buildCiiEngineeringDeltas(sourceDoc, targetDoc, sourceGraph, targetGraph, automatic);
const nodeNameDelta = deltas.changedRows.find((row) =>
  row.correspondenceId === boundary.correspondenceId && row.category === 'NODE_NAME');
assert(nodeNameDelta, 'D3 bound boundary must reach generic engineering deltas on #1252 stack');

const review = buildCiiCompareReviewModel(sourceDoc, targetDoc, automatic, {}, deltas);
const reviewedBoundary = review.rows.find((row) => row.correspondenceId === boundary.correspondenceId);
assert(reviewedBoundary);
assert.strictEqual(reviewedBoundary.workflowStatus, 'REVIEW');
assert.strictEqual(reviewedBoundary.identityBound, true);
assert.strictEqual(reviewedBoundary.confidence, methodAAuthority.loops[0].confidence);
assert.strictEqual(reviewedBoundary.decision, 'REVIEW');

function seedLoop(loopId, sourceNodeId, targetNodeId) {
  return {
    loopId, method: 'USER_LOCKED_SEED', status: 'READY', confidence: 'USER_LOCKED',
    anchorPairs: [{ sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId) }],
  };
}

const singleSeed = buildCiiMultiBaseCorrespondence(sourceGraph, targetGraph, {
  status: 'READY', loops: [seedLoop('SEED-ONE', 20, 120)],
});
assert.strictEqual(singleSeed.combination, 'INDEPENDENT_MANUAL_SEED');
assert.deepEqual(singleSeed.contributingLoopIds, ['SEED-ONE']);
assert(singleSeed.nodeRows.some((row) =>
  row.sourceNodeId === '20' && row.targetNodeId === '120'
  && row.status === 'LOCKED' && row.authority === 'USER_LOCKED_ANCHOR'),
'one manual seed must retain explicit locked manual authority');

const multiSeed = buildCiiMultiBaseCorrespondence(sourceGraph, targetGraph, {
  status: 'READY',
  loops: [seedLoop('SEED-A', 10, 110), seedLoop('SEED-B', 40, 140)],
});
assert.strictEqual(multiSeed.combination, 'INDEPENDENT_MANUAL_SEEDS_WITH_CONFLICT_VETO');
assert.deepEqual([...multiSeed.contributingLoopIds].sort(), ['SEED-A', 'SEED-B']);
assert.strictEqual(multiSeed.conflicts.length, 0, 'compatible independent manual seeds must not gain a D3 conflict');
assert(multiSeed.loopResults.every((item) => item.loop.method === 'USER_LOCKED_SEED'));

const reviewLoop = { ...methodAAuthority.loops[0], loopId: 'A-1279-REVIEW', status: 'READY', confidence: 'REVIEW' };
const failClosed = buildCiiMultiBaseCorrespondence(sourceGraph, targetGraph, { status: 'READY', loops: [reviewLoop] });
const failClosedBoundary = failClosed.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
assert(failClosedBoundary);
assert.strictEqual(failClosedBoundary.evidence?.identitySupported, false);
assert.strictEqual(ciiIdentityBound(failClosedBoundary), false);

console.log('CII D3 #1252-stack compatibility checks passed.');

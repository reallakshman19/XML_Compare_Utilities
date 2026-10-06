import assert from 'node:assert/strict';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';
import { buildCiiMultiBaseCorrespondence } from '../tabs/cii-workspace/cii-workspace-multi-base-correspondence.js';
import { arbitrateCiiLoopCorrespondences } from '../tabs/cii-workspace/cii-workspace-correspondence-arbitration.js';
import { buildCiiEngineeringDeltas, ciiIdentityBound, ciiIdentityConfidence } from '../tabs/cii-workspace/cii-workspace-engineering-delta.js';
import { buildCiiCompareReviewModel } from '../tabs/cii-workspace/cii-workspace-compare-review.js';

function point(x = 0, y = 0, z = 0) { return { x, y, z }; }
function segment(from, to, fromPos, toPos, od = 100, wall = 6) {
  const dx = toPos.x - fromPos.x; const dy = toPos.y - fromPos.y; const dz = toPos.z - fromPos.z;
  return { from, to, dx, dy, dz, length: Math.hypot(dx, dy, dz), od, wall, fromPos, toPos };
}
function document(side, id, nodeNames, elements) {
  const nodes = {};
  for (const element of elements) { nodes[element.from] = element.fromPos; nodes[element.to] = element.toPos; }
  return {
    schema: 'CIIWorkspaceDocument.v1', side, fileName: `${side.toLowerCase()}-D3-3.cii`, contentSha256: id,
    nodeNames, capabilities: { families: { nodeNames: { qualification: 'QUALIFIED', limitations: [] } } },
    parsed: { elements, nodes, rigids: [] },
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

const sourceDoc = document('SOURCE', 'source-D3-3', { 20: 'SOURCE-NAME' }, [
  segment(10, 20, point(0, 0, 0), point(1000, 0, 0)),
  segment(20, 30, point(1000, 0, 0), point(1000, 1000, 0)),
  segment(30, 40, point(1000, 1000, 0), point(2000, 1000, 0)),
]);
const targetDoc = document('TARGET', 'target-D3-3', { 120: 'TARGET-NAME' }, [
  segment(110, 120, point(500, -200, 50), point(1500, -200, 50)),
  segment(120, 130, point(1500, -200, 50), point(1500, 800, 50)),
  segment(130, 140, point(1500, 800, 50), point(2500, 800, 50)),
]);
const source = graph(sourceDoc); const target = graph(targetDoc);
const anchorPairs = [
  pair(source, target, 10, 110),
  pair(source, target, 30, 130),
  pair(source, target, 40, 140),
];
const authority = qualifyCiiMultiBaseAuthority({
  sourceGraph: source, targetGraph: target, methodABases: [{ baseId: 'A-D3-3', anchorPairs }],
});
assert.strictEqual(authority.status, 'READY');
assert(['HIGH', 'MEDIUM'].includes(authority.loops[0].confidence));

const result = buildCiiMultiBaseCorrespondence(source, target, authority);
assert.strictEqual(result.status, 'READY');

const rawBoundary = result.loopResults[0].correspondence.nodeRows
  .find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120' && row.authority === 'ADJACENT_MATCH_BOUNDARY');
assert(rawBoundary, 'fixture requires a non-anchor Method-A adjacent boundary row');
assert.strictEqual(rawBoundary.status, 'REVIEW');
assert.strictEqual(rawBoundary.evidence?.identitySupported, true);
assert.strictEqual(rawBoundary.evidence?.identityConfidence, authority.loops[0].confidence);
assert.strictEqual(rawBoundary.evidence?.identityEvidenceBasis, 'METHOD_A_QUALIFIED_ADJACENT_BOUNDARY');

const canonicalBoundary = result.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
assert(canonicalBoundary, 'arbitration must retain the non-anchor boundary claim');
assert.strictEqual(canonicalBoundary.authority, 'MULTI_BASE_LOOP');
assert.strictEqual(canonicalBoundary.status, 'REVIEW');
assert.strictEqual(canonicalBoundary.evidence?.identitySupported, true);
assert.strictEqual(canonicalBoundary.evidence?.identityConfidence, authority.loops[0].confidence);
assert.strictEqual(canonicalBoundary.evidence?.identityEvidenceBasis, 'METHOD_A_QUALIFIED_ADJACENT_BOUNDARY');
assert(canonicalBoundary.evidence?.multiBaseProvenance?.some((row) =>
  row.method === 'METHOD_A_SPATIAL' && row.rowAuthority === 'ADJACENT_MATCH_BOUNDARY'));
assert.strictEqual(ciiIdentityBound(canonicalBoundary), true);
assert.strictEqual(ciiIdentityConfidence(canonicalBoundary), authority.loops[0].confidence);

const deltas = buildCiiEngineeringDeltas(
  sourceDoc, targetDoc, source, target, result, { geometryTransform: authority.loops[0].geometry },
);
const nodeNameDelta = deltas.rows.find((row) =>
  row.category === 'NODE_NAME' && row.sourceIdentity === '20' && row.targetIdentity === '120');
assert(nodeNameDelta, 'generic engineering delta must consume the bound Method-A boundary node');
assert.strictEqual(nodeNameDelta.sourceValue, 'SOURCE-NAME');
assert.strictEqual(nodeNameDelta.targetValue, 'TARGET-NAME');
assert.strictEqual(nodeNameDelta.identityConfidence, authority.loops[0].confidence);

const review = buildCiiCompareReviewModel(sourceDoc, targetDoc, result, {}, deltas);
const reviewBoundary = review.rows.find((row) => row.source === '20' && row.target === '120');
assert(reviewBoundary);
assert.strictEqual(reviewBoundary.workflowStatus, 'REVIEW');
assert.strictEqual(reviewBoundary.confidence, authority.loops[0].confidence);
assert.strictEqual(reviewBoundary.identityBound, true);
assert.strictEqual(reviewBoundary.decision, 'REVIEW');
assert.notStrictEqual(reviewBoundary.confidence, 'LOCKED');

const reviewLoop = { ...authority.loops[0], loopId: 'A-D3-3-REVIEW', status: 'READY', confidence: 'REVIEW' };
const reviewResult = buildCiiMultiBaseCorrespondence(source, target, { status: 'READY', loops: [reviewLoop] });
const reviewOnlyBoundary = reviewResult.nodeRows.find((row) => row.sourceNodeId === '20' && row.targetNodeId === '120');
assert(reviewOnlyBoundary);
assert.strictEqual(reviewOnlyBoundary.status, 'REVIEW');
assert.strictEqual(reviewOnlyBoundary.evidence?.identitySupported, false);
assert.strictEqual(ciiIdentityBound(reviewOnlyBoundary), false);
assert.strictEqual(ciiIdentityConfidence(reviewOnlyBoundary), 'REVIEW');

const legacy = buildCiiMultiBaseCorrespondence(source, target, {
  status: 'READY',
  loops: [{
    loopId: 'LEGACY-D3-3', method: 'USER_LOCKED_LEGACY', status: 'READY',
    confidence: 'USER_LOCKED', geometry: authority.loops[0].geometry,
    anchorPairs: anchorPairs.map(({ sourceNodeId, targetNodeId }) => ({ sourceNodeId, targetNodeId })),
  }],
});
assert(legacy.nodeRows.some((row) => row.status === 'LOCKED' && row.authority === 'USER_LOCKED_ANCHOR'),
  'manual legacy anchor semantics must remain locked');

function mockLoop(loopId, targetNodeId) {
  return {
    loop: { loopId, method: 'METHOD_A_SPATIAL', status: 'READY', confidence: 'MEDIUM' },
    correspondence: {
      status: 'READY',
      nodeRows: [{
        correspondenceId: `node:1:${targetNodeId}`, kind: 'NODE', sourceNodeId: '1', targetNodeId,
        status: 'REVIEW', authority: 'ADJACENT_MATCH_BOUNDARY',
        evidence: { identitySupported: true, identityConfidence: 'MEDIUM' },
      }],
      elementRows: [],
    },
  };
}
const conflict = arbitrateCiiLoopCorrespondences([mockLoop('A-C1', '101'), mockLoop('A-C2', '202')]);
assert.strictEqual(conflict.status, 'AMBIGUOUS');
assert(conflict.conflicts.some((row) => row.kind === 'SOURCE_NODE_TO_MULTIPLE_TARGETS'));

console.log('CII Method-A boundary arbitration/integration checks passed.');

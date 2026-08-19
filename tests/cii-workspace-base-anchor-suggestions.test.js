import assert from 'assert';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { suggestCiiBaseAnchorPairs } from '../tabs/cii-workspace/cii-workspace-anchor-suggestions.js';

function edge(index, from, to, od) {
  return { index, from, to, dx: 100, dy: 0, dz: 0, length: 100, od, wall: 8, P1: 10, T1: 100, hasBend: false };
}
function graph(side, ids, od) {
  const [a, branch, c, d, e, f] = ids;
  const elements = [edge(0, a, branch, od), edge(1, branch, c, od), edge(2, branch, d, od), edge(3, d, e, od), edge(4, e, f, od)];
  const nodes = {};
  for (const item of elements) {
    nodes[item.from] ||= { x: item.from, y: 0, z: 0 };
    nodes[item.to] ||= { x: item.to, y: 0, z: 0 };
    item.fromPos = nodes[item.from]; item.toPos = nodes[item.to];
  }
  return adaptCiiDocumentToTopologyGraph({
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: `${side}-sha`, nodeNames: {},
    parsed: { elements, nodes, rigids: [] },
  });
}

const source = graph('SOURCE', [10, 20, 30, 40, 50, 60], 273);
const target = graph('TARGET', [901, 777, 333, 555, 444, 222], 88.9);
const first = suggestCiiBaseAnchorPairs(source, target);
const second = suggestCiiBaseAnchorPairs(source, target);

assert.deepStrictEqual(first, second, 'paired anchor suggestions must be deterministic');
const branchPair = first.find((row) => row.sourceNodeId === '20');
assert(branchPair, 'unique source branch must receive a paired base-anchor suggestion');
assert.strictEqual(branchPair.targetNodeId, '777', 'pairing must follow topology, not numeric offset');
assert.strictEqual(branchPair.confidence, 'HIGH');
assert.strictEqual(branchPair.status, 'SUGGESTED');
assert.strictEqual(branchPair.authority, 'EVIDENCE_ONLY_ENGINEER_ACCEPT_REQUIRED');
assert.strictEqual(branchPair.reviewRequired, true);
assert(branchPair.basis.some((item) => item.includes('topology neighbourhood')));
assert(branchPair.identityExclusions.includes('NODE_NUMBER_OFFSET_NOT_USED'));
assert(branchPair.identityExclusions.includes('OD_NOT_USED'));
assert(branchPair.identityExclusions.includes('WALL_NOT_USED'));
assert(!first.some((row) => row.status === 'LOCKED'), 'suggestions must never create anchor authority automatically');

console.log('CII paired base-anchor suggestion checks passed.');

import assert from 'assert';
import { extractCiiPipeRunsAtNode, qualifyCiiMethodBRunBasis } from '../tabs/cii-workspace/cii-workspace-pipe-runs.js';
import { qualifyCiiMultiBaseAuthority } from '../tabs/cii-workspace/cii-workspace-multi-base-anchor.js';

const point = (x, y, z) => ({ x, y, z });
function edge(id, from, to, dx, dy, dz) {
  return { elementId: id, from: String(from), to: String(to), dx, dy, dz,
    lengthMm: Math.hypot(dx, dy, dz), componentKind: 'PIPE' };
}
function graph(edges) {
  const adjacency = new Map();
  for (const item of edges) for (const node of [item.from, item.to]) {
    if (!adjacency.has(node)) adjacency.set(node, []); adjacency.get(node).push(item);
  }
  return { adjacency, nodes: [...adjacency.keys()].map((id) => ({ id, degree: adjacency.get(id).length })) };
}
function lineGraph(prefix, count) {
  const edges = [];
  for (let i = 0; i < count; i += 1) edges.push(edge(`${prefix}${i}`, `${prefix}${i}`, `${prefix}${i + 1}`, 1000, 0, 0));
  return graph(edges);
}

const oneAxisSource = lineGraph('S', 20); const oneAxisTarget = lineGraph('T', 20);
const oneAxisRuns = extractCiiPipeRunsAtNode(oneAxisSource, 'S10');
assert.strictEqual(oneAxisRuns.runCount, 1, 'opposite collinear rays must merge into one undirected run');
assert.strictEqual(oneAxisRuns.independentAxisRunCount, 1);
const b1 = qualifyCiiMethodBRunBasis(oneAxisSource, oneAxisTarget, 'S10', 'T10');
assert.strictEqual(b1.status, 'REVIEW');
assert.strictEqual(b1.reason, 'METHOD_B_TWO_AXIS_GATE_NOT_MET');

const twoAxisSource = graph([
  edge('SX', 'S0', 'S1', 12000, 0, 0),
  edge('SZ', 'S0', 'S2', 0, 0, 7000),
]);
const twoAxisTarget = graph([
  edge('TY', 'T0', 'T1', 0, 12000, 0),
  edge('TZ', 'T0', 'T2', 0, 0, 7000),
]);
const b2 = qualifyCiiMethodBRunBasis(twoAxisSource, twoAxisTarget, 'S0', 'T0');
assert.strictEqual(b2.status, 'READY');
assert.strictEqual(b2.source.independentAxisRunCount, 2);
assert.strictEqual(b2.target.independentAxisRunCount, 2);
assert(Math.abs(b2.selectedBasis.sourceIncludedAngleDeg - 90) < 1e-9);
assert(Math.abs(b2.selectedBasis.targetIncludedAngleDeg - 90) < 1e-9);

const baseA1 = {
  baseId: 'A-LOCAL-1',
  anchorPairs: [
    { sourceNodeId: '10', targetNodeId: '1010', source: point(0, 0, 0), target: point(0, 100, 0) },
    { sourceNodeId: '20', targetNodeId: '1020', source: point(100, 0, 0), target: point(100, 100, 0) },
    { sourceNodeId: '30', targetNodeId: '1030', source: point(0, 100, 0), target: point(0, 200, 0) },
  ],
};
const baseA2 = {
  baseId: 'A-LOCAL-2',
  anchorPairs: [
    { sourceNodeId: '210', targetNodeId: '2210', source: point(10000, 0, 0), target: point(10000, -200, 0) },
    { sourceNodeId: '220', targetNodeId: '2220', source: point(10100, 0, 0), target: point(10100, -200, 0) },
    { sourceNodeId: '230', targetNodeId: '2230', source: point(10000, 100, 0), target: point(10000, -100, 0) },
  ],
};
const multiA = qualifyCiiMultiBaseAuthority({ methodABases: [baseA1, baseA2] });
assert.strictEqual(multiA.status, 'READY');
assert.strictEqual(multiA.combination, 'OR_WITH_CONFLICT_VETO');
assert.strictEqual(multiA.methodAReadyCount, 2);
assert.deepStrictEqual(multiA.loops.map((loop) => loop.geometry.translation), [[0, 100, 0], [0, -200, 0]],
  'independent local Method A bases may retain materially different transforms');

const methodBOnly = qualifyCiiMultiBaseAuthority({
  sourceGraph: twoAxisSource, targetGraph: twoAxisTarget,
  methodBAnchors: [{ baseId: 'B-LOCAL-1', sourceNodeId: 'S0', targetNodeId: 'T0' }],
});
assert.strictEqual(methodBOnly.status, 'READY');
assert.strictEqual(methodBOnly.methodAReadyCount, 0);
assert.strictEqual(methodBOnly.methodBReadyCount, 1, 'Method B alone must satisfy OR union when independently qualified');

const mixed = qualifyCiiMultiBaseAuthority({
  sourceGraph: oneAxisSource, targetGraph: oneAxisTarget,
  methodABases: [baseA1], methodBAnchors: [{ sourceNodeId: 'S10', targetNodeId: 'T10' }],
});
assert.strictEqual(mixed.status, 'READY');
assert.strictEqual(mixed.methodAReadyCount, 1);
assert.strictEqual(mixed.methodBReadyCount, 0, 'one-axis Method B remains REVIEW without blocking ready Method A loop');

const conflicting = qualifyCiiMultiBaseAuthority({
  methodABases: [
    baseA1,
    { ...baseA2, baseId: 'A-CONFLICT', anchorPairs: [
      { sourceNodeId: '10', targetNodeId: '9999', source: point(10000, 0, 0), target: point(10000, -200, 0) },
      { sourceNodeId: '320', targetNodeId: '3320', source: point(10100, 0, 0), target: point(10100, -200, 0) },
      { sourceNodeId: '330', targetNodeId: '3330', source: point(10000, 100, 0), target: point(10000, -100, 0) },
    ] },
  ],
});
assert.strictEqual(conflicting.status, 'AMBIGUOUS');
assert.strictEqual(conflicting.reason, 'CROSS_LOOP_ANCHOR_IDENTITY_CONFLICT');
assert(conflicting.conflicts.some((row) => row.kind === 'SOURCE_TO_MULTIPLE_TARGETS' && row.key === '10'));

console.log('CII independent multi-base A/B OR authority checks passed.');

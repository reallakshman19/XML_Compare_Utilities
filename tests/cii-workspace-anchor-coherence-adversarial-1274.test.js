import assert from 'node:assert/strict';
import {
  selectPhysicalCandidatePairs,
  _test as physical,
} from '../tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js';
import { discoverCiiMethodABases } from '../tabs/cii-workspace/cii-workspace-anchor-method-a.js';

function graph(points, od = 100) {
  const entries = Object.entries(points); const adjacency = new Map();
  for (const [id] of entries) adjacency.set(String(id), [{
    from: String(id), to: `stub-${id}`, componentKind: 'PIPE', diameter: od, lengthMm: 100,
  }]);
  return { nodes: entries.map(([id, position]) => ({ id: String(id), position })), adjacency, edges: [] };
}
function candidate(sourceNodeId, targetNodeId, tag, extra = {}) {
  return {
    sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId), tag,
    score: 100, winnerGap: 0, sourceRank: 1, targetRank: 1, mutualBest: true, ...extra,
  };
}
function pos(graphValue) { return new Map(graphValue.nodes.map((node) => [node.id, node.position])); }
function neighbourGraph(size, edges) {
  const rows = Array.from({ length: size }, () => new Set());
  for (const [left, right] of edges) { rows[left].add(right); rows[right].add(left); }
  return rows;
}
function tags(rows) { return rows.map((row) => row.tag).sort(); }

const exactSource = graph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 1000, y: 0, z: 0 } });
const exactTarget = graph({ 101: { x: 500, y: 20, z: -10 }, 102: { x: 1500, y: 20, z: -10 } });
assert.equal(physical.pairDistanceCompatible(exactSource, pos(exactSource), pos(exactTarget),
  candidate(1, 101, 'A'), candidate(2, 102, 'B')), true);

const longSource = graph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100000, y: 0, z: 0 } });
const longTarget = graph({ 101: { x: 0, y: 0, z: 0 }, 102: { x: 100050, y: 0, z: 0 } });
assert.equal(physical.pairDistanceCompatible(longSource, pos(longSource), pos(longTarget),
  candidate(1, 101, 'A'), candidate(2, 102, 'B')), false);

const shortSource = graph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 } });
const shortTarget = graph({ 101: { x: 0, y: 0, z: 0 }, 102: { x: 105, y: 0, z: 0 } });
assert.equal(physical.pairDistanceCompatible(shortSource, pos(shortSource), pos(shortTarget),
  candidate(1, 101, 'A'), candidate(2, 102, 'B')), false);

const missingOdSource = graph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 } }, 0);
assert.equal(physical.pairDistanceCompatible(missingOdSource, pos(missingOdSource), pos(exactTarget),
  candidate(1, 101, 'A'), candidate(2, 102, 'B')), false);

const missingCoordinateSource = graph({ 1: null, 2: { x: 100, y: 0, z: 0 } });
assert.equal(physical.pairDistanceCompatible(missingCoordinateSource, pos(missingCoordinateSource), pos(exactTarget),
  candidate(1, 101, 'A'), candidate(2, 102, 'B')), false);

const bridged = neighbourGraph(7, [
  [0, 1], [0, 2], [1, 2],
  [3, 4], [3, 5], [3, 6], [4, 5], [4, 6], [5, 6],
  [2, 3],
]);
assert.deepEqual([...physical.bridgeEdgeKeys(bridged)], ['2:3']);
const pruned = physical.withoutBridgeEdges(bridged);
assert.deepEqual(physical.connectedComponents([0, 1, 2, 3, 4, 5, 6], pruned), [[0, 1, 2], [3, 4, 5, 6]]);
assert.equal(physical.componentIsComplete([0, 1, 2], pruned), true);
assert.equal(physical.componentIsComplete([3, 4, 5, 6], pruned), true);

const chain = neighbourGraph(4, [[0, 1], [1, 2], [2, 3]]);
const cycle = neighbourGraph(4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
assert.equal(physical.componentIsComplete([0, 1, 2, 3], chain), false);
assert.equal(physical.componentIsComplete([0, 1, 2, 3], cycle), false);
assert.equal(physical.componentIsComplete([0, 1, 2], neighbourGraph(3, [[0, 1], [0, 2], [1, 2]])), true);

const regionSourcePoints = {
  1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 },
  3: { x: 0, y: 100, z: 0 }, 4: { x: 100, y: 100, z: 0 },
  5: { x: 1000, y: 1000, z: 0 },
};
const regionTargetPoints = {
  101: { x: 500, y: 200, z: 0 }, 102: { x: 600, y: 200, z: 0 },
  103: { x: 500, y: 300, z: 0 }, 104: { x: 600, y: 300, z: 0 },
  105: { x: 5000, y: 5000, z: 0 },
};
const regionSource = graph(regionSourcePoints); const regionTarget = graph(regionTargetPoints);
const regionPairs = [1, 2, 3, 4, 5].map((id) => candidate(id, id + 100, `R${id}`));
assert.deepEqual(tags(selectPhysicalCandidatePairs(regionSource, regionTarget, regionPairs, 5)), ['R1', 'R2', 'R3', 'R4']);

const tiedSource = graph({
  1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 }, 3: { x: 0, y: 100, z: 0 },
  4: { x: 10000, y: 0, z: 0 }, 5: { x: 10100, y: 0, z: 0 }, 6: { x: 10000, y: 100, z: 0 },
});
const tiedTarget = graph({
  101: { x: 500, y: 500, z: 0 }, 102: { x: 600, y: 500, z: 0 }, 103: { x: 500, y: 600, z: 0 },
  104: { x: 50000, y: 0, z: 0 }, 105: { x: 50100, y: 0, z: 0 }, 106: { x: 50000, y: 100, z: 0 },
});
const tiedPairs = [1, 2, 3, 4, 5, 6].map((id) => candidate(id, id + 100, `T${id}`));
assert.deepEqual(selectPhysicalCandidatePairs(tiedSource, tiedTarget, tiedPairs, 10), []);

const noneSource = graph(Object.fromEntries(Array.from({ length: 6 }, (_, index) => [
  String(index + 1), { x: index * 100, y: (index % 2) * 60, z: 0 },
])));
const noneTarget = graph(Object.fromEntries(Array.from({ length: 6 }, (_, index) => [
  String(index + 101), { x: index * 250, y: (index % 2) * 170, z: 0 },
])));
const nonePairs = [1, 2, 3, 4, 5, 6].map((id) => candidate(id, id + 100, `N${id}`));
assert.deepEqual(tags(selectPhysicalCandidatePairs(noneSource, noneTarget, nonePairs, 4)),
  tags(physical.selectByGlobalSpread(noneSource, noneTarget, nonePairs, 4)));

const clique6Source = graph({
  1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 }, 3: { x: 0, y: 100, z: 0 },
  4: { x: 100, y: 100, z: 0 }, 5: { x: 50, y: 50, z: 80 }, 6: { x: 150, y: 50, z: 25 },
});
const clique6Target = graph({
  101: { x: 700, y: -300, z: 20 }, 102: { x: 800, y: -300, z: 20 }, 103: { x: 700, y: -200, z: 20 },
  104: { x: 800, y: -200, z: 20 }, 105: { x: 750, y: -250, z: 100 }, 106: { x: 850, y: -250, z: 45 },
});
const clique6Pairs = [1, 2, 3, 4, 5, 6].map((id) => candidate(id, id + 100, `C${id}`));
assert.equal(selectPhysicalCandidatePairs(clique6Source, clique6Target, clique6Pairs, 4).length, 4);

const renumberedSource = graph(Object.fromEntries(Object.entries(regionSourcePoints).map(([id, point]) => [String(Number(id) + 1000), point])));
const renumberedTarget = graph(Object.fromEntries(Object.entries(regionTargetPoints).map(([id, point]) => [String(Number(id) + 2000), point])));
const renumberedPairs = regionPairs.map((row) => candidate(Number(row.sourceNodeId) + 1000, Number(row.targetNodeId) + 2000, row.tag));
assert.deepEqual(tags(selectPhysicalCandidatePairs(renumberedSource, renumberedTarget, renumberedPairs, 5)), ['R1', 'R2', 'R3', 'R4']);
assert.deepEqual(tags(selectPhysicalCandidatePairs(regionSource, regionTarget, [...regionPairs].reverse(), 5)), ['R1', 'R2', 'R3', 'R4']);

const noisy = regionPairs.map((row) => ({ ...row, nodeName: 'LEAK', expectedTarget: 'EXPECTED', userLocked: true, confidence: 'HIGH' }));
assert.deepEqual(tags(selectPhysicalCandidatePairs(regionSource, regionTarget, noisy, 5)), ['R1', 'R2', 'R3', 'R4']);

const collinearSource = graph({
  1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 }, 3: { x: 200, y: 0, z: 0 }, 4: { x: 300, y: 0, z: 0 },
});
const collinearTarget = graph({
  101: { x: 500, y: 100, z: 0 }, 102: { x: 600, y: 100, z: 0 },
  103: { x: 700, y: 100, z: 0 }, 104: { x: 800, y: 100, z: 0 },
});
const collinearPairs = [1, 2, 3, 4].map((id) => candidate(id, id + 100, `L${id}`));
assert.equal(selectPhysicalCandidatePairs(collinearSource, collinearTarget, collinearPairs, 10).length, 4,
  'preselection may preserve a distance-coherent collinear pool');
assert.equal(discoverCiiMethodABases(collinearSource, collinearTarget, collinearPairs).status, 'UNAVAILABLE',
  'Method A retains non-collinearity qualification authority');

const mirrorSource = graph({
  1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 },
  3: { x: 0, y: 100, z: 0 }, 4: { x: 0, y: 0, z: 100 },
});
const mirrorTarget = graph({
  101: { x: 500, y: 0, z: 0 }, 102: { x: 400, y: 0, z: 0 },
  103: { x: 500, y: 100, z: 0 }, 104: { x: 500, y: 0, z: 100 },
});
const mirrorPairs = [1, 2, 3, 4].map((id) => candidate(id, id + 100, `M${id}`));
const mirrorSelected = selectPhysicalCandidatePairs(mirrorSource, mirrorTarget, mirrorPairs, 10);
assert.equal(mirrorSelected.length, 4, 'distance-preserving mirror may remain candidate-coherent');
assert.equal(mirrorSelected.every((row) => row.confidence == null && row.methodA == null), true,
  'preselection must not convert mirror distance coherence into identity/confidence authority');

console.log('R2.3.5 generic adversarial preselection contracts passed.');

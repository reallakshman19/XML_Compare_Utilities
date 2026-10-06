import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  selectPhysicalCandidatePairs,
  uniqueIncidentComponentLengthPairs,
  _test as physicalTest,
} from '../tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js';
import { _test as suggestionTest } from '../tabs/cii-workspace/cii-workspace-anchor-suggestions.js';
import {
  setCiiMultiSourceMethodAPhysicalCandidateLimit,
  _test as sourceSetTest,
} from '../tabs/cii-workspace/cii-workspace-source-set.js';

function edge(id, from, to, lengthMm) {
  return { id, from: String(from), to: String(to), componentKind: 'PIPE', lengthMm, diameter: 100 };
}
function fanGraph(count = 12, offset = { x: 0, y: 0, z: 0 }) {
  const edges = []; const coordinates = new Map([['0', { x: 0, y: 0, z: 0 }]]);
  for (let index = 1; index <= count; index += 1) {
    edges.push(edge(`e${index}`, '0', String(index), 100 + index * 17));
    coordinates.set(String(index), { x: index * 80, y: (index % 4) * 130, z: (index % 5) * 170 });
  }
  const adjacency = new Map([...coordinates.keys()].map((id) => [id, []]));
  for (const item of edges) { adjacency.get(item.from).push(item); adjacency.get(item.to).push(item); }
  const nodes = [...coordinates].map(([id, position]) => ({
    id, degree: adjacency.get(id).length, neighbourhoodLayers: [],
    position: { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z },
  }));
  return { nodes, edges, adjacency };
}
function pointGraph(points, od = 10) {
  const entries = Object.entries(points); const adjacency = new Map();
  const nodes = entries.map(([id, position]) => ({ id: String(id), degree: 1, neighbourhoodLayers: [], position }));
  for (const [id] of entries) adjacency.set(String(id), [{ from: String(id), to: `stub-${id}`, componentKind: 'PIPE', diameter: od, lengthMm: 100 }]);
  return { nodes, edges: [], adjacency };
}
function candidate(sourceNodeId, targetNodeId, tag, extra = {}) {
  return {
    sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId), tag,
    score: 100, winnerGap: 0, sourceRank: 1, targetRank: 1, mutualBest: true,
    physicalFingerprint: { authority: 'CANDIDATE_GENERATION_ONLY', fingerprint: tag, uniqueInSource: true, uniqueInTarget: true },
    ...extra,
  };
}
function rigidTransform(points, angleDeg, offset) {
  const radians = angleDeg * Math.PI / 180; const c = Math.cos(radians); const s = Math.sin(radians);
  return Object.fromEntries(Object.entries(points).map(([id, point]) => [String(Number(id) + 100), {
    x: c * point.x - s * point.y + offset.x,
    y: s * point.x + c * point.y + offset.y,
    z: point.z + offset.z,
  }]));
}
function selectedTags(sourceGraph, targetGraph, rows, limit, options = {}) {
  return selectPhysicalCandidatePairs(sourceGraph, targetGraph, rows, limit, options).map((row) => row.tag);
}

assert.equal(physicalTest.boundedPhysicalLimit(undefined), 10, 'physical Method-A search must default to 10 pairs');
assert.equal(physicalTest.boundedPhysicalLimit(1), 3, 'physical Method-A search must retain the three-anchor minimum');
assert.equal(physicalTest.boundedPhysicalLimit(999), 24, 'physical Method-A search must retain a hard safety ceiling');
assert.equal(physicalTest.boundedDiscoveryLimit(undefined, 10), 10);
assert.equal(physicalTest.boundedDiscoveryLimit(64, 10), 10, 'seed/expansion limits must not exceed the selected physical pool');

const source = fanGraph(); const target = fanGraph(12, { x: 1200, y: -700, z: 350 });
const candidates = uniqueIncidentComponentLengthPairs(source, target);
assert.equal(candidates.length, 13, 'fixture must exceed the default 10-pair search budget');
const selected = selectPhysicalCandidatePairs(source, target, candidates, 10);
assert.equal(selected.length, 10);
assert.equal(`${selected[0].sourceNodeId}=>${selected[0].targetNodeId}`, '0=>0', 'highest-connectivity unique fingerprint should seed deterministic selection');
assert.equal(new Set(selected.map((row) => row.sourceNodeId)).size, 10);
assert.deepEqual(
  selected.map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
  selectPhysicalCandidatePairs(source, target, candidates, 10).map((row) => `${row.sourceNodeId}=>${row.targetNodeId}`),
  'bounded candidate selection must be deterministic',
);

const clusterSourcePoints = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 100, y: 0, z: 0 },
  3: { x: 0, y: 100, z: 0 },
  4: { x: 100, y: 100, z: 0 },
  5: { x: 50, y: 50, z: 80 },
  6: { x: 1000, y: 0, z: 0 },
  7: { x: 0, y: 1000, z: 0 },
  8: { x: 1000, y: 1000, z: 0 },
};
const coherentTargetPoints = {
  ...rigidTransform(Object.fromEntries(Object.entries(clusterSourcePoints).slice(0, 5)), 90, { x: 500, y: -200, z: 30 }),
  106: { x: 5000, y: 0, z: 0 },
  107: { x: 5050, y: 10, z: 0 },
  108: { x: 100, y: 5000, z: 1000 },
};
const clusterSource = pointGraph(clusterSourcePoints); const coherentTarget = pointGraph(coherentTargetPoints);
const clusterCandidates = [
  candidate(1, 101, 'C1'), candidate(2, 102, 'C2'), candidate(3, 103, 'C3'),
  candidate(4, 104, 'C4'), candidate(5, 105, 'C5'),
  candidate(6, 106, 'D6'), candidate(7, 107, 'D7'), candidate(8, 108, 'D8'),
];
const coherenceEvents = [];
assert.deepEqual(
  [...selectedTags(clusterSource, coherentTarget, clusterCandidates, 5, { instrumentation: { record: (name, value) => coherenceEvents.push([name, value]) } })].sort(),
  ['C1', 'C2', 'C3', 'C4', 'C5'],
  'tight bounded search must preserve the strongest rigidly coherent physical candidate cluster',
);
assert.deepEqual(coherenceEvents, [
  ['ANCHOR_PHYSICAL_COHERENT_CLUSTER_SIZE', 5],
  ['ANCHOR_PHYSICAL_COHERENT_RESERVED_COUNT', 5],
]);

const alternateTarget = pointGraph({
  ...rigidTransform(Object.fromEntries(Object.entries(clusterSourcePoints).slice(0, 5)), 37, { x: -900, y: 1300, z: -40 }),
  106: { x: -5000, y: 300, z: 0 }, 107: { x: 20, y: -5050, z: 0 }, 108: { x: 4200, y: 5100, z: -700 },
});
assert.deepEqual(
  [...selectedTags(clusterSource, alternateTarget, clusterCandidates, 5)].sort(),
  ['C1', 'C2', 'C3', 'C4', 'C5'],
  'common rigid transform must not change logical coherent-cluster selection',
);
assert.deepEqual(
  selectedTags(clusterSource, coherentTarget, [...clusterCandidates].reverse(), 5).sort(),
  selectedTags(clusterSource, coherentTarget, clusterCandidates, 5).sort(),
  'input candidate permutation must not change logical bounded selection',
);

const renumberedSourcePoints = Object.fromEntries(Object.entries(clusterSourcePoints).map(([id, point]) => [String(Number(id) + 1000), point]));
const renumberedTargetPoints = Object.fromEntries(Object.entries(coherentTargetPoints).map(([id, point]) => [String(Number(id) + 2000), point]));
const renumberedCandidates = clusterCandidates.map((row) => candidate(Number(row.sourceNodeId) + 1000, Number(row.targetNodeId) + 2000, row.tag));
assert.deepEqual(
  selectedTags(pointGraph(renumberedSourcePoints), pointGraph(renumberedTargetPoints), renumberedCandidates, 5).sort(),
  ['C1', 'C2', 'C3', 'C4', 'C5'],
  'node renumbering must not change logical coherent-cluster selection',
);

const scaledTarget = pointGraph(Object.fromEntries(Object.entries(clusterSourcePoints).map(([id, point]) => [String(Number(id) + 100), {
  x: point.x * 2 + 1000, y: point.y * 2 - 500, z: point.z * 2,
}])));
assert.equal(
  physicalTest.strongestCoherentCluster(clusterSource, scaledTarget, clusterCandidates.slice(0, 5)).length,
  0,
  'distance-inconsistent fingerprints must not manufacture a coherent rigid cluster',
);
assert.equal(physicalTest.distinctCandidateClaims(candidate(1, 101, 'A'), candidate(1, 102, 'B')), false,
  'same SOURCE claim cannot count as independent coherence support');
assert.equal(physicalTest.distinctCandidateClaims(candidate(1, 101, 'A'), candidate(2, 101, 'B')), false,
  'same TARGET claim cannot count as independent coherence support');

const noisyAuthorityCandidates = clusterCandidates.map((row) => ({
  ...row, nodeName: `LEAK-${row.tag}`, expectedTarget: `EXPECTED-${row.tag}`, userLocked: true, confidence: 'HIGH',
}));
assert.deepEqual(
  selectedTags(clusterSource, coherentTarget, noisyAuthorityCandidates, 5).sort(),
  selectedTags(clusterSource, coherentTarget, clusterCandidates, 5).sort(),
  'NodeName/benchmark/manual/confidence-shaped metadata must not affect physical preselection',
);

const fourCluster = clusterCandidates.filter((row) => row.tag !== 'C5');
const fourSelected = selectedTags(clusterSource, coherentTarget, fourCluster, 5);
assert.equal(fourSelected.filter((tag) => tag.startsWith('C')).length, 4,
  'all available coherent candidates must be reserved before diversity fill');
assert.equal(fourSelected.filter((tag) => tag.startsWith('D')).length, 1,
  'remaining budget must retain one global exploration candidate');

assert.equal(suggestionTest.displayLimit({ baseAnchorSuggestionLimit: 12, baseAnchorDisplayLimit: 5 }), 5,
  'display limit must be independent from the discovery suggestion limit');
assert.equal(suggestionTest.displayLimit({ baseAnchorSuggestionLimit: 12 }), 12,
  'legacy callers without a display limit must retain their existing suggestion limit');

setCiiMultiSourceMethodAPhysicalCandidateLimit(14);
assert.equal(sourceSetTest.sourceSetInspectionOptions({}).methodAPhysicalCandidateLimit, 14, 'UI preference must feed the next multi-source Inspect');
assert.equal(sourceSetTest.sourceSetInspectionOptions({}).baseAnchorDisplayLimit, 5, 'multi-source Inspect must list top five suggestions by default');
assert.equal(sourceSetTest.sourceSetInspectionOptions({ methodAPhysicalCandidateLimit: 7 }).methodAPhysicalCandidateLimit, 7, 'explicit API options must override the UI preference');
setCiiMultiSourceMethodAPhysicalCandidateLimit(10);

const ui = await readFile(new URL('../tabs/cii-workspace/cii-workspace-multisource-review-only-filter-shell.js', import.meta.url), 'utf8');
assert(ui.includes('data-ciiw-method-a-search-limit'), 'multi-source UI must expose the Method-A physical search budget');
assert(ui.includes('min="3" max="24"'), 'UI search budget must show the same bounded range as the backend');
assert(ui.includes('10 recommended'), 'UI must communicate the approved default search budget');

console.log('CII bounded Method-A physical search budget checks passed.');

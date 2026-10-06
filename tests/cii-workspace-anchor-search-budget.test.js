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
function pointGraph(points, od = 100) {
  const entries = Object.entries(points); const adjacency = new Map();
  const nodes = entries.map(([id, position]) => ({ id: String(id), degree: 1, neighbourhoodLayers: [], position }));
  for (const [id] of entries) adjacency.set(String(id), [{
    from: String(id), to: `stub-${id}`, componentKind: 'PIPE', diameter: od, lengthMm: 100,
  }]);
  return { nodes, edges: [], adjacency };
}
function candidate(sourceNodeId, targetNodeId, extra = {}) {
  return {
    sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId),
    score: 100, winnerGap: 0, sourceRank: 1, targetRank: 1, mutualBest: true, ...extra,
  };
}
function positionMapForTest(graph) {
  return new Map((graph?.nodes || []).map((node) => [String(node.id), node.position]));
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

const exactSource = pointGraph({
  1: { x: 0, y: 0, z: 0 },
  2: { x: 1000, y: 0, z: 0 },
});
const exactTarget = pointGraph({
  101: { x: 500, y: -200, z: 30 },
  102: { x: 1500, y: -200, z: 30 },
});
assert.equal(
  physicalTest.pairDistanceCompatible(exactSource, positionMapForTest(exactSource), positionMapForTest(exactTarget),
    candidate(1, 101), candidate(2, 102)),
  true,
  'exact rigid pair distance must be compatible',
);

const longSpanSource = pointGraph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100000, y: 0, z: 0 } }, 100);
const longSpanTarget = pointGraph({ 101: { x: 0, y: 0, z: 0 }, 102: { x: 100050, y: 0, z: 0 } }, 100);
assert.equal(
  physicalTest.pairDistanceCompatible(longSpanSource, positionMapForTest(longSpanSource), positionMapForTest(longSpanTarget),
    candidate(1, 101), candidate(2, 102)),
  false,
  'long-span relation that passes relative tolerance must still fail the 0.1-OD gate',
);

const shortSpanSource = pointGraph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 } }, 100);
const shortSpanTarget = pointGraph({ 101: { x: 0, y: 0, z: 0 }, 102: { x: 105, y: 0, z: 0 } }, 100);
assert.equal(
  physicalTest.pairDistanceCompatible(shortSpanSource, positionMapForTest(shortSpanSource), positionMapForTest(shortSpanTarget),
    candidate(1, 101), candidate(2, 102)),
  false,
  'short-span relation that passes the 0.1-OD gate must still fail the 0.1-percent relative gate',
);

const missingOdSource = pointGraph({ 1: { x: 0, y: 0, z: 0 }, 2: { x: 100, y: 0, z: 0 } }, 0);
assert.equal(
  physicalTest.pairDistanceCompatible(missingOdSource, positionMapForTest(missingOdSource), positionMapForTest(exactTarget),
    candidate(1, 101), candidate(2, 102)),
  false,
  'missing positive SOURCE OD must fail closed',
);

const missingCoordinateSource = pointGraph({ 1: null, 2: { x: 100, y: 0, z: 0 } }, 100);
assert.equal(
  physicalTest.pairDistanceCompatible(missingCoordinateSource, positionMapForTest(missingCoordinateSource), positionMapForTest(exactTarget),
    candidate(1, 101), candidate(2, 102)),
  false,
  'missing coordinates must fail closed',
);

assert.equal(
  physicalTest.pairDistanceCompatible(exactSource, positionMapForTest(exactSource), positionMapForTest(exactTarget),
    candidate(1, 101), candidate(1, 102)),
  false,
  'duplicate SOURCE claim must not count as independent pairwise coherence',
);
assert.equal(
  physicalTest.pairDistanceCompatible(exactSource, positionMapForTest(exactSource), positionMapForTest(exactTarget),
    candidate(1, 101), candidate(2, 101)),
  false,
  'duplicate TARGET claim must not count as independent pairwise coherence',
);

const noisyLeft = candidate(1, 101, { nodeName: 'LEAK', expectedTarget: 'EXPECTED', userLocked: true, confidence: 'HIGH' });
const noisyRight = candidate(2, 102, { nodeName: 'LEAK2', expectedTarget: 'EXPECTED2', userLocked: true, confidence: 'HIGH' });
assert.equal(
  physicalTest.pairDistanceCompatible(exactSource, positionMapForTest(exactSource), positionMapForTest(exactTarget), noisyLeft, noisyRight),
  true,
  'NodeName/manual/benchmark/confidence-shaped metadata must not affect pairwise physical compatibility',
);

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

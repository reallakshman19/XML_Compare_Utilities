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

import assert from 'assert';
import { scoreCiiEdgeCandidate } from '../tabs/cii-workspace/cii-workspace-evidence.js';

const edge = (kind, fromDegree, toDegree, diameter = 273, wall = 8) => ({
  componentKind: kind, lengthMm: 1000, diameter, wall,
  fromContext: { degree: fromDegree }, toContext: { degree: toDegree },
});
const branchSource = edge('PIPE', 2, 3);
const localWinner = edge('PIPE', 2, 2);
const result = scoreCiiEdgeCandidate(branchSource, localWinner);
assert.strictEqual(result.hardFail, true);
assert(result.blockers.includes('BRANCH_TOPOLOGY_INCOMPATIBLE'));
assert.strictEqual(result.score, 0);

const rigidMismatch = scoreCiiEdgeCandidate(edge('RIGID', 1, 2), edge('PIPE', 1, 2));
assert(rigidMismatch.blockers.includes('RIGID_COMPONENT_KIND_INCOMPATIBLE'));

const odMismatch = scoreCiiEdgeCandidate(edge('PIPE', 1, 2, 273, 8), edge('PIPE', 1, 2, 168, 8));
assert.strictEqual(odMismatch.hardFail, true);
assert(odMismatch.blockers.includes('OD_INCOMPATIBLE'));
assert.strictEqual(odMismatch.score, 0, 'gross OD contradiction must not be rescued by topology/length score');

const wallMismatch = scoreCiiEdgeCandidate(edge('PIPE', 1, 2, 273, 12), edge('PIPE', 1, 2, 273, 4));
assert.strictEqual(wallMismatch.hardFail, true);
assert(wallMismatch.blockers.includes('WALL_THICKNESS_INCOMPATIBLE'));
assert.strictEqual(wallMismatch.score, 0, 'gross wall contradiction must not be classified HIGH');

const moderateWallChange = scoreCiiEdgeCandidate(edge('PIPE', 1, 2, 273, 8), edge('PIPE', 1, 2, 273, 6));
assert.strictEqual(moderateWallChange.hardFail, false, 'moderate wall differences remain evidence rather than an automatic structural veto');
console.log('CII Workspace structural hard-conflict checks passed.');

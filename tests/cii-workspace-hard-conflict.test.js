import assert from 'assert';
import { scoreCiiEdgeCandidate } from '../tabs/cii-workspace/cii-workspace-evidence.js';

const edge = (kind, fromDegree, toDegree) => ({
  componentKind: kind, lengthMm: 1000, diameter: 273, wall: 8,
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
console.log('CII Workspace structural hard-conflict checks passed.');

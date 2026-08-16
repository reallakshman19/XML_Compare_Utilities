import assert from 'assert';
import { scoreCiiEdgeCandidate } from '../tabs/cii-workspace/cii-workspace-evidence.js';

function edge(lengthMm, fromDegree, toDegree, kind = 'PIPE') {
  return { componentKind: kind, lengthMm, diameter: 273, wall: 8, fromContext: { degree: fromDegree }, toContext: { degree: toDegree } };
}
const source = edge(1000, 2, 3);
const locallyPerfectButWrong = edge(1000, 2, 2);
const endpointCompatible = edge(1015, 2, 3);
const wrong = scoreCiiEdgeCandidate(source, locallyPerfectButWrong, { lengthToleranceMm: 25 });
const correct = scoreCiiEdgeCandidate(source, endpointCompatible, { lengthToleranceMm: 25 });
assert.strictEqual(wrong.hardFail, true, 'A locally perfect degree-2 run must not beat incompatible branch context.');
assert(wrong.blockers.includes('BRANCH_TOPOLOGY_INCOMPATIBLE'));
assert(correct.score > wrong.score, 'Endpoint-compatible candidate must outrank the greedy local winner.');
console.log('CII Workspace gang-of-nodes ambiguity checks passed.');

import assert from 'node:assert/strict';
import { arbitrateCiiSeedCorrespondences } from '../tabs/cii-workspace/cii-workspace-correspondence-arbitration.js';
import { createCiiTransferPreview } from '../tabs/cii-workspace/cii-workspace-transfer-plan.js';
import { createCiiWorkspaceReviewLedger } from '../tabs/cii-workspace/cii-workspace-review.js';

function seed(loopId, elementRows, nodeRows = []) {
  return {
    loop: {
      loopId,
      method: 'USER_LOCKED_SEED',
      status: 'READY',
      confidence: 'USER_LOCKED',
      anchorPairs: [{ sourceNodeId: loopId + '-S', targetNodeId: loopId + '-T' }],
    },
    correspondence: {
      status: elementRows.some((row) => row.status === 'UNRESOLVED') ? 'UNRESOLVED' : 'READY',
      blockers: elementRows.some((row) => row.status === 'UNRESOLVED')
        ? ['SOURCE_COMPONENT_NOT_FULLY_PROPAGATED', 'PROPAGATION_AMBIGUITY_RETAINED']
        : [],
      propagation: { sourceComponentEdgeCount: 2 },
      targetCustodyConflicts: [],
      nodeRows,
      elementRows,
    },
  };
}

// B1 — resolved independent claims survive an unrelated unresolved frontier.
const partial = arbitrateCiiSeedCorrespondences([
  seed('SEED_1', [
    { correspondenceId: 'e1-bound', kind: 'ELEMENT', sourceElementId: 'E1', targetElementIds: ['T1'], status: 'HIGH' },
    { correspondenceId: 'e2-unresolved', kind: 'ELEMENT', sourceElementId: 'E2', targetElementIds: [], status: 'UNRESOLVED' },
  ]),
]);
assert.equal(partial.status, 'UNRESOLVED');
assert.deepEqual(partial.blockers, ['MANUAL_SEED_PROPAGATION_INCOMPLETE']);
assert.equal(partial.seedCoverage.expectedSourceElementCount, 2);
assert.equal(partial.seedCoverage.resolvedSourceElementCount, 1);
assert.equal(partial.seedCoverage.complete, false);
assert(partial.elementRows.some((row) => row.sourceElementId === 'E1' && row.status === 'HIGH'),
  'independent resolved E1 claim must remain visible despite unrelated unresolved E2 frontier');
assert(partial.elementRows.some((row) => row.sourceElementId === 'E2' && row.status === 'UNRESOLVED'),
  'unresolved frontier must remain explicit');

// B3 — contradictory resolved claims must still fail closed.
const conflicted = arbitrateCiiSeedCorrespondences([
  seed('SEED_A', [
    { correspondenceId: 'e1-a', kind: 'ELEMENT', sourceElementId: 'E1', targetElementIds: ['T1'], status: 'HIGH' },
    { correspondenceId: 'e2-a', kind: 'ELEMENT', sourceElementId: 'E2', targetElementIds: ['T2'], status: 'HIGH' },
  ]),
  seed('SEED_B', [
    { correspondenceId: 'e1-b', kind: 'ELEMENT', sourceElementId: 'E1', targetElementIds: ['T9'], status: 'HIGH' },
    { correspondenceId: 'e2-b', kind: 'ELEMENT', sourceElementId: 'E2', targetElementIds: ['T2'], status: 'HIGH' },
  ]),
]);
assert.equal(conflicted.status, 'AMBIGUOUS');
assert(conflicted.blockers.includes('CROSS_SEED_CORRESPONDENCE_CONFLICT'));
assert(conflicted.conflicts.some((row) => row.kind === 'SOURCE_ELEMENT_TO_MULTIPLE_TARGETS'));

const sourceDocument = { fileName: 'S1.CII', contentSha256: 's1' };
const targetDocument = { fileName: 'T.CII', contentSha256: 'target' };
const sourceGraph = { nodes: [{ id: '4200', nodeName: 'SL-106.2' }], edges: [] };
const targetGraph = { nodes: [{ id: '925', nodeName: '' }], edges: [] };
const boundNode = {
  correspondenceId: 'node:4200:925',
  kind: 'NODE',
  sourceNodeId: '4200',
  targetNodeId: '925',
  status: 'HIGH',
  authority: 'ANCHOR_PROPAGATED_M1_M2',
};
const unresolvedFrontier = {
  correspondenceId: 'element:E1',
  kind: 'ELEMENT',
  sourceElementId: 'E1:3790->3830',
  targetElementIds: [],
  status: 'UNRESOLVED',
  authority: 'ANCHOR_PROPAGATION_FRONTIER_BLOCKED',
};
const identity = 'same-row-authority';
function review(correspondence, ids) {
  return createCiiWorkspaceReviewLedger(sourceDocument, targetDocument, [], correspondence, {
    reviewedCorrespondenceIds: ids,
  });
}

// B4 — an unrelated unresolved frontier does not erase the operation;
// the aggregate correspondence status alone blocks the otherwise identical plan.
const incompleteCorrespondence = {
  status: 'UNRESOLVED',
  correspondenceIdentity: identity,
  nodeRows: [boundNode],
  elementRows: [unresolvedFrontier],
  componentRows: [],
};
const incomplete = createCiiTransferPreview(
  sourceDocument, targetDocument, sourceGraph, targetGraph,
  incompleteCorrespondence, review(incompleteCorrespondence, [boundNode.correspondenceId]),
);
assert.equal(incomplete.operations.length, 1);
assert.equal(incomplete.operations[0].property, 'NodeName');
assert.equal(incomplete.operations[0].status, 'PREVIEW_READY');
assert.equal(incomplete.operations[0].action, 'COPY');
assert.equal(incomplete.status, 'BLOCKED');
assert.deepEqual(incomplete.blockers, ['CORRESPONDENCE_NOT_READY']);

// B5 — exact same mutation-bearing claim is preview-ready when aggregate
// correspondence has no unrelated unresolved frontier.
const completeCorrespondence = {
  status: 'READY',
  correspondenceIdentity: identity,
  nodeRows: [boundNode],
  elementRows: [],
  componentRows: [],
};
const complete = createCiiTransferPreview(
  sourceDocument, targetDocument, sourceGraph, targetGraph,
  completeCorrespondence, review(completeCorrespondence, [boundNode.correspondenceId]),
);
assert.equal(complete.status, 'PREVIEW_READY');
assert.deepEqual(complete.blockers, []);
assert.deepEqual(incomplete.operations, complete.operations,
  'mutation operation must be byte-for-byte model-identical; only aggregate completeness status differs');

// B2 — if the mutation-bearing correspondence itself is unresolved,
// it must not generate a transferable NodeName operation.
const dependentUnresolvedNode = { ...boundNode, correspondenceId: 'node:4200:925:unresolved', status: 'UNRESOLVED' };
const dependentCorrespondence = {
  status: 'UNRESOLVED',
  correspondenceIdentity: 'dependent-unresolved',
  nodeRows: [dependentUnresolvedNode],
  elementRows: [],
  componentRows: [],
};
const dependent = createCiiTransferPreview(
  sourceDocument, targetDocument, sourceGraph, targetGraph,
  dependentCorrespondence, review(dependentCorrespondence, [dependentUnresolvedNode.correspondenceId]),
);
assert.equal(dependent.operations.length, 0,
  'unresolved mutation-bearing identity must never become a NodeName operation');
assert(dependent.blockers.includes('NO_REVIEWED_TRANSFER_PREVIEW_OPERATIONS'));
assert(dependent.blockers.includes('CORRESPONDENCE_NOT_READY'));

console.log('S1 admission safety B1-B5 checks: PASS');
console.log(JSON.stringify({
  B1: {
    status: partial.status,
    coverage: partial.seedCoverage,
    retainedResolvedClaims: partial.elementRows.filter((row) => row.status !== 'UNRESOLVED').map((row) => row.sourceElementId),
  },
  B2: { operationCount: dependent.operations.length, blockers: dependent.blockers },
  B3: { status: conflicted.status, blockers: conflicted.blockers, conflictKinds: conflicted.conflicts.map((row) => row.kind) },
  B4: { operationCount: incomplete.operations.length, operationStatus: incomplete.operations[0].status, planStatus: incomplete.status, blockers: incomplete.blockers },
  B5: { operationCount: complete.operations.length, operationStatus: complete.operations[0].status, planStatus: complete.status, blockers: complete.blockers },
}, null, 2));

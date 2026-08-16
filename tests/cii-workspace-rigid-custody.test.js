import assert from 'assert';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { attachCiiComponentCorrespondence } from '../tabs/cii-workspace/cii-workspace-components.js';
import { createCiiTransferPreview } from '../tabs/cii-workspace/cii-workspace-transfer-plan.js';
import { createCiiWorkspaceReviewLedger } from '../tabs/cii-workspace/cii-workspace-review.js';

function document(side, from, to, mass, extraRigids = []) {
  return {
    schema: 'CIIWorkspaceDocument.v1', side, fileName: `${side}.cii`, contentSha256: `${side}-sha`, nodeNames: {},
    parsed: {
      elements: [{ index: 0, from, to, dx: 1000, dy: 0, dz: 0, length: 1000, od: 273, wall: 8, P1: 10, T1: 100, hasBend: false }],
      nodes: { [from]: { x: 0, y: 0, z: 0 }, [to]: { x: 1000, y: 0, z: 0 } },
      rigids: [{ node: from, mass }, ...extraRigids],
    },
  };
}

const sourceDocument = document('SOURCE', 100, 110, 25);
const targetDocument = document('TARGET', 5000, 5010, 10);
const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);
const targetGraph = adaptCiiDocumentToTopologyGraph(targetDocument);
assert.strictEqual(sourceGraph.edges[0].componentKind, 'RIGID');
assert.strictEqual(sourceGraph.edges[0].rigidEvidence.status, 'UNIQUE_TERMINAL_RECORD');
assert.strictEqual(targetGraph.edges[0].componentKind, 'RIGID');

const row = {
  correspondenceId: 'element:E1:100->110:E1:5000->5010', kind: 'ELEMENT',
  sourceElementId: sourceGraph.edges[0].elementId, targetElementIds: [targetGraph.edges[0].elementId],
  status: 'HIGH', authority: 'LOCKED_ANCHOR_SPAN_ALIGNMENT',
};
const correspondence = attachCiiComponentCorrespondence({ status: 'READY', correspondenceIdentity: 'corr-rigid', nodeRows: [], elementRows: [row] }, sourceGraph, targetGraph);
assert.strictEqual(correspondence.componentRows.length, 1);
assert.strictEqual(correspondence.componentRows[0].kind, 'COMPONENT');
const componentRow = correspondence.componentRows[0];
const review = createCiiWorkspaceReviewLedger(sourceDocument, targetDocument, [], correspondence, {
  reviewedCorrespondenceIds: [componentRow.correspondenceId], rejectedCorrespondenceIds: [],
});
const plan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review);
const rigid = plan.operations.find((operation) => operation.property === 'rigidWeight');
assert(rigid, 'reviewed rigid COMPONENT correspondence should create a rigidWeight preview');
assert.strictEqual(rigid.status, 'PREVIEW_READY');
assert.strictEqual(rigid.before, 10);
assert.strictEqual(rigid.proposed, 25);
assert.strictEqual(rigid.custody, 'RIGID_COMPONENT');
assert.strictEqual(rigid.matchAuthority.kind, 'COMPONENT');

const ambiguousTargetDocument = document('TARGET', 6000, 6010, 10, [{ node: 6010, mass: 11 }]);
const ambiguousTargetGraph = adaptCiiDocumentToTopologyGraph(ambiguousTargetDocument);
assert.strictEqual(ambiguousTargetGraph.edges[0].rigidEvidence.status, 'AMBIGUOUS');
assert.strictEqual(ambiguousTargetGraph.edges[0].componentKind, 'PIPE');
console.log('CII Workspace rigid component correspondence/custody checks passed.');

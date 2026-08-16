import assert from 'assert';
import { createCiiTransferPreview } from '../tabs/cii-workspace/cii-workspace-transfer-plan.js';

const sourceDocument = { fileName: 'source.cii', contentSha256: 's' };
const targetDocument = { fileName: 'target.cii', contentSha256: 't' };
const sourceGraph = { nodes: [{ id: '150', nodeName: 'VALVE-N1' }], edges: [] };
const targetGraph = { nodes: [{ id: '5010', nodeName: '' }], edges: [] };
const row = {
  correspondenceId: 'node:150:5010',
  kind: 'NODE',
  sourceNodeId: '150',
  targetNodeId: '5010',
  status: 'HIGH',
  authority: 'ADJACENT_MATCH_BOUNDARY',
};
const correspondence = { status: 'READY', nodeRows: [row], elementRows: [] };

const unreviewed = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, {});
assert.strictEqual(unreviewed.operations.length, 0);
assert(unreviewed.blockers.includes('NO_REVIEWED_TRANSFER_PREVIEW_OPERATIONS'));

const reviewed = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, {
  reviewedCorrespondenceIds: [row.correspondenceId],
});
assert.strictEqual(reviewed.operations.length, 1);
assert.strictEqual(reviewed.operations[0].property, 'NodeName');
assert.strictEqual(reviewed.operations[0].proposed, 'VALVE-N1');
assert.strictEqual(reviewed.operations[0].matchAuthority.status, 'REVIEWED');
assert.strictEqual(reviewed.operations[0].matchAuthority.candidateStatus, 'HIGH');

const inserted = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, {
  status: 'READY',
  nodeRows: [{ ...row, correspondenceId: 'insert:5010', sourceNodeId: null, status: 'INSERTED' }],
  elementRows: [],
}, { reviewedCorrespondenceIds: ['insert:5010'] });
assert.strictEqual(inserted.operations.length, 0);

const conflicted = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, {
  status: 'CONFLICT',
  nodeRows: [{ ...row, status: 'CONFLICT' }],
  elementRows: [],
}, { reviewedCorrespondenceIds: [row.correspondenceId] });
assert.strictEqual(conflicted.operations.length, 0);
assert(conflicted.blockers.includes('CORRESPONDENCE_CONTAINS_STRUCTURAL_CONFLICT'));

console.log('CII Workspace reviewed NodeName custody checks passed.');

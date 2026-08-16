import assert from 'assert';
import { ciiWorkspaceArtifactBundle, correspondenceRowsToCsv } from '../tabs/cii-workspace/cii-workspace-export.js';

const correspondence = {
  nodeRows: [{
    correspondenceId: 'node:100:5000', kind: 'NODE', sourceNodeId: '100', targetNodeId: '5000',
    status: 'LOCKED', authority: 'USER_LOCKED_ANCHOR',
  }],
  elementRows: [{
    correspondenceId: 'path:E1:E9:E10', kind: 'ELEMENT_PATH', sourceElementIds: ['E1'], targetElementIds: ['E9', 'E10'],
    status: 'HIGH', authority: 'LOCKED_ANCHOR_SPAN_SUBDIVISION',
    evidence: { compatible: true, lengthDeltaMm: 0, internalNodes: ['5010'] },
  }],
};
const review = { reviewedCorrespondenceIds: ['path:E1:E9:E10'], rejectedCorrespondenceIds: [] };
const transferPlan = {
  operations: [
    { operationId: 'op:P1:path:E1:E9:E10', property: 'P1', custody: 'ELEMENT_PATH', status: 'PREVIEW_READY', blockers: [], matchAuthority: { correspondenceId: 'path:E1:E9:E10' } },
    { operationId: 'op:T1:path:E1:E9:E10', property: 'T1', custody: 'ELEMENT_PATH', status: 'BLOCKED', blockers: ['TARGET_PATH_SIZE_TRANSITION_UNREPRESENTED_IN_SOURCE'], matchAuthority: { correspondenceId: 'path:E1:E9:E10' } },
  ],
};
const audit = {
  schema: 'CIIWorkspaceAudit.v1',
  target: { contentSha256: 'target-sha', fileName: 'target.cii' },
  source: { fileName: 'source.cii', contentSha256: 'source-sha' },
  review,
  mutationAuthority: { modifiedTargetCiiExport: 'BLOCKED', stage06: 'NOT_IMPLEMENTED' },
};
const result = { correspondence, transferPlan, audit };
const first = ciiWorkspaceArtifactBundle(result);
const second = ciiWorkspaceArtifactBundle(result);
assert.strictEqual(first.correspondenceCsv, second.correspondenceCsv, 'CSV bytes must be deterministic.');
assert.strictEqual(first.auditJson, second.auditJson, 'Audit JSON bytes must be deterministic.');
assert.strictEqual(first.modifiedTargetCii, null);
assert(first.correspondenceCsv.includes('reviewDecision'));
assert(first.correspondenceCsv.includes('SOURCE_1_TO_TARGET_N'));
assert(first.correspondenceCsv.includes('ACCEPTED'));
assert(first.correspondenceCsv.includes('P1|T1'));
assert(first.correspondenceCsv.includes('ELEMENT_PATH'));
assert(first.correspondenceCsv.includes('TARGET_PATH_SIZE_TRANSITION_UNREPRESENTED_IN_SOURCE'));
assert(first.correspondenceCsv.includes('lengthDeltaMm'));
assert(first.auditJson.includes('"stage06":"NOT_IMPLEMENTED"'));
assert.strictEqual(correspondenceRowsToCsv(correspondence, { review, transferPlan }), first.correspondenceCsv);
console.log('CII Workspace deterministic audit/export checks passed.');

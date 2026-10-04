import assert from 'node:assert/strict';
import {
  bulkAcceptCiiMultiSourceReview,
  ciiMultiSourceReviewBySource,
  ciiMultiSourceReviewMarkup,
  ciiSourceTargetAuditRows,
  seedCiiMultiSourceReviewDecisions,
} from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';

const preview = {
  compareReview: { rows: [
    { correspondenceId: 'ms1', memberCorrespondenceId: 'm1', sourceId: 'S1', source: '3870', target: '870', kind: 'NODE', confidence: 'REVIEW', workflowStatus: 'REVIEW', decision: 'REVIEW', identityBound: true, authority: 'ANCHOR_PROPAGATED_M1_M2', changeCount: 1, changeFamilies: ['NODE_NAME'] },
    { correspondenceId: 'ms2', memberCorrespondenceId: 'm2', sourceId: 'S2', source: '120', target: '40070', kind: 'NODE', confidence: 'HIGH', workflowStatus: 'READY', decision: 'REVIEW', identityBound: true, authority: 'METHOD_A_LOCKED_SPAN', changeCount: 0, changeFamilies: [] },
    { correspondenceId: 'ms3', memberCorrespondenceId: 'm3', sourceId: 'S3', source: '1890', target: '21890', kind: 'NODE', confidence: 'MEDIUM', workflowStatus: 'LOCKED', decision: 'LOCKED', identityBound: true, authority: 'USER_LOCKED_ANCHOR', changeCount: 1, changeFamilies: ['NODE_NAME'] },
    { correspondenceId: 'ms4', memberCorrespondenceId: 'm4', sourceId: 'S1', source: '4000', target: '900', kind: 'NODE', confidence: 'HIGH', workflowStatus: 'UNRESOLVED', decision: 'REVIEW', identityBound: false, candidateStatus: 'AMBIGUOUS', authority: 'ANCHOR_PROPAGATION_FRONTIER_BLOCKED', changeCount: 0, changeFamilies: [] },
  ] },
  engineeringDeltas: { rows: [
    { deltaId: 'd1', correspondenceId: 'ms1', category: 'NODE_NAME', property: 'Node name / to-name', sourceValue: 'SL-097.19', targetValue: 'OLD-870', changed: true },
    { deltaId: 'd2', correspondenceId: 'ms2', category: 'NODE_NAME', property: 'Node name / to-name', sourceValue: 'SL-120', targetValue: 'SL-120', changed: false },
    { deltaId: 'd3', correspondenceId: 'ms3', category: 'NODE_NAME', property: 'Node name / to-name', sourceValue: 'SL-097.16', targetValue: 'OLD-21890', changed: true },
  ] },
  transferPlan: { operations: [
    { operationId: 'op1', property: 'Node name / to-name', action: 'COPY', status: 'PREVIEW_READY', matchAuthority: { correspondenceId: 'ms1' }, bm001Acceptance: { status: 'BOUND', groupedKey: 'g1' }, blockers: [] },
    { operationId: 'op3', property: 'Node name / to-name', action: 'COPY', status: 'PREVIEW_READY', matchAuthority: { correspondenceId: 'ms3' }, blockers: [] },
  ], excludedOperations: [] },
};

const decisions = seedCiiMultiSourceReviewDecisions(preview, new Map());
assert.equal(decisions.get('ms3'), 'LOCK');
assert.equal(bulkAcceptCiiMultiSourceReview(preview, decisions, 'HIGH'), 1, 'bulk HIGH must skip identity-unbound rows');
assert.equal(decisions.get('ms2'), 'ACCEPT');
decisions.set('ms1', 'LOCK');

const reviewBySource = ciiMultiSourceReviewBySource(preview, decisions);
assert.deepEqual(reviewBySource.S1.lockedCorrespondenceIds, ['m1']);
assert.deepEqual(reviewBySource.S1.reviewedCorrespondenceIds, []);
assert.deepEqual(reviewBySource.S2.reviewedCorrespondenceIds, ['m2']);
assert.deepEqual(reviewBySource.S3.lockedCorrespondenceIds, ['m3']);
assert.ok(!reviewBySource.S2.reviewedCorrespondenceIds.includes('ms2'), 'member review ledger must never receive prefixed multi-source IDs');

const auditRows = ciiSourceTargetAuditRows(preview);
const s1 = auditRows.find((row) => row.correspondenceId === 'ms1');
assert.equal(s1.sourceNodeName, 'SL-097.19');
assert.equal(s1.targetNodeName, 'OLD-870');
assert.equal(s1.nodeNameChanged, true);
assert.equal(s1.writer, 'COPY · PREVIEW_READY');
assert.equal(s1.bm001, 'BOUND · 1');
assert.equal(s1.proofRule, 'ANCHOR_PROPAGATED_M1_M2');
const unresolved = auditRows.find((row) => row.correspondenceId === 'ms4');
assert.equal(unresolved.blocker, 'AMBIGUOUS_REGION');

const markup = ciiMultiSourceReviewMarkup(preview, decisions, { confidence: 'ALL', search: '', changedOnly: false });
for (const token of [
  'Correspondence · Source vs Target', 'Anchor seeds → bound correspondence → engineering change → writer action',
  '3870', '870', '120', '40070', '1890', '21890', 'SL-097.19', 'OLD-870',
  'ANCHOR_PROPAGATED_M1_M2', 'COPY · PREVIEW_READY', 'BOUND · 1', 'AMBIGUOUS_REGION',
  'data-ciiw-ms-decision', 'NodeName differences', 'writer candidates', 'BM-001-bound ops',
  'retained 36-mutation benchmark is proved independently from T → TEXPECTED',
]) assert.ok(markup.includes(token), token);
assert.ok(ciiMultiSourceReviewMarkup(preview, decisions, { confidence: 'REVIEW', search: 'does-not-exist', changedOnly: false }).includes('No correspondence rows match'));

console.log('CII Writer2 multi-source Source-vs-Target correspondence review routing: PASS');

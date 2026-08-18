import assert from 'assert';
import { createCiiTransferPreview } from '../tabs/cii-workspace/cii-workspace-transfer-plan.js';
import { createCiiWorkspaceReviewLedger } from '../tabs/cii-workspace/cii-workspace-review.js';

const sourceDocument = { fileName: 'source.cii', contentSha256: 'source-sha' };
const targetDocument = { fileName: 'target.cii', contentSha256: 'target-sha' };
const sourceGraph = { nodes: [], edges: [] };
const targetGraph = { nodes: [], edges: [] };

const node130 = { correspondenceId: 'node:130:20130', kind: 'NODE', sourceNodeId: '130', targetNodeId: '20130', status: 'HIGH', authority: 'PROPAGATED' };
const node205 = { correspondenceId: 'node:205:20205', kind: 'NODE', sourceNodeId: '205', targetNodeId: '20205', status: 'REVIEW', authority: 'M2_NETWORK' };
const sif = { correspondenceId: 'element:70-250', kind: 'ELEMENT', sourceElementId: 'S70-250', targetElementIds: ['T20070-20250'], status: 'HIGH', authority: 'PROPAGATED' };
const rigid = { correspondenceId: 'component:113-116', kind: 'COMPONENT', componentKind: 'RIGID', sourceComponentId: 'SR9', targetComponentId: 'TR11', status: 'HIGH', authority: 'POINTER_BOUND_RIGID_COMPONENT_CONTEXT' };
const pipe = { correspondenceId: 'element:250-255', kind: 'ELEMENT', sourceElementId: 'S250-255', targetElementIds: ['T20250-20255'], status: 'REVIEW', authority: 'M2_NETWORK' };
const correspondence = {
  status: 'READY', correspondenceIdentity: 'corr-transfer-policy',
  nodeRows: [node130, node205], elementRows: [sif, pipe], componentRows: [rigid],
};
const review = createCiiWorkspaceReviewLedger(sourceDocument, targetDocument, [], correspondence, {
  reviewedCorrespondenceIds: [node130.correspondenceId, node205.correspondenceId, sif.correspondenceId, rigid.correspondenceId, pipe.correspondenceId],
});

function delta(row, category, property, sourceValue, targetValue, config = {}) {
  return {
    deltaId: `delta:${row.correspondenceId}:${property}`,
    correspondenceId: row.correspondenceId,
    identityKind: row.kind,
    sourceIdentity: config.sourceIdentity || row.sourceNodeId || row.sourceComponentId || row.sourceElementId,
    targetIdentity: config.targetIdentity || row.targetNodeId || row.targetComponentId || row.targetElementIds?.[0],
    category, property, sourceValue, targetValue,
    changed: config.changed ?? JSON.stringify(sourceValue) !== JSON.stringify(targetValue),
    semanticChange: config.semanticChange || 'CHANGED',
    evidenceStatus: config.evidenceStatus || 'QUALIFIED',
    authority: config.authority || null,
  };
}

const engineeringDeltas = {
  schema: 'CIIWorkspaceEngineeringDeltaSet.v1',
  rows: [
    delta(node130, 'RESTRAINT', 'Restraint code set', [15], [9], { evidenceStatus: 'PARTIAL', authority: 'PROTECTED_WRITER_RESTRANT_LINE1_LINE2' }),
    delta(node130, 'RESTRAINT', 'Restraint friction values', [0], [0.3], { authority: 'PROTECTED_WRITER_RESTRANT_LINE1_LINE2' }),
    delta(node205, 'HANGER', 'Hanger presence', true, false, { authority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE', semanticChange: 'REMOVED_IN_TARGET' }),
    delta(node205, 'HANGER', 'Hanger record count at node', 1, 0, { authority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE' }),
    delta(sif, 'SIF_TEE', 'SIF/Tee raw code (field 2)', 3, 5, { evidenceStatus: 'PARTIAL', authority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD' }),
    delta(rigid, 'WEIGHT_RIGID', 'Rigid weight', 111.2, 111.2, { changed: false, semanticChange: 'UNCHANGED', authority: 'ELEMENT_RIGID_POINTER_TO_RIGID_RECORD' }),
    delta(pipe, 'PIPE_SIZE', 'OD', 60.3, 114.3, { authority: 'PARSED_ELEMENT_PIPE_PROPERTY' }),
    delta(pipe, 'WALL', 'Wall thickness', 3.9, 4.7752, { authority: 'PARSED_ELEMENT_PIPE_PROPERTY' }),
    delta(pipe, 'GEOMETRY', 'Element length', 659.301, 459.301, { authority: 'PARSED_ELEMENT_GEOMETRY' }),
    delta(pipe, 'PROCESS', 'P1', 10, 15, { evidenceStatus: 'PARTIAL', authority: 'parser/sections/elements.js' }),
  ],
};

const plan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, engineeringDeltas);
assert.strictEqual(plan.inputAuthority, 'ENGINEERING_DELTA_SET');
assert.strictEqual(plan.mutationAuthority, 'BLOCKED_NOT_IMPLEMENTED');
assert.strictEqual(plan.policy.geometryProtected, true);
assert.strictEqual(plan.policy.odProtected, true);
assert.strictEqual(plan.policy.wallProtected, true);
assert.strictEqual(plan.status, 'PREVIEW_READY', 'blocked individual families do not prevent inspection when qualified operations exist');

const find = (property) => plan.operations.find((item) => item.property === property);
assert.strictEqual(find('Restraint code set').action, 'COPY');
assert.strictEqual(find('Restraint code set').status, 'PREVIEW_READY');
assert.strictEqual(find('Restraint friction values').action, 'COPY');
assert.strictEqual(find('Restraint friction values').status, 'PREVIEW_READY');

assert.strictEqual(find('Hanger presence').action, 'CREATE', 'intended operation remains visible even though execution is blocked');
assert.strictEqual(find('Hanger presence').status, 'BLOCKED');
assert(find('Hanger presence').blockers.includes('HANGER_CREATE_PAYLOAD_NOT_QUALIFIED'));
assert.strictEqual(find('Hanger record count at node').action, 'BLOCKED');
assert(find('Hanger record count at node').blockers.includes('HANGER_RECORD_COUNT_IS_EVIDENCE_ONLY'));

assert.strictEqual(find('SIF/Tee raw code (field 2)').action, 'COPY');
assert.strictEqual(find('SIF/Tee raw code (field 2)').status, 'BLOCKED');
assert(find('SIF/Tee raw code (field 2)').blockers.includes('SIF_TEE_RAW_RECORD_REWRITE_NOT_IMPLEMENTED'));

assert.strictEqual(find('Rigid weight').action, 'KEEP');
assert.strictEqual(find('Rigid weight').status, 'PREVIEW_READY');
assert.strictEqual(find('Rigid weight').before, 111.2);
assert.strictEqual(find('Rigid weight').proposed, 111.2);

for (const property of ['OD', 'Wall thickness', 'Element length']) {
  assert.strictEqual(find(property).action, 'KEEP');
  assert.strictEqual(find(property).status, 'PROTECTED');
  assert(find(property).blockers.includes('TARGET_PROPERTY_PROTECTED_BY_DEFAULT'));
}
assert.strictEqual(find('P1').action, 'COPY', 'partial authority blocks execution but must retain the intended copy action');
assert.strictEqual(find('P1').status, 'BLOCKED');
assert(find('P1').blockers.includes('PROCESS_TRANSFER_PARTIAL_AUTHORITY'));

assert(plan.summary.byAction.COPY >= 4);
assert(plan.summary.byAction.CREATE >= 1);
assert(plan.summary.byAction.KEEP >= 4);
assert(plan.summary.byAction.BLOCKED >= 1);
assert(plan.summary.protectedCount >= 3);
assert(plan.summary.previewReadyCount >= 3);

const rejectedReview = createCiiWorkspaceReviewLedger(sourceDocument, targetDocument, [], correspondence, {
  reviewedCorrespondenceIds: [node130.correspondenceId],
  rejectedCorrespondenceIds: [node205.correspondenceId],
});
const rejected = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, rejectedReview, engineeringDeltas);
assert(!rejected.operations.some((item) => item.matchAuthority.correspondenceId === node205.correspondenceId));

const stale = createCiiTransferPreview(sourceDocument, { ...targetDocument, contentSha256: 'target-changed' }, sourceGraph, targetGraph, correspondence, review, engineeringDeltas);
assert.strictEqual(stale.status, 'BLOCKED');
assert.strictEqual(stale.operations.length, 0);
assert(stale.blockers.includes('STALE_REVIEW_TARGET_IDENTITY'));

console.log('CII qualified transfer-preview action/status separation checks passed.');

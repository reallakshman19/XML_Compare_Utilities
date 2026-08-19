import assert from 'assert';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCiiWorkspacePreview } from '../tabs/cii-workspace/cii-workspace-core.js';
import { updateCiiReviewDecisions } from '../tabs/cii-workspace/cii-workspace-review.js';

async function text(relative) { return readFile(new URL(relative, import.meta.url), 'utf8'); }
function nodeRow(result, sourceNode) {
  return (result.correspondence?.nodeRows || []).find((row) => String(row.sourceNodeId) === String(sourceNode)) || null;
}
function edgeRow(result, sourceFrom, sourceTo) {
  const token = `:${sourceFrom}->${sourceTo}`;
  return (result.correspondence?.elementRows || []).find((row) => String(row.sourceElementId || '').includes(token)) || null;
}
function componentForElement(result, elementRow) {
  return (result.correspondence?.componentRows || []).find((row) => row.parentElementCorrespondenceId === elementRow?.correspondenceId) || null;
}
function op(plan, correspondenceId, property) {
  return (plan?.operations || []).find((item) => item.matchAuthority?.correspondenceId === correspondenceId && item.property === property) || null;
}

const [sourceText, target1Text, target2Text] = await Promise.all([
  text('../Benchmark/CIICompare/BM_CII_SOURCE.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET1.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET2.CII'),
]);

const policy = Object.freeze({
  cryptoRef: webcrypto,
  spatialToleranceMm: 100,
  diameterToleranceRatio: 0.10,
  wallToleranceRatio: 0.10,
  identityWeight: 50,
  diameterWeight: 30,
  wallWeight: 30,
  winnerGap: 8,
});

async function reviewedPreview(targetText, targetFileName, targetAnchor) {
  const baseInput = {
    sourceText,
    sourceFileName: 'BM_CII_SOURCE.CII',
    targetText,
    targetFileName,
    anchorPairs: [{ sourceNodeId: '10', targetNodeId: String(targetAnchor) }],
  };
  const first = await createCiiWorkspacePreview(baseInput, policy);
  const n130 = nodeRow(first, '130');
  const n205 = nodeRow(first, '205');
  const sifBranch = edgeRow(first, '70', '250');
  const rigidElement = edgeRow(first, '113', '116');
  const rigidComponent = componentForElement(first, rigidElement);
  const sizeEdge = edgeRow(first, '250', '255');
  for (const [name, row] of [['node130', n130], ['node205', n205], ['SIF branch', sifBranch], ['rigid element', rigidElement], ['rigid component', rigidComponent], ['size edge', sizeEdge]]) {
    assert(row, `Benchmark correspondence missing: ${name}`);
  }
  const reviewedIds = [n130.correspondenceId, n205.correspondenceId, sifBranch.correspondenceId, rigidElement.correspondenceId, rigidComponent.correspondenceId, sizeEdge.correspondenceId];
  const review = updateCiiReviewDecisions(first.review, {
    reviewedCorrespondenceIds: reviewedIds,
    lockedCorrespondenceIds: [],
    rejectedCorrespondenceIds: [],
  });
  const second = await createCiiWorkspacePreview({ ...baseInput, review }, policy);
  return { result: second, rows: { n130, n205, sifBranch, rigidElement, rigidComponent, sizeEdge } };
}

const target1 = await reviewedPreview(target1Text, 'BM_CII_TARGET1.CII', '20010');
const target2 = await reviewedPreview(target2Text, 'BM_CII_TARGET2.CII', '10010');

for (const { result, rows } of [target1, target2]) {
  const plan = result.transferPlan;
  assert.strictEqual(plan.inputAuthority, 'ENGINEERING_DELTA_SET');
  assert.strictEqual(plan.mutationAuthority, 'WRITER_1A_CONDITIONAL');
  assert.strictEqual(plan.policy.geometryProtected, true);
  assert.strictEqual(plan.policy.nodeNumberProtected, true);
  assert.strictEqual(plan.policy.topologyProtected, true);
  assert.strictEqual(plan.policy.odProtected, true);
  assert.strictEqual(plan.policy.wallProtected, false);
  assert.strictEqual(result.writerReadiness.ready, false, 'mixed benchmark approvals contain operations outside Writer 1A and must fail closed');
  assert(result.writerReadiness.blockers.some((item) => item.includes('WRITER_1A_UNSUPPORTED_OPERATION')));
  assert.strictEqual(result.audit.mutationAuthority.stage06, 'WRITER_1A_BLOCKED');
  assert.strictEqual(result.audit.mutationAuthority.modifiedTargetCiiExport, 'BLOCKED');
  assert.strictEqual(result.artifacts.modifiedTargetCii, null);

  const restraintCode = op(plan, rows.n130.correspondenceId, 'Restraint code set');
  assert(restraintCode);
  assert.strictEqual(restraintCode.action, 'COPY');
  assert.strictEqual(restraintCode.status, 'PREVIEW_READY');
  assert.deepStrictEqual(restraintCode.proposed, [15]);

  const hanger = op(plan, rows.n205.correspondenceId, 'Hanger presence');
  assert(hanger);
  assert.strictEqual(hanger.before, false);
  assert.strictEqual(hanger.proposed, true);
  assert.strictEqual(hanger.action, 'CREATE', 'the intended SOURCE->TARGET action must remain visible while execution is blocked');
  assert.strictEqual(hanger.status, 'BLOCKED');
  assert(hanger.blockers.includes('HANGER_CREATE_PAYLOAD_NOT_QUALIFIED'));

  const sif = op(plan, rows.sifBranch.correspondenceId, 'SIF/Tee raw code (field 2)');
  assert(sif);
  assert.strictEqual(sif.action, 'COPY');
  assert.strictEqual(sif.status, 'BLOCKED');
  assert.strictEqual(sif.proposed, 3);
  assert(sif.blockers.includes('SIF_TEE_RAW_RECORD_REWRITE_NOT_IMPLEMENTED'));

  const rigid = op(plan, rows.rigidComponent.correspondenceId, 'Rigid weight');
  assert(rigid);
  assert.strictEqual(rigid.before, 111.2);
  assert.strictEqual(rigid.proposed, 111.2);
  assert.strictEqual(rigid.action, 'KEEP');
  assert.strictEqual(rigid.status, 'PREVIEW_READY');

  const od = op(plan, rows.sizeEdge.correspondenceId, 'OD');
  assert(od, 'Missing protected OD preview');
  assert.strictEqual(od.action, 'KEEP');
  assert.strictEqual(od.status, 'PROTECTED');
  assert(od.blockers.includes('TARGET_PROPERTY_PROTECTED_BY_DEFAULT'));

  const wall = op(plan, rows.sizeEdge.correspondenceId, 'Wall thickness');
  assert(wall, 'Missing Writer 1A wall preview');
  assert.strictEqual(wall.action, 'COPY');
  assert.strictEqual(wall.status, 'PREVIEW_READY');
  assert.strictEqual(wall.policyAuthority, 'CII_WRITER_1A_CARDINALITY_PRESERVING_ELEMENT_FIELD');
}

const t1Friction = op(target1.result.transferPlan, target1.rows.n130.correspondenceId, 'Restraint friction values');
assert(t1Friction);
assert.deepStrictEqual(t1Friction.before, [0.3]);
assert.deepStrictEqual(t1Friction.proposed, [0]);
assert.strictEqual(t1Friction.action, 'COPY');
assert.strictEqual(t1Friction.status, 'PREVIEW_READY');

assert.strictEqual(op(target2.result.transferPlan, target2.rows.n130.correspondenceId, 'Restraint friction values'), null);

console.log('CII real benchmark transfer-preview TARGET1/TARGET2 Writer 1A authority checks passed.');

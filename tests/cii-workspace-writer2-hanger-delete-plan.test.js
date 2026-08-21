import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCiiPhysicalFile } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { buildCiiHangerEvidence, CII_HANGER_LAYOUTS } from '../tabs/cii-workspace/cii-workspace-hanger.js';
import {
  applyCiiWriter2HangerDeletePlanContract, buildCiiWriter2HangerDeletePlan,
  CII_WRITER_2_HANGER_CREATE_BLOCKER, CII_WRITER_2_HANGER_DELETE_POLICY,
} from '../tabs/cii-workspace/cii-workspace-writer2-hanger-delete.js';

const WIDTHS = [15, 13, 13, 13, 13, 13];
function numericRow(values) { return values.map((value, index) => String(value ?? '').padStart(WIDTHS[index] || 13, ' ')).join(''); }
function control(numelt, nohgrs, numnoz = 0) {
  return [numericRow([numelt, numnoz, nohgrs, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 0]), numericRow([0])];
}
function executionRows() { return [numericRow([0, 0, 0, 2, 0, 1]), numericRow([0, 0, 21, 21, 0, 0]), numericRow([0, 0, 0, 0, 0, 3]), numericRow([3])]; }
function canonicalTarget(nodes) {
  const count = nodes.length; const elementCount = Math.max(1, count);
  const rrmat = [numericRow(Array.from({ length: elementCount }, () => 106))];
  const defaults = [numericRow([1, 25, 0, 9999, 1, 1]), numericRow([1, 0, 1, 1, 1])];
  const hgrdat = nodes.flatMap((node, index) => [numericRow([100 + index, 25, 0, 0, 0, 0]), numericRow([0, 9999, index, 0, 0])]);
  const tagGuid = nodes.flatMap((node) => [`       ${String(node).length.toString().padStart(5, ' ')} H${node}`, '           0 ']);
  const free = nodes.map((node, index) => numericRow([node, 0, index + 1, 0]));
  const body = ['#$ CONTROL', ...control(elementCount, count), '#$ MISCEL_1', ...rrmat, ...defaults,
    numericRow(nodes), ...hgrdat, ...tagGuid, ...free,
    numericRow(nodes.map((_, index) => index + 10)), numericRow(nodes.map((_, index) => index + 20)),
    numericRow(nodes.map((_, index) => index + 30)), numericRow(nodes.map((_, index) => index + 40)),
    ...executionRows()].join('\r\n') + '\r\n';
  const parsed = Object.freeze({
    elements: Object.freeze(Array.from({ length: elementCount }, (_, index) => Object.freeze({ index, from: 10 + index * 10, to: 20 + index * 10 }))),
    nodes: Object.freeze(Object.fromEntries([...new Set([10, 20, 30, 40, 50, ...nodes])].map((node) => [String(node), Object.freeze({})]))),
  });
  const physicalFile = createCiiPhysicalFile(new TextEncoder().encode(body));
  const hangerEvidence = buildCiiHangerEvidence(physicalFile.text, parsed);
  return Object.freeze({ physicalFile, writer1CByteEligible: true, hangerEvidence, parsed });
}
function inputXmlCurrentTarget(node = 20) {
  const body = ['#$ CONTROL', ...control(1, 1), '#$ MISCEL_1', numericRow([106]),
    numericRow([1, 25, 0, 9999, 1, 1]), numericRow([1, 0, 1, 1, 1]),
    numericRow([0, 25, 0, 0, 0, 0]), numericRow([0, 9999, 0, 0, 0]), '           0 ', '           0 ', numericRow([0, 0, 0, 0]),
    numericRow([node]), numericRow([0]), numericRow([1]), numericRow([0]), numericRow([0]), ...executionRows()].join('\r\n') + '\r\n';
  const parsed = Object.freeze({ elements: Object.freeze([Object.freeze({ index: 0, from: 10, to: 20 })]), nodes: Object.freeze({ 10: Object.freeze({}), 20: Object.freeze({}) }) });
  const physicalFile = createCiiPhysicalFile(new TextEncoder().encode(body));
  const hangerEvidence = buildCiiHangerEvidence(physicalFile.text, parsed);
  return Object.freeze({ physicalFile, writer1CByteEligible: true, hangerEvidence, parsed });
}
function hangerOperation(node, source, target, id = `HANGER-${node}`) {
  return Object.freeze({
    operationId: id, family: 'HANGER', property: 'Hanger presence', action: source ? 'CREATE' : 'DELETE', status: 'PREVIEW_READY', blockers: Object.freeze([]),
    evidenceAuthority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE',
    sourceEvidence: Object.freeze({ identity: `SRC-${node}`, value: source, authority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE' }),
    targetEvidence: Object.freeze({ identity: String(node), value: target }), before: target, proposed: source,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function rawPlan(operations, blockers = ['NO_TRANSFERABLE_PREVIEW_OPERATIONS']) {
  return Object.freeze({ status: blockers.length ? 'BLOCKED' : 'PREVIEW_READY', blockers: Object.freeze(blockers),
    mutationAuthority: 'WRITER_1B_CONDITIONAL', sourceDocument: Object.freeze({ contentSha256: 'source' }), targetDocument: Object.freeze({ contentSha256: 'target' }),
    operations: Object.freeze(operations), policy: Object.freeze({ hangerMutation: 'BLOCKED' }) });
}
function bound(contracted, decisions = () => 'APPLY') {
  const operations = []; const excludedOperations = [];
  for (const operation of contracted.operations) {
    if (operation.action === 'KEEP') { operations.push(Object.freeze({ ...operation, scopeDecision: 'KEEP' })); continue; }
    if (decisions(operation) === 'APPLY') operations.push(Object.freeze({ ...operation, scopeDecision: 'APPLY' }));
    else excludedOperations.push(Object.freeze({ ...operation, scopeDecision: 'EXCLUDE' }));
  }
  return Object.freeze({ ...contracted, status: 'PREVIEW_READY', blockers: Object.freeze([]), operations: Object.freeze(operations), excludedOperations: Object.freeze(excludedOperations),
    transferScope: Object.freeze({ status: 'BOUND' }) });
}

// Canonical synthetic three-record case: delete the middle record and preserve index-parallel custody.
{
  const target = canonicalTarget([20, 30, 40]);
  assert.equal(target.hangerEvidence.status, 'QUALIFIED');
  assert.equal(target.hangerEvidence.layout, CII_HANGER_LAYOUTS.SYNCHRONIZER);
  const contracted = applyCiiWriter2HangerDeletePlanContract(rawPlan([hangerOperation(30, false, true)]));
  assert.equal(contracted.status, 'PREVIEW_READY');
  assert.equal(contracted.operations[0].policyAuthority, CII_WRITER_2_HANGER_DELETE_POLICY);
  const plan = buildCiiWriter2HangerDeletePlan({ targetDocument: target, transferPlan: bound(contracted) });
  assert.equal(plan.ready, true, plan.blockers.join('|'));
  assert.equal(plan.countBefore, 3); assert.equal(plan.countAfter, 2);
  assert.deepEqual(plan.deletedRecordIndices, [2]);
  assert.deepEqual(plan.retainedRecordIndices, [1, 3]);
  assert.deepEqual(plan.oldToNewRecordIndex, { 1: 1, 2: 0, 3: 2 });
  assert.deepEqual(plan.retainedNodes, ['20', '40']);
  for (const label of ['IHGRNODE', 'IHGRNUM', 'IHGRTABLE', 'IHGRSHORT', 'IHGRCN']) {
    assert.deepEqual(plan.compaction.retainedPackedFields[label].map((field) => field.valueIndex), [1, 3], `${label} must retain the same record indices`);
  }
  assert.deepEqual(plan.compaction.retainedHgrdatRecordIndices, [1, 3]);
  assert.deepEqual(plan.compaction.retainedTagGuidRecordIndices, [1, 3]);
  assert.deepEqual(plan.compaction.retainedIhgrfreeRecordIndices, [1, 3]);
}

// CREATE remains blocked because complete hanger construction/default semantics are not qualified.
{
  const create = applyCiiWriter2HangerDeletePlanContract(rawPlan([hangerOperation(20, true, false)]));
  assert.equal(create.operations[0].action, 'CREATE');
  assert.equal(create.operations[0].status, 'BLOCKED');
  assert(create.operations[0].blockers.includes(CII_WRITER_2_HANGER_CREATE_BLOCKER));
}

// Alternate INPUTXML_CURRENT physical layout is read-compatible but not Writer2-delete-authorized.
{
  const target = inputXmlCurrentTarget(20);
  assert.equal(target.hangerEvidence.status, 'QUALIFIED');
  assert.equal(target.hangerEvidence.layout, CII_HANGER_LAYOUTS.INPUTXML_CURRENT);
  const contracted = applyCiiWriter2HangerDeletePlanContract(rawPlan([hangerOperation(20, false, true)]));
  const plan = buildCiiWriter2HangerDeletePlan({ targetDocument: target, transferPlan: bound(contracted) });
  assert.equal(plan.ready, false);
  assert(plan.blockers.some((item) => item.startsWith('WRITER_2_HANGER_CANONICAL_LAYOUT_REQUIRED:')));
}

// Real CAESAR benchmark custody: the existing hanger at node 205 can be planned for complete deletion without interpreting HGRDAT values.
{
  const bytes = new Uint8Array(await readFile(new URL('../Benchmark/CIICompare/BM_CII_SOURCE.CII', import.meta.url)));
  const target = await intakeCiiWorkspaceDocument(bytes, 'BM_CII_SOURCE.CII', { side: 'TARGET', cryptoRef: webcrypto });
  assert.equal(target.hangerEvidence.status, 'QUALIFIED');
  assert.equal(target.hangerEvidence.layout, CII_HANGER_LAYOUTS.SYNCHRONIZER);
  assert.equal(target.hangerEvidence.count, 1);
  assert.deepEqual(target.hangerEvidence.nodes, ['205']);
  const contracted = applyCiiWriter2HangerDeletePlanContract(rawPlan([hangerOperation(205, false, true)]));
  const plan = buildCiiWriter2HangerDeletePlan({ targetDocument: target, transferPlan: bound(contracted) });
  assert.equal(plan.ready, true, plan.blockers.join('|'));
  assert.equal(plan.countBefore, 1); assert.equal(plan.countAfter, 0);
  assert.deepEqual(plan.deletedRecordIndices, [1]);
  assert.deepEqual(plan.oldToNewRecordIndex, { 1: 0 });
  assert.equal(plan.physicalCustody.rrmatRows, 7);
  assert.equal(plan.physicalCustody.nozzleRows, 0);
  assert.equal(plan.physicalCustody.expectedRowCount, 23);
  assert.equal(plan.compaction.expectedMiscelRowsAfter, 11);
  assert.equal(plan.compaction.hangerHeaderRowsRetained, false);
}

console.log('Writer2 canonical HANGER DELETE planner custody checks authored.');

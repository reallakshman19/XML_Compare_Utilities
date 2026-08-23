import assert from 'node:assert/strict';
import { createCiiPhysicalFile } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { buildCiiHangerEvidence, CII_HANGER_LAYOUTS } from '../tabs/cii-workspace/cii-workspace-hanger.js';
import { applyCiiWriter2HangerDeletePlanContract } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-delete.js';
import { applyCiiWriter2HangerPartialDelete } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js';
import { validateCiiWriter2HangerPartialRoundTrip } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js';

const WIDTHS = [15, 13, 13, 13, 13, 13];
function numericRow(values) { return values.map((value, index) => String(value ?? '').padStart(WIDTHS[index] || 13, ' ')).join(''); }
function packed(values) { return `  ${values.map((value) => String(value).padStart(13, ' ')).join('')}`; }
function stringCard(value) {
  const text = String(value || '');
  return `${' '.repeat(7)}${String(text.length).padStart(5, ' ')} ${text}`;
}
function physicalDocument(byteString, parsed, contentSha256) {
  const bytes = new Uint8Array(byteString.length);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = byteString.charCodeAt(index) & 0xff;
  const physicalFile = createCiiPhysicalFile(bytes);
  return Object.freeze({
    contentSha256,
    physicalFile,
    writer1CByteEligible: true,
    hangerEvidence: buildCiiHangerEvidence(physicalFile.text, parsed),
    parsed,
  });
}
function target() {
  const nodes = [200, 210, 220];
  const parsed = Object.freeze({
    elements: Object.freeze([
      Object.freeze({ index: 0, from: 1000, to: 1010 }),
      Object.freeze({ index: 1, from: 1020, to: 1030 }),
      Object.freeze({ index: 2, from: 1040, to: 1050 }),
    ]),
    nodes: Object.freeze(Object.fromEntries([...nodes, 1000, 1010, 1020, 1030, 1040, 1050].map((node) => [String(node), Object.freeze({})]))),
  });
  const control = [
    numericRow([3, 0, 3, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0]),
  ];
  const defaults = [numericRow([1, 25, 0, 9999, 1, 1]), packed([1, 0, 1, 1, 1])];
  const tail = nodes.flatMap((node, zero) => [
    numericRow([101 + zero, 25, 0, 0, 0, 0]),
    numericRow([0, 9999, zero + 1, 0, 0]),
    stringCard(`H${node}`),
    stringCard(''),
  ]);
  const free = nodes.map((node, zero) => packed([node, 0, zero + 1, 0]));
  const body = [
    '#$ CONTROL', ...control,
    '#$ MISCEL_1',
    numericRow([106, 106, 106]),
    ...defaults,
    packed(nodes),
    ...tail,
    ...free,
    packed([10, 11, 12]),
    packed([20, 21, 22]),
    packed([30, 31, 32]),
    packed([40, 41, 42]),
    numericRow([0, 0, 0, 2, 0, 1]),
    numericRow([0, 0, 21, 21, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 3]),
    numericRow([3]),
    '#$ UNITS',
    'UNITS-CUSTODY',
  ].join('\r\n') + '\r\n';
  const document = physicalDocument(body, parsed, 'target-sha');
  assert.equal(document.hangerEvidence.status, 'QUALIFIED');
  assert.equal(document.hangerEvidence.layout, CII_HANGER_LAYOUTS.SYNCHRONIZER);
  return document;
}
function transferPlan(before) {
  const operation = Object.freeze({
    operationId: 'HANGER-210',
    family: 'HANGER',
    property: 'Hanger presence',
    action: 'DELETE',
    status: 'PREVIEW_READY',
    blockers: Object.freeze([]),
    evidenceAuthority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE',
    sourceEvidence: Object.freeze({ identity: 'SRC-210', value: false, authority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE' }),
    targetEvidence: Object.freeze({ identity: '210', value: true }),
    before: true,
    proposed: false,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
  const sourceDocument = Object.freeze({ contentSha256: 'source-sha' });
  const targetDocument = Object.freeze({ contentSha256: before.contentSha256 });
  const contracted = applyCiiWriter2HangerDeletePlanContract(Object.freeze({
    status: 'BLOCKED',
    blockers: Object.freeze(['NO_TRANSFERABLE_PREVIEW_OPERATIONS']),
    sourceDocument,
    targetDocument,
    operations: Object.freeze([operation]),
    policy: Object.freeze({ hangerMutation: 'BLOCKED' }),
  }));
  const applied = Object.freeze(contracted.operations.map((item) => Object.freeze({ ...item, scopeDecision: 'APPLY' })));
  return Object.freeze({
    ...contracted,
    status: 'PREVIEW_READY',
    blockers: Object.freeze([]),
    sourceDocument,
    targetDocument,
    operations: applied,
    excludedOperations: Object.freeze([]),
    transferScope: Object.freeze({
      status: 'BOUND',
      mode: 'EXPLICIT_APPLY_EXCLUDE',
      authority: 'USER_EXPLICIT_OPERATION_SCOPE',
      scopeId: 'deleted-testimony-h3-delete2',
      sourceSha256: 'source-sha',
      targetSha256: before.contentSha256,
      candidateOperationIds: Object.freeze(['HANGER-210']),
      appliedOperationIds: Object.freeze(['HANGER-210']),
      excludedOperationIds: Object.freeze([]),
    }),
  });
}

const before = target();
const plan = transferPlan(before);
const writer = applyCiiWriter2HangerPartialDelete({ targetDocument: before, transferPlan: plan });
const after = physicalDocument(writer.byteString, before.parsed, 'post-sha');
assert.equal(validateCiiWriter2HangerPartialRoundTrip(before, after, plan, writer).status, 'PASS');
assert.deepEqual(writer.deletedRecordIndices, [2]);

const forged = Object.freeze({ ...writer, deletedRecordIndices: Object.freeze([1]) });
assert.throws(
  () => validateCiiWriter2HangerPartialRoundTrip(before, after, plan, forged),
  /WRITER_2_HANGER_PARTIAL_RECORD_TESTIMONY_MISMATCH/,
);

console.log('Writer2 partial HANGER validator rejects forged top-level deleted-record testimony.');

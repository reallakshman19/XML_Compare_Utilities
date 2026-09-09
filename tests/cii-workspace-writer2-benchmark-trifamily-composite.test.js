import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { ciiPhysicalSectionRows } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { applyCiiWorkspaceTargetWriter2 } from '../tabs/cii-workspace/cii-workspace-core.js';
import { ciiWriter2CompositeReadiness } from '../tabs/cii-workspace/cii-workspace-writer2-composite-routing.js';
import { applyCiiWriter2CompositeWithHangerDeleteAll } from '../tabs/cii-workspace/cii-workspace-writer2-composite-hanger.js';
import { validateCiiWriter2CompositeWithHangerRoundTrip } from '../tabs/cii-workspace/cii-workspace-writer2-composite-hanger-validation.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';
import { CII_WRITER_2_SIF_DELETE_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-sif-delete.js';
import { CII_WRITER_2_HANGER_DELETE_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-hanger-delete.js';

const SOURCE_SHA = '2525252525252525252525252525252525252525252525252525252525252525';
const NODE_ID = '10';
const NODE_NAME = 'BM-N10';
const SIF_POINTER = 1;
const HANGER_NODE = '205';
const EXPECTED = Object.freeze({
  elements: 40,
  nodeNamesBefore: 4,
  nodeNamesAfter: 5,
  sifBlocksBefore: 9,
  sifBlocksAfter: 8,
  sifRowsBefore: 90,
  sifRowsAfter: 80,
  hangersBefore: 1,
  hangersAfter: 0,
  miscelRowsBefore: 23,
  miscelRowsAfter: 11,
});

function byteStringToBytes(value) {
  const raw = String(value ?? '');
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index) & 0xff;
  return bytes;
}
function sortedIds(operations) {
  return operations.map((operation) => String(operation.operationId))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
function connectivity(document) {
  return document.parsed.elements.map((element) => [Number(element.index), String(element.from), String(element.to)]);
}
function exactNodeCreateCandidate(document) {
  const binding = Object.values(document?.nodeNameEvidence?.physicalCustody?.byElementIndex || {})
    .find((item) => item?.bindingAuthority === 'EXACT_PARSED_INDEX_AND_ENDPOINTS'
      && Number(item.pointer) === 0
      && (String(item.from) === NODE_ID || String(item.to) === NODE_ID));
  assert(binding, `BM-W2-05 node ${NODE_ID} requires an exact zero-pointer ELEMENT owner`);
  assert.equal(String(document?.nodeNames?.[NODE_ID] || '').trim(), '', `BM-W2-05 node ${NODE_ID} must be unnamed in TARGET0`);
  return Object.freeze({
    nodeId: NODE_ID,
    parsedElementIndex: Number(binding.parsedElementIndex),
    end: String(binding.from) === NODE_ID ? 'FROM' : 'TO',
  });
}
function exactSifOwners(document, graph) {
  const record = document?.sifWriter1CEvidence?.byPointer?.[String(SIF_POINTER)];
  assert(record, `BM-W2-05 SIF pointer ${SIF_POINTER} required`);
  const edges = new Map((graph?.edges || []).map((edge) => [Number(edge.parsedElementIndex), edge]));
  const owners = [...(record.owners || [])].sort((a, b) => Number(a.parsedElementIndex) - Number(b.parsedElementIndex));
  assert.equal(owners.length, 1, `BM-W2-05 SIF pointer ${SIF_POINTER} must have exactly one owner`);
  for (const owner of owners) assert(edges.has(Number(owner.parsedElementIndex)), `BM-W2-05 missing graph owner ${owner.parsedElementIndex}`);
  return Object.freeze({ owners: Object.freeze(owners), edges });
}
function nodeCreateOperation(candidate) {
  return Object.freeze({
    operationId: 'BM-W2-05-NODENAME-CREATE-10',
    family: 'NODE_NAME', property: 'Node name / to-name', action: 'CREATE', status: 'PREVIEW_READY', scopeDecision: 'APPLY',
    policyAuthority: CII_WRITER_2_NODENAME_RELOCATION_POLICY, evidenceAuthority: 'CII_NODENAME_FIXED_LAYOUT', blockers: Object.freeze([]),
    sourceEvidence: Object.freeze({ identity: 'BM-W2-05-SOURCE-NODE-10', value: NODE_NAME, authority: 'CII_NODENAME_FIXED_LAYOUT' }),
    targetEvidence: Object.freeze({ identity: candidate.nodeId, value: '' }), before: '', proposed: NODE_NAME,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function sifDeleteOperations(selection) {
  return selection.owners.map((owner) => {
    const edge = selection.edges.get(Number(owner.parsedElementIndex));
    return Object.freeze({
      operationId: `BM-W2-05-SIF-DELETE-P${SIF_POINTER}-E${owner.parsedElementIndex}`,
      family: 'SIF_TEE', property: 'SIF/Tee record presence', action: 'DELETE', status: 'PREVIEW_READY', scopeDecision: 'APPLY',
      policyAuthority: CII_WRITER_2_SIF_DELETE_POLICY, evidenceAuthority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD', blockers: Object.freeze([]),
      sourceEvidence: Object.freeze({ identity: `BM-W2-05-SOURCE-${edge.elementId}`, value: false, authority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD' }),
      targetEvidence: Object.freeze({ identity: String(edge.elementId), value: true }), before: true, proposed: false,
      matchAuthority: Object.freeze({ status: 'REVIEWED' }),
    });
  });
}
function hangerDeleteOperation() {
  return Object.freeze({
    operationId: 'BM-W2-05-HANGER-DELETE-205',
    family: 'HANGER', property: 'Hanger presence', action: 'DELETE', status: 'PREVIEW_READY', scopeDecision: 'APPLY',
    policyAuthority: CII_WRITER_2_HANGER_DELETE_POLICY, evidenceAuthority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE', blockers: Object.freeze([]),
    sourceEvidence: Object.freeze({ identity: 'BM-W2-05-SOURCE-HANGER-205', value: false, authority: 'CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE' }),
    targetEvidence: Object.freeze({ identity: HANGER_NODE, value: true }), before: true, proposed: false,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function boundTransferPlan(targetDocument, operations) {
  const ids = Object.freeze(sortedIds(operations));
  return Object.freeze({
    status: 'PREVIEW_READY', blockers: Object.freeze([]), mutationAuthority: 'WRITER_2_COMPOSITE_CARDINALITY_CONDITIONAL',
    sourceDocument: Object.freeze({ fileName: 'BM-W2-05_CONTROLLED_SOURCE', contentSha256: SOURCE_SHA }),
    targetDocument: Object.freeze({ fileName: targetDocument.fileName, contentSha256: targetDocument.contentSha256 }),
    operations: Object.freeze(operations), excludedOperations: Object.freeze([]),
    policy: Object.freeze({ mixedCardinalityMutation: 'ONE_ORIGINAL_PREIMAGE_COMPOSITE' }),
    transferScope: Object.freeze({
      schema: 'CIIWorkspaceTransferScope.v1', mode: 'EXPLICIT_APPLY_EXCLUDE', status: 'BOUND', authority: 'USER_EXPLICIT_OPERATION_SCOPE',
      scopeId: 'BM-W2-05-TRIFAMILY-ONE-PREIMAGE', sourceSha256: SOURCE_SHA, targetSha256: targetDocument.contentSha256,
      candidateOperationIds: ids, appliedOperationIds: ids, excludedOperationIds: Object.freeze([]),
      appliedOperationCount: ids.length, excludedOperationCount: 0,
    }),
  });
}

const fixture = new Uint8Array(await readFile(new URL('../Benchmark/CIICompare/BM_CII_SOURCE.CII', import.meta.url)));
const before = await intakeCiiWorkspaceDocument(fixture, 'BM_CII_SOURCE.CII', { side: 'TARGET', cryptoRef: webcrypto });
const graph = adaptCiiDocumentToTopologyGraph(before);

assert.equal(before.summary?.neutralVersionMajor, 11);
assert.equal(before.parsed?.elements?.length, EXPECTED.elements);
assert.equal(before.nodeNameEvidence?.physicalCustody?.rowCount, EXPECTED.nodeNamesBefore);
assert.equal(before.sifWriter1CEvidence?.controlBlockCount, EXPECTED.sifBlocksBefore);
assert.equal(before.sifWriter1CEvidence?.sectionRowCount, EXPECTED.sifRowsBefore);
assert.equal(before.hangerEvidence?.count, EXPECTED.hangersBefore);
assert.deepEqual(before.hangerEvidence?.nodes, [HANGER_NODE]);
assert.equal(ciiPhysicalSectionRows(before.physicalFile, 'MISCEL_1').length, EXPECTED.miscelRowsBefore);

const nodeCandidate = exactNodeCreateCandidate(before);
const sifSelection = exactSifOwners(before, graph);
const operations = Object.freeze([
  nodeCreateOperation(nodeCandidate),
  ...sifDeleteOperations(sifSelection),
  hangerDeleteOperation(),
]);
const transferPlan = boundTransferPlan(before, operations);
const readiness = ciiWriter2CompositeReadiness(transferPlan, before, graph);
assert.equal(readiness.ready, true, readiness.blockers.join('|'));
assert.equal(readiness.familyMutationCounts.nodeName, 1);
assert.equal(readiness.familyMutationCounts.sifDelete, 1);
assert.equal(readiness.familyMutationCounts.hangerDelete, 1);
assert.equal(readiness.familyMutationCounts.restraintDelete, 0);
assert.equal(readiness.components.hangerDeleteAll?.compaction?.deleteAll, true);

const preview = Object.freeze({
  writerVersion: '2', targetDocument: before, transferPlan,
  correspondence: Object.freeze({ status: 'READY', authority: 'BM-W2-05_FROZEN_RETAINED_REAL_COORDINATES' }),
});
const lowLevel = applyCiiWriter2CompositeWithHangerDeleteAll({ targetDocument: before, targetGraph: graph, transferPlan });
assert.equal(lowLevel.status, 'APPLIED');
assert.equal(lowLevel.mode, 'ONE_ORIGINAL_PREIMAGE_COMPOSITE');
assert.equal(lowLevel.familyMutationCounts.nodeNameOperations, 1);
assert.equal(lowLevel.familyMutationCounts.sifDeleteOperations, 1);
assert.equal(lowLevel.familyMutationCounts.hangerDeleteOperations, 1);

const applied = await applyCiiWorkspaceTargetWriter2(preview, fixture, { cryptoRef: webcrypto });
assert.equal(applied.status, 'PASS');
assert.equal(applied.writer, 'WRITER_2');
assert.equal(applied.validation?.status, 'PASS');
assert.equal(applied.validation?.unexpectedSemanticDeltaCount, 0);
assert.equal(applied.byteString, lowLevel.byteString, 'public Writer2 output must equal the one-preimage composite result');

const after = await intakeCiiWorkspaceDocument(byteStringToBytes(applied.byteString), applied.fileName, { side: 'TARGET', cryptoRef: webcrypto });
assert.equal(after.parsed?.elements?.length, EXPECTED.elements);
assert.equal(after.nodeNames?.[NODE_ID], NODE_NAME);
assert.equal(after.nodeNameEvidence?.physicalCustody?.rowCount, EXPECTED.nodeNamesAfter);
assert.equal(after.sifWriter1CEvidence?.controlBlockCount, EXPECTED.sifBlocksAfter);
assert.equal(after.sifWriter1CEvidence?.sectionRowCount, EXPECTED.sifRowsAfter);
assert.equal(after.hangerEvidence?.count, EXPECTED.hangersAfter);
assert.deepEqual(after.hangerEvidence?.nodes, []);
assert.equal(ciiPhysicalSectionRows(after.physicalFile, 'MISCEL_1').length, EXPECTED.miscelRowsAfter);
assert.deepEqual(connectivity(after), connectivity(before), 'BM-W2-05 must preserve ELEMENT topology');
for (const owner of sifSelection.owners) {
  assert.equal(Number(after.sifWriter1CEvidence?.byParsedElementIndex?.[String(owner.parsedElementIndex)]?.pointer), 0,
    `BM-W2-05 SIF owner ${owner.parsedElementIndex} must relocate pointer 1 -> 0`);
}
assert.equal(validateCiiWriter2CompositeWithHangerRoundTrip(before, after, graph, transferPlan, lowLevel).status, 'PASS');

await assert.rejects(
  () => applyCiiWorkspaceTargetWriter2(preview, byteStringToBytes(applied.byteString), { cryptoRef: webcrypto }),
  /CII_WRITER_2_STALE_TARGET_HASH/,
  'BM-W2-05 replay against its own postimage must fail stale-target custody',
);
const headerToken = 'Data generated by CAESAR II/CADWorx/PIPE interface';
const tamperIndex = lowLevel.byteString.indexOf(headerToken);
assert(tamperIndex >= 0, 'BM-W2-05 retained header token required');
const tamperedString = `${lowLevel.byteString.slice(0, tamperIndex)}X${lowLevel.byteString.slice(tamperIndex + 1)}`;
const tampered = await intakeCiiWorkspaceDocument(byteStringToBytes(tamperedString), 'Tampered_BM-W2-05.CII', { side: 'TARGET', cryptoRef: webcrypto });
assert.throws(
  () => validateCiiWriter2CompositeWithHangerRoundTrip(before, tampered, graph, transferPlan, lowLevel),
  /EXACT_TRI_FAMILY_POSTIMAGE_MISMATCH/,
  'BM-W2-05 unrelated byte drift must fail complete-postimage validation',
);

console.log('CII Writer2 BM-W2-05 retained-real tri-family one-preimage benchmark passed.');

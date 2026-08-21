import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCiiPhysicalFile } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { extractCiiNodeNameEvidence } from '../tabs/cii-workspace/cii-workspace-nodename.js';
import { extractCiiWriter1CSifEvidence } from '../tabs/cii-workspace/cii-workspace-writer1c-sif-custody.js';
import {
  applyCiiWriter2CompositePlanContract, ciiWriter2CompositeReadiness,
} from '../tabs/cii-workspace/cii-workspace-writer2-composite-routing.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';
import {
  CII_WRITER_2_SIF_CREATE_BLOCKER, CII_WRITER_2_SIF_DELETE_POLICY,
} from '../tabs/cii-workspace/cii-workspace-writer2-sif-delete.js';

const WIDTHS = [15, 13, 13, 13, 13, 13];
function numericRow(values) { return values.map((value, index) => String(value ?? 0).padStart(WIDTHS[index], ' ')).join(''); }
function elementBlock(from, to, sifPointer, nodePointer) {
  const rows = Array.from({ length: 15 }, () => numericRow([0, 0, 0, 0, 0, 0]));
  rows[0] = numericRow([from, to, 0, 0, 0, 100]);
  rows[13] = numericRow([0, 0, 0, 0, sifPointer, nodePointer]);
  return rows;
}
function sifBlock() {
  return Array.from({ length: 10 }, (_, row) => numericRow([row + 1, row + 2, row + 3, row + 4, row + 5, row + 6]));
}
function fixtureDocument() {
  const body = [
    '#$ VERSION', numericRow([5, 11, 1256, 0, 0, 0]),
    '#$ CONTROL', numericRow([1, 0, 0, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 1, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    '#$ ELEMENTS', ...elementBlock(10, 20, 1, 0),
    '#$ NODENAME',
    '#$ SIF&TEES', ...sifBlock(),
    '#$ REDUCERS', numericRow([0, 0, 0, 0, 0, 0]),
  ].join('\r\n') + '\r\n';
  const physicalFile = createCiiPhysicalFile(new TextEncoder().encode(body));
  const parsed = Object.freeze({
    nodes: Object.freeze({ 10: Object.freeze({}), 20: Object.freeze({}) }),
    elements: Object.freeze([Object.freeze({ index: 0, from: 10, to: 20 })]),
  });
  const nodeNameEvidence = extractCiiNodeNameEvidence(physicalFile.text, parsed, { physicalFile });
  const sifWriter1CEvidence = extractCiiWriter1CSifEvidence(physicalFile.text, parsed, { physicalFile });
  return Object.freeze({ physicalFile, writer1CByteEligible: true, parsed, nodeNameEvidence,
    nodeNames: nodeNameEvidence.names, sifWriter1CEvidence });
}
function graph() {
  return Object.freeze({ edges: Object.freeze([Object.freeze({ elementId: 'E1', parsedElementIndex: 0, from: '10', to: '20' })]) });
}
function nodeCreate() {
  return Object.freeze({
    operationId: 'NODE-CREATE-20', family: 'NODE_NAME', property: 'Node name / to-name', action: 'COPY', status: 'PREVIEW_READY', blockers: Object.freeze([]),
    evidenceAuthority: 'CII_NODENAME_FIXED_LAYOUT', sourceEvidence: Object.freeze({ identity: 'SRC-20', value: 'P-20', authority: 'CII_NODENAME_FIXED_LAYOUT' }),
    targetEvidence: Object.freeze({ identity: '20', value: '' }), before: '', proposed: 'P-20', matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function sifPresence(id, source, target) {
  return Object.freeze({
    operationId: id, family: 'SIF_TEE', property: 'SIF/Tee record presence', action: source ? 'CREATE' : 'DELETE', status: 'BLOCKED',
    blockers: Object.freeze(['SIF_TEE_CARDINALITY_OR_SEMANTIC_REWRITE_REQUIRES_FUTURE_QUALIFICATION']), evidenceAuthority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD',
    sourceEvidence: Object.freeze({ identity: 'SRC-E1', value: source, authority: 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD' }),
    targetEvidence: Object.freeze({ identity: 'E1', value: target }), before: target, proposed: source, matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function rawPlan(operations, blockers = ['NO_TRANSFERABLE_PREVIEW_OPERATIONS']) {
  return Object.freeze({
    status: blockers.length ? 'BLOCKED' : 'PREVIEW_READY', blockers: Object.freeze(blockers), mutationAuthority: 'WRITER_1B_CONDITIONAL',
    sourceDocument: Object.freeze({ contentSha256: 'source' }), targetDocument: Object.freeze({ contentSha256: 'target' }),
    operations: Object.freeze(operations), policy: Object.freeze({ sifTeeMutation: 'BLOCKED_EXCEPT_WRITER_1C_V11_ITEM3_ITEM4' }),
  });
}
function bound(contracted, decisions = () => 'APPLY') {
  const operations = []; const excludedOperations = [];
  for (const operation of contracted.operations) {
    if (operation.action === 'KEEP') { operations.push(Object.freeze({ ...operation, scopeDecision: 'KEEP' })); continue; }
    if (decisions(operation) === 'APPLY') operations.push(Object.freeze({ ...operation, scopeDecision: 'APPLY' }));
    else excludedOperations.push(Object.freeze({ ...operation, scopeDecision: 'EXCLUDE' }));
  }
  return Object.freeze({ ...contracted, status: 'PREVIEW_READY', blockers: Object.freeze([]), operations: Object.freeze(operations),
    excludedOperations: Object.freeze(excludedOperations), transferScope: Object.freeze({ status: 'BOUND' }) });
}

{
  const routed = applyCiiWriter2CompositePlanContract(rawPlan([nodeCreate(), sifPresence('SIF-DELETE-E1', false, true)]));
  assert.equal(routed.status, 'PREVIEW_READY');
  assert.equal(routed.summary.writer2CompositeMutationCount, 2);
  assert.equal(routed.summary.nodeNameMutationCount, 1);
  assert.equal(routed.summary.sifDeleteMutationCount, 1);
  const node = routed.operations.find((item) => item.operationId === 'NODE-CREATE-20');
  const sif = routed.operations.find((item) => item.operationId === 'SIF-DELETE-E1');
  assert.equal(node.action, 'CREATE'); assert.equal(node.policyAuthority, CII_WRITER_2_NODENAME_RELOCATION_POLICY);
  assert.equal(sif.action, 'DELETE'); assert.equal(sif.status, 'PREVIEW_READY'); assert.equal(sif.policyAuthority, CII_WRITER_2_SIF_DELETE_POLICY);
  assert(!routed.blockers.includes('NO_TRANSFERABLE_PREVIEW_OPERATIONS'));
  assert.equal(routed.policy.mixedCardinalityMutation, 'ONE_ORIGINAL_PREIMAGE_COMPOSITE');

  const before = fixtureDocument();
  const unbound = ciiWriter2CompositeReadiness(routed, before, graph());
  assert.equal(unbound.ready, false);
  assert(unbound.blockers.includes('WRITER_2_COMPOSITE_BOUND_TRANSFER_SCOPE_REQUIRED'));
  const ready = ciiWriter2CompositeReadiness(bound(routed), before, graph());
  assert.equal(ready.ready, true, ready.blockers.join('|'));
  assert.equal(ready.mutationCount, 2);
  assert.deepEqual(ready.familyMutationCounts, { nodeName: 1, sifDelete: 1 });
  assert.equal(ready.components.nodeName.appendedRows[0].toName, 'P-20');
  assert.equal(ready.components.sifDelete.blockCountAfter, 0);
}

{
  const routed = applyCiiWriter2CompositePlanContract(rawPlan([nodeCreate(), sifPresence('SIF-CREATE-E1', true, false)]));
  assert.equal(routed.status, 'PREVIEW_READY', 'blocked SIF CREATE may coexist with an independently transferable NODENAME operation');
  const create = routed.operations.find((item) => item.operationId === 'SIF-CREATE-E1');
  assert.equal(create.action, 'CREATE'); assert.equal(create.status, 'BLOCKED');
  assert(create.blockers.includes(CII_WRITER_2_SIF_CREATE_BLOCKER));
  const readiness = ciiWriter2CompositeReadiness(bound(routed), fixtureDocument(), graph());
  assert.equal(readiness.ready, false);
  assert(readiness.blockers.includes(CII_WRITER_2_SIF_CREATE_BLOCKER));
}

{
  const process = Object.freeze({ operationId: 'PROCESS-P3', family: 'PROCESS', property: 'P3', action: 'COPY', status: 'PREVIEW_READY', blockers: Object.freeze([]),
    sourceEvidence: Object.freeze({ value: 10 }), targetEvidence: Object.freeze({ value: 5 }), before: 5, proposed: 10, matchAuthority: Object.freeze({ status: 'REVIEWED' }) });
  const routed = applyCiiWriter2CompositePlanContract(rawPlan([nodeCreate(), process], []));
  assert.equal(routed.status, 'PREVIEW_READY');
  const blockedProcess = routed.operations.find((item) => item.operationId === 'PROCESS-P3');
  assert.equal(blockedProcess.action, 'BLOCKED');
  const readiness = ciiWriter2CompositeReadiness(bound(routed), fixtureDocument(), graph());
  assert.equal(readiness.ready, false);
  assert(readiness.blockers.includes('WRITER_2_COMPOSITE_UNSUPPORTED_APPLY:PROCESS-P3'));
}

{
  const core = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-core.js', import.meta.url), 'utf8');
  const scope = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope.js', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope-ui.js', import.meta.url), 'utf8');
  const tab = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
  assert(core.includes("['1A', '1B', '1C', '2']"));
  assert(core.includes("? options.writerVersion : '1B'"), 'production default must remain Writer 1B');
  assert(core.includes("if (version === '2') {\n    engineeringDeltas = baseDeltas;"), 'Writer 2 must not inherit Writer1B/1C augmentation families');
  assert(core.includes('applyCiiWriter2CompositePlanContract(rawTransferPlan)'));
  assert(core.includes('ciiWriter2CompositeReadiness(plan, targetDocument, targetGraph)'));
  assert(core.includes('applyCiiWriter2Composite({ targetDocument: currentTarget, targetGraph, transferPlan: preview.transferPlan })'));
  assert(core.includes('validateCiiWriter2CompositeRoundTrip(currentTarget, modifiedTarget, targetGraph, preview.transferPlan, writerResult)'));
  assert(!core.includes('applyCiiWriter2NodeNameRelocation({ targetDocument: currentTarget'));
  assert(!core.includes('validateCiiWriter2NodeNameRoundTrip(currentTarget, modifiedTarget'));
  assert(scope.includes('ciiWriter2CompositeReadiness(transferPlan, preview.targetDocument, targetGraph)'));
  assert(scope.includes('adaptCiiDocumentToTopologyGraph(preview.targetDocument)'));
  assert(ui.includes('applyCiiWorkspaceTargetWriter2'));
  assert(ui.includes("['WRITER_1C', 'WRITER_2'].includes(applied?.writer)"));
  assert(tab.includes('mountCiiWorkspaceScopedEngineeringShell'));
  assert(!tab.includes("writerVersion: '2'"), 'product tile must not silently switch the default to Writer 2');
}

console.log('Writer 2 product routing admits qualified NODENAME + V11 SIF DELETE through one-preimage composite only.');

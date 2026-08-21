import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCiiPhysicalFile } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { extractCiiNodeNameEvidence } from '../tabs/cii-workspace/cii-workspace-nodename.js';
import {
  applyCiiWriter2NodeNamePlanContract, ciiWriter2NodeNameReadiness,
} from '../tabs/cii-workspace/cii-workspace-writer2-routing.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from '../tabs/cii-workspace/cii-workspace-writer2-nodename-relocation.js';

const WIDTHS = [15, 13, 13, 13, 13, 13];
function numericRow(values) { return values.map((value, index) => String(value ?? 0).padStart(WIDTHS[index], ' ')).join(''); }
function elementBlock(from, to, pointer) {
  const rows = Array.from({ length: 15 }, () => numericRow([0, 0, 0, 0, 0, 0]));
  rows[0] = numericRow([from, to, 0, 0, 0, 100]);
  rows[13] = numericRow([0, 0, 0, 0, 0, pointer]);
  return rows;
}
function operation({ id, family = 'NODE_NAME', property = 'Node name / to-name', source = '', target = '', action = 'COPY', status = 'PREVIEW_READY', blockers = [], evidenceAuthority = 'CII_NODENAME_FIXED_LAYOUT' }) {
  return Object.freeze({
    operationId: id, family, property, action, status, blockers: Object.freeze(blockers), evidenceAuthority,
    sourceEvidence: Object.freeze({ identity: '20', value: source, authority: evidenceAuthority }),
    targetEvidence: Object.freeze({ identity: '20', value: target }), before: target, proposed: source,
    matchAuthority: Object.freeze({ status: 'REVIEWED' }),
  });
}
function rawPlan(operations, blockers = []) {
  return Object.freeze({
    status: blockers.length ? 'BLOCKED' : 'PREVIEW_READY', blockers: Object.freeze(blockers),
    mutationAuthority: 'WRITER_1B_CONDITIONAL',
    sourceDocument: Object.freeze({ contentSha256: 'source' }), targetDocument: Object.freeze({ contentSha256: 'target' }),
    operations: Object.freeze(operations), policy: Object.freeze({ processDefault: 'WRITER_1B_EXACT_FIXED_FIELDS_ONLY' }),
  });
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'CREATE-20', source: 'P-20', target: '' }),
  ]));
  assert.equal(routed.status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].action, 'CREATE');
  assert.equal(routed.operations[0].status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].policyAuthority, CII_WRITER_2_NODENAME_RELOCATION_POLICY);
  assert.equal(routed.policy.nodeNameMutation, 'CREATE_DELETE_RELOCATION_ONLY');
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'DELETE-20', source: '', target: 'P-20', action: 'DELETE', status: 'BLOCKED', blockers: ['NODE_NAME_DELETE_REQUIRES_EXPLICIT_POLICY'] }),
  ], ['NO_TRANSFERABLE_PREVIEW_OPERATIONS']));
  assert.equal(routed.status, 'PREVIEW_READY');
  assert.equal(routed.operations[0].action, 'DELETE');
  assert.equal(routed.operations[0].status, 'PREVIEW_READY');
  assert(!routed.blockers.includes('NO_TRANSFERABLE_PREVIEW_OPERATIONS'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'OVERWRITE-20', source: 'NEW', target: 'OLD', status: 'BLOCKED', blockers: ['TARGET_NODENAME_NONBLANK'] }),
  ]));
  assert.equal(routed.status, 'BLOCKED');
  assert.equal(routed.operations[0].action, 'BLOCKED');
  assert(routed.operations[0].blockers.includes('WRITER_2_NODENAME_OVERWRITE_USE_WRITER_1C'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'P3', family: 'PROCESS', property: 'P3', source: 10, target: 5, evidenceAuthority: 'PROTECTED_WRITER_ELEMENT_ROW4_P3_FIXED_FIELD' }),
  ]));
  assert.equal(routed.status, 'BLOCKED');
  assert.equal(routed.operations[0].action, 'BLOCKED');
  assert(routed.operations[0].blockers.includes('WRITER_2_PHASE1_NODENAME_ONLY'));
}

{
  const routed = applyCiiWriter2NodeNamePlanContract(rawPlan([
    operation({ id: 'CREATE-20', source: 'P-20', target: '' }),
  ], ['CORRESPONDENCE_NOT_READY']));
  assert.equal(routed.status, 'BLOCKED');
  assert(routed.blockers.includes('CORRESPONDENCE_NOT_READY'));
}

{
  const body = [
    '#$ CONTROL', numericRow([1, 0, 0, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    numericRow([0, 0, 0, 0, 0, 0]), numericRow([0, 0, 0, 0, 0, 0]),
    '#$ ELEMENTS', ...elementBlock(10, 20, 0), '#$ NODENAME', '#$ BEND',
  ].join('\r\n');
  const physicalFile = createCiiPhysicalFile(new TextEncoder().encode(body));
  const parsed = Object.freeze({ nodes: Object.freeze({ 10: Object.freeze({}), 20: Object.freeze({}) }),
    elements: Object.freeze([Object.freeze({ index: 0, from: 10, to: 20 })]) });
  const nodeNameEvidence = extractCiiNodeNameEvidence(physicalFile.text, parsed, { physicalFile });
  const targetDocument = Object.freeze({ physicalFile, writer1CByteEligible: true, nodeNameEvidence, nodeNames: Object.freeze({}) });
  const contracted = applyCiiWriter2NodeNamePlanContract(rawPlan([operation({ id: 'CREATE-20', source: 'P-20', target: '' })]));
  const unbound = ciiWriter2NodeNameReadiness(contracted, targetDocument);
  assert.equal(unbound.ready, false);
  assert(unbound.blockers.includes('WRITER_2_NODENAME_BOUND_TRANSFER_SCOPE_REQUIRED'));
  const bound = Object.freeze({ ...contracted, transferScope: Object.freeze({ status: 'BOUND' }),
    operations: Object.freeze(contracted.operations.map((item) => Object.freeze({ ...item, scopeDecision: 'APPLY' }))) });
  const ready = ciiWriter2NodeNameReadiness(bound, targetDocument);
  assert.equal(ready.ready, true);
  assert.equal(ready.mutationCount, 1);
  assert.equal(ready.relocationPlan.appendedRows[0].toName, 'P-20');
}

{
  const core = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-core.js', import.meta.url), 'utf8');
  const scope = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope.js', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-transfer-scope-ui.js', import.meta.url), 'utf8');
  const tab = fs.readFileSync(new URL('../tabs/cii-workspace/cii-workspace-tab.js', import.meta.url), 'utf8');
  assert(core.includes("['1A', '1B', '1C', '2']"));
  assert(core.includes('applyCiiWorkspaceTargetWriter2'));
  assert(core.includes("version === '2' ? applyCiiWriter2NodeNamePlanContract"));
  assert(core.includes("['1C', '2'].includes(version)"));
  assert(scope.includes("preview?.writerVersion === '2'"));
  assert(scope.includes("['1A', '1B', '1C', '2']"));
  assert(ui.includes('applyCiiWorkspaceTargetWriter2'));
  assert(ui.includes("['WRITER_1C', 'WRITER_2'].includes(applied?.writer)"));
  assert(tab.includes('...(context.writerVersion ? { writerVersion: context.writerVersion } : {})'));
}

console.log('Writer 2 product/core routing remains NODENAME-cardinality-only and scope bound.');

import assert from 'node:assert/strict';
import {
  createRevisionCompareTransferDraft, createRevisionCompareTransferSelectionFromDraft,
  deriveRevisionCompareTransferCandidates, updateRevisionCompareTransferDraft,
} from '../tabs/revision-compare/revision-transfer-controller.js';
import { revisionCompareTransferMarkup } from '../tabs/revision-compare/revision-transfer-view.js';

const sourceId = 'record:A:doc:A:$.branches[0].children[0]';
const targetId = 'record:B:doc:B:$.branches[0].children[0]';
const sourceEntity = Object.freeze({ entityId: sourceId, canonicalPath: '/branches/0/children/0' });
const targetEntity = Object.freeze({ entityId: targetId, canonicalPath: '/branches/0/children/0' });
function property(propertyKey, revAValue, revBValue, target = true) {
  return Object.freeze({
    propertyKey, revAValue, revBValue,
    revAEvidencePath: `$.branches[0].children[0].${propertyKey}`,
    revBEvidencePath: target ? `$.branches[0].children[0].${propertyKey}` : null,
  });
}
const rows = Object.freeze([
  Object.freeze({
    differenceId: 'difference:eligible', differenceCategory: 'CHANGED', matchCertainty: 'EXACT',
    sourceRecordId: sourceId, targetRecordId: targetId,
    changedProperties: Object.freeze([
      property('description', '<script>donor</script>', 'old'),
      property('id', 'new-id', 'old-id'), property('supportType', 'GUIDE', 'STOP'),
    ]),
  }),
  Object.freeze({
    differenceId: 'difference:unreviewed', differenceCategory: 'CHANGED', matchCertainty: 'EXACT',
    sourceRecordId: sourceId, targetRecordId: targetId,
    changedProperties: Object.freeze([property('material', 'CS', 'SS')]),
  }),
  Object.freeze({
    differenceId: 'difference:ambiguous', differenceCategory: 'REMOVED', matchCertainty: 'AMBIGUOUS',
    sourceRecordId: sourceId, targetRecordId: null,
    changedProperties: Object.freeze([property('rating', 150, null, false)]),
  }),
]);
const state = Object.freeze({
  basisStatus: 'CURRENT',
  slots: Object.freeze({
    baseline: Object.freeze({ jsonSnapshot: Object.freeze({ entityIndex: Object.freeze([sourceEntity]) }) }),
    candidate: Object.freeze({ jsonSnapshot: Object.freeze({ entityIndex: Object.freeze([targetEntity]) }) }),
  }),
  compare: Object.freeze({ audit: Object.freeze({ validation: Object.freeze({ status: 'READY' }), differenceRows: rows }) }),
  review: Object.freeze({ session: Object.freeze({
    status: 'CURRENT', items: Object.freeze([
      Object.freeze({ differenceId: 'difference:eligible', reviewState: 'REVIEWED' }),
      Object.freeze({ differenceId: 'difference:unreviewed', reviewState: 'UNREVIEWED' }),
      Object.freeze({ differenceId: 'difference:ambiguous', reviewState: 'REVIEWED' }),
    ]),
  }) }),
  decision: Object.freeze({ ledger: Object.freeze({
    status: 'CURRENT', decisions: Object.freeze([
      Object.freeze({ differenceId: 'difference:ambiguous', decisionState: 'UNDECIDED' }),
    ]),
  }) }),
  transfer: Object.freeze({ status: 'IDLE', request: null, applyRequest: null, plan: null, result: null, error: null }),
});

const candidates = deriveRevisionCompareTransferCandidates(state);
assert.equal(Object.isFrozen(candidates), true);
const eligible = candidates.find((candidate) => candidate.differenceId === 'difference:eligible');
assert.equal(eligible.eligible, true);
assert.equal(eligible.fields.find((field) => field.propertyKey === 'description').eligible, true);
assert.equal(eligible.fields.find((field) => field.propertyKey === 'id').policy.classification, 'PROTECTED');
assert.equal(eligible.fields.find((field) => field.propertyKey === 'supportType').policy.classification, 'CONTROLLED');
assert.equal(candidates.find((candidate) => candidate.differenceId === 'difference:unreviewed').eligible, false);
assert.match(candidates.find((candidate) => candidate.differenceId === 'difference:ambiguous').blockers.join(' '), /UNDECIDED|ACCEPTED_CANDIDATE/);

let draft = createRevisionCompareTransferDraft();
draft = updateRevisionCompareTransferDraft(draft, candidates, { kind: 'PAIR', differenceId: eligible.differenceId, checked: true });
assert.equal(draft.pairs.length, 1); assert.equal(draft.pairs[0].fieldKeys.length, 0);
assert.equal(createRevisionCompareTransferSelectionFromDraft(draft, candidates), null, 'pair selection alone is not field intent');
const description = eligible.fields.find((field) => field.propertyKey === 'description');
draft = updateRevisionCompareTransferDraft(draft, candidates, { kind: 'FIELD', differenceId: eligible.differenceId, fieldKey: description.fieldKey, checked: true });
const selection = createRevisionCompareTransferSelectionFromDraft(draft, candidates);
assert.equal(selection.schema, 'RevisionCompareTransferSelection.v1');
assert.equal(selection.items.length, 1); assert.equal(selection.items[0].fields.length, 1);
assert.equal(selection.items[0].fields[0].targetFieldPath, '/description');
assert.equal(Object.isFrozen(selection), true); assert.throws(() => selection.items.push('x'), TypeError);

const model = Object.freeze({ candidates, draft, counts: Object.freeze({ pairCount: 1, fieldCount: 1 }) });
const markup = revisionCompareTransferMarkup(state, model);
for (const selector of [
  'data-revc-transfer-section', 'data-revc-transfer-status', 'data-revc-transfer-direction',
  'data-revc-transfer-eligible-count', 'data-revc-transfer-selection-count',
  'data-revc-transfer-pair', 'data-revc-transfer-field', 'data-revc-create-transfer-plan',
  'data-revc-apply-transfer',
]) assert.match(markup, new RegExp(selector));
assert.match(markup, /Rev A — donor/); assert.match(markup, /Rev B — receiver/);
assert.match(markup, /Create transfer plan/); assert.match(markup, /Apply transfer plan/);
assert.doesNotMatch(markup, /<script>donor<\/script>/); assert.match(markup, /&lt;script&gt;donor&lt;\/script&gt;/);
assert.doesNotMatch(markup, /Import evidence package|Resume archived review evidence/);
console.log('revision-compare-transfer-workspace.test.mjs passed');

const { createRevisionCompareTransferController } = await import('../tabs/revision-compare/revision-transfer-controller.js');
let controllerState = structuredClone(state); controllerState.transfer = { ...controllerState.transfer };
const calls = []; let renderCount = 0;
const readyPlan = Object.freeze({
  schema: 'RevisionCompareTransferPlan.v1', planId: 'revision-transfer-plan:plan', contentSha256: 'a'.repeat(64),
  status: 'READY', selection, direction: 'REV_A_TO_REV_B', operations: Object.freeze([]), blockers: Object.freeze([]),
  summary: Object.freeze({ selectedItemCount: 1, operationCount: 0, readyOperationCount: 0, blockedOperationCount: 0, replaceExistingCount: 0, addMissingCount: 0 }),
});
const application = Object.freeze({ result: Object.freeze({ resultId: 'revision-transfer-result:1' }), audit: {}, proof: {}, manifest: {}, artifacts: Object.freeze([]), patchedSnapshot: {} });
const controller = createRevisionCompareTransferController({
  root: {}, cryptoRef: globalThis.crypto, now: () => '2026-07-24T12:00:00.000Z',
  readState: () => controllerState, writeState: (next) => { controllerState = next; }, render: () => { renderCount += 1; },
  reportFailure: (error) => { throw error; }, dependencies: {
    setSelection: (current, nextSelection) => ({ ...current, transfer: { ...current.transfer, selection: nextSelection } }),
    startPlan: (current, nextSelection) => { calls.push('startPlan'); return { ...current, transfer: { ...current.transfer, selection: nextSelection, requestGeneration: 1, request: { generation: 1 } } }; },
    createPlan: async () => { calls.push('createPlan'); return readyPlan; },
    completePlan: (current) => { calls.push('completePlan'); return { ...current, transfer: { ...current.transfer, status: 'PLANNED', plan: readyPlan, request: null } }; },
    failPlan: (current) => current,
    startApply: (current, createdAt) => { calls.push(`startApply:${createdAt}`); return { ...current, transfer: { ...current.transfer, status: 'APPLYING', applyGeneration: 1, applyRequest: { generation: 1, createdAt } } }; },
    createApplication: async () => { calls.push('createApplication'); return application; },
    completeApply: (current) => { calls.push('completeApply'); return { ...current, transfer: { ...current.transfer, status: 'APPLIED', result: application.result, applyRequest: null } }; },
    failApply: (current) => current,
  },
});
controller.handleChange({ dataset: { revcTransferPair: eligible.differenceId }, checked: true });
controller.handleChange({ dataset: { revcTransferField: description.fieldKey, revcTransferDifferenceId: eligible.differenceId }, checked: true });
await controller.handleClick({ hasAttribute: (name) => name === 'data-revc-create-transfer-plan' });
assert.deepEqual(calls.slice(0, 3), ['startPlan', 'createPlan', 'completePlan']); assert.equal(controllerState.transfer.status, 'PLANNED');
await controller.handleClick({ hasAttribute: (name) => name === 'data-revc-apply-transfer' });
assert.deepEqual(calls.slice(3), ['startApply:2026-07-24T12:00:00.000Z', 'createApplication', 'completeApply']);
assert.equal(controllerState.transfer.status, 'APPLIED'); assert(renderCount >= 4); controller.destroy();

const { readFile } = await import('node:fs/promises');
for (const path of [
  '../tabs/revision-compare/revision-transfer-controller.js', '../tabs/revision-compare/revision-transfer-view.js',
  '../tabs/revision-compare/revision-transfer-workspace-bindings.js',
]) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  assert(source.trimEnd().split('\n').length < 300, `${path} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default|xml-compare\/|tabs\/xml-compare-tab|DOMParser|revision-compare-viewer|viewerAdapter|THREE|Math\.random|Date\.now/);
}
const workspaceStateSource = await readFile(new URL('../tabs/revision-compare/revision-workspace-state.js', import.meta.url), 'utf8');
assert.match(workspaceStateSource, /RevisionCompareWorkspaceState\.v10/);
assert.match(workspaceStateSource, /transferLifecycleChange/);
const signOffSource = await readFile(new URL('../tabs/revision-compare/revision-sign-off.js', import.meta.url), 'utf8');
assert.match(signOffSource, /does not cover transfer intent, plans, or patched target output/);
const shellSource = await readFile(new URL('../tabs/revision-compare/revision-compare-workspace.js', import.meta.url), 'utf8');
assert.match(shellSource, /createRevisionCompareTransferWorkspaceBindings/);
assert.doesNotMatch(shellSource, /applyTransferPlan|xml-compare\//);

const mainViewSource = await readFile(new URL('../tabs/revision-compare/revision-compare-view.js', import.meta.url), 'utf8');
assert.doesNotMatch(mainViewSource, /data-revc-evidence-package-import/);

import assert from 'node:assert/strict';
import { deepFreeze } from '../tabs/revision-compare/revision-contract-utils.js';
import {
  clearRevisionCompareHandoverInspection, completeRevisionCompareHandoverInspection,
  createRevisionCompareHandoverInspectionState, failRevisionCompareHandoverInspection,
  startRevisionCompareHandoverInspection,
} from '../tabs/revision-compare/revision-transfer-handover-inspection-state.js';
import {
  adoptRevisionCompareHandoverInspectionWorkspace, revisionCompareHandoverInspectionLocksAuthority,
  revisionCompareHandoverInspectionReadiness, revisionCompareWorkspaceIsFreshForHandoverInspection,
  setWorkspaceHandoverInspection,
} from '../tabs/revision-compare/revision-transfer-handover-inspection-workspace-state.js';
import { handoverInspectionFixture } from './revision-compare-transfer-handover-inspection-fixtures.mjs';

const fixture = await handoverInspectionFixture();
function freshWorkspace() {
  return deepFreeze({
    schema: 'RevisionCompareWorkspaceState.v13', session: { documents: {} },
    slots: { baseline: { status: 'EMPTY' }, candidate: { status: 'EMPTY' } },
    compare: { status: 'IDLE' }, review: { session: null }, decision: { ledger: null },
    evidencePackageImport: { status: 'IDLE' }, transfer: { request: null, applyRequest: null,
      plan: null, result: null, patchedSnapshot: null }, transferCompletion: { report: null },
    transferArchive: { artifact: null },
  });
}

const adopted = adoptRevisionCompareHandoverInspectionWorkspace(freshWorkspace());
assert.equal(adopted.schema, 'RevisionCompareWorkspaceState.v14');
assert.equal(adopted.handoverInspection.status, 'IDLE');
assert.equal(revisionCompareWorkspaceIsFreshForHandoverInspection(adopted), true);
assert.equal(adoptRevisionCompareHandoverInspectionWorkspace(adopted), adopted);

const initial = createRevisionCompareHandoverInspectionState();
const importing = startRevisionCompareHandoverInspection(initial, { name: 'one.json', size: 100 });
assert.equal(importing.status, 'IMPORTING'); assert.equal(importing.requestGeneration, 1);
const verified = completeRevisionCompareHandoverInspection(importing, 1, fixture.bundle);
assert.equal(verified.status, 'VERIFIED'); assert.equal(verified.bundle, fixture.bundle);
assert.equal(verified.evidencePackageContentSha256, fixture.bundle.payload.evidencePackage.contentSha256);
assert.equal(verified.originalTargetDocumentId, fixture.bundle.payload.transferResult.targetDocumentId);
assert.equal(Object.isFrozen(verified), true);
assert.equal(startRevisionCompareHandoverInspection(verified, { name: 'two.json', size: 100 }), verified);
assert.equal(revisionCompareHandoverInspectionLocksAuthority({ handoverInspection: verified }), true);

const staleComplete = completeRevisionCompareHandoverInspection(importing, 2, fixture.bundle);
assert.equal(staleComplete, importing);
const failed = failRevisionCompareHandoverInspection(importing, 1, new Error('invalid'));
assert.equal(failed.status, 'FAILED'); assert.equal(failed.bundle, null);
assert.equal(failed.bundleId, null); assert.equal(failed.error, 'invalid');
assert.equal(failRevisionCompareHandoverInspection(importing, 2, new Error('late')), importing);
const cleared = clearRevisionCompareHandoverInspection(verified);
assert.equal(cleared.status, 'IDLE'); assert.equal(cleared.bundle, null);
assert.equal(cleared.requestGeneration, verified.requestGeneration + 1);

const importingWorkspace = setWorkspaceHandoverInspection(adopted, importing);
assert.equal(revisionCompareHandoverInspectionReadiness(importingWorkspace).status, 'BLOCKED');
assert.equal(revisionCompareHandoverInspectionReadiness(importingWorkspace, { allowImportSupersede: true }).status, 'READY');
const verifiedWorkspace = setWorkspaceHandoverInspection(adopted, verified);
assert.equal(revisionCompareHandoverInspectionReadiness(verifiedWorkspace).blockers[0],
  'Clear the verified handover inspection before importing another file.');
const presentation = deepFreeze({ ...verifiedWorkspace, compare: { ...verifiedWorkspace.compare,
  presentationMode: 'side-by-side', queue: { search: 'x' } } });
assert.equal(presentation.handoverInspection.bundle, verified.bundle);
assert.equal(presentation.handoverInspection.status, 'VERIFIED');

const blockers = [
  ['baseline document', (state) => { state.slots.baseline.document = {}; }],
  ['candidate document', (state) => { state.slots.candidate.document = {}; }],
  ['session source', (state) => { state.session.documents.baseline = {}; }],
  ['basis', (state) => { state.basis = {}; }],
  ['audit', (state) => { state.compare.audit = {}; }],
  ['review', (state) => { state.review.session = {}; }],
  ['decision', (state) => { state.decision.ledger = {}; }],
  ['plan', (state) => { state.transfer.plan = {}; }],
  ['result', (state) => { state.transfer.result = {}; }],
  ['patched snapshot', (state) => { state.transfer.patchedSnapshot = {}; }],
  ['completion', (state) => { state.transferCompletion.report = {}; }],
  ['archive', (state) => { state.transferArchive.artifact = {}; }],
  ['source load', (state) => { state.slots.baseline.status = 'LOADING'; }],
  ['comparison', (state) => { state.compare.status = 'COMPARING'; }],
  ['package import', (state) => { state.evidencePackageImport.status = 'IMPORTING'; }],
  ['review import', (state, activity) => { activity.reviewImportBusy = true; }],
  ['decision import', (state, activity) => { activity.decisionImportBusy = true; }],
  ['plan request', (state) => { state.transfer.request = {}; }],
  ['apply request', (state) => { state.transfer.applyRequest = {}; }],
  ['completion busy', (state, activity) => { activity.completionBusy = true; }],
  ['archive busy', (state, activity) => { activity.archiveBusy = true; }],
];
for (const [label, mutate] of blockers) {
  const state = structuredClone(adopted); const activity = {}; mutate(state, activity);
  const readiness = revisionCompareHandoverInspectionReadiness(state, activity);
  assert.equal(readiness.status, 'BLOCKED', label); assert.equal(readiness.blockers.length, 1, label);
}

const before = structuredClone(fixture.workspace);
const inspectionOnly = setWorkspaceHandoverInspection(adoptRevisionCompareHandoverInspectionWorkspace(fixture.workspace), verified);
assert.deepEqual(inspectionOnly.transfer, before.transfer);
assert.deepEqual(inspectionOnly.transferCompletion, before.transferCompletion);
assert.deepEqual(inspectionOnly.transferArchive, before.transferArchive);
console.log('revision-compare-transfer-handover-inspection-lifecycle.test.mjs passed');

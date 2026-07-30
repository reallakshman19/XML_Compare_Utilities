import assert from 'node:assert/strict';
import {
  SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS,
  SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY,
  assertSequentialDraftEdit3dOperatorWalkthroughProtocol,
  assertSequentialDraftEdit3dOperatorWalkthroughRecord,
  assertSequentialDraftEdit3dOperatorWalkthroughWorksheet,
  createSequentialDraftEdit3dOperatorWalkthroughProtocol,
  createSequentialDraftEdit3dOperatorWalkthroughRecord,
  createSequentialDraftEdit3dOperatorWalkthroughWorksheet,
  sequentialDraftEdit3dOperatorWalkthroughWorksheetFileName,
  validateSequentialDraftEdit3dOperatorWalkthroughRecord,
  validateSequentialDraftEdit3dOperatorWalkthroughWorksheet,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-operator-walkthrough.js';
import {
  SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES,
  createSequentialDraftEdit3dReleaseManifest,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createSequentialConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { createSequentialCommandJournalState } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js';
import { sequentialSemanticFingerprint } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js';

function releaseInput(adoptedAt = '2026-07-30T02:30:00.000Z') {
  const registry = createSequentialBranchWorkspaceRegistry();
  registry.reset(['BRANCH-A']);
  registry.save('BRANCH-A', { session: createSequentialConstructionSession('BRANCH-A') });
  const journalState = createSequentialCommandJournalState({
    documentId: 'DOC-WALK', sessionId: 'SESSION-WALK', sourceFingerprint: 'SOURCE-WALK',
    branchSetFingerprint: 'BRANCH-SET-WALK', branchRegistry: registry, adoptedAt,
  });
  return {
    controllerSchema: 'SequentialScopedEdit3dController.v1',
    controllerState: {
      available: true, mounted: true, active: true, mountKey: 'MOUNT-WALK',
      failureCount: 0, destroyed: false, viewerState: { runtimeError: null },
      commandGateway: { allowedCommandTypes: SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES.supervisedCommands },
    },
    shadowEvidence: {
      schema: 'SequentialScopedEditProductionShadowEvidence.v1', mountKey: 'MOUNT-WALK',
    },
    commandState: {
      sourceFingerprint: 'SOURCE-WALK', session: { rootBranchId: 'BRANCH-A' }, journalState,
    },
    supportState: {},
    geometryState: { geometryEditJournal: { headFingerprint: 'GEOMETRY-WALK', entries: [] } },
    view: {
      readModel: {
        schema: 'SequentialEffectiveGeometryReadModel.v1', branchId: 'BRANCH-A',
        authorityId: 'AUTH-WALK', revision: { token: 'REV-WALK' },
      },
      scene: { schema: 'EngineeringScene.v1', sceneId: 'SCENE-WALK', entities: [{ id: 'E1' }] },
    },
  };
}
function allPassResults() {
  return SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS.map((stepId) => ({
    stepId, result: 'PASS', observation: null,
  }));
}
function refingerprint(value, field, prefix) {
  const base = { ...value };
  delete base[field];
  value[field] = sequentialSemanticFingerprint(prefix, base);
}

const protocol = createSequentialDraftEdit3dOperatorWalkthroughProtocol();
const repeatedProtocol = createSequentialDraftEdit3dOperatorWalkthroughProtocol();
assert.equal(protocol.schema, 'SequentialDraftEdit3dOperatorWalkthroughProtocol.v1');
assert.equal(protocol.stepCount, 12);
assert.deepEqual(protocol.steps.map((step) => step.stepId), SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS);
assert.equal(new Set(SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS).size, 12);
assert.equal(JSON.stringify(repeatedProtocol), JSON.stringify(protocol));
assert.equal(Object.isFrozen(protocol), true);
assert.deepEqual(assertSequentialDraftEdit3dOperatorWalkthroughProtocol(structuredClone(protocol)), protocol);

const manifest = createSequentialDraftEdit3dReleaseManifest(releaseInput());
const worksheet = createSequentialDraftEdit3dOperatorWalkthroughWorksheet(manifest);
const repeatedWorksheet = createSequentialDraftEdit3dOperatorWalkthroughWorksheet(manifest);
assert.equal(worksheet.schema, 'SequentialDraftEdit3dOperatorWalkthroughWorksheet.v1');
assert.equal(worksheet.status, 'PENDING_OPERATOR_EXECUTION');
assert.equal(worksheet.releaseManifest.manifestFingerprint, manifest.manifestFingerprint);
assert.equal(worksheet.releaseManifest.branchId, 'BRANCH-A');
assert.equal(worksheet.releaseManifest.protocolFingerprint, protocol.protocolFingerprint);
assert.equal(worksheet.protocol.protocolFingerprint, protocol.protocolFingerprint);
assert.deepEqual(worksheet.operatorFields,
  { displayName: null, role: null, environment: null, executedAt: null });
assert.equal(worksheet.stepResults.every((row) => row.result === null && row.observation === null), true);
assert.equal(JSON.stringify(repeatedWorksheet), JSON.stringify(worksheet));
assert.equal(Object.isFrozen(worksheet), true);
assert.deepEqual(worksheet.trustBoundary, SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY);
assert.equal(sequentialDraftEdit3dOperatorWalkthroughWorksheetFileName(worksheet),
  'ssk-draft-edit-3d.BRANCH-A.operator-walkthrough.v1.json');
assert.deepEqual(assertSequentialDraftEdit3dOperatorWalkthroughWorksheet(structuredClone(worksheet)), worksheet);
assert.deepEqual(validateSequentialDraftEdit3dOperatorWalkthroughWorksheet(worksheet, manifest), worksheet);
const damagedManifest = structuredClone(manifest);
damagedManifest.authority.branchId = 'BRANCH-B';
assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughWorksheet(damagedManifest),
  /fingerprint is invalid/);

const recordInput = {
  worksheet,
  manifest,
  operator: { displayName: 'Pilot Operator', role: 'ENGINEERING_PILOT_OPERATOR' },
  environment: 'Controlled engineering-demo browser session',
  executedAt: '2026-07-30T03:00:00.000Z',
  stepResults: allPassResults(),
};
const record = createSequentialDraftEdit3dOperatorWalkthroughRecord(recordInput);
const repeatedRecord = createSequentialDraftEdit3dOperatorWalkthroughRecord(recordInput);
assert.equal(record.schema, 'SequentialDraftEdit3dOperatorWalkthroughRecord.v1');
assert.equal(record.recordStatus, 'COMPLETED');
assert.equal(record.disposition, 'PASS');
assert.equal(record.operatorClaim.identityStatus, 'SELF_ASSERTED');
assert.equal(record.releaseManifest.manifestFingerprint, manifest.manifestFingerprint);
assert.equal(JSON.stringify(repeatedRecord), JSON.stringify(record));
assert.equal(Object.isFrozen(record), true);
assert.deepEqual(assertSequentialDraftEdit3dOperatorWalkthroughRecord(structuredClone(record)), record);
assert.deepEqual(validateSequentialDraftEdit3dOperatorWalkthroughRecord(
  record, worksheet, manifest,
), record);

const failedRows = allPassResults();
failedRows[4] = { ...failedRows[4], result: 'FAIL', observation: 'Instance count did not match.' };
const failedRecord = createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: failedRows,
});
assert.equal(failedRecord.disposition, 'BLOCKED');
const blockedRows = allPassResults();
blockedRows[9] = { ...blockedRows[9], result: 'BLOCKED', observation: 'Failure injection unavailable.' };
assert.equal(createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: blockedRows,
}).disposition, 'BLOCKED');

assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: allPassResults().slice(1),
}), /Every walkthrough step/);
const duplicated = allPassResults();
duplicated[1] = { ...duplicated[1], stepId: duplicated[0].stepId };
assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: duplicated,
}), /Duplicate walkthrough step/);
const missingObservation = allPassResults();
missingObservation[0] = { ...missingObservation[0], result: 'FAIL' };
assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: missingObservation,
}), /observation is required/);
const invalidResult = allPassResults();
invalidResult[0] = { ...invalidResult[0], result: 'SKIP' };
assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, stepResults: invalidResult,
}), /result is invalid/);
const staleManifest = createSequentialDraftEdit3dReleaseManifest(
  releaseInput('2026-07-30T02:31:00.000Z'),
);
assert.throws(() => createSequentialDraftEdit3dOperatorWalkthroughRecord({
  ...recordInput, manifest: staleManifest,
}), /worksheet is stale/);
assert.throws(() => validateSequentialDraftEdit3dOperatorWalkthroughRecord(
  record, worksheet, staleManifest,
), /worksheet is stale/);
const otherWorksheet = createSequentialDraftEdit3dOperatorWalkthroughWorksheet(staleManifest);
assert.throws(() => validateSequentialDraftEdit3dOperatorWalkthroughRecord(
  record, otherWorksheet, staleManifest,
), /stale/);

const forgedProtocol = structuredClone(protocol);
forgedProtocol.steps[0].instruction = 'Skip the controlled procedure.';
refingerprint(forgedProtocol, 'protocolFingerprint', 'SSK3DWALKTHROUGHPROTOCOL');
assert.throws(() => assertSequentialDraftEdit3dOperatorWalkthroughProtocol(forgedProtocol));
const forgedWorksheet = structuredClone(worksheet);
forgedWorksheet.operatorFields.displayName = 'Invented Operator';
refingerprint(forgedWorksheet, 'worksheetFingerprint', 'SSK3DWALKTHROUGHWORKSHEET');
assert.throws(() => assertSequentialDraftEdit3dOperatorWalkthroughWorksheet(forgedWorksheet));
const forgedRecord = structuredClone(record);
forgedRecord.operatorClaim.identityStatus = 'VERIFIED';
refingerprint(forgedRecord, 'recordFingerprint', 'SSK3DWALKTHROUGHRECORD');
assert.throws(() => assertSequentialDraftEdit3dOperatorWalkthroughRecord(forgedRecord));

console.log('[PASS] controlled walkthrough protocol, pending worksheet and completed-record contract');

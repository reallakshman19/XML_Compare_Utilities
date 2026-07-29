import assert from 'node:assert/strict';
import {
  SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_COMMIT,
  SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_REPOSITORY,
  SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME,
  SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME,
  SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1,
  createSequentialDraftEdit3dReleaseManifest,
  serializeSequentialDraftEdit3dReleaseManifest,
  validateSequentialDraftEdit3dReleaseManifest,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js';
import {
  sequentialSemanticFingerprint,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js';

const BRANCH = '/SSK/PILOT/BRANCH-1';
function authority(overrides = {}) {
  return {
    branchId: BRANCH, authorityId: 'AUTHORITY-1', sourceFingerprint: 'SOURCE-1',
    branchSetFingerprint: 'BRANCH-SET-1', journalHeadFingerprint: 'COMMAND-HEAD-1',
    ownerRevisionFingerprint: 'OWNER-REVISION-1', ...overrides,
  };
}
function readModel(overrides = {}) {
  return {
    schema: 'SequentialEffectiveGeometryReadModel.v1', authorityId: 'READ-AUTHORITY-1',
    sceneId: 'SCENE-1', branchId: BRANCH, ...overrides,
  };
}
function scene(overrides = {}) {
  return {
    schema: 'EngineeringScene.v1', sceneId: 'SCENE-1', branchId: BRANCH,
    entities: [{ id: 'ENTITY-1' }, { id: 'ENTITY-2' }], ...overrides,
  };
}
function runtime(overrides = {}) {
  return {
    authority: authority(overrides.authority),
    supportAdjustmentRegister: { headFingerprint: 'SUPPORT-HEAD-1' },
    supportAdjustmentHistory: { historyFingerprint: 'SUPPORT-HISTORY-1' },
    geometryEditJournal: { headFingerprint: 'GEOMETRY-HEAD-1' },
    ownerSnapshot: { schema: 'SequentialGeometryEditOwnerSnapshot.v1', revision: 'OWNER-1' },
    readModel: readModel(overrides.readModel), scene: scene(overrides.scene),
    shadowEvidence: { schema: 'SequentialProductionShadow.v1', status: 'MOUNTED',
      mounted: true, authorityId: 'SHADOW-AUTHORITY-1', mountKey: 'MOUNT-KEY-1' },
    controllerState: { active: true, available: true, mounted: true, destroyed: false,
      failureCount: 0, mountKey: 'MOUNT-KEY-1:READ-AUTHORITY-1' },
    viewerState: { contract: 'ViewerStateSnapshot.v1', mode: 'target-only',
      runtimePending: false, runtimeError: null, instanceCount: 2, drawBatchCount: 1 },
    surfaces: { constructionHidden: true, draftEdit3dHidden: false },
    ...overrides,
    authority: authority(overrides.authority),
    readModel: readModel(overrides.readModel),
    scene: scene(overrides.scene),
  };
}

function refingerprint(value) {
  const clone = structuredClone(value);
  delete clone.fingerprint;
  clone.fingerprint = sequentialSemanticFingerprint('SSK3DPILOTMANIFEST', clone);
  return clone;
}

const left = createSequentialDraftEdit3dReleaseManifest(runtime());
const right = createSequentialDraftEdit3dReleaseManifest(runtime());
assert.deepEqual(left, right, 'identical runtime authority must generate identical evidence');
assert.equal(left.schema, SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1);
assert.equal(left.baseline.repository, SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_REPOSITORY);
assert.equal(left.baseline.commit, SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_COMMIT);
assert.equal(left.runtime.authority.branchId, BRANCH);
assert.equal(left.runtime.scene.entityCount, 2);
assert.equal(left.runtime.controller.active, true);
assert.equal(left.runtime.fallback.constructionVisible, false);
assert.ok(left.capabilities.geometryOperations.includes('MOVE_COMPONENT'));
assert.ok(left.capabilities.structuralImpactPreviews.includes('SPLIT_PIPE'));
assert.ok(left.knownLimitations.some((row) => row.includes('No structural topology')));
assert.ok(Object.isFrozen(left));
assert.ok(Object.isFrozen(left.runtime));

const serialized = serializeSequentialDraftEdit3dReleaseManifest(left);
assert.equal(serialized, serializeSequentialDraftEdit3dReleaseManifest(right));
assert.ok(serialized.endsWith('\n'));
assert.deepEqual(JSON.parse(serialized), left);
assert.equal(SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME,
  'ssk-sequential-draft-edit-3d-pilot-baseline.json');
assert.equal(SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME, 'application/json');
assert.deepEqual(validateSequentialDraftEdit3dReleaseManifest(left, runtime()), left);

assert.throws(() => createSequentialDraftEdit3dReleaseManifest(runtime({
  readModel: { branchId: '/DIFFERENT-BRANCH' },
})), /exactly one current authoritative branch/);

const brokenFingerprint = structuredClone(left);
brokenFingerprint.runtime.scene.entityCount = 99;
assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(
  brokenFingerprint,
  runtime(),
), /fingerprint is invalid/);

const refingerprintedForgery = structuredClone(left);
refingerprintedForgery.runtime.scene.entityCount = 99;
assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(
  refingerprint(refingerprintedForgery),
  runtime(),
), /stale or differs from current runtime authority/);

const forgedCapabilities = structuredClone(left);
forgedCapabilities.capabilities.geometryOperations.push('DELETE_COMPONENT');
assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(
  refingerprint(forgedCapabilities),
  runtime(),
), /stale or differs from current runtime authority/);

const forgedBaseline = structuredClone(left);
forgedBaseline.baseline.commit = '0000000000000000000000000000000000000000';
assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(
  refingerprint(forgedBaseline),
  runtime(),
), /stale or differs from current runtime authority/);

assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(left, runtime({
  geometryEditJournal: { headFingerprint: 'GEOMETRY-HEAD-2' },
})), /stale or differs from current runtime authority/);
assert.throws(() => validateSequentialDraftEdit3dReleaseManifest(left, runtime({
  authority: { authorityId: 'AUTHORITY-2' },
})), /stale or differs from current runtime authority/);

const failed = createSequentialDraftEdit3dReleaseManifest(runtime({
  controllerState: {
    active: false,
    available: true,
    mounted: false,
    destroyed: false,
    failureCount: 1,
    mountKey: '',
  },
  viewerState: null,
  surfaces: { constructionHidden: false, draftEdit3dHidden: true },
}));
assert.equal(failed.runtime.fallback.constructionVisible, true);
assert.equal(failed.runtime.fallback.constructionRetainedAfterFailure, true);

console.log('Sequential Draft Edit 3D release manifest contract: ok');

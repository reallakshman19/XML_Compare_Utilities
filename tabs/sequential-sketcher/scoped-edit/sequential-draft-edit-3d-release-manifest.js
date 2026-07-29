/** Deterministic engineering-demo release evidence for Sequential Draft Edit 3D. */
import { immutableJson, requiredContractText } from '../../../contracts/contract-values.js';
import {
  sameSequentialContractValue,
  sequentialCanonicalStringify,
  sequentialSemanticFingerprint,
} from './sequential-command-contracts.js';

export const SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1 =
  'SequentialDraftEdit3dReleaseManifest.v1';
export const SEQUENTIAL_DRAFT_EDIT_3D_RUNTIME_SNAPSHOT_V1 =
  'SequentialDraftEdit3dRuntimeSnapshot.v1';
export const SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_LEVEL = 'ENGINEERING_DEMO';
export const SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_REPOSITORY =
  'reallaksh19/XML_Compare_Utilities';
export const SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_COMMIT =
  'bda5489ef8097bdc41a26dbc30a9be2498a3e89e';
export const SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_FILENAME =
  'ssk-sequential-draft-edit-3d-pilot-baseline.json';
export const SEQUENTIAL_DRAFT_EDIT_3D_EVIDENCE_MIME = 'application/json';

export const SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES = immutableJson({
  supervisedCommands: [
    'ADVANCE_ONE', 'CONNECT_CANDIDATE', 'DEFER_DECISION', 'MANUAL_CONNECT',
    'MARK_EXTERNAL_BOUNDARY', 'MARK_TERMINAL', 'REDO_LAST_TRANSACTION',
    'REJECT_CANDIDATE', 'RESUME_DECISION', 'REVERSE_COMPONENT',
    'RUN_UNTIL_BLOCKED', 'UNDO_LAST_TRANSACTION',
  ],
  geometryOperations: ['MOVE_COMPONENT', 'ROTATE_SUBGRAPH', 'STRETCH_NODE'],
  supportOperations: ['MOVE_SUPPORT_SAME_CARRIER', 'REDO_SUPPORT_MOVE', 'UNDO_SUPPORT_MOVE'],
  structuralImpactPreviews: ['SPLIT_PIPE', 'WHOLE_COMPONENT_RETIREMENT'],
}, 'Sequential Draft Edit 3D capabilities');

export const SEQUENTIAL_DRAFT_EDIT_3D_KNOWN_LIMITATIONS = Object.freeze([
  'No structural topology publication authority.',
  'No split, add, merge, bridge, disconnect, or retirement application.',
  'No cross-layer atomic transaction.',
  'No package persistence for complete support and geometry edit history.',
  'No unrestricted project-production release claim.',
]);

function requiredObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function optionalText(value) {
  const result = String(value ?? '').trim();
  return result || null;
}

function finiteCount(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) {
    throw new TypeError(`${label} must be a non-negative integer.`);
  }
  return result;
}

function activeBranchId(input) {
  const values = [
    input.authority?.branchId,
    input.readModel?.branchId,
    input.scene?.branchId,
  ].map(optionalText).filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length !== 1) {
    throw new RangeError('Pilot evidence requires exactly one current authoritative branch.');
  }
  return unique[0];
}

function runtimeAuthority(input, branchId) {
  const authority = requiredObject(input.authority, 'runtime authority');
  return {
    branchId,
    editAuthorityId: requiredContractText(authority.authorityId, 'edit authorityId'),
    sourceFingerprint: requiredContractText(
      authority.sourceFingerprint,
      'authority sourceFingerprint',
    ),
    branchSetFingerprint: requiredContractText(
      authority.branchSetFingerprint,
      'authority branchSetFingerprint',
    ),
    commandJournalHeadFingerprint: requiredContractText(
      authority.journalHeadFingerprint,
      'command journal head fingerprint',
    ),
    ownerRevisionFingerprint: requiredContractText(
      authority.ownerRevisionFingerprint,
      'owner revision fingerprint',
    ),
  };
}

function runtimeOwner(input, authority) {
  const owner = requiredObject(input.ownerSnapshot, 'owner snapshot');
  return {
    schema: requiredContractText(owner.schema, 'owner snapshot schema'),
    authorityRevisionFingerprint: authority.ownerRevisionFingerprint,
    snapshotFingerprint: sequentialSemanticFingerprint('SSK3DPILOTOWNER', owner),
  };
}

function runtimeJournals(input) {
  const supportRegister = input.supportAdjustmentRegister;
  const supportHistory = input.supportAdjustmentHistory;
  const geometryJournal = requiredObject(input.geometryEditJournal, 'geometry edit journal');
  return {
    supportRegisterHeadFingerprint: optionalText(supportRegister?.headFingerprint),
    supportHistoryFingerprint: optionalText(supportHistory?.historyFingerprint),
    geometryJournalHeadFingerprint: requiredContractText(
      geometryJournal.headFingerprint,
      'geometry journal head fingerprint',
    ),
  };
}

function runtimeReadModel(input, branchId) {
  const readModel = requiredObject(input.readModel, 'read model');
  if (requiredContractText(readModel.branchId, 'read model branchId') !== branchId) {
    throw new RangeError('Read-model branch differs from current authority.');
  }
  return {
    schema: requiredContractText(readModel.schema, 'read model schema'),
    authorityId: requiredContractText(readModel.authorityId, 'read model authorityId'),
    sceneId: requiredContractText(readModel.sceneId, 'read model sceneId'),
    branchId,
  };
}

function runtimeScene(input, readModel) {
  const scene = requiredObject(input.scene, 'engineering scene');
  if (requiredContractText(scene.sceneId, 'scene sceneId') !== readModel.sceneId) {
    throw new RangeError('Engineering-scene identity differs from current read model.');
  }
  return {
    schema: requiredContractText(scene.schema, 'scene schema'),
    sceneId: scene.sceneId,
    entityCount: finiteCount(scene.entities?.length, 'scene entity count'),
    sceneFingerprint: sequentialSemanticFingerprint('SSK3DPILOTSCENE', scene),
  };
}

function runtimeShadow(input) {
  const evidence = requiredObject(input.shadowEvidence, 'shadow evidence');
  return {
    schema: requiredContractText(evidence.schema, 'shadow schema'),
    status: requiredContractText(evidence.status, 'shadow status'),
    mounted: Boolean(evidence.mounted),
    authorityId: requiredContractText(evidence.authorityId, 'shadow authorityId'),
    mountKey: requiredContractText(evidence.mountKey, 'shadow mountKey'),
  };
}

function runtimeController(input) {
  const controller = requiredObject(input.controllerState, 'controller state');
  return {
    active: Boolean(controller.active),
    available: Boolean(controller.available),
    mounted: Boolean(controller.mounted),
    destroyed: Boolean(controller.destroyed),
    failureCount: finiteCount(controller.failureCount, 'controller failure count'),
    mountKey: optionalText(controller.mountKey),
  };
}

function runtimeFallback(input) {
  const surfaces = requiredObject(input.surfaces, 'surface state');
  return {
    constructionVisible: !Boolean(surfaces.constructionHidden),
    draftEdit3dVisible: !Boolean(surfaces.draftEdit3dHidden),
    constructionRetainedAfterFailure:
      Number(input.controllerState?.failureCount || 0) === 0
      || !Boolean(surfaces.constructionHidden),
  };
}

function runtimeViewer(input) {
  if (input.viewerState === null || input.viewerState === undefined) return null;
  return immutableJson(input.viewerState, 'viewer runtime snapshot');
}

export function createSequentialDraftEdit3dRuntimeSnapshot(input = {}) {
  const branchId = activeBranchId(input);
  const authority = runtimeAuthority(input, branchId);
  const readModel = runtimeReadModel(input, branchId);
  const scene = runtimeScene(input, readModel);
  return immutableJson({
    schema: SEQUENTIAL_DRAFT_EDIT_3D_RUNTIME_SNAPSHOT_V1,
    authority,
    owner: runtimeOwner(input, authority),
    journals: runtimeJournals(input),
    readModel,
    scene,
    shadow: runtimeShadow(input),
    controller: runtimeController(input),
    viewer: runtimeViewer(input),
    fallback: runtimeFallback(input),
  }, 'Sequential Draft Edit 3D runtime snapshot');
}

function releaseMaterial(runtimeSnapshot) {
  return {
    schema: SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1,
    releaseLevel: SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_LEVEL,
    baseline: {
      repository: SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_REPOSITORY,
      commit: SEQUENTIAL_DRAFT_EDIT_3D_BASELINE_COMMIT,
    },
    runtime: runtimeSnapshot,
    capabilities: SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES,
    knownLimitations: SEQUENTIAL_DRAFT_EDIT_3D_KNOWN_LIMITATIONS,
  };
}

export function createSequentialDraftEdit3dReleaseManifest(input = {}) {
  const runtime = createSequentialDraftEdit3dRuntimeSnapshot(input);
  const material = releaseMaterial(runtime);
  return immutableJson({
    ...material,
    fingerprint: sequentialSemanticFingerprint('SSK3DPILOTMANIFEST', material),
  }, 'Sequential Draft Edit 3D release manifest');
}

export function assertSequentialDraftEdit3dReleaseManifest(value) {
  const manifest = immutableJson(value, 'Sequential Draft Edit 3D release manifest');
  if (manifest.schema !== SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1) {
    throw new TypeError(`Manifest must use ${SEQUENTIAL_DRAFT_EDIT_3D_RELEASE_MANIFEST_V1}.`);
  }
  const { fingerprint, ...material } = manifest;
  const expected = sequentialSemanticFingerprint('SSK3DPILOTMANIFEST', material);
  if (fingerprint !== expected) throw new RangeError('Pilot manifest fingerprint is invalid.');
  return manifest;
}

export function validateSequentialDraftEdit3dReleaseManifest(value, currentInput = {}) {
  const manifest = assertSequentialDraftEdit3dReleaseManifest(value);
  const current = createSequentialDraftEdit3dReleaseManifest(currentInput);
  if (!sameSequentialContractValue(manifest, current)) {
    throw new RangeError('Pilot manifest is stale or differs from current runtime authority.');
  }
  return current;
}

export function serializeSequentialDraftEdit3dReleaseManifest(value) {
  return `${sequentialCanonicalStringify(assertSequentialDraftEdit3dReleaseManifest(value))}\n`;
}

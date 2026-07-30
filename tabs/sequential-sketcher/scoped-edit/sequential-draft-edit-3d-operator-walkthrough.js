/** Controlled operator-walkthrough contracts for Sequential Draft Edit 3D. */
import { immutableJson, isIsoTimestamp } from '../../../contracts/contract-values.js';
import { sequentialSemanticFingerprint } from './sequential-command-contracts.js';

export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_PROTOCOL_SCHEMA =
  'SequentialDraftEdit3dOperatorWalkthroughProtocol.v1';
export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_WORKSHEET_SCHEMA =
  'SequentialDraftEdit3dOperatorWalkthroughWorksheet.v1';
export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_RECORD_SCHEMA =
  'SequentialDraftEdit3dOperatorWalkthroughRecord.v1';

const STEP_MATERIAL = [
  ['OPEN_SEQUENTIAL_SKETCHER', 'Open Sequential Sketcher.', ['modalPresent']],
  ['INSPECT_REPRESENTATIVE_SOURCE', 'Inspect the representative staged records.', ['sourceAccepted', 'branchInventory']],
  ['OPEN_AUTHORITATIVE_BRANCH', 'Open one authoritative Sequential branch.', ['activeBranchId', 'ownerAuthority']],
  ['ACTIVATE_DRAFT_EDIT_3D', 'Activate Draft Edit 3D.', ['controllerActive', 'canvasPresent']],
  ['VERIFY_WORKBENCH_REALIZATION', 'Verify the certified model is realized in Workbench.', ['instanceCount', 'drawBatchCount', 'sceneChunkCount']],
  ['EXPORT_BASELINE_TWICE', 'Export the pilot baseline twice without changing authority.', ['byteEquivalent', 'manifestFingerprint']],
  ['VERIFY_FIXTURE_CATALOG', 'Verify the four representative fixture scenarios.', ['fixtureCatalogFingerprint', 'scenarioIds']],
  ['VERIFY_LIMITATION_REGISTER', 'Verify the six open limitations and ownership boundary.', ['registerFingerprint', 'limitationIds', 'trustBoundary']],
  ['RETURN_TO_CONSTRUCTION_SVG', 'Return manually to Construction SVG.', ['controllerInactive', 'constructionSurfaceVisible']],
  ['INJECT_SCENE_APPLY_FAILURE', 'Inject the qualified scene-apply failure.', ['failureInjected']],
  ['VERIFY_AUTOMATIC_FALLBACK', 'Verify automatic fallback retains Construction SVG.', ['fallbackSurface', 'failureReported']],
  ['CLOSE_WITHOUT_CANVAS_LEAK', 'Close the workspace and verify no canvas remains.', ['modalClosed', 'canvasCountZero']],
];

export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS = immutableJson(
  STEP_MATERIAL.map(([stepId, instruction, expectedEvidence]) => ({
    stepId, instruction, expectedEvidence,
  })),
  'Sequential Draft Edit 3D walkthrough steps',
);
export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS = Object.freeze(
  SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS.map((step) => step.stepId),
);
export const SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY = immutableJson({
  contentIntegrity: 'ESTABLISHED_BY_CANONICAL_FINGERPRINT',
  operatorIdentity: 'SELF_ASSERTED',
  organizationalAuthority: 'NOT_ESTABLISHED',
  certificateTrust: 'NOT_ESTABLISHED',
  productionApproval: 'NOT_ESTABLISHED',
}, 'Sequential Draft Edit 3D walkthrough trust boundary');

const EMPTY_OPERATOR_FIELDS = Object.freeze({
  displayName: null, role: null, environment: null, executedAt: null,
});

function fail(message, Constructor = RangeError) { throw new Constructor(message); }
function text(value, label) {
  const result = String(value ?? '').trim();
  if (!result) fail(`${label} is required.`, TypeError);
  return result;
}
function protocolMaterial() {
  return {
    schema: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_PROTOCOL_SCHEMA,
    workPack: 'SSK-3D-P0-E',
    stepCount: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS.length,
    steps: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS,
  };
}
function releaseReference(manifest) {
  if (manifest?.schema !== 'SequentialDraftEdit3dReleaseManifest.v1') {
    fail('A SequentialDraftEdit3dReleaseManifest.v1 is required.', TypeError);
  }
  const { manifestFingerprint, ...base } = manifest;
  if (manifestFingerprint !== sequentialSemanticFingerprint('SSK3DRELEASE', base)) {
    fail('Release manifest fingerprint is invalid.');
  }
  if (!isIsoTimestamp(manifest.createdAt)) fail('Release manifest authority time is invalid.', TypeError);
  const protocol = assertSequentialDraftEdit3dOperatorWalkthroughProtocol(
    manifest.operatorWalkthrough?.protocol,
  );
  if (manifest.operatorWalkthrough?.status !== 'PENDING_OPERATOR_EXECUTION'
    || manifest.disposition?.operatorWalkthrough !== 'PENDING_OPERATOR_EXECUTION') {
    fail('Release manifest walkthrough gate is invalid.');
  }
  return {
    schema: manifest.schema,
    manifestFingerprint,
    branchId: text(manifest.authority?.branchId, 'release manifest branchId'),
    authorityCreatedAt: manifest.createdAt,
    protocolFingerprint: protocol.protocolFingerprint,
  };
}
function releaseReferenceInvariant(value) {
  return value?.schema === 'SequentialDraftEdit3dReleaseManifest.v1'
    && typeof value.manifestFingerprint === 'string' && value.manifestFingerprint.length > 0
    && typeof value.branchId === 'string' && value.branchId.length > 0
    && isIsoTimestamp(value.authorityCreatedAt)
    && typeof value.protocolFingerprint === 'string' && value.protocolFingerprint.length > 0;
}
function emptyResults() {
  return SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS.map((stepId) => ({
    stepId, result: null, observation: null,
  }));
}
function worksheetMaterial(manifest) {
  const protocol = createSequentialDraftEdit3dOperatorWalkthroughProtocol();
  return {
    schema: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_WORKSHEET_SCHEMA,
    workPack: 'SSK-3D-P0-E',
    status: 'PENDING_OPERATOR_EXECUTION',
    releaseManifest: releaseReference(manifest),
    protocol,
    operatorFields: EMPTY_OPERATOR_FIELDS,
    stepResults: emptyResults(),
    completionGate: 'VALID_COMPLETED_RECORD_REQUIRED',
    trustBoundary: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY,
  };
}
function resultRows(rows) {
  if (!Array.isArray(rows)) fail('stepResults must be an array.', TypeError);
  const indexed = new Map();
  rows.forEach((row) => {
    const stepId = text(row?.stepId, 'stepResults.stepId');
    if (indexed.has(stepId)) fail(`Duplicate walkthrough step: ${stepId}`);
    indexed.set(stepId, row);
  });
  if (indexed.size !== SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS.length) {
    fail('Every walkthrough step must be recorded exactly once.');
  }
  return SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS.map((stepId) => resultRow(indexed.get(stepId), stepId));
}
function resultRow(row, expectedStepId) {
  if (!row || row.stepId !== expectedStepId) fail(`Missing walkthrough step: ${expectedStepId}`);
  const result = text(row.result, `${expectedStepId}.result`).toUpperCase();
  if (!['PASS', 'FAIL', 'BLOCKED'].includes(result)) fail(`${expectedStepId}.result is invalid.`);
  const observation = String(row.observation ?? '').trim() || null;
  if (result !== 'PASS' && !observation) fail(`${expectedStepId}.observation is required.`);
  return { stepId: expectedStepId, result, observation };
}
function recordMaterial(input) {
  const worksheet = validateSequentialDraftEdit3dOperatorWalkthroughWorksheet(
    input.worksheet, input.manifest,
  );
  const stepResults = resultRows(input.stepResults);
  const passed = stepResults.every((row) => row.result === 'PASS');
  if (!isIsoTimestamp(input.executedAt)) fail('executedAt must be an exact ISO timestamp.', TypeError);
  return {
    schema: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_RECORD_SCHEMA,
    workPack: 'SSK-3D-P0-E',
    recordStatus: 'COMPLETED',
    releaseManifest: worksheet.releaseManifest,
    protocolFingerprint: worksheet.protocol.protocolFingerprint,
    worksheetFingerprint: worksheet.worksheetFingerprint,
    operatorClaim: {
      displayName: text(input.operator?.displayName, 'operator.displayName'),
      role: text(input.operator?.role, 'operator.role'),
      identityStatus: 'SELF_ASSERTED',
    },
    environment: text(input.environment, 'environment'),
    executedAt: input.executedAt,
    stepResults,
    disposition: passed ? 'PASS' : 'BLOCKED',
    trustBoundary: SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY,
  };
}
function protocolInvariant(value) {
  return value.workPack === 'SSK-3D-P0-E'
    && value.stepCount === SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS.length
    && JSON.stringify(value.steps) === JSON.stringify(SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEPS);
}
function worksheetInvariant(value) {
  const blank = value.stepResults?.every((row, index) => row.stepId
    === SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_STEP_IDS[index]
    && row.result === null && row.observation === null);
  return value.workPack === 'SSK-3D-P0-E'
    && value.status === 'PENDING_OPERATOR_EXECUTION'
    && value.completionGate === 'VALID_COMPLETED_RECORD_REQUIRED'
    && releaseReferenceInvariant(value.releaseManifest)
    && value.releaseManifest.protocolFingerprint === value.protocol?.protocolFingerprint
    && JSON.stringify(value.operatorFields) === JSON.stringify(EMPTY_OPERATOR_FIELDS)
    && blank === true
    && JSON.stringify(value.protocol) === JSON.stringify(createSequentialDraftEdit3dOperatorWalkthroughProtocol())
    && JSON.stringify(value.trustBoundary) === JSON.stringify(SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY);
}
function recordInvariant(value) {
  try {
    const rows = resultRows(value.stepResults);
    const expected = rows.every((row) => row.result === 'PASS') ? 'PASS' : 'BLOCKED';
    return value.workPack === 'SSK-3D-P0-E'
      && value.recordStatus === 'COMPLETED'
      && releaseReferenceInvariant(value.releaseManifest)
      && value.protocolFingerprint === value.releaseManifest.protocolFingerprint
      && typeof value.worksheetFingerprint === 'string' && value.worksheetFingerprint.length > 0
      && typeof value.operatorClaim?.displayName === 'string' && value.operatorClaim.displayName.length > 0
      && typeof value.operatorClaim?.role === 'string' && value.operatorClaim.role.length > 0
      && value.operatorClaim.identityStatus === 'SELF_ASSERTED'
      && typeof value.environment === 'string' && value.environment.length > 0
      && value.disposition === expected
      && JSON.stringify(value.trustBoundary) === JSON.stringify(SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_TRUST_BOUNDARY);
  } catch { return false; }
}

export function createSequentialDraftEdit3dOperatorWalkthroughProtocol() {
  const base = protocolMaterial();
  return immutableJson({ ...base,
    protocolFingerprint: sequentialSemanticFingerprint('SSK3DWALKTHROUGHPROTOCOL', base) },
  'Sequential Draft Edit 3D walkthrough protocol');
}
export function assertSequentialDraftEdit3dOperatorWalkthroughProtocol(value) {
  const protocol = immutableJson(value, 'Sequential Draft Edit 3D walkthrough protocol');
  const { protocolFingerprint, ...base } = protocol;
  if (protocol.schema !== SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_PROTOCOL_SCHEMA
    || protocolFingerprint !== sequentialSemanticFingerprint('SSK3DWALKTHROUGHPROTOCOL', base)
    || !protocolInvariant(protocol)) fail('Walkthrough protocol differs from the qualified procedure.');
  return protocol;
}
export function createSequentialDraftEdit3dOperatorWalkthroughWorksheet(manifest) {
  const base = worksheetMaterial(manifest);
  return immutableJson({ ...base,
    worksheetFingerprint: sequentialSemanticFingerprint('SSK3DWALKTHROUGHWORKSHEET', base) },
  'Sequential Draft Edit 3D walkthrough worksheet');
}
export function assertSequentialDraftEdit3dOperatorWalkthroughWorksheet(value) {
  const worksheet = immutableJson(value, 'Sequential Draft Edit 3D walkthrough worksheet');
  const { worksheetFingerprint, ...base } = worksheet;
  if (worksheet.schema !== SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_WORKSHEET_SCHEMA
    || worksheetFingerprint !== sequentialSemanticFingerprint('SSK3DWALKTHROUGHWORKSHEET', base)
    || !worksheetInvariant(worksheet)) fail('Walkthrough worksheet differs from the qualified pending worksheet.');
  return worksheet;
}
export function validateSequentialDraftEdit3dOperatorWalkthroughWorksheet(value, manifest) {
  const worksheet = assertSequentialDraftEdit3dOperatorWalkthroughWorksheet(value);
  if (JSON.stringify(worksheet.releaseManifest) !== JSON.stringify(releaseReference(manifest))) {
    fail('Walkthrough worksheet is stale for the current release manifest.');
  }
  return worksheet;
}
export function createSequentialDraftEdit3dOperatorWalkthroughRecord(input = {}) {
  const base = recordMaterial(input);
  return immutableJson({ ...base,
    recordFingerprint: sequentialSemanticFingerprint('SSK3DWALKTHROUGHRECORD', base) },
  'Sequential Draft Edit 3D walkthrough record');
}
export function assertSequentialDraftEdit3dOperatorWalkthroughRecord(value) {
  const record = immutableJson(value, 'Sequential Draft Edit 3D walkthrough record');
  const { recordFingerprint, ...base } = record;
  if (record.schema !== SEQUENTIAL_DRAFT_EDIT_3D_WALKTHROUGH_RECORD_SCHEMA
    || !isIsoTimestamp(record.executedAt)
    || recordFingerprint !== sequentialSemanticFingerprint('SSK3DWALKTHROUGHRECORD', base)
    || !recordInvariant(record)) fail('Walkthrough record differs from the governed completed-record contract.');
  return record;
}
export function validateSequentialDraftEdit3dOperatorWalkthroughRecord(
  value, worksheetValue, manifest,
) {
  const record = assertSequentialDraftEdit3dOperatorWalkthroughRecord(value);
  const worksheet = validateSequentialDraftEdit3dOperatorWalkthroughWorksheet(
    worksheetValue, manifest,
  );
  if (record.worksheetFingerprint !== worksheet.worksheetFingerprint
    || JSON.stringify(record.releaseManifest) !== JSON.stringify(worksheet.releaseManifest)
    || record.protocolFingerprint !== worksheet.protocol.protocolFingerprint) {
    fail('Walkthrough record is stale for the current worksheet or release manifest.');
  }
  return record;
}
export function sequentialDraftEdit3dOperatorWalkthroughWorksheetFileName(value) {
  const worksheet = assertSequentialDraftEdit3dOperatorWalkthroughWorksheet(value);
  const branch = worksheet.releaseManifest.branchId.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
  return `ssk-draft-edit-3d.${branch || 'branch'}.operator-walkthrough.v1.json`;
}

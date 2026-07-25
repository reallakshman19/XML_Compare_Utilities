/** Versioned JSON-safe contracts for the synthetic scoped-edit coordinator. */
import { validateCommandEnvelope } from '../../contracts/command-envelope.js';
import { immutableJson, requiredContractText } from '../../contracts/contract-values.js';
import {
  EDIT_3D_DRAG_SESSION_V1,
  validateEdit3DDragResult,
  validateEdit3DDragSession,
} from '../edit-3d/index.js';
import {
  SCOPED_ENGINEERING_SCENE_SCHEMA,
  assertEngineeringScope,
} from '../engineering-scope/index.js';

export const SCOPED_EDIT_RUNTIME_STATE_V1 = 'ScopedEditRuntimeState.v1';
export const SCOPED_EDIT_COMMIT_PROPOSAL_V1 = 'ScopedEditCommitProposal.v1';
export const SCOPED_EDIT_COMMIT_RESULT_V1 = 'ScopedEditCommitResult.v1';
export const SCOPED_EDIT_JOURNAL_PROJECTION_V1 = 'ScopedEditJournalProjection.v1';
export const SCOPED_EDIT_ENTITY_GEOMETRY_V1 = 'ScopedEditEntityGeometry.v1';
export const SCOPED_EDIT_RUNTIME_CONFORMANCE_V1 = 'ScopedEditRuntimeConformance.v1';

export const SCOPED_EDIT_RUNTIME_STATUS = Object.freeze({
  READY: 'READY',
  DRAGGING: 'DRAGGING',
  DRAG_SOLVED: 'DRAG_SOLVED',
  CANCELLED: 'CANCELLED',
  COMMITTED: 'COMMITTED',
  REJECTED: 'REJECTED',
  DESTROYED: 'DESTROYED',
});

export const SCOPED_EDIT_COMMIT_STATUS = Object.freeze({
  PREPARED: 'PREPARED',
  COMMITTED: 'COMMITTED',
  REJECTED: 'REJECTED',
});

const RUNTIME_STATUSES = Object.freeze(Object.values(SCOPED_EDIT_RUNTIME_STATUS));

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a JSON object.`);
  }
  return value;
}

function schema(value, expected, label) {
  if (value !== expected) throw new TypeError(`${label} schema must be ${expected}.`);
}

function finiteVector(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must contain three finite coordinates.`);
  }
  return Object.freeze([...value]);
}

function uniqueTexts(values, label, allowEmpty = false) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  const result = values.map((value, index) => requiredContractText(value, `${label}[${index}]`));
  if (!allowEmpty && result.length === 0) throw new TypeError(`${label} must not be empty.`);
  if (new Set(result).size !== result.length) throw new TypeError(`${label} must contain unique values.`);
  return Object.freeze(result);
}

function envelope(value, label = 'Command envelope') {
  const errors = validateCommandEnvelope(value);
  if (errors.length) throw new TypeError(`${label} is invalid: ${errors.join('; ')}`);
  return immutableJson(value, label);
}

function optionalDragResult(value) {
  return value == null ? null : validateEdit3DDragResult(value);
}

function optionalDragState(value) {
  if (value == null) return null;
  if (value.schema !== EDIT_3D_DRAG_SESSION_V1) throw new TypeError('dragState schema is invalid.');
  return validateEdit3DDragSession(value);
}

function boundaryDecision(value, optional = false) {
  if (value == null && optional) return null;
  const input = record(value, 'Boundary decision');
  if (typeof input.allowed !== 'boolean') throw new TypeError('Boundary decision allowed must be boolean.');
  const targetIds = uniqueTexts(input.targetIds, 'Boundary targetIds', true);
  const escapingIds = uniqueTexts(input.escapingIds, 'Boundary escapingIds', true);
  for (const id of escapingIds) if (!targetIds.includes(id)) throw new TypeError('Boundary escapingIds must be targetIds.');
  return immutableJson({
    allowed: input.allowed,
    commandName: requiredContractText(input.commandName, 'Boundary commandName'),
    boundaryPolicy: requiredContractText(input.boundaryPolicy, 'Boundary policy'),
    targetIds,
    escapingIds,
    reason: input.reason == null ? null : requiredContractText(input.reason, 'Boundary reason'),
  }, 'Boundary decision');
}

function replayRecord(value) {
  const input = record(value, 'Replay state');
  const appliedCommandIds = uniqueTexts(input.appliedCommandIds, 'Replay appliedCommandIds', true);
  return immutableJson({ state: record(input.state, 'Replay state.state'), appliedCommandIds }, 'Replay state');
}

export function validateScopedEditEntityGeometry(input) {
  const value = record(input, 'Scoped edit entity geometry');
  schema(value.schema, SCOPED_EDIT_ENTITY_GEOMETRY_V1, 'Scoped edit entity geometry');
  return immutableJson({
    schema: SCOPED_EDIT_ENTITY_GEOMETRY_V1,
    entityId: requiredContractText(value.entityId, 'entityId'),
    anchor: finiteVector(value.anchor, 'anchor'),
  }, 'Scoped edit entity geometry');
}

export function validateScopedEditJournalProjection(input) {
  const value = record(input, 'Scoped edit journal projection');
  schema(value.schema, SCOPED_EDIT_JOURNAL_PROJECTION_V1, 'Scoped edit journal projection');
  const initialState = record(value.initialState, 'journalProjection.initialState');
  if (!Array.isArray(value.envelopes)) throw new TypeError('journalProjection.envelopes must be an array.');
  const envelopes = value.envelopes.map((entry, index) => envelope(entry, `Journal envelope ${index}`));
  const ids = envelopes.map((entry) => entry.commandId);
  if (new Set(ids).size !== ids.length) throw new TypeError('Journal envelope IDs must be unique.');
  const activeCommandIds = uniqueTexts(value.activeCommandIds, 'activeCommandIds', true);
  for (const id of activeCommandIds) if (!ids.includes(id)) throw new RangeError(`Active command ID ${id} has no envelope.`);
  return immutableJson({ schema: SCOPED_EDIT_JOURNAL_PROJECTION_V1, initialState, envelopes, activeCommandIds },
    'Scoped edit journal projection');
}

export function validateScopedEditCommitProposal(input) {
  const value = record(input, 'Scoped edit commit proposal');
  schema(value.schema, SCOPED_EDIT_COMMIT_PROPOSAL_V1, 'Scoped edit commit proposal');
  if (value.status !== SCOPED_EDIT_COMMIT_STATUS.PREPARED) throw new TypeError('Commit proposal status must be PREPARED.');
  const decision = boundaryDecision(value.boundaryDecision);
  if (!decision.allowed) throw new TypeError('A prepared proposal requires an allowed boundary decision.');
  const targetIds = uniqueTexts(value.targetIds, 'proposal.targetIds');
  if (JSON.stringify(targetIds) !== JSON.stringify(decision.targetIds)) {
    throw new TypeError('Proposal targetIds must match the boundary decision.');
  }
  return immutableJson({
    schema: SCOPED_EDIT_COMMIT_PROPOSAL_V1,
    status: SCOPED_EDIT_COMMIT_STATUS.PREPARED,
    entityId: requiredContractText(value.entityId, 'proposal.entityId'),
    commandName: requiredContractText(value.commandName, 'proposal.commandName'),
    targetIds,
    envelope: envelope(value.envelope),
    dragResult: validateEdit3DDragResult(value.dragResult),
    boundaryDecision: decision,
    baseSequence: Number.isSafeInteger(value.baseSequence) && value.baseSequence >= 0
      ? value.baseSequence : (() => { throw new TypeError('proposal.baseSequence must be non-negative.'); })(),
  }, 'Scoped edit commit proposal');
}

export function validateScopedEditCommitResult(input) {
  const value = record(input, 'Scoped edit commit result');
  schema(value.schema, SCOPED_EDIT_COMMIT_RESULT_V1, 'Scoped edit commit result');
  if (![SCOPED_EDIT_COMMIT_STATUS.COMMITTED, SCOPED_EDIT_COMMIT_STATUS.REJECTED].includes(value.status)) {
    throw new TypeError('Commit result status must be COMMITTED or REJECTED.');
  }
  const committed = value.status === SCOPED_EDIT_COMMIT_STATUS.COMMITTED;
  const rejectionCode = committed ? null : requiredContractText(value.rejectionCode, 'rejectionCode');
  const message = committed ? null : requiredContractText(value.message, 'rejection message');
  return immutableJson({
    schema: SCOPED_EDIT_COMMIT_RESULT_V1,
    status: value.status,
    entityId: value.entityId == null ? null : requiredContractText(value.entityId, 'result.entityId'),
    commandId: value.commandId == null ? null : requiredContractText(value.commandId, 'result.commandId'),
    rejectionCode,
    message,
    dragResult: optionalDragResult(value.dragResult),
    boundaryDecision: boundaryDecision(value.boundaryDecision, true),
    journalProjection: validateScopedEditJournalProjection(value.journalProjection),
    replayState: replayRecord(value.replayState),
    appliedCommandIds: uniqueTexts(value.appliedCommandIds, 'result.appliedCommandIds', true),
  }, 'Scoped edit commit result');
}

export function validateScopedEditRuntimeState(input) {
  const value = record(input, 'Scoped edit runtime state');
  schema(value.schema, SCOPED_EDIT_RUNTIME_STATE_V1, 'Scoped edit runtime state');
  if (!RUNTIME_STATUSES.includes(value.status)) throw new TypeError('Unknown scoped edit runtime status.');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0) throw new TypeError('Runtime sequence must be non-negative.');
  const sceneId = requiredContractText(value.sceneId, 'runtime.sceneId');
  if (value.status === SCOPED_EDIT_RUNTIME_STATUS.DESTROYED) {
    return immutableJson({ schema: SCOPED_EDIT_RUNTIME_STATE_V1, status: value.status, sceneId, sequence: value.sequence },
      'Destroyed scoped edit runtime state');
  }
  const scope = assertEngineeringScope(value.scope);
  if (value.scopedScene?.schema !== SCOPED_ENGINEERING_SCENE_SCHEMA) throw new TypeError('runtime.scopedScene schema is invalid.');
  const replayState = replayRecord(value.replayState);
  return immutableJson({
    schema: SCOPED_EDIT_RUNTIME_STATE_V1,
    status: value.status,
    sceneId,
    scope,
    scopedScene: value.scopedScene,
    activeEntityId: value.activeEntityId == null ? null : requiredContractText(value.activeEntityId, 'runtime.activeEntityId'),
    dragState: optionalDragState(value.dragState),
    lastDragResult: optionalDragResult(value.lastDragResult),
    journalProjection: validateScopedEditJournalProjection(value.journalProjection),
    replayState,
    appliedCommandIds: uniqueTexts(value.appliedCommandIds, 'runtime.appliedCommandIds', true),
    lastBoundaryDecision: boundaryDecision(value.lastBoundaryDecision, true),
    preparedCommit: value.preparedCommit == null ? null : validateScopedEditCommitProposal(value.preparedCommit),
    lastCommitResult: value.lastCommitResult == null ? null : validateScopedEditCommitResult(value.lastCommitResult),
    sequence: value.sequence,
  }, 'Scoped edit runtime state');
}

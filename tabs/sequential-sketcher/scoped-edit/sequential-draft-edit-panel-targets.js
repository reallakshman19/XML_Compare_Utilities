/** Exact current target state for the Draft Edit command panel; no gateway access. */
import { projectSequentialReversalCandidates } from '../sequential-engineering-svg-reversal-scene.js';

export const SEQUENTIAL_DRAFT_EDIT_CANDIDATE_COMMANDS = new Set([
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE',
]);
export const SEQUENTIAL_DRAFT_EDIT_BOUNDARY_COMMANDS = new Set([
  'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY',
]);
export const SEQUENTIAL_DRAFT_EDIT_REVERSAL_COMMANDS = new Set(['REVERSE_COMPONENT']);

function text(value) { return String(value ?? '').trim(); }

export function exactSequentialDraftEditCandidateTarget(state) {
  const target = state.candidateTarget;
  const request = state.current?.session?.currentDecisionRequest;
  if (!target || !request || state.current.session.state !== 'USER_DECISION_REQUIRED'
    || target.authorityId !== state.currentAuthorityId
    || target.branchId !== state.current.session.rootBranchId
    || target.decisionId !== request.decisionId
    || !(request.candidates || []).some((row) => row.candidateId === target.candidateId)) return null;
  return target;
}

export function currentSequentialDraftEditCandidate(state) {
  const target = exactSequentialDraftEditCandidateTarget(state);
  return target ? (state.current.session.currentDecisionRequest.candidates || [])
    .find((row) => row.candidateId === target.candidateId) || null : null;
}

function candidatePort(candidate, key, fallback) { return text(candidate?.[key] || candidate?.[fallback]); }
export function exactSequentialDraftEditManualPorts(state) {
  const candidate = currentSequentialDraftEditCandidate(state);
  const fromPortId = candidatePort(candidate, 'fromPortId', 'targetPortId');
  const toPortId = candidatePort(candidate, 'toPortId', 'connectedPortId');
  const ports = state.current?.indexes?.ports;
  if (!fromPortId || !toPortId || fromPortId === toPortId || !(ports instanceof Map)
    || !ports.has(fromPortId) || !ports.has(toPortId)) return null;
  return Object.freeze({ fromPortId, toPortId });
}

export function exactSequentialDraftEditDecisionTarget(state) {
  const target = state.decisionTarget;
  const request = state.current?.session?.currentDecisionRequest;
  if (!target || !request || state.current.session.state !== 'USER_DECISION_REQUIRED'
    || target.authorityId !== state.currentAuthorityId
    || target.branchId !== state.current.session.rootBranchId
    || target.decisionId !== request.decisionId || target.reason !== request.reason
    || request.state === 'DEFERRED' || (request.candidates || []).length) return null;
  return target;
}

export function exactSequentialDraftEditReversalTarget(state) {
  const target = state.reversalTarget;
  const request = state.current?.session?.currentDecisionRequest;
  const indexes = state.current?.indexes;
  if (!target || !request || state.current.session.state !== 'USER_DECISION_REQUIRED'
    || request.state === 'DEFERRED' || target.authorityId !== state.currentAuthorityId
    || target.branchId !== state.current.session.rootBranchId
    || target.decisionId !== request.decisionId
    || !(indexes?.components instanceof Map) || !(indexes?.ports instanceof Map)) return null;
  const candidate = projectSequentialReversalCandidates(state.current.session, indexes)
    .find((row) => row.candidateId === target.candidateId);
  if (!candidate || candidate.componentId !== target.componentId
    || candidate.entryPortId !== target.entryPortId
    || indexes.ports.get(target.entryPortId)?.componentId !== target.componentId) return null;
  return target;
}

export function sequentialDraftEditTargetFor(state, commandType) {
  if (SEQUENTIAL_DRAFT_EDIT_CANDIDATE_COMMANDS.has(commandType)) {
    return exactSequentialDraftEditCandidateTarget(state);
  }
  if (SEQUENTIAL_DRAFT_EDIT_BOUNDARY_COMMANDS.has(commandType)) {
    return exactSequentialDraftEditDecisionTarget(state);
  }
  if (SEQUENTIAL_DRAFT_EDIT_REVERSAL_COMMANDS.has(commandType)) {
    return exactSequentialDraftEditReversalTarget(state);
  }
  return null;
}

export function sequentialDraftEditCommandRequiresTarget(commandType) {
  return SEQUENTIAL_DRAFT_EDIT_CANDIDATE_COMMANDS.has(commandType)
    || SEQUENTIAL_DRAFT_EDIT_BOUNDARY_COMMANDS.has(commandType)
    || SEQUENTIAL_DRAFT_EDIT_REVERSAL_COMMANDS.has(commandType);
}

export function isSequentialDraftEditCommandMeaningful(state, commandType) {
  const session = state.current?.session;
  if (!session) return false;
  const request = session.currentDecisionRequest;
  if (commandType === 'MANUAL_CONNECT') {
    return Boolean(exactSequentialDraftEditManualPorts(state) && request?.state !== 'DEFERRED');
  }
  if (sequentialDraftEditCommandRequiresTarget(commandType)) {
    return Boolean(sequentialDraftEditTargetFor(state, commandType));
  }
  if (commandType === 'DEFER_DECISION') {
    return Boolean(session.state === 'USER_DECISION_REQUIRED' && request && request.state !== 'DEFERRED');
  }
  if (commandType === 'RESUME_DECISION') {
    return session.state === 'USER_DECISION_REQUIRED' && request?.state === 'DEFERRED';
  }
  if (commandType === 'UNDO_LAST_TRANSACTION') return Boolean(session.undoStack?.length);
  if (commandType === 'REDO_LAST_TRANSACTION') return Boolean(session.redoStack?.length);
  return !['USER_DECISION_REQUIRED', 'ROUTE_COMPLETE', 'FAILED'].includes(session.state);
}

import {
  advanceConstruction as advanceGatedConstruction,
  applyConstructionDecision as applyGatedConstructionDecision,
  createSequentialConstructionSession,
} from './sequential-source-boundary-engine.js';
import {
  CONSTRUCTION_STATES,
  DECISION_ACTIONS,
  freezeConstructionSession,
} from './sequential-construction-contract.js';
import { enrichCommittedConnectionEvidence } from './sequential-connection-audit.js';
import {
  deferSequentialConstructionDecision,
  recordSequentialConstructionTransaction,
  resumeSequentialConstructionDecision,
  undoLastSequentialConstructionTransaction,
} from './sequential-construction-transactions.js';
import {
  applyManualConnectionDecision,
  applyReverseComponentDecision,
} from './sequential-supervised-decision-actions.js';

export { createSequentialConstructionSession };

function enrichPendingBranchBoundary(session, indexes) {
  const transition = session?.transitionContext;
  if (!transition || transition.targetKind !== 'BRANCH' || transition.boundaryPosition) return session;
  if (transition.origin !== 'PENDING_JUNCTION') return session;
  const targetBranch = indexes.branches.get(transition.targetBranchId);
  if (!targetBranch?.headPosition) return session;
  return freezeConstructionSession({
    ...session,
    transitionContext: Object.freeze({
      ...transition,
      targetBoundaryRole: 'HEAD',
      boundaryPosition: Object.freeze({ ...targetBranch.headPosition }),
      boundaryPositionBasis: 'CREF_TARGET_HPOS',
    }),
  });
}

function finalizeRuntimeResult(previousSession, result, indexes) {
  const withBoundary = enrichPendingBranchBoundary(result.session, indexes);
  return Object.freeze({
    ...result,
    session: enrichCommittedConnectionEvidence(previousSession, withBoundary, indexes),
  });
}

function rawAdvance(session, evidenceModel, indexes, options = {}) {
  return finalizeRuntimeResult(
    session,
    advanceGatedConstruction(session, evidenceModel, indexes, options),
    indexes,
  );
}

function rawDecision(session, evidenceModel, indexes, action, payload = {}, options = {}) {
  return finalizeRuntimeResult(
    session,
    applyGatedConstructionDecision(session, evidenceModel, indexes, action, payload, options),
    indexes,
  );
}

export function advanceConstruction(session, evidenceModel, indexes, options = {}) {
  const result = rawAdvance(session, evidenceModel, indexes, options);
  return recordSequentialConstructionTransaction(session, result, {
    action: 'ADVANCE_ONE',
    actorProvenance: 'USER_COMMAND',
    outcome: result.outcome,
  });
}

export function applyConstructionDecision(session, evidenceModel, indexes, action, payload = {}, options = {}) {
  if (action === DECISION_ACTIONS.UNDO_LAST_TRANSACTION) {
    return undoLastSequentialConstructionTransaction(session, payload);
  }
  const deferred = session?.currentDecisionRequest?.state === 'DEFERRED';
  if (deferred && action !== DECISION_ACTIONS.RESUME_DECISION) {
    return Object.freeze({ session, outcome: 'DECISION_DEFERRED' });
  }
  let result;
  if (action === DECISION_ACTIONS.DEFER_DECISION) {
    result = deferSequentialConstructionDecision(session, payload);
  } else if (action === DECISION_ACTIONS.RESUME_DECISION) {
    result = resumeSequentialConstructionDecision(session);
  } else if (action === DECISION_ACTIONS.MANUAL_CONNECT) {
    result = applyManualConnectionDecision(
      session,
      evidenceModel,
      indexes,
      payload,
      options,
      rawDecision,
    );
  } else if (action === DECISION_ACTIONS.REVERSE_COMPONENT) {
    result = applyReverseComponentDecision(session, indexes, payload);
  } else {
    result = rawDecision(session, evidenceModel, indexes, action, payload, options);
  }
  return recordSequentialConstructionTransaction(session, result, {
    action,
    actorProvenance: 'USER_MANUAL',
    reason: payload.reason,
    evidenceNote: payload.evidenceNote,
    decisionId: session.currentDecisionRequest?.decisionId || null,
    payload,
    outcome: result.outcome,
  });
}

export function runConstructionUntilBlocked(session, evidenceModel, indexes, options = {}, maxSteps = 10000) {
  let current = session;
  const outcomes = [];
  for (let step = 0; step < maxSteps; step += 1) {
    const result = rawAdvance(current, evidenceModel, indexes, options);
    current = result.session;
    outcomes.push(result.outcome);
    if (['DECISION_REQUIRED', 'ROUTE_COMPLETE', 'FAILED'].includes(result.outcome)
      || current.state === CONSTRUCTION_STATES.USER_DECISION_REQUIRED
      || current.state === CONSTRUCTION_STATES.ROUTE_COMPLETE
      || current.state === CONSTRUCTION_STATES.FAILED) break;
  }
  const finalResult = Object.freeze({ session: current, outcomes: Object.freeze(outcomes) });
  const transacted = recordSequentialConstructionTransaction(session, {
    session: current,
    outcome: outcomes.at(-1) || 'NO_CHANGE',
  }, {
    action: 'RUN_UNTIL_BLOCKED',
    actorProvenance: 'USER_COMMAND',
    outcome: outcomes.at(-1) || 'NO_CHANGE',
  });
  return Object.freeze({
    ...finalResult,
    session: transacted.session,
  });
}

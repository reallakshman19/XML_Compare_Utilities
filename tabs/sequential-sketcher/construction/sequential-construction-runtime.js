import {
  advanceConstruction as advanceGatedConstruction,
  applyConstructionDecision as applyGatedConstructionDecision,
  createSequentialConstructionSession,
} from './sequential-source-boundary-engine.js';
import { CONSTRUCTION_STATES, freezeConstructionSession } from './sequential-construction-contract.js';
import { enrichCommittedConnectionEvidence } from './sequential-connection-audit.js';

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

export function advanceConstruction(session, evidenceModel, indexes, options = {}) {
  return finalizeRuntimeResult(
    session,
    advanceGatedConstruction(session, evidenceModel, indexes, options),
    indexes,
  );
}

export function applyConstructionDecision(session, evidenceModel, indexes, action, payload = {}, options = {}) {
  return finalizeRuntimeResult(
    session,
    applyGatedConstructionDecision(session, evidenceModel, indexes, action, payload, options),
    indexes,
  );
}

export function runConstructionUntilBlocked(session, evidenceModel, indexes, options = {}, maxSteps = 10000) {
  let current = session;
  const outcomes = [];
  for (let step = 0; step < maxSteps; step += 1) {
    const result = advanceConstruction(current, evidenceModel, indexes, options);
    current = result.session;
    outcomes.push(result.outcome);
    if (['DECISION_REQUIRED', 'ROUTE_COMPLETE', 'FAILED'].includes(result.outcome)
      || current.state === CONSTRUCTION_STATES.USER_DECISION_REQUIRED
      || current.state === CONSTRUCTION_STATES.ROUTE_COMPLETE
      || current.state === CONSTRUCTION_STATES.FAILED) break;
  }
  return Object.freeze({ session: current, outcomes: Object.freeze(outcomes) });
}

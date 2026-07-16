import {
  advanceConstruction as advanceGatedConstruction,
  applyConstructionDecision as applyGatedConstructionDecision,
  createSequentialConstructionSession,
} from './sequential-gated-construction-engine.js';
import { CONSTRUCTION_STATES } from './sequential-construction-contract.js';
import { enrichCommittedConnectionEvidence } from './sequential-connection-audit.js';

export { createSequentialConstructionSession };

export function advanceConstruction(session, evidenceModel, indexes, options = {}) {
  const result = advanceGatedConstruction(session, evidenceModel, indexes, options);
  return Object.freeze({
    ...result,
    session: enrichCommittedConnectionEvidence(session, result.session, indexes),
  });
}

export function applyConstructionDecision(session, evidenceModel, indexes, action, payload = {}, options = {}) {
  const result = applyGatedConstructionDecision(session, evidenceModel, indexes, action, payload, options);
  return Object.freeze({
    ...result,
    session: enrichCommittedConnectionEvidence(session, result.session, indexes),
  });
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

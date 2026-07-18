/** Immutable workspace state for trusted compare, guided review and ambiguity decisions. */
import { deepFreeze } from './revision-contract-utils.js';
import { attachProjectDocument, createProjectSession, detachProjectDocument } from './revision-session-contracts.js';
import { beginRevisionLoad, completeRevisionLoad, completeRevisionScope, createRevisionIntakeState, failRevisionLoad } from './revision-intake-state.js';
import {
  cancelComparisonState, completeComparisonState, createComparisonLifecycleState, failComparisonState,
  invalidateComparisonState, progressComparisonState, readyComparisonState, setComparisonPresentation,
  setComparisonQueueSearch, setComparisonReviewVisible, setComparisonSelection, setNeedsDecisionOnly,
  startComparisonState, toggleChangedReason, toggleComparisonCategory,
} from './revision-compare-lifecycle.js';
import {
  attachReviewAudit, createReviewLifecycleState, setReviewImportError, setReviewLifecycleSession,
  setReviewSearch, staleReviewLifecycle, startNewReviewForAudit, toggleReviewFilter,
} from './revision-review-lifecycle.js';
import {
  attachDecisionAudit, createDecisionLifecycleState, setDecisionImportError, setDecisionLifecycleLedger,
  setDecisionPreview, setDecisionUnresolvedOnly, staleDecisionLifecycle, startNewDecisionForAudit, toggleDecisionFilter,
} from './revision-decision-lifecycle.js';

export const REVISION_WORKSPACE_STATE_SCHEMA = 'RevisionCompareWorkspaceState.v4';
export const BASIS_STATUS = Object.freeze({ NONE: 'NONE', CURRENT: 'CURRENT', STALE: 'STALE' });
function staleStatus(state) { return state.basis ? BASIS_STATUS.STALE : BASIS_STATUS.NONE; }
function invalidated(state, updatedAt) {
  return { compare: invalidateComparisonState(state.compare), review: staleReviewLifecycle(state.review, updatedAt), decision: staleDecisionLifecycle(state.decision, updatedAt) };
}
export function createRevisionWorkspaceState(sessionId, createdAt) {
  return deepFreeze({
    schema: REVISION_WORKSPACE_STATE_SCHEMA, session: createProjectSession({ sessionId, createdAt }),
    slots: { baseline: createRevisionIntakeState('baseline', 'REFERENCE'), candidate: createRevisionIntakeState('candidate', 'CANDIDATE') },
    scopeDecisions: {}, proposal: null, basis: null, basisStatus: BASIS_STATUS.NONE,
    search: { common: '', revAOnly: '', revBOnly: '' }, message: 'Load Rev A and Rev B staged JSON files.',
    compare: createComparisonLifecycleState(), review: createReviewLifecycleState(), decision: createDecisionLifecycleState(),
  });
}
export function startWorkspaceLoad(state, slotId, generation, fileName, fileSizeBytes, updatedAt) {
  return deepFreeze({
    ...state, session: detachProjectDocument(state.session, slotId, updatedAt),
    slots: { ...state.slots, [slotId]: beginRevisionLoad(state.slots[slotId], generation, fileName, fileSizeBytes) },
    proposal: null, scopeDecisions: {}, basisStatus: staleStatus(state), ...invalidated(state, updatedAt),
    message: `Loading ${slotId === 'baseline' ? 'Rev A' : 'Rev B'}…`,
  });
}
export function finishWorkspaceLoad(state, slotId, result, updatedAt) {
  const slot = completeRevisionLoad(state.slots[slotId], result); if (slot === state.slots[slotId]) return state;
  return deepFreeze({
    ...state, session: attachProjectDocument(state.session, result.document, updatedAt), slots: { ...state.slots, [slotId]: slot },
    proposal: null, scopeDecisions: {}, basisStatus: staleStatus(state), ...invalidated(state, updatedAt), message: `${slotId === 'baseline' ? 'Rev A' : 'Rev B'} is ready.`,
  });
}
export function failWorkspaceLoad(state, slotId, generation, error) {
  const slot = failRevisionLoad(state.slots[slotId], generation, error); if (slot === state.slots[slotId]) return state;
  return deepFreeze({ ...state, slots: { ...state.slots, [slotId]: slot }, proposal: null, basisStatus: staleStatus(state), ...invalidated(state, state.session.updatedAt), message: slot.error });
}
export function setWorkspaceProposal(state, proposal, decisions = state.scopeDecisions, updatedAt = state.session.updatedAt) {
  return deepFreeze({
    ...state, scopeDecisions: decisions, proposal, basisStatus: state.basisStatus === BASIS_STATUS.CURRENT ? BASIS_STATUS.STALE : state.basisStatus,
    ...invalidated(state, updatedAt), message: proposal ? 'Review the proposed common and one-sided branch scope.' : state.message,
  });
}
export function finishWorkspaceScope(state, results, scopeDrafts, updatedAt) {
  const baseline = completeRevisionScope(state.slots.baseline, results.baseline, scopeDrafts.baseline);
  const candidate = completeRevisionScope(state.slots.candidate, results.candidate, scopeDrafts.candidate);
  let session = attachProjectDocument(state.session, baseline.document, updatedAt); session = attachProjectDocument(session, candidate.document, updatedAt);
  return deepFreeze({ ...state, session, slots: { baseline, candidate } });
}
export function setWorkspaceBasis(state, basis) { return deepFreeze({ ...state, basis, basisStatus: BASIS_STATUS.CURRENT, compare: readyComparisonState(state.compare), message: 'Comparison basis approved and ready for visual comparison.' }); }
export function setWorkspaceSearch(state, group, value) { return Object.hasOwn(state.search, group) ? deepFreeze({ ...state, search: { ...state.search, [group]: String(value ?? '') } }) : state; }
export function setWorkspaceMessage(state, message) { return deepFreeze({ ...state, message: String(message ?? '') }); }
export function resetWorkspaceSlot(state, slotId, generation, updatedAt) {
  return deepFreeze({
    ...state, session: detachProjectDocument(state.session, slotId, updatedAt),
    slots: { ...state.slots, [slotId]: deepFreeze({ ...createRevisionIntakeState(slotId, state.slots[slotId].role), requestGeneration: generation }) },
    proposal: null, scopeDecisions: {}, basisStatus: staleStatus(state), ...invalidated(state, updatedAt), message: `${slotId === 'baseline' ? 'Rev A' : 'Rev B'} load cancelled.`,
  });
}
export function startWorkspaceComparison(state, token) { return deepFreeze({ ...state, compare: startComparisonState(state.compare, token), message: 'Projecting approved revision scope.' }); }
export function progressWorkspaceComparison(state, token, progress) {
  const compare = progressComparisonState(state.compare, token, progress); return compare === state.compare ? state : deepFreeze({ ...state, compare, message: progress.stage });
}
export function completeWorkspaceComparison(state, token, audit, updatedAt) {
  const compare = completeComparisonState(state.compare, token, audit); if (compare === state.compare) return state;
  return deepFreeze({ ...state, compare, review: attachReviewAudit(state.review, audit, updatedAt), decision: attachDecisionAudit(state.decision, audit, updatedAt), message: 'Visual comparison complete.' });
}
export function cancelWorkspaceComparison(state) { return deepFreeze({ ...state, compare: cancelComparisonState(state.compare), message: 'Visual comparison cancelled.' }); }
export function failWorkspaceComparison(state, error) { return deepFreeze({ ...state, compare: failComparisonState(state.compare, error), message: String(error?.message ?? error) }); }
export function selectWorkspaceDifference(state, id) { return deepFreeze({ ...state, compare: setComparisonSelection(state.compare, id) }); }
export function setWorkspacePresentation(state, mode) { return deepFreeze({ ...state, compare: setComparisonPresentation(state.compare, mode) }); }
export function setWorkspaceQueueSearch(state, value) { return deepFreeze({ ...state, compare: setComparisonQueueSearch(state.compare, value) }); }
export function toggleWorkspaceCategory(state, category) { return deepFreeze({ ...state, compare: toggleComparisonCategory(state.compare, category) }); }
export function toggleWorkspaceChangedReason(state, reason) { return deepFreeze({ ...state, compare: toggleChangedReason(state.compare, reason) }); }
export function setWorkspaceNeedsDecision(state, enabled) { return deepFreeze({ ...state, compare: setNeedsDecisionOnly(state.compare, enabled) }); }
export function setWorkspaceReviewVisible(state, visible) { return deepFreeze({ ...state, compare: setComparisonReviewVisible(state.compare, visible) }); }
export function setWorkspaceReviewSession(state, session) { return deepFreeze({ ...state, review: setReviewLifecycleSession(state.review, session) }); }
export function setWorkspaceReviewImportError(state, error) { return deepFreeze({ ...state, review: setReviewImportError(state.review, error) }); }
export function startWorkspaceNewReviewSession(state, createdAt) {
  if (!state.compare.audit) throw new Error('A current comparison audit is required.');
  return deepFreeze({ ...state, review: startNewReviewForAudit(state.review, state.compare.audit, createdAt), compare: setComparisonSelection(state.compare, null) });
}
export function setWorkspaceReviewSearch(state, value) { return deepFreeze({ ...state, review: setReviewSearch(state.review, value) }); }
export function toggleWorkspaceReviewFilter(state, group, value) { return deepFreeze({ ...state, review: toggleReviewFilter(state.review, group, value) }); }
export function setWorkspaceDecisionLedger(state, ledger) { return deepFreeze({ ...state, decision: setDecisionLifecycleLedger(state.decision, ledger) }); }
export function setWorkspaceDecisionImportError(state, error) { return deepFreeze({ ...state, decision: setDecisionImportError(state.decision, error) }); }
export function startWorkspaceNewDecisionLedger(state, createdAt) {
  if (!state.compare.audit) throw new Error('A current comparison audit is required.');
  return deepFreeze({ ...state, decision: startNewDecisionForAudit(state.decision, state.compare.audit, createdAt) });
}
export function setWorkspaceDecisionPreview(state, differenceId, candidateIndex) { return deepFreeze({ ...state, decision: setDecisionPreview(state.decision, differenceId, candidateIndex) }); }
export function toggleWorkspaceDecisionFilter(state, value) { return deepFreeze({ ...state, decision: toggleDecisionFilter(state.decision, value) }); }
export function setWorkspaceDecisionUnresolvedOnly(state, enabled) { return deepFreeze({ ...state, decision: setDecisionUnresolvedOnly(state.decision, enabled) }); }

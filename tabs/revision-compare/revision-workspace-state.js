/** Immutable workspace state transitions for RC-001 intake and scope approval. */

import { deepFreeze } from './revision-contract-utils.js';
import { attachProjectDocument, createProjectSession, detachProjectDocument } from './revision-session-contracts.js';
import {
  beginRevisionLoad, completeRevisionLoad, completeRevisionScope,
  createRevisionIntakeState, failRevisionLoad,
} from './revision-intake-state.js';

export const REVISION_WORKSPACE_STATE_SCHEMA = 'RevisionCompareWorkspaceState.v1';
export const BASIS_STATUS = Object.freeze({ NONE: 'NONE', CURRENT: 'CURRENT', STALE: 'STALE' });

function staleStatus(state) {
  return state.basis ? BASIS_STATUS.STALE : BASIS_STATUS.NONE;
}

export function createRevisionWorkspaceState(sessionId, createdAt) {
  return deepFreeze({
    schema: REVISION_WORKSPACE_STATE_SCHEMA,
    session: createProjectSession({ sessionId, createdAt }),
    slots: {
      baseline: createRevisionIntakeState('baseline', 'REFERENCE'),
      candidate: createRevisionIntakeState('candidate', 'CANDIDATE'),
    },
    scopeDecisions: {},
    proposal: null,
    basis: null,
    basisStatus: BASIS_STATUS.NONE,
    search: { common: '', revAOnly: '', revBOnly: '' },
    message: 'Load Rev A and Rev B staged JSON files.',
  });
}

export function startWorkspaceLoad(state, slotId, generation, fileName, fileSizeBytes, updatedAt) {
  return deepFreeze({
    ...state,
    session: detachProjectDocument(state.session, slotId, updatedAt),
    slots: { ...state.slots, [slotId]: beginRevisionLoad(state.slots[slotId], generation, fileName, fileSizeBytes) },
    proposal: null,
    scopeDecisions: {},
    basisStatus: staleStatus(state),
    message: `Loading ${slotId === 'baseline' ? 'Rev A' : 'Rev B'}…`,
  });
}

export function finishWorkspaceLoad(state, slotId, result, updatedAt) {
  const slot = completeRevisionLoad(state.slots[slotId], result);
  if (slot === state.slots[slotId]) return state;
  return deepFreeze({
    ...state,
    session: attachProjectDocument(state.session, result.document, updatedAt),
    slots: { ...state.slots, [slotId]: slot },
    proposal: null,
    scopeDecisions: {},
    basisStatus: staleStatus(state),
    message: `${slotId === 'baseline' ? 'Rev A' : 'Rev B'} is ready.`,
  });
}

export function failWorkspaceLoad(state, slotId, generation, error) {
  const slot = failRevisionLoad(state.slots[slotId], generation, error);
  if (slot === state.slots[slotId]) return state;
  return deepFreeze({
    ...state,
    slots: { ...state.slots, [slotId]: slot },
    proposal: null,
    basisStatus: staleStatus(state),
    message: slot.error,
  });
}

export function setWorkspaceProposal(state, proposal, decisions = state.scopeDecisions) {
  return deepFreeze({
    ...state,
    scopeDecisions: decisions,
    proposal,
    basisStatus: state.basisStatus === BASIS_STATUS.CURRENT ? BASIS_STATUS.STALE : state.basisStatus,
    message: proposal ? 'Review the proposed common and one-sided branch scope.' : state.message,
  });
}

export function finishWorkspaceScope(state, results, scopeDrafts, updatedAt) {
  const baseline = completeRevisionScope(state.slots.baseline, results.baseline, scopeDrafts.baseline);
  const candidate = completeRevisionScope(state.slots.candidate, results.candidate, scopeDrafts.candidate);
  let session = attachProjectDocument(state.session, baseline.document, updatedAt);
  session = attachProjectDocument(session, candidate.document, updatedAt);
  return deepFreeze({ ...state, session, slots: { baseline, candidate } });
}

export function setWorkspaceBasis(state, basis) {
  return deepFreeze({
    ...state,
    basis,
    basisStatus: BASIS_STATUS.CURRENT,
    message: 'Comparison basis approved and current.',
  });
}

export function setWorkspaceSearch(state, group, value) {
  if (!Object.hasOwn(state.search, group)) return state;
  return deepFreeze({ ...state, search: { ...state.search, [group]: String(value ?? '') } });
}

export function setWorkspaceMessage(state, message) {
  return deepFreeze({ ...state, message: String(message ?? '') });
}

export function resetWorkspaceSlot(state, slotId, generation, updatedAt) {
  return deepFreeze({
    ...state,
    session: detachProjectDocument(state.session, slotId, updatedAt),
    slots: {
      ...state.slots,
      [slotId]: deepFreeze({ ...createRevisionIntakeState(slotId, state.slots[slotId].role), requestGeneration: generation }),
    },
    proposal: null,
    scopeDecisions: {},
    basisStatus: staleStatus(state),
    message: `${slotId === 'baseline' ? 'Rev A' : 'Rev B'} load cancelled.`,
  });
}

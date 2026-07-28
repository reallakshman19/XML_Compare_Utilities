/** Explicit candidate review state; suggestion is evidence and never auto-selection. */
import { immutableJson } from '../../../contracts/contract-values.js';
import {
  SEQUENTIAL_MOVE_SNAP_ACQUISITION_SCHEMA,
  createSequentialMoveSnapSelection,
  assertSequentialMoveSnapSelection,
} from './sequential-move-snap-contracts.js';

export const SEQUENTIAL_MOVE_SNAP_REVIEW_SCHEMA = 'SequentialMoveSnapReview.v1';

function assertAcquisition(value) {
  if (value?.schema !== SEQUENTIAL_MOVE_SNAP_ACQUISITION_SCHEMA) {
    throw new TypeError(`Snap review requires ${SEQUENTIAL_MOVE_SNAP_ACQUISITION_SCHEMA}.`);
  }
  return value;
}

function initialState() {
  return {
    schema: SEQUENTIAL_MOVE_SNAP_REVIEW_SCHEMA,
    acquisition: null,
    selectedCandidateId: null,
    selection: null,
    appliedCandidateId: null,
  };
}

function snapshot(state) {
  return immutableJson(state, 'Sequential move snap review state');
}

function selectCandidate(state, candidateId) {
  const acquisition = assertAcquisition(state.acquisition);
  const selection = createSequentialMoveSnapSelection({ acquisition, candidateId });
  state.selectedCandidateId = selection.candidate.id;
  state.selection = selection;
  return snapshot(state);
}

function cycleCandidate(state, amount) {
  const acquisition = assertAcquisition(state.acquisition);
  if (!acquisition.candidates.length) return snapshot(state);
  const current = acquisition.candidates.findIndex((row) => row.id === state.selectedCandidateId);
  const base = current < 0 ? (amount > 0 ? -1 : 0) : current;
  const index = (base + amount + acquisition.candidates.length) % acquisition.candidates.length;
  return selectCandidate(state, acquisition.candidates[index].id);
}

function applySelection(state) {
  const selection = assertSequentialMoveSnapSelection(state.selection);
  if (selection.acquisitionFingerprint !== state.acquisition?.acquisitionFingerprint) {
    throw new RangeError('Snap selection does not belong to the current acquisition.');
  }
  state.appliedCandidateId = selection.candidate.id;
  return selection;
}

export function createSequentialMoveSnapReviewStore() {
  let state = initialState();
  let destroyed = false;
  function assertLive() {
    if (destroyed) throw new Error('Sequential move snap review store is destroyed.');
  }
  function setAcquisition(acquisition) {
    assertLive();
    state = { ...initialState(), acquisition: assertAcquisition(acquisition) };
    return snapshot(state);
  }
  function clear() {
    assertLive();
    state = initialState();
    return snapshot(state);
  }
  return Object.freeze({
    schema: 'SequentialMoveSnapReviewStore.v1',
    setAcquisition,
    select(candidateId) { assertLive(); return selectCandidate(state, candidateId); },
    next() { assertLive(); return cycleCandidate(state, 1); },
    previous() { assertLive(); return cycleCandidate(state, -1); },
    apply() { assertLive(); return applySelection(state); },
    clear,
    getState() { assertLive(); return snapshot(state); },
    destroy() {
      if (destroyed) return false;
      state = initialState();
      destroyed = true;
      return true;
    },
  });
}

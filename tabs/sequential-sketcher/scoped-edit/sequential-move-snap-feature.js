/** Explicit acquisition/review/use lifecycle for Sequential move snap evidence. */
import { acquireSequentialMoveSnap, validateSequentialMoveSnapAcquisition } from './sequential-move-snap-acquisition.js';
import { createSequentialMoveSnapProfile } from './sequential-move-snap-contracts.js';
import { createSequentialMoveSnapReviewStore } from './sequential-move-snap-review-store.js';
import { sequentialMovePivot } from './sequential-single-entity-move-geometry.js';

export const SEQUENTIAL_MOVE_SNAP_FEATURE_SCHEMA = 'SequentialMoveSnapFeature.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}

function targetPoint(preview) {
  return {
    x: preview.pivot.x + preview.rawDelta.x,
    y: preview.pivot.y + preview.rawDelta.y,
    z: preview.pivot.z + preview.rawDelta.z,
  };
}

function selectedCandidate(state) {
  const review = state.review.getState();
  return review.acquisition?.candidates.find((row) => (
    row.id === review.selectedCandidateId
  )) || null;
}

function transient(state) {
  const review = state.review.getState();
  const acquisition = review.acquisition;
  if (!acquisition) return null;
  const selected = selectedCandidate(state);
  return {
    spheres: [
      { position: [acquisition.rawWorldPoint.x, acquisition.rawWorldPoint.y,
        acquisition.rawWorldPoint.z], radiusMm: 10, colorInt: 0x94a3b8 },
      ...acquisition.candidates.map((row) => ({
        position: [row.worldPoint.x, row.worldPoint.y, row.worldPoint.z],
        radiusMm: row.id === selected?.id ? 22 : 13,
        colorInt: row.id === selected?.id ? 0xfacc15 : 0x38bdf8,
      })),
    ],
  };
}

function refreshFeedback(state) {
  state.readViewer()?.setTransient?.(transient(state));
  state.onReviewChanged(state.review.getState());
}

function acquisitionInput(state, preview, profile) {
  const target = state.readTarget();
  if (!target || preview?.target?.moveTargetId !== target.moveTargetId) {
    throw new RangeError('Move snap acquisition requires the current exact move target and preview.');
  }
  return {
    profile,
    target,
    readModel: state.readModel(),
    scene: state.readScene(),
    viewer: state.readViewer(),
    constraint: preview.constraint,
    rawWorldPoint: targetPoint(preview),
  };
}

function acquire(state, input = {}) {
  const preview = state.readPreview();
  if (!preview) throw new RangeError('Create one raw move preview before acquiring snap evidence.');
  const profile = createSequentialMoveSnapProfile(input.profile);
  const acquisition = acquireSequentialMoveSnap(acquisitionInput(state, preview, profile));
  state.review.setAcquisition(acquisition);
  refreshFeedback(state);
  return acquisition;
}

function select(state, candidateId) {
  const review = state.review.select(candidateId);
  refreshFeedback(state);
  return review;
}

function cycle(state, direction) {
  const review = direction > 0 ? state.review.next() : state.review.previous();
  refreshFeedback(state);
  return review;
}

function useSelected(state) {
  const preview = state.readPreview();
  if (!preview) throw new RangeError('Move snap use requires the current raw preview.');
  const review = state.review.getState();
  const acquisition = validateSequentialMoveSnapAcquisition(review.acquisition,
    acquisitionInput(state, preview, review.acquisition.profile));
  if (acquisition.acquisitionFingerprint !== review.acquisition.acquisitionFingerprint) {
    throw new RangeError('Move snap acquisition changed during use revalidation.');
  }
  const selection = state.review.apply();
  const pivot = sequentialMovePivot(preview.target.geometryParts);
  const delta = {
    x: selection.candidate.worldPoint.x - pivot.x,
    y: selection.candidate.worldPoint.y - pivot.y,
    z: selection.candidate.worldPoint.z - pivot.z,
  };
  const snapped = state.stagePreview({
    target: preview.target,
    constraint: preview.constraint,
    delta,
    rawDelta: preview.rawDelta,
    snapSelection: selection,
    interaction: preview.interaction,
  });
  refreshFeedback(state);
  return snapped;
}

function clear(state, restoreRaw = true) {
  const preview = state.readPreview();
  state.review.clear();
  state.readViewer()?.setTransient?.(null);
  state.onReviewChanged(state.review.getState());
  if (restoreRaw && preview?.snapApplied) {
    return state.stagePreview({
      target: preview.target,
      constraint: preview.constraint,
      delta: preview.rawDelta,
      rawDelta: preview.rawDelta,
      interaction: preview.interaction,
    });
  }
  return preview;
}

export function createSequentialMoveSnapFeature(options = {}) {
  const state = {
    readTarget: requiredFunction(options.readTarget, 'readTarget'),
    readPreview: requiredFunction(options.readPreview, 'readPreview'),
    readModel: requiredFunction(options.readModel, 'readModel'),
    readScene: requiredFunction(options.readScene, 'readScene'),
    readViewer: requiredFunction(options.readViewer, 'readViewer'),
    stagePreview: requiredFunction(options.stagePreview, 'stagePreview'),
    onReviewChanged: requiredFunction(options.onReviewChanged, 'onReviewChanged'),
    review: createSequentialMoveSnapReviewStore(),
    destroyed: false,
  };
  function assertLive() {
    if (state.destroyed) throw new Error('Sequential move snap feature is destroyed.');
  }
  return Object.freeze({
    schema: SEQUENTIAL_MOVE_SNAP_FEATURE_SCHEMA,
    acquire(input) { assertLive(); return acquire(state, input); },
    select(candidateId) { assertLive(); return select(state, candidateId); },
    next() { assertLive(); return cycle(state, 1); },
    previous() { assertLive(); return cycle(state, -1); },
    useSelected() { assertLive(); return useSelected(state); },
    clear(restoreRaw = true) { assertLive(); return clear(state, restoreRaw); },
    getState() { assertLive(); return state.review.getState(); },
    destroy() {
      if (state.destroyed) return false;
      clear(state, false);
      state.review.destroy();
      state.destroyed = true;
      return true;
    },
  });
}

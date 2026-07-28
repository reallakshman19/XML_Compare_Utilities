/** Deterministic explicit move-snap acquisition; suggestion never changes geometry. */
import {
  createEngineeringSnapCandidate,
  validateEngineeringScene,
} from '../../../core/engineering-scene/index.js';
import { rankEngineeringSvgSnapCandidates } from '../../../core/engineering-svg/engineering-svg-snap-ranking.js';
import { immutableJson } from '../../../contracts/contract-values.js';
import { createSequentialEditableTopologySnapshot } from './sequential-editable-topology-snapshot.js';
import { assertSequentialScopedEditSceneAncestry } from './sequential-scoped-edit-scene-adapter.js';
import { validateSequentialSingleEntityMoveTarget } from './sequential-single-entity-move-target.js';
import {
  createSequentialMoveSnapAcquisition,
  createSequentialMoveSnapProfile,
  normalizeSequentialSnapPoint,
} from './sequential-move-snap-contracts.js';
import { deriveSequentialMoveSnapIntersectionCandidates } from './sequential-move-snap-intersections.js';
import { deriveSequentialMoveSnapSourceCandidates } from './sequential-move-snap-sources.js';
import { createSequentialMoveConstraint } from './sequential-single-entity-move-geometry.js';

function screenPoint(viewer, point, label) {
  const projected = viewer.worldToScreen?.([point.x, point.y, point.z]);
  if (!projected || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    throw new RangeError(`${label} cannot be projected into the active viewer.`);
  }
  return { x: projected.x, y: projected.y };
}

function completeCandidates(rows, rawScreenPoint, viewer) {
  return rows.map((row) => createEngineeringSnapCandidate({
    ...row,
    screenPoint: screenPoint(viewer, row.worldPoint, `Snap candidate ${row.id}`),
    screenDistance: Math.hypot(
      screenPoint(viewer, row.worldPoint, `Snap candidate ${row.id}`).x - rawScreenPoint.x,
      screenPoint(viewer, row.worldPoint, `Snap candidate ${row.id}`).y - rawScreenPoint.y,
    ),
  }));
}

function rankingOptions(input, profile, target) {
  return {
    aperture: profile.aperturePx,
    enabledModes: profile.enabledModes,
    excludeSourceEntityIds: target.geometryPartIds,
    constraint: createSequentialMoveConstraint(input.constraint),
    screenTolerance: profile.screenTolerancePx,
    worldTolerance: profile.worldTolerance,
  };
}

function currentAuthority(input) {
  const target = validateSequentialSingleEntityMoveTarget(input.target, {
    readModel: input.readModel,
    scene: input.scene,
  });
  const scene = assertSequentialScopedEditSceneAncestry(
    validateEngineeringScene(input.scene), input.readModel,
  );
  const snapshot = createSequentialEditableTopologySnapshot(input.readModel);
  return { target, scene, snapshot };
}

function rawPoints(input, profile, viewer) {
  const rawWorldPoint = normalizeSequentialSnapPoint(input.rawWorldPoint, profile);
  const supplied = input.rawScreenPoint;
  const rawScreenPoint = supplied && Number.isFinite(Number(supplied.x))
    && Number.isFinite(Number(supplied.y))
    ? { x: Number(supplied.x), y: Number(supplied.y) }
    : screenPoint(viewer, rawWorldPoint, 'Raw snap point');
  return { rawWorldPoint, rawScreenPoint };
}

export function acquireSequentialMoveSnap(input = {}) {
  const profile = createSequentialMoveSnapProfile(input.profile);
  const viewer = input.viewer;
  if (!viewer || typeof viewer.worldToScreen !== 'function') {
    throw new TypeError('Move snap acquisition requires viewer.worldToScreen.');
  }
  const authority = currentAuthority(input);
  const raw = rawPoints(input, profile, viewer);
  const source = deriveSequentialMoveSnapSourceCandidates({
    scene: authority.scene,
    snapshot: authority.snapshot,
    target: authority.target,
    constraint: input.constraint,
    rawWorldPoint: raw.rawWorldPoint,
    profile,
  });
  const intersections = deriveSequentialMoveSnapIntersectionCandidates({
    segments: source.segments,
    constraint: input.constraint,
    profile,
  });
  const candidates = completeCandidates(
    [...source.candidates, ...intersections.candidates], raw.rawScreenPoint, viewer,
  );
  const ranked = rankEngineeringSvgSnapCandidates(candidates, rankingOptions(
    input, profile, authority.target,
  ));
  return createSequentialMoveSnapAcquisition({
    profile,
    targetId: authority.target.moveTargetId,
    topologyFingerprint: authority.target.topologyFingerprint,
    geometryFingerprint: authority.target.geometryFingerprint,
    sceneRevision: authority.target.sceneRevision,
    constraint: createSequentialMoveConstraint(input.constraint),
    rawWorldPoint: raw.rawWorldPoint,
    rawScreenPoint: raw.rawScreenPoint,
    candidates: ranked.candidates,
    suggestedCandidateId: ranked.candidate?.id || null,
    rankingEvidence: ranked.evidence,
    derivationEvidence: {
      anchorCount: source.anchors.length,
      segmentCount: source.segments.length,
      intersectionPairs: intersections.consideredPairs,
      rejectedIntersectionPairs: intersections.rejectedPairs,
    },
  });
}

export function validateSequentialMoveSnapAcquisition(acquisition, input = {}) {
  if (acquisition?.schema !== 'SequentialMoveSnapAcquisition.v1') {
    throw new TypeError('Move snap acquisition must use SequentialMoveSnapAcquisition.v1.');
  }
  const rebuilt = acquireSequentialMoveSnap({
    ...input,
    profile: acquisition.profile,
    constraint: acquisition.constraint,
    rawWorldPoint: acquisition.rawWorldPoint,
    rawScreenPoint: acquisition.rawScreenPoint,
  });
  if (rebuilt.acquisitionFingerprint !== acquisition.acquisitionFingerprint
    || JSON.stringify(rebuilt) !== JSON.stringify(acquisition)) {
    const error = new RangeError('Move snap acquisition differs from current authority.');
    error.code = 'SEQUENTIAL_MOVE_SNAP_ACQUISITION_STALE';
    throw error;
  }
  return immutableJson(rebuilt, 'Validated Sequential move snap acquisition');
}

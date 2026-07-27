import { candidateFromTag } from './navis-tag-candidate-ranking.js';
import { coordinateProfileOptions, parseCoordinate } from './navis-tag-isonote-contracts.js';

function text(value) { return String(value ?? '').trim(); }
function number(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function sameNumber(left, right, tolerance = 1e-9) {
  const a = number(left);
  const b = number(right);
  return a != null && b != null && Math.abs(a - b) <= tolerance;
}

export function anchorBasisLabel(anchor = {}) {
  const tagId = text(anchor.resolvedTagId || anchor.tagId);
  const support = text(anchor.resolvedSupportIdentity || anchor.supportIdentity).replace(/^\/+/, '');
  return tagId && support ? `Tag ${tagId} ↔ /${support}` : '';
}

export function positionUnderAnchor(tag, anchor, config = {}) {
  if (!tag?.rawPosition || !anchor?.valid) return null;
  const effective = {
    ...config,
    navisEastingDatumMm: anchor.deltaEMm,
    navisNorthingDatumMm: anchor.deltaNMm,
    navisElevationDatumMm: anchor.deltaElMm,
  };
  return parseCoordinate(tag.rawPosition, tag.units, coordinateProfileOptions(effective, 'navis'));
}

function withAnchorBasis(candidate, anchor, evaluations) {
  const eligibleAnchorCount = evaluations.filter((item) => item.withinTolerance).length;
  const equivalentAnchorCount = evaluations.filter((item) => (
    item.withinTolerance === candidate.withinTolerance
    && sameNumber(item.normalizedGeometryRms, candidate.normalizedGeometryRms)
    && sameNumber(item.verticalResidualMm, candidate.verticalResidualMm)
    && sameNumber(item.spatialDistanceMm, candidate.spatialDistanceMm)
  )).length;
  const selectionReason = evaluations.length === 1 ? 'ONLY_VALID_ANCHOR'
    : candidate.withinTolerance && eligibleAnchorCount === 1 ? 'ONLY_IN_TOLERANCE_ANCHOR'
      : candidate.withinTolerance ? 'LOWEST_NORMALIZED_GEOMETRY_RMS'
        : 'LOWEST_NORMALIZED_TOLERANCE_DISTANCE';
  return {
    ...candidate,
    anchorBasisId: anchor.anchorId,
    anchorBasisLabel: anchorBasisLabel(anchor),
    anchorBasisTagId: anchor.resolvedTagId,
    anchorBasisSupportIdentity: anchor.resolvedSupportIdentity,
    anchorTransformDeltaEMm: anchor.deltaEMm,
    anchorTransformDeltaNMm: anchor.deltaNMm,
    anchorTransformDeltaElMm: anchor.deltaElMm,
    anchorSelectionReason: selectionReason,
    eligibleAnchorCount,
    equivalentAnchorCount,
    anchorEvaluations: evaluations.map((item) => ({
      anchorId: item.anchor.anchorId,
      anchorBasisLabel: anchorBasisLabel(item.anchor),
      withinTolerance: item.withinTolerance,
      score: item.score,
      normalizedGeometryRms: item.normalizedGeometryRms,
      normalizedToleranceDistance: item.normalizedToleranceDistance,
      verticalResidualMm: item.verticalResidualMm,
      spatialDistanceMm: item.spatialDistanceMm,
      failedAxes: item.failedAxes,
    })),
  };
}

function compareAnchorEvaluation(left, right) {
  if (left.withinTolerance !== right.withinTolerance) return left.withinTolerance ? -1 : 1;
  if (left.withinTolerance) {
    return (left.normalizedGeometryRms - right.normalizedGeometryRms)
      || (left.verticalResidualMm - right.verticalResidualMm)
      || (left.spatialDistanceMm - right.spatialDistanceMm)
      || left.anchor.anchorId.localeCompare(right.anchor.anchorId);
  }
  return (left.normalizedToleranceDistance - right.normalizedToleranceDistance)
    || (left.spatialDistanceMm - right.spatialDistanceMm)
    || (left.verticalResidualMm - right.verticalResidualMm)
    || left.anchor.anchorId.localeCompare(right.anchor.anchorId);
}

function compareAccepted(left, right) {
  return (right.score - left.score)
    || (left.normalizedGeometryRms - right.normalizedGeometryRms)
    || (left.horizontalDistanceMm - right.horizontalDistanceMm)
    || (left.verticalResidualMm - right.verticalResidualMm)
    || left.evidenceId.localeCompare(right.evidenceId);
}

function compareRejected(left, right) {
  return (left.normalizedToleranceDistance - right.normalizedToleranceDistance)
    || (left.spatialDistanceMm - right.spatialDistanceMm)
    || left.evidenceId.localeCompare(right.evidenceId);
}

function bestCandidateForTag(trace, supportPosition, tag, anchors, config) {
  const evaluations = [];
  for (const anchor of anchors) {
    const position = positionUnderAnchor(tag, anchor, config);
    if (!position) continue;
    const transformedTag = {
      ...tag,
      position,
      datumOffsetMm: position.datumOffsetMm,
      transformBasis: anchorBasisLabel(anchor),
    };
    evaluations.push({ ...candidateFromTag(trace, supportPosition, transformedTag, config), anchor });
  }
  if (!evaluations.length) return null;
  evaluations.sort(compareAnchorEvaluation);
  const best = evaluations[0];
  return withAnchorBasis(best, best.anchor, evaluations);
}

export function evaluateCandidatesAcrossAnchors(trace, supportPosition, navisTags, anchors, config) {
  const accepted = [];
  const rejected = [];
  for (const tag of navisTags || []) {
    if (!tag.rawPosition || !tag.commentBody) continue;
    const candidate = bestCandidateForTag(trace, supportPosition, tag, anchors, config);
    if (!candidate) continue;
    (candidate.withinTolerance ? accepted : rejected).push(candidate);
  }
  accepted.sort(compareAccepted);
  rejected.sort(compareRejected);
  return { candidates: accepted, nearestRejected: rejected[0] || null };
}

export const _test = Object.freeze({ compareAnchorEvaluation, bestCandidateForTag, sameNumber });

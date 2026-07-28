/** Qualified segment intersections for explicit Sequential move snap evidence. */
import { immutableJson } from '../../../contracts/contract-values.js';
import {
  SEQUENTIAL_MOVE_SNAP_MODE,
  SEQUENTIAL_MOVE_SNAP_REJECTION,
  createSequentialMoveSnapProfile,
  normalizeSequentialSnapNumber,
  normalizeSequentialSnapPoint,
  sequentialMoveSnapCandidateId,
} from './sequential-move-snap-contracts.js';
import { createSequentialMoveConstraint } from './sequential-single-entity-move-geometry.js';

function planeAxes(constraintInput) {
  const constraint = createSequentialMoveConstraint(constraintInput);
  if (constraint.kind !== 'plane') return null;
  return constraint.axes.map((axis) => axis.toLowerCase());
}

function remainingAxis(axes) {
  return ['x', 'y', 'z'].find((axis) => !axes.includes(axis));
}

function cross(left, right) {
  return left.x * right.y - left.y * right.x;
}

function projected(segment, axes) {
  const [u, v] = axes;
  return {
    start: { x: segment.start[u], y: segment.start[v] },
    end: { x: segment.end[u], y: segment.end[v] },
  };
}

function parameterIntersection(left, right, tolerance) {
  const p = left.start;
  const q = right.start;
  const r = { x: left.end.x - p.x, y: left.end.y - p.y };
  const s = { x: right.end.x - q.x, y: right.end.y - q.y };
  const denominator = cross(r, s);
  const qMinusP = { x: q.x - p.x, y: q.y - p.y };
  if (Math.abs(denominator) <= tolerance) return null;
  const leftT = cross(qMinusP, s) / denominator;
  const rightT = cross(qMinusP, r) / denominator;
  if (leftT < -tolerance || leftT > 1 + tolerance
    || rightT < -tolerance || rightT > 1 + tolerance) return null;
  return { leftT: Math.max(0, Math.min(1, leftT)),
    rightT: Math.max(0, Math.min(1, rightT)) };
}

function axisValue(segment, axis, parameter) {
  return segment.start[axis] + parameter * (segment.end[axis] - segment.start[axis]);
}

function qualifiedIntersection(left, right, axes, profile) {
  const parameters = parameterIntersection(
    projected(left, axes), projected(right, axes), profile.worldTolerance,
  );
  if (!parameters) return null;
  const outAxis = remainingAxis(axes);
  const leftOut = axisValue(left, outAxis, parameters.leftT);
  const rightOut = axisValue(right, outAxis, parameters.rightT);
  if (Math.abs(leftOut - rightOut) > profile.worldTolerance) return null;
  const point = Object.fromEntries(['x', 'y', 'z'].map((axis) => [
    axis, axisValue(left, axis, parameters.leftT),
  ]));
  return {
    point: normalizeSequentialSnapPoint(point, profile),
    leftT: normalizeSequentialSnapNumber(parameters.leftT, profile),
    rightT: normalizeSequentialSnapNumber(parameters.rightT, profile),
  };
}

function candidate(left, right, intersection, axes) {
  const pair = [left, right].sort((a, b) => a.segmentId.localeCompare(b.segmentId));
  const material = {
    mode: SEQUENTIAL_MOVE_SNAP_MODE.INTERSECTION,
    segmentIds: pair.map((row) => row.segmentId),
    worldPoint: intersection.point,
    plane: axes.join('').toUpperCase(),
  };
  return immutableJson({
    id: sequentialMoveSnapCandidateId(material),
    providerId: 'sequential:intersection',
    mode: SEQUENTIAL_MOVE_SNAP_MODE.INTERSECTION,
    sourceEntityIds: [...new Set(pair.map((row) => row.geometryPartId))].sort(),
    worldPoint: intersection.point,
    priority: 15,
    lockedAxes: Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, axes.includes(axis)])),
    compatibleConstraintKinds: ['plane'],
    compatibleReferenceIds: [],
    label: `Intersection ${pair[0].segmentId} × ${pair[1].segmentId}`,
    metadata: {
      derivation: 'QUALIFIED_SEGMENT_INTERSECTION',
      plane: axes.join('').toUpperCase(),
      sourceSegments: pair,
      parameters: Object.fromEntries([
        [left.segmentId, intersection.leftT],
        [right.segmentId, intersection.rightT],
      ].sort(([a], [b]) => a.localeCompare(b))),
    },
  }, 'Sequential intersection snap candidate');
}

function pairCount(length) {
  return length * (length - 1) / 2;
}

export function deriveSequentialMoveSnapIntersectionCandidates(input = {}) {
  const profile = createSequentialMoveSnapProfile(input.profile);
  const axes = planeAxes(input.constraint);
  if (!axes || !profile.enabledModes.includes(SEQUENTIAL_MOVE_SNAP_MODE.INTERSECTION)) {
    return immutableJson({ candidates: [], rejectedPairs: 0, consideredPairs: 0 },
      'Sequential intersection derivation');
  }
  const segments = [...(input.segments || [])]
    .sort((left, right) => left.segmentId.localeCompare(right.segmentId));
  const consideredPairs = pairCount(segments.length);
  if (consideredPairs > profile.maxIntersectionPairs) {
    const error = new RangeError(`Snap intersection pair envelope exceeded: ${consideredPairs}.`);
    error.code = SEQUENTIAL_MOVE_SNAP_REJECTION.INTERSECTION_ENVELOPE;
    throw error;
  }
  const candidates = [];
  let rejectedPairs = 0;
  for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
      const left = segments[leftIndex];
      const right = segments[rightIndex];
      if (left.geometryPartId === right.geometryPartId) { rejectedPairs += 1; continue; }
      const intersection = qualifiedIntersection(left, right, axes, profile);
      if (!intersection) { rejectedPairs += 1; continue; }
      candidates.push(candidate(left, right, intersection, axes));
    }
  }
  return immutableJson({
    candidates,
    rejectedPairs,
    consideredPairs,
  }, 'Sequential intersection derivation');
}

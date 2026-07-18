import { createEngineeringPoint3D } from './engineering-geometry-contracts.js';
import { freezeJsonValue } from './engineering-json-value.js';

export const ENGINEERING_SNAP_CANDIDATE_SCHEMA = 'EngineeringSnapCandidate.v1';
export const ENGINEERING_SNAP_ACQUISITION_SCHEMA = 'EngineeringSnapAcquisition.v1';
export const ENGINEERING_SNAP_EVIDENCE_SCHEMA = 'EngineeringSnapEvidence.v1';
export const ENGINEERING_SNAP_GENERIC_MODE = Object.freeze({
  ENDPOINT: 'endpoint',
  MIDPOINT: 'midpoint',
  CENTER: 'center',
  INTERSECTION: 'intersection',
  NEAREST: 'nearest',
  PROJECTION: 'projection',
});

const GENERIC_MODES = new Set(Object.values(ENGINEERING_SNAP_GENERIC_MODE));
const NAMESPACED_MODE = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)*$/;

function requiredText(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function finitePoint2D(value, label) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${label} must contain finite x and y values.`);
  }
  return Object.freeze({ x, y });
}

function mode(value) {
  const result = requiredText(value, 'Snap mode').toLowerCase();
  if (!GENERIC_MODES.has(result) && !NAMESPACED_MODE.test(result)) {
    throw new TypeError(`Snap mode "${result}" must be generic or namespaced.`);
  }
  return result;
}

function axes(value = {}) {
  return Object.freeze({ x: value.x === true, y: value.y === true, z: value.z === true });
}

function stringList(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  return Object.freeze(values.map((value, index) => requiredText(value, `${label}[${index}]`)));
}

export function createEngineeringSnapCandidate(input = {}) {
  const priority = Number(input.priority);
  const screenDistance = Number(input.screenDistance);
  if (!Number.isFinite(priority)) throw new TypeError('Snap priority must be finite.');
  if (!Number.isFinite(screenDistance) || screenDistance < 0) {
    throw new TypeError('Snap screen distance must be non-negative and finite.');
  }
  return freezeJsonValue({
    schema: ENGINEERING_SNAP_CANDIDATE_SCHEMA,
    id: requiredText(input.id, 'Snap candidate id'),
    providerId: requiredText(input.providerId, 'Snap provider id'),
    mode: mode(input.mode),
    sourceEntityIds: stringList(input.sourceEntityIds || [], 'sourceEntityIds'),
    worldPoint: createEngineeringPoint3D(input.worldPoint),
    screenPoint: finitePoint2D(input.screenPoint, 'Snap screenPoint'),
    screenDistance,
    priority,
    lockedAxes: axes(input.lockedAxes),
    compatibleConstraintKinds: stringList(input.compatibleConstraintKinds || [], 'compatibleConstraintKinds'),
    compatibleReferenceIds: stringList(input.compatibleReferenceIds || [], 'compatibleReferenceIds'),
    label: String(input.label || input.mode || ''),
    metadata: input.metadata ?? {},
  });
}

export function createEngineeringSnapEvidence(input = {}) {
  const count = (value, label) => {
    const result = Number(value ?? 0);
    if (!Number.isInteger(result) || result < 0) throw new TypeError(`${label} must be a non-negative integer.`);
    return result;
  };
  return freezeJsonValue({
    schema: ENGINEERING_SNAP_EVIDENCE_SCHEMA,
    considered: count(input.considered, 'considered'),
    compatible: count(input.compatible, 'compatible'),
    inAperture: count(input.inAperture, 'inAperture'),
    deduplicated: count(input.deduplicated, 'deduplicated'),
    winnerId: input.winnerId == null ? null : String(input.winnerId),
    orderedIds: stringList(input.orderedIds || [], 'orderedIds'),
    providerCounts: input.providerCounts ?? {},
    providerErrors: input.providerErrors ?? [],
  });
}

export function createEngineeringSnapAcquisition(input = {}) {
  const aperture = Number(input.aperture);
  if (!Number.isFinite(aperture) || aperture <= 0) throw new TypeError('Snap aperture must be positive and finite.');
  const candidate = input.candidate == null ? null : createEngineeringSnapCandidate(input.candidate);
  return freezeJsonValue({
    schema: ENGINEERING_SNAP_ACQUISITION_SCHEMA,
    rawScreenPoint: finitePoint2D(input.rawScreenPoint, 'rawScreenPoint'),
    rawWorldPoint: createEngineeringPoint3D(input.rawWorldPoint),
    aperture,
    candidate,
    acquiredWorldPoint: createEngineeringPoint3D(candidate?.worldPoint || input.rawWorldPoint),
    lockedAxes: axes(candidate?.lockedAxes),
    evidence: createEngineeringSnapEvidence(input.evidence),
  });
}

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
const CONSTRAINT_KINDS = new Set(['axis', 'plane', 'path', 'normal']);
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

function axes(value = {}, requireLock = false) {
  const result = Object.freeze({ x: value.x === true, y: value.y === true, z: value.z === true });
  if (requireLock && !result.x && !result.y && !result.z) {
    throw new TypeError('Snap candidate must lock at least one world axis.');
  }
  return result;
}

function uniqueStringList(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  const result = values.map((value, index) => requiredText(value, `${label}[${index}]`));
  if (new Set(result).size !== result.length) throw new TypeError(`${label} must contain unique values.`);
  return Object.freeze(result);
}

function constraintKinds(values) {
  const result = uniqueStringList(values || [], 'compatibleConstraintKinds');
  result.forEach((kind) => {
    if (!CONSTRAINT_KINDS.has(kind)) throw new TypeError(`Unsupported compatible constraint kind "${kind}".`);
  });
  return result;
}

function providerErrors(values = []) {
  if (!Array.isArray(values)) throw new TypeError('providerErrors must be an array.');
  return values.map((value, index) => Object.freeze({
    providerId: requiredText(value?.providerId, `providerErrors[${index}].providerId`),
    message: requiredText(value?.message, `providerErrors[${index}].message`),
  }));
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
    sourceEntityIds: uniqueStringList(input.sourceEntityIds || [], 'sourceEntityIds'),
    worldPoint: createEngineeringPoint3D(input.worldPoint),
    screenPoint: finitePoint2D(input.screenPoint, 'Snap screenPoint'),
    screenDistance,
    priority,
    lockedAxes: axes(input.lockedAxes, true),
    compatibleConstraintKinds: constraintKinds(input.compatibleConstraintKinds),
    compatibleReferenceIds: uniqueStringList(input.compatibleReferenceIds || [], 'compatibleReferenceIds'),
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
  const considered = count(input.considered, 'considered');
  const compatible = count(input.compatible, 'compatible');
  const inAperture = count(input.inAperture, 'inAperture');
  const deduplicated = count(input.deduplicated, 'deduplicated');
  if (compatible > considered || inAperture > compatible || deduplicated > inAperture) {
    throw new TypeError('Snap evidence counts are inconsistent.');
  }
  return freezeJsonValue({
    schema: ENGINEERING_SNAP_EVIDENCE_SCHEMA,
    considered,
    compatible,
    inAperture,
    deduplicated,
    winnerId: input.winnerId == null ? null : String(input.winnerId),
    orderedIds: uniqueStringList(input.orderedIds || [], 'orderedIds'),
    providerCounts: input.providerCounts ?? {},
    providerErrors: providerErrors(input.providerErrors),
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

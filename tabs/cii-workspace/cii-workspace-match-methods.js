import { deepFreeze } from './cii-workspace-contracts.js';
import { registeredCiiPoint } from './cii-workspace-geometry.js';

export const CII_MATCH_DEFAULTS = Object.freeze({
  spatialToleranceMm: 100,
  diameterRelativeTolerance: 0.10,
  wallRelativeTolerance: 0.10,
  networkPassingScore: 55,
  identityWeight: 50,
  diameterWeight: 30,
  wallWeight: 30,
});

function number(value) { return Number(value); }
function closeness(a, b, tolerance) {
  const left = number(a); const right = number(b); const scale = Math.max(number(tolerance) || 1, 1e-9);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.max(0, 1 - Math.abs(left - right) / scale);
}
function endpointDegrees(edge) {
  return [edge?.fromContext?.degree || 0, edge?.toContext?.degree || 0].sort((a, b) => a - b);
}
function midpoint(edge) {
  if (!edge?.fromPos || !edge?.toPos) return null;
  return {
    x: (number(edge.fromPos.x) + number(edge.toPos.x)) / 2,
    y: (number(edge.fromPos.y) + number(edge.toPos.y)) / 2,
    z: (number(edge.fromPos.z) + number(edge.toPos.z)) / 2,
  };
}
function stripDimensionTokens(value) {
  return String(value ?? '')
    .replace(/\|OD[^|]*/gi, '')
    .replace(/\|WT[^|]*/gi, '');
}
function jaccard(left = [], right = []) {
  const a = new Set(left.map(stripDimensionTokens)); const b = new Set(right.map(stripDimensionTokens));
  if (!a.size && !b.size) return 1;
  let hits = 0;
  for (const value of a) if (b.has(value)) hits += 1;
  return hits / Math.max(new Set([...a, ...b]).size, 1);
}
function contextSimilarity(left, right) {
  const a = left?.neighbourhoodLayers || []; const b = right?.neighbourhoodLayers || [];
  if (!a.length && !b.length) return closeness(left?.degree || 0, right?.degree || 0, 2);
  const weights = [1, 0.7, 0.45]; let total = 0; let weight = 0;
  for (let index = 0; index < weights.length; index += 1) {
    if (!a[index] && !b[index]) continue;
    total += weights[index] * jaccard(a[index] || [], b[index] || []); weight += weights[index];
  }
  return weight ? total / weight : 0;
}
function neighbourhoodSimilarity(source, target) {
  const direct = (contextSimilarity(source?.fromContext, target?.fromContext) + contextSimilarity(source?.toContext, target?.toContext)) / 2;
  const reverse = (contextSimilarity(source?.fromContext, target?.toContext) + contextSimilarity(source?.toContext, target?.fromContext)) / 2;
  return Math.max(direct, reverse);
}
function sequenceSimilarity(source, target) {
  const a = source?.pathSequenceContext || []; const b = target?.pathSequenceContext || [];
  if (!a.length || !b.length) return 0;
  const length = Math.max(a.length, b.length); let hits = 0;
  for (let index = 0; index < length; index += 1) if (a[index] === b[index]) hits += 1;
  return hits / length;
}
function stationFraction(edge) {
  if (edge?.pathStationMidMm == null) return null;
  const total = number(edge.pathTotalLengthMm || edge.pathTotalVectorLengthMm || 0);
  return total > 0 ? number(edge.pathStationMidMm) / total : null;
}
function networkBlockers(source, target) {
  const blockers = [];
  const s = endpointDegrees(source); const t = endpointDegrees(target);
  if ((s[1] >= 3) !== (t[1] >= 3)) blockers.push('BRANCH_TOPOLOGY_INCOMPATIBLE');
  if ((source?.componentKind === 'RIGID') !== (target?.componentKind === 'RIGID')) blockers.push('RIGID_COMPONENT_KIND_INCOMPATIBLE');
  return blockers;
}
function relativeEvidence(sourceValue, targetValue, tolerance, label) {
  const source = number(sourceValue); const target = number(targetValue);
  if (!(source > 0) || !(target > 0)) return deepFreeze({
    available: false, pass: false, relativeDelta: null, tolerance, source, target, reason: `${label}_UNAVAILABLE`,
  });
  const relativeDelta = Math.abs(target - source) / Math.abs(source);
  return deepFreeze({ available: true, pass: relativeDelta <= tolerance, relativeDelta, tolerance, source, target });
}

export function evaluateCiiSpatialMethod(source, target, options = {}) {
  const toleranceMm = number(options.spatialToleranceMm ?? options.coordinateToleranceMm ?? CII_MATCH_DEFAULTS.spatialToleranceMm);
  const sourceMid = midpoint(source); const targetMid = midpoint(target);
  if (!sourceMid || !targetMid) return deepFreeze({
    method: 'M1_SPATIAL', available: false, pass: false, score: 0, distanceMm: null,
    toleranceMm, basis: 'UNAVAILABLE', reasons: Object.freeze(['SPATIAL_COORDINATES_UNAVAILABLE']),
  });
  let comparedSource = sourceMid; let basis = 'RAW_GLOBAL';
  if (options.geometryTransform?.status === 'READY') {
    const registered = registeredCiiPoint(options.geometryTransform, sourceMid);
    if (registered) { comparedSource = registered; basis = 'REGISTERED'; }
  }
  const distanceMm = Math.hypot(comparedSource.x - targetMid.x, comparedSource.y - targetMid.y, comparedSource.z - targetMid.z);
  const pass = distanceMm <= toleranceMm;
  return deepFreeze({
    method: 'M1_SPATIAL', available: true, pass,
    score: Number((100 * closeness(distanceMm, 0, toleranceMm)).toFixed(1)),
    distanceMm, toleranceMm, basis,
    reasons: Object.freeze(pass ? [] : ['SPATIAL_TOLERANCE_EXCEEDED']),
  });
}

export function evaluateCiiNetworkMethod(source, target, options = {}) {
  const blockers = networkBlockers(source, target);
  const sDegrees = endpointDegrees(source); const tDegrees = endpointDegrees(target);
  const sourceStation = stationFraction(source); const targetStation = stationFraction(target);
  const components = {
    topology: 20 * Number(sDegrees[0] === tDegrees[0] && sDegrees[1] === tDegrees[1]),
    neighbourhood: 25 * neighbourhoodSimilarity(source, target),
    pathSequence: 20 * sequenceSimilarity(source, target),
    componentKind: 15 * Number(source?.componentKind === target?.componentKind),
    pathStation: sourceStation != null && targetStation != null ? 10 * closeness(sourceStation, targetStation, 0.12) : 0,
    localLength: 10 * closeness(source?.lengthMm, target?.lengthMm, options.networkLocalLengthToleranceMm || 250),
  };
  const score = blockers.length ? 0 : Object.values(components).reduce((sum, value) => sum + value, 0);
  const threshold = number(options.networkPassingScore ?? CII_MATCH_DEFAULTS.networkPassingScore);
  return deepFreeze({
    method: 'M2_NETWORK', available: true, pass: !blockers.length && score >= threshold,
    score: Number(score.toFixed(1)), threshold,
    components: Object.freeze(Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Number(value.toFixed(1))]))),
    blockers: Object.freeze(blockers),
    reasons: Object.freeze(blockers.length ? blockers : (score >= threshold ? [] : ['NETWORK_SCORE_BELOW_THRESHOLD'])),
  });
}

export function evaluateCiiDimensionEvidence(source, target, options = {}) {
  return deepFreeze({
    diameter: relativeEvidence(source?.diameter, target?.diameter,
      number(options.diameterRelativeTolerance ?? CII_MATCH_DEFAULTS.diameterRelativeTolerance), 'OD'),
    wall: relativeEvidence(source?.wall, target?.wall,
      number(options.wallRelativeTolerance ?? CII_MATCH_DEFAULTS.wallRelativeTolerance), 'WALL'),
  });
}

export function normalizedCiiMethodScore(method, dimensions, options = {}) {
  const identityWeight = number(options.identityWeight ?? CII_MATCH_DEFAULTS.identityWeight);
  const diameterWeight = number(options.diameterWeight ?? CII_MATCH_DEFAULTS.diameterWeight);
  const wallWeight = number(options.wallWeight ?? CII_MATCH_DEFAULTS.wallWeight);
  const total = identityWeight + diameterWeight + wallWeight;
  const earned = identityWeight * Number(Boolean(method?.pass))
    + diameterWeight * Number(Boolean(dimensions?.diameter?.pass))
    + wallWeight * Number(Boolean(dimensions?.wall?.pass));
  return total > 0 ? Number((100 * earned / total).toFixed(1)) : 0;
}

export function fuseCiiIdentityEvidence(m1, m2, dimensions, options = {}) {
  const m1Score = normalizedCiiMethodScore(m1, dimensions, options);
  const m2Score = normalizedCiiMethodScore(m2, dimensions, options);
  const dimensionsPass = Boolean(dimensions?.diameter?.pass && dimensions?.wall?.pass);
  let confidence = 'UNRESOLVED';

  if (m1?.available === false && m2?.pass) {
    // Missing coordinates are neutral evidence, not proof of a geometry change.
    confidence = dimensionsPass ? 'HIGH' : 'MEDIUM';
  } else if (m1?.pass && m2?.pass) {
    confidence = dimensionsPass ? 'HIGH' : 'MEDIUM';
  } else if (m1?.pass && !m2?.pass) confidence = 'REVIEW';
  else if (m1?.available !== false && !m1?.pass && m2?.pass) confidence = 'MEDIUM';

  const identitySupported = Boolean(m1?.pass || m2?.pass);
  return deepFreeze({
    confidence, identitySupported,
    weightedScores: Object.freeze({ m1: m1Score, m2: m2Score }),
    score: Math.max(m1Score, m2Score),
    reasons: Object.freeze([
      ...(!identitySupported ? ['IDENTITY_METHOD_NOT_SUPPORTED'] : []),
      ...(m1?.available === false && m2?.pass ? ['M1_UNAVAILABLE_M2_SUPPORTED'] : []),
      ...(m1?.pass && !m2?.pass ? ['M1_PASS_M2_FAIL_REVIEW_REQUIRED'] : []),
      ...(m1?.available !== false && !m1?.pass && m2?.pass ? ['M1_FAIL_M2_PASS_GEOMETRY_CHANGED'] : []),
      ...((m1?.pass || m1?.available === false) && m2?.pass && !dimensionsPass ? ['IDENTITY_SUPPORTED_DIMENSIONS_CHANGED'] : []),
    ]),
  });
}

export function evaluateCiiMatchMethods(source, target, options = {}) {
  const m1Spatial = evaluateCiiSpatialMethod(source, target, options);
  const m2Network = evaluateCiiNetworkMethod(source, target, options);
  const dimensions = evaluateCiiDimensionEvidence(source, target, options);
  const identity = fuseCiiIdentityEvidence(m1Spatial, m2Network, dimensions, options);
  return deepFreeze({ m1Spatial, m2Network, dimensions, identity });
}

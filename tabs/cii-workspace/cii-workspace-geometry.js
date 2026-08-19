import { deepFreeze } from './cii-workspace-contracts.js';

function finitePoint(point) {
  return point && [point.x, point.y, point.z].every((value) => Number.isFinite(Number(value)));
}
function vec(point) { return [Number(point.x), Number(point.y), Number(point.z)]; }
function add(a, b) { return a.map((value, index) => value + b[index]); }
function sub(a, b) { return a.map((value, index) => value - b[index]); }
function mul(a, k) { return a.map((value) => value * k); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function mag(a) { return Math.sqrt(dot(a, a)); }
function norm(a) { const length = mag(a); return length > 1e-9 ? mul(a, 1 / length) : null; }
function matVec(matrix, vector) { return matrix.map((row) => dot(row, vector)); }
function transpose(matrix) { return matrix[0].map((_, column) => matrix.map((row) => row[column])); }
function matMul(a, b) { const bt = transpose(b); return a.map((row) => bt.map((column) => dot(row, column))); }
function basisMatrix(e1, e2, e3) { return transpose([e1, e2, e3]); }
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

function basis(points, minSinAngle) {
  const origin = vec(points[0]);
  const first = sub(vec(points[1]), origin); const second = sub(vec(points[2]), origin);
  const firstLength = mag(first); const secondLength = mag(second);
  if (firstLength <= 1e-9 || secondLength <= 1e-9) return null;
  const sinAngle = mag(cross(first, second)) / (firstLength * secondLength);
  if (!Number.isFinite(sinAngle) || sinAngle < minSinAngle) return null;
  const e1 = norm(first); const e2 = norm(sub(second, mul(e1, dot(second, e1))));
  const e3 = e1 && e2 ? norm(cross(e1, e2)) : null;
  return e1 && e2 && e3 ? { origin, matrix: basisMatrix(e1, e2, e3), sinAngle } : null;
}

function transformPoint(transform, point) {
  return add(matVec(transform.rotation, vec(point)), transform.translation);
}
function residuals(transform, anchorPairs) {
  return anchorPairs.map((pair) => mag(sub(transformPoint(transform, pair.source), vec(pair.target))));
}
function rms(values) { return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length); }

function buildBasisHypothesis(pairs, anchorIndexes, minSinAngle) {
  const selected = anchorIndexes.map((index) => pairs[index]);
  const sourceBasis = basis(selected.map((pair) => pair.source), minSinAngle);
  const targetBasis = basis(selected.map((pair) => pair.target), minSinAngle);
  if (!sourceBasis || !targetBasis) return null;
  const rotation = matMul(targetBasis.matrix, transpose(sourceBasis.matrix));
  const translation = sub(targetBasis.origin, matVec(rotation, sourceBasis.origin));
  const errors = residuals({ rotation, translation }, pairs);
  return {
    basisId: `B${anchorIndexes.join('-')}`, anchorIndexes, rotation, translation,
    minimumAnchorSinAngle: Math.min(sourceBasis.sinAngle, targetBasis.sinAngle),
    residualsMm: errors, maxResidualMm: Math.max(...errors), rmsResidualMm: rms(errors),
  };
}

function enumerateBasisHypotheses(pairs, minSinAngle) {
  const hypotheses = [];
  for (let a = 0; a < pairs.length - 2; a += 1) {
    for (let b = a + 1; b < pairs.length - 1; b += 1) {
      for (let c = b + 1; c < pairs.length; c += 1) {
        const item = buildBasisHypothesis(pairs, [a, b, c], minSinAngle);
        if (item) hypotheses.push(item);
      }
    }
  }
  return hypotheses;
}

function sourceCentroid(pairs) {
  const count = pairs.length; const sum = [0, 0, 0];
  for (const pair of pairs) { const point = vec(pair.source); for (let i = 0; i < 3; i += 1) sum[i] += point[i]; }
  return sum.map((value) => value / count);
}
function sourceRadius(pairs, centroid) {
  return Math.max(...pairs.map((pair) => mag(sub(vec(pair.source), centroid))));
}
function rotationDifferenceDeg(left, right) {
  const relative = matMul(right.rotation, transpose(left.rotation));
  const cosine = clamp((relative[0][0] + relative[1][1] + relative[2][2] - 1) / 2, -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}
function probeDisagreement(left, right, points) {
  const valid = (points || []).filter(finitePoint);
  return valid.length ? Math.max(...valid.map((point) => mag(sub(transformPoint(left, point), transformPoint(right, point))))) : 0;
}
function compareHypotheses(left, right, pairs, probePoints) {
  const centroid = sourceCentroid(pairs); const radius = sourceRadius(pairs, centroid);
  const rotationDeg = rotationDifferenceDeg(left, right);
  const centroidMm = mag(sub(transformPoint(left, { x: centroid[0], y: centroid[1], z: centroid[2] }),
    transformPoint(right, { x: centroid[0], y: centroid[1], z: centroid[2] })));
  const rotationBoundMm = 2 * radius * Math.sin((rotationDeg * Math.PI / 180) / 2);
  const maxProbeDisagreementMm = probeDisagreement(left, right, probePoints);
  return {
    leftBasisId: left.basisId, rightBasisId: right.basisId, relativeRotationDeg: rotationDeg,
    centroidDisagreementMm: centroidMm, sourceRadiusMm: radius, rotationBoundMm,
    maxProbeDisagreementMm,
    materialDisagreementMm: Math.max(centroidMm + rotationBoundMm, maxProbeDisagreementMm),
  };
}

function basisConflicts(admissible, pairs, options) {
  const toleranceMm = Number(options.basisTransformAgreementToleranceMm ?? options.anchorResidualToleranceMm ?? 2);
  const probes = options.registrationProbePoints || [];
  const comparisons = []; const conflicts = [];
  for (let a = 0; a < admissible.length - 1; a += 1) {
    for (let b = a + 1; b < admissible.length; b += 1) {
      const item = compareHypotheses(admissible[a], admissible[b], pairs, probes);
      comparisons.push(item); if (item.materialDisagreementMm > toleranceMm) conflicts.push(item);
    }
  }
  return { toleranceMm, comparisons, conflicts };
}

function compareIndexes(left, right) {
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
}
function selectHypothesis(admissible) {
  return [...admissible].sort((a, b) => a.maxResidualMm - b.maxResidualMm
    || a.rmsResidualMm - b.rmsResidualMm
    || b.minimumAnchorSinAngle - a.minimumAnchorSinAngle
    || compareIndexes(a.anchorIndexes, b.anchorIndexes))[0];
}
function diagnosticHypothesis(item, toleranceMm) {
  return Object.freeze({ ...item, admissible: item.maxResidualMm <= toleranceMm });
}

function twoAnchorResult(pairs, toleranceMm) {
  const sourceSpan = mag(sub(vec(pairs[1].source), vec(pairs[0].source)));
  const targetSpan = mag(sub(vec(pairs[1].target), vec(pairs[0].target)));
  return deepFreeze({
    status: Math.abs(sourceSpan - targetSpan) <= toleranceMm ? 'UNDERDETERMINED' : 'INCOMPATIBLE',
    mode: 'COLLINEAR_AXIS_ONLY', reason: 'TWO_ANCHORS_LEAVE_ROTATION_ABOUT_COMMON_AXIS_UNRESOLVED',
    sourceSpanMm: sourceSpan, targetSpanMm: targetSpan, registeredWeight: 0,
  });
}

export function qualifyCiiGeometryTransform(anchorPairs, options = {}) {
  const pairs = (anchorPairs || []).filter((pair) => pair?.source && pair?.target);
  const toleranceMm = Number(options.anchorResidualToleranceMm ?? 2);
  const minSinAngle = Number(options.nonCollinearSinTolerance ?? 1e-4);
  if (!pairs.length) return deepFreeze({ status: 'UNAVAILABLE', reason: 'NO_LOCKED_GEOMETRY_ANCHORS', registeredWeight: 0 });
  if (!pairs.every((pair) => finitePoint(pair.source) && finitePoint(pair.target))) {
    return deepFreeze({ status: 'INCOMPATIBLE', reason: 'NON_FINITE_ANCHOR_COORDINATE', registeredWeight: 0 });
  }
  if (pairs.length === 1) return deepFreeze({ status: 'UNDERDETERMINED', mode: 'TRANSLATION_ONLY', reason: 'ONE_ANCHOR_CANNOT_ESTABLISH_ROTATION', registeredWeight: 0 });
  if (pairs.length === 2) return twoAnchorResult(pairs, toleranceMm);
  const hypotheses = enumerateBasisHypotheses(pairs, minSinAngle);
  if (!hypotheses.length) return deepFreeze({ status: 'UNDERDETERMINED', mode: 'COLLINEAR_ANCHORS', reason: 'NON_COLLINEAR_ANCHORS_REQUIRED', registeredWeight: 0 });
  const admissible = hypotheses.filter((item) => item.maxResidualMm <= toleranceMm);
  const diagnostics = hypotheses.map((item) => diagnosticHypothesis(item, toleranceMm));
  if (!admissible.length) return deepFreeze({
    status: 'INCOMPATIBLE', mode: 'RIGID_3D_MULTI_BASIS', reason: 'NO_RIGID_BASIS_SATISFIES_ALL_ANCHORS',
    basisHypothesisCount: hypotheses.length, admissibleBasisCount: 0, basisHypotheses: diagnostics, registeredWeight: 0,
  });
  const agreement = basisConflicts(admissible, pairs, options);
  if (agreement.conflicts.length) return deepFreeze({
    status: 'AMBIGUOUS', mode: 'RIGID_3D_MULTI_BASIS', reason: 'METHOD_A_AMBIGUOUS_BASES',
    basisHypothesisCount: hypotheses.length, admissibleBasisCount: admissible.length,
    basisAgreementToleranceMm: agreement.toleranceMm, basisComparisons: agreement.comparisons,
    conflictingBasisComparisons: agreement.conflicts, basisHypotheses: diagnostics, registeredWeight: 0,
  });
  const selected = selectHypothesis(admissible);
  return deepFreeze({
    status: 'READY', mode: 'RIGID_3D', rotation: selected.rotation, translation: selected.translation,
    anchorIndexes: selected.anchorIndexes, selectedBasisId: selected.basisId,
    minimumAnchorSinAngle: selected.minimumAnchorSinAngle, maxResidualMm: selected.maxResidualMm,
    rmsResidualMm: selected.rmsResidualMm, basisHypothesisCount: hypotheses.length,
    admissibleBasisCount: admissible.length, basisAgreementToleranceMm: agreement.toleranceMm,
    basisComparisons: agreement.comparisons, basisHypotheses: diagnostics, registeredWeight: 8,
  });
}

export function registeredCiiPoint(transform, point) {
  if (transform?.status !== 'READY' || transform?.mode !== 'RIGID_3D' || !finitePoint(point)) return null;
  const result = transformPoint(transform, point);
  return Object.freeze({ x: result[0], y: result[1], z: result[2] });
}

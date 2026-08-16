import { deepFreeze } from './cii-workspace-contracts.js';

function vec(point) { return [Number(point?.x || 0), Number(point?.y || 0), Number(point?.z || 0)]; }
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

function basis(points) {
  const origin = vec(points[0]);
  const e1 = norm(sub(vec(points[1]), origin));
  if (!e1) return null;
  const raw2 = sub(vec(points[2]), origin);
  const e2 = norm(sub(raw2, mul(e1, dot(raw2, e1))));
  if (!e2) return null;
  const e3 = norm(cross(e1, e2));
  return e3 ? { origin, matrix: basisMatrix(e1, e2, e3) } : null;
}

function transformPoint(transform, point) {
  return add(matVec(transform.rotation, vec(point)), transform.translation);
}

function residuals(transform, anchorPairs) {
  return anchorPairs.map((pair) => mag(sub(transformPoint(transform, pair.source), vec(pair.target))));
}

export function qualifyCiiGeometryTransform(anchorPairs, options = {}) {
  const pairs = (anchorPairs || []).filter((pair) => pair?.source && pair?.target);
  const toleranceMm = Number(options.anchorResidualToleranceMm || 2);
  if (!pairs.length) return deepFreeze({ status: 'UNAVAILABLE', reason: 'NO_LOCKED_GEOMETRY_ANCHORS', registeredWeight: 0 });
  if (pairs.length === 1) {
    return deepFreeze({ status: 'UNDERDETERMINED', mode: 'TRANSLATION_ONLY', reason: 'ONE_ANCHOR_CANNOT_ESTABLISH_ROTATION', registeredWeight: 0 });
  }
  if (pairs.length === 2) {
    const sourceSpan = mag(sub(vec(pairs[1].source), vec(pairs[0].source)));
    const targetSpan = mag(sub(vec(pairs[1].target), vec(pairs[0].target)));
    return deepFreeze({
      status: Math.abs(sourceSpan - targetSpan) <= toleranceMm ? 'UNDERDETERMINED' : 'INCOMPATIBLE',
      mode: 'COLLINEAR_AXIS_ONLY',
      reason: 'TWO_ANCHORS_LEAVE_ROTATION_ABOUT_COMMON_AXIS_UNRESOLVED',
      sourceSpanMm: sourceSpan, targetSpanMm: targetSpan, registeredWeight: 0,
    });
  }
  let triplet = null;
  for (let a = 0; a < pairs.length - 2 && !triplet; a += 1) {
    for (let b = a + 1; b < pairs.length - 1 && !triplet; b += 1) {
      for (let c = b + 1; c < pairs.length; c += 1) {
        const sourceBasis = basis([pairs[a].source, pairs[b].source, pairs[c].source]);
        const targetBasis = basis([pairs[a].target, pairs[b].target, pairs[c].target]);
        if (sourceBasis && targetBasis) { triplet = { sourceBasis, targetBasis }; break; }
      }
    }
  }
  if (!triplet) return deepFreeze({ status: 'UNDERDETERMINED', mode: 'COLLINEAR_ANCHORS', reason: 'NON_COLLINEAR_ANCHORS_REQUIRED', registeredWeight: 0 });
  const rotation = matMul(triplet.targetBasis.matrix, transpose(triplet.sourceBasis.matrix));
  const translation = sub(triplet.targetBasis.origin, matVec(rotation, triplet.sourceBasis.origin));
  const candidate = { rotation, translation };
  const errors = residuals(candidate, pairs);
  const maxResidualMm = Math.max(...errors);
  const rmsResidualMm = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
  const status = maxResidualMm <= toleranceMm ? 'READY' : 'INCOMPATIBLE';
  return deepFreeze({ status, mode: 'RIGID_3D', rotation, translation, maxResidualMm, rmsResidualMm, registeredWeight: status === 'READY' ? 8 : 0 });
}

export function registeredCiiPoint(transform, point) {
  if (transform?.status !== 'READY' || transform?.mode !== 'RIGID_3D') return null;
  const result = transformPoint(transform, point);
  return Object.freeze({ x: result[0], y: result[1], z: result[2] });
}

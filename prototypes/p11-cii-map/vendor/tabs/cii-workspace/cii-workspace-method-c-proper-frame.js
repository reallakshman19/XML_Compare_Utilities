// Candidate-only proper 3D frame from two nonparallel signed original ELEMENT paths.
// This pure primitive cannot authenticate an anchor, establish full pose uniqueness,
// or certify physical NODE identity. The caller must check all D/H witnesses.
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => Math.hypot(...v);
const mul = (v, scale) => v.map((x) => x * scale);
const finite3 = (v) => Array.isArray(v) && v.length === 3 &&
  v.every((x) => typeof x === 'number' && Number.isFinite(x));

function orthonormalFrame(vectors, minimumSine) {
  const [a, b] = vectors;
  const al = norm(a), bl = norm(b);
  if (!(al > 1e-9 && bl > 1e-9)) return null;
  const e1 = mul(a, 1 / al);
  const orthogonal = sub(b, mul(e1, dot(b, e1)));
  const orthogonalLength = norm(orthogonal);
  if (orthogonalLength / bl < minimumSine) return null;
  const e2 = mul(orthogonal, 1 / orthogonalLength);
  return [e1, e2, cross(e1, e2)];
}
function transformMatrix(source, target) {
  // Basis vectors are columns; proper R = TARGET_basis * SOURCE_basis^T.
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
    target.reduce((sum, vector, k) => sum + vector[i] * source[k][j], 0)));
}
function point(matrix, xyz) { return matrix.map((row) => dot(row, xyz)); }
function reject(code) { return { status: code, rotation: null, translation: null,
  qualified: false, identified: false, writerEligible: false,
  physicalNodeCorrespondenceQualified: false }; }

export function methodCProperFrameProposal({ sourceAnchor, targetAnchor, sourceVectors,
  targetVectors, minimumSine = 0.01, lengthToleranceMm = 0.02,
  angleTolerance = 1e-5 } = {}) {
  if (!finite3(sourceAnchor) || !finite3(targetAnchor) ||
      !Array.isArray(sourceVectors) || !Array.isArray(targetVectors) ||
      sourceVectors.length !== 2 || targetVectors.length !== 2 ||
      ![...sourceVectors, ...targetVectors].every(finite3))
    throw new Error('METHOD_C_SIGNED_FRAME_INPUT_REQUIRED');
  if (![minimumSine, lengthToleranceMm, angleTolerance].every(Number.isFinite) ||
      minimumSine <= 0 || minimumSine > 1 || lengthToleranceMm < 0 ||
      angleTolerance < 0 || angleTolerance > 1)
    throw new Error('METHOD_C_SIGNED_FRAME_POLICY_INVALID');
  const src = orthonormalFrame(sourceVectors, minimumSine);
  const tgt = orthonormalFrame(targetVectors, minimumSine);
  if (!src || !tgt) return reject('NONCOLLINEAR_SIGNED_PATH_BASIS_REQUIRED');
  const sourceLengths = sourceVectors.map(norm);
  const targetLengths = targetVectors.map(norm);
  if (sourceLengths.some((length, i) => Math.abs(length - targetLengths[i]) > lengthToleranceMm))
    return reject('SIGNED_ELEMENT_PATH_LENGTH_INCOMPATIBLE');
  const cosine = (vectors) => dot(vectors[0], vectors[1]) /
    (norm(vectors[0]) * norm(vectors[1]));
  if (Math.abs(cosine(sourceVectors) - cosine(targetVectors)) > angleTolerance)
    return reject('SIGNED_PATH_ANGLE_INCOMPATIBLE');
  const rotation = transformMatrix(src, tgt);
  const translation = sub(targetAnchor, point(rotation, sourceAnchor));
  const endpointResidualsMm = sourceVectors.map((v, i) =>
    norm(sub(point(rotation, v), targetVectors[i])));
  if (endpointResidualsMm.some((value) => value > lengthToleranceMm * 2 + 1e-6))
    return reject('SIGNED_PATH_FRAME_RESIDUAL_INCOMPATIBLE');
  const determinant = dot(rotation[0], cross(rotation[1], rotation[2]));
  if (Math.abs(determinant - 1) > 1e-6)
    return reject('IMPROPER_FRAME_ROTATION_REJECTED');
  return { status: 'GEOMETRIC_FRAME_PROPOSAL_UNVERIFIED', rotation, translation,
    scale: 1, determinant, endpointResidualsMm, qualified: false, identified: false,
    physicalNodeCorrespondenceQualified: false, writerEligible: false,
    witnessAuthority: 'NEEDS_ORIGINAL_SIGNED_D_H_CUSTODY_AND_GLOBAL_COMPETITION' };
}

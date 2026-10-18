/**
 * I126-I02 DRAFT — typed Method C A-only presentation sidecar.
 * This adapter intentionally has no Writer2 imports, no correspondence mutation,
 * no certifier and no writer API. NOT installed in the repository.
 *
 * Caller MUST derive sourceGraph/targetGraph from verified ORIGINAL_BYTES via
 * buildOriginalGraphFromBytes and registration/candidates via Method C's
 * registerMethodC/findMethodCCandidates. This adapter CANNOT authenticate a
 * physical identity or standalone caller-supplied graph and NEVER claims to.
 */
export const METHOD_C_A_SCHEMA = 'MethodC.Writer2ReadOnlyGeometry.v1';
const SHA = /^[a-f0-9]{64}$/;
const STATUSES = new Set([
  'OUTSIDE_TOLERANCE', 'AMBIGUOUS', 'TARGET_COLLISION',
  'COORDINATE_NEAR_CANDIDATE', 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT',
  'ANCHORED_CONFLICT', 'OWNER_ANCHOR_EXPERIMENT',
]);
function fail(reason) { throw new Error('METHOD_C_A_SIDECAR_' + reason); }
function sha(v) { if (typeof v !== 'string' || !SHA.test(v)) fail('ORIGINAL_SHA_REQUIRED'); return v; }
function vec(values, n = 3) {
  if (!Array.isArray(values) || values.length !== n || values.some(v => !Number.isFinite(v)))
    fail('NONFINITE_VECTOR');
  return values.slice();
}
function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') fail('UNSAFE_FIELD');
      if (typeof val === 'function' || typeof val === 'symbol' || val === undefined) fail('NON_SERIALIZABLE');
      out[key] = copy(val);
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) fail('NONFINITE_NUMBER');
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') fail('NON_SERIALIZABLE');
  return value;
}
function freezeDeep(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}
function rigid(rotation) {
  if (!Array.isArray(rotation) || rotation.length !== 3) fail('PROPER_RIGID_REQUIRED');
  const r = rotation.map(row => vec(row));
  const dot = (a,b) => a.reduce((sum,v,i) => sum + v * b[i], 0);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++)
    if (Math.abs(dot(r[i],r[j]) - (i===j ? 1 : 0)) > 1e-6) fail('PROPER_RIGID_REQUIRED');
  const det = dot(r[0], [r[1][1]*r[2][2]-r[1][2]*r[2][1],
    r[1][2]*r[2][0]-r[1][0]*r[2][2], r[1][0]*r[2][1]-r[1][1]*r[2][0]]);
  if (Math.abs(det - 1) > 1e-6) fail('PROPER_RIGID_REQUIRED');
  return r;
}
function candidate(row, sourceSha, targetSha) {
  if (row.sourceSha !== sourceSha || row.targetSha !== targetSha) fail('CANDIDATE_CUSTODY_MISMATCH');
  if (!STATUSES.has(row.status)) fail('INVALID_CANDIDATE_STATUS');
  const alternatives = (row.alternatives || []).map(a => ({
    target: String(a.target), distanceMm: Number(a.distance),
    residual: vec(a.residual), originalElementWitnesses: copy(a.originalElements || []),
    od: a.od ?? null, wall: a.wall ?? null,
  }));
  for (const alt of alternatives) if (!Number.isFinite(alt.distanceMm) || alt.distanceMm < 0) fail('INVALID_DISTANCE');
  const segmentOnly = row.status === 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT';
  if (segmentOnly && (alternatives.length || row.target)) fail('SEGMENT_CANNOT_BE_PHYSICAL_NODE');
  const segment = row.segment ? {
    endpoints: (row.segment.between || []).map(String),
    originalWitness: String(row.segment.witness || ''),
    projectedXYZ: vec(row.segment.xyz),
    fraction: row.segment.t, distanceMm: row.segment.distance,
    element: row.segment.element,
  } : null;
  if (segmentOnly && (!segment || segment.endpoints.length !== 2 ||
      !Number.isFinite(segment.fraction) || segment.fraction < 0 || segment.fraction > 1))
    fail('SEGMENT_WITNESS_REQUIRED');
  return {
    sourceNode: String(row.source), status: row.status,
    physicalIdentityQualified: false, writerEligible: false,
    selectedPhysicalTarget: null, // A candidates NEVER elect a physical identity.
    geometricNearestTarget: row.nearest?.target == null ? null : String(row.nearest.target),
    alternatives, segmentOnly: segment, sourceXYZ: vec(row.original), registeredXYZ: vec(row.xyz),
    originalSourceElementWitnesses: copy(row.originalElements || []),
    contestedTargets: (row.contestedTargets || []).map(String),
    sourceOD: row.sourceOd ?? null, sourceWall: row.sourceWall ?? null,
    explanation: String(row.explanation || ''),
  };
}
/** A presentational envelope; must NEVER be supplied to an identity resolver. */
export function createMethodCASidecar({sourceSetSha256, sourceId, sessionEpoch,
  sourceGraph, targetGraph, registration, candidates, tolerance = {x:100,y:100,z:100}}) {
  const sourceSha = sha(sourceGraph?.sha256), targetSha = sha(targetGraph?.sha256);
  sha(sourceSetSha256);
  if (!/^S[123]$/.test(sourceId) || sourceGraph.member !== sourceId || targetGraph.member !== 'T')
    fail('WRONG_MEMBER');
  if (sourceGraph.byteAuthority !== 'ORIGINAL_BYTES' || targetGraph.byteAuthority !== 'ORIGINAL_BYTES')
    fail('ORIGINAL_GRAPH_REQUIRED');
  if (!Number.isSafeInteger(sessionEpoch) || sessionEpoch < 0) fail('SESSION_EPOCH_REQUIRED');
  if (registration?.sourceSha !== sourceSha || registration?.targetSha !== targetSha ||
      registration?.sourceMember !== sourceId || registration?.targetMember !== targetGraph.member)
    fail('REGISTRATION_CUSTODY_MISMATCH');
  if (registration.scale !== undefined && registration.scale !== 1) fail('PROPER_RIGID_REQUIRED');
  const isHold = registration.status === 'HOLD';
  const rotation = isHold ? null : rigid(registration.rotation);
  const translation = isHold ? null : vec(registration.translation);
  if (registration.qualified || registration.writerEligible || registration.applyAuthorized ||
      registration.ownerAnchorAuthenticated || registration.physicalNodeCorrespondenceQualified)
    fail('UNAUTHORIZED_REGISTRATION');
  for (const axis of ['x','y','z']) if (!Number.isFinite(tolerance[axis]) || tolerance[axis] < 0 || tolerance[axis] > 100000)
    fail('INVALID_TOLERANCE');
  if (!isHold && (!candidates || !Array.isArray(candidates.rows))) fail('CANDIDATES_REQUIRED');
  if (isHold && candidates?.rows?.length) fail('HOLD_WITH_CANDIDATES');
  if (!isHold && (candidates.qualifiedIdentityCount !== 0 ||
      ['x','y','z'].some(axis => candidates.tolerance?.[axis] !== tolerance[axis])))
    fail('CANDIDATE_POLICY_MISMATCH');
  const rows = isHold ? [] : candidates.rows.map(row => candidate(row, sourceSha, targetSha));
  if (new Set(rows.map(row => row.sourceNode)).size !== rows.length) fail('DUPLICATE_SOURCE_NODE');
  return freezeDeep({
    schema: METHOD_C_A_SCHEMA, authority: 'READ_ONLY_UNVERIFIED_GEOMETRY',
    sourceSetSha256, sourceId, sourceOriginalSha256: sourceSha,
    targetOriginalSha256: targetSha, sessionEpoch,
    registration: {
      status: String(registration.status), reason: registration.reason ?? null,
      selectedPoseId: registration.selectedPoseId ?? null,
      rotation, translation, scale: 1,
      experimentalAnchors: copy(registration.anchors || []),
      originalDiscovery: copy(registration.originalDiscovery ?? null),
      sourceComponent: registration.sourceComponent ?? null,
      targetComponent: registration.targetComponent ?? null,
    },
    tolerance: copy(tolerance), rows, geometricCandidateCount: rows.length,
    qualifiedPhysicalIdentityCount: 0, writerEligible: false,
    applyAuthorized: false, mutationOperations: [],
  });
}
/** Reject a stale sidecar even when its payload remains structurally valid. */
export function assertMethodCASidecarCurrent(evidence, {sourceSetSha256, sourceId,
  sourceOriginalSha256, targetOriginalSha256, sessionEpoch}) {
  if (evidence?.schema !== METHOD_C_A_SCHEMA ||
      evidence.sourceSetSha256 !== sourceSetSha256 || evidence.sourceId !== sourceId ||
      evidence.sourceOriginalSha256 !== sourceOriginalSha256 ||
      evidence.targetOriginalSha256 !== targetOriginalSha256 ||
      evidence.sessionEpoch !== sessionEpoch) fail('STALE_EVIDENCE');
  return true;
}
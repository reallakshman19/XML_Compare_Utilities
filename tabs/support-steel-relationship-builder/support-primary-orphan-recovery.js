import {
  SUPPORT_REPORT_AXIAL_BORE_FACTOR,
  SUPPORT_REPORT_LATERAL_ALLOWANCE_MM,
  SUPPORT_REPORT_LATERAL_BORE_FACTOR,
  buildSupportReportPrincipalAxisModel,
  buildSupportReportTraversalGeometryIndex,
  deriveSupportReportLocationNominalBoreMm,
} from './support-report-location-grouping.js?v=20260915-support-primary-hardening-1';

export const SUPPORT_PRIMARY_ORPHAN_RECOVERY_SCHEMA = 'SupportPrimaryOrphanRecovery.v1';
export const SUPPORT_PRIMARY_ORPHAN_RECOVERY_PROFILE = 'SUPPORT_PRIMARY_ORPHAN_V1';
export const SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS = Object.freeze({
  enabled: true,
  axialMultiplier: 1,
  lateralMultiplier: 2,
  requireSameFamily: true,
  requireSamePipe: true,
  requireSameBore: true,
  requireUniqueTarget: true,
});

const EPSILON = 1e-9;
let runtimeConfig = SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS;

export function normalizeSupportPrimaryOrphanRecoveryConfig(input = {}) {
  return Object.freeze({
    enabled: booleanValue(input.enabled, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.enabled),
    axialMultiplier: nonNegative(input.axialMultiplier, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.axialMultiplier),
    lateralMultiplier: nonNegative(input.lateralMultiplier, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.lateralMultiplier),
    requireSameFamily: booleanValue(input.requireSameFamily, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.requireSameFamily),
    requireSamePipe: booleanValue(input.requireSamePipe, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.requireSamePipe),
    requireSameBore: booleanValue(input.requireSameBore, SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.requireSameBore),
    requireUniqueTarget: true,
  });
}

export function setSupportPrimaryOrphanRecoveryRuntimeConfig(input = {}) {
  runtimeConfig = normalizeSupportPrimaryOrphanRecoveryConfig(input);
  return runtimeConfig;
}

export function supportPrimaryOrphanRecoveryRuntimeConfig() {
  return runtimeConfig;
}

export function resolveSupportPrimaryOrphans(input = {}) {
  const config = normalizeSupportPrimaryOrphanRecoveryConfig(
    input.config == null ? supportPrimaryOrphanRecoveryRuntimeConfig() : input.config,
  );
  const locationGroups = Array.isArray(input.locationGroups) ? input.locationGroups : [];
  const assignments = Array.isArray(input.reconciliation?.assignments)
    ? input.reconciliation.assignments : [];
  const assignmentByGroupId = new Map(assignments.map((row) => [clean(row?.groupId), row]));
  const groupById = new Map(locationGroups.map((row) => [clean(row?.groupId), row]));
  const evidenceRows = locationGroups.flatMap((group) => Array.isArray(group?.evidenceRows) ? group.evidenceRows : []);
  const traversalGeometry = buildSupportReportTraversalGeometryIndex(evidenceRows);
  const pipeGeometry = buildPipeGeometryIndex(evidenceRows);
  const context = Object.freeze({
    config,
    locationGroups,
    assignmentByGroupId,
    groupById,
    traversalGeometry,
    pipeGeometry,
  });

  const sourceEvaluations = new Map();
  for (const group of locationGroups) {
    const groupId = clean(group?.groupId);
    const assignment = assignmentByGroupId.get(groupId) || null;
    if (assignment?.status !== 'GEOMETRY_ONLY') continue;
    sourceEvaluations.set(groupId, evaluateSource(group, assignment, context));
  }

  const resolutions = locationGroups.map((group) => resolveGroup(
    group,
    assignmentByGroupId.get(clean(group?.groupId)) || null,
    sourceEvaluations,
    context,
  ));
  const diagnostics = resolutions.flatMap((row) => resolutionDiagnostics(row));
  return Object.freeze({
    schema: SUPPORT_PRIMARY_ORPHAN_RECOVERY_SCHEMA,
    profileId: SUPPORT_PRIMARY_ORPHAN_RECOVERY_PROFILE,
    config,
    resolutions: Object.freeze(resolutions),
    diagnostics: Object.freeze(diagnostics),
    summary: Object.freeze({
      locationGroupCount: resolutions.length,
      orphanSourceCount: resolutions.filter((row) => row.sourceStatus === 'GEOMETRY_ONLY').length,
      recoveredExplicitCount: countStatus(resolutions, 'ORPHAN_RECOVERED_EXPLICIT'),
      recoveredGeometryCount: countStatus(resolutions, 'ORPHAN_RECOVERED_GEOMETRY'),
      ambiguousCount: countStatus(resolutions, 'ORPHAN_AMBIGUOUS'),
      nonReciprocalCount: countStatus(resolutions, 'ORPHAN_NONRECIPROCAL'),
      unresolvedCount: countStatus(resolutions, 'ORPHAN_UNRESOLVED'),
      disabledCount: countStatus(resolutions, 'DISABLED'),
    }),
  });
}

function evaluateSource(sourceGroup, sourceAssignment, context) {
  const evaluations = [];
  for (const targetGroup of context.locationGroups) {
    if (clean(targetGroup?.groupId) === clean(sourceGroup?.groupId)) continue;
    const targetAssignment = context.assignmentByGroupId.get(clean(targetGroup?.groupId)) || null;
    if (!eligibleTargetAssignment(targetAssignment)) continue;
    evaluations.push(evaluateCandidate(sourceGroup, sourceAssignment, targetGroup, targetAssignment, context));
  }
  const qualifying = evaluations.filter((row) => row.qualifies);
  const candidateIdentities = collapseCandidateIdentities(qualifying);
  const rejected = evaluations.filter((row) => !row.qualifies && Number.isFinite(row.normalizedScore))
    .sort(candidateEvaluationCompare);
  return Object.freeze({
    sourceGroupId: clean(sourceGroup?.groupId),
    sourceProvisionalAssemblyId: clean(sourceAssignment?.provisionalAssemblyId || sourceAssignment?.primarySupportAssemblyId),
    candidateIdentities: Object.freeze(candidateIdentities),
    nearestRejectedCandidate: rejected[0] ? freezeCandidateAudit(rejected[0]) : null,
    rejectionSummary: Object.freeze(rejectionSummary(evaluations)),
  });
}

function evaluateCandidate(sourceGroup, sourceAssignment, targetGroup, targetAssignment, context) {
  const config = context.config;
  const sourceFamily = familyToken(sourceGroup?.secondarySupportFamilyId);
  const targetFamily = familyToken(targetGroup?.secondarySupportFamilyId);
  const sourcePipe = token(sourceGroup?.fullLineTag);
  const targetPipe = token(targetGroup?.fullLineTag);
  const sourceBoreMm = groupBoreMm(sourceGroup);
  const targetBoreMm = groupBoreMm(targetGroup);
  const familyAvailable = Boolean(sourceFamily && targetFamily);
  const pipeAvailable = Boolean(sourcePipe && targetPipe);
  const boreAvailable = positive(sourceBoreMm) && positive(targetBoreMm);
  const familyMatch = familyAvailable && sourceFamily === targetFamily;
  const pipeMatch = pipeAvailable && sourcePipe === targetPipe;
  const boreMatch = boreAvailable && Math.abs(sourceBoreMm - targetBoreMm) <= EPSILON;
  const familyPass = !config.requireSameFamily || (familyAvailable && familyMatch);
  const pipePass = !config.requireSamePipe || (pipeAvailable && pipeMatch);
  const borePass = !config.requireSameBore || (boreAvailable && boreMatch);
  const branches = branchRelationship(sourceGroup, targetGroup);
  const branchOverridePass = !branches.different || (
    config.requireSameFamily && config.requireSamePipe && config.requireSameBore
    && familyMatch && pipeMatch && boreMatch
  );
  const pointA = sourceGroup?.representativeClashPointGlobalMm;
  const pointB = targetGroup?.representativeClashPointGlobalMm;
  const pointAvailable = validPoint(pointA) && validPoint(pointB);
  const boreForToleranceMm = recoveryBoreMm(sourceBoreMm, targetBoreMm, config);
  const axisModel = selectAxisModel(sourceGroup, targetGroup, context, branches, pipeMatch);
  const metrics = pointAvailable && positive(boreForToleranceMm) && axisModel?.trusted
    ? axisSeparation(pointA, pointB, axisModel.axis)
    : null;
  const baseAxialToleranceMm = positive(boreForToleranceMm)
    ? boreForToleranceMm * SUPPORT_REPORT_AXIAL_BORE_FACTOR : null;
  const baseLateralToleranceMm = positive(boreForToleranceMm)
    ? boreForToleranceMm * SUPPORT_REPORT_LATERAL_BORE_FACTOR + SUPPORT_REPORT_LATERAL_ALLOWANCE_MM : null;
  const recoveryAxialToleranceMm = Number.isFinite(baseAxialToleranceMm)
    ? baseAxialToleranceMm * config.axialMultiplier : null;
  const recoveryLateralToleranceMm = Number.isFinite(baseLateralToleranceMm)
    ? baseLateralToleranceMm * config.lateralMultiplier : null;
  const geometryPass = Boolean(metrics
    && metrics.axialMm <= recoveryAxialToleranceMm + EPSILON
    && metrics.lateralMm <= recoveryLateralToleranceMm + EPSILON);
  const qualifies = config.enabled && familyPass && pipePass && borePass && branchOverridePass
    && pointAvailable && positive(boreForToleranceMm) && Boolean(axisModel?.trusted) && geometryPass;
  const targetKind = targetAssignment?.status === 'EXPLICIT_ASSEMBLY' ? 'EXPLICIT' : 'GEOMETRY';
  const targetAssemblyId = targetKind === 'EXPLICIT'
    ? clean(targetAssignment?.primarySupportAssemblyId)
    : clean(targetAssignment?.provisionalAssemblyId || targetAssignment?.primarySupportAssemblyId);
  const targetIdentity = targetKind === 'EXPLICIT'
    ? `EXPLICIT::${targetAssemblyId}`
    : `GEOMETRY::${clean(targetGroup?.groupId)}`;
  const normalizedScore = metrics && positive(recoveryAxialToleranceMm) && positive(recoveryLateralToleranceMm)
    ? Math.max(metrics.axialMm / recoveryAxialToleranceMm, metrics.lateralMm / recoveryLateralToleranceMm)
    : Number.POSITIVE_INFINITY;
  return Object.freeze({
    sourceGroupId: clean(sourceGroup?.groupId),
    sourceAssemblyId: clean(sourceAssignment?.provisionalAssemblyId || sourceAssignment?.primarySupportAssemblyId),
    targetGroupId: clean(targetGroup?.groupId),
    targetFamilyId: clean(targetGroup?.secondarySupportFamilyId),
    targetKind,
    targetAssemblyId,
    targetIdentity,
    qualifies,
    normalizedScore,
    familyAvailable,
    familyMatch,
    familyPass,
    pipeAvailable,
    pipeMatch,
    pipePass,
    boreAvailable,
    boreMatch,
    borePass,
    branchRelationship: branches.status,
    branchOverridePass,
    pointAvailable,
    sourceBoreMm,
    targetBoreMm,
    toleranceBoreMm: boreForToleranceMm,
    axisBasis: axisModel?.basis || 'UNAVAILABLE',
    axisConfidenceRatio: Number.isFinite(axisModel?.confidenceRatio) ? axisModel.confidenceRatio : null,
    axialMm: metrics?.axialMm ?? null,
    lateralMm: metrics?.lateralMm ?? null,
    baseAxialToleranceMm,
    baseLateralToleranceMm,
    recoveryAxialToleranceMm,
    recoveryLateralToleranceMm,
    geometryPass,
    rejectionReasons: Object.freeze(candidateRejectionReasons({
      config,
      familyPass,
      pipePass,
      borePass,
      branchOverridePass,
      pointAvailable,
      boreForToleranceMm,
      axisModel,
      geometryPass,
    })),
  });
}

function resolveGroup(group, assignment, sourceEvaluations, context) {
  const groupId = clean(group?.groupId);
  const originalAssemblyId = clean(assignment?.primarySupportAssemblyId || assignment?.provisionalAssemblyId);
  if (assignment?.status !== 'GEOMETRY_ONLY') return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment?.status || 'UNRESOLVED',
    recoveryStatus: 'NOT_APPLICABLE',
    recoveryBasis: 'NON_GEOMETRY_ASSIGNMENT_IMMUTABLE',
    originalAssemblyId,
    effectiveAssemblyId: originalAssemblyId,
  });
  if (!context.config.enabled) return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'DISABLED',
    recoveryBasis: 'ORPHAN_RECOVERY_DISABLED',
    originalAssemblyId,
    effectiveAssemblyId: originalAssemblyId,
  });

  const evaluation = sourceEvaluations.get(groupId);
  const candidates = evaluation?.candidateIdentities || [];
  if (!candidates.length) return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'ORPHAN_UNRESOLVED',
    recoveryBasis: 'NO_UNIQUE_QUALIFYING_TARGET',
    originalAssemblyId,
    effectiveAssemblyId: originalAssemblyId,
    candidateTargetIds: [],
    candidateTargetGroupIds: [],
    nearestRejectedCandidate: evaluation?.nearestRejectedCandidate || null,
    rejectionSummary: evaluation?.rejectionSummary || {},
  });
  if (candidates.length > 1) return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'ORPHAN_AMBIGUOUS',
    recoveryBasis: 'MULTIPLE_QUALIFYING_TARGET_IDENTITIES',
    originalAssemblyId,
    effectiveAssemblyId: originalAssemblyId,
    candidateTargetIds: candidates.map((row) => row.targetAssemblyId || row.targetIdentity),
    candidateTargetGroupIds: unique(candidates.flatMap((row) => row.targetGroupIds)).sort(),
    candidateAudits: candidates,
    rejectionSummary: evaluation?.rejectionSummary || {},
  });

  const selected = candidates[0];
  if (selected.targetKind === 'EXPLICIT') return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'ORPHAN_RECOVERED_EXPLICIT',
    recoveryBasis: 'UNIQUE_EXPLICIT_ASSEMBLY_TARGET',
    originalAssemblyId,
    effectiveAssemblyId: selected.targetAssemblyId,
    targetAssemblyId: selected.targetAssemblyId,
    targetGroupIds: selected.targetGroupIds,
    candidateTargetIds: [selected.targetAssemblyId],
    candidateTargetGroupIds: selected.targetGroupIds,
    selectedCandidate: selected,
    rejectionSummary: evaluation?.rejectionSummary || {},
  });

  const targetGroupId = selected.targetGroupIds[0] || '';
  const reciprocal = sourceEvaluations.get(targetGroupId);
  const reciprocalCandidates = reciprocal?.candidateIdentities || [];
  const reciprocalUnique = reciprocalCandidates.length === 1
    && reciprocalCandidates[0].targetKind === 'GEOMETRY'
    && reciprocalCandidates[0].targetGroupIds.includes(groupId);
  if (!reciprocalUnique) return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'ORPHAN_NONRECIPROCAL',
    recoveryBasis: 'PROVISIONAL_TARGET_NOT_RECIPROCALLY_UNIQUE',
    originalAssemblyId,
    effectiveAssemblyId: originalAssemblyId,
    targetAssemblyId: selected.targetAssemblyId,
    targetGroupIds: selected.targetGroupIds,
    candidateTargetIds: [selected.targetAssemblyId || selected.targetIdentity],
    candidateTargetGroupIds: selected.targetGroupIds,
    selectedCandidate: selected,
    rejectionSummary: evaluation?.rejectionSummary || {},
  });

  const pairGroupIds = [groupId, targetGroupId].sort();
  const pairAssemblyId = recoveredPairAssemblyId(pairGroupIds, context.groupById);
  return freezeResolution({
    groupId,
    familyId: clean(group?.secondarySupportFamilyId),
    sourceStatus: assignment.status,
    recoveryStatus: 'ORPHAN_RECOVERED_GEOMETRY',
    recoveryBasis: 'RECIPROCAL_UNIQUE_PROVISIONAL_TARGET',
    originalAssemblyId,
    effectiveAssemblyId: pairAssemblyId,
    targetAssemblyId: selected.targetAssemblyId,
    targetGroupIds: selected.targetGroupIds,
    candidateTargetIds: [selected.targetAssemblyId || selected.targetIdentity],
    candidateTargetGroupIds: selected.targetGroupIds,
    selectedCandidate: selected,
    rejectionSummary: evaluation?.rejectionSummary || {},
  });
}

function collapseCandidateIdentities(rows) {
  const byIdentity = new Map();
  for (const row of rows || []) {
    const key = row.targetIdentity;
    if (!key) continue;
    if (!byIdentity.has(key)) byIdentity.set(key, []);
    byIdentity.get(key).push(row);
  }
  return [...byIdentity.entries()].map(([targetIdentity, candidates]) => {
    const sorted = [...candidates].sort(candidateEvaluationCompare);
    const best = sorted[0];
    return Object.freeze({
      targetIdentity,
      targetKind: best.targetKind,
      targetAssemblyId: best.targetAssemblyId,
      targetFamilyId: best.targetFamilyId,
      targetGroupIds: Object.freeze(unique(sorted.map((row) => row.targetGroupId)).sort()),
      familyMatch: best.familyMatch,
      pipeMatch: best.pipeMatch,
      boreMatch: best.boreMatch,
      branchRelationship: best.branchRelationship,
      axisBasis: best.axisBasis,
      axisConfidenceRatio: best.axisConfidenceRatio,
      axialMm: best.axialMm,
      lateralMm: best.lateralMm,
      baseAxialToleranceMm: best.baseAxialToleranceMm,
      baseLateralToleranceMm: best.baseLateralToleranceMm,
      recoveryAxialToleranceMm: best.recoveryAxialToleranceMm,
      recoveryLateralToleranceMm: best.recoveryLateralToleranceMm,
      normalizedScore: best.normalizedScore,
    });
  }).sort((left, right) => left.normalizedScore - right.normalizedScore
    || left.targetIdentity.localeCompare(right.targetIdentity));
}

function freezeCandidateAudit(row) {
  return Object.freeze({
    targetIdentity: row.targetIdentity,
    targetKind: row.targetKind,
    targetAssemblyId: row.targetAssemblyId,
    targetGroupId: row.targetGroupId,
    targetFamilyId: row.targetFamilyId,
    familyMatch: row.familyMatch,
    pipeMatch: row.pipeMatch,
    boreMatch: row.boreMatch,
    branchRelationship: row.branchRelationship,
    axisBasis: row.axisBasis,
    axisConfidenceRatio: row.axisConfidenceRatio,
    axialMm: row.axialMm,
    lateralMm: row.lateralMm,
    baseAxialToleranceMm: row.baseAxialToleranceMm,
    baseLateralToleranceMm: row.baseLateralToleranceMm,
    recoveryAxialToleranceMm: row.recoveryAxialToleranceMm,
    recoveryLateralToleranceMm: row.recoveryLateralToleranceMm,
    normalizedScore: row.normalizedScore,
    rejectionReasons: row.rejectionReasons,
  });
}

function freezeResolution(input) {
  const selected = input.selectedCandidate || null;
  return Object.freeze({
    groupId: input.groupId || '',
    familyId: input.familyId || '',
    sourceStatus: input.sourceStatus || '',
    recoveryStatus: input.recoveryStatus || '',
    recoveryBasis: input.recoveryBasis || '',
    originalAssemblyId: input.originalAssemblyId || '',
    effectiveAssemblyId: input.effectiveAssemblyId || input.originalAssemblyId || '',
    targetAssemblyId: input.targetAssemblyId || '',
    targetGroupIds: Object.freeze([...(input.targetGroupIds || [])]),
    candidateTargetIds: Object.freeze([...(input.candidateTargetIds || [])]),
    candidateTargetGroupIds: Object.freeze([...(input.candidateTargetGroupIds || [])]),
    candidateAudits: Object.freeze([...(input.candidateAudits || [])]),
    nearestRejectedCandidate: input.nearestRejectedCandidate || null,
    rejectionSummary: Object.freeze({ ...(input.rejectionSummary || {}) }),
    axialMm: selected?.axialMm ?? null,
    lateralMm: selected?.lateralMm ?? null,
    baseAxialToleranceMm: selected?.baseAxialToleranceMm ?? null,
    baseLateralToleranceMm: selected?.baseLateralToleranceMm ?? null,
    recoveryAxialToleranceMm: selected?.recoveryAxialToleranceMm ?? null,
    recoveryLateralToleranceMm: selected?.recoveryLateralToleranceMm ?? null,
    axisBasis: selected?.axisBasis || '',
    axisConfidenceRatio: Number.isFinite(selected?.axisConfidenceRatio) ? selected.axisConfidenceRatio : null,
    branchRelationship: selected?.branchRelationship || '',
  });
}

function buildPipeGeometryIndex(rows = []) {
  const buckets = new Map();
  for (const row of rows || []) {
    if (!validPoint(row?.clashPointGlobalMm)) continue;
    const key = token(row?.fullLineTag);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row.clashPointGlobalMm);
  }
  const output = new Map();
  for (const [key, points] of buckets) output.set(key, buildSupportReportPrincipalAxisModel(points));
  return output;
}

function selectAxisModel(sourceGroup, targetGroup, context, branches, samePipe) {
  const sourcePipe = token(sourceGroup?.fullLineTag);
  if (samePipe && branches.different) return trustedPipeModel(context.pipeGeometry.get(sourcePipe));
  const traversalModel = trustedTraversalModel(sourceGroup, context.traversalGeometry);
  if (traversalModel?.trusted) return traversalModel;
  return trustedPipeModel(context.pipeGeometry.get(sourcePipe));
}

function trustedPipeModel(model) {
  // A two-point pipe-wide model could be nothing more than the orphan/target pair.
  // Require a third independent point before pipe-level evidence can override traversal separation.
  return model?.trusted && Number(model?.pointCount || 0) >= 3 ? model : null;
}

function trustedTraversalModel(group, index) {
  const pipe = token(group?.fullLineTag);
  for (const branch of normalizedBranches(group)) {
    const model = index.get(`${pipe}::${branch || 'UNRESOLVED_BRANCH'}`);
    if (model?.trusted) return model;
  }
  const unresolved = index.get(`${pipe}::UNRESOLVED_BRANCH`);
  return unresolved?.trusted ? unresolved : null;
}

function branchRelationship(left, right) {
  const leftBranches = normalizedBranches(left);
  const rightBranches = normalizedBranches(right);
  if (!leftBranches.length || !rightBranches.length) return Object.freeze({
    status: 'UNAVAILABLE', different: false,
  });
  const overlap = leftBranches.some((branch) => rightBranches.includes(branch));
  return Object.freeze({ status: overlap ? 'SAME_TRAVERSAL' : 'DIFFERENT_TRAVERSAL', different: !overlap });
}

function normalizedBranches(group) {
  return unique((group?.branchNodes || []).map(token).filter(Boolean)).sort();
}

function groupBoreMm(group) {
  const direct = Number(group?.locationNominalBoreMm);
  if (positive(direct)) return direct;
  const derived = Number(deriveSupportReportLocationNominalBoreMm(group?.fullLineTag));
  return positive(derived) ? derived : null;
}

function recoveryBoreMm(sourceBoreMm, targetBoreMm, config) {
  if (config.requireSameBore) return positive(sourceBoreMm) && positive(targetBoreMm)
    && Math.abs(sourceBoreMm - targetBoreMm) <= EPSILON ? sourceBoreMm : null;
  const available = [sourceBoreMm, targetBoreMm].filter(positive);
  return available.length ? Math.min(...available) : null;
}

function axisSeparation(a, b, axis) {
  if (!validPoint(a) || !validPoint(b) || !validAxis(axis)) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const signedAxial = dx * axis.x + dy * axis.y + dz * axis.z;
  const axialMm = Math.abs(signedAxial);
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  const lateralMm = Math.sqrt(Math.max(0, distanceSquared - signedAxial * signedAxial));
  return Object.freeze({ axialMm, lateralMm });
}

function candidateRejectionReasons(input) {
  const rows = [];
  if (!input.config.enabled) rows.push('ORPHAN_RECOVERY_DISABLED');
  if (!input.familyPass) rows.push('FAMILY_GATE_FAILED');
  if (!input.pipePass) rows.push('PIPE_GATE_FAILED');
  if (!input.borePass) rows.push('BORE_GATE_FAILED');
  if (!input.branchOverridePass) rows.push('BRANCH_OVERRIDE_GUARDS_FAILED');
  if (!input.pointAvailable) rows.push('POINT_EVIDENCE_UNAVAILABLE');
  if (!positive(input.boreForToleranceMm)) rows.push('BORE_EVIDENCE_UNAVAILABLE');
  if (!input.axisModel?.trusted) rows.push('AXIS_EVIDENCE_UNAVAILABLE');
  if (input.axisModel?.trusted && !input.geometryPass) rows.push('RECOVERY_WINDOW_FAILED');
  return rows;
}

function rejectionSummary(rows) {
  const counts = {};
  for (const row of rows || []) {
    if (row.qualifies) continue;
    for (const reason of row.rejectionReasons || []) counts[reason] = (counts[reason] || 0) + 1;
  }
  return counts;
}

function resolutionDiagnostics(row) {
  if (row.recoveryStatus === 'ORPHAN_AMBIGUOUS') return [Object.freeze({
    severity: 'WARNING',
    code: 'ORPHAN_AMBIGUOUS',
    groupId: row.groupId,
    familyId: row.familyId,
    candidateTargetIds: row.candidateTargetIds,
    candidateTargetGroupIds: row.candidateTargetGroupIds,
    message: 'Orphan geometry evidence has multiple qualifying target identities; automatic recovery was withheld.',
  })];
  if (row.recoveryStatus === 'ORPHAN_NONRECIPROCAL') return [Object.freeze({
    severity: 'INFO',
    code: 'ORPHAN_NONRECIPROCAL',
    groupId: row.groupId,
    familyId: row.familyId,
    candidateTargetIds: row.candidateTargetIds,
    message: 'A provisional geometry target was unique from this orphan but not reciprocally unique; automatic recovery was withheld.',
  })];
  return [];
}

function recoveredPairAssemblyId(groupIds, groupById) {
  const families = unique(groupIds.map((id) => familyToken(groupById.get(id)?.secondarySupportFamilyId))).sort();
  const signature = groupIds.join('|');
  return `PSA::RECOVERED::${families.join('+') || 'UNRESOLVED'}::G-${fnv1a(signature)}`;
}

function eligibleTargetAssignment(assignment) {
  return assignment?.status === 'EXPLICIT_ASSEMBLY' || assignment?.status === 'GEOMETRY_ONLY';
}
function candidateEvaluationCompare(left, right) {
  return left.normalizedScore - right.normalizedScore
    || left.targetIdentity.localeCompare(right.targetIdentity)
    || left.targetGroupId.localeCompare(right.targetGroupId);
}
function familyToken(value) { return token(value).replace(/\.(?:\d+)$/u, ''); }
function token(value) { return clean(value).replace(/^\/+/, '').replace(/\(REF\)$/iu, '').toUpperCase(); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function booleanValue(value, fallback) { return typeof value === 'boolean' ? value : fallback; }
function positive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
function validPoint(point) { return Boolean(point && [point.x, point.y, point.z].every(Number.isFinite)); }
function validAxis(axis) {
  return Boolean(axis && [axis.x, axis.y, axis.z].every(Number.isFinite)
    && Math.hypot(axis.x, axis.y, axis.z) > EPSILON);
}
function countStatus(rows, status) { return rows.filter((row) => row.recoveryStatus === status).length; }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }
function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export const _test = Object.freeze({
  axisSeparation,
  branchRelationship,
  buildPipeGeometryIndex,
  collapseCandidateIdentities,
  evaluateCandidate,
  recoveredPairAssemblyId,
  recoveryBoreMm,
  selectAxisModel,
  trustedPipeModel,
});
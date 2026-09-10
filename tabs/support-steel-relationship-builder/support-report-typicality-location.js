import {
  compareSupportTypeMultisets,
  normalizePipeClass,
  supportTypeMultiset,
} from './support-report-typicality.js?v=20260910-support-report-typicality-location-1';

const INELIGIBLE_COST = 1e12;
const UNMATCHED_COST = 1e9;

export function buildTypicalityLocationAssignmentsForMatches(leftEvidence, rightEvidence, matches = [], options = {}) {
  return Object.freeze((matches || []).filter((match) => match?.result === 'TYPICAL' && match.rightFamilyId)
    .map((match) => buildTypicalityLocationAssignment(leftEvidence, rightEvidence, {
      leftFamilyId: match.leftFamilyId,
      rightFamilyId: match.rightFamilyId,
      parentAuditId: match.auditId,
      leftReportBundle: options.leftReportBundle,
      rightReportBundle: options.rightReportBundle,
      profile: options.profile,
    })));
}

export function buildCanonicalTypicalityLocations(evidence = {}, reportBundle = null) {
  const rows = reportBundle?.rows || [];
  const familyGroups = new Map();
  for (const group of evidence.groups || []) {
    const familyId = token(group.secondarySupportFamilyId);
    if (!familyId) continue;
    if (!familyGroups.has(familyId)) familyGroups.set(familyId, []);
    familyGroups.get(familyId).push(group);
  }
  const output = [];
  for (const [familyId, groups] of familyGroups) {
    const familyRawPoints = (evidence.rawClashes || [])
      .filter((clash) => (clash.familyIds || []).map(token).includes(familyId))
      .map((clash) => clash.clashPointGlobalMm).filter(validPoint);
    const anchor = averagePoint(familyRawPoints) || averagePoint(groups.map(groupPoint).filter(Boolean));
    const ordered = [...groups].sort(groupCompare);
    const bases = ordered.map((group, index) => locationBase(group, familyId, index, anchor, rows));
    for (const location of bases) {
      output.push(Object.freeze({
        ...location,
        distanceFingerprintMm: Object.freeze(bases
          .filter((other) => other.locationId !== location.locationId)
          .map((other) => pointDistance(location.representativePointGlobalMm, other.representativePointGlobalMm))
          .filter(Number.isFinite).sort((a, b) => a - b)),
      }));
    }
  }
  return Object.freeze(output);
}

export function buildTypicalityLocationAssignment(leftEvidence, rightEvidence, options = {}) {
  const profile = options.profile?.pipingLocation || options.profile || {};
  const leftFamilyId = token(options.leftFamilyId);
  const rightFamilyId = token(options.rightFamilyId);
  const left = buildCanonicalTypicalityLocations(leftEvidence, options.leftReportBundle)
    .filter((location) => location.familyId === leftFamilyId);
  const right = buildCanonicalTypicalityLocations(rightEvidence, options.rightReportBundle)
    .filter((location) => location.familyId === rightFamilyId);
  const candidates = left.flatMap((leftLocation) => right.map((rightLocation) =>
    compareLocationCandidate(leftLocation, rightLocation, profile)));
  const solved = solveCandidateAssignment(left, right, candidates, profile);
  const selected = solved.selected.map((item, index) => Object.freeze({
    ...item,
    auditId: `${options.parentAuditId || familyAuditId(leftFamilyId, rightFamilyId)}-L${String(index + 1).padStart(2, '0')}`,
  }));
  const hasSupportTypes = selected.some((item) => item.supportTypeComparison?.result !== 'UNAVAILABLE');
  const result = solved.ambiguous.length ? 'AMBIGUOUS'
    : solved.unmatchedLeft.length || solved.unmatchedRight.length || selected.some((item) => item.arrangementResult === 'PARTIAL') ? 'PARTIAL'
      : hasSupportTypes ? 'EXACT' : 'TOPOLOGY_ONLY';
  return Object.freeze({
    parentAuditId: options.parentAuditId || familyAuditId(leftFamilyId, rightFamilyId),
    leftFamilyId,
    rightFamilyId,
    result,
    candidatePairs: Object.freeze(candidates),
    selectedAssignments: Object.freeze(selected),
    unmatchedLeftLocationIds: Object.freeze(solved.unmatchedLeft),
    unmatchedRightLocationIds: Object.freeze(solved.unmatchedRight),
    ambiguousLocationIds: Object.freeze(solved.ambiguous),
    totalAssignmentCost: solved.totalCost,
  });
}

function locationBase(group, familyId, index, anchor, reportRows) {
  const representative = groupPoint(group);
  const reportRow = findReportRow(group, reportRows);
  const supportTypesRaw = rawSupportTypes(reportRow?.supportType);
  const memberIds = unique((group.primarySupportMemberIds || []).map(normalizeMemberId).filter((id) => /\.\d+$/.test(id)));
  return Object.freeze({
    locationId: String(group.locationId || group.groupId || `${familyId}::L${index + 1}`),
    sourceGroupId: String(group.groupId || ''),
    familyId,
    fullLineTag: String(group.fullLineTag || ''),
    normalizedPipeClass: normalizePipeClass(group.fullLineTag),
    primarySupportMemberIds: Object.freeze(memberIds.sort()),
    memberMultiplicity: memberIds.length,
    supportTypesRaw: Object.freeze(supportTypesRaw),
    supportTypeMultiset: supportTypeMultiset(supportTypesRaw),
    supportTypeSource: supportTypesRaw.length ? 'REPORT_ROW' : 'UNAVAILABLE',
    representativePointGlobalMm: representative,
    localPointMm: subtractPoint(representative, anchor),
    clashEvidenceIds: Object.freeze(unique((group.evidenceRows || []).map((row) => row.guid).filter(Boolean)).sort()),
  });
}

function compareLocationCandidate(left, right, profile) {
  const pipeExact = Boolean(left.normalizedPipeClass) && left.normalizedPipeClass === right.normalizedPipeClass;
  const memberMultiplicityDelta = Math.abs(left.memberMultiplicity - right.memberMultiplicity);
  const supportAvailable = left.supportTypesRaw.length > 0 && right.supportTypesRaw.length > 0;
  const supportTypeComparison = supportAvailable
    ? compareSupportTypeMultisets(left.supportTypesRaw, right.supportTypesRaw)
    : Object.freeze({ result: 'UNAVAILABLE', reasonCodes: Object.freeze(['SUPPORT_TYPE_UNAVAILABLE']) });
  const supportTypeDelta = supportAvailable ? supportTypeDeltaCount(supportTypeComparison) : 0;
  const geometry = geometryFingerprintComparison(left.distanceFingerprintMm, right.distanceFingerprintMm,
    Number(profile.geometryFingerprintToleranceMm ?? 50));
  const eligible = profile.requireCompatiblePipeClass === false || pipeExact;
  const weights = profile.assignmentWeights || {};
  const assignmentCost = eligible
    ? (supportTypeDelta * Number(weights.supportTypeMember ?? 100000))
      + (memberMultiplicityDelta * Number(weights.memberMultiplicity ?? 10000))
      + ((Number(geometry.residual?.median) || 0) * Number(weights.geometryMedianMm ?? 1))
      + ((Number(geometry.residual?.max) || 0) * Number(weights.geometryMaxMm ?? 1))
    : INELIGIBLE_COST;
  const arrangementResult = !eligible ? 'NO_MATCH'
    : supportAvailable && supportTypeComparison.result !== 'EXACT' ? 'PARTIAL'
      : memberMultiplicityDelta > 0 || geometry.result === 'FAIL' ? 'PARTIAL'
        : supportAvailable ? 'EXACT' : 'TOPOLOGY_ONLY';
  return Object.freeze({
    candidateId: candidateId(left.locationId, right.locationId),
    leftLocationId: left.locationId,
    rightLocationId: right.locationId,
    eligible,
    arrangementResult,
    assignmentCost,
    signals: Object.freeze({
      pipeClass: Object.freeze({ left: left.normalizedPipeClass, right: right.normalizedPipeClass, result: pipeExact ? 'PASS' : 'FAIL', reasonCode: pipeExact ? 'PIPE_CLASS_EXACT' : 'PIPE_CLASS_MISMATCH' }),
      memberMultiplicity: Object.freeze({ left: left.memberMultiplicity, right: right.memberMultiplicity, delta: memberMultiplicityDelta, result: memberMultiplicityDelta === 0 ? 'PASS' : 'FAIL', reasonCode: memberMultiplicityDelta === 0 ? 'PRIMARY_MEMBER_MULTIPLICITY_EXACT' : 'PRIMARY_MEMBER_MULTIPLICITY_CHANGED' }),
      geometry,
    }),
    supportTypeComparison,
    sourceEvidence: Object.freeze({
      leftClashIds: left.clashEvidenceIds,
      rightClashIds: right.clashEvidenceIds,
      leftSupportTypeSource: left.supportTypeSource,
      rightSupportTypeSource: right.supportTypeSource,
    }),
  });
}

function solveCandidateAssignment(left, right, candidates, profile) {
  const byId = new Map(candidates.map((item) => [`${item.leftLocationId}\u0000${item.rightLocationId}`, item]));
  const size = left.length + right.length;
  if (!size) return { selected: [], unmatchedLeft: [], unmatchedRight: [], ambiguous: [], totalCost: 0 };
  const matrix = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => {
    if (row >= left.length && col >= right.length) return 0;
    if (row >= left.length || col >= right.length) return UNMATCHED_COST;
    return byId.get(`${left[row].locationId}\u0000${right[col].locationId}`)?.assignmentCost ?? INELIGIBLE_COST;
  }));
  const optimum = hungarian(matrix);
  const selected = [];
  const usedRight = new Set();
  for (let row = 0; row < left.length; row += 1) {
    const col = optimum.assignment[row];
    if (col < 0 || col >= right.length || matrix[row][col] >= UNMATCHED_COST) continue;
    const candidate = byId.get(`${left[row].locationId}\u0000${right[col].locationId}`);
    if (candidate?.eligible) { selected.push(candidate); usedRight.add(col); }
  }
  const unmatchedLeft = left.filter((item) => !selected.some((candidate) => candidate.leftLocationId === item.locationId)).map((item) => item.locationId);
  const unmatchedRight = right.filter((_, index) => !usedRight.has(index)).map((item) => item.locationId);
  const tolerance = Number(profile.ambiguityCostTolerance ?? 0.001);
  const ambiguous = selected.filter((candidate) => {
    const row = left.findIndex((item) => item.locationId === candidate.leftLocationId);
    const col = right.findIndex((item) => item.locationId === candidate.rightLocationId);
    const alternate = matrix.map((values) => [...values]);
    alternate[row][col] = INELIGIBLE_COST;
    return hungarian(alternate).cost <= optimum.cost + tolerance;
  }).map((candidate) => candidate.leftLocationId);
  return { selected, unmatchedLeft, unmatchedRight, ambiguous, totalCost: optimum.cost };
}

function hungarian(cost) {
  const n = cost.length;
  const m = cost[0]?.length || 0;
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity), used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j += 1) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= m; j += 1) if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  return { assignment, cost: -v[0] };
}

function geometryFingerprintComparison(left, right, toleranceMm) {
  if (left.length !== right.length) return Object.freeze({ result: 'FAIL', reasonCode: 'LOCATION_GEOMETRY_FINGERPRINT_COUNT_MISMATCH', residual: null, thresholdMm: toleranceMm });
  if (!left.length) return Object.freeze({ result: 'UNAVAILABLE', reasonCode: 'LOCATION_GEOMETRY_FINGERPRINT_UNAVAILABLE', residual: null, thresholdMm: toleranceMm });
  const residuals = left.map((value, index) => Math.abs(value - right[index])).sort((a, b) => a - b);
  const residual = Object.freeze({ median: quantile(residuals, 0.5), max: residuals[residuals.length - 1] });
  return Object.freeze({ result: residual.max <= toleranceMm ? 'PASS' : 'FAIL', reasonCode: residual.max <= toleranceMm ? 'LOCAL_POSITION_WITHIN_TOLERANCE' : 'LOCAL_POSITION_OUTSIDE_TOLERANCE', residual, thresholdMm: toleranceMm });
}

function findReportRow(group, rows) {
  const exact = rows.find((row) => token(row.rowId) === token(group.locationId || group.groupId));
  if (exact) return exact;
  const candidates = rows.filter((row) => token(row.civilSecondarySupport) === token(group.secondarySupportFamilyId)
    && normalizePipeClass(row.pipe) === normalizePipeClass(group.fullLineTag));
  return candidates.length === 1 ? candidates[0] : null;
}
function groupPoint(group) { return validPoint(group?.representativeClashPointGlobalMm) ? group.representativeClashPointGlobalMm : averagePoint(group?.clashPointsGlobalMm || []); }
function groupCompare(a, b) { return normalizePipeClass(a.fullLineTag).localeCompare(normalizePipeClass(b.fullLineTag)) || String(a.fullLineTag || '').localeCompare(String(b.fullLineTag || '')); }
function subtractPoint(point, anchor) { return validPoint(point) && validPoint(anchor) ? Object.freeze({ x: point.x - anchor.x, y: point.y - anchor.y, z: point.z - anchor.z }) : null; }
function averagePoint(points) { const valid = (points || []).filter(validPoint); return valid.length ? Object.freeze({ x: valid.reduce((s, p) => s + p.x, 0) / valid.length, y: valid.reduce((s, p) => s + p.y, 0) / valid.length, z: valid.reduce((s, p) => s + p.z, 0) / valid.length }) : null; }
function pointDistance(a, b) { return validPoint(a) && validPoint(b) ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : null; }
function normalizeMemberId(value) { const text = String(value || '').trim().replace(/^\/+/, '').toUpperCase(); return text ? `/${text}` : ''; }
function supportTypeDeltaCount(comparison) { return [...(comparison?.missingFromRight || []), ...(comparison?.extraInRight || [])].reduce((sum, item) => sum + (Number(item?.count) || 0), 0); }
function rawSupportTypes(value) { return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean); }
function validPoint(point) { return point && [point.x, point.y, point.z].every(Number.isFinite); }
function quantile(sorted, ratio) { if (!sorted.length) return null; return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]; }
function candidateId(left, right) { return `PAIR-${left}--${right}`.replace(/[^A-Z0-9-]+/gi, '-'); }
function familyAuditId(left, right) { return `TYP-${left}--${right}`.replace(/[^A-Z0-9-]+/gi, '-'); }
function token(value) { return String(value || '').trim().replace(/^\/+/, '').replace(/\(REF\)$/iu, '').toUpperCase(); }
function unique(values) { return [...new Set(values || [])]; }

export const _test = Object.freeze({ hungarian, geometryFingerprintComparison });

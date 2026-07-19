import { resolveColdFieldBendPolicy } from './pipeline-3d-model-bend-policy.js';
import { resolveSharedBendSegmentFeasibility } from './pipeline-3d-model-bend-feasibility.js';
import { normalizeElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js';

const DEG = 180 / Math.PI;
const EPSILON = 1e-9;
const INPUTXML_NODE_START = 100;
const INPUTXML_NODE_STEP = 10;

function vec(a, b) { return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; }
function length(value) { return Math.hypot(value.x, value.y, value.z); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function normalize(value) {
  const size = length(value);
  return size > EPSILON ? { x: value.x / size, y: value.y / size, z: value.z / size } : null;
}
function angleDeg(a, b) {
  const left = normalize(a), right = normalize(b);
  if (!left || !right) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot(left, right)))) * DEG;
}
function planAngleDeg(a, b) {
  return angleDeg({ x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }) ?? 0;
}
function slopeAngleDeg(value) { return Math.atan2(value.z, Math.hypot(value.x, value.y)) * DEG; }
function profileAngleDeg(a, b) { return Math.abs(slopeAngleDeg(b) - slopeAngleDeg(a)); }
function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function sources(point) {
  return Array.isArray(point?.sources) ? point.sources : [point?.source].filter(Boolean);
}
function isGeometryAuthority(point) {
  const values = sources(point);
  return values.includes('vertex') || values.includes('table2');
}
function authorityRole(point) {
  const values = sources(point);
  if (values.includes('vertex') && values.includes('table2')) return 'TABLE_1_AND_TABLE_2';
  return values.includes('table2') ? 'TABLE_2_PROFILE' : 'TABLE_1_ROUTE';
}
function classifyTurn(planAngle, profileAngle, settings) {
  const plan = planAngle >= settings.minimumTurnAngleDeg;
  const profile = profileAngle >= settings.minimumTurnAngleDeg;
  if (plan && profile) return settings.detectCompound ? 'COMPOUND' : null;
  if (plan) return settings.detectHorizontal ? 'HORIZONTAL' : null;
  if (profile) return settings.detectVertical ? 'VERTICAL' : null;
  return null;
}
function diagnostic(severity, code, message, details = {}) {
  return Object.freeze({ severity, code, message, details: Object.freeze({ ...details }) });
}
function resolveOutsideDiameterMm(settings, branchInfo) {
  return settings.diameterSource === 'explicit-od'
    ? positive(settings.explicitOutsideDiameterMm) : positive(branchInfo?.boreMm);
}
function geometryNodeName(point, fallback) {
  const values = sources(point), evidence = Array.isArray(point?.markerEvidence) ? point.markerEvidence : [];
  const labels = values.map((source, index) => {
    const item = evidence[index] || {};
    if (source === 'vertex') return item.point?.label || '';
    if (source === 'table2') return item.label || item.point?.label || '';
    return '';
  }).filter(Boolean);
  return [...new Set(labels)].join(' / ') || fallback || '';
}

export function buildGeometryAuthorityRoute(points = [], coordinateRows = []) {
  const authority = points.map((point, sourceIndex) => ({
    point, sourceIndex, sourceRow: coordinateRows[sourceIndex] || null,
  })).filter((entry) => entry.sourceRow && isGeometryAuthority(entry.point));
  const entries = authority.map((entry, geometryIndex) => Object.freeze({
    point: entry.point,
    sourceIndex: entry.sourceIndex,
    row: Object.freeze({
      ...entry.sourceRow,
      nodeNumber: INPUTXML_NODE_START + geometryIndex * INPUTXML_NODE_STEP,
      nodeName: geometryNodeName(entry.point, entry.sourceRow.nodeName),
    }),
  }));
  return Object.freeze({
    entries: Object.freeze(entries),
    points: Object.freeze(entries.map((entry) => entry.point)),
    coordinateRows: Object.freeze(entries.map((entry) => entry.row)),
    excludedMarkerCount: Math.max(0, coordinateRows.length - entries.length),
  });
}

function elasticCriteria(settings, outsideDiameterMm) {
  const formulaRadiusMm = settings.useFormulaMinimum && outsideDiameterMm && settings.allowableBendingStressMpa
    ? (settings.youngsModulusMpa * outsideDiameterMm) / (2 * settings.allowableBendingStressMpa) : null;
  const practicalRadiusMm = settings.usePracticalMinimum && outsideDiameterMm
    ? settings.practicalRadiusMultiplierD * outsideDiameterMm : null;
  const criteria = [formulaRadiusMm, practicalRadiusMm].filter(positive);
  return { formulaRadiusMm, practicalRadiusMm, governingRadiusMm: criteria.length ? Math.max(...criteria) : null };
}

function screeningWarnings(settings, screening) {
  const warnings = [];
  if (settings.enabled && !screening.outsideDiameterMm) warnings.push(diagnostic('WARNING', 'bend_diameter_missing', 'Bend resolution needs a positive outside diameter.'));
  if (settings.enabled && settings.diameterSource === 'branch-diameter' && !settings.diameterBasisConfirmed) warnings.push(diagnostic('WARNING', 'bend_diameter_basis_unconfirmed', 'Confirm that the Line / Branch Diameter field is the pipe outside diameter before bend emission.'));
  if (settings.enabled && settings.bendClass === 'elastic' && settings.useFormulaMinimum && !settings.allowableBendingStressMpa) warnings.push(diagnostic('WARNING', 'elastic_bend_allowable_stress_missing', 'Formula screening R = E×D/(2×Sb) is unavailable until allowable bending stress Sb is entered.'));
  if (settings.enabled && settings.bendClass === 'cold-field' && !screening.coldFieldPolicy?.normalCodeRadiusD) warnings.push(diagnostic('WARNING', 'cold_field_bend_code_size_unresolved', 'Cold-field bend emission requires a supported nominal pipe size for the ASME B31.4-2025 paragraph 404.2.2 radius band.'));
  if (settings.enabled && screening.coldFieldPolicy?.qualificationEvidenceRequired) warnings.push(diagnostic('WARNING', 'cold_field_bend_qualification_evidence_missing', 'The qualified 18D alternative was requested but no eligible NPS 14+ qualification evidence reference was supplied.'));
  if (settings.enabled && screening.outsideDiameterMm && !screening.governingRadiusMm) warnings.push(diagnostic('WARNING', 'bend_radius_unresolved', 'No enabled bend-radius criterion produced a positive radius.'));
  if (settings.enabled && settings.emitToInputXml && !settings.screeningOnlyAcknowledged) warnings.push(diagnostic('WARNING', 'bend_review_acknowledgement_missing', 'InputXML bend emission requires acknowledgement that this resolver does not prove combined-load compliance.'));
  return warnings;
}

export function calculateElasticBendScreening(settingsInput = {}, branchInfo = {}) {
  const settings = normalizeElasticBendSettings(settingsInput);
  const outsideDiameterMm = resolveOutsideDiameterMm(settings, branchInfo);
  const elastic = elasticCriteria(settings, outsideDiameterMm);
  const coldFieldPolicy = settings.bendClass === 'cold-field' ? resolveColdFieldBendPolicy({
    outsideDiameterMm,
    nominalPipeSizeNps: settings.nominalPipeSizeNps,
    useProjectMinimum: settings.useColdFieldProjectMinimum,
    projectMinimumRadiusD: settings.coldFieldProjectRadiusMultiplierD,
    procedureMinimumRadiusD: settings.coldFieldProcedureMinimumRadiusD,
    useQualified18DAlternative: settings.useQualified18DAlternative,
    qualificationEvidenceId: settings.qualificationEvidenceId,
  }) : null;
  const governingRadiusMm = settings.bendClass === 'cold-field'
    ? coldFieldPolicy?.governingRadiusMm : elastic.governingRadiusMm;
  const strain = governingRadiusMm && outsideDiameterMm ? outsideDiameterMm / (2 * governingRadiusMm) : null;
  const stressMpa = settings.bendClass === 'elastic' && strain ? settings.youngsModulusMpa * strain : null;
  const screening = {
    settings, outsideDiameterMm, ...elastic, coldFieldPolicy, governingRadiusMm, strain, stressMpa,
    policyReady: settings.bendClass !== 'cold-field' || Boolean(coldFieldPolicy?.normalCodeRadiusD),
  };
  return Object.freeze({ ...screening, warnings: Object.freeze(screeningWarnings(settings, screening)) });
}

function rowDistanceMm(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z));
}
function statusFor(candidate, screening) {
  const { settings } = screening;
  if (!settings.enabled) return 'DISABLED';
  if (candidate.turnAngleDeg > settings.maximumTurnAngleDeg) return 'ANGLE_EXCLUDED';
  if (!screening.governingRadiusMm) return 'UNRESOLVED';
  if (!screening.policyReady) return 'CODE_DATA_REVIEW';
  if (settings.diameterSource === 'branch-diameter' && !settings.diameterBasisConfirmed) return 'DIAMETER_REVIEW';
  if (screening.coldFieldPolicy?.qualificationEvidenceRequired) return 'QUALIFICATION_REVIEW';
  if (!candidate.geometryFits) return 'INFEASIBLE';
  if (settings.emitToInputXml && !settings.screeningOnlyAcknowledged) return 'REVIEW_REQUIRED';
  return settings.emitToInputXml ? 'EMITTED' : 'READY_NOT_EMITTED';
}

function buildCandidate(entries, geometryIndex, screening) {
  const previous = entries[geometryIndex - 1], entry = entries[geometryIndex], next = entries[geometryIndex + 1];
  const incoming = vec(previous.point, entry.point), outgoing = vec(entry.point, next.point);
  const turnAngleDeg = angleDeg(incoming, outgoing);
  if (!Number.isFinite(turnAngleDeg)) return null;
  const plan = planAngleDeg(incoming, outgoing), profile = profileAngleDeg(incoming, outgoing);
  const classification = classifyTurn(plan, profile, screening.settings);
  if (!classification) return null;
  const radiusMm = screening.governingRadiusMm;
  const tangentMm = radiusMm ? radiusMm * Math.tan((turnAngleDeg / DEG) / 2) : null;
  const incomingLengthMm = rowDistanceMm(previous.row, entry.row);
  const outgoingLengthMm = rowDistanceMm(entry.row, next.row);
  const retainedStraightAllowanceMm = screening.settings.retainedStraightAllowanceMm;
  const requiredIncomingMm = tangentMm == null ? null : tangentMm + retainedStraightAllowanceMm;
  const preferredRequiredMm = tangentMm == null ? null : tangentMm + screening.settings.preferredStraightTangentMm;
  const localGeometryFits = Boolean(tangentMm && incomingLengthMm >= requiredIncomingMm && outgoingLengthMm >= requiredIncomingMm);
  return {
    id: `bend:${entry.row.nodeNumber ?? geometryIndex}`,
    bendClass: screening.settings.bendClass,
    sourceRole: authorityRole(entry.point), classification, pointIndex: entry.sourceIndex,
    incomingElementIndex: geometryIndex - 1, outgoingElementIndex: geometryIndex,
    previousNode: previous.row.nodeNumber ?? null, cornerNode: entry.row.nodeNumber ?? null, nextNode: next.row.nodeNumber ?? null,
    previousAuthorityIndex: previous.sourceIndex, nextAuthorityIndex: next.sourceIndex,
    markerRowsExcludedBefore: Math.max(0, entry.sourceIndex - previous.sourceIndex - 1),
    markerRowsExcludedAfter: Math.max(0, next.sourceIndex - entry.sourceIndex - 1),
    planAngleDeg: plan, profileAngleDeg: profile, turnAngleDeg,
    radiusMm, radiusD: radiusMm && screening.outsideDiameterMm ? radiusMm / screening.outsideDiameterMm : null,
    tangentMm, incomingLengthMm, outgoingLengthMm, retainedStraightAllowanceMm,
    requiredIncomingMm, requiredOutgoingMm: requiredIncomingMm, preferredRequiredMm,
    localGeometryFits, geometryFits: localGeometryFits,
    preferredStraightFits: Boolean(tangentMm && incomingLengthMm >= preferredRequiredMm && outgoingLengthMm >= preferredRequiredMm),
    bendTypeCode: screening.settings.bendTypeCode,
  };
}

function nextAvailableNode(used, start) {
  let candidate = start;
  while (used.has(candidate)) candidate += INPUTXML_NODE_STEP;
  used.add(candidate);
  return candidate;
}
function assignCurvatureNodes(candidates, rows, settings) {
  const used = new Set(rows.map((row) => Number(row.nodeNumber)).filter(Number.isFinite));
  let nextNode = Math.ceil((Math.max(0, ...used) + 1) / INPUTXML_NODE_STEP) * INPUTXML_NODE_STEP;
  return candidates.map((candidate) => {
    if (candidate.status !== 'EMITTED') return Object.freeze({ ...candidate, curvatureNodes: Object.freeze([]) });
    const nodes = [];
    if (settings.emitNearPointNode) {
      const nodeNumber = nextAvailableNode(used, nextNode); nextNode = nodeNumber + INPUTXML_NODE_STEP;
      nodes.push(Object.freeze({ angleDeg: 0, nodeNumber, role: 'NEAR_POINT' }));
    }
    if (settings.emitMidpointNode) {
      const nodeNumber = nextAvailableNode(used, nextNode); nextNode = nodeNumber + INPUTXML_NODE_STEP;
      nodes.push(Object.freeze({ angleDeg: candidate.turnAngleDeg / 2, nodeNumber, role: 'MIDPOINT' }));
    }
    return Object.freeze({ ...candidate, curvatureNodes: Object.freeze(nodes) });
  });
}

function candidateDetails(candidate) {
  return {
    previousNode: candidate.previousNode, cornerNode: candidate.cornerNode, nextNode: candidate.nextNode,
    classification: candidate.classification, turnAngleDeg: candidate.turnAngleDeg, radiusMm: candidate.radiusMm,
    tangentMm: candidate.tangentMm, retainedStraightAllowanceMm: candidate.retainedStraightAllowanceMm,
    requiredIncomingMm: candidate.requiredIncomingMm, requiredOutgoingMm: candidate.requiredOutgoingMm,
    sharedIncomingRequiredMm: candidate.sharedIncomingRequiredMm, sharedOutgoingRequiredMm: candidate.sharedOutgoingRequiredMm,
    incomingLengthMm: candidate.incomingLengthMm, outgoingLengthMm: candidate.outgoingLengthMm,
  };
}
function candidateDiagnostic(candidate, settings) {
  if (!settings.enabled || !settings.emitToInputXml) return null;
  const details = candidateDetails(candidate);
  if (candidate.status === 'INFEASIBLE' && !candidate.localGeometryFits) return diagnostic('BLOCKING', 'BEND_GEOMETRY_INFEASIBLE', `Node ${candidate.cornerNode} cannot fit the resolved radius plus retained-straight allowance on both authoritative adjacent spans.`, details);
  if (candidate.status === 'QUALIFICATION_REVIEW') return diagnostic('BLOCKING', 'COLD_FIELD_BEND_QUALIFICATION_REQUIRED', `Node ${candidate.cornerNode} requests the qualified 18D alternative without eligible qualification evidence.`, details);
  if (candidate.status === 'ANGLE_EXCLUDED') return diagnostic('WARNING', 'bend_angle_excluded', `Node ${candidate.cornerNode} exceeds the configured turn-angle limit; BEND output was omitted.`, details);
  if (candidate.status === 'UNRESOLVED') return diagnostic('WARNING', 'bend_inputxml_omitted', `Node ${candidate.cornerNode} has no resolved bend radius; BEND output was omitted.`, details);
  if (candidate.status === 'CODE_DATA_REVIEW') return diagnostic('WARNING', 'bend_inputxml_omitted', `Node ${candidate.cornerNode} lacks verified cold-field code size data; BEND output was omitted.`, details);
  if (candidate.status === 'DIAMETER_REVIEW') return diagnostic('WARNING', 'bend_inputxml_omitted', `Node ${candidate.cornerNode} uses an unconfirmed diameter basis; BEND output was omitted.`, details);
  if (candidate.status === 'REVIEW_REQUIRED') return diagnostic('WARNING', 'bend_inputxml_omitted', `Node ${candidate.cornerNode} requires screening-only acknowledgement; BEND output was omitted.`, details);
  return null;
}
function sharedFailureDiagnostic(failure) {
  return diagnostic('BLOCKING', 'BEND_SHARED_SEGMENT_INFEASIBLE', `The authoritative straight from node ${failure.fromNode} to ${failure.toNode} is too short for both adjacent bend tangent footprints.`, failure);
}

export function resolvePipelineElasticBends({ points = [], coordinateRows = [], branchInfo = {}, settings = {} } = {}) {
  const screening = calculateElasticBendScreening(settings, branchInfo);
  const geometryRoute = buildGeometryAuthorityRoute(points, coordinateRows);
  const rawCandidates = [];
  for (let index = 1; index < geometryRoute.entries.length - 1; index += 1) {
    const candidate = buildCandidate(geometryRoute.entries, index, screening);
    if (candidate) rawCandidates.push(candidate);
  }
  const shared = resolveSharedBendSegmentFeasibility(rawCandidates);
  const statusCandidates = shared.candidates.map((candidate) => ({
    ...candidate, status: statusFor(candidate, screening), curvatureNodes: [],
  }));
  const resolvedCandidates = assignCurvatureNodes(statusCandidates, geometryRoute.coordinateRows, screening.settings);
  const emitted = resolvedCandidates.filter((candidate) => candidate.status === 'EMITTED');
  const warnings = [...screening.warnings], errors = [];
  if (screening.settings.enabled && screening.settings.emitToInputXml) errors.push(...shared.failures.map(sharedFailureDiagnostic));
  for (const candidate of resolvedCandidates) {
    if (screening.settings.enabled && !candidate.preferredStraightFits && candidate.geometryFits) warnings.push(diagnostic('WARNING', 'bend_preferred_tangent_not_met', `Node ${candidate.cornerNode} fits mandatory geometry but not the configured preferred straight tangent.`, candidateDetails(candidate)));
    const item = candidateDiagnostic(candidate, screening.settings);
    if (item?.severity === 'BLOCKING') errors.push(item); else if (item) warnings.push(item);
  }
  if (emitted.length) warnings.push(diagnostic('WARNING', 'bend_screening_only', `${emitted.length} bend(s) were resolved for InputXML; combined pressure, temperature, installation and buckling review remains external.`, { emittedCount: emitted.length }));
  const bendByIncomingElementIndex = Object.freeze(Object.fromEntries(emitted.map((candidate) => [candidate.incomingElementIndex, candidate])));
  const diagnostics = Object.freeze({
    candidateCount: resolvedCandidates.length, emittedCount: emitted.length,
    feasibleCount: resolvedCandidates.filter((candidate) => candidate.geometryFits).length,
    omittedCount: resolvedCandidates.filter((candidate) => !['EMITTED', 'READY_NOT_EMITTED', 'DISABLED'].includes(candidate.status)).length,
    blockedCount: errors.length, sharedSegmentFailureCount: shared.failures.length,
    excludedMarkerCount: geometryRoute.excludedMarkerCount,
  });
  return Object.freeze({
    schema: 'PipelineElasticBendResolution.v2', screening,
    candidates: Object.freeze(resolvedCandidates), bendByIncomingElementIndex,
    geometryRows: geometryRoute.coordinateRows, geometryPoints: geometryRoute.points,
    sharedSegmentFailures: shared.failures,
    warnings: Object.freeze(warnings), errors: Object.freeze(errors),
    hasBlockingErrors: errors.length > 0, diagnostics,
  });
}

function value(input, digits = 3) { return Number.isFinite(Number(input)) ? Number(input).toFixed(digits) : ''; }
export function buildElasticBendLedgerText(resolution) {
  const header = ['BendId', 'BendClass', 'PreviousNode', 'CornerNode', 'NextNode', 'SourceRole', 'Class', 'PlanAngleDeg', 'ProfileAngleDeg', 'TurnAngleDeg', 'RadiusMm', 'RadiusD', 'TangentMm', 'RetainedStraightMm', 'RequiredIncomingMm', 'RequiredOutgoingMm', 'SharedIncomingRequiredMm', 'SharedOutgoingRequiredMm', 'IncomingLengthMm', 'OutgoingLengthMm', 'ExcludedMarkersBefore', 'ExcludedMarkersAfter', 'NearNode', 'MidNode', 'Status'];
  const rows = (resolution?.candidates || []).map((item) => {
    const near = item.curvatureNodes?.find((node) => node.role === 'NEAR_POINT')?.nodeNumber ?? '';
    const mid = item.curvatureNodes?.find((node) => node.role === 'MIDPOINT')?.nodeNumber ?? '';
    return [item.id, item.bendClass, item.previousNode, item.cornerNode, item.nextNode, item.sourceRole, item.classification, value(item.planAngleDeg), value(item.profileAngleDeg), value(item.turnAngleDeg), value(item.radiusMm), value(item.radiusD), value(item.tangentMm), value(item.retainedStraightAllowanceMm), value(item.requiredIncomingMm), value(item.requiredOutgoingMm), value(item.sharedIncomingRequiredMm), value(item.sharedOutgoingRequiredMm), value(item.incomingLengthMm), value(item.outgoingLengthMm), item.markerRowsExcludedBefore, item.markerRowsExcludedAfter, near, mid, item.status];
  });
  return [header, ...rows].map((row) => row.join('\t')).join('\n');
}

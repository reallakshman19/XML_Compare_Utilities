import { normalizeElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js';

const DEG = 180 / Math.PI;
const EPSILON = 1e-9;

function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
}

function length(value) {
  return Math.hypot(value.x, value.y, value.z);
}

function normalize(value) {
  const size = length(value);
  return size > EPSILON ? { x: value.x / size, y: value.y / size, z: value.z / size } : null;
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function angleDeg(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot(left, right)))) * DEG;
}

function planAngleDeg(a, b) {
  return angleDeg({ x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }) ?? 0;
}

function slopeAngleDeg(value) {
  return Math.atan2(value.z, Math.hypot(value.x, value.y)) * DEG;
}

function profileAngleDeg(a, b) {
  return Math.abs(slopeAngleDeg(b) - slopeAngleDeg(a));
}

function isGeometryAuthority(point) {
  const sources = Array.isArray(point?.sources) ? point.sources : [point?.source];
  return sources.includes('vertex') || sources.includes('table2');
}

function authorityRole(point) {
  const sources = Array.isArray(point?.sources) ? point.sources : [point?.source];
  if (sources.includes('vertex') && sources.includes('table2')) return 'TABLE_1_AND_TABLE_2';
  if (sources.includes('table2')) return 'TABLE_2_PROFILE';
  return 'TABLE_1_ROUTE';
}

function classifyTurn(planAngle, profileAngle, settings) {
  const plan = planAngle >= settings.minimumTurnAngleDeg;
  const profile = profileAngle >= settings.minimumTurnAngleDeg;
  if (plan && profile) return settings.detectCompound ? 'COMPOUND' : null;
  if (plan) return settings.detectHorizontal ? 'HORIZONTAL' : null;
  if (profile) return settings.detectVertical ? 'VERTICAL' : null;
  return null;
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function resolveOutsideDiameterMm(settings, branchInfo) {
  if (settings.diameterSource === 'explicit-od') return positive(settings.explicitOutsideDiameterMm);
  return positive(branchInfo?.boreMm);
}

function warning(code, message, details = {}) {
  return Object.freeze({ code, message, details: Object.freeze({ ...details }) });
}

export function calculateElasticBendScreening(settingsInput = {}, branchInfo = {}) {
  const settings = normalizeElasticBendSettings(settingsInput);
  const outsideDiameterMm = resolveOutsideDiameterMm(settings, branchInfo);
  const formulaRadiusMm = settings.useFormulaMinimum && outsideDiameterMm && settings.allowableBendingStressMpa
    ? (settings.youngsModulusMpa * outsideDiameterMm) / (2 * settings.allowableBendingStressMpa)
    : null;
  const practicalRadiusMm = settings.usePracticalMinimum && outsideDiameterMm
    ? settings.practicalRadiusMultiplierD * outsideDiameterMm
    : null;
  const criteria = [formulaRadiusMm, practicalRadiusMm].filter(positive);
  const governingRadiusMm = criteria.length ? Math.max(...criteria) : null;
  const strain = governingRadiusMm && outsideDiameterMm ? outsideDiameterMm / (2 * governingRadiusMm) : null;
  const stressMpa = strain ? settings.youngsModulusMpa * strain : null;
  const warnings = screeningWarnings(settings, outsideDiameterMm, governingRadiusMm);
  return Object.freeze({ settings, outsideDiameterMm, formulaRadiusMm, practicalRadiusMm, governingRadiusMm, strain, stressMpa, warnings });
}

function screeningWarnings(settings, outsideDiameterMm, governingRadiusMm) {
  const warnings = [];
  if (settings.enabled && !outsideDiameterMm) warnings.push(warning('elastic_bend_diameter_missing', 'Elastic bend screening needs a positive outside diameter.'));
  if (settings.enabled && settings.useFormulaMinimum && !settings.allowableBendingStressMpa) {
    warnings.push(warning('elastic_bend_allowable_stress_missing', 'Formula screening R = E×D/(2×Sb) is unavailable until allowable bending stress Sb is entered.'));
  }
  if (settings.enabled && outsideDiameterMm && !governingRadiusMm) warnings.push(warning('elastic_bend_radius_unresolved', 'No enabled elastic bend radius criterion produced a positive radius.'));
  return warnings;
}

function statusFor(candidate, screening) {
  const { settings } = screening;
  if (!settings.enabled) return 'DISABLED';
  if (candidate.turnAngleDeg > settings.maximumTurnAngleDeg) return 'ANGLE_EXCLUDED';
  if (!screening.governingRadiusMm) return 'UNRESOLVED';
  if (!candidate.geometryFits) return 'INFEASIBLE';
  return settings.emitToInputXml ? 'EMITTED' : 'READY_NOT_EMITTED';
}

function rowDistanceMm(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z));
}

function buildCandidate(entry, previous, next, screening, coordinateRows) {
  const incoming = vec(previous.point, entry.point);
  const outgoing = vec(entry.point, next.point);
  const turnAngleDeg = angleDeg(incoming, outgoing);
  if (!Number.isFinite(turnAngleDeg)) return null;
  const plan = planAngleDeg(incoming, outgoing);
  const profile = profileAngleDeg(incoming, outgoing);
  const classification = classifyTurn(plan, profile, screening.settings);
  if (!classification || entry.index < 1 || entry.index >= coordinateRows.length - 1) return null;
  const cornerRow = coordinateRows[entry.index];
  const incomingLengthMm = rowDistanceMm(coordinateRows[entry.index - 1], cornerRow);
  const outgoingLengthMm = rowDistanceMm(cornerRow, coordinateRows[entry.index + 1]);
  const radiusMm = screening.governingRadiusMm;
  const tangentMm = radiusMm ? radiusMm * Math.tan((turnAngleDeg / DEG) / 2) : null;
  const allowedIncomingMm = incomingLengthMm * screening.settings.maximumTangentUtilization;
  const allowedOutgoingMm = outgoingLengthMm * screening.settings.maximumTangentUtilization;
  const geometryFits = Boolean(tangentMm && tangentMm <= allowedIncomingMm && tangentMm <= allowedOutgoingMm);
  const candidate = {
    id: `elastic-bend:${cornerRow?.nodeNumber ?? entry.index}`,
    sourceRole: authorityRole(entry.point), classification, pointIndex: entry.index,
    incomingElementIndex: entry.index - 1,
    previousNode: coordinateRows[entry.index - 1]?.nodeNumber ?? null,
    cornerNode: cornerRow?.nodeNumber ?? null,
    nextNode: coordinateRows[entry.index + 1]?.nodeNumber ?? null,
    planAngleDeg: plan, profileAngleDeg: profile, turnAngleDeg,
    radiusMm, radiusD: radiusMm && screening.outsideDiameterMm ? radiusMm / screening.outsideDiameterMm : null,
    tangentMm, incomingLengthMm, outgoingLengthMm, allowedIncomingMm, allowedOutgoingMm,
    geometryFits, bendTypeCode: screening.settings.bendTypeCode,
  };
  return Object.freeze({ ...candidate, status: statusFor(candidate, screening) });
}

function candidateOmissionWarning(candidate, settings) {
  if (!settings.enabled || !settings.emitToInputXml) return null;
  const details = {
    cornerNode: candidate.cornerNode, classification: candidate.classification,
    turnAngleDeg: candidate.turnAngleDeg, tangentMm: candidate.tangentMm,
    incomingLengthMm: candidate.incomingLengthMm, outgoingLengthMm: candidate.outgoingLengthMm,
  };
  if (candidate.status === 'ANGLE_EXCLUDED') return warning('elastic_bend_angle_excluded', `Node ${candidate.cornerNode} exceeds the configured elastic turn-angle limit; BEND output was omitted.`, details);
  if (candidate.status === 'UNRESOLVED') return warning('elastic_bend_inputxml_omitted', `Node ${candidate.cornerNode} has no resolved elastic bend radius; BEND output was omitted.`, details);
  if (candidate.status === 'INFEASIBLE') return warning('elastic_bend_radius_does_not_fit', `Node ${candidate.cornerNode} needs more adjacent element length for the selected elastic radius; BEND output was omitted.`, details);
  return null;
}

export function resolvePipelineElasticBends({ points = [], coordinateRows = [], branchInfo = {}, settings = {} } = {}) {
  const screening = calculateElasticBendScreening(settings, branchInfo);
  const authority = points.map((point, index) => ({ point, index })).filter((entry) => isGeometryAuthority(entry.point));
  const candidates = [];
  for (let index = 1; index < authority.length - 1; index += 1) {
    const candidate = buildCandidate(authority[index], authority[index - 1], authority[index + 1], screening, coordinateRows);
    if (candidate) candidates.push(candidate);
  }
  const emitted = candidates.filter((candidate) => candidate.status === 'EMITTED');
  const warnings = [...screening.warnings];
  for (const candidate of candidates) {
    const item = candidateOmissionWarning(candidate, screening.settings);
    if (item) warnings.push(item);
  }
  if (emitted.length) warnings.push(warning('elastic_bend_screening_only', `${emitted.length} elastic bend(s) were emitted from screening geometry; combined pressure, temperature, installation and global-buckling review remains external.`, { emittedCount: emitted.length }));
  const bendByIncomingElementIndex = Object.freeze(Object.fromEntries(emitted.map((candidate) => [candidate.incomingElementIndex, candidate])));
  const diagnostics = Object.freeze({
    candidateCount: candidates.length, emittedCount: emitted.length,
    feasibleCount: candidates.filter((candidate) => candidate.geometryFits).length,
    omittedCount: candidates.filter((candidate) => ['UNRESOLVED', 'INFEASIBLE', 'ANGLE_EXCLUDED'].includes(candidate.status)).length,
  });
  return Object.freeze({ schema: 'PipelineElasticBendResolution.v1', screening, candidates: Object.freeze(candidates), bendByIncomingElementIndex, warnings: Object.freeze(warnings), diagnostics });
}

function value(input, digits = 3) {
  return Number.isFinite(Number(input)) ? Number(input).toFixed(digits) : '';
}

export function buildElasticBendLedgerText(resolution) {
  const header = ['BendId', 'PreviousNode', 'CornerNode', 'NextNode', 'SourceRole', 'Class', 'PlanAngleDeg', 'ProfileAngleDeg', 'TurnAngleDeg', 'RadiusMm', 'RadiusD', 'TangentMm', 'IncomingLengthMm', 'OutgoingLengthMm', 'Status'];
  const rows = (resolution?.candidates || []).map((item) => [item.id, item.previousNode, item.cornerNode, item.nextNode, item.sourceRole, item.classification, value(item.planAngleDeg), value(item.profileAngleDeg), value(item.turnAngleDeg), value(item.radiusMm), value(item.radiusD), value(item.tangentMm), value(item.incomingLengthMm), value(item.outgoingLengthMm), item.status]);
  return [header, ...rows].map((row) => row.join('\t')).join('\n');
}

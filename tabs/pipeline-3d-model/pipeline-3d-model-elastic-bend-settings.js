export const ELASTIC_BEND_SETTINGS_SCHEMA = 'PipelineElasticBendSettings.v2';
export const ELASTIC_BEND_STORAGE_KEY = 'pipeline-3d-model-elastic-bend-settings-v2';
export const LEGACY_ELASTIC_BEND_STORAGE_KEY = 'pipeline-3d-model-elastic-bend-settings-v1';

export const DEFAULT_ELASTIC_BEND_SETTINGS = Object.freeze({
  schema: ELASTIC_BEND_SETTINGS_SCHEMA,
  enabled: false,
  emitToInputXml: false,
  screeningOnlyAcknowledged: false,
  bendClass: 'elastic',
  detectHorizontal: true,
  detectVertical: true,
  detectCompound: true,
  diameterSource: 'branch-diameter',
  diameterBasisConfirmed: false,
  explicitOutsideDiameterMm: '',
  youngsModulusMpa: 207000,
  allowableBendingStressMpa: '',
  useFormulaMinimum: true,
  usePracticalMinimum: true,
  practicalRadiusMultiplierD: 500,
  nominalPipeSizeNps: '',
  useColdFieldProjectMinimum: true,
  coldFieldProjectRadiusMultiplierD: 40,
  coldFieldProcedureMinimumRadiusD: '',
  useQualified18DAlternative: false,
  qualificationEvidenceId: '',
  minimumTurnAngleDeg: 0.25,
  maximumTurnAngleDeg: 45,
  retainedStraightAllowanceMm: 0,
  preferredStraightTangentMm: 2000,
  emitNearPointNode: true,
  emitMidpointNode: true,
  hardFailOnInfeasibleEmission: true,
  bendTypeCode: 0,
});

function bool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (/^(1|true|yes|on)$/i.test(String(value ?? ''))) return true;
  if (/^(0|false|no|off)$/i.test(String(value ?? ''))) return false;
  return fallback;
}

function positive(value, fallback, min = Number.EPSILON, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) return fallback;
  return Math.min(max, number);
}

function nonNegative(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(max, number);
}

function optionalPositive(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function enumValue(value, allowed, fallback) {
  const normalized = String(value || '').trim();
  return allowed.includes(normalized) ? normalized : fallback;
}

export function normalizeElasticBendSettings(input = {}) {
  const defaults = DEFAULT_ELASTIC_BEND_SETTINGS;
  const minimumTurnAngleDeg = positive(input.minimumTurnAngleDeg, defaults.minimumTurnAngleDeg, 0.01, 30);
  const maximumTurnAngleDeg = Math.max(
    minimumTurnAngleDeg,
    positive(input.maximumTurnAngleDeg, defaults.maximumTurnAngleDeg, 0.1, 179),
  );
  return Object.freeze({
    schema: ELASTIC_BEND_SETTINGS_SCHEMA,
    enabled: bool(input.enabled, defaults.enabled),
    emitToInputXml: bool(input.emitToInputXml, defaults.emitToInputXml),
    screeningOnlyAcknowledged: bool(input.screeningOnlyAcknowledged, defaults.screeningOnlyAcknowledged),
    bendClass: enumValue(input.bendClass, ['elastic', 'cold-field'], defaults.bendClass),
    detectHorizontal: bool(input.detectHorizontal, defaults.detectHorizontal),
    detectVertical: bool(input.detectVertical, defaults.detectVertical),
    detectCompound: bool(input.detectCompound, defaults.detectCompound),
    diameterSource: enumValue(input.diameterSource, ['branch-diameter', 'explicit-od'], defaults.diameterSource),
    diameterBasisConfirmed: bool(input.diameterBasisConfirmed, defaults.diameterBasisConfirmed),
    explicitOutsideDiameterMm: optionalPositive(input.explicitOutsideDiameterMm),
    youngsModulusMpa: positive(input.youngsModulusMpa, defaults.youngsModulusMpa, 1, 1e7),
    allowableBendingStressMpa: optionalPositive(input.allowableBendingStressMpa),
    useFormulaMinimum: bool(input.useFormulaMinimum, defaults.useFormulaMinimum),
    usePracticalMinimum: bool(input.usePracticalMinimum, defaults.usePracticalMinimum),
    practicalRadiusMultiplierD: positive(input.practicalRadiusMultiplierD, defaults.practicalRadiusMultiplierD, 1, 5000),
    nominalPipeSizeNps: optionalPositive(input.nominalPipeSizeNps),
    useColdFieldProjectMinimum: bool(input.useColdFieldProjectMinimum, defaults.useColdFieldProjectMinimum),
    coldFieldProjectRadiusMultiplierD: positive(input.coldFieldProjectRadiusMultiplierD, defaults.coldFieldProjectRadiusMultiplierD, 1, 5000),
    coldFieldProcedureMinimumRadiusD: optionalPositive(input.coldFieldProcedureMinimumRadiusD),
    useQualified18DAlternative: bool(input.useQualified18DAlternative, defaults.useQualified18DAlternative),
    qualificationEvidenceId: String(input.qualificationEvidenceId ?? '').trim(),
    minimumTurnAngleDeg,
    maximumTurnAngleDeg,
    retainedStraightAllowanceMm: nonNegative(input.retainedStraightAllowanceMm, defaults.retainedStraightAllowanceMm),
    preferredStraightTangentMm: nonNegative(input.preferredStraightTangentMm, defaults.preferredStraightTangentMm),
    emitNearPointNode: bool(input.emitNearPointNode, defaults.emitNearPointNode),
    emitMidpointNode: bool(input.emitMidpointNode, defaults.emitMidpointNode),
    hardFailOnInfeasibleEmission: true,
    bendTypeCode: [0, 1, 2].includes(Number(input.bendTypeCode)) ? Number(input.bendTypeCode) : defaults.bendTypeCode,
  });
}

function readStoredSettings(storage) {
  const current = storage.getItem(ELASTIC_BEND_STORAGE_KEY);
  if (current) return JSON.parse(current);
  const legacy = storage.getItem(LEGACY_ELASTIC_BEND_STORAGE_KEY);
  return legacy ? JSON.parse(legacy) : {};
}

export function loadElasticBendSettings(storage = globalThis.localStorage) {
  if (!storage?.getItem) return normalizeElasticBendSettings();
  try {
    return normalizeElasticBendSettings(readStoredSettings(storage));
  } catch {
    return normalizeElasticBendSettings();
  }
}

export function saveElasticBendSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeElasticBendSettings(settings);
  if (!storage?.setItem) return normalized;
  try {
    storage.setItem(ELASTIC_BEND_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Persistence is best-effort; normalized settings remain usable in memory.
  }
  return normalized;
}

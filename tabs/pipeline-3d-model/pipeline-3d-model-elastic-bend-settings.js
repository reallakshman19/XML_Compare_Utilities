export const ELASTIC_BEND_SETTINGS_SCHEMA = 'PipelineBendSettings.v3';
export const ELASTIC_BEND_STORAGE_KEY = 'pipeline-3d-model-bend-settings-v3';
export const V2_ELASTIC_BEND_STORAGE_KEY = 'pipeline-3d-model-elastic-bend-settings-v2';
export const LEGACY_ELASTIC_BEND_STORAGE_KEY = 'pipeline-3d-model-elastic-bend-settings-v1';

export const DEFAULT_ELASTIC_BEND_SETTINGS = Object.freeze({
  schema: ELASTIC_BEND_SETTINGS_SCHEMA,
  enabled: false,
  emitToInputXml: false,
  screeningOnlyAcknowledged: false,
  designBasis: 'default-metallic',
  classificationMode: 'source-authority-auto',
  bendClass: 'standard',
  standardRadiusMultiplierD: 1.5,
  coldFieldRadiusMode: 'project-multiplier',
  coldFieldRadiusMultiplierD: 40,
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
  minimumPlanTurnAngleDeg: 0.25,
  minimumProfileTurnAngleDeg: 0.25,
  maximumTurnAngleDeg: 45,
  shortElementAnglePolicy: 'include-all',
  minimumAngleElementLengthMm: 0,
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

function migrationSeed(input) {
  if (input?.designBasis || input?.schema === ELASTIC_BEND_SETTINGS_SCHEMA) return input;
  const legacy = [V2_ELASTIC_BEND_STORAGE_KEY, LEGACY_ELASTIC_BEND_STORAGE_KEY]
    .some((key) => input?.schema?.includes(key.split('-').at(-1)))
    || Object.hasOwn(input || {}, 'bendClass');
  if (!legacy) return input;
  const bendClass = enumValue(input?.bendClass, ['elastic', 'cold-field'], 'elastic');
  return {
    ...input,
    designBasis: 'asme-b31.4',
    classificationMode: 'legacy-global',
    bendClass,
    coldFieldRadiusMode: 'b31.4-size-band',
  };
}

function normalizedBasis(seed, defaults) {
  const designBasis = enumValue(
    seed.designBasis,
    ['default-metallic', 'asme-b31.4', 'gre'],
    defaults.designBasis,
  );
  const classificationMode = designBasis === 'asme-b31.4'
    ? enumValue(seed.classificationMode, ['source-authority-auto', 'legacy-global'], defaults.classificationMode)
    : defaults.classificationMode;
  let bendClass = 'standard';
  if (designBasis === 'gre') bendClass = 'gre-placeholder';
  if (designBasis === 'asme-b31.4') {
    bendClass = classificationMode === 'source-authority-auto'
      ? 'auto'
      : enumValue(seed.bendClass, ['elastic', 'cold-field'], 'elastic');
  }
  return { designBasis, classificationMode, bendClass };
}

export function normalizeElasticBendSettings(input = {}) {
  const defaults = DEFAULT_ELASTIC_BEND_SETTINGS;
  const seed = migrationSeed(input);
  const basis = normalizedBasis(seed, defaults);
  const legacyMinimum = seed.minimumTurnAngleDeg;
  const minimumPlanTurnAngleDeg = positive(
    seed.minimumPlanTurnAngleDeg ?? legacyMinimum,
    defaults.minimumPlanTurnAngleDeg,
    0.01,
    30,
  );
  const minimumProfileTurnAngleDeg = positive(
    seed.minimumProfileTurnAngleDeg ?? legacyMinimum,
    defaults.minimumProfileTurnAngleDeg,
    0.01,
    30,
  );
  const maximumTurnAngleDeg = Math.max(
    minimumPlanTurnAngleDeg,
    minimumProfileTurnAngleDeg,
    positive(seed.maximumTurnAngleDeg, defaults.maximumTurnAngleDeg, 0.1, 179),
  );
  return Object.freeze({
    schema: ELASTIC_BEND_SETTINGS_SCHEMA,
    enabled: bool(seed.enabled, defaults.enabled),
    emitToInputXml: bool(seed.emitToInputXml, defaults.emitToInputXml),
    screeningOnlyAcknowledged: bool(seed.screeningOnlyAcknowledged, defaults.screeningOnlyAcknowledged),
    ...basis,
    standardRadiusMultiplierD: positive(seed.standardRadiusMultiplierD, defaults.standardRadiusMultiplierD, 0.1, 5000),
    coldFieldRadiusMode: enumValue(seed.coldFieldRadiusMode, ['project-multiplier', 'b31.4-size-band'], defaults.coldFieldRadiusMode),
    coldFieldRadiusMultiplierD: positive(seed.coldFieldRadiusMultiplierD ?? seed.coldFieldProjectRadiusMultiplierD, defaults.coldFieldRadiusMultiplierD, 1, 5000),
    detectHorizontal: bool(seed.detectHorizontal, defaults.detectHorizontal),
    detectVertical: bool(seed.detectVertical, defaults.detectVertical),
    detectCompound: bool(seed.detectCompound, defaults.detectCompound),
    diameterSource: enumValue(seed.diameterSource, ['branch-diameter', 'explicit-od'], defaults.diameterSource),
    diameterBasisConfirmed: bool(seed.diameterBasisConfirmed, defaults.diameterBasisConfirmed),
    explicitOutsideDiameterMm: optionalPositive(seed.explicitOutsideDiameterMm),
    youngsModulusMpa: positive(seed.youngsModulusMpa, defaults.youngsModulusMpa, 1, 1e7),
    allowableBendingStressMpa: optionalPositive(seed.allowableBendingStressMpa),
    useFormulaMinimum: bool(seed.useFormulaMinimum, defaults.useFormulaMinimum),
    usePracticalMinimum: bool(seed.usePracticalMinimum, defaults.usePracticalMinimum),
    practicalRadiusMultiplierD: positive(seed.practicalRadiusMultiplierD, defaults.practicalRadiusMultiplierD, 1, 5000),
    nominalPipeSizeNps: optionalPositive(seed.nominalPipeSizeNps),
    useColdFieldProjectMinimum: bool(seed.useColdFieldProjectMinimum, defaults.useColdFieldProjectMinimum),
    coldFieldProjectRadiusMultiplierD: positive(seed.coldFieldProjectRadiusMultiplierD, defaults.coldFieldProjectRadiusMultiplierD, 1, 5000),
    coldFieldProcedureMinimumRadiusD: optionalPositive(seed.coldFieldProcedureMinimumRadiusD),
    useQualified18DAlternative: bool(seed.useQualified18DAlternative, defaults.useQualified18DAlternative),
    qualificationEvidenceId: String(seed.qualificationEvidenceId ?? '').trim(),
    minimumTurnAngleDeg: Math.min(minimumPlanTurnAngleDeg, minimumProfileTurnAngleDeg),
    minimumPlanTurnAngleDeg,
    minimumProfileTurnAngleDeg,
    maximumTurnAngleDeg,
    shortElementAnglePolicy: enumValue(seed.shortElementAnglePolicy, ['include-all', 'ignore-below-length'], defaults.shortElementAnglePolicy),
    minimumAngleElementLengthMm: nonNegative(seed.minimumAngleElementLengthMm, defaults.minimumAngleElementLengthMm),
    retainedStraightAllowanceMm: nonNegative(seed.retainedStraightAllowanceMm, defaults.retainedStraightAllowanceMm),
    preferredStraightTangentMm: nonNegative(seed.preferredStraightTangentMm, defaults.preferredStraightTangentMm),
    emitNearPointNode: bool(seed.emitNearPointNode, defaults.emitNearPointNode),
    emitMidpointNode: bool(seed.emitMidpointNode, defaults.emitMidpointNode),
    hardFailOnInfeasibleEmission: true,
    bendTypeCode: [0, 1, 2].includes(Number(seed.bendTypeCode)) ? Number(seed.bendTypeCode) : defaults.bendTypeCode,
  });
}

function readStoredSettings(storage) {
  for (const key of [ELASTIC_BEND_STORAGE_KEY, V2_ELASTIC_BEND_STORAGE_KEY, LEGACY_ELASTIC_BEND_STORAGE_KEY]) {
    const value = storage.getItem(key);
    if (value) return JSON.parse(value);
  }
  return {};
}

export function loadElasticBendSettings(storage = globalThis.localStorage) {
  if (!storage?.getItem) return normalizeElasticBendSettings();
  try { return normalizeElasticBendSettings(readStoredSettings(storage)); }
  catch { return normalizeElasticBendSettings(); }
}

export function saveElasticBendSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeElasticBendSettings(settings);
  if (!storage?.setItem) return normalized;
  try { storage.setItem(ELASTIC_BEND_STORAGE_KEY, JSON.stringify(normalized)); }
  catch { /* Persistence is best-effort; normalized settings remain usable in memory. */ }
  return normalized;
}

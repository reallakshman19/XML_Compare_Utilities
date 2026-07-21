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
  requestedDesignBasis: '',
  profileFallbackApplied: true,
  profileResolutionReason: 'PROFILE_NOT_SPECIFIED',
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
  greNominalBoreMm: '',
  greBendRadiusMm: '',
  greBendBreakMultiplierBore: 1.5,
  greBendLocalThicknessMm: '',
  greTeeBreakLengthMm: '',
  greTeeLocalThicknessMm: '',
  greRequirementReference: '',
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
    profileResolutionReason: 'LEGACY_B31_4_MIGRATION',
  };
}

function profileResolution(seed, defaults) {
  const preservedFallback = seed.profileFallbackApplied === true
    && String(seed.profileResolutionReason || '').trim();
  if (preservedFallback && seed.designBasis === defaults.designBasis) {
    return {
      requestedDesignBasis: String(seed.requestedDesignBasis ?? '').trim(),
      designBasis: defaults.designBasis,
      profileFallbackApplied: true,
      profileResolutionReason: String(seed.profileResolutionReason).trim(),
    };
  }
  const requestedDesignBasis = String(seed.designBasis ?? '').trim();
  const reasons = {
    'default-metallic': 'EXPLICIT_NORMAL',
    'asme-b31.4': 'EXPLICIT_ASME_B31_4',
    gre: 'EXPLICIT_GRE',
  };
  if (!requestedDesignBasis) {
    return {
      requestedDesignBasis,
      designBasis: defaults.designBasis,
      profileFallbackApplied: true,
      profileResolutionReason: 'PROFILE_NOT_SPECIFIED',
    };
  }
  if (reasons[requestedDesignBasis]) {
    return {
      requestedDesignBasis,
      designBasis: requestedDesignBasis,
      profileFallbackApplied: false,
      profileResolutionReason: seed.profileResolutionReason || reasons[requestedDesignBasis],
    };
  }
  return {
    requestedDesignBasis,
    designBasis: defaults.designBasis,
    profileFallbackApplied: true,
    profileResolutionReason: 'UNRECOGNIZED_PROFILE_FALLBACK',
  };
}

function normalizedBasis(seed, defaults) {
  const profile = profileResolution(seed, defaults);
  const classificationMode = profile.designBasis === 'asme-b31.4'
    ? enumValue(seed.classificationMode, ['source-authority-auto', 'legacy-global'], defaults.classificationMode)
    : defaults.classificationMode;
  let bendClass = 'standard';
  if (profile.designBasis === 'gre') bendClass = 'gre-placeholder';
  if (profile.designBasis === 'asme-b31.4') {
    bendClass = classificationMode === 'source-authority-auto'
      ? 'auto'
      : enumValue(seed.bendClass, ['elastic', 'cold-field'], 'elastic');
  }
  return { ...profile, classificationMode, bendClass };
}

export function normalizeElasticBendSettings(input = {}) {
  const defaults = DEFAULT_ELASTIC_BEND_SETTINGS;
  const seed = migrationSeed(input) || {};
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
    greNominalBoreMm: optionalPositive(seed.greNominalBoreMm),
    greBendRadiusMm: optionalPositive(seed.greBendRadiusMm),
    greBendBreakMultiplierBore: positive(seed.greBendBreakMultiplierBore, defaults.greBendBreakMultiplierBore, 0.1, 100),
    greBendLocalThicknessMm: optionalPositive(seed.greBendLocalThicknessMm),
    greTeeBreakLengthMm: optionalPositive(seed.greTeeBreakLengthMm),
    greTeeLocalThicknessMm: optionalPositive(seed.greTeeLocalThicknessMm),
    greRequirementReference: String(seed.greRequirementReference ?? '').trim(),
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

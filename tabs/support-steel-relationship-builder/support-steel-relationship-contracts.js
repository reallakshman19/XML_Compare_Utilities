export const SUPPORT_STEEL_RELATIONSHIP_SCHEMA = 'SupportSteelRelationshipBundle.v1';

export const SUPPORT_STEEL_RELATIONSHIP_STATUSES = Object.freeze([
  'RESOLVED_EXPLICIT',
  'RESOLVED_SPATIAL',
  'RESOLVED_SHARED_OWNER',
  'AMBIGUOUS',
  'UNRESOLVED',
]);

export const SUPPORT_STEEL_RELATIONSHIP_BASES = Object.freeze([
  'SAME_CANONICAL_ID',
  'EXPLICIT_REFERENCE',
  'SHARED_OWNER',
  'POINT_PROXIMITY',
]);

const DEFAULT_SUPPORT_TYPES = Object.freeze(['ATTA', 'ANCI', 'SUPPORT']);
const DEFAULT_STEEL_TYPES = Object.freeze([
  'STEEL',
  'STEEL_GROUP',
  'STRUCTURE',
  'STRUCTURAL_GROUP',
  'FRMW',
  'SCTN',
  'GROUP',
]);

export const SUPPORT_STEEL_DEFAULT_CONFIG = Object.freeze({
  supportFamilyPattern: '^/(PS-[A-Z0-9_-]+)',
  steelGroupPattern: '^/((?:SL|PS)-[A-Z0-9_.-]+)',
  supportTypes: DEFAULT_SUPPORT_TYPES,
  steelTypes: DEFAULT_STEEL_TYPES,
  projectionToleranceMm: 25,
  ambiguityDeltaMm: 2,
  supportPositionKeys: Object.freeze([
    'POS',
    'SUPPORT_POS',
    'SUPPORTPOS',
    'SUPPORT_POSITION',
    'SUPPORTPOSITION',
    'APOS',
    'LPOS',
  ]),
  steelPositionKeys: Object.freeze([
    'POS',
    'CENTRE',
    'CENTER',
    'ORIGIN',
    'APOS',
    'LPOS',
  ]),
  explicitReferenceKeys: Object.freeze([
    'STEEL_REF',
    'STEELREF',
    'STRUCTURE_REF',
    'STRUCTUREREF',
    'SREF',
    'MDSSREF',
    'MDSGUIDEREF',
    'OWNER',
  ]),
});

export function resolveSupportSteelConfig(overrides = {}) {
  const supportTypes = normalizeTokenList(overrides.supportTypes, SUPPORT_STEEL_DEFAULT_CONFIG.supportTypes);
  const steelTypes = normalizeTokenList(overrides.steelTypes, SUPPORT_STEEL_DEFAULT_CONFIG.steelTypes);
  return {
    ...SUPPORT_STEEL_DEFAULT_CONFIG,
    ...overrides,
    supportTypes,
    steelTypes,
    projectionToleranceMm: positiveNumber(
      overrides.projectionToleranceMm,
      SUPPORT_STEEL_DEFAULT_CONFIG.projectionToleranceMm,
    ),
    ambiguityDeltaMm: nonNegativeNumber(
      overrides.ambiguityDeltaMm,
      SUPPORT_STEEL_DEFAULT_CONFIG.ambiguityDeltaMm,
    ),
  };
}

export function compileIdentityPattern(value, fallback) {
  try {
    return new RegExp(String(value || fallback), 'i');
  } catch {
    return new RegExp(fallback, 'i');
  }
}

function normalizeTokenList(value, fallback) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/u);
  const tokens = source.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean);
  return Object.freeze(tokens.length ? [...new Set(tokens)] : [...fallback]);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

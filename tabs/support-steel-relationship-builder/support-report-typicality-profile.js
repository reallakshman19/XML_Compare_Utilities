import { PS_TYPICAL_V1_PROVISIONAL } from './support-report-typicality.js?v=20260910-support-report-typicality-profile-1';

export const SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL = deepFreeze({
  ...PS_TYPICAL_V1_PROVISIONAL,
  profileId: 'PS_TYPICAL_V1_PROVISIONAL',
  pipingLocation: {
    requireCompatiblePipeClass: true,
    geometryFingerprintToleranceMm: 50,
    ambiguityCostTolerance: 0.001,
    assignmentWeights: {
      supportTypeMember: 100000,
      memberMultiplicity: 10000,
      geometryMedianMm: 1,
      geometryMaxMm: 1,
    },
  },
});

export const SUPPORT_REPORT_TYPICALITY_UI_SETTINGS = deepFreeze([
  {
    section: 'Structural gates',
    path: 'structural.geometryEnvelopeToleranceMm',
    label: 'Envelope tolerance',
    type: 'number',
    unit: 'mm',
    min: 0,
    step: 1,
    help: 'Hard family-level geometry gate. Maximum allowed difference between the two structure bounding-envelope spans. Default 50 mm. Lower values reject more aggressively.',
  },
  {
    section: 'Structural gates',
    path: 'structural.pairDistanceMedianToleranceMm',
    label: 'Pair-distance median tolerance',
    type: 'number',
    unit: 'mm',
    min: 0,
    step: 1,
    help: 'Hard family-level geometry gate. Median residual allowed between translation/rotation/order-invariant clash-point pair-distance spectra. Default 10 mm.',
  },
  {
    section: 'Structural gates',
    path: 'structural.pairDistanceP95ToleranceMm',
    label: 'Pair-distance P95 tolerance',
    type: 'number',
    unit: 'mm',
    min: 0,
    step: 1,
    help: 'Hard family-level geometry gate. 95th-percentile residual allowed between pair-distance spectra. Default 25 mm.',
  },
  {
    section: 'Structural gates',
    path: 'structural.pairDistanceMaxToleranceMm',
    label: 'Pair-distance maximum tolerance',
    type: 'number',
    unit: 'mm',
    min: 0,
    step: 1,
    help: 'Hard family-level geometry gate. Largest allowed pair-distance residual. Default 50 mm.',
  },
  {
    section: 'Location gates',
    path: 'pipingLocation.requireCompatiblePipeClass',
    label: 'Require compatible pipe class',
    type: 'checkbox',
    help: 'Hard candidate gate. When enabled, two physical support locations cannot be paired unless their normalized pipe classes match. Enabled by default.',
  },
  {
    section: 'Location gates',
    path: 'pipingLocation.geometryFingerprintToleranceMm',
    label: 'Location fingerprint tolerance',
    type: 'number',
    unit: 'mm',
    min: 0,
    step: 1,
    help: 'Location-level tolerance applied to neighbour-distance fingerprints after family matching. Default 50 mm. A candidate outside this tolerance is retained for audit but classified PARTIAL.',
  },
  {
    section: 'Ambiguity',
    path: 'pipingLocation.ambiguityCostTolerance',
    label: 'Alternate-assignment ambiguity margin',
    type: 'number',
    min: 0,
    step: 0.001,
    help: 'If another complete assignment is within this total-cost margin of the optimum, correspondence is reported as ambiguous rather than guessed. Default 0.001 cost units.',
  },
  {
    section: 'Assignment weights',
    path: 'pipingLocation.assignmentWeights.supportTypeMember',
    label: 'SUPPORT TYPE difference weight',
    type: 'number',
    min: 0,
    step: 1000,
    help: 'Dominant tie-break weight for missing/extra SUPPORT TYPE members. Default 100000 per changed member. This intentionally outweighs geometry and member-count differences.',
  },
  {
    section: 'Assignment weights',
    path: 'pipingLocation.assignmentWeights.memberMultiplicity',
    label: 'Primary-member multiplicity weight',
    type: 'number',
    min: 0,
    step: 1000,
    help: 'Penalty per difference in numeric primary-support member count. Default 10000.',
  },
  {
    section: 'Assignment weights',
    path: 'pipingLocation.assignmentWeights.geometryMedianMm',
    label: 'Geometry median residual weight',
    type: 'number',
    min: 0,
    step: 0.1,
    help: 'Cost multiplier applied to the median location-fingerprint residual in millimetres. Default 1.',
  },
  {
    section: 'Assignment weights',
    path: 'pipingLocation.assignmentWeights.geometryMaxMm',
    label: 'Geometry maximum residual weight',
    type: 'number',
    min: 0,
    step: 0.1,
    help: 'Cost multiplier applied to the maximum location-fingerprint residual in millimetres. Default 1.',
  },
]);

export const SUPPORT_REPORT_TYPICALITY_FIXED_POLICIES = deepFreeze([
  {
    label: 'Dimensional resolution order',
    value: '3D → 2D → 1D',
    help: 'Structured-sequence roadmap policy: use the highest informative dimensional lattice first, then planar, then monotonic row/sequence matching. This order is an engineering policy, not a current numeric tolerance.',
  },
  {
    label: 'SUPPORT TYPE authority',
    value: 'Dominant arrangement evidence',
    help: 'SUPPORT TYPE is intentionally given more assignment influence than small geometric residuals. It is compared as an order-independent, duplicate-sensitive multiset and is never fabricated when missing.',
  },
  {
    label: 'Repeated member suffix evidence',
    value: 'Supporting weight only',
    help: 'Exact repeated patterns such as .2/.4 across two XMLs may receive configurable tie-break weight in the structured-sequence matcher, but member suffixes are not physical identity and must never be a hard gate.',
  },
  {
    label: 'PREV NAME fuzzy evidence',
    value: 'Tie-break only',
    help: 'Pattern/fuzzy similarity such as one-position change, same trailing 4/3/2 characters, or wildcard-style masks is lower-authority evidence. It must never override incompatible structural or SUPPORT TYPE evidence.',
  },
  {
    label: 'Solver unmatched sentinel',
    value: '1,000,000,000 cost units',
    help: 'Fixed internal safety sentinel, not an engineering tuning parameter. A real candidate must be cheaper than this value to beat an explicit unmatched assignment. It is intentionally far above normal weighted residual costs.',
  },
  {
    label: 'Solver ineligible sentinel',
    value: '1,000,000,000,000 cost units',
    help: 'Fixed internal safety sentinel, not an engineering tuning parameter. Ineligible pairs are priced far above unmatched pairs so a square assignment matrix can never force an incompatible real match merely because row counts are equal.',
  },
  {
    label: 'Row order',
    value: 'Never used as identity',
    help: 'CSV/report/XML row ordinal is not a correspondence key. Assignment is based on engineering evidence and global consistency.',
  },
]);

export function mergeSupportReportTypicalityProfile(override = {}) {
  const base = SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL;
  return deepFreeze({
    ...base,
    ...override,
    profileId: override.profileId || base.profileId,
    structural: {
      ...base.structural,
      ...(override.structural || {}),
    },
    pipingLocation: {
      ...base.pipingLocation,
      ...(override.pipingLocation || {}),
      assignmentWeights: {
        ...base.pipingLocation.assignmentWeights,
        ...(override.pipingLocation?.assignmentWeights || {}),
      },
    },
  });
}

export function profileValue(profile, path) {
  return String(path || '').split('.').reduce((value, key) => value?.[key], profile);
}

export function profileOverrideFromEntries(entries = []) {
  const result = {};
  for (const entry of entries) {
    if (!entry?.path) continue;
    setPath(result, entry.path, entry.value);
  }
  return result;
}

function setPath(target, path, value) {
  const keys = String(path).split('.');
  let cursor = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

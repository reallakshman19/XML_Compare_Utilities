import { getPipelineEngineeringProfile } from './pipeline-3d-model-engineering-profile-registry.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import {
  PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,
  parsePipelinePositiveScalar,
} from './pipeline-3d-model-diameter-contracts.js';
import { GRE_PLACEHOLDER_SCHEMA } from './pipeline-3d-model-gre-placeholder.js';

export const PIPELINE_GRE_VENDOR_POLICY_REGISTRY_SCHEMA = 'PipelineGreVendorSeriesPolicyRegistry.v1';
export const PIPELINE_GRE_VENDOR_POLICY_DESCRIPTOR_SCHEMA = 'PipelineGreVendorSeriesPolicyDescriptor.v1';
export const PIPELINE_GRE_VENDOR_MIGRATION_SCHEMA = 'PipelineGreVendorSeriesMigration.v1';
export const PIPELINE_GRE_VENDOR_PLAN_SCHEMA = 'PipelineGreVendorSeriesPlan.v1';
export const PIPELINE_GRE_VENDOR_SECTION_SCHEMA = 'PipelineGreVendorSeriesSectionResolution.v1';
export const PIPELINE_GRE_VENDOR_ELEMENT_SCHEMA = 'PipelineGreVendorSeriesElementResolution.v1';
export const PIPELINE_GRE_VENDOR_POLICY_IDS = Object.freeze({
  BEND: 'gre-vendor-qualified-bend',
  TEE: 'gre-vendor-qualified-tee',
});
export const PIPELINE_GRE_VENDOR_BLOCKER_ORDER = Object.freeze([
  'PIPELINE_GRE_VENDOR_INPUT_INVALID', 'PIPELINE_GRE_VENDOR_POLICY_INVALID',
  'PIPELINE_GRE_VENDOR_PROFILE_INCOMPATIBLE', 'PIPELINE_GRE_VENDOR_TARGET_INVALID',
  'PIPELINE_GRE_VENDOR_SOURCE_CONFLICT', 'PIPELINE_GRE_VENDOR_AUTHORITY_UNRESOLVED',
  'PIPELINE_GRE_VENDOR_LEGACY_AUTHORITY_UNCONFIRMED', 'PIPELINE_GRE_VENDOR_IDENTITY_INVALID',
  'PIPELINE_GRE_VENDOR_QUALIFICATION_REQUIRED', 'PIPELINE_GRE_VENDOR_REQUIREMENT_REFERENCE_REQUIRED',
  'PIPELINE_GRE_VENDOR_NOMINAL_BORE_REQUIRED', 'PIPELINE_GRE_VENDOR_NOMINAL_BORE_CONFLICT',
  'PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID', 'PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID',
  'PIPELINE_GRE_VENDOR_DIAMETER_PLAN_INVALID', 'PIPELINE_GRE_VENDOR_OWNERSHIP_INVALID',
  'PIPELINE_GRE_VENDOR_SECTION_COVERAGE_INVALID', 'PIPELINE_GRE_VENDOR_ELEMENT_COVERAGE_INVALID',
]);

const DESCRIPTORS = Object.freeze([
  Object.freeze({ schema: PIPELINE_GRE_VENDOR_POLICY_DESCRIPTOR_SCHEMA,
    componentPolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.BEND, componentKind: 'BEND',
    dimensionalAuthority: 'QUALIFIED_VENDOR_SERIES', sourceAuthority: 'P3D-PROF-045', status: 'CONTRACT_ONLY' }),
  Object.freeze({ schema: PIPELINE_GRE_VENDOR_POLICY_DESCRIPTOR_SCHEMA,
    componentPolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.TEE, componentKind: 'TEE',
    dimensionalAuthority: 'QUALIFIED_VENDOR_SERIES', sourceAuthority: 'P3D-PROF-045', status: 'CONTRACT_ONLY' }),
]);
const text = (value) => String(value ?? '').trim();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
const supplied = (source, field) => Object.hasOwn(source, field) && source[field] !== null
  && !(typeof source[field] === 'string' && !source[field].trim());

function clone(value) {
  if (value === undefined) return null;
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (!plain(value)) throw new TypeError('GRE vendor-series input must be JSON-safe plain data.');
  return Object.fromEntries(Object.keys(value).sort(compare).map((key) => [key, clone(value[key])]));
}
export const clonePipelineGreVendorJson = clone;
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
export function createPipelineGreVendorDiagnostic(code, message, details = {}) {
  return freeze({ severity: 'BLOCKING', code, message, details: clone(details) });
}
const rank = (code) => {
  const index = PIPELINE_GRE_VENDOR_BLOCKER_ORDER.indexOf(code);
  return index < 0 ? PIPELINE_GRE_VENDOR_BLOCKER_ORDER.length : index;
};
function normalizedDiagnostics(values = []) {
  const keyed = Object.create(null);
  values.filter(plain).filter((item) => text(item.code)).forEach((item) => {
    const value = freeze({ severity: text(item.severity) || 'BLOCKING', code: text(item.code),
      message: text(item.message), details: plain(item.details) ? clone(item.details) : {} });
    keyed[`${value.code}:${JSON.stringify(value.details)}`] = value;
  });
  return Object.freeze(Object.values(keyed).sort((a, b) => rank(a.code) - rank(b.code)
    || compare(a.code, b.code) || compare(JSON.stringify(a.details), JSON.stringify(b.details))));
}
function finalState(source, generated = [], extraCodes = []) {
  const diagnostics = normalizedDiagnostics([...(Array.isArray(source.diagnostics) ? source.diagnostics : []), ...generated]);
  const codes = [...(Array.isArray(source.blockerCodes) ? source.blockerCodes : []), ...extraCodes,
    ...diagnostics.map((item) => item.code)].map(text).filter(Boolean);
  const blockerCodes = Object.freeze([...new Set(codes)].sort((a, b) => rank(a) - rank(b) || compare(a, b)));
  return { diagnostics, blockerCodes, ready: blockerCodes.length === 0 };
}
function safe(input, code) {
  try { const source = clone(input); if (plain(source)) return { source, errors: [] }; } catch { /* blocked */ }
  return { source: {}, errors: [createPipelineGreVendorDiagnostic(code, 'Input must be JSON-safe plain data.')] };
}
const canonical = (value) => JSON.stringify(Object.fromEntries(Object.keys(value || {}).sort(compare)
  .map((key) => [key, value[key]])));

export function createPipelineGreVendorSeriesPolicyRegistry(descriptors = DESCRIPTORS) {
  const safeValue = safe({ descriptors }, 'PIPELINE_GRE_VENDOR_POLICY_INVALID');
  const values = Array.isArray(safeValue.source.descriptors) ? safeValue.source.descriptors : [];
  const valid = values.length === DESCRIPTORS.length && values.every((item, index) => plain(item)
    && item.componentPolicyId === DESCRIPTORS[index].componentPolicyId
    && canonical(item) === canonical(DESCRIPTORS[index]));
  const errors = [...safeValue.errors];
  if (!valid) errors.push(createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_POLICY_INVALID',
    'Registry must contain exactly the canonical GRE bend and tee policies in canonical order.'));
  const state = finalState({}, errors);
  return freeze({ schema: PIPELINE_GRE_VENDOR_POLICY_REGISTRY_SCHEMA,
    descriptors: Object.freeze((valid ? values : []).map(clone).map(freeze)),
    diagnostics: state.diagnostics, blockerCodes: state.blockerCodes, ready: state.ready });
}
export const PIPELINE_GRE_VENDOR_SERIES_POLICY_REGISTRY = createPipelineGreVendorSeriesPolicyRegistry();

export function createPipelineGreVendorSeriesMigration(input = {}) {
  const safeValue = safe(input, 'PIPELINE_GRE_VENDOR_INPUT_INVALID'), source = safeValue.source;
  const errors = [...safeValue.errors];
  if (source.schema !== undefined && source.schema !== PIPELINE_GRE_VENDOR_MIGRATION_SCHEMA) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_INPUT_INVALID', 'Migration schema must be exact.'));
  if (source.sourceKinds !== undefined && (!Array.isArray(source.sourceKinds)
    || source.sourceKinds.some((value) => typeof value !== 'string' || !text(value)))) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_INPUT_INVALID', 'sourceKinds must contain nonblank strings.'));
  if (source.legacyAnalysisSectionIds !== undefined && (!Array.isArray(source.legacyAnalysisSectionIds)
    || source.legacyAnalysisSectionIds.some((value) => !/^AS[1-9]\d*$/.test(text(value))))) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_INPUT_INVALID', 'legacyAnalysisSectionIds must contain canonical AS IDs.'));
  if (Array.isArray(source.legacyAnalysisSectionIds) && source.legacyAnalysisSectionIds.length > 0
    && source.legacyEvidenceObserved !== true) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_INPUT_INVALID', 'Legacy section IDs require observed legacy evidence.'));
  if (source.legacyEvidenceObserved === true && source.legacyGreVendorSeriesBasisConfirmed !== true) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_LEGACY_AUTHORITY_UNCONFIRMED',
      'Observed legacy GRE vendor-series evidence requires explicit confirmation.'));
  const state = finalState(source, errors);
  const unique = (values) => Object.freeze([...new Set((Array.isArray(values) ? values : [])
    .map(text).filter(Boolean))].sort(compare));
  return freeze({ schema: PIPELINE_GRE_VENDOR_MIGRATION_SCHEMA, sourceKinds: unique(source.sourceKinds),
    legacyAnalysisSectionIds: unique(source.legacyAnalysisSectionIds),
    legacyEvidenceObserved: source.legacyEvidenceObserved === true,
    legacyGreVendorSeriesBasisConfirmed: source.legacyGreVendorSeriesBasisConfirmed === true,
    sourceAuthority: text(source.sourceAuthority), sourceReference: text(source.sourceReference),
    diagnostics: state.diagnostics, blockerCodes: state.blockerCodes, ready: state.ready });
}

function seriesErrors(source, bore) {
  const errors = [], required = ['vendorId', 'seriesId', 'sourceKind', 'sourceAuthority', 'sourceReference'];
  if (required.some((field) => !text(source[field]))) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_IDENTITY_INVALID', 'Vendor, series and provenance identity must be nonblank.'));
  if (!text(source.qualificationEvidenceId)) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_QUALIFICATION_REQUIRED', 'qualificationEvidenceId is required.'));
  if (!text(source.requirementReference)) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_REQUIREMENT_REFERENCE_REQUIRED', 'requirementReference is required.'));
  if (!bore) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_NOMINAL_BORE_REQUIRED', 'A positive GRE vendor nominal bore is required.'));
  const bendD = ['bendRadiusMm', 'bendBreakLengthMm', 'bendLocalThicknessMm'].map((field) => parsePipelinePositiveScalar(source[field]));
  const basis = text(source.bendBreakLengthBasis), multiplier = parsePipelinePositiveScalar(source.bendBreakMultiplierBore);
  if (source.bendPolicyId !== PIPELINE_GRE_VENDOR_POLICY_IDS.BEND || bendD.some((value) => !value)
    || !['NOMINAL_BORE_MULTIPLIER', 'EXPLICIT_LENGTH'].includes(basis)) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID', 'Qualified bend dimensions are invalid.'));
  if (basis === 'NOMINAL_BORE_MULTIPLIER' && (!multiplier || !bore
    || Math.abs(bendD[1] - bore * multiplier) > 0.000001)) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID', 'Multiplier bend break length must equal nominal bore times multiplier.'));
  if (basis === 'EXPLICIT_LENGTH' && supplied(source, 'bendBreakMultiplierBore')) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_BEND_INPUT_INVALID', 'Explicit bend break length cannot include a multiplier.'));
  if (source.teePolicyId !== PIPELINE_GRE_VENDOR_POLICY_IDS.TEE || text(source.teeBreakLengthBasis) !== 'EXPLICIT_LENGTH'
    || !parsePipelinePositiveScalar(source.teeBreakLengthMm) || !parsePipelinePositiveScalar(source.teeLocalThicknessMm)) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_TEE_INPUT_INVALID', 'Qualified tee dimensions are invalid.'));
  return errors;
}
function resolutionIdentityErrors(source, element = false) {
  const errors = [], profile = getPipelineEngineeringProfile(text(source.profileId));
  if (!profile || profile.profileId !== 'gre') errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_PROFILE_INCOMPATIBLE', 'GRE vendor-series resolution requires profileId gre.'));
  if (!/^AS[1-9]\d*$/.test(text(source.analysisSectionId))) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_OWNERSHIP_INVALID', 'Canonical analysis-section identity is required.'));
  if (element && (!Number.isInteger(source.elementIndex) || source.elementIndex < 0
    || text(source.elementId) !== `E${source.elementIndex + 1}`
    || !['SECTION_START', 'INHERITED'].includes(text(source.sectionDisposition)))) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_OWNERSHIP_INVALID', 'Canonical element identity and disposition are required.'));
  if (!element && (!Number.isInteger(source.startElementIndex) || source.startElementIndex < 0)) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_OWNERSHIP_INVALID', 'A nonnegative section start is required.'));
  return errors;
}
const blockedAuthority = (source) => text(source.status) === 'BLOCKED'
  && ((Array.isArray(source.blockerCodes) && source.blockerCodes.length)
    || (Array.isArray(source.diagnostics) && source.diagnostics.some((item) => text(item?.severity) === 'BLOCKING')));

export function createPipelineGreVendorSeriesSectionResolution(input = {}) {
  const safeValue = safe(input, 'PIPELINE_GRE_VENDOR_INPUT_INVALID'), source = safeValue.source;
  const bore = parsePipelinePositiveScalar(source.greVendorNominalBoreMm), errors = [...safeValue.errors,
    ...resolutionIdentityErrors(source)];
  if (!blockedAuthority(source)) errors.push(...seriesErrors(source, bore));
  const state = finalState(source, errors), scalar = (field) => parsePipelinePositiveScalar(source[field]);
  return freeze({ schema: PIPELINE_GRE_VENDOR_SECTION_SCHEMA, analysisSectionId: text(source.analysisSectionId),
    startElementIndex: Number.isInteger(source.startElementIndex) ? source.startElementIndex : null,
    profileId: text(source.profileId), vendorId: text(source.vendorId), seriesId: text(source.seriesId),
    qualificationEvidenceId: text(source.qualificationEvidenceId), requirementReference: text(source.requirementReference),
    greVendorNominalBoreMm: bore, bendPolicyId: text(source.bendPolicyId), bendRadiusMm: scalar('bendRadiusMm'),
    bendBreakLengthBasis: text(source.bendBreakLengthBasis), bendBreakMultiplierBore: scalar('bendBreakMultiplierBore'),
    bendBreakLengthMm: scalar('bendBreakLengthMm'), bendLocalThicknessMm: scalar('bendLocalThicknessMm'),
    teePolicyId: text(source.teePolicyId), teeBreakLengthBasis: text(source.teeBreakLengthBasis),
    teeBreakLengthMm: scalar('teeBreakLengthMm'), teeLocalThicknessMm: scalar('teeLocalThicknessMm'),
    sourceKind: text(source.sourceKind), sourceAuthority: text(source.sourceAuthority), sourceReference: text(source.sourceReference),
    status: state.ready ? 'RESOLVED' : 'BLOCKED', diagnostics: state.diagnostics, blockerCodes: state.blockerCodes, ready: state.ready });
}
export function createPipelineGreVendorSeriesElementResolution(input = {}) {
  const safeValue = safe(input, 'PIPELINE_GRE_VENDOR_INPUT_INVALID'), source = safeValue.source;
  const bore = parsePipelinePositiveScalar(source.greVendorNominalBoreMm), errors = [...safeValue.errors,
    ...resolutionIdentityErrors(source, true)];
  if (!blockedAuthority(source) && (!text(source.vendorId) || !text(source.seriesId) || !bore || !text(source.sourceKind))) errors.push(
    createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_ELEMENT_COVERAGE_INVALID', 'Resolved elements require vendor-series identity.'));
  const state = finalState(source, errors);
  return freeze({ schema: PIPELINE_GRE_VENDOR_ELEMENT_SCHEMA, elementIndex: Number.isInteger(source.elementIndex) ? source.elementIndex : null,
    elementId: text(source.elementId), analysisSectionId: text(source.analysisSectionId), profileId: text(source.profileId),
    vendorId: text(source.vendorId), seriesId: text(source.seriesId), greVendorNominalBoreMm: bore,
    sectionDisposition: text(source.sectionDisposition), sourceKind: text(source.sourceKind),
    status: state.ready ? 'RESOLVED' : 'BLOCKED', diagnostics: state.diagnostics, blockerCodes: state.blockerCodes, ready: state.ready });
}
function coverageErrors(sections, elements, notApplicable) {
  const errors = [], sectionIds = Object.create(null), starts = Object.create(null);
  const elementIndexes = Object.create(null), elementIds = Object.create(null), excluded = Object.create(null);
  sections.forEach((item) => {
    if (sectionIds[item.analysisSectionId] || starts[item.startElementIndex]) errors.push(createPipelineGreVendorDiagnostic(
      'PIPELINE_GRE_VENDOR_SECTION_COVERAGE_INVALID', 'GRE section identity and starts must be unique.'));
    sectionIds[item.analysisSectionId] = true; starts[item.startElementIndex] = true;
  });
  elements.forEach((item) => {
    const owner = sections.filter((section) => section.startElementIndex <= item.elementIndex).at(-1);
    const disposition = owner?.startElementIndex === item.elementIndex ? 'SECTION_START' : 'INHERITED';
    if (elementIndexes[item.elementIndex] || elementIds[item.elementId] || !owner
      || item.analysisSectionId !== owner.analysisSectionId || item.sectionDisposition !== disposition) errors.push(
      createPipelineGreVendorDiagnostic('PIPELINE_GRE_VENDOR_ELEMENT_COVERAGE_INVALID',
        'GRE element coverage must be unique and follow resolved section ownership.'));
    elementIndexes[item.elementIndex] = true; elementIds[item.elementId] = true;
  });
  notApplicable.forEach((id) => {
    if (excluded[id] || sectionIds[id] || !/^AS[1-9]\d*$/.test(id)) errors.push(createPipelineGreVendorDiagnostic(
      'PIPELINE_GRE_VENDOR_SECTION_COVERAGE_INVALID', 'Not-applicable sections must be canonical, unique and disjoint.'));
    excluded[id] = true;
  });
  return errors;
}
export function createPipelineGreVendorSeriesPlan(input = {}) {
  const safeValue = safe(input, 'PIPELINE_GRE_VENDOR_INPUT_INVALID'), source = safeValue.source;
  const errors = [...safeValue.errors];
  if (source.analysisSectionPlanSchema !== PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA
    || source.analysisDiameterPlanSchema !== PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA
    || source.grePlaceholderSchema !== GRE_PLACEHOLDER_SCHEMA) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_INPUT_INVALID', 'Exact analysis, diameter and GRE placeholder schemas are required.'));
  if (!Array.isArray(source.sectionResolutions) || !Array.isArray(source.elementResolutions)
    || !Array.isArray(source.notApplicableAnalysisSectionIds)) errors.push(createPipelineGreVendorDiagnostic(
    'PIPELINE_GRE_VENDOR_SECTION_COVERAGE_INVALID', 'Section, element and not-applicable arrays are required.'));
  const migration = createPipelineGreVendorSeriesMigration(source.migration || {});
  const sections = Object.freeze((Array.isArray(source.sectionResolutions) ? source.sectionResolutions : [])
    .map(createPipelineGreVendorSeriesSectionResolution).sort((a, b) => a.startElementIndex - b.startElementIndex));
  const elements = Object.freeze((Array.isArray(source.elementResolutions) ? source.elementResolutions : [])
    .map(createPipelineGreVendorSeriesElementResolution).sort((a, b) => a.elementIndex - b.elementIndex));
  const notApplicable = Object.freeze((Array.isArray(source.notApplicableAnalysisSectionIds)
    ? source.notApplicableAnalysisSectionIds : []).map(text).filter(Boolean).sort(compare));
  errors.push(...coverageErrors(sections, elements, notApplicable));
  const nested = [migration, ...sections, ...elements];
  const state = finalState(source, [...errors, ...nested.flatMap((item) => item.diagnostics)],
    nested.flatMap((item) => item.blockerCodes));
  return freeze({ schema: PIPELINE_GRE_VENDOR_PLAN_SCHEMA,
    analysisSectionPlanSchema: text(source.analysisSectionPlanSchema),
    analysisDiameterPlanSchema: text(source.analysisDiameterPlanSchema), grePlaceholderSchema: text(source.grePlaceholderSchema),
    migration, sectionResolutions: sections, elementResolutions: elements,
    notApplicableAnalysisSectionIds: notApplicable, diagnostics: state.diagnostics, blockerCodes: state.blockerCodes,
    ready: state.ready && nested.every((item) => item.ready) });
}

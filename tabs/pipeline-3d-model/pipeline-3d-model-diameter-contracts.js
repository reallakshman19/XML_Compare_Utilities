import { getPipelineEngineeringProfile } from './pipeline-3d-model-engineering-profile-registry.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';

export const PIPELINE_DIAMETER_SEMANTIC_REGISTRY_SCHEMA = 'PipelineDiameterSemanticRegistry.v1';
export const PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA = 'PipelineDiameterSemanticDescriptor.v1';
export const PIPELINE_DIAMETER_MIGRATION_SCHEMA = 'PipelineDiameterMigration.v1';
export const PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA = 'PipelineAnalysisDiameterPlan.v1';
export const PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA = 'PipelineAnalysisDiameterResolution.v1';
export const PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA = 'PipelineElementDiameterResolution.v1';
export const PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA = 'PipelinePropertySectionPlan.v1';

export const PIPELINE_DIAMETER_BASIS_IDS = Object.freeze({
  OUTSIDE_DIAMETER_MM: 'outside-diameter-mm',
  NOMINAL_PIPE_SIZE_NPS: 'nominal-pipe-size-nps',
  GRE_VENDOR_NOMINAL_BORE_MM: 'gre-vendor-nominal-bore-mm',
});
export const PIPELINE_DIAMETER_BLOCKER_ORDER = Object.freeze([
  'PIPELINE_DIAMETER_INPUT_INVALID', 'PIPELINE_DIAMETER_BASIS_INVALID',
  'PIPELINE_DIAMETER_BASIS_UNCONFIRMED', 'PIPELINE_OUTSIDE_DIAMETER_REQUIRED',
  'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'PIPELINE_OUTSIDE_DIAMETER_CONFLICT',
  'PIPELINE_NPS_INVALID', 'PIPELINE_GRE_VENDOR_BORE_REQUIRED',
  'PIPELINE_GRE_VENDOR_BORE_INVALID', 'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE',
  'PIPELINE_DIAMETER_SOURCE_CONFLICT', 'PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION',
  'PIPELINE_DIAMETER_PROPERTY_MISMATCH', 'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
]);
const DESCRIPTORS = Object.freeze([
  Object.freeze({ schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: 'outside-diameter-mm', displayName: 'Physical Outside Diameter',
    semanticRole: 'PHYSICAL_OUTSIDE_DIAMETER', unit: 'mm', physicalMeasurement: true,
    caesarDiameterEligible: true, physicalDMultiplierEligible: true, sizeBandInputEligible: false,
    vendorSeriesInputEligible: false, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY' }),
  Object.freeze({ schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: 'nominal-pipe-size-nps', displayName: 'Nominal Pipe Size',
    semanticRole: 'NOMINAL_PIPE_SIZE', unit: 'NPS', physicalMeasurement: false,
    caesarDiameterEligible: false, physicalDMultiplierEligible: false, sizeBandInputEligible: true,
    vendorSeriesInputEligible: false, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY' }),
  Object.freeze({ schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: 'gre-vendor-nominal-bore-mm', displayName: 'GRE Vendor Nominal Bore',
    semanticRole: 'GRE_VENDOR_NOMINAL_BORE', unit: 'mm-or-vendor-designation', physicalMeasurement: false,
    caesarDiameterEligible: false, physicalDMultiplierEligible: false, sizeBandInputEligible: false,
    vendorSeriesInputEligible: true, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY' }),
]);
const text = (value) => String(value ?? '').trim();
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const plain = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
function cloneJson(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  if (!plain(value)) throw new TypeError('Diameter contract input must be JSON-safe plain data.');
  return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, cloneJson(value[key])]));
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
function diagnostic(code, message, details = {}) {
  return deepFreeze({ severity: 'BLOCKING', code, message, details: cloneJson(details) });
}
const rank = (code) => {
  const index = PIPELINE_DIAMETER_BLOCKER_ORDER.indexOf(code);
  return index < 0 ? PIPELINE_DIAMETER_BLOCKER_ORDER.length : index;
};
function normalizedDiagnostics(values = []) {
  const keyed = Object.create(null);
  values.filter(plain).filter((item) => text(item.code)).forEach((item) => {
    const value = deepFreeze({ severity: text(item.severity) || 'BLOCKING', code: text(item.code),
      message: text(item.message), details: plain(item.details) ? cloneJson(item.details) : {} });
    keyed[`${value.code}:${JSON.stringify(value.details)}`] = value;
  });
  return Object.freeze(Object.values(keyed).sort((a, b) => rank(a.code) - rank(b.code)
    || compareText(a.code, b.code) || compareText(JSON.stringify(a.details), JSON.stringify(b.details))));
}
function orderedCodes(diagnostics, supplied = []) {
  const keyed = Object.create(null);
  [...supplied, ...diagnostics.map((item) => item.code)].map(text).filter(Boolean)
    .forEach((code) => { keyed[code] = true; });
  return Object.freeze(Object.keys(keyed).sort((a, b) => rank(a) - rank(b) || compareText(a, b)));
}
function safeInput(input, code) {
  try {
    const source = cloneJson(input || {});
    if (plain(source)) return { source, errors: [] };
  } catch { /* Deterministic blocked contract. */ }
  return { source: {}, errors: [diagnostic(code, 'Input is not JSON-safe plain data.')] };
}
function finalState(source, generated, extraCodes = []) {
  const supplied = Array.isArray(source.diagnostics) ? source.diagnostics : [];
  const diagnostics = normalizedDiagnostics([...supplied, ...generated]);
  const codes = orderedCodes(diagnostics, [...(Array.isArray(source.blockerCodes) ? source.blockerCodes : []), ...extraCodes]);
  return { diagnostics, blockerCodes: codes, ready: codes.length === 0 };
}
function uniqueText(values) {
  const keyed = Object.create(null);
  (Array.isArray(values) ? values : []).map(text).filter(Boolean).forEach((value) => { keyed[value] = true; });
  return Object.freeze(Object.keys(keyed).sort(compareText));
}
export function parsePipelinePositiveScalar(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function createPipelineDiameterSemanticRegistry(descriptors = DESCRIPTORS) {
  const safe = safeInput({ descriptors }, 'PIPELINE_DIAMETER_BASIS_INVALID');
  const values = Array.isArray(safe.source.descriptors) ? safe.source.descriptors : [];
  const expected = Object.values(PIPELINE_DIAMETER_BASIS_IDS);
  const ordered = expected.map((id) => values.find((item) => item?.basisId === id)).filter(Boolean);
  const canonical = (item) => JSON.stringify(Object.fromEntries(Object.keys(item || {}).sort(compareText)
    .map((key) => [key, item[key]])));
  const invalid = values.length !== expected.length || ordered.length !== expected.length
    || ordered.some((item, index) => canonical(item) !== canonical(DESCRIPTORS[index]));
  const generated = [...safe.errors];
  if (invalid) generated.push(diagnostic('PIPELINE_DIAMETER_BASIS_INVALID',
    'Diameter semantic registry must contain exactly the canonical descriptors in canonical order.'));
  const final = finalState({}, generated);
  return deepFreeze({ schema: PIPELINE_DIAMETER_SEMANTIC_REGISTRY_SCHEMA,
    descriptors: Object.freeze(ordered.map(cloneJson).map(deepFreeze)),
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes, ready: final.ready });
}
export const PIPELINE_DIAMETER_SEMANTIC_REGISTRY = createPipelineDiameterSemanticRegistry();
export function getPipelineDiameterSemanticDescriptor(basisId, registry = PIPELINE_DIAMETER_SEMANTIC_REGISTRY) {
  return (registry?.descriptors || []).find((item) => item.basisId === text(basisId)) || null;
}
export function createPipelineDiameterMigration(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID');
  const final = finalState(safe.source, safe.errors);
  return deepFreeze({ schema: PIPELINE_DIAMETER_MIGRATION_SCHEMA,
    outsideDiameterSourceKinds: uniqueText(safe.source.outsideDiameterSourceKinds),
    nominalPipeSizeSourceKinds: uniqueText(safe.source.nominalPipeSizeSourceKinds),
    greVendorNominalBoreSourceKinds: uniqueText(safe.source.greVendorNominalBoreSourceKinds),
    legacyDiameterEvidenceObserved: safe.source.legacyDiameterEvidenceObserved === true,
    legacyDiameterBasisConfirmed: safe.source.legacyDiameterBasisConfirmed === true,
    npsToOutsideDiameterConversionApplied: false, greVendorBoreToOutsideDiameterConversionApplied: false,
    sourceAuthority: text(safe.source.sourceAuthority), sourceReference: text(safe.source.sourceReference),
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes, ready: final.ready });
}
function quantityValues(source, includeProperty = false) {
  return {
    outsideDiameterMm: parsePipelinePositiveScalar(source.outsideDiameterMm),
    nominalPipeSizeNps: parsePipelinePositiveScalar(source.nominalPipeSizeNps),
    greVendorNominalBoreMm: parsePipelinePositiveScalar(source.greVendorNominalBoreMm),
    caesarDiameterMm: parsePipelinePositiveScalar(source.caesarDiameterMm),
    propertyDiameterMm: includeProperty ? parsePipelinePositiveScalar(source.propertyDiameterMm) : null,
  };
}
function quantityErrors(source, includeProperty = false) {
  const pairs = [['outsideDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID'],
    ['nominalPipeSizeNps', 'PIPELINE_NPS_INVALID'], ['greVendorNominalBoreMm', 'PIPELINE_GRE_VENDOR_BORE_INVALID'],
    ['caesarDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID']];
  if (includeProperty) pairs.push(['propertyDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID']);
  return pairs.filter(([field]) => source[field] != null && source[field] !== '')
    .filter(([field]) => parsePipelinePositiveScalar(source[field]) == null)
    .map(([field, code]) => diagnostic(code, `${field} must be a finite positive scalar when supplied.`, { value: source[field] }));
}
function profileErrors(source, values, validateMode) {
  const errors = [], profile = getPipelineEngineeringProfile(text(source.profileId));
  if (!profile) return [diagnostic('PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE',
    'profileId must be an exact canonical engineering profile identifier.', { profileId: text(source.profileId) })];
  if (validateMode && text(source.resolvedMode) !== profile.resolvedMode) errors.push(diagnostic(
    'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE', 'resolvedMode does not match the canonical profile.',
    { profileId: profile.profileId, expectedMode: profile.resolvedMode, actualMode: text(source.resolvedMode) }));
  const metallic = profile.resolvedMode !== 'GRE';
  if (metallic && values.outsideDiameterMm == null) errors.push(diagnostic(
    'PIPELINE_OUTSIDE_DIAMETER_REQUIRED', 'Metallic profiles require physical outside diameter.', { profileId: profile.profileId }));
  if (!metallic && values.greVendorNominalBoreMm == null) errors.push(diagnostic(
    'PIPELINE_GRE_VENDOR_BORE_REQUIRED', 'GRE requires vendor nominal-bore evidence.', { profileId: profile.profileId }));
  if (metallic && values.greVendorNominalBoreMm != null) errors.push(diagnostic(
    'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE', 'GRE vendor bore is incompatible with a metallic profile.', { profileId: profile.profileId }));
  if (values.caesarDiameterMm !== values.outsideDiameterMm) errors.push(diagnostic(
    'PIPELINE_DIAMETER_BASIS_INVALID', 'CAESAR diameter must equal independently resolved physical outside diameter.'));
  return errors;
}
export function createPipelineAnalysisDiameterResolution(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'), source = safe.source;
  const values = quantityValues(source), errors = [...safe.errors, ...quantityErrors(source)];
  if (!/^AS[1-9]\d*$/.test(text(source.analysisSectionId)) || !Number.isInteger(source.startElementIndex)
    || source.startElementIndex < 0) errors.push(diagnostic('PIPELINE_DIAMETER_INPUT_INVALID',
    'Valid AS identity and nonnegative startElementIndex are required.'));
  errors.push(...profileErrors(source, values, true));
  const final = finalState(source, errors);
  return deepFreeze({ schema: PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA,
    analysisSectionId: text(source.analysisSectionId), profileId: text(source.profileId),
    resolvedMode: text(source.resolvedMode), startElementIndex: Number.isInteger(source.startElementIndex) ? source.startElementIndex : null,
    outsideDiameterMm: values.outsideDiameterMm, nominalPipeSizeNps: values.nominalPipeSizeNps,
    greVendorNominalBoreMm: values.greVendorNominalBoreMm, caesarDiameterMm: values.caesarDiameterMm,
    physicalDiameterReady: values.outsideDiameterMm != null,
    sizeBandInputReady: values.nominalPipeSizeNps != null, vendorSeriesInputReady: values.greVendorNominalBoreMm != null,
    sourceKind: text(source.sourceKind) || 'UNRESOLVED', sourceAuthority: text(source.sourceAuthority),
    sourceReference: text(source.sourceReference), quantitySources: deepFreeze(plain(source.quantitySources) ? cloneJson(source.quantitySources) : {}),
    status: final.ready ? 'RESOLVED' : 'BLOCKED', diagnostics: final.diagnostics,
    blockerCodes: final.blockerCodes, ready: final.ready });
}
export function createPipelineElementDiameterResolution(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'), source = safe.source;
  const values = quantityValues(source, true), errors = [...safe.errors, ...quantityErrors(source, true)];
  if (!Number.isInteger(source.elementIndex) || source.elementIndex < 0 || !/^E[1-9]\d*$/.test(text(source.elementId))
    || !/^AS[1-9]\d*$/.test(text(source.analysisSectionId))
    || !['SECTION_START', 'INHERITED'].includes(text(source.diameterDisposition))) errors.push(diagnostic(
    'PIPELINE_DIAMETER_INPUT_INVALID', 'Valid E/AS identity and diameter disposition are required.'));
  errors.push(...profileErrors(source, values, false));
  const final = finalState(source, errors);
  return deepFreeze({ schema: PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA,
    elementIndex: Number.isInteger(source.elementIndex) ? source.elementIndex : null,
    elementId: text(source.elementId), analysisSectionId: text(source.analysisSectionId), profileId: text(source.profileId),
    ...values, diameterDisposition: text(source.diameterDisposition), sourceKind: text(source.sourceKind) || 'UNRESOLVED',
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes, ready: final.ready });
}
function coverageErrors(sections, elements) {
  const errors = [], byId = Object.create(null), starts = Object.create(null), indexes = Object.create(null), elementIds = Object.create(null);
  if (!sections.length || !elements.length) errors.push(diagnostic('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
    'At least one section and one element diameter resolution are required.'));
  sections.forEach((section) => {
    if (byId[section.analysisSectionId] || starts[section.startElementIndex]) errors.push(diagnostic(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Section identities and start indexes must be unique.',
      { analysisSectionId: section.analysisSectionId, startElementIndex: section.startElementIndex }));
    byId[section.analysisSectionId] = section; starts[section.startElementIndex] = true;
  });
  elements.forEach((element) => {
    if (indexes[element.elementIndex] || elementIds[element.elementId]) errors.push(diagnostic(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Element indexes and IDs must be unique.',
      { elementIndex: element.elementIndex, elementId: element.elementId }));
    indexes[element.elementIndex] = true; elementIds[element.elementId] = true;
    const owner = byId[element.analysisSectionId];
    if (!owner || owner.profileId !== element.profileId) errors.push(diagnostic(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Element profile and owning section must agree.',
      { elementIndex: element.elementIndex, analysisSectionId: element.analysisSectionId }));
    const quantityMismatch = owner && ['outsideDiameterMm', 'nominalPipeSizeNps', 'greVendorNominalBoreMm', 'caesarDiameterMm']
      .some((field) => owner[field] !== element[field]);
    if (quantityMismatch) errors.push(diagnostic('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
      'Element diameter quantities must match the owning section.', { elementIndex: element.elementIndex }));
    const shouldStart = owner?.startElementIndex === element.elementIndex;
    if ((element.diameterDisposition === 'SECTION_START') !== shouldStart) errors.push(diagnostic(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Diameter disposition must match the owning section start.',
      { elementIndex: element.elementIndex, analysisSectionId: element.analysisSectionId }));
  });
  for (let index = 0; index < elements.length; index += 1) if (!indexes[index]) errors.push(diagnostic(
    'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Element coverage must be contiguous from index zero.', { missingElementIndex: index }));
  sections.forEach((section) => {
    const owners = elements.filter((element) => element.analysisSectionId === section.analysisSectionId);
    if (!owners.length || !owners.some((element) => element.elementIndex === section.startElementIndex)) errors.push(diagnostic(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Every section must own its start element.',
      { analysisSectionId: section.analysisSectionId, startElementIndex: section.startElementIndex }));
  });
  return errors;
}
export function createPipelineAnalysisDiameterPlan(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'), source = safe.source;
  const sectionInputs = Array.isArray(source.sectionResolutions) ? source.sectionResolutions : [];
  const elementInputs = Array.isArray(source.elementResolutions) ? source.elementResolutions : [];
  const sections = Object.freeze(sectionInputs.map(createPipelineAnalysisDiameterResolution));
  const elements = Object.freeze(elementInputs.map(createPipelineElementDiameterResolution));
  const migration = createPipelineDiameterMigration(source.migration || {}), errors = [...safe.errors];
  if (source.analysisSectionPlanSchema !== PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA
    || source.propertySectionPlanSchema !== PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA) errors.push(diagnostic(
    'PIPELINE_DIAMETER_INPUT_INVALID', 'Exact analysis-section and property-plan schemas are required.',
    { analysisSectionPlanSchema: text(source.analysisSectionPlanSchema), propertySectionPlanSchema: text(source.propertySectionPlanSchema) }));
  if (!Array.isArray(source.sectionResolutions) || !Array.isArray(source.elementResolutions)) errors.push(diagnostic(
    'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'sectionResolutions and elementResolutions must be arrays.'));
  errors.push(...coverageErrors(sections, elements));
  const nested = [...migration.diagnostics, ...sections.flatMap((item) => item.diagnostics), ...elements.flatMap((item) => item.diagnostics)];
  const final = finalState(source, [...errors, ...nested], migration.blockerCodes);
  return deepFreeze({ schema: PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,
    analysisSectionPlanSchema: text(source.analysisSectionPlanSchema), propertySectionPlanSchema: text(source.propertySectionPlanSchema),
    migration, sectionResolutions: sections, elementResolutions: elements,
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes,
    ready: final.ready && migration.ready && sections.every((item) => item.ready) && elements.every((item) => item.ready) });
}

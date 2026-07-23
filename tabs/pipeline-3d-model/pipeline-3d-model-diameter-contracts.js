export const PIPELINE_DIAMETER_SEMANTIC_REGISTRY_SCHEMA = 'PipelineDiameterSemanticRegistry.v1';
export const PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA = 'PipelineDiameterSemanticDescriptor.v1';
export const PIPELINE_DIAMETER_MIGRATION_SCHEMA = 'PipelineDiameterMigration.v1';
export const PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA = 'PipelineAnalysisDiameterPlan.v1';
export const PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA = 'PipelineAnalysisDiameterResolution.v1';
export const PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA = 'PipelineElementDiameterResolution.v1';

export const PIPELINE_DIAMETER_BASIS_IDS = Object.freeze({
  OUTSIDE_DIAMETER_MM: 'outside-diameter-mm',
  NOMINAL_PIPE_SIZE_NPS: 'nominal-pipe-size-nps',
  GRE_VENDOR_NOMINAL_BORE_MM: 'gre-vendor-nominal-bore-mm',
});

export const PIPELINE_DIAMETER_BLOCKER_ORDER = Object.freeze([
  'PIPELINE_DIAMETER_INPUT_INVALID',
  'PIPELINE_DIAMETER_BASIS_INVALID',
  'PIPELINE_DIAMETER_BASIS_UNCONFIRMED',
  'PIPELINE_OUTSIDE_DIAMETER_REQUIRED',
  'PIPELINE_OUTSIDE_DIAMETER_INVALID',
  'PIPELINE_OUTSIDE_DIAMETER_CONFLICT',
  'PIPELINE_NPS_INVALID',
  'PIPELINE_GRE_VENDOR_BORE_REQUIRED',
  'PIPELINE_GRE_VENDOR_BORE_INVALID',
  'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE',
  'PIPELINE_DIAMETER_SOURCE_CONFLICT',
  'PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION',
  'PIPELINE_DIAMETER_PROPERTY_MISMATCH',
  'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
]);

const DESCRIPTORS = Object.freeze([
  Object.freeze({
    schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: PIPELINE_DIAMETER_BASIS_IDS.OUTSIDE_DIAMETER_MM,
    displayName: 'Physical Outside Diameter', semanticRole: 'PHYSICAL_OUTSIDE_DIAMETER',
    unit: 'mm', physicalMeasurement: true, caesarDiameterEligible: true,
    physicalDMultiplierEligible: true, sizeBandInputEligible: false,
    vendorSeriesInputEligible: false, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY',
  }),
  Object.freeze({
    schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: PIPELINE_DIAMETER_BASIS_IDS.NOMINAL_PIPE_SIZE_NPS,
    displayName: 'Nominal Pipe Size', semanticRole: 'NOMINAL_PIPE_SIZE',
    unit: 'NPS', physicalMeasurement: false, caesarDiameterEligible: false,
    physicalDMultiplierEligible: false, sizeBandInputEligible: true,
    vendorSeriesInputEligible: false, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY',
  }),
  Object.freeze({
    schema: PIPELINE_DIAMETER_SEMANTIC_DESCRIPTOR_SCHEMA,
    basisId: PIPELINE_DIAMETER_BASIS_IDS.GRE_VENDOR_NOMINAL_BORE_MM,
    displayName: 'GRE Vendor Nominal Bore', semanticRole: 'GRE_VENDOR_NOMINAL_BORE',
    unit: 'mm-or-vendor-designation', physicalMeasurement: false, caesarDiameterEligible: false,
    physicalDMultiplierEligible: false, sizeBandInputEligible: false,
    vendorSeriesInputEligible: true, sourceAuthority: 'P3D-PROF-042', status: 'CONTRACT_ONLY',
  }),
]);

const text = (value) => String(value ?? '').trim();
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
function plain(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
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
function rank(code) {
  const index = PIPELINE_DIAMETER_BLOCKER_ORDER.indexOf(code);
  return index < 0 ? PIPELINE_DIAMETER_BLOCKER_ORDER.length : index;
}
function diagnostic(code, message, details = {}) {
  return deepFreeze({ severity: 'BLOCKING', code, message, details: cloneJson(details) });
}
function normalizedDiagnostics(values = []) {
  const keyed = Object.create(null);
  for (const value of values) {
    if (!plain(value) || !text(value.code)) continue;
    const item = deepFreeze({ severity: text(value.severity) || 'BLOCKING', code: text(value.code),
      message: text(value.message), details: plain(value.details) ? cloneJson(value.details) : {} });
    keyed[`${item.code}:${JSON.stringify(item.details)}`] = item;
  }
  return Object.freeze(Object.values(keyed).sort((a, b) => rank(a.code) - rank(b.code)
    || compareText(a.code, b.code) || compareText(JSON.stringify(a.details), JSON.stringify(b.details))));
}
function blockerCodes(diagnostics, supplied = []) {
  const keyed = Object.create(null);
  [...supplied, ...diagnostics.map((item) => item.code)].map(text).filter(Boolean)
    .forEach((code) => { keyed[code] = true; });
  return Object.freeze(Object.keys(keyed).sort((a, b) => rank(a) - rank(b) || compareText(a, b)));
}
function safeInput(input, code) {
  try {
    const source = cloneJson(input || {});
    if (plain(source)) return { source, errors: [] };
  } catch { /* Return a deterministic blocked contract. */ }
  return { source: {}, errors: [diagnostic(code, 'Input is not JSON-safe plain data.')] };
}
function uniqueText(values = []) {
  const keyed = Object.create(null);
  values.map(text).filter(Boolean).forEach((value) => { keyed[value] = true; });
  return Object.freeze(Object.keys(keyed).sort(compareText));
}
function positiveOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function finalState(source, generated) {
  const supplied = Array.isArray(source.diagnostics) ? source.diagnostics : [];
  const diagnostics = normalizedDiagnostics([...supplied, ...generated]);
  const codes = blockerCodes(diagnostics, Array.isArray(source.blockerCodes) ? source.blockerCodes : []);
  return { diagnostics, blockerCodes: codes, ready: codes.length === 0 };
}

export function createPipelineDiameterSemanticRegistry(descriptors = DESCRIPTORS) {
  const safe = safeInput({ descriptors }, 'PIPELINE_DIAMETER_BASIS_INVALID');
  const values = Array.isArray(safe.source.descriptors) ? safe.source.descriptors : [];
  const expected = Object.values(PIPELINE_DIAMETER_BASIS_IDS);
  const ordered = expected.map((basisId) => values.find((item) => item?.basisId === basisId)).filter(Boolean);
  const canonical = (item) => Object.fromEntries(Object.keys(item || {}).sort(compareText)
    .map((key) => [key, item[key]]));
  const invalid = values.length !== expected.length || ordered.length !== expected.length
    || ordered.some((item, index) => JSON.stringify(canonical(item)) !== JSON.stringify(canonical(DESCRIPTORS[index])));
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
  const requested = text(basisId);
  return (registry?.descriptors || []).find((item) => item.basisId === requested) || null;
}

export function createPipelineDiameterMigration(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID');
  const source = safe.source;
  const final = finalState(source, safe.errors);
  return deepFreeze({ schema: PIPELINE_DIAMETER_MIGRATION_SCHEMA,
    outsideDiameterSourceKinds: uniqueText(source.outsideDiameterSourceKinds),
    nominalPipeSizeSourceKinds: uniqueText(source.nominalPipeSizeSourceKinds),
    greVendorNominalBoreSourceKinds: uniqueText(source.greVendorNominalBoreSourceKinds),
    legacyDiameterEvidenceObserved: source.legacyDiameterEvidenceObserved === true,
    legacyDiameterBasisConfirmed: source.legacyDiameterBasisConfirmed === true,
    npsToOutsideDiameterConversionApplied: false,
    greVendorBoreToOutsideDiameterConversionApplied: false,
    sourceAuthority: text(source.sourceAuthority), sourceReference: text(source.sourceReference),
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes, ready: final.ready });
}

function quantityErrors(source) {
  const errors = [];
  for (const [field, code] of [['outsideDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID'],
    ['nominalPipeSizeNps', 'PIPELINE_NPS_INVALID'], ['greVendorNominalBoreMm', 'PIPELINE_GRE_VENDOR_BORE_INVALID']]) {
    if (source[field] != null && positiveOrNull(source[field]) == null) errors.push(diagnostic(code,
      `${field} must be finite and positive when supplied.`, { value: source[field] }));
  }
  return errors;
}

export function createPipelineAnalysisDiameterResolution(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'); const source = safe.source;
  const errors = [...safe.errors, ...quantityErrors(source)];
  if (!/^AS[1-9]\d*$/.test(text(source.analysisSectionId)) || !Number.isInteger(source.startElementIndex)
    || source.startElementIndex < 0 || !text(source.profileId) || !text(source.resolvedMode)) {
    errors.push(diagnostic('PIPELINE_DIAMETER_INPUT_INVALID', 'Valid AS identity, profile, mode and start index are required.'));
  }
  const outsideDiameterMm = positiveOrNull(source.outsideDiameterMm);
  const nominalPipeSizeNps = positiveOrNull(source.nominalPipeSizeNps);
  const greVendorNominalBoreMm = positiveOrNull(source.greVendorNominalBoreMm);
  const caesarDiameterMm = positiveOrNull(source.caesarDiameterMm);
  if (caesarDiameterMm !== null && caesarDiameterMm !== outsideDiameterMm) errors.push(diagnostic(
    'PIPELINE_DIAMETER_BASIS_INVALID', 'CAESAR diameter must equal independently resolved physical outside diameter.'));
  const final = finalState(source, errors);
  return deepFreeze({ schema: PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA,
    analysisSectionId: text(source.analysisSectionId), profileId: text(source.profileId),
    resolvedMode: text(source.resolvedMode), startElementIndex: Number.isInteger(source.startElementIndex) ? source.startElementIndex : null,
    outsideDiameterMm, nominalPipeSizeNps, greVendorNominalBoreMm, caesarDiameterMm,
    physicalDiameterReady: outsideDiameterMm !== null, sizeBandInputReady: nominalPipeSizeNps !== null,
    vendorSeriesInputReady: greVendorNominalBoreMm !== null, sourceKind: text(source.sourceKind) || 'UNRESOLVED',
    sourceAuthority: text(source.sourceAuthority), sourceReference: text(source.sourceReference),
    quantitySources: deepFreeze(plain(source.quantitySources) ? cloneJson(source.quantitySources) : {}),
    status: final.ready ? 'RESOLVED' : 'BLOCKED', diagnostics: final.diagnostics,
    blockerCodes: final.blockerCodes, ready: final.ready });
}

export function createPipelineElementDiameterResolution(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'); const source = safe.source;
  const errors = [...safe.errors, ...quantityErrors(source)];
  if (source.propertyDiameterMm != null && positiveOrNull(source.propertyDiameterMm) == null) errors.push(diagnostic(
    'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'propertyDiameterMm must be finite and positive when supplied.',
    { value: source.propertyDiameterMm }));
  if (!Number.isInteger(source.elementIndex) || source.elementIndex < 0 || !/^E[1-9]\d*$/.test(text(source.elementId))
    || !/^AS[1-9]\d*$/.test(text(source.analysisSectionId)) || !text(source.profileId)
    || !['SECTION_START', 'INHERITED'].includes(text(source.diameterDisposition))) {
    errors.push(diagnostic('PIPELINE_DIAMETER_INPUT_INVALID', 'Valid E/AS identity and diameter disposition are required.'));
  }
  const outsideDiameterMm = positiveOrNull(source.outsideDiameterMm);
  const caesarDiameterMm = positiveOrNull(source.caesarDiameterMm);
  if (caesarDiameterMm !== null && caesarDiameterMm !== outsideDiameterMm) errors.push(diagnostic(
    'PIPELINE_DIAMETER_BASIS_INVALID', 'Element CAESAR diameter must equal physical outside diameter.'));
  const final = finalState(source, errors);
  return deepFreeze({ schema: PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA,
    elementIndex: Number.isInteger(source.elementIndex) ? source.elementIndex : null,
    elementId: text(source.elementId), analysisSectionId: text(source.analysisSectionId), profileId: text(source.profileId),
    outsideDiameterMm, nominalPipeSizeNps: positiveOrNull(source.nominalPipeSizeNps),
    greVendorNominalBoreMm: positiveOrNull(source.greVendorNominalBoreMm), caesarDiameterMm,
    propertyDiameterMm: positiveOrNull(source.propertyDiameterMm), diameterDisposition: text(source.diameterDisposition),
    sourceKind: text(source.sourceKind) || 'UNRESOLVED', diagnostics: final.diagnostics,
    blockerCodes: final.blockerCodes, ready: final.ready });
}

export function createPipelineAnalysisDiameterPlan(input = {}) {
  const safe = safeInput(input, 'PIPELINE_DIAMETER_INPUT_INVALID'); const source = safe.source;
  const errors = [...safe.errors];
  const sections = Object.freeze((Array.isArray(source.sectionResolutions) ? source.sectionResolutions : [])
    .map(createPipelineAnalysisDiameterResolution));
  const elements = Object.freeze((Array.isArray(source.elementResolutions) ? source.elementResolutions : [])
    .map(createPipelineElementDiameterResolution));
  if (!text(source.analysisSectionPlanSchema) || !text(source.propertySectionPlanSchema)) errors.push(diagnostic(
    'PIPELINE_DIAMETER_INPUT_INVALID', 'Analysis-section and property-plan schemas are required.'));
  const migration = createPipelineDiameterMigration(source.migration || {});
  const final = finalState(source, [...errors, ...migration.diagnostics,
    ...sections.flatMap((item) => item.diagnostics), ...elements.flatMap((item) => item.diagnostics)]);
  return deepFreeze({ schema: PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,
    analysisSectionPlanSchema: text(source.analysisSectionPlanSchema),
    propertySectionPlanSchema: text(source.propertySectionPlanSchema),
    migration,
    sectionResolutions: sections, elementResolutions: elements,
    diagnostics: final.diagnostics, blockerCodes: final.blockerCodes,
    ready: final.ready && sections.every((item) => item.ready) && elements.every((item) => item.ready) });
}
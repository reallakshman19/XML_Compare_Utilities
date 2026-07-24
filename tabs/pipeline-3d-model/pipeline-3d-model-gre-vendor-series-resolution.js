import { getPipelineEngineeringProfile } from './pipeline-3d-model-engineering-profile-registry.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA, PIPELINE_ANALYSIS_SECTION_SCHEMA, PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import { PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA, PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA, PIPELINE_DIAMETER_MIGRATION_SCHEMA,
  PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA, PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA, parsePipelinePositiveScalar } from './pipeline-3d-model-diameter-contracts.js';
import { GRE_PLACEHOLDER_SCHEMA } from './pipeline-3d-model-gre-placeholder.js';
import { PIPELINE_GRE_VENDOR_POLICY_IDS, clonePipelineGreVendorJson, createPipelineGreVendorDiagnostic,
  createPipelineGreVendorSeriesElementResolution, createPipelineGreVendorSeriesMigration, createPipelineGreVendorSeriesPlan,
  createPipelineGreVendorSeriesSectionResolution } from './pipeline-3d-model-gre-vendor-series-contracts.js';
const text = (value) => String(value ?? '').trim(); const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
const supplied = (source, field) => plain(source) && Object.hasOwn(source, field) && source[field] !== null
  && !(typeof source[field] === 'string' && !source[field].trim());
const diagnostic = (suffix, message = 'Invalid GRE vendor-series evidence.', details = {}) =>
  createPipelineGreVendorDiagnostic(`PIPELINE_GRE_VENDOR_${suffix}`, message, details);
const blocked = (record) => (Array.isArray(record?.blockerCodes) && record.blockerCodes.length > 0)
  || (Array.isArray(record?.diagnostics) && record.diagnostics.some((item) => text(item?.severity) === 'BLOCKING'));
const exactRecord = (record, schema, ready = true) => plain(record) && record.schema === schema
  && (!ready || record.ready === true) && Array.isArray(record.diagnostics) && Array.isArray(record.blockerCodes) && !blocked(record);
const positive = (value) => parsePipelinePositiveScalar(value); const optionalPositive = (record, field) => !supplied(record, field) || Boolean(positive(record[field]));
const canonicalTextList = (values) => Array.isArray(values) && values.every((value) => typeof value === 'string' && text(value))
  && values.every((value, index) => index === 0 || compare(values[index - 1], value) < 0);
const signature = (value) => JSON.stringify(Object.fromEntries(Object.keys(value || {}).sort(compare).map((key) => [key, value[key]])));
function authenticateAnalysis(source, errors) {
  const plan = source.analysisSectionPlan, sections = Array.isArray(plan?.sections) ? plan.sections : [];
  const elements = Array.isArray(plan?.elementResolutions) ? plan.elementResolutions : [];
  const rootValid = exactRecord(plan, PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA)
    && sections.length > 0 && elements.length > 0;
  if (!rootValid) errors.push(diagnostic('INPUT_INVALID', 'A ready canonical analysis-section plan is required.'));
  let authenticated = rootValid; const byId = Object.create(null), byElement = Object.create(null);
  sections.forEach((section, index) => {
    const profile = getPipelineEngineeringProfile(text(section?.profileId));
    const startValid = Number.isInteger(section?.startElementIndex) && section.startElementIndex >= 0
      && section.startElementIndex < elements.length
      && (index === 0 ? section.startElementIndex === 0 : section.startElementIndex > sections[index - 1]?.startElementIndex);
    const valid = exactRecord(section, PIPELINE_ANALYSIS_SECTION_SCHEMA, false) && section.status !== 'BLOCKED'
      && section.analysisSectionId === `AS${index + 1}` && startValid && Boolean(profile);
    const duplicate = Boolean(byId[section?.analysisSectionId]);
    if (!valid || duplicate) { authenticated = false; errors.push(diagnostic(
      'OWNERSHIP_INVALID', 'Analysis sections require canonical identity and nonempty intervals.')); }
    if (valid && !duplicate) byId[section.analysisSectionId] = section;
  });
  elements.forEach((element, index) => {
    const owner = sections.filter((section) => plain(section) && section.startElementIndex <= index).at(-1);
    const profile = getPipelineEngineeringProfile(text(owner?.profileId));
    const valid = exactRecord(element, PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA)
      && owner && element.elementIndex === index && element.elementId === `E${index + 1}`
      && element.analysisSectionId === owner.analysisSectionId && element.profileId === owner.profileId
      && element.resolvedMode === profile?.resolvedMode
      && element.sectionDisposition === (owner.startElementIndex === index ? 'SECTION_START' : 'INHERITED');
    if (!valid) { authenticated = false; errors.push(diagnostic(
      'OWNERSHIP_INVALID', 'Analysis element ownership or disposition is invalid.', { elementIndex: index })); }
    if (valid) byElement[index] = element;
  });
  return { plan: plain(plan) ? plan : {}, sections: sections.filter(plain), elements: elements.filter(plain), byId, byElement, authenticated };
}
const diameterQuantityErrors = (record, includeProperty = false) =>
  [...['outsideDiameterMm', 'nominalPipeSizeNps', 'greVendorNominalBoreMm', 'caesarDiameterMm'],
    ...(includeProperty ? ['propertyDiameterMm'] : [])].filter((field) => !optionalPositive(record, field));
function diameterSemantics(record, profileId, section = false) {
  const quantityFields = ['outsideDiameterMm', 'nominalPipeSizeNps', 'greVendorNominalBoreMm', 'caesarDiameterMm'];
  if (!section) quantityFields.push('propertyDiameterMm');
  const required = section ? [...quantityFields, 'physicalDiameterReady', 'sizeBandInputReady',
    'vendorSeriesInputReady', 'quantitySources'] : [...quantityFields, 'diameterDisposition'];
  const profile = getPipelineEngineeringProfile(profileId), outside = positive(record?.outsideDiameterMm);
  const nps = positive(record?.nominalPipeSizeNps), bore = positive(record?.greVendorNominalBoreMm);
  const common = required.every((field) => Object.hasOwn(record || {}, field)) && Boolean(profile)
    && text(record?.sourceKind) && diameterQuantityErrors(record, !section).length === 0
    && record.caesarDiameterMm === record.outsideDiameterMm && (!section || plain(record.quantitySources));
  if (!common) return false;
  if (profile.resolvedMode === 'GRE') {
    if (!bore || (outside && record.caesarDiameterMm !== record.outsideDiameterMm)) return false;
  } else if (!outside || bore) return false;
  if (!section) return true;
  return record.physicalDiameterReady === Boolean(outside)
    && record.sizeBandInputReady === Boolean(nps)
    && record.vendorSeriesInputReady === Boolean(bore);
}
const validDiameterMigration = (migration) => exactRecord(migration, PIPELINE_DIAMETER_MIGRATION_SCHEMA)
  && ['outsideDiameterSourceKinds', 'nominalPipeSizeSourceKinds', 'greVendorNominalBoreSourceKinds']
    .every((field) => canonicalTextList(migration[field]))
  && migration.npsToOutsideDiameterConversionApplied === false
  && migration.greVendorBoreToOutsideDiameterConversionApplied === false
  && typeof migration.legacyDiameterEvidenceObserved === 'boolean'
  && typeof migration.legacyDiameterBasisConfirmed === 'boolean'
  && !(migration.legacyDiameterEvidenceObserved && !migration.legacyDiameterBasisConfirmed);
function authenticateDiameter(source, analysis, errors) {
  const plan = source.analysisDiameterPlan, sections = Array.isArray(plan?.sectionResolutions) ? plan.sectionResolutions : [];
  const elements = Array.isArray(plan?.elementResolutions) ? plan.elementResolutions : [];
  const migrationValid = validDiameterMigration(plan?.migration);
  const rootValid = analysis.authenticated && exactRecord(plan, PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA)
    && plan.analysisSectionPlanSchema === PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA
    && plan.propertySectionPlanSchema === PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA && migrationValid
    && sections.length === analysis.sections.length && elements.length === analysis.elements.length;
  if (!rootValid) errors.push(diagnostic('DIAMETER_PLAN_INVALID', 'A ready canonical diameter plan and migration are required.'));
  let authenticated = rootValid; const byId = Object.create(null), byElement = Object.create(null);
  sections.forEach((record, index) => {
    const owner = analysis.byId[`AS${index + 1}`], profile = getPipelineEngineeringProfile(text(record?.profileId));
    const valid = exactRecord(record, PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA) && owner
      && record.status === 'RESOLVED' && record.analysisSectionId === owner.analysisSectionId
      && record.startElementIndex === owner.startElementIndex && record.profileId === owner.profileId
      && record.resolvedMode === profile?.resolvedMode && diameterSemantics(record, record.profileId, true);
    const duplicate = Boolean(byId[record?.analysisSectionId]);
    if (!valid || duplicate) { authenticated = false; errors.push(diagnostic(
      'DIAMETER_PLAN_INVALID', 'Diameter section evidence is not canonical.', { analysisSectionId: record?.analysisSectionId })); }
    if (valid && !duplicate) byId[record.analysisSectionId] = record;
  });
  elements.forEach((record, index) => {
    const owner = analysis.byElement[index], section = byId[owner?.analysisSectionId];
    const equal = section && ['outsideDiameterMm', 'nominalPipeSizeNps', 'greVendorNominalBoreMm', 'caesarDiameterMm']
      .every((field) => record?.[field] === section[field]);
    const valid = exactRecord(record, PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA) && owner && section
      && record.elementIndex === index && record.elementId === `E${index + 1}`
      && record.analysisSectionId === owner.analysisSectionId && record.profileId === owner.profileId
      && record.diameterDisposition === (section.startElementIndex === index ? 'SECTION_START' : 'INHERITED')
      && diameterSemantics(record, record.profileId) && equal;
    if (!valid) { authenticated = false; errors.push(diagnostic(
      'DIAMETER_PLAN_INVALID', 'Diameter element evidence is not canonical.', { elementIndex: index })); }
    if (valid) byElement[index] = record;
  });
  return { plan: plain(plan) ? plan : {}, sections: sections.filter(plain), elements: elements.filter(plain), byId, byElement, authenticated };
}
function authenticatePlaceholder(source, errors) {
  const value = source.grePlaceholder, rootFields = ['requirementReference', 'policyReady', 'resolverReady', 'geometryApplied', 'inputXmlApplied'];
  const bendFields = ['radiusBasis', 'radiusMm', 'breakLengthBasis', 'nominalBoreMm', 'breakMultiplierBore',
    'breakLengthMm', 'localThicknessMm', 'resolverReady'];
  const teeFields = ['breakLengthBasis', 'breakLengthMm', 'localThicknessMm', 'resolverReady'];
  const valid = plain(value) && value.schema === GRE_PLACEHOLDER_SCHEMA && typeof value.active === 'boolean'
    && typeof value.requirementReference === 'string' && rootFields.every((field) => Object.hasOwn(value, field))
    && value.policyReady === false && value.resolverReady === false && value.geometryApplied === false
    && value.inputXmlApplied === false && plain(value.bend) && bendFields.every((field) => Object.hasOwn(value.bend, field))
    && value.bend.radiusBasis === 'GRE_PLACEHOLDER' && ['NOMINAL_BORE', 'NOMINAL_BORE_MULTIPLIER', 'EXPLICIT_LENGTH']
      .includes(text(value.bend.breakLengthBasis)) && value.bend.resolverReady === false && plain(value.tee)
    && teeFields.every((field) => Object.hasOwn(value.tee, field))
    && ['CUSTOM_LENGTH', 'EXPLICIT_LENGTH'].includes(text(value.tee.breakLengthBasis)) && value.tee.resolverReady === false;
  if (!valid) errors.push(diagnostic('INPUT_INVALID', 'An exact non-operational GRE placeholder is required.'));
  return valid ? value : { schema: '', active: false, bend: {}, tee: {} };
}
const SERIES_FIELDS = Object.freeze(['vendorId', 'seriesId', 'qualificationEvidenceId', 'requirementReference',
  'greVendorNominalBoreMm', 'bendPolicyId', 'bendRadiusMm', 'bendBreakLengthBasis', 'bendBreakMultiplierBore',
  'bendBreakLengthMm', 'bendLocalThicknessMm', 'teePolicyId', 'teeBreakLengthBasis', 'teeBreakLengthMm',
  'teeLocalThicknessMm', 'sourceAuthority', 'sourceReference']);
function normalizeSeries(record, extraFields = []) {
  if (!plain(record)) return { value: null, errors: [diagnostic('INPUT_INVALID', 'Vendor-series rows must be plain objects.')] };
  const allowed = new Set([...SERIES_FIELDS, ...extraFields]);
  const unexpected = Object.keys(record).filter((field) => supplied(record, field) && !allowed.has(field));
  const normalized = Object.fromEntries(SERIES_FIELDS.map((field) => {
    const scalar = field.endsWith('Mm') || field === 'bendBreakMultiplierBore';
    return [field, scalar ? positive(record[field]) : text(record[field])];
  }));
  const probe = createPipelineGreVendorSeriesSectionResolution({ analysisSectionId: 'AS1', startElementIndex: 0,
    profileId: 'gre', sourceKind: 'INVENTORY_VALIDATION', ...normalized });
  const errors = [...probe.diagnostics];
  if (unexpected.length) errors.push(diagnostic('INPUT_INVALID', 'Vendor-series row contains unsupported fields.', { fields: unexpected.sort(compare) }));
  return { value: normalized, errors };
}
function grouped(records, extraFields = []) {
  const normalized = records.map((record) => normalizeSeries(record, extraFields));
  const errors = normalized.flatMap((item) => item.errors), values = normalized.map((item) => item.value).filter(Boolean)
    .sort((a, b) => compare(signature(a), signature(b)));
  if (new Set(values.map(signature)).size > 1) errors.push(diagnostic(
    'SOURCE_CONFLICT', 'Duplicate same-authority vendor-series rows conflict after normalization, including provenance.'));
  return { present: records.length > 0, value: values[0] || null, errors };
}
function inventory(source, analysis) {
  const errors = [], sectionRows = Object.create(null), globalRows = Object.create(null);
  for (const field of ['greVendorSeriesSections', 'greVendorSeriesGlobal']) {
    if (source[field] !== undefined && !Array.isArray(source[field])) errors.push(diagnostic('INPUT_INVALID', `${field} must be an array.`));
  }
  (Array.isArray(source.greVendorSeriesSections) ? source.greVendorSeriesSections : []).forEach((record) => {
    const section = analysis.byId[text(record?.analysisSectionId)];
    if (!section || section.profileId !== 'gre') errors.push(diagnostic('TARGET_INVALID',
      'Section vendor-series rows may target only exact GRE analysis sections.', { analysisSectionId: text(record?.analysisSectionId) }));
    const key = text(record?.analysisSectionId) || 'INVALID';
    (sectionRows[key] ||= []).push(record);
  });
  (Array.isArray(source.greVendorSeriesGlobal) ? source.greVendorSeriesGlobal : []).forEach((record, index) => {
    const bore = positive(record?.greVendorNominalBoreMm), key = bore ? String(bore) : `INVALID:${index}`;
    (globalRows[key] ||= []).push(record);
  });
  const pack = (rows, extra) => Object.fromEntries(Object.keys(rows).sort(compare).map((key) => {
    const group = grouped(rows[key], extra); errors.push(...group.errors); return [key, group];
  }));
  return { sections: pack(sectionRows, ['analysisSectionId']), globals: pack(globalRows, []), errors };
}
function legacySeries(source, placeholder, canonicalBore) {
  const observed = source.settings?.designBasis === 'gre' || placeholder.active === true
    || ['legacyGreVendorId', 'legacyGreSeriesId', 'legacyGreQualificationEvidenceId'].some((field) => text(source[field]));
  if (!observed) return { observed: false, value: null, errors: [diagnostic('AUTHORITY_UNRESOLVED',
    'No explicit or confirmed legacy GRE vendor-series authority resolved.')] };
  if (source.settings?.designBasis !== 'gre' || source.legacyGreVendorSeriesBasisConfirmed !== true || placeholder.active !== true) {
    return { observed: true, value: null, errors: [diagnostic('LEGACY_AUTHORITY_UNCONFIRMED',
      'Observed legacy GRE placeholder evidence is not explicitly confirmed.')] };
  }
  const placeholderBore = positive(placeholder.bend?.nominalBoreMm), rawBasis = text(placeholder.bend?.breakLengthBasis);
  const basis = ['NOMINAL_BORE', 'NOMINAL_BORE_MULTIPLIER'].includes(rawBasis)
    ? 'NOMINAL_BORE_MULTIPLIER' : rawBasis === 'EXPLICIT_LENGTH' ? 'EXPLICIT_LENGTH' : rawBasis;
  const raw = { vendorId: source.legacyGreVendorId, seriesId: source.legacyGreSeriesId,
    qualificationEvidenceId: source.legacyGreQualificationEvidenceId,
    requirementReference: placeholder.requirementReference, greVendorNominalBoreMm: placeholderBore,
    bendPolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.BEND, bendRadiusMm: placeholder.bend?.radiusMm,
    bendBreakLengthBasis: basis, bendBreakMultiplierBore: basis === 'NOMINAL_BORE_MULTIPLIER'
      ? placeholder.bend?.breakMultiplierBore : null, bendBreakLengthMm: placeholder.bend?.breakLengthMm,
    bendLocalThicknessMm: placeholder.bend?.localThicknessMm, teePolicyId: PIPELINE_GRE_VENDOR_POLICY_IDS.TEE,
    teeBreakLengthBasis: ['CUSTOM_LENGTH', 'EXPLICIT_LENGTH'].includes(text(placeholder.tee?.breakLengthBasis))
      ? 'EXPLICIT_LENGTH' : text(placeholder.tee?.breakLengthBasis), teeBreakLengthMm: placeholder.tee?.breakLengthMm,
    teeLocalThicknessMm: placeholder.tee?.localThicknessMm, sourceAuthority: source.sourceAuthority,
    sourceReference: source.sourceReference };
  const normalized = normalizeSeries(raw), errors = [...normalized.errors];
  if (!placeholderBore || !canonicalBore || placeholderBore !== canonicalBore) errors.push(diagnostic(
    'NOMINAL_BORE_CONFLICT', 'Legacy placeholder nominal bore must exactly match canonical GRE nominal bore.'));
  return { observed: true, value: normalized.value, errors };
}
function selectAuthority(source, placeholder, section, bore, records) {
  const sectionGroup = records.sections[section.analysisSectionId];
  if (sectionGroup?.present) {
    const errors = [...sectionGroup.errors];
    if (sectionGroup.value?.greVendorNominalBoreMm !== bore) errors.push(diagnostic(
      'NOMINAL_BORE_CONFLICT', 'Section vendor-series nominal bore must exactly match canonical GRE nominal bore.'));
    return { sourceKind: 'EXPLICIT_ANALYSIS_SECTION_VENDOR_SERIES', ...sectionGroup, errors, legacyObserved: false };
  }
  const globalGroup = records.globals[String(bore)];
  if (globalGroup?.present) return { sourceKind: 'EXPLICIT_GLOBAL_GRE_VENDOR_SERIES', ...globalGroup, legacyObserved: false };
  const legacy = legacySeries(source, placeholder, bore);
  return { sourceKind: legacy.value ? 'CONFIRMED_LEGACY_GRE_PLACEHOLDER' : 'UNRESOLVED',
    present: legacy.observed, value: legacy.value, errors: legacy.errors, legacyObserved: legacy.observed };
}
function blockedSection(section, elements, bore, selected) {
  const sectionResolution = createPipelineGreVendorSeriesSectionResolution({ analysisSectionId: section.analysisSectionId,
    startElementIndex: section.startElementIndex, profileId: section.profileId, greVendorNominalBoreMm: bore,
    sourceKind: selected.sourceKind, status: 'BLOCKED', diagnostics: selected.errors });
  const elementResolutions = elements.map((element) => createPipelineGreVendorSeriesElementResolution({
    elementIndex: element.elementIndex, elementId: element.elementId, analysisSectionId: element.analysisSectionId,
    profileId: element.profileId, greVendorNominalBoreMm: bore, sectionDisposition: element.sectionDisposition,
    sourceKind: selected.sourceKind, status: 'BLOCKED', diagnostics: selected.errors }));
  return { sectionResolution, elementResolutions };
}
function resolvedSection(section, elements, selected) {
  const sectionResolution = createPipelineGreVendorSeriesSectionResolution({ analysisSectionId: section.analysisSectionId,
    startElementIndex: section.startElementIndex, profileId: section.profileId, sourceKind: selected.sourceKind,
    ...selected.value });
  const elementResolutions = elements.map((element) => createPipelineGreVendorSeriesElementResolution({
    elementIndex: element.elementIndex, elementId: element.elementId, analysisSectionId: element.analysisSectionId,
    profileId: element.profileId, vendorId: selected.value.vendorId, seriesId: selected.value.seriesId,
    greVendorNominalBoreMm: selected.value.greVendorNominalBoreMm, sectionDisposition: element.sectionDisposition,
    sourceKind: selected.sourceKind }));
  return { sectionResolution, elementResolutions };
}
export function resolvePipelineGreVendorSeriesPlan(input = {}) {
  let source; try { source = clonePipelineGreVendorJson(input); if (!plain(source)) throw new TypeError(); } catch { source = {}; }
  const errors = []; if (!plain(input)) errors.push(diagnostic('INPUT_INVALID', 'Resolver input must be JSON-safe plain data.'));
  const analysis = authenticateAnalysis(source, errors);
  const diameter = authenticateDiameter(source, analysis, errors);
  const placeholder = authenticatePlaceholder(source, errors);
  const records = inventory(source, analysis); errors.push(...records.errors);
  const sectionResolutions = [], elementResolutions = [], notApplicable = [], legacyIds = [];
  for (const section of analysis.sections) {
    if (section.profileId !== 'gre') { notApplicable.push(section.analysisSectionId); continue; }
    const owned = analysis.elements.filter((element) => element.analysisSectionId === section.analysisSectionId);
    const diameterSection = diameter.byId[section.analysisSectionId], bore = positive(diameterSection?.greVendorNominalBoreMm);
    const selected = analysis.authenticated && diameter.authenticated && diameterSection && bore
      ? selectAuthority(source, placeholder, section, bore, records)
      : { sourceKind: 'UNRESOLVED', value: null, errors: [diagnostic(
        analysis.authenticated ? 'DIAMETER_PLAN_INVALID' : 'OWNERSHIP_INVALID',
        'GRE section requires authenticated upstream ownership and nominal-bore evidence.')], legacyObserved: false };
    const result = selected.errors.length ? blockedSection(section, owned, bore, selected)
      : resolvedSection(section, owned, selected);
    sectionResolutions.push(result.sectionResolution); elementResolutions.push(...result.elementResolutions);
    if (selected.sourceKind === 'CONFIRMED_LEGACY_GRE_PLACEHOLDER' || selected.legacyObserved) legacyIds.push(section.analysisSectionId);
  }
  const expectedGreElements = analysis.elements.filter((element) => element.profileId === 'gre').length;
  if (sectionResolutions.length !== analysis.sections.filter((section) => section.profileId === 'gre').length) errors.push(
    diagnostic('SECTION_COVERAGE_INVALID', 'Every GRE analysis section requires exactly one resolution.'));
  if (elementResolutions.length !== expectedGreElements) errors.push(diagnostic(
    'ELEMENT_COVERAGE_INVALID', 'Every GRE-owned element requires exactly one resolution.'));
  const migration = createPipelineGreVendorSeriesMigration({ sourceKinds: sectionResolutions.map((item) => item.sourceKind),
    legacyAnalysisSectionIds: legacyIds, legacyEvidenceObserved: legacyIds.length > 0,
    legacyGreVendorSeriesBasisConfirmed: source.legacyGreVendorSeriesBasisConfirmed === true,
    sourceAuthority: source.sourceAuthority, sourceReference: source.sourceReference });
  return createPipelineGreVendorSeriesPlan({ analysisSectionPlanSchema: analysis.plan.schema,
    analysisDiameterPlanSchema: diameter.plan.schema, grePlaceholderSchema: placeholder.schema, migration,
    sectionResolutions, elementResolutions, notApplicableAnalysisSectionIds: notApplicable,
    diagnostics: errors, blockerCodes: errors.map((item) => item.code) });
}
export const buildPipelineGreVendorSeriesPlanJson = (plan) => JSON.stringify(plan, null, 2);
const cell = (value) => value == null ? '' : String(value).replace(/[\t\r\n]/g, ' ');
export function buildPipelineGreVendorSeriesLedgerText(plan) {
  const header = ['RecordType', 'Schema', 'AnalysisSectionId', 'ElementId', 'ProfileId', 'VendorId', 'SeriesId',
    'GreVendorNominalBoreMm', 'BendRadiusMm', 'BendBreakLengthBasis', 'BendBreakLengthMm', 'TeeBreakLengthMm',
    'SectionDisposition', 'SourceKind', 'Status', 'Ready'];
  const sections = (plan?.sectionResolutions || []).map((item) => ['SECTION', item.schema, item.analysisSectionId, '',
    item.profileId, item.vendorId, item.seriesId, item.greVendorNominalBoreMm, item.bendRadiusMm,
    item.bendBreakLengthBasis, item.bendBreakLengthMm, item.teeBreakLengthMm, '', item.sourceKind, item.status,
    item.ready ? 'YES' : 'NO']);
  const elements = (plan?.elementResolutions || []).map((item) => ['ELEMENT', item.schema, item.analysisSectionId,
    item.elementId, item.profileId, item.vendorId, item.seriesId, item.greVendorNominalBoreMm, '', '', '', '',
    item.sectionDisposition, item.sourceKind, item.status, item.ready ? 'YES' : 'NO']);
  return [header, ...sections, ...elements].map((row) => row.map(cell).join('\t')).join('\n');
}

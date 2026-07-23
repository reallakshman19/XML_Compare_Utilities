import { getPipelineEngineeringProfile } from './pipeline-3d-model-engineering-profile-registry.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import { PIPELINE_DIAMETER_BASIS_IDS, createPipelineAnalysisDiameterPlan, createPipelineAnalysisDiameterResolution, createPipelineDiameterMigration, createPipelineElementDiameterResolution } from './pipeline-3d-model-diameter-contracts.js';
const PROPERTY_PLAN_SCHEMA = 'PipelinePropertySectionPlan.v1', RESEED_PLAN_SCHEMA = 'PipelineAnalysisPropertyReseedPlan.v1';
const text = (value) => String(value ?? '').trim();
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
function plain(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null;
}
function cloneJson(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  if (!plain(value)) throw new TypeError('Diameter resolver input must be JSON-safe plain data.');
  return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, cloneJson(value[key])]));
}
const diag = (code, message, details = {}) => ({ severity: 'BLOCKING', code, message, details: cloneJson(details) });
function positive(value) {
  if (value === null || value === undefined || text(value) === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
const supplied = (source, key) => own(source, key) && source[key] !== null && text(source[key]) !== '';
const source = (kind, value, authority, reference) => ({ sourceKind: kind, value, sourceAuthority: text(authority), sourceReference: text(reference) });
function unique(values, compare = compareText) {
  const keyed = Object.create(null); values.forEach((value) => { keyed[`${typeof value}:${String(value)}`] = value; });
  return Object.values(keyed).sort(compare);
}
function invalidQuantity(raw, code, field, diagnostics) {
  diagnostics.push(diag(code, `${field} must be finite and positive when supplied.`, { value: raw }));
  return source('INVALID_EXPLICIT_SOURCE', null, '', '');
}
function explicitCandidate(owner, key, kind, code, diagnostics, authority, reference) {
  if (!owner || !supplied(owner, key)) return null;
  const value = positive(owner[key]);
  return value == null ? invalidQuantity(owner[key], code, key, diagnostics)
    : source(kind, value, owner.sourceAuthority || authority, owner.sourceReference || reference);
}
function canonicalSections(analysis, diagnostics) {
  if (analysis?.schema !== PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA || analysis?.ready !== true
    || !Array.isArray(analysis.sections) || !Array.isArray(analysis.elementResolutions)) {
    diagnostics.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', 'A ready PipelineAnalysisSectionPlan.v1 is required.'));
    return [];
  }
  const sections = analysis.sections.slice().sort((a, b) => a.startElementIndex - b.startElementIndex
    || compareText(text(a.analysisSectionId), text(b.analysisSectionId)));
  const seen = Object.create(null);
  for (const section of sections) {
    const profile = getPipelineEngineeringProfile(text(section.profileId));
    const bad = !/^AS[1-9]\d*$/.test(text(section.analysisSectionId))
      || !Number.isInteger(section.startElementIndex) || !profile || seen[section.analysisSectionId];
    if (bad) diagnostics.push(diag('PIPELINE_DIAMETER_INPUT_INVALID',
      'Analysis section identity, profile or start index is invalid.', { analysisSectionId: section.analysisSectionId }));
    seen[section.analysisSectionId] = true;
  }
  return sections;
}
function selectedPropertyPlan(input, diagnostics) {
  const direct = input.propertySectionPlan;
  const reseed = input.analysisPropertyReseedPlan;
  const derivative = reseed?.schema === RESEED_PLAN_SCHEMA && reseed.ready === true ? reseed.propertySectionPlan : null;
  if (reseed !== undefined && !derivative) diagnostics.push(diag(
    'PIPELINE_DIAMETER_INPUT_INVALID', 'analysisPropertyReseedPlan must be a ready PipelineAnalysisPropertyReseedPlan.v1.'));
  const shape = (plan) => (plan?.elements || []).map((item) => [item.elementIndex, item.elementId,
    item.sectionId, item.properties?.diameter]);
  if (direct && derivative && JSON.stringify(shape(direct)) !== JSON.stringify(shape(derivative))) diagnostics.push(diag(
    'PIPELINE_DIAMETER_SOURCE_CONFLICT', 'Property and reseeded property plans disagree on diameter evidence.'));
  const plan = derivative || direct;
  if (plan?.schema !== PROPERTY_PLAN_SCHEMA || plan?.ready !== true || !Array.isArray(plan.elements)) {
    diagnostics.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', 'A ready PipelinePropertySectionPlan.v1 is required.'));
    return {};
  }
  return plan;
}
function propertyIndex(plan, analysis, diagnostics) {
  const grouped = Object.create(null);
  for (const item of plan.elements || []) {
    const key = String(item.elementIndex);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  for (const item of analysis?.elementResolutions || []) {
    const matches = grouped[String(item.elementIndex)] || [];
    if (matches.length !== 1 || text(matches[0].elementId) !== text(item.elementId)) diagnostics.push(diag(
      'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Property element identity does not match analysis ownership.',
      { elementIndex: item.elementIndex, elementId: item.elementId }));
  }
  if (Object.values(grouped).flat().length !== (analysis?.elementResolutions || []).length) diagnostics.push(diag(
    'PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', 'Property and analysis element counts differ.'));
  return grouped;
}
function diameterTargets(entries, sections, diagnostics) {
  const byId = Object.fromEntries(sections.map((item) => [item.analysisSectionId, item]));
  const byStart = Object.fromEntries(sections.map((item) => [String(item.startElementIndex), item]));
  const result = Object.create(null);
  if (entries !== undefined && !Array.isArray(entries)) diagnostics.push(diag(
    'PIPELINE_DIAMETER_INPUT_INVALID', 'diameterSections must be an array when supplied.'));
  for (const entry of Array.isArray(entries) ? entries : []) {
    const idTarget = text(entry.analysisSectionId) ? byId[text(entry.analysisSectionId)] : null;
    const indexTarget = Number.isInteger(entry.startElementIndex) ? byStart[String(entry.startElementIndex)] : null;
    if ((idTarget && indexTarget && idTarget !== indexTarget) || (!idTarget && !indexTarget)) {
      diagnostics.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', 'Diameter target must resolve to one existing AS.',
        { analysisSectionId: entry.analysisSectionId, startElementIndex: entry.startElementIndex }));
      continue;
    }
    const target = idTarget || indexTarget;
    if (!result[target.analysisSectionId]) result[target.analysisSectionId] = [];
    result[target.analysisSectionId].push(entry);
  }
  return result;
}
function sectionOverride(entries, key, code, diagnostics, authority, reference) {
  const candidates = (entries || []).filter((item) => supplied(item, key));
  if (!candidates.length) return null;
  const values = candidates.map((item) => positive(item[key]));
  if (values.some((value) => value == null)) return invalidQuantity(
    candidates.find((item) => positive(item[key]) == null)?.[key], code, key, diagnostics);
  const distinct = unique(values, (a, b) => a - b);
  if (distinct.length > 1) {
    diagnostics.push(diag('PIPELINE_DIAMETER_SOURCE_CONFLICT', 'Same-authority section evidence conflicts.',
      { field: key, values: distinct }));
    return source('CONFLICTING_EXPLICIT_SECTION', null, '', '');
  }
  const chosen = candidates.slice().sort((a, b) => compareText(JSON.stringify(a), JSON.stringify(b)))[0];
  return source('EXPLICIT_ANALYSIS_SECTION', distinct[0], chosen.sourceAuthority || authority, chosen.sourceReference || reference);
}
const branchEvidence = (branchInfo) => ['boreMm', 'diameter'].filter((key) => supplied(branchInfo, key)).map((key) => ({ key, raw: branchInfo[key] }));
function legacyOutside(section, property, branchInfo, settings, diagnostics, authority, reference) {
  const element = property[String(section.startElementIndex)]?.[0];
  const propertyPresent = supplied(element?.properties, 'diameter');
  const branch = branchEvidence(branchInfo), observed = propertyPresent || branch.length > 0;
  if (!observed) return { candidate: null, observed: false };
  const confirmed = settings?.diameterSource === 'branch-diameter' && settings?.diameterBasisConfirmed === true;
  if (!confirmed) {
    diagnostics.push(diag('PIPELINE_DIAMETER_BASIS_UNCONFIRMED',
      'Legacy Line/Branch/property diameter is not confirmed as physical outside diameter.',
      { analysisSectionId: section.analysisSectionId }));
    return { candidate: source('UNCONFIRMED_LEGACY_DIAMETER', null, authority, reference), observed: true };
  }
  if (propertyPresent) {
    const value = positive(element.properties.diameter);
    const candidate = value == null ? invalidQuantity(element.properties.diameter,
      'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'property diameter', diagnostics)
      : source('CONFIRMED_LEGACY_PROPERTY_DIAMETER', value,
        element.effectiveSources?.diameter || authority, `E${section.startElementIndex + 1}`);
    return { candidate, observed: true };
  }
  const values = branch.map((item) => positive(item.raw));
  if (values.some((value) => value == null)) return { candidate: invalidQuantity(
    branch.find((item) => positive(item.raw) == null)?.raw, 'PIPELINE_OUTSIDE_DIAMETER_INVALID',
    'legacy branch diameter', diagnostics), observed: true };
  const distinct = unique(values, (a, b) => a - b);
  if (distinct.length > 1) diagnostics.push(diag('PIPELINE_OUTSIDE_DIAMETER_CONFLICT',
    'Confirmed branch boreMm and diameter values conflict.', { values: distinct }));
  return { candidate: source(distinct.length > 1 ? 'CONFLICTING_LEGACY_DIAMETER'
    : 'CONFIRMED_LEGACY_BRANCH_DIAMETER', distinct.length === 1 ? distinct[0] : null, authority, reference),
  observed: true };
}
function outsideCandidate(section, entries, input, property, diagnostics) {
  const authority = text(input.sourceAuthority) || 'CALLER', reference = text(input.sourceReference);
  const explicit = sectionOverride(entries, 'outsideDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID',
    diagnostics, authority, reference);
  if (explicit) return { ...explicit, legacyObserved: false };
  const global = explicitCandidate(input, 'outsideDiameterMm', 'EXPLICIT_GLOBAL',
    'PIPELINE_OUTSIDE_DIAMETER_INVALID', diagnostics, authority, reference);
  if (global) return { ...global, legacyObserved: false };
  const settings = input.settings || {};
  if (settings.diameterSource === 'explicit-od') {
    const selected = explicitCandidate(settings, 'explicitOutsideDiameterMm', 'SETTINGS_EXPLICIT_OD',
      'PIPELINE_OUTSIDE_DIAMETER_INVALID', diagnostics, authority, reference)
      || invalidQuantity(settings.explicitOutsideDiameterMm, 'PIPELINE_OUTSIDE_DIAMETER_INVALID',
        'explicitOutsideDiameterMm', diagnostics);
    return { ...selected, legacyObserved: false };
  }
  if (text(settings.diameterSource) && !['branch-diameter', 'explicit-od'].includes(text(settings.diameterSource))) {
    diagnostics.push(diag('PIPELINE_DIAMETER_BASIS_INVALID', 'settings.diameterSource is not recognized.',
      { diameterSource: settings.diameterSource }));
    return { ...source('INVALID_DIAMETER_BASIS', null, authority, reference), legacyObserved: false };
  }
  const legacy = legacyOutside(section, property, input.branchInfo || {}, settings,
    diagnostics, authority, reference);
  return { ...(legacy.candidate || source('UNRESOLVED', null, authority, reference)), legacyObserved: legacy.observed };
}
function independentCandidate(entries, input, key, settingsKey, code, diagnostics) {
  const authority = text(input.sourceAuthority) || 'CALLER', reference = text(input.sourceReference);
  return sectionOverride(entries, key, code, diagnostics, authority, reference)
    || explicitCandidate(input, key, 'EXPLICIT_GLOBAL', code, diagnostics, authority, reference)
    || explicitCandidate(input.settings || {}, settingsKey, 'SETTINGS_SEMANTIC_INPUT', code,
      diagnostics, authority, reference) || source('UNRESOLVED', null, authority, reference);
}
function resolvedSourceKind(quantities) {
  const kinds = unique(Object.values(quantities).filter((item) => item.value != null)
    .map((item) => item.sourceKind));
  return kinds.length === 0 ? 'UNRESOLVED' : kinds.length === 1 ? kinds[0] : 'MIXED_SEMANTIC_SOURCES';
}
function propertyDiagnostics(section, analysis, property, outside, settings, diagnostics) {
  const confirmed = settings?.diameterSource === 'branch-diameter' && settings?.diameterBasisConfirmed === true;
  if (!confirmed) return;
  const elements = (analysis.elementResolutions || []).filter((item) => item.analysisSectionId === section.analysisSectionId);
  let previous = null;
  for (const item of elements) {
    const value = positive(property[String(item.elementIndex)]?.[0]?.properties?.diameter);
    if (value == null) continue;
    if (previous != null && value !== previous) diagnostics.push(diag(
      'PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION',
      'A confirmed physical diameter change must coincide with an analysis-section start.',
      { elementIndex: item.elementIndex, elementId: item.elementId, analysisSectionId: section.analysisSectionId }));
    if (outside.value != null && value !== outside.value) diagnostics.push(diag(
      'PIPELINE_DIAMETER_PROPERTY_MISMATCH', 'Confirmed property diameter differs from resolved outside diameter.',
      { elementIndex: item.elementIndex, propertyDiameterMm: value, outsideDiameterMm: outside.value }));
    previous = value;
  }
}
function resolvedSection(section, entries, input, analysis, property, planDiagnostics) {
  const diagnostics = [];
  const outside = outsideCandidate(section, entries, input, property, diagnostics);
  const nps = independentCandidate(entries, input, 'nominalPipeSizeNps', 'nominalPipeSizeNps',
    'PIPELINE_NPS_INVALID', diagnostics);
  const vendor = independentCandidate(entries, input, 'greVendorNominalBoreMm', 'greNominalBoreMm',
    'PIPELINE_GRE_VENDOR_BORE_INVALID', diagnostics);
  const profile = getPipelineEngineeringProfile(section.profileId), mode = profile?.resolvedMode || '';
  if (mode !== 'GRE' && outside.value == null) diagnostics.push(diag(
    'PIPELINE_OUTSIDE_DIAMETER_REQUIRED', 'Metallic analysis sections require physical outside diameter.',
    { analysisSectionId: section.analysisSectionId }));
  if (mode === 'GRE' && vendor.value == null) diagnostics.push(diag(
    'PIPELINE_GRE_VENDOR_BORE_REQUIRED', 'GRE analysis sections require vendor nominal-bore evidence.',
    { analysisSectionId: section.analysisSectionId }));
  if (mode !== 'GRE' && vendor.value != null) diagnostics.push(diag(
    'PIPELINE_DIAMETER_PROFILE_INCOMPATIBLE', 'GRE vendor nominal bore is incompatible with a metallic profile.',
    { analysisSectionId: section.analysisSectionId, profileId: section.profileId }));
  propertyDiagnostics(section, analysis, property, outside, input.settings || {}, diagnostics);
  const quantities = { outsideDiameterMm: { ...outside, basisId: PIPELINE_DIAMETER_BASIS_IDS.OUTSIDE_DIAMETER_MM },
    nominalPipeSizeNps: { ...nps, basisId: PIPELINE_DIAMETER_BASIS_IDS.NOMINAL_PIPE_SIZE_NPS },
    greVendorNominalBoreMm: { ...vendor, basisId: PIPELINE_DIAMETER_BASIS_IDS.GRE_VENDOR_NOMINAL_BORE_MM } };
  const authoritySource = [outside, nps, vendor].find((item) => item.value != null) || outside;
  planDiagnostics.push(...diagnostics);
  return createPipelineAnalysisDiameterResolution({ analysisSectionId: section.analysisSectionId,
    profileId: section.profileId, resolvedMode: mode, startElementIndex: section.startElementIndex,
    outsideDiameterMm: outside.value, nominalPipeSizeNps: nps.value, greVendorNominalBoreMm: vendor.value,
    caesarDiameterMm: outside.value, sourceKind: resolvedSourceKind(quantities),
    sourceAuthority: authoritySource.sourceAuthority, sourceReference: authoritySource.sourceReference,
    quantitySources: quantities, diagnostics });
}
function elementRecords(analysis, sections, property, diagnostics) {
  const bySection = Object.fromEntries(sections.map((item) => [item.analysisSectionId, item]));
  return (analysis.elementResolutions || []).slice().sort((a, b) => a.elementIndex - b.elementIndex).map((item) => {
    const section = bySection[item.analysisSectionId], matches = property[String(item.elementIndex)] || [];
    if (!section || matches.length !== 1) diagnostics.push(diag('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID',
      'Every analysis element requires exactly one section and property resolution.', { elementIndex: item.elementIndex }));
    return createPipelineElementDiameterResolution({ elementIndex: item.elementIndex, elementId: item.elementId,
      analysisSectionId: item.analysisSectionId, profileId: item.profileId,
      outsideDiameterMm: section?.outsideDiameterMm, nominalPipeSizeNps: section?.nominalPipeSizeNps,
      greVendorNominalBoreMm: section?.greVendorNominalBoreMm, caesarDiameterMm: section?.caesarDiameterMm,
      propertyDiameterMm: positive(matches[0]?.properties?.diameter), diameterDisposition: item.sectionDisposition,
      sourceKind: section?.sourceKind, diagnostics: section?.diagnostics || [] });
  });
}
export function resolvePipelineAnalysisDiameterPlan(input = {}) {
  const diagnostics = []; let sourceInput;
  try { sourceInput = cloneJson(input); } catch {
    sourceInput = {}; diagnostics.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', 'Resolver input is not JSON-safe plain data.'));
  }
  const analysis = sourceInput.analysisSectionPlan || {}, sections = canonicalSections(analysis, diagnostics);
  const propertyPlan = selectedPropertyPlan(sourceInput, diagnostics);
  const property = propertyIndex(propertyPlan, analysis, diagnostics);
  const targets = diameterTargets(sourceInput.diameterSections, sections, diagnostics);
  const sectionResolutions = sections.map((section) => resolvedSection(section,
    targets[section.analysisSectionId] || [], sourceInput, analysis, property, diagnostics));
  const elementResolutions = elementRecords(analysis, sectionResolutions, property, diagnostics);
  const migration = createPipelineDiameterMigration({
    outsideDiameterSourceKinds: sectionResolutions.map((item) => item.quantitySources.outsideDiameterMm.sourceKind),
    nominalPipeSizeSourceKinds: sectionResolutions.map((item) => item.quantitySources.nominalPipeSizeNps.sourceKind),
    greVendorNominalBoreSourceKinds: sectionResolutions.map((item) => item.quantitySources.greVendorNominalBoreMm.sourceKind),
    legacyDiameterEvidenceObserved: sectionResolutions.some((item) => item.quantitySources.outsideDiameterMm.legacyObserved === true),
    legacyDiameterBasisConfirmed: sourceInput.settings?.diameterSource === 'branch-diameter'
      && sourceInput.settings?.diameterBasisConfirmed === true,
    sourceAuthority: sourceInput.sourceAuthority, sourceReference: sourceInput.sourceReference,
  });
  return createPipelineAnalysisDiameterPlan({ analysisSectionPlanSchema: analysis.schema,
    propertySectionPlanSchema: propertyPlan.schema, migration, sectionResolutions, elementResolutions,
    diagnostics, blockerCodes: diagnostics.map((item) => item.code) });
}
export const buildPipelineAnalysisDiameterPlanJson = (plan) => JSON.stringify(plan, null, 2);
const cell = (value) => value == null ? '' : String(value).replace(/[\t\r\n]/g, ' ');
export function buildPipelineAnalysisDiameterLedgerText(plan) {
  const header = ['RecordType', 'Schema', 'AnalysisSectionId', 'ElementIndex', 'ElementId', 'ProfileId', 'OutsideDiameterMm',
    'NominalPipeSizeNps', 'GreVendorNominalBoreMm', 'CaesarDiameterMm', 'PropertyDiameterMm', 'Disposition', 'SourceKind', 'Ready'];
  const sections = (plan?.sectionResolutions || []).map((item) => ['SECTION', item.schema, item.analysisSectionId,
    item.startElementIndex, '', item.profileId, item.outsideDiameterMm, item.nominalPipeSizeNps,
    item.greVendorNominalBoreMm, item.caesarDiameterMm, '', 'SECTION_START', item.sourceKind, item.ready ? 'YES' : 'NO']);
  const elements = (plan?.elementResolutions || []).map((item) => ['ELEMENT', item.schema, item.analysisSectionId,
    item.elementIndex, item.elementId, item.profileId, item.outsideDiameterMm, item.nominalPipeSizeNps,
    item.greVendorNominalBoreMm, item.caesarDiameterMm, item.propertyDiameterMm, item.diameterDisposition,
    item.sourceKind, item.ready ? 'YES' : 'NO']);
  return [header, ...sections, ...elements].map((row) => row.map(cell).join('\t')).join('\n');
}
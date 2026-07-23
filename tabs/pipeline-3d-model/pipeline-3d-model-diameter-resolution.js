import { getPipelineEngineeringProfile as profile } from './pipeline-3d-model-engineering-profile-registry.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA as AS_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import { PIPELINE_DIAMETER_BASIS_IDS as BASIS, PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA as PS_SCHEMA,
  createPipelineAnalysisDiameterPlan as planContract, createPipelineAnalysisDiameterResolution as sectionContract,
  createPipelineDiameterMigration as migrationContract, createPipelineElementDiameterResolution as elementContract,
  parsePipelinePositiveScalar as scalar } from './pipeline-3d-model-diameter-contracts.js';

const RESEED = 'PipelineAnalysisPropertyReseedPlan.v1';
const txt = (v) => String(v ?? '').trim();
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const obj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
function copy(v) {
  if (v === undefined) return null;
  if (v === null || ['string', 'boolean'].includes(typeof v)) return v;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.map(copy);
  if (!obj(v)) throw new TypeError('JSON-safe plain data required.');
  return Object.fromEntries(Object.keys(v).sort(cmp).map((k) => [k, copy(v[k])]));
}
const diag = (code, details = {}) => ({ severity: 'BLOCKING', code, message: code, details: copy(details) });
const has = (v, k) => obj(v) && Object.hasOwn(v, k) && v[k] != null
  && !(typeof v[k] === 'string' && !txt(v[k]));
const ev = (sourceKind, value, sourceAuthority = '', sourceReference = '') => ({
  sourceKind, value, sourceAuthority: txt(sourceAuthority), sourceReference: txt(sourceReference),
});
function uniq(values, sort = cmp) {
  const found = Object.create(null);
  values.forEach((v) => { found[`${typeof v}:${String(v)}`] = v; });
  return Object.values(found).sort(sort);
}
function bad(raw, code, field, ds) {
  ds.push(diag(code, { field, value: raw }));
  return ev('INVALID_EXPLICIT_SOURCE', null);
}
function explicit(owner, key, kind, code, ds, authority, reference) {
  if (!has(owner, key)) return null;
  const value = scalar(owner[key]);
  return value == null ? bad(owner[key], code, key, ds)
    : ev(kind, value, owner.sourceAuthority || authority, owner.sourceReference || reference);
}
function analysis(value, ds) {
  if (!obj(value) || value.schema !== AS_SCHEMA || value.ready !== true
    || !Array.isArray(value.sections) || !Array.isArray(value.elementResolutions)) {
    ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { source: 'analysisSectionPlan' }));
    return { schema: txt(value?.schema), sections: [], elementResolutions: [], ready: false };
  }
  const sections = value.sections.filter((v, i) => {
    if (obj(v)) return true;
    ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { sectionIndex: i })); return false;
  }).sort((a, b) => Number(a.startElementIndex) - Number(b.startElementIndex)
    || cmp(txt(a.analysisSectionId), txt(b.analysisSectionId)));
  const elements = value.elementResolutions.filter((v, i) => {
    if (obj(v)) return true;
    ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { elementEntryIndex: i })); return false;
  });
  const ids = Object.create(null), starts = Object.create(null), indexes = Object.create(null);
  sections.forEach((s) => {
    if (!/^AS[1-9]\d*$/.test(txt(s.analysisSectionId)) || !Number.isInteger(s.startElementIndex)
      || s.startElementIndex < 0 || !profile(txt(s.profileId)) || ids[s.analysisSectionId] || starts[s.startElementIndex]) {
      ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { analysisSectionId: s.analysisSectionId }));
    }
    ids[s.analysisSectionId] = true; starts[s.startElementIndex] = true;
  });
  elements.forEach((e) => {
    const p = profile(txt(e.profileId));
    if (!Number.isInteger(e.elementIndex) || e.elementIndex < 0 || !/^E[1-9]\d*$/.test(txt(e.elementId))
      || !/^AS[1-9]\d*$/.test(txt(e.analysisSectionId)) || !p
      || txt(e.resolvedMode) !== p?.resolvedMode || indexes[e.elementIndex]) {
      ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { elementIndex: e.elementIndex }));
    }
    indexes[e.elementIndex] = true;
  });
  return { ...value, sections, elementResolutions: elements };
}
const validProperty = (v) => obj(v) && v.schema === PS_SCHEMA && v.ready === true
  && Array.isArray(v.elements) && v.elements.every(obj);
const propertyKey = (p) => p.elements.map((e) => [e.elementIndex, e.elementId, e.sectionId, e.properties?.diameter]);
function properties(input, ds) {
  const direct = input.propertySectionPlan, reseed = input.analysisPropertyReseedPlan;
  const directOk = direct !== undefined && validProperty(direct);
  if (direct !== undefined && !directOk) ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { source: 'propertySectionPlan' }));
  let derived = null;
  if (reseed !== undefined) {
    if (!obj(reseed) || reseed.schema !== RESEED || reseed.ready !== true || !validProperty(reseed.propertySectionPlan)) {
      ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { source: 'analysisPropertyReseedPlan' }));
    } else derived = reseed.propertySectionPlan;
  }
  if (directOk && derived && JSON.stringify(propertyKey(direct)) !== JSON.stringify(propertyKey(derived))) {
    ds.push(diag('PIPELINE_DIAMETER_SOURCE_CONFLICT'));
  }
  return derived || (directOk ? direct : { schema: txt(direct?.schema), ready: false, elements: [] });
}
function propertyMap(p, a, ds) {
  const map = Object.create(null);
  p.elements.forEach((e) => { const k = String(e.elementIndex); (map[k] ||= []).push(e); });
  a.elementResolutions.forEach((e) => {
    const m = map[String(e.elementIndex)] || [];
    if (m.length !== 1 || txt(m[0]?.elementId) !== txt(e.elementId)) {
      ds.push(diag('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', { elementIndex: e.elementIndex }));
    }
  });
  if (p.elements.length !== a.elementResolutions.length) ds.push(diag('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID'));
  return map;
}
function targetMap(entries, sections, ds) {
  const out = Object.create(null), ids = Object.fromEntries(sections.map((s) => [s.analysisSectionId, s]));
  const starts = Object.fromEntries(sections.map((s) => [String(s.startElementIndex), s]));
  if (entries !== undefined && !Array.isArray(entries)) ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { source: 'diameterSections' }));
  (Array.isArray(entries) ? entries : []).forEach((e, i) => {
    if (!obj(e)) { ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { diameterEntryIndex: i })); return; }
    const byId = txt(e.analysisSectionId) ? ids[txt(e.analysisSectionId)] : null;
    const byStart = Number.isInteger(e.startElementIndex) ? starts[String(e.startElementIndex)] : null;
    if ((byId && byStart && byId !== byStart) || (!byId && !byStart)) {
      ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID', { diameterEntryIndex: i })); return;
    }
    const section = byId || byStart;
    (out[section.analysisSectionId] ||= []).push(e);
  });
  return out;
}
function sectionValue(entries, key, code, ds, authority, reference) {
  const candidates = entries.filter((e) => has(e, key));
  if (!candidates.length) return null;
  const values = candidates.map((e) => scalar(e[key]));
  if (values.some((v) => v == null)) return bad(candidates.find((e) => scalar(e[key]) == null)?.[key], code, key, ds);
  const distinct = uniq(values, (a, b) => a - b);
  if (distinct.length > 1) { ds.push(diag('PIPELINE_DIAMETER_SOURCE_CONFLICT', { field: key, values: distinct })); return ev('CONFLICTING_EXPLICIT_SECTION', null); }
  const chosen = candidates.slice().sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b)))[0];
  return ev('EXPLICIT_ANALYSIS_SECTION', distinct[0], chosen.sourceAuthority || authority, chosen.sourceReference || reference);
}
function legacy(section, map, input, ds, authority, reference) {
  const element = map[String(section.startElementIndex)]?.[0];
  const propertyPresent = has(element?.properties, 'diameter');
  const branch = ['boreMm', 'diameter'].filter((k) => has(input.branchInfo, k)).map((k) => input.branchInfo[k]);
  if (!propertyPresent && !branch.length) return { candidate: null, observed: false };
  if (input.settings?.diameterSource !== 'branch-diameter' || input.settings?.diameterBasisConfirmed !== true) {
    ds.push(diag('PIPELINE_DIAMETER_BASIS_UNCONFIRMED', { analysisSectionId: section.analysisSectionId }));
    return { candidate: ev('UNCONFIRMED_LEGACY_DIAMETER', null, authority, reference), observed: true };
  }
  if (propertyPresent) {
    const value = scalar(element.properties.diameter);
    return { candidate: value == null ? bad(element.properties.diameter, 'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'propertyDiameter', ds)
      : ev('CONFIRMED_LEGACY_PROPERTY_DIAMETER', value, element.effectiveSources?.diameter || authority,
        `E${section.startElementIndex + 1}`), observed: true };
  }
  const values = branch.map(scalar);
  if (values.some((v) => v == null)) return { candidate: bad(branch.find((v) => scalar(v) == null),
    'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'branchDiameter', ds), observed: true };
  const distinct = uniq(values, (a, b) => a - b);
  if (distinct.length > 1) ds.push(diag('PIPELINE_OUTSIDE_DIAMETER_CONFLICT', { values: distinct }));
  return { candidate: ev(distinct.length > 1 ? 'CONFLICTING_LEGACY_DIAMETER'
    : 'CONFIRMED_LEGACY_BRANCH_DIAMETER', distinct.length === 1 ? distinct[0] : null, authority, reference), observed: true };
}
function outside(section, entries, input, map, ds) {
  const authority = txt(input.sourceAuthority) || 'CALLER', reference = txt(input.sourceReference);
  const local = sectionValue(entries, 'outsideDiameterMm', 'PIPELINE_OUTSIDE_DIAMETER_INVALID', ds, authority, reference);
  if (local) return { ...local, legacyObserved: false };
  const global = explicit(input, 'outsideDiameterMm', 'EXPLICIT_GLOBAL', 'PIPELINE_OUTSIDE_DIAMETER_INVALID', ds, authority, reference);
  if (global) return { ...global, legacyObserved: false };
  const settings = obj(input.settings) ? input.settings : {};
  if (settings.diameterSource === 'explicit-od') {
    const selected = explicit(settings, 'explicitOutsideDiameterMm', 'SETTINGS_EXPLICIT_OD',
      'PIPELINE_OUTSIDE_DIAMETER_INVALID', ds, authority, reference)
      || bad(settings.explicitOutsideDiameterMm, 'PIPELINE_OUTSIDE_DIAMETER_INVALID', 'explicitOutsideDiameterMm', ds);
    return { ...selected, legacyObserved: false };
  }
  if (txt(settings.diameterSource) && !['branch-diameter', 'explicit-od'].includes(txt(settings.diameterSource))) {
    ds.push(diag('PIPELINE_DIAMETER_BASIS_INVALID', { diameterSource: settings.diameterSource }));
    return { ...ev('INVALID_DIAMETER_BASIS', null, authority, reference), legacyObserved: false };
  }
  const found = legacy(section, map, { ...input, settings, branchInfo: obj(input.branchInfo) ? input.branchInfo : {} }, ds, authority, reference);
  return { ...(found.candidate || ev('UNRESOLVED', null, authority, reference)), legacyObserved: found.observed };
}
function independent(entries, input, key, settingsKey, code, ds) {
  const authority = txt(input.sourceAuthority) || 'CALLER', reference = txt(input.sourceReference);
  return sectionValue(entries, key, code, ds, authority, reference)
    || explicit(input, key, 'EXPLICIT_GLOBAL', code, ds, authority, reference)
    || explicit(obj(input.settings) ? input.settings : {}, settingsKey, 'SETTINGS_SEMANTIC_INPUT', code, ds, authority, reference)
    || ev('UNRESOLVED', null, authority, reference);
}
function propertyChecks(section, a, map, od, settings, ds) {
  if (settings?.diameterSource !== 'branch-diameter' || settings?.diameterBasisConfirmed !== true) return;
  let previous = null;
  a.elementResolutions.filter((e) => e.analysisSectionId === section.analysisSectionId).forEach((e) => {
    const value = scalar(map[String(e.elementIndex)]?.[0]?.properties?.diameter);
    if (value == null) return;
    if (previous != null && value !== previous) ds.push(diag('PIPELINE_DIAMETER_CHANGE_REQUIRES_ANALYSIS_SECTION', { elementIndex: e.elementIndex }));
    if (od != null && value !== od) ds.push(diag('PIPELINE_DIAMETER_PROPERTY_MISMATCH', { elementIndex: e.elementIndex, propertyDiameterMm: value, outsideDiameterMm: od }));
    previous = value;
  });
}
function resolveSection(section, entries, input, a, map, all) {
  const ds = [], od = outside(section, entries, input, map, ds);
  const nps = independent(entries, input, 'nominalPipeSizeNps', 'nominalPipeSizeNps', 'PIPELINE_NPS_INVALID', ds);
  const vendor = independent(entries, input, 'greVendorNominalBoreMm', 'greNominalBoreMm', 'PIPELINE_GRE_VENDOR_BORE_INVALID', ds);
  propertyChecks(section, a, map, od.value, obj(input.settings) ? input.settings : {}, ds);
  const sources = {
    outsideDiameterMm: { ...od, basisId: BASIS.OUTSIDE_DIAMETER_MM },
    nominalPipeSizeNps: { ...nps, basisId: BASIS.NOMINAL_PIPE_SIZE_NPS },
    greVendorNominalBoreMm: { ...vendor, basisId: BASIS.GRE_VENDOR_NOMINAL_BORE_MM },
  };
  const kinds = uniq(Object.values(sources).filter((v) => v.value != null).map((v) => v.sourceKind));
  const authority = [od, nps, vendor].find((v) => v.value != null) || od;
  all.push(...ds);
  return sectionContract({ analysisSectionId: section.analysisSectionId, profileId: section.profileId,
    resolvedMode: profile(section.profileId)?.resolvedMode || '', startElementIndex: section.startElementIndex,
    outsideDiameterMm: od.value, nominalPipeSizeNps: nps.value, greVendorNominalBoreMm: vendor.value,
    caesarDiameterMm: od.value, sourceKind: kinds.length === 0 ? 'UNRESOLVED'
      : kinds.length === 1 ? kinds[0] : 'MIXED_SEMANTIC_SOURCES',
    sourceAuthority: authority.sourceAuthority, sourceReference: authority.sourceReference,
    quantitySources: sources, diagnostics: ds });
}
function resolveElements(a, sections, map, ds) {
  const bySection = Object.fromEntries(sections.map((s) => [s.analysisSectionId, s]));
  return a.elementResolutions.slice().sort((x, y) => x.elementIndex - y.elementIndex).map((e) => {
    const section = bySection[e.analysisSectionId], properties = map[String(e.elementIndex)] || [];
    if (!section || properties.length !== 1) ds.push(diag('PIPELINE_DIAMETER_SECTION_COVERAGE_INVALID', { elementIndex: e.elementIndex }));
    return elementContract({ elementIndex: e.elementIndex, elementId: e.elementId,
      analysisSectionId: e.analysisSectionId, profileId: e.profileId,
      outsideDiameterMm: section?.outsideDiameterMm, nominalPipeSizeNps: section?.nominalPipeSizeNps,
      greVendorNominalBoreMm: section?.greVendorNominalBoreMm, caesarDiameterMm: section?.caesarDiameterMm,
      propertyDiameterMm: scalar(properties[0]?.properties?.diameter), diameterDisposition: e.sectionDisposition,
      sourceKind: section?.sourceKind, diagnostics: section?.diagnostics || [] });
  });
}
export function resolvePipelineAnalysisDiameterPlan(input = {}) {
  const ds = []; let source;
  try { source = copy(input); if (!obj(source)) throw new TypeError(); }
  catch { source = {}; ds.push(diag('PIPELINE_DIAMETER_INPUT_INVALID')); }
  const a = analysis(source.analysisSectionPlan, ds), p = properties(source, ds), map = propertyMap(p, a, ds);
  const t = targetMap(source.diameterSections, a.sections, ds);
  const sections = a.sections.map((s) => resolveSection(s, t[s.analysisSectionId] || [], source, a, map, ds));
  const elements = resolveElements(a, sections, map, ds);
  const migration = migrationContract({
    outsideDiameterSourceKinds: sections.map((s) => s.quantitySources.outsideDiameterMm?.sourceKind),
    nominalPipeSizeSourceKinds: sections.map((s) => s.quantitySources.nominalPipeSizeNps?.sourceKind),
    greVendorNominalBoreSourceKinds: sections.map((s) => s.quantitySources.greVendorNominalBoreMm?.sourceKind),
    legacyDiameterEvidenceObserved: sections.some((s) => s.quantitySources.outsideDiameterMm?.legacyObserved === true),
    legacyDiameterBasisConfirmed: source.settings?.diameterSource === 'branch-diameter'
      && source.settings?.diameterBasisConfirmed === true,
    sourceAuthority: source.sourceAuthority, sourceReference: source.sourceReference,
  });
  return planContract({ analysisSectionPlanSchema: a.schema, propertySectionPlanSchema: p.schema,
    migration, sectionResolutions: sections, elementResolutions: elements,
    diagnostics: ds, blockerCodes: ds.map((d) => d.code) });
}
export const buildPipelineAnalysisDiameterPlanJson = (plan) => JSON.stringify(plan, null, 2);
const cell = (v) => v == null ? '' : String(v).replace(/[\t\r\n]/g, ' ');
export function buildPipelineAnalysisDiameterLedgerText(plan) {
  const header = ['RecordType', 'Schema', 'AnalysisSectionId', 'ElementIndex', 'ElementId', 'ProfileId',
    'OutsideDiameterMm', 'NominalPipeSizeNps', 'GreVendorNominalBoreMm', 'CaesarDiameterMm',
    'PropertyDiameterMm', 'Disposition', 'SourceKind', 'Ready'];
  const sections = (plan?.sectionResolutions || []).map((s) => ['SECTION', s.schema,
    s.analysisSectionId, s.startElementIndex, '', s.profileId, s.outsideDiameterMm,
    s.nominalPipeSizeNps, s.greVendorNominalBoreMm, s.caesarDiameterMm, '',
    'SECTION_START', s.sourceKind, s.ready ? 'YES' : 'NO']);
  const elements = (plan?.elementResolutions || []).map((e) => ['ELEMENT', e.schema,
    e.analysisSectionId, e.elementIndex, e.elementId, e.profileId, e.outsideDiameterMm,
    e.nominalPipeSizeNps, e.greVendorNominalBoreMm, e.caesarDiameterMm,
    e.propertyDiameterMm, e.diameterDisposition, e.sourceKind, e.ready ? 'YES' : 'NO']);
  return [header, ...sections, ...elements].map((row) => row.map(cell).join('\t')).join('\n');
}

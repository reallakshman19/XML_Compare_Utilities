export const PIPELINE_ANALYSIS_SECTION_RESOLUTION_SCHEMA = 'PipelineAnalysisSectionResolution.v1';
const PLAN_SCHEMA = 'PipelineAnalysisSectionPlan.v1';
const SECTION_SCHEMA = 'PipelineAnalysisSection.v1';
const ELEMENT_SCHEMA = 'PipelineElementSectionResolution.v1';
const PROFILES = Object.freeze({ 'normal-metallic': 'NORMAL', 'asme-b31.4': 'ASME_B31_4', gre: 'GRE' });
const LEGACY = Object.freeze({ 'default-metallic': 'normal-metallic', 'asme-b31.4': 'asme-b31.4', gre: 'gre' });
const ORDER = Object.freeze([
  'PIPELINE_PROFILE_ID_INVALID', 'PIPELINE_LEGACY_PROFILE_INVALID',
  'PIPELINE_SECTION_PROFILE_CONFLICT', 'PIPELINE_LEGACY_PROFILE_FALLBACK_BLOCKED',
  'PIPELINE_ANALYSIS_SECTION_ELEMENT_REQUIRED', 'PIPELINE_ANALYSIS_SECTION_FIRST_BOUNDARY_REQUIRED',
  'PIPELINE_ANALYSIS_SECTION_START_OUT_OF_RANGE', 'PIPELINE_ANALYSIS_SECTION_DUPLICATE_BOUNDARY',
  'PIPELINE_ANALYSIS_SECTION_NO_CHANGE', 'PIPELINE_ANALYSIS_SECTION_ID_INVALID',
  'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
  'PIPELINE_PROFILE_BOUNDARY_INTERSECTS_FITTING', 'PIPELINE_ELEMENT_SECTION_COVERAGE_INVALID',
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
  if (!plain(value)) throw new TypeError('Planner input must be JSON-safe plain data.');
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
function rank(code) {
  const index = ORDER.indexOf(code);
  return index < 0 ? ORDER.length : index;
}
function orderedDiagnostics(values) {
  const keyed = Object.create(null);
  values.forEach((item) => { keyed[`${item.code}:${JSON.stringify(item.details)}`] = item; });
  return Object.freeze(Object.values(keyed).sort((left, right) => rank(left.code) - rank(right.code)
    || compareText(left.code, right.code) || compareText(JSON.stringify(left.details), JSON.stringify(right.details))));
}
function orderedCodes(diagnostics) {
  const keyed = Object.create(null);
  diagnostics.forEach((item) => { keyed[item.code] = true; });
  return Object.freeze(Object.keys(keyed).sort((left, right) => rank(left) - rank(right) || compareText(left, right)));
}
function profile(profileId) {
  const id = text(profileId);
  return PROFILES[id] ? { profileId: id, resolvedMode: PROFILES[id] } : null;
}
function currentLegacyBasis(input) {
  if (text(input.legacyDesignBasis)) return text(input.legacyDesignBasis);
  const current = input.exportContext?.profile || {};
  if (text(current.requestedDesignBasis)) return text(current.requestedDesignBasis);
  return current.fallbackApplied === false ? text(current.resolvedDesignBasis) : '';
}
function explicitGlobalId(input) {
  const current = input.exportContext?.profile || {};
  return text(input.profileId) || (current.fallbackApplied === false ? text(current.resolvedProfileId) : '');
}
function resolveGlobal(input, diagnostics) {
  const requestedProfileId = explicitGlobalId(input);
  const legacyDesignBasis = currentLegacyBasis(input);
  const explicit = requestedProfileId ? profile(requestedProfileId) : null;
  const legacyId = LEGACY[legacyDesignBasis] || '';
  const legacy = legacyId ? profile(legacyId) : null;
  if (requestedProfileId && !explicit) diagnostics.push(diagnostic(
    'PIPELINE_PROFILE_ID_INVALID', 'Explicit profile ID is not registered.', { requestedProfileId }));
  if (legacyDesignBasis && !legacy) diagnostics.push(diagnostic(
    'PIPELINE_LEGACY_PROFILE_INVALID', 'Legacy design basis cannot be migrated.', { legacyDesignBasis }));
  if (explicit && legacy && explicit.profileId !== legacy.profileId) diagnostics.push(diagnostic(
    'PIPELINE_SECTION_PROFILE_CONFLICT', 'Explicit and legacy global profiles conflict.',
    { explicitProfileId: explicit.profileId, legacyProfileId: legacy.profileId }));
  const resolved = explicit || legacy;
  const legacyMode = text(input.legacyResolvedMode);
  if (legacyMode && resolved && legacyMode !== resolved.resolvedMode) diagnostics.push(diagnostic(
    'PIPELINE_LEGACY_PROFILE_INVALID', 'Legacy resolved mode conflicts with canonical mode.',
    { legacyResolvedMode: legacyMode, expectedMode: resolved.resolvedMode }));
  return { requestedProfileId, legacyDesignBasis, resolved, explicit: Boolean(explicit) };
}
function migration(fields) {
  return deepFreeze({
    sourceKind: text(fields.sourceKind) || 'UNRESOLVED', requestedProfileId: text(fields.requestedProfileId),
    legacyDesignBasis: text(fields.legacyDesignBasis), resolvedProfileId: text(fields.resolvedProfileId),
    resolvedMode: text(fields.resolvedMode), fallbackEligible: fields.fallbackEligible === true,
    fallbackApplied: fields.fallbackApplied === true, resolutionReason: text(fields.resolutionReason),
    sourceAuthority: text(fields.sourceAuthority), sourceReference: text(fields.sourceReference),
  });
}
function explicitSeeds(input, authority, reference) {
  return input.analysisSections.map((item) => ({ sourceAuthority: authority, sourceReference: reference, ...cloneJson(item) })).sort((left, right) =>
    Number(left.startElementIndex) - Number(right.startElementIndex)
    || compareText(text(left.profileId), text(right.profileId))
    || compareText(JSON.stringify(left), JSON.stringify(right)));
}
function resolveSources(input, diagnostics) {
  const authority = text(input.sourceAuthority) || 'CALLER';
  const reference = text(input.sourceReference);
  const global = resolveGlobal(input, diagnostics);
  if (Array.isArray(input.analysisSections) && input.analysisSections.length) {
    const seeds = explicitSeeds(input, authority, reference);
    const first = profile(seeds[0]?.profileId);
    return { seeds, global, migration: migration({ sourceKind: 'EXPLICIT_SECTIONS',
      requestedProfileId: text(seeds[0]?.profileId), legacyDesignBasis: global.legacyDesignBasis,
      resolvedProfileId: first?.profileId, resolvedMode: first?.resolvedMode,
      resolutionReason: 'EXPLICIT_ANALYSIS_SECTIONS_RESOLVED', sourceAuthority: authority, sourceReference: reference }) };
  }
  if (global.resolved) {
    const sourceKind = global.explicit ? 'EXPLICIT_PROFILE' : 'LEGACY_DESIGN_BASIS';
    return { seeds: [{ startElementIndex: 0, profileId: global.resolved.profileId, sourceAuthority: authority, sourceReference: reference, boundaryAuthority: 'PROFILE_SOURCE_MIGRATION' }], global,
      migration: migration({ sourceKind, requestedProfileId: global.requestedProfileId,
        legacyDesignBasis: global.legacyDesignBasis, resolvedProfileId: global.resolved.profileId,
        resolvedMode: global.resolved.resolvedMode,
        resolutionReason: global.explicit ? 'EXPLICIT_PROFILE_ID_RESOLVED' : 'LEGACY_DESIGN_BASIS_MIGRATED',
        sourceAuthority: authority, sourceReference: reference }) };
  }
  if (global.requestedProfileId || global.legacyDesignBasis) return { seeds: [], global,
    migration: migration({ sourceKind: 'UNRESOLVED', requestedProfileId: global.requestedProfileId,
      legacyDesignBasis: global.legacyDesignBasis, resolutionReason: 'PROFILE_SOURCE_INVALID',
      sourceAuthority: authority, sourceReference: reference }) };
  if (input.greEvidencePresent === true) {
    diagnostics.push(diagnostic('PIPELINE_LEGACY_PROFILE_FALLBACK_BLOCKED',
      'Safe Normal fallback is prohibited when GRE evidence is present.'));
    return { seeds: [], global, migration: migration({ sourceKind: 'UNRESOLVED',
      resolutionReason: 'LEGACY_PROFILE_NOT_SPECIFIED_GRE_EVIDENCE', sourceAuthority: authority,
      sourceReference: reference }) };
  }
  return { seeds: [{ startElementIndex: 0, profileId: 'normal-metallic', sourceAuthority: authority, sourceReference: reference, boundaryAuthority: 'SAFE_NORMAL_FALLBACK' }], global,
    migration: migration({ sourceKind: 'SAFE_NORMAL_FALLBACK', resolvedProfileId: 'normal-metallic',
      resolvedMode: 'NORMAL', fallbackEligible: true, fallbackApplied: true,
      resolutionReason: 'LEGACY_PROFILE_NOT_SPECIFIED_SAFE_NORMAL', sourceAuthority: authority,
      sourceReference: reference }) };
}
function activeFitting(candidate) {
  if (!plain(candidate) || candidate.status === 'DISABLED') return false;
  return ['EMITTED', 'READY_NOT_EMITTED'].includes(candidate.status)
    || candidate.geometryFits === true || Number(candidate.radiusMm) > 0;
}
function boundaryHitsFitting(index, boundaryNode, bendResolution) {
  if (index <= 0 || boundaryNode == null) return false;
  const incoming = index - 1;
  const emitted = bendResolution?.bendByIncomingElementIndex?.[incoming];
  if (plain(emitted) && emitted.status !== 'DISABLED' && text(emitted.cornerNode) === text(boundaryNode)) return true;
  const candidates = Array.isArray(bendResolution?.candidates) ? bendResolution.candidates : [];
  return candidates.some((item) => Number(item?.incomingElementIndex) === incoming
    && text(item?.cornerNode) === text(boundaryNode) && activeFitting(item));
}
function duplicateIndexes(seeds, diagnostics) {
  const counts = Object.create(null);
  seeds.forEach((item) => { const key = String(item.startElementIndex); counts[key] = (counts[key] || 0) + 1; });
  Object.keys(counts).sort(compareText).filter((key) => counts[key] > 1).forEach((key) => diagnostics.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_DUPLICATE_BOUNDARY', 'Analysis-section boundary index is duplicated.',
    { startElementIndex: Number(key), count: counts[key] })));
  return counts;
}
function normalizeSections(seeds, elementCount, rows, bendResolution, global, diagnostics) {
  const counts = duplicateIndexes(seeds, diagnostics);
  if (seeds.length && seeds[0].startElementIndex !== 0) diagnostics.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_FIRST_BOUNDARY_REQUIRED', 'First analysis section must start at element index 0.',
    { firstStartElementIndex: seeds[0].startElementIndex }));
  const accepted = [];
  for (const source of seeds) {
    const start = source.startElementIndex;
    if (!Number.isInteger(start) || start < 0 || start >= elementCount) {
      diagnostics.push(diagnostic('PIPELINE_ANALYSIS_SECTION_START_OUT_OF_RANGE',
        'Analysis-section boundary is outside the element range.', { startElementIndex: start, elementCount }));
      continue;
    }
    if (counts[String(start)] > 1 && accepted.some((item) => item.startElementIndex === start)) continue;
    const resolved = profile(source.profileId);
    if (!resolved) diagnostics.push(diagnostic('PIPELINE_PROFILE_ID_INVALID',
      'Section profile ID is not registered.', { profileId: text(source.profileId), startElementIndex: start }));
    const analysisSectionId = `AS${accepted.length + 1}`;
    if (text(source.analysisSectionId) && text(source.analysisSectionId) !== analysisSectionId) diagnostics.push(diagnostic(
      'PIPELINE_ANALYSIS_SECTION_ID_INVALID', 'Caller section ID contradicts deterministic identity.',
      { suppliedAnalysisSectionId: text(source.analysisSectionId), expectedAnalysisSectionId: analysisSectionId }));
    if (accepted.at(-1)?.profileId === resolved?.profileId) diagnostics.push(diagnostic(
      'PIPELINE_ANALYSIS_SECTION_NO_CHANGE', 'Adjacent sections cannot use the same profile.',
      { startElementIndex: start, profileId: resolved.profileId }));
    const boundaryNode = rows[start]?.nodeNumber ?? null;
    if (boundaryHitsFitting(start, boundaryNode, bendResolution)) diagnostics.push(diagnostic(
      'PIPELINE_PROFILE_BOUNDARY_INTERSECTS_FITTING', 'Boundary intersects an incoming-element fitting envelope.',
      { startElementIndex: start, boundaryNode, incomingElementIndex: start - 1 }));
    accepted.push({ analysisSectionId, startElementIndex: start, profileId: resolved?.profileId || text(source.profileId),
      resolvedMode: resolved?.resolvedMode || '', boundaryNode, source });
  }
  if (global.resolved && accepted[0] && global.resolved.profileId !== accepted[0].profileId) diagnostics.push(diagnostic(
    'PIPELINE_SECTION_PROFILE_CONFLICT', 'Global profile conflicts with first explicit section.',
    { globalProfileId: global.resolved.profileId, firstSectionProfileId: accepted[0].profileId }));
  return accepted;
}
function sectionContracts(items) {
  return Object.freeze(items.map((item) => deepFreeze({ schema: SECTION_SCHEMA,
    analysisSectionId: item.analysisSectionId, startElementIndex: item.startElementIndex,
    profileId: item.profileId, boundaryAuthority: text(item.source.boundaryAuthority) || 'EXPLICIT_START_ELEMENT_INDEX',
    boundarySourceReference: text(item.source.boundarySourceReference), sourceAuthority: text(item.source.sourceAuthority),
    sourceReference: text(item.source.sourceReference), status: item.resolvedMode ? 'PLANNED' : 'BLOCKED',
    diagnostics: Object.freeze([]), blockerCodes: Object.freeze([]) })));
}
function elementContracts(sections, elementCount, rows) {
  const result = [];
  for (let elementIndex = 0; elementIndex < elementCount; elementIndex += 1) {
    let owner = null;
    sections.forEach((section) => { if (section.startElementIndex <= elementIndex) owner = section; });
    if (!owner) continue;
    const isStart = owner.startElementIndex === elementIndex;
    result.push(deepFreeze({ schema: ELEMENT_SCHEMA, elementIndex, elementId: `E${elementIndex + 1}`,
      analysisSectionId: owner.analysisSectionId, profileId: owner.profileId, resolvedMode: owner.resolvedMode,
      sectionDisposition: isStart ? 'SECTION_START' : 'INHERITED',
      boundaryNode: isStart ? (rows[elementIndex]?.nodeNumber ?? null) : null,
      sourceAuthority: text(owner.source.sourceAuthority), sourceReference: text(owner.source.sourceReference),
      diagnostics: Object.freeze([]), blockerCodes: Object.freeze([]), ready: Boolean(owner.resolvedMode) }));
  }
  return Object.freeze(result);
}
function coverageError(elements, elementCount) {
  const seen = Object.create(null);
  elements.forEach((item) => { seen[item.elementIndex] = (seen[item.elementIndex] || 0) + 1; });
  const invalid = elements.length !== elementCount
    || elements.some((item) => item.elementIndex < 0 || item.elementIndex >= elementCount || seen[item.elementIndex] !== 1)
    || Array.from({ length: elementCount }, (_, index) => index).some((index) => !seen[index]);
  return invalid ? diagnostic('PIPELINE_ELEMENT_SECTION_COVERAGE_INVALID',
    'Every existing element must have exactly one section owner.', { elementCount, resolutionCount: elements.length }) : null;
}
export function resolvePipelineAnalysisSectionPlan(input = {}) {
  const diagnostics = [];
  let source;
  try { source = cloneJson(input); } catch {
    source = {};
    diagnostics.push(diagnostic('PIPELINE_ELEMENT_SECTION_COVERAGE_INVALID', 'Planner input is not JSON-safe plain data.'));
  }
  const rows = Array.isArray(source.coordinateRows) ? source.coordinateRows : [];
  const elementCount = Math.max(0, rows.length - 1);
  if (!elementCount) diagnostics.push(diagnostic('PIPELINE_ANALYSIS_SECTION_ELEMENT_REQUIRED',
    'At least one piping element is required.', { coordinateRowCount: rows.length }));
  if (source.analysisSections !== undefined && !Array.isArray(source.analysisSections)) diagnostics.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID', 'analysisSections must be an array when supplied.'));
  const resolved = resolveSources(source, diagnostics);
  const rawSections = normalizeSections(resolved.seeds, elementCount, rows, source.bendResolution, resolved.global, diagnostics);
  const sections = sectionContracts(rawSections);
  const elementResolutions = elementContracts(rawSections, elementCount, rows);
  const coverage = coverageError(elementResolutions, elementCount);
  if (coverage) diagnostics.push(coverage);
  const frozenDiagnostics = orderedDiagnostics(diagnostics);
  const blockerCodes = orderedCodes(frozenDiagnostics);
  const analysisSectionPlan = deepFreeze({ schema: PLAN_SCHEMA, sections, elementResolutions,
    diagnostics: frozenDiagnostics, blockerCodes, ready: blockerCodes.length === 0 });
  return deepFreeze({ schema: PIPELINE_ANALYSIS_SECTION_RESOLUTION_SCHEMA, migration: resolved.migration,
    analysisSectionPlan, diagnostics: frozenDiagnostics, blockerCodes, ready: analysisSectionPlan.ready });
}
export function buildPipelineAnalysisSectionResolutionJson(resolution) {
  return JSON.stringify(resolution, null, 2);
}
const cell = (value) => value == null ? '' : String(value).replace(/[\t\r\n]/g, ' ');
export function buildPipelineAnalysisSectionLedgerText(resolution) {
  const plan = resolution?.analysisSectionPlan || {};
  const header = ['RecordType', 'Schema', 'ElementIndex', 'ElementId', 'AnalysisSectionId',
    'StartElementIndex', 'ProfileId', 'ResolvedMode', 'Disposition', 'BoundaryNode'];
  const sections = (plan.sections || []).map((section) => ['SECTION', section.schema, '', '', section.analysisSectionId,
    section.startElementIndex, section.profileId, '', 'SECTION_START',
    (plan.elementResolutions || []).find((item) => item.analysisSectionId === section.analysisSectionId
      && item.sectionDisposition === 'SECTION_START')?.boundaryNode]);
  const elements = (plan.elementResolutions || []).map((item) => ['ELEMENT', item.schema, item.elementIndex,
    item.elementId, item.analysisSectionId, '', item.profileId, item.resolvedMode, item.sectionDisposition, item.boundaryNode]);
  return [header, ...sections, ...elements].map((row) => row.map(cell).join('\t')).join('\n');
}

import { PIPELINE_ENGINEERING_PROFILE_MODES } from './pipeline-3d-model-engineering-profile-registry.js';

export const PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA = 'PipelineAnalysisSectionPlan.v1';
export const PIPELINE_ANALYSIS_SECTION_SCHEMA = 'PipelineAnalysisSection.v1';
export const PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA = 'PipelineElementSectionResolution.v1';

const ALLOWED_MODES = Object.freeze(Object.values(PIPELINE_ENGINEERING_PROFILE_MODES));
const BLOCKER_ORDER = Object.freeze([
  'PIPELINE_PROFILE_ID_INVALID',
  'PIPELINE_ANALYSIS_SECTION_ID_INVALID',
  'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
  'PIPELINE_ELEMENT_SECTION_RESOLUTION_INVALID',
]);

function text(value) {
  return String(value ?? '').trim();
}

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  if (!plainObject(value)) throw new TypeError('Contract input must be JSON-safe plain data.');
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item)]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function diagnostic(code, message, details = {}) {
  return deepFreeze({ severity: 'BLOCKING', code, message, details: cloneJson(details) });
}

function blockerRank(code) {
  const index = BLOCKER_ORDER.indexOf(code);
  return index < 0 ? BLOCKER_ORDER.length : index;
}

function normalizeDiagnostics(items = []) {
  const result = [];
  for (const item of Array.isArray(items) ? items : []) {
    try {
      const source = cloneJson(item);
      if (plainObject(source) && text(source.code)) result.push(deepFreeze({
        severity: text(source.severity) || 'BLOCKING',
        code: text(source.code),
        message: text(source.message),
        details: deepFreeze(plainObject(source.details) ? source.details : {}),
      }));
    } catch { /* Invalid caller diagnostics are replaced by factory diagnostics. */ }
  }
  const keyed = Object.create(null);
  for (const item of result) keyed[`${item.code}:${JSON.stringify(item.details)}`] = item;
  return Object.freeze(Object.values(keyed).sort((left, right) =>
    blockerRank(left.code) - blockerRank(right.code)
    || compareText(left.code, right.code)
    || compareText(JSON.stringify(left.details), JSON.stringify(right.details))));
}

function normalizeCodes(codes = []) {
  const result = [];
  for (const code of Array.isArray(codes) ? codes : []) {
    const normalized = text(code);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return Object.freeze(result.sort((left, right) =>
    blockerRank(left) - blockerRank(right) || compareText(left, right)));
}

function combineDiagnostics(...groups) {
  return normalizeDiagnostics(groups.flat());
}

function codesFrom(diagnostics, supplied = []) {
  return normalizeCodes([...supplied, ...diagnostics.map((item) => item.code)]);
}

function safeInput(input, code, message) {
  try {
    const source = cloneJson(input || {});
    if (plainObject(source)) return { source, diagnostics: [] };
  } catch { /* Return a blocked JSON-safe contract below. */ }
  return { source: {}, diagnostics: [diagnostic(code, message)] };
}

function analysisSectionIdValid(value) {
  return /^AS[1-9]\d*$/.test(value);
}

function elementIdValid(value) {
  return /^E[1-9]\d*$/.test(value);
}

export function createPipelineAnalysisSection(input = {}) {
  const safe = safeInput(
    input,
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
    'Analysis-section input must be JSON-safe plain data.',
  );
  const source = safe.source;
  const generated = [...safe.diagnostics];
  const analysisSectionId = text(source.analysisSectionId);
  const profileId = text(source.profileId);
  const startElementIndex = source.startElementIndex;
  if (!analysisSectionIdValid(analysisSectionId)) generated.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_ID_INVALID',
    'Analysis-section ID must use the independent AS1, AS2, ... namespace.',
    { analysisSectionId },
  ));
  if (!Number.isInteger(startElementIndex) || startElementIndex < 0) generated.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
    'Analysis-section startElementIndex must be a nonnegative integer.',
    { startElementIndex: source.startElementIndex },
  ));
  if (!profileId) generated.push(diagnostic(
    'PIPELINE_PROFILE_ID_INVALID',
    'Analysis section requires a nonblank engineering profile ID.',
  ));
  const diagnostics = combineDiagnostics(source.diagnostics, generated);
  const blockerCodes = codesFrom(diagnostics, source.blockerCodes);
  return deepFreeze({
    schema: PIPELINE_ANALYSIS_SECTION_SCHEMA,
    analysisSectionId,
    startElementIndex: Number.isInteger(startElementIndex) ? startElementIndex : null,
    profileId,
    boundaryAuthority: text(source.boundaryAuthority),
    boundarySourceReference: text(source.boundarySourceReference),
    sourceAuthority: text(source.sourceAuthority),
    sourceReference: text(source.sourceReference),
    status: blockerCodes.length ? 'BLOCKED' : (text(source.status) || 'CONTRACT_ONLY'),
    diagnostics,
    blockerCodes,
  });
}

export function createPipelineElementSectionResolution(input = {}) {
  const safe = safeInput(
    input,
    'PIPELINE_ELEMENT_SECTION_RESOLUTION_INVALID',
    'Element-section resolution input must be JSON-safe plain data.',
  );
  const source = safe.source;
  const generated = [...safe.diagnostics];
  const elementIndex = source.elementIndex;
  const elementId = text(source.elementId);
  const analysisSectionId = text(source.analysisSectionId);
  const profileId = text(source.profileId);
  const resolvedMode = text(source.resolvedMode);
  const sectionDisposition = text(source.sectionDisposition);
  if (!Number.isInteger(elementIndex) || elementIndex < 0 || !elementIdValid(elementId)) generated.push(diagnostic(
    'PIPELINE_ELEMENT_SECTION_RESOLUTION_INVALID',
    'Element-section resolution requires a nonnegative elementIndex and an independent E1, E2, ... elementId.',
    { elementIndex: source.elementIndex, elementId },
  ));
  if (!analysisSectionIdValid(analysisSectionId)) generated.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_ID_INVALID',
    'Element-section resolution requires an AS-prefixed analysisSectionId.',
    { analysisSectionId },
  ));
  if (!profileId) generated.push(diagostic(
    'PIPELINE_PROFILE_ID_INVALID',
    'Element-section resolution requires a nonblank engineering profile ID.',
  ));
  if (!ALLOWED_MODES.includes(resolvedMode) || !sectionDisposition) generated.push(diagnostic(
    'PIPELINE_ELEMENT_SECTION_RESOLUTION_INVALID',
    'Element-section resolution requires a supported resolvedMode and nonblank sectionDisposition.',
    { resolvedMode, sectionDisposition },
  ));
  const diagnostics = combineDiagnostics(source.diagnostics, generated);
  const blockerCodes = codesFrom(diagnostics, source.blockerCodes);
  return deepFreeze({
    schema: PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA,
    elementIndex: Number.isInteger(elementIndex) ? elementIndex : null,
    elementId,
    analysisSectionId,
    profileId,
    resolvedMode,
    sectionDisposition,
    boundaryNode: source.boundaryNode === undefined ? null : cloneJson(source.boundaryNode),
    sourceAuthority: text(source.sourceAuthority),
    sourceReference: text(source.sourceReference),
    diagnostics,
    blockerCodes,
    ready: blockerCodes.length === 0,
  });
}

function duplicateSectionDiagnostics(sections) {
  const counts = Object.create(null);
  for (const section of sections) {
    const id = section.analysisSectionId;
    if (id) counts[id] = (counts[id] || 0) + 1;
  }
  return Object.keys(counts).sort(compareText).filter((id) => counts[id] > 1).map((id) => diagnostic(
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
    'Analysis-section plan contains a duplicate analysisSectionId.',
    { analysisSectionId: id, count: counts[id] },
  ));
}

export function createPipelineAnalysisSectionPlan(input = {}) {
  const safe = safeInput(
    input,
   'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID',
    'Analysis-section plan input must be JSON-safe plain data.',
  );
  const source = safe.source;
  const generated = [...safe.diagnostics];
  if (source.sections !== undefined && !Array.isArray(source.sections)) generated.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID', 'Analysis-section plan sections must be an array.',
  ));
  if (source.elementResolutions !== undefined && !Array.isArray(source.elementResolutions)) generated.push(diagnostic(
    'PIPELINE_ANALYSIS_SECTION_CONTRACT_INVALID', 'Analysis-section plan elementResolutions must be an arrax¸œ°(€€¤¤ì(€½¹ÍĞÍ•Ñ¥½¹Ì€ô=‰©•Ğ¹™É••é” ¡ÉÉ…ä¹¥ÍÉÉ…ä¡Í½ÕÉ”¹Í•Ñ¥½¹Ì¤€üÍ½ÕÉ”¹Í•Ñ¥½¹Ì€èmt¤(€€€€¹µ…À¡É•…Ñ•A¥Á•±¥¹•¹…±åÍ¥ÍM•Ñ¥½¸¤¤ì(€½¹ÍĞ•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì€ô=‰©•Ğ¹™É••é” ¡ÉÉ…ä¹¥ÍÉÉ…ä¡Í½ÕÉ”¹•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì¤€üÍ½ÕÉ”¹•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì€èmt¤(€€€€¹µ…À¡É•…Ñ•A¥Á•±¥¹•±•µ•¹ÑM•Ñ¥½¹I•Í½±ÕÑ¥½¸¤¤ì(€½¹ÍĞ‘¥…¹½ÍÑ¥Ì€ô½µ‰¥¹•¥…¹½ÍÑ¥Ì (€€€Í½ÕÉ”¹‘¥…¹½ÍÑ¥Ì°(€€€•¹•É…Ñ•°(€€€‘ÕÁ±¥…Ñ•M•Ñ¥½¹¥…¹½ÍÑ¥Ì¡Í•Ñ¥½¹Ì¤°(€€€Í•Ñ¥½¹Ì¹™±…Ñ5…À ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹‘¥…¹½ÍÑ¥Ì¤°(€€€•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì¹™±…Ñ5…À ¡É•Í½±ÕÑ¥½¸¤€ôøÉ•Í½±ÕÑ¥½¸¹‘¥…¹½ÍÑ¥Ì¤°(€€¤ì(€½¹ÍĞ‰±½­•É½‘•Ì€ô½‘•ÍÉ½´ (€€€‘¥…¹½ÍÑ¥Ì°(€€€l¸¸¸¡ÉÉ…ä¹¥ÍÉÉ…ä¡Í½ÕÉ”¹‰±½­•É½‘•Ì¤€üÍ½ÕÉ”¹‰±½­•É½‘•Ì€èmt¤°(€€€€€€¸¸¹Í•Ñ¥½¹Ì¹™±…Ñ5…À ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹‰±½­•É½‘•Ì¤°(€€€€€€¸¸¹•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì¹™±…Ñ5…À ¡É•Í½±ÕÑ¥½¸¤€ôøÉ•Í½±ÕÑ¥½¸¹‰±½­•É½‘•Ì¥t°(€€¤ì(€É•ÑÕÉ¸‘••ÁÉ••é”¡ì(€€€Í¡•µ„èA%A1%9}91eM%M}MQ%=9}A19}M!5°(€€€Í•Ñ¥½¹Ì°(€€€•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì°(€€€‘¥…¹½ÍÑ¥Ì°(€€€‰±½­•É½‘•Ì°(€€€É•…‘äè‰±½­•É½‘•Ì¹±•¹Ñ €ôôô€À(€€€€€€˜˜Í•Ñ¥½¹Ì¹•Ù•Éä ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹ÍÑ…ÑÕÌ€„ôô€	1=-œ¤(€€€€€€˜˜•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì¹•Ù•Éä ¡É•Í½±ÕÑ¥½¸¤€ôøÉ•Í½±ÕÑ¥½¸¹É•…‘ä¤°(€ô¤ì)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸¥ÍA¥Á•±¥¹•¹…±åÍ¥ÍM•Ñ¥½¸¡Ù…±Õ”¤ì(€É•ÑÕÉ¸Á±…¥¹=‰©•Ğ¡Ù…±Õ”¤(€€€€˜˜Ù…±Õ”¹Í¡•µ„€ôôôA%A1%9}91eM%M}MQ%=9}M!5(€€€€˜˜ÑåÁ•½˜Ù…±Õ”¹…¹…±åÍ¥ÍM•Ñ¥½¹%€ôôô€ÍÑÉ¥¹œœ(€€€€˜˜ÉÉ…ä¹¥ÍÉÉ…ä¡Ù…±Õ”¹‘¥…¹½ÍÑ¥Ì¤(€€€€˜˜ÉÉ…ä¹¥ÍÉÉ…ä¡Ù…±Õ”¹‰±½­•É½‘•Ì¤ì)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸¥ÍA¥Á•±¥¹•¹…±åÍ¥ÍM•Ñ¥½¹A±…¸¡Ù…±Õ”¤ì(€É•ÑÕÉ¸Á±…¥¹=‰©•Ğ¡Ù…±Õ”¤(€€€€˜˜Ù…±Õ”¹Í¡•µ„€ôôôA%A1%9}91eM%M}MQ%=9}A19}M!5(€€€€˜˜ÉÉ…ä¹¥ÍÉÉ…ä¡Ù…±Õ”¹Í•Ñ¥½¹Ì¤(€€€€˜˜ÉÉ…ä¹¥ÍÉÉ…ä¡Ù…±Õ”¹•±•µ•¹ÑI•Í½±ÕÑ¥½¹Ì¤(€€€€˜˜ÑåÁ•½˜Ù…±Õ”¹É•…‘ä€ôôô€‰½½±•…¸œì)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸¥ÍA¥Á•±¥¹•±•µ•¹ÑM•Ñ¥½¹I•Í½±ÕÑ¥½¸¡Ù…±Õ”¤ì(€É•ÑÕÉ¸Á±…¥¹=‰©•Ğ¡Ù…±Õ”¤(€€€€˜˜Ù…±Õ”¹Í¡•µ„€ôôôA%A1%9}159Q}MQ%=9}IM=1UQ%=9}M!5(€€€€˜˜ÑåÁ•½˜Ù…±Õ”¹•±•µ•¹Ñ%€ôôô€ÍÑÉ¥¹œœ(€€€€˜˜ÑåÁ•½˜Ù…±Õ”¹É•…‘ä€ôôô€‰½½±•…¸œì)ô(
export const PIPELINE_SECTION_PROPERTY_ASSIGNMENT_SCHEMA = 'PipelineSectionPropertyAssignment.v1';
export const PIPELINE_SECTION_PROPERTY_ASSIGNMENT_PLAN_SCHEMA = 'PipelineSectionPropertyAssignmentPlan.v1';

const ORDER = Object.freeze([
  'PIPELINE_SECTION_ASSIGNMENT_INPUT_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_CANONICAL_PLAN_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_TARGET_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_FIELD_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_CONFIRMATION_REQUIRED',
  'PIPELINE_SECTION_ASSIGNMENT_PROVENANCE_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_SOURCE_STALE',
  'PIPELINE_SECTION_ASSIGNMENT_ID_INVALID',
  'PIPELINE_SECTION_ASSIGNMENT_DUPLICATE_OWNER',
  'PIPELINE_SECTION_ASSIGNMENT_COVERAGE_INVALID',
]);
export const PIPELINE_SECTION_ASSIGNABLE_FIELD_IDS = Object.freeze([
  'outsideDiameterMm', 'wallThickness', 'materialNumber', 'corrosionAllowance',
  'insulationThickness', 'insulationDensity', 'fluidDensity', 'hydroPressure',
  ...Array.from({ length: 9 }, (_, index) => `pressure${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `temperature${index + 1}`),
]);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
function clone(value) {
  if (value === undefined) return null;
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return value.map(clone);
  if (!plain(value)) throw new TypeError('Section assignment evidence must be JSON-safe plain data.');
  return Object.fromEntries(Object.keys(value).sort(compare).map((key) => [key, clone(value[key])]));
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
function diagnostic(code, message = code, details = {}) {
  return freeze({ severity: 'BLOCKING', code, message, details: clone(details) });
}
function ordered(values) {
  const byKey = Object.create(null);
  values.filter(plain).forEach((item) => { byKey[`${item.code}:${JSON.stringify(item.details || {})}`] = item; });
  return Object.freeze(Object.values(byKey).sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)
    || compare(a.code, b.code) || compare(JSON.stringify(a.details), JSON.stringify(b.details))));
}
function codes(values) {
  return Object.freeze([...new Set(values.map((item) => item.code))]
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b) || compare(a, b)));
}
function canonicalJson(value) { return JSON.stringify(clone(value)); }
function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte); hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
function canonicalSections(plan, diagnostics) {
  const sections = Array.isArray(plan?.sections) ? plan.sections : [];
  const elements = Array.isArray(plan?.elementResolutions) ? plan.elementResolutions : [];
  const root = plan?.schema === 'PipelineAnalysisSectionPlan.v1' && plan.ready === true
    && sections.length > 0 && elements.length > 0;
  let valid = root;
  sections.forEach((section, index) => {
    const previous = sections[index - 1];
    const exact = plain(section) && section.analysisSectionId === `AS${index + 1}`
      && Number.isInteger(section.startElementIndex) && section.startElementIndex >= 0
      && (index === 0 ? section.startElementIndex === 0
        : section.startElementIndex > previous.startElementIndex)
      && ['normal-metallic', 'asme-b31.4', 'gre'].includes(text(section.profileId));
    valid &&= exact;
  });
  elements.forEach((element, index) => {
    const owner = sections.filter((section) => section.startElementIndex <= index).at(-1);
    valid &&= plain(element) && element.elementIndex === index && element.elementId === `E${index + 1}`
      && owner && element.analysisSectionId === owner.analysisSectionId && element.profileId === owner.profileId;
  });
  if (!valid) diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_CANONICAL_PLAN_INVALID',
    'A ready canonical analysis-section plan with exact coverage is required.'));
  return valid ? sections : [];
}
function normalizedIds(values) {
  return Array.isArray(values) ? [...new Set(values.map(text).filter(Boolean))].sort(compare) : [];
}
function meaningful(value) { return value !== undefined && value !== null && !(typeof value === 'string' && !value.trim()); }
function transactionPayload(source) {
  return { analysisSectionIds: normalizedIds(source.analysisSectionIds), fieldIds: normalizedIds(source.fieldIds),
    sourceKind: text(source.sourceKind), sourceReference: text(source.sourceReference),
    sourceValues: clone(plain(source.sourceValues) ? source.sourceValues : {}),
    assignedValues: clone(plain(source.assignedValues) ? source.assignedValues : {}) };
}
export function pipelineSectionPropertyAssignmentId(input = {}) {
  return fnv1a64(canonicalJson(transactionPayload(input)));
}
export function createPipelineSectionPropertyAssignment(input = {}, context = {}) {
  let source; const diagnostics = [];
  try { source = clone(input); if (!plain(source)) throw new TypeError(); } catch {
    source = {}; diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_INPUT_INVALID'));
  }
  const payload = transactionPayload(source), expectedId = pipelineSectionPropertyAssignmentId(payload);
  const sectionIds = new Set((context.sections || []).map((section) => section.analysisSectionId));
  if (!payload.analysisSectionIds.length || payload.analysisSectionIds.some((id) => !sectionIds.has(id))) diagnostics.push(
    diagnostic('PIPELINE_SECTION_ASSIGNMENT_TARGET_INVALID', 'Every assignment target must be one canonical section.'));
  if (!payload.fieldIds.length || payload.fieldIds.some((id) => !PIPELINE_SECTION_ASSIGNABLE_FIELD_IDS.includes(id))) diagnostics.push(
    diagnostic('PIPELINE_SECTION_ASSIGNMENT_FIELD_INVALID', 'Assignment fields must use the closed property field vocabulary.'));
  if (source.userConfirmed !== true) diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_CONFIRMATION_REQUIRED',
    'Section-property assignment requires explicit confirmation.'));
  if (!['BRANCH_INPUT_BLOCK', 'ANALYSIS_SECTION_INPUT', 'USER_SETTINGS_UI', 'CONFIRMED_LEGACY_STORAGE']
    .includes(payload.sourceKind) || !payload.sourceReference) diagnostics.push(diagnostic(
    'PIPELINE_SECTION_ASSIGNMENT_PROVENANCE_INVALID', 'Assignment provenance must be explicit.'));
  const current = plain(context.currentSourceValues) ? context.currentSourceValues : {};
  for (const fieldId of payload.fieldIds) {
    const sourceValue = payload.sourceValues[fieldId], assigned = payload.assignedValues[fieldId];
    if (!meaningful(sourceValue)) {
      if (meaningful(assigned)) diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_FIELD_INVALID',
        'Blank source fields must remain absent.', { fieldId }));
      continue;
    }
    if (canonicalJson(sourceValue) !== canonicalJson(current[fieldId])) diagnostics.push(diagnostic(
      'PIPELINE_SECTION_ASSIGNMENT_SOURCE_STALE', 'Assignment source changed after confirmation.', { fieldId }));
    if (canonicalJson(sourceValue) !== canonicalJson(assigned)) diagnostics.push(diagnostic(
      'PIPELINE_SECTION_ASSIGNMENT_FIELD_INVALID', 'Assigned value must exactly conserve the source value.', { fieldId }));
  }
  if (text(source.transactionId) && text(source.transactionId) !== expectedId) diagnostics.push(diagnostic(
    'PIPELINE_SECTION_ASSIGNMENT_ID_INVALID', 'Transaction identity does not match canonical assignment bytes.'));
  const finalized = ordered([...(Array.isArray(source.diagnostics) ? source.diagnostics : []), ...diagnostics]);
  const blockerCodes = codes(finalized);
  return freeze({ schema: PIPELINE_SECTION_PROPERTY_ASSIGNMENT_SCHEMA, transactionId: expectedId,
    ...payload, userConfirmed: source.userConfirmed === true, diagnostics: finalized, blockerCodes,
    ready: blockerCodes.length === 0 });
}
export function buildPipelineSectionPropertyAssignmentPlan(input = {}) {
  const diagnostics = []; let source;
  try { source = clone(input); if (!plain(source)) throw new TypeError(); } catch {
    source = {}; diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_INPUT_INVALID'));
  }
  const sections = canonicalSections(source.canonicalAnalysisSectionPlan, diagnostics);
  const context = { sections, currentSourceValues: source.currentSourceValues };
  const assignments = Object.freeze((Array.isArray(source.assignments) ? source.assignments : [])
    .map((item) => createPipelineSectionPropertyAssignment(item, context))
    .sort((a, b) => compare(a.transactionId, b.transactionId)));
  const owners = Object.create(null), sectionValues = Object.fromEntries(sections.map((section) => [section.analysisSectionId, {}]));
  for (const assignment of assignments) {
    diagnostics.push(...assignment.diagnostics);
    if (!assignment.ready) continue;
    for (const sectionId of assignment.analysisSectionIds) for (const fieldId of assignment.fieldIds) {
      if (!meaningful(assignment.assignedValues[fieldId])) continue;
      const key = `${sectionId}:${fieldId}`;
      if (owners[key]) diagnostics.push(diagnostic('PIPELINE_SECTION_ASSIGNMENT_DUPLICATE_OWNER',
        'One section property cannot be owned by multiple transactions.', { sectionId, fieldId }));
      owners[key] = assignment.transactionId;
      sectionValues[sectionId][fieldId] = freeze({ value: clone(assignment.assignedValues[fieldId]),
        transactionId: assignment.transactionId, sourceKind: assignment.sourceKind,
        sourceReference: assignment.sourceReference });
    }
  }
  const finalized = ordered(diagnostics), blockerCodes = codes(finalized);
  return freeze({ schema: PIPELINE_SECTION_PROPERTY_ASSIGNMENT_PLAN_SCHEMA,
    analysisSectionPlanSchema: text(source.canonicalAnalysisSectionPlan?.schema), assignments,
    sectionValues, counts: freeze({ sectionCount: sections.length, assignmentCount: assignments.length,
      readyAssignmentCount: assignments.filter((item) => item.ready).length,
      assignedValueCount: Object.keys(owners).length }), diagnostics: finalized, blockerCodes,
    ready: blockerCodes.length === 0 });
}
export const buildPipelineSectionPropertyAssignmentsJson = (plan) => JSON.stringify(plan, null, 2);
export function buildPipelineSectionPropertyAssignmentsTsv(plan) {
  const rows = [['TransactionId', 'AnalysisSectionIds', 'FieldIds', 'SourceKind', 'SourceReference', 'Ready']];
  for (const item of plan?.assignments || []) rows.push([item.transactionId,
    item.analysisSectionIds.join(','), item.fieldIds.join(','), item.sourceKind,
    item.sourceReference, item.ready ? 'YES' : 'NO']);
  return rows.map((row) => row.join('\t')).join('\n');
}

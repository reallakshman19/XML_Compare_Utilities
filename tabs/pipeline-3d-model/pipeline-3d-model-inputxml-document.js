import {
  PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA,
  resolvePipelinePropertySectionPlan,
} from './pipeline-3d-model-property-sections.js?v=20260722-p3d-property-sections-1';

export const PIPELINE_INPUTXML_DOCUMENT_SCHEMA = 'PipelineInputXmlDocumentPlan.v1';
export const PIPELINE_INPUTXML_ELEMENT_SCHEMA = 'PipelineInputXmlElementPlan.v1';
export const PIPELINE_CANONICAL_NAMESPACE = 'COADE';
export const PIPELINE_EXTENSION_NAMESPACE = 'urn:reallaksh19:inputxml:extension:v1';

export const DEFAULT_PIPELINE_INPUTXML_METADATA = Object.freeze({
  caesarVersion: '11.00', jobName: 'PIPELINE_3D_MODEL', issueNo: '',
  northX: 0, northY: 1, northZ: 0,
});

function text(value) {
  return String(value ?? '').trim();
}

function branchInfoFrom(input = {}) {
  if (input?.schema === 'PipelineUtilityExportContext.v1') return input.branchInfo || {};
  if (input?.exportContext?.schema === 'PipelineUtilityExportContext.v1') {
    return input.exportContext.branchInfo || {};
  }
  return input?.branchInfo || input || {};
}

function diagnostic(code, message, details = {}) {
  return Object.freeze({
    severity: 'BLOCKING', code, message, details: Object.freeze({ ...details }),
  });
}

function normalizedMetadata(branchInfo) {
  const defaults = DEFAULT_PIPELINE_INPUTXML_METADATA;
  return Object.freeze({
    caesarVersion: text(branchInfo.caesarVersion) || defaults.caesarVersion,
    jobName: text(branchInfo.jobName) || defaults.jobName,
    issueNo: text(branchInfo.issueNo),
    timeText: text(branchInfo.inputXmlTime ?? branchInfo.timeText),
    northX: defaults.northX, northY: defaults.northY, northZ: defaults.northZ,
  });
}

function nodePairValid(fromRow, toRow) {
  const from = Number(fromRow?.nodeNumber);
  const to = Number(toRow?.nodeNumber);
  return Number.isInteger(from) && from > 0
    && Number.isInteger(to) && to > 0 && from !== to;
}

function coordinateValues(row) {
  return [Number(row?.x), Number(row?.y), Number(row?.z)];
}

function elementDiagnostics(fromRow, toRow, index) {
  const messages = [];
  if (!nodePairValid(fromRow, toRow)) {
    messages.push(diagnostic(
      'PIPELINE_NODE_PAIR_INVALID',
      `Element E${index + 1} requires distinct positive integer node identifiers.`,
      { fromNode: fromRow?.nodeNumber, toNode: toRow?.nodeNumber },
    ));
  }
  const coordinates = [...coordinateValues(fromRow), ...coordinateValues(toRow)];
  if (!coordinates.every(Number.isFinite)) {
    messages.push(diagnostic(
      'PIPELINE_GEOMETRY_NONFINITE',
      `Element E${index + 1} contains a non-finite endpoint coordinate.`,
      { fromRow, toRow },
    ));
    return messages;
  }
  const delta = coordinates.slice(3).map((value, axis) => value - coordinates[axis]);
  if (delta.every((value) => value === 0)) {
    messages.push(diagnostic(
      'PIPELINE_ZERO_LENGTH_ELEMENT',
      `Element E${index + 1} has zero-length geometry.`,
      { fromNode: fromRow?.nodeNumber, toNode: toRow?.nodeNumber },
    ));
  }
  return messages;
}

function bendForIndex(bendResolution, index) {
  return bendResolution?.bendByIncomingElementIndex?.[index] || null;
}

function buildElement(fromRow, toRow, index, lineNo, propertyResolution, bendResolution) {
  const [fromX, fromY, fromZ] = coordinateValues(fromRow);
  const [toX, toY, toZ] = coordinateValues(toRow);
  return Object.freeze({
    schema: PIPELINE_INPUTXML_ELEMENT_SCHEMA,
    id: `E${index + 1}`,
    index,
    fromNode: Number(fromRow?.nodeNumber),
    toNode: Number(toRow?.nodeNumber),
    deltaX: toX - fromX,
    deltaY: toY - fromY,
    deltaZ: toZ - fromZ,
    fromX, fromY, fromZ, toX, toY, toZ,
    fromName: text(fromRow?.nodeName),
    toName: text(toRow?.nodeName),
    line: lineNo,
    propertySectionId: propertyResolution?.sectionId || '',
    propertyDisposition: propertyResolution?.propertyDisposition || '',
    properties: propertyResolution?.properties || Object.freeze({}),
    emittedProperties: propertyResolution?.emittedProperties || Object.freeze({}),
    bend: bendForIndex(bendResolution, index),
    diagnostics: Object.freeze(elementDiagnostics(fromRow, toRow, index)),
  });
}

function globalDiagnostics(branchInfo, coordinateRows) {
  const messages = [];
  if (coordinateRows.length < 2) messages.push(diagnostic(
    'PIPELINE_GEOMETRY_SEGMENT_REQUIRED',
    'At least two coordinate rows are required for a PIPINGELEMENT.',
  ));
  if (!text(branchInfo.lineNo)) messages.push(diagnostic(
    'PIPELINE_LINE_NUMBER_REQUIRED', 'Canonical InputXML requires a nonblank LINE value.',
  ));
  return messages;
}

function contextDiagnostics(exportContext) {
  return (exportContext?.readiness?.blockerCodes || []).map((code) => diagnostic(
    text(code) || 'PIPELINE_EXPORT_CONTEXT_BLOCKED',
    code === 'GRE_BEND_POLICY_NOT_IMPLEMENTED'
      ? 'GRE fitting emission requires the future independent resolver.'
      : 'The resolved Pipeline export context blocks canonical InputXML.',
    { resolvedMode: text(exportContext?.profile?.resolvedMode) },
  ));
}

function bendDiagnostics(bendResolution) {
  return (bendResolution?.errors || []).map((item) => diagnostic(
    text(item?.code) || 'BEND_GEOMETRY_BLOCKED',
    text(item?.message) || 'Bend resolution blocks canonical InputXML.',
    item?.details || {},
  ));
}

function uniqueDiagnostics(items) {
  const keys = new Set();
  return items.filter((item) => {
    const key = `${item.code}:${JSON.stringify(item.details)}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function uniqueCodes(diagnostics) {
  return Object.freeze([...new Set(diagnostics.map((item) => item.code))]);
}

function modelCounts(elements) {
  return Object.freeze({
    numElt: elements.length, numNoz: 0, noHgrs: 0,
    numBend: elements.filter((element) => Number(element.bend?.radiusMm) > 0).length,
    numRigid: 0, numExpJnt: 0, numRest: 0, numForcMnt: 0,
    numUnfLoad: 0, numWind: 0, numEleOff: 0, numAllow: 0, numISect: 0,
  });
}

export function buildPipelineInputXmlDocumentPlan({
  exportContext = {}, coordinateRows = [], bendResolution = null, propertySections = [],
} = {}) {
  const branchInfo = branchInfoFrom(exportContext);
  const lineNo = text(branchInfo.lineNo);
  const propertySectionPlan = resolvePipelinePropertySectionPlan({
    branchInfo, coordinateRows, propertySections,
  });
  const elements = Object.freeze(coordinateRows.slice(1).map((toRow, index) =>
    buildElement(
      coordinateRows[index], toRow, index, lineNo,
      propertySectionPlan.elements[index], bendResolution,
    )));
  const diagnostics = Object.freeze(uniqueDiagnostics([
    ...contextDiagnostics(exportContext),
    ...globalDiagnostics(branchInfo, coordinateRows),
    ...propertySectionPlan.diagnostics,
    ...elements.flatMap((element) => element.diagnostics),
    ...bendDiagnostics(bendResolution),
  ]));
  const metadata = normalizedMetadata(branchInfo);
  return Object.freeze({
    schema: PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
    namespace: PIPELINE_CANONICAL_NAMESPACE,
    extensionNamespace: PIPELINE_EXTENSION_NAMESPACE,
    xmlType: 'Input',
    version: metadata.caesarVersion,
    metadata,
    counts: modelCounts(elements),
    propertySectionPlan,
    propertySectionPlanSchema: PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA,
    elements,
    diagnostics,
    blockerCodes: uniqueCodes(diagnostics),
    ready: diagnostics.length === 0,
    resolvedMode: text(exportContext?.profile?.resolvedMode),
  });
}

export function buildPipelineInputXmlDocumentPlanJson(plan) {
  return JSON.stringify(plan, null, 2);
}

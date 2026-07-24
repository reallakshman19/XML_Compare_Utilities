import {
  PIPELINE_CANONICAL_NAMESPACE,
  PIPELINE_EXTENSION_NAMESPACE,
  PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
  buildPipelineInputXmlDocumentPlan,
} from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-base-039-1';

const text = (value) => String(value ?? '').trim();
const zeroCounts = Object.freeze({ numElt: 0, numNoz: 0, noHgrs: 0, numBend: 0,
  numRigid: 0, numExpJnt: 0, numRest: 0, numForcMnt: 0, numUnfLoad: 0,
  numWind: 0, numEleOff: 0, numAllow: 0, numISect: 0 });
function branchInfo(input) {
  const context = input?.exportContext;
  return context?.schema === 'PipelineUtilityExportContext.v1' ? context.branchInfo || {} : context || {};
}
function missingFields(value) {
  return ['jobName', 'caesarVersion', 'branchName', 'lineNo'].filter((key) => !text(value[key]));
}
function blockedDocument(value, fields) {
  const diagnostics = Object.freeze(fields.map((fieldId) => Object.freeze({ severity: 'BLOCKING',
    code: 'PIPELINE_CONFIGURATION_FIELD_REQUIRED',
    message: 'Explicit InputXML metadata is required.', details: Object.freeze({ fieldId }) })));
  return Object.freeze({ schema: PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
    namespace: PIPELINE_CANONICAL_NAMESPACE, extensionNamespace: PIPELINE_EXTENSION_NAMESPACE,
    xmlType: 'Input', version: text(value.caesarVersion), metadata: Object.freeze({
      caesarVersion: text(value.caesarVersion), jobName: text(value.jobName), issueNo: text(value.issueNo),
      timeText: text(value.inputXmlTime ?? value.timeText), northX: 0, northY: 1, northZ: 0 }),
    counts: zeroCounts, propertySectionPlan: null, propertySectionPlanSchema: '',
    elements: Object.freeze([]), diagnostics,
    blockerCodes: Object.freeze(['PIPELINE_CONFIGURATION_FIELD_REQUIRED']),
    ready: false, resolvedMode: '' });
}
export function buildExplicitPipelineInputXmlDocumentPlan(input = {}) {
  const value = branchInfo(input), fields = missingFields(value);
  return fields.length ? blockedDocument(value, fields) : buildPipelineInputXmlDocumentPlan(input);
}

import { buildPipelineInputXmlDocumentPlan, PIPELINE_INPUTXML_DOCUMENT_SCHEMA } from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-base-039-1';
import { PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA, PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA, PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA, PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA } from './pipeline-3d-model-inputxml-profile-authority.js';
import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import { PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA, PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-diameter-contracts.js';
import { PIPELINE_BEND_RESOLUTION_SCHEMA, PIPELINE_NORMAL_FITTING_PLAN_SCHEMA } from './pipeline-3d-model-normal-fitting-contracts.js';
import { PIPELINE_B314_RADIUS_PLAN_SCHEMA } from './pipeline-3d-model-b314-radius-contracts.js';
import { PIPELINE_GRE_VENDOR_PLAN_SCHEMA } from './pipeline-3d-model-gre-vendor-series-contracts.js';
import { resolvePipelineIdentityContext, resolvePipelineNodeIdentity } from './pipeline-3d-model-identity.js?v=20260722-p3d-identity-1';
import { caesar14BendAttributeEntries, caesar14ElementAttributeEntries, caesar14ModelAttributeEntries, caesar14RootAttributeEntries, resolvePipelineCaesarWriterProfile } from './pipeline-3d-model-caesar14-writer-profile.js';
const M_TO_MM = 1000; const NODE_NUMBER_START = 100; const NODE_NUMBER_STEP = 10;
const text = (value) => String(value ?? '').trim();
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function toMm(meters) { return Math.round(Number(meters || 0) * M_TO_MM * 1000) / 1000; }
export function buildCoordinateRows(combinedPoints, identityInput = {}) {
  const identity = resolvePipelineIdentityContext(identityInput);
  return combinedPoints.map((point, index) => {
    const node = resolvePipelineNodeIdentity(point);
    return {
      branchName: identity.branchName,
      lineNo: identity.lineNo,
      nodeNumber: NODE_NUMBER_START + index * NODE_NUMBER_STEP,
      x: toMm(point.x), y: toMm(point.y), z: toMm(point.z),
      nodeName: node.nodeName, nodeNameSource: node.nodeNameSource,
      horizontal: point.horizontal,
    };
  });
}
export function coordinateRowsToTabText(rows) {
  const header = ['BranchName', 'LineNo', 'NodeNumber', 'X(mm)', 'Y(mm)', 'Z(mm)',
    'NodeName', 'NodeNameSource'].join('\t');
  const lines = rows.map((row) => [row.branchName, row.lineNo, row.nodeNumber,
    row.x, row.y, row.z, row.nodeName, row.nodeNameSource].join('\t'));
  return [header, ...lines].join('\n');
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
function attr(name, value) { return `${name}="${esc(value)}"`; }
function attributes(entries) { return entries.map(([name, value]) => attr(name, value)); }
function optionalAttr(values, name, value) { if (value !== '' && value != null && Number.isFinite(Number(value))) values.push(attr(name, Number(value))); }
function optionalTextAttr(values, name, value) { const valueText = text(value); if (valueText) values.push(attr(name, valueText)); }
function usableCurvatureNodes(bend) {
  const turnAngleDeg = Number(bend?.turnAngleDeg);
  return (bend?.curvatureNodes || []).filter((node) => {
    const angle = Number(node?.angleDeg);
    const nodeNumber = Number(node?.nodeNumber);
    return Number.isFinite(angle) && angle >= 0 && Number.isInteger(nodeNumber) && nodeNumber > 0
      && (!Number.isFinite(turnAngleDeg) || angle < turnAngleDeg - 1e-7);
  }).slice(0, 3);
}
function legacyBendXml(bend) {
  const radius = Number(bend?.radiusMm);
  if (!Number.isFinite(radius) || radius <= 0) return '';
  const values = [attr('RADIUS', radius)];
  const typeCode = Number(bend?.bendTypeCode);
  if (Number.isInteger(typeCode)) values.push(attr('TYPE', typeCode));
  usableCurvatureNodes(bend).forEach((node, index) => {
    values.push(attr(`ANGLE${index + 1}`, Number(node.angleDeg)));
    values.push(attr(`NODE${index + 1}`, Number(node.nodeNumber)));
  });
  values.push(attr('NUM_MITER', 0));
  optionalAttr(values, 'FITTINGTHICKNESS', bend?.fittingThicknessMm);
  optionalAttr(values, 'KFACTOR', bend?.kfactor);
  return `<BEND ${values.join(' ')}/>`;
}
function bendXml(bend, profile = resolvePipelineCaesarWriterProfile('')) {
  if (profile.mode !== 'CAESAR_14') return legacyBendXml(bend);
  const values = caesar14BendAttributeEntries(bend, usableCurvatureNodes(bend));
  return values.length ? `<BEND ${attributes(values).join(' ')}/>` : '';
}
function propertyAttributes(properties) {
  const values = [];
  optionalAttr(values, 'DIAMETER', properties?.diameter);
  optionalAttr(values, 'WALL_THICK', properties?.wallThickness);
  optionalAttr(values, 'INSUL_THICK', properties?.insulationThickness);
  optionalAttr(values, 'CORR_ALLOW', properties?.corrosionAllowance);
  (properties?.temperatures || []).forEach((value, index) =>
    optionalAttr(values, `TEMP_EXP_C${index + 1}`, value));
  (properties?.pressures || []).forEach((value, index) =>
    optionalAttr(values, `PRESSURE_C${index + 1}`, value));
  optionalAttr(values, 'HYDRO_PRESSURE', properties?.hydroPressure);
  optionalAttr(values, 'INSUL_DENSITY', properties?.insulationDensity);
  optionalAttr(values, 'FLUID_DENSITY', properties?.fluidDensity);
  optionalAttr(values, 'MATERIAL_NUM', properties?.materialNumber);
  return values;
}
function legacyElementAttributes(element) {
  const values = [attr('ID', element.id), attr('FROM_NODE', element.fromNode),
    attr('TO_NODE', element.toNode), attr('DELTA_X', element.deltaX),
    attr('DELTA_Y', element.deltaY), attr('DELTA_Z', element.deltaZ),
    ...propertyAttributes(element.emittedProperties ?? element.properties)];
  optionalTextAttr(values, 'FROM_NAME', element.fromName);
  optionalTextAttr(values, 'TO_NAME', element.toName);
  values.push(attr('LINE', element.line), attr('FROM_X', element.fromX),
    attr('FROM_Y', element.fromY), attr('FROM_Z', element.fromZ),
    attr('TO_X', element.toX), attr('TO_Y', element.toY), attr('TO_Z', element.toZ));
  return values;
}
function pipingElementXml(element, profile) {
  const values = profile.mode === 'CAESAR_14'
    ? attributes(caesar14ElementAttributeEntries(element))
    : legacyElementAttributes(element);
  const child = bendXml(element.bend, profile);
  if (!child) return `<PIPINGELEMENT ${values.join(' ')}/>`;
  return `<PIPINGELEMENT ${values.join(' ')}>\n${child}\n</PIPINGELEMENT>`;
}
function legacyModelAttributes(plan) {
  const { metadata, counts } = plan;
  const values = [attr('JOBNAME', metadata.jobName)];
  optionalTextAttr(values, 'TIME', metadata.timeText);
  optionalTextAttr(values, 'ISSUE_NO', metadata.issueNo);
  values.push(attr('NUMELT', counts.numElt), attr('NUMNOZ', counts.numNoz),
    attr('NOHGRS', counts.noHgrs), attr('NUMBEND', counts.numBend),
    attr('NUMRIGID', counts.numRigid), attr('NUMEXPJNT', counts.numExpJnt),
    attr('NUMREST', counts.numRest), attr('NUMFORCMNT', counts.numForcMnt),
    attr('NUMUNFLOAD', counts.numUnfLoad), attr('NUMWIND', counts.numWind),
    attr('NUMELEOFF', counts.numEleOff), attr('NUMALLOW', counts.numAllow),
    attr('NUMISECT', counts.numISect), attr('NORTH_X', metadata.northX),
    attr('NORTH_Y', metadata.northY), attr('NORTH_Z', metadata.northZ));
  return values;
}
function modelAttributes(plan, profile = resolvePipelineCaesarWriterProfile('')) { return profile.mode === 'CAESAR_14' ? attributes(caesar14ModelAttributeEntries(plan)) : legacyModelAttributes(plan); }
function resolvedPlan(input, coordinateRows, bendResolution) { return input?.schema === PIPELINE_INPUTXML_DOCUMENT_SCHEMA ? input : buildPipelineInputXmlDocumentPlan({ exportContext: input, coordinateRows, bendResolution }); }
function blocking(value) {
  return (Array.isArray(value?.blockerCodes) && value.blockerCodes.length > 0)
    || (Array.isArray(value?.diagnostics)
      && value.diagnostics.some((item) => text(item?.severity) === 'BLOCKING'));
}
function exactSchemaReferences(plan, authority) {
  const references = {
    analysisSectionPlanSchema: PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA,
    analysisDiameterPlanSchema: PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,
    normalFittingPlanSchema: PIPELINE_NORMAL_FITTING_PLAN_SCHEMA,
    b314RadiusPlanSchema: PIPELINE_B314_RADIUS_PLAN_SCHEMA,
    greVendorSeriesPlanSchema: PIPELINE_GRE_VENDOR_PLAN_SCHEMA,
    bendResolutionSchema: PIPELINE_BEND_RESOLUTION_SCHEMA,
    propertySectionPlanSchema: PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA,
  };
  return Object.entries(references).every(([key, schema]) =>
    plan[key] === schema && authority[key] === schema)
    && plan.profileAuthorityPlanSchema === PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA;
}
function bendMatchesAuthority(bend, fitting) {
  const expected = fitting?.bendGeometry;
  if (!plain(bend) || !plain(expected)) return false;
  const scalarFields = ['incomingElementIndex', 'outgoingElementIndex', 'previousNode',
    'cornerNode', 'nextNode', 'bendClass', 'status', 'turnAngleDeg', 'bendTypeCode', 'kfactor'];
  const conserved = text(bend.id) === expected.candidateId
    && scalarFields.every((key) => (bend[key] ?? null)
      === (expected[key === 'status' ? 'candidateStatus' : key] ?? null))
    && same(bend.curvatureNodes || [], expected.curvatureNodes || []);
  return conserved && Number(bend.radiusMm) === Number(fitting.governingRadiusMm)
    && (bend.fittingThicknessMm ?? null) === (fitting.fittingThicknessMm ?? null);
}
function sectionAuthoritiesValid(plan, authority) {
  const sectionIds = new Set();
  return authority.sectionAuthorities.every((section, index) => {
    if (!plain(section) || section.schema !== PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA
      || section.ready !== true || blocking(section) || section.analysisSectionId !== `AS${index + 1}`
      || !Number.isInteger(section.startElementIndex) || section.startElementIndex < 0
      || (index === 0 ? section.startElementIndex !== 0
        : section.startElementIndex <= authority.sectionAuthorities[index - 1].startElementIndex)
      || sectionIds.has(section.analysisSectionId)) return false;
    sectionIds.add(section.analysisSectionId);
    const owned = plan.elements.filter((element) =>
      element.analysisSectionId === section.analysisSectionId);
    return owned.length > 0 && owned[0].index === section.startElementIndex
      && owned.every((element) => element.profileId === section.profileId
        && element.resolvedMode === section.resolvedMode
        && element.caesarDiameterMm === section.caesarDiameterMm)
      && (section.profileId === 'gre') === plain(section.greVendorSeriesAuthority);
  });
}
function elementAuthoritiesValid(plan, authority) {
  const elementIds = new Set();
  return authority.elementAuthorities.every((authorityItem, index) => {
    const element = plan.elements[index];
    const section = authority.sectionAuthorities
      .filter((item) => item.startElementIndex <= index).at(-1);
    if (!plain(authorityItem) || authorityItem.schema !== PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA
      || authorityItem.ready !== true || blocking(authorityItem)
      || authorityItem.elementIndex !== index || authorityItem.elementId !== `E${index + 1}`
      || elementIds.has(authorityItem.elementId) || !section
      || authorityItem.analysisSectionId !== section.analysisSectionId
      || authorityItem.profileId !== section.profileId || authorityItem.writerDisposition !== 'READY'
      || !same(element.profileAuthority, authorityItem) || element.id !== authorityItem.elementId
      || element.index !== authorityItem.elementIndex
      || element.caesarDiameterMm !== authorityItem.caesarDiameterMm
      || element.emittedProperties?.diameter !== authorityItem.caesarDiameterMm) return false;
    elementIds.add(authorityItem.elementId);
    return true;
  });
}
function authorityStructureValid(plan, authority) {
  if (!plain(authority) || authority.schema !== PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA
    || authority.ready !== true || blocking(authority) || !exactSchemaReferences(plan, authority)) return false;
  if (!Array.isArray(authority.sectionAuthorities)
    || !Array.isArray(authority.elementAuthorities)
    || !Array.isArray(authority.fittingAuthorities)
    || !Array.isArray(plan.elements)
    || authority.elementAuthorities.length !== plan.elements.length) return false;
  return sectionAuthoritiesValid(plan, authority) && elementAuthoritiesValid(plan, authority);
}
function fittingStructureValid(plan, authority) {
  const byCandidate = new Set();
  const byIncoming = new Set();
  const represented = new Set();
  const valid = authority.fittingAuthorities.every((fitting) => {
    const element = plan.elements[fitting?.incomingElementIndex];
    const elementAuthority = authority.elementAuthorities[fitting?.incomingElementIndex];
    if (!plain(fitting) || fitting.schema !== PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA
      || fitting.ready !== true || blocking(fitting) || byCandidate.has(fitting.candidateId)
      || byIncoming.has(fitting.incomingElementIndex) || !element || !elementAuthority
      || fitting.incomingElementId !== element.id
      || fitting.outgoingElementIndex !== fitting.incomingElementIndex + 1
      || fitting.outgoingElementId !== `E${fitting.outgoingElementIndex + 1}`
      || fitting.analysisSectionId !== elementAuthority.analysisSectionId
      || fitting.profileId !== elementAuthority.profileId
      || elementAuthority.fittingCandidateId !== fitting.candidateId
      || elementAuthority.fittingAuthorityKind !== fitting.fittingAuthorityKind
      || elementAuthority.fittingPolicyId !== fitting.fittingPolicyId) return false;
    byCandidate.add(fitting.candidateId);
    byIncoming.add(fitting.incomingElementIndex);
    represented.add(fitting.candidateId);
    return fitting.geometryDisposition === 'MATCHES_AUTHORITY'
      && fitting.writerDisposition === 'READY' && bendMatchesAuthority(element.bend, fitting);
  });
  const elementCandidates = authority.elementAuthorities
    .map((item) => item.fittingCandidateId).filter(Boolean);
  const noUnexpectedBends = plan.elements.every((element, index) => {
    const candidateId = authority.elementAuthorities[index]?.fittingCandidateId;
    return candidateId ? represented.has(candidateId) : element.bend == null;
  });
  return valid && noUnexpectedBends && elementCandidates.length === authority.fittingAuthorities.length
    && new Set(elementCandidates).size === authority.fittingAuthorities.length;
}
function countStructureValid(plan, authority) {
  if (!plain(plan.counts) || plan.counts.numElt !== plan.elements.length) return false;
  const bendCount = plan.elements.filter((element) => element.bend != null).length;
  const fittingCount = authority.fittingAuthorities.filter((item) =>
    item.geometryDisposition === 'MATCHES_AUTHORITY' && item.writerDisposition === 'READY').length;
  const zeroFields = ['numNoz', 'noHgrs', 'numRigid', 'numExpJnt', 'numRest',
    'numForcMnt', 'numUnfLoad', 'numWind', 'numEleOff', 'numAllow', 'numISect'];
  return plan.counts.numBend === bendCount && bendCount === fittingCount
    && zeroFields.every((key) => plan.counts[key] === 0);
}
function profileWriterDiagnostic(plan) {
  if (!plan.profileAuthorityPlan) return null;
  const authority = plan.profileAuthorityPlan;
  const documentReady = plan.ready === true && Array.isArray(plan.diagnostics)
    && Array.isArray(plan.blockerCodes) && plan.diagnostics.length === 0
    && plan.blockerCodes.length === 0;
  const valid = documentReady && authorityStructureValid(plan, authority)
    && fittingStructureValid(plan, authority) && countStructureValid(plan, authority);
  return valid ? null : {
    code: 'PIPELINE_INPUTXML_WRITER_BLOCKED',
    message: 'Profile-aware document authority does not match writer input.', details: {},
  };
}
function assertDocumentReady(plan) {
  const writerDiagnostic = profileWriterDiagnostic(plan);
  if (plan.ready && !writerDiagnostic) return;
  const first = plan.ready && writerDiagnostic
    ? writerDiagnostic : plan.diagnostics?.[0] || writerDiagnostic;
  const error = new Error(first?.message || 'Canonical InputXML document planning failed.');
  error.code = first?.code || 'PIPELINE_INPUTXML_DOCUMENT_BLOCKED';
  error.details = first?.details || {};
  error.blockerCodes = plan.blockerCodes || [];
  throw error;
}
function rootAttributes(plan, profile) { return profile.mode === 'CAESAR_14' ? attributes(caesar14RootAttributeEntries(plan)) : [attr('xmlns', plan.namespace), attr('xmlns:ext', plan.extensionNamespace), attr('VERSION', plan.version), attr('XML_TYPE', plan.xmlType)]; }
export function buildInputXmlPipingModelXml(input, coordinateRows = [], bendResolution = null) {
  const plan = resolvedPlan(input, coordinateRows, bendResolution);
  assertDocumentReady(plan);
  const profile = resolvePipelineCaesarWriterProfile(plan.version);
  const root = rootAttributes(plan, profile);
  const model = modelAttributes(plan, profile);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<CAESARII ${root.join(' ')}>`,
    `<PIPINGMODEL ${model.join(' ')}>`,
    ...plan.elements.map((element) => pipingElementXml(element, profile)),
    '</PIPINGMODEL>',
    '</CAESARII>',
  ].join('\n');
}
export const _internal = { toMm, bendXml, usableCurvatureNodes, propertyAttributes, modelAttributes, profileWriterDiagnostic, bendMatchesAuthority };

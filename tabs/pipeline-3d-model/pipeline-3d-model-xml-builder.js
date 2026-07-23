// Builds deterministic canonical CAESAR II InputXML from resolved Pipeline evidence.
// Coordinate row identity: branch, line, node number, node name, source and XYZ.

import {
  buildPipelineInputXmlDocumentPlan,
  PIPELINE_INPUTXML_DOCUMENT_SCHEMA,
} from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-base-039-1';
import {
  resolvePipelineIdentityContext,
  resolvePipelineNodeIdentity,
} from './pipeline-3d-model-identity.js?v=20260722-p3d-identity-1';

const M_TO_MM = 1000;
const NODE_NUMBER_START = 100;
const NODE_NUMBER_STEP = 10;

function toMm(meters) {
  return Math.round(Number(meters || 0) * M_TO_MM * 1000) / 1000;
}

export function buildCoordinateRows(combinedPoints, identityInput = {}) {
  const identity = resolvePipelineIdentityContext(identityInput);
  return combinedPoints.map((point, index) => {
    const node = resolvePipelineNodeIdentity(point);
    return {
      branchName: identity.branchName,
      lineNo: identity.lineNo,
      nodeNumber: NODE_NUMBER_START + index * NODE_NUMBER_STEP,
      x: toMm(point.x),
      y: toMm(point.y),
      z: toMm(point.z),
      nodeName: node.nodeName,
      nodeNameSource: node.nodeNameSource,
      horizontal: point.horizontal,
    };
  });
}

export function coordinateRowsToTabText(rows) {
  const header = [
    'BranchName', 'LineNo', 'NodeNumber', 'X(mm)', 'Y(mm)', 'Z(mm)',
    'NodeName', 'NodeNameSource',
  ].join('\t');
  const lines = rows.map((row) => [
    row.branchName, row.lineNo, row.nodeNumber, row.x, row.y, row.z,
    row.nodeName, row.nodeNameSource,
  ].join('\t'));
  return [header, ...lines].join('\n');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function attr(name, value) {
  return `${name}="${esc(value)}"`;
}

function optionalAttr(attrs, name, value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return;
  attrs.push(attr(name, Number(value)));
}

function optionalTextAttr(attrs, name, value) {
  const valueText = String(value ?? '').trim();
  if (valueText) attrs.push(attr(name, valueText));
}

function usableCurvatureNodes(bend) {
  const turnAngleDeg = Number(bend?.turnAngleDeg);
  return (bend?.curvatureNodes || []).filter((node) => {
    const angle = Number(node?.angleDeg);
    const nodeNumber = Number(node?.nodeNumber);
    return Number.isFinite(angle) && angle >= 0
      && Number.isInteger(nodeNumber) && nodeNumber > 0
      && (!Number.isFinite(turnAngleDeg) || angle < turnAngleDeg - 1e-7);
  }).slice(0, 3);
}

function bendXml(bend) {
  const radius = Number(bend?.radiusMm);
  if (!Number.isFinite(radius) || radius <= 0) return '';
  const attrs = [attr('RADIUS', radius)];
  const typeCode = Number(bend?.bendTypeCode);
  if (Number.isInteger(typeCode)) attrs.push(attr('TYPE', typeCode));
  usableCurvatureNodes(bend).forEach((node, index) => {
    const slot = index + 1;
    attrs.push(attr(`ANGLE${slot}`, Number(node.angleDeg)));
    attrs.push(attr(`NODE${slot}`, Number(node.nodeNumber)));
  });
  attrs.push(attr('NUM_MITER', 0));
  optionalAttr(attrs, 'FITTINGTHICKNESS', bend?.fittingThicknessMm);
  optionalAttr(attrs, 'KFACTOR', bend?.kfactor);
  return `<BEND ${attrs.join(' ')}/>`;
}

function propertyAttributes(properties) {
  const attrs = [];
  optionalAttr(attrs, 'DIAMETER', properties?.diameter);
  optionalAttr(attrs, 'WALL_THICK', properties?.wallThickness);
  optionalAttr(attrs, 'INSUL_THICK', properties?.insulationThickness);
  optionalAttr(attrs, 'CORR_ALLOW', properties?.corrosionAllowance);
  (properties?.temperatures || []).forEach((value, index) =>
    optionalAttr(attrs, `TEMP_EXP_C${index + 1}`, value));
  (properties?.pressures || []).forEach((value, index) =>
    optionalAttr(attrs, `PRESSURE_C${index + 1}`, value));
  optionalAttr(attrs, 'HYDRO_PRESSURE', properties?.hydroPressure);
  optionalAttr(attrs, 'INSUL_DENSITY', properties?.insulationDensity);
  optionalAttr(attrs, 'FLUID_DENSITY', properties?.fluidDensity);
  optionalAttr(attrs, 'MATERIAL_NUM', properties?.materialNumber);
  return attrs;
}

function pipingElementXml(element) {
  const attrs = [
    attr('ID', element.id),
    attr('FROM_NODE', element.fromNode),
    attr('TO_NODE', element.toNode),
    attr('DELTA_X', element.deltaX),
    attr('DELTA_Y', element.deltaY),
    attr('DELTA_Z', element.deltaZ),
    ...propertyAttributes(element.emittedProperties ?? element.properties),
  ];
  optionalTextAttr(attrs, 'FROM_NAME', element.fromName);
  optionalTextAttr(attrs, 'TO_NAME', element.toName);
  attrs.push(attr('LINE', element.line));
  attrs.push(attr('FROM_X', element.fromX));
  attrs.push(attr('FROM_Y', element.fromY));
  attrs.push(attr('FROM_Z', element.fromZ));
  attrs.push(attr('TO_X', element.toX));
  attrs.push(attr('TO_Y', element.toY));
  attrs.push(attr('TO_Z', element.toZ));
  const child = bendXml(element.bend);
  if (!child) return `<PIPINGELEMENT ${attrs.join(' ')}/>`;
  return `<PIPINGELEMENT ${attrs.join(' ')}>\n${child}\n</PIPINGELEMENT>`;
}

function modelAttributes(plan) {
  const { metadata, counts } = plan;
  const attrs = [attr('JOBNAME', metadata.jobName)];
  optionalTextAttr(attrs, 'TIME', metadata.timeText);
  optionalTextAttr(attrs, 'ISSUE_NO', metadata.issueNo);
  attrs.push(
    attr('NUMELT', counts.numElt),
    attr('NUMNOZ', counts.numNoz),
    attr('NOHGRS', counts.noHgrs),
    attr('NUMBEND', counts.numBend),
    attr('NUMRIGID', counts.numRigid),
    attr('NUMEXPJNT', counts.numExpJnt),
    attr('NUMREST', counts.numRest),
    attr('NUMFORCMNT', counts.numForcMnt),
    attr('NUMUNFLOAD', counts.numUnfLoad),
    attr('NUMWIND', counts.numWind),
    attr('NUMELEOFF', counts.numEleOff),
    attr('NUMALLOW', counts.numAllow),
    attr('NUMISECT', counts.numISect),
    attr('NORTH_X', metadata.northX),
    attr('NORTH_Y', metadata.northY),
    attr('NORTH_Z', metadata.northZ),
  );
  return attrs;
}

function resolvedPlan(input, coordinateRows, bendResolution) {
  if (input?.schema === PIPELINE_INPUTXML_DOCUMENT_SCHEMA) return input;
  return buildPipelineInputXmlDocumentPlan({
    exportContext: input,
    coordinateRows,
    bendResolution,
  });
}

function assertDocumentReady(plan) {
  if (plan.ready) return;
  const first = plan.diagnostics?.[0];
  const error = new Error(first?.message || 'Canonical InputXML document planning failed.');
  error.code = first?.code || 'PIPELINE_INPUTXML_DOCUMENT_BLOCKED';
  error.details = first?.details || {};
  error.blockerCodes = plan.blockerCodes || [];
  throw error;
}

export function buildInputXmlPipingModelXml(input, coordinateRows = [], bendResolution = null) {
  const plan = resolvedPlan(input, coordinateRows, bendResolution);
  assertDocumentReady(plan);
  const rootAttrs = [
    attr('xmlns', plan.namespace),
    attr('xmlns:ext', plan.extensionNamespace),
    attr('VERSION', plan.version),
    attr('XML_TYPE', plan.xmlType),
  ];
  const modelAttrs = [attr('xmlns', ''), ...modelAttributes(plan)];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<CAESARII ${rootAttrs.join(' ')}>`,
    `<PIPINGMODEL ${modelAttrs.join(' ')}>`,
    ...plan.elements.map(pipingElementXml),
    '</PIPINGMODEL>',
    '</CAESARII>',
  ].join('\n');
}

export const _internal = {
  toMm, bendXml, usableCurvatureNodes, propertyAttributes, modelAttributes,
};

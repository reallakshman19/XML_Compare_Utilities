import {
  assertEngineeringRevisionToken,
  createEngineeringRevisionToken,
  freezeJsonValue,
} from '../../core/engineering-scene/index.js';

export const PIPELINE_ENGINEERING_SVG_VIEW_MODEL_SCHEMA = 'PipelineEngineeringSvgViewModel.v1';
export const PIPELINE_ENGINEERING_REVISION_SCHEMA = 'PipelineEngineeringRevision.v1';

const REQUIRED_REVISION_PARTS = Object.freeze([
  'projectRevision', 'geometryRevision', 'processConfigRevision',
]);

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(value) {
  return String(value ?? '').trim();
}

function finiteOrNull(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function requiredRevisionPart(parts, key) {
  if (!Object.prototype.hasOwnProperty.call(parts, key) || parts[key] === undefined) {
    throw new TypeError(`Pipeline engineering revision requires ${key}.`);
  }
  return parts[key];
}

export function createPipelineEngineeringRevisionToken(parts = {}) {
  const value = Object.fromEntries(REQUIRED_REVISION_PARTS.map((key) => [
    key, requiredRevisionPart(parts, key),
  ]));
  return createEngineeringRevisionToken({
    schema: PIPELINE_ENGINEERING_REVISION_SCHEMA,
    owner: 'pipeline-3d-model',
    ...value,
  });
}

function parseCoordinateText(source) {
  const lines = String(source ?? '').split(/\r?\n/).filter((line) => line.trim());
  return lines.slice(1).map((line, index) => {
    const [branchName, nodeNumber, x, y, z, nodeName = ''] = line.split('\t');
    return {
      sourceLine: index + 2,
      branchName: text(branchName),
      nodeNumber: finiteOrNull(nodeNumber),
      x: finiteOrNull(x),
      y: finiteOrNull(y),
      z: finiteOrNull(z),
      nodeName,
    };
  });
}

function xmlAttributes(source) {
  return Object.fromEntries([...String(source).matchAll(/([A-Z][A-Z0-9_]*)="([^"]*)"/g)]
    .map((match) => [match[1], match[2]]));
}

function decodeXml(value) {
  return String(value ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (match, entity) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'",
  }[entity] || match));
}

function parseInputXmlElements(source) {
  return [...String(source ?? '').matchAll(/<PIPINGELEMENT\b([^>]*)\/>/g)].map((match, index) => {
    const attributes = xmlAttributes(match[1]);
    return {
      elementNumber: index + 1,
      fromNode: finiteOrNull(attributes.FROM_NODE),
      toNode: finiteOrNull(attributes.TO_NODE),
      deltaX: finiteOrNull(attributes.DELTA_X),
      deltaY: finiteOrNull(attributes.DELTA_Y),
      deltaZ: finiteOrNull(attributes.DELTA_Z),
      lineNo: decodeXml(attributes.LINE),
      fromName: decodeXml(attributes.FROM_NAME),
      toName: decodeXml(attributes.TO_NAME),
    };
  });
}

function pointFromRow(row) {
  const point = { x: finiteOrNull(row.x), y: finiteOrNull(row.y), z: finiteOrNull(row.z) };
  return Object.values(point).every((value) => value !== null) ? point : null;
}

function rowIdentity(row) {
  const branchName = text(row.branchName);
  const nodeNumber = finiteOrNull(row.nodeNumber);
  return branchName && Number.isInteger(nodeNumber) ? `pipeline:${branchName}:node:${nodeNumber}` : '';
}

function sources(combined) {
  const result = values(combined.sources).map(text).filter(Boolean);
  const source = text(combined.source);
  if (source && !result.includes(source)) result.push(source);
  return result;
}

function rowCategory(eventSources) {
  if (eventSources.includes('marker')) return 'markers';
  if (eventSources.some((source) => source.startsWith('table3-z-'))) return 'depthEvents';
  if (eventSources.includes('table3-anchor')) return 'referenceEvents';
  if (eventSources.includes('table2')) return 'gradeEvents';
  if (eventSources.includes('vertex')) return 'routeVertices';
  return 'coordinateRows';
}

function prepareRows(output) {
  const combinedRows = values(output.combined).map(record);
  return values(output.coordinateRows).map((sourceRow, index) => {
    const row = record(sourceRow);
    const combined = combinedRows[index] || null;
    const eventSources = sources(combined || {});
    return {
      id: rowIdentity(row),
      category: rowCategory(eventSources),
      branchName: text(row.branchName),
      nodeNumber: finiteOrNull(row.nodeNumber),
      nodeName: row.nodeName ?? '',
      point: pointFromRow(row),
      horizontal: finiteOrNull(row.horizontal ?? combined?.horizontal),
      grade: finiteOrNull(combined?.grade),
      elevationAuthority: text(combined?.elevationAuthority),
      eventSources,
      markerEvidence: values(combined?.markerEvidence).map(record),
      sourceIndex: index,
    };
  });
}

function prepareSegments(rows, xmlElements) {
  return rows.slice(1).map((toRow, index) => {
    const fromRow = rows[index];
    const xmlElement = xmlElements[index] || null;
    const id = fromRow.id && toRow.id
      ? `pipeline:${fromRow.branchName}:segment:${fromRow.nodeNumber}-${toRow.nodeNumber}`
      : '';
    return {
      id,
      category: 'routeSegments',
      fromId: fromRow.id,
      toId: toRow.id,
      start: fromRow.point,
      end: toRow.point,
      fromNode: fromRow.nodeNumber,
      toNode: toRow.nodeNumber,
      delta: fromRow.point && toRow.point ? {
        x: toRow.point.x - fromRow.point.x,
        y: toRow.point.y - fromRow.point.y,
        z: toRow.point.z - fromRow.point.z,
      } : null,
      xmlElement,
      sourceIndex: index,
    };
  });
}

export function preparePipelineEngineeringSvgViewModel(snapshotValue) {
  if (snapshotValue?.schema === PIPELINE_ENGINEERING_SVG_VIEW_MODEL_SCHEMA) {
    assertEngineeringRevisionToken(snapshotValue.revision, 'pipelineViewModel.revision');
    return freezeJsonValue(snapshotValue);
  }
  const snapshot = record(snapshotValue);
  const output = record(snapshot.output);
  const revision = assertEngineeringRevisionToken(snapshot.revision, 'pipelineSnapshot.revision');
  const coordinateTextRows = parseCoordinateText(output.coordinateText);
  const inputXmlElements = parseInputXmlElements(output.xmlText);
  const coordinateRows = prepareRows(output);
  const routeSegments = prepareSegments(coordinateRows, inputXmlElements);
  return freezeJsonValue({
    schema: PIPELINE_ENGINEERING_SVG_VIEW_MODEL_SCHEMA,
    revision,
    branchInfo: record(snapshot.branchInfo),
    coordinateRows,
    routeSegments,
    coordinateTextRows,
    inputXmlElements,
    diagnostics: record(output.diagnostics),
    warnings: values(output.warnings),
    authority: {
      outputContract: 'buildPipelineProjectOutputs',
      spatialSource: 'coordinateRows',
      unit: 'mm',
      verticalAxis: 'Z',
      frame: 'GLOBAL',
    },
  });
}

export const _test = Object.freeze({
  decodeXml, finiteOrNull, parseCoordinateText, parseInputXmlElements, rowCategory, rowIdentity,
});

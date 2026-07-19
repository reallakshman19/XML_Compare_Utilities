import {
  createEngineeringScene,
  createEngineeringSceneEntity,
  createPointGeometry,
  createSegmentGeometry,
  freezeJsonValue,
} from '../../core/engineering-scene/index.js';
import { preparePipelineEngineeringSvgViewModel } from './pipeline-engineering-svg-view-model.js';

export const PIPELINE_ENGINEERING_SVG_PARITY_SCHEMA = 'PipelineEngineeringSvgParityReport.v1';

const ROW_CATEGORIES = Object.freeze([
  'routeVertices', 'gradeEvents', 'depthEvents', 'markers', 'referenceEvents', 'coordinateRows',
]);
const CATEGORY_ORDER = Object.freeze(['routeSegments', ...ROW_CATEGORIES]);
const DOMAIN_TYPES = Object.freeze({
  routeSegments: 'PIPELINE_ROUTE_SEGMENT',
  routeVertices: 'PIPELINE_ROUTE_VERTEX',
  gradeEvents: 'PIPELINE_GRADE_EVENT',
  depthEvents: 'PIPELINE_DEPTH_EVENT',
  markers: 'PIPELINE_MARKER',
  referenceEvents: 'PIPELINE_REFERENCE_EVENT',
  coordinateRows: 'PIPELINE_COORDINATE_ROW',
});

function samePoint(left, right) {
  return Boolean(left && right
    && left.x === right.x && left.y === right.y && left.z === right.z);
}

function duplicateValues(values) {
  const seen = new Set(), duplicates = new Set();
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates].sort();
}

function categoryTotals(viewModel) {
  const expected = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));
  expected.routeSegments = viewModel.routeSegments.length;
  viewModel.coordinateRows.forEach((row) => { expected[row.category] += 1; });
  return expected;
}

function invalidCoordinates(viewModel) {
  const rows = viewModel.coordinateRows.filter((row) => !row.point).map((row) => ({
    id: row.id, sourceIndex: row.sourceIndex, category: row.category,
  }));
  const segments = viewModel.routeSegments.filter((segment) => !segment.start || !segment.end).map((segment) => ({
    id: segment.id, sourceIndex: segment.sourceIndex, category: segment.category,
  }));
  return [...rows, ...segments];
}

function unresolvedReferences(viewModel) {
  const rowIds = new Set(viewModel.coordinateRows.map((row) => row.id).filter(Boolean));
  return viewModel.routeSegments.flatMap((segment) => {
    const missing = [segment.fromId, segment.toId].filter((id) => !id || !rowIds.has(id));
    return missing.length ? [{ segmentId: segment.id, missing }] : [];
  });
}

function routeDiscontinuities(viewModel) {
  const issues = [];
  viewModel.routeSegments.forEach((segment, index) => {
    const from = viewModel.coordinateRows[index], to = viewModel.coordinateRows[index + 1];
    if (!from || !to || segment.fromId !== from.id || segment.toId !== to.id
      || !samePoint(segment.start, from.point) || !samePoint(segment.end, to.point)) {
      issues.push({ segmentId: segment.id, reason: 'SEGMENT_ENDPOINT_PARITY' });
    }
    const previous = viewModel.routeSegments[index - 1];
    if (previous && (previous.toId !== segment.fromId || !samePoint(previous.end, segment.start))) {
      issues.push({ segmentId: segment.id, reason: 'SEQUENTIAL_ROUTE_CONTINUITY' });
    }
  });
  return issues;
}

function coordinateRowMismatches(viewModel) {
  const textRows = viewModel.coordinateTextRows;
  const mismatches = [];
  if (textRows.length !== viewModel.coordinateRows.length) {
    mismatches.push({ reason: 'COORDINATE_ROW_COUNT', expected: viewModel.coordinateRows.length, actual: textRows.length });
  }
  viewModel.coordinateRows.forEach((row, index) => {
    const textRow = textRows[index];
    if (!textRow || textRow.branchName !== row.branchName || textRow.nodeNumber !== row.nodeNumber
      || !samePoint(textRow, row.point) || textRow.nodeName !== row.nodeName) {
      mismatches.push({ reason: 'COORDINATE_ROW_VALUE', sourceIndex: index, id: row.id });
    }
  });
  return mismatches;
}

function xmlMismatches(viewModel) {
  const mismatches = [];
  if (viewModel.inputXmlElements.length !== viewModel.routeSegments.length) {
    mismatches.push({ reason: 'INPUTXML_ELEMENT_COUNT', expected: viewModel.routeSegments.length, actual: viewModel.inputXmlElements.length });
  }
  viewModel.routeSegments.forEach((segment, index) => {
    const xml = viewModel.inputXmlElements[index];
    const from = viewModel.coordinateRows[index], to = viewModel.coordinateRows[index + 1];
    if (!xml || xml.fromNode !== segment.fromNode || xml.toNode !== segment.toNode
      || !samePoint({ x: xml.deltaX, y: xml.deltaY, z: xml.deltaZ }, segment.delta)
      || xml.fromName !== from?.nodeName || xml.toName !== to?.nodeName) {
      mismatches.push({ reason: 'INPUTXML_ELEMENT_VALUE', sourceIndex: index, segmentId: segment.id });
    }
  });
  return mismatches;
}

function propertyCoverageGaps(viewModel) {
  const gaps = viewModel.coordinateRows.flatMap((row) => (
    row.id && row.category && row.branchName && row.nodeNumber !== null ? [] : [{ id: row.id, category: row.category }]
  ));
  return gaps;
}

function mappedTotals(viewModel) {
  const mapped = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));
  viewModel.routeSegments.forEach((segment) => {
    if (segment.id && segment.start && segment.end) mapped.routeSegments += 1;
  });
  viewModel.coordinateRows.forEach((row) => {
    if (row.id && row.point) mapped[row.category] += 1;
  });
  return mapped;
}

export function buildPipelineEngineeringSvgParityReport(viewModelValue) {
  const viewModel = preparePipelineEngineeringSvgViewModel(viewModelValue);
  const allIds = [...viewModel.routeSegments, ...viewModel.coordinateRows].map((value) => value.id);
  const expectedByCategory = categoryTotals(viewModel);
  const mappedByCategory = mappedTotals(viewModel);
  const omittedEntities = CATEGORY_ORDER.flatMap((category) => {
    const omitted = expectedByCategory[category] - mappedByCategory[category];
    return omitted ? [{ category, omitted }] : [];
  });
  const report = {
    schema: PIPELINE_ENGINEERING_SVG_PARITY_SCHEMA,
    revision: viewModel.revision,
    expectedByCategory,
    mappedByCategory,
    omittedEntities,
    duplicateIds: duplicateValues(allIds),
    invalidCoordinates: invalidCoordinates(viewModel),
    unresolvedReferences: unresolvedReferences(viewModel),
    routeDiscontinuities: routeDiscontinuities(viewModel),
    coordinateRowMismatches: coordinateRowMismatches(viewModel),
    inputXmlMismatches: xmlMismatches(viewModel),
    propertyCoverageGaps: propertyCoverageGaps(viewModel),
    totalExpected: Object.values(expectedByCategory).reduce((sum, value) => sum + value, 0),
    totalMapped: Object.values(mappedByCategory).reduce((sum, value) => sum + value, 0),
  };
  const issueKeys = ['omittedEntities', 'duplicateIds', 'invalidCoordinates', 'unresolvedReferences',
    'routeDiscontinuities', 'coordinateRowMismatches', 'inputXmlMismatches', 'propertyCoverageGaps'];
  report.passed = issueKeys.every((key) => report[key].length === 0) && report.totalMapped === report.totalExpected;
  return freezeJsonValue(report);
}

export function assertPipelineEngineeringSvgParity(report) {
  if (report?.schema !== PIPELINE_ENGINEERING_SVG_PARITY_SCHEMA) throw new TypeError('Pipeline parity report is invalid.');
  if (!report.passed) {
    const first = ['duplicateIds', 'invalidCoordinates', 'unresolvedReferences', 'routeDiscontinuities',
      'coordinateRowMismatches', 'inputXmlMismatches', 'propertyCoverageGaps', 'omittedEntities']
      .find((key) => report[key]?.length);
    throw new Error(`Pipeline engineering SVG parity failed: ${first || 'unknown parity failure'}.`);
  }
  return report;
}

function rowEntity(row) {
  return createEngineeringSceneEntity({
    id: row.id,
    kind: 'point',
    domainType: DOMAIN_TYPES[row.category],
    geometry: createPointGeometry(row.point),
    domainRef: { owner: 'pipeline-3d-model', category: row.category, branchName: row.branchName, nodeNumber: row.nodeNumber },
    propertySetIds: [`pipeline:properties:${row.id}`],
    editCapabilities: [],
    layer: `pipeline-${row.category.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}`,
    renderOrder: 20,
    metadata: { pipeline: row },
  });
}

function segmentEntity(segment, branchName) {
  return createEngineeringSceneEntity({
    id: segment.id,
    kind: 'segment',
    domainType: DOMAIN_TYPES.routeSegments,
    geometry: createSegmentGeometry(segment.start, segment.end),
    domainRef: { owner: 'pipeline-3d-model', category: 'routeSegments', branchName, fromNode: segment.fromNode, toNode: segment.toNode },
    propertySetIds: [`pipeline:properties:${segment.id}`],
    editCapabilities: [],
    layer: 'pipeline-route',
    renderOrder: 10,
    metadata: { pipeline: segment },
  });
}

export function buildPipelineEngineeringSvgScene(snapshotValue, options = {}) {
  const viewModel = preparePipelineEngineeringSvgViewModel(snapshotValue);
  const sceneId = String(options.sceneId ?? '').trim();
  if (!sceneId) throw new TypeError('Pipeline engineering SVG requires an explicit sceneId.');
  const parity = assertPipelineEngineeringSvgParity(buildPipelineEngineeringSvgParityReport(viewModel));
  const branchName = viewModel.coordinateRows[0]?.branchName || '';
  const entities = [
    ...viewModel.routeSegments.map((segment) => segmentEntity(segment, branchName)),
    ...viewModel.coordinateRows.map(rowEntity),
  ];
  const scene = createEngineeringScene({
    sceneId,
    revision: viewModel.revision,
    coordinateSystem: { unit: 'mm', verticalAxis: 'Z', frame: 'GLOBAL', handedness: 'right' },
    projections: ['ISO', 'XY', 'XZ', 'YZ'],
    entities,
    capabilities: { selection: true, properties: true, editing: false },
    metadata: {
      pipeline: {
        authority: viewModel.authority,
        diagnostics: viewModel.diagnostics,
        parity,
        scenePropertySetId: `pipeline:scene-properties:${sceneId}`,
      },
    },
  });
  return Object.freeze({ scene, parity, viewModel });
}

export const _test = Object.freeze({ samePoint, duplicateValues, coordinateRowMismatches, xmlMismatches });

import {
  groupPointsIntoSheets,
  parseTable1,
  table1ToTabText,
} from './pipeline-3d-model-geometry.js';
import { PipelineProfileModel } from './pipeline-3d-model-cad-model.js';
import {
  buildElasticBendLedgerText,
  resolvePipelineElasticBends,
} from './pipeline-3d-model-elastic-bend.js?v=20260721-bend-policy-v3-1';
import { loadElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js?v=20260721-bend-policy-v3-1';
import {
  buildCoordinateRows,
  buildInputXmlPipingModelXml,
  coordinateRowsToTabText,
} from './pipeline-3d-model-xml-builder.js';
import {
  buildDepthRules,
  buildGradeProfile,
  buildProfileRouteContext,
} from './pipeline-3d-model-profile-coordinate-map.js';
import {
  assertPlausibleProfileSegments,
  buildDepthEvents,
  buildMarkerEvents,
  buildTable2Events,
  buildTable3AnchorEvents,
  buildVertexEvents,
  materializeProfileEvents,
} from './pipeline-3d-model-profile-events.js?v=20260719-table2-elevation-authority-1';
import {
  buildDerivedTable2Text,
  buildDerivedTable3Text,
  buildTable2XText,
  buildTable3XText,
} from './pipeline-3d-model-profile-output.js';
import { addPipelineWarning } from './pipeline-3d-model-warning-log.js';

const PLACEHOLDER_POINT_LABEL = /^at\s+point\s+X\s*=\s*Y\s*=\s*Z\s*=$/i;

export function sanitizeTable1Label(label, index) {
  const value = String(label || '').trim();
  if (!value || PLACEHOLDER_POINT_LABEL.test(value)) return `T1-${String(index + 1).padStart(3, '0')}`;
  return value;
}

function sanitizeTable1Points(points) {
  return points.map((point, index) => ({ ...point, label: sanitizeTable1Label(point.label, index) }));
}

function diagnostics(context, profile, gradeRows, maxSegment, elasticBends) {
  return Object.freeze({
    routeLength: context.total,
    routeStartStation: context.routeStartStation,
    table3OriginRoute: context.table3OriginRoute,
    stationSlope: context.stationAlignment.slope,
    stationResidual: context.stationAlignment.maxResidual,
    maxSegment,
    warningCount: context.warnings.length,
    elevationAuthority: 'TABLE_2',
    table2Rows: gradeRows.length,
    table3LengthRows: profile.table3LengthRows.length,
    table3DepthRows: profile.table3DepthRows.length,
    table3MarkerRows: profile.table3MarkerRows.length,
    elasticBendCandidates: elasticBends.diagnostics.candidateCount,
    elasticBendsEmitted: elasticBends.diagnostics.emittedCount,
    bendBlockingErrors: elasticBends.diagnostics.blockedCount,
    sharedBendSegmentFailures: elasticBends.diagnostics.sharedSegmentFailureCount,
    markerRowsExcludedFromInputXml: elasticBends.diagnostics.excludedMarkerCount,
  });
}

function elasticSettings(input) {
  return input.elasticBendSettings || loadElasticBendSettings(globalThis.localStorage);
}

function appendElasticDiagnostics(context, elasticBends) {
  for (const item of [...elasticBends.warnings, ...elasticBends.errors]) {
    const message = item.severity === 'BLOCKING' ? `[BLOCKING] ${item.message}` : item.message;
    addPipelineWarning(context.warnings, item.code, message, item.details);
  }
}

function buildXmlText(branchInfo, elasticBends) {
  if (elasticBends.hasBlockingErrors) return '';
  return buildInputXmlPipingModelXml(branchInfo, elasticBends.geometryRows, elasticBends);
}

function outputBundle(input, profile, context, gradeRows, table1Points, sheets, combined, maxSegment) {
  const coordinateRows = buildCoordinateRows(combined, input.branchInfo.branchName);
  const elasticBends = resolvePipelineElasticBends({
    points: combined,
    coordinateRows,
    branchInfo: input.branchInfo,
    settings: elasticSettings(input),
  });
  appendElasticDiagnostics(context, elasticBends);
  return Object.freeze({
    table1Points, sheets, combined, coordinateRows,
    inputXmlCoordinateRows: elasticBends.geometryRows,
    elasticBends,
    table1OutputText: table1ToTabText(table1Points),
    table2Text: buildDerivedTable2Text(gradeRows),
    table3Text: buildDerivedTable3Text(combined),
    table2XText: buildTable2XText(profile),
    table3XText: buildTable3XText(profile),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    elasticBendText: buildElasticBendLedgerText(elasticBends),
    xmlText: buildXmlText(input.branchInfo, elasticBends),
    warnings: Object.freeze([...context.warnings]),
    errors: elasticBends.errors,
    diagnostics: diagnostics(context, profile, gradeRows, maxSegment, elasticBends),
  });
}

export function buildAuthoritativePipelineOutputs(input) {
  const profile = PipelineProfileModel.fromRaw(input.profileRaw);
  const table1Points = sanitizeTable1Points(parseTable1(input.table1Text));
  const sheets = groupPointsIntoSheets(table1Points);
  const context = buildProfileRouteContext(table1Points, profile);
  const gradeRows = buildGradeProfile(profile, context);
  const table3MarkerRules = buildDepthRules(profile, context);
  const events = [
    ...buildVertexEvents(table1Points, context.segments),
    ...buildTable2Events(gradeRows),
    ...buildTable3AnchorEvents(profile, context),
    ...buildDepthEvents(table3MarkerRules),
    ...buildMarkerEvents(profile, context),
  ];
  const combined = materializeProfileEvents(events, context, gradeRows);
  const maxSegment = assertPlausibleProfileSegments(combined, context.total, context.warnings);
  return outputBundle(input, profile, context, gradeRows, table1Points, sheets, combined, maxSegment);
}

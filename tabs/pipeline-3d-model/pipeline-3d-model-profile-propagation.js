import {
  groupPointsIntoSheets,
  parseTable1,
  table1ToTabText,
} from './pipeline-3d-model-geometry.js';
import { PipelineProfileModel } from './pipeline-3d-model-cad-model.js';
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
} from './pipeline-3d-model-profile-events.js';
import {
  buildDerivedTable2Text,
  buildDerivedTable3Text,
  buildTable2XText,
  buildTable3XText,
} from './pipeline-3d-model-profile-output.js';

function diagnostics(context, profile, gradeRows, maxSegment) {
  return Object.freeze({
    routeLength: context.total,
    routeStartStation: context.routeStartStation,
    table3OriginRoute: context.table3OriginRoute,
    stationSlope: context.stationAlignment.slope,
    stationResidual: context.stationAlignment.maxResidual,
    maxSegment,
    table2Rows: gradeRows.length,
    table3LengthRows: profile.table3LengthRows.length,
    table3DepthRows: profile.table3DepthRows.length,
    table3MarkerRows: profile.table3MarkerRows.length,
  });
}

function outputBundle(input, profile, context, gradeRows, table1Points, sheets, combined, maxSegment) {
  const coordinateRows = buildCoordinateRows(combined, input.branchInfo.branchName);
  return Object.freeze({
    table1Points, sheets, combined, coordinateRows,
    table1OutputText: table1ToTabText(table1Points),
    table2Text: buildDerivedTable2Text(gradeRows),
    table3Text: buildDerivedTable3Text(combined),
    table2XText: buildTable2XText(profile),
    table3XText: buildTable3XText(profile),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    xmlText: buildInputXmlPipingModelXml(input.branchInfo, coordinateRows),
    diagnostics: diagnostics(context, profile, gradeRows, maxSegment),
  });
}

export function buildAuthoritativePipelineOutputs(input) {
  const profile = PipelineProfileModel.fromRaw(input.profileRaw);
  const table1Points = parseTable1(input.table1Text);
  const sheets = groupPointsIntoSheets(table1Points);
  const context = buildProfileRouteContext(table1Points, profile);
  const gradeRows = buildGradeProfile(profile, context);
  const rules = buildDepthRules(profile, context);
  const events = [
    ...buildVertexEvents(table1Points, context.segments),
    ...buildTable2Events(gradeRows),
    ...buildTable3AnchorEvents(profile, context),
    ...buildDepthEvents(rules),
    ...buildMarkerEvents(profile, context),
  ];
  const combined = materializeProfileEvents(events, context, gradeRows, rules);
  const maxSegment = assertPlausibleProfileSegments(combined, context.total);
  return outputBundle(input, profile, context, gradeRows, table1Points, sheets, combined, maxSegment);
}

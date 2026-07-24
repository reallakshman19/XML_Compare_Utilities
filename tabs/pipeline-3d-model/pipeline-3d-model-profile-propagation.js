import { groupPointsIntoSheets, parseTable1, table1ToTabText } from './pipeline-3d-model-geometry.js';
import { PipelineProfileModel } from './pipeline-3d-model-cad-model.js';
import { buildElasticBendLedgerText } from './pipeline-3d-model-elastic-bend.js?v=20260724-p3d-core-050-1';
import { buildPipelineExportContextJson, qualifyPipelineUtilityExport,
  resolvePipelineUtilityExportContext } from './pipeline-3d-model-export-context.js?v=20260724-p3d-core-050-1';
import { buildPipelineIdentityLedgerText } from './pipeline-3d-model-identity.js?v=20260724-p3d-core-050-1';
import { buildPipelineInputXmlDocumentPlanJson } from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-base-039-1';
import { buildPipelinePropertySectionLedgerText,
  buildPipelinePropertySectionPlanJson } from './pipeline-3d-model-property-sections.js?v=20260722-p3d-property-sections-1';
import { buildCoordinateRows, coordinateRowsToTabText } from './pipeline-3d-model-xml-builder.js?v=20260722-p3d-base-039-1';
import { buildDepthRules, buildGradeProfile,
  buildProfileRouteContext } from './pipeline-3d-model-profile-coordinate-map.js';
import { assertPlausibleProfileSegments, buildDepthEvents, buildMarkerEvents,
  buildTable2Events, buildTable3AnchorEvents, buildVertexEvents,
  materializeProfileEvents } from './pipeline-3d-model-profile-events.js?v=20260719-table2-elevation-authority-1';
import { buildDerivedTable2Text, buildDerivedTable3Text,
  buildTable2XText, buildTable3XText } from './pipeline-3d-model-profile-output.js';
import { addPipelineWarning } from './pipeline-3d-model-warning-log.js';
import { loadPipelineEngineeringConfigurationDraft } from './pipeline-3d-model-engineering-configuration-storage.js';
import { buildPipelineEngineeringConfigurationPlan } from './pipeline-3d-model-engineering-configuration.js';
import { buildPipelineCoreOutputs } from './pipeline-3d-model-core-runtime.js';

const PLACEHOLDER_POINT_LABEL = /^at\s+point\s+X\s*=\s*Y\s*=\s*Z\s*=$/i;
const MODES = Object.freeze({ 'normal-metallic': 'default-metallic',
  'asme-b31.4': 'asme-b31.4', gre: 'gre' });
const zeroCounts = Object.freeze({ numElt: 0, numNoz: 0, noHgrs: 0, numBend: 0,
  numRigid: 0, numExpJnt: 0, numRest: 0, numForcMnt: 0, numUnfLoad: 0,
  numWind: 0, numEleOff: 0, numAllow: 0, numISect: 0 });
export function sanitizeTable1Label(label, index) {
  const value = String(label || '').trim();
  return !value || PLACEHOLDER_POINT_LABEL.test(value)
    ? `T1-${String(index + 1).padStart(3, '0')}` : value;
}
const sanitizeTable1Points = (points) => points.map((point, index) =>
  ({ ...point, label: sanitizeTable1Label(point.label, index) }));
function configuration(input) {
  if (input.configurationPlan?.schema === 'PipelineEngineeringConfigurationPlan.v1') {
    return input.configurationPlan;
  }
  return buildPipelineEngineeringConfigurationPlan(input.configurationDraft
    || loadPipelineEngineeringConfigurationDraft());
}
function exportSettings(plan) {
  const profileId = plan.analysisSections.length === 1 ? plan.analysisSections[0].profileId : '';
  return { ...plan.bendSettings, designBasis: MODES[profileId] || '',
    requestedDesignBasis: MODES[profileId] || '',
    explicitOutsideDiameterMm: plan.analysisSections[0]?.outsideDiameterMm ?? null };
}
function blockedProperty(core) {
  return core.propertySectionPlan || Object.freeze({ schema: 'PipelinePropertySectionPlan.v1',
    lineNo: core.configuration.branchInfo.lineNo, sectionCount: 0, sections: Object.freeze([]),
    elements: Object.freeze([]), diagnostics: core.diagnostics,
    blockerCodes: core.blockerCodes, ready: false });
}
function blockedDocument(core, propertySectionPlan) {
  return core.inputXmlDocumentPlan || Object.freeze({ schema: 'PipelineInputXmlDocumentPlan.v1',
    metadata: Object.freeze({ jobName: core.configuration.branchInfo.jobName,
      issueNo: core.configuration.branchInfo.issueNo,
      caesarVersion: core.configuration.branchInfo.caesarVersion }), counts: zeroCounts,
    propertySectionPlan, elements: Object.freeze([]), diagnostics: core.diagnostics,
    blockerCodes: core.blockerCodes, ready: false });
}
function appendDiagnostics(warnings, core) {
  for (const item of core.diagnostics) addPipelineWarning(warnings, item.code,
    item.severity === 'BLOCKING' ? `[BLOCKING] ${item.message}` : item.message, item.details);
}
function commonOutput(input, source, profileOutput = {}) {
  const plan = configuration(input), settings = exportSettings(plan);
  const exportContext = resolvePipelineUtilityExportContext({ branchInfo: plan.branchInfo, settings });
  const coordinateRows = buildCoordinateRows(source.combined, exportContext.identity);
  const core = buildPipelineCoreOutputs({ configurationPlan: plan, points: source.combined,
    coordinateRows, propertySections: input.propertySections, exportContext });
  const propertySectionPlan = blockedProperty(core), inputXmlDocumentPlan = blockedDocument(core, propertySectionPlan);
  const inputXmlRows = core.bendResolution?.geometryRows || coordinateRows;
  const exportQualification = qualifyPipelineUtilityExport(exportContext,
    inputXmlRows, core.bendResolution, inputXmlDocumentPlan);
  appendDiagnostics(source.warnings, core);
  return Object.freeze({ ...source, ...profileOutput, coordinateRows,
    identity: exportContext.identity,
    identityText: buildPipelineIdentityLedgerText(exportContext.identity, coordinateRows),
    configurationPlan: plan, orchestration: core, artifacts: core.artifacts,
    exportContext, exportQualification,
    exportContextText: buildPipelineExportContextJson(exportContext, exportQualification),
    inputXmlDocumentPlan,
    inputXmlDocumentPlanText: buildPipelineInputXmlDocumentPlanJson(inputXmlDocumentPlan),
    propertySectionPlan,
    propertySectionPlanText: buildPipelinePropertySectionPlanJson(propertySectionPlan),
    propertySectionLedgerText: buildPipelinePropertySectionLedgerText(propertySectionPlan),
    inputXmlCoordinateRows: inputXmlRows, elasticBends: core.bendResolution,
    table1OutputText: table1ToTabText(source.table1Points),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    elasticBendText: core.bendResolution ? buildElasticBendLedgerText(core.bendResolution) : '',
    xmlText: core.xmlText, warnings: Object.freeze([...source.warnings]),
    errors: core.diagnostics, diagnostics: Object.freeze({
      ...(profileOutput.profileDiagnostics || {}),
      pipelineMode: exportContext.profile.resolvedMode,
      configurationReady: plan.ready, orchestrationReady: core.ready,
      inputXmlElementCount: inputXmlDocumentPlan.counts?.numElt || 0,
      inputXmlBendCount: inputXmlDocumentPlan.counts?.numBend || 0,
      inputXmlDocumentBlockerCount: inputXmlDocumentPlan.blockerCodes?.length || 0,
      exportInputXmlAllowed: exportQualification.inputXmlAllowed,
      markerRowsExcludedFromInputXml: core.bendResolution?.diagnostics?.excludedMarkerCount || 0,
    }) });
}
export function buildPipelineNativeOutputBundle(input, source, profileOutput = {}) {
  return commonOutput(input, source, profileOutput);
}
export function buildAuthoritativePipelineOutputs(input) {
  const profile = PipelineProfileModel.fromRaw(input.profileRaw);
  const table1Points = sanitizeTable1Points(parseTable1(input.table1Text));
  const sheets = groupPointsIntoSheets(table1Points);
  const context = buildProfileRouteContext(table1Points, profile);
  const gradeRows = buildGradeProfile(profile, context), table3MarkerRules = buildDepthRules(profile, context);
  const events = [...buildVertexEvents(table1Points, context.segments), ...buildTable2Events(gradeRows),
    ...buildTable3AnchorEvents(profile, context), ...buildDepthEvents(table3MarkerRules),
    ...buildMarkerEvents(profile, context)];
  const combined = materializeProfileEvents(events, context, gradeRows);
  const maxSegment = assertPlausibleProfileSegments(combined, context.total, context.warnings);
  return commonOutput(input, { table1Points, sheets, combined, warnings: context.warnings }, {
    table2Text: buildDerivedTable2Text(gradeRows), table3Text: buildDerivedTable3Text(combined),
    table2XText: buildTable2XText(profile), table3XText: buildTable3XText(profile),
    profileDiagnostics: Object.freeze({ routeLength: context.total,
      routeStartStation: context.routeStartStation, table3OriginRoute: context.table3OriginRoute,
      stationSlope: context.stationAlignment.slope,
      stationResidual: context.stationAlignment.maxResidual, maxSegment,
      warningCount: context.warnings.length, elevationAuthority: 'TABLE_2',
      table2Rows: gradeRows.length, table3LengthRows: profile.table3LengthRows.length,
      table3DepthRows: profile.table3DepthRows.length,
      table3MarkerRows: profile.table3MarkerRows.length }),
  });
}

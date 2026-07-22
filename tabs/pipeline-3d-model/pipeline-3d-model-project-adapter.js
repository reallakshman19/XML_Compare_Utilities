/** Pipeline CAD adapter preserving native parsers and canonical InputXML writer ownership. */

import { buildSingleDocumentMigration } from '../../contracts/project-migration-contract.js';
import {
  buildCombinedCoordinateTable, parseTable1, table1ToTabText, groupPointsIntoSheets,
} from './pipeline-3d-model-geometry.js';
import {
  buildElasticBendLedgerText, resolvePipelineElasticBends,
} from './pipeline-3d-model-elastic-bend.js?v=20260721-p3d-meta-phase1-2';
import { loadElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js?v=20260721-p3d-meta-phase1-2';
import {
  buildPipelineExportContextJson,
  qualifyPipelineUtilityExport,
  resolvePipelineUtilityExportContext,
} from './pipeline-3d-model-export-context.js?v=20260722-p3d-property-sections-1';
import { buildPipelineIdentityLedgerText } from './pipeline-3d-model-identity.js?v=20260722-p3d-identity-1';
import {
  buildPipelineInputXmlDocumentPlan,
  buildPipelineInputXmlDocumentPlanJson,
} from './pipeline-3d-model-inputxml-document.js?v=20260722-p3d-property-sections-1';
import {
  buildPipelinePropertySectionLedgerText,
  buildPipelinePropertySectionPlanJson,
} from './pipeline-3d-model-property-sections.js?v=20260722-p3d-property-sections-1';
import {
  buildCoordinateRows, coordinateRowsToTabText, buildInputXmlPipingModelXml,
} from './pipeline-3d-model-xml-builder.js?v=20260722-p3d-property-sections-1';
import { buildAuthoritativePipelineOutputs } from './pipeline-3d-model-profile-propagation.js?v=20260722-p3d-property-sections-1';

export const PIPELINE_CAD_PROJECT_ID = 'pipeline-cad';
export const PIPELINE_CAD_SOURCE_SCHEMA = 'Pipeline3DModelTables.v1';
export const PIPELINE_PROFILE_SOURCE_SCHEMA = 'Pipeline3DModelProfileRaw.v1';

function effectiveElasticSettings(input) {
  return input?.elasticBendSettings || loadElasticBendSettings(globalThis.localStorage);
}

function exportContext(input) {
  return resolvePipelineUtilityExportContext({
    branchInfo: input?.branchInfo || {}, settings: effectiveElasticSettings(input),
  });
}

function resolvedDocument(context, elasticBends, propertySections) {
  const plan = buildPipelineInputXmlDocumentPlan({
    exportContext: context,
    coordinateRows: elasticBends.geometryRows,
    bendResolution: elasticBends,
    propertySections,
  });
  const qualification = qualifyPipelineUtilityExport(
    context, elasticBends.geometryRows, elasticBends, plan,
  );
  return Object.freeze({ plan, qualification });
}

function buildXmlText(plan, qualification) {
  return qualification.inputXmlAllowed ? buildInputXmlPipingModelXml(plan) : '';
}

function buildLegacyOutputs(input) {
  const context = exportContext(input);
  const table1Points = parseTable1(input.table1Text);
  const sheets = groupPointsIntoSheets(table1Points);
  const combined = buildCombinedCoordinateTable({
    table1Text: input.table1Text, table2Text: input.table2Text, table3Text: input.table3Text,
  });
  const coordinateRows = buildCoordinateRows(combined, context.identity);
  const elasticBends = resolvePipelineElasticBends({
    points: combined, coordinateRows, branchInfo: context.branchInfo, settings: context.settings,
  });
  const document = resolvedDocument(context, elasticBends, input.propertySections || []);
  const propertyPlan = document.plan.propertySectionPlan;
  return Object.freeze({
    table1Points, sheets, combined, coordinateRows,
    identity: context.identity,
    identityText: buildPipelineIdentityLedgerText(context.identity, coordinateRows),
    exportContext: context,
    exportQualification: document.qualification,
    exportContextText: buildPipelineExportContextJson(context, document.qualification),
    inputXmlDocumentPlan: document.plan,
    inputXmlDocumentPlanText: buildPipelineInputXmlDocumentPlanJson(document.plan),
    propertySectionPlan: propertyPlan,
    propertySectionPlanText: buildPipelinePropertySectionPlanJson(propertyPlan),
    propertySectionLedgerText: buildPipelinePropertySectionLedgerText(propertyPlan),
    inputXmlCoordinateRows: elasticBends.geometryRows,
    elasticBends,
    table1OutputText: table1ToTabText(table1Points),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    elasticBendText: buildElasticBendLedgerText(elasticBends),
    xmlText: buildXmlText(document.plan, document.qualification),
    warnings: elasticBends.warnings,
    errors: document.plan.diagnostics,
  });
}

export function buildPipelineProjectOutputs(input) {
  return input?.profileRaw ? buildAuthoritativePipelineOutputs(input) : buildLegacyOutputs(input);
}

function optionalArtifact(condition, artifact) {
  return condition ? [Object.freeze(artifact)] : [];
}

function evidenceArtifact(fileId, name, sourceSchema, text, mime = 'application/json') {
  return Object.freeze({ fileId, name, mime, role: 'ENGINEERING_EVIDENCE', sourceSchema, text });
}

export function pipelineProjectArtifacts(output) {
  return Object.freeze([
    Object.freeze({ fileId: 'pipeline-table-1', name: 'pipeline-table-1.tsv', mime: 'text/tab-separated-values', role: 'SOURCE_TABLE', sourceSchema: 'PipelineTable1.v1', text: output.table1OutputText }),
    Object.freeze({ fileId: 'pipeline-coordinate-table', name: 'pipeline-coordinate-tab.tsv', mime: 'text/tab-separated-values', role: 'COORDINATE_TABLE', sourceSchema: 'PipelineCoordinateTable.v1', text: output.coordinateText }),
    evidenceArtifact('pipeline-export-context', 'pipeline-export-context.json', 'PipelineUtilityExportContext.v1', output.exportContextText),
    evidenceArtifact('pipeline-inputxml-document-plan', 'pipeline-inputxml-document-plan.json', 'PipelineInputXmlDocumentPlan.v1', output.inputXmlDocumentPlanText),
    evidenceArtifact('pipeline-property-sections-json', 'pipeline-property-sections.json', 'PipelinePropertySectionPlan.v1', output.propertySectionPlanText),
    evidenceArtifact('pipeline-property-sections-tsv', 'pipeline-property-sections.tsv', 'PipelinePropertySectionPlan.v1', output.propertySectionLedgerText, 'text/tab-separated-values'),
    evidenceArtifact('pipeline-identity-ledger', 'pipeline-identity-ledger.tsv', 'PipelineIdentityContext.v1', output.identityText, 'text/tab-separated-values'),
    ...optionalArtifact(output.xmlText, { fileId: 'pipeline-inputxml', name: 'pipeline-3d-model.xml', mime: 'application/xml', role: 'INPUTXML', sourceSchema: 'InputXML.Canonical.v1', text: output.xmlText }),
    ...optionalArtifact(output.elasticBends?.screening?.settings?.enabled, { fileId: 'pipeline-bend-ledger', name: 'pipeline-elastic-bends.tsv', mime: 'text/tab-separated-values', role: 'ENGINEERING_EVIDENCE', sourceSchema: 'PipelineBendResolution.v3', text: output.elasticBendText }),
  ]);
}

function pipelineSourceText(input, output) {
  return JSON.stringify({
    table1Text: input.table1Text,
    table2Text: input.table2Text,
    table3Text: input.table3Text,
    profileRaw: input.profileRaw || null,
    branchInfo: input.branchInfo,
    propertySections: input.propertySections || [],
    identity: output.identity,
    exportContext: output.exportContext,
    exportQualification: output.exportQualification,
    inputXmlDocumentPlan: output.inputXmlDocumentPlan,
    propertySectionPlan: output.propertySectionPlan,
    elasticBendSettings: output.elasticBends?.screening?.settings || null,
  });
}

function migrationBlockers(output) {
  const errorByCode = new Map((output.errors || []).map((item) => [item.code, item.message]));
  return output.exportQualification.blockerCodes.map((code) => {
    const message = errorByCode.get(code);
    return message ? `${code}: ${message}` : code;
  });
}

export async function buildPipelineProjectMigration(input) {
  const nativeOutput = buildPipelineProjectOutputs(input);
  const plan = nativeOutput.inputXmlDocumentPlan;
  const propertyPlan = nativeOutput.propertySectionPlan;
  const blockers = migrationBlockers(nativeOutput);
  const bendDiagnostics = nativeOutput.elasticBends?.diagnostics || {};
  return buildSingleDocumentMigration({
    projectId: PIPELINE_CAD_PROJECT_ID, sourceName: input.sourceName,
    sourceText: pipelineSourceText(input, nativeOutput), sourceSchema: input.profileRaw ? PIPELINE_PROFILE_SOURCE_SCHEMA : PIPELINE_CAD_SOURCE_SCHEMA,
    rootShape: input.profileRaw ? 'table1+table2a+table3a+table3b+table3c' : 'table1+table2+table3',
    unit: 'MM', verticalAxis: 'Z', coordinateFrame: 'GLOBAL',
    stats: { branchCount: 1, componentCount: plan.counts.numElt, scanned: nativeOutput.table1Points.length, matched: nativeOutput.coordinateRows.length, filtered: bendDiagnostics.excludedMarkerCount || 0 },
    scope: { wildcard: '', selectedIds: [] }, createdAt: input.createdAt, cryptoRef: input.cryptoRef,
    writerId: 'buildInputXmlPipingModelXml', outputs: pipelineProjectArtifacts(nativeOutput),
    hierarchy: { branch: nativeOutput.identity.branchName, lineNo: nativeOutput.identity.lineNo, jobName: plan.metadata.jobName, pipelineMode: nativeOutput.exportContext.profile.resolvedMode, inputXmlDocumentSchema: plan.schema, propertySectionSchema: propertyPlan.schema, tables: input.profileRaw ? ['table1', 'table2a', 'table3a', 'table3b', 'table3c'] : ['table1', 'table2', 'table3'], coordinateRowCount: nativeOutput.coordinateRows.length, inputXmlCoordinateRowCount: nativeOutput.inputXmlCoordinateRows.length },
    calculations: {
      pointCount: nativeOutput.table1Points.length, coordinateRowCount: nativeOutput.coordinateRows.length,
      namedNodeCount: nativeOutput.coordinateRows.filter((row) => row.nodeName).length,
      pipingElementCount: plan.counts.numElt, inputXmlBendCount: plan.counts.numBend,
      propertySectionCount: propertyPlan.sectionCount,
      explicitPropertyElementCount: propertyPlan.elements.filter((item) => item.propertyDisposition === 'SECTION_START').length,
      elasticBendCandidateCount: bendDiagnostics.candidateCount || 0,
      elasticBendEmittedCount: bendDiagnostics.emittedCount || 0,
      bendBlockingErrorCount: bendDiagnostics.blockedCount || 0,
      sharedBendSegmentFailureCount: bendDiagnostics.sharedSegmentFailureCount || 0,
      markerRowsExcludedFromInputXml: bendDiagnostics.excludedMarkerCount || 0,
      inputXmlDocumentBlockerCount: plan.blockerCodes.length,
      exportPreflightInputXmlAllowed: nativeOutput.exportQualification.preflightInputXmlAllowed,
      exportInputXmlAllowed: nativeOutput.exportQualification.inputXmlAllowed,
    },
    gate: { status: blockers.length ? 'BLOCKED' : 'READY', blockers },
  });
}

export const pipelineCadProjectAdapter = Object.freeze({
  projectId: PIPELINE_CAD_PROJECT_ID, sourceSchema: PIPELINE_CAD_SOURCE_SCHEMA,
  writerId: 'buildInputXmlPipingModelXml', buildMigration: buildPipelineProjectMigration,
});

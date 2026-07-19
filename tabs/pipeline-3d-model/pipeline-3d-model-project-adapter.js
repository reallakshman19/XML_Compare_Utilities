/** Pipeline CAD adapter preserving native parsers and InputXML writer ownership. */

import { buildSingleDocumentMigration } from '../../contracts/project-migration-contract.js';
import {
  buildCombinedCoordinateTable, parseTable1, table1ToTabText, groupPointsIntoSheets,
} from './pipeline-3d-model-geometry.js';
import {
  buildElasticBendLedgerText, resolvePipelineElasticBends,
} from './pipeline-3d-model-elastic-bend.js';
import { loadElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js';
import {
  buildCoordinateRows, coordinateRowsToTabText, buildInputXmlPipingModelXml,
} from './pipeline-3d-model-xml-builder.js';
import { buildAuthoritativePipelineOutputs } from './pipeline-3d-model-profile-propagation.js?v=20260719-elastic-bend-2';

export const PIPELINE_CAD_PROJECT_ID = 'pipeline-cad';
export const PIPELINE_CAD_SOURCE_SCHEMA = 'Pipeline3DModelTables.v1';
export const PIPELINE_PROFILE_SOURCE_SCHEMA = 'Pipeline3DModelProfileRaw.v1';

function effectiveElasticSettings(input) {
  return input?.elasticBendSettings || loadElasticBendSettings(globalThis.localStorage);
}

function buildLegacyOutputs(input) {
  const table1Points = parseTable1(input.table1Text);
  const sheets = groupPointsIntoSheets(table1Points);
  const combined = buildCombinedCoordinateTable({
    table1Text: input.table1Text, table2Text: input.table2Text, table3Text: input.table3Text,
  });
  const coordinateRows = buildCoordinateRows(combined, input.branchInfo.branchName);
  const elasticBends = resolvePipelineElasticBends({
    points: combined, coordinateRows, branchInfo: input.branchInfo, settings: effectiveElasticSettings(input),
  });
  return Object.freeze({
    table1Points, sheets, combined, coordinateRows, elasticBends,
    table1OutputText: table1ToTabText(table1Points),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    elasticBendText: buildElasticBendLedgerText(elasticBends),
    xmlText: buildInputXmlPipingModelXml(input.branchInfo, coordinateRows, elasticBends),
    warnings: elasticBends.warnings,
  });
}

/** Run the authoritative raw-profile pipeline when Table 2A/3A/3B/3C are supplied. */
export function buildPipelineProjectOutputs(input) {
  return input?.profileRaw
    ? buildAuthoritativePipelineOutputs(input)
    : buildLegacyOutputs(input);
}

function elasticArtifact(output) {
  if (!output.elasticBends?.screening?.settings?.enabled) return [];
  return [Object.freeze({
    fileId: 'pipeline-elastic-bend-ledger', name: 'pipeline-elastic-bends.tsv',
    mime: 'text/tab-separated-values', role: 'ENGINEERING_EVIDENCE',
    sourceSchema: 'PipelineElasticBendResolution.v1', text: output.elasticBendText,
  })];
}

/** Map native Pipeline CAD results to exact downloadable artifacts. */
export function pipelineProjectArtifacts(output) {
  return Object.freeze([
    Object.freeze({ fileId: 'pipeline-table-1', name: 'pipeline-table-1.tsv', mime: 'text/tab-separated-values', role: 'SOURCE_TABLE', sourceSchema: 'PipelineTable1.v1', text: output.table1OutputText }),
    Object.freeze({ fileId: 'pipeline-coordinate-table', name: 'pipeline-coordinate-tab.tsv', mime: 'text/tab-separated-values', role: 'COORDINATE_TABLE', sourceSchema: 'PipelineCoordinateTable.v1', text: output.coordinateText }),
    Object.freeze({ fileId: 'pipeline-inputxml', name: 'pipeline-3d-model.xml', mime: 'application/xml', role: 'INPUTXML', sourceSchema: 'InputXML.CII2019', text: output.xmlText }),
    ...elasticArtifact(output),
  ]);
}

function pipelineSourceText(input, output) {
  return JSON.stringify({
    table1Text: input.table1Text,
    table2Text: input.table2Text,
    table3Text: input.table3Text,
    profileRaw: input.profileRaw || null,
    branchInfo: input.branchInfo,
    elasticBendSettings: output.elasticBends?.screening?.settings || null,
  });
}

/** Publish native Pipeline CAD results through the common platform contracts. */
export async function buildPipelineProjectMigration(input) {
  const nativeOutput = buildPipelineProjectOutputs(input);
  const segmentCount = Math.max(0, nativeOutput.coordinateRows.length - 1);
  const blockers = segmentCount ? [] : ['At least two coordinate points are required for an XML segment.'];
  const bendDiagnostics = nativeOutput.elasticBends?.diagnostics || {};
  return buildSingleDocumentMigration({
    projectId: PIPELINE_CAD_PROJECT_ID, sourceName: input.sourceName,
    sourceText: pipelineSourceText(input, nativeOutput), sourceSchema: input.profileRaw ? PIPELINE_PROFILE_SOURCE_SCHEMA : PIPELINE_CAD_SOURCE_SCHEMA,
    rootShape: input.profileRaw ? 'table1+table2a+table3a+table3b+table3c' : 'table1+table2+table3',
    unit: 'MM', verticalAxis: 'Z', coordinateFrame: 'GLOBAL',
    stats: { branchCount: 1, componentCount: segmentCount, scanned: nativeOutput.table1Points.length, matched: nativeOutput.coordinateRows.length, filtered: 0 },
    scope: { wildcard: '', selectedIds: [] }, createdAt: input.createdAt, cryptoRef: input.cryptoRef,
    writerId: 'buildInputXmlPipingModelXml', outputs: pipelineProjectArtifacts(nativeOutput),
    hierarchy: { branch: input.branchInfo.branchName, tables: input.profileRaw ? ['table1', 'table2a', 'table3a', 'table3b', 'table3c'] : ['table1', 'table2', 'table3'], coordinateRowCount: nativeOutput.coordinateRows.length },
    calculations: {
      pointCount: nativeOutput.table1Points.length, coordinateRowCount: nativeOutput.coordinateRows.length,
      pipingElementCount: segmentCount, elasticBendCandidateCount: bendDiagnostics.candidateCount || 0,
      elasticBendEmittedCount: bendDiagnostics.emittedCount || 0,
    },
    gate: { status: blockers.length ? 'BLOCKED' : 'READY', blockers },
  });
}

export const pipelineCadProjectAdapter = Object.freeze({
  projectId: PIPELINE_CAD_PROJECT_ID, sourceSchema: PIPELINE_CAD_SOURCE_SCHEMA,
  writerId: 'buildInputXmlPipingModelXml', buildMigration: buildPipelineProjectMigration,
});

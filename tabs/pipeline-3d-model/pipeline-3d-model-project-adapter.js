/** Pipeline CAD adapter preserving native parsers and XML writer bytes. */

import { buildSingleDocumentMigration } from '../../contracts/project-migration-contract.js';
import {
  buildCombinedCoordinateTable, parseTable1, table1ToTabText, groupPointsIntoSheets,
} from './pipeline-3d-model-geometry.js';
import {
  buildCoordinateRows, coordinateRowsToTabText, buildInputXmlPipingModelXml,
} from './pipeline-3d-model-xml-builder.js';
import { buildAuthoritativePipelineOutputs } from './pipeline-3d-model-profile-propagation.js';

export const PIPELINE_CAD_PROJECT_ID = 'pipeline-cad';
export const PIPELINE_CAD_SOURCE_SCHEMA = 'Pipeline3DModelTables.v1';
export const PIPELINE_PROFILE_SOURCE_SCHEMA = 'Pipeline3DModelProfileRaw.v1';

function buildLegacyOutputs(input) {
  const table1Points = parseTable1(input.table1Text);
  const sheets = groupPointsIntoSheets(table1Points);
  const combined = buildCombinedCoordinateTable({
    table1Text: input.table1Text, table2Text: input.table2Text, table3Text: input.table3Text,
  });
  const coordinateRows = buildCoordinateRows(combined, input.branchInfo.branchName);
  return Object.freeze({
    table1Points, sheets, combined, coordinateRows,
    table1OutputText: table1ToTabText(table1Points),
    coordinateText: coordinateRowsToTabText(coordinateRows),
    xmlText: buildInputXmlPipingModelXml(input.branchInfo, coordinateRows),
  });
}

/** Run the authoritative raw-profile pipeline when Table 2A/3A/3B/3C are supplied. */
export function buildPipelineProjectOutputs(input) {
  return input?.profileRaw
    ? buildAuthoritativePipelineOutputs(input)
    : buildLegacyOutputs(input);
}

/** Map native writer results to exact downloadable artifacts. */
export function pipelineProjectArtifacts(output) {
  return Object.freeze([
    Object.freeze({ fileId: 'pipeline-table-1', name: 'pipeline-table-1.tsv', mime: 'text/tab-separated-values', role: 'SOURCE_TABLE', sourceSchema: 'PipelineTable1.v1', text: output.table1OutputText }),
    Object.freeze({ fileId: 'pipeline-coordinate-table', name: 'pipeline-coordinate-tab.tsv', mime: 'text/tab-separated-values', role: 'COORDINATE_TABLE', sourceSchema: 'PipelineCoordinateTable.v1', text: output.coordinateText }),
    Object.freeze({ fileId: 'pipeline-inputxml', name: 'pipeline-3d-model.xml', mime: 'application/xml', role: 'INPUTXML', sourceSchema: 'InputXML.CII2019', text: output.xmlText }),
  ]);
}

function pipelineSourceText(input) {
  return JSON.stringify({
    table1Text: input.table1Text,
    table2Text: input.table2Text,
    table3Text: input.table3Text,
    profileRaw: input.profileRaw || null,
    branchInfo: input.branchInfo,
  });
}

/** Publish native Pipeline CAD results through the common platform contracts. */
export async function buildPipelineProjectMigration(input) {
  const nativeOutput = buildPipelineProjectOutputs(input);
  const segmentCount = Math.max(0, nativeOutput.coordinateRows.length - 1);
  const blockers = segmentCount ? [] : ['At least two coordinate points are required for an XML segment.'];
  return buildSingleDocumentMigration({
    projectId: PIPELINE_CAD_PROJECT_ID, sourceName: input.sourceName,
    sourceText: pipelineSourceText(input), sourceSchema: input.profileRaw ? PIPELINE_PROFILE_SOURCE_SCHEMA : PIPELINE_CAD_SOURCE_SCHEMA,
    rootShape: input.profileRaw ? 'table1+table2a+table3a+table3b+table3c' : 'table1+table2+table3',
    unit: 'MM', verticalAxis: 'Z', coordinateFrame: 'GLOBAL',
    stats: { branchCount: 1, componentCount: segmentCount, scanned: nativeOutput.table1Points.length, matched: nativeOutput.coordinateRows.length, filtered: 0 },
    scope: { wildcard: '', selectedIds: [] }, createdAt: input.createdAt, cryptoRef: input.cryptoRef,
    writerId: 'buildInputXmlPipingModelXml', outputs: pipelineProjectArtifacts(nativeOutput),
    hierarchy: { branch: input.branchInfo.branchName, tables: input.profileRaw ? ['table1', 'table2a', 'table3a', 'table3b', 'table3c'] : ['table1', 'table2', 'table3'], coordinateRowCount: nativeOutput.coordinateRows.length },
    calculations: { pointCount: nativeOutput.table1Points.length, coordinateRowCount: nativeOutput.coordinateRows.length, pipingElementCount: segmentCount },
    gate: { status: blockers.length ? 'BLOCKED' : 'READY', blockers },
  });
}

export const pipelineCadProjectAdapter = Object.freeze({
  projectId: PIPELINE_CAD_PROJECT_ID, sourceSchema: PIPELINE_CAD_SOURCE_SCHEMA,
  writerId: 'buildInputXmlPipingModelXml', buildMigration: buildPipelineProjectMigration,
});

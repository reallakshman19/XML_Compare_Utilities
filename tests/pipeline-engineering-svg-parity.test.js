import assert from 'node:assert/strict';
import { parseTable1 } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';
import { framesFromTable1, parseTable2Paste, parseTable3Paste } from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-parser.js';
import { SAMPLE_TABLE_2_PASTE_MULTISHEET, SAMPLE_TABLE_3_PASTE_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-samples.js';
import { SAMPLE_TABLE_1_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-samples.js';
import { buildPipelineProjectOutputs } from '../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js';
import {
  assertPipelineEngineeringSvgParity,
  buildPipelineEngineeringSvgParityReport,
  buildPipelineEngineeringSvgScene,
} from '../tabs/pipeline-3d-model/pipeline-engineering-svg-scene.js';
import {
  createPipelineEngineeringRevisionToken,
  preparePipelineEngineeringSvgViewModel,
} from '../tabs/pipeline-3d-model/pipeline-engineering-svg-view-model.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshot() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  const branchInfo = { branchName: 'PL-PARITY', lineNo: 'PL-PARITY', p1: '42', t1: '65' };
  const output = buildPipelineProjectOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET, table2Text: '', table3Text: '', branchInfo,
    profileRaw: { table2a: table2.rawText, table3a: table3.table3ARaw, table3b: table3.table3BRaw, table3c: table3.table3CRaw },
  });
  return {
    output, branchInfo,
    revision: createPipelineEngineeringRevisionToken({ projectRevision: 'p1', geometryRevision: 'g1', processConfigRevision: 'c1' }),
  };
}

const authoritative = snapshot();
const viewModel = preparePipelineEngineeringSvgViewModel(authoritative);
const report = buildPipelineEngineeringSvgParityReport(viewModel);
assert.equal(report.passed, true);
assert.equal(report.omittedEntities.length, 0);
assert.equal(report.duplicateIds.length, 0);
assert.equal(report.invalidCoordinates.length, 0);
assert.equal(report.unresolvedReferences.length, 0);
assert.equal(report.routeDiscontinuities.length, 0);
assert.equal(report.coordinateRowMismatches.length, 0);
assert.equal(report.inputXmlMismatches.length, 0);
assert.equal(report.propertyCoverageGaps.length, 0);
assert.equal(report.totalMapped, authoritative.output.coordinateRows.length * 2 - 1);
assert.equal(report.mappedByCategory.routeSegments, authoritative.output.coordinateRows.length - 1);
assert.equal(Object.values(report.mappedByCategory).reduce((sum, count) => sum + count, 0), report.totalMapped);
assert.equal(assertPipelineEngineeringSvgParity(report), report);

const rows = viewModel.coordinateRows;
assert(rows.every((row, index) => row.point.x === authoritative.output.coordinateRows[index].x
  && row.point.y === authoritative.output.coordinateRows[index].y
  && row.point.z === authoritative.output.coordinateRows[index].z));
assert(rows.every((row) => row.grade === null || row.point.z === authoritative.output.coordinateRows[row.sourceIndex].z));
assert(rows.filter((row) => row.category === 'markers').every((row) => row.eventSources.includes('marker')));
assert(rows.filter((row) => row.category === 'depthEvents').every((row) => row.eventSources.some((source) => source.startsWith('table3-z-'))));
assert(rows.filter((row) => ['markers', 'depthEvents', 'referenceEvents'].includes(row.category))
  .every((row) => row.elevationAuthority === 'TABLE_2'));

const malformed = clone(authoritative);
malformed.output.coordinateRows[2].x = 'not-a-coordinate';
const malformedReport = buildPipelineEngineeringSvgParityReport(malformed);
assert.equal(malformedReport.passed, false);
assert.equal(malformedReport.invalidCoordinates.length > 0, true);
assert.throws(() => buildPipelineEngineeringSvgScene(malformed, { sceneId: 'malformed' }), /invalidCoordinates/);

const duplicated = clone(authoritative);
duplicated.output.coordinateRows[1].nodeNumber = duplicated.output.coordinateRows[0].nodeNumber;
const duplicateReport = buildPipelineEngineeringSvgParityReport(duplicated);
assert.equal(duplicateReport.passed, false);
assert.equal(duplicateReport.duplicateIds.length > 0, true);
assert.throws(() => buildPipelineEngineeringSvgScene(duplicated, { sceneId: 'duplicate' }), /duplicateIds/);

const badXml = clone(authoritative);
badXml.output.xmlText = badXml.output.xmlText.replace(/DELTA_X="(-?[\d.]+)"/, (match, value) => `DELTA_X="${Number(value) + 1}"`);
const xmlReport = buildPipelineEngineeringSvgParityReport(badXml);
assert.equal(xmlReport.passed, false);
assert.equal(xmlReport.inputXmlMismatches.length > 0, true);

const discontinuous = clone(viewModel);
discontinuous.routeSegments[1].start.x += 1;
const continuityReport = buildPipelineEngineeringSvgParityReport(discontinuous);
assert.equal(continuityReport.passed, false);
assert.equal(continuityReport.routeDiscontinuities.length > 0, true);

const badText = clone(authoritative);
badText.output.coordinateText = badText.output.coordinateText.replace(/\t(-?[\d.]+)\t(-?[\d.]+)\t(-?[\d.]+)\t/, '\t999\t$2\t$3\t');
const textReport = buildPipelineEngineeringSvgParityReport(badText);
assert.equal(textReport.passed, false);
assert.equal(textReport.coordinateRowMismatches.length > 0, true);

console.log(`PIPELINE_ESVG_COUNTS ${JSON.stringify(report.mappedByCategory)}`);
console.log('Pipeline engineering SVG deterministic parity guards: ok');

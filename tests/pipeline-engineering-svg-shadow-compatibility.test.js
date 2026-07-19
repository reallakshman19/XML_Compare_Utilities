import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseTable1 } from '../tabs/pipeline-3d-model/pipeline-3d-model-geometry.js';
import {
  framesFromTable1,
  parseTable2Paste,
  parseTable3Paste,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-parser.js';
import {
  SAMPLE_TABLE_2_PASTE_MULTISHEET,
  SAMPLE_TABLE_3_PASTE_MULTISHEET,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-samples.js';
import { SAMPLE_TABLE_1_MULTISHEET } from '../tabs/pipeline-3d-model/pipeline-3d-model-samples.js';
import { buildPipelineProjectOutputs } from '../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js';
import {
  buildPipelineEngineeringSvgParityReport,
  buildPipelineEngineeringSvgScene,
} from '../tabs/pipeline-3d-model/pipeline-engineering-svg-scene.js';
import { createPipelineEngineeringRevisionToken } from '../tabs/pipeline-3d-model/pipeline-engineering-svg-view-model.js';

function markerRichSnapshot() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  const branchInfo = Object.freeze({ branchName: 'PL-SHADOW-GAP', lineNo: 'PL-SHADOW-GAP', p1: '55', t1: '80' });
  const output = buildPipelineProjectOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET,
    table2Text: '',
    table3Text: '',
    profileRaw: {
      table2a: table2.rawText,
      table3a: table3.table3ARaw,
      table3b: table3.table3BRaw,
      table3c: table3.table3CRaw,
    },
    branchInfo,
  });
  const revision = createPipelineEngineeringRevisionToken({
    projectRevision: 'shadow-gap-project-r1',
    geometryRevision: 'shadow-gap-geometry-r1',
    processConfigRevision: 'shadow-gap-process-r1',
  });
  return Object.freeze({ output, branchInfo, revision });
}

const snapshot = markerRichSnapshot();
const parity = buildPipelineEngineeringSvgParityReport(snapshot);
const evidence = Object.freeze({
  schema: 'PipelineEngineeringSvgShadowCompatibilityGap.v1',
  reviewCoordinateRowCount: snapshot.output.coordinateRows.length,
  inputXmlCoordinateRowCount: snapshot.output.inputXmlCoordinateRows.length,
  excludedMarkerCount: snapshot.output.diagnostics.markerRowsExcludedFromInputXml,
  parityPassed: parity.passed,
  inputXmlMismatches: parity.inputXmlMismatches,
  categories: parity.expectedByCategory,
  requiredResolution: 'Merged Pipeline adapter must map review point entities from coordinateRows and route segments/InputXML parity from inputXmlCoordinateRows without fabricating marker geometry.',
  protectedFiles: [
    'pipeline-engineering-svg-view-model.js',
    'pipeline-engineering-svg-scene.js',
    'pipeline-engineering-svg-properties.js',
    'pipeline-engineering-svg-adapter.js',
  ],
});

assert(snapshot.output.coordinateRows.length > snapshot.output.inputXmlCoordinateRows.length);
assert(snapshot.output.diagnostics.markerRowsExcludedFromInputXml > 0);
assert.equal(parity.passed, false);
assert(parity.inputXmlMismatches.length > 0);
assert.throws(
  () => buildPipelineEngineeringSvgScene(snapshot, { sceneId: 'pipeline-shadow-gap' }),
  /inputXmlMismatches/,
);

mkdirSync('artifacts/pipeline-engineering-svg-shadow', { recursive: true });
writeFileSync(
  'artifacts/pipeline-engineering-svg-shadow/compatibility-gap.json',
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(`PIPELINE_SHADOW_COMPATIBILITY_GAP ${JSON.stringify(evidence)}`);

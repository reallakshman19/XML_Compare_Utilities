import assert from 'node:assert/strict';
import { buildCoordinateRows, buildInputXmlPipingModelXml } from '../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js';

const rows = buildCoordinateRows([
  { x: 0, y: 0, z: 0, label: 'Marker Start' },
  { x: 1, y: 0, z: 0, label: 'Marker End' },
], 'PL-8810');

const xml = buildInputXmlPipingModelXml({
  branchName: 'PL-8810',
  lineNo: 'PL-8810',
  boreMm: '80',
  wallThickness: '6.3',
  corrosionAllowance: '1.5',
  materialCode: '106',
  pipeMaterial: 'A106 Gr B',
  insulationThickness: '0',
  fluidDensity: '1000',
  insulationDensity: '0',
  hydroPressure: '1500',
  p1: '1000',
  t1: '120',
  t2: '90',
  t3: '5',
}, rows);

for (const expected of [
  'JOBNAME="PL-8810"',
  'LINE_ID="PL-8810"',
  'LINE_NO="PL-8810"',
  'PIPELINE_REFERENCE="PL-8810"',
  'FROM_NAME="Marker Start"',
  'TO_NAME="Marker End"',
  'FROM_MARKER="Marker Start"',
  'TO_MARKER="Marker End"',
  'CORR_ALLOW="1.5"',
  'CORROSION_ALLOWANCE="1.5"',
  'MATERIAL_NUM="106"',
  'PIPE_MATERIAL="A106 Gr B"',
  'MATERIAL_NAME="A106 Gr B"',
]) {
  assert.ok(xml.includes(expected), `missing ${expected}`);
}

console.log('pipeline-3d-model-inputxml-contract.test.js passed');

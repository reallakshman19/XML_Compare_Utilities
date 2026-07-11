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
  '<CAESARII xmlns="COADE" VERSION="11.00" XML_TYPE="Input">',
  'xmlns="" JOBNAME="PL-8810"',
  'NUMELT="1"',
  'FROM_NODE="100.000000"',
  'TO_NODE="110.000000"',
  'LINE_ID="PL-8810"',
  'FROM_NAME="Marker Start"',
  'TO_NAME="Marker End"',
  'CORR_ALLOW="1.500000"',
  'MATERIAL_NUM="106.000000"',
  'MATERIAL_NAME="A106 Gr B"',
  'PRESSURE1="1000.000000"',
  'PRESSURE2="-1.010100"',
  'FLUID_DENSITY="0.001000"',
  'FROM_GLOBAL_X="0.000"',
  'TO_GLOBAL_X="1000.000"',
  'GLOBAL_COORD_BASIS_NODE="100"',
  '<UNITS>',
]) {
  assert.ok(xml.includes(expected), `missing ${expected}`);
}

for (const removed of ['NUMELEMENTS=', 'PRESSURE_C1=', 'LINE_NO=', 'CORROSION_ALLOWANCE=', 'PIPE_MATERIAL=']) {
  assert.ok(!xml.includes(removed), `removed simplified alias still present: ${removed}`);
}

console.log('pipeline-3d-model-inputxml-contract.test.js passed');
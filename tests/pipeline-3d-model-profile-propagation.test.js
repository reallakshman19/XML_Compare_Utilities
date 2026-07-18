import assert from 'node:assert/strict';
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
import { buildAuthoritativePipelineOutputs } from '../tabs/pipeline-3d-model/pipeline-3d-model-profile-propagation.js';

function profileRaw() {
  const frames = framesFromTable1(parseTable1(SAMPLE_TABLE_1_MULTISHEET));
  const table2 = parseTable2Paste(SAMPLE_TABLE_2_PASTE_MULTISHEET, { frames });
  const table3 = parseTable3Paste(SAMPLE_TABLE_3_PASTE_MULTISHEET, { frames });
  return {
    table2a: table2.rawText,
    table3a: table3.table3ARaw,
    table3b: table3.table3BRaw,
    table3c: table3.table3CRaw,
  };
}

function build(raw = profileRaw()) {
  return buildAuthoritativePipelineOutputs({
    table1Text: SAMPLE_TABLE_1_MULTISHEET,
    table2Text: '',
    table3Text: '',
    profileRaw: raw,
    branchInfo: { branchName: 'PL-XX', lineNo: 'PL-XX' },
  });
}

function coordinateRows(text) {
  return text.split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const [branch, node, x, y, z, name] = line.split('\t');
    return { branch, node: Number(node), x: Number(x), y: Number(y), z: Number(z), name };
  });
}

function xmlDeltas(text) {
  return [...text.matchAll(/DELTA_X="(-?[\d.]+)"[^>]*DELTA_Y="(-?[\d.]+)"[^>]*DELTA_Z="(-?[\d.]+)"/g)]
    .map((match) => Math.hypot(Number(match[1]), Number(match[2]), Number(match[3])));
}

const raw = profileRaw();
const before = JSON.stringify(raw);
const output = build(raw);

assert.equal(JSON.stringify(raw), before, 'raw profile evidence must remain immutable');
assert.equal(output.diagnostics.table2Rows, 10);
assert.equal(output.diagnostics.table3LengthRows, 4);
assert.equal(output.diagnostics.table3DepthRows, 2);
assert.equal(output.diagnostics.table3MarkerRows, 4);
assert.equal(output.diagnostics.warningCount, 1);
assert.ok(output.warnings.some((warning) => warning.code === 'grade_profile_extrapolated'));
assert.ok(Math.abs(output.diagnostics.stationSlope - 1) < 0.001);
assert.ok(output.diagnostics.stationResidual < 0.05);
assert.ok(output.diagnostics.routeStartStation > 12830 && output.diagnostics.routeStartStation < 12834);
assert.ok(output.diagnostics.table3OriginRoute > 760 && output.diagnostics.table3OriginRoute < 780);
assert.ok(output.diagnostics.maxSegment < 600);

assert.match(output.table2Text, /13621\.6\t240\.17/);
assert.match(output.table2XText, /13\+621\.6/);
assert.match(output.table3XText, /\n1\t1430\.577\t1430\.577\t0\.0/);
for (const expected of ['14.7', '46.7', '21.2', '20.9', '1.5M', 'A/G', 'PMS-001', 'PMS-004']) {
  assert.ok(output.table3XText.includes(expected), `Table 3X must retain ${expected}`);
}

assert.doesNotMatch(output.table1OutputText, /at point X= Y= Z=/i);
assert.doesNotMatch(output.coordinateText, /at point X= Y= Z=/i);
assert.doesNotMatch(output.xmlText, /at point X= Y= Z=/i);
assert.match(output.table1OutputText, /T1-001/);
assert.match(output.coordinateText, /T1-001/);
assert.match(output.xmlText, /T1-001/);

const elPoint = output.combined.find((point) => point.label.includes('EL 13621.6'));
assert.ok(elPoint);
assert.ok(elPoint.horizontal > 780 && elPoint.horizontal < 810);
assert.ok(elPoint.horizontal < output.diagnostics.routeLength);
assert.ok(!output.combined.some((point) => point.horizontal > output.diagnostics.routeLength + 0.001));

const rows = coordinateRows(output.coordinateText);
const pms1 = rows.find((row) => row.name.includes('PMS-001'));
const pms4 = rows.find((row) => row.name.includes('PMS-004'));
assert.ok(pms1 && pms4, 'PMS markers must reach Coordinate Tab');
assert.ok(pms1.z > 238000 && pms1.z < 240000, 'PMS-001 must use buried centerline Z');
assert.ok(pms4.z > 240000, 'PMS-004 must use A/G centerline Z');

const gradeEnd = rows.find((row) => row.name.includes('GRADE END'));
const buriedStart = rows.find((row) => row.name.includes('1.5M START'));
assert.ok(gradeEnd && buriedStart, 'outer buried start must create two coordinate nodes');
assert.equal(gradeEnd.x, buriedStart.x);
assert.equal(gradeEnd.y, buriedStart.y);
assert.equal(gradeEnd.z - buriedStart.z, 1500);

const buriedEnd = rows.find((row) => row.name.includes('1.5M END'));
const aboveStart = rows.find((row) => row.name.includes('A/G START'));
assert.ok(buriedEnd && aboveStart, 'depth transition must create two coordinate nodes');
assert.equal(buriedEnd.x, aboveStart.x);
assert.equal(buriedEnd.y, aboveStart.y);
assert.equal(aboveStart.z - buriedEnd.z, 2250);

const aboveEnd = rows.find((row) => row.name.includes('A/G END'));
const gradeStart = rows.find((row) => row.name.includes('GRADE START'));
assert.ok(aboveEnd && gradeStart, 'outer A/G end must create two coordinate nodes');
assert.equal(aboveEnd.x, gradeStart.x);
assert.equal(aboveEnd.y, gradeStart.y);
assert.equal(aboveEnd.z - gradeStart.z, 750);

for (const expected of ['PMS-001', 'PMS-004', 'GRADE END', '1.5M START', '1.5M END', 'A/G START', 'A/G END', 'GRADE START']) {
  assert.match(output.xmlText, new RegExp(expected.replace('/', '\\/')));
}
const deltas = xmlDeltas(output.xmlText);
assert.ok(deltas.length > 0);
assert.ok(Math.max(...deltas) < 600000, 'InputXML must not contain the prior ~12.5 km extrapolation element');
assert.doesNotMatch(output.coordinateText, /8573374\t-10498846/);

const invalidRaw = { ...raw, table3c: `${raw.table3c}\n2000.000\tPMS-OUTSIDE` };
const warningOutput = build(invalidRaw);
assert.ok(warningOutput.warnings.some((warning) => warning.code === 'table3_h_clamped'));
assert.ok(warningOutput.warnings.some((warning) => warning.code === 'grade_profile_extrapolated'));
assert.equal(warningOutput.diagnostics.warningCount, 2);
assert.match(warningOutput.coordinateText, /PMS-OUTSIDE/);
assert.match(warningOutput.xmlText, /PMS-OUTSIDE/);
assert.ok(!warningOutput.combined.some((point) => point.horizontal > warningOutput.diagnostics.routeLength + 0.001));

console.log('Pipeline profile propagation tests passed.');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  createSupportReportWorkbook,
  supportReportSpreadsheetMatrix,
  supportReportToXlsxBytes,
} from '../tabs/support-steel-relationship-builder/support-report-xlsx.js?v=20260909-support-report-xlsx-3';
import { parseSupportReportClashXml as parseSupportReportClashXmlWithTestContext } from '../tabs/support-steel-relationship-builder/support-report-clash-test-context.js?v=20260909-support-report-parser-primitives-8';
import { parseSupportReportClashXml as parseSupportReportClashXmlSafely } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js?v=20260909-support-report-parser-primitives-8';

const CACHE_TOKEN = '20260717-startup-parse-hotfix-1';
const SUPPORT_REPORT_PARITY_TOKEN = '20260909-support-report-parity-2';
const SUPPORT_REPORT_XLSX_TOKEN = '20260909-support-report-xlsx-3';
const SUPPORT_REPORT_PRIMITIVES_TOKEN = '20260909-support-report-parser-primitives-8';
const syntaxFiles = [
  'main-rhbg-fitguard.js',
  'core/app.js',
  'tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-addon.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-view.js',
  'tabs/support-steel-relationship-builder/support-steel-restraint-evidence-bundle.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-engine.js',
  'tabs/support-steel-relationship-builder/support-restraint-evidence.js',
  'tabs/support-steel-relationship-builder/support-restraint-intent.js',
  'tabs/support-steel-relationship-builder/support-restraint-local-frame.js',
  'tabs/support-steel-relationship-builder/support-report-contract.js',
  'tabs/support-steel-relationship-builder/support-report-clash-evidence.js',
  'tabs/support-steel-relationship-builder/support-report-clash-test-context.js',
  'tabs/support-steel-relationship-builder/support-report-clash-safety.js',
  'tabs/support-steel-relationship-builder/support-report-field-projection.js',
  'tabs/support-steel-relationship-builder/support-report-engine.js',
  'tabs/support-steel-relationship-builder/support-report-export.js',
  'tabs/support-steel-relationship-builder/support-report-xlsx.js',
  'tabs/support-steel-relationship-builder/support-report-view.js',
  'tabs/support-steel-relationship-builder/support-report-addon.js',
  'tabs/ps-family-clash-audit/ps-family-token-utils.js',
  'tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js',
  'tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js',
  'tabs/ps-family-clash-audit/ps-family-restraint-function-addon.js',
];
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file} failed JavaScript parsing:\n${result.stderr || result.stdout}`);
}
for (const file of ['index.html', 'main-rhbg-fitguard.js', 'core/app.js', 'tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js', 'tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js']) {
  assert.match(readFileSync(file, 'utf8'), new RegExp(CACHE_TOKEN), `${file} must carry the startup hotfix cache token`);
}
const supportReportParityEdges = [
  ['tabs/support-steel-relationship-builder/support-report-addon.js', './support-report-export.js'],
  ['tabs/support-steel-relationship-builder/support-report-addon.js', './support-report-view.js'],
  ['tabs/support-steel-relationship-builder/support-report-engine.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-engine.js', './support-report-field-projection.js'],
  ['tabs/support-steel-relationship-builder/support-report-clash-evidence.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-export.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-xlsx.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-view.js', './support-report-contract.js'],
];
for (const [file, modulePath] of supportReportParityEdges) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(`${modulePath}?v=${SUPPORT_REPORT_PARITY_TOKEN}`),
    `${file} must import ${modulePath} through the Support Report parity cache token`);
}
const bootstrap = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js', 'utf8');
const addon = readFileSync('tabs/support-steel-relationship-builder/support-report-addon.js', 'utf8');
const engine = readFileSync('tabs/support-steel-relationship-builder/support-report-engine.js', 'utf8');
const safety = readFileSync('tabs/support-steel-relationship-builder/support-report-clash-safety.js', 'utf8');
const context = readFileSync('tabs/support-steel-relationship-builder/support-report-clash-test-context.js', 'utf8');
const evidence = readFileSync('tabs/support-steel-relationship-builder/support-report-clash-evidence.js', 'utf8');
for (const [source, edge, label] of [
  [bootstrap, './support-report-addon.js', 'bootstrap → addon'],
  [addon, './support-report-engine.js', 'addon → engine'],
  [addon, './support-report-clash-safety.js', 'addon → safety'],
  [engine, './support-report-clash-safety.js', 'engine → safety'],
  [safety, './support-report-clash-test-context.js', 'safety → test context'],
  [safety, './support-report-clash-evidence.js', 'safety → evidence'],
  [context, './support-report-clash-evidence.js', 'test context → evidence'],
]) {
  assert.ok(source.includes(`${edge}?v=${SUPPORT_REPORT_PRIMITIVES_TOKEN}`),
    `Support Report ${label} must carry the parser primitives cache token`);
}
assert.ok(addon.includes(`./support-report-xlsx.js?v=${SUPPORT_REPORT_XLSX_TOKEN}`),
  'Support Report addon must load the XLSX writer through the XLSX cache token');
assert.ok(evidence.includes("../ps-family-clash-audit/ps-family-token-utils.js"),
  'Support Report clash evidence must reuse governed PS-family XML/numeric primitives');
assert.ok(context.includes("../ps-family-clash-audit/ps-family-token-utils.js"),
  'Support Report clash-test context must reuse governed PS-family XML decoding');

const xlsxFixture = { rows: [{
  previousName: '', scope: 'ASIM', civilSecondarySupport: 'PS-007(REF)', pipe: 'ASIM-10"-LINE', size: 250,
  pipingPrimarySupport: '/PS-007.7', supportType: 'SHOE-250', pipingPrimarySupportReference: '=67127059/28670',
  eastWest: 'E 798423mm', northSouth: 'S 1125028mm', bopElevation: 'U 100100.45mm',
  totalSupportPointsOnSecondary: 5, remarks: '', primarySupportDescription: 'Pipe shoe',
  primarySupportZone: 'ASIM-CU-PL-S', primarySupportSite: 'ASIM-CU-PL', pipeSchedule: 'PIPE Sch 100',
  pipeInsulationType: 'HC', pipeInsulationThickness: '80mm', stressSystemNumber: 'QSP-SYS-01', nodeNumber: '280', revision: '5',
}] };
const matrix = supportReportSpreadsheetMatrix(xlsxFixture);
assert.equal(matrix[0].length, 21);
assert.equal(matrix[0][0], 'PREV PRIMARY SUPPORT NAME');
assert.equal(matrix[0][20], 'REVISION');
assert.equal(matrix[1][7], '=67127059/28670');
assert.equal(matrix[1][17], 'HC 80mm');
assert.equal(matrix[1][20], '5');
assert.equal(matrix[1][4], 250);
const captured = {};
const fakeXlsx = {
  utils: {
    aoa_to_sheet(value) { captured.matrix = value; return {}; },
    book_new() { return { sheets: [] }; },
    book_append_sheet(workbook, worksheet, name) { workbook.sheets.push({ worksheet, name }); },
  },
  write(workbook, options) { captured.write = { workbook, options }; return new Uint8Array([80, 75, 3, 4]); },
};
const workbook = createSupportReportWorkbook(xlsxFixture, fakeXlsx);
assert.equal(workbook.sheets[0].name, 'Support Report');
assert.equal(workbook.sheets[0].worksheet['!cols'].length, 21);
assert.equal(workbook.sheets[0].worksheet['!autofilter'].ref, 'A1:U2');
assert.equal(captured.matrix[1][7], '=67127059/28670');
const xlsxBytes = await supportReportToXlsxBytes(xlsxFixture, { XLSX: fakeXlsx });
assert.deepEqual([...xlsxBytes], [80, 75, 3, 4]);
assert.deepEqual(captured.write.options, { bookType: 'xlsx', type: 'array', compression: true });

function clashObject(nodes, itemName) {
  return `<clashobject><pathlink>${nodes.map((node) => `<node>${node}</node>`).join('')}</pathlink><smarttags><smarttag><name>Item Name</name><value>${itemName}</value></smarttag></smarttags></clashobject>`;
}
function clashResult(name, member) {
  return `<clashresult name="${name}" guid="${name}-GUID"><clashobjects>${clashObject(['/ASIM-CU-PL', '/ASIM-LINE', '/ASIM-LINE/B1', `/${member}`], `/${member}`)}${clashObject(['/ASIM-CU-SU', '/PS-007'], 'GENSEC of /PS-007')}</clashobjects></clashresult>`;
}
const multiTestXml = `<exchange units="m"><clashtest name="Test A" guid="TA">${clashResult('A1', 'PS-007.1')}</clashtest><clashtest name="Test B" guid="TB">${clashResult('B1', 'PS-007.2')}</clashtest></exchange>`;
const multiTest = parseSupportReportClashXmlWithTestContext(multiTestXml);
assert.equal(multiTest.clashTestCount, 2);
assert.equal(multiTest.rowCount, 2);
assert.equal(multiTest.groupCount, 1);
assert.deepEqual(multiTest.rows.map((row) => row.clashTestName), ['Test A', 'Test B']);
assert.deepEqual(multiTest.rows.map((row) => row.clashTestGuid), ['TA', 'TB']);
assert.deepEqual(multiTest.rows.map((row) => row.clashTestIndex), [0, 1]);
assert.deepEqual(multiTest.groups[0].evidenceRows.map((row) => row.clashTestName), ['Test A', 'Test B']);

const malformed = parseSupportReportClashXmlSafely('<exchange><clashtest><clashresult name="Broken"></clashtest></exchange>');
assert.equal(malformed.rowCount, 0);
assert.equal(malformed.diagnostics[0].code, 'SUPPORT_REPORT_MALFORMED_XML');
assert.equal(malformed.diagnostics[0].severity, 'ERROR');

const ambiguousResult = `<clashresult name="Ambiguous" guid="AMB"><clashobjects>${clashObject(['/ASIM-LINE-A', '/ASIM-LINE-A/B1', '/PS-007.1'], '/PS-007.1')}${clashObject(['/ASIM-LINE-B', '/ASIM-LINE-B/B2', '/PS-007.2'], '/PS-007.2')}${clashObject(['/ASIM-CU-SU', '/PS-007'], 'GENSEC of /PS-007')}</clashobjects></clashresult>`;
const ambiguous = parseSupportReportClashXmlSafely(`<exchange><clashtest>${ambiguousResult}</clashtest></exchange>`);
assert.equal(ambiguous.rowCount, 0);
assert.ok(ambiguous.diagnostics.some((item) => item.code === 'SUPPORT_REPORT_AMBIGUOUS_PIPE_SIDE' && item.severity === 'ERROR'));

const conflictingXml = `<exchange><clashtest><clashresult name="Conflict" guid="CON"><clashobjects>${clashObject(['/ASIM-LINE', '/ASIM-LINE/B1', '/PS-007.1'], '/PS-007.1')}${clashObject(['/ASIM-CU-SU', '/PS-007'], 'GENSEC of /PS-007')}${clashObject(['/ASIM-CU-SU', '/SL-097'], 'GENSEC of /SL-097')}</clashobjects></clashresult></clashtest></exchange>`;
const conflicting = parseSupportReportClashXmlSafely(conflictingXml);
assert.equal(conflicting.rowCount, 0);
assert.ok(conflicting.diagnostics.some((item) => item.code === 'SUPPORT_REPORT_CONFLICTING_SECONDARY_FAMILY' && item.severity === 'ERROR'));

const duplicateXml = `<exchange><clashtest>${clashResult('D1', 'PS-007.1')}${clashResult('D2', 'PS-007.1')}</clashtest></exchange>`;
const duplicate = parseSupportReportClashXmlSafely(duplicateXml);
assert.equal(duplicate.rowCount, 2);
assert.equal(duplicate.groupCount, 1);
assert.equal(duplicate.groups[0].evidenceRows.length, 1);
assert.equal(duplicate.groups[0].clashCount, 1);
assert.ok(duplicate.diagnostics.some((item) => item.code === 'SUPPORT_REPORT_DUPLICATE_EVIDENCE' && item.duplicateCount === 1));

const incompleteNumericResult = `<clashresult name="Numeric" guid="NUM"><clashpoint><pos3f x="1" y="2"/></clashpoint><clashobjects>${clashObject(['/ASIM-CU-PL', '/ASIM-LINE', '/ASIM-LINE/B1', '/PS-007A.1'], '/PS-007A.1')}${clashObject(['/ASIM-CU-SU', '/PS-007'], 'GENSEC of /PS-007')}</clashobjects></clashresult>`;
const incompleteNumeric = parseSupportReportClashXmlSafely(`<exchange units="m"><clashtest name="Encoded &amp; Test">${incompleteNumericResult}</clashtest></exchange>`);
assert.equal(incompleteNumeric.rowCount, 1);
assert.equal(incompleteNumeric.rows[0].distanceSourceUnits, null);
assert.equal(incompleteNumeric.rows[0].clashPointGlobalMm, null);
assert.equal(incompleteNumeric.rows[0].primarySupportMemberId, 'PS-007A.1');
assert.equal(incompleteNumeric.rows[0].clashTestName, 'Encoded & Test');
console.log(`startup module syntax gate passed for ${syntaxFiles.length} JavaScript files`);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  createSupportReportWorkbook,
  supportReportSpreadsheetMatrix,
  supportReportToXlsxBytes,
} from '../tabs/support-steel-relationship-builder/support-report-xlsx.js?v=20260909-support-report-xlsx-3';

const CACHE_TOKEN = '20260717-startup-parse-hotfix-1';
const SUPPORT_REPORT_PARITY_TOKEN = '20260909-support-report-parity-2';
const SUPPORT_REPORT_XLSX_TOKEN = '20260909-support-report-xlsx-3';
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
  'tabs/support-steel-relationship-builder/support-report-field-projection.js',
  'tabs/support-steel-relationship-builder/support-report-engine.js',
  'tabs/support-steel-relationship-builder/support-report-export.js',
  'tabs/support-steel-relationship-builder/support-report-xlsx.js',
  'tabs/support-steel-relationship-builder/support-report-view.js',
  'tabs/support-steel-relationship-builder/support-report-addon.js',
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
const supportReportEdges = [
  ['tabs/support-steel-relationship-builder/support-report-addon.js', './support-report-engine.js'],
  ['tabs/support-steel-relationship-builder/support-report-addon.js', './support-report-export.js'],
  ['tabs/support-steel-relationship-builder/support-report-addon.js', './support-report-view.js'],
  ['tabs/support-steel-relationship-builder/support-report-engine.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-engine.js', './support-report-clash-evidence.js'],
  ['tabs/support-steel-relationship-builder/support-report-engine.js', './support-report-field-projection.js'],
  ['tabs/support-steel-relationship-builder/support-report-clash-evidence.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-export.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-xlsx.js', './support-report-contract.js'],
  ['tabs/support-steel-relationship-builder/support-report-view.js', './support-report-contract.js'],
];
for (const [file, modulePath] of supportReportEdges) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(`${modulePath}?v=${SUPPORT_REPORT_PARITY_TOKEN}`),
    `${file} must import ${modulePath} through the Support Report parity cache token`);
}
const bootstrap = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js', 'utf8');
const addon = readFileSync('tabs/support-steel-relationship-builder/support-report-addon.js', 'utf8');
assert.ok(bootstrap.includes(`./support-report-addon.js?v=${SUPPORT_REPORT_XLSX_TOKEN}`),
  'Support Report bootstrap must refresh the XLSX-capable addon entry');
assert.ok(addon.includes(`./support-report-xlsx.js?v=${SUPPORT_REPORT_XLSX_TOKEN}`),
  'Support Report addon must load the XLSX writer through the XLSX cache token');

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
console.log(`startup module syntax gate passed for ${syntaxFiles.length} JavaScript files`);

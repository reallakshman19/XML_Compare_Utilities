import assert from 'assert';
import { execFileSync } from 'child_process';
import fs from 'fs';
import { buildAccdbSideloadTables } from '../tabs/inputxml-workspace/inputxml-workspace-sideload.js';
import { applyXmlCompareSideload } from '../xml-compare/XmlCompareSideloadEnricher.js';

const bmInputXmlPath = 'F:\\CODE-5\\3D_Converters\\Benchmarks\\INPUT XML to CII 2019\\BM_CII\\BM_CII_INPUT.XML';
const bmAccdbPath = 'F:\\CODE-5\\3D_Converters\\Benchmarks\\INPUT XML to CII 2019\\BM_CII\\BM_CII.ACCDB';

function rowsToTsv(rows = []) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join('\t'), ...rows.map((row) => headers.map((key) => String(row[key] ?? '').replace(/\t/g, ' ')).join('\t'))].join('\n');
}

function readAccdbTables(accdbPath) {
  const script = `
$ErrorActionPreference = 'Stop'
$cn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${accdbPath};Persist Security Info=False;")
$cn.Open()
function Read-Table($name) {
  $cmd = $cn.CreateCommand()
  $cmd.CommandText = "SELECT * FROM [$name]"
  $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
  $dt = New-Object System.Data.DataTable
  [void]$adapter.Fill($dt)
  $rows = @()
  foreach ($r in $dt.Rows) {
    $obj = [ordered]@{}
    foreach ($col in $dt.Columns) { $obj[$col.ColumnName] = [string]$r[$col.ColumnName] }
    $rows += [pscustomobject]$obj
  }
  return $rows
}
$result = [ordered]@{
  basic = Read-Table 'INPUT_BASIC_ELEMENT_DATA'
  restraints = Read-Table 'INPUT_RESTRAINTS'
  nodal = Read-Table 'INPUT_NODAL_COORDINATES'
  userNodal = Read-Table 'INPUT_USER_NODAL_COORDINATES'
}
$cn.Close()
$result | ConvertTo-Json -Depth 5
`;
  const output = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(output);
}

assert.ok(fs.existsSync(bmInputXmlPath), `Missing BM_CII InputXML benchmark: ${bmInputXmlPath}`);
assert.ok(fs.existsSync(bmAccdbPath), `Missing BM_CII ACCDB benchmark: ${bmAccdbPath}`);

const tables = readAccdbTables(bmAccdbPath);
const sideload = buildAccdbSideloadTables({
  basicText: rowsToTsv(tables.basic),
  restraintsText: rowsToTsv(tables.restraints),
  nodalText: rowsToTsv(tables.nodal),
  userNodalText: rowsToTsv(tables.userNodal),
});
const sourceText = fs.readFileSync(bmInputXmlPath, 'utf8');
const enriched = applyXmlCompareSideload(sourceText, sideload);

assert.ok(sideload.basicRows.length > 0, 'ACCDB helper should produce basic element rows.');
assert.ok(sideload.lineIdText.includes('\n'), 'Line ID sideload should contain data rows.');
assert.ok(sideload.nodeNameText.includes('\n'), 'Node name sideload should contain data rows.');
assert.ok(sideload.coordinateText.includes('\n'), 'Coordinate sideload should contain data rows.');
assert.ok(enriched.report.lineIdsApplied > 0, 'Enrichment should apply line IDs.');
assert.ok(enriched.report.nodeNamesApplied > 0, 'Enrichment should apply node names.');
assert.ok(enriched.report.coordinatesApplied > 0, 'Enrichment should apply propagated global coordinates.');
assert.ok(/LINE_ID="/.test(enriched.xmlText), 'Enriched InputXML should contain LINE_ID attributes.');
assert.ok(/FROM_NAME="/.test(enriched.xmlText) || /TO_NAME="/.test(enriched.xmlText), 'Enriched InputXML should contain node names.');
assert.ok(/FROM_GLOBAL_X="/.test(enriched.xmlText) && /TO_GLOBAL_X="/.test(enriched.xmlText), 'Enriched InputXML should contain global coordinates.');

console.log(`BM_CII enrichment passed: ${JSON.stringify(enriched.report)}`);

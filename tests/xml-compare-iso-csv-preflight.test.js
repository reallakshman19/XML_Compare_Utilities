import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preflightIsoTableText, ISO_TABLE_IMPORT_MAX_BYTES } from '../xml-compare/table-categorizer/table-categorized-iso-table-preflight.js';
import { renderTableCategorizedXmlShellHtml } from '../xml-compare/table-categorizer/table-categorized-xml-shell.js';

const s1 = '\uFEFFSupport No\tpipe\tBore\tDTXR\tSupport Gap\tMandatory\r\n' +
  'PS-124.1\tPIPE-1/B4\t50.00\tGUIDE TYPE-604\t\tNo\r\n' +
  'PS02364.1\tPIPE-9\t25.00\tREST TYPE-20\t\tNo\r\n';
const mapping = preflightIsoTableText(s1, 'S1', { fileName: 'mapping.TSV' });
assert.equal(mapping.ok, true);
assert.equal(mapping.rowCount, 2);
assert.equal(mapping.detectedDelimiter, 'tab');
assert.equal(mapping.parsed.headers[0], 'PS NO');
assert.equal(mapping.parsed.originalHeaders[0], 'Support No');
assert.equal(mapping.parsed.rows[0].rawByHeader['Support No'], 'PS-124.1');
assert.equal(mapping.parsed.rows[0].rawByHeader['PS NO'], 'PS-124.1');
assert.equal(mapping.originalText, s1, 'raw source text retained');
assert.equal(mapping.sourceText, s1.slice(1), 'BOM only removed from working copy');
assert.ok(mapping.fixes.some(f => /BOM/.test(f)));
assert.ok(mapping.fixes.some(f => /Support No/.test(f)));
assert.ok(mapping.findings.some(f => f.code === 'NONCANONICAL_SUPPORT_ID' && f.rowRef === 'S1:2'));
assert.equal(mapping.blockerCount, 0, 'noncanonical IDs require review, not destructive repair');

const s2 = 'NODE_NAME,LinenoinCII,SupportISONOTE\n' +
  '"/PS-124.1","/PIPE-1/B4","/PS-124.1 :ISONOTE REST(2kN), GUIDE GAP=10mm"\n' +
  '"/SL-263..4","/PIPE-9","/SL-263..4 :ISONOTE REST(1kN)"\n';
const notes = preflightIsoTableText(s2, 'S2', { fileName: 'notes.csv' });
assert.equal(notes.ok, true);
assert.equal(notes.rowCount, 2);
assert.equal(notes.detectedDelimiter, 'comma');
assert.equal(notes.parsed.rows[0].rawByHeader.SupportISONOTE,
  '/PS-124.1 :ISONOTE REST(2kN), GUIDE GAP=10mm');
assert.ok(notes.findings.some(f => f.code === 'NONCANONICAL_SUPPORT_ID' && f.rowRef === 'S2:2'));

const wrongRole = preflightIsoTableText(s1, 'S2', { fileName: 'wrong-role.tsv' });
assert.equal(wrongRole.ok, false);
assert.ok(wrongRole.findings.some(f => f.code === 'REQUIRED_COLUMN_MISSING'));
assert.match(wrongRole.summary, /Existing source kept unchanged/);
const malformed = preflightIsoTableText('PS NO,pipe\nPS-123,PIPE-1,overflow\n', 'S1', { fileName: 'broken.csv' });
assert.equal(malformed.ok, false);
assert.ok(malformed.findings.some(f => f.code === 'ROW_WIDTH_MISMATCH' && f.rowRef === 'S1:1'));
const duplicate = preflightIsoTableText('PS NO,Support No,pipe\nPS-01,PS-02,PIPE-1\n', 'S1', { fileName: 'ambiguous.csv' });
assert.equal(duplicate.ok, false);
assert.ok(duplicate.findings.some(f => f.code === 'DUPLICATE_CANONICAL_HEADER'));
// Harmless exporter columns: duplicated NODE_NAME and empty trailing header
// must no longer block if the first authoritative values remain complete.
const benignS2 = preflightIsoTableText('\uFEFFNODE_NAME,LinenoinCII,SupportISONOTE,NODE_NAME,\n' +
  'PS-001,PIPE-1,/PS-001 :ISONOTE REST(2kN),PS-001,\n' +
  'PS-002,PIPE-2,/PS-002 :ISONOTE REST(3kN),,\n', 'S2', { fileName: 'S2.csv' });
assert.equal(benignS2.ok, true);
assert.equal(benignS2.blockerCount, 0);
assert.equal(benignS2.rowCount, 2);
assert.equal(benignS2.parsed.rows[0].rawByHeader.NODE_NAME, 'PS-001');
assert.equal(benignS2.parsed.rows[0].rawByColumnId.NODE_NAME__2, 'PS-001');
assert.equal(benignS2.originalText.startsWith('\uFEFF'), true);
assert.ok(benignS2.fixes.some(f => /Repeated "NODE_NAME"/.test(f)));
assert.ok(benignS2.fixes.some(f => /Empty column 5/.test(f)));
const conflictS2 = preflightIsoTableText(
  'NODE_NAME,LinenoinCII,SupportISONOTE,NODE_NAME\n' +
  'PS-001,PIPE-1,/PS-001 :ISONOTE REST(2kN),PS-999\n', 'S2', { fileName: 'S2.csv' });
assert.equal(conflictS2.ok, false, 'conflicting second ID must not replace or shadow authoritative NODE_NAME');
assert.ok(conflictS2.findings.some(f => f.code === 'DUPLICATE_CANONICAL_HEADER'));
const secondOnlyS2 = preflightIsoTableText(
  'NODE_NAME,LinenoinCII,SupportISONOTE,NODE_NAME\n' +
  ',PIPE-1,/PS-001 :ISONOTE REST(2kN),PS-001\n', 'S2', { fileName: 'S2.csv' });
assert.equal(secondOnlyS2.ok, false, 'second-only ID requires explicit authoritative selection');
const unnamedData = preflightIsoTableText(
  'NODE_NAME,LinenoinCII,SupportISONOTE,\n' +
  'PS-001,PIPE-1,/PS-001 :ISONOTE REST(2kN),not-empty\n', 'S2', { fileName: 'S2.csv' });
assert.equal(unnamedData.ok, false);
assert.ok(unnamedData.findings.some(f => f.code === 'EMPTY_HEADER'));

const unbalanced = preflightIsoTableText('NODE_NAME,LinenoinCII,SupportISONOTE\nPS-1,PIPE-1,"not closed\n', 'S2', { fileName: 'broken.csv' });
assert.equal(unbalanced.ok, false);
assert.ok(unbalanced.findings.some(f => f.code === 'UNBALANCED_CSV_QUOTES'));
const binary = preflightIsoTableText('PS NO\tpipe\nPS-123\0\tPIPE\n', 'S1', { fileName: 'bad.tsv' });
assert.equal(binary.ok, false);
assert.ok(binary.findings.some(f => f.code === 'NUL_BYTE'));
assert.equal(preflightIsoTableText('PS NO,pipe\nPS-01,PIPE-1', 'S1', { fileName: 'data.xlsx' }).ok, false);
assert.equal(preflightIsoTableText('PS NO,pipe\n', 'S1', { fileName: 'empty.csv' }).ok, false);
assert.equal(preflightIsoTableText('x'.repeat(ISO_TABLE_IMPORT_MAX_BYTES + 1), 'S1',
  { fileName: 'huge.csv' }).findings[0].code, 'FILE_TOO_LARGE');

const ui = renderTableCategorizedXmlShellHtml({
  activeTab: 'source', activeStep: 'table', sources: [
    { sourceId: 'S1', sourceName: 'Mapping', sourceText: '', rows: [], headers: [], diagnostics: [] },
    { sourceId: 'S2', sourceName: 'Notes', sourceText: '', rows: [], headers: [], diagnostics: [] },
  ], activeSourceId: 'S1',
  importPreflight: { S1: mapping, S2: wrongRole },
});
for (const s of ['📥 Drag & Drop', 'choose-iso-s1', 'choose-iso-s2', 'data-table-categorized-role-tabs', 'data-table-categorized-source-role-tab="S1"', 'data-table-categorized-source-role-tab="S2"',
  'data-table-categorized-iso-file="S1"', 'data-table-categorized-iso-file="S2"',
  'data-table-categorized-drop-zone=', 'data-table-categorized-preflight-report']) {
  assert.ok(ui.includes(s), 'expected accessible import UI: ' + s);
}
const s2Ui = renderTableCategorizedXmlShellHtml({
  activeTab: 'source', activeStep: 'table',
  sources: [{ sourceId: 'S1', sourceName: 'Mapping', sourceText: 'PS NO,pipe', rows: [], headers: [] },
    { sourceId: 'S2', sourceName: 'Notes', sourceText: 'NODE_NAME,LinenoinCII,SupportISONOTE', rows: [], headers: [] }],
  activeSourceId: 'S2', importPreflight: { S1: mapping, S2: benignS2 },
  profile: { isoNotePlaceholderPolicy: 'warn-and-preserve' },
});
assert.ok(s2Ui.includes('data-table-categorized-preflight-role="S2"'));
assert.ok(!s2Ui.includes('data-table-categorized-preflight-role="S1"'), 'preflight must be isolated per tab');
assert.ok(s2Ui.includes('aria-selected="true" class="is-active">S2 · ISO Notes'));
const runtime = fs.readFileSync(new URL('../tabs/xml-compare-table-categorized-runtime.js', import.meta.url), 'utf8');
assert.match(runtime, /TextDecoder\('utf-8', \{ fatal: true, ignoreBOM: true \}\)/);
assert.match(runtime, /importIsoRoleFile/);
assert.match(runtime, /handleIsoFileDrop/);
console.log('xml-compare-iso-csv-preflight.test.js passed');

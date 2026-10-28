import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parsePsMappingCsv,
  readPsMappingCsvForSource,
  PS_MAP_REFERENCE_MOCK_CSV,
  PS_MAP_MODEL_MOCK_CSV,
  PS_MAP_MAX_CSV_BYTES,
} from '../tabs/ps-mapping-utility/ps-mapping-csv-import.js';
import { runPsMappingResolver } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';

test('two mock CSVs have six mapped columns, correct support IDs and realistic ISONOTE / gap data', () => {
  const reference = readPsMappingCsvForSource('table1CText', PS_MAP_REFERENCE_MOCK_CSV);
  const model = readPsMappingCsvForSource('table2Text', PS_MAP_MODEL_MOCK_CSV);
  assert.equal(reference.rowCount, 3);
  assert.equal(model.rowCount, 3);
  assert.equal(reference.columnCount, 6);
  assert.equal(model.columnCount, 6);
  assert.ok(reference.tsv.startsWith('Line No\tNode\tSupport No\tPipe size\tISONOTE\tMandatory'));
  assert.ok(model.tsv.startsWith('Support No\tBore\tpipe\tDTXR\tSupport Gap\tMandatory'));
  assert.match(reference.tsv, /DO NOT REST \[25mm GAP\], GUIDE\(1kN\), \[GUIDE GAP=10mm\]/);
  assert.match(model.tsv, /25mm GAP BETWEEN BOP AND TOS/);

  const result = runPsMappingResolver({
    table1cNodeIsonoteText: reference.tsv,
    table2ModelText: model.tsv,
  });
  assert.equal(result.consolidatedTable2Rows.length, 3);
  assert.equal(result.rows.length, 3);
  // Two source reference rows are merged by node into one reference master.
  assert.equal(result.consolidatedTable1Rows.length, 2);
  assert.equal(result.userLog.filter((row) => row.level === 'ERROR').length, 0);
});

test('CSV import preserves quoted commas, escaped double quotes, CRLF and trailing empty cells', () => {
  const raw = '\uFEFFSupport No,Bore,pipe,DTXR,Support Gap,Mandatory\r\n' +
    'PS-123.1,200,"Pipe, ""special""",GUIDE,10,\r\n';
  const parsed = parsePsMappingCsv(raw);
  assert.equal(parsed.rowCount, 1);
  assert.equal(parsed.columnCount, 6);
  assert.match(parsed.tsv, /Pipe, "special"\tGUIDE\t10\t$/);
});

test('CSV import flattens embedded quoted newlines to one TSV physical row', () => {
  const result = parsePsMappingCsv('Support No,Notes,Mandatory\nPS-1,"REST,\nGUIDE",Yes');
  assert.equal(result.rowCount, 1);
  assert.equal(result.tsv.split('\n').length, 2);
  assert.match(result.tsv, /PS-1\tREST, GUIDE\tYes/);
});

test('Excel sep= and locale semicolon separator are accepted', () => {
  const parsed = parsePsMappingCsv('sep=;\r\nSupport No;Bore;Mandatory\r\nPS-1;200;Yes\r\n');
  assert.equal(parsed.delimiter, ';');
  assert.match(parsed.tsv, /PS-1\t200\tYes/);
});

test('CSV validation rejects malformed files rather than replacing current pasted data', () => {
  assert.throws(() => parsePsMappingCsv(''), /empty/);
  assert.throws(() => parsePsMappingCsv('one column\nrecord'), /column delimiters/);
  assert.throws(() => parsePsMappingCsv('A,B,C\n1,2'), /CSV row 2 has 2 columns/);
  assert.throws(() => parsePsMappingCsv('A,B\n1,"not closed'), /Unclosed quoted/);
  assert.throws(() => readPsMappingCsvForSource('other', 'A,B\n1,2'), /Unsupported/);
  assert.throws(() => parsePsMappingCsv('A,B\n' + 'x'.repeat(PS_MAP_MAX_CSV_BYTES)), /safety limit/);
});

test('source CSV upload controls stay mirrored to deployed GitHub Pages', () => {
  for (const path of [
    'ps-mapping-utility-tab-source-ux-ui.js',
    'ps-mapping-utility/ps-mapping-csv-import.js',
  ]) {
    assert.equal(
      readFileSync(new URL('../tabs/' + path, import.meta.url), 'utf8'),
      readFileSync(new URL('../docs/tabs/' + path, import.meta.url), 'utf8'),
      path,
    );
  }
});

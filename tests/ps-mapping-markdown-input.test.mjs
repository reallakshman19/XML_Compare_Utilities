import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runPsMappingResolver } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';
import { normalizeSupportTypes } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';
import { evaluateSupportGapComparison, extractTypedSupportGaps, supportTypesFromText } from '../tabs/ps-mapping-utility/ps-mapping-support-gap-logic.js';

const markdownReference = [
  '| Line No  | Node | Support No | Pipe   size | ISONOTE | Mandatory |',
  '| :--- | ---: | --- | --- | --- | --- |',
  '| /ASIM-1885-PL-8"-CS-M8810060-01/B1 | 8410 | PS-070.8 | 8 | :/PS-070.8 :ISONOTE \'REST(10kN), GUIDE(5kN){axial disp=105mm}\' | Yes |',
  '| /ASIM-1885-PL-8"-CS-M8810060-01/B1 | 8460 | PS-067.6 | 8 | :/PS-067.6 :ISONOTE \'REST(4kN)\' | Yes |',
].join('\n');

const tsvModel = [
  'Support No\tBore\tpipe\tDTXR\tSupport Gap\tMandatory',
  'PS-070.1\t200.00\tASIM-1885-PL-8"-M8810060-PP-01\tGUIDE PDO-TYPE-604A/B\t\tNo',
  'PS-067.1\t200.00\tASIM-1885-PL-8"-M8810060-PP-01\tPipe Rest XRT01\t\tNo',
].join('\n');

test('Markdown reference with Support No, comma inside ISONOTE, and separator row is parsed', () => {
  const result = runPsMappingResolver({
    table1cNodeIsonoteText: markdownReference,
    table2ModelText: tsvModel,
  });
  assert.equal(result.consolidatedTable1Rows.length, 2);
  assert.equal(result.consolidatedTable2Rows.length, 2);
  const ref = result.consolidatedTable1Rows.find((row) => row.rawPsNo === 'PS-070.8');
  assert.ok(ref);
  assert.equal(ref.node, '8410');
  assert.equal(ref.nodeLine, '/ASIM-1885-PL-8"-CS-M8810060-01/B1');
  assert.equal(ref.nps, 8);
  assert.equal(ref.mandatory, true);
  assert.match(ref.nodeIsonote, /REST\(10kN\), GUIDE\(5kN\)/);
  assert.ok(result.rows.length >= 2);
});

test('Header mapper runs as a browser top-layer modal and preflight avoids redundant redraws', () => {
  const header = readFileSync(new URL('../tabs/ps-mapping-utility-tab-header-map-ui.js', import.meta.url), 'utf8');
  const preflight = readFileSync(new URL('../tabs/ps-mapping-utility-tab-preflight-ui.js', import.meta.url), 'utf8');
  assert.match(header, /document\.createElement\('dialog'\)/);
  assert.match(header, /backdrop\.showModal\(\)/);
  assert.match(header, /snapshot\.isMarkdown/);
  assert.match(preflight, /_psmapLastRenderedHtml/);
});

test('GitHub Pages docs copies stay in sync with application modules', () => {
  for (const path of [
    'ps-mapping-utility/ps-mapping-engine-diagnostics.js',
    'ps-mapping-utility-tab-preflight-ui.js',
    'ps-mapping-utility-tab-header-map-ui.js',
  ]) {
    const app = readFileSync(new URL('../tabs/' + path, import.meta.url), 'utf8');
    const docs = readFileSync(new URL('../docs/tabs/' + path, import.meta.url), 'utf8');
    assert.equal(docs, app, path);
  }
});


test('DO NOT REST is a non-contact clearance, not a positive REST restraint', () => {
  const iso = "DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]";
  assert.deepEqual([...supportTypesFromText(iso)], ['GUIDE']);
  assert.deepEqual(normalizeSupportTypes(iso), ['GUIDE']);
  assert.deepEqual([...supportTypesFromText('WEAR PLATE')], []);
  assert.deepEqual([...supportTypesFromText('REST(8kN), WEAR PLATE')], ['REST']);
  assert.deepEqual(extractTypedSupportGaps(iso, supportTypesFromText(iso)), { GUIDE: 10, REST_CLEARANCE: 25 });
});

test('REST clearance does not conflict with independent GUIDE GAP', () => {
  const iso = "DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]";
  const rest = evaluateSupportGapComparison({
    table1Text: iso,
    table2Text: 'Pipe Rest XRT01',
    table2GapRaw: '25mm GAP BETWEEN BOP AND TOS',
  });
  assert.equal(rest.status, 'REST_CLEARANCE_EXACT');
  assert.equal(rest.table1GapMm, 25);
  assert.equal(rest.table2GapMm, 25);

  const guide = evaluateSupportGapComparison({
    table1Text: iso,
    table2Text: 'GUIDE PDO-TYPE',
    table2GapRaw: '10',
  });
  assert.equal(guide.status, 'GUIDE_GAP_EXACT');
  assert.equal(guide.table1GapMm, 10);
});

test('untyped DO NOT REST clearance never becomes GUIDE or LINE STOP GAP', () => {
  const iso = "DO NOT REST [25mm GAP](1kN), GUIDE(1kN), LINE STOP(2kN)";
  const guide = evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'GUIDE', table2GapRaw: '',
  });
  const stop = evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'STOP', table2GapRaw: '',
  });
  assert.equal(guide.status, '');
  assert.equal(stop.status, '');
  const rest = evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'Pipe Rest XRT01', table2GapRaw: '25',
  });
  assert.equal(rest.status, 'REST_CLEARANCE_EXACT');
});

test('GUIDE and LINE STOP gaps compare only to the same typed restraint', () => {
  const iso = "REST(2kN), GUIDE(1kN), [GUIDE GAP=20mm], LINE STOP(3kN), [LINE STOP GAP=5mm]";
  assert.equal(evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'GUIDE', table2GapRaw: '0',
  }).status, 'GUIDE_GAP_CONFLICT');
  assert.equal(evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'STOP', table2GapRaw: '5',
  }).status, 'LINE_STOP_GAP_EXACT');
  assert.equal(evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'REST', table2GapRaw: '20',
  }).status, '');
  assert.equal(evaluateSupportGapComparison({
    table1Text: iso, table2Text: 'GUIDE', table2GapRaw: '',
  }).status, 'GUIDE_GAP_MISSING_TABLE2');
  assert.equal(evaluateSupportGapComparison({
    table1Text: "REST(2kN), GUIDE(1kN)", table2Text: 'GUIDE', table2GapRaw: '5',
  }).status, 'GUIDE_GAP_MISSING_TABLE1');
});

test('zero mm is a real gap value and must not be treated as missing', () => {
  const exact = evaluateSupportGapComparison({
    table1Text: 'GUIDE(2kN), [GUIDE GAP=0mm]',
    table2Text: 'GUIDE', table2GapRaw: '0',
  });
  assert.equal(exact.status, 'GUIDE_GAP_EXACT');
  assert.equal(exact.table1GapMm, 0);
  assert.equal(exact.table2GapMm, 0);
});

test('restraint and gap modules remain mirrored for GitHub Pages', () => {
  for (const name of [
    'ps-mapping-support-gap-logic.js',
    'ps-mapping-engine-diagnostics-v3.js',
    'ps-mapping-engine-diagnostics-v4.js',
    'ps-mapping-engine-diagnostics-v15.js',
    'ps-mapping-engine-diagnostics-v16.js',
    'ps-mapping-engine-diagnostics-v17.js',
    'ps-mapping-engine-diagnostics-v20.js',
  ]) {
    const left = readFileSync(new URL('../tabs/ps-mapping-utility/' + name, import.meta.url), 'utf8');
    const right = readFileSync(new URL('../docs/tabs/ps-mapping-utility/' + name, import.meta.url), 'utf8');
    assert.equal(right, left, name);
  }
});

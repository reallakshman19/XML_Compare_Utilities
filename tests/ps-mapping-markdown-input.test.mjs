import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runPsMappingResolver } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';

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

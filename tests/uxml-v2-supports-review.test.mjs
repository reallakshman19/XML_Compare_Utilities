// Review page section 4 (Owner 16 Nov): the rows the page shows and downloads, and that the page's modules load in a browser.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';
import { provenanceCsv, provenanceTableRows, PROVENANCE_COLUMNS } from '../uxml/v2/supports/SupportProvenanceRows.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function golden30() {
  return runSupportsStage({ xmlText: read('fixtures/uxml-v2-supports/oracle/G30/xml/engineering-pass-start.xml'),
    stagedJsonText: read('fixtures/uxml-v2-supports/bench/golden-30_staged.json'),
    supportConfig: JSON.parse(read('fixtures/uxml-v2-supports/bench/golden-30-job-config.json')),
    masters: { materialMapRows: JSON.parse(read('fixtures/uxml-v2-supports/bench/default-material-map-rows.json')) } });
}

test("review rows: GOLDEN-30 sample gives the Owner's 150 provenance rows, with the same steps and sources", () => {
  const rows = provenanceTableRows(golden30());
  assert.equal(rows.length, 150);
  const count = (key) => rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] || 0) + 1 }), {});
  assert.deepEqual(count('Came from'), { 'staged JSON': 145, 'configured default profile': 2, 'input XML': 3 });
  assert.deepEqual(count('Set by'), { '2 DTXR enrichment': 78, '1 parent support match': 68, 'already in the input XML': 2, '3 ATTA default': 1, '4 MDS closure': 1 });
  const rewritten = rows.find((r) => r.Rule === 'parent/input-restraint-rewritten');
  assert.equal(rewritten.NodeNumber, '560');
  assert.equal(JSON.parse(rewritten.Was).Type, 'Z');
  const csv = provenanceCsv(rows).split('\r\n');
  assert.equal(csv[0], `﻿${PROVENANCE_COLUMNS.join(',')}`);
  assert.equal(csv.length, 152);
});

test('review page: no module the page loads imports a Node-only module', () => {
  const seen = new Set(), nodeOnly = [];
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)\s+(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/gm)) {
      if (m[1].startsWith('node:')) nodeOnly.push(`${relative(ROOT, file)} -> ${m[1]}`);
      else if (m[1].startsWith('.')) walk(resolve(dirname(file), m[1].split('?')[0]));
    }
  };
  for (const page of ['uxml/v2/UxmlV2ReviewPage.js', 'uxml/v2/UxmlV2SupportsReview.js']) walk(join(ROOT, page));
  assert.ok(seen.size > 40);
  assert.deepEqual(nodeOnly, []);
});

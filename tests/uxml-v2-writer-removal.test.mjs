// E4 (Owner 21 Nov 2026, "Yes, as suggested"): the PSI116 writer writes a value the document removed (the CII engine's
// bend-radius step drops zero BendRadius tags), so step 10's Enriched XML can be written from the document.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';

const RMS = fs.readFileSync(fileURLToPath(new URL('../fixtures/uxml-v2-supports/bench/RMS-BLOW-1.xml', import.meta.url)), 'utf8');
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const removing = (uids, key) => ({id: 'test:remove', rulesVersion: 't/1', reads: ['topology'], writes: LAYERS,
  run: () => ({ops: uids.map(uid => ({op: 'set', uid, path: 'values.' + key, after: null, rule: 'test:remove'}))})});
const valuesOf = doc => doc.pipelines.flatMap(p => [p, ...p.components]).map(e => [e.uid, Object.fromEntries(Object.entries(e.values).map(([k, v]) => [k, v.text]))]);

test('a removed value loses its element and the whitespace before it; nothing else changes', () => {
  const doc = readPsi116V2(RMS, {fileSha256: sha256Hex(RMS)});
  const withBend = doc.pipelines.flatMap(p => p.components).filter(c => c.values.BendRadius);
  assert.ok(withBend.length > 2);
  const picked = withBend.slice(0, 3).map(c => c.uid);
  const step = runStage(removing(picked, 'BendRadius'), doc);
  const before = writePsi116FromUxmlV2(doc), after = writePsi116FromUxmlV2(step.uxml);
  assert.equal(after.stats.removedValues, 3);
  assert.equal(before.text.split(/<BendRadius>/).length - after.text.split(/<BendRadius>/).length, 3, 'exactly 3 elements gone');
  const lines = t => t.split(/\r?\n/);
  const gone = lines(before.text).filter(l => !lines(after.text).includes(l));
  assert.ok(gone.every(l => /^\s*<BendRadius>[^<]*<\/BendRadius>\s*$/.test(l)), 'only BendRadius lines go');
  // Read back: the written text holds exactly the document's values.
  const back = readPsi116V2(after.text, {fileSha256: sha256Hex(after.text)});
  assert.deepEqual(valuesOf(back).map(([, v]) => v), valuesOf(step.uxml).map(([, v]) => v));
});

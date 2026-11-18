// Support locks in step 10, step 2 (Owner 18 Nov 2026): step 10's supports step keeps the supports of the nodes the
// protection note names. Measured before: on section 5's final XML for the EF-05 four-edit edits, the ATTA-default /
// MDS-closure steps put node 90's removed support back. Input: section 5's final XML (receipt built here, as in
// tests/uxml-v2-supports-apply.test.mjs), run through runSupportsStage as step 10's UXML route runs it.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferSupportKeys} from '../uxml/v2/supports/process/TransferSupportsKeep.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {withoutTransferNote} from '../uxml/v2/transfer/TransferNote.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const step10 = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}});
const baseText = new TextDecoder('utf-8', {ignoreBOM: true}).decode(readFileSync(new URL('base.xml', EF05)));
const read = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});
const texts = r => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v.text]));

function nodeAt(doc, n) {
  for (const [bi, p] of doc.pipelines.entries()) {
    const ni = p.components.findIndex(c => c.values.NodeNumber?.text === String(n));
    if (ni >= 0) return {comp: p.components[ni], ref: {branchOrdinal: bi, branchName: p.values.Branchname.text, nodeOrdinal: ni, nodeNumber: String(n)}};
  }
  throw new Error('no node ' + n);
}
const restraintsOf = (doc, n) => nodeAt(doc, n).comp.restraints.map(texts);

/** Section 5's final XML for the four edits (node 50 stiffness, node 90 removed, guide at node 240). */
function finalXml() {
  const doc = read(baseText);
  const n50 = nodeAt(doc, 50), n90 = nodeAt(doc, 90), n240 = nodeAt(doc, 240);
  const r50 = texts(n50.comp.restraints[0]);
  const receipt = {format: 'u2.transfer-receipt', version: 1, ok: true, base: {sha256: doc.sources[0].sha256}, changes: [], refused: [],
    supports: {refused: [], changes: [
      {ciiNode: '50', kind: 'edited', ref: n50.ref, restraintCount: 1, restraints: [{op: 'edit', index: 0, before: r50, after: {...r50, Stiffness: '2.000000E+12'}}]},
      {ciiNode: '90', kind: 'removed', ref: n90.ref, restraintCount: 1, restraints: [{op: 'remove', index: 0, before: texts(n90.comp.restraints[0])}]},
      {ciiNode: '240', kind: 'added', ref: n240.ref, restraintCount: 0, restraints: [{op: 'add', after: {Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0'}}]},
    ]}};
  const transfer = runStage(transferStage, doc, {receipt, receiptSha256: 'r'.repeat(64)});
  return runEngineeringUnderLocks(transfer.uxml, text => step10(text).xmlText).xmlText;
}
const xml = finalXml();

test('step 10\'s supports step keeps node 90 without its support, and nodes 50 and 240 as transferred', () => {
  assert.equal(transferSupportKeys(xml).length, 3);
  const run = step10(xml);
  const out = read(run.xmlText);
  assert.deepEqual(restraintsOf(out, 90), []);
  assert.equal(restraintsOf(out, 50)[0].Stiffness, '2.000000E+12');
  assert.deepEqual(restraintsOf(out, 240), [{Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0'}]);
  const kept = run.diagnostics.filter(d => d.type === 'transfer-supports');
  assert.deepEqual(kept.map(d => [d.severity, d.count]), [['info', 1]]);
  assert.match(kept[0].message, /^1 node\(s\) keep the supports transferred from CAESAR II/);
  assert.deepEqual(kept[0].nodes.map(k => [k.key.split('|')[1], k.runSupports, k.kept]), [['90', ['+Y 1.751270E+12 0 0.3'], []]]);
  assert.equal(run.stats.transferSupportsKept, 1);
});

test('control: the same XML without the note gets node 90\'s support back (the check above is not empty)', () => {
  const out = read(step10(withoutTransferNote(xml)).xmlText);
  assert.equal(restraintsOf(out, 90).length, 1);
});

test('an XML with no note gives the stage output it gave before (nothing kept, no diagnostic)', () => {
  const run = step10(baseText);
  assert.equal(run.stats.transferSupportsKept, 0);
  assert.equal(run.diagnostics.filter(d => d.type === 'transfer-supports').length, 0);
});

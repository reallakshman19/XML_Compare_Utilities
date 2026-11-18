// Supports from CAESAR II, step 3 (Owner 18 Nov 2026: "Yes, allow and lock"): section 5 applies the receipt's support
// changes to the XML and locks them; the supports stage run after may not put a removed support back or edit a
// transferred one. The full EF-05 four-edit run needs Pyodide (U2D_PYODIDE, as tests/uxml-v2-ef05-sample.test.mjs);
// the other tests use a receipt built here from the same EF-05 nodes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {runStage, sha256Hex, undoDelta} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {noteLockStage, transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {readTransferNote, supportNoteKeys} from '../uxml/v2/transfer/TransferNote.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const realStage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const baseBytes = new Uint8Array(readFileSync(new URL('base.xml', EF05)));
const baseText = new TextDecoder('utf-8', {ignoreBOM: true}).decode(baseBytes);
const read = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});

const texts = r => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v.text]));
/** Where EF-05's node `n` sits: the ref the receipt uses, and the component. */
function nodeAt(doc, n) {
  for (const [bi, p] of doc.pipelines.entries()) {
    const ni = p.components.findIndex(c => c.values.NodeNumber?.text === String(n));
    if (ni >= 0) return {comp: p.components[ni], ref: {branchOrdinal: bi, branchName: p.values.Branchname.text, nodeOrdinal: ni, nodeNumber: String(n)}};
  }
  throw new Error('no node ' + n);
}
/** The receipt U2d writes for the four-edit CII, built from the same nodes (shape of prototypes/u2d-cii-source). */
function receiptFor(doc, {count50} = {}) {
  const n50 = nodeAt(doc, 50), n90 = nodeAt(doc, 90), n240 = nodeAt(doc, 240);
  const r50 = texts(n50.comp.restraints[0]);
  return {format: 'u2.transfer-receipt', version: 1, ok: true, base: {sha256: doc.sources[0].sha256}, changes: [], refused: [],
    supports: {refused: [], changes: [
      {ciiNode: '50', kind: 'edited', ref: n50.ref, restraintCount: count50 ?? 1, restraints: [{op: 'edit', index: 0, before: r50, after: {...r50, Stiffness: '2.000000E+12'}}]},
      {ciiNode: '90', kind: 'removed', ref: n90.ref, restraintCount: 1, restraints: [{op: 'remove', index: 0, before: texts(n90.comp.restraints[0])}]},
      {ciiNode: '240', kind: 'added', ref: n240.ref, restraintCount: 0, restraints: [{op: 'add', after: {Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0'}}]},
    ]}};
}
const restraintsOf = (doc, n) => nodeAt(doc, n).comp.restraints.map(texts);
/** A stand-in stage that copies node 50's restraint into node 90 (a text edit, as the real stage writes text): it puts a removed support back. */
const putBack = text => {
  const at50 = text.indexOf('<NodeNumber>50</NodeNumber>'), r = text.indexOf('<Restraint>', at50);
  const restraint = text.slice(r, text.indexOf('</Restraint>', r) + '</Restraint>'.length);
  const at90 = text.indexOf('<NodeNumber>90</NodeNumber>'), end = text.indexOf('</Node>', at90);
  return text.slice(0, end) + restraint + text.slice(end);
};
/** A stand-in stage that sets node 50's stiffness back to the XML's. */
const resetStiffness = text => {
  const at50 = text.indexOf('<NodeNumber>50</NodeNumber>'), s = text.indexOf('<Stiffness>', at50), e = text.indexOf('</Stiffness>', s);
  return text.slice(0, s) + '<Stiffness>1.751270E+12' + text.slice(e);
};

function applied(stage = realStage) {
  const doc = read(baseText);
  const transfer = runStage(transferStage, doc, {receipt: receiptFor(doc), receiptSha256: 'r'.repeat(64)});
  return {doc, transfer, locked: runEngineeringUnderLocks(transfer.uxml, stage)};
}

test('the three support changes are applied and locked; the node carries a supports lock', () => {
  const {transfer} = applied();
  const u = transfer.uxml;
  assert.equal(restraintsOf(u, 50)[0].Stiffness, '2.000000E+12');
  assert.deepEqual(restraintsOf(u, 90), []);
  assert.deepEqual(restraintsOf(u, 240), [{Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0'}]);
  for (const n of [50, 90, 240]) assert.equal(nodeAt(u, n).comp.values.NodeNumber.lock.supports, true, `node ${n} supports lock`);
  for (const n of [50, 240]) assert.ok(Object.values(nodeAt(u, n).comp.restraints[0].values).every(v => v.lock?.by === 'transfer'));
});

test('the real supports stage tries to put node 90\'s support back;the lock stops it and the final XML has the transferred supports', () => {
  const {doc, locked} = applied();
  const out = read(locked.xmlText);
  assert.equal(restraintsOf(out, 50)[0].Stiffness, '2.000000E+12');
  assert.deepEqual(restraintsOf(out, 90), []);
  assert.equal(restraintsOf(out, 240)[0].Type, 'GUI');
  const count = d => d.pipelines.reduce((n, p) => n + p.components.reduce((m, c) => m + c.restraints.length, 0), 0);
  assert.equal(count(out), count(doc));               // one removed, one added
  // Found 18 Nov: on step 10's Enriched EF-05 the stage itself restores the removed support (the plan's "wrong output").
  assert.deepEqual(locked.conflicts.filter(c => c.key === 'Supports').map(c => [c.node, c.kept, c.stageWanted]),
    [['90', 'none', '+Y 1.751270E+12 gap 0 friction 0.3']]);
});

test('a stage that puts the removed support back is stopped by the lock, and the support stays removed', () => {
  const {locked} = applied(putBack);
  const c = locked.conflicts.filter(x => x.key === 'Supports');
  assert.deepEqual(c.map(x => [x.node, x.kept]), [['90', 'none']]);
  assert.equal(c[0].stageWanted, '+Y 2.000000E+12 gap 0 friction 0.3');   // node 50's restraint, copied
  assert.deepEqual(restraintsOf(read(locked.xmlText), 90), []);
});

test('a stage that sets a transferred stiffness back is stopped by the lock', () => {
  const {locked} = applied(resetStiffness);
  assert.deepEqual(locked.conflicts.filter(x => x.key === 'Supports').map(x => x.node), ['50']);
  assert.equal(restraintsOf(read(locked.xmlText), 50)[0].Stiffness, '2.000000E+12');
});

test('undo gives the opened XML back', () => {
  const {doc, transfer} = applied();
  const back = undoDelta(transfer.uxml, transfer.delta).uxml;
  assert.deepEqual(back.pipelines, doc.pipelines);
});

// Support locks in step 10, step 1 (Owner 18 Nov 2026): the protection note names the nodes whose supports were transferred.
test('the note step 10 reads names the three nodes, after any value fields; no value changes means empty branches and nodes', () => {
  const {doc, locked} = applied();
  const branch = nodeAt(doc, 50).ref.branchName;
  assert.deepEqual(readTransferNote(locked.xmlText).note, {v: 1, branches: {}, nodes: {}, supports: [`${branch}|50`, `${branch}|90`, `${branch}|240`]});
  assert.deepEqual(locked.supportsNotKeyed, []);
});

test('a file with that note, opened again, gets the support locks back and keeps node 90 without its support', () => {
  const {locked} = applied();
  const reopened = read(locked.xmlText);
  const note = readTransferNote(locked.xmlText);
  const relocked = runStage(noteLockStage, reopened, {note: note.note, noteSha256: sha256Hex(note.raw)});
  for (const n of [50, 90, 240]) assert.equal(nodeAt(relocked.uxml, n).comp.values.NodeNumber.lock.supports, true, `node ${n}`);
  const again = runEngineeringUnderLocks(relocked.uxml, putBack);
  assert.deepEqual(again.conflicts.filter(c => c.key === 'Supports').map(c => c.node), ['90']);
  assert.deepEqual(restraintsOf(read(again.xmlText), 90), []);
});

test('a node the note cannot name (its number used twice in the branch) is listed, not protected silently', () => {
  const {transfer} = applied();
  const u = structuredClone(transfer.uxml);
  const {comp} = nodeAt(u, 50);
  const twin = u.pipelines.find(p => p.components.includes(comp)).components.find(c => c !== comp);
  twin.values.NodeNumber = {...twin.values.NodeNumber, v: 50, text: '50'};
  assert.deepEqual(supportNoteKeys(u).unkeyed.map(x => [x.nodeNumber, x.why]), [['50', 'another node in the branch has the same number']]);
  assert.equal(supportNoteKeys(u).keys.length, 2);
});

test('a receipt that saw other supports on the node is refused, nothing applied', () => {
  const doc = read(baseText);
  assert.throws(() => runStage(transferStage, doc, {receipt: receiptFor(doc, {count50: 2})}),
    e => e.code === 'UXML_TRANSFER_BEFORE_MISMATCH' && e.details.field === 'Node/Supports' && e.details.nodeNumber === '50');
});

test('EF-05 four-edit CAESAR II file: 41 values and 3 supports transfer, 1 support on a new node refused', {skip: !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set'}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const r = await transferCiiIntoXml({targetBytes: baseBytes, ciiBytes: new Uint8Array(readFileSync(new URL('supports-edits.cii', EF05))),
    names: {cii: 'EF-05-supports-edits.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'}, weightScale: 10,
    loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  assert.equal(r.receipt.summary.edits, 41);
  assert.deepEqual(r.receipt.summary.supports.byKind, {edited: 1, removed: 1, added: 1});
  assert.deepEqual(r.receipt.supports.refused.filter(x => x.code === 'U2D_SUPPORT_NEW_NODE').map(x => x.ciiNode), ['99999']);
  const doc = read(baseText);
  const transfer = runStage(transferStage, doc, {receipt: r.receipt, receiptSha256: sha256Hex(r.receiptText)});
  const out = read(runEngineeringUnderLocks(transfer.uxml, realStage).xmlText);
  assert.equal(restraintsOf(out, 50)[0].Stiffness, '2.000000E+12');
  assert.deepEqual(restraintsOf(out, 90), []);
  assert.deepEqual(restraintsOf(out, 240), [{Type: 'GUI', Stiffness: '1.751270E+12', Gap: '0', Friction: '0'}]);
});

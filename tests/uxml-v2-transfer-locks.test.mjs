// UXML plan step 6 (Owner 17 Nov 2026): the property transfer as a UXML change with locks, on the BM2 transfer pair
// (fixtures/uxml-v2-transfer/BM2: base = the Owner's BM2 Enriched XML, receipt = the U2d transfer from the 14 Nov
// control CII, protected = the file U2d wrote). Expected values come from the receipt and the U2d file, not from this code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyDelta, runStage, sha256Hex, undoDelta } from '../uxml/v2/UxmlV2Kernel.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { writePsi116FromUxmlV2 } from '../uxml/v2/UxmlV2Psi116Writer.js';
import { noteLockStage, transferStage } from '../uxml/v2/transfer/TransferStage.js';
import { noteFromLocks, readTransferNote, withoutTransferNote, withTransferNote } from '../uxml/v2/transfer/TransferNote.js';
import { runEngineeringUnderLocks, valueChangeOps } from '../uxml/v2/transfer/LockedEngineering.js';
import { loadCalls, revive } from '../uxml/v2/supports/CoreCallsLib.js';
import { runSupportsStage } from '../uxml/v2/supports/SupportsStage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const at = (...p) => path.join(ROOT, ...p);
const text = (f) => fs.readFileSync(at('fixtures/uxml-v2-transfer/BM2', f), 'utf8');
const base = text('base.xml');
const protectedXml = text('protected.xml');
const receiptText = text('receipt.json');
const receipt = JSON.parse(receiptText);
const inputs = { receipt, receiptSha256: sha256Hex(receiptText) };
const read = (t) => readPsi116V2(t, { fileSha256: sha256Hex(t) });

const snap = revive(JSON.parse(fs.readFileSync(at('fixtures/uxml-v2-supports/oracle/BM2/xml/engineering-pass-start.json'), 'utf8')));
const dtxr = loadCalls([at('fixtures/uxml-v2-supports/core-calls/BM2.substep-calls.json')]).find((c) => c.name === 'enrichStandaloneDtxrAnnotations');
const [, stagedJsonText, supportConfig] = revive(dtxr.args);
const stage = (xmlText) => runSupportsStage({ xmlText, stagedJsonText, supportConfig, masters: { materialMapRows: snap.config.material?.mapRows } }).xmlText;

const r0 = read(base);
const transferred = runStage(transferStage, r0, inputs);
const engineered = runEngineeringUnderLocks(transferred.uxml, stage);
const LAST = 30; // the receipt's branch changes are on branch 30 (/GLRD-1000-2"-B4110011-93833-01/B1)

test('the transfer delta is the receipt: 10 set + 10 lock, 70 refusals carried, file = U2d file byte for byte', () => {
  const plain = runStage(transferStage, r0, inputs, { materialFollows: false });
  assert.equal(plain.delta.ops.filter((o) => o.op === 'set').length, receipt.changes.length);
  assert.equal(plain.delta.ops.filter((o) => o.op === 'lock').length, receipt.changes.length);
  assert.equal(plain.diagnostics.length, receipt.refused.length);
  const written = withTransferNote(writePsi116FromUxmlV2(plain.uxml).text, noteFromLocks(plain.uxml));
  assert.equal(written, protectedXml);
});

test('engineering under locks keeps 127 / 110 / 106 and lists only what it was stopped from writing', () => {
  const b = engineered.uxml.pipelines[LAST].values;
  assert.deepEqual([b['Temperature.Temperature1'].text, b.FluidDensity.text, b.MaterialNumber.text], ['127', '110', '106']);
  assert.deepEqual(engineered.conflicts.map((c) => [c.key, c.kept, c.stageWanted]).sort(),
    [['FluidDensity', '110', '100'], ['Temperature.Temperature1', '127', '120']]);
  const codes = new Set(engineered.uxml.pipelines[LAST].components.map((c) => c.values.MaterialCode?.text).filter(Boolean));
  assert.deepEqual([...codes], ['106']);
});

test("the result equals the stage's own note protection on the U2d file, value for value, note included", () => {
  const today = read(stage(protectedXml));
  assert.deepEqual(valueChangeOps(read(engineered.xmlText), today), []);
  assert.equal(readTransferNote(engineered.xmlText).raw, readTransferNote(protectedXml).raw);
});

test('undo of the transfer gives the base file back byte for byte; a tampered delta is refused', () => {
  assert.equal(writePsi116FromUxmlV2(undoDelta(transferred.uxml, transferred.delta).uxml).text, base);
  const bad = structuredClone(transferred.delta);
  bad.ops.find((o) => o.op === 'set').after.v = 'TAMPERED';
  assert.throws(() => applyDelta(r0, bad), { code: 'UXML_DELTA_RESULT_MISMATCH' });
});

test('control: without locks the stage puts the master values back (the lock test is not empty)', () => {
  const ctl = runEngineeringUnderLocks(read(withoutTransferNote(protectedXml)), stage);
  assert.equal(ctl.uxml.pipelines[LAST].values['Temperature.Temperature1'].text, '120');
  assert.equal(ctl.conflicts.length, 0);
  assert.equal(readTransferNote(ctl.xmlText), null);
});

test('locks from the note of the U2d file give the same final file and the same conflicts', () => {
  const note = readTransferNote(protectedXml);
  const locked = runStage(noteLockStage, read(protectedXml), { note: note.note, noteSha256: sha256Hex(note.raw) });
  const viaNote = runEngineeringUnderLocks(locked.uxml, stage);
  assert.equal(viaNote.xmlText, engineered.xmlText);
  assert.equal(viaNote.conflicts.length, engineered.conflicts.length);
});

test('a receipt for another file, or a target that no longer holds the receipt value, is refused', () => {
  assert.throws(() => runStage(transferStage, read(protectedXml), inputs), { code: 'UXML_TRANSFER_BASE_MISMATCH' });
  const stale = structuredClone(receipt);
  stale.changes[0].before = 'NOT-THERE';
  assert.throws(() => runStage(transferStage, r0, { receipt: stale }), { code: 'UXML_TRANSFER_BEFORE_MISMATCH' });
});

// Section 5, EF-05 (Owner 18 Nov 2026): the EF-05 CAESAR II sample, and a plain refusal for an XML that has not been
// through step 10. The full sample run needs Pyodide: set U2D_PYODIDE to a local Pyodide 0.27.2 folder (e.g.
// 3D_Converters vendor/pyodide); without it that test is skipped and the others still run.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {sha256Hex, runStage} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';
import {NOT_THROUGH_STEP_10, runUnderLocksOrExplain, structureChanges} from '../uxml/v2/transfer/NotThroughStep10.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const stage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const decode = bytes => new TextDecoder('utf-8', {ignoreBOM: true}).decode(bytes);
const baseBytes = new Uint8Array(readFileSync(new URL('base.xml', EF05)));
const baseText = decode(baseBytes);
const read = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});
/** A stand-in stage that removes the last node of the first branch (a text edit, as the real stage writes text). */
const dropOneNode = text => {
  const end = text.indexOf('</Branch>'), start = text.lastIndexOf('<Node>', end), close = text.indexOf('</Node>', start) + '</Node>'.length;
  return text.slice(0, start) + text.slice(close);
};

test('EF-05 sample files are the ones the README names (byte SHA-256, as the receipt names files)', () => {
  const readme = readFileSync(new URL('README.md', EF05), 'utf8');
  for (const f of ['base.xml', 'source.cii']) {
    const got = createHash('sha256').update(readFileSync(new URL(f, EF05))).digest('hex');
    assert.ok(readme.includes(got), `${f} sha256 ${got} is in the README`);
  }
});

test("step 10's Enriched EF-05 is settled: the supports step changes no structure on it", () => {
  const c = structureChanges(read(baseText), stage);
  assert.equal(c.any, false, JSON.stringify(c));
});

test('an XML the stage would change in structure gets the plain "not through step 10" refusal', () => {
  const doc = read(baseText);
  assert.throws(() => runUnderLocksOrExplain(doc, doc, dropOneNode), error => {
    assert.equal(error.code, NOT_THROUGH_STEP_10);
    assert.match(error.message, /^This XML has not been through step 10: .*1 node removed.*Enriched XML that step 10 writes\. Nothing was transferred\.$/);
    assert.doesNotMatch(error.message, /UXML_/);
    assert.equal(error.counts.nodesRemoved, 1);
    assert.equal(error.cause.code, 'UXML_ENGINEERING_STRUCTURE_CHANGED');
    return true;
  });
});

test('a structure change that only the transferred values cause keeps the original refusal', () => {
  const doc = read(baseText);
  let calls = 0;
  const onlyFirst = text => (calls++ === 0 ? dropOneNode(text) : text);  // the locked run changes structure, the opened XML does not
  assert.throws(() => runUnderLocksOrExplain(doc, doc, onlyFirst), error => error.code === 'UXML_ENGINEERING_STRUCTURE_CHANGED');
  assert.equal(calls, 2);
});

test('EF-05 CAESAR II sample: 41 branch temperatures transfer and the run under locks completes', {skip: !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set'}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const r = await transferCiiIntoXml({targetBytes: baseBytes, ciiBytes: new Uint8Array(readFileSync(new URL('source.cii', EF05))),
    names: {cii: 'EF-05-step10-T1plus10.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'}, weightScale: 10,
    loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  assert.equal(r.match.pairedCii, 617);
  assert.equal(r.match.ciiNodes, 617);
  assert.equal(r.receipt.summary.edits, 41);
  assert.deepEqual(r.receipt.summary.byField, {'Branch/Temperature/Temperature1': 41});
  assert.ok(r.receipt.changes.every(c => Number(c.after) === Number(c.before) + 10), 'each transferred temperature is the base plus 10');
  const doc = read(baseText);
  const transfer = runStage(transferStage, doc, {receipt: r.receipt, receiptSha256: sha256Hex(r.receiptText)});
  const locked = runUnderLocksOrExplain(transfer.uxml, doc, stage);
  const restraints = d => d.pipelines.reduce((n, p) => n + p.components.reduce((m, c) => m + c.restraints.length, 0), 0);
  assert.equal(restraints(read(locked.xmlText)), restraints(doc), 'restraint count equals the Enriched XML');
  const after = new Map(r.receipt.changes.map(c => [c.ref.branchName, c.after]));
  for (const c of locked.conflicts.filter(c => /Temperature1$/.test(c.key))) {
    assert.equal(Number(c.kept), Number(after.get(c.branch)), `branch ${c.branch} keeps the transferred temperature`);
  }
  const out = read(locked.xmlText);
  for (const p of out.pipelines) {
    const want = after.get(p.values.BranchName?.text ?? p.values.Branchname?.text);
    if (want !== undefined) assert.equal(Number(p.values['Temperature.Temperature1']?.text ?? NaN), Number(want));
  }
});

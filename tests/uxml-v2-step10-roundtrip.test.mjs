// T4 step 2 (road map 26 Nov 2026): the round trip step 10 -> CAESAR II edits -> transfer -> step 10 -> transfer is a
// fixed point. For EF-05 and BM2 (fixtures/uxml-v2-transfer/<model>-on/roundtrip.json: the edit set and the expected
// counts), with the real step 10 (headless Chromium, tests/step10-in-chromium.mjs) and section 5's transfer (the pinned
// Python in Pyodide, the transfer stage and the engineering under locks, as the page runs them):
//   (c) step 10's untouched CII transferred back gives 0 edits and 0 support changes;
//   (a) step 10's second CII is the edited CII over the whole file (element values as numbers, supports per node,
//       every other line of every section token by token), apart from the node CAESAR II renumbered (step 10 keeps
//       its number) and the differences roundtrip.json pins with their reason (BM2's refused support copy, EF-05's
//       reducer wall step 10 derives);
//   (b) the second CII transferred into the second Enriched XML gives 0 edits and 0 support changes;
//   control (EF-05): with one written edit dropped from the first transfer, (a) finds exactly that value missing from
//   step 10's CII, so (a) is not empty.
// Slow (~4 min per model); run before each XCU merge that touches the transfer. Needs U2D_PYODIDE (Pyodide 0.27.2),
// U3B_3DC and Playwright (see step10-in-chromium.mjs); skipped without them.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';
import {step10Runner} from './step10-in-chromium.mjs';

const ROOT = new URL('../', import.meta.url);
const FIX = new URL('fixtures/uxml-v2-transfer/', ROOT);
const HELPER = fileURLToPath(new URL('prototypes/u2d-cii-source/tests/roundtrip_t4.py', ROOT));
const step10 = step10Runner();
const skip = (!process.env.U2D_PYODIDE && 'U2D_PYODIDE not set') || (!step10 && 'U3B_3DC not set, or Playwright not found (U3B_PLAYWRIGHT)');
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const stage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const python = (...args) => JSON.parse(execFileSync('python', ['-E', '-s', HELPER, ...args], {encoding: 'utf8', maxBuffer: 1 << 26}));
const count = xs => xs.reduce((a, x) => ({...a, [x]: (a[x] || 0) + 1}), {});

/** Section 5 by node id: the receipt, then the page's final XML (written to outXml). drop: a receipt change to leave
 * out (the control). */
async function transfer({xml, cii, sidecar, outXml, drop = null}) {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const targetBytes = new Uint8Array(readFileSync(xml));
  const r = await transferCiiIntoXml({targetBytes, ciiBytes: new Uint8Array(readFileSync(cii)),
    sidecarBytes: new Uint8Array(readFileSync(sidecar)), weightScale: 10, loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/'),
    names: {cii: 'model.cii', target: 'model-enriched.xml', revised: 'model-revised.xml', sidecar: 'model.cii.sidecar.json'}});
  const receipt = drop === null ? r.receipt : {...r.receipt, changes: r.receipt.changes.filter((_, i) => i !== drop)};
  const receiptText = drop === null ? r.receiptText : JSON.stringify(receipt);
  const text = new TextDecoder('utf-8', {ignoreBOM: true}).decode(targetBytes);
  const t = runStage(transferStage, readPsi116V2(text, {fileSha256: sha256Hex(text)}), {receipt, receiptSha256: sha256Hex(receiptText)});
  if (outXml) writeFileSync(outXml, runEngineeringUnderLocks(t.uxml, stage).xmlText);
  return r.receipt;
}

/** The counts roundtrip.json gives for one transfer. */
function counts(receipt) {
  const s = receipt.supports || {};
  return {changes: receipt.changes.length, byField: count(receipt.changes.map(c => c.field)),
    refused: count((receipt.refused || []).map(x => x.code)), supportChanges: (s.changes || []).map(c => [c.ciiNode, c.kind]),
    supportRefused: count((s.refused || []).map(x => x.code))};
}

/** Step 10's files of one run, written to dir/<name>.*; returns their paths. */
function keep(dir, name, run) {
  assert.equal(run.ok, true, `step 10 ran on ${name}`);
  assert.ok(run.sidecar, `step 10 made a CII sidecar for ${name} (the UXML route and "Engine reads UXML" are on)`);
  const p = {cii: join(dir, `${name}.cii`), xml: join(dir, `${name}.enriched.xml`), sidecar: join(dir, `${name}.cii.sidecar.json`)};
  writeFileSync(p.cii, run.cii);
  writeFileSync(p.xml, run.enriched);
  writeFileSync(p.sidecar, run.sidecar);
  writeFileSync(join(dir, `${name}.logs.json`), run.logs);
  return p;
}

async function roundTrip(model, {control = false} = {}) {
  const here = new URL(`${model}-on/`, FIX);
  const spec = JSON.parse(readFileSync(new URL('roundtrip.json', here), 'utf8'));
  const tmp = mkdtempSync(join(tmpdir(), `uxml-t4-${model}-`));
  const source = spec.source.in3dc ? join(resolve(process.env.U3B_3DC), spec.source.in3dc) : fileURLToPath(new URL(spec.source.here, here));
  const a = keep(tmp, 'a', (await step10([source]))[0]);

  // (c) untouched.
  const untouched = counts(await transfer({xml: a.xml, cii: a.cii, sidecar: a.sidecar}));
  assert.deepEqual([untouched.changes, untouched.supportChanges, untouched.supportRefused], [0, [], {}], 'untouched CII');

  const edited = join(tmp, 'edited.cii');
  assert.equal(python('edits', a.xml, a.cii, a.sidecar, fileURLToPath(new URL('roundtrip.json', here)), edited).shared,
    spec.expect.shared);
  const xml2 = join(tmp, 'revised.xml');
  const first = await transfer({xml: a.xml, cii: edited, sidecar: a.sidecar, outXml: xml2});
  const {renumbered, ...want} = spec.expect.first;
  assert.deepEqual(counts(first), want, 'first transfer');
  assert.deepEqual(first.nodeTable.filter(r => r.step10 !== r.cii).map(r => [r.cii, r.step10]), renumbered);
  const row = Object.fromEntries(first.nodeTable.map(r => [r.cii, r]));
  for (const c of first.supports.changes) assert.ok(row[c.ciiNode].supports > 0, `node table: support change at ${c.ciiNode}`);
  for (const s of first.supports.refused.filter(x => x.ciiNode))
    assert.ok(row[s.ciiNode].refused.includes(s.code), `node table: ${s.code} at ${s.ciiNode}`);

  const mutant = join(tmp, 'revised-one-dropped.xml');
  if (control) await transfer({xml: a.xml, cii: edited, sidecar: a.sidecar, outXml: mutant, drop: 0});
  const runs = await step10(control ? [xml2, mutant] : [xml2]);
  const b = keep(tmp, 'b', runs[0]);

  // (a) step 10's second CII is the edited CII, over the whole file.
  const {from, to} = spec.edits.renumber;
  const d = python('compare', edited, b.cii);
  const renumberCell = ([, , , x, y]) => Number(x) === Number(to) && Number(y) === Number(from);
  assert.deepEqual(d.values.filter(v => !renumberCell(v)), spec.expect.cii2.values, 'values in the second CII');
  assert.ok(d.values.some(renumberCell), 'the renumbered node is in the compare, so the filter is not empty');
  assert.deepEqual(d.supports, spec.expect.cii2.supports, 'supports in the second CII');
  assert.deepEqual(d.lines, spec.expect.cii2.lines, 'every other line of the second CII');

  // (b) the second transfer is a fixed point.
  const second = counts(await transfer({xml: b.xml, cii: b.cii, sidecar: b.sidecar}));
  assert.deepEqual({changes: second.changes, refused: second.refused, supportChanges: second.supportChanges,
    supportRefused: second.supportRefused}, spec.expect.second, 'second transfer');

  if (control) {
    // Step 10 writes its CII from the XML, so a lost edit stays lost through (b); (a) is the check that sees it.
    const m = keep(tmp, 'm', runs[1]);
    const lost = python('compare', edited, m.cii).values.filter(v => !renumberCell(v));
    assert.equal(lost.length, 1, `with one written edit dropped, (a) finds exactly that one value: ${JSON.stringify(lost)}`);
    assert.equal(Number(lost[0][3]), Number(first.changes[0].after), 'and it is the dropped edit\'s value');
  }
  rmSync(tmp, {recursive: true, force: true});  // kept when the run fails, to look at
}

test('EF-05: step 10 -> edits -> transfer -> step 10 -> transfer gives 0 edits the second time', {skip, timeout: 1200000},
  () => roundTrip('EF05', {control: true}));

test('BM2: step 10 -> edits -> transfer -> step 10 -> transfer gives 0 edits the second time', {skip, timeout: 1200000},
  () => roundTrip('BM2'));

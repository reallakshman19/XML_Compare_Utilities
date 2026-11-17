// Transfer in the app (Owner 17 Nov 2026): the review page runs the CAESAR II -> Enriched XML transfer with the pinned Python.
// The full run needs Pyodide: set U2D_PYODIDE to a local Pyodide 0.27.2 folder (e.g. 3D_Converters vendor/pyodide); without it
// that test is skipped and the pin tests still run.
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {loadPinnedPython, transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const ROOT = new URL('../', import.meta.url);
const PIN = new URL('uxml/v2/transfer/u2d-py-pin.json', ROOT);
const BM2 = new URL('fixtures/uxml-v2-transfer/BM2/', ROOT);

test('every Python file the page runs matches its pin, and the pin holds the whole set', async () => {
  const {pin, files} = await loadPinnedPython(ROOT, PIN);
  assert.equal(files.length, Object.keys(pin.files).length);
  for (const need of ['u2d-cii-source/u2d_browser.py', 'u2d-cii-source/u2d_plan.py', 'u3b-cii-check/u3b_core.py', 'cii-v11-v14/cii_v11_v14.py']) {
    assert.ok(files.some(f => f.to === need), need);
  }
});

test('a Python file that is not the tested one stops the page', async () => {
  const pin = JSON.parse(readFileSync(PIN, 'utf8'));
  const first = Object.keys(pin.files)[0];
  pin.files[first] = {...pin.files[first], sha256: '0'.repeat(64)};
  const dir = mkdtempSync(join(tmpdir(), 'u2d-pin-'));
  writeFileSync(join(dir, 'pin.json'), JSON.stringify(pin));
  await assert.rejects(loadPinnedPython(ROOT, pathToFileURL(join(dir, 'pin.json'))), /U2D_PIN_MISMATCH/);
});

test('BM2: the page transfer gives the receipt and values of the command-line transfer', {skip: !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set'}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const cli = JSON.parse(readFileSync(new URL('receipt.json', BM2), 'utf8'));
  const r = await transferCiiIntoXml({targetBytes: new Uint8Array(readFileSync(new URL('base.xml', BM2))),
    ciiBytes: new Uint8Array(readFileSync(new URL('source.cii', BM2))), names: {cii: 'ctl.cii', target: 'target.xml', revised: 'revised.xml'},
    weightScale: 10, loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  assert.equal(r.receipt.base.sha256, cli.base.sha256);
  assert.equal(r.receipt.source.sha256, cli.source.sha256);
  assert.equal(r.receipt.revised.sha256, cli.revised.sha256, 'transferred XML (with its protection note) is byte-identical');
  assert.deepEqual(r.receipt.changes, cli.changes);
  assert.equal(r.receipt.summary.edits, cli.summary.edits);
  assert.deepEqual(r.receipt.summary.byField, cli.summary.byField);
  // The committed receipt predates the Owner's 17 Nov rule (branch values only from paired elements): two BM2 branches
  // with no matched element moved from U2D_MATERIAL_CARRIED to U2D_BRANCH_NOT_PAIRED; every other refusal is unchanged.
  const key = x => JSON.stringify(Object.entries(x).sort());
  const moved = new Set(r.receipt.refused.filter(x => x.code === 'U2D_BRANCH_NOT_PAIRED').map(x => x.branch));
  assert.equal(moved.size, 2);
  const old = cli.refused.filter(x => !(x.code === 'U2D_MATERIAL_CARRIED' && moved.has(x.branch)));
  assert.deepEqual(r.receipt.refused.filter(x => x.code !== 'U2D_BRANCH_NOT_PAIRED').map(key).sort(), old.map(key).sort());
});

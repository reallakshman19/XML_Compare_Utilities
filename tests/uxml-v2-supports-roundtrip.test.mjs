// Supports from CAESAR II, step 5 (Owner 18 Nov 2026): the round trip. Section 5's final XML for the EF-05 four-edit
// CII, run through step 10's writer again, gives a CII whose supports equal the edited CII's, apart from the one support
// the transfer refused (node 99999, a node the XML does not have). Needs U2D_PYODIDE (Pyodide 0.27.2) and U3B_3DC
// (a 3D_Converters checkout, for step 10's writer); skipped without them.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const SCRIPT = fileURLToPath(new URL('prototypes/u2d-cii-source/supports_roundtrip.py', ROOT));
const CONVERTER = process.env.U3B_3DC && join(process.env.U3B_3DC, 'converters', 'scripts');
const skip = (!process.env.U2D_PYODIDE && 'U2D_PYODIDE not set') || (!CONVERTER && 'U3B_3DC not set');
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const stage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const roundtrip = xmlPath => JSON.parse(execFileSync('python', ['-E', '-s', SCRIPT, xmlPath, fileURLToPath(new URL('supports-edits.cii', EF05)),
  '--converter', CONVERTER], {encoding: 'utf8', maxBuffer: 1 << 24}));

test('step 10 on the revised XML gives back the edited supports; only the refused one differs', {skip}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const baseBytes = new Uint8Array(readFileSync(new URL('base.xml', EF05)));
  const baseText = new TextDecoder('utf-8', {ignoreBOM: true}).decode(baseBytes);
  const r = await transferCiiIntoXml({targetBytes: baseBytes, ciiBytes: new Uint8Array(readFileSync(new URL('supports-edits.cii', EF05))),
    names: {cii: 'EF-05-supports-edits.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'}, weightScale: 10,
    loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  const doc = readPsi116V2(baseText, {fileSha256: sha256Hex(baseText)});
  const transfer = runStage(transferStage, doc, {receipt: r.receipt, receiptSha256: sha256Hex(r.receiptText)});
  const tmp = mkdtempSync(join(tmpdir(), 'uxml-rt-'));
  const revised = join(tmp, 'revised.xml');
  writeFileSync(revised, runEngineeringUnderLocks(transfer.uxml, stage).xmlText);
  assert.deepEqual(roundtrip(revised).differ, [{node: '99999', step10: [], edited: ['+Y, stiffness 1.7513E+12']}]);
  // Control: the XML as opened differs at all four edits, so the check above is not empty.
  assert.deepEqual(roundtrip(fileURLToPath(new URL('base.xml', EF05))).differ.map(d => d.node), ['50', '90', '240', '99999']);
});

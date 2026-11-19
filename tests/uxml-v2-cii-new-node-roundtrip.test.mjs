// Group 2 (Owner 19 Nov 2026): the EF-05 broken-pipe sample (fixtures/uxml-v2-transfer/EF05/broken-pipe.cii: pipe 2490 -> 2520
// broken at node 2505 with +Y) through the transfer, the run under locks and step 10's writer again. Needs U2D_PYODIDE
// (Pyodide 0.27.2) and U3B_3DC (a 3D_Converters checkout, for step 10's writer); skipped without them.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {transferWithNewNodes} from '../uxml/v2/transfer/TransferWithNewNodes.js';
import {newNodeValueRows} from '../uxml/v2/transfer/CiiNewNodes.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const SCRIPT = fileURLToPath(new URL('prototypes/u2d-cii-source/supports_roundtrip.py', ROOT));
const CONVERTER = process.env.U3B_3DC && join(process.env.U3B_3DC, 'converters', 'scripts');
const skip = (!process.env.U2D_PYODIDE && 'U2D_PYODIDE not set') || (!CONVERTER && 'U3B_3DC not set');
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const stage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const BROKEN = fileURLToPath(new URL('broken-pipe.cii', EF05));
const roundtrip = xmlPath => JSON.parse(execFileSync('python', ['-E', '-s', SCRIPT, xmlPath, BROKEN, '--converter', CONVERTER],
  {encoding: 'utf8', maxBuffer: 1 << 24}));

test('the EF-05 broken pipe: node 2505 is made, its +Y is transferred, and step 10 writes it there', {skip, timeout: 600000}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const made = await transferWithNewNodes({targetBytes: new Uint8Array(readFileSync(new URL('base.xml', EF05))),
    ciiBytes: new Uint8Array(readFileSync(BROKEN)), names: {cii: 'EF-05-broken-pipe.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'},
    weightScale: 10, loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  assert.deepEqual(made.newNodes.splits.map(s => [s.ciiNode, ...s.between]), [['2505', '2490', '2520']]);
  assert.deepEqual(made.newNodes.refused, []);
  const {receipt} = made.u2d;
  assert.equal(receipt.summary.edits, 0, 'nothing else differs from the XML');
  // The sample's CII comes from the step 10 that wrote base.xml, so the one support change is node 2505's.
  assert.deepEqual(receipt.supports.changes.map(c => String(c.ciiNode ?? c.node ?? c.ref?.nodeNumber)), ['2505']);
  assert.equal((receipt.supports.refused || []).filter(r => /2505/.test(JSON.stringify(r))).length, 0);
  const transfer = runStage(transferStage, made.doc, {receipt, receiptSha256: sha256Hex(made.u2d.receiptText)});
  const final = runEngineeringUnderLocks(transfer.uxml, stage);
  const valueRows = newNodeValueRows(final.uxml, made.newNodes.splits);
  assert.deepEqual(valueRows.find(r => r[3] === 'Supports').slice(4), ['+Y', 'CAESAR II (transferred, locked)']);
  assert.equal(valueRows.find(r => r[3] === 'OutsideDiameter')[5], 'previous element block (node 2490)');
  assert.match(final.xmlText, /TOPOFIX-TRANSFER-PROTECT[^>]*P8810038[^|>]*\|2505/);
  const tmp = mkdtempSync(join(tmpdir(), 'uxml-newnode-'));
  writeFileSync(join(tmp, 'final.xml'), final.xmlText);
  // Every support step 10's writer puts in the CII equals the CAESAR II file's, node 2505's +Y included.
  assert.deepEqual(roundtrip(join(tmp, 'final.xml')).differ, []);
  // Control: the XML as opened lacks node 2505, so its support differs there.
  const onBase = roundtrip(fileURLToPath(new URL('base.xml', EF05))).differ;
  assert.deepEqual(onBase.map(d => [d.node, d.edited]), [['2505', ['+Y, stiffness 1.7513E+12, friction 0.3']]]);
});

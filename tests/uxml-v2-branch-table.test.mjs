// T3 (Owner 22 Nov 2026): section 5's branch table. The pure view functions, and (with U2D_PYODIDE) the page transfer
// by node id carrying the table in its receipt and taking the user's rows.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {branchChoices, branchMapFrom, branchTableRows} from '../uxml/v2/transfer/BranchTableView.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const rows = [{line: 'L1', branches: ['/B1'], ordinals: [0], by: 'ids'},
  {line: 'L2', branches: ['/B2'], ordinals: [1], by: 'ids'},
  {line: 'L3', branches: ['/B1'], ordinals: [0], by: 'user'}, {line: 'L4', branches: [], ordinals: [], by: 'user'}];

test('the branch table view lists the branches and turns picks into the user rows', () => {
  assert.deepEqual(branchChoices(rows), [{ordinal: 0, name: '/B1'}, {ordinal: 1, name: '/B2'}]);
  assert.deepEqual(branchTableRows(rows)[3], ['L4', '(skipped)', 'set by you']);
  assert.deepEqual(branchMapFrom(rows, {}), {L3: 0, L4: null}, 'rows you set before are kept');
  assert.deepEqual(branchMapFrom(rows, {L1: '0', L2: 'skip', L3: '1'}), {L2: null, L3: 1, L4: null},
    'a pick equal to the table is no change');
  assert.throws(() => branchMapFrom(rows, {L1: 'x'}), /^Error: U2D_BRANCH_MAP_INVALID/);
});

const EF05_ON = new URL('../fixtures/uxml-v2-transfer/EF05-on/', import.meta.url);
const skip = !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set';
test('EF-05 by node id: the receipt carries the branch table, and a user row moves a line', {skip}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const args = {targetBytes: new Uint8Array(readFileSync(new URL('enriched.xml', EF05_ON))),
    ciiBytes: new Uint8Array(readFileSync(new URL('shared-points.cii', EF05_ON))),
    sidecarBytes: new Uint8Array(readFileSync(new URL('step10.cii.sidecar.json', EF05_ON))),
    weightScale: 10, loadPyodide,
    names: {cii: 'shared-points.cii', target: 'enriched.xml', revised: 'revised.xml',
      sidecar: 'step10.cii.sidecar.json'},
    indexURL: dir.replace(/[\\/]?$/, '/')};
  const r = await transferCiiIntoXml(args);
  const table = r.receipt.branchTable;
  assert.equal(table.length, 41);
  assert.deepEqual(table.filter(x => x.by !== 'ids' || x.branches.length !== 1 || x.branches[0] !== x.line), []);
  assert.equal(r.receipt.summary.edits, 112, 'the table changes no value of the T2 sample');
  const [a, b] = table;
  const moved = await transferCiiIntoXml({...args, branchMap: {[a.line]: b.ordinals[0], [b.line]: null}});
  const rowsOf = x => moved.receipt.branchTable.find(t => t.line === x);
  assert.deepEqual([rowsOf(a.line).by, rowsOf(a.line).branches, rowsOf(b.line).branches], ['user', [b.line], []]);
  await assert.rejects(transferCiiIntoXml({...args, branchMap: {'NO-SUCH-LINE': 0}}), /U2D_BRANCH_MAP_INVALID/);
});

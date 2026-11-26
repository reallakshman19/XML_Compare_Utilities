// T4 (road map 26 Nov 2026): section 5's node table. The pure view function, and (with U2D_PYODIDE) the page transfer
// by node id carrying the table in its receipt.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {NODE_FILTERS, nodeTableRows} from '../uxml/v2/transfer/NodeTableView.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const rows = [
  {cii: '10', step10: '10', xml: [{branch: '/B1', node: 1, nodeNumber: '10', name: 'A'}], check: 'agrees', edits: 0,
    supports: 0, refused: []},
  {cii: '99001', step10: '20', xml: [{branch: '/B1', node: 2, nodeNumber: '20', name: ''},
    {branch: '/B2', node: 1, nodeNumber: '20', name: 'B'}], check: 'agrees', edits: 2, supports: 0, refused: []},
  {cii: '30', step10: '30', xml: [{branch: '/B2', node: 3, nodeNumber: '', name: ''}], check: 'other place', edits: 0,
    supports: 1, refused: ['U2D_SUPPORT_MERGED_COPY']},
];

test('the node table view shows each row and filters them', () => {
  assert.deepEqual(Object.keys(NODE_FILTERS), ['all', 'renumbered', 'refused', 'edited']);
  assert.deepEqual(nodeTableRows(rows)[0], ['10', '', '/B1 #1 (10) A', 'agrees', '0', '0', '']);
  assert.deepEqual(nodeTableRows(rows, 'renumbered'), [['99001', '20', '/B1 #2 (20); /B2 #1 (20) B', 'agrees', '2', '0',
    '']]);
  assert.deepEqual(nodeTableRows(rows, 'refused').map(r => r[0]), ['30']);
  assert.deepEqual(nodeTableRows(rows, 'edited').map(r => r[0]), ['99001', '30']);
  assert.throws(() => nodeTableRows(rows, 'nope'), /unknown node table filter/);
});

const EF05_ON = new URL('../fixtures/uxml-v2-transfer/EF05-on/', import.meta.url);
const skip = !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set';
test('EF-05 by node id: the receipt carries the node table, and it adds up to the transfer', {skip}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const r = await transferCiiIntoXml({targetBytes: new Uint8Array(readFileSync(new URL('enriched.xml', EF05_ON))),
    ciiBytes: new Uint8Array(readFileSync(new URL('shared-points.cii', EF05_ON))),
    sidecarBytes: new Uint8Array(readFileSync(new URL('step10.cii.sidecar.json', EF05_ON))),
    weightScale: 10, loadPyodide,
    names: {cii: 'shared-points.cii', target: 'enriched.xml', revised: 'revised.xml',
      sidecar: 'step10.cii.sidecar.json'},
    indexURL: dir.replace(/[\\/]?$/, '/')});
  const table = r.receipt.nodeTable;
  assert.equal(table.length, 617);
  assert.equal(r.receipt.summary.edits, 112);
  const nodeEdits = Object.entries(r.receipt.summary.byField).filter(([f]) => !f.startsWith('Branch/'))
    .reduce((n, [, k]) => n + k, 0);
  assert.equal(table.reduce((n, row) => n + row.edits, 0), nodeEdits);
  assert.equal(nodeTableRows(table).length, 617);
});

// CAESAR II writes an element's line number only where it changes and leaves it empty after (measured 19 Nov 2026 on
// CAESAR II's own exports: 25 of 786 elements written). Owner 19 Nov 2026: "for transfer lets think of populating each
// sentinel values back to UXML so that it will be more traceable and easy to transfer... only at last stage lets make it
// back to sentinels (i., UXML->CII)". The transfer reads an empty line number as the previous element's, and each value
// names the CII elements it came from, carried line numbers included. Needs U2D_PYODIDE (Pyodide 0.27.2); skipped without.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const EF05 = new URL('../fixtures/uxml-v2-transfer/EF05/', import.meta.url);
const skip = !process.env.U2D_PYODIDE && 'U2D_PYODIDE not set';
const latin1 = bytes => Buffer.from(bytes).toString('latin1');
const BLOCK = 15, LINE_NO = 10;

/** The CII with its ELEMENTS blocks passed through f(block, index, previousBlock). */
function mapElements(text, f) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(nl), start = lines.indexOf('#$ ELEMENTS') + 1;
  let end = start;
  while (end < lines.length && !lines[end].startsWith('#$ ')) end++;
  const blocks = [];
  for (let k = start; k + BLOCK <= end; k += BLOCK) blocks.push(lines.slice(k, k + BLOCK));
  const out = blocks.map((b, i) => f([...b], i, blocks[i - 1]));
  return [...lines.slice(0, start), ...out.flat(), ...lines.slice(start + blocks.length * BLOCK)].join(nl);
}
const nameOf = line => { const m = /^\s*(\d+) (.*)$/.exec(line); return m ? m[2].slice(0, Number(m[1])) : ''; };
/** CAESAR II's way: the line number only on the element where it changes, empty (length 0) after. */
const caesarStyle = text => mapElements(text, (b, i, prev) => {
  if (prev && nameOf(prev[LINE_NO]) === nameOf(b[LINE_NO])) b[LINE_NO] = (' '.repeat(7) + '    0 ').padEnd(b[LINE_NO].length);
  return b;
});
/** T1 of element `index` (row 2, 4th cell: columns 41-53) set to `t1`. */
const editT1 = (text, index, t1) => mapElements(text, (b, i) => {
  if (i === index) b[1] = b[1].slice(0, 41) + String(t1).padStart(13) + b[1].slice(54);
  return b;
});

test('a CII with the line number written only where it changes transfers like one with it on every element', {skip, timeout: 900000}, async () => {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const target = new Uint8Array(readFileSync(new URL('base.xml', EF05)));
  const full = latin1(readFileSync(new URL('source.cii', EF05)));
  const run = text => transferCiiIntoXml({targetBytes: target, ciiBytes: new Uint8Array(Buffer.from(text, 'latin1')),
    names: {cii: 'c.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'}, weightScale: 10, loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  const caesar = caesarStyle(full);
  const written = (caesar.match(/^ {7} {0,4}\d+ \S/gm) || []).length;
  assert.ok(written < 100, `the CAESAR II-style file names few elements (${written})`);
  const values = r => r.receipt.changes.map(c => [JSON.stringify(c.ref), c.field, c.after]).sort();
  const codes = r => (r.receipt.refused || []).map(x => x.code).sort();

  const a = await run(full), b = await run(caesar);
  assert.equal(a.receipt.summary.edits, 41);
  assert.deepEqual(values(b), values(a), 'the same values from both files');
  assert.deepEqual(codes(b), codes(a));
  // Where each value came from: its CII elements; in the CAESAR II-style file, where each carried line number was written.
  for (const c of a.receipt.changes.filter(x => x.field.startsWith('Branch/'))) assert.deepEqual(c.cii.lineNumberCarried, {});
  const t1 = b.receipt.changes.find(c => c.field === 'Branch/Temperature/Temperature1' && Object.keys(c.cii.lineNumberCarried).length);
  assert.ok(t1, 'a branch value with carried line numbers');
  const [carried, on] = Object.entries(t1.cii.lineNumberCarried)[0];
  assert.ok(t1.cii.elements.includes(carried) && t1.cii.elements.includes(on));

  // An engineer's edit on a later element of a branch (element 6, T1 130 -> 180): refused in both files, never dropped.
  const split = r => (r.receipt.refused || []).filter(x => x.code === 'U2D_BRANCH_FIELD_SPLIT' && x.field === 'Branch/Temperature/Temperature1');
  const c = await run(editT1(full, 5, '180.000')), d = await run(editT1(caesar, 5, '180.000'));
  assert.equal(split(c).length, 1);
  assert.deepEqual(split(d), split(c));
  assert.deepEqual(split(d)[0].values, ['130', '180']);
  assert.equal(d.receipt.summary.edits, 40);

  // Into UXML: the transferred value carries its CII source.
  const text = latin1(target);
  const doc = readPsi116V2(text, {fileSha256: sha256Hex(text)});
  const out = runStage(transferStage, doc, {receipt: b.receipt, receiptSha256: sha256Hex(b.receiptText)}).uxml;
  const value = out.pipelines.map(q => q.values['Temperature.Temperature1']).find(v => v?.cii && v.text === t1.after
    && v.cii.elements.join() === t1.cii.elements.join());
  assert.ok(value, 'a UXML Temperature1 value names its CII elements');
  assert.equal(value.src, 'transfer');
  assert.deepEqual(value.cii.lineNumberCarried, t1.cii.lineNumberCarried);
});

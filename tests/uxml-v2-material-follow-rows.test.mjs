// Group 1 (Owner 19 Nov 2026), review note N3.1: section 5 lists each node whose own material the branch material
// overwrites (today it showed only a count). The transfer itself is unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {materialFollowRows} from '../uxml/v2/transfer/MaterialFollowRows.js';

const node = (n, code) => `<Node><NodeNumber>${n}</NodeNumber><ComponentType>PIPE</ComponentType><Position>${n} 0 0</Position><MaterialCode>${code}</MaterialCode></Node>`;
const xml = `<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd"><Pipe><Branch><Branchname>/M/B1</Branchname><MaterialNumber>338</MaterialNumber>${node(10, 338)}${node(20, 185)}${node(30, 338)}</Branch></Pipe></PipeStressExport>`;
const receipt = {changes: [{field: 'Branch/MaterialNumber', before: '338', after: '106', ref: {branchOrdinal: 0, branchName: '/M/B1'}}]};
const doc = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});

test('a node with its own material (185) is listed; nodes on the branch material are not', () => {
  assert.deepEqual(materialFollowRows(doc(xml), receipt), [['/M/B1', '20', '185', '338', '106']]);
});

test('control: no material change in the receipt, no rows', () => {
  assert.deepEqual(materialFollowRows(doc(xml), {changes: [{...receipt.changes[0], field: 'Branch/Temperature1'}]}), []);
});

test('BM2 sample: its one material change overwrites no deliberate node material (as the review found)', () => {
  const base = readFileSync(new URL('../fixtures/uxml-v2-transfer/BM2/base.xml', import.meta.url), 'utf8');
  const r = JSON.parse(readFileSync(new URL('../fixtures/uxml-v2-transfer/BM2/receipt.json', import.meta.url), 'utf8'));
  assert.equal(r.changes.filter(c => c.field === 'Branch/MaterialNumber').length, 1);
  assert.deepEqual(materialFollowRows(doc(base), r), []);
});

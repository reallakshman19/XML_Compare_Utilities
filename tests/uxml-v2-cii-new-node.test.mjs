// Group 2 (Owner 19 Nov 2026): a pipe broken in CAESAR II gives a new XML node (uxml/v2/transfer/CiiNewNodes.js).
// No Python: the matcher's result is built here from EF-05's step-10 Enriched XML (fixtures/uxml-v2-transfer/EF05/base.xml),
// with pipe 2490 -> 2520 (4900 mm) as the broken pipe. The Pyodide round trip is in uxml-v2-cii-new-node-roundtrip.test.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {findCiiNewNodes, ciiNewNodeStage, RULE_PREVIOUS, RULE_POINT} from '../uxml/v2/transfer/CiiNewNodes.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';

const text = new TextDecoder('utf-8', {ignoreBOM: true}).decode(readFileSync(new URL('../fixtures/uxml-v2-transfer/EF05/base.xml', import.meta.url)));
const read = () => readPsi116V2(text, {fileSha256: sha256Hex(text)});
const num = c => String(c.values.NodeNumber.text ?? c.values.NodeNumber.v);
const xyz = c => String(c.values.Position.v).trim().split(/\s+/).map(Number);
const toCii = ([x, y, z]) => [x, z, -y];

/** Matcher result: 2490 and 2520 paired, the given CII nodes unpaired on a chain 2490 -> ... -> 2520. */
function matchWith(doc, points, {ends = ['2490', '2520']} = {}) {
  const nodePairs = [], ciiNodes = [];
  doc.pipelines.forEach((p, b) => p.components.forEach((c, n) => {
    if (ends.includes(num(c)) && !nodePairs.some(q => q.cii === num(c))) {
      nodePairs.push({xml: {branchOrdinal: b, nodeOrdinal: n, nodeNumber: num(c)}, cii: num(c)});
      ciiNodes.push({id: num(c), xyz: toCii(xyz(c))});
    }
  }));
  const ids = points.map(p => p.id);
  points.forEach(p => ciiNodes.push({id: p.id, xyz: toCii(p.at)}));
  const chain = [ends[0], ...ids, ends[1]];
  return {nodePairs, unmatchedNodesCii: ids, ciiNodes, ciiElements: chain.slice(1).map((to, k) => ({from: chain[k], to}))};
}
const pipe = doc => {
  for (const p of doc.pipelines) {
    const i = p.components.findIndex(c => num(c) === '2490');
    if (i >= 0) return {p, a: xyz(p.components[i]), b: xyz(p.components[i + 1]), next: num(p.components[i + 1])};
  }
};
const along = ({a, b}, t, up = 0) => a.map((v, k) => v + (b[k] - a[k]) * t + (k === 2 ? up : 0));

test('a pipe broken at its midpoint gives one new node, on the line, written between its two neighbours', () => {
  const doc = read(), at = pipe(doc);
  assert.equal(at.next, '2520');
  const found = findCiiNewNodes(doc, matchWith(doc, [{id: '2505', at: along(at, 0.5, 0.4)}]));
  assert.deepEqual(found.refused, []);
  assert.equal(found.splits.length, 1);
  const [s] = found.splits;
  assert.deepEqual([s.ciiNode, s.between], ['2505', ['2490', '2520']]);
  assert.ok(Math.abs(s.offMm - 0.4) < 1e-6 && Math.abs(s.alongMm - 2450.075) < 0.01);
  // Put on the XML line, not at the CII point 0.4 mm above it.
  assert.equal(s.position, along(at, 0.5).map(v => v.toFixed(2)).join(' '));
  const split = runStage(ciiNewNodeStage, doc, {splits: found.splits});
  const p = split.uxml.pipelines.find(q => q.uid === s.pipeline);
  const i = p.components.findIndex(c => num(c) === '2490');
  const made = p.components[i + 1];
  assert.deepEqual([num(made), num(p.components[i + 2])], ['2505', '2520']);
  assert.deepEqual(made.lineage, {op: 'split', from: [p.components[i].uid], stage: 'cii-new-node', rule: 'pipe broken in CAESAR II'});
  assert.equal(made.values.ComponentType.text, 'ATTA');
  assert.equal(made.values.Endpoint.text, '0');
  assert.equal(made.values.Weight.rule, RULE_POINT);
  assert.equal(made.values.OutsideDiameter.rule, RULE_PREVIOUS);
  assert.equal(made.values.OutsideDiameter.text, p.components[i].values.OutsideDiameter.text);
  assert.equal(made.restraints.length, 0);
  // The written XML is the source with one more <Node> record, and nothing else changed.
  const out = writePsi116FromUxmlV2(split.uxml);
  assert.equal(out.stats.insertedNodes, 1);
  const added = out.text.match(/<Node>\s*<NodeNumber>2505<\/NodeNumber>[\s\S]*?<\/Node>\s*/)[0];
  assert.equal(out.text.replace(added, ''), text);
  assert.match(added, new RegExp(`<Position>${s.position}</Position>`));
  assert.doesNotMatch(added, /<Restraint>|=1006649732/);
});

test('a new node inside a valve, flange, reducer, instrument or rigid is refused, never split', () => {
  const doc = read();
  for (const [a, b, type] of [['308', '309', 'VALV'], ['400', '409', 'FLAN'], ['20', '30', 'REDU'], ['1138', '1139', 'INST'],
    ['909', '910', 'VALV'], ['290', '300', 'FLAN']]) {
    const ends = doc.pipelines.flatMap(p => p.components).filter(c => [a, b].includes(num(c))).map(xyz);
    const mid = ends[0].map((v, k) => (v + ends[1][k]) / 2);
    const found = findCiiNewNodes(doc, matchWith(doc, [{id: '9901', at: mid}], {ends: [a, b]}));
    assert.deepEqual([found.splits.length, found.refused[0]?.code], [0, 'UXML_CII_NEW_NODE_INSIDE_COMPONENT'], `${a} -> ${b}`);
    assert.match(found.refused[0].detail, new RegExp(`${a} and ${b} are the two ends of one ${type}`));
  }
});

test('two new nodes on one pipe go in along the pipe, each after the one before', () => {
  const doc = read(), at = pipe(doc);
  const found = findCiiNewNodes(doc, matchWith(doc, [{id: '2500', at: along(at, 0.25)}, {id: '2510', at: along(at, 0.75)}]));
  assert.deepEqual(found.splits.map(s => s.ciiNode), ['2500', '2510']);
  const split = runStage(ciiNewNodeStage, doc, {splits: found.splits});
  const p = split.uxml.pipelines.find(q => q.uid === found.splits[0].pipeline);
  const i = p.components.findIndex(c => num(c) === '2490');
  assert.deepEqual(p.components.slice(i, i + 4).map(num), ['2490', '2500', '2510', '2520']);
  assert.equal(writePsi116FromUxmlV2(split.uxml).stats.insertedNodes, 2);
});

test('refused and named: off the pipe, at its end, a number the XML has, not between neighbours', () => {
  const doc = read(), at = pipe(doc);
  const refusal = (points, opts) => findCiiNewNodes(doc, matchWith(doc, points, opts));
  const off = refusal([{id: '2505', at: along(at, 0.5, 5)}]);
  assert.deepEqual([off.splits.length, off.refused[0].code], [0, 'UXML_CII_NEW_NODE_OFF_PIPE']);
  assert.match(off.refused[0].detail, /node 2505 is 5\.0 mm off the XML pipe 2490 -> 2520/);
  const end = refusal([{id: '2505', at: along(at, 0.0001)}]);
  assert.equal(end.refused[0].code, 'UXML_CII_NEW_NODE_OFF_PIPE');
  const taken = refusal([{id: '50', at: along(at, 0.5)}]);
  assert.deepEqual([taken.splits.length, taken.refused[0].code], [0, 'UXML_CII_NEW_NODE_NUMBER_TAKEN']);
  const apart = refusal([{id: '2505', at: along(at, 0.5)}], {ends: ['2490', '50']});
  assert.deepEqual([apart.splits.length, apart.refused[0].code], [0, 'UXML_CII_NEW_NODE_NOT_ON_A_PIPE']);
});

test('a receipt made for the source XML is refused on the document with the new node (node order changed)', () => {
  const doc = read(), at = pipe(doc);
  const split = runStage(ciiNewNodeStage, doc, {splits: findCiiNewNodes(doc, matchWith(doc, [{id: '2505', at: along(at, 0.5)}])).splits});
  const receipt = sha => ({format: 'u2.transfer-receipt', version: 1, ok: true, base: {sha256: sha}, changes: [], supports: {changes: []}});
  assert.throws(() => runStage(transferStage, split.uxml, {receipt: receipt(sha256Hex(text))}), /UXML_TRANSFER_BASE_MISMATCH/);
  const written = sha256Hex(writePsi116FromUxmlV2(split.uxml).text);
  assert.doesNotThrow(() => runStage(transferStage, split.uxml, {receipt: receipt(written)}));
  // Control: the source document itself still takes a receipt for its file.
  assert.doesNotThrow(() => runStage(transferStage, doc, {receipt: receipt(sha256Hex(text))}));
});

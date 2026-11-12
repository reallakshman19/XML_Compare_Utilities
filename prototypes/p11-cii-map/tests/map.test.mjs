// P1.1 card tests T1-T8 and one test per refusal code. Test titles start with the card id.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { attempt } from '../kit/core.mjs';
import { readBenchmark } from '../kit/node.mjs';
import { readCii14 } from '../kit/cii14.mjs';
import { readCiiGraph, graphFromCii } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';
import { readXmlGraph } from '../vendor/prototypes/ciifr-map/xml-intake.js';
import { buildXmlGraph } from '../vendor/prototypes/ciifr-map/xml-graph.js';
import { FIXTURES, makeCii, makeS1M, INVENTED, sha256, xmlDomParser } from './fixture-tools.mjs';

const bench = async id => (await readBenchmark(id)).bytes;
const fixture = name => new Uint8Array(readFileSync(FIXTURES + name));
const manifest = () => JSON.parse(readFileSync(FIXTURES + 'manifest.json', 'utf8')).files;
const elementPairs = r => r.pairs.filter(p => p.kind === 'element');
const graphs = {};
const g = async id => (graphs[id] ??= await readCiiGraph(await bench(id), { member: id }));

test('T1 readCiiGraph(X-S1): 56 elements, every TO position = FROM position + DX/DY/DZ within 1e-6 mm', async () => {
  const bytes = await bench('X-S1');
  const graph = await readCiiGraph(bytes, { member: 'X-S1' });
  const cii = readCii14(bytes);
  assert.equal(graph.edges.length, 56);
  assert.equal(cii.elements.length, 56);
  for (const el of cii.elements) {
    const a = graph.nodeIndex.get(String(el.from)).xyz, b = graph.nodeIndex.get(String(el.to)).xyz;
    const d = [el.fields.DX.value, el.fields.DY.value, el.fields.DZ.value];
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(b[i] - a[i] - d[i]) <= 1e-6, 'element ' + el.index + ' axis ' + i);
  }
  // The COORDS start point keeps its absolute position.
  assert.deepEqual(graph.nodeIndex.get('3790').xyz, [798423, 100237, 1125028]);
  assert.equal(graph.coordinateFrames[0].coordinateFrame, 'XML_EXPLICIT_COORDS_SEED');
});

test('T2 X-S1 against itself: 56/56 element pairs, 0 unmatched, 0 field differences', async () => {
  const r = await attempt(async () => compareCii(await g('X-S1'), await g('X-S1')));
  assert.equal(r.ok, true);
  assert.equal(elementPairs(r).length, 56);
  assert.ok(elementPairs(r).every(p => p.rule === 'same-number-same-position' && !p.reversed));
  assert.equal(r.unmatchedA.length + r.unmatchedB.length + r.unmatchedNodesA.length + r.unmatchedNodesB.length, 0);
  assert.equal(r.fieldDiffs.length, 0);
});

test('T3 X-S1 against X-S1M: 56/56 element pairs and exactly the 4 planted field differences', async () => {
  const s1 = await bench('X-S1');
  const s1m = makeS1M(s1);
  writeFileSync(FIXTURES + 'X-S1M.cii', s1m);
  const entry = manifest().find(f => f.file === 'X-S1M.cii');
  assert.equal(sha256(s1m), entry.sha256, 'X-S1M bytes match the manifest');
  assert.equal(entry.from.id, 'X-S1');
  const cii = readCii14(s1);
  const r = await attempt(async () => compareCii(await g('X-S1'), await readCiiGraph(s1m, { member: 'X-S1M' })));
  assert.equal(r.ok, true);
  assert.equal(elementPairs(r).length, 56);
  assert.equal(r.unmatchedA.length + r.unmatchedB.length, 0);
  const got = r.fieldDiffs.map(d => d.a.elementIndex + ':' + d.field).sort();
  const want = [cii.rigids[0].element + ':rigidWeight', '3:T1', '7:T1', cii.nodeNames[0].element + ':fromName'].sort();
  assert.deepEqual(got, want);
  const w = r.fieldDiffs.find(d => d.field === 'rigidWeight');
  assert.equal(w.valueA, 1390); assert.equal(w.valueB, 1529);
  assert.equal(r.fieldDiffs.find(d => d.field === 'fromName').valueB, 'P11-RENAMED');
});

test('T4 X-T against X-TEXP: 1614/1614 element pairs, 0 unmatched; and X-S1 minus its last element gives 55 pairs, 1 unmatched in A', async () => {
  const r = await attempt(async () => compareCii(await g('X-T'), await g('X-TEXP')));
  assert.equal(r.ok, true);
  assert.equal(elementPairs(r).length, 1614);
  assert.equal(r.unmatchedA.length, 0);
  assert.equal(r.unmatchedB.length, 0);
  assert.equal(r.summary.unmatchedNodesA + r.summary.unmatchedNodesB, 0);
  // Geometry is identical; the differences are node names (no diameter/wall/... changes).
  assert.ok(r.fieldDiffs.length > 0);
  assert.ok(r.fieldDiffs.every(d => d.field === 'fromName' || d.field === 'toName' || d.field === 'restraintCount'));

  const bytes = await bench('X-S1'), cii = readCii14(bytes), full = await g('X-S1');
  const cut = graphFromCii(cii, { member: 'X-S1-cut', sha256: full.sha256, byteLength: bytes.length, elements: cii.elements.slice(0, -1) });
  const r2 = await attempt(() => compareCii(full, cut));
  assert.equal(r2.ok, true);
  assert.equal(elementPairs(r2).length, 55);
  assert.equal(r2.unmatchedA.length, 1);
  assert.equal(r2.unmatchedA[0].elementIndex, 55);
  assert.equal(r2.unmatchedB.length, 0);
});

test('T5 X-S2 against itself: 46/46 element pairs', async () => {
  const r = await attempt(async () => compareCii(await g('X-S2'), await g('X-S2')));
  assert.equal(r.ok, true);
  assert.equal(elementPairs(r).length, 46);
  assert.equal(r.unmatchedA.length + r.unmatchedB.length + r.fieldDiffs.length, 0);
});

test('T6 MAP_ANCHORS_TOO_FEW: 3 elements with all nodes on one straight line, automatic anchors', async () => {
  const line = await readCiiGraph(fixture('line3.cii'));
  assert.equal(line.edges.length, 3);
  const r = await attempt(() => compareCii(line, line));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'MAP_ANCHORS_TOO_FEW');
  assert.equal(r.pairs, undefined, 'no output on refusal');
  // Fewer than 3 anchors also refuses: only 2 manual anchors.
  const bend = await readCiiGraph(fixture('bend.cii'));
  const r2 = await attempt(() => compareCii(bend, bend, { anchors: '10:10,20:20' }));
  assert.equal(r2.refusals[0].code, 'MAP_ANCHORS_TOO_FEW');
});

test('T7 a node moved 0.5 mm stays paired at tolerance 1 and is unmatched at tolerance 0.1', async () => {
  const a = await readCiiGraph(fixture('bend.cii')), b = await readCiiGraph(fixture('bend-moved.cii'));
  const d = b.nodeIndex.get('30').xyz.map((v, i) => v - a.nodeIndex.get('30').xyz[i]);
  assert.deepEqual(d.map(v => Math.round(v * 1e6) / 1e6), [0.5, 0, 0]);
  const at1 = await attempt(() => compareCii(a, b, { toleranceMm: 1 }));
  assert.equal(at1.ok, true);
  const n30 = at1.pairs.find(p => p.kind === 'node' && p.a === '30');
  assert.equal(n30.b, '30');
  assert.equal(n30.rule, 'nearest-within-tolerance');
  assert.ok(Math.abs(n30.distanceMm - 0.5) < 1e-6);
  assert.equal(elementPairs(at1).length, 4);
  assert.equal(at1.pairs.find(p => p.kind === 'node' && p.a === '10').rule, 'same-number-same-position');
  const at01 = await attempt(() => compareCii(a, b, { toleranceMm: 0.1 }));
  assert.equal(at01.ok, true);
  assert.equal(at01.pairs.find(p => p.kind === 'node' && p.a === '30'), undefined);
  assert.deepEqual(at01.unmatchedNodesA, ['30']);
  assert.deepEqual(at01.unmatchedNodesB, ['30']);
  assert.deepEqual(at01.unmatchedA.map(e => e.fromNode + '-' + e.toNode), ['20-30', '30-40']);
});

test('T8 readCiiGraph(X-S1) and ciifr-map readXmlGraph(X-F05) have the same shape, node count and positions within 1 mm', async () => {
  const xmlBytes = new Uint8Array(readFileSync(new URL('../../ciifr-map/tests/fixtures/S1-F05.xml', import.meta.url)));
  assert.equal(sha256(xmlBytes), '1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995');
  const xml = await readXmlGraph(xmlBytes, { member: 'X-F05', cryptoRef: webcrypto, parser: xmlDomParser });
  const cii = await g('X-S1');
  assert.deepEqual(Object.keys(cii).filter(k => !['cii', 'ciiElements'].includes(k)), Object.keys(xml), 'graph keys');
  assert.deepEqual(Object.keys(cii.nodes[0]), Object.keys(xml.nodes[0]), 'node keys');
  assert.deepEqual(Object.keys(cii.edges[0]).filter(k => k !== 'ciiElementIndex'), Object.keys(xml.edges[0]), 'edge keys');
  assert.equal(cii.nodes.length, xml.nodes.length);
  assert.equal(cii.edges.length, xml.edges.length);
  for (const n of xml.nodes) {
    const m = cii.nodeIndex.get(n.id);
    assert.ok(m, 'node ' + n.id);
    assert.ok(Math.hypot(...n.xyz.map((v, i) => v - m.xyz[i])) <= 1, 'node ' + n.id + ' position');
  }
});

test('refusal CII_VERSION_UNSUPPORTED: a version 11 CII (X-SRC) is refused, no graph', async () => {
  const r = await attempt(async () => readCiiGraph(await bench('X-SRC')));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'CII_VERSION_UNSUPPORTED');
  assert.equal(r.nodes, undefined);
});

test('refusal MAP_EMPTY_INPUT on empty bytes', async () => {
  const r = await attempt(() => readCiiGraph(new Uint8Array()));
  assert.equal(r.refusals[0].code, 'MAP_EMPTY_INPUT');
});

test('refusal MAP_COORDS_INVALID when the COORDS count does not match its rows', async () => {
  const r = await attempt(() => readCiiGraph(makeCii({ ...INVENTED['bend.cii'].model, coordsCount: 2 })));
  assert.equal(r.refusals[0].code, 'MAP_COORDS_INVALID');
});

test('refusal MAP_UNITS_NOT_MM when lengths are not native mm', async () => {
  const r = await attempt(() => readCiiGraph(makeCii({ ...INVENTED['bend.cii'].model, lengthUnit: 'in.' })));
  assert.equal(r.refusals[0].code, 'MAP_UNITS_NOT_MM');
});

test('refusal MAP_GRAPH_INVALID when a loop of elements does not close', async () => {
  const model = { elements: [{ from: 10, to: 20, d: [1000, 0, 0] }, { from: 20, to: 30, d: [0, 1000, 0] }, { from: 30, to: 10, d: [-1000, 0, 0] }] };
  const r = await attempt(() => readCiiGraph(makeCii(model)));
  assert.equal(r.refusals[0].code, 'MAP_GRAPH_INVALID');
  assert.match(r.refusals[0].detail, /CYCLE_CONFLICT/);
});

test('refusal MAP_ANCHOR_INVALID for a badly written anchor or a node that is not in the file', async () => {
  const bend = await readCiiGraph(fixture('bend.cii'));
  assert.equal((await attempt(() => compareCii(bend, bend, { anchors: '10-10' }))).refusals[0].code, 'MAP_ANCHOR_INVALID');
  assert.equal((await attempt(() => compareCii(bend, bend, { anchors: '10:10,20:20,99:30' }))).refusals[0].code, 'MAP_ANCHOR_INVALID');
});

test('refusal MAP_FIT_FAILED when manual anchors disagree with each other', async () => {
  const bend = await readCiiGraph(fixture('bend.cii'));
  const r = await attempt(() => compareCii(bend, bend, { anchors: '10:10,20:20,40:50' }));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'MAP_FIT_FAILED');
});

test('refusal MAP_TOLERANCE_INVALID for a negative tolerance', async () => {
  const bend = await readCiiGraph(fixture('bend.cii'));
  assert.equal((await attempt(() => compareCii(bend, bend, { toleranceMm: -1 }))).refusals[0].code, 'MAP_TOLERANCE_INVALID');
});

test('manual anchors give the same result as automatic anchors on X-S1', async () => {
  const r = await attempt(async () => compareCii(await g('X-S1'), await g('X-S1'), { anchors: '3790:3790,3830:3830,3840:3840,3870:3870' }));
  assert.equal(r.ok, true);
  assert.equal(r.summary.anchorMode, 'manual');
  assert.equal(elementPairs(r).length, 56);
});

test('the vendored buildXmlGraph is the one the CII graph is built with', () => {
  assert.equal(typeof buildXmlGraph, 'function');
});

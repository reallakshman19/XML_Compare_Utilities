// Tests added in the repair round for the P1.1 review findings (probes probe1, probe2 and probe6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { attempt } from '../kit/core.mjs';
import { readBenchmark } from '../kit/node.mjs';
import { readCii14 } from '../kit/cii14.mjs';
import { readCiiGraph, graphFromCii, closeLoops } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';
import { makeCii, INVENTED, replaceSpans, f13 } from './fixture-tools.mjs';

const bench = async id => (await readBenchmark(id)).bytes;
const elementPairs = r => r.pairs.filter(p => p.kind === 'element');
const graphs = {};
const g = async id => (graphs[id] ??= await readCiiGraph(await bench(id), { member: id }));

// Review probe2 Q4: a loop of long elements written with 7 significant digits misses by 0.01 mm.
const loop = miss => ({ elements: [{ from: 10, to: 20, d: [33333.33, 0, 0] }, { from: 20, to: 30, d: [33333.33, 0, 0] },
  { from: 30, to: 40, d: [0, 1000, 0] }, { from: 40, to: 50, d: [-66666.66 - miss, 0, 0] }, { from: 50, to: 10, d: [0, -1000, 0] }],
  coords: [{ node: 10, xyz: [0, 0, 0] }] });

test('loop closure: a 0.01 mm miss on a 135 m loop is within the Owner +-6 mm and closes on the first-reached positions', async () => {
  const graph = await readCiiGraph(makeCii(loop(0.01)));
  assert.equal(graph.loopClosures.length, 1);
  const c = graph.loopClosures[0];
  assert.ok(Math.abs(c.missMm - 0.01) < 1e-6, 'miss ' + c.missMm);
  assert.equal(c.toleranceMm, 6);
  // Every edge of the graph now closes exactly.
  for (const e of graph.edges) {
    const d = graph.nodeIndex.get(e.to).xyz.map((v, i) => v - graph.nodeIndex.get(e.from).xyz[i]);
    assert.ok(d.every((v, i) => Math.abs(v - e.delta[i]) < 1e-6));
  }
  // The limit is a fixed +-6 mm (Owner, 12 Nov), whatever the loop or lead-in length.
  const sq = (L, m) => [['1', '2', [L, 0, 0]], ['2', '3', [0, L, 0]], ['3', '4', [-L, 0, 0]], ['4', '1', [0, -L + m, 0]]]
    .map(([from, to, delta], i) => ({ from, to, delta, witness: 'e' + i }));
  assert.equal(closeLoops(sq(1000, 5.9)).loops.length, 1);
  assert.equal((await attempt(() => closeLoops(sq(1000, 6.1)))).refusals[0].code, 'MAP_LOOP_NOT_CLOSED');
  assert.equal((await attempt(() => closeLoops(sq(10, 6.1)))).refusals[0].code, 'MAP_LOOP_NOT_CLOSED');
});

// Review round 2 probe3: 1000 m lead-in, then a 4 m loop with one element 1.5 mm too long.
// Within +-6 mm it closes (Owner), and the compare output shows the 1.5 mm miss.
test('a loop miss after a long lead-in is judged on +-6 mm alone and reported in the compare output', async () => {
  const leadIn = { elements: [{ from: 10, to: 20, d: [1000000, 0, 0] }, { from: 20, to: 30, d: [0, 0, 1000000] },
    { from: 30, to: 40, d: [4000, 0, 0] }, { from: 40, to: 50, d: [0, 4000, 0] }, { from: 50, to: 60, d: [-4001.5, 0, 0] },
    { from: 60, to: 30, d: [0, -4000, 0] }], coords: [{ node: 10, xyz: [0, 0, 0] }] };
  const graph = await readCiiGraph(makeCii(leadIn));
  assert.equal(graph.loopClosures.length, 1);
  assert.ok(Math.abs(graph.loopClosures[0].missMm - 1.5) < 1e-6);
  const r = compareCii(graph, graph);
  assert.equal(r.summary.loopClosuresA, 1);
  assert.ok(Math.abs(r.loopClosures.a[0].missMm - 1.5) < 1e-6);
  const far = { ...leadIn, elements: leadIn.elements.map(e => e.from === 50 ? { ...e, d: [-4007, 0, 0] } : e) };
  assert.equal((await attempt(() => readCiiGraph(makeCii(far)))).refusals[0].code, 'MAP_LOOP_NOT_CLOSED');
});

test('refusal MAP_LOOP_NOT_CLOSED when a loop misses by more than its tolerance, naming the node and the miss', async () => {
  const r = await attempt(() => readCiiGraph(makeCii(loop(7))));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'MAP_LOOP_NOT_CLOSED');
  assert.match(r.refusals[0].where, /^node \d+/);
  assert.match(r.refusals[0].detail, /misses by 7\.0000 mm/);
});

test('unmatchedB: X-S1 minus its last element against the full X-S1 leaves that element unmatched in B', async () => {
  const bytes = await bench('X-S1'), cii = readCii14(bytes), full = await g('X-S1');
  const cut = graphFromCii(cii, { member: 'X-S1-cut', sha256: full.sha256, byteLength: bytes.length, elements: cii.elements.slice(0, -1) });
  const r = compareCii(cut, full);
  assert.equal(elementPairs(r).length, 55);
  assert.equal(r.unmatchedA.length, 0);
  assert.deepEqual(r.unmatchedB.map(u => u.elementIndex), [55]);
  assert.equal(r.unmatchedNodesB.length, 1);
});

// Review probe2 Q1/Q1b: a model plus a separate straight piece with its own COORDS start point.
const bendEls = INVENTED['bend.cii'].model.elements;
const twoPieces = (straightAt = [0, 0, 0]) => makeCii({ elements: [...bendEls, { from: 100, to: 110, d: [0, 500, 0] }],
  coords: [{ node: 10, xyz: [5000, 2000, 1000] }, { node: 100, xyz: straightAt }] });

test('a straight piece whose anchors all coincide exactly gets the identity fit (automatic mode)', async () => {
  const a = await readCiiGraph(twoPieces());
  assert.equal(a.components.length, 2);
  const r = compareCii(a, a);
  assert.equal(elementPairs(r).length, 5);
  assert.equal(r.unmatchedA.length + r.unmatchedB.length + r.fieldDiffs.length, 0);
  assert.equal(r.unfittedComponentsA.length, 0);
  assert.equal(r.fits.length, 2);
});

test('a piece that cannot be fitted is listed in unfittedComponentsA with its elements unmatched; the rest is still compared', async () => {
  const a = await readCiiGraph(twoPieces()), b = await readCiiGraph(twoPieces([0.4, 0, 0]));
  const r = compareCii(a, b); // the straight piece has 2 anchors, 0.4 mm off and on one line
  assert.equal(elementPairs(r).length, 4);
  assert.equal(r.unfittedComponentsA.length, 1);
  assert.equal(r.unfittedComponentsA[0].firstNode, '100');
  assert.deepEqual(r.unmatchedA.map(u => u.fromNode + '-' + u.toNode), ['100-110']);
  assert.match(r.unmatchedA[0].reason, /could not be fitted/);
  assert.deepEqual(r.unmatchedB.map(u => u.fromNode + '-' + u.toNode), ['100-110']);
  // Manual anchors in the bend only: the straight piece has no anchor and is unfitted, not refused.
  const m = compareCii(a, a, { anchors: '10:10,30:30,50:50' });
  assert.equal(elementPairs(m).length, 4);
  assert.match(m.unfittedComponentsA[0].reason, /no anchor/);
});

// Review probe1 P1/P1c: the whole of X-S1 shifted through its COORDS start point.
const shiftS1 = (bytes, d) => {
  const rows = readCii14(bytes).sections.get('COORDS'), edits = [];
  for (const line of rows.slice(1)) for (let k = 1; k <= 3; k++) {
    const start = line.start + 2 + 13 * k, v = Number(line.text.slice(2 + 13 * k, 15 + 13 * k));
    edits.push({ start, end: start + 13, text: f13(v + d[k - 1]) });
  }
  return replaceSpans(bytes, edits);
};

test('X-S1 shifted 0.5 mm: pairs are same-number-after-fit, not same position, and the shift is a MODEL_OFFSET difference', async () => {
  const b = await readCiiGraph(shiftS1(await bench('X-S1'), [0.5, 0, 0]), { member: 'shift' });
  const r = compareCii(await g('X-S1'), b);
  assert.equal(elementPairs(r).length, 56);
  assert.ok(elementPairs(r).every(p => p.rule === 'same-number-after-fit'));
  assert.ok(elementPairs(r).every(p => Math.abs(p.rawDistanceMm - 0.5) < 1e-6));
  assert.equal(r.fieldDiffs.length, 1);
  const o = r.fieldDiffs[0];
  assert.equal(o.field, 'MODEL_OFFSET');
  assert.ok(Math.abs(o.valueB.translation[0] - 0.5) < 1e-3 && Math.abs(o.valueB.maxMoveMm - 0.5) < 1e-3);
  // At tolerance 0.1 no node is close enough to be an anchor: refused, nothing is claimed.
  assert.equal((await attempt(() => compareCii(graphs['X-S1'], b, { toleranceMm: 0.1 }))).refusals[0].code, 'MAP_ANCHORS_TOO_FEW');
});

test('X-S1 shifted 100 mm with manual anchors: 56 pairs after fit and a 100 mm MODEL_OFFSET', async () => {
  const b = await readCiiGraph(shiftS1(await bench('X-S1'), [100, 0, 0]), { member: 'shift100' });
  const r = compareCii(await g('X-S1'), b, { anchors: '3790:3790,3830:3830,3840:3840,3870:3870' });
  assert.equal(elementPairs(r).length, 56);
  assert.ok(elementPairs(r).every(p => p.rule === 'same-number-after-fit' && Math.abs(p.rawDistanceMm - 100) < 1e-6));
  assert.deepEqual(r.fieldDiffs.map(d => d.field), ['MODEL_OFFSET']);
  assert.ok(Math.abs(r.fieldDiffs[0].valueB.translation[0] - 100) < 1e-3);
});

test('review round 3: a miss of 6 mm plus float noise (6.000000000000001) still closes; 6.001 mm is refused', async () => {
  const two = (m) => [['1', '2', [0, 0, 0]], ['1', '2', [m, 0, 0]]].map(([from, to, delta], i) => ({ from, to, delta, witness: 'E' + i }));
  assert.ok(6.000000000000001 > 6);
  assert.equal(closeLoops(two(6.000000000000001)).loops.length, 1);
  assert.equal((await attempt(() => closeLoops(two(6.001)))).refusals[0].code, 'MAP_LOOP_NOT_CLOSED');
});

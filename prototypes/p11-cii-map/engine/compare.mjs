// p11-cii-map: CII <-> CII geometry map (read-only). Pure: graphs in, pairs out.
//
// Steps, per connected piece of model A ("component"):
//  1. Anchors. Manual anchors (A node -> B node) if given; otherwise automatic anchors: nodes with the
//     same number in A and B whose positions are within the tolerance.
//  2. Fit. The anchors of one A component that land in one B component go through ciifr-map's Method C
//     fit (vendored resolution-fit.js -> registerMethodC: proper rigid rotation + translation).
//     It needs at least 3 anchors that are not all on one line; otherwise MAP_ANCHORS_TOO_FEW.
//  3. Nodes. Every A node of the component is moved by the fit and matched to B nodes within the
//     tolerance with ciifr-map's findMethodCCandidates; then pairs are made 1:1, nearest first,
//     same node number first on ties.
//  4. Elements. An A element pairs with the B element that joins the two paired nodes.
//  5. Field differences. For each element pair, the named values are compared.
import { refuse, require } from '../kit/core.mjs';
import { fitResolutionTrial } from '../vendor/prototypes/ciifr-map/resolution-fit.js';
import { findMethodCCandidates } from '../vendor/tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import { elementValues } from './cii-graph.mjs';

/** Two positions closer than this (mm) count as "the same position". */
export const SAME_POSITION_MM = 0.001;
/** Anchors used per fit. ciifr-map accepts up to 96, but its line check tests every triple (n^3), so we fit on 12
 *  well-spread anchors (always including the widest triangle). All anchors are still checked afterwards as node pairs. */
const MAX_FIT_ANCHORS = 12;
/** Pair rules, strongest first. "same position" is judged on the raw positions in the two files;
 *  "after fit" means the positions agree only once the piece's rigid fit is applied. */
export const RULES = Object.freeze(['same-number-same-position', 'same-position', 'same-number-after-fit',
  'same-position-after-fit', 'nearest-within-tolerance']);
const IDENTITY = Object.freeze([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
export const FIELDS = Object.freeze(['diameter', 'wall', 'insulation', 'T1', 'P1', 'rigidWeight', 'restraintCount', 'fromName', 'toName']);

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const byId = (x, y) => Number(x) - Number(y) || String(x).localeCompare(String(y));

/** "10:10,20:25" -> [{a:'10', b:'10'}, {a:'20', b:'25'}]. Refuses MAP_ANCHOR_INVALID. */
export function parseAnchors(text) {
  return String(text).split(',').filter(s => s.trim()).map(s => {
    const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(s);
    require(m, 'MAP_ANCHOR_INVALID', s, 'write anchors as A-node:B-node, e.g. 10:10,20:20,30:30');
    return { a: String(Number(m[1])), b: String(Number(m[2])) };
  });
}

/** Automatic anchors: same node number, position within tolerance (no fit yet: raw coordinates). */
export function autoAnchors(a, b, tol) {
  const out = [];
  for (const n of a.nodes) {
    const m = b.nodeIndex.get(n.id);
    if (m && dist(n.xyz, m.xyz) <= tol + 1e-9) out.push({ a: n.id, b: m.id });
  }
  return out;
}

/** Choose at most MAX_FIT_ANCHORS anchors, always keeping the three that span the widest triangle. */
function chooseFitAnchors(list, a) {
  if (list.length <= MAX_FIT_ANCHORS) return list;
  const P = x => a.nodeIndex.get(x.a).xyz;
  const p0 = list[0], p1 = list.reduce((m, x) => dist(P(x), P(p0)) > dist(P(m), P(p0)) ? x : m, p0);
  const area = x => { const u = P(p1).map((v, i) => v - P(p0)[i]), w = P(x).map((v, i) => v - P(p0)[i]);
    return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]); };
  const p2 = list.reduce((m, x) => area(x) > area(m) ? x : m, p0);
  const keep = new Set([p0, p1, p2]);
  const step = list.length / (MAX_FIT_ANCHORS - 3);
  for (let i = 0; keep.size < MAX_FIT_ANCHORS && i < list.length; i = Math.floor(i + step)) keep.add(list[Math.floor(i)]);
  return [...keep];
}

/** Fit one A component onto one B component with the vendored Method C rigid fit. */
function fitComponent(a, b, anchors, tol, where) {
  const pairs = chooseFitAnchors(anchors, a).map(x => ({
    key: JSON.stringify([x.a, x.b]), source: x.a, target: x.b, targetKey: x.b,
    sourceComponent: a.nodeIndex.get(x.a).component, targetComponent: b.nodeIndex.get(x.b).component }));
  let fit;
  try {
    fit = fitResolutionTrial(a, b, pairs, { mode: 'RIGID' });
  } catch (e) {
    if (/DEGENERATE|NONCOLLINEAR|RIGID_MINIMUM/.test(e.message))
      refuse('MAP_ANCHORS_TOO_FEW', where, 'the anchors are all on one line; give at least 3 anchors not on one line (--anchors 10:10,20:20,30:30)');
    refuse('MAP_FIT_FAILED', where, e.message);
  }
  const t = fit.transform;
  require(t.maxResidualMm <= Math.max(tol, SAME_POSITION_MM) + 1e-9, 'MAP_FIT_FAILED', where,
    'anchors disagree by up to ' + t.maxResidualMm.toFixed(3) + ' mm after the best rigid fit (tolerance ' + tol + ' mm)');
  return t;
}

/** Identity fit of one A piece onto one B piece (used when all its anchors coincide exactly). */
function identityFit(a, b, ca, cb, list) {
  return { rotation: IDENTITY.map(r => [...r]), translation: [0, 0, 0], scale: 1, maxResidualMm: 0, status: 'IDENTITY_EXACT_ANCHORS',
    sourceComponent: ca, targetComponent: cb, sourceSha: a.sha256, targetSha: b.sha256, sourceMember: a.member, targetMember: b.member,
    anchors: list.map(x => ({ source: x.a, target: x.b })) };
}

/** Largest distance (mm) any node of the A piece is moved by the fit: 0 for an identity fit. */
function fitMove(a, ca, t) {
  let m = 0;
  for (const id of a.components[ca]) {
    const p = a.nodeIndex.get(id).xyz, q = t.rotation.map((r, i) => r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + t.translation[i]);
    m = Math.max(m, dist(p, q));
  }
  return m;
}

/**
 * Fit every A piece that has anchors. Returns {fits, unfittedComponentsA}. A piece that cannot be fitted
 * (no anchor, fewer than 3, or all on one line) is listed as unfitted, unless all its anchors coincide
 * exactly (same number, same raw position) AND another piece got a real fit: then it gets the identity fit.
 */
function fitPieces(a, b, groups, manual, tol) {
  const fits = [], unfittedComponentsA = [], exactOnly = [];
  a.components.forEach((ids, ca) => {
    const where = 'A piece ' + ca + ' (' + ids.length + ' nodes, first node ' + ids[0] + ')';
    const g = groups.get(ca);
    if (!g) { unfittedComponentsA.push({ component: ca, nodeCount: ids.length, firstNode: ids[0], reason: 'no anchor in this piece' }); return; }
    const [cb, list] = [...g].sort((x, y) => y[1].length - x[1].length || x[0] - y[0])[0];
    const exact = list.filter(x => x.a === x.b && dist(a.nodeIndex.get(x.a).xyz, b.nodeIndex.get(x.b).xyz) <= SAME_POSITION_MM);
    let transform = null, problem = null;
    // Automatic mode fits on the exact anchors first, so one moved node does not pull the whole fit.
    const tries = !manual && exact.length >= 3 && exact.length < list.length ? [exact, list] : [list];
    for (const t of tries) {
      if (transform) break;
      if (t.length < 3) { problem = t.length + ' anchor(s); at least 3 not on one line are needed'; continue; }
      try { transform = fitComponent(a, b, t, tol, where); } catch (e) { if (e.code !== 'MAP_ANCHORS_TOO_FEW') throw e; problem = 'the anchors are all on one line'; }
    }
    if (transform) { fits.push({ componentA: ca, componentB: cb, anchors: list.length, transform }); return; }
    if (exact.length === list.length) exactOnly.push({ ca, cb, list, where, problem });
    else unfittedComponentsA.push({ component: ca, nodeCount: ids.length, firstNode: ids[0], reason: problem });
  });
  // Exact-only pieces get the identity fit, but only once another piece fixed the comparison (else MAP_ANCHORS_TOO_FEW).
  for (const x of exactOnly) {
    if (fits.length) fits.push({ componentA: x.ca, componentB: x.cb, anchors: x.list.length, transform: identityFit(a, b, x.ca, x.cb, x.list) });
    else unfittedComponentsA.push({ component: x.ca, nodeCount: a.components[x.ca].length, firstNode: a.components[x.ca][0], reason: x.problem });
  }
  require(fits.length > 0, 'MAP_ANCHORS_TOO_FEW', 'compare',
    'no piece of model A can be fitted (' + unfittedComponentsA.map(u => 'piece ' + u.component + ': ' + u.reason).join('; ') +
    '); give at least 3 anchors not on one line (--anchors 10:10,20:20,30:30)');
  fits.sort((x, y) => x.componentA - y.componentA);
  return { fits, unfittedComponentsA };
}

function weaker(r1, r2) { return RULES[Math.max(RULES.indexOf(r1), RULES.indexOf(r2))]; }

/**
 * compareCii(a, b, {anchors, toleranceMm=1}): a and b are graphs from readCiiGraph.
 * anchors: [{a, b}] node numbers, or a "10:10,20:20" string. Omitted = automatic anchors.
 */
export function compareCii(a, b, { anchors, toleranceMm = 1 } = {}) {
  require(a && a.nodeIndex && a.cii && b && b.nodeIndex && b.cii, 'MAP_EMPTY_INPUT', 'compare', 'two CII graphs are needed');
  const tol = Number(toleranceMm);
  require(Number.isFinite(tol) && tol >= 0 && tol <= 100000, 'MAP_TOLERANCE_INVALID', 'toleranceMm', String(toleranceMm));
  const manual = anchors !== undefined && anchors !== null && anchors !== '';
  const anchorList = manual ? (typeof anchors === 'string' ? parseAnchors(anchors) : anchors.map(x => ({ a: String(x.a), b: String(x.b) })))
    : autoAnchors(a, b, tol);
  for (const x of anchorList) {
    require(a.nodeIndex.has(x.a), 'MAP_ANCHOR_INVALID', 'A node ' + x.a, 'not a node of file A');
    require(b.nodeIndex.has(x.b), 'MAP_ANCHOR_INVALID', 'B node ' + x.b, 'not a node of file B');
  }
  if (manual) {
    require(new Set(anchorList.map(x => x.a)).size === anchorList.length && new Set(anchorList.map(x => x.b)).size === anchorList.length,
      'MAP_ANCHOR_INVALID', 'anchors', 'a node is used twice');
  }

  // Group anchors per A component; each A component is fitted onto the B component most of its anchors land in.
  const groups = new Map();
  for (const x of anchorList) {
    const ca = a.nodeIndex.get(x.a).component, cb = b.nodeIndex.get(x.b).component;
    if (!groups.has(ca)) groups.set(ca, new Map());
    const g = groups.get(ca); if (!g.has(cb)) g.set(cb, []); g.get(cb).push(x);
  }
  const { fits, unfittedComponentsA } = fitPieces(a, b, groups, manual, tol);
  const unfitted = new Map(unfittedComponentsA.map(u => [u.component, u.reason]));

  // Node candidates through the vendored Method C candidate search, then 1:1, nearest first.
  const offers = [];
  for (const f of fits) {
    const c = findMethodCCandidates(a, b, f.transform, { x: tol, y: tol, z: tol });
    for (const row of c.rows) for (const alt of row.alternatives) {
      if (alt.distance > tol + 1e-9) continue; // the box search is per axis; the tolerance is a distance
      const raw = dist(a.nodeIndex.get(row.source).xyz, b.nodeIndex.get(alt.target).xyz);
      offers.push({ a: row.source, b: alt.target, distance: alt.distance, raw, sameId: row.source === alt.target });
    }
  }
  offers.sort((x, y) => (x.distance <= SAME_POSITION_MM && y.distance <= SAME_POSITION_MM ? 0 : x.distance - y.distance)
    || (y.sameId - x.sameId) || x.distance - y.distance || byId(x.a, y.a) || byId(x.b, y.b));
  const nodeA = new Map(), nodeB = new Map();
  for (const o of offers) {
    if (nodeA.has(o.a) || nodeB.has(o.b)) continue;
    const rule = o.raw <= SAME_POSITION_MM ? (o.sameId ? RULES[0] : RULES[1])
      : o.distance <= SAME_POSITION_MM ? (o.sameId ? RULES[2] : RULES[3]) : RULES[4];
    const p = { kind: 'node', a: o.a, b: o.b, rule, distanceMm: o.distance, rawDistanceMm: o.raw };
    nodeA.set(o.a, p); nodeB.set(o.b, p);
  }

  // Elements: the B element joining the two paired nodes (either direction).
  const bByEnds = new Map();
  b.edges.forEach((e, i) => { const k = e.from + '|' + e.to; if (!bByEnds.has(k)) bByEnds.set(k, []); bByEnds.get(k).push(i); });
  const usedB = new Set(), elementPairs = [], unmatchedA = [];
  const ref = (g, i) => { const e = g.edges[i]; return { elementIndex: e.ciiElementIndex, fromNode: e.from, toNode: e.to }; };
  a.edges.forEach((e, i) => {
    const pf = nodeA.get(e.from), pt = nodeA.get(e.to);
    let hit = null, reversed = false;
    if (pf && pt) {
      hit = (bByEnds.get(pf.b + '|' + pt.b) || []).find(j => !usedB.has(j));
      if (hit === undefined) { hit = (bByEnds.get(pt.b + '|' + pf.b) || []).find(j => !usedB.has(j)); reversed = hit !== undefined; }
    }
    if (hit === undefined || hit === null) {
      const piece = a.nodeIndex.get(e.from).component;
      const reason = unfitted.has(piece) ? 'its piece of model A could not be fitted: ' + unfitted.get(piece)
        : pf && pt ? 'no B element joins the paired nodes' : 'an end node has no partner';
      unmatchedA.push({ kind: 'element', ...ref(a, i), reason }); return;
    }
    usedB.add(hit);
    elementPairs.push({ kind: 'element', a: ref(a, i), b: ref(b, hit), rule: weaker(pf.rule, pt.rule), reversed,
      distanceMm: Math.max(pf.distanceMm, pt.distanceMm), rawDistanceMm: Math.max(pf.rawDistanceMm, pt.rawDistanceMm), edgeA: i, edgeB: hit });
  });
  const unmatchedB = b.edges.map((e, i) => i).filter(i => !usedB.has(i))
    .map(i => ({ kind: 'element', ...ref(b, i), reason: 'no A element pairs with it' }));

  // Field differences per element pair.
  const fieldDiffs = [];
  // A piece that only matches after moving it: report the move itself as a difference.
  for (const f of fits) {
    const move = fitMove(a, f.componentA, f.transform);
    if (move > SAME_POSITION_MM) fieldDiffs.push({ a: { component: f.componentA }, b: { component: f.componentB }, field: 'MODEL_OFFSET',
      valueA: null, valueB: { translation: f.transform.translation, rotation: f.transform.rotation, maxMoveMm: move } });
  }
  for (const p of elementPairs) {
    // Graph edges are built from ciiElements in the same order, so edge i is ciiElements[i].
    const va = elementValues(a.cii, a.ciiElements[p.edgeA]);
    const vb = elementValues(b.cii, b.ciiElements[p.edgeB]);
    if (p.reversed) [vb.fromName, vb.toName] = [vb.toName, vb.fromName];
    for (const f of FIELDS) if (va[f] !== vb[f]) fieldDiffs.push({ a: p.a, b: p.b, field: f, valueA: va[f], valueB: vb[f] });
  }

  const nodePairs = [...nodeA.values()].sort((x, y) => byId(x.a, y.a));
  const unmatchedNodesA = a.nodes.filter(n => !nodeA.has(n.id)).map(n => n.id).sort(byId);
  const unmatchedNodesB = b.nodes.filter(n => !nodeB.has(n.id)).map(n => n.id).sort(byId);
  const pairs = [...elementPairs.map(({ edgeA, edgeB, ...p }) => p), ...nodePairs];
  const byRule = Object.fromEntries(RULES.map(r => [r, elementPairs.filter(p => p.rule === r).length]));
  return {
    summary: { toleranceMm: tol, anchorMode: manual ? 'manual' : 'automatic', anchors: anchorList.length,
      elementsA: a.edges.length, elementsB: b.edges.length, elementPairs: elementPairs.length, nodePairs: nodePairs.length,
      unmatchedA: unmatchedA.length, unmatchedB: unmatchedB.length,
      unmatchedNodesA: unmatchedNodesA.length, unmatchedNodesB: unmatchedNodesB.length,
      fieldDiffs: fieldDiffs.length, elementPairsByRule: byRule },
    fits: fits.map(f => ({ componentA: f.componentA, componentB: f.componentB, anchors: f.anchors,
      rotation: f.transform.rotation, translation: f.transform.translation, maxResidualMm: f.transform.maxResidualMm })),
    unfittedComponentsA, pairs, unmatchedA, unmatchedB, unmatchedNodesA, unmatchedNodesB, fieldDiffs,
  };
}

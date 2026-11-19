/**
 * Group 2 (Owner 19 Nov 2026): a pipe broken in CAESAR II gives a new node in the XML.
 *
 * Owner's words: "Temperature and other element block should be used based on mapping, If nothing available to map,
 * then use sentinel value or Previous element block data (Based on UXML logic)"; "Pipe broken, new node, use (1)
 * logics"; "for transfer node wise mapping will be prerequisite, that is the logic".
 *
 * So the node is made first (this stage), then the transfer runs node-wise on the XML that has it:
 *   1. findCiiNewNodes: a CII node the matcher left unpaired, on a chain of CII elements between two paired nodes
 *      whose XML records are neighbours in one branch, is a pipe broken in CAESAR II. It must lie on that XML pipe:
 *      at most 1 mm off the line, and more than 1 mm from both ends. Anything else is refused and named.
 *   2. ciiNewNodeStage: a `split` op per new node, after the XML node it follows. The new node is a point on the pipe
 *      (ATTA, Endpoint 0, no weight, no component ref) with CAESAR II's node number, at CAESAR II's point (frame
 *      cii2019 -> PSI116: CII (X, Y, Z) = (x, z, -y)) put on the XML pipe's line, so the pipe stays straight (the CII
 *      point drifts up to about 0.8 mm from rounding; measured 0.4 mm on the EF-05 test). Every other value is the previous element block
 *      (the XML node it follows, UXML's split logic), marked rule 'cii-new-node:previous-element'.
 *   3. Then (caller): the transfer, on the XML written from this document, takes CAESAR II's own values and support
 *      for the node (locked), and the supports + engineering stage under locks applies the mapping to the rest.
 *      A value left as copied is the previous element's; no field needs a sentinel because the previous element
 *      always has one.
 */
import {stageUid, UxmlRefusal} from '../UxmlV2Kernel.js';
import {parseLiteral} from '../UxmlV2Psi116Reader.js';

export const CII_NEW_NODE_STAGE = 'cii-new-node';
export const RULE_PREVIOUS = 'cii-new-node:previous-element';
export const RULE_POINT = 'cii-new-node:new-point';
const ON_LINE_MM = 1;
// A point on a pipe: these describe the point itself, never the element it sits on.
const POINT_VALUES = Object.freeze({NodeName: '', Endpoint: '0', ComponentType: 'ATTA', ConnectionType: '', ComponentRefNo: '', Weight: '0', SIF: '0', Rigid: '0'});

const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };
const textOf = value => String(value?.text ?? value?.v ?? '').trim();
const xyzOf = comp => textOf(comp.values?.Position).split(/\s+/).map(Number);
const ciiToPsi116 = ([X, Y, Z]) => [X, -Z, Y];
const sub = (a, b) => a.map((v, k) => v - b[k]);
const dot = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0);
const number = id => Number(id);

/** Where a CII node lies on the XML pipe a -> b (PSI116 frame): {alongMm, offMm, lengthMm}. */
export function onPipe(p, a, b) {
  const ab = sub(b, a), lengthMm = Math.sqrt(dot(ab, ab));
  const t = lengthMm ? dot(sub(p, a), ab) / (lengthMm * lengthMm) : 0;
  const foot = a.map((v, k) => v + ab[k] * Math.min(1, Math.max(0, t)));
  const off = sub(p, foot);
  return {alongMm: t * lengthMm, offMm: Math.sqrt(dot(off, off)), lengthMm, foot};
}

/**
 * New nodes from the matcher's result (U2dInBrowser.matchForU2d: nodePairs, unmatchedNodesCii, ciiNodes, ciiElements).
 * Returns {splits: [{ciiNode, pipeline, after, template, position, offMm, alongMm, lengthMm, branch, between}], refused: [...]}.
 */
export function findCiiNewNodes(doc, match) {
  const at = new Map();
  for (const pair of match.nodePairs || []) {
    const p = doc.pipelines[pair.xml.branchOrdinal], comp = p?.components[pair.xml.nodeOrdinal];
    if (!comp || textOf(comp.values?.NodeNumber) !== String(pair.xml.nodeNumber ?? '').trim())
      fail('UXML_CII_NEW_NODE_PAIR_UNKNOWN', {pair: `${pair.xml.branchOrdinal}:${pair.xml.nodeOrdinal}`});
    if (!at.has(String(pair.cii))) at.set(String(pair.cii), []);
    at.get(String(pair.cii)).push({p, i: pair.xml.nodeOrdinal});
  }
  const xyz = new Map((match.ciiNodes || []).map(n => [String(n.id), n.xyz]));
  const next = new Map();
  for (const e of match.ciiElements || []) for (const [u, v] of [[e.from, e.to], [e.to, e.from]]) {
    if (!next.has(String(u))) next.set(String(u), []);
    next.get(String(u)).push(String(v));
  }
  const numbers = new Set(doc.pipelines.flatMap(p => p.components.map(c => textOf(c.values?.NodeNumber))));
  const unpaired = new Set((match.unmatchedNodesCii || []).map(String));
  const splits = [], refused = [], done = new Set();
  for (const start of [...unpaired].sort((a, b) => number(a) - number(b))) {
    if (done.has(start)) continue;
    // The run of unpaired CII nodes through `start`, and the paired nodes at its two ends.
    const chain = [start], ends = [];
    done.add(start);
    for (let k = 0; k < chain.length; k++) for (const n of next.get(chain[k]) || []) {
      if (unpaired.has(n)) { if (!done.has(n)) { done.add(n); chain.push(n); } } else if (at.has(n)) ends.push(n);
    }
    const nodes = chain.slice().sort((a, b) => number(a) - number(b));
    const simple = chain.every(n => (next.get(n) || []).length === 2) && ends.length === 2 && ends[0] !== ends[1];
    if (!simple) { refused.push({code: 'UXML_CII_NEW_NODE_NOT_ON_A_PIPE', ciiNodes: nodes, detail: 'not on one run of pipe between two nodes the XML has'}); continue; }
    let pipe = null;
    for (const a of at.get(ends[0])) for (const b of at.get(ends[1]))
      if (!pipe && a.p === b.p && Math.abs(a.i - b.i) === 1) pipe = a.i < b.i ? {p: a.p, x: a.i, from: ends[0]} : {p: a.p, x: b.i, from: ends[1]};
    if (!pipe) { refused.push({code: 'UXML_CII_NEW_NODE_NOT_ON_A_PIPE', ciiNodes: nodes, detail: `nodes ${ends.join(' and ')} are not neighbours in one XML branch`}); continue; }
    const x = pipe.p.components[pipe.x], y = pipe.p.components[pipe.x + 1];
    const branch = textOf(pipe.p.values?.Branchname);
    const between = [x, y].map(c => textOf(c.values?.NodeNumber));
    // Walk the chain from the end at the XML node it follows.
    const ordered = [];
    for (let prev = pipe.from, cur = (next.get(pipe.from) || []).find(n => chain.includes(n)); cur; ) {
      ordered.push(cur);
      const step = (next.get(cur) || []).find(n => n !== prev && chain.includes(n) && !ordered.includes(n));
      prev = cur; cur = step;
    }
    const placed = ordered.map(ciiNode => ({ciiNode, p: ciiToPsi116(xyz.get(ciiNode) || []), ...onPipe(ciiToPsi116(xyz.get(ciiNode) || []), xyzOf(x), xyzOf(y))}));
    const bad = placed.find((n, k) => !n.p.every(Number.isFinite) || n.offMm > ON_LINE_MM || n.alongMm <= ON_LINE_MM
      || n.alongMm >= n.lengthMm - ON_LINE_MM || (k && n.alongMm <= placed[k - 1].alongMm));
    if (bad) {
      refused.push({code: 'UXML_CII_NEW_NODE_OFF_PIPE', ciiNodes: nodes, branch, between,
        detail: `node ${bad.ciiNode} is ${bad.offMm.toFixed(1)} mm off the XML pipe ${between.join(' -> ')} (at ${bad.alongMm.toFixed(1)} of ${bad.lengthMm.toFixed(1)} mm); at most ${ON_LINE_MM} mm, not at an end`});
      continue;
    }
    const taken = placed.find(n => numbers.has(n.ciiNode));
    if (taken) { refused.push({code: 'UXML_CII_NEW_NODE_NUMBER_TAKEN', ciiNodes: nodes, branch, detail: `node number ${taken.ciiNode} is already in the XML`}); continue; }
    for (const n of placed) splits.push({ciiNode: n.ciiNode, pipeline: pipe.p.uid, template: x.uid, branch, between,
      position: n.foot.map(v => v.toFixed(2)).join(' '), offMm: n.offMm, alongMm: n.alongMm, lengthMm: n.lengthMm});
  }
  return {splits, refused};
}

/** Stage inputs {splits} from findCiiNewNodes: one `split` op per new node, in order along each pipe. */
export const ciiNewNodeStage = Object.freeze({
  id: CII_NEW_NODE_STAGE, rulesVersion: 'cii-new-node/1', reads: ['topology', 'engineering'], writes: ['topology'],
  run(doc, {splits = []} = {}) {
    const comps = new Map(doc.pipelines.flatMap(p => p.components.map(c => [c.uid, c])));
    const ops = [], lastAfter = new Map();
    splits.forEach((s, ordinal) => {
      const x = comps.get(s.template) || fail('UXML_UID_UNKNOWN', {uid: s.template});
      const uid = stageUid(doc.revision.id, CII_NEW_NODE_STAGE, 'pipe broken in CAESAR II', [x.uid], ordinal);
      const after = lastAfter.get(s.template) || x.uid;
      lastAfter.set(s.template, uid);
      const values = {};
      for (const [key, value] of Object.entries(x.values)) values[key] = {v: value.v, text: value.text, src: 'stage', rule: RULE_PREVIOUS};
      const point = {...Object.fromEntries(Object.entries(POINT_VALUES).filter(([k]) => k in values)), NodeNumber: s.ciiNode, Position: s.position};
      for (const [key, text] of Object.entries(point)) values[key] = {v: parseLiteral(text), text, src: 'stage', rule: RULE_POINT};
      ops.push({op: 'split', uid, parent: s.pipeline, after, kind: 'component', entity: {
        kind: 'component', sourceKey: `${x.sourceKey}+cii:${s.ciiNode}`,
        lineage: {op: 'split', from: after === x.uid ? [x.uid] : [x.uid, after], stage: CII_NEW_NODE_STAGE, rule: 'pipe broken in CAESAR II'},
        fieldOrder: [...(x.fieldOrder || Object.keys(x.values))], values, restraints: [],
      }});
    });
    return {ops};
  },
});

/** Review rows for the new nodes in the final document: [branch, node, between, key, value, came from]. */
export function newNodeValueRows(doc, splits) {
  const rows = [];
  for (const s of splits) for (const p of doc.pipelines) for (const c of p.components) {
    if (textOf(c.values?.NodeNumber) !== s.ciiNode || c.lineage?.stage !== CII_NEW_NODE_STAGE) continue;
    for (const [key, value] of Object.entries(c.values)) {
      const from = key === 'NodeNumber' ? 'the new point (CAESAR II number)' + (value.lock?.supports ? '; its supports are locked' : '')
        : value.lock?.by === 'transfer' ? 'CAESAR II (transferred, locked)'
        : value.rule === RULE_POINT ? 'the new point (CAESAR II position and number)'
          : value.rule === RULE_PREVIOUS ? `previous element block (node ${s.between[0]})` : `mapping (${value.rule || value.src})`;
      rows.push([s.branch, s.ciiNode, s.between.join(' -> '), key, textOf(value), from]);
    }
    if (c.restraints.length) rows.push([s.branch, s.ciiNode, s.between.join(' -> '), 'Supports', c.restraints.map(r => textOf(r.values?.Type)).join(', '), 'CAESAR II (transferred, locked)']);
  }
  return rows;
}

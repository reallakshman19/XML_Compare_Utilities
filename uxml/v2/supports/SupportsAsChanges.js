/**
 * End-to-end plan E2a (Owner 19 Nov 2026, "Yes, build E2a"): today's supports stage as recorded changes on the step-10
 * UXML document.
 *
 * Today's supports code (SupportsStage.js) stays the oracle and keeps running on PSI116 text. Each sub-step's output XML
 * is read back and matched to the document, and every difference becomes a kernel op that names the sub-step:
 *   - a node is matched by Position, ComponentRefNo and ComponentType, in order (measured 19 Nov: every output node of
 *     the 5 benchmarks has one input node; none is added). An input node with no output node is a `remove` op (today:
 *     duplicate ATTA attachments at a kept ATTA's point). An output node with no input node is refused.
 *   - a value that changed or is new is a `set` op; a new key carries `afterKey` (the key before it in today's output),
 *     so the writer puts it where today's text has it. A value today drops is a `set` to null.
 *   - supports are matched by their place on the node: a rewritten support (PSI116 Z to CAESAR II Y, direction
 *     cosines added) is `set` ops on that support, which keeps its uid and any lock; a new support is an `add` op.
 *
 *   changesFromXml(doc, xmlText, rule) -> ops
 *   supportsAsChanges(doc, steps:[{id, xmlText}]) -> {uxml, deltas, counts}   one runStage per sub-step, in order
 *   engineXml(uxml) -> the XML the CII engine gets: written from the document, laid out as today's supports output.
 */
import {runStage, sha256Hex} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {parsePlainXml, serializePlainXml} from './PlainDom.js';

export const SUPPORTS_AS_CHANGES_RULES = 'supports-as-changes/1';
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];

const text = (entity, key) => String(entity?.values?.[key]?.text ?? '').trim();
const nodeKey = c => [text(c, 'Position'), text(c, 'ComponentRefNo'), text(c, 'ComponentType')].join('|');

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}

/** Longest common subsequence of two key lists: matched index pairs and the input indexes with no match. */
export function alignNodes(inKeys, outKeys) {
  const n = inKeys.length, m = outKeys.length;
  const L = Array.from({length: n + 1}, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1)
    L[i][j] = inKeys[i] === outKeys[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = [], removed = [], unmatched = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (inKeys[i] === outKeys[j]) pairs.push([i++, j++]);
    else if (L[i + 1][j] >= L[i][j + 1]) removed.push(i++);
    else unmatched.push(j++);
  }
  while (i < n) removed.push(i++);
  while (j < m) unmatched.push(j++);
  return {pairs, removed, unmatched};
}

const plain = (value, rule) => {
  const out = {...value, src: 'stage', rule};
  delete out.rev;
  return out;
};

/** Set ops turning entity `from`'s values into `to`'s: changed and new keys (new ones placed after the key before them). */
function valueOps(from, to, rule) {
  const ops = [], order = to.fieldOrder || Object.keys(to.values);
  order.forEach((key, k) => {
    const want = to.values[key], have = from.values?.[key];
    if (!want || (have && have.text === want.text)) return;
    const op = {op: 'set', uid: from.uid, path: 'values.' + key, after: plain(want, rule), rule};
    if (!have && k > 0) op.afterKey = order[k - 1];
    ops.push(op);
  });
  for (const key of Object.keys(from.values || {})) {
    if (!Object.hasOwn(to.values, key)) ops.push({op: 'set', uid: from.uid, path: 'values.' + key, after: null, rule});
  }
  if (to.frame !== from.frame && (to.frame || from.frame)) ops.push({op: 'set', uid: from.uid, path: 'frame', after: to.frame ?? null, rule});
  return ops;
}

/** Ops for one node's supports: rewritten ones by place (set ops, same uid), extra ones added, missing ones removed. */
function supportOps(c, d, rule) {
  const ops = [], shared = Math.min(c.restraints.length, d.restraints.length);
  for (let k = 0; k < shared; k += 1) ops.push(...valueOps(c.restraints[k], d.restraints[k], rule));
  for (let k = shared; k < c.restraints.length; k += 1) ops.push({op: 'remove', uid: c.restraints[k].uid, rule});
  let after = shared ? c.restraints[shared - 1].uid : null;
  for (let k = shared; k < d.restraints.length; k += 1) {
    const r = d.restraints[k], uid = 'u:s' + sha256Hex(`${c.uid}|${rule}|support|${k}`).slice(0, 15);
    const values = Object.fromEntries(Object.entries(r.values).map(([key, v]) => [key, plain(v, rule)]));
    ops.push({op: 'add', kind: 'restraint', uid, parent: c.uid, after, rule,
      entity: {kind: 'restraint', fieldOrder: [...(r.fieldOrder || Object.keys(r.values))], values,
        ...(r.frame ? {frame: r.frame} : {}), lineage: {from: [], rule}}});
    after = uid;
  }
  return ops;
}

/** Ops that turn `doc` into the PSI116 text `xmlText` (one sub-step's output), every op naming `rule`. `nodeKey`: how
 * nodes are matched (default position, reference and type; the gate's by-number control passes NodeNumber). */
export function changesFromXml(doc, xmlText, rule, {nodeKey: keyOf = nodeKey} = {}) {
  const out = readPsi116V2(xmlText, {fileSha256: sha256Hex(xmlText)});
  if (out.pipelines.length !== doc.pipelines.length)
    refuse('UXML_SUPPORTS_BRANCHES_CHANGED', {rule, branches: [doc.pipelines.length, out.pipelines.length]});
  const ops = [];
  doc.pipelines.forEach((p, b) => {
    const q = out.pipelines[b];
    ops.push(...valueOps(p, q, rule));
    const {pairs, removed, unmatched} = alignNodes(p.components.map(keyOf), q.components.map(keyOf));
    if (unmatched.length) refuse('UXML_SUPPORTS_NODE_NOT_MATCHED', {rule, branch: text(p, 'Branchname'), node: text(q.components[unmatched[0]], 'NodeNumber')});
    for (const i of removed) ops.push({op: 'remove', uid: p.components[i].uid, rule});
    for (const [i, j] of pairs) {
      ops.push(...valueOps(p.components[i], q.components[j], rule), ...supportOps(p.components[i], q.components[j], rule));
    }
  });
  return ops;
}

/** Plain counts of one sub-step's ops, by what they change (the review page and the gate read these). */
export function countChanges(doc, ops) {
  const kinds = new Map();
  for (const p of doc.pipelines) {
    kinds.set(p.uid, 'branch');
    for (const c of p.components) { kinds.set(c.uid, 'node'); for (const r of c.restraints) kinds.set(r.uid, 'support'); }
  }
  const m = {nodesRemoved: 0, supportsAdded: 0, supportsRemoved: 0, supportsChanged: 0, nodeValues: 0, branchValues: 0, nodesNumbered: 0};
  const changedSupports = new Set();
  for (const o of ops) {
    const kind = kinds.get(o.uid);
    if (o.op === 'add') m.supportsAdded += 1;
    else if (o.op === 'remove') m[kind === 'support' ? 'supportsRemoved' : 'nodesRemoved'] += 1;
    else if (kind === 'support') changedSupports.add(o.uid);
    else if (kind === 'branch') m.branchValues += 1;
    else { m.nodeValues += 1; if (o.path === 'values.NodeNumber') m.nodesNumbered += 1; }
  }
  m.supportsChanged = changedSupports.size;
  return m;
}

/** Run each sub-step's read-back as one recorded stage on the document, in order. */
export function supportsAsChanges(doc, steps) {
  let uxml = doc;
  const deltas = [], counts = {};
  for (const {id, xmlText} of steps) {
    const ops = changesFromXml(uxml, xmlText, id);
    const stage = {id: 'supports:' + id, rulesVersion: SUPPORTS_AS_CHANGES_RULES, reads: ['topology'], writes: LAYERS,
      run: () => ({ops, diagnostics: []})};
    const step = runStage(stage, uxml, {}, {}, {inputHashes: [sha256Hex(xmlText)]});
    counts[id] = countChanges(uxml, ops);
    uxml = step.uxml;
    deltas.push(step.delta);
  }
  return {uxml, deltas, counts};
}

/** The XML the CII engine gets: the document written, then laid out as today's supports stage lays out its output. */
export const engineXml = uxml => serializePlainXml(parsePlainXml(writePsi116FromUxmlV2(uxml).text));

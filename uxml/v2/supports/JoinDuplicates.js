/**
 * End-to-end plan E2c step 1, the join (Owner 20 Nov 2026, "Yes, that join"; replaces 19 Nov "keep the node").
 *
 * Today's branch pass removes duplicate ATTA nodes at one point and keeps one (DATUM, else the one with a support,
 * else the first). When a node it removes holds a transfer lock, that node is joined into the node today keeps, before
 * the stage runs, and compared value by value:
 *   - a value the same on both: kept once (a lock on it moves to the kept node);
 *   - a value only on the removed node: moved onto the kept node (locked if it was);
 *   - a value that differs: the locked one wins and is listed; with no lock the kept node's value stays (as today);
 *     two different locks on one value are refused (UXML_JOIN_LOCKS_DIFFER);
 *   - supports joined by content (pairSupports: a PSI116 Z counts as Y): identical ones kept once, the removed node's
 *     other supports moved onto the kept node; a supports lock moves with them;
 *   - identity (NodeNumber, NodeName, ComponentRefNo) is the kept node's; a lock on one is refused
 *     (UXML_JOIN_IDENTITY_LOCKED).
 * The removed node's locks are then released, so today's stage removes it as usual, and the kept node goes through
 * every sub-step. The join is one recorded stage (rule duplicate-join/1) plus a plain list of what was joined.
 *
 *   joinPlan(doc, branchPassXml) -> [{branch, from, into}]   (uids; refused when no single kept node is at the point)
 *   joinDuplicates(doc, plan, {stageWins}) -> {uxml, delta, joined:[{branch, from, into, moved, replaced, same}]}
 */
import {runStage, sha256Hex, LAYERS} from '../UxmlV2Kernel.js';
import {changesFromXml, pairSupports} from './SupportsAsChanges.js';

export const DUPLICATE_JOIN_RULES = 'duplicate-join/1';
const IDENTITY = ['NodeNumber', 'NodeName', 'ComponentRefNo'];
const txt = (e, k) => String(e?.values?.[k]?.text ?? '');
const hasLock = e => Object.values(e.values || {}).some(v => v?.lock) || (e.restraints || []).some(hasLock);

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}
const plainValue = v => { const out = {...v}; delete out.rev; delete out.lock; return out; };
const plainLock = l => { const out = {...l}; delete out.rev; return out; };

/** Locked nodes today's branch pass removes, each with the one ATTA node it keeps at the same point. */
export function joinPlan(doc, branchPassXml) {
  const removed = new Set(changesFromXml(doc, branchPassXml, 'branch-pass').filter(o => o.op === 'remove').map(o => o.uid));
  const plan = [];
  for (const p of doc.pipelines) for (const r of p.components) {
    if (!removed.has(r.uid) || !hasLock(r)) continue;
    const keepers = p.components.filter(c => !removed.has(c.uid) && txt(c, 'ComponentType') === 'ATTA' && txt(c, 'Position') === txt(r, 'Position'));
    if (keepers.length !== 1) refuse(keepers.length ? 'UXML_JOIN_KEEPER_AMBIGUOUS' : 'UXML_JOIN_NO_KEEPER', {branch: txt(p, 'Branchname'), node: txt(r, 'NodeNumber')});
    plan.push({branch: txt(p, 'Branchname'), from: r.uid, into: keepers[0].uid});
  }
  return plan;
}

/** Ops joining entity `from`'s values into `into` (a node or a support), per the rules above. */
function joinValues(from, into, rec, {skipIdentity, stageWins}) {
  const ops = [], have = new Set(Object.keys(into.values || {}));
  let prev = null;
  for (const key of from.fieldOrder || Object.keys(from.values)) {
    const rv = from.values[key], kv = into.values?.[key];
    const isIdentity = skipIdentity && IDENTITY.includes(key);
    if (isIdentity && rv?.lock && !(key === 'NodeNumber' && rv.lock.supports)) refuse('UXML_JOIN_IDENTITY_LOCKED', {node: rec.fromNumber, key});
    if (isIdentity && rv?.lock?.supports) {
      // The transfer set the removed node's supports: the lock moves with them to the kept node (one supports lock each).
      if (kv?.lock) refuse('UXML_JOIN_LOCKS_DIFFER', {node: rec.fromNumber, key: 'Supports'});
      ops.push({op: 'lock', uid: into.uid, path: 'values.NodeNumber', after: plainLock(rv.lock), rule: DUPLICATE_JOIN_RULES});
      rec.moved.push({key: 'Supports lock', value: rv.text, locked: true});
    }
    if (isIdentity || !rv) { if (have.has(key)) prev = key; continue; }
    const lock = rv.lock ? [{op: 'lock', uid: into.uid, path: 'values.' + key, after: plainLock(rv.lock), rule: DUPLICATE_JOIN_RULES}] : [];
    if (!kv) {
      ops.push({op: 'set', uid: into.uid, path: 'values.' + key, after: plainValue(rv), ...(prev ? {afterKey: prev} : {}), rule: DUPLICATE_JOIN_RULES}, ...lock);
      rec.moved.push({key, value: rv.text, locked: !!rv.lock});
      prev = key;
      continue;
    }
    prev = key;
    if (kv.text === rv.text) { rec.same += 1; if (rv.lock && !kv.lock) ops.push(...lock); continue; }
    if (!rv.lock || stageWins) continue;
    if (kv.lock) refuse('UXML_JOIN_LOCKS_DIFFER', {node: rec.fromNumber, key, locked: [kv.text, rv.text]});
    ops.push({op: 'set', uid: into.uid, path: 'values.' + key, after: plainValue(rv), rule: DUPLICATE_JOIN_RULES}, ...lock);
    rec.replaced.push({key, kept: rv.text, was: kv.text});
  }
  return ops;
}

/** Ops joining removed node `r`'s supports into kept node `k`, and releasing every lock of `r`. */
function joinSupports(r, k, rec, options) {
  const ops = [], pairs = pairSupports(r.restraints, k.restraints);
  const paired = new Set(pairs.map(([i]) => i));
  for (const [i, j] of pairs) ops.push(...joinValues(r.restraints[i], k.restraints[j], rec, options));
  let after = k.restraints.at(-1)?.uid ?? null;
  r.restraints.forEach((s, i) => {
    if (paired.has(i)) return;
    const uid = 'u:j' + sha256Hex(`${k.uid}|${s.uid}|join`).slice(0, 15);
    const values = Object.fromEntries(Object.entries(s.values).map(([key, v]) => [key, plainValue(v)]));
    ops.push({op: 'add', kind: 'restraint', uid, parent: k.uid, after, rule: DUPLICATE_JOIN_RULES,
      entity: {kind: 'restraint', fieldOrder: [...(s.fieldOrder || Object.keys(s.values))], values, ...(s.frame ? {frame: s.frame} : {}),
        lineage: {from: [s.uid], rule: DUPLICATE_JOIN_RULES}}});
    for (const [key, v] of Object.entries(s.values)) if (v?.lock) ops.push({op: 'lock', uid, path: 'values.' + key, after: plainLock(v.lock), rule: DUPLICATE_JOIN_RULES});
    rec.moved.push({key: 'Support', value: txt(s, 'Type'), locked: hasLock(s)});
    after = uid;
  });
  for (const e of [r, ...r.restraints]) for (const [key, v] of Object.entries(e.values || {}))
    if (v?.lock) ops.push({op: 'unlock', uid: e.uid, path: 'values.' + key, rule: DUPLICATE_JOIN_RULES});
  return ops;
}

/** Run the join as one recorded stage. `stageWins` (gate control only): a differing locked value is not taken. */
export function joinDuplicates(doc, plan, {stageWins = false} = {}) {
  const byUid = new Map(doc.pipelines.flatMap(p => p.components).map(c => [c.uid, c]));
  const ops = [], joined = [];
  for (const {branch, from, into} of plan) {
    const r = byUid.get(from), k = byUid.get(into);
    const rec = {branch, from: txt(r, 'NodeNumber'), into: txt(k, 'NodeNumber'), fromNumber: txt(r, 'NodeNumber'), moved: [], replaced: [], same: 0};
    ops.push(...joinValues(r, k, rec, {skipIdentity: true, stageWins}), ...joinSupports(r, k, rec, {skipIdentity: false, stageWins}));
    delete rec.fromNumber;
    joined.push(rec);
  }
  const stage = {id: 'supports:join', rulesVersion: DUPLICATE_JOIN_RULES, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(ops)})};
  const step = runStage(stage, doc);
  return {uxml: step.uxml, delta: step.delta, joined};
}

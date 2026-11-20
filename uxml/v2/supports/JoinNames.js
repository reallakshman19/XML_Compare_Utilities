/**
 * End-to-end plan E2, the "|" names (Owner 20 Nov 2026: "When multiple Node are there in one location (POS), use "|"
 * for join"; "preserve these as historic data under each ID, ex: NodeID.Nodename.1,.2,.3"; "Write | in output").
 *
 * Today's branch pass removes duplicate ATTA nodes at one point and keeps one; the removed nodes' names and AVEVA
 * references are lost. This stage writes them onto the kept node, joined with "|": the kept node's own first, then the
 * removed nodes' in document order (NodeName.1 is the kept node's, .2 and .3 the removed ones'). A value the same on
 * all of them is written once. NodeNumber is never joined.
 *   - The groups are today's (BranchPass.js removeDuplicateSupports: ATTA in any case, positions by xmlPositionKey at
 *     the coordinate tolerance); the removed nodes are those whose ids today's branch pass dropped.
 *   - It runs after today's code and after the conflicts are found: today's DTXR matching reads NodeName and
 *     ComponentRefNo (dtxr-resolver.js, dtxr-resolution-ledger.js), so today's code sees the plain names.
 *   - The XML output carries the joined names; the CII engine gets the XML without them, so the CII stays today's
 *     (SupportsUnderLocks.js: xmlText and engineXmlText).
 *   - A kept node's value the transfer locked, or a value the kept node does not have, is not written; it is listed.
 *
 *   joinNamesPlan(doc, branchPassXml (with ids), {tolerance}) -> [{branch, into, from:[uid], NodeName:[..], ComponentRefNo:[..]}]
 *   joinNames(uxml, plan) -> {uxml, delta (null when nothing is written), names:[{branch, node, nodeNumber, from,
 *     NodeName, ComponentRefNo, written:[key], notWritten:[{key, why}]}]}
 */
import {runStage, LAYERS} from '../UxmlV2Kernel.js';
import {changesFromXml} from './SupportsAsChanges.js';
import {xmlPositionKey} from './parent/ParentMatching.js';

export const JOIN_NAMES_RULES = 'duplicate-names/1';
/** The values joined with "|" (Owner 20 Nov: node name and AVEVA reference). */
export const JOINED_KEYS = ['NodeName', 'ComponentRefNo'];
const txt = (e, k) => String(e?.values?.[k]?.text ?? '');

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}

/** The kept node's value first, then the removed ones': written once when the same on all, else joined with "|". */
export const joinedText = values => (new Set(values).size === 1 ? values[0] : values.join('|'));

/** Today's duplicate groups that its branch pass thinned (by the ids it carried), each with its one kept node. */
export function joinNamesPlan(doc, branchPassXml, {tolerance = 1} = {}) {
  const removed = new Set(changesFromXml(doc, branchPassXml, 'branch-pass').filter(o => o.op === 'remove').map(o => o.uid));
  if (!removed.size) return [];
  const plan = [];
  for (const p of doc.pipelines) {
    const groups = new Map();
    for (const c of p.components) {
      if (txt(c, 'ComponentType').toUpperCase() !== 'ATTA') continue;
      const key = xmlPositionKey(txt(c, 'Position'), tolerance);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const group of groups.values()) {
      const gone = group.filter(c => removed.has(c.uid));
      if (!gone.length) continue;
      const kept = group.filter(c => !removed.has(c.uid));
      if (kept.length !== 1) refuse(kept.length ? 'UXML_NAMES_KEEPER_AMBIGUOUS' : 'UXML_NAMES_NO_KEEPER', {branch: txt(p, 'Branchname'), node: txt(gone[0], 'NodeNumber')});
      const order = [kept[0], ...gone];
      plan.push({branch: txt(p, 'Branchname'), into: kept[0].uid, from: gone.map(c => c.uid),
        ...Object.fromEntries(JOINED_KEYS.map(k => [k, order.map(c => txt(c, k))]))});
    }
  }
  const grouped = plan.reduce((n, g) => n + g.from.length, 0);
  if (grouped !== removed.size) refuse('UXML_NAMES_REMOVED_NOT_GROUPED', {removed: removed.size, grouped});
  return plan;
}

/** Write the joined names onto the kept nodes: one recorded stage (rule duplicate-names/1), and the list of them. */
export function joinNames(uxml, plan) {
  const byUid = new Map(uxml.pipelines.flatMap(p => p.components).map(c => [c.uid, c]));
  const ops = [], names = [];
  for (const g of plan) {
    const k = byUid.get(g.into);
    if (!k) refuse('UXML_NAMES_KEEPER_GONE', {branch: g.branch, node: g.into});
    const rec = {branch: g.branch, node: g.into, nodeNumber: txt(k, 'NodeNumber'), from: g.from, written: [], notWritten: [],
      ...Object.fromEntries(JOINED_KEYS.map(key => [key, g[key]]))};
    for (const key of JOINED_KEYS) {
      const value = joinedText(g[key]), have = k.values[key];
      if (!have) { rec.notWritten.push({key, why: 'the kept node has no value'}); continue; }
      if (have.lock) { rec.notWritten.push({key, why: 'locked by the transfer'}); continue; }
      if (have.text === value) continue;
      const after = {...have, v: value, text: value, src: 'stage', rule: JOIN_NAMES_RULES};
      delete after.rev;
      ops.push({op: 'set', uid: k.uid, path: 'values.' + key, after, rule: JOIN_NAMES_RULES});
      rec.written.push(key);
    }
    names.push(rec);
  }
  if (!ops.length) return {uxml, delta: null, names};
  const stage = {id: 'supports:names', rulesVersion: JOIN_NAMES_RULES, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(ops)})};
  const step = runStage(stage, uxml);
  if (step.refusals?.length) refuse('UXML_NAMES_REFUSED', {refused: step.refusals.map(c => c.key)});
  return {uxml: step.uxml, delta: step.delta, names};
}

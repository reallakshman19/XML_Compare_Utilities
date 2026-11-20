/**
 * End-to-end plan E2b (Owner 20 Nov 2026, "Yes, build E2b"): E2a's read-back (SupportsAsChanges.js) run under the
 * document's transfer locks, so step 10 can use one route for locked and unlocked files.
 *
 * Today's supports stage runs once, on the document's PSI116 WITHOUT the protection note (as LockedEngineering.js).
 * Each sub-step's output is read back as recorded changes, as in E2a, and under the locks:
 *   - a write to a locked value is dropped by the kernel and listed (as today: "the masters wanted 120, the
 *     transfer's 127 is kept");
 *   - on a node whose supports the transfer set (a supports lock on its NodeNumber), no change to its supports is
 *     taken; when today's final supports differ, that is one conflict, key 'Supports' (as today, Owner 18 Nov);
 *   - a locked node today removes as a duplicate is joined into the node today keeps (JoinDuplicates.js; Owner 20 Nov,
 *     "Yes, that join", replacing 19 Nov "keep the node"); a node still holding a lock is never removed (key 'Node').
 * Conflicts are what still differs between the final document and today's final output: each is listed once, with
 * the first sub-step that wanted it. Any other difference is a defect and refused (UXML_SUPPORTS_LOCKS_RESIDUAL).
 *
 *   runSupportsUnderLocks(doc, runStageFull) -> {uxml, deltas, conflicts, joined, xmlText (with the note), stageXmlText}
 *   runStageFull(psi116Text) -> {xmlText, stages} (SupportsStage.js runSupportsStage's result)
 */
import {runStage, sha256Hex, LAYERS} from '../UxmlV2Kernel.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {noteFromLocks, withTransferNote, withoutTransferNote} from '../transfer/TransferNote.js';
import {restraintsText} from '../transfer/LockedEngineering.js';
import {changesFromXml, SUPPORTS_AS_CHANGES_RULES, SUPPORTS_STEPS} from './SupportsAsChanges.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {joinDuplicates, joinPlan} from './JoinDuplicates.js';

export const SUPPORTS_UNDER_LOCKS_RULES = 'supports-under-locks/1';
const txt = (e, k) => String(e?.values?.[k]?.text ?? '');
const val = (e, k) => String(e?.values?.[k]?.v ?? ''); // place names as today's wrapper writes them (its .v)

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}

/** Every node of the document by uid, with its branch name, and the node owning each support. */
function nodesOf(doc) {
  const nodes = new Map(), owner = new Map();
  for (const p of doc.pipelines) for (const c of p.components) {
    nodes.set(c.uid, {c, branch: val(p, 'Branchname')});
    for (const r of c.restraints) owner.set(r.uid, c.uid);
  }
  return {nodes, owner};
}
const lockOf = c => Object.values(c.values || {}).find(v => v?.lock)?.lock
  ?? c.restraints.flatMap(r => Object.values(r.values || {})).find(v => v?.lock)?.lock ?? null;
const supportsLocked = c => !!c.values?.NodeNumber?.lock?.supports;

/**
 * Split one sub-step's ops into those taken and those held back by a lock: a removal of a locked node, and every
 * change to the supports of a supports-locked node. Held ops are returned as plain records of what was wanted.
 * `takeLockedSupports`, `removeLockedNodes`: the gate's wrong controls only.
 */
export function holdBackLocked(doc, ops, {takeLockedSupports = false, removeLockedNodes = false} = {}) {
  const {nodes, owner} = nodesOf(doc);
  const taken = [], held = [];
  for (const op of ops) {
    const node = nodes.get(op.uid);
    const host = nodes.get(op.op === 'add' ? op.parent : owner.get(op.uid));
    if (op.op === 'remove' && node && lockOf(node.c) && !removeLockedNodes) held.push({kind: 'node', uid: op.uid, op});
    else if (host && supportsLocked(host.c) && !takeLockedSupports) held.push({kind: 'supports', uid: host.c.uid, op});
    else taken.push(op);
  }
  return {taken, held};
}

/** The conflict list from what still differs at the end: value locks, kept nodes, locked supports (today's order:
 * values first, in document order, then supports). Anything a lock does not explain is refused. */
function residualConflicts(doc, todayXml, firstStep, options) {
  const {nodes, owner} = nodesOf(doc);
  const {held, taken} = holdBackLocked(doc, changesFromXml(doc, todayXml, 'residual'), options);
  const out = readPsi116V2(todayXml, {fileSha256: sha256Hex(todayXml)});
  const values = [], others = [], seen = new Set();
  const place = uid => { const n = nodes.get(uid) || nodes.get(owner.get(uid)); return n ? {branch: n.branch, node: val(n.c, 'NodeNumber')} : {branch: val(doc.pipelines.find(p => p.uid === uid), 'Branchname'), node: null}; };
  const byUid = new Map([...doc.pipelines, ...[...nodes.values()].flatMap(n => [n.c, ...n.c.restraints])].map(e => [e.uid, e]));
  for (const op of taken) {
    const entity = byUid.get(op.uid);
    const key = op.path?.startsWith('values.') ? op.path.slice(7) : null;
    const current = key ? entity?.values?.[key] : null;
    if (op.op !== 'set' || !current?.lock) refuse('UXML_SUPPORTS_LOCKS_RESIDUAL', {op: op.op, uid: op.uid, path: op.path ?? null});
    values.push({...place(op.uid), key, kept: current.text, stageWanted: op.after?.text ?? null, lock: current.lock, step: firstStep.get(op.uid + '|' + key) ?? null});
  }
  for (const h of held) {
    if (seen.has(h.kind + h.uid)) continue;
    seen.add(h.kind + h.uid);
    const c = nodes.get(h.uid).c;
    if (h.kind === 'node') others.push({...place(h.uid), key: 'Node', kept: 'kept', stageWanted: 'removed', lock: lockOf(c), step: firstStep.get(h.uid + '|Node') ?? null});
    else {
      // Today's node by reference and position, which the stage never changes (review note N2: not by its number).
      const want = out.pipelines.flatMap(p => p.components).find(d => txt(d, 'ComponentRefNo') === txt(c, 'ComponentRefNo') && txt(d, 'Position') === txt(c, 'Position'));
      others.push({...place(h.uid), key: 'Supports', kept: restraintsText(c.restraints), stageWanted: want ? restraintsText(want.restraints) : 'none',
        lock: c.values.NodeNumber.lock, step: firstStep.get(h.uid + '|Supports') ?? null});
    }
  }
  return values.concat(others);
}

/**
 * Run today's supports stage on `doc` and read it back sub-step by sub-step under the document's locks. A locked node
 * today's branch pass removes is first joined into the node it keeps (JoinDuplicates.js, Owner 20 Nov), then the stage
 * runs again on the joined document. `noJoin` (gate control only): the locked node is kept instead, as in E2b.
 */
export function runSupportsUnderLocks(doc, runStageFull, options = {}) {
  const input = withoutTransferNote(writePsi116FromUxmlV2(doc).text);
  const today = runStageFull(input);
  if (!options.noJoin && !options.joinedFrom) {
    const plan = joinPlan(doc, today.stages['branch-pass']);
    if (plan.length) {
      const join = joinDuplicates(doc, plan, {stageWins: !!options.joinStageWins});
      const again = runSupportsUnderLocks(join.uxml, runStageFull, {...options, joinedFrom: join});
      return {...again, deltas: [join.delta, ...again.deltas]};
    }
  }
  let uxml = doc;
  const deltas = [], firstStep = new Map();
  for (const id of SUPPORTS_STEPS) {
    const {taken, held} = holdBackLocked(uxml, changesFromXml(uxml, today.stages[id], id), options);
    for (const h of held) { const k = h.uid + '|' + (h.kind === 'node' ? 'Node' : 'Supports'); if (!firstStep.has(k)) firstStep.set(k, id); }
    const stage = {id: 'supports:' + id, rulesVersion: SUPPORTS_AS_CHANGES_RULES, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(taken)})};
    const step = runStage(stage, uxml, {}, {}, {inputHashes: [sha256Hex(today.stages[id])]});
    for (const c of step.refusals) { const k = c.uid + '|' + c.key; if (!firstStep.has(k)) firstStep.set(k, id); }
    uxml = step.uxml;
    deltas.push(step.delta);
  }
  const conflicts = residualConflicts(uxml, today.xmlText, firstStep, options);
  const xmlText = withTransferNote(writePsi116FromUxmlV2(uxml).text, noteFromLocks(uxml));
  return {uxml, deltas, conflicts, joined: options.joinedFrom?.joined || [], xmlText, stageXmlText: today.xmlText, rules: SUPPORTS_UNDER_LOCKS_RULES};
}

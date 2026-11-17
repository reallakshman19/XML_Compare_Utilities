/**
 * UXML plan step 6 (Owner 17 Nov 2026): the property transfer as a UXML change with locks.
 *
 * transferStage: a U2d transfer receipt (`u2.transfer-receipt` v1, XCU prototypes/u2d-cii-source)
 * applied to the UXML read from the receipt's own target file. Every receipt change becomes
 * `set` + `lock {by:'transfer', receipt, order, field}` on the matched value, so the stage's delta
 * is the receipt in UXML form and undo gives the target back. Owner D5 (13 Nov): "Transferred
 * values win" -- later stages cannot overwrite a locked value; the kernel lists the attempt.
 *
 * Material follows the branch (today's 3D_Converters rule, xml-cii-transfer-protection.js): a
 * transferred branch MaterialNumber also sets every node MaterialCode of that branch (the CII
 * writer reads node codes first) and clears a non-empty node MaterialName (it named the master's
 * material). These follow-up values are locked too, with `follows` naming the branch field.
 *
 * noteLockStage: the same locks from a TOPOFIX-TRANSFER-PROTECT note (a file the transfer already
 * wrote), keyed as today: unique Branchname, unique NodeNumber inside the branch.
 */
import {sha256Hex, UxmlRefusal} from '../UxmlV2Kernel.js';
import {parseLiteral} from '../UxmlV2Psi116Reader.js';

export const UXML_TRANSFER_RULES = 'uxml-transfer/1';
const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };
const MATERIAL_FIELD = 'Branch/MaterialNumber';

/** Receipt field ('Branch/Temperature/Temperature1', 'Node/NodeName') -> {scope, key} of a UXML value. */
export function fieldKey(field) {
  const [scope, ...rest] = String(field || '').split('/');
  if (!['Branch', 'Node'].includes(scope) || !rest.length) fail('UXML_TRANSFER_FIELD_UNSUPPORTED', {field});
  return {scope, key: rest.join('.')};
}
const textOf = value => String(value?.v ?? '');
const valueOf = (text, rule) => ({v: parseLiteral(String(text)), text: String(text), src: 'transfer', rule});
const setAndLock = (uid, key, text, lock) => [
  {op: 'set', uid, path: 'values.' + key, after: valueOf(text, lock.follows ? 'material-follows-branch' : 'u2d:' + lock.field)},
  {op: 'lock', uid, path: 'values.' + key, after: lock},
];
const lockOnly = (uid, key, lock) => [{op: 'lock', uid, path: 'values.' + key, after: lock}];

/** Node MaterialCode = branch material, non-empty node MaterialName cleared; all locked. */
function materialFollowOps(pipeline, materialText, lockBase) {
  const ops = [];
  const follows = {by: lockBase.by, receipt: lockBase.receipt, order: lockBase.order, follows: MATERIAL_FIELD};
  for (const comp of pipeline.components) {
    const code = comp.values?.MaterialCode;
    if (code) ops.push(...(textOf(code) === materialText ? lockOnly(comp.uid, 'MaterialCode', follows) : setAndLock(comp.uid, 'MaterialCode', materialText, follows)));
    const name = comp.values?.MaterialName;
    if (name && textOf(name) !== '') ops.push(...setAndLock(comp.uid, 'MaterialName', '', follows));
  }
  return ops;
}

/** The entity a receipt change names; refuses when the target does not hold the receipt's `before`. */
function targetOf(doc, change) {
  const {ref = {}, field} = change;
  const {scope, key} = fieldKey(field);
  const pipeline = doc.pipelines[ref.branchOrdinal];
  if (!pipeline || textOf(pipeline.values?.Branchname) !== String(ref.branchName))
    fail('UXML_TRANSFER_TARGET_MISMATCH', {field, branch: ref.branchName, branchOrdinal: ref.branchOrdinal});
  const entity = scope === 'Branch' ? pipeline : pipeline.components[ref.nodeOrdinal];
  if (!entity || (scope === 'Node' && textOf(entity.values?.NodeNumber) !== String(ref.nodeNumber)))
    fail('UXML_TRANSFER_TARGET_MISMATCH', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber});
  const current = entity.values?.[key];
  if (!current) fail('UXML_TRANSFER_FIELD_MISSING', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber});
  if (current.v !== parseLiteral(String(change.before ?? '')))
    fail('UXML_TRANSFER_BEFORE_MISMATCH', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber, found: current.text, receipt: change.before});
  return {pipeline, entity, key};
}

/** Checks the receipt is a successful U2d receipt for exactly this document's source file. */
function checkReceipt(doc, receipt) {
  if (receipt?.format !== 'u2.transfer-receipt' || receipt.version !== 1 || receipt.ok !== true)
    fail('UXML_TRANSFER_RECEIPT_UNSUPPORTED', {format: receipt?.format ?? null, version: receipt?.version ?? null});
  const sha = doc.sources?.[0]?.sha256;
  if (String(receipt.base?.sha256 || '').toLowerCase() !== sha)
    fail('UXML_TRANSFER_BASE_MISMATCH', {receipt: receipt.base?.sha256 ?? null, document: sha ?? null});
}

/** Stage inputs {receipt, receiptSha256}; settings {materialFollows (default true)}. */
export const transferStage = Object.freeze({
  id: 'transfer', rulesVersion: UXML_TRANSFER_RULES, reads: ['names', 'engineering'], writes: ['names', 'engineering'],
  run(doc, {receipt, receiptSha256} = {}, {materialFollows = true} = {}) {
    checkReceipt(doc, receipt);
    const ops = [];
    (receipt.changes || []).forEach((change, order) => {
      const {pipeline, entity, key} = targetOf(doc, change);
      const lock = {by: 'transfer', receipt: receiptSha256 || sha256Hex(JSON.stringify(receipt)), order, field: change.field};
      ops.push(...setAndLock(entity.uid, key, change.after, lock));
      if (materialFollows && change.field === MATERIAL_FIELD) ops.push(...materialFollowOps(pipeline, String(change.after), lock));
    });
    const diagnostics = (receipt.refused || []).map(r => ({code: r.code, ciiNode: r.ciiNode ?? null, detail: r.detail ?? ''}));
    return {ops, diagnostics};
  },
});

/** Entities a note names, keyed like today's step 10 (shared names / numbers are skipped). */
function noteTargets(doc, note) {
  const byName = new Map();
  for (const p of doc.pipelines) {
    const name = textOf(p.values?.Branchname);
    byName.set(name, byName.has(name) ? null : p);
  }
  const out = [];
  for (const [name, paths] of Object.entries(note.branches || {})) {
    const p = byName.get(name);
    if (p) for (const path of paths) out.push({pipeline: p, entity: p, field: 'Branch/' + path});
  }
  for (const [nameNumber, fields] of Object.entries(note.nodes || {})) {
    const cut = nameNumber.lastIndexOf('|');
    const p = byName.get(nameNumber.slice(0, cut));
    const hits = p ? p.components.filter(c => textOf(c.values?.NodeNumber) === nameNumber.slice(cut + 1)) : [];
    if (hits.length === 1) for (const f of fields) out.push({pipeline: p, entity: hits[0], field: 'Node/' + f});
  }
  return out;
}

/** Stage inputs {note (parsed v1 note), noteSha256}: locks what the note lists, material follows. */
export const noteLockStage = Object.freeze({
  id: 'transfer-note', rulesVersion: UXML_TRANSFER_RULES, reads: ['names', 'engineering'], writes: ['names', 'engineering'],
  run(doc, {note, noteSha256} = {}) {
    if (note?.v !== 1) fail('UXML_TRANSFER_NOTE_VERSION', {found: note?.v ?? null});
    const ops = [];
    noteTargets(doc, note).forEach(({pipeline, entity, field}, order) => {
      const {key} = fieldKey(field);
      if (!entity.values?.[key]) return; // today: a field absent in the file is not protected
      const lock = {by: 'transfer', receipt: noteSha256 || '', order, field};
      ops.push(...lockOnly(entity.uid, key, lock));
      if (field === MATERIAL_FIELD) ops.push(...materialFollowOps(pipeline, textOf(entity.values[key]), lock));
    });
    return {ops, diagnostics: []};
  },
});

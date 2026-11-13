// Apply an approved Change set to CII v14 bytes: replace only the located spans, then re-read and diff.
// All or nothing: any refusal gives {ok:false, applied:[], refusals:[...]} and no output bytes.
// Pure engine (bytes in, result out). Note: vendor/validate.mjs imports node:fs at its top for its own
// command line, so this module runs under Node; it never reads or writes files itself.
import { Refusal, RefusalList, sha256Hex, require } from '../kit/core.mjs';
import { readCii14, fieldDiff } from '../kit/cii14.mjs';
import { validate } from '../vendor/validate.mjs';
import { locate, checkSpansDisjoint } from './locate.mjs';
import { formatCiiNumber, formatCiiName, weightValue } from './format.mjs';

/** Run fn; turn a refusal (or refusal list) into entries of `list`. Other errors are bugs and are re-thrown. */
function collect(list, fn) {
  try { return fn(); } catch (e) {
    if (e instanceof Refusal) { list.add(e.code, e.where, e.detail); return undefined; }
    if (e && Array.isArray(e.refusals)) { for (const r of e.refusals) list.add(r.code, r.where, r.detail); return undefined; }
    throw e;
  }
}

/**
 * applyChangeset(bytes, changeset, options?) -> {ok, bytes?, sha256?, applied:[{changeId,start,end,oldToken,newToken}], refusals:[]}
 * Checks in order: Change set rules, base kind, checksum lock, approval, locate + old token, build, re-check.
 * options.testFault (tests only): a function (plan) -> plan run just before the bytes are built, so a test can
 * feed a deliberately bad span through the real path and prove the re-check refuses it.
 */
export async function applyChangeset(bytes, changeset, options = {}) {
  try {
    const out = await applyOrThrow(bytes, changeset, options);
    return { ok: true, ...out, refusals: [] };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, applied: [], refusals: [{ code: e.code, where: e.where, detail: e.detail }] };
    if (e && Array.isArray(e.refusals)) return { ok: false, applied: [], refusals: e.refusals };
    throw e;
  }
}

async function applyOrThrow(bytes, cs, options) {
  // 1. Change set rules (P0.1 validator, vendored).
  const rules = new RefusalList();
  for (const err of validate(cs)) rules.add('KERNEL_CHANGESET_INVALID', 'changeset', err.code + ' ' + err.msg);
  rules.throwIfAny();
  // 2. Base kind.
  require(cs.base.kind === 'cii', 'KERNEL_BASE_KIND', 'base.kind', 'this kernel edits CII files only, got ' + JSON.stringify(cs.base.kind));
  // 3. Checksum lock.
  const got = await sha256Hex(bytes);
  require(got === cs.base.sha256.toLowerCase(), 'KERNEL_BASE_SHA256_MISMATCH', 'base.sha256',
    'the Change set was made for ' + cs.base.sha256 + ', this file is ' + got);
  // Read the base (CII_* refusals from the kit reader pass through unchanged).
  const base = readCii14(bytes);
  // 4-5. Approval, locate, new value, old token. Every change is checked; any refusal refuses all.
  const list = new RefusalList();
  const plan = [];
  for (const c of cs.changes) {
    const where = c.changeId;
    const item = collect(list, () => planChange(base, c, where));
    if (item) plan.push(item);
  }
  checkSpansDisjoint(plan, list);
  checkNamesUnique(base, plan, list);
  list.throwIfAny();
  // 6. Build: replace only the spans, from the end of the file backwards.
  const built = typeof options.testFault === 'function' ? options.testFault(plan) : plan;
  const next = spliceSpans(bytes, built);
  // 7. Re-check against the plan (never against the possibly faulted copy).
  recheck(base, next, plan);
  const applied = plan.flatMap(p => p.spans.map(s => ({ changeId: p.changeId, start: s.start, end: s.end, oldToken: s.token, newToken: p.newToken })))
    .sort((a, b) => a.start - b.start);
  return { bytes: next, sha256: await sha256Hex(next), applied };
}

/** One change -> {changeId, ref, field, newToken, spans:[{start,end,token,newRaw}]}. Throws refusals. */
export function planChange(cii, c, where = c.changeId) {
  require(c.approval && c.approval.approved === true, 'KERNEL_NOT_APPROVED', where, 'change is not approved');
  const loc = locate(cii, c.target, c.field, where);
  for (const s of loc.spans) {
    require(s.token === c.oldToken, 'KERNEL_OLD_TOKEN_MISMATCH', where,
      'file has ' + JSON.stringify(s.token) + ' at bytes ' + s.start + '-' + s.end + ', Change set says ' + JSON.stringify(c.oldToken));
  }
  if (c.span !== undefined) {
    const hit = loc.spans.some(s => { const a = s.start + s.raw.indexOf(s.token); return c.span.start === a && c.span.end === a + s.token.length; });
    require(hit, 'KERNEL_SPAN_HINT_MISMATCH', where, 'span hint ' + c.span.start + '-' + c.span.end + ' is not where the old token is');
  }
  let newRaws;
  if (loc.kind === 'number') {
    const v = weightValue(c.newValue, c.approval.zeroConfirmed, where);
    newRaws = loc.spans.map(s => formatCiiNumber(v, s.token, s.end - s.start, where));
  } else {
    require(typeof c.newValue === 'string', 'KERNEL_NAME_NOT_STRING', where, 'a node name must be given as text, got ' + typeof c.newValue);
    newRaws = loc.spans.map(s => formatCiiName(c.newValue, s.end - s.start, where));
  }
  return { changeId: c.changeId, ref: c.target, field: c.field, newToken: newRaws[0].trim(),
    spans: loc.spans.map((s, i) => ({ start: s.start, end: s.end, token: s.token, newRaw: newRaws[i] })) };
}

/** A new node name must not already name a different node (XCU nodal-transfer.js rule). */
function checkNamesUnique(cii, plan, list) {
  const renamed = new Map(plan.filter(p => p.field === 'NODENAME/NAME').map(p => [p.ref.node, p.newToken]));
  if (!renamed.size) return;
  const finalName = new Map();
  for (const e of cii.elements) {
    const p = e.pointers.NODENAME;
    if (!p) continue;
    for (const side of ['from', 'to']) {
      const node = String(e[side]);
      const name = renamed.has(node) ? renamed.get(node) : cii.nodeNames[p - 1][side].token;
      if (!name) continue;
      if (!finalName.has(name)) finalName.set(name, new Set());
      finalName.get(name).add(node);
    }
  }
  for (const [node, name] of renamed) {
    const nodes = finalName.get(name);
    if (nodes && nodes.size > 1) list.add('KERNEL_NAME_IN_USE', 'node ' + node, 'name ' + JSON.stringify(name) + ' would name nodes ' + [...nodes].join(', '));
  }
}

/** New bytes: a copy with each planned span replaced, last span first. Lengths never change. */
export function spliceSpans(bytes, plan) {
  const out = new Uint8Array(bytes);
  const edits = plan.flatMap(p => p.spans).sort((a, b) => b.start - a.start);
  for (const s of edits) {
    require(s.newRaw.length === s.end - s.start, 'KERNEL_RECHECK_FAILED', 'bytes ' + s.start, 'replacement is ' + s.newRaw.length + ' characters, span is ' + (s.end - s.start));
    for (let i = 0; i < s.newRaw.length; i++) out[s.start + i] = s.newRaw.charCodeAt(i);
  }
  return out;
}

/**
 * Re-check (card step 7): the new bytes read as v14 with the same element count, sections, line count and
 * line endings; every byte outside the planned spans is identical; every differing field lies inside a planned
 * span; and re-locating each change in the new file gives the new token. Refuses KERNEL_RECHECK_FAILED.
 */
export function recheck(base, next, plan) {
  const fail = (where, detail) => require(false, 'KERNEL_RECHECK_FAILED', where, detail);
  if (next.length !== base.bytes.length) fail('bytes', 'length ' + base.bytes.length + ' -> ' + next.length);
  let cii;
  try { cii = readCii14(next); } catch (e) { if (e instanceof Refusal) fail('re-read', e.code + ' ' + e.where); throw e; }
  if (cii.counts.NUMELT !== base.counts.NUMELT) fail('NUMELT', base.counts.NUMELT + ' -> ' + cii.counts.NUMELT);
  if (JSON.stringify(cii.sectionOrder) !== JSON.stringify(base.sectionOrder)) fail('sections', 'section list changed');
  if (cii.lines.length !== base.lines.length) fail('lines', base.lines.length + ' -> ' + cii.lines.length);
  if (cii.eol !== base.eol) fail('eol', base.eol + ' -> ' + cii.eol);
  let diff;
  try { diff = fieldDiff(base, cii); } catch (e) { if (e instanceof Refusal) fail('fieldDiff', e.code + ' ' + e.where); throw e; }
  const spans = plan.flatMap(p => p.spans).sort((a, b) => a.start - b.start);
  const inside = (a, b) => spans.some(s => a >= s.start && b <= s.end);
  for (const d of diff) if (!inside(d.start, d.end)) fail(d.section + ' row ' + d.row, 'unplanned change at bytes ' + d.start + '-' + d.end + ': ' + JSON.stringify(d.before) + ' -> ' + JSON.stringify(d.after));
  let k = 0;
  for (let i = 0; i < next.length; i++) {
    while (k < spans.length && spans[k].end <= i) k++;
    if (k < spans.length && i >= spans[k].start) continue;
    if (next[i] !== base.bytes[i]) fail('byte ' + i, 'unplanned byte change');
  }
  for (const p of plan) {
    let loc;
    try { loc = locate(cii, p.ref, p.field, p.changeId); } catch (e) { if (e instanceof Refusal) fail(p.changeId, 're-locate: ' + e.code); throw e; }
    for (const s of loc.spans) if (s.token !== p.newToken) fail(p.changeId, 'new file has ' + JSON.stringify(s.token) + ', planned ' + JSON.stringify(p.newToken));
  }
  return diff;
}

// Find the exact bytes of one field, addressed by structure (element ref or node ref).
// Pure: no DOM, no fs, no network. Uses the kit reader's model (kit/cii14.mjs).
import { require } from '../kit/core.mjs';
import { rigidOf } from '../kit/cii14.mjs';

export const FIELDS = Object.freeze(['RIGID/WEIGHT', 'NODENAME/NAME']);

/**
 * locate(cii, ref, field) -> {start, end, token, raw, kind, spans:[{start,end,token,raw,element,side}]}
 * start/end/token are those of the first span. RIGID/WEIGHT always has one span.
 * NODENAME/NAME has one span per element end (FROM or TO) at that node: CAESAR II stores the name
 * in the node-name record of every element that touches the node (XCU nodal-transfer.js layout).
 */
export function locate(cii, ref, field, where = '') {
  require(FIELDS.includes(field), 'KERNEL_FIELD_UNSUPPORTED', where, 'field ' + JSON.stringify(field) + '; v1 supports ' + FIELDS.join(', '));
  if (field === 'RIGID/WEIGHT') return locateRigidWeight(cii, ref, where);
  return locateNodeName(cii, ref, where);
}

function locateRigidWeight(cii, ref, where) {
  require(ref && ref.kind === 'cii', 'KERNEL_FIELD_UNSUPPORTED', where, 'RIGID/WEIGHT needs an element ref (kind "cii")');
  const e = cii.elements[ref.elementIndex];
  require(e, 'KERNEL_TARGET_NOT_FOUND', where, 'element ' + ref.elementIndex + ' does not exist; the file has ' + cii.elements.length + ' elements');
  require(String(e.from) === ref.fromNode && String(e.to) === ref.toNode, 'KERNEL_REF_NODES_MISMATCH', where,
    'ref says ' + ref.fromNode + '->' + ref.toNode + ', element ' + e.index + ' is ' + e.from + '->' + e.to);
  const rigid = rigidOf(cii, e.index);
  require(rigid, 'KERNEL_NO_RIGID', where, 'element ' + e.index + ' (' + e.from + '->' + e.to + ') has no rigid');
  const w = rigid.weight;
  const s = { start: w.start, end: w.end, token: w.token, raw: w.raw, element: e.index, side: 'RIGID ' + rigid.pointer };
  return { start: s.start, end: s.end, token: s.token, raw: s.raw, kind: 'number', spans: [s] };
}

function locateNodeName(cii, ref, where) {
  require(ref && ref.kind === 'cii-node', 'KERNEL_FIELD_UNSUPPORTED', where, 'NODENAME/NAME needs a node ref (kind "cii-node")');
  const spans = [], missing = [];
  for (const e of cii.elements) {
    for (const side of ['from', 'to']) {
      if (String(e[side]) !== ref.node) continue;
      const p = e.pointers.NODENAME;
      if (!p) { missing.push(e.index); continue; }
      const f = cii.nodeNames[p - 1][side];
      spans.push({ start: f.start, end: f.end, token: f.token, raw: f.raw, element: e.index, side: side.toUpperCase() });
    }
  }
  require(spans.length || missing.length, 'KERNEL_TARGET_NOT_FOUND', where, 'node ' + ref.node + ' is not in the file');
  require(!missing.length, 'KERNEL_NO_NODENAME', where, 'element(s) ' + missing.join(', ') + ' at node ' + ref.node +
    ' have no node-name record; adding records is a structure change, not a value edit');
  const s = spans[0];
  return { start: s.start, end: s.end, token: s.token, raw: s.raw, kind: 'name', spans };
}

/** Refuses KERNEL_SPAN_SHARED when two changes land on the same (or overlapping) bytes. plan: [{changeId, spans}] */
export function checkSpansDisjoint(plan, list) {
  const all = plan.flatMap(p => p.spans.map(s => ({ id: p.changeId, start: s.start, end: s.end })))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < all.length; i++) {
    if (all[i].start < all[i - 1].end) {
      const msg = 'changes ' + all[i - 1].id + ' and ' + all[i].id + ' both land on bytes ' + all[i].start + '-' + all[i - 1].end;
      if (list) list.add('KERNEL_SPAN_SHARED', all[i].id, msg); else require(false, 'KERNEL_SPAN_SHARED', all[i].id, msg);
    }
  }
}

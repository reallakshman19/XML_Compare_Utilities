// Adapted from p11-cii-map/tests/fixture-tools.mjs at 8409590f.
import { readCii14 } from '../kit/cii14.mjs';
import { sha256Hex } from '../kit/core.mjs';
import { validate } from '../vendor/validate.mjs';
import assert from 'node:assert/strict';

export function f13(v) {
  const [m, e] = Number(v).toExponential(6).toUpperCase().split('E');
  const s = m + 'E' + (e[0] === '-' ? '-' : '+') + e.replace(/^[+-]/, '').padStart(2, '0');
  if (s.length > 13) throw Error('does not fit: ' + v);
  return s.padStart(13);
}
export function replaceSpan(bytes, field, text) {
  assert.equal(text.length, field.end - field.start);
  const result = new Uint8Array(bytes);
  result.set(new TextEncoder().encode(text), field.start);
  return result;
}
export function makeS1M(bytes) {
  const c = readCii14(bytes), w = c.rigids[0].weight, n = c.nodeNames[0].from;
  let out = replaceSpan(bytes, w, f13(Math.round(w.value * 1.1 * 1000) / 1000));
  for (const i of [3, 7]) {
    const t = c.elements[i].fields.T1;
    out = replaceSpan(out, t, f13(t.value + 25));
  }
  return replaceSpan(out, n, 'P33-RENAMED'.padEnd(n.end - n.start));
}
export const ref = e => ({ kind: 'cii', elementIndex: e.index, fromNode: String(e.from), toNode: String(e.to) });
// Explicit handcrafted pairs, not a geometry matcher or P1.3 implementation.
export async function makeMap(a, b, { sourceName = 'reference.cii', targetName = 'target.cii', selections } = {}) {
  const ac = readCii14(a), bc = readCii14(b);
  const at = '2026-11-12T19:00:00Z';
  const pairs = (selections ?? ac.elements.map(e => [e.index, e.index, 'approved'])).map(([i,j,status], k) => ({
    pairId: `pair-${k}`, source: ref(ac.elements[i]), target: ref(bc.elements[j]), status,
    evidence: { rule: 'manual', detail: 'Hand-built test pair' },
    ...(status === 'approved' ? { approvedBy: 'test.engineer', approvedAt: at } : {})
  }));
  const map = { format: 'topofix.map', version: 1, createdAt: at,
    source: { kind: 'cii', fileName: sourceName, sha256: await sha256Hex(a) },
    target: { kind: 'cii', fileName: targetName, sha256: await sha256Hex(b) }, method: 'manual', pairs };
  assert.deepEqual(validate(map), []);
  return map;
}

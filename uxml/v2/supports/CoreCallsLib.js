// Shared helpers for the recorded restraint-core calls (format core-calls/1, see record.mjs).
// A node crosses the core boundary as a PlainElement: {__el: localName, attrs: {}, kids: [PlainElement | {__text}]}.
// A Document crosses as PLAIN_DOCUMENT ({__doc: true}).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PLAIN_DOCUMENT } from './PlainDom.js';

export { PLAIN_DOCUMENT };

/** Resolve {__blob} references (deep). */
export function unblob(v, blobs) {
  if (Array.isArray(v)) return v.map((x) => unblob(x, blobs));
  if (v && typeof v === 'object') {
    if (typeof v.__blob === 'string') return unblob(blobs[v.__blob], blobs);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unblob(x, blobs)]));
  }
  return v;
}

/** Recorded JSON -> live value: undefined, Map, Set, numbers; PlainElements stay plain. */
export function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (!v || typeof v !== 'object') return v;
  if (v.__undef) return undefined;
  if ('__num' in v) return Number(v.__num);
  if (v.__map) return new Map(v.__map.map(([k, x]) => [revive(k), revive(x)]));
  if (v.__set) return new Set(v.__set.map(revive));
  if (v.__fn) return () => { throw new Error('CORE_REPLAY_RECORDED_FUNCTION_CALLED'); };
  if (v.__el || v.__text !== undefined || v.__doc) return structuredClone(v);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
}

/** Live value -> recorded JSON (no blobs). PlainElements and PLAIN_DOCUMENT pass through. */
export function plain(v, seen = new WeakSet()) {
  if (v === undefined) return { __undef: true };
  if (typeof v === 'function') return { __fn: true };
  if (v === null || typeof v !== 'object') return typeof v === 'number' && !Number.isFinite(v) ? { __num: String(v) } : v;
  if (seen.has(v)) return { __cycle: true };
  seen.add(v);
  try {
    if (v.nodeType === 9) return { __doc: true };
    if (v.nodeType === 1) {
      const kids = [];
      for (const c of v.childNodes) {
        if (c.nodeType === 1) kids.push(plain(c, seen));
        else if ((c.nodeType === 3 || c.nodeType === 4) && c.nodeValue.trim()) kids.push({ __text: c.nodeValue });
      }
      return { __el: v.localName, attrs: Object.fromEntries([...v.attributes].map((a) => [a.name, a.value])), kids };
    }
    if (v instanceof Map) return { __map: [...v].map(([k, x]) => [plain(k, seen), plain(x, seen)]) };
    if (v instanceof Set) return { __set: [...v].map((x) => plain(x, seen)) };
    if (Array.isArray(v)) return v.map((x) => plain(x, seen));
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x, seen)]));
  } finally { seen.delete(v); }
}

/** JSON with object keys sorted (array order kept), so key order never matters. */
export function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
export const callKey = (name, plainArgs) => createHash('sha256').update(name + '\u0000' + canonical(plainArgs)).digest('hex');

/** Load recordings: [{bench, seq, name, args, argsAfter, result, events, error}] with blobs resolved. */
export function loadCalls(paths) {
  const out = [];
  for (const p of paths) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw.format !== 'core-calls/1') throw new Error('CORE_CALLS_FORMAT_UNKNOWN ' + p);
    const bench = raw.bench || p;
    for (const c of raw.calls) out.push({ bench, ...unblob(c, raw.blobs) });
  }
  return out;
}

/** Copy a recorded PlainElement's content into a live PlainElement in place (the caller keeps its object). */
export function assignPlain(target, source) {
  if (!target || typeof target !== 'object' || !source || typeof source !== 'object') return;
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, structuredClone(source));
}

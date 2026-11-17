// Replay stub of today's restraint core (buddy batches 2 and 3 run on it until batch 1 lands).
//   const core = createReplayCore(['G30.core-calls.json', ...]);  core.restraintEntriesFromSupportKind(kind, attrs, plainNode, cfg)
// Each function answers exactly as today's code answered the same call on the public models:
// the recorded result, the recorded callback events, and the recorded in-place changes to its
// arguments (applied to the caller's own objects). A call that was never recorded throws
// CORE_REPLAY_MISS: it means the caller's inputs differ from today's.
import { loadCalls, plain, revive, callKey, assignPlain, canonical } from './CoreCallsLib.js';

function applyAfter(target, after) {
  const live = revive(after);
  if (Array.isArray(target)) { target.length = 0; target.push(...live); return; }
  if (target instanceof Map) { target.clear(); for (const [k, v] of live) target.set(k, v); return; }
  if (target instanceof Set) { target.clear(); for (const v of live) target.add(v); return; }
  assignPlain(target, live);
}

/** First path where two plain values differ ('' when equal); arrays by index, objects by sorted key. */
export function firstDifference(a, b, path = 'args') {
  if (canonical(a) === canonical(b)) return '';
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) { const d = firstDifference(a[i], b[i], `${path}[${i}]`); if (d) return d; }
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) { const d = firstDifference(a[k], b[k], `${path}.${k}`); if (d) return d; }
  }
  return `${path} (yours ${JSON.stringify(a)?.slice(0, 80)}, today ${JSON.stringify(b)?.slice(0, 80)})`;
}
const sharedPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return i; };
/** The recorded call of this function whose canonical arguments share the longest prefix with the caller's. */
function nearestCall(calls, plainArgs) {
  const mine = canonical(plainArgs);
  let best = null;
  for (const c of calls) {
    const score = sharedPrefix(mine, canonical(c.args));
    if (!best || score > best.score) best = { c, score };
  }
  return best && { bench: best.c.bench, seq: best.c.seq, firstDifference: firstDifference(plainArgs, best.c.args) };
}

export function createReplayCore(paths) {
  const byKey = new Map();
  const names = new Set();
  const recorded = new Map();
  let conflicts = 0;
  for (const c of loadCalls(paths)) {
    names.add(c.name);
    recorded.set(c.name, [...(recorded.get(c.name) || []), c]);
    const key = callKey(c.name, c.args);
    const list = byKey.get(key) || [];
    const outcome = JSON.stringify([c.result, c.argsAfter, c.events, c.error]);
    if (list.length && !list.some((x) => x.outcome === outcome)) conflicts += 1;
    if (!list.some((x) => x.outcome === outcome)) list.push({ ...c, outcome });
    byKey.set(key, list);
  }
  const used = new Map();
  const core = { __replay: { calls: byKey.size, conflicts, misses: [] } };
  for (const name of names) {
    core[name] = (...args) => {
      const key = callKey(name, args.map((a) => plain(a)));
      const list = byKey.get(key);
      if (!list) {
        core.__replay.misses.push(name);
        const nearest = nearestCall(recorded.get(name) || [], args.map((a) => plain(a)));
        const where = nearest ? ` (nearest recorded call: ${nearest.bench} #${nearest.seq}; first difference at ${nearest.firstDifference})` : '';
        throw Object.assign(new Error('CORE_REPLAY_MISS ' + name + where), { code: 'CORE_REPLAY_MISS', name, nearest });
      }
      const n = used.get(key) || 0;
      used.set(key, n + 1);
      const rec = list[Math.min(n, list.length - 1)];
      for (const ev of rec.events || []) args[ev.arg]?.(...revive(ev.args));
      for (const [i, after] of Object.entries(rec.argsAfter || {})) applyAfter(args[Number(i)], after);
      if (rec.error) throw new Error(rec.error);
      return revive(rec.result);
    };
  }
  return core;
}

// Gate for buddy batch 1 (restraint core port): every recorded call must give today's answer.
//   node scripts/uxml-v2-core-calls-gate.mjs <impl> <a.core-calls.json> [...] [--json report.json]
//   <impl> = path to an ES module exporting the core functions (they take PlainElements), or
//            "today"  (with --today <3D_Converters checkout> --jsdom <folder with node_modules/jsdom>): today's live core, PlainElements rebuilt as DOM elements (proves the recordings are complete),
//            "refuse" : every function throws (the gate must fail it),
//            "replay" : the replay stub itself.
// Per call it checks: the result, every argument after the call, and the callback events.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { loadCalls, plain, revive, canonical } from '../uxml/v2/supports/CoreCallsLib.js';
import { createReplayCore } from '../uxml/v2/supports/CoreReplay.js';

const argv = process.argv.slice(2);
const jsonAt = argv.indexOf('--json');
const reportPath = jsonAt >= 0 ? argv.splice(jsonAt, 2)[1] : null;
const opt = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv.splice(i, 2)[1] : null; };
const TODAY = opt('--today');
const JSDOM_HOME = opt('--jsdom');
// --only a,b: check only the recorded calls of these functions (e.g. one batch's helpers inside the sub-step recordings).
const ONLY = opt('--only')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
const [impl, ...paths] = argv;
if (impl === 'today' && (!TODAY || !JSDOM_HOME)) throw new Error('today mode needs --today <3D_Converters checkout> --jsdom <folder>');
const TODAY_FILES = ['v045/converters/xml-cii2019-core/support-mapping.js', 'v045/converters/xml-cii2019-core/support-mapping-config.js',
  'v045/converters/xml-cii2019-core/support-kind-precedence.js', 'v045/converters/xml-cii2019-core/restraint-type-mutation.js',
  'support/SupportKindResolver.js'];

let core, toDom = (v) => v, fromDom = (v) => plain(v);
if (impl === 'refuse') {
  core = new Proxy({}, { get: (t, k) => () => { throw new Error('REFUSED ' + String(k)); } });
} else if (impl === 'replay') {
  core = createReplayCore(paths);
} else if (impl === 'today') {
  const { JSDOM } = createRequire(JSDOM_HOME + '/package.json')('jsdom');
  const w = new JSDOM('<?xml version="1.0"?><PIPINGMODEL/>', { contentType: 'application/xml' }).window;
  Object.assign(globalThis, { DOMParser: w.DOMParser, XMLSerializer: w.XMLSerializer, Node: w.Node });
  const doc = w.document;
  const build = (p) => {
    const el = doc.createElement(p.__el);
    for (const [k, v] of Object.entries(p.attrs || {})) el.setAttribute(k, v);
    for (const kid of p.kids || []) el.appendChild(kid.__el ? build(kid) : doc.createTextNode(kid.__text));
    return el;
  };
  const deep = (v) => {
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === 'object' && !(v instanceof Map) && !(v instanceof Set)) {
      if (v.__doc) return doc;
      if (v.__el) { const el = build(v); doc.documentElement.appendChild(el); return el; }
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]));
    }
    return v;
  };
  toDom = deep;
  core = {};
  for (const f of TODAY_FILES) Object.assign(core, await import(pathToFileURL(`${TODAY}/${f}`).href));
} else {
  core = await import(pathToFileURL(impl).href);
}

const calls = loadCalls(paths).filter((c) => !ONLY || ONLY.includes(c.name));
const per = {};
const fails = [];
for (const c of calls) {
  const s = (per[c.name] ??= { calls: 0, pass: 0, fail: 0 });
  s.calls += 1;
  const events = [];
  const args = toDom(revive(c.args)).map((a, i) => (c.args[i]?.__fn ? (...x) => { events.push({ arg: i, args: x.map((y) => plain(y)) }); } : a));
  let result, error;
  try {
    if (typeof core[c.name] !== 'function') throw new Error('MISSING_FUNCTION ' + c.name);
    result = core[c.name](...args);
  } catch (e) { error = String(e?.message || e); }
  const problems = [];
  if ((error ?? null) !== (c.error ?? null)) problems.push({ what: 'error', want: c.error ?? null, got: error ?? null });
  if (!error && canonical(fromDom(result)) !== canonical(c.result)) problems.push({ what: 'result' });
  c.args.forEach((before, i) => {
    if (before?.__fn || before?.__doc) return;
    const want = c.argsAfter?.[i] ?? before;
    if (canonical(fromDom(args[i])) !== canonical(want)) problems.push({ what: 'arg ' + i + ' after call' });
  });
  if (canonical(events) !== canonical(c.events || [])) problems.push({ what: 'callback events' });
  if (problems.length) { s.fail += 1; if (fails.length < 50) fails.push({ bench: c.bench, seq: c.seq, name: c.name, problems }); } else s.pass += 1;
}
const total = Object.values(per).reduce((a, s) => ({ calls: a.calls + s.calls, fail: a.fail + s.fail }), { calls: 0, fail: 0 });
const report = { impl, files: paths.length, ...total, verdict: total.calls > 0 && total.fail === 0 ? 'PASS' : 'FAIL', perFunction: per, firstFails: fails.slice(0, 10) };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ ...report, firstFails: fails }, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 3000));
process.exitCode = report.verdict === 'PASS' ? 0 : 1;

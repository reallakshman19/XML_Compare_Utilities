// Gate for buddy batch 1 (restraint core port): every recorded call must give today's answer.
//   node scripts/uxml-v2-core-calls-gate.mjs <impl> <a.core-calls.json> [...] [--json report.json]
//   <impl> = path to an ES module exporting the core functions (they take PlainElements), or
//            "today"  (with --today <3D_Converters checkout> --jsdom <folder with node_modules/jsdom>): today's live core, PlainElements rebuilt as DOM elements (proves the recordings are complete),
//            "refuse" : every function throws (the gate must fail it),
//            "replay" : the replay stub itself.
// Per call it checks: the result, every argument after the call, and the callback events.
import fs from 'node:fs';
import path from 'node:path';
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
// --except a,b: skip these functions' calls (e.g. xmlCiiAncestorBranchName, which reads the DOM parent chain).
const EXCEPT = opt('--except')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
// --inject-core: functions that call the core (config parser, ledger, closure helpers) get, as their LAST argument
// after the recorded arguments padded to that function's largest recorded count, a replay of the OTHER groups
// recorded for the same models (never their own group's answers).
// --inject-core=a,b limits it to the functions that take the core (others, such as toFiniteNumber, get none).
const injectAt = argv.findIndex((x) => x === '--inject-core' || x.startsWith('--inject-core='));
const INJECT_ARG = injectAt >= 0 ? argv.splice(injectAt, 1)[0] : null;
const INJECT = INJECT_ARG !== null;
const INJECT_ONLY = INJECT_ARG?.includes('=') ? INJECT_ARG.split('=')[1].split(',').map((x) => x.trim()).filter(Boolean) : null;
const injects = (name) => INJECT && (!INJECT_ONLY || INJECT_ONLY.includes(name));
const [impl, ...paths] = argv;
if (impl === 'today' && (!TODAY || !JSDOM_HOME)) throw new Error('today mode needs --today <3D_Converters checkout> --jsdom <folder>');
const TODAY_FILES = ['v045/converters/xml-cii2019-core/support-mapping.js', 'v045/converters/xml-cii2019-core/support-mapping-config.js',
  'v045/converters/xml-cii2019-core/support-kind-precedence.js', 'v045/converters/xml-cii2019-core/restraint-type-mutation.js',
  'support/SupportKindResolver.js',
  // Step 4 engineering group: the resolvers that today's branch pass calls.
  'v045/converters/xml-cii2019-core/regex-line-key.js', 'v045/converters/xml-cii2019-core/linelist-mapping.js',
  'v045/converters/xml-cii2019-core/piping-class-resolver.js', 'v045/converters/xml-cii2019-core/branch-process-resolver.js',
  'v045/converters/xml-cii2019-core/piping-class-material-code-resolver.js', 'v045/converters/xml-cii2019-core/weight-match-model.js',
  'v045/converters/xml-cii2019-core/weight-valve-hints.js', 'v045/converters/xml-cii2019-core/piping-class-source-resolver.js',
  'converters/xml-cii2019-core/line-density-resolver.js', 'converters/xml-cii2019-core/nps-bore-resolver.js',
  'converters/xml-cii2019-core/dtxr-rating-resolver.js', 'converters/xml-cii2019-core/service-process-fallback.js'];

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

const calls = loadCalls(paths).filter((c) => (!ONLY || ONLY.includes(c.name)) && !EXCEPT.includes(c.name));
const arity = {};
for (const c of calls) arity[c.name] = Math.max(arity[c.name] || 0, c.args.length);
// One replay per model over the recording files of the other groups (same folder, <BENCH>.<group>-calls.json).
const injected = new Map();
const headers = INJECT ? paths.map((p) => { const r = JSON.parse(fs.readFileSync(p, 'utf8')); return { p, bench: r.bench, group: r.group }; }) : [];
function injectedCoreFor(c) {
  const head = headers.find((h) => h.bench === c.bench || h.p === c.bench) ?? headers[0];
  const file = head.p;
  if (!injected.has(c.bench)) {
    const own = head.group;
    const others = ['core', 'ledger', 'config', 'substep'].filter((g) => g !== own)
      .map((g) => path.join(path.dirname(file), `${c.bench}.${g}-calls.json`)).filter((p) => fs.existsSync(p));
    injected.set(c.bench, createReplayCore(others));
  }
  return injected.get(c.bench);
}
const per = {};
const fails = [];
for (const c of calls) {
  const s = (per[c.name] ??= { calls: 0, pass: 0, fail: 0 });
  s.calls += 1;
  const events = [];
  const recorded = toDom(revive(c.args)).map((a, i) => (c.args[i]?.__fn ? (...x) => { events.push({ arg: i, args: x.map((y) => plain(y)) }); } : a));
  const args = injects(c.name) ? [...recorded, ...Array(arity[c.name] - recorded.length).fill(undefined), injectedCoreFor(c)] : recorded;
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

#!/usr/bin/env node
/**
 * Gate for the step-10 gasket drop as a UXML stage (end-to-end plan E1, Owner 19 Nov 2026).
 *
 * For each benchmark: read the source into UXML, run gasketDropStage, write the XML, and compare it value by value
 * with today's own XML after the gasket drop (fixtures/uxml-v2-supports/oracle/<BENCH>/xml/engineering-pass-start.xml,
 * recorded from today's live step-10 chain). Both files are read with the UXML reader; branch values, node values and
 * restraint values must be equal, in order. The removals must be exactly the source's GASK nodes.
 *
 *   node scripts/uxml-v2-gasket-gate.mjs [--mode stage|identity|one-too-many]
 * identity (no drop) and one-too-many (removes one more node) are wrong stages: they must FAIL on every model with
 * gaskets (identity) or on every model (one-too-many). Exit 0 = PASS on every model, 1 = some FAIL.
 */
import {readFileSync} from 'node:fs';
import {BENCH_SOURCES} from './uxml-v2-benches.mjs';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {gasketDropStage, step10Document} from '../uxml/v2/topology/GasketDropStage.js';

const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'stage';
const read = text => readPsi116V2(text, {fileSha256: sha256Hex(text)});
const valuesOf = e => Object.fromEntries(Object.entries(e.values || {}).map(([k, v]) => [k, v.v]));

/** The document as plain rows: one per branch, node and restraint, values only (no uids, hashes or text). */
function rows(doc) {
  const out = [];
  for (const p of doc.pipelines) {
    out.push(['branch', valuesOf(p)]);
    for (const c of p.components) {
      out.push(['node', valuesOf(c)]);
      for (const r of c.restraints || []) out.push(['restraint', valuesOf(r)]);
    }
  }
  return out;
}

/** First difference between two row lists, or null. */
function firstDifference(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return {row: i, ours: a[i] ?? null, today: b[i] ?? null};
  }
  return null;
}

/** The written XML for the chosen mode, and the uids removed. */
function runMode(text) {
  if (mode === 'stage') return step10Document(text);
  const source = read(text);
  if (mode === 'identity') return {source, xmlText: text, removed: []};
  if (mode !== 'one-too-many') throw new Error('unknown --mode ' + mode);
  const wrong = {...gasketDropStage, run: (doc, i, s) => {
    const r = gasketDropStage.run(doc, i, s);
    const gone = new Set(r.ops.map(o => o.uid));
    const extra = doc.pipelines.flatMap(p => p.components).find(c => !gone.has(c.uid));
    return {...r, ops: [...r.ops, {op: 'remove', uid: extra.uid, rule: 'wrong'}]};
  }};
  const step = runStage(wrong, source, {}, {drop: true});
  return {source, xmlText: writePsi116FromUxmlV2(step.uxml).text, removed: step.delta.ops.map(o => ({uid: o.uid}))};
}

let failed = 0;
const seen = new Set();
for (const [bench, [xmlPath]] of Object.entries(BENCH_SOURCES)) {
  if (seen.has(xmlPath)) continue; // G30-NOJSON and G30-CUSTOM share G30's XML
  seen.add(xmlPath);
  const text = readFileSync(xmlPath, 'utf8');
  const today = readFileSync(`fixtures/uxml-v2-supports/oracle/${bench}/xml/engineering-pass-start.xml`, 'utf8');
  const ours = runMode(text);
  const gaskets = ours.source.pipelines.flatMap(p => p.components)
    .filter(c => String(c.values.ComponentType?.v ?? '').trim().toUpperCase() === 'GASK').map(c => c.uid);
  const removedOk = JSON.stringify(ours.removed.map(r => r.uid)) === JSON.stringify(gaskets);
  const diff = firstDifference(rows(read(ours.xmlText)), rows(read(today)));
  const ok = removedOk && !diff;
  if (!ok) failed += 1;
  const nodesToday = read(today).pipelines.reduce((n, p) => n + p.components.length, 0);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${bench.padEnd(12)} removed ${String(ours.removed.length).padStart(3)} (GASK in source ${gaskets.length})`
    + ` nodes after ${nodesToday} | values ${diff ? 'differ at row ' + diff.row + ': ' + JSON.stringify(diff).slice(0, 300) : 'equal'}`);
}
console.log(failed ? `FAIL ${failed} model(s) (mode ${mode})` : `PASS every model (mode ${mode})`);
process.exit(failed ? 1 : 0);

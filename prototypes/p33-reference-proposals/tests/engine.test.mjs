import test from 'node:test';
import assert from 'node:assert/strict';
import { readBenchmark } from '../kit/node.mjs';
import { readCii14 } from '../kit/cii14.mjs';
import { validate } from '../vendor/validate.mjs';
import { proposeFromReference, checkChangeset } from '../engine/propose.mjs';
import { makeMap, makeS1M, replaceSpan, f13 } from './fixture-tools.mjs';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { bytes: s1 } = await readBenchmark('X-S1');
const s1m = makeS1M(s1);
const { bytes: t } = await readBenchmark('X-T');
const { bytes: texp } = await readBenchmark('X-TEXP');
const s = readCii14(s1), sm = readCii14(s1m), i = s.rigids[0].element;
const map = await makeMap(s1m, s1, { sourceName: 'X-S1M.cii', targetName: 'S1.CII' });
const result = () => proposeFromReference(s1m, s1, map);
function refused(r, code) {
  assert.equal(r.ok, false); assert.equal(r.refusals[0].code, code);
  for (const key of ['changeset', 'bytes', 'rows', 'unchanged', 'notComparable']) assert.equal(r[key], undefined);
}

test('T1 exactly one rigid-weight proposal from X-S1M to X-S1', async () => {
  const r = await result(); assert.equal(r.ok, true); assert.equal(r.changeset.changes.length, 1);
  const c = r.changeset.changes[0];
  assert.deepEqual(c.target, map.pairs[i].target); assert.equal(c.field, 'RIGID/WEIGHT');
  assert.equal(c.oldToken, s.rigids[0].weight.token); assert.equal(c.newValue, sm.rigids[0].weight.value);
  assert.equal(c.evidence.source, 'reference-cii'); assert.equal(c.evidence.pairId, map.pairs[i].pairId);
  assert.equal(r.changeset.base.sha256, map.target.sha256); assert.equal(r.changeset.base.fileName, 'S1.CII');
});
test('T2 every proposal is unapproved and passes the shared validator', async () => {
  const r = await result(); assert.equal(r.ok, true); assert.ok(r.changeset.changes.length);
  for (const c of r.changeset.changes) assert.equal(c.approval.approved, false);
  assert.deepEqual(validate(r.changeset), []);
});
test('T3 wrong map hashes refuse the entire set', async () => {
  const wrong = await makeMap(t, texp);
  refused(await proposeFromReference(s1, s1m, wrong), 'PROPOSE_MAP_FILE_MISMATCH');
  // Independently exercise each side of the hash lock.
  refused(await proposeFromReference(s1, s1, map), 'PROPOSE_MAP_FILE_MISMATCH');
  refused(await proposeFromReference(s1m, s1m, map), 'PROPOSE_MAP_FILE_MISMATCH');
});
test('T4 candidate and rejected rigid pairs never make proposals', async () => {
  for (const status of ['candidate', 'rejected']) {
    const m = await makeMap(s1m, s1, { selections: [[i,i,status]] });
    const r = await proposeFromReference(s1m,s1,m);
    assert.equal(r.ok,true); assert.equal(r.changeset.changes.length,0);
    assert.equal(r.review.length,1); assert.equal(r.review[0].status,status);
    assert.deepEqual(validate(r.changeset), []);
  }
  const m = await makeMap(s1m,s1,{ selections: [[i,i,'candidate'],[i,i,'candidate']] });
  const r = await proposeFromReference(s1m,s1,m);
  assert.equal(r.changeset.changes.length,0); assert.equal(r.review.length,2);
});
test('T5 X-T self comparison: all 124 rigid pairs unchanged', async () => {
  const m = await makeMap(t,t); const r = await proposeFromReference(t,t,m);
  assert.equal(r.ok,true); assert.equal(r.changeset.changes.length,0); assert.equal(r.unchanged.length,124);
  assert.equal(new Set(r.unchanged.map(x=>x.pairId)).size,124); assert.equal(r.notComparable.length,0);
  assert.deepEqual(validate(r.changeset), []);
});
test('one-sided rigid pairs are not comparable in both directions', async () => {
  const j = s.elements.find(e=>!e.pointers.RIGID).index;
  for (const [a,b] of [[i,j],[j,i]]) {
    const m = await makeMap(s1,s1,{selections:[[a,b,'approved']]});
    const r = await proposeFromReference(s1,s1,m);
    assert.equal(r.ok,true); assert.equal(r.changeset.changes.length,0); assert.equal(r.notComparable.length,1);
    assert.equal(r.notComparable[0].reason,a===i?'Target has no rigid':'Reference has no rigid');
  }
});
test('a zero reference weight is a review row, never a false R9 confirmation', async () => {
  const zero = replaceSpan(s1,s.rigids[0].weight,f13(0));
  const m = await makeMap(zero,s1);
  const r = await proposeFromReference(zero,s1,m);
  assert.equal(r.ok,true); assert.equal(r.changeset.changes.length,0); assert.equal(r.review.length,1);
  assert.match(r.review[0].reason,/R9/); assert.deepEqual(validate(r.changeset),[]);
});
test('PROPOSE_REF_MISMATCH for structurally stale approved refs, even with matching hashes', async () => {
  const m = structuredClone(map); m.pairs[i].target.fromNode = '999999';
  assert.deepEqual(validate(m), []);
  refused(await proposeFromReference(s1m,s1,m),'PROPOSE_REF_MISMATCH');
});
test('PROPOSE_MAP_INVALID for non-map document; PROPOSE_FIELD_NOT_ENABLED for unsupported field', async () => {
  const validChangeset = (await result()).changeset;
  refused(await proposeFromReference(s1m,s1,validChangeset),'PROPOSE_MAP_INVALID');
  refused(await proposeFromReference(s1m,s1,map,{fields:['ELEMENT/T1']}),'PROPOSE_FIELD_NOT_ENABLED');
});
test('PROPOSE_CHANGESET_INVALID output guard refuses a duplicate change', async () => {
  const doc = structuredClone((await result()).changeset);
  doc.changes.push({...doc.changes[0], changeId: 'second'});
  assert.throws(()=>checkChangeset(doc), {code:'PROPOSE_CHANGESET_INVALID'});
});
test('unit basis mismatch is not comparable, never a numeric transfer', async () => {
  const unit = s.sections.get('UNITS')[8];
  const changed = replaceSpan(s1,{start:unit.start,end:unit.end},'  Lb.'.padEnd(unit.end-unit.start));
  const m = await makeMap(s1m,changed);
  const r = await proposeFromReference(s1m,changed,m);
  assert.equal(r.ok,true); assert.equal(r.changeset.changes.length,0); assert.equal(r.notComparable.length,1);
  assert.match(r.notComparable[0].reason,/unit basis/);
});
test('CII_VERSION_UNSUPPORTED is passed through without output', async () => {
  const {bytes:v11}=await readBenchmark('X-SRC');
  const {sha256Hex}=await import('../kit/core.mjs');
  const m=structuredClone(map); m.source.sha256=await sha256Hex(v11);
  assert.deepEqual(validate(m),[]);
  refused(await proposeFromReference(v11,s1,m),'CII_VERSION_UNSUPPORTED');
});
test('vendor validator is byte-identical to the shared validator in the checkout', () => {
  const upstream=new URL('../../../shared/topofix-formats/validate.mjs',import.meta.url);
  assert.deepEqual(readFileSync(new URL('../vendor/validate.mjs',import.meta.url)),readFileSync(upstream));
});
test('CLI writes JSON only; input bytes and directory contents prove no CII/XML output', async () => {
  const dir = mkdtempSync(join(tmpdir(),'p33-test-'));
  try {
    const a=join(dir,'reference.cii'), b=join(dir,'target.cii'), m=join(dir,'map.json'), out=join(dir,'out.json');
    writeFileSync(a,s1m); writeFileSync(b,s1); writeFileSync(m,JSON.stringify(map));
    const cli=fileURLToPath(new URL('../cli.mjs',import.meta.url));
    const run=(o)=>spawnSync(process.execPath,[cli,'propose',a,b,m,o],{encoding:'utf8'});
    for (const name of ['bad.cii','bad.xml']) {
      const res=run(join(dir,name)); assert.equal(res.status,1); refused(JSON.parse(res.stdout),'PROPOSE_OUTPUT_NOT_JSON');
    }
    const badMap=structuredClone(map); badMap.source.sha256='0'.repeat(64);
    assert.deepEqual(validate(badMap),[]); writeFileSync(m,JSON.stringify(badMap));
    const bad=run(out); assert.equal(bad.status,1); refused(JSON.parse(bad.stdout),'PROPOSE_MAP_FILE_MISMATCH');
    assert.ok(!readdirSync(dir).includes('out.json')); writeFileSync(m,JSON.stringify(map));
    const res=run(out); assert.equal(res.status,0,res.stderr); assert.deepEqual(validate(JSON.parse(readFileSync(out,'utf8'))),[]);
    const again=run(out); assert.equal(again.status,1); refused(JSON.parse(again.stdout),'PROPOSE_OUTPUT_FAILED');
    assert.deepEqual(readdirSync(dir).sort(),['map.json','out.json','reference.cii','target.cii']);
    assert.deepEqual(readFileSync(a),Buffer.from(s1m)); assert.deepEqual(readFileSync(b),Buffer.from(s1));
    assert.equal(readFileSync(m,'utf8'),JSON.stringify(map));
    // Also run the real upstream validator as a separate process in the checkout.
    const shared=fileURLToPath(new URL('../../../shared/topofix-formats/validate.mjs',import.meta.url));
    const v=spawnSync(process.execPath,[shared,out],{encoding:'utf8'}); assert.equal(v.status,0,v.stderr); assert.equal(v.stdout.trim(),'OK');
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

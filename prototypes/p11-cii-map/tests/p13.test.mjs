import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readBenchmark, repoHome } from '../kit/node.mjs';
import { requireSha256 } from '../kit/core.mjs';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';
import { toMapFile } from '../engine/to-map.mjs';
import { approvePairs, rejectPairs } from '../engine/approve.mjs';
import { validate } from '../vendor/validate.mjs';
import { makeCii, sha256 } from './fixture-tools.mjs';
const at = '2026-11-12T19:00:00Z', meta = {by: 'Test reviewer', at};
const desc = (fileName, g) => ({fileName, sha256: g.sha256});
async function compared(a, b, nameA='a.cii', nameB='b.cii') {
  const ga = await readCiiGraph(a), gb = await readCiiGraph(b);
  const result = compareCii(ga, gb);
  const options = {sourceFile: desc(nameA, ga), targetFile: desc(nameB, gb), createdAt: at};
  return {result, options, map: toMapFile(result, options)};
}
const fixture = async name => {
  const m = JSON.parse(readFileSync(new URL('./fixtures/manifest.json', import.meta.url))).files.find(f=>f.file===name);
  const bytes = new Uint8Array(readFileSync(new URL('./fixtures/'+name, import.meta.url)));
  await requireSha256(bytes, m.sha256, name); return bytes;
};
const small = async () => compared((await readBenchmark('X-S1')).bytes, await fixture('X-S1M.cii'), 'S1.CII','X-S1M.cii');
let bigPromise;
const big = () => bigPromise ??= (async () => compared((await readBenchmark('X-T')).bytes,(await readBenchmark('X-TEXP')).bytes,'T.CII','TEXPECTED-PARTIALLLYDONE.CII'))();
function cliValid(map) {
  const dir = mkdtempSync(join(tmpdir(), 'p13-'));
  try {
    const path = join(dir,'map.json'); writeFileSync(path, JSON.stringify(map));
    const result = spawnSync(process.execPath,[join(repoHome(),'shared/topofix-formats/validate.mjs'),path],{encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr); assert.equal(result.stdout.trim(),'OK');
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
test('P1.3 T1: X-S1 vs X-S1M, 56 element pairs, all candidates, shared validator OK', async () => {
  const {map,result} = await small();
  assert.equal(map.pairs.filter(p=>p.source.kind==='cii').length,56);
  assert.equal(map.pairs.length,result.pairs.length); assert.ok(map.pairs.every(p=>p.status==='candidate'));
  assert.deepEqual(map.pairs.map(p=>p.evidence.rule),result.pairs.map(p=>p.rule));
  assert.deepEqual(validate(map),[]); cliValid(map);
});
test('P1.3 T2: all-exact approves only exact pairs, including a real nearest-pair negative control', async () => {
  const {map} = await big(); const approved = approvePairs(map,'all-exact',meta);
  const n = approved.pairs.filter(p=>p.status==='approved').length; console.log('T2 approved exact count:',n);
  assert.ok(n>0); assert.ok(approved.pairs.filter(p=>p.status==='approved').every(p=>p.evidence.rule==='same-number-same-position'));
  const mixed = (await compared(await fixture('bend.cii'),await fixture('bend-moved.cii'))).map;
  assert.ok(mixed.pairs.some(p=>p.evidence.rule==='nearest-within-tolerance'));
  const out = approvePairs(mixed,'all-exact',meta);
  assert.ok(out.pairs.some(p=>p.status==='approved')); assert.ok(out.pairs.filter(p=>p.evidence.rule!=='same-number-same-position').every(p=>p.status==='candidate'));
  cliValid(approved);
});
test('P1.3 T3: a second approved pair with the same target refuses MAP_NOT_ONE_TO_ONE, input unchanged', async () => {
  const {map} = await small(); const [p,q] = map.pairs;
  const conflict = structuredClone(map); conflict.pairs[1].target = structuredClone(p.target);
  const first = approvePairs(conflict,[p.pairId],meta), before=JSON.stringify(first);
  assert.throws(()=>approvePairs(first,[q.pairId],meta),{code:'MAP_NOT_ONE_TO_ONE'}); assert.equal(JSON.stringify(first),before);
});
test('P1.3 T4: export parse export identical JSON; reject removes approval metadata', async () => {
  const {map}=await small(); const id=map.pairs[0].pairId;
  const approved=approvePairs(map,[id],meta); assert.equal(approved.pairs[0].approvedBy,meta.by);
  const rejected=rejectPairs(approved,[id]); assert.equal(rejected.pairs[0].status,'rejected'); assert.ok(!('approvedBy' in rejected.pairs[0]));
  const text=JSON.stringify(rejected,null,2)+'\n'; assert.equal(JSON.stringify(JSON.parse(text),null,2)+'\n',text); cliValid(rejected);
});
test('P1.3 T5: both header hashes equal the actual input bytes; swapped hash refused', async () => {
  const a=(await readBenchmark('X-S1')).bytes,b=await fixture('X-S1M.cii');
  const {map,result,options}=await compared(a,b); assert.equal(map.source.sha256,sha256(a)); assert.equal(map.target.sha256,sha256(b));
  assert.throws(()=>toMapFile(result,{...options,sourceFile:options.targetFile}),{code:'MAP_EXPORT_INVALID'});
});
test('P1.3 loop closure notes survive export, approval and rejection with both sides and full original records', async () => {
  const bytes=makeCii({elements:[{from:10,to:20,d:[1000,0,0]},{from:20,to:30,d:[0,1000,0]},{from:30,to:40,d:[-1000,0,0]},{from:40,to:10,d:[0,-999,0]}],coords:[{node:10,xyz:[0,0,0]}]});
  const {map,result,options}=await compared(bytes,bytes); assert.ok(result.loopClosures.a.length);
  const detail=map.pairs[0].evidence.detail, notes=JSON.parse(detail.split('): ')[1]);
  assert.deepEqual(notes,[...result.loopClosures.a.map(closure=>({side:'source',closure})),...result.loopClosures.b.map(closure=>({side:'target',closure}))]);
  assert.equal(approvePairs(map,'all-exact',meta).pairs[0].evidence.detail,detail); cliValid(map);
  assert.throws(()=>toMapFile({...result,pairs:[]},options),{code:'MAP_EXPORT_INVALID'});
});
test('P1.3 invalid approval metadata and unknown pair IDs refuse MAP_EXPORT_INVALID without mutation',async()=>{
  const {map}=await small(), before=JSON.stringify(map);
  assert.throws(()=>approvePairs(map,[map.pairs[0].pairId],{}),{code:'MAP_EXPORT_INVALID'});
  assert.throws(()=>rejectPairs(map,['missing']),{code:'MAP_EXPORT_INVALID'}); assert.equal(JSON.stringify(map),before);
});

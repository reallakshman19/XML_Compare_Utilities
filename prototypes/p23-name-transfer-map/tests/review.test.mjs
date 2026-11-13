import test from 'node:test';
import assert from 'node:assert/strict';
import {readBenchmark} from '../kit/node.mjs';
import {readCii14} from '../kit/cii14.mjs';
import {nameIndex,planNames} from '../engine/plan.mjs';
import {approveAll} from '../engine/approve.mjs';
import {applyNames,verifyNames} from '../engine/run.mjs';
import {at,makeMap,renameFixture} from './helpers.mjs';
const [source,target,small]=await Promise.all(['X-TEXP','X-T','X-S1'].map(async id=>(await readBenchmark(id)).bytes));
const meta={by:'review',at};
const plan=async(s,t)=>planNames(s,t,await makeMap(s,t));
const approve=async p=>{assert.equal(p.ok,true);const a=await approveAll(p.changeset,meta);assert.equal(a.ok,true);return a.changeset;};

test('R1 full-map repeat warnings match kernel refusals; no proposals filtered',async()=>{
 const p=await plan(source,target);assert.equal(p.ok,true);assert.equal(p.changeset.changes.length,35);assert.equal(p.wouldRepeat.length,35);
 const r=await applyNames(target,await approve(p));assert.equal(r.ok,false);assert.equal(r.bytes,undefined);
 assert.deepEqual(p.wouldRepeat.map(w=>`node ${w.node}`).sort(),r.refusals.filter(x=>x.code==='KERNEL_NAME_IN_USE').map(x=>x.where).sort());
 assert.ok(p.wouldRepeat.every(w=>w.nodes.includes(w.node)&&w.nodes.length>1));
});
test('R1 existing owner blocks, but simultaneous swap does not warn or refuse',async()=>{
 const n=nameIndex(readCii14(small)),a='3870',b='3910',an=n.get(a).name,bn=n.get(b).name;
 const collision=renameFixture(small,a,bn),p=await plan(collision,small);assert.equal(p.ok,true);assert.deepEqual(p.wouldRepeat.map(w=>[w.node,w.name,[...w.nodes].sort()]),[[a,bn,[a,b].sort()]]);
 const blocked=await applyNames(small,await approve(p));assert.equal(blocked.ok,false);assert.ok(blocked.refusals.some(r=>r.code==='KERNEL_NAME_IN_USE'));
 const swapped=renameFixture(collision,b,an),q=await plan(swapped,small);assert.equal(q.ok,true);assert.equal(q.changeset.changes.length,2);assert.deepEqual(q.wouldRepeat,[]);
 const r=await applyNames(small,await approve(q));assert.equal(r.ok,true,JSON.stringify(r.refusals));
});
test('R2 source and target name conflicts identify the correct file',async()=>{
 const conflict=renameFixture(small,'3870','INVENTED-CONFLICT',true);
 for(const [s,t,role] of [[conflict,small,'source'],[small,conflict,'target']]){
  const r=await plan(s,t);assert.equal(r.ok,false);assert.equal(r.changeset,undefined);assert.equal(r.refusals[0].code,'NAMES_SOURCE_NAME_CONFLICT');assert.equal(r.refusals[0].where,`${role} node 3870`);
 }
});
test('R3 blank source names are skipped with reason; approved pair counts reconcile',async()=>{
 const s=renameFixture(small,'3910',''),m=await makeMap(s,small),p=await planNames(s,small,m);assert.equal(p.ok,true);
 assert.deepEqual(p.skipped.find(x=>x.node==='3910'),{pairId:'pair-3910',sourceNode:'3910',node:'3910',reason:'SOURCE_NAME_BLANK'});
 assert.equal(p.changeset.changes.length,0);assert.equal(p.skipped.length+p.noEntry.length+p.unchanged.length+p.changeset.changes.length,m.pairs.length);
});
test('R4 read-back refuses an extra unplanned NODENAME change',async()=>{
 const s=renameFixture(small,'3870','INVENTED-PLANNED'),p=await plan(s,small),cs=await approve(p);
 const r=await applyNames(small,cs);assert.equal(r.ok,true,JSON.stringify(r.refusals));
 const corrupt=renameFixture(r.bytes,'3910','INVENTED-UNPLANNED');
 assert.throws(()=>verifyNames(small,corrupt,cs),e=>e.code==='NAMES_READBACK_FAILED'&&e.where==='node 3910');
});

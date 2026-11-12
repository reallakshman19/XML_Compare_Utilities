import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBenchmark} from '../kit/node.mjs';
import {sha256Hex} from '../kit/core.mjs';
import {readCii14} from '../kit/cii14.mjs';
import {fieldDiff} from '../vendor/kit/cii14.mjs';
import {validate} from '../vendor/vendor/validate.mjs';
import {planNames} from '../engine/plan.mjs';
import {approveAll,approveSelected} from '../engine/approve.mjs';
import {applyNames} from '../engine/run.mjs';
import {at,makeMap,renameFixture,uniqueNameSubset} from './helpers.mjs';
const [source,target,small]=await Promise.all(['X-TEXP','X-T','X-S1'].map(async id=>(await readBenchmark(id)).bytes));
const map=await makeMap(source,target,'TEXPECTED-PARTIALLLYDONE.CII','T.CII');
const meta={by:'test',at};
function refuse(r,code){assert.equal(r.ok,false);assert.ok(r.refusals.some(x=>x.code===code),JSON.stringify(r.refusals));assert.equal(r.bytes,undefined);assert.equal(r.changeset,undefined);}
// Independent oracle: use rows (not the planner's element scan), then enumerate missing element ends.
function expectedNames(bytes){const c=readCii14(bytes),names=new Map(),missing=new Set();for(const r of c.nodeNames){if(r.element===null)continue;const e=c.elements[r.element];for(const side of ['from','to'])names.set(String(e[side]),r[side].token.trim());}for(const e of c.elements)if(!e.pointers.NODENAME){missing.add(String(e.from));missing.add(String(e.to));}return {names,missing};}
const plan=()=>planNames(source,target,map);
test('T1 exact full-map proposals and no-entry node',async()=>{
 const a=expectedNames(source),b=expectedNames(target),expected=[];
 for(const [n,name] of a.names)if(name&&b.names.get(n)!==name&&!b.missing.has(n)&&b.names.has(n))expected.push([n,b.names.get(n),name]);
 const r=await plan();assert.equal(r.ok,true);assert.deepEqual(validate(r.changeset),[]);assert.equal(expected.length,35);
 assert.deepEqual(r.changeset.changes.map(c=>[c.target.node,c.oldToken,c.newValue]).sort(),expected.sort());
 assert.deepEqual(r.noEntry.map(x=>[x.node,x.code]),[['10330','NAMES_TARGET_HAS_NO_ENTRY']]);assert.ok(r.changeset.changes.every(c=>!c.approval.approved));
});
test('T2 full-map application refuses duplicate names atomically',async()=>{
 const p=await plan(),a=await approveAll(p.changeset,meta);assert.equal(a.ok,true);const r=await applyNames(target,a.changeset);
 refuse(r,'KERNEL_NAME_IN_USE');assert.equal(r.refusals.filter(x=>x.code==='KERNEL_NAME_IN_USE').length,35);
});
test('T2b explicitly selected unique-name subset changes only NODENAME fields and reads back',async()=>{
 const p=await plan(),subset=uniqueNameSubset(p.changeset,target);assert.equal(subset.changes.length,12);assert.equal(new Set(subset.changes.map(c=>c.newValue)).size,12);
 const a=await approveAll(subset,meta);assert.equal(a.ok,true);const r=await applyNames(target,a.changeset);assert.equal(r.ok,true,JSON.stringify(r.refusals));
 const diff=fieldDiff(readCii14(target),readCii14(r.bytes));assert.equal(diff.length,24);assert.ok(diff.every(d=>d.section==='NODENAME'));assert.equal(r.report.length,12);assert.ok(r.report.every(x=>x.ok&&x.readBack===x.new));
});
test('T2 valid invented unique name: only NODENAME slots change and read back',async()=>{
 const s=renameFixture(small,'3870','INVENTED-NAME-001'),m=await makeMap(s,small),p=await planNames(s,small,m);assert.equal(p.ok,true);assert.equal(p.changeset.changes.length,1);
 const a=await approveAll(p.changeset,meta),r=await applyNames(small,a.changeset);assert.equal(r.ok,true,JSON.stringify(r.refusals));
 const d=fieldDiff(readCii14(small),readCii14(r.bytes));assert.ok(d.length>=2);assert.ok(d.every(x=>x.section==='NODENAME'));assert.equal(r.report[0].readBack,'INVENTED-NAME-001');assert.ok(r.report[0].ok);
});
test('T3 candidate and rejected pairs do not propose',async()=>{
 const m=structuredClone(map);for(const [n,status] of [['925','candidate'],['930','rejected']]){const p=m.pairs.find(x=>x.source.node===n);p.status=status;delete p.approvedBy;delete p.approvedAt;}assert.deepEqual(validate(m),[]);const r=await planNames(source,target,m);assert.equal(r.ok,true);assert.equal(r.changeset.changes.length,33);assert.ok(!r.changeset.changes.some(x=>['925','930'].includes(x.target.node)));
});
test('T4 invented 26-character source name refuses NAMES_TOO_LONG',async()=>{
 const s=renameFixture(small,'3840','ABCDEFGHIJKLMNOPQRSTUVWXYZ');const m=await makeMap(s,small);refuse(await planNames(s,small,m),'NAMES_TOO_LONG');
});
test('T5 wrong target hash refuses NAMES_MAP_FILE_MISMATCH',async()=>{const m=structuredClone(map);m.target.sha256=await sha256Hex(small);refuse(await planNames(source,target,m),'NAMES_MAP_FILE_MISMATCH');});
test('T6 vendored files match VENDORED.md SHA-256',async()=>{const lines=readFileSync(new URL('../VENDORED.md',import.meta.url),'utf8').split('\n').filter(x=>x.startsWith('vendor/'));assert.equal(lines.filter(x=>x.startsWith('vendor/kernel/')).length,3);for(const l of lines){const [p,,,,hash]=l.split('|').map(x=>x.trim());assert.equal(await sha256Hex(readFileSync(new URL('../'+p,import.meta.url))),hash);}});
test('refusal NAMES_SOURCE_NAME_CONFLICT on different slots for a node',async()=>{const s=renameFixture(small,'3870','INVENTED-CONFLICT',true);refuse(await planNames(s,small,await makeMap(s,small)),'NAMES_SOURCE_NAME_CONFLICT');});
test('refusal NAMES_DOCUMENT_INVALID for invalid map',async()=>{const m=structuredClone(map);m.version=2;refuse(await planNames(source,target,m),'NAMES_DOCUMENT_INVALID');});
test('refusal NAMES_MAP_PAIR_INVALID for unknown node',async()=>{const m=structuredClone(map);m.pairs[0].source.node='99999999999';assert.deepEqual(validate(m),[]);refuse(await planNames(source,target,m),'NAMES_MAP_PAIR_INVALID');});
test('selected approval retains unapproved rows, rejects unknown ID NAMES_APPROVAL_INVALID',async()=>{const p=await plan();const ids=[p.changeset.changes[0].changeId];const a=await approveSelected(p.changeset,ids,meta);assert.equal(a.ok,true);assert.equal(a.changeset.changes.filter(c=>c.approval.approved).length,1);assert.ok(p.changeset.changes.every(c=>!c.approval.approved));refuse(await approveSelected(p.changeset,['unknown'],meta),'NAMES_APPROVAL_INVALID');refuse(await applyNames(target,a.changeset),'KERNEL_NOT_APPROVED');});
test('refusal NAMES_FIELD_NOT_ALLOWED on non-name edit',async()=>{const p=await plan();const cs=p.changeset;cs.changes[0].field='RIGID/WEIGHT';refuse(await applyNames(target,cs),'NAMES_FIELD_NOT_ALLOWED');});
test('full benchmark duplicate names refuse KERNEL_NAME_IN_USE atomically',async()=>{const p=await plan(),a=await approveAll(p.changeset,meta);const r=await applyNames(target,a.changeset);refuse(r,'KERNEL_NAME_IN_USE');assert.equal(r.refusals.filter(x=>x.code==='KERNEL_NAME_IN_USE').length,35);});

test('NAMES_READBACK_FAILED on deliberately wrong output',async()=>{const {verifyNames}=await import('../engine/run.mjs');const p=await plan();assert.throws(()=>verifyNames(target,target,p.changeset),e=>e.code==='NAMES_READBACK_FAILED');});

test('CLI plan approve apply succeeds for unique name and refuses overwrite',async()=>{
 const {mkdtempSync,writeFileSync,existsSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'p23-test-'));try{
  const s=renameFixture(small,'3870','INVENTED-CLI-NAME'),m=await makeMap(s,small),paths=['s.cii','t.cii','map.json','p.json','a.json','out.cii'].map(x=>join(dir,x));
  const [sp,tp,mp,pp,ap,op]=paths;writeFileSync(sp,s);writeFileSync(tp,small);writeFileSync(mp,JSON.stringify(m));
  const cli=(...args)=>spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});
  for(const args of [['plan',sp,tp,mp,pp],['approve',pp,ap,'--by','test'],['apply',tp,ap,op]]){const r=cli(...args);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(JSON.parse(r.stdout).ok);}
  assert.ok(existsSync(op));const d=fieldDiff(readCii14(small),readCii14(readFileSync(op)));assert.ok(d.length>=2&&d.every(x=>x.section==='NODENAME'));
  const overwrite=cli('apply',tp,ap,tp);assert.equal(overwrite.status,1);assert.equal(JSON.parse(overwrite.stdout).refusals[0].code,'NAMES_OUTPUT_IS_INPUT');assert.deepEqual(new Uint8Array(readFileSync(tp)),small);
  const unapproved=join(dir,'unapproved.cii'),r=cli('apply',tp,pp,unapproved);assert.equal(r.status,1);assert.equal(existsSync(unapproved),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

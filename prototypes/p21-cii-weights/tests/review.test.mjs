import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readBenchmark,CARD_DIR} from '../kit/node.mjs';
import {attempt} from '../vendor/kit/core.mjs';
import {rigidInventory,baseFor} from '../engine/inventory.mjs';
import {parseCsv,proposeFromTable} from '../engine/propose.mjs';
import {approveAll} from '../engine/approve.mjs';
import {importForReview,zeroRows,canApply} from '../engine/session.mjs';
import {applyWeights} from '../engine/run.mjs';
const at='2026-11-13T00:00:00Z',by='review engineer';
async function fixture(id='X-S1',n=1){
  const {bytes,path}=await readBenchmark(id),inventory=rigidInventory(bytes),base=await baseFor(bytes,'base.cii');
  const cs=proposeFromTable(inventory,inventory.slice(0,n).map(r=>({fromNode:r.fromNode,toNode:r.toNode,newWeight:Math.ceil(r.weight*1.4)+1})),{base,createdAt:at});
  return {bytes,path,inventory,base,cs};
}
function zero(c){c.newValue=0;c.approval.zeroConfirmed=true;return c;}
async function refuses(fn,code){const r=await attempt(fn);assert.equal(r.ok,false);assert.equal(r.bytes,undefined);assert.equal(r.refusals[0].code,code);return r.refusals[0];}
test('R1 zero approval requires each explicit change ID, even for previously approved zeros',async()=>{
  const {cs}=await fixture('X-T',2);cs.changes.forEach(zero);cs.changes[1].approval={approved:true,zeroConfirmed:true,by:'prior',at};
  const before=structuredClone(cs);
  await refuses(()=>approveAll(cs,{by,at}),'KERNEL_ZERO_NOT_CONFIRMED');
  await refuses(()=>approveAll(cs,{by,at,confirmZeros:['W1']}),'KERNEL_ZERO_NOT_CONFIRMED');
  await refuses(()=>approveAll(cs,{by,at,confirmZeros:'W1'}),'WEIGHTS_APPROVAL_INVALID');
  assert.deepEqual(cs,before);
  const a=approveAll(cs,{by,at,confirmZeros:['W1','W2']}).changeset;
  assert.equal(a.changes.length,2);assert.ok(a.changes.every(c=>c.approval.approved));assert.equal(a.changes[1].approval.by,'prior');
});
test('R2 page import resets approvals; fresh zero confirmation and session approval required',async()=>{
  const {bytes,base,cs}=await fixture();zero(cs.changes[0]);
  const approved=approveAll(cs,{by,at,confirmZeros:['W1']}).changeset;
  const imported=importForReview(JSON.stringify(approved),base.sha256);
  assert.equal(imported.changes[0].approval.approved,false);assert.equal(imported.changes[0].approval.by,undefined);
  assert.equal(imported.changes[0].approval.at,undefined);assert.equal(imported.changes[0].approval.zeroConfirmed,true);
  assert.deepEqual(zeroRows(imported).map(c=>c.changeId),['W1']);assert.equal(canApply(approved,false),false);assert.equal(canApply(imported,true),false);
  await refuses(()=>approveAll(imported,{by,at}),'KERNEL_ZERO_NOT_CONFIRMED');
  const again=approveAll(imported,{by:'new engineer',at,confirmZeros:['W1']}).changeset;
  assert.equal(again.changes[0].approval.by,'new engineer');assert.equal(canApply(again,true),true);
  const applied=await applyWeights(bytes,again);assert.equal(applied.ok,true);assert.equal(applied.report[0].readBack,0);
  const page=readFileSync(new URL('../browser/page.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/Zero weight - confirm/);assert.match(page,/tick.type='checkbox'/);assert.match(page,/confirmZeros:\[\.\.\.confirmedZeros\]/);assert.match(page,/!canApply\(cs,approvedInSession\)/);
});
test('R3 duplicate CSV element refuses with both physical row numbers',async()=>{
  const {inventory,base}=await fixture(),r=inventory[0];
  const rows=parseCsv(`fromNode,toNode,newWeight,note\r\n${r.fromNode},${r.toNode},2000,"line one\r\nline two"\r\n\r\n${r.fromNode},${r.toNode},2100,repeat\r\n`);
  const e=await refuses(()=>proposeFromTable(inventory,rows,{base,createdAt:at}),'WEIGHTS_ROW_DUPLICATE');assert.match(e.detail,/rows 2 and 5/);assert.equal(e.where,'row 5');
});
test('R4 Excel empty trailing fields accepted, nonempty extras refused',async()=>{
  assert.deepEqual(parseCsv('fromNode,toNode,newWeight,,\n1,2,30,,,\n'),[{fromNode:'1',toNode:'2',newWeight:'30',note:''}]);
  assert.deepEqual(parseCsv('fromNode,toNode,newWeight,note,\n1,2,30,hello,,\n3,4,50\n'),[{fromNode:'1',toNode:'2',newWeight:'30',note:'hello'},{fromNode:'3',toNode:'4',newWeight:'50',note:''}]);
  await refuses(()=>parseCsv('fromNode,toNode,newWeight\n1,2,30,extra,\n'),'WEIGHTS_CSV_INVALID');
});
test('R5 reapproval retains original by and at',async()=>{
  const {cs}=await fixture();const a=approveAll(cs,{by,at}).changeset;
  const b=approveAll(a,{by:'other',at:'2026-11-14T00:00:00Z'}).changeset;assert.deepEqual(b,a);
});
test('R6 malformed page JSON refuses with WEIGHTS_JSON_INVALID',async()=>{
  const {base}=await fixture();await refuses(()=>importForReview('{',base.sha256),'WEIGHTS_JSON_INVALID');
});
test('R7 CLI explicit zero option is mandatory for approval',async()=>{
  const {cs,path}=await fixture();zero(cs.changes[0]);const dir=mkdtempSync(join(tmpdir(),'p21-review-'));
  try{const input=join(dir,'in.json'),output=join(dir,'approved.json'),out=join(dir,'out.cii');writeFileSync(input,JSON.stringify(cs));
    const call=(...args)=>spawnSync(process.execPath,[join(CARD_DIR,'cli.mjs'),...args],{encoding:'utf8'});
    const args=['approve',input,output,'--limit','20','--by',by];const r=call(...args);assert.equal(r.status,1,r.stderr);assert.equal(JSON.parse(r.stdout).refusals[0].code,'KERNEL_ZERO_NOT_CONFIRMED');assert.equal(existsSync(output),false);
    assert.equal(call(...args,'--confirm-zero','W1').status,0);assert.equal(call('apply',path,output,out).status,0);assert.equal(rigidInventory(new Uint8Array(readFileSync(out)))[0].weight,0);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

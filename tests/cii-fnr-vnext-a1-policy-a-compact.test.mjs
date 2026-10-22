import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
const hash = b => createHash('sha256').update(b).digest('hex');
const row = c => c.map((v,i) => String(v).padStart(i ? 13 : 15)).join('');
const elem = (a,b,p) => Array.from({length:15},(_,i) => i === 0 ? row([a+'.0',b+'.0',0,0,0,0]) : i === 10 ? ' '.repeat(7)+'    4 LINE'.padEnd(73,' ') : i === 13 ? row([0,0,0,0,0,p]) : row([0,0,0,0,0,0]));
function fixture(left,right,eol) {
  return new TextEncoder().encode(['#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,2,0,0]),
    '#$ ELEMENTS',...elem(10,20,1),...elem(20,30,2),'#$ NODENAME',
    '  '+'LEFT'.padEnd(26)+left.padEnd(25),'  '+right.padEnd(26)+'RIGHT'.padEnd(25)].join(eol)+eol);
}
function claims(bytes,tab) {
  const p=parseCii(bytes);
  const fields=[p.fields.find(f=>f.pointer===1&&f.fieldIdentity==='NODENAME.TO'),
    p.fields.find(f=>f.pointer===2&&f.fieldIdentity==='NODENAME.FROM')];
  return fields.map((f,i)=>({id:'C'+i,ruleId:'R',section:'NODENAME',
    fieldIdentity:tab==='LINE_NODE'?f.fieldIdentity.replace('.','_'):f.fieldIdentity,
    byteStart:f.byteStart,byteEnd:f.byteEnd,before:f.before,after:'RENAMED'.padEnd(f.before.length),
    targetElementWitness:tab==='LINE_NODE'?(i===0?'10->20@0':'20->30@1'):f.owners[0],
    status:'PROPOSED',evidence:{score:100}}));
}
async function write(bytes,cs,tab,ids=cs.map(c=>c.id)) {
  return validatePostimage({original:bytes,originalHash:hash(bytes),
    plan:{schema:'CiiFnrVnext.Proposals.v1',targetSha256:hash(bytes),claims:cs,
      diagnostics:[],observations:[],incompleteSearch:false},approvedIds:ids,tab});
}
for (const eol of ['\n','\r\n']) for(const tab of ['NORMAL','LINE_NODE']) {
  test('Policy A named-only closure '+JSON.stringify(eol)+' '+tab,async()=>{
    const both=fixture('SHARED','SHARED',eol), all=claims(both,tab), unchanged=Uint8Array.from(both);
    await assert.rejects(write(both,all,tab,['C0']),/ALIAS_APPROVAL_INCOMPLETE/);
    await assert.rejects(write(both,all,tab,['C1']),/ALIAS_APPROVAL_INCOMPLETE/);
    const complete=await write(both,all,tab);
    assert.deepEqual(both,unchanged);assert.equal(hash(complete.bytes),complete.target1Hash);
    assert.equal(parseCii(complete.bytes).fields.filter(f=>f.before.trim()==='RENAMED').length,2);
    for(const [left,right] of [['SHARED',''],['','SHARED']]) {
      const bytes=fixture(left,right,eol), original=Uint8Array.from(bytes), c=claims(bytes,tab);
      const named=c.filter(x=>x.before.trim()), blank=c.filter(x=>!x.before.trim());
      const result=await write(bytes,named,tab);
      assert.equal(result.audit.length,1);assert.deepEqual(bytes,original);
      assert.deepEqual(result.bytes.subarray(blank[0].byteStart,blank[0].byteEnd),
        original.subarray(blank[0].byteStart,blank[0].byteEnd));
      await assert.rejects(write(bytes,c,tab),/BLANK_PHYSICAL_EDIT_FORBIDDEN/);
    }
    const disagree=fixture('SHARED','DIFFERENT',eol), one=claims(disagree,tab).slice(0,1);
    await assert.rejects(write(disagree,one,tab),/ALIAS_APPROVAL_INCOMPLETE/);
    await assert.rejects(write(both,all,tab,['C0','C0']),/DUPLICATE/);
  });
}

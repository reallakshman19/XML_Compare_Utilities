import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
const hash = b => createHash('sha256').update(b).digest('hex');
const row = v => v.map((x,i) => String(x).padStart(i ? 13 : 15)).join('');
const element = (a,b,p) => Array.from({length:15},(_,i) => i===0 ? row([a+'.0',b+'.0',0,0,0,0]) :
  i===13 ? row([0,0,0,0,0,p]) : row([0,0,0,0,0,0]));
const fixture = eol => new Uint8Array(Buffer.from(['#$ VERSION',row([5,14,1252]),
  '#$ CONTROL',row([2,0,0,2,0,0]),'#$ ELEMENTS',...element(10,20,1),...element(20,30,2),
  '#$ NODENAME','  '+'LEFT'.padEnd(26)+'SHARED'.padEnd(25),
  '  '+''.padEnd(26)+'RIGHT'.padEnd(25)].join(eol)+eol,'ascii'));
const claim = (f,id,status='PROPOSED') => ({id,ruleId:id,section:'NODENAME',
  fieldIdentity:f.fieldIdentity,byteStart:f.byteStart,byteEnd:f.byteEnd,
  before:f.before,after:'RENAMED'.padEnd(f.before.length),
  targetElementWitness:f.owners[0],status,evidence:{score:999}});
async function write(bytes,claims,approvedIds=['chosen']) {
  return validatePostimage({original:bytes,originalHash:hash(bytes),
    plan:{schema:'CiiFnrVnext.Proposals.v1',targetSha256:hash(bytes),claims,
      diagnostics:[],observations:[],incompleteSearch:false},approvedIds,tab:'NORMAL'});
}
for(const eol of ['\n','\r\n']) {
  test('F01 status-independent exact/partial overlaps '+JSON.stringify(eol),async()=>{
    const bytes=fixture(eol), before=Uint8Array.from(bytes);
    const f=parseCii(bytes).fields.find(x=>x.pointer===1&&x.fieldIdentity==='NODENAME.TO');
    const chosen=claim(f,'chosen');
    for(const status of ['HOLD','REJECTED','PROPOSED','CONFLICT']) {
      const other=claim(f,'other',status);
      await assert.rejects(write(bytes,[chosen,other]),/CLAIM_OVERLAP_OR_UNSUPPORTED/);
      await assert.rejects(write(bytes,[chosen,{...other,byteStart:other.byteStart+1,
        before:other.before.slice(1),after:other.after.slice(1)}]),/CLAIM_OVERLAP_OR_UNSUPPORTED/);
    }
    assert.deepEqual(bytes,before,'TARGET0 must not be modified');
  });
  test('F01 unrelated HOLD/REJECTED must not veto valid named+blank '+JSON.stringify(eol),async()=>{
    const bytes=fixture(eol), copy=Uint8Array.from(bytes), fields=parseCii(bytes).fields;
    const named=claim(fields.find(x=>x.pointer===1&&x.fieldIdentity==='NODENAME.TO'),'chosen');
    const unrelated=fields.find(x=>x.pointer===1&&x.fieldIdentity==='NODENAME.FROM');
    const blank=fields.find(x=>x.pointer===2&&x.fieldIdentity==='NODENAME.FROM');
    const withheld=['HOLD','REJECTED'].map((status,i)=>claim(unrelated,'withheld-'+i,status));
    const output=await write(bytes,[named,...withheld]);
    assert.equal(output.audit.length,1);assert.deepEqual(bytes,copy);
    assert.deepEqual(output.bytes.subarray(blank.byteStart,blank.byteEnd),bytes.subarray(blank.byteStart,blank.byteEnd));
    assert.equal(hash(output.bytes),output.target1Hash);
    await assert.rejects(write(bytes,[claim(blank,'chosen')]),/BLANK_PHYSICAL_EDIT_FORBIDDEN/);
    await assert.rejects(write(bytes,[named],['chosen','chosen']),/CLAIM_ID_DUPLICATE_OR_UNKNOWN/);
  });
}

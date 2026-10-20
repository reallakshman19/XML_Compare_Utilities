import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { admitLineNodeClaims } from '../tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js';

const row = values => values.map((x,i)=>String(x).padStart(i?13:15)).join('');
const element = (from,to,pointer) => Array.from({length:15},(_,i)=>i===0
  ? row([`${from}.0`,`${to}.0`,120,0,0,0])
  : i===13 ? row([0,0,0,0,0,pointer]) : row([0,0,0,0,0,0]));
const rowLabel = label => ' '.repeat(7)+String(label.length).padStart(5,' ')+' '+label.padEnd(67,' ');
function fixture(lineEnding = '\r\n') {
  const lines=['#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,2,0,0]),
    '#$ ELEMENTS',...element(100,110,1),...element(110,120,2),'#$ NODENAME',
    '  '+'OLD-A'.padEnd(26)+'OLD-B'.padEnd(25),
    '  '+'OLD-C'.padEnd(26)+'OLD-D'.padEnd(25)];
  const start = lines.indexOf('#$ ELEMENTS');
  for (const i of [0,1]) lines[start + 1 + i*15 + 10] = rowLabel(i ? 'LINE-B/B2' : 'LINE-A/B2');
  const section = lines.indexOf('#$ NODENAME');
  lines[section+1] = '  '+'OLD-A'.padEnd(26)+'SHARED'.padEnd(25);
  lines[section+2] = '  '+'SHARED'.padEnd(26)+'OLD-D'.padEnd(25);
  return new Uint8Array(Buffer.from(lines.join(lineEnding)+lineEnding));
}
function snapshot(bytes) {
  const parsed = parseCii(bytes);
  const f = (pointer,identity) => parsed.fields.find(f=>f.pointer===pointer&&f.fieldIdentity===identity);
  const a=f(1,'NODENAME.TO'),b=f(2,'NODENAME.FROM');
  const lineBefore = rowLabel('LINE-A/B2'), start = Buffer.from(bytes).indexOf(Buffer.from(lineBefore));
  assert(start>0);
  const claim=(field,id,after,witness)=>({id,ruleId:'rule',section:'NODENAME',fieldIdentity:field.fieldIdentity==='NODENAME.TO'?'NODENAME_TO':'NODENAME_FROM',
    byteStart:field.byteStart,byteEnd:field.byteEnd,before:field.before,
    after:after.padEnd(field.before.length,' '),targetElementWitness:witness,status:'PROPOSED',evidence:{}});
  const ca=claim(a,'alias-to','RENAMED','100->110@0');
  const cb=claim(b,'alias-from','RENAMED','110->120@1');
  const cl={id:'line',ruleId:'line-rule',section:'ELEMENTS',fieldIdentity:'LINE_NUMBER',byteStart:start,byteEnd:start+lineBefore.length,
    before:lineBefore,after:rowLabel('LINE-A/B3'),targetElementWitness:'100->110@0',status:'PROPOSED',evidence:{}};
  return {ca,cb,cl};
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const plan=(bytes,claims)=>({schema:'CiiFnrVnext.Proposals.v1',targetSha256:hash(bytes),claims,incompleteSearch:false,diagnostics:[]});
const admitted=(bytes,claims,approvals=claims.map(c=>c.id))=>admitLineNodeClaims({
  original:bytes,originalHash:hash(bytes),plan:plan(bytes,claims),approvedIds:approvals});
const blocked=(bytes,claims,ids,code)=>assert.rejects(admitted(bytes,claims,ids),new RegExp(code));
for(const le of ['\r\n','\n']) {
  test(`SIMULATED ${JSON.stringify(le)}: full TARGET node alias closure + line full record`,async()=>{
    const bytes=fixture(le),{ca,cb,cl}=snapshot(bytes),before=Buffer.from(bytes);
    const result=await admitted(bytes,[ca,cb,cl]);
    assert.equal(result.length,3);
    assert.deepEqual(Buffer.from(bytes),before,'admission does not write');
    assert.equal(Object.isFrozen(result),true);
    await blocked(bytes,[ca,cb,cl],['alias-to'],'NODENAME_LOGICAL_ALIAS_APPROVAL_INCOMPLETE');
    await blocked(bytes,[ca,cb,cl],['alias-from'],'NODENAME_LOGICAL_ALIAS_APPROVAL_INCOMPLETE');
    assert.equal((await admitted(bytes,[cl])).length,1,'line-only approval is permitted');
    await blocked(bytes,[{...cl,after:rowLabel('X'.repeat(68)) }],['line'],'LINE_NODE_CLAIM_SCHEMA_INVALID|LINE_NUMBER_SERIALIZATION_INVALID');
    const badDeclared={...cl,after:cl.after.slice(0,7)+'   55'+cl.after.slice(12)};
    await blocked(bytes,[badDeclared],['line'],'LINE_NUMBER_DECLARED_LENGTH_INVALID');
    await blocked(bytes,[{...cl,byteStart:cl.byteStart+1,byteEnd:cl.byteEnd+1}],['line'],'LINE_NUMBER_PHYSICAL_CUSTODY_INVALID|LINE_NODE_BEFORE_BYTES_INVALID');
    await blocked(bytes,[{...cl,targetElementWitness:'WRONG'}],['line'],'LINE_NUMBER_ELEMENT_WITNESS_INVALID');
    await blocked(bytes,[{...ca,targetElementWitness:'WRONG'},cb],['alias-to','alias-from'],'NODENAME_ELEMENT_WITNESS_INVALID');
    await blocked(bytes,[ca,{...cb,after:'DIFFERENT'.padEnd(cb.after.length,' ')}],['alias-to','alias-from'],'NODENAME_LOGICAL_ALIAS_VALUES_CONFLICT');
    const other={...cb,id:'rule-two-node',status:'CONFLICT'};
    await blocked(bytes,[ca,cb,other],['alias-to','alias-from'],'LINE_NODE_PLAN_COLLISION');
    await blocked(bytes,[ca,cb],['alias-to','alias-to'],'LINE_NODE_ADMISSION_INPUT_INVALID');
    await blocked(bytes,[{...ca,section:'CONTROL'},cb],['alias-to','alias-from'],'LINE_NODE_FIELD_UNAUTHORIZED');
    const wrongHash=plan(bytes,[ca,cb]);wrongHash.targetSha256='f'.repeat(64);
    await assert.rejects(admitLineNodeClaims({original:bytes,originalHash:hash(bytes),plan:wrongHash,
      approvedIds:['alias-to','alias-from']}),/LINE_NODE_SHA_BINDING_INVALID/);
    const tampered=new Uint8Array(bytes);tampered[ca.byteStart]=33;
    await assert.rejects(admitLineNodeClaims({original:tampered,originalHash:hash(bytes),plan:plan(bytes,[ca,cb]),
      approvedIds:['alias-to','alias-from']}),/LINE_NODE_TARGET0_STALE/);
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { admitLineNodeClaims } from '../tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js';
import { DEFAULT_POLICY, enforcePlanPolicy, resolvePolicy } from '../tabs/cii-workspace/cii-fnr-vnext/ui/config-policy.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const row = v => v.map((x,i) => String(x).padStart(i ? 13 : 15)).join('');
const line = '       ' + String(2).padStart(5) + ' ' + 'L1'.padEnd(67);
function element(from, to, pointer) {
  return Array.from({length:15}, (_,i) => i===0 ? row([from+'.0',to+'.0',0,0,0,0]) :
    i===10 ? line : i===13 ? row([0,0,0,0,0,pointer]) : row([0,0,0,0,0,0]));
}
function fixture(eol) {
  const lines = ['#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,2,0,0]),
    '#$ ELEMENTS',...element(10,20,1),...element(20,30,2),'#$ NODENAME',
    '  '+'LEFT'.padEnd(26)+'SHARED'.padEnd(25),
    '  '+'SHARED'.padEnd(26)+'RIGHT'.padEnd(25)];
  return new Uint8Array(Buffer.from(lines.join(eol)+eol,'ascii'));
}
function nameClaim(field,id,status='PROPOSED',after='RENAMED') {
  return {id,ruleId:id,section:'NODENAME',fieldIdentity:field.fieldIdentity,
    byteStart:field.byteStart,byteEnd:field.byteEnd,before:field.before,
    after:after.padEnd(field.before.length),status,targetElementWitness:field.owners[0],
    evidence:{testFixture:true}};
}
function example(bytes) {
  const fields = parseCii(bytes).fields;
  const find = (p,side) => fields.find(f => f.pointer===p&&f.fieldIdentity==='NODENAME.'+side);
  const a1=nameClaim(find(1,'TO'),'A1'),a2=nameClaim(find(2,'FROM'),'A2');
  const b=nameClaim(find(1,'FROM'),'B','CONFLICT','EAST');
  const c=nameClaim(find(1,'FROM'),'C','CONFLICT','WEST');
  const diagnostics=[{severity:'ERROR',code:'DUPLICATE_FIELD_CLAIM',ruleId:'C',
    detail:`${b.byteStart}:${b.byteEnd}`}];
  return {a1,a2,b,c,diagnostics};
}
function plan(bytes, claims, diagnostics=[]) {
  return {schema:'CiiFnrVnext.Proposals.v1',targetSha256:digest(bytes),
    claims,diagnostics,incompleteSearch:false};
}
async function write(bytes, proposals, approvals=['A1','A2'], tab='NORMAL', policy) {
  return validatePostimage({original:bytes,originalHash:digest(bytes),
    plan:proposals,approvedIds:approvals,tab,policy});
}
for (const eol of ['\n','\r\n']) {
  for (const tab of ['NORMAL','LINE_NODE']) {
    test(`config isolate real writer: ${tab} / ${JSON.stringify(eol)}`,async()=>{
      const bytes=fixture(eol), original=Buffer.from(bytes), {a1,a2,b,c,diagnostics}=example(bytes);
      const proposal=plan(bytes,[a1,a2,b,c],diagnostics);
      const safe=await write(bytes,proposal,['A1','A2'],tab,DEFAULT_POLICY);
      assert.equal(safe.audit.length,2);
      assert.equal(safe.policy.conflictPolicy,'ISOLATE_UNRELATED');
      assert.deepEqual(Buffer.from(bytes),original,'TARGET0 must remain unchanged');
      assert.deepEqual(safe.bytes.subarray(b.byteStart,b.byteEnd),bytes.subarray(b.byteStart,b.byteEnd));
      assert.equal(safe.target1Hash,digest(safe.bytes));
      const changed=[...bytes].map((v,i)=>v===safe.bytes[i]?-1:i).filter(i=>i>=0);
      assert(changed.length>0);
      assert(changed.every(i=>[a1,a2].some(c=>i>=c.byteStart&&i<c.byteEnd)));
      await assert.rejects(write(bytes,proposal,['A1','A2'],tab,
        {...DEFAULT_POLICY,conflictPolicy:'BLOCK_PLAN'}),/BLOCKING_DIAGNOSTICS|UNRESOLVED_CONFLICT/);
      await assert.rejects(write(bytes,proposal,['A1','A2'],tab,
        {...DEFAULT_POLICY,unapprovedPolicy:'BLOCK_PLAN'}),/UNAPPROVED_CLAIMS_BLOCK_PLAN/);
      await assert.rejects(write(bytes,proposal,['A1'],tab),/ALIAS_APPROVAL_INCOMPLETE/);
      await assert.rejects(write(bytes,proposal,['A1','B'],tab),/UNAPPROVABLE|OVERLAP_OR_UNSUPPORTED/);
    });
  }
  test(`config withheld HOLD/REJECTED and invalid diagnostic / ${JSON.stringify(eol)}`,async()=>{
    const bytes=fixture(eol), {a1,a2,b,c}=example(bytes);
    const hold={...b,status:'HOLD'}, rejected={...c,status:'REJECTED'};
    const proposal=plan(bytes,[a1,a2,hold,rejected]);
    const ok=await write(bytes,proposal);
    assert.equal(ok.audit.length,2);
    await assert.rejects(write(bytes,proposal,['A1','A2'],'NORMAL',
      {conflictPolicy:'BLOCK_PLAN'}),/UNRESOLVED_CONFLICT/);
    await assert.rejects(write(bytes,plan(bytes,[a1,a2,hold,rejected],
      [{severity:'ERROR',code:'FORMAT_INVALID',ruleId:'B'}])),/PLAN_HAS_BLOCKING_DIAGNOSTICS/);
    const unsafe={...hold,byteStart:a1.byteStart,byteEnd:a1.byteEnd,before:a1.before};
    await assert.rejects(write(bytes,plan(bytes,[a1,a2,unsafe])),/CLAIM_OVERLAP_OR_UNSUPPORTED/);
    await assert.rejects(write(bytes,proposal,['A1','A2'],'NORMAL',
      {conflictPolicy:'DISABLE_CHECKS'}),/POLICY_UNRECOGNIZED/);
  });
}
test('config rejects unknown controls and retains immutable defaults',()=>{
  assert.equal(resolvePolicy().conflictPolicy,'ISOLATE_UNRELATED');
  assert.equal(resolvePolicy({approvalMode:'INDIVIDUAL'}).approvalMode,'INDIVIDUAL');
  assert.throws(()=>resolvePolicy({disableAliasChecks:true}),/POLICY_UNRECOGNIZED/);
  assert.throws(()=>enforcePlanPolicy({claims:[]},[],{unapprovedPolicy:'UNSAFE'}),/POLICY_UNRECOGNIZED/);
  assert.equal(Object.isFrozen(resolvePolicy()),true);
});

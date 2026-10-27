import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { sha256 } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { parseNodalCsv, planNodalTransfer, validateNodalTransfer }
  from '../tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js';

const row = values => values.map((x,i) => String(x).padStart(i?13:15)).join('');
const element = (from,to,pointer) => Array.from({length:15},(_,i) =>
  i===0 ? row([from,to,100,0,0,0]) :
  i===13 ? row([0,0,0,0,0,pointer]) : row([0,0,0,0,0,0]));
const name = (from,to) => '  '+from.padEnd(26)+to.padEnd(25);
function fixture() {
  return new Uint8Array(Buffer.from([
    '#$ VERSION',row([5,14,1252]),
    '#$ CONTROL',row([2,0,0,1,0,0]),
    '#$ ELEMENTS',...element(0,285,0),...element(285,290,1),
    '#$ NODENAME',name('PREVIOUS',''),
    '#$ BEND',row([1,2,3,4,5,6])
  ].join('\r\n')+'\r\n','ascii'));
}

test('F2-N0: physically present zero endpoint cannot receive a name',async()=>{
  const bytes=fixture(),before=Uint8Array.from(bytes);
  const plan=planNodalTransfer(parseCii(bytes),
    parseNodalCsv('Node,Replace\n0,ZERO-NAME\n000,ZERO-ALIAS\n285,RENAMED'));
  assert.equal(plan.records[0].status,'HELD');
  assert.equal(plan.records[0].reason,'FINDNODE_ZERO_RESERVED');
  assert.equal(plan.records[1].status,'HELD');
  assert.equal(plan.records[1].reason,'FINDNODE_ZERO_RESERVED');
  assert.equal(plan.records[2].status,'READY');
  const originalHash=await sha256(bytes);
  await assert.rejects(validateNodalTransfer({
    targetBytes:bytes,originalHash,plan,approvedIds:['N1']
  }),/NODAL_APPROVED_ROW_NOT_READY/);
  await assert.rejects(validateNodalTransfer({
    targetBytes:bytes,originalHash,plan,approvedIds:['N2']
  }),/NODAL_APPROVED_ROW_NOT_READY/);
  assert.deepEqual(bytes,before,'rejected assignments never alter TARGET0');
});

test('F2-N0: valid adjacent node still updates all occurrences',async()=>{
  const bytes=fixture(),originalHash=await sha256(bytes);
  const plan=planNodalTransfer(parseCii(bytes),
    parseNodalCsv('Node,Replace\n0,ZERO-NAME\n285,RENAMED'));
  assert.equal(plan.records[0].status,'HELD');
  assert.equal(plan.records[1].status,'READY');
  const output=await validateNodalTransfer({
    targetBytes:bytes,originalHash,plan,approvedIds:['N2']
  });
  const post=parseCii(output.bytes);
  assert.equal(post.elements[0].pointer,2);
  assert.equal(post.fields.filter(f=>f.before.trim()==='RENAMED').length,2);
  assert.equal(post.fields.filter(f=>f.before.trim()==='ZERO-NAME').length,0);
  assert.equal(await sha256(bytes),originalHash,'original bytes are unchanged');
});

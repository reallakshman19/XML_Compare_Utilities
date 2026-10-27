import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { sha256 } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { parseNodalCsv,planNodalTransfer,validateNodalTransfer } from '../tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js';

const row = values => values.map((v,i)=>String(v).padStart(i?13:15)).join('');
const elem = (from,to,pointer) => Array.from({length:15},(_,i)=>
  i===0 ? row([from,to,100,0,0,0]) : i===13 ? row([0,0,0,0,0,pointer]) :
  row([0,0,0,0,0,0]));
const nm = (from,to) => '  '+from.padEnd(26)+to.padEnd(25);
function fixture(opts={}) {
  const rows=[
    '#$ VERSION',row([5,14,1252]),
    '#$ CONTROL',row([4,0,0,2,0,0]),
    '#$ ELEMENTS',
    ...elem(280,285,opts.shared?1:1),...elem(285,290,opts.shared?1:2),
    ...elem(560,565,0),...elem(565,570,0),
    '#$ NODENAME',nm('','PS02393.1'),nm('PS02393.1',''),
    '#$ BEND',row([1,2,3,4,5,6])
  ];
  return new Uint8Array(Buffer.from(rows.join('\r\n')+'\r\n','ascii'));
}
const csv = 'Find (Info only),FindNode,ReplaceName\r\n'+
  'PS02393.1,285,SL-173.11\r\n'+
  ',565,PS-T1\r\n';

test('CSV supports required three columns and empty info with quoted fields',()=>{
  const rows=parseNodalCsv(csv);
  assert.deepEqual(rows.map(x=>[x.findInfo,x.findNode,x.replaceName]),
    [['PS02393.1','285','SL-173.11'],['','565','PS-T1']]);
  assert.equal(parseNodalCsv('Find,FindNode,ReplaceName\n"foo,bar",285,NAME')[0].findInfo,'foo,bar');
  assert.throws(()=>parseNodalCsv('Find,Replace\nx,z'),/HEADERS/);
});

test('node 285 renames aliases, node 565 adds two pointer/name records, all other bytes unchanged',async()=>{
  const source=fixture(),before=Buffer.from(source);
  const originalHash=await sha256(source);
  const plan=planNodalTransfer(parseCii(source),parseNodalCsv(csv));
  assert.equal(plan.counts.ready,2);
  assert.equal(plan.counts.newRecords,2);
  assert.equal(plan.records[0].writeFields,2);
  assert.equal(plan.records[1].createRecords,2);
  const result=await validateNodalTransfer({targetBytes:source,originalHash,plan,
    approvedIds:plan.records.map(r=>r.id)});
  assert.equal(result.insertedRecords,2);
  assert.equal(result.insertedBytes,110);
  const post=parseCii(result.bytes),original=parseCii(source);
  assert.equal(post.nonam,original.nonam+2);
  assert.deepEqual(post.elements.map(e=>e.pointer),[1,2,3,4]);
  assert.deepEqual(post.fields.filter(f=>f.before.trim()).map(f=>f.before.trim()),
    ['SL-173.11','SL-173.11','PS-T1','PS-T1']);
  assert.deepEqual(source,new Uint8Array(before),'TARGET0 cannot be modified');
  assert.equal(result.target1Hash,await sha256(result.bytes));
});

test('information mismatch never selects a different node',async()=>{
  const bytes=fixture(),rows=parseNodalCsv('Find,FindNode,ReplaceName\nWRONG,285,SL-173.11');
  const plan=planNodalTransfer(parseCii(bytes),rows);
  assert.equal(plan.records[0].status,'READY');
  assert.equal(plan.records[0].infoMismatch,true);
  const x=await validateNodalTransfer({targetBytes:bytes,originalHash:await sha256(bytes),
    plan,approvedIds:['N1']});
  assert.equal(parseCii(x.bytes).fields[1].before.trim(),'SL-173.11');
});

test('two renamed nodes on one pointer-zero element share a single appended NODENAME record',async()=>{
  const bytes=fixture();
  const rows=parseNodalCsv('Find,FindNode,ReplaceName\n,565,PS-T1\n,570,PS-T2');
  const plan=planNodalTransfer(parseCii(bytes),rows);
  assert.equal(plan.counts.newRecords,2,'only two zero-pointer elements are touched');
  const result=await validateNodalTransfer({targetBytes:bytes,originalHash:await sha256(bytes),
    plan,approvedIds:rows.map(r=>r.id)});
  const p=parseCii(result.bytes);
  assert.equal(result.insertedRecords,2);
  assert.equal(p.fields.filter(f=>f.pointer===4 && f.before.trim()).map(f=>f.before.trim()).join('|'),
    'PS-T1|PS-T2');
});

test('duplicates, unknown nodes, invalid-width names and reused existing names held',()=>{
  const parsed=parseCii(fixture());
  const rows=parseNodalCsv('Find,FindNode,ReplaceName\n'+
    ',565,PS-T1\n,565,PS-T2\n,0,INVALID\n,9999,UNKNOWN\n'+
    ',280,12345678901234567890123456\n,560,PS02393.1');
  const plan=planNodalTransfer(parsed,rows);
  assert.deepEqual(plan.records.map(r=>r.reason),[
    'DUPLICATE_NODE_WITH_COMPETING_NAMES','DUPLICATE_NODE_WITH_COMPETING_NAMES',
    'FINDNODE_NOT_IN_TARGET0','FINDNODE_NOT_IN_TARGET0',
    'REPLACENAME_INVALID_OR_EXCEEDS_25_CHARS','REPLACENAME_ALREADY_USED_BY_OTHER_NODE'
  ]);
});

test('assigning identical new name to different nodes holds both',()=>{
  const plan=planNodalTransfer(parseCii(fixture()),
    parseNodalCsv('Find,FindNode,ReplaceName\n,565,SAME\n,285,SAME'));
  assert(plan.records.every(r=>r.status==='HELD'&&r.reason==='NEW_DUPLICATE_NAME_ACROSS_NODES'));
});

test('shared physical NODENAME pointer holds writes and stale approvals are rejected',async()=>{
  const bytes=fixture({shared:true});
  const rows=parseNodalCsv('Find,FindNode,ReplaceName\n,285,NEW');
  const plan=planNodalTransfer(parseCii(bytes),rows);
  assert.equal(plan.records[0].reason,'SHARED_NODENAME_POINTER_NOT_SUPPORTED');
  await assert.rejects(validateNodalTransfer({targetBytes:bytes,
    originalHash:await sha256(bytes),plan,approvedIds:['N1']}),/NOT_READY/);
});

test('writer requires exact TARGET0 SHA and nonempty explicit approvals',async()=>{
  const bytes=fixture(),plan=planNodalTransfer(parseCii(bytes),parseNodalCsv(csv));
  await assert.rejects(validateNodalTransfer({
    targetBytes:bytes,originalHash:'a'.repeat(64),plan,approvedIds:['N1']}),/HASH_STALE/);
  await assert.rejects(validateNodalTransfer({
    targetBytes:bytes,originalHash:await sha256(bytes),plan,approvedIds:[]}),/APPROVAL_REQUIRED/);
});

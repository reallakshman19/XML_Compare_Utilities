import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseCii,scanLines} from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import {sha256} from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import {parseNodalCsv,planNodalTransfer,validateNodalTransfer}
  from '../tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js';

const row = values => values.map((v,i)=>String(v).padStart(i?13:15)).join('');
const element = pointer => Array.from({length:15},(_,i)=>
  i===0?row([280,285,100,0,0,0]):
    i===13?row([0,0,0,0,0,pointer]):row([0,0,0,0,0,0]));
const name = (from,to) => '  '+from.padEnd(26)+to.padEnd(25);
function fixture({names=null,after='BEND',pointer=0,eol='\r\n',finalEol=true}={}) {
  const lines=['#$ VERSION',row([5,14,1252]),
    '#$ CONTROL',row([1,0,0,names?.length||0,0,0]),
    '#$ ELEMENTS',...element(pointer),
    ...(names===null?[]:['#$ NODENAME',...names]),
    ...(after?['#$ '+after,row([1,2,3,4,5,6])]:[])];
  return new Uint8Array(Buffer.from(lines.join(eol)+(finalEol?eol:''),'ascii'));
}
async function write(original) {
  const parsed=parseCii(original);
  const plan=planNodalTransfer(parsed,parseNodalCsv('Node,Replace\n285,NEW'));
  assert.equal(plan.records[0].status,'READY');
  return validateNodalTransfer({targetBytes:original,
    originalHash:await sha256(original),plan,approvedIds:['N1']});
}
function assertOnlyStructuralEdits(original,result) {
  const lines=scanLines(original);
  const ctl=lines.findIndex(x=>x.text.trim()==='#$ CONTROL');
  const elm=lines.findIndex(x=>x.text.trim()==='#$ ELEMENTS');
  const anchor=lines.find(x=>x.text.trim()==='#$ BEND')?.start??original.length;
  const spans=[[lines[ctl+1].start+41,lines[ctl+1].start+54],
    [lines[elm+14].start+67,lines[elm+14].start+80]];
  const restored=new Uint8Array([
    ...result.bytes.subarray(0,anchor),
    ...result.bytes.subarray(anchor+result.insertedBytes)
  ]);
  assert.equal(restored.length,original.length);
  for(let i=0;i<original.length;i++) {
    if(spans.some(([a,b])=>i>=a&&i<b))continue;
    assert.equal(restored[i],original[i],'unapproved byte offset '+i);
  }
}

test('F2: absent NODENAME, immediate BEND anchor creates one section and record',async()=>{
  const original=fixture(),backup=Buffer.from(original);
  const result=await write(original),post=parseCii(result.bytes);
  assert.deepEqual(post.sections,['VERSION','CONTROL','ELEMENTS','NODENAME','BEND']);
  assert.equal(post.nonam,1);
  assert.equal(post.elements[0].pointer,1);
  assert.equal(post.fields.find(f=>f.fieldIdentity==='NODENAME.TO').before.trim(),'NEW');
  assert.equal(result.insertedRecords,1);
  assert.equal(result.insertedBytes,68);
  assertOnlyStructuralEdits(original,result);
  assert.deepEqual(Buffer.from(original),backup);
});

test('F2: terminal NODENAME allows in-place renaming with or without ending newline',async()=>{
  for(const finalEol of [true,false]){
    const original=fixture({names:[name('','OLD')],pointer:1,after:null,finalEol});
    const result=await write(original),post=parseCii(result.bytes);
    assert.equal(result.insertedRecords,0);
    assert.equal(result.insertedBytes,0);
    assert.equal(result.bytes.length,original.length);
    assert.equal(post.fields.find(f=>f.fieldIdentity==='NODENAME.TO').before.trim(),'NEW');
  }
});

test('F2: terminal NODENAME creates new pointer when line ending is known',async()=>{
  const original=fixture({names:[],after:null});
  const result=await write(original),post=parseCii(result.bytes);
  assert.equal(post.nonam,1);
  assert.equal(post.elements[0].pointer,1);
  assert.equal(result.insertedRecords,1);
  assert.equal(result.insertedBytes,55);
});

test('F2: insertion without a recognized immediate BEND boundary is held',async()=>{
  for(const after of ['REDUCERS',null]){
    const original=fixture({after});
    await assert.rejects(write(original),/NODAL_MISSING_NODENAME_ORDER_UNQUALIFIED/);
  }
});

test('F2: terminal NODENAME with no last line ending cannot append a record',async()=>{
  const original=fixture({names:[],after:null,finalEol:false});
  await assert.rejects(write(original),/NODAL_LINE_ENDING_UNSUPPORTED/);
});

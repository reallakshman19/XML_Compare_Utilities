import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexCiiV14} from '../tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/cii-index.js';
import {inspectElementPair} from '../tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/element.js';
import {inspectNodePair} from '../tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/node.js';

const row=values=>values.map((n,i)=>String(n).padStart(i?13:15)).join('');
const element=(from,to,restraint,temperature=200,pressure=30)=>Array.from({length:15},(_,i)=>
  i===0?row([from,to,0,0,0,0]):
  i===1?row([0,0,0,temperature,0,0]):
  i===3?row([pressure,0,0,0,0,0]):
  i===5?row([0,1.01,0,0,0,0]):
  i===12?row([0,0,0,restraint,0,0]):row([0,0,0,0,0,0]));
function fixture(options={}) {
  const {shared=false,missingMisc=false,badMarker=false,version=14}=options;
  const content=[
    '#$ VERSION',row([5,version,1252]),badMarker?'  #$ control':'#$ CONTROL',
    row([2,0,0,0,0,0]),row([0,0,0,1,0,0]),row([0,0,0,0,0,0]),row([0]),
    '#$ ELEMENTS',...element(400,500,1),...element(500,600,shared?1:0,180,20),
    '#$ RESTRANT',...Array.from({length:24},(_,i)=>i===0?row([500,1,0,0,0,0]):row([0,0,0,0,0,0]))
  ];
  if(!missingMisc)content.push('#$ MISCEL_1',row([1,1,0,0,0,0]));
  return Uint8Array.from(Buffer.from(content.join('\r\n')+'\r\n','ascii'));
}
test('two oriented FROM->TO elements meet at Node 500 without sharing process ownership',()=>{
  const d=indexCiiV14(fixture());
  assert.equal(d.elements.length,2);
  assert.deepEqual(d.byNode.get(500).incidents.map(e=>[e.from,e.to]),[[400,500],[500,600]]);
  assert.deepEqual(d.elements.map(e=>e.fields[1].typedNumber),[30,20]);
  assert.equal(d.miscRrmatRows,1);
});
test('Path A requires exact orientation and never infers SOURCE/TARGET identity',()=>{
  const d=indexCiiV14(fixture());
  const yes=inspectElementPair(null,d,{targetFrom:'400',targetTo:'500',sourceFrom:'',sourceTo:''});
  assert.equal(yes.target.entries.length,1);assert.equal(yes.writeEligible,false);
  const reverse=inspectElementPair(null,d,{targetFrom:'500',targetTo:'400',sourceFrom:'',sourceTo:''});
  assert.equal(reverse.target.entries.length,0);
  assert.equal(reverse.mapping,'UNVERIFIED_READ_ONLY');
});
test('Path B resolves exact restraint DOF and keeps adjacent rigid element ownership distinct',()=>{
  const d=indexCiiV14(fixture());
  const result=inspectNodePair(null,d,{targetNode:'500'});
  const r=result.target.occurrences.restraints;
  assert.equal(result.target.occurrences.incidents.length,2);
  assert.equal(r.length,1);assert.equal(r[0].node,500);
  assert.equal(r[0].ownerElement,1);assert.equal(r[0].pointer,1);
  assert.equal(r[0].slot,1);assert.equal(result.writeEligible,false);
});
test('invalid noncanonical section markers are rejected before property inspection',()=>{
  assert.throws(()=>indexCiiV14(fixture({badMarker:true})),/PROPERTY_NONCANONICAL_SECTION/);
});
test('shared RESTRANT auxiliary pointer is held, not silently assigned',()=>{
  assert.throws(()=>indexCiiV14(fixture({shared:true})),/PROPERTY_SHARED_POINTER_RESTRANT/);
});
test('incomplete MISCEL_1/RRMAT custody is rejected',()=>{
  assert.throws(()=>indexCiiV14(fixture({missingMisc:true})),/PROPERTY_MISC_RRMAT_TRUNCATED/);
});
test('unqualified V11 version is rejected rather than interpreted as V14',()=>{
  assert.throws(()=>indexCiiV14(fixture({version:11})),/PROPERTY_V14_ONLY/);
});
test('inspection does not change TARGET0 and exposes no writer',()=>{
  const original=fixture(),saved=Uint8Array.from(original),r=indexCiiV14(original);
  inspectNodePair(null,r,{targetNode:'500'});
  inspectElementPair(null,r,{targetFrom:'400',targetTo:'500'});
  assert.deepEqual(original,saved);assert.equal(r.readOnly,true);
});
test('new tab and source/served files retain existing VNext tabs',()=>{
  const h=readFileSync('docs/cii-fnr-vnext.html','utf8');
  for(const tab of ['NORMAL','NODAL','LINE_NODE','GEOMETRY','CIIFR_GEO','CONFIG','PROPERTY_TRANSFER'])
    assert.match(h,new RegExp('data-tab="'+tab+'"'));
  for(const p of ['app.js','property-transfer/cii-index.js',
    'property-transfer/element.js','property-transfer/node.js',
    'property-transfer/panel.js','property-transfer/style.css']){
    const root='tabs/cii-workspace/cii-fnr-vnext/ui/'+p;
    const docs='docs/tabs/cii-workspace/cii-fnr-vnext/ui/'+p;
    assert.deepEqual(readFileSync(root),readFileSync(docs),p+' mirror');
  }
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTestDom} from './helpers/vnext-dom-env.mjs';
import {makeDemoCii} from '../tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js';
import {indexCiiV14} from '../tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/cii-index.js';

const row=v=>v.map((x,i)=>String(x).padStart(i?13:15)).join('');
function fixture() {
  const element=(f,t,p)=>Array.from({length:15},(_,i)=>
    i===0?row([f,t,0,0,0,0]):i===12?row([0,0,0,p,0,0]):row([0,0,0,0,0,0]));
  return Buffer.from(['#$ VERSION',row([5,14,1252]),'#$ CONTROL',
    row([2,0,0,0,0,0]),row([0,0,0,1,0,0]),row([0,0,0,0,0,0]),row([0]),
    '#$ ELEMENTS',...element(400,500,1),...element(500,600,0),'#$ RESTRANT',
    ...Array.from({length:24},(_,i)=>row(i===0?[500,1,0,0,0,0]:[0,0,0,0,0,0])),
    '#$ MISCEL_1',row([1,1,0,0,0,0])].join('\r\n')+'\r\n','ascii');
}
function splice(input,section,card,field,value) {
  const lines=input.toString('ascii').split('\r\n');
  const start=lines.indexOf('#$ '+section)+1+card;
  const a=2+13*field,b=a+13;
  lines[start]=lines[start].slice(0,a)+String(value).padStart(13)+lines[start].slice(b);
  return Buffer.from(lines.join('\r\n'),'ascii');
}
const file=(bytes,name='synthetic.cii')=>({name,arrayBuffer:async()=>
  bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
let serial=0;
async function start() {
  const dom=createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?p1-repair='+ ++serial);
  return dom;
}
async function approvedNormal() {
  const dom=await start();
  dom.targetFile.files=[file(Buffer.from(makeDemoCii()))];
  await dom.targetFile.dispatchEvent({type:'change'});
  for(const [field,value] of [['find','OLD-A'],['replace','NEW-A']]) {
    const input=dom.root.querySelector('[data-field="'+field+'"]');
    input.value=value;await input.dispatchEvent({type:'input'});
  }
  await dom.btnRun.click();await dom.btnApproveAll.click();
  assert.equal(dom.tbodyProposals.children.length,1);
  assert.equal(dom.btnValidate.disabled,false);
  return dom;
}
async function propertyActivity(dom,bytes=fixture()) {
  await dom.tabProperty.click();
  dom.ptTargetFile.files=[file(bytes,'PROPERTY_TARGET.cii')];
  await dom.ptTargetFile.dispatchEvent({type:'change'});
  dom.ptSourceFile.files=[file(bytes,'PROPERTY_SOURCE.cii')];
  await dom.ptSourceFile.dispatchEvent({type:'change'});
  await dom.ptModeNode.click();await dom.ptModeElement.click();
}
const state=dom=>({claims:dom.tbodyProposals.children.length,
  decisions:dom.root.querySelectorAll('[data-decision]').map(e=>e.value),
  validate:dom.btnValidate.disabled,apply:dom.btnApply.disabled,export:dom.btnExport.disabled,
  hash:dom.root.querySelector('[data-hash1]').textContent});

test('F1 completed Normal approval, validation and apply survive independent Property activity',async()=>{
  for(const stage of ['approved','validated','applied']) {
    const dom=await approvedNormal();
    if(stage!=='approved')await dom.btnValidate.click();
    if(stage==='applied')await dom.btnApply.click();
    const before=state(dom);
    assert.equal(before.claims,1);
    if(stage!=='approved')assert.equal(before.apply,false);
    if(stage==='applied')assert.equal(before.export,false);
    await propertyActivity(dom);await dom.tabNormal.click();
    assert.deepEqual(state(dom),before,stage);
    // An actual edit to the owning rule must still revoke the retained authority.
    const input=dom.root.querySelector('[data-field="replace"]');
    input.value='NEW-B';await input.dispatchEvent({type:'input'});
    assert.equal(dom.tbodyProposals.children.length,0);
    assert.equal(dom.btnValidate.disabled,true);
    assert.equal(dom.btnApply.disabled,true);assert.equal(dom.btnExport.disabled,true);
  }
});
test('F1 actual shared TARGET/SOURCE/CSV changes still revoke preserved Normal state',async()=>{
  for(const key of ['targetFile','sourceFile','csvFile']) {
    const dom=await approvedNormal();
    await dom.btnValidate.click();await dom.btnApply.click();
    await propertyActivity(dom);await dom.tabNormal.click();
    assert.equal(dom.btnExport.disabled,false);
    dom[key].files=[key==='csvFile'?{name:'rules.csv',text:async()=>
      'Find,Replace\nOLD-A,NEW-C\n'}:file(Buffer.from(makeDemoCii()))];
    await dom[key].dispatchEvent({type:'change'});
    assert.equal(dom.btnValidate.disabled,true,key);
    assert.equal(dom.btnApply.disabled,true,key);assert.equal(dom.btnExport.disabled,true,key);
  }
});
test('F1 Property roundtrip cancels pending Normal validation without deleting approval',async()=>{
  const dom=await approvedNormal(),original=crypto.subtle.digest;
  let release;
  crypto.subtle.digest=function(...args) {
    return new Promise(resolve=>{release=()=>resolve(original.apply(this,args));});
  };
  let pending;
  try {
    pending=dom.btnValidate.click();
    await dom.tabProperty.click();await dom.tabNormal.click();
    release();await pending;
  } finally {crypto.subtle.digest=original;}
  assert.equal(dom.tbodyProposals.children.length,1);
  assert.equal(dom.btnValidate.disabled,false);assert.equal(dom.btnApply.disabled,true);
  await dom.btnValidate.click();assert.equal(dom.btnApply.disabled,false);
});
test('F1 the pre-existing Normal to Config navigation policy still revokes authority',async()=>{
  const dom=await approvedNormal();await dom.tabConfig.click();await dom.tabNormal.click();
  assert.equal(dom.tbodyProposals.children.length,0);
  assert.equal(dom.btnValidate.disabled,true);
});
test('F1 unchanged Nodal approved output survives Property, while target edits revoke it',async()=>{
  const dom=await start();await dom.tabNodal.click();
  const bytes=Buffer.from(makeDemoCii().replace(row([2,0,0,1,0,0]),row([1,0,0,1,0,0])));
  dom.targetFile.files=[file(bytes)];await dom.targetFile.dispatchEvent({type:'change'});
  dom.nodalElements.nodalCsv.files=[{name:'nodes.csv',text:async()=>
    'Find (Info only),FindNode,ReplaceName\nOLD-A,100,NODE-NEW\n'}];
  await dom.nodalElements.nodalCsv.dispatchEvent({type:'change'});
  for(const key of ['nodalPreview','nodalApproveAll','nodalValidate','nodalApply'])
    await dom.nodalElements[key].click();
  assert.equal(dom.nodalElements.nodalExport.disabled,false);
  const before=dom.nodalElements.nodalCount.textContent;
  await propertyActivity(dom);await dom.tabNodal.click();
  assert.equal(dom.nodalElements.nodalCount.textContent,before);
  assert.equal(dom.nodalElements.nodalExport.disabled,false);
  await dom.targetFile.dispatchEvent({type:'change'});
  assert.equal(dom.nodalElements.nodalExport.disabled,true);
  assert.equal(dom.nodalElements.nodalValidate.disabled,true);
});
test('F2 positive-node R0 rejects either negative endpoint and holds unqualified zero endpoints',()=>{
  for(const field of [0,1]) {
    assert.throws(()=>indexCiiV14(splice(fixture(),'ELEMENTS',0,field,-400)),
      /PROPERTY_ELEMENT_ENDPOINT_NEGATIVE/);
    assert.throws(()=>indexCiiV14(splice(fixture(),'ELEMENTS',0,field,0)),
      /PROPERTY_ELEMENT_ZERO_ENDPOINT_UNQUALIFIED/);
  }
});
test('F3 every typed element pointer is bounded against its own CONTROL count',()=>{
  const fields=[['BEND',12,0],['RIGID',12,1],['EXPJT',12,2],['RESTRANT',12,3],
    ['DISPLMNT',12,4],['FORCMNT',12,5],['UNIFORM',13,0],['WIND',13,1],
    ['OFFSETS',13,2],['ALLOWBLS',13,3],['SIF&TEES',13,4],['NODENAME',13,5],
    ['REDUCERS',14,0],['FLANGES',14,1],['EQUIPMNT',14,2]];
  for(const [family,card,field] of fields)for(const n of [-1,999]) {
    const expected=family==='NODENAME'?/NODENAME_POINTER_INVALID/:
      new RegExp('PROPERTY_POINTER_RANGE_'+family.replace('&','\\&'));
    assert.throws(()=>indexCiiV14(splice(fixture(),'ELEMENTS',card,field,n)),expected,family);
  }
});
test('F3 bounded populated BEND remains explicitly unqualified, with unchanged bytes',()=>{
  const bytes=splice(splice(fixture(),'CONTROL',1,0,1),'ELEMENTS',12,0,1);
  const before=Buffer.from(bytes),doc=indexCiiV14(bytes);
  assert.equal(doc.elements[0].pointers.BEND,1);
  assert.match(doc.qualification.pointerBounds,/ALL_ELEMENT_POINTERS/);
  const d=doc.diagnostics.find(d=>d.family==='BEND');
  assert.equal(d.classification,'UNKNOWN');assert.equal(d.count,1);
  assert.match(d.detail,/NOT_QUALIFIED/);assert.deepEqual(bytes,before);
});
test('F4 dormant restraint payload is UNKNOWN evidence, never a logical node or discarded bytes',()=>{
  const bytes=splice(fixture(),'RESTRANT',4,2,123),before=Buffer.from(bytes);
  const doc=indexCiiV14(bytes),d=doc.diagnostics.find(d=>d.code==='PROPERTY_RESTRAINT_DORMANT_RESIDUE');
  assert.equal(d.classification,'UNKNOWN');assert.equal(d.ownerElement,1);
  assert.equal(d.pointer,1);assert.equal(d.slot,2);
  assert.match(d.rawCards.join('\n'),/123/);
  assert.match(bytes.subarray(d.byteStart,d.byteEnd).toString('ascii'),/123/);
  assert.equal(doc.byNode.has(0),false);
  assert.equal(doc.byNode.get(500).restraints.length,1);
  assert.deepEqual(bytes,before);assert.equal(doc.readOnly,true);
});
test('F4 zero spellings do not fabricate residue; unparsed text is preserved as UNKNOWN',()=>{
  const zero=indexCiiV14(splice(fixture(),'RESTRANT',4,2,'-0.0D+04'));
  assert.equal(zero.diagnostics.length,0);
  const text=indexCiiV14(splice(fixture(),'RESTRANT',7,0,'TAG?'));
  assert.match(text.diagnostics[0].rawCards.join('\n'),/TAG\?/);
  assert.equal(text.diagnostics[0].classification,'UNKNOWN');
  const tiny=indexCiiV14(splice(fixture(),'RESTRANT',4,2,'1D-999'));
  assert.match(tiny.diagnostics[0].rawCards.join('\n'),/1D-999/);
});
const contents=el=>[el.textContent,...el.children.map(contents)].join(' ');
test('F3/F4 UNKNOWN diagnostics and raw restraint evidence are visible on intake and in either mode',async()=>{
  let bytes=splice(fixture(),'RESTRANT',4,2,123);
  bytes=splice(splice(bytes,'CONTROL',1,0,1),'ELEMENTS',12,0,1);
  const dom=await start();await propertyActivity(dom,bytes);
  for(const button of [dom.ptModeElement,dom.ptModeNode]) {
    await button.click();
    const display=contents(dom.ptResults);
    assert.match(display,/UNKNOWN/);assert.match(display,/BEND/);
    assert.match(display,/RESTRAINT_DORMANT_RESIDUE/);assert.match(display,/123/);
    assert.match(display,/Slot 2/);assert.match(display,/bytes/);
  }
  assert.match(dom.ptStatus.textContent,/UNKNOWN/);
});

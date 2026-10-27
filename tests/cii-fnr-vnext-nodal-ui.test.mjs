import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestDom } from './helpers/vnext-dom-env.mjs';

const row = v=>v.map((x,i)=>String(x).padStart(i?13:15)).join('');
const element=(f,t,p)=>Array.from({length:15},(_,i)=>
  i===0?row([f,t,100,0,0,0]):i===13?row([0,0,0,0,0,p]):row([0,0,0,0,0,0]));
const name=(f,t)=>'  '+f.padEnd(26)+t.padEnd(25);
const fileBytes=()=>new Uint8Array(Buffer.from([
  '#$ VERSION',row([5,14,1252]),
  '#$ CONTROL',row([4,0,0,2,0,0]),'#$ ELEMENTS',
  ...element(280,285,1),...element(285,290,2),
  ...element(560,565,0),...element(565,570,0),
  '#$ NODENAME',name('','ORIGINAL'),name('ORIGINAL',''),'#$ BEND'
].join('\r\n')+'\r\n','ascii'));

test('new tab: exact 3-column CSV, structural preview, explicit approvals, validation/export gates',async()=>{
  const dom=createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?nodal-ui-test='+Date.now());
  await dom.tabNodal.click();
  assert.equal(dom.root.querySelector('[data-nodal-area]').hidden,false);
  assert.equal(dom.root.querySelector('[data-normal-section]').hidden,true);
  const bytes=fileBytes();
  dom.targetFile.files=[{name:'synthetic.cii',
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];
  await dom.targetFile.dispatchEvent({type:'change',target:dom.targetFile});
  dom.nodalElements.nodalCsv.files=[{name:'transfer.csv',text:async()=>
    'Find (Info only),FindNode,ReplaceName\nORIGINAL,285,RENAMED\n,565,PS-T1\n'}];
  await dom.nodalElements.nodalCsv.dispatchEvent({type:'change',target:dom.nodalElements.nodalCsv});
  await dom.nodalElements.nodalPreview.click();
  assert.match(dom.nodalElements.nodalCount.textContent,/2 ready/);
  assert.match(dom.nodalElements.nodalCount.textContent,/2 new record/);
  assert.equal(dom.nodalElements.nodalValidate.disabled,true);
  await dom.nodalElements.nodalApproveAll.click();
  assert.equal(dom.nodalElements.nodalValidate.disabled,false);
  assert.equal(dom.nodalElements.nodalExport.disabled,true);
  await dom.nodalElements.nodalValidate.click();
  assert.equal(dom.nodalElements.nodalApply.disabled,false);
  assert.equal(dom.nodalElements.nodalExport.disabled,true);
  await dom.nodalElements.nodalApply.click();
  assert.equal(dom.nodalElements.nodalExport.disabled,false);
  assert.match(dom.nodalElements.nodalStatus.textContent,/Original TARGET0 is never overwritten|original TARGET0 unchanged/);
  // A new TARGET0 selection revokes every structural plan, approval, and output.
  await dom.targetFile.dispatchEvent({type:'change',target:dom.targetFile});
  assert.equal(dom.nodalElements.nodalExport.disabled,true);
  assert.equal(dom.nodalElements.nodalValidate.disabled,true);
  assert.equal(dom.nodalElements.nodalRows.children.length,2);
});

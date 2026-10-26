import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedGeometryObjects} from '../view.js';
import {setupReviewViewport} from '../review-viewport.js';
import {createGeoViewerBridge} from '../geo-viewer-bridge.js';
import {geometrySceneBinding} from '../geo-scene.js';

test('row highlights every alternative and reused SOURCE; segment interior stays ELEMENT-only', () => {
  const item=(side,nodeId,sourceRows,kind='NODE')=>({objectId:side+nodeId,side,nodeId,sourceRows,kind});
  const objects=[item('SOURCE','1',['1']),item('SOURCE','2',['2']),item('TARGET','9',['1','2']),
    item('TARGET','10',['1']),item('TARGET','segment',['1'],'ELEMENT')];
  const r={viewerScene:{objects:Object.fromEntries(objects.map(o=>[o.objectId,o]))}};
  assert.deepEqual(selectedGeometryObjects(r,['1']),['SOURCE1','TARGET9','TARGET10']);
  assert.deepEqual(selectedGeometryObjects(r,['1','2']),['SOURCE1','SOURCE2','TARGET9','TARGET10']);
  assert.deepEqual(selectedGeometryObjects(r,[]),[]);
  assert.deepEqual(selectedGeometryObjects(r,[],{objectId:'TARGETsegment'}),['TARGETsegment']);
});

function shell() {
  const elements=new Map(), events={};
  const el=id=>elements.get(id)||elements.set(id,{id,hidden:false,style:{},listeners:{},attrs:{},
    classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k);}},
    addEventListener(k,f){this.listeners[k]=f;},setAttribute(k,v){this.attrs[k]=v;},focus(){},
    getBoundingClientRect(){return {left:20,top:100,width:id==='review-surface'?1200:800,height:700};},
    setPointerCapture(){}}).get(id);
  const doc={body:el('body'),addEventListener:(k,f)=>events[k]=f};
  const api=setupReviewViewport({byId:el,documentRef:doc});
  return {el,doc,api,events,click:id=>el(id).listeners.click()};
}
test('fullscreen popup keeps the original table, closes/reopens and resets drag offsets on reentry',()=>{
  const h=shell(), table=h.el('ledger-panel');
  h.click('toggle-fullscreen');assert.equal(h.api.isExpanded(),true);
  assert.equal(h.el('ledger-panel'),table,'same ledger identity, no cloned rows or competing handler');
  assert.equal(table.hidden,false);h.click('close-ledger');assert.equal(table.hidden,true);
  h.click('show-ledger');assert.equal(table.hidden,false);
  const handle=h.el('ledger-handle');
  handle.listeners.pointerdown({button:0,target:{closest:()=>null},clientX:20,clientY:100,pointerId:1,preventDefault(){}});
  handle.listeners.pointermove({clientX:40,clientY:120});assert.equal(table.style.left,'20px','surface-local drag excludes the viewport offset');
  h.events.keydown({key:'Escape'});assert.equal(h.api.isExpanded(),false);assert.equal(table.hidden,false);
  h.click('toggle-fullscreen');assert.equal(table.style.right,'auto');assert.equal(table.style.left,'8px','reentry clamps into its local surface');
});
test('native fullscreen rejection keeps viewport expansion usable and native Escape restores normal',async()=>{
  const h=shell();h.el('review-surface').requestFullscreen=async()=>{throw Error('unavailable');};
  h.click('toggle-fullscreen');await Promise.resolve();assert.equal(h.api.isExpanded(),true);
  h.click('toggle-fullscreen');
  h.el('review-surface').requestFullscreen=async()=>{h.doc.fullscreenElement=h.el('review-surface');};
  h.click('toggle-fullscreen');await Promise.resolve();
  h.doc.fullscreenElement=null;h.events.fullscreenchange();assert.equal(h.api.isExpanded(),false);
});

test('bridge dispatches all selected instances and exposes camera/navigation commands only for current scene',async()=>{
  const context={epoch:1,projection:'XZ',source:{member:'s',sha256:'a'.repeat(64)},target:{member:'t',sha256:'b'.repeat(64)},
    transform:{sourceComponent:0,targetComponent:0,anchors:[],rotation:[],translation:[]},candidates:{tolerance:{x:1},snapshot:'a'}};
  const scene={contract:'CIIFR.GeometryDisplaySnapshot.v1',binding:geometrySceneBinding(context),models:{},objects:{}};
  context.viewerScene=scene;const calls=[];
  const instance=Object.fromEntries(['setModels','setMode','fitAll','toggleCameraType','setStandardView','setSelection',
    'updateObjects','fitSelection','setPivotToSelection','previousView','zoomBy','orbitBy','dispose'].map(name=>
    [name,(...args)=>calls.push([name,...args])]));
  instance.getStateSnapshot=()=>({runtimeRevision:1});
  const bridge=createGeoViewerBridge({host:{replaceChildren(){}},session:{current:()=>context},
    makeViewer:async()=>instance,onSelect(){},onError(){}});
  await bridge.enable();calls.length=0;
  bridge.setSelection('S1',['T1','T2']);
  assert.deepEqual(calls,[['setSelection','S1',['T1','T2']]],'one native selection call; engine already refreshes colours');
  bridge.command('fit-selection');bridge.command('view','left');bridge.command('zoom',0.8);
  bridge.command('orbit',[0.2,0]);bridge.command('pivot');bridge.command('previous');bridge.command('projection');
  assert.deepEqual(calls.slice(1),[['fitSelection'],['setStandardView','left'],['zoomBy',0.8],
    ['orbitBy',0.2,0],['setPivotToSelection'],['previousView'],['toggleCameraType']]);
  context.epoch++;const before=calls.length;bridge.setSelection('stale');bridge.command('fit');
  assert.equal(calls.length,before,'revoked scene cannot receive new display commands');
});

test('rejected native fullscreen exit stays expanded, resolves safely, and Escape can recover',async()=>{
  const h=shell(), surface=h.el('review-surface');
  surface.requestFullscreen=async()=>{h.doc.fullscreenElement=surface;};
  h.doc.exitFullscreen=async()=>{throw Error('controlled exit rejection');};
  h.click('toggle-fullscreen');await Promise.resolve();
  h.click('toggle-fullscreen');await Promise.resolve();
  assert.equal(h.doc.fullscreenElement,surface);assert.equal(h.api.isExpanded(),true);
  assert.equal(h.el('toggle-fullscreen').attrs['aria-pressed'],'true');
  assert.equal(h.el('ledger-panel').hidden,false);
  assert.match(h.el('toggle-fullscreen').textContent,/Esc/);
  h.doc.fullscreenElement=null;h.events.fullscreenchange();
  assert.equal(h.api.isExpanded(),false);assert.equal(h.el('toggle-fullscreen').attrs['aria-pressed'],'false');
});

test('cancelled pending native entry and refused auto-exit restore honest fullscreen state',async()=>{
  const h=shell(), surface=h.el('review-surface');let finish;
  surface.requestFullscreen=()=>new Promise(resolve=>{finish=()=>{h.doc.fullscreenElement=surface;resolve();};});
  h.doc.exitFullscreen=async()=>{throw Error('late native exit refusal');};
  h.click('toggle-fullscreen');assert.equal(h.api.isExpanded(),true);
  h.click('toggle-fullscreen');assert.equal(h.api.isExpanded(),false);
  finish();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(h.doc.fullscreenElement,surface);assert.equal(h.api.isExpanded(),true);
  assert.equal(h.el('toggle-fullscreen').attrs['aria-pressed'],'true');
  assert.match(h.el('toggle-fullscreen').textContent,/Esc/);
  h.doc.fullscreenElement=null;h.events.fullscreenchange();assert.equal(h.api.isExpanded(),false);
});

import {cameraPresentation} from '../camera-presentation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {createGeoViewerBridge} from '../geo-viewer-bridge.js';
import {createPreviewSession} from '../compare.js';
import {createGeometryWorkbench} from '../workbench.js';
import {exportWorkbench} from '../workbench-export.js';
import {readXmlGraph} from '../xml-intake.js';
import {exportPreview} from '../evidence.js';
import {selectedGeometryObjects} from '../view.js';
import {setupReviewViewport} from '../review-viewport.js';

if (!process.env.CIIFR_TEST_RUNTIME) throw Error('CIIFR_TEST_RUNTIME is required');
if (!vm.SourceTextModule) throw Error('Use --experimental-vm-modules: test must exercise the actual app.js module');
const {DOMParser} = createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json')('@xmldom/xmldom');
const xml = ['S1-F05.xml','S1-R4.xml'].map(name =>
  new Uint8Array(readFileSync(new URL('./fixtures/' + name, import.meta.url))));
const appSource = readFileSync(process.env.CIIFR_APP_UNDER_TEST || new URL('../app.js', import.meta.url),'utf8');

async function harness() {
  const session = createPreviewSession({read:(bytes,options) => readXmlGraph(bytes, {
    ...options,cryptoRef:webcrypto,
    parser:new DOMParser({onError:(level,message)=> {throw Error(level+':'+message);}}),
  })});
  await session.load('SOURCE',xml[0],'S1-F05.xml');
  await session.load('TARGET',xml[1],'S1-R4.xml');
  for (const n of ['3790','3830','3840']) session.addAnchor(n,n);
  const workbench = createGeometryWorkbench();
  workbench.tabs.A.session = session;
  const elements = new Map(), pending = new Map(), disposed = [], buttons = ["json","csv","svg"]
    .map(kind=>({dataset:{export:kind},disabled:true,addEventListener(){}}));
  const el = id => elements.get(id) || elements.set(id,{id,hidden:false,disabled:false,textContent:'',
    value:id==='projection'?'XZ':id==='viewer-layout'?'overlay':id==='vertical-axis'?'Z':'100',listeners:{},
    style:{},setAttribute(){},focus(){},getBoundingClientRect(){return {left:20,top:100,width:id==='review-surface'?1200:800,height:700};},classList:{toggle(){}},replaceChildren(){},addEventListener(k,f){this.listeners[k]=f;}}).get(id);
  const comparisonButtons=['A','B','C'].map(tab=>Object.assign(el('tab-'+tab),{dataset:{comparison:tab}}));
  let bridge, calls = 0, rowSelect = null, highlighted = [], dispatches = 0;
  const makeViewer = async () => {
    const id=++calls;
    await new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));
    return {setModels(){},setMode(){},fitAll(){},getStateSnapshot(){return {runtimeRevision:1};},
      toggleCameraType(){},setStandardView(){},setSelection(id,related){highlighted=[id,...related];dispatches++;},dispose(){disposed.push(id);}};
  };
  const context=vm.createContext({document:{getElementById:el,querySelectorAll:selector=>selector==='[data-export]'?buttons:selector==='[data-comparison]'?comparisonButtons:[],addEventListener(){},body:{classList:{toggle(){}}}},
    window:{addEventListener(){}},console,setTimeout});
  const modules={
    './camera-presentation.js':{cameraPresentation},
    './workbench.js':{createGeometryWorkbench:()=>workbench}, './workbench-export.js':{exportWorkbench},
    './multibase-view.js':{renderWorkbenchRows(_wb,_body,actions){rowSelect=actions.onSelect;},workbenchSummary(){return ''; }},
    './review-viewport.js':{setupReviewViewport},
    './view.js':{selectedGeometryObjects,graphInfo(){},renderAnchors(){},readableSelection(){return '';},selectedDetails(){return '';},mountScene(){return {}; }},
    './geo-viewer-bridge.js':{createGeoViewerBridge:opts => bridge=createGeoViewerBridge({...opts,makeViewer})},
  };
  const app=new vm.SourceTextModule(appSource,{context});
  await app.link(spec => {const exports=modules[spec];
    assert(exports, 'unexpected import in actual app ' + spec);
    return new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v] of Object.entries(exports)) this.setExport(k,v);},{context});
  });
  await app.evaluate();
  const run = (projection='XZ') => {el('projection').value=projection;
    if(projection!=='XZ') el('projection').listeners.input();
    el('run').listeners.click();};
  const start = () => el('toggle-gpu').listeners.click();
  const resume = id => {assert(pending.has(id), 'expected pending viewer '+id); pending.get(id).resolve();};
  const fail = id => {assert(pending.has(id), 'expected pending viewer '+id); pending.get(id).reject(Error('controlled obsolete failure '+id));};
  const exportsNow = () => ['json','csv','svg'].map(kind => exportPreview(session,kind));
  const state = () => ({active:bridge.isActive(),disposed:[...disposed],
    viewerHidden:el('gpu-host').hidden,svgHidden:el('svg-layer').hidden,
    label:el('toggle-gpu').textContent, toggleDisabled:el('toggle-gpu').disabled,
    layoutDisabled:el('viewer-layout').disabled,status:el('status').textContent,
    projection:session.current().projection,cameraState:el('camera-state').textContent});
  const releaseAll=()=>{for(const item of pending.values())item.resolve();};
  return {run,start,resume,fail,state,exportsNow,releaseAll,selectRow:id=>rowSelect(id),highlighted:()=>highlighted,dispatches:()=>dispatches,expand:()=>el('toggle-fullscreen').listeners.click(),
    changeProjection:value=>{el('projection').value=value;el('projection').listeners.input();},
    switchBase:tab=>comparisonButtons.find(button=>button.dataset.comparison===tab).listeners.click()};
}
function activeB(state, expectedDisposed = [1]) {
  assert.equal(state.active,true,'obsolete A must not dispose active B');
  assert.deepEqual(state.disposed,expectedDisposed,'only obsolete viewer A may be disposed');
  assert.equal(state.svgHidden,true,'B viewer remains visible');
  assert.equal(state.viewerHidden,false);
  assert.equal(state.label,'Use SVG viewer');
  assert.equal(state.toggleDisabled,false,'B success owns enabled switch');
  assert.equal(state.layoutDisabled,false,'B success owns layout');
  assert.equal(state.projection,'XY');
}
function pendingB(state,disposedExpected) {
  assert.equal(state.active,false);
  assert.deepEqual(state.disposed,disposedExpected,'only the obsolete A instance may have been disposed');
  assert.equal(state.toggleDisabled,true,'A finally cannot unlock B loading control');
  assert.equal(state.viewerHidden,false,'A error cannot hide current B loading host');
  assert.equal(state.projection,'XY');
}

for (const order of ['new-before-old','fifo-same-turn']) {
  test('actual app F1: '+order+' keeps B active after obsolete A completion', async () => {
    const h=await harness();h.run();const a=h.start();h.run('XY');const b=h.start();
    if(order==='new-before-old') {
      h.resume(2);await b;const bytes=h.exportsNow();
      assert.equal(h.state().active,true);assert.deepEqual(h.state().disposed,[]); // B ready before A finishes
      h.resume(1);await a;activeB(h.state());assert.deepEqual(h.exportsNow(),bytes);
    }else{
      h.resume(1);h.resume(2);await Promise.all([a,b]);activeB(h.state());
    }
  });
}
test('actual app F1: obsolete A rejection after B success leaves B and status intact',async()=>{
  const h=await harness();h.run();const a=h.start();h.run('XY');const b=h.start();
  h.resume(2);await b;const before=h.state(),bytes=h.exportsNow();
  h.fail(1);await a;activeB(h.state(),[]);
  assert.equal(h.state().status,before.status,'stale error cannot overwrite B status');
  assert.deepEqual(h.exportsNow(),bytes);
});
for(const operation of ['resolve','reject']) {
  test('actual app F1: obsolete A '+operation+' cannot change pending B or finally control',async()=>{
    const h=await harness();h.run();const a=h.start();h.run('XY');const b=h.start();
    const statusBefore=h.state().status;
    h[operation==='resolve'?'resume':'fail'](1);await a;
    const state=h.state();pendingB(state,operation==='resolve'?[1]:[]);
    assert.equal(state.status,statusBefore,'stale A cannot overwrite pending B status');
    h.resume(2);await b;
    assert.equal(h.state().active,true);
    assert.deepEqual(h.state().disposed,operation==='resolve'?[1]:[]);
    assert.equal(h.state().label,'Use SVG viewer');
  });
}
test('actual app F1 control: current B failed startup restores SVG and control',async()=>{
  const h=await harness();h.run();const a=h.start();h.fail(1);await a;
  const state=h.state();assert.equal(state.active,false);
  assert.equal(state.viewerHidden,true);
  assert.equal(state.svgHidden,false);
  assert.equal(state.toggleDisabled,false);
  assert.equal(state.label,'Use existing 3D viewer');
  assert.match(state.status,/3D viewer unavailable/);
});

test('actual app: row selects SOURCE and TARGET physical nodes before and after fullscreen',async()=>{
  const h=await harness();h.run();const started=h.start();h.resume(1);await started;
  h.selectRow('3790');
  const selected=h.highlighted().map(id=>JSON.parse(id));
  assert.deepEqual(selected.map(parts=>[parts[0],parts[3],parts[4]]),
    [['SOURCE','NODE','3790'],['TARGET','NODE','3790']]);
  assert(h.dispatches()>0,'linked selection reaches the native viewer');
  h.expand();h.selectRow('3830');
  assert.deepEqual(h.highlighted().map(id=>{const a=JSON.parse(id);return [a[0],a[3],a[4]];}),
    [['SOURCE','NODE','3830'],['TARGET','NODE','3830']]);
  h.expand();h.selectRow('3790');
  assert.deepEqual(h.highlighted().map(id=>JSON.parse(id)[4]),['3790','3790']);
});

test('actual app SVG camera badge follows the current evidence projection',async()=>{
  const h=await harness();h.run();
  h.changeProjection('ISO');assert.equal(h.state().cameraState,'SVG evidence view · ISO');
  h.changeProjection('YZ');assert.equal(h.state().cameraState,'SVG evidence view · YZ');
});
test('actual app SVG camera badge follows each base saved projection',async()=>{
  const h=await harness();h.run();h.changeProjection('ISO');
  h.switchBase('B');assert.equal(h.state().cameraState,'SVG evidence view · XZ');
  h.changeProjection('XY');assert.equal(h.state().cameraState,'SVG evidence view · XY');
  h.switchBase('A');assert.equal(h.state().cameraState,'SVG evidence view · ISO');
  h.switchBase('C');assert.equal(h.state().cameraState,'SVG evidence view · XZ');
});

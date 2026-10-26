import {cameraPresentation} from '../camera-presentation.js';
import vm from 'node:vm';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {buildXmlGraph} from '../xml-graph.js';
import {createPreviewSession} from '../compare.js';
import {createGeometryWorkbench} from '../workbench.js';
import {exportWorkbench} from '../workbench-export.js';
import {createGeoViewerBridge} from '../geo-viewer-bridge.js';
import {setupReviewViewport} from '../review-viewport.js';
import {mountScene,selectedGeometryObjects,selectedDetails,readableSelection} from '../view.js';
import {exportPreview} from '../evidence.js';
const {DOMParser}=createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json')('@xmldom/xmldom');
test('unlinked physical TARGET stays highlighted in normal/fullscreen SVG and GPU dispatch',async()=>{
const graph=(side,a,b,length)=>buildXmlGraph({elements:[{index:0,from:a,to:b,delta:[length,0,0],od:100,wall:5,witness:side+' physical element'}],
 seeds:[],profile:'REVIEW_SYNTHETIC_MM',units:{length:'mm'},claimedCii:{status:'NOT_PRESENT'}},
 {member:side+':math',sha256:(side==='SOURCE'?'a':'b').repeat(64),byteLength:1});
const source=graph('SOURCE','1','2',5),target=graph('TARGET','101','102',10);
const session=createPreviewSession({read:async(_,o)=>o.member.startsWith('SOURCE')?source:target});
await session.load('SOURCE',new Uint8Array([1]),'math');await session.load('TARGET',new Uint8Array([2]),'math');session.addAnchor('1','101');
const workbench=createGeometryWorkbench();workbench.tabs.A.session=session;
const elements=new Map(),svgNodes=[],svgEvents=new Map();let bridge,selectedGpu=[];
const el=id=>{
 if(elements.has(id))return elements.get(id);
 const e={id,hidden:false,style:{},listeners:{},attrs:{},value:id==='projection'?'XY':id==='viewer-layout'?'overlay':id==='vertical-axis'?'Z':'.001',
  classList:{values:new Set(),toggle(k,v){v?this.values.add(k):this.values.delete(k);}},setAttribute(k,v){this.attrs[k]=v;},focus(){},
  addEventListener(k,f){this.listeners[k]=f;},replaceChildren(){},querySelector:()=>svg,
  getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})};
 if(id==='svg-layer')Object.defineProperty(e,'innerHTML',{set(html){
  const parsed=new DOMParser().parseFromString(html,'image/svg+xml');svgNodes.length=0;
  for(const g of Array.from(parsed.getElementsByTagName('g'))){if(!g.hasAttribute('data-node'))continue;
   svgNodes.push({dataset:{node:g.getAttribute('data-node'),kind:g.getAttribute('data-kind')},attrs:{},
    classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},closest(selector){return selector==='[data-node]'?this:null;}});
  }
 }});
 elements.set(id,e);return e;
};
const svg={querySelectorAll:()=>svgNodes,addEventListener:(k,f)=>svgEvents.set(k,f),setAttribute(){}};
const doc={getElementById:el,querySelectorAll:()=>[],addEventListener(){},body:el('body')};
const context=vm.createContext({document:doc,window:{addEventListener(){}},console,setTimeout});
const fakeViewer={setModels(){},setMode(){},fitAll(){},toggleCameraType(){},setStandardView(){},getStateSnapshot:()=>({runtimeRevision:1}),
 setSelection(id,related){selectedGpu=[id,...related];},updateObjects(){},dispose(){}};
const modules={
    './camera-presentation.js':{cameraPresentation},
 './workbench.js':{createGeometryWorkbench:()=>workbench},'./workbench-export.js':{exportWorkbench},'./review-viewport.js':{setupReviewViewport},
 './multibase-view.js':{renderWorkbenchRows(){},workbenchSummary(){return ''; }},
 './view.js':{selectedGeometryObjects,selectedDetails,readableSelection,mountScene,graphInfo(){},renderAnchors(){}},
 './geo-viewer-bridge.js':{createGeoViewerBridge:opts=>bridge=createGeoViewerBridge({...opts,makeViewer:async()=>fakeViewer})},
};
const app=new vm.SourceTextModule(readFileSync(process.env.CIIFR_APP_UNDER_TEST || new URL('../app.js',import.meta.url),'utf8'),{context});
await app.link(spec=>{const e=modules[spec];return new vm.SyntheticModule(Object.keys(e),function(){for(const[k,v]of Object.entries(e))this.setExport(k,v);},{context});});await app.evaluate();
for (const axis of ['x','y','z']) el('tol-'+axis).value='.001';
el('run').listeners.click();
const physical=Object.values(session.current().viewerScene.objects).find(o=>o.kind==='NODE'&&o.side==='TARGET'&&o.nodeId==='102');
assert(physical);assert.deepEqual(physical.sourceRows,[]);
el('node-side').value='TARGET';el('node-id').value='102';el('select-node').listeners.click();
let node=svgNodes.find(n=>n.dataset.kind==='TARGET'&&n.dataset.node==='102');
console.log('NORMAL_SVG',{selectedPhysical:JSON.parse(el('technical-details').textContent).selection.objectId,ariaPressed:node.attrs['aria-pressed']});
assert.equal(node.attrs['aria-pressed'],'true');assert.match(el('details').textContent,/TARGET NODE 102/);
el('toggle-fullscreen').listeners.click();el('select-node').listeners.click();
node=svgNodes.find(n=>n.dataset.kind==='TARGET'&&n.dataset.node==='102');
console.log('FULLSCREEN_SVG',{ariaPressed:node.attrs['aria-pressed']});assert.equal(node.attrs['aria-pressed'],'true');
svgEvents.get('click')({target:node});
node=svgNodes.find(n=>n.dataset.kind==='TARGET'&&n.dataset.node==='102');
assert.equal(node.attrs['aria-pressed'],'true','actual SVG click preserves unlinked physical TARGET');
svgEvents.get('keydown')({target:node,key:'Enter',preventDefault(){}});
node=svgNodes.find(n=>n.dataset.kind==='TARGET'&&n.dataset.node==='102');
assert.equal(node.attrs['aria-pressed'],'true','actual SVG keyboard pick preserves unlinked physical TARGET');
await el('toggle-gpu').listeners.click();
console.log('GPU_DISPATCH',{selectedGpu});assert.deepEqual(selectedGpu,[physical.objectId]);
});

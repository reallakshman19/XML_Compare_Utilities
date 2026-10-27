import {createGeometryWorkbench} from './workbench.js';
import {exportWorkbench} from './workbench-export.js';
import {renderWorkbenchRows,workbenchSummary} from './multibase-view.js';
import {graphInfo,renderAnchors,selectedDetails,readableSelection,mountScene,selectedGeometryObjects} from './view.js';
import {createGeoViewerBridge} from './geo-viewer-bridge.js';
import {setupReviewViewport} from './review-viewport.js';
import {cameraPresentation} from './camera-presentation.js';

const wb=createGeometryWorkbench(), byId=id=>document.getElementById(id);
setupReviewViewport({byId,documentRef:document});
let viewport=null,gpuRequested=false,viewerRequest=0,resolutionRequest=0,sampleRequest=0;
const loadRequests={A:{SOURCE:0,TARGET:0},B:{SOURCE:0,TARGET:0}};
const status=(message,error=false)=>{byId('status').textContent=message;byId('status').classList.toggle('error',error);};
const bridge=createGeoViewerBridge({host:byId('gpu-host'),session:wb,
  onSelect:pick=>select(pick.sourceRows,pick.kind==='ELEMENT'?pick.side+':'+pick.elementIndex:null,pick),
  onCameraState:state=>{
    if (!state) return;
    const presentation=cameraPresentation(state);
    byId('camera-view').value=presentation.preset;
    byId('camera-state').textContent=presentation.label;
  },onError:error=>{disableGpu();status('3D viewer: '+error.message,true);}});
function disableGpu() {
  if (bridge.isActive()) wb.entry.camera=bridge.getCameraState();
  viewerRequest++;gpuRequested=false;bridge.disable();byId('gpu-host').hidden=true;byId('svg-layer').hidden=false;
  byId('toggle-gpu').textContent='Use existing 3D viewer';byId('viewer-layout').disabled=true;
  byId('camera-state').textContent='SVG evidence view · '+wb.state.projection;
}
function exportControls(enabled) {
  document.querySelectorAll('[data-export]').forEach(button=>{button.disabled=!enabled;});
  byId('toggle-gpu').disabled=!enabled;
}
function clearView() {
  if (viewport?.getState) wb.entry.svgViewBox=viewport.getState();
  disableGpu();viewport=null;exportControls(false);byId('svg-layer').replaceChildren();
  byId('rows').replaceChildren();byId('details').textContent='Select a current physical NODE pair.';
  byId('technical-details').textContent='';byId('summary').textContent='';
}
const actions={onSelect:select,onEdit:(source,changes)=>{
  disableGpu();wb.editProposal(source,changes);render();
},onPin:(group,pair)=>{disableGpu();wb.pin(group,pair);void consolidate();}};
function controls() {
  if (!bridge.isActive()) byId('camera-state').textContent='SVG evidence view · '+wb.state.projection;
  document.querySelectorAll('[data-comparison]').forEach(button=>{
    const active=button.dataset.comparison===wb.active;
    button.setAttribute('aria-selected',String(active));button.classList.toggle('active',active);
  });
  byId('anchor-controls').hidden=wb.active==='C';byId('consolidation-controls').hidden=wb.active!=='C';
  byId('anchor-heading').textContent='Manual '+wb.active+' anchors';
  byId('run').textContent='Run comparison '+wb.active;byId('projection').value=wb.state.projection;
  byId('reuse-a-inputs').hidden=wb.active!=='B';
  byId('load-sample').disabled=wb.active==='C';
  for (const side of ['SOURCE','TARGET']) {
    byId(side.toLowerCase()+'-file').disabled=wb.active==='C';
    const graph=wb.state.graphs[side];
    byId(side.toLowerCase()+'-info').textContent=graph ? 'Base '+(wb.active==='C'?'C':wb.active)+' · '+graph.member+'\n'+graphInfo(graph) : 'Choose '+side+' XML for base '+wb.active+'.';
  }
  if (wb.active!=='C') {
    for (const axis of ['x','y','z']) byId('tol-'+axis).value=wb.state.tolerance[axis];
    renderAnchors(wb,byId('anchors'),index=>{clearView();wb.removeAnchor(index);controls();status('Anchor removed in '+wb.active+'. Run this comparison again.');});
  }
}
function render() {
  controls();renderWorkbenchRows(wb,byId('rows'),actions);
  let result;try {result=wb.current();} catch {
    exportControls(false);byId('summary').textContent=workbenchSummary(wb,null);return;
  }
  byId('projection-label').textContent='Evidence projection · '+result.projection+
    (result.projection==='ISO'?' · NON-METRIC oblique':' · metric orthographic · mm');
  byId('summary').textContent=workbenchSummary(wb,result);exportControls(true);
  const selection=wb.entry.selection;
  if (!selection.sources.length && !selection.pick) selection.sources=[result.candidates.rows[0]?.source].filter(Boolean);
  select(selection.sources,selection.element,selection.pick);
}
function select(sources,element=null,pick=null) {
  let result;try {result=wb.current();} catch {return;}
  const selection={sources:[...new Set((Array.isArray(sources)?sources:[sources]).filter(Boolean))],element,pick};
  wb.entry.selection=selection;renderWorkbenchRows(wb,byId('rows'),actions);
  if (viewport?.getState) wb.entry.svgViewBox=viewport.getState();
  viewport=mountScene(result,byId('svg-layer'),select,selection.sources,element,pick,wb.entry.svgViewBox);
  byId('details').textContent=readableSelection(result,selection.sources,pick,element);
  byId('technical-details').textContent=selectedDetails(result,selection.sources,pick);
  if (bridge.isActive()) {
    const ids=selectedGeometryObjects(result,selection.sources,pick);bridge.setSelection(ids[0]||null,ids.slice(1));
  }
}
async function load(side,file) {
  const tab=wb.active,request=++loadRequests[tab][side];resolutionRequest++;clearView();status('Loading '+side+' for '+tab+'; its results and Consolidated are revoked.');
  byId(side.toLowerCase()+'-info').textContent='Loading…';
  try {
    const loaded=await wb.load(side,file?file.arrayBuffer().then(b=>new Uint8Array(b)):new Uint8Array(),file?.name||'');
    if (request!==loadRequests[tab][side] || !loaded || wb.active!==tab) return;
    byId(side.toLowerCase()+'-info').textContent=graphInfo(wb.state.graphs[side]);
    const options=byId('physical-target-ids');options.replaceChildren();
    for (const node of (wb.state.graphs.TARGET?.nodes || []).slice(0,300)) {
      const option=document.createElement('option');option.value=node.id;options.append(option);
    }
    controls();status('XML loaded. Base '+tab+' XML loaded. Other base state is preserved; B initially reuses A inputs.');
  } catch (error) {
    if (request!==loadRequests[tab][side] || wb.active!==tab) return;
    byId(side.toLowerCase()+'-info').textContent='Load failed: '+error.message;controls();status(error.message,true);
  }
}
function run() {
  clearView();resolutionRequest++;
  try {
    wb.configure({projection:byId('projection').value,tolerance:Object.fromEntries(['x','y','z'].map(axis=>
      [axis,byId('tol-'+axis).value===''?NaN:Number(byId('tol-'+axis).value)]))});
    const result=wb.run();render();
    status('Comparison '+wb.active+' · '+result.transform.status+'\nChecked proposals feed Consolidated. Physical identity remains unqualified.');
  } catch(error) {controls();status(error.message,true);}
}
async function consolidate() {
  const request=++resolutionRequest;clearView();status('Evaluating checked pairs and conflict alternatives…');
  renderWorkbenchRows(wb,byId('rows'),actions);
  try {
    const result=await wb.consolidate(byId('resolution-fit').value,{onProgress:p=>{
      if (request===resolutionRequest) status('Evaluating '+p.evaluated+' / '+p.total+' assignments…');
    }});
    if (request!==resolutionRequest || wb.active!=='C') return;
    render();status(workbenchSummary(wb,result)+'\nScores sum |ΔX| + |ΔY| + |ΔZ| on the other pairs. The tested group stays in the fit and is excluded from its score.');
  } catch(error) {
    if (request!==resolutionRequest) return;
    render();status(error.message+(wb.c.resolution?.rejected[0]?.reason?' '+wb.c.resolution.rejected[0].reason:''),true);
  }
}
async function toggleViewer() {
  if (gpuRequested) {disableGpu();return;}
  let result;try {result=wb.current();} catch {status('Run this comparison first.',true);return;}
  const request=++viewerRequest;gpuRequested=true;byId('toggle-gpu').disabled=true;byId('gpu-host').hidden=false;
  let cleanedOwnRequest=false;
  try {
    const verticalAxis=byId('vertical-axis').value,camera=wb.entry.camera;
    const ok=await bridge.enable({mode:byId('viewer-layout').value,projection:result.projection,
      verticalAxis,cameraState:camera?{...camera,verticalAxis}:null});
    if (request!==viewerRequest) return;
    if (!ok || !gpuRequested || wb.current()!==result) {disableGpu();cleanedOwnRequest=true;return;}
    byId('svg-layer').hidden=true;byId('gpu-host').hidden=false;byId('viewer-layout').disabled=false;
    byId('toggle-gpu').textContent='Use SVG viewer';select(wb.entry.selection.sources,wb.entry.selection.element,wb.entry.selection.pick);
  } catch(error) {
    if (request!==viewerRequest) return;
    disableGpu();cleanedOwnRequest=true;status('3D viewer unavailable; SVG remains usable. '+error.message,true);
  } finally {if (request===viewerRequest || cleanedOwnRequest) byId('toggle-gpu').disabled=!wb.state.result;}
}
function switchTab(tab) {
  resolutionRequest++;sampleRequest++;clearView();wb.switchTab(tab);
  for (const side of ['source','target']) byId(side+'-file').value='';
  controls();render();
  status('Comparison '+tab+(tab==='C'?' · consolidate the checked A/B proposals.':' · independent anchors, candidates and selection.'));
}
function download(kind) {
  try {
    const type={svg:'image/svg+xml',json:'application/json',csv:'text/csv'}[kind];
    const uri=URL.createObjectURL(new Blob([exportWorkbench(wb,kind)],{type})),anchor=document.createElement('a');
    anchor.href=uri;anchor.download='CIIFR_GEO-'+wb.active+'.'+kind;anchor.click();setTimeout(()=>URL.revokeObjectURL(uri),1000);
  } catch(error) {exportControls(false);status(error.message,true);}
}
for (const side of ['SOURCE','TARGET']) byId(side.toLowerCase()+'-file').addEventListener('change',e=>{sampleRequest++;void load(side,e.target.files[0]);});
byId('load-sample').addEventListener('click',async()=>{
  const owner=++sampleRequest,tab=wb.active;
  try {
    const names=['S1-F05.xml','S1-R4.xml'];
    const files=await Promise.all(names.map(async name=>{
      const response=await fetch(new URL('./tests/fixtures/'+name,import.meta.url));
      if (!response.ok) throw Error('Bundled sample unavailable: '+name);
      return new File([await response.arrayBuffer()],name,{type:'application/xml'});
    }));
    if (owner!==sampleRequest || wb.active!==tab) return;
    await Promise.all([load('SOURCE',files[0]),load('TARGET',files[1])]);
  } catch(error) {if (owner===sampleRequest) status(error.message,true);}
});
document.querySelectorAll('[data-comparison]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.comparison)));
byId('add-anchor').addEventListener('click',()=>{
  clearView();resolutionRequest++;try {wb.addAnchor(byId('anchor-source').value,byId('anchor-target').value);controls();
    status('Manual '+wb.active+' anchor added. Run comparison '+wb.active+'.');} catch(error) {status(error.message,true);}
});
for (const axis of ['x','y','z']) byId('tol-'+axis).addEventListener('input',()=>{
  clearView();resolutionRequest++;
  try { wb.configure({tolerance:Object.fromEntries(['x','y','z'].map(key=>
    [key,byId('tol-'+key).value===''?NaN:Number(byId('tol-'+key).value)]))});
    status('Tolerance changed. Run this comparison again.'); } catch(error) {status(error.message,true);}
});
byId('projection').addEventListener('input',()=>{disableGpu();try {wb.setProjection(byId('projection').value);viewport=null;render();} catch(error) {status(error.message,true);}});
byId('reuse-a-inputs').addEventListener('click',()=>{clearView();try {wb.reuseAInputs();controls();status('B now uses A original XML pair. Add B anchors and run.');} catch(error) {status(error.message,true);}});
byId('run').addEventListener('click',run);byId('consolidate').addEventListener('click',consolidate);
byId('clear-overrides').addEventListener('click',()=>{wb.clearPins();void consolidate();});
byId('resolution-fit').addEventListener('change',()=>{resolutionRequest++;clearView();wb.cancelResolution();status('Alignment policy changed. Consolidate again.');});
byId('toggle-gpu').addEventListener('click',toggleViewer);
byId('viewer-layout').addEventListener('change',e=>bridge.setMode(e.target.value));
byId('vertical-axis').addEventListener('change',e=>{bridge.command('vertical-axis',e.target.value);});
byId('camera-view').addEventListener('change',e=>{if (e.target.value!=='custom') bridge.command('view',e.target.value);});
byId('orbit-left').addEventListener('click',()=>bridge.command('orbit',[0.2,0]));
byId('orbit-right').addEventListener('click',()=>bridge.command('orbit',[-0.2,0]));
for (const button of document.querySelectorAll('[data-viewer-command]')) button.addEventListener('click',()=>bridge.command(button.dataset.viewerCommand));
byId('zoom-in').addEventListener('click',()=>bridge.isActive()?bridge.command('zoom',0.8):viewport?.zoom(0.8));
byId('zoom-out').addEventListener('click',()=>bridge.isActive()?bridge.command('zoom',1.25):viewport?.zoom(1.25));
byId('reset-view').addEventListener('click',()=>bridge.isActive()?bridge.command('fit'):viewport?.reset());
byId('select-node').addEventListener('click',()=>{
  try {
    const object=Object.values(wb.current().viewerScene.objects).find(o=>o.kind==='NODE'&&o.side===byId('node-side').value&&o.nodeId===byId('node-id').value.trim());
    if (!object) throw Error('No physical NODE with that ID in the current component');
    select(object.sourceRows,null,object);
  } catch(error) {status(error.message,true);}
});
document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>download(button.dataset.export)));
window.addEventListener('pagehide',()=>{bridge.disable();wb.cancelResolution();});
controls();

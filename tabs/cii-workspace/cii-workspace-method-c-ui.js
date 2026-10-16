import { buildOriginalGraphFromBytes, graphRoute } from './cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from './cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from './cii-workspace-method-c-candidates.js';
import { methodCSvgScene, escapeMethodCXml as h } from './cii-workspace-method-c-svg.js';
import { methodCEvidence, methodCCsvExport, methodCJsonExport, methodCSvgExport } from './cii-workspace-method-c-exports.js';

const n=v=>Number.isFinite(v)?Number(v).toFixed(2):'—';
const esc=v=>h(String(v??''));
const cell=v=>'<td>'+esc(v)+'</td>';
const button=(action,label)=>'<button type="button" data-action="'+action+'">'+label+'</button>';
function shell(){
  return '<section class="method-c" data-method-c="read-only">'+
    '<header><h2>Method C — Geometry Overlay</h2><p>Original CII · geometric review only · NO Writer2 / no physical identity approval</p></header>'+
    '<div class="mc-layout"><div class="mc-panel">'+
    '<h3>Files and registration</h3>'+
    '<label>Original SOURCE CII <input id="mc-source-file" type="file" accept=".cii,.CII"></label>'+
    '<label>Original TARGET CII <input id="mc-target-file" type="file" accept=".cii,.CII"></label>'+
    '<pre data-view="custody">Choose original SOURCE and TARGET files.</pre>'+
    '<h4>Original physical NODE anchors</h4><div data-view="anchors"></div>'+
    '<label>SOURCE NODE <input id="mc-source-id" inputmode="numeric"></label>'+
    '<label>TARGET NODE <input id="mc-target-id" inputmode="numeric"></label>'+
    button('add-anchor','Add anchor')+button('clear-anchors','Reset anchors')+
    '<p>1 anchor: rotation unknown. 2: axial twist unknown. Only admissible non-collinear anchors constrain 3D rotation.</p>'+
    '<fieldset><legend>Assumed orientation (1 anchor only, degrees)</legend>'+
    ['x','y','z'].map(a=>'<label>'+a.toUpperCase()+' <input id="mc-euler-'+a+'" type="number" value="0" step="1"></label>').join('')+
    '</fieldset><label>Two-anchor unresolved twist ° <input id="mc-twist" type="number" value="0"></label>'+
    '<fieldset><legend>Independent ±XYZ tolerance, mm</legend>'+
    ['x','y','z'].map(a=>'<label>'+a.toUpperCase()+' <input id="mc-tol-'+a+'" type="number" value="100" min="0" max="100000"></label>').join('')+'</fieldset>'+
    '<p role="status" data-view="errors"></p><pre data-view="registration"></pre>'+
    '</div><div class="mc-panel mc-canvas"><h3>Physical centreline overlay</h3>'+
    '<label>Projection <select id="mc-projection"><option value="XZ">X–Z (metric)</option>'+
    '<option value="YZ">Y–Z (metric)</option><option value="XY">X–Y (metric)</option>'+
    '<option value="ISO">Oblique, not metric</option></select></label>'+
    '<label>Scope <select id="mc-scope"><option value="component">Registered component</option>'+
    '<option value="route">Selected route</option></select></label>'+
    '<label>SOURCE route start/end <input id="mc-route-source-a" inputmode="numeric" placeholder="NODE A">'+
    '<input id="mc-route-source-b" inputmode="numeric" placeholder="NODE B"></label>'+
    '<label>TARGET route start/end <input id="mc-route-target-a" inputmode="numeric" placeholder="NODE A">'+
    '<input id="mc-route-target-b" inputmode="numeric" placeholder="NODE B"></label>'+
    button('zoom-in','Zoom in')+button('zoom-out','Zoom out')+button('reset-view','Fit / reset view')+
    '<label><input id="mc-labels" type="checkbox"> NODE labels</label>'+
    '<p>Dashed circles = SOURCE; solid squares = TARGET. Yellow = segment only, red = out of tolerance. Scroll to zoom, drag to pan; select NODE or ELEMENT.</p>'+
    '<div data-view="svg" class="mc-svg" aria-label="Interactive original CII piping overlay"></div>'+
    '<div data-view="metrics" aria-live="polite"></div>'+
    '</div><div class="mc-panel"><h3>Selected geometry and export</h3>'+
    '<div data-view="detail">Select a physical SOURCE NODE or original ELEMENT.</div>'+
    button('export-svg','Export SVG')+button('export-csv','Export CSV')+button('export-json','Export JSON')+
    '<p>No export grants Writer2 authority. All failure and alternate rows are preserved.</p>'+
    '<h4>Conflicts and qualification</h4><div data-view="legend"></div></div></div>'+
    '<div class="mc-panel"><h3>Full SOURCE correspondence and exception ledger</h3>'+
    '<div class="mc-scroll"><table><thead><tr><th>S NODE</th><th>Best/nearest T NODE</th>'+
    '<th>Status</th><th>ΔX</th><th>ΔY</th><th>ΔZ</th><th>Distance</th>'+
    '<th>OD S/T</th><th>Wall S/T</th><th>Original ELEMENT</th></tr></thead>'+
    '<tbody data-view="rows"></tbody></table></div></div></section>';
}
function safeRoute(graph,a,b){return a&&b?graphRoute(graph,a,b):null;}
function showRow(row){
  if(!row)return 'Select a NODE or ELEMENT.';
  const projection=row.segment?'SEGMENT ONLY '+row.segment.witness+'; fraction '+n(row.segment.t)+
    ', station '+n(row.segment.stationMm)+' mm; distance '+n(row.segment.distance)+' mm. No physical TARGET NODE.':'';
  return '<strong>S '+esc(row.source)+' / '+esc(row.status)+'</strong><p>'+esc(row.explanation)+'</p>'+
    '<p>Nearest T NODE: '+esc(row.nearest?.target??'none')+'; XYZ residual '+esc((row.residual??[]).map(n).join(', '))+
    ' mm; distance '+n(row.distance)+' mm</p>'+
    '<p>OD: '+n(row.sourceOd)+' / '+n(row.alternatives[0]?.od)+' mm; wall: '+
    n(row.sourceWall)+' / '+n(row.alternatives[0]?.wall)+' mm</p>'+
    '<p>Original SOURCE ELEMENTS: '+esc(row.originalElements.join(', '))+'</p>'+
    '<p>All physical TARGET alternatives: '+esc(row.alternatives.map(a=>a.target+' ('+n(a.distance)+' mm)').join(', ')||'none')+'</p>'+
    '<p>'+esc(projection)+'</p><p>Unqualified geometric candidate only.</p>';
}
export function mountMethodC(root,{source=null,target=null}={}){
  if(!root?.querySelector||!globalThis.document)throw new Error('METHOD_C_DOM_REQUIRED');
  root.innerHTML=shell();
  const $=s=>root.querySelector(s);
  const state={source,target,anchors:[],transform:null,candidates:null,scene:null,selected:null,
    selectionElement:null,projection:'XZ',scope:'component',error:'',tolerance:{x:100,y:100,z:100},
    revisions:[0,0],lastExport:null,closed:false};
  function snapshotClear(){state.transform=null;state.candidates=null;state.scene=null;state.lastExport=null;}
  function displayFailure(message){
    snapshotClear();state.error=String(message??'Choose original files and physical NODE anchors.');
    $('[data-view="errors"]').textContent=state.error;
    $('[data-view="svg"]').replaceChildren();
    $('[data-view="rows"]').replaceChildren();
    $('[data-view="registration"]').textContent='UNREGISTERED / EXPORT DISABLED';
    $('[data-view="detail"]').textContent='No current physical-custody evidence.';
    $('[data-view="metrics"]').textContent='No qualified physical NODE identities.';
  }
  function draw(){
    if(!state.candidates||!state.transform)return;
    const routeSource=state.scope==='route'?safeRoute(state.source,
      $('#mc-route-source-a').value.trim(),$('#mc-route-source-b').value.trim()):null;
    const routeTarget=state.scope==='route'?safeRoute(state.target,
      $('#mc-route-target-a').value.trim(),$('#mc-route-target-b').value.trim()):null;
    state.scene=methodCSvgScene({source:state.source,target:state.target,transform:state.transform,
      candidates:state.candidates,selectedSource:state.selected,selectedElement:state.selectionElement,
      projection:state.projection,scope:state.scope,routeSource,routeTarget,labels:$('#mc-labels').checked});
    $('[data-view="svg"]').innerHTML=state.scene.svg;
    $('[data-view="metrics"]').textContent=state.scene.sourceNodes+' SOURCE and '+state.scene.targetNodes+
      ' TARGET physical NODE markers; '+state.scene.sourceElements+'/'+state.scene.targetElements+
      ' original ELEMENTS. '+(state.scene.metric?'Equal metric scale':'Illustrative non-metric oblique projection');
  }
  function choose(sourceId,elementId=null){
    state.selected=sourceId?String(sourceId):state.selected;state.selectionElement=elementId;
    const selected=state.candidates?.rows.find(r=>r.source===state.selected);
    $('[data-view="detail"]').innerHTML=showRow(selected);
    $('[data-view="rows"]').querySelectorAll('tr[data-source]').forEach(tr=>{
      tr.classList.toggle('mc-current',tr.dataset.source===state.selected);
    });
    try{draw();}catch(e){displayFailure(e.message);}
  }
  function refresh(){
    snapshotClear();
    $('[data-view="custody"]').textContent=[state.source,state.target].map(g=>g?
      g.member+' '+g.sha256+'\n'+g.nodes.length+' physical NODEs / '+g.edges.length+' ELEMENTS':
      'Original file missing').join('\n');
    $('[data-view="anchors"]').innerHTML=state.anchors.map((a,i)=>
      '<div>S '+esc(a.source)+' ↔ T '+esc(a.target)+' '+button('remove-anchor','Remove').replace(
        'data-action=', 'data-index="'+i+'" data-action=')+'</div>').join('');
    if(!state.source||!state.target||!state.anchors.length){
      displayFailure('Choose original SOURCE and TARGET files and at least one physical anchor.');
      return;
    }
    try{
      const a=$('#mc-twist'),euler=['x','y','z'].map(v=>Number($('#mc-euler-'+v).value));
      const transform=registerMethodC(state.source,state.target,state.anchors,
        {previewEulerDeg:euler,previewTwistDeg:Number(a.value)});
      if(!transform.rotation)throw new Error(transform.status);
      const tolerance=Object.fromEntries(['x','y','z'].map(v=>[v,Number($('#mc-tol-'+v).value)]));
      const candidates=findMethodCCandidates(state.source,state.target,transform,tolerance);
      state.transform=transform;state.candidates=candidates;state.tolerance=tolerance;
      state.selected=candidates.rows.some(r=>r.source===state.selected)?state.selected:
        (candidates.rows[0]?.source??null);
      $('[data-view="errors"]').textContent='';
      $('[data-view="registration"]').textContent=transform.status+'; max anchor residual '+n(transform.maxResidualMm)+
        ' mm\nscale = 1, det R = '+n(transform.determinant)+
        '\nR =\n'+transform.rotation.map(row=>row.map(v=>v.toFixed(6)).join('  ')).join('\n')+
        '\nt = '+transform.translation.map(n).join(', ')+' mm'+
        '\nSOURCE hash '+state.source.sha256+'\nTARGET hash '+state.target.sha256;
      $('[data-view="rows"]').innerHTML=candidates.rows.map(r=>
        '<tr tabindex="0" data-source="'+esc(r.source)+'">'+cell(r.source)+
        cell(r.target??('nearest '+(r.nearest?.target??'none')))+cell(r.status)+
        [0,1,2].map(i=>cell(n(r.residual?.[i]))).join('')+cell(n(r.distance))+
        cell(n(r.sourceOd)+' / '+n(r.alternatives[0]?.od))+cell(n(r.sourceWall)+' / '+
        n(r.alternatives[0]?.wall))+cell(r.originalElements.join(', '))+'</tr>').join('');
      $('[data-view="legend"]').textContent=Object.entries(candidates.counts)
        .map(([k,v])=>k+': '+v).join(' · ')+' · Physical identity qualified: 0 · Writer2: unavailable';
      choose(state.selected);
    }catch(e){displayFailure('Method C rejected input: '+e.message);}
  }
  async function fileChange(file,index){
    const rev=++state.revisions[index];snapshotClear();
    if(index===0)state.source=null;else state.target=null;
    state.anchors=[];state.selected=null;displayFailure('Original file revision changed. Previous anchors and exports invalidated.');
    if(!file)return;
    try{
      const bytes=await file.arrayBuffer();
      const member=String(file.name||'').replace(/\.cii$/i,'')||('MEMBER'+index);
      const graph=await buildOriginalGraphFromBytes({bytes,member});
      if(rev!==state.revisions[index]||state.closed)return;
      if(index===0)state.source=graph;else state.target=graph;
      refresh();
    }catch(e){if(rev===state.revisions[index]&&!state.closed)displayFailure('Original file rejected: '+e.message);}
  }
  function exportCurrent(kind){
    if(!state.candidates||!state.scene)throw new Error('METHOD_C_NO_CURRENT_EVIDENCE');
    const context={source:state.source,target:state.target,transform:state.transform,
      candidates:state.candidates,scene:state.scene,projection:state.projection};
    const content=kind==='svg'?methodCSvgExport(context):
      kind==='csv'?methodCCsvExport(context):methodCJsonExport(context);
    const type=kind==='svg'?'image/svg+xml':kind==='csv'?'text/csv':'application/json';
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='method-c-evidence.'+kind;
    link.click();queueMicrotask(()=>URL.revokeObjectURL(url));
    state.lastExport={kind,content,summary:methodCEvidence(context).rows.length};
    $('[data-view="errors"]').textContent=kind.toUpperCase()+' exported with current original-byte SHA and candidate snapshot.';
  }
  function zoom(factor){
    const svg=$('[data-view="svg"] svg');if(!svg)return;
    const b=svg.viewBox.baseVal;
    const w=b.width*factor,h=b.height*factor;
    svg.setAttribute('viewBox',[b.x+(b.width-w)/2,b.y+(b.height-h)/2,w,h].join(' '));
  }
  root.addEventListener('click',event=>{
    const node=event.target.closest('[data-node][data-kind="SOURCE"]');
    if(node){choose(node.dataset.node);return;}
    const edge=event.target.closest('[data-element][data-kind]');
    if(edge){state.selectionElement=edge.dataset.kind+':'+edge.dataset.element;draw();
      $('[data-view="detail"]').textContent='Original '+edge.dataset.kind+' ELEMENT '+edge.dataset.element+
        ' selected. Inspect the original ELEMENT witness in the SVG title.';return;}
    const row=event.target.closest('tr[data-source]');if(row){choose(row.dataset.source);return;}
    const b=event.target.closest('button[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='add-anchor'){
      state.anchors.push({source:$('#mc-source-id').value.trim(),target:$('#mc-target-id').value.trim(),
        sourceSha:state.source?.sha256,targetSha:state.target?.sha256,member:state.source?.member,
        role:'experimental-unverified'});refresh();
    }else if(action==='remove-anchor'){state.anchors.splice(Number(b.dataset.index),1);refresh();}
    else if(action==='clear-anchors'){state.anchors=[];state.selected=null;refresh();}
    else if(action==='zoom-in')zoom(.75);
    else if(action==='zoom-out')zoom(1.35);
    else if(action==='reset-view')draw();
    else if(action.startsWith('export-'))try{exportCurrent(action.slice(7));}
      catch(e){$('[data-view="errors"]').textContent='Export rejected: '+e.message;}
  });
  root.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target.matches('tr[data-source],[data-node],[data-element]')){
      event.preventDefault();event.target.click();
    }
  });
  for(const selector of ['#mc-tol-x','#mc-tol-y','#mc-tol-z','#mc-euler-x','#mc-euler-y',
    '#mc-euler-z','#mc-twist'])$(selector).addEventListener('change',refresh);
  for(const selector of ['#mc-projection','#mc-scope','#mc-labels','#mc-route-source-a',
    '#mc-route-source-b','#mc-route-target-a','#mc-route-target-b'])
    $(selector).addEventListener('change',()=>{
      state.projection=$('#mc-projection').value;state.scope=$('#mc-scope').value;
      state.lastExport=null;try{draw();}catch(e){displayFailure(e.message);}
    });
  $('#mc-source-file').addEventListener('change',event=>fileChange(event.target.files[0],0));
  $('#mc-target-file').addEventListener('change',event=>fileChange(event.target.files[0],1));
  let drag=null;
  root.addEventListener('pointerdown',event=>{
    const svg=event.target.closest('[data-view="svg"] svg');
    if(!svg||event.target.closest('[data-node],[data-element]'))return;
    const b=svg.viewBox.baseVal;drag={x:event.clientX,y:event.clientY,
      box:[b.x,b.y,b.width,b.height],svg};
  });
  root.addEventListener('pointermove',event=>{
    if(!drag)return;
    const rect=drag.svg.getBoundingClientRect(),b=drag.box;
    if(rect.width&&rect.height)drag.svg.setAttribute('viewBox',[
      b[0]-(event.clientX-drag.x)*b[2]/rect.width,
      b[1]-(event.clientY-drag.y)*b[3]/rect.height,b[2],b[3]].join(' '));
  });
  root.addEventListener('pointerup',()=>{drag=null;});
  root.addEventListener('wheel',event=>{
    if(!event.target.closest('[data-view="svg"] svg'))return;
    event.preventDefault();zoom(event.deltaY>0?1.17:.85);
  },{passive:false});
  refresh();
  return {state,refresh,select:choose,setFiles:(s,t)=>{state.revisions[0]++;state.revisions[1]++;
    state.source=s;state.target=t;state.anchors=[];refresh();},
    dispose:()=>{state.closed=true;state.revisions[0]++;state.revisions[1]++;snapshotClear();root.replaceChildren();}};
}

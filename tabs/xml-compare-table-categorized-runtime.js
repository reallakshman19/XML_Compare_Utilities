import { createPendingCanvasHandoff, sendCanvasHandoffArtifact } from '../xml-compare/table-categorizer/table-categorized-xml-canvas-handoff.js';
import { exportCategorizedGraphArtifacts } from '../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { buildCategorizedGraph } from '../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { createCategorizedGraphCanvasModel } from '../xml-compare/table-categorizer/table-categorized-xml-graph-canvas-adapter.js';
import { buildCategorizedGraphConnectors } from '../xml-compare/table-categorizer/table-categorized-xml-graph-connector-builder.js';
import { comparePsMappingCategorizedGraphs } from '../xml-compare/table-categorizer/table-categorized-xml-ps-mapping-compare.js';
import { createBlankUniversalProfile, createPsMappingTable2TemplateProfile, generateSuggestedProfiles, parseProfileJson, serializeProfile, setChildrenNames, updateLevelAtPath, updateProfileHeader } from '../xml-compare/table-categorizer/table-categorized-xml-profile-designer.js';
import { hasProfileBlockers, validateEditableProfile } from '../xml-compare/table-categorizer/table-categorized-xml-profile-validation.js';
import { PS_MAPPING_COORDINATE_LOOKUP_SAMPLE, PS_MAPPING_TABLE_2_COORDINATE_LOOKUP_PROFILE, PS_MAPPING_TABLE_2_MODEL_SAMPLE, PS_MAPPING_TABLE_2_SAMPLE, PS_MAPPING_TABLE_2_SHADOW_PROFILE } from '../xml-compare/table-categorizer/table-categorized-xml-pilot-profiles.js';
import { activeSource, addSource, createMultiSourceState, parseSourceDraft, removeSource, setActiveSource, updateSourceDraft } from '../xml-compare/table-categorizer/table-categorized-xml-source-manager.js';
import { TABLE_CATEGORIZED_XML_BUTTON_ATTR, TABLE_CATEGORIZED_XML_POPUP_ATTR, renderTableCategorizedXmlButtonHtml, renderTableCategorizedXmlShellHtml } from '../xml-compare/table-categorizer/table-categorized-xml-shell.js?v=20260703-column-confirmation-1';
import { runCategorizerValidation } from '../xml-compare/table-categorizer/table-categorized-xml-validation.js';

export const XML_COMPARE_TABLE_CATEGORIZED_RUNTIME_SCHEMA='xml-compare-table-categorized-runtime/v11-column-confirmation';
const STYLE_ID='xml-compare-table-categorized-style';
const BUTTON_SELECTOR=`[${TABLE_CATEGORIZED_XML_BUTTON_ATTR}]`;
const POPUP_SELECTOR=`[${TABLE_CATEGORIZED_XML_POPUP_ATTR}]`;
const TAB_TO_STEP=Object.freeze({source:'table',levels:'columns',graph:'structure',validation:'preview',export:'export'});
const STEP_TO_TAB=Object.freeze({table:'source',columns:'levels',structure:'graph',preview:'validation',export:'export'});
const sourceState=createMultiSourceState();
const state={activeTab:'source',activeStep:'table',sources:[...sourceState.sources],activeSourceId:sourceState.activeSourceId,profile:PS_MAPPING_TABLE_2_SHADOW_PROFILE,columnsConfirmed:false,profileValidation:[],graph:null,validationResults:[],exportResult:null,exportStatus:'',pendingHandoff:null,compareCanvas:createEmptyCompareCanvasState()};
let runtimeInstalled=false;
let tableCategorizedObserver=null;
export function createEmptyCompareCanvasState(){return {sourceGraph:null,targetGraph:null,sourceCanvasModel:null,targetCanvasModel:null,graphCompareResult:null,graphConnectors:null,importedTargetGraphName:'',status:'',diagnostics:[]};}
export function compareCanvasDiagnostic(severity,code,message,details={}){return Object.freeze({severity,code,message,details:Object.freeze(details||{})});}
function withCompareDiagnostic(compareCanvas,severity,code,message,details={}){return {...compareCanvas,status:message,diagnostics:[...(compareCanvas?.diagnostics||[]),compareCanvasDiagnostic(severity,code,message,details)]};}
function appendModelDiagnostics(compareCanvas,model){return {...compareCanvas,diagnostics:[...(compareCanvas?.diagnostics||[]),...(model?.diagnostics||[])]};}
export function validateImportedTargetGraph(graph){return Boolean(graph&&typeof graph==='object'&&Array.isArray(graph.nodes)&&Array.isArray(graph.edges));}
export function createCompareCanvasSourceModel(compareCanvas,graph){if(!graph)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_source_graph_missing','Build a graph before creating Source canvas model.');const model=createCategorizedGraphCanvasModel({graph,side:'source',title:'Source Graph'});const next=appendModelDiagnostics({...compareCanvas,sourceGraph:graph,sourceCanvasModel:model,graphCompareResult:null,graphConnectors:null,status:'Source canvas model created.'},model);return {...next,diagnostics:[...next.diagnostics,compareCanvasDiagnostic('INFO','compare_canvas_source_model_created','Source canvas model created.',{recordCount:model.records.length})]};}
export function importCompareCanvasTargetGraphFromText(compareCanvas,text,fileName='categorizedGraph.json'){let parsed=null;try{parsed=JSON.parse(String(text||''));}catch(error){return withCompareDiagnostic(compareCanvas,'ERROR','compare_canvas_target_json_parse_failed','Target graph import failed.',{fileName,error:String(error?.message||error)});}if(!validateImportedTargetGraph(parsed))return withCompareDiagnostic(compareCanvas,'ERROR','compare_canvas_target_json_invalid','Target graph import failed.',{fileName});return {...compareCanvas,targetGraph:parsed,targetCanvasModel:null,graphCompareResult:null,graphConnectors:null,importedTargetGraphName:fileName,status:'Target graph imported.',diagnostics:[...(compareCanvas?.diagnostics||[]),compareCanvasDiagnostic('INFO','compare_canvas_target_graph_imported','Target graph imported.',{fileName,nodeCount:parsed.nodes.length,edgeCount:parsed.edges.length})]};}
export function createCompareCanvasTargetModel(compareCanvas){if(!compareCanvas?.targetGraph)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_target_graph_missing','Import target graph before creating Target canvas model.');const model=createCategorizedGraphCanvasModel({graph:compareCanvas.targetGraph,side:'target',title:'Target Graph'});const next=appendModelDiagnostics({...compareCanvas,targetCanvasModel:model,graphConnectors:null,status:'Target canvas model created.'},model);return {...next,diagnostics:[...next.diagnostics,compareCanvasDiagnostic('INFO','compare_canvas_target_model_created','Target canvas model created.',{recordCount:model.records.length})]};}
export function runCompareCanvasGraphCompare(compareCanvas){if(!compareCanvas?.sourceGraph)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_source_graph_missing','Create Source canvas model before running graph compare.');if(!compareCanvas?.targetGraph)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_target_graph_missing','Import target graph before running graph compare.');const result=comparePsMappingCategorizedGraphs({sourceGraph:compareCanvas.sourceGraph,targetGraph:compareCanvas.targetGraph});return {...compareCanvas,graphCompareResult:result,graphConnectors:null,status:'Graph compare completed.',diagnostics:[...(compareCanvas?.diagnostics||[]),compareCanvasDiagnostic('INFO','compare_canvas_graph_compare_completed','Graph compare completed.',{mapped:result.summary?.mapped||0,missing:result.summary?.missing||0,extra:result.summary?.extra||0,mismatch:result.summary?.mismatch||0})]};}
export function buildCompareCanvasGraphConnectors(compareCanvas){if(!compareCanvas?.sourceCanvasModel)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_source_graph_missing','Create Source canvas model before building graph connectors.');if(!compareCanvas?.targetCanvasModel)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_target_graph_missing','Create Target canvas model before building graph connectors.');if(!compareCanvas?.graphCompareResult)return withCompareDiagnostic(compareCanvas,'WARNING','compare_canvas_graph_compare_missing','Run graph compare before building graph connectors.');const result=buildCategorizedGraphConnectors({sourceCanvasModel:compareCanvas.sourceCanvasModel,targetCanvasModel:compareCanvas.targetCanvasModel,graphCompareResult:compareCanvas.graphCompareResult});return {...compareCanvas,graphConnectors:result,status:'Graph connectors built.',diagnostics:[...(compareCanvas?.diagnostics||[]),compareCanvasDiagnostic('INFO','compare_canvas_connector_build_completed','Graph connectors built.',{candidateCount:result.connectorCandidates?.summary?.candidateCount||0,matchCount:result.matchMap?.matches?.length||0}),...(result.diagnostics||[])]};}
export function summarizeCompareCanvasPreview(compareCanvas=createEmptyCompareCanvasState()){const connectors=compareCanvas.graphConnectors;const matches=connectors?.matchMap?.matches||[];const candidates=connectors?.connectorCandidates?.candidates||[];return {sourceRecords:compareCanvas.sourceCanvasModel?.records?.length||0,targetRecords:compareCanvas.targetCanvasModel?.records?.length||0,mappedConnectors:matches.filter((c)=>c.matchType==='MATCHED').length,mismatchConnectors:matches.filter((c)=>c.matchType==='MISMATCH').length,missingMarkers:candidates.filter((c)=>c.matchType==='MISSING_IN_TARGET').length,extraMarkers:candidates.filter((c)=>c.matchType==='EXTRA_IN_TARGET').length,diagnostics:(compareCanvas.diagnostics||[]).length};}
export function previewConnectorRows(compareCanvas=createEmptyCompareCanvasState(),limit=20){const connectors=compareCanvas.graphConnectors;return [...(connectors?.matchMap?.matches||[]),...(connectors?.connectorCandidates?.candidates||[])].slice(0,limit);}
function injectStyle(doc=globalThis.document){
  if(!doc)return;
  let style=doc.getElementById(STYLE_ID);
  if(!style){
    style=doc.createElement('style');
    style.id=STYLE_ID;
    if(doc.head) doc.head.append(style);
  }
  if(style){
    style.textContent=`.xml-compare-table-categorized-btn{border:1px solid rgba(14,165,233,.45);border-radius:8px;background:rgba(8,47,73,.42);color:#e0f2fe;font-weight:850;cursor:pointer}
.table-categorized-xml-backdrop{position:fixed;inset:0;z-index:72;background:rgba(2,6,23,.72);display:grid;place-items:center}
.table-categorized-xml-dialog{width:min(1220px,calc(100vw - 28px));height:min(840px,calc(100vh - 28px));display:grid;grid-template-rows:auto auto 1fr;border:1px solid rgba(125,211,252,.42);border-radius:18px;background:#0f172a;color:#dbeafe;box-shadow:0 24px 80px rgba(0,0,0,.54);overflow:hidden}
.table-categorized-xml-dialog.is-fullscreen{width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0}
.table-categorized-xml-dialog header, .table-categorized-xml-dialog footer, .table-categorized-shell-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(148,163,184,.18);background:linear-gradient(90deg,rgba(8,47,73,.36),rgba(15,23,42,.55))}
.table-categorized-xml-dialog footer, .table-categorized-shell-footer{border-top:1px solid rgba(148,163,184,.18);border-bottom:0}
.table-categorized-xml-dialog h3, .table-categorized-xml-dialog h4{margin:0;color:#e0f2fe}
.table-categorized-xml-dialog p{margin:6px 0;color:#94a3b8}
.table-categorized-xml-dialog button, .table-categorized-file{border:1px solid rgba(125,211,252,.35);border-radius:10px;background:rgba(30,41,59,.92);color:#e0f2fe;padding:7px 10px;font-weight:800;cursor:pointer}
.table-categorized-xml-dialog button.is-primary{background:rgba(14,165,233,.6)}
.table-categorized-xml-dialog button:disabled{opacity:.5;cursor:not-allowed}
.table-categorized-stepper{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(2,6,23,.34)}
.table-categorized-stepper button{text-align:left}
.table-categorized-stepper b, .table-categorized-stepper small{display:block}
.table-categorized-stepper small{color:#94a3b8}
.table-categorized-stepper .is-active{background:rgba(14,116,144,.62)}
.table-categorized-xml-body{min-height:0;overflow:hidden;display:flex;flex-direction:column}
.table-categorized-shell-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.42fr);gap:12px;padding:12px;min-height:0;flex-grow:1;box-sizing:border-box}
.table-categorized-shell-main, .table-categorized-shell-side{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto}
.table-categorized-shell-toolbar{display:flex;gap:12px;align-items:center;padding:12px;border-bottom:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.4)}
.table-categorized-shell-toolbar label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;color:#bfdbfe}
.table-categorized-shell-toolbar-actions{display:flex;gap:8px;margin-top:auto}
.table-categorized-shell-side-card{border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(2,6,23,.34);padding:12px;display:flex;flex-direction:column;gap:10px}
.table-categorized-shell-side-card h4{margin:0 0 10px 0}
.table-categorized-shell-side-card label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;color:#bfdbfe}
.table-categorized-drop-zone{border:2px dashed rgba(96,165,250,.3);border-radius:14px;padding:24px;text-align:center;background:rgba(15,23,42,.4)}
.table-categorized-divider{text-align:center;color:#94a3b8;font-size:12px;font-weight:800;margin:12px 0}
.table-categorized-shell-paste{display:flex;flex-direction:column;flex-grow:1}
.table-categorized-shell-paste textarea{flex-grow:1;min-height:120px;resize:none}
.table-categorized-xml-dialog input, .table-categorized-xml-dialog textarea, .table-categorized-xml-dialog select{border:1px solid rgba(96,165,250,.25);border-radius:10px;background:#020617;color:#dbeafe;padding:8px;font-family:ui-monospace,Menlo,Consolas,monospace;box-sizing:border-box}
.table-categorized-file{display:inline-grid!important;margin-top:0!important;text-align:center}
.table-categorized-file input{display:none}
.table-categorized-xml-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.table-categorized-xml-scroll{overflow:auto;max-height:320px}
.table-categorized-xml-tree, .table-categorized-xml-preview, .table-categorized-raw-preview{white-space:pre-wrap;margin:4px 0;color:#dbeafe}
.table-categorized-xml-preview, .table-categorized-raw-preview{max-height:360px;overflow:auto;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:#020617;padding:10px}
.table-categorized-xml-dialog table{width:100%;border-collapse:collapse;font-size:12px}
.table-categorized-xml-dialog th, .table-categorized-xml-dialog td{border-bottom:1px solid rgba(148,163,184,.13);padding:7px;text-align:left;vertical-align:top}
.table-categorized-xml-dialog th{color:#93c5fd}
.table-categorized-xml-dialog li{margin:5px 0;color:#cbd5e1}
.table-categorized-xml-dialog .is-active{outline:1px solid rgba(125,211,252,.5)}
.table-categorized-xml-dialog .is-warning, .table-categorized-status.is-warning{color:#fde68a}
.table-categorized-xml-dialog .is-blocker, .table-categorized-xml-dialog .is-error, .table-categorized-status.is-error{color:#fecaca}
.table-categorized-status.is-ready{color:#86efac}
.table-categorized-level-builder{display:flex;flex-direction:column;gap:8px}
@media(max-width:960px){.table-categorized-shell-split{grid-template-columns:1fr}}
@media(max-width:760px){.table-categorized-stepper{grid-template-columns:1fr}.table-categorized-xml-dialog header,.table-categorized-xml-dialog footer,.table-categorized-shell-footer{align-items:flex-start;flex-direction:column}}`;
  }
}
function setActiveTab(tab){state.activeTab=TAB_TO_STEP[tab]?tab:'source';state.activeStep=TAB_TO_STEP[state.activeTab];}
function setActiveStep(step){state.activeStep=STEP_TO_TAB[step]?step:'table';state.activeTab=STEP_TO_TAB[state.activeStep];}
function generateLivePreview(){
  if(state.activeTab!=='levels'&&state.activeTab!=='graph')return '';
  const parsedSources=state.sources.filter((s)=>s.rows?.length).map(s=>({...s,rows:s.rows.slice(0,10)}));
  if(!parsedSources.length)return '<!-- No data rows found to preview -->';
  try{
    const miniGraph=buildCategorizedGraph(state.profile,parsedSources);
    const childrenMap=new Map();
    for(const edge of miniGraph.edges||[]){if(!childrenMap.has(edge.fromNodeId))childrenMap.set(edge.fromNodeId,[]);childrenMap.get(edge.fromNodeId).push(edge.toNodeId);}
    
    function findLevelDef(defs, id) {
      for (const d of defs || []) {
        if (d.levelId === id) return d;
        const found = findLevelDef(d.children, id);
        if (found) return found;
      }
      return null;
    }

    let out='';
    function walk(nodeId,indent){
      const node=miniGraph.nodes.find(n=>n.id===nodeId);
      if(!node)return;
      const def=findLevelDef(state.profile.levelDefinitions, node.levelId);
      const isStatic=!def||def.creationMode==='static';
      let label=isStatic?(node.displayName||node.key):node.key;
      
      if (!isStatic && node.data?.value) {
        label = node.data.value;
      }
      
      const children=childrenMap.get(nodeId)||[];
      
      if (children.length === 0 && node.evidence?.[0]?.rawByHeader) {
        const raw = node.evidence[0].rawByHeader;
        const parts = Object.entries(raw)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        label = `${label} (${parts})`;
      }
      
      out+=' '.repeat(indent*2)+'- '+String(label||'').trim()+'\n';
      for(let i=0;i<Math.min(children.length,3);i++)walk(children[i],indent+1);
      if(children.length>3)out+=' '.repeat((indent+1)*2)+`... (${children.length-3} more)\n`;
    }
    for(const rootId of miniGraph.documentRootNodeIds||[])walk(rootId,0);
    return out.trim()||'<!-- Graph built but no nodes found -->';
  }catch(e){
    return '<!-- Error generating preview: '+e.message+' -->';
  }
}
function renderShell(){const popup=document.querySelector(POPUP_SELECTOR);if(popup)popup.outerHTML=renderTableCategorizedXmlShellHtml({...state,generateLivePreview});}
function openShell(){injectStyle();document.querySelector(POPUP_SELECTOR)?.remove();document.body.insertAdjacentHTML('beforeend',renderTableCategorizedXmlShellHtml({...state,generateLivePreview}));}
function closeShell(){document.querySelector(POPUP_SELECTOR)?.remove();}
function injectButton(doc=globalThis.document){if(!doc)return;const toolbar=doc.querySelector('.xml-compare-tab .xml-compare-toolbar');if(!toolbar||toolbar.querySelector(BUTTON_SELECTOR))return;injectStyle(doc);const linewise=toolbar.querySelector('[data-xml-compare-categorized-open]');if(linewise)linewise.insertAdjacentHTML('afterend',renderTableCategorizedXmlButtonHtml());else toolbar.insertAdjacentHTML('beforeend',renderTableCategorizedXmlButtonHtml());}
function resetDerived(){state.columnsConfirmed=false;state.graph=null;state.validationResults=[];state.exportResult=null;state.exportStatus='';state.pendingHandoff=null;state.compareCanvas=createEmptyCompareCanvasState();}
function setSources(next){state.sources=[...next.sources];state.activeSourceId=next.activeSourceId;}
function active(){return activeSource({sources:state.sources,activeSourceId:state.activeSourceId});}
function parseActiveSource(){setSources(parseSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId));resetDerived();setActiveTab('source');renderShell();}
function confirmColumns(){if(!active()?.rows?.length){state.columnsConfirmed=false;state.exportStatus='Read a table before confirming columns.';setActiveTab('levels');renderShell();return;}state.columnsConfirmed=true;state.profileValidation=[];state.exportStatus='Columns confirmed.';setActiveTab('graph');renderShell();}
function buildGraph(){const parsedSources=state.sources.filter((s)=>s.rows?.length);state.profileValidation=validateEditableProfile(state.profile,{sources:parsedSources});if(hasProfileBlockers(state.profileValidation)){state.validationResults=state.profileValidation;state.exportResult=null;state.exportStatus='Graph build blocked by profile validation.';setActiveTab('validation');renderShell();return;}state.graph=buildCategorizedGraph(state.profile,parsedSources);state.validationResults=[...state.profileValidation,...runCategorizerValidation({profile:state.profile,sources:parsedSources,graph:state.graph})];state.exportResult=exportCategorizedGraphArtifacts({graph:state.graph,profile:state.profile,validationResults:state.validationResults,sources:parsedSources});state.exportStatus=state.exportResult.ok?'Export artifacts are ready.':'Export blocked by validation.';state.compareCanvas=createEmptyCompareCanvasState();setActiveTab('validation');renderShell();}
function loadSample(){let next={sources:state.sources,activeSourceId:state.activeSourceId};next=updateSourceDraft(next,state.activeSourceId,{sourceName:'PS Mapping Table 2 Sample',sourceText:PS_MAPPING_TABLE_2_SAMPLE,sourceType:'pasteText'});setSources(parseSourceDraft(next,state.activeSourceId));resetDerived();setActiveTab('source');renderShell();}
function loadCoordinateSample(){let next={sources:state.sources,activeSourceId:state.activeSourceId};if(!next.sources.some((s)=>s.sourceId==='S2'))next=addSource(next,'Coordinate Lookup');next=setActiveSource(next,'S2');next=updateSourceDraft(next,'S2',{sourceName:'Coordinate Lookup Sample',sourceText:PS_MAPPING_COORDINATE_LOOKUP_SAMPLE,sourceType:'pasteText'});setSources(parseSourceDraft(next,'S2'));resetDerived();setActiveTab('source');renderShell();}
function loadTwoSourceTemplate(){state.profile=PS_MAPPING_TABLE_2_COORDINATE_LOOKUP_PROFILE;let next=createMultiSourceState();next=updateSourceDraft(next,'S1',{sourceName:'PS Mapping Table 2 Model Sample',sourceText:PS_MAPPING_TABLE_2_MODEL_SAMPLE});next=parseSourceDraft(next,'S1');next=addSource(next,'Coordinate Lookup');next=updateSourceDraft(next,'S2',{sourceName:'Coordinate Lookup Sample',sourceText:PS_MAPPING_COORDINATE_LOOKUP_SAMPLE});next=parseSourceDraft(next,'S2');setSources(setActiveSource(next,'S1'));resetDerived();setActiveTab('levels');renderShell();}
function clearActive(){const a=active();setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{...a,sourceText:'',headers:[],rows:[],diagnostics:[]}));resetDerived();renderShell();}
function applyProfileChanges(){const root=document.querySelector(POPUP_SELECTOR);if(!root)return;let p=updateProfileHeader(state.profile,{profileId:value(root,'[data-profile-field="profileId"]'),displayName:value(root,'[data-profile-field="displayName"]')});p=updateLevelAtPath(p,[0],{displayName:value(root,'[data-root-field="displayName"]'),xmlTag:value(root,'[data-root-field="xmlTag"]'),levelType:value(root,'[data-root-field="levelType"]'),creationMode:value(root,'[data-root-field="creationMode"]'),key:value(root,'[data-root-field="key"]'),documentRoot:Boolean(root.querySelector('[data-root-document]')?.checked)});p={...p,rootPartitionMode:value(root,'[data-root-partition-mode]')||'static',rootPartitions:[{key:value(root,'[data-root-partition-key]')||'MODEL_SIDE',displayName:value(root,'[data-root-partition-key]')||'MODEL_SIDE',sourceScope:value(root,'[data-root-partition-scope]').split(/\s+/).filter(Boolean)}]};const parentNames=names(root,'[data-parent-name]').slice(0,3);if(parentNames.length)p=setChildrenNames(p,[0,0],parentNames,{levelType:'group',creationMode:'one-per-key',keyColumn:active()?.headers?.[0]||'PS NO'});state.profile=p;state.profileValidation=validateEditableProfile(state.profile,{sources:state.sources.filter((s)=>s.rows?.length)});resetDerived();state.exportStatus='Profile changes applied.';setActiveTab('levels');renderShell();}
function names(root,selector){return [...root.querySelectorAll(selector)].map((input)=>input.value).filter(Boolean);}function value(root,selector){return String(root.querySelector(selector)?.value||'');}
function loadBlankProfile(){state.profile=createBlankUniversalProfile();state.profileValidation=[];resetDerived();setActiveTab('levels');renderShell();}function loadPsTemplate(){state.profile=createPsMappingTable2TemplateProfile();state.profileValidation=[];resetDerived();setActiveTab('levels');renderShell();}
async function importFile(input){const file=input.files?.[0];if(!file)return;setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{sourceName:file.name||active()?.sourceName,sourceText:await file.text(),sourceType:'file'}));parseActiveSource();}
async function importProfile(input){const file=input.files?.[0];if(!file)return;state.profile=parseProfileJson(await file.text());state.profileValidation=validateEditableProfile(state.profile,{sources:state.sources});resetDerived();setActiveTab('levels');renderShell();}
async function importCompareCanvasTarget(input){const file=input.files?.[0];if(!file)return;state.compareCanvas=importCompareCanvasTargetGraphFromText(state.compareCanvas,await file.text(),file.name||'categorizedGraph.json');setActiveTab('export');renderShell();}
function useCurrentGraphAsSourceCanvas(){state.compareCanvas=createCompareCanvasSourceModel(state.compareCanvas,state.graph);setActiveTab('export');renderShell();}
function useImportedGraphAsTargetCanvas(){state.compareCanvas=createCompareCanvasTargetModel(state.compareCanvas);setActiveTab('export');renderShell();}
function runGraphCompareCanvas(){state.compareCanvas=runCompareCanvasGraphCompare(state.compareCanvas);setActiveTab('export');renderShell();}
function buildGraphConnectors(){state.compareCanvas=buildCompareCanvasGraphConnectors(state.compareCanvas);setActiveTab('export');renderShell();}
function clearCompareCanvasPreview(){state.compareCanvas=createEmptyCompareCanvasState();setActiveTab('export');renderShell();}
function downloadGraphConnectorsJson(){if(!state.compareCanvas.graphConnectors){state.compareCanvas=withCompareDiagnostic(state.compareCanvas,'WARNING','compare_canvas_connector_json_missing','Build graph connectors before downloading connector JSON.');setActiveTab('export');renderShell();return;}downloadText('categorizedGraphConnectors.json',JSON.stringify(state.compareCanvas.graphConnectors,null,2),'application/json;charset=utf-8');}
function downloadArtifact(kind){const item=artifactForKind(kind);if(item)downloadText(item.name,item.text,item.type);}function artifactForKind(kind){const r=state.exportResult;if(kind==='profile')return {name:'profile.json',text:serializeProfile(state.profile),type:'application/json;charset=utf-8'};if(!r?.ok)return null;if(kind==='xml')return {name:'categorized.xml',text:r.xmlText,type:'application/xml;charset=utf-8'};if(kind==='graph')return {name:'categorizedGraph.json',text:r.graphJson,type:'application/json;charset=utf-8'};if(kind==='diagnostics')return {name:'diagnostics.json',text:r.diagnosticsJson,type:'application/json;charset=utf-8'};if(kind==='audit')return {name:'audit.json',text:r.auditJson,type:'application/json;charset=utf-8'};return null;}function downloadText(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}function sendToCanvas(targetCanvas){state.pendingHandoff=createPendingCanvasHandoff({exportResult:state.exportResult,graph:state.graph,profile:state.profile,targetCanvas});state.exportStatus=state.pendingHandoff?`Review handoff details for ${state.pendingHandoff.summary.targetCanvas}.`:'No XML artifact is available for handoff.';setActiveTab('export');renderShell();}function cancelCanvasHandoff(){state.pendingHandoff=null;state.exportStatus='Canvas handoff cancelled.';setActiveTab('export');renderShell();}function confirmCanvasHandoff(){const result=sendCanvasHandoffArtifact(state.pendingHandoff?.artifact,{documentRef:document,confirmed:true});state.pendingHandoff=null;state.exportStatus=result.message;setActiveTab('export');renderShell();}
function clickHandler(event){if(event.target.closest(BUTTON_SELECTOR)){event.preventDefault();openShell();return;}if(event.target.closest('[data-table-categorized-close]')){event.preventDefault();closeShell();return;}const step=event.target.closest('[data-table-categorized-step]')?.dataset.tableCategorizedStep;if(step){event.preventDefault();setActiveStep(step);renderShell();return;}const tab=event.target.closest('[data-table-categorized-tab]')?.dataset.tableCategorizedTab;if(tab){event.preventDefault();setActiveTab(tab);renderShell();return;}const download=event.target.closest('[data-table-categorized-download]')?.dataset.tableCategorizedDownload;if(download){event.preventDefault();downloadArtifact(download);return;}const action=event.target.closest('[data-table-categorized-action]')?.dataset.tableCategorizedAction;if(action==='add-source'){event.preventDefault();setSources(addSource({sources:state.sources,activeSourceId:state.activeSourceId}));renderShell();return;}if(action==='remove-source'){event.preventDefault();setSources(removeSource({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId));resetDerived();renderShell();return;}if(action==='rename-source'||action==='parse'){event.preventDefault();parseActiveSource();return;}if(action==='clear'){event.preventDefault();clearActive();return;}if(action==='load-sample'){event.preventDefault();loadSample();return;}if(action==='load-coordinate-sample'){event.preventDefault();loadCoordinateSample();return;}if(action==='load-two-source-template'){event.preventDefault();loadTwoSourceTemplate();return;}if(action==='confirm-columns'){event.preventDefault();confirmColumns();return;}if(action==='build-graph'){event.preventDefault();buildGraph();return;}if(action==='use-current-graph-source-canvas'){event.preventDefault();useCurrentGraphAsSourceCanvas();return;}if(action==='use-imported-graph-target-canvas'){event.preventDefault();useImportedGraphAsTargetCanvas();return;}if(action==='run-graph-compare-canvas'){event.preventDefault();runGraphCompareCanvas();return;}if(action==='build-graph-connectors'){event.preventDefault();buildGraphConnectors();return;}if(action==='download-graph-connectors-json'){event.preventDefault();downloadGraphConnectorsJson();return;}if(action==='clear-compare-canvas-preview'){event.preventDefault();clearCompareCanvasPreview();return;}if(action==='send-source'){event.preventDefault();sendToCanvas('source');return;}if(action==='send-target'){event.preventDefault();sendToCanvas('target');return;}if(action==='cancel-canvas-handoff'){event.preventDefault();cancelCanvasHandoff();return;}if(action==='confirm-canvas-handoff'){event.preventDefault();confirmCanvasHandoff();return;}if(action==='new-blank-profile'||action==='reset-profile'){event.preventDefault();loadBlankProfile();return;}if(action==='load-ps-template'){event.preventDefault();loadPsTemplate();return;}if(action==='load-suggested-profile'){event.preventDefault();const indexStr=event.target.closest('[data-suggestion-index]')?.dataset.suggestionIndex;if(indexStr){const index=parseInt(indexStr,10);const activeSrc=activeSource(state);const headers=activeSrc?.headers||[];const suggestions=generateSuggestedProfiles(headers);if(suggestions[index]){state.profile=suggestions[index];resetDerived();renderShell();}}return;}if(action==='apply-profile'){event.preventDefault();applyProfileChanges();}}
function inputHandler(event){
  const sourceName=event.target.closest('[data-table-categorized-source-name]');
  if(sourceName){setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{sourceName:sourceName.value}));return;}
  const text=event.target.closest('[data-table-categorized-source-text]');
  if(text){setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{sourceText:text.value}));return;}
  const customDelim=event.target.closest('[data-table-categorized-custom-delimiter]');
  if(customDelim){setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{customDelimiter:customDelim.value}));resetDerived();renderShell();return;}
  const builderInput=event.target.closest('input[data-level-field]');
  if(builderInput){
    const pathStr=builderInput.closest('[data-level-path]')?.dataset.levelPath;
    if(pathStr){
      const path=pathStr.split(',').map(Number);
      const field=builderInput.dataset.levelField;
      state.profile=updateLevelAtPath(state.profile,path,{[field]:builderInput.value});
      resetDerived();
      return;
    }
  }
}
function changeHandler(event){
  const activeSelect=event.target.closest('[data-table-categorized-active-source]');
  if(activeSelect){setSources(setActiveSource({sources:state.sources,activeSourceId:state.activeSourceId},activeSelect.value));renderShell();return;}
  const delimiter=event.target.closest('[data-table-categorized-delimiter-mode]');
  if(delimiter){setSources(updateSourceDraft({sources:state.sources,activeSourceId:state.activeSourceId},state.activeSourceId,{delimiterMode:delimiter.value||'auto'}));resetDerived();renderShell();return;}
  const targetGraph=event.target.closest('[data-table-categorized-target-graph-input]');
  if(targetGraph){importCompareCanvasTarget(targetGraph).catch((error)=>{state.compareCanvas=withCompareDiagnostic(state.compareCanvas,'ERROR','compare_canvas_target_json_parse_failed','Target graph import failed.',{error:String(error?.message||error)});renderShell();});return;}
  const input=event.target.closest('[data-table-categorized-file]');
  if(input)importFile(input).catch((error)=>console.error('[Table Categorized XML] file import failed',error));
  const profile=event.target.closest('[data-table-categorized-profile-file]');
  if(profile)importProfile(profile).catch((error)=>console.error('[Table Categorized XML] profile import failed',error));
  const concatCheck=event.target.closest('input[data-level-concat-column]');
  if(concatCheck){
    const pathStr=concatCheck.closest('[data-level-path]')?.dataset.levelPath;
    if(pathStr){
      const path=pathStr.split(',').map(Number);
      const colName=concatCheck.dataset.levelConcatColumn;
      const findLevel=(items,p)=>{let curr=items[p[0]];for(let i=1;i<p.length;i++)curr=curr.children[p[i]];return curr;};
      const defs=state.profile.levelDefinitions;
      const currentLevel=findLevel(defs,path);
      const existingParts=currentLevel.keyResolver?.parts||[];
      const existingCols=existingParts.filter((p)=>p&&typeof p==='object').map((p)=>p.column);
      let newCols;
      if(concatCheck.checked){newCols=[...existingCols,colName];}
      else{newCols=existingCols.filter((c)=>c!==colName);}
      const newParts=[];
      newCols.forEach((col,idx)=>{if(idx>0)newParts.push(' + ');newParts.push({op:'trim',column:col});});
      state.profile=updateLevelAtPath(state.profile,path,{keyResolver:{op:'concat',parts:newParts}});
      resetDerived();
      renderShell();
    }
    return;
  }
  const splitDotCheck=event.target.closest('input[data-level-split-dot]');
  if(splitDotCheck){
    const pathStr=splitDotCheck.closest('[data-level-path]')?.dataset.levelPath;
    if(pathStr){
      const path=pathStr.split(',').map(Number);
      const findLevel=(items,p)=>{let curr=items[p[0]];for(let i=1;i<p.length;i++)curr=curr.children[p[i]];return curr;};
      const defs=state.profile.levelDefinitions;
      const currentLevel=findLevel(defs,path);
      const isTakeToken = currentLevel.keyResolver?.op === 'takeToken';
      const keyCol = isTakeToken ? currentLevel.keyResolver.input?.column : (currentLevel.keyResolver?.column || '');
      
      if (keyCol) {
        if (splitDotCheck.checked) {
          state.profile=updateLevelAtPath(state.profile,path,{
            keyResolver:{op:'takeToken',input:{op:'trim',column:keyCol},delimiter:'.',index:0},
            displayNameResolver:{op:'takeToken',input:{op:'trim',column:keyCol},delimiter:'.',index:0}
          });
        } else {
          state.profile=updateLevelAtPath(state.profile,path,{
            keyResolver:{op:'trim',column:keyCol},
            displayNameResolver:undefined
          });
        }
        resetDerived();
        renderShell();
      }
    }
    return;
  }
  const builderSelect=event.target.closest('select[data-level-field]');
  if(builderSelect){
    const pathStr=builderSelect.closest('[data-level-path]')?.dataset.levelPath;
    if(pathStr){
      const path=pathStr.split(',').map(Number);
      const field=builderSelect.dataset.levelField;
      if(field==='keyColumn'){
        if(builderSelect.value==='__concat__'){
          state.profile=updateLevelAtPath(state.profile,path,{keyResolver:{op:'concat',parts:[]},displayNameResolver:undefined});
        }
        else if(builderSelect.value!==''){
          state.profile=updateLevelAtPath(state.profile,path,{keyResolver:{op:'trim',column:builderSelect.value},displayNameResolver:undefined});
        }
        else{
          state.profile=updateLevelAtPath(state.profile,path,{keyResolver:undefined,displayNameResolver:undefined});
        }
      }else{state.profile=updateLevelAtPath(state.profile,path,{[field]:builderSelect.value});}
      resetDerived();
      renderShell();
      return;
    }
  }
}
export function installTableCategorizedRuntime(doc=globalThis.document){if(runtimeInstalled||!doc?.addEventListener)return false;runtimeInstalled=true;doc.addEventListener('click',clickHandler,{capture:true});doc.addEventListener('input',inputHandler,{capture:true});doc.addEventListener('change',changeHandler,{capture:true});injectButton(doc);if(typeof MutationObserver!=='undefined'&&doc.body){tableCategorizedObserver=new MutationObserver(()=>injectButton(doc));tableCategorizedObserver.observe(doc.body,{childList:true,subtree:true});}return true;}
installTableCategorizedRuntime();
export const _test=Object.freeze({installTableCategorizedRuntime,getTableCategorizedObserver:()=>tableCategorizedObserver,setActiveStep,setActiveTab});

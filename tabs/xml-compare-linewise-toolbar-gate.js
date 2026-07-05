export const XML_COMPARE_LINEWISE_TOOLBAR_GATE_SCHEMA='xml-compare-linewise-toolbar-gate/v7-native-workflow-safe';

const STYLE_ID='xml-compare-linewise-toolbar-gate-style';
const WORKFLOW_BUTTON='data-xml-compare-categorized-open';
const CONVERTER_SHORTCUT_BUTTON='data-xml-compare-categorized-converter-shortcut';
const TABLE_WORKFLOW_BUTTON='data-xml-compare-table-categorized-open';

let installed=false;
let toolbarObserver=null;

export function toolbarStyleCss(){
  return `.xml-compare-toolbar{gap:8px}.xml-compare-toolbar>[${WORKFLOW_BUTTON}],.xml-compare-toolbar>[${CONVERTER_SHORTCUT_BUTTON}],.xml-compare-toolbar>[${TABLE_WORKFLOW_BUTTON}]{justify-content:center}.xml-compare-toolbar>[${CONVERTER_SHORTCUT_BUTTON}]{border:1px solid rgba(216,180,254,.45);border-radius:8px;background:rgba(88,28,135,.28);color:#f3e8ff;font-weight:850}`;
}

function injectStyle(doc=globalThis.document){
  if(!doc?.head)return null;
  let style=doc.getElementById(STYLE_ID);
  if(!style){style=doc.createElement('style');style.id=STYLE_ID;doc.head.append(style);}
  style.textContent=toolbarStyleCss();
  return style;
}

function converterTabKeys(){return Object.freeze(['load-canvas','canvas','load','preview','categorize']);}
function converterTabLabels(){return Object.freeze(['Load Canvas','Load categorized','Categorized Preview','Preview','Categorize']);}

function openWorkflow(doc=globalThis.document){
  const button=doc?.querySelector?.(`[${WORKFLOW_BUTTON}]`);
  button?.click?.();
  return doc?.querySelector?.('[data-xml-compare-categorized-popup]')||null;
}

function tabMatches(tab,keys,labels){
  const key=String(tab?.dataset?.xmlCompareLinewiseTab||'').toLowerCase();
  const text=String(tab?.textContent||'').toLowerCase();
  return keys.some((item)=>key===item)||labels.some((item)=>text.includes(item.toLowerCase()));
}

function selectWorkflowTab(popup,keys=converterTabKeys(),labels=converterTabLabels()){
  const tabs=[...(popup?.querySelectorAll?.('[data-xml-compare-linewise-tab]')||[])];
  const tab=tabs.find((item)=>tabMatches(item,keys,labels));
  tab?.click?.();
  return tab||null;
}

function openConverterWorkflow(doc=globalThis.document){
  const popup=openWorkflow(doc);
  selectWorkflowTab(popup);
  return popup;
}

function clickShortcut(event,doc=globalThis.document){
  const button=event.target?.closest?.(`[${CONVERTER_SHORTCUT_BUTTON}]`);
  if(!button)return false;
  event.preventDefault();
  event.stopPropagation();
  openConverterWorkflow(doc);
  return true;
}

export function installXmlCompareLinewiseToolbarGate(doc=globalThis.document){
  if(installed||!doc?.addEventListener)return false;
  installed=true;
  injectStyle(doc);
  doc.addEventListener('click',(event)=>clickShortcut(event,doc));
  if(typeof MutationObserver!=='undefined'&&doc.body){
    toolbarObserver=new MutationObserver(()=>{injectStyle(doc);});
    toolbarObserver.observe(doc.body,{childList:true,subtree:true});
  }
  return true;
}

installXmlCompareLinewiseToolbarGate();

export const _test=Object.freeze({openWorkflow,openConverterWorkflow,selectWorkflowTab,tabMatches,converterTabKeys,converterTabLabels,clickShortcut,installXmlCompareLinewiseToolbarGate,toolbarStyleCss,getToolbarObserver:()=>toolbarObserver});

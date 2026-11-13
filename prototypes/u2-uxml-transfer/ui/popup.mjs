import {attempt,require} from '../kit/core.mjs';

// The pinned validator also contains a Node CLI. The HTML import map points its
// Node-only imports here; that CLI is unreachable in the browser and fails if called.
const unavailable=()=>{throw new Error('U2_BROWSER_NODE_IO_DISABLED');};
export {unavailable as readFileSync,unavailable as readdirSync,unavailable as fileURLToPath,unavailable as dirname,unavailable as join};
const keys=['branchOrdinal','branchName','nodeOrdinal','nodeNumber','componentRefNo'];
const sameRef=(a,b)=>b&&keys.every(k=>a[k]===b[k])&&(b.kind===undefined||b.kind==='xml');
const refKey=r=>JSON.stringify(keys.map(k=>r[k]));

// The exact planner list is shared by CLI and page; choices never hide initial diagnostics.
export async function listAmbiguities(source,target,pairs,options={}){
 const {planTransfer}=await import('../engine/plan.mjs');
 const result=await planTransfer(source,target,pairs,{...options,choices:{}});
 return result.ok?{ok:true,ambiguities:result.ambiguities}:result;
}

// Group by exact name (not by collision type); preserve every diagnostic and
// deduplicate the candidate refs shown for multiple rows of the same name.
export function groupAmbiguities(ambiguities){
 const groups=new Map(),readOnly=[];
 for(const a of ambiguities){
  if(a.code==='U2_BRANCH_FIELD_SPLIT'||typeof a.name!=='string'){readOnly.push(a);continue;}
  if(!groups.has(a.name))groups.set(a.name,{name:a.name,rows:[],candidates:new Map()});
  const g=groups.get(a.name);g.rows.push(a);
  for(const c of a.candidates??[])g.candidates.set(refKey(c.ref),c);
 }
 return {names:[...groups.values()].map(g=>({...g,candidates:[...g.candidates.values()]})),readOnly};
}

// Export only canonical refs from the actual popup, never caller-provided ref objects.
// Unknown names, unknown refs and malformed/duplicate/empty selections fail closed.
export async function buildChoices(ambiguities,selections){
 return attempt(()=>{
  require(selections&&typeof selections==='object'&&!Array.isArray(selections),'U2_CHOICE_NOT_OFFERED','choices','Expected a name-to-selection object.');
  const offered=new Map(groupAmbiguities(ambiguities).names.map(g=>[g.name,g.candidates]));
  const entries=[];
  for(const [name,answer] of Object.entries(selections)){
   require(offered.has(name),'U2_CHOICE_NOT_OFFERED',name,'Name was not offered.');
   if(answer==='skip'){entries.push([name,'skip']);continue;}
   require(Array.isArray(answer)&&answer.length>0,'U2_CHOICE_NOT_OFFERED',name,'Choose one or more offered nodes, or skip.');
   const selected=answer.map(r=>offered.get(name).find(c=>sameRef(c.ref,r)));
   require(selected.every(Boolean),'U2_CHOICE_NOT_OFFERED',name,'A selected node was not offered.');
   require(new Set(selected.map(c=>refKey(c.ref))).size===selected.length,'U2_CHOICE_NOT_OFFERED',name,'Duplicate selected node.');
   entries.push([name,selected.map(c=>({...c.ref}))]);
  }
  return {choices:Object.fromEntries(entries)};
 });
}

// Dependency-injected document permits Node tests of the actual DOM rendering path.
export function renderAmbiguities(doc,root,ambiguities,onChange=()=>{}){
 root.replaceChildren();
 const add=(parent,tag,value='')=>{const el=doc.createElement(tag);el.textContent=String(value);parent.append(el);return el;};
 const {names,readOnly}=groupAmbiguities(ambiguities),controls=[];
 if(!ambiguities.length)add(root,'p','No ambiguities.');
 for(const g of names){
  const box=add(root,'fieldset');add(box,'legend',g.name);
  for(const a of g.rows)add(box,'p',a.code);
  const skipLabel=add(box,'label'),skip=add(skipLabel,'input');skip.type='checkbox';add(skipLabel,'span','Skip this name');
  const checks=g.candidates.map(c=>{
   const label=add(box,'label'),input=add(label,'input');input.type='checkbox';
   add(label,'span',`${c.ref.branchName} · Node ${c.ref.nodeNumber} (branch ${c.ref.branchOrdinal}, node ${c.ref.nodeOrdinal}) · DN ${c.bore??'unknown'} · OD ${c.od||'unknown'} · Position ${c.position??'unknown'}`);
   input.addEventListener('change',()=>{if(input.checked)skip.checked=false;onChange();});return {input,ref:c.ref};
  });
  skip.addEventListener('change',()=>{if(skip.checked)for(const c of checks)c.input.checked=false;onChange();});
  controls.push({name:g.name,skip,checks});
 }
 for(const a of readOnly){
  const box=add(root,'section');add(box,'h2',`${a.code} · ${a.field??''}`);
  add(box,'p','Read-only: branch field withheld. Candidate values: '+(a.values??[]).join(', '));
  for(const c of a.candidates??[])add(box,'p',`${c.source?.branchName??''} / ${c.source?.nodeNumber??''} → ${c.target?.branchName??''} / ${c.target?.nodeNumber??''}: ${c.value??''}`);
 }
 return {
  complete:()=>controls.every(g=>g.skip.checked||g.checks.some(c=>c.input.checked)),
  selections:()=>Object.fromEntries(controls.flatMap(g=>g.skip.checked?[[g.name,'skip']]:g.checks.some(c=>c.input.checked)?[[g.name,g.checks.filter(c=>c.input.checked).map(c=>c.ref)]]:[]))
 };
}

function mount(doc){
 const $=id=>doc.getElementById(id),files=['source','target','pairs'].map($),opts=['name','weight','element','bore'].map($),download=$('download');
 let generation=0,current=null;
 const status=(message)=>{$('status').textContent=message;};
 const update=()=>{download.disabled=!current||!current.controls.complete();};
 async function refresh(){
  const ticket=++generation;current=null;update();$('rows').replaceChildren();
  const [source,target,pairs]=files.map(f=>f.files[0]);
  if(!source||!target||!pairs){status('Choose all three input files.');return;}
  const options={items:opts.slice(0,3).filter(f=>f.checked).map(f=>f.id),bore:opts[3].checked};
  status('Planning locally…');
  try{
   const [s,t,p]=await Promise.all([source.arrayBuffer(),target.arrayBuffer(),pairs.text()]);
   const result=await listAmbiguities(new Uint8Array(s),new Uint8Array(t),JSON.parse(p),options);
   if(ticket!==generation)return;
   if(!result.ok){status(result.refusals.map(r=>`${r.code}: ${r.where} ${r.detail}`).join(' · '));return;}
   const controls=renderAmbiguities(doc,$('rows'),result.ambiguities,update);
   current={ambiguities:result.ambiguities,controls};update();
   status(`${result.ambiguities.length} ambiguity row(s). Choose one or more nodes or skip each name.`);
  }catch(e){if(ticket===generation)status(e instanceof SyntaxError?'U2_JSON_INVALID: invalid pairs JSON':e.message);}
 }
 for(const f of [...files,...opts])f.addEventListener('change',refresh);
 download.addEventListener('click',async()=>{
  const snapshot=current;if(!snapshot||!snapshot.controls.complete())return;
  const result=await buildChoices(snapshot.ambiguities,snapshot.controls.selections());
  if(snapshot!==current)return;
  if(!result.ok){status(result.refusals.map(r=>`${r.code}: ${r.detail}`).join(' · '));return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify(result.choices,null,2)+'\n'],{type:'application/json'}));
  const a=doc.createElement('a');a.href=url;a.download='choices.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
  status('choices.json prepared. Use the same inputs and options with CLI apply.');
 });
 update();
}

if(typeof document!=='undefined'){
 // Supply only the argv guard used by the pinned validator's command-line entry.
 // Dynamic planner import happens after this module has finished evaluating.
 if(typeof globalThis.process==='undefined')globalThis.process=Object.freeze({argv:Object.freeze([])});
 mount(document);
}

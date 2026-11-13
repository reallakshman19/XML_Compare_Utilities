import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {planTransfer} from '../engine/plan.mjs';
import {listAmbiguities,buildChoices,groupAmbiguities,renderAmbiguities} from '../ui/popup.mjs';
import {scanXml,psi116Index,child,text} from '../kit/xmlspan.mjs';
import {sha256Hex} from '../kit/core.mjs';
import {node,branch,xml,pair,ref} from './fixtures.mjs';
const qualified=bytes=>new TextEncoder().encode(new TextDecoder().decode(bytes).replace('<PipeStressExport>','<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">'));
const doc=(...nodes)=>qualified(xml([branch(nodes)]));
const ps=[pair(0,0),pair(0,1)];
const repeated=(name='X')=>[doc(node(name),node(name)),doc(node('A'),node('B'))];
function fixture(s,t,p=ps){const dir=mkdtempSync(join(tmpdir(),'u2c-'));const [sp,tp,pp,out,changes,choices]=['s.xml','t.xml','pairs.json','out.xml','changes.json','choices.json'].map(n=>join(dir,n));writeFileSync(sp,s);writeFileSync(tp,t);writeFileSync(pp,JSON.stringify(p));return {sp,tp,pp,out,changes,choices,clean:()=>rmSync(dir,{recursive:true,force:true})};}
function cli(...args){const r=spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});return {status:r.status,value:JSON.parse(r.stdout),stderr:r.stderr};}
function names(bytes){const d=scanXml(bytes);return psi116Index(d).nodes.map(n=>text(d,child(n.element,'NodeName',true)).value);}
const apply=f=>cli('apply',f.sp,f.tp,f.pp,'--out',f.out,'--changes',f.changes,'--choices',f.choices);
async function list(s,t,p=ps){const r=await listAmbiguities(s,t,p);assert.equal(r.ok,true,JSON.stringify(r));return r.ambiguities;}
async function choices(a,c){const r=await buildChoices(a,c);assert.equal(r.ok,true,JSON.stringify(r));return r.choices;}
test('U2c T1 page ambiguity list exactly equals planner and CLI, including read-only branch splits',async()=>{
 const s=qualified(xml([branch([node('X')],{Temperature:200}),branch([node('X')],{Temperature:300})])),t=doc(node('A'),node('B')),p=[pair(0,0),pair(1,0,0,1)];
 const a=await list(s,t,p),r=await planTransfer(s,t,p);assert.deepEqual(a,r.ambiguities);assert.deepEqual(a.map(x=>x.code).sort(),['U2_BRANCH_FIELD_SPLIT','U2_NAME_REPEATED']);assert.deepEqual(groupAmbiguities(a).readOnly[0].values,['200','300']);
 const f=fixture(s,t,p);try{const q=cli('ambiguities',f.sp,f.tp,f.pp);assert.equal(q.status,0);assert.deepEqual(q.value,a);}finally{f.clean();}
});
test('U2c T2 choices JSON exported by page applies one or several selected nodes via real CLI/U1',async()=>{
 const [s,t]=repeated(),a=await list(s,t);
 for(const [selection,want] of [[[ref(0,1)],['A','X']],[[ref(0,0),ref(0,1)],['X','X']]]){
  const f=fixture(s,t);try{const c=await choices(a,{X:selection});writeFileSync(f.choices,JSON.stringify(c));const r=apply(f);assert.equal(r.status,0,JSON.stringify(r.value));assert.deepEqual(names(readFileSync(f.out)),want);assert.equal(r.value.changes.length,selection.length);assert.deepEqual(r.value.roundtrip,{appliedRemaining:0,otherRemaining:[]});}finally{f.clean();}
 }
});
test('U2c T3 explicit skip exports skip, writes no name edits',async()=>{
 const [s,t]=repeated(),a=await list(s,t),f=fixture(s,t);try{writeFileSync(f.choices,JSON.stringify(await choices(a,{X:'skip'})));const r=apply(f);assert.equal(r.status,0,JSON.stringify(r.value));assert.deepEqual(r.value.changes,[]);assert.deepEqual(new Uint8Array(readFileSync(f.out)),t);}finally{f.clean();}
});
test('U2c T4 unoffered node refused by page builder and CLI, no output',async()=>{
 const [s,t]=repeated(),a=await list(s,t),f=fixture(s,t);try{
  for(const bad of [{X:[ref(9,9)]},{X:[{...ref(0,0),componentRefNo:'WRONG'}]},{Y:[ref(0,0)]}]){const r=await buildChoices(a,bad);assert.equal(r.ok,false);assert.equal(r.refusals[0].code,'U2_CHOICE_NOT_OFFERED');assert.equal(r.choices,undefined);}
  writeFileSync(f.choices,JSON.stringify({X:[ref(9,9)]}));const r=apply(f);assert.equal(r.status,1);assert.equal(r.value.refusals[0].code,'U2_CHOICE_NOT_OFFERED');assert.equal(existsSync(f.out),false);assert.equal(existsSync(f.changes),false);
 }finally{f.clean();}
});
// Minimal DOM double: stores text literally and records actual event listeners.
function element(tag){return {tag,children:[],textContent:'',checked:false,events:{},append(...kids){this.children.push(...kids);},replaceChildren(){this.children=[];},addEventListener(k,fn){this.events[k]=fn;}};}
function flatten(e){return [e,...e.children.flatMap(flatten)];}
test('U2c T5 markup-like names render as text only; never HTML parsing',async()=>{
 const name='X <img src=x> & Y',[s,t]=repeated('X &lt;img src=x&gt; &amp; Y'),a=await list(s,t),root=element('root');
 const controls=renderAmbiguities({createElement:element},root,a);assert.equal(a[0].name,name);const all=flatten(root);assert.ok(all.some(x=>x.tag==='legend'&&x.textContent===name));assert.ok(!all.some(x=>x.tag==='img'));assert.equal(controls.complete(),false);
 const inputs=all.filter(x=>x.tag==='input');inputs[2].checked=true;inputs[2].events.change();assert.equal(controls.complete(),true);assert.deepEqual(await choices(a,controls.selections()),{[name]:[ref(0,1)]});
 assert.doesNotMatch(readFileSync(new URL('../ui/popup.mjs',import.meta.url),'utf8'),/innerHTML|outerHTML|insertAdjacentHTML/);
});
test('U2c same-name cross-bore rows group once without losing diagnostics; skip deselects',async()=>{
 const s=doc(node('X',60.3),node('X',88.9)),t=doc(node('A',88.9),node('B',60.3));const a=(await listAmbiguities(s,t,ps,{items:['name']})).ambiguities;assert.equal(a.length,2);const g=groupAmbiguities(a).names;assert.equal(g.length,1);assert.equal(g[0].rows.length,2);assert.equal(g[0].candidates.length,2);const root=element('root'),c=renderAmbiguities({createElement:element},root,a);const inputs=flatten(root).filter(x=>x.tag==='input');inputs[1].checked=true;inputs[1].events.change();inputs[0].checked=true;inputs[0].events.change();assert.equal(inputs[1].checked,false);assert.deepEqual(c.selections(),{X:'skip'});
});
test('U2c Map hash locks, candidate pairs ignored and branch diagnostics never selectable',async()=>{
 const [s,t]=repeated();const m={format:'topofix.map',version:1,createdAt:'2026-11-13T00:00:00Z',source:{kind:'xml',fileName:'s.xml',sha256:await sha256Hex(s)},target:{kind:'xml',fileName:'t.xml',sha256:await sha256Hex(t)},method:'manual',pairs:ps.map((p,i)=>({pairId:`P${i}`,source:{kind:'xml',...p.source},target:{kind:'xml',...p.target},status:i?'candidate':'approved',evidence:{rule:'manual',detail:'invented'},...(i?{}:{approvedBy:'test',approvedAt:'2026-11-13T00:00:00Z'})}))};const a=await list(s,t,m);assert.equal(a.length,1);assert.deepEqual(a[0].candidates.map(c=>c.ref),[ref(0,0)]);m.target.sha256='0'.repeat(64);assert.equal((await listAmbiguities(s,t,m)).refusals[0].code,'U2_MAP_FILE_MISMATCH');
 const b=[{code:'U2_BRANCH_FIELD_SPLIT',field:'Branch/Temperature',values:['1','2'],candidates:[]}];assert.deepEqual((await choices(b,{})),{});assert.equal((await buildChoices(b,{'Branch/Temperature':'skip'})).refusals[0].code,'U2_CHOICE_NOT_OFFERED');const root=element('root');assert.equal(renderAmbiguities({createElement:element},root,b).complete(),true);assert.equal(flatten(root).filter(x=>x.tag==='input').length,0);
});
test('U2c special object keys are safe own JSON keys, invalid selection shapes refused',async()=>{
 const [s,t]=repeated('__proto__'),a=await list(s,t);const c=await choices(a,JSON.parse('{"__proto__":"skip"}'));assert.equal(Object.hasOwn(c,'__proto__'),true);assert.equal(JSON.stringify(c),'{"__proto__":"skip"}');assert.equal(Object.getPrototypeOf(c),Object.prototype);
 for(const v of [null,[],{__proto__:null,X:'skip'},JSON.parse('{"__proto__":[]}'),JSON.parse('{"__proto__":null}')])assert.equal((await buildChoices(a,v)).ok,false);
});
test('U2c browser module graph loads with HTML import map and no Node globals (VM, no browser)',()=>{
 const script=`import vm from 'node:vm';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
 const page=path.resolve('ui/index.html'),map=JSON.parse(fs.readFileSync(page,'utf8').match(/<script type="importmap">([^<]+)<\\/script>/)[1]).imports;
 const dummy={addEventListener(){},replaceChildren(){}};const context=vm.createContext({document:{getElementById:()=>dummy},TextEncoder,TextDecoder,Uint8Array,crypto:globalThis.crypto});
 const modules=new Map();const lookup=(spec,parent)=>load(spec in map?pathToFileURL(path.resolve(path.dirname(page),map[spec])).href:new URL(spec,parent.identifier).href);
 function load(url){if(!modules.has(url))modules.set(url,new vm.SourceTextModule(fs.readFileSync(fileURLToPath(url),'utf8'),{identifier:url,context,importModuleDynamically:async(spec,parent)=>{const m=lookup(spec,parent);if(m.status==='unlinked')await m.link(lookup);if(m.status==='linked')await m.evaluate();return m;}}));return modules.get(url);}
 const entry=load(pathToFileURL(path.resolve('ui/popup.mjs')).href);await entry.link(lookup);await entry.evaluate();assert.equal(context.process.argv.length,0);
 const {node,branch,xml,pair}=await import('./tests/fixtures.mjs');const s=xml([branch([node('X'),node('X')])]),t=xml([branch([node('A'),node('B')])]);const m={format:'topofix.map',version:1,createdAt:'2026-11-13T00:00:00Z',source:{kind:'xml',fileName:'s.xml',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',s)).toString('hex')},target:{kind:'xml',fileName:'t.xml',sha256:Buffer.from(await crypto.subtle.digest('SHA-256',t)).toString('hex')},method:'manual',pairs:[0,1].map(i=>{const p=pair(0,i);return {pairId:String(i),source:{kind:'xml',...p.source},target:{kind:'xml',...p.target},status:'approved',approvedBy:'test',approvedAt:'2026-11-13T00:00:00Z',evidence:{rule:'manual',detail:'invented'}};})};const r=await entry.namespace.listAmbiguities(s,t,m);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.ambiguities[0].name,'X');assert.equal(r.ambiguities[0].candidates.length,2);`;
 const r=spawnSync(process.execPath,['--experimental-vm-modules','--input-type=module','-e',script],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
});

import {planNames} from '../engine/plan.mjs';
import {approveAll} from '../engine/approve.mjs';
import {applyNames} from '../engine/run.mjs';
const $=id=>document.getElementById(id);
let plan=null, cs=null, target=null, result=null, busy=false, generation=0;
const inputs=['source','target','map'];
function controls(){ $('plan').disabled=busy||!inputs.every(id=>$(id).files.length);$('approve').disabled=busy||!plan||!$('by').value.trim();$('apply').disabled=busy||!cs||!cs.changes.every(c=>c.approval.approved);$('export').disabled=busy||!cs;$('download').disabled=busy||!result?.ok; }
function reset(){generation++;plan=cs=target=result=null;for(const id of ['summary','proposals','missing','results','status'])$(id).replaceChildren();$('json').value='';controls();}
function table(id,headers,rows){const t=document.createElement('table');const h=t.createTHead().insertRow();for(const s of headers){const th=document.createElement('th');th.textContent=s;h.append(th);}const b=t.createTBody();for(const row of rows){const tr=b.insertRow();for(const v of row)tr.insertCell().textContent=String(v??'');}$(id).replaceChildren(t);}
function report(r){if(!r.ok)throw Error(r.refusals.map(x=>`${x.code} · ${x.where}: ${x.detail}`).join('\n'));return r;}
function showCS(){ $('json').value=JSON.stringify(cs,null,2); }
async function work(fn){if(busy)return;busy=true;const g=generation;$('status').textContent='';controls();try{await fn(g);}catch(e){if(g===generation)$('status').textContent=e.message;}finally{busy=false;controls();}}
for(const id of inputs)$(id).addEventListener('change',reset);$('by').addEventListener('input',controls);
$('plan').onclick=()=>{reset();work(async g=>{const [a,b,m]=await Promise.all([$('source').files[0].arrayBuffer(),$('target').files[0].arrayBuffer(),$('map').files[0].text()]);const p=report(await planNames(new Uint8Array(a),new Uint8Array(b),JSON.parse(m)));if(g!==generation)return;plan=p;cs=p.changeset;target=new Uint8Array(b);$('summary').textContent=`${cs.changes.length} proposals; ${p.unchanged.length} unchanged; ${p.noEntry.length} missing records.`;table('proposals',['Node','Old name','New name'],cs.changes.map(c=>[c.target.node,c.oldToken,c.newValue]));table('missing',['Node','Source name','Reason'],p.noEntry.map(x=>[x.node,x.name,x.code]));showCS();});};
$('approve').onclick=()=>work(async g=>{const a=report(await approveAll(cs,{by:$('by').value,at:new Date().toISOString()}));if(g!==generation)return;cs=a.changeset;result=null;$('results').replaceChildren();showCS();$('status').textContent=`Approved ${cs.changes.length} names.`;});
$('apply').onclick=()=>work(async g=>{result=null;$('results').replaceChildren();const r=report(await applyNames(target,cs));if(g!==generation)return;result=r;table('results',['Node','Old','New','Read back','OK'],r.report.map(x=>[x.node,x.old,x.new,x.readBack,x.ok]));$('status').textContent=`Verified ${r.report.length} names.`;});
function save(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>save(JSON.stringify(cs,null,2)+'\n','names.changeset.json','application/json');$('download').onclick=()=>save(result.bytes,'revised-'+$('target').files[0].name,'application/octet-stream');controls();

// The unchanged validator checks process.argv only to decide whether its CLI is running.
// No Node filesystem function is used by validate(); the import map provides throwing stubs.
globalThis.process = {argv:[]};
const {rigidInventory,baseFor}=await import('../engine/inventory.mjs');
const {parseCsv,proposeFromTable}=await import('../engine/propose.mjs');
const {approveAll}=await import('../engine/approve.mjs');
const {importForReview,zeroRows,canApply}=await import('../engine/session.mjs');
const {applyWeights}=await import('../engine/run.mjs');
const $=id=>document.getElementById(id);
let bytes,base,inventory,cs,result,busy=false,approvedInSession=false;
const confirmedZeros=new Set();
const report=e=>{ $('status').textContent=(e?.refusals||[e]).map(x=>[x.code,x.where,x.detail].filter(Boolean).join(' — ')||x.message||String(x)).join('\n'); };
function table(id,headers,rows){const t=document.createElement('table'),head=t.createTHead().insertRow();for(const h of headers){const th=document.createElement('th');th.textContent=h;head.append(th);}const body=t.createTBody();for(const r of rows){const tr=body.insertRow();for(const v of r)tr.insertCell().textContent=String(v??'');}$(id).replaceChildren(t);}
function refresh(){
 for(const id of ['cii','csv','cs','rows','by','limit'])$(id).disabled=busy;
 $('propose').disabled=busy||!base;$('approve').disabled=busy||!cs||!cs.changes.length;$('apply').disabled=busy||!canApply(cs,approvedInSession);
 $('download').disabled=busy||!result?.ok;$('export').disabled=busy||!cs;$('copy').disabled=busy||!cs;
 $('json').value=cs?JSON.stringify(cs,null,2):'';
 table('proposals',['ID','FROM','TO','Old token','New kg','Approved'],(cs?.changes||[]).map(c=>[c.changeId,c.target.fromNode,c.target.toNode,c.oldToken,c.newValue,c.approval.approved?'Yes':'No']));
 const zeroList=$('zero-list');zeroList.replaceChildren();
 for(const c of zeroRows(cs)){
  const label=document.createElement('label'),tick=document.createElement('input');tick.type='checkbox';tick.checked=confirmedZeros.has(c.changeId);tick.disabled=busy||approvedInSession;
  tick.onchange=()=>{if(tick.checked)confirmedZeros.add(c.changeId);else confirmedZeros.delete(c.changeId);approvedInSession=false;result=undefined;refresh();};
  label.append(tick,document.createTextNode(` ${c.changeId}: ${c.target.fromNode} → ${c.target.toNode} (${c.oldToken} → 0 kg)`));zeroList.append(label);
 }
 $('zeros').hidden=zeroList.childElementCount===0;
 table('results',['ID','FROM','TO','Old','New','Read-back','Result'],(result?.report||[]).map(r=>[r.changeId,r.fromNode,r.toNode,r.old,r.new,r.readBack,r.ok?'ok':'refused']));
}
function clearProposal(){cs=undefined;result=undefined;approvedInSession=false;confirmedZeros.clear();$('approval').textContent='';}
async function guard(fn){if(busy)return;busy=true;$('status').textContent='';refresh();try{await fn();}catch(e){report(e);}finally{busy=false;refresh();}}
$('cii').onchange=()=>guard(async()=>{bytes=base=inventory=undefined;clearProposal();$('base').textContent='';$('count').textContent='';table('inventory',[],[]);const f=$('cii').files[0];if(!f)return;const b=new Uint8Array(await f.arrayBuffer());const inv=rigidInventory(b);const info=await baseFor(b,f.name);bytes=b;inventory=inv;base=info;$('base').textContent=`${f.name} · SHA-256 ${base.sha256}`;$('count').textContent=`(${inv.length})`;table('inventory',['Element (0-based)','FROM','TO','Length mm','Bore mm','Weight kg'],inv.map(r=>[r.elementIndex,r.fromNode,r.toNode,r.lengthMm.toFixed(3),r.boreMm,r.weight]));});
$('csv').onchange=()=>guard(async()=>{clearProposal();const f=$('csv').files[0];if(f)$('rows').value=await f.text();});
$('rows').oninput=()=>{clearProposal();refresh();};
$('cs').onchange=()=>guard(async()=>{clearProposal();const f=$('cs').files[0];if(!f)return;if(!base)throw new Error('Load a CII first.');cs=importForReview(await f.text(),base.sha256);});
$('propose').onclick=()=>guard(async()=>{clearProposal();cs=proposeFromTable(inventory,parseCsv($('rows').value),{base,createdAt:new Date().toISOString()});});
$('approve').onclick=()=>guard(async()=>{result=undefined;approvedInSession=false;const a=approveAll(cs,{by:$('by').value,at:new Date().toISOString(),errorLimitPct:$('limit').valueAsNumber,confirmZeros:[...confirmedZeros]});cs=a.changeset;approvedInSession=true;$('approval').textContent=`${cs.changes.length} approved; ${a.skippedWithinLimit.length} skipped within limit.`;});
$('apply').onclick=()=>guard(async()=>{if(!canApply(cs,approvedInSession))return;result=undefined;const r=await applyWeights(bytes,cs);if(!r.ok)throw r;result=r;});
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download').onclick=()=>download(base.fileName.replace(/\.cii$/i,'')+'-revised.cii',result.bytes,'application/octet-stream');
$('export').onclick=()=>download('weights.changeset.json',$('json').value,'application/json');
$('copy').onclick=()=>guard(async()=>{await navigator.clipboard.writeText($('json').value);$('status').textContent='Change set copied.';});
refresh();

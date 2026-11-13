import {scanXml,psi116Index,child,text} from '../kit/xmlspan.mjs';
import {require,attempt,sha256Hex} from '../kit/core.mjs';
import {validate} from '../vendor/validate.mjs';

const lineNo='[TBA]';
const keys=['branchOrdinal','branchName','nodeOrdinal','nodeNumber','componentRefNo'];
const fields={name:['Node/NodeName'],weight:['Node/Weight'],element:['Node/OutsideDiameter','Node/WallThickness','Node/CorrosionAllowance','Node/InsulationThickness','Branch/Temperature','Branch/Pressure','Branch/FluidDensity','Branch/MaterialNumber','Branch/InsulationDensity']};
// ASME B36.10M steel pipe OD (mm) -> nominal DN (mm); exact to 0.05 mm rounding.
export const OD_NB=Object.freeze([[10.3,6],[13.7,8],[17.1,10],[21.3,15],[26.7,20],[33.4,25],[42.2,32],[48.3,40],[60.3,50],[73,65],[88.9,80],[101.6,90],[114.3,100],[141.3,125],[168.3,150],[219.1,200],[273.1,250],[323.9,300],[355.6,350],[406.4,400],[457.2,450],[508,500],[558.8,550],[609.6,600]]);
const numeric=s=>typeof s==='string'&&s.trim()!==''&&Number.isFinite(Number(s))&&Number(s)>0?Number(s):null;
export function nominalBore(od){const v=numeric(od);return v===null?null:OD_NB.find(([d])=>Math.abs(d-v)<=0.05)?.[1]??null;}
const id=r=>`${r.branchOrdinal}:${r.nodeOrdinal}`;
const ref=r=>Object.fromEntries(keys.map(k=>[k,r[k]]));
const sameRef=(r,s)=>s&&keys.every(k=>r[k]===s[k])&&(s.kind===undefined||s.kind==='xml');
function model(bytes){
 const doc=scanXml(bytes),index=psi116Index(doc),nodes=new Map();
 function value(el,tag){const e=child(el,tag,true);return e?text(doc,e):null;}
 const branchValues=index.branches.map(b=>Object.fromEntries(fields.element.filter(f=>f.startsWith('Branch/')).map(f=>[f,value(b,f.split('/')[1])])));
 for(const n of index.nodes){const values=Object.fromEntries([...fields.name,...fields.weight,...fields.element.filter(f=>f.startsWith('Node/'))].map(f=>[f,value(n.element,f.split('/')[1])]));const od=values['Node/OutsideDiameter']?.value??'';
  nodes.set(id(n),{ref:ref(n),values:{...values,...branchValues[n.branchOrdinal]},od,bore:nominalBore(od),position:value(n.element,'Position')?.value??null,name:values['Node/NodeName']?.value??''});}
 return nodes;
}
const candidate=n=>({lineNo,ref:n.ref,bore:n.bore,position:n.position,od:n.od});
function group(nodes,getName){const m=new Map();for(const n of nodes){const name=getName(n);if(!name)continue;if(!m.has(name))m.set(name,[]);m.get(name).push(n);}return m;}
function hasRepeat(nodes){const bores=nodes.map(n=>n.bore);return new Set(bores).size<bores.length;}
export async function planTransfer(sourceXmlBytes,targetXmlBytes,pairs,{items=['name','weight','element'],bore=false,choices={}}={}){
 return attempt(async()=>{
  require(Array.isArray(items)&&items.every(i=>Object.hasOwn(fields,i)),'U2_ITEM_NOT_ENABLED','items','Only name, weight and element are enabled.');
  require(typeof bore==='boolean'&&choices&&typeof choices==='object'&&!Array.isArray(choices),'U2_OPTIONS_INVALID','options');
  if(!Array.isArray(pairs)){
   require(pairs?.format==='topofix.map'&&pairs.source?.kind==='xml'&&pairs.target?.kind==='xml'&&validate(pairs).length===0,'U2_MAP_INVALID','map');
   require(await sha256Hex(sourceXmlBytes)===pairs.source.sha256.toLowerCase()&&await sha256Hex(targetXmlBytes)===pairs.target.sha256.toLowerCase(),'U2_MAP_FILE_MISMATCH','map');
   pairs=pairs.pairs.filter(p=>p.status==='approved');
  }
  const source=model(sourceXmlBytes),target=model(targetXmlBytes),edits=[],ambiguities=[],refused=[],seenS=new Set(),seenT=new Set(),branches=new Map(),names=new Map(),blockedBranches=new Set();
  const selected=[...new Set(items)];
  const row=(s,t,extra)=>({lineNo,source:s.ref,target:t.ref,...extra});
  const add=(t,field,before,after)=>{if(before!==after)edits.push({lineNo,ref:t.ref,field,before,after});};
  const reject=(s,t,code,field,detail)=>refused.push(row(s,t,{code,field,detail}));
  for(const p of pairs){
   const s=p?.source&&source.get(id(p.source)),t=p?.target&&target.get(id(p.target));
   require(s&&t&&sameRef(s.ref,p.source)&&sameRef(t.ref,p.target)&&!seenS.has(id(s.ref))&&!seenT.has(id(t.ref)),'U2_PAIR_INVALID','pairs','Stale, missing or duplicate node ref.');
   seenS.add(id(s.ref));seenT.add(id(t.ref));
   if(bore&&(numeric(s.od)===null||numeric(t.od)===null||numeric(s.od)!==numeric(t.od))){reject(s,t,'U2_BORE_MISMATCH','Node/OutsideDiameter','Outside diameters differ or are missing.');blockedBranches.add(t.ref.branchOrdinal);continue;}
   for(const item of selected)for(const field of fields[item]){
    const a=s.values[field],b=t.values[field];
    if(field.startsWith('Branch/')){
     const k=`${t.ref.branchOrdinal}:${field}`;if(!branches.has(k))branches.set(k,{field,entries:[]});branches.get(k).entries.push({s,t,a,b});continue;
    }
    if(!a||!b||b.selfClosing){reject(s,t,'U2_FIELD_UNAVAILABLE',field,'Missing source or writable target leaf.');continue;}
    if(item==='name'){if(a.value!==b.value)names.set(id(t.ref),{s,t,name:a.value});}
    else add(t,field,b.value,a.value);
   }
  }
  for(const {field,entries} of branches.values()){
   const {s,t,a,b}=entries[0];
   if(blockedBranches.has(t.ref.branchOrdinal)){reject(s,t,'U2_BORE_MISMATCH',field,'A refused bore pair shares this target branch.');continue;}
   if(entries.some(e=>!e.a||!e.b||e.b.selfClosing)){reject(s,t,'U2_FIELD_UNAVAILABLE',field,'At least one pair lacks a source or writable target branch leaf.');continue;}
   const values=[...new Set(entries.map(e=>e.a.value))];
   if(values.length>1){ambiguities.push(row(s,t,{code:'U2_BRANCH_FIELD_SPLIT',field,values,candidates:entries.map(e=>({lineNo,source:e.s.ref,target:e.t.ref,value:e.a.value}))}));continue;}
   add(t,field,b.value,a.value);
  }
  // Evaluate final names simultaneously, including unmapped target nodes and all source occurrences.
  // If blocking one rename restores a previous name, repeat until no further collision is exposed.
  const sourceGroups=group(source.values(),n=>n.name),pending=new Map(names),reported=new Map(),confirmed=new Map();
  const finalOD=new Map(edits.filter(e=>e.field==='Node/OutsideDiameter').map(e=>[id(e.ref),e.after]));
  const finalTargets=[...target.values()].map(n=>{const od=finalOD.get(id(n.ref))??n.od;return {...n,od,bore:nominalBore(od)};});
  let changed=true;
  while(changed){changed=false;
   const finalGroups=group(finalTargets,n=>pending.get(id(n.ref))?.name??n.name);
   const proposed=group([...pending.values()].map(x=>x.t),n=>pending.get(id(n.ref)).name);
   for(const [name,targets] of proposed){
    const sg=sourceGroups.get(name)??[],tg=finalGroups.get(name)??[];
    if(sg.length<2&&tg.length<2)continue;
    const unknown=[...sg,...tg].some(n=>n.bore===null),repeat=hasRepeat(sg)||hasRepeat(tg);
    if(!unknown&&!repeat)continue;
    const previously=confirmed.get(name);
    if(previously&&tg.every(n=>previously.has(id(n.ref))))continue;
    const answer=Object.hasOwn(choices,name)?choices[name]:undefined;
    const candidates=tg.map(candidate);
    if(answer!==undefined&&!previously){
     require(answer==='skip'||(Array.isArray(answer)&&answer.every(r=>tg.some(n=>sameRef(n.ref,r)))),'U2_CHOICE_INVALID',name,'Choose target refs from the popup or skip.');
     const allowed=new Set(answer==='skip'?[]:answer.map(id));
     for(const t of targets)if(!allowed.has(id(t.ref))){pending.delete(id(t.ref));changed=true;}
     // Explicit selection may authorize same-name/same-bore duplicates.
     confirmed.set(name,new Set(tg.map(n=>id(n.ref))));continue;
    }
    if(!reported.has(name)){const diagnostic={lineNo,code:unknown?'U2_BORE_UNKNOWN':'U2_NAME_REPEATED',name,candidates,sourceCandidates:sg.map(candidate)};ambiguities.push(diagnostic);reported.set(name,diagnostic);}
    for(const t of targets){pending.delete(id(t.ref));changed=true;}
   }
  }
  for(const {t,name} of pending.values())add(t,'Node/NodeName',t.name,name);
  const byItem=Object.fromEntries(selected.map(i=>[i,edits.filter(e=>fields[i].includes(e.field)).length]));
  return {edits,ambiguities,refused,summary:{pairs:pairs.length,edits:edits.length,byItem,ambiguous:ambiguities.length,refused:refused.length}};
 });
}

/**
 * Step 1.2 source-side planning invariants. These functions never write XML.
 * The independent verifier deliberately DOES NOT import this module.
 */
import {INPUTXML_DELTA_TOLERANCE,INPUTXML_HUB_FRAME} from './UxmlInputXmlDeltaGraph.js';
import {exactNodeId,xmlDecode,absoluteInputXmlSourceWitness} from './UxmlInputXmlSourceFields.js';

export const STEP12_CODES=Object.freeze({
  GROUP_SPREAD:'INPUT_XML_ALIAS_GROUP_SPREAD',
  CHAIN:'INPUT_XML_ALIAS_CHAIN_REFUSED',
  COORDINATE:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  UNSUPPORTED:'INPUT_XML_UNSUPPORTED_NODE_CARRIER',
});
const err=(code,detail={})=>Object.assign(new Error(code),{code,detail});
const need=(yes,code,detail)=>{if(!yes)throw err(code,detail);};
const numeric=value=>exactNodeId(typeof value==='string'?xmlDecode(value):value);
export const withinTolerance=(a,b)=>Math.hypot(
  a.x-b.x,a.y-b.y,a.z-b.z)<=INPUTXML_DELTA_TOLERANCE;

/** Check chain/cycle before examining any geometry, and build owner groups. */
export function ownerGroups(mapping){
  need(mapping instanceof Map&&mapping.size>0,STEP12_CODES.CHAIN);
  const groups=new Map(),absorbed=new Set(mapping.keys());
  for(const [a,b] of mapping){
    need(a!==b&&!absorbed.has(b),STEP12_CODES.CHAIN,{absorbed:a,owner:b});
    if(!groups.has(b))groups.set(b,new Set([b]));
    groups.get(b).add(a);
  }
  return groups;
}
/** Both solved S3 witness and ORIGINAL literal absolute witness are mandatory. */
export function physicalNodeWitnesses(doc,node){
  const hits=[];
  for(const port of doc.ports||[]){
    const ref=port.sourceRefs?.[0],ep=ref?.endpoint;
    if(ep!=='FROM'&&ep!=='TO')continue;
    const raw=ep==='FROM'?ref.fromNode:ref.toNode;
    let n;
    try{n=numeric(raw);}catch{throw err(STEP12_CODES.COORDINATE,{node});}
    if(n!==node)continue;
    const idx=ref.elementIndex;
    const attrs=doc.components?.[idx]?.rawAttributes?.inputXml?.sourceAttributes;
    const point=port.point;
    need(Number.isInteger(idx)&&port.anchored===true&&ref.anchored===true&&
      port.coordinateFrame===INPUTXML_HUB_FRAME&&point&&
      [point.x,point.y,point.z].every(Number.isFinite),STEP12_CODES.COORDINATE,
      {node,recordKey:ref.recordKey});
    let source;
    try{source=absoluteInputXmlSourceWitness(attrs,ep);}
    catch{throw err(STEP12_CODES.COORDINATE,{node,recordKey:ref.recordKey});}
    hits.push({point:{x:point.x,y:point.y,z:point.z},
      kind:'S3_SOLVED',recordKey:ref.recordKey,endpoint:ep});
    hits.push({point:source.point,kind:'ORIGINAL_LITERAL',
      recordKey:ref.recordKey,endpoint:ep,evidence:source.evidence});
  }
  need(hits.length>0,STEP12_CODES.COORDINATE,{node,reason:'no-original-anchored-endpoint'});
  return hits;
}
/**
 * Each owner group's full physical source occurrences include *all* aliases
 * mapped to that owner. Isolated pairwise op-by-op checks are NOT sufficient.
 */
export function assertOwnerGroupSpread(doc,mapping){
  const groups=ownerGroups(mapping);
  for(const [owner,ids] of groups){
    const witnesses=[...ids].flatMap(id=>physicalNodeWitnesses(doc,id));
    for(let i=0;i<witnesses.length;i++)
      for(let j=i+1;j<witnesses.length;j++)
        need(withinTolerance(witnesses[i].point,witnesses[j].point),
          STEP12_CODES.GROUP_SPREAD,{owner,pair:[
            {recordKey:witnesses[i].recordKey,endpoint:witnesses[i].endpoint,
              kind:witnesses[i].kind},
            {recordKey:witnesses[j].recordKey,endpoint:witnesses[j].endpoint,
              kind:witnesses[j].kind},
          ]});
  }
  return groups;
}
export function rowSlotPairs(inventory){
  const result=[];
  const rows=new Map();
  for(const c of inventory.carriers||[]){
    if(c.index===null||c.key===null)continue;
    if(!rows.has(c.index))rows.set(c.index,[]);
    rows.get(c.index).push(c);
  }
  for(const [index,c] of rows){
    const endpoint=c.filter(x=>x.element==='PIPINGELEMENT');
    const families=['RESTRAINT','RESTRANT','HANGER','SIF','BEND'];
    const visit=(a,b)=>{
      if(a&&b&&a.path!==b.path)result.push({recordKey:a.recordKey||b.recordKey,
        recordIndex:index,a,b});
    };
    visit(endpoint.find(x=>x.field==='FROM_NODE'),endpoint.find(x=>x.field==='TO_NODE'));
    for(const family of families){
      const grouped=new Map();
      for(const slot of c.filter(x=>x.element===family)){
        if(!grouped.has(slot.elementPath))grouped.set(slot.elementPath,[]);
        grouped.get(slot.elementPath).push(slot);
      }
      for(const slots of grouped.values()){
        for(let i=0;i<slots.length;i++)
          for(let j=i+1;j<slots.length;j++)visit(slots[i],slots[j]);
        if(family==='BEND')
          for(const slot of slots)for(const parent of endpoint)visit(slot,parent);
      }
    }
  }
  return result;
}
/** Refuse ONLY NEW numeric equalities; already-connected source is preserved. */
export function assertNoNewSelfConnected(inventory,mapping){
  for(const {recordKey,a,b} of rowSlotPairs(inventory)){
    const beforeDifferent=a.key!==b.key;
    const afterA=mapping.get(a.key)??a.key,afterB=mapping.get(b.key)??b.key;
    need(!beforeDifferent||afterA!==afterB,STEP12_CODES.SELF,{
      recordKey,fields:[a.path,b.path],before:[a.key,b.key],after:[afterA,afterB],
    });
  }
}

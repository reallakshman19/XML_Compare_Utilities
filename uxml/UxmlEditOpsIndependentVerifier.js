/**
 * Step 1.2 INDEPENDENT post-patch verifier, v1.
 * Does not import patcher, planner, ownerGroups, or source-side slot helpers.
 * Reconstructs all invariants from immutable original, mapping, ledger, bytes.
 */
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {inventoryInputXml} from './UxmlEditOpsTypedInventory.js';
import {exactNodeId,xmlDecode,absoluteInputXmlSourceWitness}
  from './UxmlInputXmlSourceFields.js';
import {INPUTXML_DELTA_TOLERANCE,INPUTXML_HUB_FRAME} from './UxmlInputXmlDeltaGraph.js';

const encode=new TextEncoder(),decode=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const fail=(code,detail={})=>Object.assign(new Error(code),{code,detail});
const assert=(yes,code,detail)=>{if(!yes)throw fail(code,detail);};
const C={
  CHAIN:'INPUT_XML_ALIAS_CHAIN_REFUSED',
  GROUP:'INPUT_XML_ALIAS_GROUP_SPREAD',
  COORD:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  TOPO:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  PARITY:'INPUT_XML_PATCHED_SOURCE_PARITY_FAILED',
  REF:'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH',
  READER:'INPUT_XML_PATCHED_S3_READER_REFUSED',
  OWNER:'INPUT_XML_OWNER_NODE_SPELLING_AMBIGUOUS',
  TEXT:'INPUT_XML_PATCHED_TEXT_ITEMS_MISMATCH',
};
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
  b=>b.toString(16).padStart(2,'0')).join('');
const id=x=>exactNodeId(typeof x==='string'?xmlDecode(x):x);
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const mapNode=(value,map)=>value===null?null:(map.get(value)??value);
const fieldName=c=>c.element==='PIPINGELEMENT'?c.field:
  c.elementPath.slice(c.elementPath.lastIndexOf('/')+1)+'@'+c.field;
const edgeList=inv=>inv.records.map(row=>{
  const e=inv.carriers.filter(c=>c.index===row.index&&c.element==='PIPINGELEMENT');
  return [e.find(c=>c.field==='FROM_NODE')?.key,
    e.find(c=>c.field==='TO_NODE')?.key];
});
function components(edges){
  const parent=new Map();
  function root(x){
    if(!parent.has(x))parent.set(x,x);
    const p=parent.get(x);
    if(x===p)return x;
    const r=root(p);parent.set(x,r);return r;
  }
  for(const [a,b]of edges){
    const ra=root(a),rb=root(b);
    if(ra!==rb)parent.set(ra,rb);
  }
  const groups=new Map();
  for(const n of parent.keys()){
    const r=root(n);if(!groups.has(r))groups.set(r,[]);
    groups.get(r).push(n);
  }
  return [...groups.values()].map(ns=>ns.sort().join(',')).sort();
}
function recomputeGroups(mapping,doc){
  const owners=new Map(),aIds=new Set(mapping.keys());
  for(const [a,b] of mapping){
    assert(a!==b&&!aIds.has(b),C.CHAIN,{absorbed:a,owner:b});
    if(!owners.has(b))owners.set(b,new Set([b]));
    owners.get(b).add(a);
  }
  for(const [owner,ids] of owners){
    const points=[];
    for(const key of ids){
      let hits=0;
      for(const port of doc.ports||[]){
        const ref=port.sourceRefs?.[0];
        if(!ref||!['FROM','TO'].includes(ref.endpoint))continue;
        const lexical=ref.endpoint==='FROM'?ref.fromNode:ref.toNode;
        assert(typeof lexical==='string',C.COORD);
        if(id(lexical)!==key)continue;
        hits++;
        const p=port.point,attrs=doc.components?.[ref.elementIndex]
          ?.rawAttributes?.inputXml?.sourceAttributes;
        assert(port.anchored===true&&ref.anchored===true&&
          port.coordinateFrame===INPUTXML_HUB_FRAME&&p&&
          [p.x,p.y,p.z].every(Number.isFinite),C.COORD,{owner,key});
        let raw;
        try{raw=absoluteInputXmlSourceWitness(attrs,ref.endpoint).point;}
        catch{throw fail(C.COORD,{owner,key});}
        points.push(p,raw);
      }
      assert(hits>0,C.COORD,{owner,key,reason:'no-original-absolute'});
    }
    for(let i=0;i<points.length;i++)
      for(let j=i+1;j<points.length;j++)
        assert(dist(points[i],points[j])<=INPUTXML_DELTA_TOLERANCE,
          C.GROUP,{owner,indices:[i,j]});
  }
}
function sourcePairs(inv){
  const groups=new Map(),pairs=[];
  for(const c of inv.carriers){
    if(c.index===null||c.key===null)continue;
    if(!groups.has(c.index))groups.set(c.index,[]);
    groups.get(c.index).push(c);
  }
  const pair=(a,b)=>{if(a&&b&&a.path!==b.path)pairs.push({a,b});};
  for(const slots of groups.values()){
    const endpoint=slots.filter(x=>x.element==='PIPINGELEMENT');
    pair(endpoint.find(x=>x.field==='FROM_NODE'),
      endpoint.find(x=>x.field==='TO_NODE'));
    for(const family of ['BEND','SIF','RESTRAINT','RESTRANT','HANGER']){
      const children=new Map();
      for(const c of slots.filter(c=>c.element===family)){
        if(!children.has(c.elementPath))children.set(c.elementPath,[]);
        children.get(c.elementPath).push(c);
      }
      for(const values of children.values()){
        for(let i=0;i<values.length;i++)
          for(let j=i+1;j<values.length;j++)pair(values[i],values[j]);
        if(family==='BEND')
          for(const c of values)for(const e of endpoint)pair(c,e);
      }
    }
  }
  return pairs;
}
function originalByteProof(original,result,ledger){
  let prior=0,cursor=0;
  for(const change of ledger){
    const {start,end}=change.byteRange||{};
    assert(Number.isInteger(start)&&Number.isInteger(end)&&start>=prior&&
      end>=start&&end<=original.length,C.PARITY);
    const from=encode.encode(change.before),to=encode.encode(change.after);
    assert(eq([...original.slice(start,end)],[...from]),C.PARITY);
    const plain=original.slice(prior,start);
    assert(eq([...plain],[...result.slice(cursor,cursor+plain.length)]),C.PARITY);
    cursor+=plain.length;
    assert(eq([...to],[...result.slice(cursor,cursor+to.length)]),C.PARITY);
    cursor+=to.length;prior=end;
  }
  assert(eq([...original.slice(prior)],[...result.slice(cursor)]),C.PARITY);
}
/**
 * These assertions are the SAME functions used by the independent verifier.
 * Read-only direct probes let single-guard mutants prove live behavior without
 * weakening the original-byte/strict-S3 gates to make impossible states.
 */
function assertVerifierSourcePairDistinctness(before,mapping){
  for(const {a,b}of sourcePairs(before)){
    const mappedA=mapNode(a.key,mapping),mappedB=mapNode(b.key,mapping);
    assert(a.key===b.key||mappedA!==mappedB,C.SELF,{
      recordKey:a.recordKey,fields:[a.path,b.path]});
  }
}
function assertVerifierChangedCount(changed,ledger){
  assert(changed===ledger.length,C.TOPO,{changed,ledgerCount:ledger.length});
}
function assertVerifierTextParity(before,after){
  assert(before.textItems.length===after.textItems.length&&
    before.textItems.every((a,i)=>a.path===after.textItems[i].path&&
      a.raw===after.textItems[i].raw),C.TEXT);
}
function assertVerifierOwnerSpelling(before,after,mapping){
  for(const [owner]of recomputeCanonicalOwnerEntries(mapping)){
    const originals=before.carriers.filter(c=>c.element==='PIPINGELEMENT'&&
      c.key===owner).map(c=>c.raw.trim());
    assert(originals.length>0&&new Set(originals).size===1,C.OWNER);
    const unique=originals[0];
    assert(after.carriers.filter(c=>c.element==='PIPINGELEMENT'&&c.key===owner)
      .every(c=>c.raw.trim()===unique),C.TOPO);
  }
}
function assertVerifierS3PointConsistency(originalDoc,candidateDoc,index,role){
  const originalPort=originalDoc.ports.find(p=>
    p.sourceRefs?.[0]?.elementIndex===index&&p.sourceRefs?.[0]?.endpoint===role);
  const finalPort=candidateDoc.ports.find(p=>
    p.sourceRefs?.[0]?.elementIndex===index&&p.sourceRefs?.[0]?.endpoint===role);
  assert(originalPort&&finalPort&&
    dist(originalPort.point,finalPort.point)<=INPUTXML_DELTA_TOLERANCE,
    C.TOPO,{row:index+1,role});
}
export const __independentVerifierProbes=Object.freeze({
  recomputeGroups,assertVerifierSourcePairDistinctness,
  assertVerifierChangedCount,assertVerifierTextParity,
  assertVerifierOwnerSpelling,assertVerifierS3PointConsistency,
});

export async function verifyUxmlEditOpsIndependent({
  originalText,authorisedMapping,ledger,emittedBytes,
}){
  assert(typeof originalText==='string'&&authorisedMapping instanceof Map&&
    Array.isArray(ledger)&&emittedBytes instanceof Uint8Array,C.PARITY);
  const originalBytes=encode.encode(originalText);
  originalByteProof(originalBytes,emittedBytes,ledger);
  let newText;
  try{newText=decode.decode(emittedBytes);}
  catch{throw fail(C.PARITY);}
  // UTF-8 fatal decoder has a unique encoding for every valid byte stream;
  // originalByteProof above already checks the exact emitted complement.
  let originalDoc,candidateDoc;
  try{
    originalDoc=mapCaesarInputXmlToUxmlStrict(originalText,{
      fileSha256:await hash(originalBytes)});
    candidateDoc=mapCaesarInputXmlToUxmlStrict(newText,{
      fileSha256:await hash(emittedBytes)});
  }catch{throw fail(C.READER);}
  const before=inventoryInputXml(originalText,{refs:originalDoc.components.map(c=>c.sourceRefs[0])});
  const after=inventoryInputXml(newText,{refs:candidateDoc.components.map(c=>c.sourceRefs[0])});
  recomputeGroups(authorisedMapping,originalDoc);
  assertVerifierSourcePairDistinctness(before,authorisedMapping);
  assert(eq(before.shape,after.shape)&&before.records.length===after.records.length&&
    before.items.length===after.items.length,C.TOPO);
  const ledgerKeys=new Map(ledger.map(x=>[x.recordKey+'#'+x.field,x]));
  let changed=0;
  for(let i=0;i<before.items.length;i++){
    const a=before.items[i],b=after.items[i];
    assert(a.path===b.path&&a.kind===b.kind,C.TOPO);
    if(a.kind==='NODE_REF'){
      const mapped=mapNode(a.key,authorisedMapping);
      assert(b.key===mapped,C.TOPO,{path:a.path});
      if(a.key!==null&&authorisedMapping.has(a.key)){
        const l=ledgerKeys.get(a.recordKey+'#'+fieldName(a));
        assert(l&&l.before===a.raw&&l.after===b.raw,C.TOPO,{path:a.path});
        changed++;
      }else assert(a.raw===b.raw,C.TOPO,{path:a.path});
    }else assert(a.raw===b.raw&&a.decoded===b.decoded,C.TOPO,{path:a.path});
  }
  assertVerifierTextParity(before,after);
  assertVerifierChangedCount(changed,ledger);
  const oldEdges=edgeList(before),expected=oldEdges.map(([a,b])=>
    [mapNode(a,authorisedMapping),mapNode(b,authorisedMapping)]);
  const actual=edgeList(after);
  assert(eq(expected.map(JSON.stringify),actual.map(JSON.stringify))&&
    eq(components(expected),components(actual)),C.TOPO);
  assertVerifierOwnerSpelling(before,after,authorisedMapping);
  assert(originalDoc.components.length===candidateDoc.components.length,C.REF);
  for(let i=0;i<originalDoc.components.length;i++){
    const oldRef=originalDoc.components[i]?.sourceRefs?.[0];
    const newRef=candidateDoc.components[i]?.sourceRefs?.[0];
    assert(newRef?.elementIndex===i&&newRef?.format==='INPUT_XML'&&
      newRef.recordKey==='E'+i+':F'+encodeURIComponent(newRef.fromNode)+
      ':T'+encodeURIComponent(newRef.toNode),C.REF,{row:i+1});
    const [a,b]=expected[i];
    assert(id(newRef.fromNode)===a&&id(newRef.toNode)===b,C.TOPO,{row:i+1});
    for(const role of ['FROM','TO']){
      assertVerifierS3PointConsistency(originalDoc,candidateDoc,i,role);
    }
    assert(oldRef&&newRef,C.REF);
  }
  return {ok:true,parity:'EQUAL'};
}
function recomputeCanonicalOwnerEntries(mapping){
  const entries=new Map();
  for(const [from,owner]of mapping){
    if(!entries.has(owner))entries.set(owner,[]);
    entries.get(owner).push(from);
  }
  return entries;
}

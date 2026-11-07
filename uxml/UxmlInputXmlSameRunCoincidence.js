/**
 * B3 read-only proof for distinct node identities in ONE original InputXML run.
 * A proof is source-relative; it grants no alias writer / TopoFix authority.
 */
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {readInputXmlSourceField,exactNodeId} from './UxmlInputXmlSourceFields.js';
import {solveCaesarInputXmlRuns,INPUTXML_DELTA_TOLERANCE,INPUTXML_HUB_FRAME}
  from './UxmlInputXmlDeltaGraph.js';

export const INPUT_XML_B3_CODES=Object.freeze({
  BYTES:'INPUT_XML_ALIAS_ORIGINAL_BYTES_INVALID',
  SHA_REQUIRED:'INPUT_XML_ALIAS_ORIGINAL_SHA_REQUIRED',
  SHA_MISMATCH:'INPUT_XML_ALIAS_ORIGINAL_SHA_MISMATCH',
  SOURCE:'INPUT_XML_ALIAS_ORIGINAL_SOURCE_REFUSED',
  NODE_ID:'INPUT_XML_ALIAS_NODE_ID_INVALID',
  DISTINCT:'INPUT_XML_ALIAS_DISTINCT_NODES_REQUIRED',
  ABSENT:'INPUT_XML_ALIAS_NODE_ABSENT',
  CROSS_RUN:'INPUT_XML_ALIAS_CROSS_RUN_UNPROVEN',
  LOOP:'INPUT_XML_ALIAS_DELTA_PATH_CONFLICT',
  DELTA_MISSING:'INPUT_XML_ALIAS_DELTA_MISSING',
  DELTA_NONFINITE:'INPUT_XML_ALIAS_DELTA_NONFINITE',
  DELTA_INVALID:'INPUT_XML_ALIAS_DELTA_INVALID',
  ENDPOINT:'INPUT_XML_ALIAS_ENDPOINT_WITNESS_CONFLICT',
});
const C=INPUT_XML_B3_CODES;
const refuse=(code,details={})=>Object.freeze({status:'REFUSED',code,...details});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const shaRegex=/^[a-f0-9]{64}$/i;
const attrPattern=/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;

function readOpenAttributes(open) {
  const name=/^<PIPINGELEMENT(?=[\s/>])/.exec(open);
  if(!name)throw Error(C.SOURCE);
  let tail=open.slice(name[0].length).replace(/\/?\s*>$/,'');
  const attrs={};
  while(tail.trim()){
    const found=attrPattern.exec(tail);
    if(!found||Object.hasOwn(attrs,found[1]))throw Error(C.SOURCE);
    attrs[found[1]]=found[2]??found[3];
    tail=tail.slice(found[0].length);
  }
  return attrs;
}
function physicalRows(originalText) {
  const physical=scanOriginalInputXmlStructure(originalText);
  if(!physical)throw Error(C.SOURCE);
  return physical.map(row=>{
    const attrs=readOpenAttributes(row.open);
    const from=readInputXmlSourceField(attrs,'FROM_NODE',{node:true})?.numericId;
    const to=readInputXmlSourceField(attrs,'TO_NODE',{node:true})?.numericId;
    if(!from||!to)throw Error(C.NODE_ID);
    return {index:row.index,attrs,fromNode:from,toNode:to,
      recordKey:'E'+row.index+':F'+encodeURIComponent(from)+':T'+encodeURIComponent(to)};
  });
}
function originalWitnesses(graph) {
  const byNode=new Map(),pathResidualByRun=new Map();
  const add=(node,point,runId,recordKey,endpoint)=>{
    if(!byNode.has(node))byNode.set(node,[]);
    byNode.get(node).push(Object.freeze({
      node,point,runId,recordKey,endpoint,frame:INPUTXML_HUB_FRAME,
    }));
  };
  for(const edge of graph.edges){
    const assignment=graph.assignments.get(edge.index);
    if(!assignment)throw Error(C.SOURCE);
    const {from,to,runId}=assignment;
    add(edge.fromNode,from,runId,edge.recordKey,'FROM');
    add(edge.toNode,to,runId,edge.recordKey,'TO');
    const observed={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z};
    const residual=distance(observed,edge.delta);
    pathResidualByRun.set(runId,(pathResidualByRun.get(runId)||0)+residual);
  }
  return {byNode,pathResidualByRun};
}
function sourceFailure(error) {
  const message=String(error?.code||error?.message||'');
  if(message.startsWith('INPUT_XML_DELTA_REQUIRED:'))return C.DELTA_MISSING;
  if(message.startsWith('INPUT_XML_NONFINITE_NUMBER:'))return C.DELTA_NONFINITE;
  if(message.startsWith('INPUT_XML_INVALID_NUMBER:'))return C.DELTA_INVALID;
  if(message.startsWith('INPUT_XML_DELTA_PATH_CONFLICT:')||
     message.startsWith('INPUT_XML_ANCHOR_DELTA_CONFLICT:')||
     message.startsWith('INPUT_XML_REUSED_NODE_ABSOLUTE_CONFLICT:'))return C.LOOP;
  if(Object.values(C).includes(message))return message;
  if(message==='INPUT_XML_NODE_IDENTITY_INVALID'||
     message==='INPUT_XML_NODE_ENTITY_UNSUPPORTED')return C.NODE_ID;
  return C.SOURCE;
}
function compareWitnesses(a,b) {
  const maxWithin=rows=>Math.max(0,...rows.flatMap((x,i)=>
    rows.slice(i+1).map(y=>distance(x.point,y.point))));
  if(maxWithin(a)>INPUTXML_DELTA_TOLERANCE||
     maxWithin(b)>INPUTXML_DELTA_TOLERANCE)return refuse(C.ENDPOINT);
  const distances=a.flatMap(x=>b.map(y=>distance(x.point,y.point)));
  return {distanceMm:distance(a[0].point,b[0].point),
    maxWitnessDistanceMm:Math.max(...distances)};
}

/**
 * @param {{originalBytes:Uint8Array,fileSha256:string,sourceNode:string|number,
 * canonicalNode:string|number}} request
 * @returns {Promise<{status:string,code?:string,distanceMm?:number}>}
 *
 * Unknown side-file fields are deliberately unused. Original DELTAs alone
 * establish or disprove SAME-RUN coincidence; this never edits any bytes.
 */
export async function proveInputXmlSameRunCoincidence(request={}) {
  const {originalBytes,fileSha256,sourceNode,canonicalNode}=request;
  if(!(originalBytes instanceof Uint8Array))return refuse(C.BYTES);
  if(typeof fileSha256!=='string'||!shaRegex.test(fileSha256))
    return refuse(C.SHA_REQUIRED);
  const bytes=Uint8Array.from(originalBytes);
  let originalText;
  try{
    originalText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
    if(!new TextEncoder().encode(originalText).every((b,i)=>b===bytes[i])||
       new TextEncoder().encode(originalText).length!==bytes.length)
      return refuse(C.BYTES);
  }catch{return refuse(C.BYTES);}
  const sha=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  const measured=[...sha].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(measured!==fileSha256.toLowerCase())return refuse(C.SHA_MISMATCH);
  let source,canonical,graph,evidence;
  try{
    source=exactNodeId(sourceNode);canonical=exactNodeId(canonicalNode);
    if(source===canonical)return refuse(C.DISTINCT);
    graph=solveCaesarInputXmlRuns(physicalRows(originalText));
    evidence=originalWitnesses(graph);
  }catch(error){return refuse(sourceFailure(error));}
  const a=evidence.byNode.get(source),b=evidence.byNode.get(canonical);
  if(!a||!b)return refuse(C.ABSENT,{sourceNode:source,canonicalNode:canonical});
  const runA=a[0].runId,runB=b[0].runId;
  if(runA!==runB)return refuse(C.CROSS_RUN,{sourceRun:runA,canonicalRun:runB});
  // Each fundamental edge residual bounds one possible alternative path.
  // Summing ALL residual magnitudes is conservative even for combined cycles.
  const pathResidualMm=evidence.pathResidualByRun.get(runA)||0;
  if(pathResidualMm>INPUTXML_DELTA_TOLERANCE)
    return refuse(C.LOOP,{runId:runA,pathResidualMm});
  const comparison=compareWitnesses(a,b);
  if(comparison.status==='REFUSED')return comparison;
  const {distanceMm,maxWitnessDistanceMm}=comparison;
  return Object.freeze({
    status:maxWitnessDistanceMm<=INPUTXML_DELTA_TOLERANCE?
      'PROVEN_COINCIDENT':'NOT_COINCIDENT',
    sourceNode:source,canonicalNode:canonical,sourceSha256:measured,
    runId:runA,frame:INPUTXML_HUB_FRAME,
    distanceMm,maxWitnessDistanceMm,pathResidualMm,
    sourceWitnesses:a,canonicalWitnesses:b,
    authority:'ORIGINAL_INPUTXML_DELTA_SAME_RUN_READ_ONLY',
  });
}

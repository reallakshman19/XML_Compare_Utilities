/**
 * B3 read-only proof for distinct node identities in ONE original InputXML run.
 * A proof is source-relative; it grants no alias writer / TopoFix authority.
 */
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {readInputXmlSourceField,exactNodeId,xmlDecode} from './UxmlInputXmlSourceFields.js';
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
  FIELD_CASE:'INPUT_XML_ALIAS_SOURCE_ATTRIBUTE_CASE_AMBIGUOUS',
  UNIT:'INPUT_XML_ALIAS_LENGTH_UNIT_UNPROVEN',
});
const C=INPUT_XML_B3_CODES;
const refuse=(code,details={})=>Object.freeze({status:'REFUSED',code,...details});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const shaRegex=/^[a-f0-9]{64}$/i;
const attrPattern=/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;

function readOpenAttributes(open,expectedTag='PIPINGELEMENT') {
  const name=/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/.exec(open);
  if(!name||name[1]!==expectedTag)throw Error(C.SOURCE);
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

const requiredFields=Object.freeze([
  'FROM_NODE','TO_NODE','DELTA_X','DELTA_Y','DELTA_Z',
]);
// XML 1.0 S is exactly #x20, #x9, #xA, #xD; JS trim() is broader.
const numberFormat=/^[ \t\r\n]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[ \t\r\n]*$/;
const nodeFormat=/^[ \t\r\n]*\+?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[ \t\r\n]*$/;
const sentinel=-1.0101;

/** CAESAR source fields are case-sensitive, unlike the legacy run solver. */
function preflightOriginalFields(attrs){
  for(const field of requiredFields){
    const present=Object.hasOwn(attrs,field);
    if(!present)throw Error(field.startsWith('DELTA_')?C.DELTA_MISSING:C.NODE_ID);
    const variants=Object.keys(attrs).filter(key=>key.toUpperCase()===field);
    if(variants.length!==1)throw Error(C.FIELD_CASE);
    if(field.endsWith('_NODE')){
      // Decode XML entities before checking the XML-only whitespace grammar.
      // This preserves &#52;0 while rejecting literal or encoded NBSP/BOM.
      let decoded;
      try{decoded=xmlDecode(String(attrs[field]));}
      catch{throw Error(C.NODE_ID);}
      if(!nodeFormat.test(decoded))throw Error(C.NODE_ID);
    }
  }
  for(const field of requiredFields.slice(2)){
    const raw=String(attrs[field]);
    if(!numberFormat.test(raw))throw Error(C.DELTA_INVALID);
    const value=Number(raw);
    if(!Number.isFinite(value))throw Error(C.DELTA_NONFINITE);
    // The shared solver accepts a 1e-5 window; B3 must fail closed
    // on every near sentinel except the exact numeric CAESAR sentinel.
    if(value!==sentinel && Math.abs(value-sentinel)<0.00001)
      throw Error(C.DELTA_INVALID);
  }
}
const rowOrderKey=row=>JSON.stringify([
  row.fromNode,row.toNode,
  Object.entries(row.attrs).sort(([a],[b])=>a<b?-1:a>b?1:0),
]);
const canonicalRowOrder=rows=>rows.sort((a,b)=>{
  const x=rowOrderKey(a),y=rowOrderKey(b);
  return x<y?-1:x>y?1:0;
});


/**
 * The existing structural scanner validates the document but returns only
 * PIPINGELEMENT slices. Walk original lexical tags to locate the sole model
 * UNITS/LENGTH declaration, never text, comments, PI or CDATA contents.
 * Refuse uncertain markup rather than infer a default or convert units.
 */
function unitIsMillimetre(originalText){
  const stack=[];
  let unitCount=0,lengthCount=0,lengthAttrs=null;
  let cursor=0;
  while(cursor<originalText.length){
    const start=originalText.indexOf('<',cursor);
    if(start<0)break;
    if(originalText.startsWith('<!--',start)){
      const end=originalText.indexOf('-->',start+4);
      if(end<0)return false;
      cursor=end+3;continue;
    }
    if(originalText.startsWith('<?',start)){
      const end=originalText.indexOf('?>',start+2);
      if(end<0)return false;
      cursor=end+2;continue;
    }
    if(originalText.startsWith('<![CDATA[',start)){
      const end=originalText.indexOf(']]>',start+9);
      if(end<0)return false;
      cursor=end+3;continue;
    }
    if(originalText.startsWith('<!',start))return false;
    let quote='',end=-1;
    for(let i=start+1;i<originalText.length;i++){
      const c=originalText[i];
      if(quote){if(c===quote)quote='';}
      else if(c==='"'||c==="'")quote=c;
      else if(c==='>'){end=i+1;break;}
    }
    if(end<0)return false;
    const tag=originalText.slice(start,end);
    const closing=/^<\/([A-Za-z_:][\w.:-]*)\s*>$/.exec(tag);
    if(closing){
      if(stack.pop()!==closing[1])return false;
    }else{
      const open=/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/.exec(tag);
      if(!open)return false;
      const name=open[1],selfClosing=/\/\s*>$/.test(tag);
      if(name==='UNITS'){
        unitCount++;
        if(selfClosing||stack.length!==2||
           stack[0]!=='CAESARII'||stack[1]!=='PIPINGMODEL')
          return false;
      }
      if(name==='LENGTH'){
        lengthCount++;
        if(!selfClosing||stack.at(-1)!=='UNITS')return false;
        try{lengthAttrs=readOpenAttributes(tag,'LENGTH');}
        catch{return false;}
      }
      if(!selfClosing)stack.push(name);
    }
    cursor=end;
  }
  if(stack.length||unitCount!==1||lengthCount!==1||!lengthAttrs)
    return false;
  const keys=Object.keys(lengthAttrs);
  if(keys.filter(k=>k.toUpperCase()==='LABEL').length!==1||
     keys.filter(k=>k.toUpperCase()==='FACTOR').length!==1||
     !Object.hasOwn(lengthAttrs,'LABEL')||
     !Object.hasOwn(lengthAttrs,'FACTOR'))
    return false;
  let label;
  try{label=xmlDecode(lengthAttrs.LABEL);}catch{return false;}
  return label==='mm.'&&numberFormat.test(lengthAttrs.FACTOR)&&
    Number(lengthAttrs.FACTOR)===25.4;
}

function physicalRows(originalText) {
  const physical=scanOriginalInputXmlStructure(originalText);
  if(!physical)throw Error(C.SOURCE);
  if(!unitIsMillimetre(originalText))throw Error(C.UNIT);
  return physical.map(row=>{
    const attrs=readOpenAttributes(row.open);
    preflightOriginalFields(attrs);
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
/**
 * @param {{originalBytes:Uint8Array,fileSha256:string,sourceNode:string|number,
 * canonicalNode:string|number}} request
 * @returns {Promise<{status:string,code?:string,distanceMm?:number}>}
 *
 * Unknown side-file fields are deliberately unused. Original DELTAs alone
 * establish or disprove SAME-RUN coincidence; this never edits any bytes.
 */
export async function proveInputXmlSameRunCoincidence(request={}) {
  if(request===null||typeof request!=='object'||Array.isArray(request))
    return refuse(C.BYTES);
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
    graph=solveCaesarInputXmlRuns(canonicalRowOrder(physicalRows(originalText)));
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
  // Every occurrence of a node shares one solver position; comparing the
  // copies against each other is vacuous. Raw edge residuals, not those
  // duplicated positions, conservatively bound all alternative paths.
  const distanceMm=distance(a[0].point,b[0].point);
  const pathBoundMm=distanceMm+pathResidualMm;
  return Object.freeze({
    status:pathBoundMm<=INPUTXML_DELTA_TOLERANCE?
      'PROVEN_COINCIDENT':'NOT_COINCIDENT',
    sourceNode:source,canonicalNode:canonical,sourceSha256:measured,
    runId:runA,frame:INPUTXML_HUB_FRAME,
    distanceMm,pathResidualMm,pathBoundMm,
    sourceWitnesses:a,canonicalWitnesses:b,
    authority:'ORIGINAL_INPUTXML_DELTA_SAME_RUN_READ_ONLY',
  });
}

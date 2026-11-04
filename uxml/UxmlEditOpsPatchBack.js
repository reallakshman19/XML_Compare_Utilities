/**
 * Lane B v1: XCU alone owns original-byte InputXML edit-ops patch-back.
 * The strict S3 reader is the only authority for source record identities.
 * This module does NOT import TopoFix or alter S4.2.
 */
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';

export const UXML_EDIT_OPS_SCHEMA='uxml-edit-ops/v1';
export const UXML_EDIT_OPS_REFUSALS=Object.freeze({
  SCHEMA:'UXML_EDIT_OPS_SCHEMA_INVALID',
  PSI116:'UXML_PSI116_PATCH_NOT_IMPLEMENTED',
  FORMAT:'UXML_SOURCE_FORMAT_NOT_IMPLEMENTED',
  KIND:'UXML_EDIT_OP_KIND_NOT_IMPLEMENTED',
  POLICY:'INPUT_XML_EDIT_POLICY_SCHEMA_INVALID',
  POLICY_WIDEN:'UXML_POLICY_WIDENING_REFUSED',
  SELECTION:'INPUT_XML_ACTION_IDS_NOT_EXACT',
  HASH:'INPUT_XML_FILE_SHA256_MISMATCH',
  OP_SHA:'INPUT_XML_OP_ID_OR_SHA_INVALID',
  PARAMS:'INPUT_XML_OP_PARAMS_NOT_SOURCE_AUTHORIZED',
  UNKNOWN:'INPUT_XML_UNKNOWN_RECORD_KEY',
  TARGETS:'INPUT_XML_OP_TARGETS_NOT_SOURCE_AUTHORIZED',
  SOURCE:'INPUT_XML_ORIGINAL_SOURCE_REFUSED',
  REF:'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH',
  OFFSET:'INPUT_XML_BYTE_ATTRIBUTE_SOURCE_MISMATCH',
  CONFLICT:'INPUT_XML_CONFLICTING_SOURCE_FIELD_WRITES',
  UNACCOUNTED:'INPUT_XML_ALIAS_UNACCOUNTED_SOURCE_OCCURRENCE',
  STRANDED:'INPUT_XML_STRANDED_DESCENDANT_NODE_REFERENCE',
  LOSS:'INPUT_XML_STRANDED_LOSS_CONTRACT_NODE_VALUE',
  SIF:'INPUT_XML_CLASS_B_SIF_OWNER_TOUCH_REFUSED',
  LOOP:'INPUT_XML_RENUMBER_SELF_LOOP_REFUSED',
  READER:'INPUT_XML_PATCHED_S3_READER_REFUSED',
  PARITY:'INPUT_XML_PATCHED_SOURCE_PARITY_FAILED',
});
const R=UXML_EDIT_OPS_REFUSALS;
const enc=new TextEncoder();
const keyMatch=/^E([0-9]+):F([^:]*):T(.*)$/;
const attrToken=/\s+([A-Za-z_][\w.:-]*)\s*=\s*(["'])(.*?)\2/g;
const elementOpen=/<([A-Za-z_][\w.:-]*)(?=[\s/>])(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const rawNumber=/(?<![A-Za-z0-9_.])[-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[Ee][-+]?[0-9]+)?(?![A-Za-z0-9_.])/g;
const lossPath=/^\/CAESARII\/PIPINGMODEL\/PIPINGELEMENT\[[0-9]+\](?:\/|$)/;
const paramsKeys=['canonicalNode','operation','sourceNode'];
const opKeys=['fileSha256','kind','opId','params','sourceActionId','targets'];
const envelopeKeys=['fileSha256','ops','policy','schema','sourceFormat'];
const policyKeys=['apply_all_safe','joint_repairs','minimum_confidence',
  'require_no_blocking_plan_actions','selected_action_ids','short_element_requests'];
const equalKeys=(obj,keys)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
  JSON.stringify(Object.keys(obj).sort())===JSON.stringify([...keys].sort());
const sameArray=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const canonicalSha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const finiteNode=value=>{
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?value:null;
  if(typeof value!=='string'||!(/^\+?[0-9]+(?:\.[0-9]+)?$/.test(value)))return null;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>0?n:null;
};
class Refusal extends Error {
  constructor(code,detail={}){super(code);this.code=code;this.detail=detail;}
}
const need=(ok,code,detail)=>{if(!ok)throw new Refusal(code,detail);};
const fail=(code,detail={})=>({ok:false,bytes:null,parity:'DIFFERENT',
  ledger:[],refusals:[{code,...detail}]});
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
  b=>b.toString(16).padStart(2,'0')).join('');
function policyCheck(policy,ops){
  need(equalKeys(policy,policyKeys),R.POLICY);
  need(policy.minimum_confidence===0.95&&policy.require_no_blocking_plan_actions===true,
    R.POLICY_WIDEN);
  need(policy.apply_all_safe===false&&
    Array.isArray(policy.joint_repairs)&&policy.joint_repairs.length===0&&
    Array.isArray(policy.short_element_requests)&&policy.short_element_requests.length===0,
    R.POLICY_WIDEN);
  const ids=policy.selected_action_ids;
  need(Array.isArray(ids)&&ids.length===ops.length&&ids.length>0&&
    ids.every(x=>typeof x==='string'&&x.length>0)&&new Set(ids).size===ids.length,
    R.SELECTION);
  need(sameArray([...ids].sort(),ops.map(x=>x.sourceActionId).sort()),R.SELECTION);
}
function sourceWitness(originalText,sha){
  let doc;
  try{doc=mapCaesarInputXmlToUxmlStrict(originalText,{fileSha256:sha});}
  catch{throw new Refusal(R.SOURCE);}
  const rows=scanOriginalInputXmlStructure(originalText);
  need(Array.isArray(rows)&&rows.length===doc.components.length,R.SOURCE);
  const byKey=new Map();
  rows.forEach((row,index)=>{
    const ref=doc.components[index]?.sourceRefs?.[0];
    const parsed=keyMatch.exec(ref?.recordKey||'');
    need(parsed&&Number(parsed[1])===index&&ref.format==='INPUT_XML'&&
      ref.fileSha256===sha&&ref.elementIndex===index&&
      ref.recordKey==='E'+index+':F'+encodeURIComponent(ref.fromNode)+
        ':T'+encodeURIComponent(ref.toNode),R.REF,{row:index+1});
    need(originalText.slice(row.start,row.start+row.raw.length)===row.raw,R.OFFSET);
    need(!byKey.has(ref.recordKey),R.REF);
    byKey.set(ref.recordKey,{ref,row,index});
  });
  return {doc,rows,byKey};
}
function locate(row,ref){
  const opening=row.open,attrs=new Map();
  for(const match of opening.matchAll(attrToken)){
    const name=match[1].toUpperCase();
    if(name!=='FROM_NODE'&&name!=='TO_NODE')continue;
    need(!attrs.has(name),R.OFFSET,{recordKey:ref.recordKey,field:name});
    const offset=match.index+match[0].indexOf(match[2])+1;
    attrs.set(name,{start:row.start+offset,end:row.start+offset+match[3].length,
      raw:match[3]});
  }
  need(attrs.size===2&&attrs.get('FROM_NODE').raw===ref.fromNode&&
    attrs.get('TO_NODE').raw===ref.toNode,R.OFFSET,{recordKey:ref.recordKey});
  return attrs;
}
function formatLike(literal,node){
  need(/^\+?[0-9]+(?:\.[0-9]+)?$/.test(literal)&&finiteNode(literal)!==null,
    R.PARAMS);
  const decimal=literal.split('.')[1];
  return decimal===undefined?String(node):String(node)+'.'+'0'.repeat(decimal.length);
}
function checkStranded(doc,rows,oldIds){
  // Scan every source record, not merely the selected targets. XML comments and
  // CDATA cannot hide a node reference: conservatively refuse their witnesses.
  for(const row of rows){
    const stripped=row.raw.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g,
      x=>' '.repeat(x.length));
    for(const tag of stripped.matchAll(elementOpen)){
      const tagName=tag[1].toUpperCase();
      if(tagName==='PIPINGELEMENT')continue;
      for(const attr of tag[0].matchAll(attrToken)){
        const field=attr[1].toUpperCase();
        if(!/^(?:NODE[0-9]*|CNODE)$/.test(field))continue;
        const node=finiteNode(attr[3]);
        if(!oldIds.has(node))continue;
        const code=tagName==='SIF'&&field==='NODE'?R.SIF:R.STRANDED;
        throw new Refusal(code,{row:row.index+1,tag:tagName,field});
      }
    }
  }
  for(const item of doc.lossContract||[]){
    const path=item?.details?.path||item?.details?.sourcePath;
    if(!lossPath.test(path||''))continue;
    const raw=item.details.raw;
    need(typeof raw==='string',R.LOSS,{path});
    if([...raw.matchAll(rawNumber)].some(m=>oldIds.has(finiteNode(m[0]))))
      throw new Refusal(R.LOSS,{path});
  }
}
function assertByteParity(original,candidate,ledger){
  let pos=0,offset=0;
  for(const item of ledger){
    const {start,end}=item.byteRange;
    const replacement=enc.encode(item.after);
    need(start>=pos&&end>=start&&end<=original.length,R.CONFLICT);
    const common=original.slice(pos,start);
    need(sameArray(Array.from(candidate.slice(offset,offset+common.length)),
      Array.from(common)),R.PARITY);
    offset+=common.length;
    need(sameArray(Array.from(candidate.slice(offset,offset+replacement.length)),
      Array.from(replacement)),R.PARITY);
    offset+=replacement.length;
    pos=end;
  }
  need(sameArray(Array.from(candidate.slice(offset)),Array.from(original.slice(pos))),R.PARITY);
}
export async function applyUxmlEditOps(originalText,payload,{fileSha256}={}){
  try{
    need(typeof originalText==='string'&&equalKeys(payload,envelopeKeys)&&
      payload.schema===UXML_EDIT_OPS_SCHEMA&&Array.isArray(payload.ops)&&
      payload.ops.length>0,R.SCHEMA);
    if(payload.sourceFormat==='PSI116')throw new Refusal(R.PSI116);
    need(payload.sourceFormat==='INPUT_XML',R.FORMAT);
    for(const op of payload.ops){
      need(equalKeys(op,opKeys)&&typeof op.kind==='string',R.SCHEMA);
      if(op.kind!=='ALIAS_COINCIDENT_NODE')
        throw new Refusal(R.KIND,{opId:op.opId,kind:op.kind});
    }
    policyCheck(payload.policy,payload.ops);
    const bytes=enc.encode(originalText),measured=await hash(bytes);
    need(canonicalSha(fileSha256)&&fileSha256===measured&&
      payload.fileSha256===measured,R.HASH);
    const {doc,rows,byKey}=sourceWitness(originalText,measured);
    const patches=[],oldIds=new Set(),newIds=new Set(),used=new Set();
    for(const op of payload.ops){
      need(typeof op.sourceActionId==='string'&&op.sourceActionId.length>0&&
        op.opId==='UXML-OP-'+op.sourceActionId&&
        op.fileSha256===measured,R.OP_SHA,{opId:op.opId});
      need(Array.isArray(op.params)&&op.params.length===1&&
        equalKeys(op.params[0],paramsKeys)&&
        op.params[0].operation==='ALIAS_NODE',R.PARAMS,{opId:op.opId});
      const old=finiteNode(op.params[0].sourceNode);
      const owner=finiteNode(op.params[0].canonicalNode);
      need(old!==null&&owner!==null&&old!==owner&&
        !oldIds.has(old)&&!newIds.has(old)&&!oldIds.has(owner),R.PARAMS,{opId:op.opId});
      oldIds.add(old);newIds.add(owner);
      need(Array.isArray(op.targets)&&op.targets.length>0&&
        op.targets.every(x=>typeof x==='string')&&
        new Set(op.targets).size===op.targets.length,R.TARGETS,{opId:op.opId});
      for(const key of op.targets)need(byKey.has(key),R.UNKNOWN,{opId:op.opId,recordKey:key});
      const expected=[...byKey.values()].filter(x=>
        [x.ref.fromNode,x.ref.toNode].some(v=>finiteNode(v)===old||finiteNode(v)===owner))
        .map(x=>x.ref.recordKey).sort();
      need(sameArray([...op.targets].sort(),expected),R.TARGETS,{opId:op.opId});
      let count=0;
      for(const x of byKey.values()){
        const attrs=locate(x.row,x.ref);
        for(const field of ['FROM_NODE','TO_NODE']){
          const entry=attrs.get(field);
          if(finiteNode(entry.raw)!==old)continue;
          const unique=x.index+':'+field;
          need(!used.has(unique),R.CONFLICT,{opId:op.opId});
          used.add(unique);
          const replacement=formatLike(entry.raw,owner);
          const start=enc.encode(originalText.slice(0,entry.start)).length;
          const end=enc.encode(originalText.slice(0,entry.end)).length;
          need(sameArray(Array.from(bytes.slice(start,end)),
            Array.from(enc.encode(entry.raw))),R.OFFSET,{recordKey:x.ref.recordKey,field});
          patches.push({opId:op.opId,kind:op.kind,recordKey:x.ref.recordKey,
            field,before:entry.raw,after:replacement,byteRange:{start,end}});
          count++;
        }
      }
      need(count>0,R.PARAMS,{opId:op.opId});
    }
    need([...oldIds].every(id=>!newIds.has(id)),R.CONFLICT);
    // All original endpoint occurrences of each absorbed node must be ledgered.
    for(const old of oldIds){
      const touched=patches.filter(p=>finiteNode(p.before)===old);
      const total=[...byKey.values()].reduce((n,x)=>n+
        ['fromNode','toNode'].filter(f=>finiteNode(x.ref[f])===old).length,0);
      need(touched.length===total&&total>0,R.UNACCOUNTED);
    }
    checkStranded(doc,rows,oldIds);
    const planned=rows.map((_,i)=>{
      const ref=doc.components[i].sourceRefs[0];
      return {from:finiteNode(ref.fromNode),to:finiteNode(ref.toNode)};
    });
    for(const p of patches){
      const i=Number(keyMatch.exec(p.recordKey)[1]);
      planned[i][p.field==='FROM_NODE'?'from':'to']=finiteNode(p.after);
    }
    need(planned.every(x=>x.from!==null&&x.to!==null&&x.from!==x.to),R.LOOP);
    patches.sort((a,b)=>a.byteRange.start-b.byteRange.start);
    for(let i=1;i<patches.length;i++)
      need(patches[i-1].byteRange.end<=patches[i].byteRange.start,R.CONFLICT);
    let result=bytes;
    for(let i=patches.length-1;i>=0;i--){
      const {start,end}=patches[i].byteRange,sub=enc.encode(patches[i].after);
      const output=new Uint8Array(result.length-(end-start)+sub.length);
      output.set(result.slice(0,start));
      output.set(sub,start);
      output.set(result.slice(end),start+sub.length);
      result=output;
    }
    let reread;
    try{
      const candidate=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(result);
      reread=mapCaesarInputXmlToUxmlStrict(candidate,{fileSha256:await hash(result)});
    }catch{throw new Refusal(R.READER);}
    need(reread.components.length===doc.components.length&&
      planned.every((x,i)=>{
        const ref=reread.components[i]?.sourceRefs?.[0];
        return finiteNode(ref?.fromNode)===x.from&&finiteNode(ref?.toNode)===x.to;
      }),R.PARITY);
    assertByteParity(bytes,result,patches);
    return {ok:true,bytes:result,parity:'EQUAL',ledger:patches,refusals:[]};
  }catch(e){
    if(e instanceof Refusal)return fail(e.code,e.detail);
    return fail(R.SCHEMA);
  }
}

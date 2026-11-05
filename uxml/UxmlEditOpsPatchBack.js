/**
 * Lane B original-source single writer: uxml-edit-ops/v1 INPUT_XML alias.
 * No TopoFix invocation, no CLOS/geometry/tolerance mutation, no disk writes.
 * A verified upstream TopoFix action/transaction gate remains mandatory.
 */
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {INPUTXML_DELTA_TOLERANCE,INPUTXML_HUB_FRAME} from './UxmlInputXmlDeltaGraph.js';
import {inventoryInputXml} from './UxmlEditOpsTypedInventory.js';
import {exactNodeId,xmlDecode,readInputXmlSourceField,absoluteInputXmlSourceWitness}
  from './UxmlInputXmlSourceFields.js';
import {assertOwnerGroupSpread,ownerGroups,assertNoNewSelfConnected}
  from './UxmlEditOpsInvariants.js';
import {verifyUxmlEditOpsIndependent}
  from './UxmlEditOpsIndependentVerifier.js';

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
  COINCIDENCE:'INPUT_XML_ALIAS_COINCIDENCE_NOT_PROVEN',
  LOOP:'INPUT_XML_RENUMBER_SELF_LOOP_REFUSED',
  READER:'INPUT_XML_PATCHED_S3_READER_REFUSED',
  PARITY:'INPUT_XML_PATCHED_SOURCE_PARITY_FAILED',
  INTERNAL:'UXML_EDIT_OPS_INTERNAL_REFUSED',
  NODE_ID:'INPUT_XML_NODE_IDENTITY_INVALID',
  ENTITY:'INPUT_XML_NODE_ENTITY_UNSUPPORTED',
  CARRIER:'INPUT_XML_UNKNOWN_NODE_CARRIER',
  LOCATION:'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',
  OWNER:'INPUT_XML_OWNER_NODE_SPELLING_AMBIGUOUS',
  REMAINED:'INPUT_XML_ACTIVE_ABSORBED_NODE_REMAINED',
  TOPOLOGY:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  GROUP_SPREAD:'INPUT_XML_ALIAS_GROUP_SPREAD',
  CHAIN:'INPUT_XML_ALIAS_CHAIN_REFUSED',
  COORDINATE:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  UNSUPPORTED:'INPUT_XML_UNSUPPORTED_NODE_CARRIER',
});
const R=UXML_EDIT_OPS_REFUSALS;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const keyMatch=/^E([0-9]+):F([^:]*):T(.*)$/;
const opKeys=['fileSha256','kind','opId','params','sourceActionId','targets'];
const envelopeKeys=['fileSha256','ops','policy','schema','sourceFormat'];
const policyKeys=['apply_all_safe','joint_repairs','minimum_confidence',
  'require_no_blocking_plan_actions','selected_action_ids','short_element_requests'];
const paramsKeys=['canonicalNode','operation','sourceNode'];
const sameArray=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const equalKeys=(obj,keys)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
  sameArray(Object.keys(obj).sort(),[...keys].sort());
const shaFormat=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
class Refusal extends Error {
  constructor(code,detail={}){super(code);this.code=code;this.detail=detail;}
}
const need=(ok,code,detail={})=>{if(!ok)throw new Refusal(code,detail);};
const fail=(code,detail={})=>({ok:false,bytes:null,parity:'DIFFERENT',
  ledger:[],refusals:[{code,...detail}]});
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
  b=>b.toString(16).padStart(2,'0')).join('');
const safeNode=(value,{sentinel=false}={})=>exactNodeId(typeof value==='string'?xmlDecode(value):value,{sentinel});
const samePoint=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<=INPUTXML_DELTA_TOLERANCE;

function verifyPolicy(policy,ops){
  need(equalKeys(policy,policyKeys),R.POLICY);
  need(policy.minimum_confidence===0.95&&policy.require_no_blocking_plan_actions===true,
    R.POLICY_WIDEN);
  need(policy.apply_all_safe===false&&Array.isArray(policy.joint_repairs)&&
    policy.joint_repairs.length===0&&Array.isArray(policy.short_element_requests)&&
    policy.short_element_requests.length===0,R.POLICY_WIDEN);
  const ids=policy.selected_action_ids;
  need(Array.isArray(ids)&&ids.length===ops.length&&ids.length>0&&
    ids.every(x=>typeof x==='string'&&x.length>0)&&
    new Set(ids).size===ids.length,R.SELECTION);
  need(sameArray([...ids].sort(),ops.map(op=>op.sourceActionId).sort()),R.SELECTION);
}
function originalWitness(originalText,measured){
  let doc;
  try{doc=mapCaesarInputXmlToUxmlStrict(originalText,{fileSha256:measured});}
  catch{throw new Refusal(R.SOURCE);}
  const rows=scanOriginalInputXmlStructure(originalText);
  need(rows&&rows.length===doc.components.length,R.SOURCE);
  const byKey=new Map();
  for(const [i,row]of rows.entries()){
    const ref=doc.components[i]?.sourceRefs?.[0];
    const key=ref?.recordKey;
    need(ref?.format==='INPUT_XML'&&ref.fileSha256===measured&&
      ref.elementIndex===i&&key===('E'+i+':F'+encodeURIComponent(ref.fromNode)+
      ':T'+encodeURIComponent(ref.toNode))&&keyMatch.test(key)&&
      row.raw===originalText.slice(row.start,row.start+row.raw.length),R.REF,{row:i+1});
    need(!byKey.has(key),R.REF,{recordKey:key});
    byKey.set(key,{ref,row,index:i});
  }
  const inventory=inventoryInputXml(originalText,{refs:doc.components.map(c=>c.sourceRefs[0])});
  const endpoints=inventory.carriers.filter(c=>c.element==='PIPINGELEMENT');
  need(endpoints.length===rows.length*2,R.REF);
  for(const c of endpoints){
    const r=doc.components[c.index].sourceRefs[0];
    need((c.field==='FROM_NODE'?r.fromNode:r.toNode)===c.raw.trim(),R.REF,
      {recordKey:r.recordKey,field:c.field});
  }
  return {doc,rows,byKey,inventory,endpoints};
}
function originalWitnessPoints(doc,id){
  const points=[];
  for(const port of doc.ports||[]){
    const ref=port.sourceRefs?.[0];
    if(!ref||!['FROM','TO'].includes(ref.endpoint))continue;
    const literal=ref.endpoint==='FROM'?ref.fromNode:ref.toNode;
    if(safeNode(literal)!==id)continue;
    const p=port.point;
    need(port.anchored===true&&ref.anchored===true&&
      port.coordinateFrame===INPUTXML_HUB_FRAME&&
      p&&[p.x,p.y,p.z].every(Number.isFinite),R.COINCIDENCE,{node:id});
    points.push({...p});
    // A second independent original absolute witness is necessary because
    // S3 may collapse repeated numeric node spellings into a single point.
    const row=doc.components[ref.elementIndex]?.rawAttributes?.inputXml?.sourceAttributes;
    const prefix=ref.endpoint;
    const fields=['X','Y','Z'].map(axis=>
      readInputXmlSourceField(row,prefix+'_'+axis)?.decoded);
    const present=fields.filter(v=>v!==undefined&&v!==null&&v!=='');
    need(present.length===0||present.length===3,R.COINCIDENCE,{node:id});
    if(present.length===3){
      need(fields.every(v=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(v))&&
        Number.isFinite(Number(v))),R.COINCIDENCE,{node:id});
      points.push({x:Number(fields[0]),y:-Number(fields[2]),z:Number(fields[1])});
    }
  }
  return points;
}
function verifyCoincidence(doc,absorbed,owner,opId){
  const a=originalWitnessPoints(doc,absorbed),b=originalWitnessPoints(doc,owner);
  need(a.length>0&&b.length>0,R.COINCIDENCE,{opId,absorbed,owner});
  const combined=[...a,...b];
  // Every unordered pair: comparing each against a[0] can allow 0.0018 mm.
  for(let i=0;i<combined.length;i++)
    for(let j=i+1;j<combined.length;j++)
      need(samePoint(combined[i],combined[j]),R.COINCIDENCE,
        {opId,absorbed,owner,witnessPair:[i,j]});
}
function reserveField(used,field,opId){
  need(!used.has(field),R.CONFLICT,{opId});
  used.add(field);
}
function assertUnchainedIds(absorbed,owner){
  need([...absorbed].every(id=>!owner.has(id)),R.CONFLICT);
}
function assertDisjointPatches(patches){
  for(let i=1;i<patches.length;i++)
    need(patches[i-1].byteRange.end<=patches[i].byteRange.start,R.CONFLICT);
}
function assertByteParity(original,candidate,ledger){
  let oldEnd=0,newOffset=0;
  for(const change of ledger){
    const {start,end}=change.byteRange,after=enc.encode(change.after);
    need(start>=oldEnd&&end>=start&&end<=original.length,R.CONFLICT);
    need(sameArray([...original.subarray(start,end)],[...enc.encode(change.before)]),
      R.OFFSET,{recordKey:change.recordKey,field:change.field});
    const unchanged=original.subarray(oldEnd,start);
    need(sameArray([...candidate.subarray(newOffset,newOffset+unchanged.length)],
      [...unchanged]),R.PARITY);
    newOffset+=unchanged.length;
    need(sameArray([...candidate.subarray(newOffset,newOffset+after.length)],[...after]),
      R.PARITY);
    newOffset+=after.length;oldEnd=end;
  }
  need(sameArray([...candidate.subarray(newOffset)],[...original.subarray(oldEnd)]),R.PARITY);
}
function sourceField(c){
  return c.element==='PIPINGELEMENT'?c.field:
    c.elementPath.slice(c.elementPath.lastIndexOf('/')+1)+'@'+c.field;
}
function planAliases(witness,payload,original){
  const {doc,byKey,inventory,endpoints}=witness;
  const ledger=[],used=new Set(),mapping=new Map();
  const claims=[];
  // Authenticate and collect every A->B claim FIRST. Chain/cycle detection
  // must precede geometry or partial per-op candidate edits.
  for(const op of payload.ops){
    need(typeof op.sourceActionId==='string'&&op.sourceActionId.length>0&&
      op.opId==='UXML-OP-'+op.sourceActionId&&op.fileSha256===payload.fileSha256,
      R.OP_SHA,{opId:op.opId});
    need(Array.isArray(op.params)&&op.params.length===1&&
      equalKeys(op.params[0],paramsKeys)&&
      op.params[0].operation==='ALIAS_NODE',R.PARAMS,{opId:op.opId});
    const absorbed=safeNode(op.params[0].sourceNode);
    const owner=safeNode(op.params[0].canonicalNode);
    need(!mapping.has(absorbed),R.CONFLICT,{opId:op.opId,absorbed});
    mapping.set(absorbed,owner);
    claims.push({op,absorbed,owner});
  }
  ownerGroups(mapping); // INPUT_XML_ALIAS_CHAIN_REFUSED before geometry.
  assertOwnerGroupSpread(doc,mapping); // all original A1/A2/owner pairs.
  assertNoNewSelfConnected(inventory,mapping); // new equality only.
  for(const {op,absorbed,owner} of claims){
    // Retain the original R2 local proof as an additional independent guard.
    // It is not sufficient for multi-op groups; the group gate above is.
    verifyCoincidence(doc,absorbed,owner,op.opId);
    need(Array.isArray(op.targets)&&op.targets.length>0&&
      op.targets.every(x=>typeof x==='string')&&
      new Set(op.targets).size===op.targets.length,R.TARGETS,{opId:op.opId});
    for(const key of op.targets)need(byKey.has(key),R.UNKNOWN,{recordKey:key,opId:op.opId});
    const incident=endpoints.filter(c=>c.key===absorbed||c.key===owner);
    const expected=[...new Set(incident.map(c=>c.recordKey))].sort();
    need(sameArray([...op.targets].sort(),expected),R.TARGETS,{opId:op.opId});
    const ownerSpelling=[...new Set(endpoints.filter(c=>c.key===owner)
      .map(c=>c.raw.trim()))];
    need(ownerSpelling.length===1,R.OWNER,{opId:op.opId});
    const replacement=ownerSpelling[0];
    let count=0;
    for(const c of inventory.carriers){
      if(c.key!==absorbed)continue;
      need(c.recordKey!==null,R.LOCATION,{opId:op.opId,path:c.path});
      reserveField(used,c.path,op.opId);
      const old=enc.encode(c.raw),{start,end}=c.byteRange;
      need(sameArray([...original.subarray(start,end)],[...old]),R.OFFSET,
        {opId:op.opId,path:c.path});
      const before=c.raw,lead=/^[\t\r\n ]*/.exec(before)[0],
        trail=/[\t\r\n ]*$/.exec(before)[0];
      const after=lead+replacement+trail;
      ledger.push({opId:op.opId,kind:op.kind,recordKey:c.recordKey,
        field:sourceField(c),before,after,byteRange:{start,end}});
      count++;
    }
    need(count>0,R.PARAMS,{opId:op.opId});
  }
  ledger.sort((a,b)=>a.byteRange.start-b.byteRange.start);
  assertDisjointPatches(ledger);
  return {ledger,mapping};
}
function spliceOriginal(original,ledger){
  let result=original;
  for(let i=ledger.length-1;i>=0;i--){
    const x=ledger[i],{start,end}=x.byteRange,sub=enc.encode(x.after);
    const next=new Uint8Array(result.length-(end-start)+sub.length);
    next.set(result.subarray(0,start));next.set(sub,start);
    next.set(result.subarray(end),start+sub.length);result=next;
  }
  return result;
}
function components(edges){
  const parent=new Map();
  const root=x=>{
    if(!parent.has(x))parent.set(x,x);
    const p=parent.get(x);
    if(p===x)return x;
    const r=root(p);parent.set(x,r);return r;
  };
  for(const [a,b] of edges){
    const x=root(a),y=root(b);
    if(x!==y)parent.set(x,y);
  }
  const groups=new Map();
  for(const x of parent.keys()){
    const r=root(x);if(!groups.has(r))groups.set(r,[]);
    groups.get(r).push(x);
  }
  return [...groups.values()].map(x=>x.sort().join(',')).sort();
}
function numericEdges(inv){
  return inv.records.map(row=>{
    const arr=inv.carriers.filter(x=>x.index===row.index&&
      x.element==='PIPINGELEMENT');
    return [arr.find(x=>x.field==='FROM_NODE')?.key,
      arr.find(x=>x.field==='TO_NODE')?.key];
  });
}
function fullNumericOracle(before,after,mapping,ledger){
  const original=before.inventory,candidate=after.inventory;
  need(sameArray(original.shape,candidate.shape)&&
    original.items.length===candidate.items.length&&
    original.carriers.length===candidate.carriers.length,R.TOPOLOGY);
  const edits=new Map(ledger.map(x=>[x.recordKey+'#'+x.field,x]));
  const editedPaths=new Set();
  for(let i=0;i<original.items.length;i++){
    const a=original.items[i],b=candidate.items[i];
    need(a.path===b.path&&a.kind===b.kind&&a.field===b.field,R.TOPOLOGY);
    if(a.kind==='NODE_REF'){
      const expected=a.key!==null?(mapping.get(a.key)??a.key):null;
      if(b.key!==null&&mapping.has(b.key))
        throw new Refusal(R.REMAINED,{path:b.path});
      need(b.key===expected,R.TOPOLOGY,{path:a.path});
      if(mapping.has(a.key)){
        const field=sourceField(a),change=edits.get(a.recordKey+'#'+field);
        need(change&&b.raw===change.after&&a.raw===change.before,R.TOPOLOGY,
          {path:a.path});
        editedPaths.add(a.path);
      }else need(b.raw===a.raw,R.TOPOLOGY,{path:a.path});
    }else need(a.raw===b.raw&&a.decoded===b.decoded,R.PARITY,{path:a.path});
  }
  need(editedPaths.size===ledger.length,R.TOPOLOGY);
  need(original.textItems.length===candidate.textItems.length,R.TOPOLOGY);
  for(let i=0;i<original.textItems.length;i++)
    need(original.textItems[i].path===candidate.textItems[i].path&&
      original.textItems[i].raw===candidate.textItems[i].raw,R.TOPOLOGY);
  // S3 treats raw endpoint strings as graph identities. Every B endpoint
  // must use the single original B raw spelling, not merely numeric B.
  for(const owner of new Set(mapping.values())){
    const originals=original.carriers.filter(x=>x.element==='PIPINGELEMENT'&&
      x.key===owner).map(x=>x.raw.trim());
    need(new Set(originals).size===1&&originals.length>0,R.OWNER);
    const literal=originals[0];
    need(candidate.carriers.filter(x=>x.element==='PIPINGELEMENT'&&
      x.key===owner).every(x=>x.raw.trim()===literal),R.TOPOLOGY);
  }
  const expectedEdges=numericEdges(original).map(([a,b])=>
    [mapping.get(a)??a,mapping.get(b)??b]);
  const actualEdges=numericEdges(candidate);
  need(sameArray(expectedEdges.map(JSON.stringify),actualEdges.map(JSON.stringify))&&
    sameArray(components(expectedEdges),components(actualEdges)),R.TOPOLOGY);
  const beforeEdges=numericEdges(original);
  need(expectedEdges.every(([a,b],i)=>beforeEdges[i][0]===beforeEdges[i][1]||
    a!==b),R.SELF);
}
function verifyS3Candidate(original,candidate,mapping){
  const first=original.doc,last=candidate.doc;
  need(first.components.length===last.components.length,R.PARITY);
  const oldEdges=numericEdges(original.inventory);
  for(let i=0;i<first.components.length;i++){
    const ref=last.components[i]?.sourceRefs?.[0],prev=first.components[i]?.sourceRefs?.[0];
    need(ref?.format==='INPUT_XML'&&ref.elementIndex===i&&
      ref.recordKey===('E'+i+':F'+encodeURIComponent(ref.fromNode)+
      ':T'+encodeURIComponent(ref.toNode)),R.PARITY,{row:i+1});
    const expected=oldEdges[i].map(n=>mapping.get(n)??n);
    need(safeNode(ref.fromNode)===expected[0]&&
      safeNode(ref.toNode)===expected[1],R.PARITY,{row:i+1});
    const old=first.components[i].rawAttributes.inputXml;
    const newer=last.components[i].rawAttributes.inputXml;
    // Geometry is non-editable: both per-endpoint position and original
    // explicit coordinates must be within the unchanged S3 tolerance.
    for(const end of ['from','to']){
      const a=old[end],b=newer[end];
      need(a&&b&&samePoint(a,b),R.PARITY,{row:i+1,end});
    }
    need(prev&&newer,R.PARITY,{row:i+1});
  }
}
function verifyCandidate(originalText,oldBytes,candidateBytes,ledger,mapping,original){
  assertByteParity(oldBytes,candidateBytes,ledger);
  const text=dec.decode(candidateBytes);
  const measured=enc.encode(text);
  need(sameArray([...measured],[...candidateBytes]),R.PARITY);
  const shaPromise=hash(candidateBytes);
  return shaPromise.then(newSha=>{
    let doc;
    try{doc=mapCaesarInputXmlToUxmlStrict(text,{fileSha256:newSha});}
    catch{throw new Refusal(R.READER);}
    const inventory=inventoryInputXml(text,{refs:doc.components.map(c=>c.sourceRefs[0])});
    const candidate={doc,inventory};
    fullNumericOracle(original,candidate,mapping,ledger);
    verifyS3Candidate(original,candidate,mapping);
    return candidate;
  });
}
// Isolated invariant fault witnesses have no writer access or new authority.
export const __editOpsInvariants=Object.freeze({
  reserveField,assertUnchainedIds,assertDisjointPatches,assertByteParity,
  verifyCoincidence,fullNumericOracle,verifyS3Candidate,spliceOriginal,
});
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
    verifyPolicy(payload.policy,payload.ops);
    const original=enc.encode(originalText),measured=await hash(original);
    need(shaFormat(fileSha256)&&fileSha256===measured&&
      payload.fileSha256===measured,R.HASH);
    const witness=originalWitness(originalText,measured);
    for(const op of payload.ops)
      need(op.fileSha256===measured,R.OP_SHA,{opId:op.opId});
    const {ledger,mapping}=planAliases(witness,payload,original);
    const candidateBytes=spliceOriginal(original,ledger);
    await verifyCandidate(originalText,original,candidateBytes,ledger,mapping,witness);
    await verifyUxmlEditOpsIndependent({
      originalText,authorisedMapping:new Map(mapping),ledger,emittedBytes:candidateBytes,
    });
    return {ok:true,bytes:candidateBytes,parity:'EQUAL',ledger,refusals:[]};
  }catch(e){
    if(e instanceof Refusal)return fail(e.code,e.detail);
    if(typeof e?.code==='string'&&e.code.startsWith('INPUT_XML_'))
      return fail(e.code,e.detail);
    return fail(R.INTERNAL);
  }
}

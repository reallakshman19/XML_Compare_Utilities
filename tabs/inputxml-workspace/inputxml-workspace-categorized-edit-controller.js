/**
 * B7: fail-closed in-memory original InputXML patch-back controller.
 * No DOM, network, localStorage, download links, or reverse converter.
 * The only downloadable bytes are an unmodified copy of S4.2's ok:true/EQUAL
 * result at the exact current revision.
 */
import {mapCaesarInputXmlToUxmlStrict} from '../../uxml/UxmlInputXmlSchemaMapper.js';
import {mapCategorizedInputXmlToUxml,UXML_CATEGORIZED_INPUTXML_REFUSALS as S41}
  from '../../uxml/UxmlCategorizedInputXmlSchemaMapper.js';
import {inputXmlToCategorizedInputXml} from '../../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized,classifyCategorizedEditableFields,UXML_CATEGORIZED_PATCH_REFUSALS as R}
  from '../../uxml/UxmlCategorizedPatchBack.js';

export const B7_REFUSALS=Object.freeze({
  INPUT:'B7_INVALID_FILE_BYTES',
  UTF8:'B7_INPUT_NOT_LOSSLESS_UTF8',
  HASH:'B7_BYTE_SHA256_UNAVAILABLE',
  EMPTY:'B7_NO_SOURCE_LOADED',
  CHECK:'B7_CHECK_NOT_CURRENT',
  EXCEPTION:'B7_CHECK_EXCEPTION',
  NEWLINES:'B7_EDITOR_LINE_STRUCTURE_CHANGED',
  CONTINUE:'B7_CONTINUE_RELOAD_REFUSED',
  S3:'B7_S3_SOURCE_REFUSED',
  S41:'B7_S41_SOURCE_REFUSED',
  CONVERTER:'B7_S40_SOURCE_REFUSED',
});
const patchReasons=Object.freeze({
  [R.INPUT]:'Invalid original, baseline, editor, or options.',
  [R.HASH]:'Original source SHA-256 does not match the loaded bytes.',
  [R.BASELINE]:'Categorized baseline is not the exact S4.0 projection of this original.',
  [R.UNBOUND]:'A physical original record is not uniquely bound to S4.1 evidence.',
  [R.STRUCTURE]:'An element or XML attribute/tag structure was added, removed or modified.',
  [R.NESTED]:'Edits below permitted source stanzas are not authorized.',
  [R.REORDER]:'The original record order changed.',
  [R.IDENTITY]:'Node, record, or external-block identity cannot be changed.',
  [R.EXTERNAL]:'An external block has ambiguous/global ownership.',
  [R.UNITS]:'UNITS is immutable, including UNITS nested inside an element.',
  [R.VALUE]:'Invalid XML entity, unsupported whitespace, or unsafe attribute value.',
  [R.OFFSET]:'Proposed edit could not be proven at the exact original byte offsets.',
  [R.PARITY]:'Strict S3 or S4.1 post-edit identity/parity did not pass.',
  [R.CONVERTER]:'The S4.0 forward converter rejected the source or proposed result.',
  [R.S40_MISMATCH]:'The edited snapshots/projections do not equal S4.0 of the proposed original.',
  [R.UNMAPPED]:'Derived, line-owned, missing, unlisted, or mixed SIF snapshot plus projection edits across rows are not writable together. Check and download permitted edits separately.',
  [R.ROUNDTRIP]:'Typed text cannot be written and echoed exactly through S4.0.',
  [R.GLOBAL]:'Globally shared AllowableStress has no unique Line source owner and is read-only.',
  [R.LINE_DERIVED]:'Source elements disagree or a line value cannot be traced to one consistent source value.',
  [R.CROSS_LINE]:'Changing a Line field would leak a carried value into a different Line; leave source unchanged.',
  [R.OMITTED]:'The visible value is derived or omitted from the source; no new attribute may be invented.',
  [R.GRAPH]:'Strict S3 refused the edited route because its coordinate/delta graph became inconsistent.',
  [R.S41_BINDING]:'Strict S3 accepted the candidate, but S4.1 could not rebind its categorized snapshot to one physical source record.',
});
const otherReasons=Object.freeze({
  [B7_REFUSALS.INPUT]:'Choose a local original InputXML file with readable bytes.',
  [B7_REFUSALS.UTF8]:'Only byte-for-byte lossless UTF-8 InputXML is supported.',
  [B7_REFUSALS.HASH]:'The browser could not measure SHA-256 of the original bytes.',
  [B7_REFUSALS.EMPTY]:'Load an original InputXML file before checking.',
  [B7_REFUSALS.CHECK]:'Edit, Reset, reload or a newer Check invalidated this result.',
  [B7_REFUSALS.EXCEPTION]:'The patch-back engine failed closed without downloadable bytes.',
  [B7_REFUSALS.NEWLINES]:'Editor line count changed; original LF/CRLF separator positions cannot be safely preserved.',
  [B7_REFUSALS.CONTINUE]:'Rebinding the patched source was refused; the prior loaded original is retained.',
  [B7_REFUSALS.S3]:'The original was refused by the strict S3 source reader.',
  [B7_REFUSALS.S41]:'The original and S4.0 categorized view did not bind to S4.1.',
  [B7_REFUSALS.CONVERTER]:'S4.0 could not construct the Categorized view.',
});
const s41Reasons=Object.freeze(Object.fromEntries(Object.values(S41).map(code=>[code,
  ({[S41.INVALID_CATEGORY]:'Categorized XML is malformed or unsupported.',
    [S41.SOURCE_HASH_REQUIRED]:'An original file SHA-256 is required.',
    [S41.SOURCE_HASH_MISMATCH]:'Original file hash differs from the bound witness.',
    [S41.ORIGINAL_ENCODING]:'The source encoding cannot preserve original bytes.',
    [S41.ORIGINAL_INPUT_CONFLICT]:'Original text disagrees with its measured bytes.',
    [S41.ORIGINAL_STRUCTURE]:'Original CAESAR structure is unsupported.',
    [S41.S3_REFUSED]:'Strict S3 did not admit the original source.',
    [S41.S3_KEY_MISMATCH]:'S4.1 physical recordKeys disagree with S3.',
    [S41.RECORD_KEY_MISSING]:'A physical source identity is missing.',
    [S41.RECORD_NO_MATCH]:'Categorized element lacks an original row match.',
    [S41.RECORD_AMBIGUOUS]:'Original row match is ambiguous.',
    [S41.RECORD_CLAIMED_TWICE]:'An original row was claimed more than once.',
    [S41.RECORD_UNCLAIMED]:'At least one original row was not accounted for.',
    [S41.DERIVED_DIFF]:'Unreviewed computed or line projections disagree.',
    [S41.EXTERNAL_DUPLICATE]:'External evidence is duplicated across source rows.',
    [S41.UNKNOWN_SECTION]:'UNITS or another source section contains unsupported tags.',
    [S41.GATE_REJECTED]:'Shared UXML validation refused the original evidence.'})[code] ||
  'The S4.1 source-binding gate refused this file.'])));
export const B7_REFUSAL_MESSAGES=Object.freeze({...patchReasons,...otherReasons,...s41Reasons,
  INPUT_XML_SOURCE_STRUCTURE_REFUSED:'Strict S3 refused the original CAESAR XML structure.',
  INPUT_XML_PIPINGELEMENT_REQUIRED:'Strict S3 found no physical PIPINGELEMENT records.',
  INPUT_XML_MEASURED_FILE_SHA256_REQUIRED:'Strict S3 requires a measured file hash.',
});
export function b7Reason(code=''){
  return B7_REFUSAL_MESSAGES[String(code)] ||
    (String(code).startsWith('INPUT_XML_')
      ?'Strict S3 cannot prove safe original-record identity for this file.'
      :'This file or edit was refused without generating any downloadable output.');
}
/**
 * HTMLTextAreaElement.value normalizes CRLF to LF. S4.0 may emit LF for
 * generated blocks and preserve CRLF inside OriginalElement CDATA.
 * Restore each separator from the previous canonical text by line ordinal
 * before submitting a visible-value edit to S4.2. Never invent/remove a
 * line ending, and never normalize original source bytes.
 */
export function preserveCategorizedEditorLineEndings(exactPrevious,domValue){
  if(typeof exactPrevious!=='string'||typeof domValue!=='string')return domValue;
  const separators=[...exactPrevious.matchAll(/\r\n|\n|\r/g)].map(m=>m[0]);
  const lines=domValue.split(/\r\n|\n|\r/);
  if(lines.length!==separators.length+1)return domValue;
  return lines.map((line,i)=>line+(separators[i]??'')).join('');
}

export function patchedOriginalFilename(name='original.xml'){
  const leaf=String(name).split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g,'')||'original.xml';
  const cleaned=leaf.replace(/(?:-patched)+(?=\.xml$|$)/i,'');
  return cleaned.replace(/(\.xml)?$/i,(ext)=>'-patched'+(ext||'.xml'));
}
const toBytes=bytes=>bytes instanceof Uint8Array
  ?new Uint8Array(bytes):bytes instanceof ArrayBuffer
    ?new Uint8Array(bytes.slice(0)):null;
const utf8=text=>new TextEncoder().encode(text);
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
async function measuredHash(bytes){
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
}
function strictCode(error){
  const message=String(error?.message||error||'');
  return /^INPUT_XML_[A-Z_]+/.exec(message)?.[0] || B7_REFUSALS.S3;
}
function warningOnCollidingName(strict,changes){
  const labels=new Map();
  for(const c of strict?.components||[]){
    const attrs=c.rawAttributes?.inputXml?.sourceAttributes||{};
    for(const [nodeKey,nameKey] of [['FROM_NODE','FROM_NAME'],['TO_NODE','TO_NAME']]){
      const node=String(attrs[nodeKey]??'').trim();
      const label=String(attrs[nameKey]??'').trim();
      if(!node||!label)continue;
      const nodeId=Number.isFinite(Number(node))?String(Number(node)):node;
      if(!labels.has(label))labels.set(label,new Set());
      labels.get(label).add(nodeId);
    }
  }
  const output=new Set();
  for(const change of changes){
    const field=String(change.field||'').split('.').at(-1);
    if(field!=='FROM_NAME'&&field!=='TO_NAME')continue;
    const label=String(change.new||'');
    if((labels.get(label)?.size||0)>1)
      output.add('Node label "'+label+'" is also used by another node. Review names before using this file.');
  }
  return [...output];
}

export function b7VerifiedReceiptCurrent(checked,{revision,edited,fileSha256}={}){
  return Boolean(checked&&checked.revision===revision&&
    checked.editor===edited&&checked.originalSha===fileSha256&&
    checked.ok===true&&checked.parity==='EQUAL'&&
    checked.bytes instanceof Uint8Array);
}

export function createCategorizedEditController({
  strict=mapCaesarInputXmlToUxmlStrict,
  categorize=inputXmlToCategorizedInputXml,
  bind=mapCategorizedInputXmlToUxml,
  patch=patchOriginalFromCategorized,
  classify=classifyCategorizedEditableFields,
  hash=measuredHash,
}={}){
  let revision=0, checkSerial=0, phase='idle', code='',detail='',filename='';
  let originalBytes=null,originalText='',fileSha256='',baseline='',edited='',strictDoc=null;
  let checked=null,warning=[],refusals=[],downloadCount=0,editability=[];
  const refuse=(next,why='',items=[])=>{phase='refused';code=String(next);detail=why;
    checked=null;warning=[];refusals=Array.isArray(items)?items.map(x=>({...x})):[];
    return snapshot();};
  function invalidate(next='ready'){
    revision++;checkSerial++;checked=null;warning=[];refusals=[];code='';detail='';phase=next;
  }
  function snapshot(){
    const allowed=b7VerifiedReceiptCurrent(checked,{revision,edited,fileSha256});
    return {revision,phase,filename,sourceSha256:fileSha256,
      baseline,edited,code,reason:code?b7Reason(code):'',detail,
      canCheck:Boolean(originalBytes&&baseline),
      canDownload:allowed,canContinue:allowed,
      changes:allowed?checked.changes.map(x=>({...x,byteRange:{...x.byteRange}})):[],
      warning:[...warning],refusals:refusals.map(x=>({...x})),downloadCount,
      editability:editability.map(x=>({...x})),
      patchedCategorized:allowed?checked.categorized:''};
  }
  function beginLoad(){invalidate('loading');originalBytes=null;originalText='';fileSha256='';
    baseline='';edited='';strictDoc=null;filename='';editability=[];return revision;}
  async function loadBytes(raw,name='original.xml',token=null){
    const receipt=token??beginLoad();
    if(receipt!==revision)return snapshot();
    const bytes=toBytes(raw);
    if(!bytes||!bytes.length)return refuse(B7_REFUSALS.INPUT);
    let source;
    try{
      source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      if(!same(utf8(source),bytes))return refuse(B7_REFUSALS.UTF8);
    }catch{return refuse(B7_REFUSALS.UTF8);}
    let sha;
    try{sha=await hash(bytes);}
    catch{if(receipt===revision)return refuse(B7_REFUSALS.HASH);return snapshot();}
    if(receipt!==revision)return snapshot();
    if(!/^[a-f\d]{64}$/i.test(String(sha)))return refuse(B7_REFUSALS.HASH);
    let parsed;
    try{parsed=await strict(source,{fileSha256:sha});}
    catch(error){if(receipt===revision)return refuse(strictCode(error),String(error?.message||error));return snapshot();}
    if(receipt!==revision)return snapshot();
    if(!parsed?.components?.length)return refuse(B7_REFUSALS.S3);
    let categorized;
    try{categorized=await categorize(source);}
    catch(error){if(receipt===revision)return refuse(B7_REFUSALS.CONVERTER,String(error?.message||error));return snapshot();}
    if(receipt!==revision)return snapshot();
    if(typeof categorized!=='string'||!categorized)return refuse(B7_REFUSALS.CONVERTER);
    let result;
    try{result=await bind(categorized,{originalInputXml:source,fileSha256:sha});}
    catch(error){if(receipt===revision)return refuse(B7_REFUSALS.S41,String(error?.message||error));return snapshot();}
    if(receipt!==revision)return snapshot();
    if(!result?.ok||result.status!=='SOURCE_BOUND_READ_ONLY'||
       result.exportAllowed!==false||result.uxml?.components?.length!==parsed.components.length)
      return refuse(result?.code||B7_REFUSALS.S41);
    let classified;
    try{classified=await classify(source,categorized,{fileSha256:sha});}
    catch{classified=null;} // fail-closed choice classification; writer remains gated
    if(receipt!==revision)return snapshot();
    editability=classified?.ok===true&&Array.isArray(classified.choices)
      ?classified.choices.map(x=>({...x})):[];
    originalBytes=bytes;originalText=source;fileSha256=sha;baseline=categorized;
    edited=categorized;strictDoc=parsed;filename=String(name||'original.xml');
    phase='ready';code='';detail='';return snapshot();
  }
  function edit(value){if(!originalBytes)return snapshot();
    if(String(value)!==edited){invalidate('ready');edited=String(value);}
    return snapshot();
  }
  function reset(){if(!originalBytes)return snapshot();
    invalidate('ready');edited=baseline;return snapshot();}
  async function check(){
    const ticket=++checkSerial,rev=revision,source=originalText,
      base=baseline,value=edited,sha=fileSha256;
    checked=null;warning=[];
    if(!originalBytes||!base)return refuse(B7_REFUSALS.EMPTY);
    phase='checking';code='';detail='';refusals=[];
    if(baseline.split(/\r\n|\r|\n/).length!==edited.split(/\r\n|\r|\n/).length)
      return refuse(B7_REFUSALS.NEWLINES,'Changed line-break count; Reset or edit values only.');
    let result;
    try{result=await patch(source,base,value,{fileSha256:sha});}
    catch(error){if(ticket===checkSerial&&rev===revision)
      return refuse(B7_REFUSALS.EXCEPTION,String(error?.message||error));return snapshot();}
    if(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256)
      return snapshot(); // latest result only; stale work can never release bytes.
    if(result?.ok!==true||result.parity!=='EQUAL'||!(result.bytes instanceof Uint8Array))
      return refuse(result?.code||B7_REFUSALS.CHECK,'',result?.refusals);
    const bytes=new Uint8Array(result.bytes);
    let patched,projected,patchedStrict;
    try{
      patched=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      if(!same(utf8(patched),bytes))return refuse(B7_REFUSALS.UTF8);
      projected=await categorize(patched);
      patchedStrict=await strict(patched,{fileSha256:await hash(bytes)});
    }catch(error){
      if(ticket===checkSerial&&rev===revision)
        return refuse(B7_REFUSALS.CONVERTER,String(error?.message||error));
      return snapshot();
    }
    if(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256)return snapshot();
    if(typeof projected!=='string'||!Array.isArray(result.changes))return refuse(B7_REFUSALS.CHECK);
    checked={revision:rev,editor:value,originalSha:sha,bytes,changes:result.changes,
      ok:true,parity:'EQUAL',categorized:projected};
    warning=warningOnCollidingName(patchedStrict,result.changes);
    phase='checked';code='';detail='';return snapshot();
  }
  function download(){
    const current=snapshot();
    if(!current.canDownload)return null;
    // The bytes are copied from the successful engine result — never
    // reserialized, transformed or decoded for download.
    const value={filename:patchedOriginalFilename(filename),
      bytes:new Uint8Array(checked.bytes),mime:'application/xml'};
    downloadCount++;phase='downloaded';return value;
  }
  async function continueEditing(){
    const current=snapshot();
    if(!current.canContinue)return snapshot();
    const bytes=new Uint8Array(checked.bytes),nextName=patchedOriginalFilename(filename);
    // Stage the entire reload without mutating the current source. A transient
    // strict/S4.1 refusal must not destroy the only valid original source.
    const stage=createCategorizedEditController({strict,categorize,bind,patch,classify,hash});
    const ready=await stage.loadBytes(bytes,nextName);
    if(ready.phase!=='ready')
      return refuse(B7_REFUSALS.CONTINUE,ready.code||ready.detail);
    beginLoad();
    originalBytes=bytes;
    originalText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
    fileSha256=ready.sourceSha256;
    baseline=ready.baseline;edited=ready.edited;editability=ready.editability;
    strictDoc=null;filename=nextName;
    phase='ready';code='';detail='';
    return snapshot();
  }
  return {snapshot,beginLoad,loadBytes,edit,reset,check,download,continueEditing};
}

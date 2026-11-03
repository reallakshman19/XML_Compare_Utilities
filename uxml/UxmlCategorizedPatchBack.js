/**
 * UXML S4.2, slice 1: fail-closed original-byte attribute-value patcher.
 * Source authority: exact SHA + S4.1 one-to-one refs + shared scanner offsets.
 * No inverse converter, XML rebuild, geometry inference, or UI/application.
 */
import {inputXmlToCategorizedInputXml,_test as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml} from './UxmlCategorizedInputXmlSchemaMapper.js';
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {S42_PROJECTION_MAP,S42_LINE_FIELDS,categorizedLineRanges,categorizedElementRanges,projectionLeaf} from './UxmlCategorizedProjectionMap.js';

export const UXML_CATEGORIZED_PATCH_REFUSALS=Object.freeze({
  INPUT:'S42_INVALID_INPUT',
  HASH:'S42_ORIGINAL_SHA_MISMATCH',
  BASELINE:'S42_BASELINE_NOT_S40_EXACT',
  UNBOUND:'S42_UNBOUND_RECORD',
  STRUCTURE:'S42_ELEMENT_ADDED_REMOVED_OR_MARKUP_EDITED',
  NESTED:'S42_NESTED_ATTRIBUTE_EDIT_REFUSED',
  REORDER:'S42_ELEMENT_REORDERED',
  IDENTITY:'S42_RECORD_IDENTITY_EDITED',
  EXTERNAL:'S42_SHARED_EXTERNAL_EDIT_REFUSED',
  UNITS:'S42_UNITS_EDIT_REFUSED',
  VALUE:'S42_ATTRIBUTE_VALUE_UNSAFE',
  OFFSET:'S42_SOURCE_OFFSET_NOT_EXACT',
  PARITY:'S42_PARITY_FAILED',
  CONVERTER:'S42_S40_CONVERSION_REFUSED',
  S40_MISMATCH:'S42_S40_PROJECTION_MISMATCH',
  UNMAPPED:'S42_UNMAPPED_OR_DERIVED_PROJECTION_EDIT',
  ROUNDTRIP:'S42_PROJECTION_VALUE_NOT_EXACT',
  GLOBAL:'S42_GLOBAL_SHARED_STANZA_READ_ONLY',
  LINE_DERIVED:'S42_LINE_DERIVED_OR_DISAGREEING_VALUES',
  CROSS_LINE:'S42_CROSS_LINE_CARRY_FORWARD_REFUSED',
  OMITTED:'S42_SOURCE_ATTRIBUTE_OMITTED_OR_DERIVED',
  GRAPH:'S42_SOURCE_GRAPH_CONFLICT',
  S41_BINDING:'S42_S41_SOURCE_BINDING_REFUSED',
});
const fail=(code,refusals=[])=>({ok:false,code,bytes:null,refusals});
const encoder=new TextEncoder();
const utf8=(value)=>encoder.encode(value);
const hex=(bytes)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const sha=async(bytes)=>hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
const clean=(x)=>String(x??'').trim();
const refKeys=(doc)=>doc.components.map(c=>c.sourceRefs?.[0]?.recordKey);
const equalArray=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export const s42StrictS3KeysEqual=(before,after)=>equalArray(refKeys(before),refKeys(after));
const identityFields=new Set(['FROM_NODE','TO_NODE','LINE_ID','PIPELINE-REFERENCE']);
const externalTags=new Set(['RESTRAINT','DISPLACEMENTS','FORCESMOMENTS','ALLOWABLESTRESS','SIF']);
// Exact S4.0 CONTROL_ATTRS (CategorizedInputXmlConverter.js:23), plus the
// basis/record node references S4.0 uses when solving source-derived fields.
// These are never user-editable on globally projected external stanzas.
const externalControlAttrs=new Set(['NUM','NUMBER','SIF_NUM','DISP_NUM',
  'FORCMNT_NUM','NODE','NODE_NUM','NODE1','NODE2','NODE3','CNODE',
  'GLOBAL_COORD_BASIS_NODE','FROM_NODE','TO_NODE']);
// Keep S4.0 normalizeNode / isUnset numerical semantics, not raw node strings.
const normalizeExternalNode=value=>{
  const raw=clean(value),n=Number(raw);
  return Number.isFinite(n)&&Math.abs(n-Math.round(n))<1e-6
    ?String(Math.round(n)):raw.replace(/\.0+$/,'');
};
const externalNodeField=tag=>
  tag==='RESTRAINT'||tag==='SIF'?'NODE':
  tag==='DISPLACEMENTS'||tag==='FORCESMOMENTS'?'NODE_NUM':null;

function categorizedItems(text){
  const items=[],lineIds=[],lines=/<Line\b([^>]*)>([\s\S]*?)<\/Line>/gi;
  let line;
  while((line=lines.exec(text))){
    const id=line[1].match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(id===undefined)return null;
    lineIds.push(id);
    const re=/<Element\b([^>]*)>([\s\S]*?)<\/Element>/gi;
    let item;
    while((item=re.exec(line[2]))){
      const open=item[1];
      const snapshot=item[2].match(/<OriginalElement>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/OriginalElement>/i);
      if(!snapshot)return null;
      const attrs={};
      for(const match of open.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g))attrs[match[1]]=match[3];
      const identity=[id,attrs.fromNode,attrs.toNode,attrs.elementKey];
      if(identity.some(x=>x===undefined))return null;
      items.push({identity,open,snapshot:clean(snapshot[1].replaceAll(']]]]><![CDATA[>',']]>'))});
    }
  }
  if(!items.length||!lineIds.length)return null;
  if((text.match(/<Element\b/gi)||[]).length!==items.length ||
     (text.match(/<Line\b/gi)||[]).length!==lineIds.length)return null;
  return {items,lineIds};
}
// Attribute-value lexer: offsets are UTF-16 character indices within a
// previously admitted physical record, never a regex substring guess in file.
// A masked whole-row skeleton proves no tag/order/text/attribute-quote edits.
function lexRow(raw){
  const attrs=[],stanzas=[],stack=[],masked=[];
  let cursor=0;
  while(cursor<raw.length){
    const open=raw.indexOf('<',cursor);
    if(open<0){masked.push(raw.slice(cursor));break;}
    masked.push(raw.slice(cursor,open));
    if(raw.startsWith('<!--',open)){
      const end=raw.indexOf('-->',open+4);
      if(end<0)return null;
      masked.push(raw.slice(open,end+3));cursor=end+3;continue;
    }
    if(raw.startsWith('<![CDATA[',open)){
      const end=raw.indexOf(']]>',open+9);
      if(end<0)return null;
      masked.push(raw.slice(open,end+3));cursor=end+3;continue;
    }
    let end=-1,quote='';
    for(let i=open+1;i<raw.length;i++){
      const ch=raw[i];
      if(quote){if(ch===quote)quote='';}
      else if(ch==='"'||ch==="'")quote=ch;
      else if(ch==='>'){end=i+1;break;}
      else if(ch==='<')return null;
    }
    if(end<0||quote)return null;
    const tag=raw.slice(open,end);
    if(tag.startsWith('</')){
      const match=tag.match(/^<\/([A-Za-z_:][\w.:-]*)\s*>$/);
      const parent=stack.pop();
      if(!match||parent?.name!==match[1])return null;
      stanzas[parent.index].end=end;
      masked.push(tag);cursor=end;continue;
    }
    const match=tag.match(/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/);
    if(!match)return null;
    const name=match[1],selfClosing=/\/\s*>$/.test(tag),depth=stack.length;
    const attributeLimit=tag.length-(selfClosing?2:1);
    // The editor uses the XML-aware physical stanza for byte ownership.
    // S4.0's loose raw-text grouping is independently checked before output.
    const stanza={name,depth,parentIndex:stack.at(-1)?.index??null,
      start:open,end:selfClosing?end:null,attributes:[]};
    const stanzaIndex=stanzas.length;
    stanzas.push(stanza);
    let pos=match[0].length,prefix=0;
    while(pos<attributeLimit){
      if(!tag.slice(pos,attributeLimit).trim())break;
      // Quote values may contain the other quote; the real delimiter is
      // handled by the quote-aware robust parser immediately below.
      const robust=tag.slice(pos,attributeLimit).match(/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/);
      if(!robust)return null;
      const token=robust[0],attrName=robust[1],quot=token.match(/(["'])/)?.[1];
      const value=robust[3]??robust[4]??'';
      const prefixBeforeValue=token.slice(0,token.indexOf(quot)+1);
      const valueStart=pos+prefixBeforeValue.length,valueEnd=valueStart+value.length;
      masked.push(tag.slice(prefix,valueStart),'\u0001');
      const attr={name:attrName,tagName:name,depth,stanzaIndex,quote:quot,
        value,start:open+valueStart,end:open+valueEnd};
      attrs.push(attr);
      stanza.attributes.push(attr);
      prefix=valueEnd;
      pos+=token.length;
    }
    masked.push(tag.slice(prefix));
    if(!selfClosing)stack.push({name,index:stanzaIndex});
    cursor=end;
  }
  if(stack.length)return null;
  return {masked:masked.join(''),attrs,stanzas};
}
function decodeValue(raw){
  if(/<|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw))return null;
  if(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(raw))return null;
  let invalid=false;
  const value=raw.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,match=>{
    const token=match.slice(1,-1),entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if(token[0]==='#'){
      const n=token[1]?.toLowerCase()==='x'?parseInt(token.slice(2),16):parseInt(token.slice(1),10);
      if(!Number.isInteger(n)||n===0||n>0x10ffff||(n>=0xd800&&n<=0xdfff)){invalid=true;return '';}
      return String.fromCodePoint(n);
    }
    return entities[token.toLowerCase()]??(invalid=true,'');
  });
  return invalid?null:value;
}
function encodeValue(value,quote){
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,quote==='"'?'&quot;':'"')
    .replace(/'/g,quote==="'"?'&apos;':"'");
}
function stanzaOwner(stanza){
  const ownerField=externalNodeField(stanza.name.toUpperCase());
  // ALLOWABLESTRESS and other globally carried stanzas have no
  // unique per-node identity in S4.0; editing them is not slice-1 safe.
  if(!ownerField)return null;
  const attr=stanza.attributes.find(a=>a.name.toUpperCase()===ownerField);
  if(!attr)return null;
  const decoded=decodeValue(attr.value);
  if(decoded===null||!clean(decoded))return null;
  const n=Number(clean(decoded));
  // Match S4.0's sentinel and numeric-node admission.
  if(!Number.isFinite(n)||Math.abs(n+1.0101)<1e-4)return null;
  return normalizeExternalNode(decoded);
}
function countStanzaOwners(lexedRows,tag,owner,rowIndex=-1,replacement=null){
  let count=0;
  for(let i=0;i<lexedRows.length;i++){
    const row=i===rowIndex&&replacement?replacement:lexedRows[i];
    if(!row)return null;
    for(const stanza of row.stanzas){
      if(stanza.depth!==1||stanza.name.toUpperCase()!==tag)continue;
      if(stanzaOwner(stanza)===owner)count++;
    }
  }
  return count;
}
function sharedExternal(lexedRows,rowIndex,before,after,editedRow){
  const tag=before.name.toUpperCase();
  if(!externalTags.has(tag))return false;
  // MUTATION_GUARD_STANZA_OWNER_LEX: use exactly the stanza containing the
  // changed field; never infer ownership from the edited attribute ordinal
  // or count arbitrary <TAG> text inside an XML comment.
  const oldOwner=stanzaOwner(before),newOwner=stanzaOwner(after);
  if(!oldOwner||!newOwner)return true;
  // MUTATION_GUARD_NUMERIC_OWNER: 20 and 20.0 are one S4.0 grouping node.
  if(oldOwner!==newOwner)return true;
  // S4.0 groups SIF only within the one physical element body.
  // The global S4.0 before/after block check remains mandatory below.
  if(tag==='SIF')return false;
  // MUTATION_GUARD_BEFORE_AND_AFTER_OWNERSHIP: enforce unique ownership
  // against both the original and the proposed edited source tree.
  return countStanzaOwners(lexedRows,tag,oldOwner)!==1||
    countStanzaOwners(lexedRows,tag,newOwner,rowIndex,editedRow)!==1;
}
// S4.0 grouping source of truth: use the converter's exported *same*
// regex / attrsOf / activeBlock functions, not a competing XML lexer.
// splitLooseBlocks intentionally sees nested, comment and CDATA lookalikes.
// S4.2 must refuse rather than silently 'repair' that projection authority.
const s40HarvestTagNames='RESTRAINT|DISPLACEMENTS|FORCESMOMENTS|ALLOWABLESTRESS|SIF';
const harvestLookalike=new RegExp('<(?:'+s40HarvestTagNames+')(?=[\\s/>])','i');
const commentOrCdata=/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
function hasAmbiguousSourceMarkup(text,rows){
  // MUTATION_GUARD_S40_HIDDEN_MARKUP: S4.0's raw regex also harvests
  // '<RESTRAINT' etc inside comments or CDATA, even when lexRow skips them.
  if(([...text.matchAll(commentOrCdata)]).some(x=>harvestLookalike.test(x[0])))
    return true;
  // MUTATION_GUARD_S40_NESTED_HARVEST: S4.0 sees child-of-BEND/RIGID.
  for(const row of rows){
    const lexed=lexRow(row.raw);
    if(!lexed||lexed.stanzas.some(stanza=>
      stanza.depth>1&&externalTags.has(stanza.name.toUpperCase())))return true;
  }
  return false;
}
function ambiguousStanzaAttributes(stanza){
  const seen=new Set();
  for(const attr of stanza.attributes){
    const key=attr.name.toLowerCase();
    // MUTATION_GUARD_S40_CASE_ALIAS: S4.0 attrsOf is exact-case,
    // last exact spelling wins; mixed-case duplicates create two views.
    if(seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function s40ActiveOwnedBlocks(text,tag,owner){
  const blocks=s40.splitLooseBlocks(text,tag);
  return blocks.filter(block=>{
    if(!(tag==='SIF'?s40.activeSifBlock(block):s40.activeNodeBlock(block)))
      return false;
    // s40.attrsOf uses case-sensitive property names with last-wins
    // semantics; no case-insensitive first-match attribute lookup.
    const attrs=s40.attrsOf(block);
    const name=tag==='RESTRAINT'||tag==='SIF'?'NODE':'NODE_NUM';
    return normalizeExternalNode(attrs[name])===owner;
  });
}
function s40ExclusiveBlock(original,patched,originalRows,patchedRows,externalEdits){
  if(!externalEdits.length)return true;
  if(hasAmbiguousSourceMarkup(original,originalRows)||
     hasAmbiguousSourceMarkup(patched,patchedRows))return false;
  for(const edit of externalEdits){
    const {tag,owner,oldBlock,newBlock,rowIndex}=edit;
    const initial=tag==='SIF'?originalRows[rowIndex]?.raw:original;
    const final=tag==='SIF'?patchedRows[rowIndex]?.raw:patched;
    if(!initial||!final)return false;
    const originalBlocks=s40ActiveOwnedBlocks(initial,tag,owner);
    const patchedBlocks=s40ActiveOwnedBlocks(final,tag,owner);
    // MUTATION_GUARD_S40_EXACT_BLOCK: not just count=1, the exact
    // block s40 harvested MUST be the stanza whose value is being edited.
    if(originalBlocks.length!==1||patchedBlocks.length!==1||
       originalBlocks[0]!==oldBlock||patchedBlocks[0]!==newBlock)
      return false;
  }
  return true;
}
function diffRows(oldRaw,newRaw,rowIndex,lexedRows){
  const old=lexRow(oldRaw),next=lexRow(newRaw);
  if(!old||!next||old.masked!==next.masked||old.attrs.length!==next.attrs.length)
    return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
  const changes=[];
  for(let i=0;i<old.attrs.length;i++){
    const before=old.attrs[i],after=next.attrs[i];
    if(before.name!==after.name||before.tagName!==after.tagName||
       before.depth!==after.depth||before.quote!==after.quote)
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
    if(before.value===after.value)continue;
    // UNITS can occur as an actual child (or ancestor of an edited child)
    // inside PIPINGELEMENT, not just as a model-level sibling.
    let unit=old.stanzas[before.stanzaIndex];
    while(unit){
      if(unit.name.toUpperCase()==='UNITS')
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.UNITS};
      unit=unit.parentIndex===null?null:old.stanzas[unit.parentIndex];
    }
    // MUTATION_GUARD_NESTED_ATTRIBUTE: slice 1 allows only a source record
    // or its direct child stanza, never a descendant's attribute.
    if(before.depth>1)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.NESTED};
    if(before.depth===0&&identityFields.has(before.name.toUpperCase()))
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.IDENTITY};
    const oldValue=decodeValue(before.value),newValue=decodeValue(after.value);
    if(oldValue===null||newValue===null)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    // XML whitespace normalization would change TAB/CR/LF semantics.
    // Slice 1 refuses both literal and character-reference forms.
    // MUTATION_GUARD_ATTRIBUTE_CONTROL_WHITESPACE
    if(/[\t\r\n]/.test(newValue))
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    const encoded=encodeValue(newValue,before.quote);
    // XML 1.0 permits literal '>' in an attribute value. Preserve it as
    // authored so S4.0's byte-exact OriginalElement CDATA also agrees.
    if(after.value.replace(/>/g,'&gt;')!==encoded)
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    if(before.depth===1&&externalTags.has(before.tagName.toUpperCase())){
      // MUTATION_GUARD_EXTERNAL_CONTROL_IDENTITY: block *all* S4.0 node
      // grouping/control references, including NODE->other/sentinel moves.
      if(externalControlAttrs.has(before.name.toUpperCase()))
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.IDENTITY};
      const beforeStanza=old.stanzas[before.stanzaIndex];
      const afterStanza=next.stanzas[after.stanzaIndex];
      // MUTATION_GUARD_SHARED_EXTERNAL_OWNERSHIP: identify the SAME lexed
      // stanza before and after, ignoring any comment-hidden tag lookalikes.
      if(!beforeStanza||!afterStanza||
         sharedExternal(lexedRows,rowIndex,beforeStanza,afterStanza,next)||
         ambiguousStanzaAttributes(beforeStanza)||
         ambiguousStanzaAttributes(afterStanza))
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.EXTERNAL};
      const oldBlock=oldRaw.slice(beforeStanza.start,beforeStanza.end);
      const newBlock=newRaw.slice(afterStanza.start,afterStanza.end);
      const owner=stanzaOwner(beforeStanza);
      if(!owner||!oldBlock||!newBlock)
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.EXTERNAL};
      changes.push({start:before.start,end:before.end,oldRaw:before.value,
        newRaw:after.value,old:oldValue,new:newValue,
        field:before.tagName+'.'+before.name,
        external:{tag:before.tagName.toUpperCase(),owner,oldBlock,newBlock,rowIndex}});
      continue;
    }
    changes.push({start:before.start,end:before.end,oldRaw:before.value,
      newRaw:after.value,old:oldValue,new:newValue,field:before.tagName+'.'+before.name});
  }
  return {changes};
}
async function bind(categorized,text,fileSha256){
  try{
    const result=await mapCategorizedInputXmlToUxml(categorized,
      {originalInputXml:text,fileSha256});
    if(!result.ok||result.status!=='SOURCE_BOUND_READ_ONLY'||result.exportAllowed!==false)
      return null;
    return result.uxml;
  }catch{return null;}
}

/**
 * Patch only verified XML attribute values in existing direct source records.
 * Returns bytes:null on every refusal. Byte ranges are half-open [start,end)
 * into the exact input UTF-8 stream; untouched byte spans are never decoded
 * and reserialized.
 */
async function patchOriginalFromCategorizedSlice1(originalText,baselineCategorized,editedCategorized,options={}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  if(typeof originalText!=='string'||typeof baselineCategorized!=='string'||
     typeof editedCategorized!=='string'||!options||typeof options!=='object')
    return fail(R.INPUT);
  const originalBytes=utf8(originalText);
  const measured=await sha(originalBytes);
  if(!/^[a-f\d]{64}$/i.test(clean(options.fileSha256))||
     measured!==clean(options.fileSha256).toLowerCase())return fail(R.HASH);
  // MUTATION_GUARD_BASELINE: do not trust a stale or hand-edited baseline.
  let baselineCanonical;
  try{baselineCanonical=inputXmlToCategorizedInputXml(originalText);}
  catch{return fail(R.CONVERTER);}
  if(baselineCategorized!==baselineCanonical)return fail(R.BASELINE);
  const originalBinding=await bind(baselineCategorized,originalText,measured);
  // MUTATION_GUARD_S41_BIND: never issue a write from unbound rows.
  if(!originalBinding)return fail(R.UNBOUND);
  const originalRows=scanOriginalInputXmlStructure(originalText);
  if(!originalRows||originalRows.length!==originalBinding.components.length)
    return fail(R.UNBOUND);
  const oldCat=categorizedItems(baselineCategorized);
  const newCat=categorizedItems(editedCategorized);
  if(!oldCat||!newCat||oldCat.items.length!==newCat.items.length||
     !equalArray(oldCat.lineIds,newCat.lineIds))return fail(R.STRUCTURE);
  const oldIds=oldCat.items.map(x=>x.identity.join('\u0000'));
  const newIds=newCat.items.map(x=>x.identity.join('\u0000'));
  if(!equalArray(oldIds,newIds)){
    if(equalArray([...oldIds].sort(),[...newIds].sort()))return fail(R.REORDER);
    return fail(R.IDENTITY);
  }
  const changes=[];
  // Cache lexed original stanzas once, skipping comments and CDATA.
  // Physical record identity was already authenticated by S4.1 + scanner.
  const sourceLexedRows=originalRows.map(row=>lexRow(row.raw));
  if(sourceLexedRows.some(row=>row===null))return fail(R.UNBOUND);
  for(let i=0;i<oldCat.items.length;i++){
    const reference=originalBinding.components[i]?.sourceRefs?.[0];
    if(!reference||reference.format!=='INPUT_XML'||
       reference.fileSha256!==measured||
       !Number.isInteger(reference.elementIndex))return fail(R.UNBOUND);
    const source=originalRows[reference.elementIndex];
    if(!source||source.index!==reference.elementIndex||
       originalText.slice(source.start,source.start+source.raw.length)!==source.raw)
      return fail(R.OFFSET);
    const before=oldCat.items[i].snapshot,after=newCat.items[i].snapshot;
    if(!before.startsWith(source.raw))return fail(R.UNBOUND);
    const suffix=before.slice(source.raw.length);
    // MUTATION_GUARD_UNITS_IMMUTABLE: an unchanged converter-carried UNITS
    // witness may trail the last physical row, but it is never writable.
    if(suffix&&(!/^\s*<UNITS(?=[\s/>])[\s\S]*<\/UNITS\s*>\s*$/i.test(suffix)||
       !after.endsWith(suffix)))return fail(R.UNITS);
    const candidate=suffix?after.slice(0,-suffix.length):after;
    const diff=diffRows(source.raw,candidate,source.index,sourceLexedRows);
    if(diff.error)return fail(diff.error);
    for(const field of diff.changes){
      const charStart=source.start+field.start,charEnd=source.start+field.end;
      if(originalText.slice(charStart,charEnd)!==field.oldRaw)return fail(R.OFFSET);
      const byteStart=utf8(originalText.slice(0,charStart)).length;
      const byteEnd=utf8(originalText.slice(0,charEnd)).length;
      changes.push({recordKey:reference.recordKey,field:field.field,old:field.old,
        new:field.new,byteRange:{start:byteStart,end:byteEnd},
        oldRaw:field.oldRaw,newRaw:field.newRaw,external:field.external});
    }
  }
  // Explicit ascending non-overlap proof; patch from the end so byte
  // offsets always refer to the original, not shifting edited positions.
  changes.sort((a,b)=>a.byteRange.start-b.byteRange.start);
  for(let i=0;i<changes.length;i++){
    const c=changes[i],{start,end}=c.byteRange;
    if(start<0||end<start||end>originalBytes.length||
       (i&&changes[i-1].byteRange.end>start))return fail(R.OFFSET);
    if(!equalArray(Array.from(originalBytes.slice(start,end)),Array.from(utf8(c.oldRaw))))
      return fail(R.OFFSET);
  }
  let patchedBytes=originalBytes;
  for(let i=changes.length-1;i>=0;i--){
    const c=changes[i],{start,end}=c.byteRange,replace=utf8(c.newRaw);
    const result=new Uint8Array(patchedBytes.length-(end-start)+replace.length);
    result.set(patchedBytes.slice(0,start));
    result.set(replace,start);
    result.set(patchedBytes.slice(end),start+replace.length);
    patchedBytes=result;
  }
  let patched;
  try{patched=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(patchedBytes);}
  catch{return fail(R.VALUE);}
  // The writer never uses the reverse converter, only strict S3, forward
  // converter and S4.1 after the proposed byte-level mutation.
  const externalEdits=changes.filter(change=>change.external)
    .map(change=>change.external);
  if(externalEdits.length){
    const patchedRows=scanOriginalInputXmlStructure(patched);
    if(!patchedRows||patchedRows.length!==originalRows.length||
       !s40ExclusiveBlock(originalText,patched,originalRows,patchedRows,externalEdits))
      return fail(R.EXTERNAL);
  }
  const patchedHash=await sha(patchedBytes);
  let oldStrict,newStrict;
  try{
    oldStrict=mapCaesarInputXmlToUxmlStrict(originalText,{fileSha256:measured});
    newStrict=mapCaesarInputXmlToUxmlStrict(patched,{fileSha256:patchedHash});
  }catch{return fail(R.PARITY);}
  if(!s42StrictS3KeysEqual(oldStrict,newStrict))return fail(R.PARITY);
  // MUTATION_GUARD_PARITY_CONVERTER: an edited derived/line field is not
  // an authorized source edit. Compare the ENTIRE canonical S4.0 output.
  let regenerated;
  try{regenerated=inputXmlToCategorizedInputXml(patched);}
  catch{return fail(R.CONVERTER);}
  if(regenerated!==editedCategorized)return fail(R.S40_MISMATCH);
  // MUTATION_GUARD_PARITY_S41: edited evidence must bind on patched bytes.
  const patchedBinding=await bind(editedCategorized,patched,patchedHash);
  if(!patchedBinding||!equalArray(refKeys(patchedBinding),refKeys(originalBinding)))
    return fail(R.PARITY);
  return {ok:true,bytes:patchedBytes,
    changes:changes.map(({recordKey,field,old,new:next,byteRange})=>
      ({recordKey,field,old,new:next,byteRange})),
    parity:'EQUAL'};
}


// S4.2 slice 2: user-visible, *verbatim* direct-row projection fields.
// All actual byte mutations and output parity still go through slice 1.
const s40EscapeText=value=>String(value).replaceAll('&','&amp;')
  .replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&apos;');
const snapshotBlock=element=>element.match(/<OriginalElement>[\s\S]*?<\/OriginalElement>/)?.[0]??null;
function substitute(text,edits){
  let out=text;
  const sorted=[...edits].sort((a,b)=>b.start-a.start);
  for(let i=0;i<sorted.length;i++){
    const edit=sorted[i];
    if(edit.start<0||edit.end<edit.start||edit.end>text.length||
       (i&&edit.end>sorted[i-1].start))return null;
    out=out.slice(0,edit.start)+edit.value+out.slice(edit.end);
  }
  return out;
}
function sourceRootAttribute(sourceRow,attribute){
  const row=lexRow(sourceRow.raw);
  if(!row)return null;
  const attrs=row.attrs.filter(x=>x.depth===0&&x.tagName==='PIPINGELEMENT'&&
    x.name===attribute);
  return attrs.length===1?attrs[0]:null;
}

// B8 diagnostics are only about named XML leaves; the original byte writer
// remains the sole acceptance authority. No loose XML reparse is trusted for writes.
function b8Refusal(code,{line=null,row=null,tag='UNKNOWN',reason=''}={}){
  return {code,line,row,tag,reason};
}
function b8FlatLeaves(xml){
  const fields=new Map(),seen=new Map();
  const re=/<([A-Za-z_][\w:.-]*)(?:\s+[^>]*)?>([^<]*)<\/\1>/g;
  let m;
  while((m=re.exec(xml))){
    const tag=m[1],ordinal=seen.get(tag)||0;
    seen.set(tag,ordinal+1);
    fields.set(tag+'#'+ordinal,{tag,value:m[2]});
  }
  return fields;
}
function b8DifferentLeaves(before,after,allowed,location){
  const old=b8FlatLeaves(before),next=b8FlatLeaves(after),result=[];
  for(const key of new Set([...old.keys(),...next.keys()])){
    const a=old.get(key),b=next.get(key);
    if(a?.value===b?.value)continue;
    const tag=(a||b).tag;
    if(!allowed.has(tag))result.push(b8Refusal(
      UXML_CATEGORIZED_PATCH_REFUSALS.UNMAPPED,{...location,tag,
        reason:'Not an editable source-bound value'}));
  }
  return result;
}
function b8Allowable(xml){
  return [...xml.matchAll(/<AllowableStressBlock>[\s\S]*?<\/AllowableStressBlock>/g)]
    .map(x=>x[0]);
}
function b8LineProjectionChanges(baseline,edited){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const oldLines=categorizedLineRanges(baseline),newLines=categorizedLineRanges(edited);
  if(oldLines.length!==newLines.length)
    return {changes:[],normalized:[],refusals:[
      b8Refusal(R.STRUCTURE,{line:'Line',tag:'Line',reason:'Line count changed'})]};
  const changes=[],normalized=[],refusals=[];
  const names=new Set(S42_LINE_FIELDS.map(x=>x.tag));
  for(let i=0;i<oldLines.length;i++){
    const old=oldLines[i],next=newLines[i],line=old.id||'Line '+(i+1);
    if(old.id!==next.id||old.id===null){
      refusals.push(b8Refusal(R.IDENTITY,{line,tag:'Line.id',reason:'Line identity changed'}));
      continue;
    }
    if(JSON.stringify(b8Allowable(old.text))!==JSON.stringify(b8Allowable(next.text))){
      refusals.push(b8Refusal(R.GLOBAL,{line,tag:'ALLOWABLESTRESS',
        reason:'Global stanza is copied into each line without unique ownership'}));
    }
    const withoutElements=text=>text.replace(/<Element\b[^>]*>[\s\S]*?<\/Element>/g,'');
    refusals.push(...b8DifferentLeaves(withoutElements(old.text),
      withoutElements(next.text),names,{line}));
    for(const entry of S42_LINE_FIELDS){
      const a=projectionLeaf(old.text,entry),b=projectionLeaf(next.text,entry);
      if(a?.error||b?.error||Boolean(a)!==Boolean(b)){
        refusals.push(b8Refusal(R.UNMAPPED,{line,tag:entry.tag,
          reason:'Omitted, duplicated, or ambiguous line leaf'}));
        continue;
      }
      if(!a||a.value===b.value)continue;
      const decoded=decodeValue(b.value);
      if(decoded===null||/[\t\r\n]/.test(decoded)||
         s40EscapeText(decoded)!==b.value||s40.isUnset(decoded)){
        refusals.push(b8Refusal(R.ROUNDTRIP,{line,tag:entry.tag,
          reason:'Typed value is not a verbatim non-sentinel S4.0 echo'}));
        continue;
      }
      changes.push({line,entry,old:a.value,new:b.value,decoded});
      normalized.push({start:next.start+b.start,end:next.start+b.end,value:a.value});
    }
  }
  return {changes,normalized,refusals};
}
function b8ElementProjectionRefusals(oldElements,newElements){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const allowed=new Set(S42_PROJECTION_MAP.map(x=>x.tag)),refusals=[];
  for(let i=0;i<oldElements.length;i++){
    const withoutSnapshot=text=>text.replace(/<OriginalElement>[\s\S]*?<\/OriginalElement>/g,'');
    refusals.push(...b8DifferentLeaves(withoutSnapshot(oldElements[i].text),
      withoutSnapshot(newElements[i].text),allowed,{row:i+1}));
  }
  return refusals;
}
function b8UniqueRefusals(refusals){
  const seen=new Set();
  return refusals.filter(item=>{
    const key=[item.code,item.line,item.row,item.tag].join('\u0000');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}

// B8-R1: source-authoritative UI classification. The initial presence of
// a Categorized leaf NEVER grants write authority. Line/geometry decisions
// are checked against the actual same-branch patch engine before UI exposure.
function b8ClassificationProbe(raw){
  const value=decodeValue(raw);
  if(value===null)return null;
  return clean(value)!==''&&Number.isFinite(Number(value))
    ?String(Number(value)+1):'B8_CHECK_VALUE';
}
export async function classifyCategorizedEditableFields(originalText,baselineCategorized,
  options={}){
  const reject=()=>({ok:false,choices:[]});
  if(typeof originalText!=='string'||typeof baselineCategorized!=='string')
    return reject();
  const measured=await sha(utf8(originalText));
  if(clean(options.fileSha256).toLowerCase()!==measured)return reject();
  try{
    if(inputXmlToCategorizedInputXml(originalText)!==baselineCategorized)return reject();
  }catch{return reject();}
  const sourceRows=scanOriginalInputXmlStructure(originalText);
  const originalItems=categorizedItems(baselineCategorized);
  const binding=await bind(baselineCategorized,originalText,measured);
  const elements=categorizedElementRanges(baselineCategorized);
  if(!sourceRows||!originalItems||!binding||
     originalItems.items.length!==elements.length||
     binding.components.length!==elements.length)return reject();
  const choices=[];
  const testValue=async(start,end,probe)=>{
    if(probe===null)return {editable:false,code:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    const editor=baselineCategorized.slice(0,start)+s40EscapeText(probe)+
      baselineCategorized.slice(end);
    const result=await patchOriginalFromCategorized(originalText,baselineCategorized,
      editor,{fileSha256:measured});
    return {editable:result?.ok===true&&result.parity==='EQUAL',
      code:result?.code||'',reason:result?.refusals?.[0]?.reason||''};
  };
  for(const [lineIndex,line] of categorizedLineRanges(baselineCategorized).entries()){
    for(const entry of S42_LINE_FIELDS){
      const leaf=projectionLeaf(line.text,entry);
      if(!leaf||leaf.error)continue;
      const probe=b8ClassificationProbe(leaf.value);
      const result=await testValue(line.start+leaf.start,line.start+leaf.end,probe);
      choices.push({key:'L:'+lineIndex+':'+entry.tag,...result,probeValue:probe});
    }
    if(/<AllowableStressBlock>/.test(line.text))
      choices.push({key:'R:'+lineIndex+':ALLOWABLESTRESS',editable:false,
        code:UXML_CATEGORIZED_PATCH_REFUSALS.GLOBAL,
        reason:'Shared global AllowableStress has no unique Line source owner'});
  }
  for(const [index,element] of elements.entries()){
    const ref=binding.components[index]?.sourceRefs?.[0];
    const row=sourceRows[ref?.elementIndex];
    const sourceBound=ref&&ref.fileSha256===measured&&
      row&&row.index===ref.elementIndex;
    for(const entry of S42_PROJECTION_MAP){
      const leaf=projectionLeaf(element.text,entry);
      if(!leaf||leaf.error)continue;
      const probe=b8ClassificationProbe(leaf.value);
      const attr=sourceBound?sourceRootAttribute(row,entry.attribute):null;
      let exact=false;
      if(attr){
        const original=decodeValue(attr.value);
        exact=original!==null&&s40EscapeText(original)===leaf.value;
        if(entry.tag==='NAME'&&original===''){
          const opening=element.text.match(/^<Element\b[^>]*>/)?.[0]||'';
          const fallback=opening.match(/\belementKey=(["'])(.*?)\1/)?.[2];
          if(fallback===leaf.value)exact=true;
        }
      }
      let outcome={editable:exact&&probe!==null,code:exact?'':UXML_CATEGORIZED_PATCH_REFUSALS.OMITTED,
        reason:exact?'':'No original attribute with the exact source echo'};
      // Graph-linked deltas may be visible but not independently editable:
      // use the actual patch engine rather than allowing them by regex.
      if(outcome.editable&&entry.tag.startsWith('DELTA_'))
        outcome=await testValue(element.start+leaf.start,element.start+leaf.end,probe);
      choices.push({key:'E:'+index+':'+entry.tag,...outcome,probeValue:probe});
    }
  }
  return {ok:true,choices};
}

export async function patchOriginalFromCategorized(originalText,baselineCategorized,editedCategorized,options={}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  if(typeof originalText!=='string'||typeof baselineCategorized!=='string'||
     typeof editedCategorized!=='string'||!options||typeof options!=='object')
    return fail(R.INPUT);
  // Same source-hash and exact S4.0 baseline gates as S4.2 slice 1.
  const measured=await sha(utf8(originalText));
  if(!/^[a-f\d]{64}$/i.test(clean(options.fileSha256))||
     measured!==clean(options.fileSha256).toLowerCase())return fail(R.HASH);
  let authoritative;
  try{authoritative=inputXmlToCategorizedInputXml(originalText);}
  catch{return fail(R.CONVERTER);}
  if(authoritative!==baselineCategorized)return fail(R.BASELINE);
  const oldElements=categorizedElementRanges(baselineCategorized);
  const newElements=categorizedElementRanges(editedCategorized);
  if(oldElements.length!==newElements.length)return fail(R.STRUCTURE);
  const line=b8LineProjectionChanges(baselineCategorized,editedCategorized);
  const preflight=b8UniqueRefusals([...line.refusals,
    ...b8ElementProjectionRefusals(oldElements,newElements)]);
  // Snapshot edits can delegate to the original source-owned slice 1 ONLY
  // when no independent element/line error has already been discovered.
  const snapshotTouched=oldElements.some((old,i)=>
    snapshotBlock(old.text)!==snapshotBlock(newElements[i].text));
  if(snapshotTouched){
    const legacy=await patchOriginalFromCategorizedSlice1(originalText,
      baselineCategorized,editedCategorized,options);
    if(legacy.ok||legacy.code!==R.S40_MISMATCH)return legacy;
  }
  const changes=[],normalized=[...line.normalized],oldSnapshots=[],newSnapshots=[];
  const errors=[...preflight];
  for(let i=0;i<oldElements.length;i++){
    const old=oldElements[i],next=newElements[i];
    for(const entry of S42_PROJECTION_MAP){
      const a=projectionLeaf(old.text,entry),b=projectionLeaf(next.text,entry);
      if(a?.error||b?.error||Boolean(a)!==Boolean(b)){
        errors.push(b8Refusal(R.UNMAPPED,{row:i+1,tag:entry.tag,
          reason:'Omitted or duplicate projected leaf'}));
        continue;
      }
      if(!a||a.value===b.value)continue;
      const decoded=decodeValue(b.value);
      if(decoded===null||/[\t\r\n]/.test(decoded)||
         s40EscapeText(decoded)!==b.value){
        errors.push(b8Refusal(R.ROUNDTRIP,{row:i+1,tag:entry.tag,
          reason:'Typed value cannot round-trip exactly'}));
        continue;
      }
      normalized.push({start:next.start+b.start,end:next.start+b.end,value:a.value});
      changes.push({index:i,entry,old:a.value,new:b.value,decoded});
    }
    const oldSnap=snapshotBlock(old.text),newSnap=snapshotBlock(next.text);
    if(!oldSnap||!newSnap){
      errors.push(b8Refusal(R.STRUCTURE,{row:i+1,tag:'OriginalElement',
        reason:'Original snapshot missing'}));
      continue;
    }
    oldSnapshots.push(oldSnap);newSnapshots.push(newSnap);
    if(oldSnap!==newSnap){
      const local=next.text.indexOf(newSnap);
      normalized.push({start:next.start+local,end:next.start+local+newSnap.length,
        value:oldSnap});
    }
  }
  if(!changes.length&&!line.changes.length){
    if(errors.length)return fail(errors[0].code,b8UniqueRefusals(errors));
    if(oldSnapshots.every((v,i)=>v===newSnapshots[i])&&
       editedCategorized!==baselineCategorized)
      return fail(R.UNMAPPED,[b8Refusal(R.UNMAPPED,{tag:'Markup',
        reason:'Non-source-bound projection or structural edit'})]);
    return patchOriginalFromCategorizedSlice1(originalText,baselineCategorized,
      editedCategorized,options);
  }
  const projectionOnlyEquivalent=substitute(editedCategorized,normalized)===
    baselineCategorized;
  const binding=await bind(baselineCategorized,originalText,measured);
  const sourceRows=scanOriginalInputXmlStructure(originalText);
  const oldCat=categorizedItems(baselineCategorized);
  if(!binding||!sourceRows||!oldCat||
     binding?.components?.length!==oldElements.length||
     oldCat?.items?.length!==oldElements.length){
    if(!binding&&sourceRows&&oldCat&&
       changes.some(x=>x.entry.tag.startsWith('DELTA_'))){
      // The S4.1 original-source admission can fail before any candidate
      // write. Diagnose that exact original binding; NEVER infer an ordinal
      // or skip the read-only authority merely because strict S3 succeeds.
      let reason='S4.1 original source binding refused';
      try{
        const admission=await mapCategorizedInputXmlToUxml(baselineCategorized,
          {originalInputXml:originalText,fileSha256:measured});
        reason+=': '+String(admission?.code||admission?.status||'REFUSED');
      }catch{
        reason+=': exception';
      }
      return fail(R.S41_BINDING,b8UniqueRefusals(changes.map(x=>
        b8Refusal(R.S41_BINDING,{row:x.index+1,tag:x.entry.tag,reason}))));
    }
    return fail(R.UNBOUND);
  }
  const sourceEdits=[],ranges=new Set(),typedWitnesses=new Set();
  const sourceAt=(index,tag,lineId=null)=>{
    const ref=binding.components[index]?.sourceRefs?.[0];
    const row=sourceRows[ref?.elementIndex];
    if(!ref||ref.format!=='INPUT_XML'||ref.fileSha256!==measured||
       !row||row.index!==ref.elementIndex||
       originalText.slice(row.start,row.start+row.raw.length)!==row.raw||
       (lineId!==null&&oldCat.items[index]?.identity?.[0]!==lineId))
      return null;
    return {ref,row,attr:sourceRootAttribute(row,tag)};
  };
  const addSource=(item,decoded,location)=>{
    const {row,attr}=item;
    const raw=encodeValue(decoded,attr.quote);
    const start=row.start+attr.start,end=row.start+attr.end;
    if(originalText.slice(start,end)!==attr.value||ranges.has(start)){
      errors.push(b8Refusal(R.OFFSET,{...location,reason:'Original byte range mismatch'}));
      return;
    }
    ranges.add(start);
    sourceEdits.push({start,end,value:raw});
    typedWitnesses.add(JSON.stringify([item.ref?.recordKey,location.tag,decoded]));
  };
  for(const change of changes){
    const {index,entry,decoded,old}=change;
    const item=sourceAt(index,entry.attribute);
    const location={row:index+1,tag:entry.tag};
    if(!item){
      errors.push(b8Refusal(R.UNBOUND,{...location,reason:'Physical source row not uniquely bound'}));
      continue;
    }
    if(!item.attr){
      errors.push(b8Refusal(R.OMITTED,{...location,
        reason:entry.tag==='NAME'
          ?'S4.0 displays an element-key fallback; source NAME attribute is absent'
          :'S4.0 projection has no unique explicit source attribute'}));
      continue;
    }
    const oldDecoded=decodeValue(item.attr.value);
    // S4.0 NameBlock uses NAME:attrs.NAME||elementKey. If the original
    // NAME attribute exists but is empty, S4.0 shows a derived fallback.
    // Replacing ONLY that existing empty attribute is a value-only edit,
    // not adding a source field. Require the exact emitted elementKey echo.
    let exactOld=s40EscapeText(oldDecoded);
    if(entry.tag==='NAME'&&oldDecoded===''){
      const opening=oldElements[index].text.match(/^<Element\b[^>]*>/)?.[0]||'';
      const fallback=opening.match(/\belementKey=(["'])(.*?)\1/)?.[2];
      if(fallback&&old===fallback)exactOld=old;
    }
    if(oldDecoded===null||exactOld!==old){
      errors.push(b8Refusal(R.OMITTED,{...location,
        reason:entry.tag==='NAME'
          ?'S4.0 NAME fallback could not be tied to the existing source attribute'
          :'Source attribute is not an exact S4.0 value echo'}));
      continue;
    }
    addSource(item,decoded,location);
  }
  for(const change of line.changes){
    const {line:lineId,entry,decoded,old}=change;
    const owners=[];
    for(let i=0;i<oldCat.items.length;i++){
      if(oldCat.items[i].identity[0]===lineId)owners.push(i);
    }
    const location={line:lineId,tag:entry.tag};
    if(!owners.length){
      errors.push(b8Refusal(R.UNBOUND,{...location,reason:'No records bound to Line'}));
      continue;
    }
    const active=[];
    for(const index of owners){
      const item=sourceAt(index,entry.attribute,lineId);
      if(!item){
        errors.push(b8Refusal(R.UNBOUND,{...location,
          reason:'A Line source row has no unique S4.1 physical binding'}));
        continue;
      }
      if(!item.attr){
        // S4.0 inherits from the first meaningful holder. Absent attributes
        // are not invented or filled in by patch-back.
        continue;
      }
      const decodedOld=decodeValue(item.attr.value);
      if(decodedOld===null){
        errors.push(b8Refusal(R.LINE_DERIVED,{...location,
          reason:'A source attribute cannot be decoded exactly'}));
        continue;
      }
      if(s40.isUnset(decodedOld))continue; // -1.0101 or empty carry-forward
      if(s40EscapeText(decodedOld)!==old){
        const formatOnly=Number.isFinite(Number(decodedOld))&&
          Number.isFinite(Number(decodeValue(old)))&&
          Number(decodedOld)===Number(decodeValue(old));
        errors.push(b8Refusal(R.LINE_DERIVED,{...location,
          reason:formatOnly
            ?'Explicit holders use different source formats (e.g. 5.0 vs 5); exact text differs'
            :'Explicit source records disagree with the first line value'}));
        continue;
      }
      active.push(item);
    }
    if(!active.length){
      errors.push(b8Refusal(R.OMITTED,{...location,
        reason:'No explicit non-sentinel source value to patch'}));
      continue;
    }
    // CAESAR II carries missing/-1.0101 fields by physical file order,
    // not by the S4.0 Line display. Stop at the first meaningful explicit
    // override; a different Line reached before that is not source-local.
    const physicalLine=new Map();
    for(let i=0;i<binding.components.length;i++){
      const physical=binding.components[i]?.sourceRefs?.[0]?.elementIndex;
      if(Number.isInteger(physical))
        physicalLine.set(physical,oldCat.items[i]?.identity?.[0]);
    }
    for(const item of active){
      for(let physical=item.row.index+1;physical<sourceRows.length;physical++){
        const following=sourceRootAttribute(sourceRows[physical],entry.attribute);
        if(following){
          const rawValue=decodeValue(following.value);
          if(rawValue===null){
            errors.push(b8Refusal(R.UNBOUND,{...location,
              reason:'Downstream carry-forward source value cannot be decoded at row '+(physical+1)}));
            break;
          }
          if(!s40.isUnset(rawValue))break; // a new explicit holder ends this chain
        }
        const downstream=physicalLine.get(physical);
        if(!downstream){
          errors.push(b8Refusal(R.UNBOUND,{...location,
            reason:'Downstream physical Line is not uniquely source-bound at row '+(physical+1)}));
          break;
        }
        if(downstream!==lineId){
          errors.push(b8Refusal(R.CROSS_LINE,{...location,
            reason:'Changing '+lineId+' would carry '+entry.tag+
              ' into different Line '+downstream+' at physical row '+(physical+1)}));
          break;
        }
      }
    }
    if(!errors.some(error=>error.code===R.CROSS_LINE&&error.line===lineId&&
       error.tag===entry.tag))
      for(const item of active)addSource(item,decoded,location);
  }
  if(errors.length)return fail(errors[0].code,b8UniqueRefusals(errors));
  const candidateOriginal=substitute(originalText,sourceEdits);
  if(candidateOriginal===null)return fail(R.OFFSET);
  // Explicit preflight gives DELTA_Y graph conflicts their actual source
  // cause. It does not authorize a patch; slice 1 reruns the same strict gate.
  try{
    mapCaesarInputXmlToUxmlStrict(candidateOriginal,
      {fileSha256:await sha(utf8(candidateOriginal))});
  }catch(error){
    const graph=/DELTA_(?:GRAPH|PATH).*CONFLICT|ANCHORED.*CONFLICT|COORDINATE.*CONFLICT/i
      .test(String(error?.message||error));
    const location=changes.filter(x=>x.entry.tag.startsWith('DELTA_')).map(x=>
      b8Refusal(graph?R.GRAPH:R.PARITY,{row:x.index+1,tag:x.entry.tag,
        reason:String(error?.message||error).split(':')[0]}));
    return fail(graph?R.GRAPH:R.PARITY,location.length?location:[
      b8Refusal(R.PARITY,{tag:'Source',reason:'Strict S3 candidate refusal'})]);
  }
  let canonical;
  try{canonical=inputXmlToCategorizedInputXml(candidateOriginal);}
  catch{return fail(R.CONVERTER);}
  if(!projectionOnlyEquivalent&&editedCategorized!==canonical)
    return fail(R.UNMAPPED,[b8Refusal(R.UNMAPPED,{tag:'Derived',
      reason:'Additional unbound changes in edited Categorized projection'})]);
  const canonicalElements=categorizedElementRanges(canonical);
  if(canonicalElements.length!==newElements.length)return fail(R.ROUNDTRIP);
  for(const change of changes){
    const echo=projectionLeaf(canonicalElements[change.index].text,change.entry);
    if(!echo||echo.error||echo.value!==change.new)
      return fail(R.ROUNDTRIP,[b8Refusal(R.ROUNDTRIP,
        {row:change.index+1,tag:change.entry.tag,
          reason:'S4.0 changed/omitted the exact typed value'})]);
  }
  const canonicalLines=categorizedLineRanges(canonical);
  for(const change of line.changes){
    const expected=canonicalLines.find(x=>x.id===change.line);
    const echo=expected&&projectionLeaf(expected.text,change.entry);
    if(!echo||echo.error||echo.value!==change.new)
      return fail(R.ROUNDTRIP,[b8Refusal(R.ROUNDTRIP,
        {line:change.line,tag:change.entry.tag,
          reason:'S4.0 did not echo the new line value'})]);
  }
  for(let i=0;i<newSnapshots.length;i++){
    if(newSnapshots[i]!==oldSnapshots[i]&&
       newSnapshots[i]!==snapshotBlock(canonicalElements[i].text))
      return fail(R.S40_MISMATCH,[b8Refusal(R.S40_MISMATCH,
        {row:i+1,tag:'OriginalElement',reason:'Snapshot does not match regenerated source'})]);
  }
  const authoritativeResult=await patchOriginalFromCategorizedSlice1(
    originalText,baselineCategorized,canonical,options);
  if(authoritativeResult.ok===true&&authoritativeResult.parity==='EQUAL'){
    return {...authoritativeResult,changes:authoritativeResult.changes.map(x=>({
      ...x,writtenExactlyAsTyped:typedWitnesses.has(
        JSON.stringify([x.recordKey,x.field.replace(/^PIPINGELEMENT\./,''),x.new])),
    }))};
  }
  let refusedCode=authoritativeResult.code||R.PARITY;
  let refusalReason='Downstream strict source or S4.1 gate';
  // A DELTA_Y (or other delta) candidate can be valid numerical XML and
  // S3 graph-admissible but fail S4.1 physical snapshot re-binding. Inspect
  // that independently to give a precise code, never to bypass parity.
  if(refusedCode===R.PARITY&&changes.some(x=>x.entry.tag.startsWith('DELTA_'))){
    try{
      const rebound=await mapCategorizedInputXmlToUxml(canonical,{
        originalInputXml:candidateOriginal,fileSha256:await sha(utf8(candidateOriginal))});
      if(rebound?.ok!==true||rebound.status!=='SOURCE_BOUND_READ_ONLY'){
        refusedCode=R.S41_BINDING;
        refusalReason='S4.1 source binding: '+String(rebound?.code||'REFUSED');
      }
    }catch{
      refusedCode=R.S41_BINDING;
      refusalReason='S4.1 source binding threw while verifying candidate';
    }
  }
  const scopes=[
    ...changes.map(x=>b8Refusal(refusedCode,
      {row:x.index+1,tag:x.entry.tag,reason:refusalReason})),
    ...line.changes.map(x=>b8Refusal(refusedCode,
      {line:x.line,tag:x.entry.tag,reason:refusalReason})),
  ];
  return fail(refusedCode,b8UniqueRefusals(scopes));
}

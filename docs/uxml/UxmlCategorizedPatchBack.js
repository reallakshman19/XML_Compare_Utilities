/**
 * UXML S4.2, slice 1: fail-closed original-byte attribute-value patcher.
 * Source authority: exact SHA + S4.1 one-to-one refs + shared scanner offsets.
 * No inverse converter, XML rebuild, geometry inference, or UI/application.
 */
import {inputXmlToCategorizedInputXml,_test as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml} from './UxmlCategorizedInputXmlSchemaMapper.js';
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {S42_PROJECTION_MAP,categorizedElementRanges,projectionLeaf} from './UxmlCategorizedProjectionMap.js';

export const UXML_CATEGORIZED_PATCH_REFUSALS=Object.freeze({
  INPUT:'S42_INVALID_INPUT',
  HASH:'S42_ORIGINAL_SHA_MISMATCH',
  BASELINE:'S42_BASELINE_NOT_S40_EXACT',
  UNBOUND:'S42_UNBOUND_RECORD',
  STRUCTURE:'S42_ELEMENT_ADDED_REMOVED_OR_MARKUP_EDITED',
  NESTED:'S42_NESTED_ATTRIBUTE_EDIT_REFUSED',
  REORDER:'S42_ELEMENT_REORDERED',
  IDENTITY:'S42_RECORD_IDENTITY_EDITED',
  DERIVED:'S42_DERIVED_OR_LINE_PROJECTION_EDITED',
  EXTERNAL:'S42_SHARED_EXTERNAL_EDIT_REFUSED',
  UNITS:'S42_UNITS_EDIT_REFUSED',
  VALUE:'S42_ATTRIBUTE_VALUE_UNSAFE',
  OFFSET:'S42_SOURCE_OFFSET_NOT_EXACT',
  PARITY:'S42_PARITY_FAILED',
  CONVERTER:'S42_S40_CONVERSION_REFUSED',
  S40_MISMATCH:'S42_S40_PROJECTION_MISMATCH',
  UNMAPPED:'S42_UNMAPPED_OR_DERIVED_PROJECTION_EDIT',
  ROUNDTRIP:'S42_PROJECTION_VALUE_NOT_EXACT',
});
const fail=(code)=>({ok:false,code,bytes:null});
const encoder=new TextEncoder();
const utf8=(value)=>encoder.encode(value);
const hex=(bytes)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const sha=async(bytes)=>hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
const clean=(x)=>String(x??'').trim();
const refKeys=(doc)=>doc.components.map(c=>c.sourceRefs?.[0]?.recordKey);
const equalArray=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
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
  if(!equalArray(refKeys(oldStrict),refKeys(newStrict)))return fail(R.PARITY);
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
export async function patchOriginalFromCategorized(originalText,baselineCategorized,editedCategorized,options={}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  if(typeof originalText!=='string'||typeof baselineCategorized!=='string'||
     typeof editedCategorized!=='string'||!options||typeof options!=='object')
    return fail(R.INPUT);
  // Reject stale source / baseline *before* interpreting editable projection.
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
  // Existing slice-1 complete snapshot+projection inputs have priority,
  // including an unset field that becomes visible after source editing.
  // A stale projection returns S40_MISMATCH and may qualify for slice 2;
  // every other refusal remains owned by the unchanged slice-1 gate.
  const snapshotTouched=oldElements.some((old,i)=>
    snapshotBlock(old.text)!==snapshotBlock(newElements[i].text));
  if(snapshotTouched){
    const legacy=await patchOriginalFromCategorizedSlice1(originalText,
      baselineCategorized,editedCategorized,options);
    if(legacy.ok||legacy.code!==R.S40_MISMATCH)return legacy;
  }
  const changes=[],normalized=[],oldSnapshots=[],newSnapshots=[];
  for(let i=0;i<oldElements.length;i++){
    const old=oldElements[i],next=newElements[i];
    for(const entry of S42_PROJECTION_MAP){
      const a=projectionLeaf(old.text,entry),b=projectionLeaf(next.text,entry);
      if(a?.error||b?.error||Boolean(a)!==Boolean(b))
        return fail(R.UNMAPPED);
      if(!a||a.value===b.value)continue;
      const decoded=decodeValue(b.value);
      // Require exactly the S4.0 XML text representation of what the
      // user typed; no numerical reformatting, unit conversion or rounding.
      if(decoded===null||/[\t\r\n]/.test(decoded)||
         s40EscapeText(decoded)!==b.value)return fail(R.ROUNDTRIP);
      normalized.push({start:next.start+b.start,end:next.start+b.end,value:a.value});
      changes.push({index:i,entry,old:a.value,new:b.value,decoded});
    }
    const oldSnap=snapshotBlock(old.text),newSnap=snapshotBlock(next.text);
    if(!oldSnap||!newSnap)return fail(R.STRUCTURE);
    oldSnapshots.push(oldSnap);newSnapshots.push(newSnap);
    if(oldSnap!==newSnap){
      const local=next.text.indexOf(newSnap);
      normalized.push({start:next.start+local,end:next.start+local+newSnap.length,
        value:oldSnap});
    }
  }
  if(!changes.length){
    // Snapshot-only + stale projection still fails slice-1's S4.0 parity.
    // A derived/unmapped projection-only change never gains write authority.
    if(oldSnapshots.every((v,i)=>v===newSnapshots[i])&&
       editedCategorized!==baselineCategorized)return fail(R.UNMAPPED);
    return patchOriginalFromCategorizedSlice1(originalText,baselineCategorized,
      editedCategorized,options);
  }
  const projectionOnlyEquivalent=substitute(editedCategorized,normalized)===
    baselineCategorized;
  const binding=await bind(baselineCategorized,originalText,measured);
  const sourceRows=scanOriginalInputXmlStructure(originalText);
  if(!binding||!sourceRows||binding.components.length!==oldElements.length)
    return fail(R.UNBOUND);
  const sourceEdits=[],ranges=new Set();
  for(const change of changes){
    const {index,entry,decoded,old}=change;
    const ref=binding.components[index]?.sourceRefs?.[0];
    const row=sourceRows[ref?.elementIndex];
    if(!ref||ref.format!=='INPUT_XML'||ref.fileSha256!==measured||
       !row||row.index!==ref.elementIndex||
       originalText.slice(row.start,row.start+row.raw.length)!==row.raw)
      return fail(R.UNBOUND);
    const sourceAttr=sourceRootAttribute(row,entry.attribute);
    if(!sourceAttr)return fail(R.UNMAPPED);
    const oldDecoded=decodeValue(sourceAttr.value);
    if(oldDecoded===null||s40EscapeText(oldDecoded)!==old)
      return fail(R.UNMAPPED);
    const raw=encodeValue(decoded,sourceAttr.quote);
    if(/[\t\r\n]/.test(decoded))return fail(R.VALUE);
    const start=row.start+sourceAttr.start,end=row.start+sourceAttr.end;
    if(originalText.slice(start,end)!==sourceAttr.value||ranges.has(start))
      return fail(R.OFFSET);
    ranges.add(start);
    sourceEdits.push({start,end,value:raw});
  }
  const candidateOriginal=substitute(originalText,sourceEdits);
  if(candidateOriginal===null)return fail(R.OFFSET);
  let canonical;
  try{canonical=inputXmlToCategorizedInputXml(candidateOriginal);}
  catch{return fail(R.CONVERTER);}
  // Either the user changed only visible mapped leaves (possibly also
  // their matching snapshots), or supplied the entire consistent S4.0
  // regenerated document. Arbitrary derived/missing/line edits are refused.
  if(!projectionOnlyEquivalent&&editedCategorized!==canonical)
    return fail(R.UNMAPPED);
  const canonicalElements=categorizedElementRanges(canonical);
  if(canonicalElements.length!==newElements.length)return fail(R.ROUNDTRIP);
  for(const change of changes){
    const echo=projectionLeaf(canonicalElements[change.index].text,change.entry);
    if(!echo||echo.error||echo.value!==change.new)return fail(R.ROUNDTRIP);
  }
  for(let i=0;i<newSnapshots.length;i++){
    // For mixed projection+snapshot edits, the hand-edited snapshot
    // must be exactly what the unchanged S4.0 converter would emit.
    if(newSnapshots[i]!==oldSnapshots[i]&&
       newSnapshots[i]!==snapshotBlock(canonicalElements[i].text))
      return fail(R.S40_MISMATCH);
  }
  // Only this pre-existing, independently tested byte writer can authorize
  // output: same UTF-8 old ranges, all fail-closed S4.0 grouping, S3,
  // regenerated S4.0 equality and final S4.1 binding remain compulsory.
  return patchOriginalFromCategorizedSlice1(originalText,baselineCategorized,
    canonical,options);
}

/**
 * UXML S4.2, slice 1: fail-closed original-byte attribute-value patcher.
 * Source authority: exact SHA + S4.1 one-to-one refs + shared scanner offsets.
 * No inverse converter, XML rebuild, geometry inference, or UI/application.
 */
import {inputXmlToCategorizedInputXml} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml} from './UxmlCategorizedInputXmlSchemaMapper.js';
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';

export const UXML_CATEGORIZED_PATCH_REFUSALS=Object.freeze({
  INPUT:'S42_INVALID_INPUT',
  HASH:'S42_ORIGINAL_SHA_MISMATCH',
  BASELINE:'S42_BASELINE_NOT_S40_EXACT',
  UNBOUND:'S42_UNBOUND_RECORD',
  STRUCTURE:'S42_ELEMENT_ADDED_REMOVED_OR_MARKUP_EDITED',
  REORDER:'S42_ELEMENT_REORDERED',
  IDENTITY:'S42_RECORD_IDENTITY_EDITED',
  DERIVED:'S42_DERIVED_OR_LINE_PROJECTION_EDITED',
  EXTERNAL:'S42_SHARED_EXTERNAL_EDIT_REFUSED',
  UNITS:'S42_UNITS_EDIT_REFUSED',
  VALUE:'S42_ATTRIBUTE_VALUE_UNSAFE',
  OFFSET:'S42_SOURCE_OFFSET_NOT_EXACT',
  PARITY:'S42_PARITY_FAILED',
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
  const attrs=[],stack=[],masked=[];
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
      if(!match||stack.pop()!==match[1])return null;
      masked.push(tag);cursor=end;continue;
    }
    const match=tag.match(/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/);
    if(!match)return null;
    const name=match[1],selfClosing=/\/\s*>$/.test(tag),depth=stack.length;
    const attributeLimit=tag.length-(selfClosing?2:1);
    let pos=match[0].length,prefix=0;
    while(pos<attributeLimit){
      if(!tag.slice(pos,attributeLimit).trim())break;
      const m=tag.slice(pos,attributeLimit).match(/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*(["'])([^"']*)\2/);
      // Quote values may contain the other quote; use an explicitly matched
      // delimiter, not the broad [^"'] class.
      const robust=tag.slice(pos,attributeLimit).match(/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/);
      if(!robust)return null;
      const token=robust[0],attrName=robust[1],quot=token.match(/(["'])/)?.[1];
      const value=robust[3]??robust[4]??'';
      const prefixBeforeValue=token.slice(0,token.indexOf(quot)+1);
      const valueStart=pos+prefixBeforeValue.length,valueEnd=valueStart+value.length;
      masked.push(tag.slice(prefix,valueStart),'\u0001');
      attrs.push({name:attrName,tagName:name,depth,quote:quot,
        value,start:open+valueStart,end:open+valueEnd});
      prefix=valueEnd;
      pos+=token.length;
    }
    masked.push(tag.slice(prefix));
    if(!selfClosing)stack.push(name);
    cursor=end;
  }
  if(stack.length)return null;
  return {masked:masked.join(''),attrs};
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
function sharedExternal(rows,tag,edited){
  if(!externalTags.has(tag))return false;
  const attrs=edited.tagName+':'+edited.name;
  // Never write a globally harvested stanza without a concrete node-owned
  // identity, nor one whose owning node is carried by multiple source rows.
  const nodeAttr=/\b(?:NODE|NODE_NUM)\s*=\s*(["'])(.*?)\1/i;
  const row=rows[edited.rowIndex];
  const localTag=row.raw.match(new RegExp('<'+tag+'(?=[\\s/>])[^>]*>','gi'))||[];
  const own=localTag[edited.tagOrdinal]?.match(nodeAttr)?.[2];
  if(!own||!Number.isFinite(Number(own))||Math.abs(Number(own)+1.0101)<0.0001)return true;
  let count=0;
  for(const candidate of rows){
    const blocks=candidate.raw.match(new RegExp('<'+tag+'(?=[\\s/>])[^>]*>','gi'))||[];
    if(blocks.some(block=>block.match(nodeAttr)?.[2]===own))count++;
  }
  return count!==1;
}
function diffRows(oldRaw,newRaw,rowIndex,rows){
  const old=lexRow(oldRaw),next=lexRow(newRaw);
  if(!old||!next||old.masked!==next.masked||old.attrs.length!==next.attrs.length)
    return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
  const changes=[],tagOccurrences=new Map();
  for(let i=0;i<old.attrs.length;i++){
    const before=old.attrs[i],after=next.attrs[i];
    if(before.name!==after.name||before.tagName!==after.tagName||
       before.depth!==after.depth||before.quote!==after.quote)
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
    if(before.value===after.value)continue;
    if(before.depth>1)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
    if(before.depth===0&&identityFields.has(before.name.toUpperCase()))
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.IDENTITY};
    const oldValue=decodeValue(before.value),newValue=decodeValue(after.value);
    if(oldValue===null||newValue===null)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    const encoded=encodeValue(newValue,before.quote);
    if(after.value!==encoded)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    if(before.depth===1&&externalTags.has(before.tagName.toUpperCase())){
      // Resolve stanza ordinal from original lexical attribute list, stable
      // even when many same-name direct children exist within the row.
      const earlier=old.attrs.slice(0,i);
      const same=earlier.filter(a=>a.depth===1&&a.tagName===before.tagName&&a.name===before.name);
      const changed={rowIndex,tagName:before.tagName,name:before.name,tagOrdinal:same.length};
      if(sharedExternal(rows,before.tagName.toUpperCase(),changed))
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.EXTERNAL};
    }
    changes.push({start:before.start,end:before.end,oldRaw:before.value,newRaw:encoded,
      old:oldValue,new:newValue,field:before.tagName+'.'+before.name});
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
export async function patchOriginalFromCategorized(originalText,baselineCategorized,editedCategorized,options={}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  if(typeof originalText!=='string'||typeof baselineCategorized!=='string'||
     typeof editedCategorized!=='string'||!options||typeof options!=='object')
    return fail(R.INPUT);
  const originalBytes=utf8(originalText);
  const measured=await sha(originalBytes);
  if(!/^[a-f\d]{64}$/i.test(clean(options.fileSha256))||
     measured!==clean(options.fileSha256).toLowerCase())return fail(R.HASH);
  // MUTATION_GUARD_BASELINE: do not trust a stale or hand-edited baseline.
  if(baselineCategorized!==inputXmlToCategorizedInputXml(originalText))return fail(R.BASELINE);
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
    const diff=diffRows(source.raw,candidate,source.index,originalRows);
    if(diff.error)return fail(diff.error);
    for(const field of diff.changes){
      const charStart=source.start+field.start,charEnd=source.start+field.end;
      if(originalText.slice(charStart,charEnd)!==field.oldRaw)return fail(R.OFFSET);
      const byteStart=utf8(originalText.slice(0,charStart)).length;
      const byteEnd=utf8(originalText.slice(0,charEnd)).length;
      changes.push({recordKey:reference.recordKey,field:field.field,old:field.old,
        new:field.new,byteRange:{start:byteStart,end:byteEnd},
        oldRaw:field.oldRaw,newRaw:field.newRaw});
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
  const patchedHash=await sha(patchedBytes);
  let oldStrict,newStrict;
  try{
    oldStrict=mapCaesarInputXmlToUxmlStrict(originalText,{fileSha256:measured});
    newStrict=mapCaesarInputXmlToUxmlStrict(patched,{fileSha256:patchedHash});
  }catch{return fail(R.PARITY);}
  if(!equalArray(refKeys(oldStrict),refKeys(newStrict)))return fail(R.PARITY);
  // MUTATION_GUARD_PARITY_CONVERTER: an edited derived/line field is not
  // an authorized source edit. Compare the ENTIRE canonical S4.0 output.
  const regenerated=inputXmlToCategorizedInputXml(patched);
  if(regenerated!==editedCategorized)return fail(R.DERIVED);
  // MUTATION_GUARD_PARITY_S41: edited evidence must bind on patched bytes.
  const patchedBinding=await bind(editedCategorized,patched,patchedHash);
  if(!patchedBinding||!equalArray(refKeys(patchedBinding),refKeys(originalBinding)))
    return fail(R.PARITY);
  return {ok:true,bytes:patchedBytes,
    changes:changes.map(({recordKey,field,old,new:next,byteRange})=>
      ({recordKey,field,old,new:next,byteRange})),
    parity:'EQUAL'};
}

// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Slice1(deps){
  const {UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const inputXmlToCategorizedInputXml=(...a)=>deps.inputXmlToCategorizedInputXml(...a); const mapCategorizedInputXmlToUxml=(...a)=>deps.mapCategorizedInputXmlToUxml(...a); const mapCaesarInputXmlToUxmlStrict=(...a)=>deps.mapCaesarInputXmlToUxmlStrict(...a); const scanOriginalInputXmlStructure=(...a)=>deps.scanOriginalInputXmlStructure(...a); const fail=(...a)=>deps.fail(...a);
  const utf8=(...a)=>deps.utf8(...a); const sha=(...a)=>deps.sha(...a); const clean=(...a)=>deps.clean(...a); const refKeys=(...a)=>deps.refKeys(...a); const equalArray=(...a)=>deps.equalArray(...a);
  const s42StrictS3KeysEqual=(...a)=>deps.s42StrictS3KeysEqual(...a); const categorizedItems=(...a)=>deps.categorizedItems(...a); const lexRow=(...a)=>deps.lexRow(...a); const s40ExclusiveBlock=(...a)=>deps.s40ExclusiveBlock(...a); const diffRows=(...a)=>deps.diffRows(...a);
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
  return {bind,patchOriginalFromCategorizedSlice1};
}

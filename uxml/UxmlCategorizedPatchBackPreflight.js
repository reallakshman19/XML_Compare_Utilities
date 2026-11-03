// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Preflight(deps){
  const {S42_PROJECTION_MAP,UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const inputXmlToCategorizedInputXml=(...a)=>deps.inputXmlToCategorizedInputXml(...a); const mapCategorizedInputXmlToUxml=(...a)=>deps.mapCategorizedInputXmlToUxml(...a); const scanOriginalInputXmlStructure=(...a)=>deps.scanOriginalInputXmlStructure(...a); const categorizedElementRanges=(...a)=>deps.categorizedElementRanges(...a); const projectionLeaf=(...a)=>deps.projectionLeaf(...a);
  const fail=(...a)=>deps.fail(...a); const utf8=(...a)=>deps.utf8(...a); const sha=(...a)=>deps.sha(...a); const clean=(...a)=>deps.clean(...a); const categorizedItems=(...a)=>deps.categorizedItems(...a);
  const decodeValue=(...a)=>deps.decodeValue(...a); const bind=(...a)=>deps.bind(...a); const patchOriginalFromCategorizedSlice1=(...a)=>deps.patchOriginalFromCategorizedSlice1(...a); const s40EscapeText=(...a)=>deps.s40EscapeText(...a); const snapshotBlock=(...a)=>deps.snapshotBlock(...a);
  const substitute=(...a)=>deps.substitute(...a); const b8Refusal=(...a)=>deps.b8Refusal(...a); const b8LineProjectionChanges=(...a)=>deps.b8LineProjectionChanges(...a); const b8ElementProjectionRefusals=(...a)=>deps.b8ElementProjectionRefusals(...a); const b8RemovedSnapshotAttributeRefusals=(...a)=>deps.b8RemovedSnapshotAttributeRefusals(...a);
  const b8UniqueRefusals=(...a)=>deps.b8UniqueRefusals(...a); const b8NumericReason=(...a)=>deps.b8NumericReason(...a); const b8UniqueInheritedRows=(...a)=>deps.b8UniqueInheritedRows(...a); const b8LegacySourceRefusals=(...a)=>deps.b8LegacySourceRefusals(...a); const b8ApplySourcePatch=(...a)=>deps.b8ApplySourcePatch(...a);
async function patchOriginalFromCategorizedImpl(originalText,baselineCategorized,editedCategorized,options={}){
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
  if(oldElements.length!==newElements.length){
    const affected=Math.min(oldElements.length,newElements.length)+1;
    return fail(R.STRUCTURE,[b8Refusal(R.STRUCTURE,{
      row:affected,viewRow:affected,tag:'Element',
      reason:'Categorized Element count changed from '+oldElements.length+
        ' to '+newElements.length+' (added '+Math.max(0,newElements.length-oldElements.length)+
        ', removed '+Math.max(0,oldElements.length-newElements.length)+')',
    })]);
  }
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
    if(legacy.ok===true){
      const inheritedRows=[];
      const errors=await b8LegacySourceRefusals(originalText,baselineCategorized,
        legacy,measured,inheritedRows);
      // A regenerated snapshot necessarily updates S4.0 derived views.
      // They are not independent user edits when slice-1 has already
      // verified the exact canonical original bytes. Only the physical
      // source carry audit may veto that validated success.
      if(errors.length)return fail(errors[0].code,b8UniqueRefusals(errors));
      return {...legacy,inheritedRows:b8UniqueInheritedRows(inheritedRows)};
    }
    if(legacy.code!==R.S40_MISMATCH){
      const all=b8UniqueRefusals([...b8RemovedSnapshotAttributeRefusals(
        oldElements,newElements),...preflight,...(legacy.refusals||[])]);
      // A legacy structural refusal may lack a source row: preserve its
      // named code and enrich the refusal details below (rather than []).
      return fail(legacy.code,all.length?all:
        [b8Refusal(legacy.code,{tag:'OriginalElement',
          reason:'Source snapshot edit was refused'})]);
    }
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
      const numeric=decoded===null?null:b8NumericReason(entry,decoded);
      if(numeric){
        errors.push(b8Refusal(R.NUMERIC,{row:i+1,tag:entry.tag,reason:numeric}));
        continue;
      }
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
    const legacy=await patchOriginalFromCategorizedSlice1(originalText,
      baselineCategorized,editedCategorized,options);
    if(legacy.ok===true){
      const inheritedRows=[],issues=await b8LegacySourceRefusals(
        originalText,baselineCategorized,legacy,measured,inheritedRows);
      if(issues.length)return fail(issues[0].code,issues);
      return {...legacy,inheritedRows:b8UniqueInheritedRows(inheritedRows)};
    }
    if(legacy.ok!==true){
      const removals=b8RemovedSnapshotAttributeRefusals(oldElements,newElements);
      if(removals.length)return fail(legacy.code,removals);
    }
    return legacy;
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
  return b8ApplySourcePatch({originalText,baselineCategorized,editedCategorized,
    options,measured,oldElements,newElements,changes,normalized,oldSnapshots,
    newSnapshots,line,errors,binding,sourceRows,oldCat,projectionOnlyEquivalent});
}
  return {patchOriginalFromCategorizedImpl};
}

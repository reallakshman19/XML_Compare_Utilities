// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Writer(deps){
  const {UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const inputXmlToCategorizedInputXml=(...a)=>deps.inputXmlToCategorizedInputXml(...a); const mapCategorizedInputXmlToUxml=(...a)=>deps.mapCategorizedInputXmlToUxml(...a); const mapCaesarInputXmlToUxmlStrict=(...a)=>deps.mapCaesarInputXmlToUxmlStrict(...a); const categorizedLineRanges=(...a)=>deps.categorizedLineRanges(...a); const categorizedElementRanges=(...a)=>deps.categorizedElementRanges(...a);
  const projectionLeaf=(...a)=>deps.projectionLeaf(...a); const fail=(...a)=>deps.fail(...a); const utf8=(...a)=>deps.utf8(...a); const sha=(...a)=>deps.sha(...a); const decodeValue=(...a)=>deps.decodeValue(...a);
  const encodeValue=(...a)=>deps.encodeValue(...a); const patchOriginalFromCategorizedSlice1=(...a)=>deps.patchOriginalFromCategorizedSlice1(...a); const s40EscapeText=(...a)=>deps.s40EscapeText(...a); const snapshotBlock=(...a)=>deps.snapshotBlock(...a); const substitute=(...a)=>deps.substitute(...a);
  const b8Refusal=(...a)=>deps.b8Refusal(...a); const b8UniqueRefusals=(...a)=>deps.b8UniqueRefusals(...a); const b8BoundAt=(...a)=>deps.b8BoundAt(...a); const b8LineHolders=(...a)=>deps.b8LineHolders(...a); const b8CarryRefusals=(...a)=>deps.b8CarryRefusals(...a);
  const b8UniqueInheritedRows=(...a)=>deps.b8UniqueInheritedRows(...a);
async function b8ApplySourcePatch({originalText,baselineCategorized,
  editedCategorized,options,measured,oldElements,newElements,changes,normalized,
  oldSnapshots,newSnapshots,line,errors,binding,sourceRows,oldCat,
  projectionOnlyEquivalent}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const sourceEdits=[],ranges=new Set(),typedWitnesses=new Set(),inheritedRows=[];
  const ctx={originalText,oldCat,binding,sourceRows,measured};
  const sourceAt=(index,tag,lineId=null)=>b8BoundAt(ctx,index,tag,lineId);
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
    if(entry.block==='SectionDimensionBlock'){
      const lineId=oldCat.items[index]?.identity?.[0];
      const inherited=b8CarryRefusals(ctx,entry,[item.row.index],
        {line:lineId,row:index+1,tag:entry.tag},
        {element:true,inheritedRows,newEffective:decoded});
      errors.push(...inherited);
      if(inherited.length)continue;
    }
    addSource(item,decoded,location);
  }
  for(const change of line.changes){
    const {line:lineId,entry,decoded,old}=change;
    const location={line:lineId,tag:entry.tag};
    const holders=b8LineHolders(ctx,lineId,entry,old);
    const inherited=b8CarryRefusals(ctx,entry,
      holders.active.map(item=>item.row.index),location,{inspectIncoming:true});
    errors.push(...holders.refusals,...inherited);
    if(!holders.refusals.length&&!inherited.length)
      for(const item of holders.active)addSource(item,decoded,location);
  }

  // N-2: a source-graph refusal must accompany other independently
  // offending Line/Element edits, not be hidden behind an early return.
  // Only candidate source mutations with individually proven byte offsets
  // are considered for this read-only strict S3 diagnostic.
    const candidateOriginal=substitute(originalText,sourceEdits);
  if(candidateOriginal===null)
    errors.push(b8Refusal(R.OFFSET,{tag:'Source',
      reason:'Source byte edit spans overlap or are not exact'}));
  if(candidateOriginal!==null){
    try{
      mapCaesarInputXmlToUxmlStrict(candidateOriginal,
        {fileSha256:await sha(utf8(candidateOriginal))});
    }catch(error){
      const graph=/DELTA_(?:GRAPH|PATH).*CONFLICT|ANCHORED.*CONFLICT|COORDINATE.*CONFLICT/i
        .test(String(error?.message||error));
      const code=graph?R.GRAPH:R.PARITY,reason=String(error?.message||error).split(':')[0];
      const locations=changes.filter(x=>x.entry.tag.startsWith('DELTA_')).map(x=>
        b8Refusal(code,{row:x.index+1,tag:x.entry.tag,reason}));
      errors.push(...(locations.length?locations:[b8Refusal(code,
        {tag:'Source',reason:'Strict S3 candidate refusal: '+reason})]));
    }
  }
  if(errors.length)return fail(errors[0].code,b8UniqueRefusals(errors));
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
    return {...authoritativeResult,inheritedRows:b8UniqueInheritedRows(inheritedRows),
      changes:authoritativeResult.changes.map(x=>({
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
  return {b8ApplySourcePatch};
}

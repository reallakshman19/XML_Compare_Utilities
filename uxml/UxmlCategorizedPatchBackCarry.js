// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Carry(deps){
  const {s40,S42_PROJECTION_MAP,S42_LINE_FIELDS,UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const scanOriginalInputXmlStructure=(...a)=>deps.scanOriginalInputXmlStructure(...a); const clean=(...a)=>deps.clean(...a); const categorizedItems=(...a)=>deps.categorizedItems(...a); const decodeValue=(...a)=>deps.decodeValue(...a); const bind=(...a)=>deps.bind(...a);
  const s40EscapeText=(...a)=>deps.s40EscapeText(...a); const sourceRootAttribute=(...a)=>deps.sourceRootAttribute(...a); const b8Refusal=(...a)=>deps.b8Refusal(...a); const b8UniqueRefusals=(...a)=>deps.b8UniqueRefusals(...a);
function b8ClassificationProbe(raw){
  const value=decodeValue(raw);
  if(value===null)return null;
  return clean(value)!==''&&Number.isFinite(Number(value))
    ?String(Number(value)+1):'B8_CHECK_VALUE';
}

// R2: one physical/source-holder implementation for writer AND UI classifier.
// Missing/-1.0101 attributes inherit the previous meaningful physical value
// even when the Categorized S4.0 projection has no visible section leaf.
const b8PlainNumericSuggestion=value=>{
  const number=Number(value);
  return Number.isFinite(number)&&!s40.isUnset(value)
    ?'; type '+String(number):'';
};
const b8NumericField=entry=>entry.block==='RouteGeometryBlock'||
  entry.block==='SectionDimensionBlock'||entry.block==='ProcessBlock'||
  (entry.block==='MaterialBlock'&&!['MATERIAL_NAME','SEAM_WELD'].includes(entry.tag));
const b8NumericReason=(entry,value)=>
  b8NumericField(entry)&&
    (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)||
     !Number.isFinite(Number(value))||s40.isUnset(value))
      ?'Numeric field requires an exact finite decimal without whitespace, exponent or sentinel'+
        b8PlainNumericSuggestion(value)
      :null;
function b8BoundAt(ctx,index,tag,lineId=null){
  const ref=ctx.binding.components[index]?.sourceRefs?.[0];
  const row=ctx.sourceRows[ref?.elementIndex];
  if(!ref||ref.format!=='INPUT_XML'||ref.fileSha256!==ctx.measured||
     !row||row.index!==ref.elementIndex||
     ctx.originalText.slice(row.start,row.start+row.raw.length)!==row.raw||
     (lineId!==null&&ctx.oldCat.items[index]?.identity?.[0]!==lineId))
    return null;
  return {ref,row,attr:sourceRootAttribute(row,tag)};
}
function b8PhysicalLines(ctx){
  const map=new Map();
  for(let i=0;i<ctx.binding.components.length;i++){
    const physical=ctx.binding.components[i]?.sourceRefs?.[0]?.elementIndex;
    if(Number.isInteger(physical))
      map.set(physical,ctx.oldCat.items[i]?.identity?.[0]);
  }
  return map;
}
function b8LineHolders(ctx,lineId,entry,old){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const location={line:lineId,tag:entry.tag},active=[],refusals=[];
  const owners=ctx.oldCat.items.map((item,i)=>item.identity[0]===lineId?i:-1)
    .filter(i=>i>=0);
  if(!owners.length)
    refusals.push(b8Refusal(R.UNBOUND,{...location,reason:'No records bound to Line'}));
  for(const index of owners){
    const item=b8BoundAt(ctx,index,entry.attribute,lineId);
    if(!item){
      refusals.push(b8Refusal(R.UNBOUND,{...location,
        reason:'A Line source row has no unique S4.1 physical binding'}));
      continue;
    }
    if(!item.attr)continue;
    const decodedOld=decodeValue(item.attr.value);
    if(decodedOld===null){
      refusals.push(b8Refusal(R.LINE_DERIVED,{...location,
        reason:'A source attribute cannot be decoded exactly'}));
      continue;
    }
    if(s40.isUnset(decodedOld))continue; // -1.0101 or empty carry-forward
    if(s40EscapeText(decodedOld)!==old){
      const formatOnly=Number.isFinite(Number(decodedOld))&&
        Number.isFinite(Number(decodeValue(old)))&&
        Number(decodedOld)===Number(decodeValue(old));
      refusals.push(b8Refusal(R.LINE_DERIVED,{...location,
        reason:formatOnly
          ?'Explicit holders use different source formats (e.g. 5.0 vs 5); exact text differs'
          :'Explicit source records disagree with the first line value'}));
      continue;
    }
    active.push(item);
  }
  if(!active.length)
    refusals.push(b8Refusal(R.OMITTED,{...location,
      reason:'No explicit non-sentinel source value to patch'}));
  return {active,refusals};
}
function b8CarryRefusals(ctx,entry,holderRows,location,
  {element=false,inspectIncoming=false,inheritedRows=null,newEffective=null}={}){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const lineId=location.line,tag=entry.attribute,refusals=[];
  const physicalLine=b8PhysicalLines(ctx);
  // N-1: a visible Line value can hide earlier sentinels in that same Line,
  // fed by a different Line before its first meaningful local holder.
  if(inspectIncoming){
    let previous=null;
    for(let index=0;index<ctx.sourceRows.length;index++){
      const attr=sourceRootAttribute(ctx.sourceRows[index],tag);
      const rawValue=attr?decodeValue(attr.value):'';
      const current=physicalLine.get(index);
      if(attr&&rawValue===null){
        refusals.push(b8Refusal(R.UNBOUND,{...location,row:index+1,fileRow:index+1,
          reason:'Physical source attribute cannot be decoded'}));
        continue;
      }
      if(attr&&!s40.isUnset(rawValue)){previous={index,line:current};continue;}
      if(current===lineId&&previous&&previous.line!==lineId){
        refusals.push(b8Refusal(R.CROSS_LINE,{...location,row:index+1,fileRow:index+1,
          reason:'Line '+lineId+' inherits '+tag+' from earlier different Line '+
            previous.line+' at physical row '+(index+1)}));
      }
    }
  }
  for(const ownerRow of holderRows){
    const ownerAttr=sourceRootAttribute(ctx.sourceRows[ownerRow],tag);
    const oldEffective=ownerAttr?decodeValue(ownerAttr.value):null;
    for(let physical=ownerRow+1;physical<ctx.sourceRows.length;physical++){
      const following=sourceRootAttribute(ctx.sourceRows[physical],tag);
      if(following){
        const rawValue=decodeValue(following.value);
        if(rawValue===null){
          refusals.push(b8Refusal(R.UNBOUND,{...location,row:physical+1,fileRow:physical+1,
            reason:'Downstream carry-forward source value cannot be decoded'}));
          break;
        }
        if(!s40.isUnset(rawValue))break; // a new explicit holder ends this chain
      }
      const downstream=physicalLine.get(physical);
      if(!downstream){
        refusals.push(b8Refusal(R.UNBOUND,{...location,row:physical+1,fileRow:physical+1,
          reason:'Downstream physical Line is not uniquely source-bound'}));
        break;
      }
      if(downstream!==lineId){
        refusals.push(b8Refusal(R.CROSS_LINE,{...location,row:physical+1,fileRow:physical+1,
          reason:'Changing '+lineId+' would carry '+tag+
            ' into different Line '+downstream+' at physical row '+(physical+1)}));
        break;
      }
      // Same-Line inherited section values are intentional CAESAR II
      // "change this run" semantics. Source bytes for the follower remain
      // unchanged; report the *effective* value transition separately.
      if(element&&inheritedRows){
        if(oldEffective===null||newEffective===null){
          refusals.push(b8Refusal(R.UNBOUND,{...location,row:physical+1,fileRow:physical+1,
            reason:'Inherited section effective value is not source-proven'}));
        }else if(oldEffective!==newEffective){
          inheritedRows.push({row:physical+1,fileRow:physical+1,tag:entry.tag,
            oldEffective,newEffective});
        }
      }
    }
  }
  return b8UniqueRefusals(refusals);
}
function b8UniqueInheritedRows(items){
  const seen=new Map();
  for(const item of items){
    const key=item.row+'\u0000'+item.tag;
    if(seen.has(key)){
      const old=seen.get(key);
      if(old.oldEffective!==item.oldEffective||old.newEffective!==item.newEffective)
        throw Error('Conflicting inherited row evidence: '+key);
    }else seen.set(key,item);
  }
  return [...seen.values()].sort((a,b)=>a.row-b.row||a.tag.localeCompare(b.tag));
}

// The pre-existing slice-1 snapshot route can return a byte-equal, canonical
// original that still changes a hidden carried section value. Reuse precisely
// the same physical audit as projection edits before releasing those bytes.
async function b8LegacySourceRefusals(originalText,baselineCategorized,legacy,measured,
  inheritedRows=[]){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS;
  if(!legacy?.ok||!Array.isArray(legacy.changes))return [];
  const oldCat=categorizedItems(baselineCategorized);
  const sourceRows=scanOriginalInputXmlStructure(originalText);
  const binding=await bind(baselineCategorized,originalText,measured);
  if(!oldCat||!sourceRows||!binding)
    return [b8Refusal(R.UNBOUND,{tag:'Source',
      reason:'Canonical snapshot lacks strict physical source binding'})];
  const ctx={originalText,oldCat,sourceRows,binding,measured},refusals=[];
  const refs=new Map(binding.components.map((x,i)=>[x.sourceRefs?.[0]?.recordKey,i]));
  for(const change of legacy.changes){
    if(!change.field?.startsWith('PIPINGELEMENT.'))continue;
    const tag=change.field.slice('PIPINGELEMENT.'.length);
    const entry=S42_PROJECTION_MAP.find(x=>x.tag===tag)||
      S42_LINE_FIELDS.find(x=>x.tag===tag);
    if(!entry)continue;
    const index=refs.get(change.recordKey);
    if(!Number.isInteger(index)){
      refusals.push(b8Refusal(R.UNBOUND,{tag,reason:'Snapshot row has no bound recordKey'}));
      continue;
    }
    const ref=binding.components[index].sourceRefs[0];
    const line=oldCat.items[index]?.identity?.[0];
    const location={line,row:index+1,tag};
    const numeric=b8NumericReason(entry,change.new);
    if(numeric)refusals.push(b8Refusal(R.NUMERIC,{...location,reason:numeric}));
    if(entry.block==='SectionDimensionBlock'){
      refusals.push(...b8CarryRefusals(ctx,entry,[ref.elementIndex],
        location,{element:true,inheritedRows,newEffective:change.new}));
    }else if(S42_LINE_FIELDS.some(x=>x.tag===tag)){
      refusals.push(...b8CarryRefusals(ctx,entry,[ref.elementIndex],
        location,{inspectIncoming:true}));
    }
  }
  return b8UniqueRefusals(refusals);
}
  return {b8ClassificationProbe,b8PlainNumericSuggestion,b8NumericField,b8NumericReason,b8BoundAt,b8PhysicalLines,b8LineHolders,b8CarryRefusals,b8UniqueInheritedRows,b8LegacySourceRefusals};
}

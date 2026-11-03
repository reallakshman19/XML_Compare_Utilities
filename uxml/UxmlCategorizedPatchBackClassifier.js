// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Classifier(deps){
  const {S42_PROJECTION_MAP,S42_LINE_FIELDS,UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const inputXmlToCategorizedInputXml=(...a)=>deps.inputXmlToCategorizedInputXml(...a); const mapCaesarInputXmlToUxmlStrict=(...a)=>deps.mapCaesarInputXmlToUxmlStrict(...a); const scanOriginalInputXmlStructure=(...a)=>deps.scanOriginalInputXmlStructure(...a); const categorizedLineRanges=(...a)=>deps.categorizedLineRanges(...a); const categorizedElementRanges=(...a)=>deps.categorizedElementRanges(...a);
  const projectionLeaf=(...a)=>deps.projectionLeaf(...a); const utf8=(...a)=>deps.utf8(...a); const sha=(...a)=>deps.sha(...a); const clean=(...a)=>deps.clean(...a); const categorizedItems=(...a)=>deps.categorizedItems(...a);
  const decodeValue=(...a)=>deps.decodeValue(...a); const encodeValue=(...a)=>deps.encodeValue(...a); const bind=(...a)=>deps.bind(...a); const s40EscapeText=(...a)=>deps.s40EscapeText(...a); const sourceRootAttribute=(...a)=>deps.sourceRootAttribute(...a);
  const b8Refusal=(...a)=>deps.b8Refusal(...a); const b8ClassificationProbe=(...a)=>deps.b8ClassificationProbe(...a); const b8NumericReason=(...a)=>deps.b8NumericReason(...a); const b8LineHolders=(...a)=>deps.b8LineHolders(...a); const b8CarryRefusals=(...a)=>deps.b8CarryRefusals(...a);
async function classifyCategorizedEditableFields(originalText,baselineCategorized,
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
  const choices=[],R=UXML_CATEGORIZED_PATCH_REFUSALS;
  const ctx={originalText,oldCat:originalItems,binding,sourceRows,measured};
  for(const [lineIndex,line] of categorizedLineRanges(baselineCategorized).entries()){
    for(const entry of S42_LINE_FIELDS){
      const leaf=projectionLeaf(line.text,entry);
      if(!leaf||leaf.error)continue;
      const probe=b8ClassificationProbe(leaf.value);
      const holders=b8LineHolders(ctx,line.id,entry,leaf.value);
      const carry=b8CarryRefusals(ctx,entry,
        holders.active.map(item=>item.row.index),{line:line.id,tag:entry.tag},
        {inspectIncoming:true});
      const numeric=probe!==null?b8NumericReason(entry,probe):'Invalid probe';
      const errors=[...holders.refusals,...carry];
      if(numeric)errors.push(b8Refusal(R.NUMERIC,{line:line.id,tag:entry.tag,
        reason:numeric}));
      choices.push({key:'L:'+lineIndex+':'+entry.tag,
        editable:errors.length===0,code:errors[0]?.code||'',
        reason:errors[0]?.reason||'',probeValue:probe});
    }
    if(/<AllowableStressBlock>/.test(line.text))
      choices.push({key:'R:'+lineIndex+':ALLOWABLESTRESS',editable:false,
        code:R.GLOBAL,reason:'Shared global AllowableStress has no unique Line source owner'});
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
      let outcome={editable:exact&&probe!==null,code:exact?'':R.OMITTED,
        reason:exact?'':'No original attribute with the exact source echo'};
      if(outcome.editable){
        const numeric=b8NumericReason(entry,probe);
        if(numeric)outcome={editable:false,code:R.NUMERIC,reason:numeric};
      }
      if(outcome.editable&&entry.block==='SectionDimensionBlock'){
        const lineId=originalItems.items[index]?.identity?.[0];
        const carry=b8CarryRefusals(ctx,entry,[row.index],
          {line:lineId,row:index+1,tag:entry.tag},{element:true});
        if(carry.length)
          outcome={editable:false,code:carry[0].code,reason:carry[0].reason};
      }
      // Graph-linked deltas are classified by the SAME strict S3 graph
      // reader used by patch-back. Full S4.2 patch+S4.1 parity remains the
      // authority at Check; do not replay the full writer for every picker
      // item (hundreds of deltas would block the browser load).
      if(outcome.editable&&entry.tag.startsWith('DELTA_')){
        const start=row.start+attr.start,end=row.start+attr.end;
        const candidate=originalText.slice(0,start)+encodeValue(probe,attr.quote)+
          originalText.slice(end);
        try{
          mapCaesarInputXmlToUxmlStrict(candidate,
            {fileSha256:await sha(utf8(candidate))});
        }catch(error){
          const code=/DELTA_(?:GRAPH|PATH).*CONFLICT|ANCHORED.*CONFLICT|COORDINATE.*CONFLICT/i
            .test(String(error?.message||error))
            ?UXML_CATEGORIZED_PATCH_REFUSALS.GRAPH
            :UXML_CATEGORIZED_PATCH_REFUSALS.PARITY;
          outcome={editable:false,code,reason:String(error?.message||error).split(':')[0]};
        }
      }
      choices.push({key:'E:'+index+':'+entry.tag,...outcome,probeValue:probe});
    }
  }
  return {ok:true,choices};
}
  return {classifyCategorizedEditableFields};
}

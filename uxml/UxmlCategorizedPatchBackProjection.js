// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8Projection(deps){
  const {s40,S42_PROJECTION_MAP,S42_LINE_FIELDS,UXML_CATEGORIZED_PATCH_REFUSALS}=deps;
  const categorizedLineRanges=(...a)=>deps.categorizedLineRanges(...a); const projectionLeaf=(...a)=>deps.projectionLeaf(...a); const lexRow=(...a)=>deps.lexRow(...a); const decodeValue=(...a)=>deps.decodeValue(...a); const b8NumericReason=(...a)=>deps.b8NumericReason(...a);
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
function b8Refusal(code,{line=null,row=null,viewRow=null,fileRow=null,tag='UNKNOWN',reason=''}={}){
  return {code,line,row,viewRow,fileRow,tag,reason};
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
      const numeric=decoded===null?null:b8NumericReason(entry,decoded);
      if(numeric){
        refusals.push(b8Refusal(R.NUMERIC,{line,tag:entry.tag,reason:numeric}));
        continue;
      }
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
// Diagnostics only: snapshot-source attribute removal is a forbidden
// structural edit. Preserve slice-1's authority, but name the physical
// Element row and exact removed root attribute in refusals[].
function b8RemovedSnapshotAttributeRefusals(before,after){
  const R=UXML_CATEGORIZED_PATCH_REFUSALS,errors=[];
  const names=snapshot=>{
    const root=String(snapshot||'').match(/<PIPINGELEMENT\b[^>]*>/i)?.[0]||'';
    return new Set([...root.matchAll(/\s([A-Za-z_][\w:.-]*)\s*=\s*(["'])(?:[\s\S]*?)\2/g)]
      .map(x=>x[1]));
  };
  for(let index=0;index<Math.min(before.length,after.length);index++){
    const oldNames=names(snapshotBlock(before[index].text));
    const newNames=names(snapshotBlock(after[index].text));
    for(const tag of oldNames)if(!newNames.has(tag)){
      errors.push(b8Refusal(R.STRUCTURE,{row:index+1,tag,
        reason:'OriginalElement snapshot removed existing PIPINGELEMENT.'+tag+
          ' attribute; structural removal is not a source-value edit'}));
    }
  }
  return b8UniqueRefusals(errors);
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
  return {s40EscapeText,snapshotBlock,substitute,sourceRootAttribute,b8Refusal,b8FlatLeaves,b8DifferentLeaves,b8Allowable,b8LineProjectionChanges,b8ElementProjectionRefusals,b8RemovedSnapshotAttributeRefusals,b8UniqueRefusals};
}

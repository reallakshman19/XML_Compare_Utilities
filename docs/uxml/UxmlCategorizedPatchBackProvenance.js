// B8-LEFTOVERS: diagnostic-only coordinates. No source write authority.
// Preserve legacy "row" while adding explicit Categorized view/file identity.
const cache=new Map();
const opening=raw=>String(raw||'').match(/^<PIPINGELEMENT\b[^>]*>/i)?.[0]||'';
function buildIndex(source,baseline,scan,parse){
  const rows=scan(source)||[],parts=parse(baseline)?.items||[];
  const physicalByOpening=new Map(),byView=new Map(),byFile=new Map();
  const firstLine=new Map(),used=new Set();
  rows.forEach((row,i)=>{
    const key=opening(row.raw),matches=physicalByOpening.get(key)||[];
    matches.push(i);
    physicalByOpening.set(key,matches);
  });
  parts.forEach((item,i)=>{
    const key=opening(item.snapshot);
    const candidates=(physicalByOpening.get(key)||[]).filter(physical=>
      !used.has(physical)&&item.snapshot.startsWith(rows[physical].raw));
    // Fail closed on ambiguous repeated physical stanzas; the writer's
    // original S4.1 binding is still authoritative and may refuse them.
    if(candidates.length!==1)return;
    const physical=candidates[0],line=item.identity[0],viewRow=i+1,fileRow=physical+1;
    used.add(physical);
    const coordinate={line,viewRow,fileRow};
    byView.set(viewRow,coordinate);
    byFile.set(fileRow,coordinate);
    if(!firstLine.has(line))firstLine.set(line,coordinate);
  });
  return {byView,byFile,firstLine,viewCount:parts.length,fileCount:rows.length};
}
function getIndex(source,baseline,scan,parse){
  const previous=cache.get(source);
  if(previous?.baseline===baseline)return previous.index;
  let index;
  try{index=buildIndex(source,baseline,scan,parse);}
  catch{index={byView:new Map(),byFile:new Map(),firstLine:new Map()};}
  if(cache.size>=4)cache.delete(cache.keys().next().value);
  cache.set(source,{baseline,index});
  return index;
}
function annotateRefusal(x,index){
  const line=x.line??null,row=Number.isInteger(x.row)?x.row:null;
  const explicitView=Number.isInteger(x.viewRow)?x.viewRow:null;
  const explicitFile=Number.isInteger(x.fileRow)?x.fileRow:null;
  // Physical carry refusals explicitly carry fileRow; others historically
  // use view-row, even when a Line is also supplied.
  const hint=explicitFile!==null?index.byFile.get(explicitFile):
    index.byView.get(explicitView??row);
  const lineHint=line!==null?index.firstLine.get(line):null;
  return {...x,line:line??hint?.line??null,
    viewRow:explicitView??hint?.viewRow??lineHint?.viewRow??null,
    fileRow:explicitFile??hint?.fileRow??lineHint?.fileRow??null};
}
function annotateEffect(x,index){
  const fileRow=Number.isInteger(x.fileRow)?x.fileRow:
    Number.isInteger(x.row)?x.row:null;
  const hint=index.byFile.get(fileRow);
  return {...x,line:x.line??hint?.line??null,
    viewRow:x.viewRow??hint?.viewRow??null,fileRow};
}
function annotateChange(x,index){
  const ordinal=/^E(\d+):/.exec(String(x.recordKey||''));
  const fileRow=Number.isInteger(x.fileRow)?x.fileRow:
    ordinal?Number(ordinal[1])+1:null;
  const hint=index.byFile.get(fileRow);
  return {...x,line:x.line??hint?.line??null,
    viewRow:x.viewRow??hint?.viewRow??null,fileRow};
}
// This function does not change ok/code/parity/bytes or original source
// change membership/order; extra fields are presentation-only witnesses.
export function withPatchRowProvenance(result,source,baseline,{scan,parse}){
  if(!result||typeof source!=='string'||typeof baseline!=='string')return result;
  const index=getIndex(source,baseline,scan,parse);
  return {
    ...result,
    ...(Array.isArray(result.refusals)?{
      refusals:result.refusals.map(x=>annotateRefusal(x,index))}:{}),
    ...(Array.isArray(result.changes)?{
      changes:result.changes.map(x=>annotateChange(x,index))}:{}),
    ...(Array.isArray(result.inheritedRows)?{
      inheritedRows:result.inheritedRows.map(x=>annotateEffect(x,index))}:{}),
  };
}

/* VNext independent Node-number assignment engine.
 * NEVER guesses a node from its current name. Each successful output is a new copy.
 */
import { parseCii, scanLines } from './physical.js';
import { sha256 } from './writer.js';

export const NODAL_SCHEMA = 'CiiFnrVnext.NodalTransfer.v1';
const fail = code => { throw new Error(code); };
const span = (field) => field.byteStart + ':' + field.byteEnd;
const pretty = v => String(v ?? '').trim();
const byteString = str => Uint8Array.from(str, ch => ch.charCodeAt(0));
function writeAscii(output, at, str) {
  for (let i=0;i<str.length;i++) output[at+i] = str.charCodeAt(i);
}
function key(n) { return String(n); }
function detailsOf(parsed) {
  const ownerByPointer=new Map(), byWitness=new Map();
  for (const e of parsed.elements) {
    byWitness.set(e.witness,e);
    if(e.pointer) {
      if(!ownerByPointer.has(e.pointer))ownerByPointer.set(e.pointer,[]);
      ownerByPointer.get(e.pointer).push(e);
    }
  }
  const fieldsByPointer=new Map();
  for(const f of parsed.fields) {
    if(!fieldsByPointer.has(f.pointer))fieldsByPointer.set(f.pointer,{});
    fieldsByPointer.get(f.pointer)[f.fieldIdentity]=f;
  }
  const nodes=new Map(), nameNodes=new Map();
  for(const e of parsed.elements){
    for(const [side,n] of [['FROM',e.from],['TO',e.to]]){
      if(!nodes.has(key(n)))nodes.set(key(n),[]);
      const f=e.pointer ? fieldsByPointer.get(e.pointer)?.['NODENAME.'+side] : null;
      const orig=f?.before.trim() || '';
      nodes.get(key(n)).push({element:e,side,field:f,existingName:orig});
      if(orig){
        if(!nameNodes.has(orig))nameNodes.set(orig,new Set());
        nameNodes.get(orig).add(key(n));
      }
    }
  }
  return { nodes,nameNodes,ownerByPointer,byWitness };
}
export function parseNodalCsv(text) {
  const grid=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
    }else if(ch===','&&!quoted){row.push(value);value='';}
    else if((ch==='\r'||ch==='\n')&&!quoted){
      row.push(value);if(row.some(c=>c.trim()))grid.push(row);
      row=[];value='';if(ch==='\r'&&text[i+1]==='\n')i++;
    }else value+=ch;
  }
  if(quoted)fail('NODAL_CSV_UNCLOSED_QUOTE');
  row.push(value);if(row.some(c=>c.trim()))grid.push(row);
  const titles=(grid.shift()||[]).map(s=>s.trim().toLowerCase().replace(/\s*\(.*\)\s*$/,''));
  const find=titles.indexOf('find'),node=titles.indexOf('findnode'),name=titles.indexOf('replacename');
  if(find<0||node<0||name<0)fail('NODAL_CSV_HEADERS_FIND_FINDNODE_REPLACENAME_REQUIRED');
  return grid.map((r,i)=>({id:'N'+(i+1),findInfo:r[find]||'',findNode:(r[node]||'').trim(),replaceName:r[name]||''}));
}

export function planNodalTransfer(parsed, rows) {
  if(!parsed?.elements || !parsed?.fields || !Array.isArray(rows))fail('NODAL_PLAN_INPUT_INVALID');
  const {nodes,nameNodes,ownerByPointer}=detailsOf(parsed);
  const raw=rows.map((r,i)=>{
    const id=String(r.id??'N'+(i+1)),nodeText=pretty(r.findNode),name=pretty(r.replaceName),info=pretty(r.findInfo);
    const base={id,row:i+1,node:nodeText,requestedName:name,findInfo:info,
      status:'HELD',reason:'',audit:[],occurrences:0,createRecords:0,writeFields:0};
    if(!/^\d+$/.test(nodeText)||!Number.isSafeInteger(Number(nodeText)))
      return {...base,reason:'FINDNODE_NOT_NONNEGATIVE_INTEGER'};
    const node=key(Number(nodeText)), occurrences=nodes.get(node)||[];
    base.node=node;base.occurrences=occurrences.length;
    if(!occurrences.length)return {...base,reason:'FINDNODE_NOT_IN_TARGET0'};
    if(!name || name.length>25 || /[^\x20-\x7e]/.test(name))
      return {...base,reason:'REPLACENAME_INVALID_OR_EXCEEDS_25_CHARS'};
    if(occurrences.some(o=>o.element.pointer &&
        (ownerByPointer.get(o.element.pointer)||[]).length!==1))
      return {...base,reason:'SHARED_NODENAME_POINTER_NOT_SUPPORTED'};
    const originals=[...new Set(occurrences.map(o=>o.existingName).filter(Boolean))];
    const other=(nameNodes.get(name)||new Set());
    if([...other].some(n=>n!==node))return {...base,reason:'REPLACENAME_ALREADY_USED_BY_OTHER_NODE'};
    const changes=occurrences.filter(o=>o.existingName!==name);
    const newElems=new Set(changes.filter(o=>!o.element.pointer).map(o=>o.element.index));
    const mismatchedInfo=info && !originals.includes(info);
    return {...base,status:'READY',reason:changes.length?'PREVIEW':'ALREADY_NAMED',
      originalNames:originals,infoMismatch:!!mismatchedInfo,
      audit:occurrences.map(o=>({elementIndex:o.element.index,from:o.element.from,
        to:o.element.to,pointer:o.element.pointer,field:o.side,
        before:o.existingName,after:name,operation:o.element.pointer===0?
          'CREATE_NAME_RECORD_AND_POINTER':o.existingName===name?'UNCHANGED':
          o.existingName?'RENAME_EXISTING_FIELD':'FILL_BLANK_EXISTING_FIELD'})),
      createRecords:newElems.size,writeFields:changes.length};
  });
  const byNode=new Map(),byNewName=new Map();
  for(const entry of raw.filter(r=>r.status==='READY')){
    if(!byNode.has(entry.node))byNode.set(entry.node,[]);
    byNode.get(entry.node).push(entry);
    if(!byNewName.has(entry.requestedName))byNewName.set(entry.requestedName,[]);
    byNewName.get(entry.requestedName).push(entry);
  }
  const records=raw.map(entry=>{
    if(entry.status!=='READY')return entry;
    if(byNode.get(entry.node).some(other=>other.requestedName!==entry.requestedName))
      return {...entry,status:'HELD',reason:'DUPLICATE_NODE_WITH_COMPETING_NAMES'};
    if(byNode.get(entry.node).length>1)
      return {...entry,status:'HELD',reason:'REPEATED_NODE_ASSIGNMENT_REQUIRES_ONE_ROW'};
    if(byNewName.get(entry.requestedName).some(other=>other.node!==entry.node))
      return {...entry,status:'HELD',reason:'NEW_DUPLICATE_NAME_ACROSS_NODES'};
    return entry;
  });
  return {schema:NODAL_SCHEMA,rows:rows.map(r=>({...r})),records,
    counts:{rows:records.length,ready:records.filter(r=>r.status==='READY').length,
      held:records.filter(r=>r.status==='HELD').length,
      fields:records.filter(r=>r.status==='READY').reduce((n,r)=>n+r.writeFields,0),
      newRecords:records.filter(r=>r.status==='READY').reduce((n,r)=>n+r.createRecords,0)},
    diagnostics:records.filter(r=>r.status==='HELD').map(r=>({row:r.row,node:r.node,code:r.reason}))};
}

/* Build a new binary with only authorized fixed-width field and pointer changes.
 * Insert records before the next section; never reorder or reformat other lines.
 */
function makePostimage(original,parsed,selected) {
  const {nodes}=detailsOf(parsed), lines=scanLines(original);
  const marker=line=>/^\s*#\$\s*([^\s]+)/i.exec(line.text)?.[1]?.toUpperCase();
  const controlAt=lines.findIndex(l=>marker(l)==='CONTROL');
  const nameAt=lines.findIndex(l=>marker(l)==='NODENAME');
  if(controlAt<0||nameAt<0)fail('NODAL_SECTION_NOT_FOUND');
  const control=lines[controlAt+1];
  if(!control || control.end-control.start<54)fail('NODAL_CONTROL_WIDTH_INVALID');
  const nextSection=lines.findIndex((l,i)=>i>nameAt&&!!marker(l));
  if(nextSection<0)fail('NODAL_NAME_SECTION_NOT_TERMINATED');
  const insertion=lines[nextSection].start;
  const nameLines=lines.slice(nameAt+1,nextSection).filter(l=>l.text.trim());
  if(nameLines.length!==parsed.nonam)fail('NODAL_NAME_RECORD_COUNT_DRIFT');
  const term=(nameLines.length? original.subarray(nameLines.at(-1).end,nameLines.at(-1).next)
    : original.subarray(lines[nameAt].end,lines[nameAt].next));
  if(term.length!==1&&!(term.length===2&&term[0]===13&&term[1]===10))
    fail('NODAL_LINE_ENDING_UNSUPPORTED');
  const edits=new Map();
  const place=(start,end,str)=>{
    if(str.length!==end-start||/[^\x20-\x7e]/.test(str))fail('NODAL_PATCH_WIDTH_INVALID');
    const id=start+':'+end,previous=edits.get(id);
    if(previous && previous!==str)fail('NODAL_COLLIDING_PATCH');
    edits.set(id,str);
  };
  const elementNew=new Map();
  for(const record of selected){
    for(const o of nodes.get(record.node)||[]){
      if(o.existingName===record.requestedName)continue;
      if(o.element.pointer===0){
        if(!elementNew.has(o.element.index))elementNew.set(o.element.index,
          {element:o.element,from:'',to:''});
        const ent=elementNew.get(o.element.index);
        if(ent[o.side.toLowerCase()]&&ent[o.side.toLowerCase()]!==record.requestedName)
          fail('NODAL_NEW_RECORD_FIELD_CONFLICT');
        ent[o.side.toLowerCase()]=record.requestedName;
      }else {
        const field=o.field;
        if(!field||field.owners.length!==1)fail('NODAL_FIELD_NOT_UNIQUE');
        place(field.byteStart,field.byteEnd,record.requestedName.padEnd(field.before.length,' '));
      }
    }
  }
  const newNames=[...elementNew.values()].sort((a,b)=>a.element.index-b.element.index);
  const elementSection=lines.findIndex(l=>marker(l)==='ELEMENTS');
  if(elementSection<0)fail('NODAL_ELEMENTS_MISSING');
  const newRecordBytes=[];
  for(const [i,entry] of newNames.entries()){
    const pointer=parsed.nonam+i+1;
    const pline=lines[elementSection+1+entry.element.index*15+13];
    if(!pline || pline.end-pline.start<80 || Number(pline.text.slice(67,80).trim())!==0)
      fail('NODAL_EXPECTED_ZERO_POINTER_MISSING');
    const text=String(pointer).padStart(13,' ');
    if(text.length>13)fail('NODAL_POINTER_OVERFLOW');
    place(pline.start+67,pline.start+80,text);
    const value='  '+entry.from.padEnd(26,' ')+entry.to.padEnd(25,' ');
    if(value.length!==53)fail('NODAL_NAME_RECORD_WIDTH_INVALID');
    newRecordBytes.push(...byteString(value),...term);
  }
  if(newNames.length){
    const newCount=String(parsed.nonam+newNames.length).padStart(13,' ');
    if(newCount.length>13||Number(control.text.slice(41,54).trim())!==parsed.nonam)
      fail('NODAL_CONTROL_COUNT_DRIFT');
    place(control.start+41,control.start+54,newCount);
  }
  // Patch a copy of pre-insertion bytes at exact original offsets.
  const prefix=new Uint8Array(original);
  for(const [address,value] of edits){
    const [start,end]=address.split(':').map(Number);
    if(start<0||end>original.length||end<=start)fail('NODAL_PATCH_OUT_OF_BOUNDS');
    writeAscii(prefix,start,value);
  }
  const extra=Uint8Array.from(newRecordBytes);
  const output=new Uint8Array(original.length+extra.length);
  output.set(prefix.subarray(0,insertion));
  output.set(extra,insertion);
  output.set(prefix.subarray(insertion),insertion+extra.length);
  const post=parseCii(output);
  if(post.nonam!==parsed.nonam+newNames.length ||
    post.elements.length!==parsed.elements.length || post.version!==parsed.version ||
    JSON.stringify(post.sections)!==JSON.stringify(parsed.sections) ||
    post.elements.some((e,i)=>{
      const p=parsed.elements[i];
      return e.index!==p.index || e.from!==p.from || e.to!==p.to ||
        e.branch!==p.branch || e.pointer!==(elementNew.has(i)?
          parsed.nonam+newNames.findIndex(n=>n.element.index===i)+1:p.pointer);
    }))fail('NODAL_POSTIMAGE_STRUCTURE_MISMATCH');
  // Ensure every designated node resolves to the requested name in every incident field.
  const resultNodes=detailsOf(post).nodes;
  for(const s of selected){
    const named=resultNodes.get(s.node)||[];
    if(!named.length||named.some(o=>o.existingName!==s.requestedName))
      fail('NODAL_POSTIMAGE_NODE_NAME_INCOMPLETE');
  }
  return {bytes:output,insertedRecords:newNames.length,
    patchedFields:edits.size,insertedBytes:extra.length,
    originalLength:original.length,outputLength:output.length};
}

export async function validateNodalTransfer({targetBytes,originalHash,plan,approvedIds}) {
  if(!(targetBytes instanceof Uint8Array)||plan?.schema!==NODAL_SCHEMA||
    !Array.isArray(plan.rows)||!Array.isArray(approvedIds)||
    !/^[a-f0-9]{64}$/i.test(originalHash||''))fail('NODAL_VALIDATION_INPUT_INVALID');
  if(await sha256(targetBytes)!==originalHash)fail('NODAL_TARGET_HASH_STALE');
  const parsed=parseCii(targetBytes),recomputed=planNodalTransfer(parsed,plan.rows);
  if(JSON.stringify(recomputed.records)!==JSON.stringify(plan.records))
    fail('NODAL_PLAN_STALE_OR_TAMPERED');
  if(new Set(approvedIds).size!==approvedIds.length||!approvedIds.length)
    fail('NODAL_EXPLICIT_UNIQUE_APPROVAL_REQUIRED');
  const selected=approvedIds.map(id=>recomputed.records.find(r=>r.id===id));
  if(selected.some(r=>!r||r.status!=='READY'))fail('NODAL_APPROVED_ROW_NOT_READY');
  // Prevent duplicate logical names from partial selection (including names held in an unapproved row).
  const {nameNodes}=detailsOf(parsed);
  const targetNames=new Map();
  for(const r of selected){
    const old=targetNames.get(r.requestedName);
    if(old && old!==r.node)fail('NODAL_SELECTED_DUPLICATE_NAME');
    targetNames.set(r.requestedName,r.node);
    if([...(nameNodes.get(r.requestedName)||[])].some(node=>node!==r.node))
      fail('NODAL_SELECTED_NAME_ALREADY_ON_OTHER_NODE');
  }
  const output=makePostimage(targetBytes,parsed,selected);
  return {...output,originalHash,target1Hash:await sha256(output.bytes),
    audit:selected.map(s=>({row:s.row,id:s.id,findInfo:s.findInfo,findNode:s.node,
      replaceName:s.requestedName,previousNames:s.originalNames,infoMismatch:s.infoMismatch,
      occurrences:s.audit}))};
}

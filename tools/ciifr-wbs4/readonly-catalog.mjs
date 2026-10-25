/*
 * CIIFR WBS4 Oracle E0/E1: source-grounded read-only field catalogue.
 * Contract only: no proposal, mutation, write, or application import.
 * Physical slot layout: Hexagon CAESAR II Neutral File Basic/Auxiliary Element Data v14.
 * Never publish catalogue.elements, catalogue.rigids or customer identifiers.
 */
const FIELD_NAMES = Object.freeze([
  'FROM node','TO node','Delta X','Delta Y','Delta Z','Outside Diameter',
  'Wall Thickness','Insulation Thickness','Corrosion Allowance',
  ...Array.from({length:9},(_,i)=>`Expansion Coefficient / Temperature #${i+1}`),
  ...Array.from({length:9},(_,i)=>`Pressure #${i+1}`),
  'Cold Elastic Modulus','Poisson Ratio','Pipe Density','Insulation Density',
  'Fluid Density','Minus Mill Tolerance','Plus Mill Tolerance','Seam Weld',
  'Hydro Pressure',...Array.from({length:9},(_,i)=>`Hot Elastic Modulus #${i+1}`),
  'wL Factor','Orientation Angle To (FEATools)','Orientation Angle From (FEATools)',
  'Cladding Thickness','Cladding Density','Insulation and Cladding Weight/Length',
  'Refractory Thickness','Refractory Density'
]);
export const elementFieldNames = FIELD_NAMES;
export const pointerNames = Object.freeze([
  'BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM','WIND',
  'OFFSETS','ALLOWBLS','SIF&TEES','NODENAME','REDUCERS','FLANGES','EQUIPMNT'
]);

const fail = (code) => { throw Error(code); };
function linesOf(bytes) {
  if (!(bytes instanceof Uint8Array)) fail('WBS4_BYTES_REQUIRED');
  const out=[]; let start=0;
  for (let i=0;i<bytes.length;i++) {
    if (bytes[i]!==10 && bytes[i]!==13) continue;
    const end=i, width=bytes[i]===13 && bytes[i+1]===10 ? 2 : 1;
    out.push({start,end,text:String.fromCharCode(...bytes.subarray(start,end))});
    i+=width-1; start=i+1;
  }
  if (start<bytes.length) out.push({start,end:bytes.length,text:String.fromCharCode(...bytes.subarray(start))});
  return out;
}
const integer = (n,code) => Number.isSafeInteger(n) && n>=0 ? n : fail(code);
function numberSlot(line, start, code) {
  if (!line || line.text.length<start+13) fail(code+'_WIDTH');
  const token=line.text.slice(start,start+13);
  if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+\-]?\d+)?$/.test(token.trim())) fail(code+'_TOKEN');
  const value=Number(token.trim().replace(/[Dd]/g,'E'));
  if (!Number.isFinite(value)) fail(code+'_NONFINITE');
  return {byteStart:line.start+start,byteEnd:line.start+start+13,lexeme:token,value};
}
function fixedRow(line,count,code) {
  if (!line || line.text.length!==2+13*count || line.text.slice(0,2)!=='  ')
    fail(code+'_SHAPE');
  return Array.from({length:count},(_,j)=>numberSlot(line,2+13*j,code+'_FIELD_'+(j+1)));
}
function textRow(line,code) {
  if (!line || line.text.length<13) fail(code+'_SHORT');
  const raw=line.text.slice(7,12).trim();
  if (!/^\d+$/.test(raw)) fail(code+'_LENGTH');
  const n=Number(raw);
  if (!Number.isSafeInteger(n)||n>500 || line.text.length<13+n ||
      line.text.slice(13+n).trim()!=='') fail(code+'_LENGTH');
  return {byteStart:line.start+13,byteEnd:line.start+13+n,
    declaredLength:n,value:line.text.slice(13,13+n)};
}
function sectionsOf(bytes) {
  const map=new Map(); let section=null;
  for(const line of linesOf(bytes)){
    const m=/^\s*#\$\s*([^\s]+)\s*$/.exec(line.text);
    if(m){section=m[1].toUpperCase();if(map.has(section))fail('WBS4_DUPLICATE_SECTION');map.set(section,[]);}
    else if(section && line.text.trim()) map.get(section).push(line);
  }
  if(!['VERSION','CONTROL','ELEMENTS'].every(s=>map.has(s))) fail('WBS4_REQUIRED_SECTION');
  return map;
}
export function readOnlyCatalog(bytes) {
  const sections=sectionsOf(bytes), v=sections.get('VERSION')[0]?.text.trim().split(/\s+/).map(Number);
  if (v?.[1]!==14) fail('WBS4_V14_ONLY');
  const ctl=sections.get('CONTROL');
  const elementCount=integer(numberSlot(ctl[0],2,'WBS4_NUMELT').value,'WBS4_NUMELT');
  const nodeNameCount=integer(numberSlot(ctl[0],2+3*13,'WBS4_NONAM').value,'WBS4_NONAM');
  const rigidCount=integer(numberSlot(ctl[1],2+13,'WBS4_NORIG').value,'WBS4_NORIG');
  const rows=sections.get('ELEMENTS');
  if(rows.length!==elementCount*15) fail('WBS4_ELEMENT_CARDINALITY');
  if((sections.get('RIGID')||[]).length!==rigidCount) fail('WBS4_RIGID_CARDINALITY');
  if((sections.get('NODENAME')||[]).length!==nodeNameCount) fail('WBS4_NODENAME_CARDINALITY');
  if(FIELD_NAMES.length!==53 || pointerNames.length!==15) fail('WBS4_INTERNAL_CATALOGUE');
  const elements=[],ownerMap=new Map();
  for(let e=0;e<elementCount;e++){
    const row=rows.slice(e*15,(e+1)*15);
    const reals=[];
    for(let j=0;j<9;j++){
      const slots=fixedRow(row[j],j===8?5:6,'WBS4_REAL');
      for(const slot of slots)reals.push({ordinal:reals.length+1,name:FIELD_NAMES[reals.length],...slot});
    }
    const from=integer(reals[0].value,'WBS4_FROM_NODE'),to=integer(reals[1].value,'WBS4_TO_NODE');
    const elementName=textRow(row[9],'WBS4_ELEMENT_NAME'),branch=textRow(row[10],'WBS4_LINE_NUMBER');
    // Line Color/Visibility are metadata; no engineering field claims in E1.
    if(!row[11])fail('WBS4_DISPLAY_MISSING');
    const pointers=[];
    for(let j=0;j<3;j++){
      const slots=fixedRow(row[12+j],j===2?3:6,'WBS4_POINTER');
      for(const slot of slots){
        const index=pointers.length+1;
        pointers.push({ordinal:index,section:pointerNames[index-1],
          pointer:integer(slot.value,'WBS4_POINTER_NOT_INTEGER'),byteStart:slot.byteStart,byteEnd:slot.byteEnd});
      }
    }
    const rigidPointer=pointers[1].pointer,nodenamePointer=pointers[11].pointer;
    if(rigidPointer>rigidCount)fail('WBS4_RIGID_POINTER_RANGE');
    if(nodenamePointer>nodeNameCount)fail('WBS4_NODENAME_POINTER_RANGE');
    if(rigidPointer)ownerMap.set(rigidPointer,[...(ownerMap.get(rigidPointer)||[]),e]);
    elements.push({index:e,from,to,elementName,branch,reals,pointers,
      rigidPointer,nodenamePointer});
  }
  const rigids=(sections.get('RIGID')||[]).map((line,i)=>{
    const [weight,type]=fixedRow(line,2,'WBS4_RIGID');
    return {pointer:i+1,weight,type,owners:ownerMap.get(i+1)||[]};
  });
  return {version:14,byteLength:bytes.length,elementCount,nodeNameCount,rigidCount,elements,rigids,
    sectionCounts:Object.fromEntries([...sections].map(([key,v])=>[key,v.length]))};
}
// Public-safe counts ONLY. This function never returns element labels, node values,
// RIGID weight/type, private titles or physical field lexemes.
export function publicInventory(c) {
  return {version:c.version,byteLength:c.byteLength,
    elements:c.elementCount,realSlots:c.elementCount*53,
    nodenameRecords:c.nodeNameCount,rigidRecords:c.rigidCount,
    rigidAttachedElements:c.elements.filter(e=>e.rigidPointer!==0).length,
    rigidAbsentElements:c.elements.filter(e=>e.rigidPointer===0).length,
    rigidSharedRecords:c.rigids.filter(r=>r.owners.length>1).length,
    rigidUnreferencedRecords:c.rigids.filter(r=>r.owners.length===0).length};
}

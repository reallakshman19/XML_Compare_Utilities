/* CIIFR Property Transfer R0: V14 read-only physical index. Never writes CII bytes. */
import { parseCii, scanLines } from '../physical.js';

const KINDS = ['BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT',
  'UNIFORM','WIND','OFFSETS','ALLOWBLS','SIF&TEES','NODENAME',
  'REDUCERS','FLANGES','EQUIPMNT'];
const AUX_ORDER = ['BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT',
  'UNIFORM','WIND','OFFSETS','ALLOWBLS','SIF&TEES','IZUP','EQUIPMNT'];
const ROWS = { RIGID:1, RESTRANT:24, DISPLMNT:20, FORCMNT:20 };
function invalid(code) { throw new Error(code); }
function number(line,start,end,code) {
  if(!line || line.text.length<end) invalid(code+'_SHORT_CARD');
  const raw=line.text.slice(start,end).trim();
  if(!raw) return 0;
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/.test(raw))
    invalid(code+'_NOT_NUMBER');
  const n=Number(raw.replace(/[Dd]/g,'E'));
  if(!Number.isFinite(n)) invalid(code+'_NOT_FINITE');
  return n;
}
function integer(line,start,end,code) {
  const n=number(line,start,end,code);
  if(!Number.isSafeInteger(n)) invalid(code+'_NOT_INTEGER');
  return n;
}
function cards(lines) {
  const sections=new Map();
  let active=null;
  for(const line of lines) {
    if(/^\s*#\$/.test(line.text)) {
      if(!/^#\$ [A-Z0-9_&]+ *$/.test(line.text)) invalid('PROPERTY_NONCANONICAL_SECTION');
      active=line.text.slice(3).trim();
      if(sections.has(active)) invalid('PROPERTY_DUPLICATE_SECTION_'+active);
      sections.set(active,[]);
    } else if(active) {
      if(line.text.trim()) sections.get(active).push(line);
    } else if(line.text.trim()) invalid('PROPERTY_TEXT_BEFORE_VERSION');
  }
  if([...sections.keys()][0]!=='VERSION') invalid('PROPERTY_VERSION_NOT_FIRST');
  return sections;
}
function six(line,code,amount=6) {
  return Array.from({length:amount},(_,i)=>integer(line,2+13*i,15+13*i,code));
}
function countMap(control) {
  if(control.length<4) invalid('PROPERTY_CONTROL_TRUNCATED');
  const first=six(control[0],'CONTROL_FIRST');
  const aux=[...six(control[1],'CONTROL_AUX1'),
    ...six(control[2],'CONTROL_AUX2'),...six(control[3],'CONTROL_AUX3',1)];
  const counts=Object.fromEntries(AUX_ORDER.map((k,i)=>[k,aux[i]]));
  Object.assign(counts,{NUMELT:first[0],NUMNOZ:first[1],NOHGRS:first[2],
    NODENAME:first[3],REDUCERS:first[4],FLANGES:first[5]});
  if(counts.NUMELT<=0||Object.entries(counts).some(([k,n])=>k!=='IZUP'&&n<0))
    invalid('PROPERTY_CONTROL_COUNT_INVALID');
  if(counts.IZUP!==0 && counts.IZUP!==1) invalid('PROPERTY_CONTROL_IZUP_INVALID');
  return counts;
}
function elementPointers(cs) {
  const values=[...six(cs[12],'ELEMENT_PTR13'),...six(cs[13],'ELEMENT_PTR14'),
    ...six(cs[14],'ELEMENT_PTR15',3)];
  return Object.fromEntries(KINDS.map((k,i)=>[k,values[i]]));
}
function physicalField(line,start,end,identity) {
  if(!line || line.text.length<end) invalid('PROPERTY_FIELD_CARD_SHORT');
  const lexeme=line.text.slice(start,end);
  return {identity,lexeme,byteStart:line.start+start,byteEnd:line.start+end,
    typedNumber:number(line,start,end,identity)};
}
function dormantResidue(cs,owner,pointer,slot) {
  const tokens=cs.flatMap(c=>c.text.slice(2).match(/\S+/g)||[]);
  // Test zero lexically: numeric underflow must not hide nonzero residue.
  const zero=t=>/^[+-]?(?:0+(?:\.0*)?|\.0+)(?:[EeDd][+-]?\d+)?$/.test(t);
  if(tokens.every(zero)) return null;
  return {code:'PROPERTY_RESTRAINT_DORMANT_RESIDUE',classification:'UNKNOWN',
    family:'RESTRANT',ownerElement:owner.ordinal,pointer,slot:slot+1,
    byteStart:cs[0].start,byteEnd:cs[3].end,rawCards:cs.map(c=>c.text),
    detail:'Zero node/type/CNode with other payload; dormant-slot legality NOT_QUALIFIED. Bytes preserved.'};
}
export function indexCiiV14(input) {
  if(!(input instanceof Uint8Array)) invalid('PROPERTY_BYTES_REQUIRED');
  const source=parseCii(input);
  if(source.version!==14) invalid('PROPERTY_V14_ONLY');
  const lines=scanLines(input),sec=cards(lines);
  const counts=countMap(sec.get('CONTROL')||[]);
  const elm=sec.get('ELEMENTS')||[];
  if(elm.length!==counts.NUMELT*15 || source.elements.length!==counts.NUMELT)
    invalid('PROPERTY_NUMELT_MISMATCH');
  const byNode=new Map(),elements=[],used={},diagnostics=[];
  for(const family of Object.keys(ROWS)) used[family]=new Map();
  function add(node,entry) {
    if(!byNode.has(node)) byNode.set(node,{incidents:[],restraints:[],
      displacements:[],forces:[],rigids:[]});
    byNode.get(node).incidents.push(entry);
  }
  for(const e of source.elements) {
    if(e.from<0||e.to<0) invalid('PROPERTY_ELEMENT_ENDPOINT_NEGATIVE');
    // This inspector supports positive logical-node endpoints only. Zero may
    // have a vendor/profile meaning; holding it is not a vendor-invalid claim.
    if(e.from===0||e.to===0) invalid('PROPERTY_ELEMENT_ZERO_ENDPOINT_UNQUALIFIED');
    const cs=elm.slice(e.index*15,e.index*15+15);
    const p=elementPointers(cs);
    const item={ordinal:e.index+1,from:e.from,to:e.to,branch:e.branch,
      pointers:p,fields:[
        physicalField(cs[1],41,54,'TEMPERATURE_1_STORED'),
        physicalField(cs[3],2,15,'PRESSURE_1_STORED'),
        physicalField(cs[5],15,28,'FLUID_DENSITY_STORED')]};
    elements.push(item);
    for(const node of new Set([e.from,e.to])) add(node,item);
    for(const family of KINDS) {
      const n=p[family],count=counts[family];
      if(n<0||n>count) invalid('PROPERTY_POINTER_RANGE_'+family);
      if(!Object.hasOwn(ROWS,family)) continue;
      if(!n) continue;
      if(used[family].has(n)) invalid('PROPERTY_SHARED_POINTER_'+family);
      used[family].set(n,item);
    }
  }
  for(const family of KINDS.filter(k=>!Object.hasOwn(ROWS,k))) {
    if(counts[family]||(sec.get(family)||[]).length)
      diagnostics.push({code:'PROPERTY_AUX_CONTENT_UNQUALIFIED',classification:'UNKNOWN',
        family,count:counts[family],
        detail:'Pointer bounds checked; auxiliary content/cardinality/ownership NOT_QUALIFIED.'});
  }
  for(const family of Object.keys(ROWS)) {
    const linesFor=sec.get(family)||[],count=counts[family];
    if(linesFor.length!==count*ROWS[family])
      invalid('PROPERTY_AUX_CARDINALITY_'+family);
    if(used[family].size!==count) invalid('PROPERTY_ORPHAN_AUX_'+family);
  }
  const misc=sec.get('MISCEL_1')||[];
  const rrmatRows=Math.ceil(counts.NUMELT/6);
  if(misc.length<rrmatRows)
    invalid('PROPERTY_MISC_RRMAT_TRUNCATED');
  // FORTRAN 2X,6G13.6: material ID i belongs to ELEMENTS ordinal i.
  // Validate actual values, not merely the number of rows. Remaining MISC
  // groups (nozzle/hanger/execution) need separate semantic qualification.
  const materialIds=[];
  for(let i=0;i<counts.NUMELT;i++){
    const line=misc[Math.floor(i/6)],slot=i%6;
    const start=2+13*slot,end=start+13;
    if(!line || line.text.length<end) invalid('PROPERTY_MISC_RRMAT_FIELD_MISSING');
    const raw=line.text.slice(start,end).trim();
    if(!raw) invalid('PROPERTY_MISC_RRMAT_FIELD_MISSING');
    const id=integer(line,start,end,'PROPERTY_MISC_RRMAT');
    if(id<1||id>699) invalid('PROPERTY_MISC_RRMAT_ID_OUT_OF_RANGE');
    materialIds.push(id);
  }
  const rows=(family,n)=>sec.get(family).slice((n-1)*ROWS[family],n*ROWS[family]);
  for(const [p,owner] of used.RESTRANT) {
    const cs=rows('RESTRANT',p);
    for(let slot=0;slot<6;slot++){
      const c=cs.slice(slot*4,slot*4+4);
      const node=integer(c[0],2,15,'RESTRAINT_NODE');
      const type=integer(c[0],15,28,'RESTRAINT_TYPE');
      const cnode=integer(c[0],67,80,'RESTRAINT_CNODE');
      if(node<0 || cnode<0) invalid('PROPERTY_RESTRAINT_NODE_INVALID');
      if(node===0) {
        if(type!==0||cnode!==0) invalid('PROPERTY_RESTRAINT_EMPTY_SLOT_INCONSISTENT');
        const residue=dormantResidue(c,owner,p,slot);
        if(residue) diagnostics.push(residue);
        continue;
      }
      if(type<1||type>62) invalid('PROPERTY_RESTRAINT_TYPE_INVALID');
      const record={family:'RESTRANT',node,ownerElement:owner.ordinal,pointer:p,
        slot:slot+1,type,cnode,byteStart:c[0].start,byteEnd:c[3].end,
        semantics:'TYPE_AND_CNODE_ONLY;STIFFNESS_GAP_TAG_GUID_NOT_QUALIFIED'};
      if(!byNode.has(node)) byNode.set(node,{incidents:[],restraints:[],
        displacements:[],forces:[],rigids:[]});
      byNode.get(node).restraints.push(record);
    }
  }
  for(const [family,field] of [['DISPLMNT','displacements'],['FORCMNT','forces']]){
    for(const [p,owner] of used[family]){
      const cs=rows(family,p);
      for(let slot=0;slot<2;slot++){
        const first=cs[slot*10],node=integer(first,2,15,family+'_NODE');
        if(node<0) invalid('PROPERTY_'+family+'_NODE_INVALID');
        if(!node) continue;
        if(!byNode.has(node)) byNode.set(node,{incidents:[],restraints:[],
          displacements:[],forces:[],rigids:[]});
        byNode.get(node)[field].push({family,node,ownerElement:owner.ordinal,
          pointer:p,specification:slot+1,byteStart:first.start,
          semantics:'NODE_AND_RECORD_ONLY;VECTOR_CASE_NOT_QUALIFIED'});
      }
    }
  }
  for(const [p,e] of used.RIGID) {
    const line=rows('RIGID',p)[0];
    for(const node of new Set([e.from,e.to])){
      byNode.get(node).rigids.push({family:'RIGID',ownerElement:e.ordinal,
        pointer:p,weightLexeme:line.text.slice(2,15).trim(),
        typeLexeme:line.text.slice(15,28).trim(),
        semantics:'ELEMENT_OWNED;EFFECTIVE_RIGID_SEMANTICS_NOT_QUALIFIED'});
    }
  }
  return {version:14,bytesLength:input.length,counts,elements,byNode,diagnostics,
    miscRrmatRows:rrmatRows,materialIds,
    miscTotalRows:misc.length,
    qualification:{controlPrimaryCounts:'NONNEGATIVE_AND_IZUP_VALIDATED',
      endpointDomain:'POSITIVE_ONLY;ZERO_ENDPOINT_MEANING_NOT_QUALIFIED',
      pointerBounds:'ALL_ELEMENT_POINTERS_RANGE_CHECKED;NOT_CONTENT_QUALIFICATION',
      rrmat:'ALL_ELEMENT_IDS_PARSED_AND_RANGE_CHECKED',
      miscNozzles:'COUNTS_ONLY;VFLEX_CONTENT_NOT_QUALIFIED',
      miscHangers:'COUNTS_ONLY;HANGER_CONTENT_NOT_QUALIFIED',
      miscExecution:'NOT_QUALIFIED',
      process:'STORED_ONLY;EFFECTIVE_CASE_AND_UNIT_NOT_QUALIFIED'},
    readOnly:true};
}
export function normalizedNode(s) {
  if(!/^(0|[1-9]\d*)$/.test(String(s).trim())) invalid('PROPERTY_NODE_NOT_CANONICAL');
  const n=Number(String(s).trim());
  if(!Number.isSafeInteger(n)||n<=0) invalid('PROPERTY_NODE_INVALID');
  return n;
}

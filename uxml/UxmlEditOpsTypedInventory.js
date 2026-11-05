/**
 * UXML edit-ops v1: bounded, whole-document CAESAR InputXML node-carrier
 * inventory. No expansion of DTD, general entities, namespaces or network IO.
 * Source locations are ORIGINAL UTF-8 half-open byte spans.
 *
 * The S3 scanner is a structural admission witness, not this semantic parser.
 */
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {exactNodeId,xmlDecode,readInputXmlSourceField} from './UxmlInputXmlSourceFields.js';
export {exactNodeId,xmlDecode} from './UxmlInputXmlSourceFields.js';

export const NODE_REGISTRY_SCHEMA='uxml-inputxml-node-carriers/v1';
const utf8=new TextEncoder();
const NODE_FIELDS=Object.freeze({
  PIPINGELEMENT:new Set(['FROM_NODE','TO_NODE']),
  BEND:new Set(['NODE1','NODE2','NODE3']),
  SIF:new Set(['NODE','BRANCHNODE']),
  RESTRAINT:new Set(['NODE','CNODE']),
  RESTRANT:new Set(['NODE','CNODE']),
  HANGER:new Set(['NODE','CNODE']),
  DISPLACEMENTS:new Set(['NODE_NUM']),
});
const SENTINEL_FIELDS=new Set([
  'BEND@NODE1','BEND@NODE2','BEND@NODE3',
  'SIF@NODE','SIF@BRANCHNODE',
  'RESTRAINT@NODE','RESTRAINT@CNODE',
  'RESTRANT@NODE','RESTRANT@CNODE',
  'HANGER@NODE','HANGER@CNODE','DISPLACEMENTS@NODE_NUM',
]);
// Version-pinned CAESAR II 14.00 field whitelist. Hexagon CAESAR II
// v14 Input Export documentation is the semantic authority; field spellings
// are corroborated by public GREInputxml.xml and PLB314Inputxml.xml (v14.00).
// Every field not on this list or the explicit NODE_REF list is UNSUPPORTED.
const V14_NON_NODE=Object.freeze({
  "CAESARII": [
    "VERSION",
    "XML_TYPE"
  ],
  "PIPINGMODEL": [
    "ISSUE_NO",
    "JOBNAME",
    "NOHGRS",
    "NORTH_X",
    "NORTH_Y",
    "NORTH_Z",
    "NUMALLOW",
    "NUMBEND",
    "NUMELEOFF",
    "NUMELT",
    "NUMEXPJNT",
    "NUMFORCMNT",
    "NUMISECT",
    "NUMNOZ",
    "NUMREST",
    "NUMRIGID",
    "NUMUNFLOAD",
    "NUMWIND",
    "TIME"
  ],
  "PIPINGELEMENT": [
    "CLADDING_DEN",
    "CLADDING_THK",
    "CORR_ALLOW",
    "DELTA_X",
    "DELTA_Y",
    "DELTA_Z",
    "DIAMETER",
    "FLUID_DENSITY",
    "FROM_NAME",
    "FROM_X",
    "FROM_Y",
    "FROM_Z",
    "HOT_MOD1",
    "HOT_MOD2",
    "HOT_MOD3",
    "HOT_MOD4",
    "HOT_MOD5",
    "HOT_MOD6",
    "HOT_MOD7",
    "HOT_MOD8",
    "HOT_MOD9",
    "HYDRO_PRESSURE",
    "INSUL_CLAD_UNIT_WEIGHT",
    "INSUL_DENSITY",
    "INSUL_THICK",
    "LINE_ID",
    "MATERIAL_NAME",
    "MATERIAL_NUM",
    "MILL_TOL_MINUS",
    "MILL_TOL_PLUS",
    "MODULUS",
    "NAME",
    "PIPE_DENSITY",
    "POISSONS",
    "PRESSURE1",
    "PRESSURE2",
    "PRESSURE3",
    "PRESSURE4",
    "PRESSURE5",
    "PRESSURE6",
    "PRESSURE7",
    "PRESSURE8",
    "PRESSURE9",
    "REFRACTORY_DENSITY",
    "REFRACTORY_THK",
    "REF_NO",
    "SEAM_WELD",
    "TEMP_EXP_C1",
    "TEMP_EXP_C2",
    "TEMP_EXP_C3",
    "TEMP_EXP_C4",
    "TEMP_EXP_C5",
    "TEMP_EXP_C6",
    "TEMP_EXP_C7",
    "TEMP_EXP_C8",
    "TEMP_EXP_C9",
    "TO_NAME",
    "TO_X",
    "TO_Y",
    "TO_Z",
    "WALL_THICK"
  ],
  "RIGID": [
    "TYPE",
    "WEIGHT"
  ],
  "ALLOWABLESTRESS": [
    "ALLOWBL_STRESS_INDICATOR",
    "ALPHA_FAB",
    "ALPHA_GW",
    "ALPHA_H",
    "BURIED",
    "BURST_OPE",
    "BURST_TEST",
    "CHEMICAL_RES",
    "COLD_ALLOW",
    "COLLAPSE",
    "CURVE_RADIUS",
    "DCC",
    "DESIGN_FACTOR",
    "DESIGN_LT",
    "DF",
    "EFF",
    "EHB",
    "EXP_ALLOW",
    "FAC",
    "F_DSGN_FACTOR",
    "GAMMA_C",
    "HF",
    "HOOP_STRESS_FACTOR",
    "LCC",
    "MAT_LP",
    "MF",
    "PIPING_CODE",
    "PMAX",
    "PROPBUCK",
    "R",
    "SU",
    "SUPP_RQR",
    "SY",
    "YD",
    "Y_COEFF"
  ],
  "CASE": [
    "APP_P_OPE_ALL_REDUCTION",
    "BUTTWELDCYCLES",
    "BUTTWELDSTRESS",
    "CLASSFCYCLES",
    "CLASSFSTRESS",
    "CLASSGCYCLES",
    "CLASSGSTRESS",
    "CLASSWCYCLES",
    "CLASSWSTRESS",
    "CYC_RED_FACTOR",
    "FILLETWELDCYCLES",
    "FILLETWELDSTRESS",
    "HOT_ALLOW",
    "HOT_SU",
    "HOT_SY",
    "NUM",
    "T_DERATING"
  ],
  "BEND": [
    "ANGLE1",
    "ANGLE2",
    "ANGLE3",
    "FITTINGTHICKNESS",
    "KFACTOR",
    "NUM_MITER",
    "RADIUS",
    "TYPE"
  ],
  "RESTRAINT": [
    "FRIC_COEF",
    "GAP",
    "GUID",
    "NUM",
    "STIFFNESS",
    "TAG",
    "TYPE",
    "XCOSINE",
    "YCOSINE",
    "ZCOSINE"
  ],
  "UNITS": [],
  "LENGTH": [
    "FACTOR",
    "LABEL"
  ],
  "FORCE": [
    "FACTOR",
    "LABEL"
  ],
  "MASS-DYNAMICS": [
    "FACTOR",
    "LABEL"
  ],
  "MOMENT-INPUT": [
    "FACTOR",
    "LABEL"
  ],
  "MOMENT-OUTPUT": [
    "FACTOR",
    "LABEL"
  ],
  "STRESS": [
    "FACTOR",
    "LABEL"
  ],
  "TEMP": [
    "FACTOR",
    "LABEL"
  ],
  "PRESSURE": [
    "FACTOR",
    "LABEL"
  ],
  "EMOD": [
    "FACTOR",
    "LABEL"
  ],
  "PDENS": [
    "FACTOR",
    "LABEL"
  ],
  "IDENS": [
    "FACTOR",
    "LABEL"
  ],
  "FDENS": [
    "FACTOR",
    "LABEL"
  ],
  "TRANS_STIFF": [
    "FACTOR",
    "LABEL"
  ],
  "ROTL_STIFF": [
    "FACTOR",
    "LABEL"
  ],
  "UNIF_LOAD": [
    "FACTOR",
    "LABEL"
  ],
  "G_LOAD": [
    "FACTOR",
    "LABEL"
  ],
  "WIND_LOAD": [
    "FACTOR",
    "LABEL"
  ],
  "ELEVATION": [
    "FACTOR",
    "LABEL"
  ],
  "COMPOUND_LENGTH": [
    "FACTOR",
    "LABEL"
  ],
  "DIAMETER": [
    "FACTOR",
    "LABEL"
  ],
  "THICKNESS": [
    "FACTOR",
    "LABEL"
  ],
  "FLANGES": [
    "BOLT_AREA",
    "BOLT_CIRCLE_DIA",
    "CLASS_GRADE",
    "FLANGE_LOCATION",
    "GASKET_DIAMETER",
    "METHOD",
    "PRESSURE1",
    "PRESSURE10",
    "PRESSURE11",
    "PRESSURE12",
    "PRESSURE13",
    "PRESSURE14",
    "PRESSURE15",
    "PRESSURE16",
    "PRESSURE17",
    "PRESSURE18",
    "PRESSURE19",
    "PRESSURE2",
    "PRESSURE20",
    "PRESSURE21",
    "PRESSURE22",
    "PRESSURE23",
    "PRESSURE24",
    "PRESSURE3",
    "PRESSURE4",
    "PRESSURE5",
    "PRESSURE6",
    "PRESSURE7",
    "PRESSURE8",
    "PRESSURE9",
    "SY1",
    "SY2",
    "SY3",
    "SY4",
    "SY5",
    "SY6",
    "SY7",
    "SY8",
    "SY9",
    "SY_COLD",
    "TEMPERATURE1",
    "TEMPERATURE10",
    "TEMPERATURE11",
    "TEMPERATURE12",
    "TEMPERATURE13",
    "TEMPERATURE14",
    "TEMPERATURE15",
    "TEMPERATURE16",
    "TEMPERATURE17",
    "TEMPERATURE18",
    "TEMPERATURE19",
    "TEMPERATURE2",
    "TEMPERATURE20",
    "TEMPERATURE21",
    "TEMPERATURE22",
    "TEMPERATURE23",
    "TEMPERATURE24",
    "TEMPERATURE3",
    "TEMPERATURE4",
    "TEMPERATURE5",
    "TEMPERATURE6",
    "TEMPERATURE7",
    "TEMPERATURE8",
    "TEMPERATURE9"
  ],
  "SIF": [
    "B1",
    "B2",
    "CROTCH",
    "DELTA_MAX",
    "FILLET",
    "FTG_RO",
    "L1",
    "NC",
    "PAD_THK",
    "R2",
    "SIF_AXIAL",
    "SIF_IN",
    "SIF_NUM",
    "SIF_OUT",
    "SIF_PRESSURE",
    "SIF_TORSION",
    "STRESSINDEX_IA",
    "STRESSINDEX_IIN",
    "STRESSINDEX_IOUT",
    "STRESSINDEX_IPR",
    "STRESSINDEX_IT",
    "SUBTYPE",
    "THETA_N",
    "TN",
    "TPRIME",
    "TYPE",
    "WELD_D",
    "WELD_ID",
    "Y"
  ],
  "RESTRANT": [
    "FRIC_COEF",
    "GAP",
    "GUID",
    "NUM",
    "STIFFNESS",
    "TAG",
    "TYPE",
    "XCOSINE",
    "YCOSINE",
    "ZCOSINE"
  ],
  "HANGER": [
    "FRIC_COEF",
    "GAP",
    "GUID",
    "NUM",
    "STIFFNESS",
    "TAG",
    "TYPE"
  ],
  "DISPLACEMENTS": [
    "DISP_NUM",
    "NUM",
    "TYPE"
  ],
  "VECTOR": [
    "DX",
    "DY",
    "DZ",
    "FX",
    "FY",
    "FZ",
    "MX",
    "MY",
    "MZ",
    "NUMBER"
  ]
});
const profileNonNode=new Map(Object.entries(V14_NON_NODE)
  .map(([tag,fields])=>[tag,new Set(fields)]));
const V14_TAGS=new Set([...profileNonNode.keys(),'UNITS']);
const DOCUMENTED_UNPATCHED=new Set(['FORCESMOMENTS','FORCEMOMENTS',
  'USERDEFINED_NOZZLE','NOZZLE','EXPANSIONJOINT','UNIFORMLOAD','WIND',
  'WAVE','OFFSET','REDUCER','FLANGE']);
const NODE_LIKE=/(?:NODE|CNODE|BRANCHNODE|PORT|JUNCTION|CONNECT|TARGET_NODE|SOURCE_NODE)/i;
const TEXT_NODE_LIKE=/(?:NODE|CNODE|BRANCHNODE|PORT|JUNCTION|VENDOR)/i;
const XML_WHITESPACE=/^[\t\n\r ]*$/;
const XML_NAME=/^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const XML_VALUE_RE=/^\s*\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?\s*$/;
const error=(code,detail={})=>Object.assign(new Error(code),{code,detail});
const guard=(condition,code,detail)=>{if(!condition)throw error(code,detail);};
const decimalSource=s=>typeof s==='string'&&XML_VALUE_RE.test(s);
const byteOffsets=text=>{
  const result=new Uint32Array(text.length+1);
  let current=0;
  for(let i=0;i<text.length;){
    result[i]=current;
    const cp=text.codePointAt(i),len=cp>0xffff?2:1;
    if(len===2)result[i+1]=current;
    current+=utf8.encode(String.fromCodePoint(cp)).length;
    i+=len;result[i]=current;
  }
  return result;
};
const nodeCandidate=(tag,field,decoded)=>{
  if(NODE_LIKE.test(field)||TEXT_NODE_LIKE.test(tag))return true;
  if(!decimalSource(decoded))return false;
  try{return exactNodeId(decoded)!==null;}catch{return false;}
};
const nonNode=(tag,field)=>field==='XMLNS'||field.startsWith('XMLNS:')||
  profileNonNode.get(tag)?.has(field)===true||
  tag==='SIF'&&/^SIF[1-9]\d*$/.test(field); // v14 SIF factors (SIF1/SIF2), not node IDs

function readStartTag(text,start){
  let pos=start+1;
  const nameMatch=/^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(text.slice(pos));
  guard(nameMatch,'INPUT_XML_UNKNOWN_NODE_CARRIER');
  const tag=nameMatch[0],attrs=[],seen=new Set();
  guard(!tag.includes(':'),'INPUT_XML_UNKNOWN_NODE_CARRIER',{tag});
  pos+=tag.length;
  let selfClosing=false;
  while(pos<text.length){
    const spaces=/^[\t\n\r ]*/.exec(text.slice(pos))[0];
    pos+=spaces.length;
    if(text.startsWith('/>',pos)){pos+=2;selfClosing=true;break;}
    if(text[pos]==='>'){pos++;break;}
    guard(spaces.length>0,'INPUT_XML_UNKNOWN_NODE_CARRIER',{tag});
    const attrMatch=/^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(text.slice(pos));
    guard(attrMatch,'INPUT_XML_UNKNOWN_NODE_CARRIER',{tag});
    const name=attrMatch[0],fold=name.toUpperCase();
    pos+=name.length;
    pos+=/^[\t\n\r ]*/.exec(text.slice(pos))[0].length;
    guard(text[pos]==='=','INPUT_XML_UNKNOWN_NODE_CARRIER',{tag,field:name});pos++;
    pos+=/^[\t\n\r ]*/.exec(text.slice(pos))[0].length;
    const quote=text[pos++];
    guard(quote==="'"||quote==='"','INPUT_XML_UNKNOWN_NODE_CARRIER',{tag,field:name});
    const valueStart=pos;
    while(pos<text.length&&text[pos]!==quote){
      guard(text[pos]!=='<','INPUT_XML_NODE_ENTITY_UNSUPPORTED',{tag,field:name});
      pos++;
    }
    guard(pos<text.length,'INPUT_XML_NODE_ENTITY_UNSUPPORTED',{tag,field:name});
    const raw=text.slice(valueStart,pos),decoded=xmlDecode(raw);pos++;
    guard(!seen.has(fold),'INPUT_XML_UNKNOWN_NODE_CARRIER',{tag,field:name});
    seen.add(fold);
    if(name.includes(':')&&name!=='xmlns'&&name.toLowerCase()!=='xmlns')
      throw error('INPUT_XML_UNKNOWN_NODE_CARRIER',{tag,field:name});
    attrs.push({name,field:fold,raw,decoded,quote,valueStart,valueEnd:pos-1});
  }
  guard(pos<=text.length&&text[pos-1]==='>','INPUT_XML_UNKNOWN_NODE_CARRIER',{tag});
  return {tag,fold:tag.toUpperCase(),attrs,start,end:pos,selfClosing};
}
export function inventoryInputXml(text,{refs=[]}={}){
  guard(typeof text==='string','INPUT_XML_UNKNOWN_NODE_CARRIER');
  const physical=scanOriginalInputXmlStructure(text);
  guard(Array.isArray(physical),'INPUT_XML_ORIGINAL_SOURCE_REFUSED');
  const indexBytes=byteOffsets(text),stack=[],paths=[],items=[],textItems=[],shape=[];
  const records=[],carriers=[],positions=new Map();
  let cursor=0,rootSeen=false;
  const classify=(element,a)=>{
    const field=a.field,tag=element.fold,owner=element.record;
    if(DOCUMENTED_UNPATCHED.has(tag))
      throw error('INPUT_XML_UNSUPPORTED_NODE_CARRIER',{path:element.path,field,tag});
    const allowed=NODE_FIELDS[tag]?.has(field)===true;
    const isEndpoint=tag==='PIPINGELEMENT';
    if(allowed){
      const location=isEndpoint?Boolean(owner&&element===owner):
        Boolean(owner&&element.parent===owner);
      guard(location,'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',
        {path:element.path,field});
      const token=readInputXmlSourceField([a],field,{node:true,
        sentinel:SENTINEL_FIELDS.has(tag+'@'+field)});
      return {kind:'NODE_REF',key:token.numericId,role:tag+'@'+field};
    }
    if(NODE_LIKE.test(field)){
      throw error('INPUT_XML_UNKNOWN_NODE_CARRIER',
        {path:element.path,field});
    }
    if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};
    throw error('INPUT_XML_UNSUPPORTED_NODE_CARRIER',{path:element.path,field,tag});
  };
  // CAESAR II v14 model payload is strictly attribute-only. The SAME
  // fail-closed rule covers ordinary text and CDATA; whitespace is inert.
  const assertModelCharacterData=(raw,kind)=>{
    const parent=stack.at(-1);
    guard(XML_WHITESPACE.test(raw)||(!stack.some(e=>e.fold==='PIPINGMODEL')&&
      kind!=='cdata'), 'INPUT_XML_UNKNOWN_NODE_CARRIER',
      {path:parent?.path||null,kind});
  };
  const textBetween=(end)=>{
    if(cursor===end)return;
    const raw=text.slice(cursor,end);
    if(XML_WHITESPACE.test(raw)||(!stack.length&&cursor===0&&raw==='\uFEFF'))return;
    guard(stack.length>0,'INPUT_XML_UNKNOWN_NODE_CARRIER');
    const p=stack.at(-1);
    assertModelCharacterData(raw,'element-text');
    const decoded=xmlDecode(raw);
    if(TEXT_NODE_LIKE.test(p.fold)||nodeCandidate(p.fold,'',decoded))
      throw error('INPUT_XML_UNKNOWN_NODE_CARRIER',{path:p.path,kind:'element-text'});
    textItems.push({path:p.path,raw,decoded});
    shape.push('TEXT:'+p.path+':'+decoded);
  };
  while(cursor<text.length){
    const open=text.indexOf('<',cursor);
    if(open<0){textBetween(text.length);cursor=text.length;break;}
    textBetween(open);cursor=open;
    if(text.startsWith('<!--',open)){
      const end=text.indexOf('-->',open+4);
      guard(end>=0&&!text.slice(open+4,end).includes('--'),'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
      cursor=end+3;continue;
    }
    if(text.startsWith('<?',open)){
      const end=text.indexOf('?>',open+2);
      guard(end>=0,'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
      cursor=end+2;continue;
    }
    if(text.startsWith('<![CDATA[',open)){
      const end=text.indexOf(']]>',open+9);
      guard(end>=0,'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
      assertModelCharacterData(text.slice(open+9,end),'cdata');
      cursor=end+3;continue;
    }
    if(/^<!DOCTYPE\b/i.test(text.slice(open,open+10))||text.startsWith('<!',open))
      throw error('INPUT_XML_NODE_ENTITY_UNSUPPORTED',{kind:'dtd-or-declaration'});
    if(text.startsWith('</',open)){
      const close=text.indexOf('>',open+2),inside=text.slice(open+2,close).trim();
      guard(close>=0&&XML_NAME.test(inside)&&stack.length>0&&
        stack.at(-1).tag===inside,'INPUT_XML_UNKNOWN_NODE_CARRIER');
      shape.push('CLOSE:'+stack.at(-1).path);
      stack.pop();cursor=close+1;continue;
    }
    const tag=readStartTag(text,open),parent=stack.at(-1)||null;
    if(DOCUMENTED_UNPATCHED.has(tag.fold))
      throw error('INPUT_XML_UNSUPPORTED_NODE_CARRIER',{tag:tag.fold});
    guard(V14_TAGS.has(tag.fold),'INPUT_XML_UNKNOWN_NODE_CARRIER',{tag:tag.fold});
    if(!parent){
      guard(!rootSeen&&tag.tag==='CAESARII','INPUT_XML_UNKNOWN_NODE_CARRIER');
      rootSeen=true;
    }
    const children=parent?parent.children: new Map();
    const ordinal=(children.get(tag.fold)||0)+1;children.set(tag.fold,ordinal);
    const path=(parent?.path||'')+'/'+tag.fold+'['+ordinal+']';
    let record=parent?.record||null;
    const element={...tag,parent,children:new Map(),path,record};
    if(tag.fold==='PIPINGELEMENT'){
      guard(parent?.fold==='PIPINGMODEL'&&parent.parent?.fold==='CAESARII',
        'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',{path});
      const originalRow=physical[records.length];
      guard(originalRow&&originalRow.start===open,'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH');
      const ref=refs[records.length];
      guard(ref?.format==='INPUT_XML'&&ref.elementIndex===records.length,
        'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH');
      element.record=element;element.ref=ref;
      element.recordKey=ref.recordKey;
      element.index=records.length;
      records.push(element);
    }
    for(const attr of tag.attrs){
      // Namespace declarations only at the observed public CAESARII and
      // PIPINGMODEL locations. Unknown prefixes cannot be signed as source.
      if(attr.name==='xmlns'){
        const expected=tag.fold==='CAESARII'?'COADE':
          tag.fold==='PIPINGMODEL'?'':null;
        guard(expected!==null&&(attr.decoded===expected||attr.decoded===''),
          'INPUT_XML_UNKNOWN_NODE_CARRIER',{path,field:'xmlns'});
      }
      guard(!attr.name.includes(':')||attr.name==='xmlns',
        'INPUT_XML_UNKNOWN_NODE_CARRIER',{path,field:attr.name});
      const classification=classify(element,attr);
      const base={path:path+'@'+attr.field,elementPath:path,
        element:element.fold,field:attr.field,quote:attr.quote,
        index:element.record?.index??null,recordKey:element.record?.recordKey??null,
        raw:attr.raw,decoded:attr.decoded,
        byteRange:{start:indexBytes[attr.valueStart],end:indexBytes[attr.valueEnd]},
        ...classification};
      items.push(base);
      if(base.kind==='NODE_REF'){
        carriers.push(base);
        if(base.key!==null){
          if(!positions.has(base.key))positions.set(base.key,[]);
          positions.get(base.key).push(base);
        }
      }
    }
    shape.push('OPEN:'+path+':'+tag.attrs.map(a=>a.field).join(','));
    if(tag.selfClosing)shape.push('CLOSE:'+path);
    else stack.push(element);
    cursor=tag.end;
  }
  guard(rootSeen&&stack.length===0&&records.length===physical.length,
    'INPUT_XML_UNKNOWN_NODE_CARRIER');
  return {schema:NODE_REGISTRY_SCHEMA,records,carriers,items,textItems,shape,positions};
}

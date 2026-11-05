/**
 * UXML edit-ops v1: bounded, whole-document CAESAR InputXML node-carrier
 * inventory. No expansion of DTD, general entities, namespaces or network IO.
 * Source locations are ORIGINAL UTF-8 half-open byte spans.
 *
 * The S3 scanner is a structural admission witness, not this semantic parser.
 */
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';

export const NODE_REGISTRY_SCHEMA='uxml-inputxml-node-carriers/v1';
const utf8=new TextEncoder();
const MAX_DECIMAL=128;
const MAX_POWER=128;
const MAX_SAFE=BigInt(Number.MAX_SAFE_INTEGER);
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
const KNOWN_NON_NODE=new Set([
  'RADIUS','DIAMETER','WALL_THICK','REF_NO','NAME','FROM_NAME','TO_NAME',
  'LINE_ID','PIPELINE-REFERENCE','TYPE','NUM','NUMBER','WEIGHT','LENGTH',
  'ANGLE','DX','DY','DZ','FACTOR','LABEL','UNIT','UNITS','VALUE',
  'TEMP','TEMPERATURE','PRESSURE','AREA','MATERIAL','MATERIAL_NUM',
  'MATERIAL_NAME','BEND_RADIUS','SIF1','SIF2','SIF3','SIF_NUM',
  'DISP_NUM','FORCMNT_NUM','NUMELT','JOBNAME','VERSION','XML_TYPE',
]);
const NON_NODE_PATTERN=/^(?:FROM_[XYZ]|TO_[XYZ]|DELTA_[XYZ]|TEMP_EXP_C\d+|PRESSURE\d+|HOT_MOD\d+|SIF\d+|MODULUS|POISSONS|PIPE_DENSITY|FLUID_DENSITY|INSUL_DENSITY|REFRACTORY_DENSITY|REFRACTORY_THK|CLADDING_(?:DEN|THK)|INSUL_(?:THICK|CLAD_UNIT_WEIGH|CLAD_UNIT_WEIGHT)|CORR_ALLOW|MILL_TOL_(?:PLUS|MINUS)|SEAM_WELD|MATERIAL_.+|NORTH_[XYZ]|NUM[A-Z0-9_]+|NO[A-Z0-9_]+|[XYZ]|[A-Z_]*_(?:DENSITY|THICK|THK|FACTOR|LABEL|NAME|TYPE))$/;
const NODE_LIKE=/(?:NODE|CNODE|BRANCHNODE|PORT|JUNCTION|CONNECT|TARGET_NODE|SOURCE_NODE)/i;
const TEXT_NODE_LIKE=/(?:NODE|CNODE|BRANCHNODE|PORT|JUNCTION|VENDOR)/i;
const XML_WHITESPACE=/^[\t\n\r ]*$/;
const XML_NAME=/^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const XML_VALUE_RE=/^\s*\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?\s*$/;
const ENTITIES=Object.freeze({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"});
const XML_INVALID_CP=cp=>cp===0||cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff)||
  (cp<0x20&&cp!==0x9&&cp!==0xa&&cp!==0xd);
const error=(code,detail={})=>Object.assign(new Error(code),{code,detail});
const guard=(condition,code,detail)=>{if(!condition)throw error(code,detail);};
const decimalSource=s=>typeof s==='string'&&XML_VALUE_RE.test(s);
export function exactNodeId(value,{sentinel=false}={}){
  if(typeof value==='number'){
    guard(Number.isSafeInteger(value)&&value>0,'INPUT_XML_NODE_IDENTITY_INVALID');
    return String(value);
  }
  guard(typeof value==='string','INPUT_XML_NODE_IDENTITY_INVALID');
  const v=value.trim();
  if(sentinel&&v==='-1.010100')return null;
  guard(v.length>0&&v.length<=MAX_DECIMAL&&decimalSource(v),'INPUT_XML_NODE_IDENTITY_INVALID',
    {value:v.slice(0,48)});
  const m=v.match(XML_VALUE_RE);
  const integer=m[1]??'0',fraction=m[2]??m[3]??'';
  const digits=(integer+fraction).replace(/^0+/,'')||'0';
  const exponent=Number(m[4]||0);
  guard(Number.isInteger(exponent)&&Math.abs(exponent)<=MAX_POWER&&
    digits.length<=MAX_DECIMAL,'INPUT_XML_NODE_IDENTITY_INVALID');
  const shift=exponent-fraction.length;
  guard(Math.abs(shift)<=MAX_POWER,'INPUT_XML_NODE_IDENTITY_INVALID');
  let whole;
  if(shift>=0)whole=BigInt(digits)*10n**BigInt(shift);
  else{
    const divisor=10n**BigInt(-shift),raw=BigInt(digits);
    guard(raw%divisor===0n,'INPUT_XML_NODE_IDENTITY_INVALID');
    whole=raw/divisor;
  }
  guard(whole>0n&&whole<=MAX_SAFE,'INPUT_XML_NODE_IDENTITY_INVALID');
  return whole.toString();
}
export function xmlDecode(raw){
  guard(typeof raw==='string','INPUT_XML_NODE_ENTITY_UNSUPPORTED');
  let out='';
  for(let i=0;i<raw.length;){
    if(raw[i]!=='&'){
      const cp=raw.codePointAt(i);
      guard(!XML_INVALID_CP(cp),'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
      out+=String.fromCodePoint(cp);i+=cp>0xffff?2:1;continue;
    }
    const close=raw.indexOf(';',i+1);
    guard(close>=0&&close-i<=20,'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
    const name=raw.slice(i+1,close);
    let decoded;
    if(Object.hasOwn(ENTITIES,name))decoded=ENTITIES[name];
    else{
      const hex=/^#x([0-9a-fA-F]+)$/.exec(name);
      const dec=/^#([0-9]+)$/.exec(name);
      guard(Boolean(hex||dec),'INPUT_XML_NODE_ENTITY_UNSUPPORTED',{entity:name});
      const cp=Number(hex?parseInt(hex[1],16):Number(dec[1]));
      guard(Number.isSafeInteger(cp)&&!XML_INVALID_CP(cp),
        'INPUT_XML_NODE_ENTITY_UNSUPPORTED',{entity:name});
      decoded=String.fromCodePoint(cp);
    }
    out+=decoded;i=close+1;
  }
  return out;
}
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
const nonNode=(tag,field)=>{
  if(field==='XMLNS'||field.startsWith('XMLNS:'))return true;
  if(KNOWN_NON_NODE.has(field)||NON_NODE_PATTERN.test(field))return true;
  // Top-level identity and measured metadata fields are not node slots.
  if((tag==='CAESARII'||tag==='PIPINGMODEL')&&
     !NODE_LIKE.test(field))return true;
  return false;
};
const codePointSafe=text=>{for(let i=0;i<text.length;){
  const cp=text.codePointAt(i);
  guard(!XML_INVALID_CP(cp),'INPUT_XML_NODE_ENTITY_UNSUPPORTED');
  i+=cp>0xffff?2:1;
}};
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
    const allowed=NODE_FIELDS[tag]?.has(field)===true;
    const isEndpoint=tag==='PIPINGELEMENT';
    if(allowed){
      const location=isEndpoint?Boolean(owner&&element===owner):
        Boolean(owner&&element.parent===owner);
      guard(location,'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',
        {path:element.path,field});
      const decoded=a.decoded;
      const key=exactNodeId(decoded,{sentinel:SENTINEL_FIELDS.has(tag+'@'+field)});
      return {kind:'NODE_REF',key,role:tag+'@'+field};
    }
    if(NODE_LIKE.test(field)){
      const known=Object.hasOwn(NODE_FIELDS,tag)||tag==='PIPINGELEMENT';
      throw error(known?'INPUT_XML_UNKNOWN_NODE_CARRIER':'INPUT_XML_UNKNOWN_NODE_CARRIER',
        {path:element.path,field});
    }
    if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};
    if(nodeCandidate(tag,field,a.decoded))
      throw error('INPUT_XML_UNKNOWN_NODE_CARRIER',{path:element.path,field});
    return {kind:'STRUCTURAL_NONDATA'};
  };
  const textBetween=(end)=>{
    if(cursor===end)return;
    const raw=text.slice(cursor,end);
    if(XML_WHITESPACE.test(raw)||(!stack.length&&cursor===0&&raw==='\uFEFF'))return;
    guard(stack.length>0,'INPUT_XML_UNKNOWN_NODE_CARRIER');
    const p=stack.at(-1);
    const decoded=xmlDecode(raw);
    // A typed ordinary non-node text leaf is inert even if it contains 40.
    // Unknown numeric or node-named text is never source authorization.
    if(TEXT_NODE_LIKE.test(p.fold)||
       (!KNOWN_NON_NODE.has(p.fold)&&nodeCandidate(p.fold,'',decoded)))
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
      guard(XML_WHITESPACE.test(text.slice(open+9,end)),
        'INPUT_XML_UNKNOWN_NODE_CARRIER',{kind:'cdata-as-value'});
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

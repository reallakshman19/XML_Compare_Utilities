/**
 * CAESAR II v14 InputXML source field API: source-field/v1.
 * Strict-S3 and original-byte patcher use one normalized field lookup.
 * Keep raw, XML-decoded, numeric identifiers distinct with original spans.
 */
export const INPUT_XML_SOURCE_FIELD_SCHEMA='input-xml-source-field/v1';
const MAX_DECIMAL=128;
const MAX_POWER=128;
const MAX_SAFE=BigInt(Number.MAX_SAFE_INTEGER);
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

/** Preserve S3's existing nonempty, trimmed attribute lookup semantics. */
export function sourceFieldValue(attrs,...names){
  for(const name of names){
    if(attrs?.[name]!=null&&String(attrs[name]).trim())return String(attrs[name]).trim();
    const key=Object.keys(attrs||{}).find(k=>k.toUpperCase()===String(name).toUpperCase());
    if(key&&String(attrs[key]).trim())return String(attrs[key]).trim();
  }
  return '';
}
/** Exact field read for S3 object or lexical array with original byteRange. */
export function readInputXmlSourceField(attributes,name,{node=false,sentinel=false}={}){
  const key=String(name).toUpperCase();
  let selected;
  if(Array.isArray(attributes)){
    const found=attributes.filter(a=>(a.field||a.name||'').toUpperCase()===key);
    guard(found.length<=1,'INPUT_XML_UNKNOWN_NODE_CARRIER',{field:key,reason:'duplicate'});
    selected=found[0]||null;
  }else{
    const keys=Object.keys(attributes||{}).filter(k=>k.toUpperCase()===key);
    guard(keys.length<=1,'INPUT_XML_UNKNOWN_NODE_CARRIER',{field:key,reason:'duplicate'});
    selected=keys.length?{name:keys[0],raw:String(attributes[keys[0]])}:null;
  }
  if(!selected)return null;
  const raw=selected.raw,decoded=selected.decoded??xmlDecode(raw);
  return {
    schema:INPUT_XML_SOURCE_FIELD_SCHEMA,field:key,spelling:selected.name,
    raw,decoded,numericId:node?exactNodeId(decoded,{sentinel}):null,
    byteRange:selected.byteRange??null,quote:selected.quote??null,
  };
}
/** CAESAR input-frame original X/Y/Z => hub (X,-Z,Y), never delta-origin. */
export function absoluteInputXmlSourceWitness(attributes,endpoint){
  const prefix=String(endpoint).toUpperCase();
  guard(prefix==='FROM'||prefix==='TO','INPUT_XML_ALIAS_COORDINATE_UNPROVEN');
  const fields=['X','Y','Z'].map(axis=>readInputXmlSourceField(attributes,prefix+'_'+axis));
  guard(fields.every(Boolean)&&fields.every(f=>
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(f.decoded)&&
    f.decoded.trim()!=='-1.010100'&&Number.isFinite(Number(f.decoded))),
    'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
    {endpoint:prefix});
  return {
    point:{x:Number(fields[0].decoded),y:-Number(fields[2].decoded),
      z:Number(fields[1].decoded)},
    evidence:fields.map(f=>({field:f.field,raw:f.raw,byteRange:f.byteRange})),
  };
}

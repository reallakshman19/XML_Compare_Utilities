import { scanXml, psi116Index, locatePsi116, child, text, escapeText, xmlDiff } from '../../_kit/xmlspan.mjs';
import { sha256Hex } from '../../_kit/core.mjs';
import { mapPsi116ToUxml } from '../../../uxml/UxmlPsi116SchemaMapper.js';

export const U1_FIELDS = Object.freeze(Object.fromEntries(Object.entries({
  'Node/NodeName':'NameBlock', 'Node/Weight':'RigidBlock',
  'Node/OutsideDiameter':'SectionDimensionBlock', 'Node/WallThickness':'SectionDimensionBlock',
  'Node/CorrosionAllowance':'MaterialBlock', 'Node/InsulationThickness':'SectionDimensionBlock',
  'Branch/Temperature':'ProcessBlock', 'Branch/Pressure':'ProcessBlock', 'Branch/FluidDensity':'ProcessBlock',
  'Branch/MaterialNumber':'MaterialBlock', 'Branch/InsulationDensity':'ProcessBlock',
}).map(([field,category]) => [field,Object.freeze({category,numeric:field!=='Node/NodeName'})])));
const rawKeys = {'Node/NodeName':'nodeName','Node/Weight':'weight','Node/OutsideDiameter':'outsideDiameter','Node/WallThickness':'wallThickness'};
const decoder = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const encoder = new TextEncoder();
const fail = (code,detail='') => { throw new Error(code+': '+detail); };
const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const xmlChars = /^[\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]*$/u;

function locate(doc,index,ref,field) {
  // Verify the entire node identity even when editing a branch-level value.
  const {row} = locatePsi116(doc,index,ref,'NodeNumber');
  const [scope,tag] = field.split('/');
  const owner = scope==='Branch' ? index.branches[ref.branchOrdinal] : row.element;
  const el = child(owner,tag,true);
  if (!el || el.selfClosing) fail('U1_FIELD_ABSENT',field);
  const span = scope==='Node' ? locatePsi116(doc,index,ref,field).span : text(doc,el);
  // A comment or PI inside a nominal leaf is markup, not editable text.
  if (span.raw.includes('<')) fail('U1_FIELD_NOT_SUPPORTED',field+' contains markup');
  return {el,span};
}

// One allocation; copy unmodified chunks and replacements from the end backwards.
function patch(bytes,plans) {
  const sorted = [...plans].sort((a,b)=>b.start-a.start);
  const out = new Uint8Array(bytes.length+sorted.reduce((n,p)=>n+p.replacement.length-(p.end-p.start),0));
  let src=bytes.length,dst=out.length;
  for (const p of sorted) {
    if (p.end>src) fail('U1_CONFLICTING_EDITS','overlapping spans');
    const tail=bytes.subarray(p.end,src); dst-=tail.length; out.set(tail,dst);
    dst-=p.replacement.length; out.set(p.replacement,dst); src=p.start;
  }
  dst-=src; out.set(bytes.subarray(0,src),dst);
  return out;
}

function verify(original,result,plans,hash) {
  try {
    const updated=scanXml(result), next=psi116Index(updated);
    const actual=xmlDiff(original,updated);
    const expected=new Map(plans.map(p=>[p.span.rawStart,p]));
    if (actual.length!==expected.size) fail('U1_PARITY_FAILED','diff count');
    for (const d of actual) {
      const p=expected.get(d.start);
      if (!p || d.kind!=='text' || d.end!==p.span.rawEnd || d.after!==p.expectedRaw) fail('U1_PARITY_FAILED','unexpected diff at '+d.start);
      expected.delete(d.start);
    }
    if (expected.size) fail('U1_PARITY_FAILED','missing diff');
    for (const p of plans) if (locate(updated,next,p.ref,p.field).span.value!==p.after) fail('U1_PARITY_FAILED',p.field+' decoded text');
    const mapped=mapPsi116ToUxml(decoder.decode(result),{fileSha256:hash});
    const components=new Map(mapped.components.map(c=>{const r=c.rawAttributes.psi116;return [r.branchIndex+':'+r.sourceIndex,r];}));
    for (const p of plans) {
      const key=rawKeys[p.field]; if (!key) continue;
      const r=components.get(p.ref.branchOrdinal+':'+p.ref.nodeOrdinal);
      const wanted=p.field==='Node/NodeName'?p.after:Number(p.after);
      if (!r || r.branchName!==p.ref.branchName || r.componentRefNo!==p.ref.componentRefNo || r[key]!==wanted) fail('U1_PARITY_FAILED',p.field+' UXML component');
    }
  } catch (e) {
    if (e.message.startsWith('U1_PARITY_FAILED')) throw e;
    fail('U1_PARITY_FAILED',e.message);
  }
}

export async function applyPsi116Edits(bytes,edits,{fileSha256}={}) {
  if (!(bytes instanceof Uint8Array)) fail('U1_VALUE_INVALID','bytes must be Uint8Array');
  // Snapshot before asynchronous hashing so caller mutation cannot invalidate the lock.
  bytes=new Uint8Array(bytes);
  const sha256Before=await sha256Hex(bytes);
  if (sha256Before!==fileSha256) fail('U1_FILE_SHA256_MISMATCH');
  if (!Array.isArray(edits)) fail('U1_VALUE_INVALID','edits must be an array');
  const doc=scanXml(bytes), index=psi116Index(doc), seen=new Map();
  for (const edit of edits) {
    const {ref,field,before,after:input}=edit??{};
    if (!Object.hasOwn(U1_FIELDS,field)) fail('U1_FIELD_NOT_SUPPORTED',String(field));
    if (!ref || !Number.isInteger(ref.branchOrdinal) || !Number.isInteger(ref.nodeOrdinal) ||
        typeof ref.branchName!=='string' || typeof ref.componentRefNo!=='string' || !['string','number'].includes(typeof ref.nodeNumber)) fail('XML_REF_MISMATCH','incomplete ref');
    const {span}=locate(doc,index,ref,field);
    if (before!==span.value) fail('U1_STALE_BEFORE',field);
    const after=typeof input==='number' && U1_FIELDS[field].numeric?String(input):input;
    if (typeof after!=='string' || !xmlChars.test(after) || (U1_FIELDS[field].numeric && (!numberPattern.test(after) || !Number.isFinite(Number(after))))) fail('U1_VALUE_INVALID',field);
    const key=span.start+':'+span.end;
    const previous=seen.get(key);
    if (previous) {
      if (previous.after!==after) fail(field.startsWith('Branch/')?'U1_BRANCH_FIELD_SPLIT':'U1_CONFLICTING_EDITS',field);
      continue;
    }
    const escaped=escapeText(after);
    seen.set(key,{ref:{...ref},field,before,after,start:span.start,end:span.end,span,
      replacement:encoder.encode(escaped),expectedRaw:decoder.decode(bytes.subarray(span.rawStart,span.start))+escaped+decoder.decode(bytes.subarray(span.end,span.rawEnd))});
  }
  const plans=[...seen.values()].filter(p=>p.before!==p.after);
  const result=plans.length?patch(bytes,plans):bytes;
  const sha256After=await sha256Hex(result);
  verify(doc,result,plans,sha256After);
  return {bytes:result,sha256Before,sha256After,changes:plans.map(({ref,field,before,after,start,end})=>({ref,field,before,after,start,end}))};
}

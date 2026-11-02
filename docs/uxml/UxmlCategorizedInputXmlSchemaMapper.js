/**
 * S4.1 Categorized InputXML -> read-only UXML evidence.
 * An ORIGINAL InputXML is required before assigning any authoritative sourceRef.
 * Never reconstruct, patch, apply, or infer source-record ordinals from Line grouping.
 */
import {inputXmlToCategorizedInputXml, _test as converter} from '../xml-compare/CategorizedInputXmlConverter.js';
import {COMPONENT_TYPES, CONFIDENCE_LEVELS, SOURCE_FORMATS} from './UxmlConstants.js';
import {createUxmlComponent, createUxmlDocument, createUxmlHeader, createUxmlSource} from './UxmlTypes.js';
import {validateUxmlDocument} from './UxmlValidationGate.js';

export const UXML_CATEGORIZED_INPUTXML_READER_SCHEMA='uxml-categorized-inputxml-reader/v1';
export const UXML_CATEGORIZED_INPUTXML_REFUSALS=Object.freeze({
  INVALID_CATEGORY:'CATEGORIZED_INVALID_DOCUMENT',
  SOURCE_HASH_REQUIRED:'CATEGORIZED_ORIGINAL_FILE_SHA_REQUIRED',
  SOURCE_HASH_MISMATCH:'CATEGORIZED_ORIGINAL_FILE_SHA_MISMATCH',
  ORIGINAL_ENCODING:'CATEGORIZED_ORIGINAL_ENCODING_UNSUPPORTED',
  ORIGINAL_STRUCTURE:'CATEGORIZED_ORIGINAL_STRUCTURE_UNSUPPORTED',
  RECORD_KEY_MISSING:'CATEGORIZED_RECORD_KEY_MISSING',
  RECORD_NO_MATCH:'CATEGORIZED_ORIGINAL_RECORD_NO_MATCH',
  RECORD_AMBIGUOUS:'CATEGORIZED_ORIGINAL_RECORD_AMBIGUOUS',
  RECORD_CLAIMED_TWICE:'CATEGORIZED_ORIGINAL_RECORD_CLAIMED_TWICE',
  RECORD_UNCLAIMED:'CATEGORIZED_ORIGINAL_RECORD_UNCLAIMED',
  DERIVED_DIFF:'CATEGORIZED_DERIVED_DIFFERENCE_UNREVIEWED',
  EXTERNAL_DUPLICATE:'CATEGORIZED_DUPLICATED_EXTERNAL_BLOCK',
  UNKNOWN_SECTION:'CATEGORIZED_UNKNOWN_SOURCE_SECTION',
  GATE_REJECTED:'CATEGORIZED_UXML_VALIDATION_REJECTED',
});
const refuse=(code)=>({ok:false,code,status:'REFUSED',uxml:null,sourceEquivalent:false,exportAllowed:false});
const clean=value=>String(value??'').trim();
const decode=value=>String(value??'').replace(/&(#x([0-9a-f]+)|#([0-9]+)|amp|lt|gt|quot|apos);/gi,
  (whole,entity,hex,dec)=>{
    if(hex||dec){const code=parseInt(hex||dec,hex?16:10);return Number.isFinite(code)&&code>0&&code<=0x10ffff?String.fromCodePoint(code):whole;}
    return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity.toLowerCase()]??whole;
  });
function attributes(openTag){
  const attrs={};
  String(openTag).replace(/([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g,
    (_,name,_quoted,double,single)=>{attrs[name]=decode(double??single??'');return _;});
  return attrs;
}
function nodeKey(value){
  const raw=clean(value),number=Number(raw);
  return raw&&Number.isFinite(number)&&Math.abs(number-Math.round(number))<1e-6
    ? String(Math.round(number)) : raw.replace(/\.0+$/,'');
}
function identity(attrs,index){
  const from=clean(attrs.FROM_NODE),to=clean(attrs.TO_NODE);
  if(!from||!to)return null;
  // Exactly the physical-ordinal rule from UxmlInputXmlSchemaMapper.js:1667-1671.
  return {index,from,to,recordKey:'E'+index+':F'+encodeURIComponent(from)+':T'+encodeURIComponent(to)};
}
function projection(xml){
  return clean(String(xml).replace(/>\s+</g,'><'));
}
const ORIGINAL_CDATA=/<OriginalElement>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/OriginalElement>/gi;
const ELEMENT_BLOCK=/<Element\b([^>]*)>([\s\S]*?)<\/Element>/gi;
function parseCategorized(xml){
  if(!/<CategorizedInputXML\b[^>]*\bschema=["']categorized-inputxml\/v3["']/i.test(xml))
    return null;
  const lines=[],elements=[];
  const lineRe=/<Line\b([^>]*)>([\s\S]*?)<\/Line>/gi;
  let line;
  while((line=lineRe.exec(xml))){
    const lineAttrs=attributes(line[1]),lineId=clean(lineAttrs.id);
    if(!lineId)return null;
    const row={id:lineId,decoration:projection(line[2].replace(ELEMENT_BLOCK,'')),elements:[]};
    let elem;
    ELEMENT_BLOCK.lastIndex=0;
    while((elem=ELEMENT_BLOCK.exec(line[2]))){
      const attrs=attributes(elem[1]),body=elem[2];
      const cdatas=[...body.matchAll(ORIGINAL_CDATA)];
      if(cdatas.length!==1)return null;
      const raw=cdatas[0][1].replaceAll(']]]]><![CDATA[>',']]>');
      if(!/^<PIPINGELEMENT\b/i.test(raw)||!clean(raw))return null;
      const markers=[...body.matchAll(/<ReviewMarker\b([^>]*?)\/>/gi)];
      const explicitReview=markers.some(m=>{
        const a=attributes(m[1]);return a.kind==='DERIVED_DIFFERENCE'&&a.disposition==='REVIEW_ONLY';
      });
      const evidence=projection(body.replace(ORIGINAL_CDATA,'').replace(/<ReviewMarker\b[^>]*\/>/gi,''));
      const item={attrs,lineId,snapshot:clean(raw),evidence,explicitReview};
      elements.push(item);row.elements.push(item);
    }
    lines.push(row);
  }
  if(!lines.length||!elements.length)return null;
  if((xml.match(/<Line\b/gi)||[]).length!==lines.length ||
     (xml.match(/<Element\b/gi)||[]).length!==elements.length ||
     (xml.match(/<OriginalElement\b/gi)||[]).length!==elements.length)return null;
  return {lines,elements};
}
function physicalSourceRows(text){
  const rows=converter.splitPipingElements(text);
  const openings=(text.match(/<PIPINGELEMENT\b/gi)||[]).length;
  if(!/<CAESARII\b/i.test(text)||!/<PIPINGMODEL\b/i.test(text)||
     !rows.length||rows.length!==openings)return null;
  return rows.map((raw,index)=>{
    const open=raw.match(/^<PIPINGELEMENT\b[^>]*>/i)?.[0];
    const attrs=attributes(open||'');
    const key=identity(attrs,index);
    if(!key||!(/<\/PIPINGELEMENT>\s*$/i.test(raw)||/\/>\s*$/i.test(raw)))return null;
    return {raw:clean(raw),attrs,...key,
      lineId:clean(attrs.LINE_ID||attrs['PIPELINE-REFERENCE']||'UNSPECIFIED_LINE'),
      elementKey:nodeKey(key.from)+'->'+nodeKey(key.to)};
  });
}
function hasUnknownSourceSection(original,rows){
  let remaining=original;
  for(const row of rows){
    const offset=remaining.indexOf(row.raw);
    if(offset<0)return true;
    remaining=remaining.slice(0,offset)+remaining.slice(offset+row.raw.length);
  }
  remaining=remaining.replace(/<\?xml\b[\s\S]*?\?>/gi,'')
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<\/?CAESARII\b[^>]*>/gi,'')
    .replace(/<\/?PIPINGMODEL\b[^>]*>/gi,'');
  // Unknown headers/sections outside source elements have no Categorized carrier.
  return /<[^>]*>/.test(remaining)||clean(remaining)!=='';
}
function repeatedExternalBlock(rows){
  const seen=new Set();
  const regex=/<(RESTRAINT|DISPLACEMENTS|FORCESMOMENTS)\b[^>]*(?:\/>|>[\s\S]*?<\/\1>)/gi;
  for(const row of rows){
    let item;regex.lastIndex=0;
    while((item=regex.exec(row.raw))){
      const literal=clean(item[0]);
      if(seen.has(literal))return true;
      seen.add(literal);
    }
  }
  return false;
}
const markers=['PipingClass','Rating','DTXR_POS','DTXR_PS','MaterialNumber',
  'MaterialName','LINE_ID','FROM_NAME','TO_NAME'];
function enrichedSignals(text){
  return markers.filter(marker=>
    new RegExp('<'+marker+'(?:\\s|>)|\\b'+marker+'\\s*=','i').test(text));
}
function addGate(doc){
  const gate=validateUxmlDocument(doc);
  doc.validation={schema:gate.schema,ready:false,gateReady:gate.ready,
    blockerCodes:gate.blockers.map(b=>b.code),
    warningCodes:gate.warnings.map(w=>w.code),
    qualifiedForApply:false,note:'S4.1 is read-only; gate does not grant writer authority'};
  return gate;
}
function makeEvidence(rows){
  return rows.map(row=>({lineId:row.lineId,elementKey:row.attrs.elementKey,
    fromNode:row.attrs.fromNode,toNode:row.attrs.toNode,
    originalSnapshot:row.snapshot,reviewableProjection:row.evidence}));
}
async function sourceBytes(options){
  if(options.originalBytes!==undefined){
    const bytes=options.originalBytes;
    if(!(bytes instanceof Uint8Array))return null;
    try{return {bytes,text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)};}
    catch{return null;}
  }
  if(typeof options.originalInputXml==='string')
    return {bytes:new TextEncoder().encode(options.originalInputXml),text:options.originalInputXml};
  return null;
}
async function digestSha256(bytes){
  const bytesHash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(bytesHash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/**
 * Returns {ok, status, uxml, evidence?, code?, gate?, sourceEquivalent, exportAllowed}.
 * A refusal always returns uxml:null. Without original bytes this is UNBOUND evidence,
 * not a sourceRef-bearing element or permission to patch.
 */
export async function mapCategorizedInputXmlToUxml(categorizedText,options={}){
  const categorized=String(categorizedText??'');
  const parsed=parseCategorized(categorized);
  if(!parsed)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.INVALID_CATEGORY);
  const evidence=makeEvidence(parsed.elements);
  const provided=options.originalBytes!==undefined||options.originalInputXml!==undefined;
  if(!provided){
    const doc=createUxmlDocument({
      header:createUxmlHeader({createdBy:'UXML-S4.1',
        notes:'NOT_SOURCE_EQUIVALENT; categorized projections are review-only'}),
      sources:[createUxmlSource({id:'CATEGORIZED-UNBOUND',
        format:'CATEGORIZED_INPUT_XML',role:'EVIDENCE_ONLY'})],
      categorized:{readerSchema:UXML_CATEGORIZED_INPUTXML_READER_SCHEMA,
        status:'NOT_SOURCE_EQUIVALENT',sourceEquivalent:false,
        enrichedSignals:enrichedSignals(categorized),evidence},
    });
    const gate=addGate(doc);
    return {ok:true,status:'NOT_SOURCE_EQUIVALENT',uxml:doc,evidence,
      sourceEquivalent:false,exportAllowed:false,gate};
  }
  if(!/^[a-f0-9]{64}$/i.test(clean(options.fileSha256)))
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.SOURCE_HASH_REQUIRED);
  const supplied=await sourceBytes(options);
  if(!supplied)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_ENCODING);
  const measured=await digestSha256(supplied.bytes);
  // MUTATION_GUARD_SHA256
  if(measured!==clean(options.fileSha256).toLowerCase())
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.SOURCE_HASH_MISMATCH);
  const originalRows=physicalSourceRows(supplied.text);
  if(!originalRows)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_STRUCTURE);

  // The source is checked BEFORE any UXML is constructed or sourceRef bound.
  // Match on exact trimmed snapshot plus both normalized nodes and elementKey.
  const claimed=new Set(),matches=[];
  for(const element of parsed.elements){
    const {fromNode,toNode,elementKey}=element.attrs;
    // MUTATION_GUARD_RECORD_KEY
    if(!clean(fromNode)||!clean(toNode)||!clean(elementKey))
      return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_KEY_MISSING);
    const candidateRows=originalRows.filter(row=>
      row.raw===element.snapshot&&nodeKey(row.from)===nodeKey(fromNode)&&
      nodeKey(row.to)===nodeKey(toNode)&&row.elementKey===elementKey&&
      row.lineId===element.lineId);
    // MUTATION_GUARD_NO_MATCH
    if(candidateRows.length===0)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_NO_MATCH);
    // MUTATION_GUARD_AMBIGUOUS
    if(candidateRows.length>1)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_AMBIGUOUS);
    const candidate=candidateRows[0];
    // MUTATION_GUARD_ONE_TO_ONE
    if(claimed.has(candidate.index))return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_CLAIMED_TWICE);
    claimed.add(candidate.index);
    matches.push({element,original:candidate});
  }
  // MUTATION_GUARD_COVERAGE
  if(claimed.size!==originalRows.length)
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_UNCLAIMED);

  // External stanzas deduplicated by the compatibility reverse converter are
  // not identity-safe; repeated physical stanzas across records require review.
  // MUTATION_GUARD_EXTERNAL
  if(repeatedExternalBlock(originalRows))
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.EXTERNAL_DUPLICATE);
  // MUTATION_GUARD_SECTION
  if(hasUnknownSourceSection(supplied.text,originalRows))
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.UNKNOWN_SECTION);

  // The converter is used only to independently derive the expected projection;
  // its reverse converter is NEVER called. Derived edits cannot become source.
  const regenerated=parseCategorized(inputXmlToCategorizedInputXml(supplied.text));
  if(!regenerated)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_STRUCTURE);
  const expectedByRaw=new Map(regenerated.elements.map(row=>[row.snapshot,row]));
  const expectedLines=new Map(regenerated.lines.map(line=>[line.id,line.decoration]));
  let reviewRequired=false;
  for(const line of parsed.lines){
    // MUTATION_GUARD_DERIVED_LINE
    if(expectedLines.get(line.id)!==line.decoration)
      return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.DERIVED_DIFF);
  }
  for(const {element} of matches){
    const expected=expectedByRaw.get(element.snapshot);
    if(!expected)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.RECORD_NO_MATCH);
    // MUTATION_GUARD_DERIVED
    if(element.evidence!==expected.evidence&&!element.explicitReview)
      return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.DERIVED_DIFF);
    reviewRequired||=element.explicitReview;
  }

  const doc=createUxmlDocument({
    header:createUxmlHeader({createdBy:'UXML-S4.1',
      notes:'Read-only original-bound Categorized evidence; no writer or join authority'}),
    sources:[createUxmlSource({id:'INPUT_XML-ORIGINAL',format:SOURCE_FORMATS.INPUT_XML,
      hash:measured,sourceText:supplied.text,role:'ORIGINAL_SOURCE'})],
    categorized:{readerSchema:UXML_CATEGORIZED_INPUTXML_READER_SCHEMA,
      status:reviewRequired?'REVIEW_REQUIRED':'SOURCE_BOUND_READ_ONLY',
      sourceEquivalent:!reviewRequired,
      enrichedSignals:enrichedSignals(categorized),
      boundElementCount:matches.length,
      originalRecordCount:originalRows.length,
      recordKeyRule:'E{zeroBasedPhysicalOrdinal}:F{encodeURIComponent(FROM_NODE)}:T{encodeURIComponent(TO_NODE)}'},
  });
  for(const [index,{element,original}] of matches.entries()){
    const sourceRef={format:SOURCE_FORMATS.INPUT_XML,fileSha256:measured,
      recordKey:original.recordKey,elementIndex:original.index,
      fromNode:original.from,toNode:original.to};
    doc.components.push(createUxmlComponent({
      id:'CAT-S4-E'+index,sourceRefs:[sourceRef],
      type:COMPONENT_TYPES.UNKNOWN,normalizedType:COMPONENT_TYPES.UNKNOWN,
      pipelineRef:element.lineId,lineKey:element.lineId,
      name:original.from+'->'+original.to,
      confidence:CONFIDENCE_LEVELS.EXACT_SOURCE,
      rawAttributes:{categorized:{originalElementSnapshot:element.snapshot,
        reviewableProjection:element.evidence,derivedReviewOnly:element.explicitReview},
        inputXml:{recordKey:original.recordKey,sourceAttributes:{...original.attrs},
          rawXml:original.raw,physicalElementIndex:original.index}},
      normalized:{sourceRecordOnly:true,reviewOnly:true,geometryAuthority:'NOT_INFERRED'},
    }));
  }
  const gate=addGate(doc);
  // The shared gate must run, but its nominal success is never Apply permission.
  // A failed gate is retained visibly as read-only evidence, not described as READY.
  return {ok:true,status:doc.categorized.status,uxml:doc,gate,
    sourceEquivalent:!reviewRequired,exportAllowed:false};
}

export const readCategorizedInputXmlToUxml=mapCategorizedInputXmlToUxml;

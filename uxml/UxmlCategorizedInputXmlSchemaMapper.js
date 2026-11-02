/**
 * S4.1 Categorized InputXML -> read-only UXML evidence.
 * An ORIGINAL InputXML is required before assigning any authoritative sourceRef.
 * Never reconstruct, patch, apply, or infer source-record ordinals from Line grouping.
 */
import {inputXmlToCategorizedInputXml, _test as converter} from '../xml-compare/CategorizedInputXmlConverter.js';
import {COMPONENT_TYPES, CONFIDENCE_LEVELS, SOURCE_FORMATS} from './UxmlConstants.js';
import {createUxmlComponent, createUxmlDocument, createUxmlHeader, createUxmlSource} from './UxmlTypes.js';
import {validateUxmlDocument} from './UxmlValidationGate.js';
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';

export const UXML_CATEGORIZED_INPUTXML_READER_SCHEMA='uxml-categorized-inputxml-reader/v1';
export const UXML_CATEGORIZED_INPUTXML_REFUSALS=Object.freeze({
  INVALID_CATEGORY:'CATEGORIZED_INVALID_DOCUMENT',
  SOURCE_HASH_REQUIRED:'CATEGORIZED_ORIGINAL_FILE_SHA_REQUIRED',
  SOURCE_HASH_MISMATCH:'CATEGORIZED_ORIGINAL_FILE_SHA_MISMATCH',
  ORIGINAL_ENCODING:'CATEGORIZED_ORIGINAL_ENCODING_UNSUPPORTED',
  ORIGINAL_INPUT_CONFLICT:'CATEGORIZED_ORIGINAL_INPUT_BYTES_TEXT_CONFLICT',
  ORIGINAL_STRUCTURE:'CATEGORIZED_ORIGINAL_STRUCTURE_UNSUPPORTED',
  S3_REFUSED:'CATEGORIZED_ORIGINAL_S3_REFUSED',
  S3_KEY_MISMATCH:'CATEGORIZED_S3_KEY_MISMATCH',
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
const refuse=(code,details={})=>({ok:false,code,status:'REFUSED',uxml:null,sourceEquivalent:false,exportAllowed:false,...details});
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
      // Only the projection can contain an explicit review decision.
      // A lookalike inside OriginalElement CDATA is untrusted source text.
      const projectionText=body.replace(ORIGINAL_CDATA,'');
      const markers=[...projectionText.matchAll(/<ReviewMarker\b([^>]*?)\/>/gi)];
      const explicitReview=markers.some(m=>{
        const a=attributes(m[1]);return a.kind==='DERIVED_DIFFERENCE'&&a.disposition==='REVIEW_ONLY';
      });
      const evidence=projection(projectionText.replace(/<ReviewMarker\b[^>]*\/>/gi,''));
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
/**
 * One lexical/well-formedness walk over ORIGINAL InputXML. Physical element
 * slices are recorded only at actual tags in the XML tree, never regex hits
 * inside comments, processing instructions, CDATA, DOCTYPE, or attribute text.
 * This scanner intentionally has no entity expansion, DTD processing or writer.
 */
function scanOriginalInputXmlStructure(text){
  if(typeof text!=='string')return null;
  const frames=[],physical=[];
  let rootCount=0,modelCount=0,rootClosed=false,doctypeSeen=false,xmlSeen=false;
  let cursor=0;
  const hiddenPipingElement=(start,end)=>/<PIPINGELEMENT\b/i.test(text.slice(start,end));
  const tagOpen=(start)=>{
    let quote='',end=-1;
    for(let i=start+1;i<text.length;i++){
      const char=text[i];
      if(quote){
        if(char===quote)quote='';
        else if(char==='<')return null; // raw '<' is forbidden in an attribute
      }else if(char==='"'||char==="'")quote=char;
      else if(char==='<')return null;
      else if(char==='>'){end=i;break;}
    }
    if(end<0||quote)return null;
    const raw=text.slice(start,end+1);
    const nameMatch=raw.match(/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/);
    if(!nameMatch)return null;
    const name=nameMatch[1],selfClosing=/\/\s*>$/.test(raw);
    let remaining=raw.slice(nameMatch[0].length,-1);
    if(selfClosing)remaining=remaining.replace(/\/\s*$/,'');
    const seenAttrs=new Set();
    while(remaining){
      if(!remaining.trim())break;
      const attr=remaining.match(/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/);
      if(!attr||seenAttrs.has(attr[1]))return null;
      seenAttrs.add(attr[1]);
      remaining=remaining.slice(attr[0].length);
    }
    return {name,raw,end:end+1,selfClosing};
  };
  while(cursor<text.length){
    const open=text.indexOf('<',cursor);
    const textEnd=open<0?text.length:open;
    const between=text.slice(cursor,textEnd);
    // MUTATION_GUARD_TRAILING_ROOT: outside the single document root only
    // whitespace (and explicitly accepted comments) is permitted.
    if(!frames.length&&between.trim())return null;
    if(open<0)break;
    // Comments, PI, CDATA and DTD are lexical ranges, not source records.
    if(text.startsWith('<!--',open)){
      const close=text.indexOf('-->',open+4);
      if(close<0||text.slice(open+4,close).includes('--'))return null;
      // MUTATION_GUARD_COMMENT_RANGE
      if(hiddenPipingElement(open,close+3))return null;
      cursor=close+3;continue;
    }
    if(text.startsWith('<?',open)){
      const close=text.indexOf('?>',open+2);
      if(close<0)return null;
      // MUTATION_GUARD_PI_RANGE
      if(hiddenPipingElement(open,close+2))return null;
      if(rootClosed)return null;
      const target=text.slice(open+2,close).match(/^([A-Za-z_:][\w.:-]*)/)?.[1];
      if(!target)return null;
      if(target.toLowerCase()==='xml'){
        if(target!=='xml'||xmlSeen||rootCount||doctypeSeen||frames.length)return null;
        xmlSeen=true;
      }
      cursor=close+2;continue;
    }
    if(text.startsWith('<![CDATA[',open)){
      const close=text.indexOf(']]>',open+9);
      if(close<0||!frames.length)return null;
      // MUTATION_GUARD_CDATA_RANGE
      if(hiddenPipingElement(open,close+3))return null;
      cursor=close+3;continue;
    }
    if(/^<!DOCTYPE(?=[\s>])/i.test(text.slice(open,open+10))){
      if(rootCount||frames.length||doctypeSeen)return null;
      let level=0,quote='',close=-1;
      for(let i=open+9;i<text.length;i++){
        const ch=text[i];
        if(quote){if(ch===quote)quote='';continue;}
        if(ch==='"'||ch==="'"){quote=ch;continue;}
        if(ch==='[')level++;
        else if(ch===']'){if(!level)return null;level--;}
        else if(ch==='>'&&!level){close=i+1;break;}
      }
      if(close<0)return null;
      // MUTATION_GUARD_DOCTYPE_RANGE
      if(hiddenPipingElement(open,close))return null;
      doctypeSeen=true;cursor=close;continue;
    }
    if(text.startsWith('<!',open))return null;
    if(text.startsWith('</',open)){
      const close=text.indexOf('>',open+2);
      if(close<0)return null;
      const closing=text.slice(open,close+1).match(/^<\/([A-Za-z_:][\w.:-]*)\s*>$/);
      if(!closing||!frames.length)return null;
      const current=frames[frames.length-1];
      // MUTATION_GUARD_BALANCED_TAGS
      if(current.name!==closing[1])return null;
      frames.pop();
      if(current.name==='PIPINGELEMENT'){
        physical[current.index].raw=text.slice(current.start,close+1).trim();
      }
      if(current.name==='CAESARII')rootClosed=true;
      cursor=close+1;continue;
    }
    const tag=tagOpen(open);
    if(!tag)return null;
    const {name,selfClosing,end}=tag;
    if(!frames.length){
      // MUTATION_GUARD_SINGLE_ROOT
      if(name!=='CAESARII'||rootCount||rootClosed||selfClosing)return null;
      rootCount++;
    }else if(name==='CAESARII')return null;
    if(name==='PIPINGMODEL'){
      // MUTATION_GUARD_SINGLE_MODEL
      if(modelCount||frames.length!==1||frames[0].name!=='CAESARII'||selfClosing)return null;
      modelCount++;
    }
    // A direct model child other than a physical PIPINGELEMENT is uncarried
    // source structure. Refuse PLB314's trailing UNITS before any binding.
    // MUTATION_GUARD_MODEL_CHILD_KIND
    if(frames.length===2&&frames[1].name==='PIPINGMODEL'&&
       name!=='PIPINGELEMENT')return null;
    if(name==='PIPINGELEMENT'){
      // MUTATION_GUARD_DIRECT_CHILD: no records in wrapper/outer sections.
      if(frames.length!==2||frames[0].name!=='CAESARII'||
         frames[1].name!=='PIPINGMODEL')return null;
      const index=physical.length;
      physical.push({index,start:open,open:tag.raw,selfClosing,
        raw:selfClosing?tag.raw.trim():null});
      if(!selfClosing)frames.push({name,start:open,index});
    }else if(!selfClosing)frames.push({name,start:open});
    cursor=end;
  }
  // MUTATION_GUARD_TREE_COMPLETE
  if(frames.length||rootCount!==1||modelCount!==1||!rootClosed||!physical.length)return null;
  return physical;
}
function physicalSourceRows(text){
  const tokens=scanOriginalInputXmlStructure(text);
  if(!tokens)return null;
  const physical=tokens.map((tag,index)=>{
    const raw=tag.raw,open=tag.open;
    const attrs=attributes(open);
    const key=identity(attrs,index);
    const elementSelfClosing=tag.selfClosing;
    if(!key||!(elementSelfClosing?raw===clean(open):/<\/PIPINGELEMENT>\s*$/i.test(raw)))
      return null;
    return {raw:clean(raw),attrs,...key,
      lineId:clean(attrs.LINE_ID||attrs['PIPELINE-REFERENCE']||'UNSPECIFIED_LINE'),
      elementKey:nodeKey(key.from)+'->'+nodeKey(key.to)};
  });
  return physical.some(row=>row===null)?null:physical;
}
// A read-only test seam to validate structural refusals independently of the
// pre-existing S3 reader (whose own comment handling is a separate issue).
export const _testCategorizedSourceStructure=Object.freeze({scanOriginalInputXmlStructure});
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
  options=options??{};
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
  // MUTATION_GUARD_SHA_REQUIRED
  if(!/^[a-f0-9]{64}$/i.test(clean(options.fileSha256)))
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.SOURCE_HASH_REQUIRED);
  // Neither representation silently overrides a conflicting original.
  if(options.originalBytes!==undefined&&options.originalInputXml!==undefined){
    if(!(options.originalBytes instanceof Uint8Array)||
       typeof options.originalInputXml!=='string')
      return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_ENCODING);
    const encoded=new TextEncoder().encode(options.originalInputXml);
    if(encoded.length!==options.originalBytes.length||
       encoded.some((byte,index)=>byte!==options.originalBytes[index]))
      return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_INPUT_CONFLICT);
  }
  const supplied=await sourceBytes(options);
  if(!supplied)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_ENCODING);
  const measured=await digestSha256(supplied.bytes);
  // MUTATION_GUARD_SHA256
  if(measured!==clean(options.fileSha256).toLowerCase())
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.SOURCE_HASH_MISMATCH);
  const originalRows=physicalSourceRows(supplied.text);
  // MUTATION_GUARD_ORIGINAL_STRUCTURE
  if(!originalRows)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_STRUCTURE);
  // S4.1 may never bind a source that the canonical strict S3 reader refuses.
  // S3 is called read-only and unchanged; named refusal carries its error code.
  let s3Agreement;
  try {
    const strict=mapCaesarInputXmlToUxmlStrict(supplied.text,{fileSha256:measured});
    s3Agreement={ok:true,keys:strict.components.map(c=>c.sourceRefs?.[0]?.recordKey)};
  } catch(error) {
    s3Agreement={ok:false,s3Code:String(error?.message||'INPUT_XML_UNKNOWN_REFUSAL').split(':')[0]};
  }
  // MUTATION_GUARD_S3_REFUSAL
  if(!s3Agreement.ok)
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.S3_REFUSED,{s3Code:s3Agreement.s3Code});

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
  const s41Keys=matches.map(({original})=>original.recordKey);
  const s3Keys=s3Agreement.keys;
  // MUTATION_GUARD_S3_KEY_SET: compare complete multisets, not just counts.
  const matchesStrictS3KeySet=Array.isArray(s3Keys)&&s3Keys.length===s41Keys.length&&
    new Set(s3Keys).size===s3Keys.length&&
    new Set(s41Keys).size===s41Keys.length&&
    s3Keys.every(key=>s41Keys.includes(key))&&
    s41Keys.every(key=>s3Keys.includes(key));
  if(!matchesStrictS3KeySet)
    return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.S3_KEY_MISMATCH);

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
  // MUTATION_GUARD_UXML_GATE: source-bound UXML is all-or-nothing.
  // Unlike unbound evidence-only mode, a failed shared gate has NO UXML output.
  if(!gate.ready)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.GATE_REJECTED);
  // Even a passing shared gate never authorizes Apply or patch-back.
  return {ok:true,status:doc.categorized.status,uxml:doc,gate,
    sourceEquivalent:!reviewRequired,exportAllowed:false};
}

export const readCategorizedInputXmlToUxml=mapCategorizedInputXmlToUxml;

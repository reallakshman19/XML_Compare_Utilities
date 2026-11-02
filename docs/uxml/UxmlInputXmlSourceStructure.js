/**
 * Shared InputXML original-byte structural admission for read-only S3/S4.1.
 * One lexical pass; refuses ghost records in comments, PI, CDATA, DOCTYPE.
 * Zero XML reconstruction, entity expansion, network, mutation, new dependencies.
 * A non-null result is a structural witness, not authorization to apply edits.
 */
/**
 * One lexical/well-formedness walk over ORIGINAL InputXML. Physical element
 * slices are recorded only at actual tags in the XML tree, never regex hits
 * inside comments, processing instructions, CDATA, DOCTYPE, or attribute text.
 * This scanner intentionally has no entity expansion, DTD processing or writer.
 */
export function scanOriginalInputXmlStructure(text,{recordsOnlyModel=false}={}){
  // Strict S3 and S4.1 both use the default that admits legitimate non-row
  // model children such as CAESAR II <UNITS>. An optional recordsOnlyModel
  // mode remains for explicit restrictive callers. Neither mode relaxes
  // source-record direct-child nor any lexical/root/ghost guard.
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
      // XML reserves all PI targets beginning with xml, regardless of case.
      // <?xml-foo?> must not bypass the special XML declaration rules.
      // MUTATION_GUARD_RESERVED_XML_PI
      if(target.toLowerCase().startsWith('xml')){
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
    // MUTATION_GUARD_MODEL_CHILD_KIND
    // Only explicit recordsOnlyModel callers disallow non-record direct model
    // children; strict S3 and S4.1 both admit legitimate UNITS siblings.
    // Every nested PIPINGELEMENT remains forbidden in either mode.
    if(recordsOnlyModel&&frames.length===2&&frames[1].name==='PIPINGMODEL'&&
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


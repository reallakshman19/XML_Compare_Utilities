// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8SourceModel(deps){
  const {externalTags}=deps;
  const clean=(...a)=>deps.clean(...a); const normalizeExternalNode=(...a)=>deps.normalizeExternalNode(...a); const externalNodeField=(...a)=>deps.externalNodeField(...a);
function categorizedItems(text){
  const items=[],lineIds=[],lines=/<Line\b([^>]*)>([\s\S]*?)<\/Line>/gi;
  let line;
  while((line=lines.exec(text))){
    const id=line[1].match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(id===undefined)return null;
    lineIds.push(id);
    const re=/<Element\b([^>]*)>([\s\S]*?)<\/Element>/gi;
    let item;
    while((item=re.exec(line[2]))){
      const open=item[1];
      const snapshot=item[2].match(/<OriginalElement>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/OriginalElement>/i);
      if(!snapshot)return null;
      const attrs={};
      for(const match of open.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g))attrs[match[1]]=match[3];
      const identity=[id,attrs.fromNode,attrs.toNode,attrs.elementKey];
      if(identity.some(x=>x===undefined))return null;
      items.push({identity,open,snapshot:clean(snapshot[1].replaceAll(']]]]><![CDATA[>',']]>'))});
    }
  }
  if(!items.length||!lineIds.length)return null;
  if((text.match(/<Element\b/gi)||[]).length!==items.length ||
     (text.match(/<Line\b/gi)||[]).length!==lineIds.length)return null;
  return {items,lineIds};
}
// Attribute-value lexer: offsets are UTF-16 character indices within a
// previously admitted physical record, never a regex substring guess in file.
// A masked whole-row skeleton proves no tag/order/text/attribute-quote edits.
function lexRow(raw){
  const attrs=[],stanzas=[],stack=[],masked=[];
  let cursor=0;
  while(cursor<raw.length){
    const open=raw.indexOf('<',cursor);
    if(open<0){masked.push(raw.slice(cursor));break;}
    masked.push(raw.slice(cursor,open));
    if(raw.startsWith('<!--',open)){
      const end=raw.indexOf('-->',open+4);
      if(end<0)return null;
      masked.push(raw.slice(open,end+3));cursor=end+3;continue;
    }
    if(raw.startsWith('<![CDATA[',open)){
      const end=raw.indexOf(']]>',open+9);
      if(end<0)return null;
      masked.push(raw.slice(open,end+3));cursor=end+3;continue;
    }
    let end=-1,quote='';
    for(let i=open+1;i<raw.length;i++){
      const ch=raw[i];
      if(quote){if(ch===quote)quote='';}
      else if(ch==='"'||ch==="'")quote=ch;
      else if(ch==='>'){end=i+1;break;}
      else if(ch==='<')return null;
    }
    if(end<0||quote)return null;
    const tag=raw.slice(open,end);
    if(tag.startsWith('</')){
      const match=tag.match(/^<\/([A-Za-z_:][\w.:-]*)\s*>$/);
      const parent=stack.pop();
      if(!match||parent?.name!==match[1])return null;
      stanzas[parent.index].end=end;
      masked.push(tag);cursor=end;continue;
    }
    const match=tag.match(/^<([A-Za-z_:][\w.:-]*)(?=[\s/>])/);
    if(!match)return null;
    const name=match[1],selfClosing=/\/\s*>$/.test(tag),depth=stack.length;
    const attributeLimit=tag.length-(selfClosing?2:1);
    // The editor uses the XML-aware physical stanza for byte ownership.
    // S4.0's loose raw-text grouping is independently checked before output.
    const stanza={name,depth,parentIndex:stack.at(-1)?.index??null,
      start:open,end:selfClosing?end:null,attributes:[]};
    const stanzaIndex=stanzas.length;
    stanzas.push(stanza);
    let pos=match[0].length,prefix=0;
    while(pos<attributeLimit){
      if(!tag.slice(pos,attributeLimit).trim())break;
      // Quote values may contain the other quote; the real delimiter is
      // handled by the quote-aware robust parser immediately below.
      const robust=tag.slice(pos,attributeLimit).match(/^\s+([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/);
      if(!robust)return null;
      const token=robust[0],attrName=robust[1],quot=token.match(/(["'])/)?.[1];
      const value=robust[3]??robust[4]??'';
      const prefixBeforeValue=token.slice(0,token.indexOf(quot)+1);
      const valueStart=pos+prefixBeforeValue.length,valueEnd=valueStart+value.length;
      masked.push(tag.slice(prefix,valueStart),'\u0001');
      const attr={name:attrName,tagName:name,depth,stanzaIndex,quote:quot,
        value,start:open+valueStart,end:open+valueEnd};
      attrs.push(attr);
      stanza.attributes.push(attr);
      prefix=valueEnd;
      pos+=token.length;
    }
    masked.push(tag.slice(prefix));
    if(!selfClosing)stack.push({name,index:stanzaIndex});
    cursor=end;
  }
  if(stack.length)return null;
  return {masked:masked.join(''),attrs,stanzas};
}
function decodeValue(raw){
  if(/<|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw))return null;
  if(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(raw))return null;
  let invalid=false;
  const value=raw.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,match=>{
    const token=match.slice(1,-1),entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if(token[0]==='#'){
      const n=token[1]?.toLowerCase()==='x'?parseInt(token.slice(2),16):parseInt(token.slice(1),10);
      if(!Number.isInteger(n)||n===0||n>0x10ffff||(n>=0xd800&&n<=0xdfff)){invalid=true;return '';}
      return String.fromCodePoint(n);
    }
    return entities[token.toLowerCase()]??(invalid=true,'');
  });
  return invalid?null:value;
}
function encodeValue(value,quote){
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,quote==='"'?'&quot;':'"')
    .replace(/'/g,quote==="'"?'&apos;':"'");
}
function stanzaOwner(stanza){
  const ownerField=externalNodeField(stanza.name.toUpperCase());
  // ALLOWABLESTRESS and other globally carried stanzas have no
  // unique per-node identity in S4.0; editing them is not slice-1 safe.
  if(!ownerField)return null;
  const attr=stanza.attributes.find(a=>a.name.toUpperCase()===ownerField);
  if(!attr)return null;
  const decoded=decodeValue(attr.value);
  if(decoded===null||!clean(decoded))return null;
  const n=Number(clean(decoded));
  // Match S4.0's sentinel and numeric-node admission.
  if(!Number.isFinite(n)||Math.abs(n+1.0101)<1e-4)return null;
  return normalizeExternalNode(decoded);
}
function countStanzaOwners(lexedRows,tag,owner,rowIndex=-1,replacement=null){
  let count=0;
  for(let i=0;i<lexedRows.length;i++){
    const row=i===rowIndex&&replacement?replacement:lexedRows[i];
    if(!row)return null;
    for(const stanza of row.stanzas){
      if(stanza.depth!==1||stanza.name.toUpperCase()!==tag)continue;
      if(stanzaOwner(stanza)===owner)count++;
    }
  }
  return count;
}
function sharedExternal(lexedRows,rowIndex,before,after,editedRow){
  const tag=before.name.toUpperCase();
  if(!externalTags.has(tag))return false;
  // MUTATION_GUARD_STANZA_OWNER_LEX: use exactly the stanza containing the
  // changed field; never infer ownership from the edited attribute ordinal
  // or count arbitrary <TAG> text inside an XML comment.
  const oldOwner=stanzaOwner(before),newOwner=stanzaOwner(after);
  if(!oldOwner||!newOwner)return true;
  // MUTATION_GUARD_NUMERIC_OWNER: 20 and 20.0 are one S4.0 grouping node.
  if(oldOwner!==newOwner)return true;
  // S4.0 groups SIF only within the one physical element body.
  // The global S4.0 before/after block check remains mandatory below.
  if(tag==='SIF')return false;
  // MUTATION_GUARD_BEFORE_AND_AFTER_OWNERSHIP: enforce unique ownership
  // against both the original and the proposed edited source tree.
  return countStanzaOwners(lexedRows,tag,oldOwner)!==1||
    countStanzaOwners(lexedRows,tag,newOwner,rowIndex,editedRow)!==1;
}
// S4.0 grouping source of truth: use the converter's exported *same*
// regex / attrsOf / activeBlock functions, not a competing XML lexer.
// splitLooseBlocks intentionally sees nested, comment and CDATA lookalikes.
// S4.2 must refuse rather than silently 'repair' that projection authority.
const s40HarvestTagNames='RESTRAINT|DISPLACEMENTS|FORCESMOMENTS|ALLOWABLESTRESS|SIF';
const harvestLookalike=new RegExp('<(?:'+s40HarvestTagNames+')(?=[\\s/>])','i');
const commentOrCdata=/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
  return {categorizedItems,lexRow,decodeValue,encodeValue,stanzaOwner,countStanzaOwners,sharedExternal,s40HarvestTagNames,harvestLookalike,commentOrCdata};
}

// B8 mechanical source extraction; source-bound logic unchanged.
export function createB8SourceIntegrity(deps){
  const {s40,UXML_CATEGORIZED_PATCH_REFUSALS,identityFields,externalTags,externalControlAttrs}=deps;
  const normalizeExternalNode=(...a)=>deps.normalizeExternalNode(...a); const lexRow=(...a)=>deps.lexRow(...a); const decodeValue=(...a)=>deps.decodeValue(...a); const encodeValue=(...a)=>deps.encodeValue(...a); const stanzaOwner=(...a)=>deps.stanzaOwner(...a);
  const sharedExternal=(...a)=>deps.sharedExternal(...a); const {harvestLookalike,commentOrCdata}=deps;
function hasAmbiguousSourceMarkup(text,rows){
  // MUTATION_GUARD_S40_HIDDEN_MARKUP: S4.0's raw regex also harvests
  // '<RESTRAINT' etc inside comments or CDATA, even when lexRow skips them.
  if(([...text.matchAll(commentOrCdata)]).some(x=>harvestLookalike.test(x[0])))
    return true;
  // MUTATION_GUARD_S40_NESTED_HARVEST: S4.0 sees child-of-BEND/RIGID.
  for(const row of rows){
    const lexed=lexRow(row.raw);
    if(!lexed||lexed.stanzas.some(stanza=>
      stanza.depth>1&&externalTags.has(stanza.name.toUpperCase())))return true;
  }
  return false;
}
function ambiguousStanzaAttributes(stanza){
  const seen=new Set();
  for(const attr of stanza.attributes){
    const key=attr.name.toLowerCase();
    // MUTATION_GUARD_S40_CASE_ALIAS: S4.0 attrsOf is exact-case,
    // last exact spelling wins; mixed-case duplicates create two views.
    if(seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function s40ActiveOwnedBlocks(text,tag,owner){
  const blocks=s40.splitLooseBlocks(text,tag);
  return blocks.filter(block=>{
    if(!(tag==='SIF'?s40.activeSifBlock(block):s40.activeNodeBlock(block)))
      return false;
    // s40.attrsOf uses case-sensitive property names with last-wins
    // semantics; no case-insensitive first-match attribute lookup.
    const attrs=s40.attrsOf(block);
    const name=tag==='RESTRAINT'||tag==='SIF'?'NODE':'NODE_NUM';
    return normalizeExternalNode(attrs[name])===owner;
  });
}
function s40ExclusiveBlock(original,patched,originalRows,patchedRows,externalEdits){
  if(!externalEdits.length)return true;
  if(hasAmbiguousSourceMarkup(original,originalRows)||
     hasAmbiguousSourceMarkup(patched,patchedRows))return false;
  for(const edit of externalEdits){
    const {tag,owner,oldBlock,newBlock,rowIndex}=edit;
    const initial=tag==='SIF'?originalRows[rowIndex]?.raw:original;
    const final=tag==='SIF'?patchedRows[rowIndex]?.raw:patched;
    if(!initial||!final)return false;
    const originalBlocks=s40ActiveOwnedBlocks(initial,tag,owner);
    const patchedBlocks=s40ActiveOwnedBlocks(final,tag,owner);
    // MUTATION_GUARD_S40_EXACT_BLOCK: not just count=1, the exact
    // block s40 harvested MUST be the stanza whose value is being edited.
    if(originalBlocks.length!==1||patchedBlocks.length!==1||
       originalBlocks[0]!==oldBlock||patchedBlocks[0]!==newBlock)
      return false;
  }
  return true;
}
function diffRows(oldRaw,newRaw,rowIndex,lexedRows){
  const old=lexRow(oldRaw),next=lexRow(newRaw);
  if(!old||!next||old.masked!==next.masked||old.attrs.length!==next.attrs.length)
    return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
  const changes=[];
  for(let i=0;i<old.attrs.length;i++){
    const before=old.attrs[i],after=next.attrs[i];
    if(before.name!==after.name||before.tagName!==after.tagName||
       before.depth!==after.depth||before.quote!==after.quote)
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.STRUCTURE};
    if(before.value===after.value)continue;
    // UNITS can occur as an actual child (or ancestor of an edited child)
    // inside PIPINGELEMENT, not just as a model-level sibling.
    let unit=old.stanzas[before.stanzaIndex];
    while(unit){
      if(unit.name.toUpperCase()==='UNITS')
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.UNITS};
      unit=unit.parentIndex===null?null:old.stanzas[unit.parentIndex];
    }
    // MUTATION_GUARD_NESTED_ATTRIBUTE: slice 1 allows only a source record
    // or its direct child stanza, never a descendant's attribute.
    if(before.depth>1)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.NESTED};
    if(before.depth===0&&identityFields.has(before.name.toUpperCase()))
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.IDENTITY};
    const oldValue=decodeValue(before.value),newValue=decodeValue(after.value);
    if(oldValue===null||newValue===null)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    // XML whitespace normalization would change TAB/CR/LF semantics.
    // Slice 1 refuses both literal and character-reference forms.
    // MUTATION_GUARD_ATTRIBUTE_CONTROL_WHITESPACE
    if(/[\t\r\n]/.test(newValue))
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    const encoded=encodeValue(newValue,before.quote);
    // XML 1.0 permits literal '>' in an attribute value. Preserve it as
    // authored so S4.0's byte-exact OriginalElement CDATA also agrees.
    if(after.value.replace(/>/g,'&gt;')!==encoded)
      return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};
    if(before.depth===1&&externalTags.has(before.tagName.toUpperCase())){
      // MUTATION_GUARD_EXTERNAL_CONTROL_IDENTITY: block *all* S4.0 node
      // grouping/control references, including NODE->other/sentinel moves.
      if(externalControlAttrs.has(before.name.toUpperCase()))
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.IDENTITY};
      const beforeStanza=old.stanzas[before.stanzaIndex];
      const afterStanza=next.stanzas[after.stanzaIndex];
      // MUTATION_GUARD_SHARED_EXTERNAL_OWNERSHIP: identify the SAME lexed
      // stanza before and after, ignoring any comment-hidden tag lookalikes.
      if(!beforeStanza||!afterStanza||
         sharedExternal(lexedRows,rowIndex,beforeStanza,afterStanza,next)||
         ambiguousStanzaAttributes(beforeStanza)||
         ambiguousStanzaAttributes(afterStanza))
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.EXTERNAL};
      const oldBlock=oldRaw.slice(beforeStanza.start,beforeStanza.end);
      const newBlock=newRaw.slice(afterStanza.start,afterStanza.end);
      const owner=stanzaOwner(beforeStanza);
      if(!owner||!oldBlock||!newBlock)
        return {error:UXML_CATEGORIZED_PATCH_REFUSALS.EXTERNAL};
      changes.push({start:before.start,end:before.end,oldRaw:before.value,
        newRaw:after.value,old:oldValue,new:newValue,
        field:before.tagName+'.'+before.name,
        external:{tag:before.tagName.toUpperCase(),owner,oldBlock,newBlock,rowIndex}});
      continue;
    }
    changes.push({start:before.start,end:before.end,oldRaw:before.value,
      newRaw:after.value,old:oldValue,new:newValue,field:before.tagName+'.'+before.name});
  }
  return {changes};
}
  return {hasAmbiguousSourceMarkup,ambiguousStanzaAttributes,s40ActiveOwnedBlocks,s40ExclusiveBlock,diffRows};
}

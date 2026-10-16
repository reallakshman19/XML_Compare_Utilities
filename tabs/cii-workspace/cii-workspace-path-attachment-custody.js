/**
 * Issue #106: fail-closed attachment custody for comparison-only PIPE paths.
 * A missing element/auxiliary pointer, parse conflict or unparsed MISCEL_1
 * never proves that a node is devoid of functional engineering attachments.
 */
export function buildCiiComparisonAttachmentEvidenceByNode(document, graph) {
  const aux=document?.auxiliaryEvidence;
  const elements=document?.parsed?.elements||[];
  const families=document?.capabilities?.families||{};
  const eligible=Boolean(aux && Array.isArray(elements) && Array.isArray(graph?.edges)
    && Array.isArray(graph?.nodes)
    && Array.isArray(aux.conflicts) && aux.conflicts.length===0
    && Number(aux.rawElementBlockCount)===elements.length
    && Number(aux.mappedElementCount)===elements.length
    && Number(aux.miscel1SectionRowCount)===0
    && !['restraints','rigidMass','sifTee'].some(x=>families[x]?.state==='PARSE_ERROR')
    && families?.hangers?.raw?.present!==true);
  const byNode={};
  const pointers=['bend','rigid','restraint','sifTee','nodeName','reducer'];
  for(const n of graph?.nodes||[]){
    const id=String(n.id), edges=graph?.adjacency?.get(id)||[];
    const local=[];
    if(!eligible) local.push('GLOBAL_AUXILIARY_CUSTODY_INCOMPLETE');
    if(edges.length!==2) local.push('NOT_DEGREE_TWO');
    if(aux?.restraints?.byNode?.[id]?.length) local.push('BOUND_RESTRAINT');
    if((aux?.sifTee?.byPointer||{}) && Object.values(aux.sifTee.byPointer).some(x=>String(x?.node)===id)) local.push('BOUND_SIF_TEE');
    for(const edge of edges){
      const e=aux?.elements?.[Number(edge.parsedElementIndex)];
      if(!e || !e.pointers || pointers.some(k=>!Number.isSafeInteger(e.pointers[k])||e.pointers[k]<0)) {
        local.push('UNQUALIFIED_ELEMENT_POINTER'); continue;
      }
      if(['bend','rigid','restraint','sifTee','reducer'].some(k=>e.pointers[k]>0)) local.push('POINTER_BOUND_COMPONENT_OR_RESTRAINT');
      if(edge.componentKind!=='PIPE') local.push('NON_PIPE_COMPONENT');
    }
    const blockers=[...new Set(local)];
    byNode[id]=Object.freeze({
      state:blockers.length?'UNKNOWN_OR_ATTACHED':'VERIFIED_EMPTY',
      complete:blockers.length===0,
      blockers:Object.freeze(blockers),
    });
  }
  return Object.freeze(byNode);
}

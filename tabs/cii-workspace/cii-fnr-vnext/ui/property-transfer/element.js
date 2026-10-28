/* Path A: Node -> oriented Element -> typed stored data; read-only only. */
import { normalizedNode } from './cii-index.js';
export const ELEMENT_FAMILIES=Object.freeze(['PROCESS','GEOMETRY','MATERIAL',
  'INSULATION','RIGID','BEND','SIF_TEE','REDUCER','EXPANSION_JOINT']);
function find(doc,from,to) {
  if(!doc) return [];
  return doc.elements.filter(e=>e.from===from && e.to===to);
}
export function inspectElementPair(source,target,selector) {
  const sf=selector.sourceFrom?normalizedNode(selector.sourceFrom):null;
  const st=selector.sourceTo?normalizedNode(selector.sourceTo):null;
  const tf=normalizedNode(selector.targetFrom),tt=normalizedNode(selector.targetTo);
  if((sf===null)!==(st===null)) throw Error('PROPERTY_SOURCE_PAIR_INCOMPLETE');
  const src=sf===null?[]:find(source,sf,st),dst=find(target,tf,tt);
  return {mode:'NODE_ELEMENT_DATA',mapping:'UNVERIFIED_READ_ONLY',
    source:{from:sf,to:st,entries:src},
    target:{from:tf,to:tt,entries:dst},
    reviewRequired:src.length!==1||dst.length!==1,
    reason:dst.length!==1?'TARGET_ELEMENT_NOT_UNIQUE':
      src.length>1?'SOURCE_ELEMENT_NOT_UNIQUE':
      sf!==null&&src.length===0?'SOURCE_ELEMENT_NOT_FOUND':
      'EXPLICIT_SOURCE_TARGET_ELEMENT_IDENTITY_NOT_PROVEN',
    writeEligible:false};
}

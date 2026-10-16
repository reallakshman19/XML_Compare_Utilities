/**
 * Owner Phase 2: exact ORIGINAL CII NodeName => physical NODE index.
 *
 * IMPORTANT: NODE identity and NODENAME text occupy different namespaces.
 * Build the inverse map from the independent fixed-field ELEMENTS NODENAME
 * pointer parser; keep member custody and non-unique labels explicit.
 * This module belongs under tests/ and MUST NOT be imported by production.
 */
import { parseIndependentNodeNameState } from './cii-workspace-multisource-texpected-oracle.js';

const stable=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const freeze=Object.freeze;
const exact=value=>String(value??'');
function indexed(raw,sourceId) {
  const original=typeof raw==='string'?raw:Buffer.from(raw).toString('latin1');
  const parsed=parseIndependentNodeNameState(original);
  if(parsed.conflicts.length)throw new Error('OWNER_PHASE2_ORIGINAL_NODENAME_CONFLICT:'+sourceId+':'+parsed.conflicts.length);
  const byName=new Map();
  for(const [nodeId,name] of parsed.names) {
    if(!name)continue;
    if(!byName.has(name))byName.set(name,[]);
    byName.get(name).push(freeze({sourceId,nodeId:String(nodeId),nodeName:name}));
  }
  for(const rows of byName.values())rows.sort((a,b)=>stable(a.nodeId,b.nodeId));
  return {byName,namedPhysicalNodeCount:parsed.names.size,rawElements:parsed.elements.length,
    physicalElementEndpointIds:freeze([...new Set(parsed.elements.flatMap(e=>[e.from,e.to]))]),
    duplicateNodeNames:freeze([...byName].filter(([,rows])=>rows.length>1).map(([name,rows])=>freeze({
      name,nodeIds:freeze(rows.map(r=>r.nodeId)),
    }))),physicalNodeNameRowCount:parsed.physicalNodeNameRowCount};
}
function merge(map,toMerge) {
  for(const [label,rows] of toMerge) {
    if(!map.has(label))map.set(label,[]);
    map.get(label).push(...rows);
  }
}
export function buildCiiOwnerOriginalNodeNameIndexes(sources,targetRaw) {
  const sourceByName=new Map(),sourceStats=[];
  for(const member of sources) {
    if(!member.sourceId)throw Error('OWNER_PHASE2_SOURCE_MEMBER_REQUIRED');
    const source=indexed(member.bytes??member.raw,member.sourceId);
    merge(sourceByName,source.byName);
    sourceStats.push(freeze({
      sourceId:member.sourceId,
      physicalNodeCount:source.physicalElementEndpointIds.length,
      namedPhysicalNodeCount:source.namedPhysicalNodeCount,
      uniqueNodeNames:source.byName.size,
      duplicateNodeNames:source.duplicateNodeNames,
      originalElementCount:source.rawElements,
    }));
  }
  const target=indexed(targetRaw,'T');
  for(const rows of sourceByName.values())rows.sort((a,b)=>stable(a.sourceId,b.sourceId)||stable(a.nodeId,b.nodeId));
  return {
    sourceByName,targetByName:target.byName,
    sourceStats:freeze(sourceStats),
    targetStats:freeze({
      physicalNodeCount:target.physicalElementEndpointIds.length,
      namedPhysicalNodeCount:target.namedPhysicalNodeCount,
      uniqueNodeNames:target.byName.size,
      duplicateNodeNames:target.duplicateNodeNames,
      originalElementCount:target.rawElements,
    }),
  };
}
function resolution(left,right,sourceByName,targetByName) {
  const sourceRows=sourceByName.get(exact(left))||[];
  const targetRows=targetByName.get(exact(right))||[];
  const candidates=sourceRows.flatMap(source=>targetRows.map(target=>freeze({
    sourceMemberId:source.sourceId,sourcePhysicalNodeId:source.nodeId,
    sourceNodeName:source.nodeName,targetPhysicalNodeId:target.nodeId,targetNodeName:target.nodeName,
  })));
  return freeze({
    sourceLookupCount:sourceRows.length,targetLookupCount:targetRows.length,
    sourceMembers:freeze([...new Set(sourceRows.map(x=>x.sourceId))]),
    sourceNodeIds:freeze(sourceRows.map(x=>x.sourceId+':'+x.nodeId)),
    targetNodeIds:freeze(targetRows.map(x=>x.nodeId)),
    uniquePhysicalPair:candidates.length===1,
    candidatePairs:freeze(candidates),
    status:!sourceRows.length?'SOURCE_NODENAME_NOT_FOUND':
      !targetRows.length?'TARGET_NODENAME_NOT_FOUND':
      candidates.length===1?'UNIQUE_PHYSICAL_PAIR_FROM_OWNER_NODENAME':
      'AMBIGUOUS_NODENAME_CARDINALITY',
  });
}
export function resolveCiiOwnerPhase2RowsByOriginalNodeName(ownerRows,indexes,options={}) {
  const rows=ownerRows.map((owner,i)=>freeze({
    ...owner,ownerOrdinal:owner.ordinal??i+1,
    // Preserve original column text while separately honoring the verified
    // Owner semantic direction. Never rewrite original raw Owner bytes.
    declared:resolution(owner.rawSourceLabel,owner.rawTargetLabel,indexes.sourceByName,indexes.targetByName),
    // An independent cross-check, NOT permission to silently transpose Owner input.
    transposedDiagnostic:resolution(owner.rawTargetLabel,owner.rawSourceLabel,indexes.sourceByName,indexes.targetByName),
    ownerDirection:options.ownerConfirmedSlSourceToPsTarget===true
      ? 'OWNER_CONFIRMED_SL_SOURCE_TO_PS_TARGET' : 'UNCONFIRMED_RAW_PS_TO_SL',
    benchmarkPhysicalIdentityCertified:false,
  }));
  const summary=key=>{
    const scored=rows.map(r=>r[key]);
    return freeze({
      rows:scored.length,sourceNameFound:scored.filter(r=>r.sourceLookupCount>0).length,
      targetNameFound:scored.filter(r=>r.targetLookupCount>0).length,
      bothNamesFound:scored.filter(r=>r.sourceLookupCount>0&&r.targetLookupCount>0).length,
      uniquelyResolvedPairs:scored.filter(r=>r.uniquePhysicalPair).length,
      ambiguousPairs:scored.filter(r=>r.candidatePairs.length>1).length,
      noSourceName:scored.filter(r=>!r.sourceLookupCount).length,
      noTargetName:scored.filter(r=>!r.targetLookupCount).length,
    });
  };
  return freeze({
    schema:'CiiOwnerPhase2OriginalNodeNameResolution.v1',
    sourceStats:indexes.sourceStats,targetStats:indexes.targetStats,
    originalRowCount:rows.length,
    asDeclared:summary('declared'),transposedDiagnostic:summary('transposedDiagnostic'),
    ownerDirectionReinterpretationAuthorized:options.ownerConfirmedSlSourceToPsTarget===true,
    authoritativePhysicalPairLookup:options.ownerConfirmedSlSourceToPsTarget===true
      ?'transposedDiagnostic':'UNRATIFIED',
    physicalCorrespondenceValidated:false,
    rows:freeze(rows),
  });
}

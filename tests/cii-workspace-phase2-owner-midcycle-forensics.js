/**
 * Test-only W9.1 complete original NodeName physical occurrence reconciliation.
 * This never enters production matching, confidence or Writer2.
 */
const frozen=Object.freeze;
const physicalKey=(p)=>[p.sourceMemberId,p.sourcePhysicalNodeId,p.targetPhysicalNodeId].join('|');
const numericSort=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
function statusOf(candidate){
  if(!candidate.sourceLookupCount && !candidate.targetLookupCount)return 'BOTH_ORIGINAL_NODENAMES_NOT_FOUND';
  if(!candidate.sourceLookupCount)return 'SOURCE_ORIGINAL_NODENAME_NOT_FOUND';
  if(!candidate.targetLookupCount)return 'TARGET_ORIGINAL_NODENAME_NOT_FOUND';
  if(candidate.sourceLookupCount>1&&candidate.targetLookupCount>1)return 'SOURCE_AND_TARGET_NODENAME_DUPLICATE';
  if(candidate.sourceLookupCount>1)return 'SOURCE_NODENAME_AMBIGUOUS';
  if(candidate.targetLookupCount>1)return 'TARGET_NODENAME_AMBIGUOUS';
  return 'UNIQUE_ORIGINAL_PHYSICAL_PAIR_CANDIDATE';
}
function orientation(rows,key,orientation){
  const observed=rows.map(row=>{
    const raw=row[key];
    const physicalSourceName=orientation==='AS_WRITTEN'?row.rawSourceLabel:row.rawTargetLabel;
    const physicalTargetName=orientation==='AS_WRITTEN'?row.rawTargetLabel:row.rawSourceLabel;
    const reason=statusOf(raw);
    const options=raw.candidatePairs.map(pair=>({
      ...pair,
      physicalKey:physicalKey(pair),
    }));
    const solverAgrees=orientation==='AS_WRITTEN'?
      row.legacyBoundAndLabelAgreement===true:row.transposedLegacyBoundAndLabelAgreement===true;
    return frozen({
      ownerOrdinal:row.ownerOrdinal,
      sourceOriginalLine:row.originalLine,
      originalSourceLabel:row.rawSourceLabel,originalTargetLabel:row.rawTargetLabel,
      physicalSourceName,physicalTargetName,
      interpretation:orientation,reasonCode:reason,
      sourceMemberCandidates:raw.sourceMembers,
      sourceOccurrenceKeys:raw.sourceNodeIds,
      targetOccurrenceIds:raw.targetNodeIds,
      candidatePairs:frozen(options.map(frozen)),
      exactlyOneCandidate:raw.uniquePhysicalPair,
      existingAutoSolverAgreement:solverAgrees,
      note:solverAgrees?'AUTO_BOUND_MATCHES_NAME_RESOLVED_PAIR_NOT_A_PHYSICAL_CERTIFICATE':'NO_AUTO_AGREEMENT_OR_UNRESOLVED_NAME',
    });
  });
  const groups={};
  for(const row of observed)groups[row.reasonCode]=(groups[row.reasonCode]||0)+1;
  const unique=observed.filter(row=>row.exactlyOneCandidate);
  const byPhysicalKey=new Map();
  for(const row of unique){
    const key=row.candidatePairs[0].physicalKey;
    if(!byPhysicalKey.has(key))byPhysicalKey.set(key,[]);
    byPhysicalKey.get(key).push(row.ownerOrdinal);
  }
  const pairReuse=[...byPhysicalKey].filter(([,ord])=>ord.length>1)
    .map(([physicalKey,ownerOrdinals])=>frozen({physicalKey,ownerOrdinals:frozen(ownerOrdinals)}));
  const sourceMemberStats={};
  for(const row of unique){
    const id=row.candidatePairs[0].sourceMemberId;
    if(!sourceMemberStats[id])sourceMemberStats[id]={uniqueOriginalNamePairs:0,autoSolverAgreements:0,distinctPhysicalKeys:new Set()};
    sourceMemberStats[id].uniqueOriginalNamePairs++;
    sourceMemberStats[id].autoSolverAgreements+=Number(row.existingAutoSolverAgreement);
    sourceMemberStats[id].distinctPhysicalKeys.add(row.candidatePairs[0].physicalKey);
  }
  const bySourceMember=Object.fromEntries(Object.entries(sourceMemberStats).map(([sourceId,info])=>[
    sourceId,frozen({uniqueOriginalNamePairs:info.uniqueOriginalNamePairs,autoSolverAgreements:info.autoSolverAgreements,distinctPhysicalPairs:info.distinctPhysicalKeys.size}),
  ]));
  const pairedSourceUsage=new Map();
  for(const row of unique){
    const item=row.candidatePairs[0],k=item.sourceMemberId+':'+item.sourcePhysicalNodeId;
    if(!pairedSourceUsage.has(k))pairedSourceUsage.set(k,new Map());
    const targets=pairedSourceUsage.get(k);
    if(!targets.has(item.targetPhysicalNodeId))targets.set(item.targetPhysicalNodeId,[]);
    targets.get(item.targetPhysicalNodeId).push(row.ownerOrdinal);
  }
  const multiTargetSources=[...pairedSourceUsage].filter(([,targets])=>targets.size>1).map(([sourcePhysicalKey,targets])=>frozen({
    sourcePhysicalKey,
    competingTargets:frozen([...targets].map(([targetNodeId,ownerOrdinals])=>frozen({targetNodeId,ownerOrdinals:frozen(ownerOrdinals)}))),
  }));
  const byLabel=new Map();
  for(const row of observed){
    const label=row.physicalTargetName;
    if(!byLabel.has(label))byLabel.set(label,[]);
    byLabel.get(label).push(row.ownerOrdinal);
  }
  const repeatedOwnerTargetName=[...byLabel].filter(([,n])=>n.length>1)
    .sort((a,b)=>b[1].length-a[1].length||numericSort(a[0],b[0]))
    .map(([name,ownerOrdinals])=>frozen({name,ownerCount:ownerOrdinals.length,ownerOrdinals:frozen(ownerOrdinals)}));
  const categoryCounts=frozen(Object.fromEntries(Object.entries(groups).sort((a,b)=>numericSort(a[0],b[0]))));
  return frozen({
    orientation,originalRowCount:observed.length,
    reasonCounts:categoryCounts,
    physicalPairCandidatesUniqueNameRows:unique.length,
    independentlyExistingAutoSolverAgreements:unique.filter(x=>x.existingAutoSolverAgreement).length,
    distinctPhysicalPairCandidateCount:byPhysicalKey.size,
    repeatedExactPhysicalPairCredit:pairReuse.reduce((n,x)=>n+x.ownerOrdinals.length-1,0),
    multiTargetSources:frozen(multiTargetSources),
    repeatedIdenticalPhysicalPairs:frozen(pairReuse),
    bySourceMember:frozen(bySourceMember),
    topRepeatedOwnerTargetName:frozen(repeatedOwnerTargetName.slice(0,12)),
    rows:frozen(observed),
  });
}
export function reconcileCiiOwnerMidCyclePhysicalRows(diagnostics,options={}){
  if(!Array.isArray(diagnostics)||diagnostics.some((x,i)=>x.ownerOrdinal!==i+1))
    throw new Error('CII_PHASE2_GOLDEN_OWNER_ORDINALS_NOT_CONTIGUOUS');
  const result=frozen({
    schema:'CiiOwnerMidCyclePhysicalReconciliation.v1',
    originalRowCount:diagnostics.length,
    asWritten:orientation(diagnostics,'declared','AS_WRITTEN'),
    directionReversalDiagnostic:orientation(diagnostics,'transposedDiagnostic','REVERSED_DIAGNOSTIC'),
    ownerApprovedTranspose:options.ownerConfirmedSlSourceToPsTarget===true,
    authoritativeDirection:options.ownerConfirmedSlSourceToPsTarget===true?'REVERSED_SL_SOURCE_TO_PS_TARGET':'UNCONFIRMED',
    methodAOrBQualificationChanged:false,writerAuthorizationGranted:false,
    independentValidatedRecall:null,
    status:options.ownerConfirmedSlSourceToPsTarget===true?'OWNER_DIRECTION_CONFIRMED_PHYSICAL_428_ROW_ACCEPTANCE_PENDING':'OWNER_DIRECTION_OR_PHYSICAL_OCCURRENCE_ADJUDICATION_PENDING',
  });
  for(const label of ['asWritten','directionReversalDiagnostic']){
    if(Object.values(result[label].reasonCounts).reduce((a,b)=>a+b,0)!==diagnostics.length)
      throw new Error('CII_PHASE2_GOLDEN_ROW_RECONCILIATION_LOST_OBLIGATIONS');
  }
  return result;
}

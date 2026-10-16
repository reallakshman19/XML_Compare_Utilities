/**
 * Midcycle Issue #106: 150 member-scoped SOURCE-node acceptance score.
 * TEST-ONLY. A matcher "BOUND" state is a proposal, NEVER itself a
 * correctness certificate or Writer2 authority.
 */
const freeze=Object.freeze;
const sourceKey=row=>String(row?.sourceId||'')+':'+String(row?.sourceNodeId??'');
const target=(row)=>String(row?.targetNodeId??row?.targetNodeIds?.[0]??'');
export function scoreCiiMidcycle150(input={}) {
  const audit=input.audit, certified=input.independentCertificates||[];
  const declared=input.originalSourcePhysicalNodeCount;
  if(!Number.isSafeInteger(declared)||declared!==150)
    throw Error('MIDCYCLE_150_REQUIRES_CUMULATIVE_150_ORIGINAL_SOURCE_NODES');
  if(!Array.isArray(audit?.rows)||audit.rows.length!==150)
    throw Error('MIDCYCLE_150_FULL_SOURCE_CENSUS_REQUIRED');
  const ids=new Map(),claims=new Map(),bySource=new Map(),bound=[];
  for(const row of audit.rows){
    const key=sourceKey(row),id=String(row.sourceId||'');
    if(!['S1','S2','S3'].includes(id)||ids.has(key))
      throw Error('MIDCYCLE_SOURCE_MEMBER_CUSTODY_OR_DUPLICATE_VETO');
    ids.set(key,row);
    if(!bySource.has(id))bySource.set(id,[]);
    bySource.get(id).push(row);
    if(row.identityBound===true&&row.state==='BOUND'){
      if((row.targetNodeIds||[]).length!==1)throw Error('MIDCYCLE_AMBIGUOUS_BOUND_TARGET');
      const tid=target(row);
      if(!claims.has(tid))claims.set(tid,[]);
      claims.get(tid).push(key);
      bound.push(key);
    }
  }
  const competingTargets=new Map([...claims].filter(([,s])=>new Set(s).size>1));
  const proofBySource=new Map();
  for(const p of certified){
    const key=String(p?.sourcePhysicalKey||'');
    if(!ids.has(key)||proofBySource.has(key))throw Error('MIDCYCLE_CERTIFICATE_SOURCE_DUPLICATE_OR_NOT_IN_CENSUS');
    const row=ids.get(key);
    const predicted=target(row);
    if(!predicted||String(p.targetPhysicalNodeId)!==predicted)
      throw Error('MIDCYCLE_CERTIFICATE_NOT_SAME_PHYSICAL_TARGET_AS_INDEPENDENT_SOLVER');
    if(competingTargets.has(predicted))throw Error('MIDCYCLE_CERTIFICATE_GLOBAL_TARGET_CONFLICT');
    if(p?.certificateStatus!=='INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED' ||
      p?.originalSourceSetSha256!==input.originalSourceSetSha256 ||
      p?.originalTargetSha256!==input.originalTargetSha256 ||
      !Array.isArray(p.originalPhysicalWitnessIds)||!p.originalPhysicalWitnessIds.length)
      throw Error('MIDCYCLE_CERTIFICATE_INSUFFICIENT_ORIGINAL_GRAPH_CUSTODY');
    proofBySource.set(key,p);
  }
  const certificateTargets=new Map();
  for(const [key,p] of proofBySource){
    const tid=String(p.targetPhysicalNodeId);
    if(certificateTargets.has(tid))throw Error('MIDCYCLE_CERTIFICATES_REUSE_TARGET_NODE');
    certificateTargets.set(tid,key);
  }
  const perMember=['S1','S2','S3'].map(id=>{
    const rows=bySource.get(id)||[];
    const n=rows.filter(r=>proofBySource.has(sourceKey(r))).length;
    return freeze({sourceId:id,totalOriginalSourcePhysicalNodes:rows.length,
      autoBoundCandidates:rows.filter(r=>r.identityBound===true&&r.state==='BOUND').length,
      independentlyCertifiedPhysicalPairs:n,
      notCertified:rows.length-n});
  });
  if(perMember.map(x=>x.totalOriginalSourcePhysicalNodes).join(',')!=='57,47,46')
    throw Error('MIDCYCLE_CUMULATIVE_57_47_46_INVARIANT_BROKEN');
  const originalLocal=input.originalLocalPathWitnesses;
  if(originalLocal && (!Array.isArray(originalLocal.rows)||originalLocal.rows.length!==150))
    throw Error('MIDCYCLE_LOCAL_ORIGINAL_PATH_FULL_CENSUS_REQUIRED');
  const localSeen=new Set();
  const localPathNodeKeys=[];
  for(const row of originalLocal?.rows||[]){
    const key=String(row.sourcePhysicalKey||'');
    if(!ids.has(key)||localSeen.has(key))throw Error('MIDCYCLE_LOCAL_PATH_DUPLICATE_OR_NONCENSUS_SOURCE');
    localSeen.add(key);
    if(row.state==='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY'){
      if(!bound.includes(key)||String(row.targetNodeId)!==target(ids.get(key))||
        !Number.isSafeInteger(row.independentLocalRouteWitnessCount)||
        row.independentLocalRouteWitnessCount<1||
        !Array.isArray(row.independentLocalRouteWitnesses)||
        row.locallyUniqueOriginalTargetRelativeToBoundNeighbors!==true||
        row.localOriginalAlternativeTargetCandidateCount!==1||
        !row.independentLocalRouteWitnesses.some(w=>w.withinLengthTolerance===true&&
           w.withinVectorTolerance===true&&
           w.targetPathStatus==='UNIQUE_MIN_HOP_ROUTE'))
        throw Error('MIDCYCLE_LOCAL_ORIGINAL_GRAPH_PATH_EVIDENCE_INVALID');
      localPathNodeKeys.push(key);
    }
  }
  const strict=proofBySource.size;
  const threshold=Math.ceil(declared*.70);
  return freeze({
    schema:'CiiMidcycle150IndependentPhysicalRecall.v1',
    sourceSet:'CUMULATIVE_S1_PLUS_S2_PLUS_S3',
    originalSourceSetSha256:input.originalSourceSetSha256,
    originalTargetSha256:input.originalTargetSha256,
    denominator:150,requiredValidatedPhysicalPairs:threshold,
    autoBoundCandidateCount:bound.length,
    autoBoundCandidateCoverageRatio:bound.length/150,
    autoBoundTargetConflicts:freeze([...competingTargets].map(([tid,claimants])=>freeze({targetPhysicalNodeId:tid,sourcePhysicalKeys:freeze(claimants)}))),
    independentCertificateCount:strict,
    originalLocalRouteWitnessNodeCount:localPathNodeKeys.length,
    originalLocalRouteWitnessCoverageRatio:localPathNodeKeys.length/150,
    originalLocalRoute70PercentReached:localPathNodeKeys.length>=threshold,
    localGeometryMilestoneStatus:localPathNodeKeys.length>=threshold
      ?'PASS_150_ORIGINAL_LOCAL_LENGTH_VECTOR_AND_UNIQUE_RELATIVE_TARGET'
      :'BELOW_150_ORIGINAL_LOCAL_GEOMETRY_THRESHOLD',
    localGeometryVetoes:'ORIGINAL_UNIQUE_MIN_HOP_LENGTH_100MM_PLUS_SIGNED_VECTOR_100MM_PLUS_EXHAUSTIVE_1619_TARGET_ALTERNATIVES_CONDITIONAL_ON_BOUND_NEIGHBORS',
    originalLocalRouteWitnessIsGlobalPhysicalCertification:false,
    MIDCYCLE_150_VALIDATED_RECALL:strict/150,
    thresholdMet:strict>=threshold,
    status:strict>=threshold?'PASS_150_MILESTONE_CERTIFIED':'BELOW_150_MILESTONE_VALIDATED_THRESHOLD',
    unverifiedAutoBoundCandidates:bound.filter(key=>!proofBySource.has(key)).length,
    perMember:freeze(perMember),
    original428ContractUnchanged:true,
    writerAuthority:false,
  });
}

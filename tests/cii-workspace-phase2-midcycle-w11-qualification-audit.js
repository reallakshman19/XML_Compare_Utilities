/**
 * Issue #106 W11-A: qualification audit for original-geometry TARGET leads.
 *
 * The earlier W10 candidate generator is TEST ONLY. This reviewer reads the
 * existing production compareReview and multi-base result; it never turns a
 * proposed geometric TARGET into a production BOUND identity or new seed.
 */
const key=(member,id)=>String(member)+':'+String(id);
const id=x=>String(x??'').trim();
const clone=v=>JSON.parse(JSON.stringify(v));
export function reviewCiiMidcycleW11ProductionQualification({
 forensics,audit,compareReview,memberPreviews,rooted,
}) {
 if(forensics?.schema!=='CiiMidcycle150UnverifiedRootedOriginalGeometryForensics.v1' ||
  !Array.isArray(forensics.rows)||forensics.rows.length!==45 ||
  !Array.isArray(audit?.rows)||audit.rows.length!==150 ||
  !Array.isArray(compareReview?.rows)||
  !Array.isArray(memberPreviews)||memberPreviews.length!==3)
  throw Error('W11_ORIGINAL_COMPLETE_CENSUS_AND_PRODUCTION_REVIEW_REQUIRED');
 const observed=new Map(),locked=new Map();
 for(const row of audit.rows){
  const k=key(row.sourceId,row.sourceNodeId);
  if(observed.has(k))throw Error('W11_DUPLICATE_ORIGINAL_SOURCE_AUDIT');
  observed.set(k,row);
  if(row.identityBound===true&&row.state==='BOUND'){
   if(row.targetNodeIds?.length!==1)throw Error('W11_AMBIGUOUS_PRODUCTION_BOUND_TARGET');
   locked.set(k,id(row.targetNodeIds[0]));
  }
 }
 const certified=new Set((rooted?.certificates||[]).map(p=>id(p.sourcePhysicalKey)));
 if(certified.size!==105||locked.size!==105)
  throw Error('W11_BASELINE_105_TRUSTED_PHYSICAL_CUSTODY_REQUIRED');
 const memberById=new Map(memberPreviews.map(r=>[id(r.sourceId),r.preview]));
 if([...memberById.keys()].sort().join(',')!=='S1,S2,S3')
  throw Error('W11_ALL_THREE_ORIGINAL_MEMBER_PREVIEWS_REQUIRED');
 const candidates=forensics.rows.filter(r=>r.status==='ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND');
 if(candidates.length!==22||new Set(candidates.map(r=>r.sourcePhysicalKey)).size!==22)
  throw Error('W11_ORIGINAL_22_CANDIDATES_NOT_COMPLETE');
 const certifiedTargets=new Set([...locked.values()]);
 const candidateClaims=new Map();
 for(const r of candidates){
  if(r.candidateOriginalTargetNodeIds?.length!==1)
   throw Error('W11_SINGLE_ORIGINAL_TARGET_CANDIDATE_REQUIRED');
  const tid=id(r.candidateOriginalTargetNodeIds[0]);
  if(!candidateClaims.has(tid))candidateClaims.set(tid,[]);
  candidateClaims.get(tid).push(r.sourcePhysicalKey);
 }
 const candidateTargetConflicts=[...candidateClaims].filter(([,claimants])=>claimants.length>1)
  .map(([targetPhysicalNodeId,sourcePhysicalKeys])=>({targetPhysicalNodeId,sourcePhysicalKeys}));
 const rows=candidates.map(r=>{
  const sourceKey=id(r.sourcePhysicalKey),tid=id(r.candidateOriginalTargetNodeIds[0]);
  const a=observed.get(sourceKey);
  if(!a||a.identityBound===true||certified.has(sourceKey))
   throw Error('W11_CANDIDATE_ALREADY_BOUND_OR_CERTIFIED');
  const exactProductionRows=compareReview.rows.filter(v=>v.kind==='NODE'&&
    id(v.sourceId)===id(r.sourceMemberId)&&id(v.source)===id(r.sourcePhysicalNodeId)&&
    id(v.target)===tid);
  const allProductionRows=compareReview.rows.filter(v=>v.kind==='NODE'&&
    id(v.sourceId)===id(r.sourceMemberId)&&id(v.source)===id(r.sourcePhysicalNodeId));
  const mp=memberById.get(id(r.sourceMemberId));
  const qualifiedCorrespondences=(mp?.correspondence?.nodeRows||[]).filter(v=>
    id(v.sourceNodeId)===id(r.sourcePhysicalNodeId)&&id(v.targetNodeId)===tid);
  const productionIndependentBinding=exactProductionRows.some(v=>v.identityBound===true)&&
    a.identityBound===true&&a.state==='BOUND'&&a.targetNodeIds?.length===1&&id(a.targetNodeIds[0])===tid;
  const conflictingOriginalTarget=certifiedTargets.has(tid)||candidateClaims.get(tid).length>1;
  if(productionIndependentBinding&&conflictingOriginalTarget)
   throw Error('W11_PRODUCTION_CERTIFIED_TARGET_CONFLICT');
  const status=conflictingOriginalTarget?'PROVISIONAL_TARGET_ALREADY_CLAIMED':
    !allProductionRows.length?'PRODUCTION_NO_NODE_CORRESPONDENCE_EMITTED':
    !exactProductionRows.length?'PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET':
    !productionIndependentBinding?'PRODUCTION_EXACT_TARGET_NOT_IDENTITY_BOUND':
    'PRODUCTION_QUALIFIED_PENDING_INDEPENDENT_CERTIFICATE';
  return {
   sourcePhysicalKey:sourceKey,provisionalOriginalTargetPhysicalNodeId:tid,
   sourceMemberId:r.sourceMemberId,sourceNodeId:r.sourcePhysicalNodeId,
   matcherState:a.state,matcherConfidence:a.confidence,
   matcherBlockers:[...(a.reasons||[])],
   productionCorrespondenceRows:allProductionRows.length,
   exactProductionPairReviewRows:exactProductionRows.length,
   exactProductionPairAuthority:exactProductionRows.map(v=>id(v.authority)).filter(Boolean),
   exactProductionPairEvidenceBasis:exactProductionRows.map(v=>id(v.identityEvidenceBasis)).filter(Boolean),
   exactProductionPairDecisions:exactProductionRows.map(v=>id(v.decision)),
   originalMethodABoundaryDiagnostics:clone(a.methodABoundaryDiagnostics||[]),
   originalSourceMemberCorrespondenceStatus:id(mp?.correspondence?.status)||'UNKNOWN',
   exactPhysicalCorrespondenceRowCount:qualifiedCorrespondences.length,
   originalSourceMemberBlockers:[...(mp?.correspondence?.blockers||[])],
   provenanceAndProductionIdentitySupported:productionIndependentBinding,
   targetPhysicalCustodyUncontested:!conflictingOriginalTarget,
   newIndependentPhysicalCredit:0,
   w11Disposition:status,
   reviewerRequiredNextStep:'DO_NOT_PROMOTE_GEOMETRY_LEAD_WITHOUT_EXISTING_METHOD_A_OR_METHOD_B_QUALIFICATION_AND_NEW_ORIGINAL_PHYSICAL_CERTIFICATE',
  };
 });
 const dispositions={};
 for(const r of rows)dispositions[r.w11Disposition]=(dispositions[r.w11Disposition]||0)+1;
 const perMember=['S1','S2','S3'].map(sourceId=>({
  sourceId,provisionalCandidateCount:rows.filter(r=>r.sourceMemberId===sourceId).length,
  emittedProductionSameTargetReviewRows:rows.filter(r=>r.sourceMemberId===sourceId&&r.exactProductionPairReviewRows>0).length,
  productionUnemitted:rows.filter(r=>r.sourceMemberId===sourceId&&r.matcherState==='UNEMITTED').length,
  productionUnresolved:rows.filter(r=>r.sourceMemberId===sourceId&&r.matcherState==='UNRESOLVED').length,
  newIndependentlyCertified:0,
 }));
 return {
  schema:'CiiMidcycleW11OriginalGeometryLeadsVsExistingProductionMethodABQualification.v1',
  sourcePopulation:150,verifiedPhysicalBaseline:105,leadCount:22,
  sourceSet:['S1','S2','S3'],status:'DIAGNOSTIC_ONLY_NO_PRODUCTION_MATCH_PROMOTION',
  conflictTargets:candidateTargetConflicts,
  dispositionCounts:dispositions,perMember,rows,
  newIndependentlyCertifiedPhysicalNodeCount:0,
  phase2Midcycle150ValidatedPhysicalCountUnchanged:105,
  methodAOrBThresholdModified:false,writerAuthorityGranted:false,
 };
}

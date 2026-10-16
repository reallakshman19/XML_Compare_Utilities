/**
 * Issue #106 W12: read-only, ORIGINAL CII segment-path discrepancy and
 * competing TARGET adjudication. No matcher seed, no new BOUND or Writer power.
 * Fixed 100mm dimensional policy is observed, NEVER relaxed.
 */
import {parseCiiMidcycleOriginalPhysicalGeometry} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';

const k=(m,n)=>String(m)+':'+String(n);
const norm=v=>Math.hypot(...v);
const other=(e,n)=>e.from===n?e.to:e.from;
const difference=(a,b)=>norm(a.map((x,i)=>x-b[i]));
function shortestPaths(g,root){
 const queue=[root],states=new Map();
 if(!g.adjacency.has(root))return states;
 states.set(root,{hops:0,ways:1,parent:null,edge:null});
 for(let i=0;i<queue.length;i++){
  const id=queue[i],v=states.get(id);
  for(const e of g.adjacency.get(id)||[]){
   const next=other(e,id),hops=v.hops+1;
   if(!states.has(next)){
    states.set(next,{hops,ways:v.ways,parent:id,edge:e});queue.push(next);
   }else if(states.get(next).hops===hops){
    states.get(next).ways=Math.min(2,states.get(next).ways+v.ways);
   }
  }
 }
 return states;
}
function signature(states,root,end){
 const node=states.get(end);
 if(!node||node.ways!==1||root===end)return null;
 let cursor=end,length=0,vector=[0,0,0];
 const ordered=[];
 while(cursor!==root){
  const x=states.get(cursor);
  if(!x?.edge||!x.parent)throw Error('W12_ORIGINAL_CII_PATH_CHAIN_BROKEN');
  const sign=x.edge.from===x.parent?1:-1;
  const delta=x.edge.delta.map(y=>y*sign);
  ordered.push({index:x.edge.index,from:x.parent,to:cursor,
   vector:delta,odMm:x.edge.originalOdMm,wallMm:x.edge.originalWallMm});
  length+=norm(delta);vector=vector.map((y,i)=>y+delta[i]);
  cursor=x.parent;
 }
 ordered.reverse();
 const odValues=[...new Set(ordered.map(e=>e.odMm))].sort((a,b)=>a-b);
 const consistentOd=odValues.length===1&&odValues[0]>0;
 const nonzero=ordered.filter(e=>norm(e.vector)>0);
 const straight=nonzero.length===ordered.length&&nonzero.every((e,i)=>{
  if(!i)return true;
  const p=nonzero[0].vector;
  return Math.abs(norm(e.vector)*norm(p)-e.vector.reduce((sum,z,j)=>sum+z*p[j],0))
    <=0.001*norm(e.vector)*norm(p);
 });
 return {hops:node.hops,sourceOrTargetLengthMm:length,signedDisplacementMm:vector,
  endToEndDistanceMm:norm(vector),odValues,consistentOd,
  allOriginalSegmentsCollinearSameDirection:straight,originalElementCount:ordered.length,
  originalElementIndexes:ordered.map(x=>x.index),
  segmentWitnesses:ordered};
}
/**
 * Comparison-only geometric signature for an original straight constant-OD
 * path that may have been split into multiple CII ELEMENTS. The underlying
 * original ELEMENTS must be independently decoded. This function does not
 * know the original component TYPE, and NEVER qualifies a NODE binding.
 */
export function compareCiiW12OriginalSegmentedPipeGeometry(sourceEdges,targetEdges,{
 pathTotalLengthToleranceMm=100,
}={}){
 if(pathTotalLengthToleranceMm!==100||!Array.isArray(sourceEdges)||!Array.isArray(targetEdges)||
  !sourceEdges.length||!targetEdges.length)
  throw Error('W12_SEGMENTED_ORIGINAL_PIPE_WITNESS_REQUIRED');
 const summarize=edges=>{
  const lengthMm=edges.reduce((n,e)=>n+norm(e.vector),0);
  const displacement=edges.reduce((v,e)=>v.map((n,i)=>n+e.vector[i]),[0,0,0]);
  const rods=edges.map(e=>e.odMm);
  const odPositiveConsistent=rods.every(v=>Number.isFinite(v)&&v>0&&Math.abs(v-rods[0])<=1);
  const nonzero=edges.every(e=>Array.isArray(e.vector)&&e.vector.length===3&&
    e.vector.every(Number.isFinite)&&norm(e.vector)>0);
  const straightCollinearForward=nonzero&&edges.every(e=>{
    const first=edges[0].vector;
    return Math.abs(norm(e.vector)*norm(first)-
      e.vector.reduce((n,x,i)=>n+x*first[i],0)) <=
      0.001*norm(e.vector)*norm(first);
  });
  return {lengthMm,displacement,segmentCount:edges.length,
   referenceOriginalOdMm:rods[0],odPositiveConsistent,straightCollinearForward};
 };
 const source=summarize(sourceEdges),target=summarize(targetEdges);
 const odMatch=source.odPositiveConsistent&&target.odPositiveConsistent&&
   Math.abs(source.referenceOriginalOdMm-target.referenceOriginalOdMm)<=1;
 const lengthDeltaMm=Math.abs(source.lengthMm-target.lengthMm);
 const signedDisplacementDeltaMm=difference(source.displacement,target.displacement);
 const passesGeometry=odMatch&&source.straightCollinearForward&&target.straightCollinearForward&&
   lengthDeltaMm<=pathTotalLengthToleranceMm&&
   signedDisplacementDeltaMm<=pathTotalLengthToleranceMm;
 return {schema:'CiiW12OriginalSegmentedPipeGeometryOnly.v1',
  originalSourceElements:source.segmentCount,originalTargetElements:target.segmentCount,
  originalLengthMm:{source:source.lengthMm,target:target.lengthMm,delta:lengthDeltaMm},
  originalSignedDisplacementMm:{source:source.displacement,target:target.displacement,
   delta:signedDisplacementDeltaMm},
  constantOriginalOdCompatible:odMatch,
  originalStraightConstantOdPathGeometryCompatible:passesGeometry,
  originalPipeTypeIndependentlyVerified:false,
  creditedNodeIdentity:false,
  policy:'INDEPENDENT_100MM_AGGREGATE_PATH_TOTAL_AND_SIGNED_VECTOR_NO_IDENTITY_UPGRADE'};
}
function sameOd(a,b){
 return Boolean(a&&b&&a.odValues.length===b.odValues.length&&a.odValues.every((v,i)=>
 Number.isFinite(v)&&v>0&&Math.abs(v-b.odValues[i])<=1));
}
function examine(src,tgt,sDegree,tDegree,tolerance){
 if(!src||!tgt)return {originalRouteUnique:false};
 return {
  originalRouteUnique:true,
  originalBranchCompatible:sDegree<3||tDegree>=3,
  originalOdCompatible:sameOd(src,tgt),
  lengthDeltaMm:Math.abs(src.sourceOrTargetLengthMm-tgt.sourceOrTargetLengthMm),
  signedVectorDeltaMm:difference(src.signedDisplacementMm,tgt.signedDisplacementMm),
  reversedSignedVectorDeltaMm:difference(src.signedDisplacementMm,tgt.signedDisplacementMm.map(x=>-x)),
  sourcePathElements:src.originalElementCount,
  targetPathElements:tgt.originalElementCount,
  sourceConstantOdCollinearRunProxy:src.consistentOd&&src.allOriginalSegmentsCollinearSameDirection,
  targetConstantOdCollinearRunProxy:tgt.consistentOd&&tgt.allOriginalSegmentsCollinearSameDirection,
  possibleOriginalSegmentSplittingProxy:src.originalElementCount!==tgt.originalElementCount&&
    src.consistentOd&&src.allOriginalSegmentsCollinearSameDirection&&
    tgt.consistentOd&&tgt.allOriginalSegmentsCollinearSameDirection,
  originalSegmentedGeometricProxyComparison:src.originalElementCount!==tgt.originalElementCount
    ?compareCiiW12OriginalSegmentedPipeGeometry(
       src.segmentWitnesses.map(e=>({vector:e.vector,odMm:e.odMm})),
       tgt.segmentWitnesses.map(e=>({vector:e.vector,odMm:e.odMm})),
       {pathTotalLengthToleranceMm:tolerance})
    :null,
  within100mmIndependentLength:Math.abs(src.sourceOrTargetLengthMm-tgt.sourceOrTargetLengthMm)<=tolerance,
  within100mmSignedVector:difference(src.signedDisplacementMm,tgt.signedDisplacementMm)<=tolerance,
 };
}
const rank=(a,b)=>a.rankMm-b.rankMm||Number(a.originalTargetId)-Number(b.originalTargetId);
export function investigateCiiMidcycleW12OriginalPaths({
 originalSources,originalTarget,audit,rooted,forensics,w11Qualification,
 pathTotalLengthToleranceMm=100,probeLimitPerAnchor=5,
}={}){
 if(!Array.isArray(originalSources)||originalSources.map(x=>x.sourceId).sort().join(',')!=='S1,S2,S3'||
  audit?.rows?.length!==150||forensics?.rows?.length!==45||
  w11Qualification?.rows?.length!==22||
  rooted?.certificates?.length!==105||
  pathTotalLengthToleranceMm!==100||
  !Number.isSafeInteger(probeLimitPerAnchor)||probeLimitPerAnchor<1)
  throw Error('W12_CUMULATIVE_SOURCE_AND_IMMUTABLE_100MM_POLICY_REQUIRED');
 const graphs=new Map(originalSources.map(x=>[x.sourceId,parseCiiMidcycleOriginalPhysicalGeometry(x.bytes)]));
 const target=parseCiiMidcycleOriginalPhysicalGeometry(originalTarget);
 if(target.conflicts.length||[...graphs.values()].some(g=>g.conflicts.length))
  throw Error('W12_ORIGINAL_CII_GEOMETRY_CYCLE_CONFLICT');
 const auditMap=new Map(),verified=new Map(),usedTarget=new Set();
 for(const r of audit.rows){
  const source=k(r.sourceId,r.sourceNodeId);
  if(auditMap.has(source))throw Error('W12_DUPLICATE_SOURCE_PHYSICAL_NODES');
  auditMap.set(source,r);
 }
 for(const cert of rooted.certificates){
  if(cert.certificateStatus!=='INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED'||
   !Array.isArray(cert.originalPhysicalWitnessIds)||!cert.originalPhysicalWitnessIds.length||
   !auditMap.has(cert.sourcePhysicalKey))
   throw Error('W12_INDEPENDENT_ORIGINAL_ROOT_CUSTODY_REQUIRED');
  const a=auditMap.get(cert.sourcePhysicalKey),tid=String(cert.targetPhysicalNodeId);
  if(a.state!=='BOUND'||a.identityBound!==true||a.targetNodeIds?.length!==1||
   String(a.targetNodeIds[0])!==tid||usedTarget.has(tid))
   throw Error('W12_ROOT_TARGET_REUSE_OR_UNQUALIFIED');
  verified.set(cert.sourcePhysicalKey,tid);usedTarget.add(tid);
 }
 if(verified.size!==105)throw Error('W12_EXPECTED_105_ROOTS_REQUIRED');
 const sourceCache=new Map(),targetCache=new Map();
 const fromSource=(member,root)=>{
  const name=k(member,root);
  if(!sourceCache.has(name))sourceCache.set(name,shortestPaths(graphs.get(member),root));
  return sourceCache.get(name);
 };
 const fromTarget=root=>{
  if(!targetCache.has(root))targetCache.set(root,shortestPaths(target,root));
  return targetCache.get(root);
 };
 const targetIds=[...target.adjacency.keys()];
 const candidates=forensics.rows.filter(r=>r.status==='NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY');
 if(candidates.length!==23)throw Error('W12_ORIGINAL_23_DISCREPANCIES_REQUIRED');
 const perNoCandidate=candidates.map(row=>{
  const member=row.sourceMemberId,nodeId=String(row.sourcePhysicalNodeId);
  const g=graphs.get(member),sDegree=(g.adjacency.get(nodeId)||[]).length;
  const roots=(row.trustedOriginalRootEvidence||[]).map(root=>{
   const rootSourceId=String(root.trustedPhysicalRoot).slice(member.length+1);
   const rootT=String(root.originalTargetPhysicalRoot);
   if(!verified.has(root.trustedPhysicalRoot)||verified.get(root.trustedPhysicalRoot)!==rootT)
    throw Error('W12_FORENSIC_ANCHOR_NOT_IN_INDEPENDENT_ROOT_CERTIFICATES');
   const source=signature(fromSource(member,rootSourceId),rootSourceId,nodeId);
   const targetStates=fromTarget(rootT);
   const nearest=[];
   let tPathFound=0,odAndBranchCompatible=0,vectorWithin100=0,lengthWithin100=0;
   for(const tid of targetIds){
    if(usedTarget.has(tid))continue;
    const tSig=signature(targetStates,rootT,tid);
    const cmp=examine(source,tSig,sDegree,(target.adjacency.get(tid)||[]).length,pathTotalLengthToleranceMm);
    if(!cmp.originalRouteUnique)continue;
    tPathFound++;
    if(!cmp.originalBranchCompatible||!cmp.originalOdCompatible)continue;
    odAndBranchCompatible++;
    if(cmp.within100mmSignedVector)vectorWithin100++;
    if(cmp.within100mmIndependentLength)lengthWithin100++;
    const rankMm=cmp.lengthDeltaMm+cmp.signedVectorDeltaMm;
    nearest.push({originalTargetId:tid,rankMm,...cmp,
      targetOriginalSegmentElementIndexes:tSig.originalElementIndexes.slice(0,30),
      sourceOriginalSegmentElementIndexes:source.originalElementIndexes.slice(0,30)});
   }
   nearest.sort(rank);
   return {trustedOriginalSourceRoot:root.trustedPhysicalRoot,
    trustedOriginalTargetRoot:rootT,sourceShortestHopPath:source?{
     originalElementCount:source.originalElementCount,
     originalLengthMm:source.sourceOrTargetLengthMm,
     originalSignedVectorMm:source.signedDisplacementMm,
     originalElementIndexes:source.originalElementIndexes.slice(0,40),
     sourceConstantOdCollinearRunProxy:source.consistentOd&&source.allOriginalSegmentsCollinearSameDirection,
    }:null,
    originalTargetCandidateScreen:{uniqueShortestRoute:tPathFound,
     originalOdAndBranchCompatible:odAndBranchCompatible,
     within100mmSignedVectorWithOd:vectorWithin100,
     within100mmLengthWithOd:lengthWithin100},
    closestODBranchCompatibleAlternatives:nearest.slice(0,probeLimitPerAnchor)};
  });
  const all=roots.flatMap(root=>root.closestODBranchCompatibleAlternatives);
  const nearest=all.sort(rank)[0]||null;
  const signedVectorOnly=roots.some(root=>root.closestODBranchCompatibleAlternatives.some(x=>
    x.within100mmSignedVector&&!x.within100mmIndependentLength));
  const lengthOnly=roots.some(root=>root.closestODBranchCompatibleAlternatives.some(x=>
    x.within100mmIndependentLength&&!x.within100mmSignedVector));
  return {sourcePhysicalKey:row.sourcePhysicalKey,originalSourceNodeName:row.originalSourceNodeName,
   originalSourceDegree:row.originalSourceDegree,
   originalW11StageRootCause:row.originalCandidateRootCause,
   trustedOriginalRootsExamined:roots.length,perRootOriginalPathEvidence:roots,
   nearestOriginalTargetByResidual:nearest,
   signedVectorFitsButLengthBreaks:signedVectorOnly,
   lengthFitsButSignedVectorBreaks:lengthOnly,
   apparentSegmentSplittingProxy:Boolean(nearest?.possibleOriginalSegmentSplittingProxy),
   category:'ORIGINAL_SEGMENT_AND_GEOMETRY_REVIEW_ONLY',
   independentPhysicalCredit:0,proposedProductionSeed:false};
 });
 const conflicting=w11Qualification.rows.filter(r=>
  r.w11Disposition==='PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET');
 if(conflicting.length!==8)throw Error('W12_ORIGINAL_EIGHT_DIFFERENT_TARGET_REVIEWS_REQUIRED');
 // Existing production candidates are not reconstructed from the Owner golden
 // and are not to be treated as certified claims.
 const comparison=conflicting.map(row=>{
  const member=row.sourceMemberId,sourceId=String(row.sourceNodeId);
  const g=graphs.get(member),sourceDegree=(g.adjacency.get(sourceId)||[]).length;
  const sourceForensic=forensics.rows.find(r=>r.sourcePhysicalKey===row.sourcePhysicalKey);
  const roots=(sourceForensic?.trustedOriginalRootEvidence||[]).map(root=>{
   const rootS=String(root.trustedPhysicalRoot).slice(member.length+1),rootT=String(root.originalTargetPhysicalRoot);
   const s=signature(fromSource(member,rootS),rootS,sourceId);
   const possibilities=[];
   for(const tid of [...new Set((row.productionReviewedTargetPhysicalNodeIds||[]).map(String)
    .concat([String(row.provisionalOriginalTargetPhysicalNodeId)]))]){
    const t=signature(fromTarget(rootT),rootT,tid);
    const cmp=examine(s,t,sourceDegree,(target.adjacency.get(tid)||[]).length,pathTotalLengthToleranceMm);
    possibilities.push({targetPhysicalNodeId:tid,
     isW10Hypothesis:tid===String(row.provisionalOriginalTargetPhysicalNodeId),
     originalGeometry:cmp,
     targetAlreadyIndependentlyOccupied:usedTarget.has(tid),
    });
   }
   return {trustedOriginalSourceRoot:root.trustedPhysicalRoot,
    originalTargetRoot:rootT,comparedTargetClaims:possibilities};
  });
  return {sourcePhysicalKey:row.sourcePhysicalKey,
   w10HypotheticalTargetNodeId:String(row.provisionalOriginalTargetPhysicalNodeId),
   productionDifferentTargetReviewCount:row.productionCorrespondenceRows,
   matcherBlockers:row.matcherBlockers,
   originalRootComparisons:roots,
   resolution:'NEITHER_PRODUCTION_REVIEW_NOR_DIAGNOSTIC_GEOMETRY_IS_AUTO_CERTIFIED',
   newPhysicalCredit:0};
 });
 const counts={
  countNoCandidate:perNoCandidate.length,
  noCandidateLengthGate:perNoCandidate.filter(r=>r.originalW11StageRootCause?.includes('ORIGINALLENGTH')).length,
  noCandidateVectorGate:perNoCandidate.filter(r=>r.originalW11StageRootCause?.includes('SIGNEDVECTOR')).length,
  closestCanMatchVectorNotLength:perNoCandidate.filter(r=>r.signedVectorFitsButLengthBreaks).length,
  closestCanMatchLengthNotVector:perNoCandidate.filter(r=>r.lengthFitsButSignedVectorBreaks).length,
  possibleCollinearConstantOdSegmentationProxies:perNoCandidate.filter(r=>r.apparentSegmentSplittingProxy).length,
  differentTReviewCases:comparison.length,
  addedCertifiedPhysicalMatches:0,
 };
 return {schema:'CiiMidcycleW12OriginalSegmentationAndCompetingTargetForensics.v1',
  sourcePopulation:150,certifiedMidcycle150Baseline:105,missingNodeReviewCount:23,
  competingProductionTargetReviews:8,pathTotalLengthToleranceMm,
  countingAndMatcherStatus:'READ_ONLY_ZERO_PROMOTION_NO_METHOD_AB_WRITER_CHANGE',
  sourcePerMember:['S1','S2','S3'].map(sourceId=>({
   sourceId,missing:perNoCandidate.filter(r=>r.sourcePhysicalKey.startsWith(sourceId+':')).length,
   productionDifferentTarget:comparison.filter(r=>r.sourcePhysicalKey.startsWith(sourceId+':')).length,
  })),counts,
  noCandidateOriginalPathReviews:perNoCandidate,
  eightCompetingOriginalTargetReviews:comparison,
  caution:'Plain PIPE identity not inferable from constant-OD collinear geometry alone. Changes to policy, root frames, or differing segment dimensions require Owner engineering validation.',
 };
}

/**
 * ARCH-01 F2: deterministic, non-writing joint candidate/path reviewer.
 * Retains AUTO, ACTIVE and MANUAL claims simultaneously. This is a bounded
 * constraint analysis, never a new correspondence authority or Writer scope.
 *
 * The already-existing A2 shadow research scripts (#74..#92) supplied the
 * architectural contracts. This browser-safe adapter uses original previews,
 * existing canonical CII graphs, and a complete physical SOURCE-node census.
 */
import {deepFreeze} from './cii-workspace-contracts.js';
import {buildCiiSourceTargetAudit} from './cii-workspace-source-target-audit.js';
import {adaptCiiDocumentToTopologyGraph} from './cii-workspace-topology-adapter.js';

export const CII_F2_JOINT_SCHEMA='CiiF2JointConstrainedReview.v1';
const sha=/^[a-f0-9]{64}$/i;
const str=x=>String(x??'').trim();
const cmp=(a,b)=>str(a).localeCompare(str(b),undefined,{numeric:true});
const sort=a=>[...a].sort(cmp);
const key=(sourceId,sourceNodeId)=>sourceId+':'+sourceNodeId;
function requireHash(x,name){if(!sha.test(str(x)))throw Error('F2_JOINT_CUSTODY_HASH_REQUIRED:'+name);return str(x);}
function policyFor(options={}){
 const policy={
  maxTargetPathSegments:options.maxTargetPathSegments??4,
  maxVisitsPerFactor:options.maxVisitsPerFactor??1200,
  maxEndpointCombinations:options.maxEndpointCombinations??32,
  maxPathWitnessesPerPair:options.maxPathWitnessesPerPair??4,
  pathLengthToleranceMm:options.pathLengthToleranceMm??25,
  straightnessMin:options.straightnessMin??0.995,
 };
 for(const name of ['maxTargetPathSegments','maxVisitsPerFactor','maxEndpointCombinations','maxPathWitnessesPerPair']){
  const n=policy[name];
  if(!Number.isSafeInteger(n)||n<1||n>10000)throw Error('F2_JOINT_INVALID_BOUNDED_POLICY:'+name);
 }
 if(!Number.isFinite(policy.pathLengthToleranceMm)||policy.pathLengthToleranceMm<0||policy.pathLengthToleranceMm>100)
  throw Error('F2_JOINT_LENGTH_POLICY_INVALID');
 if(!Number.isFinite(policy.straightnessMin)||policy.straightnessMin<0.8||policy.straightnessMin>1)
  throw Error('F2_JOINT_STRAIGHTNESS_POLICY_INVALID');
 return deepFreeze(policy);
}
function nodeIdFrom(row){return str(row.sourceNodeId||str(row.rowKey).split(':')[1]);}
function previewSourceHashes(preview){
 return Object.fromEntries((preview?.memberPreviews||[]).map(({sourceId,preview:member})=>[
  str(sourceId),requireHash(member?.versionBridge?.source?.originalSha256,'SOURCE:'+sourceId),
 ]));
}
function assertPreviews(automatic,active){
 if(automatic?.schema!=='CIIWorkspaceMultiSourcePreview.v1'
  ||active?.schema!=='CIIWorkspaceMultiSourcePreview.v1'
  ||automatic.sourceSetSha256!==active.sourceSetSha256
  ||automatic.targetAuthority?.originalSha256!==active.targetAuthority?.originalSha256)
  throw Error('F2_JOINT_ORIGINAL_SOURCE_SET_OR_TARGET_MISMATCH');
 const sourceSetSha256=requireHash(automatic.sourceSetSha256,'SOURCE_SET');
 const targetOriginalSha256=requireHash(automatic.targetAuthority.originalSha256,'TARGET');
 const sources=previewSourceHashes(automatic),other=previewSourceHashes(active);
 if(JSON.stringify(sources)!==JSON.stringify(other))throw Error('F2_JOINT_SOURCE_MEMBER_OR_HASH_MISMATCH');
 if(Object.keys(sources).length<2)throw Error('F2_JOINT_MULTI_SOURCE_REQUIRED');
 if(automatic.targetDocument?.contentSha256!==active.targetDocument?.contentSha256)
  throw Error('F2_JOINT_TARGET_MODEL_CHANGED');
 return {sourceSetSha256,targetOriginalSha256,originalSourceShaById:sources};
}
function auditFor(preview){
 const audit=buildCiiSourceTargetAudit(preview);
 if(audit.schema!=='CIIWorkspaceSourceTargetAudit.v1'
  ||audit.summary.totalSourceNodes!==audit.rows.length
  ||audit.summary.bySource.some(m=>m.populationStatus!=='MATCH'))
  throw Error('F2_JOINT_FULL_PHYSICAL_SOURCE_CENSUS_REQUIRED');
 return audit;
}
function opposite(edge,from){return str(edge.from)===from?str(edge.to):str(edge.from);}
function length(edge){return Number(edge.lengthMm);}
function pathEvidence(sourceEdge,steps,policy){
 const sourceLength=length(sourceEdge);
 const targetLength=steps.reduce((sum,step)=>sum+length(step.edge),0);
 const targetElements=steps.map(x=>str(x.edge.elementId));
 const reasons=[];
 if(!Number.isFinite(sourceLength)||sourceLength<=0||!Number.isFinite(targetLength)||targetLength<=0)
  reasons.push('INVALID_LENGTH');
 if(Math.abs(sourceLength-targetLength)>policy.pathLengthToleranceMm)reasons.push('PATH_LENGTH_MISMATCH');
 if(steps.some(x=>str(x.edge.componentKind)!==str(sourceEdge.componentKind)))
  reasons.push('COMPONENT_KIND_MISMATCH');
 if(steps.length>1&&str(sourceEdge.componentKind)!=='PIPE')
  reasons.push('NONPIPE_SUBDIVISION');
 let pathStraightness=null;
 if(steps.length>1){
  const v=steps.reduce((sum,s)=>{
   const direction=str(s.edge.from)===s.from?1:-1;
   return ['dx','dy','dz'].map((k,i)=>sum[i]+direction*Number(s.edge[k]));
  },[0,0,0]);
  pathStraightness=Math.hypot(...v)/Math.max(targetLength,1);
  const sourceStraightness=Math.hypot(Number(sourceEdge.dx),Number(sourceEdge.dy),Number(sourceEdge.dz))/Math.max(sourceLength,1);
  if(!Number.isFinite(pathStraightness)||pathStraightness<policy.straightnessMin
   ||Math.abs(pathStraightness-sourceStraightness)>0.01)
   reasons.push('SUBDIVISION_NOT_STRAIGHT');
 }
 return {accepted:reasons.length===0,reasons,
  targetElements,targetNodes:[steps[0].from,...steps.map(x=>x.to)],
  lengthDifferenceMm:Number(Math.abs(sourceLength-targetLength).toFixed(3)),
  targetStraightness:pathStraightness==null?null:Number(pathStraightness.toFixed(5)),
  relation:steps.length===1?'ONE_TO_ONE':'ONE_TO_PIPE_SUBDIVISION'};
}
function boundedPaths(edge,targetGraph,start,end,policy){
 if(start===end||!targetGraph.adjacency.has(start)||!targetGraph.adjacency.has(end))
  return {witnesses:[],complete:true,visits:0};
 let visits=0,complete=true;
 const witnesses=[],seen=new Set([start]);
 const dfs=(from,steps,accLength)=>{
  if(!complete)return;
  if(++visits>policy.maxVisitsPerFactor){complete=false;return;}
  if(from===end){
   const evidence=pathEvidence(edge,steps,policy);
   if(evidence.accepted){
    if(witnesses.length>=policy.maxPathWitnessesPerPair){complete=false;return;}
    witnesses.push(evidence);
   }
   return;
  }
  if(steps.length>=policy.maxTargetPathSegments)return;
  for(const candidate of [...(targetGraph.adjacency.get(from)||[])].sort((a,b)=>cmp(a.elementId,b.elementId))){
   if(!complete)break;
   const to=opposite(candidate,from),candidateLength=length(candidate);
   if(seen.has(to)||!Number.isFinite(candidateLength)||candidateLength<=0)continue;
   if(accLength+candidateLength>length(edge)+policy.pathLengthToleranceMm)continue;
   // Target inserted internal PIPE nodes are physical degree-two nodes only.
   if(to!==end&&(targetGraph.adjacency.get(to)||[]).length!==2)continue;
   if(to!==end&&str(edge.componentKind)!=='PIPE')continue;
   seen.add(to);dfs(to,[...steps,{edge:candidate,from,to}],accLength+candidateLength);seen.delete(to);
  }
 };
 dfs(start,[],0);
 return {witnesses,complete,visits};
}
function addClaim(claims,sourceNodes,targetNodes,claim){
 const sourceId=str(claim.sourceId),sourceNodeId=str(claim.sourceNodeId),targetNodeId=str(claim.targetNodeId);
 const id=key(sourceId,sourceNodeId);
 if(!sourceNodes.has(id)||!targetNodes.has(targetNodeId))
  throw Error('F2_JOINT_CLAIM_OUTSIDE_ORIGINAL_PHYSICAL_GRAPH:'+id+'>'+targetNodeId);
 const origin=str(claim.origin);
 if(!['AUTO_REPLAY','ACTIVE_REPLAY','MANUAL_ASSERTION'].includes(origin))
  throw Error('F2_JOINT_INVALID_CLAIM_ORIGIN');
 if(!claims.has(id))claims.set(id,new Map());
 const targets=claims.get(id);
 if(!targets.has(targetNodeId))targets.set(targetNodeId,new Set());
 targets.get(targetNodeId).add(origin);
}
function graphFromPreview(preview){
 const target=adaptCiiDocumentToTopologyGraph(preview.targetDocument);
 const sources=Object.fromEntries(preview.memberPreviews.map(m=>[
  m.sourceId,adaptCiiDocumentToTopologyGraph(m.preview.sourceDocument),
 ]));
 return {target,sources};
}
function claimsFromAudit(claims,sourceNodes,targetNodes,audit,origin){
 for(const row of audit.rows){
  if(!['BOUND','UNRESOLVED','AMBIGUOUS'].includes(row.state))continue;
  for(const targetNodeId of row.targetNodeIds||[]){
   addClaim(claims,sourceNodes,targetNodes,{
    sourceId:row.sourceId,sourceNodeId:nodeIdFrom(row),targetNodeId,origin,
   });
  }
 }
}
/**
 * Does NOT set identityBound, correspondenceIdentity, transferPlan, scope or
 * Writer readiness. "PATH_WITNESSED" is not unique physical correspondence.
 */
export function buildCiiF2JointConstrainedReview({automaticPreview,activePreview,manualClaims=[],policy={}}={}){
 const custody=assertPreviews(automaticPreview,activePreview),applied=policyFor(policy);
 const auto=auditFor(automaticPreview),active=auditFor(activePreview);
 const keys=sort(auto.rows.map(x=>x.rowKey)),activeKeys=sort(active.rows.map(x=>x.rowKey));
 if(JSON.stringify(keys)!==JSON.stringify(activeKeys))throw Error('F2_JOINT_DIFFERENT_PHYSICAL_SOURCE_POPULATION');
 const graphs=graphFromPreview(automaticPreview);
 const sourceNodes=new Set(keys);
 const targetNodes=new Set((graphs.target.nodes||[]).map(x=>str(x.id)));
 const claims=new Map();
 claimsFromAudit(claims,sourceNodes,targetNodes,auto,'AUTO_REPLAY');
 claimsFromAudit(claims,sourceNodes,targetNodes,active,'ACTIVE_REPLAY');
 for(const manual of manualClaims){
  // Manual assertions are explicitly retained, even if active replay rejects
  // their physical identity; their provenance never implies certification.
  addClaim(claims,sourceNodes,targetNodes,{...manual,origin:'MANUAL_ASSERTION'});
 }
 const byTarget=new Map();
 for(const [source,targets] of claims)for(const target of targets.keys()){
  if(!byTarget.has(target))byTarget.set(target,new Set());
  byTarget.get(target).add(source);
 }
 const factors=[],neighborFactors=new Map(),counter={examined:0,complete:0,incomplete:0,supported:0,contradicted:0};
 for(const [sourceId,graph] of Object.entries(graphs.sources).sort(([a],[b])=>cmp(a,b))){
  for(const edge of [...graph.edges].sort((a,b)=>cmp(a.elementId,b.elementId))){
   const left=key(sourceId,str(edge.from)),right=key(sourceId,str(edge.to));
   const leftTargets=sort(claims.get(left)?.keys()||[]),rightTargets=sort(claims.get(right)?.keys()||[]);
   const combinations=leftTargets.length*rightTargets.length;
   const sourceEdgeKey=key(sourceId,str(edge.elementId));
   const witnesses=[], reasons=[],pairEvidence=[];
   let complete=true;
   if(!combinations){reasons.push('ENDPOINT_CANDIDATE_MISSING');complete=false;}
   else if(combinations>applied.maxEndpointCombinations){reasons.push('PAIR_BOUND_EXCEEDED');complete=false;}
   else for(const a of leftTargets)for(const b of rightTargets){
    const candidate=boundedPaths(edge,graphs.target,a,b,applied);
    if(!candidate.complete){complete=false;reasons.push('SEARCH_TRUNCATED');}
    for(const w of candidate.witnesses)witnesses.push({
     sourceElementId:str(edge.elementId),sourceId,startTargetNodeId:a,endTargetNodeId:b,...w,
    });
    pairEvidence.push({targetFrom:a,targetTo:b,complete:candidate.complete,
     witnessCount:candidate.witnesses.length});
   }
   const result={sourceId,sourceElementId:str(edge.elementId),sourceNodeKeys:[left,right],
    candidatePairCount:combinations,pathWitnesses:witnesses,
    pairEvidence,complete,status:!complete?'INCOMPLETE':witnesses.length?'PATH_WITNESSED':'NO_SUPPORTED_PATH',
    blockers:sort(new Set(reasons))};
   factors.push(result);
   for(const id of [left,right]){
    if(!neighborFactors.has(id))neighborFactors.set(id,[]);
    neighborFactors.get(id).push(result);
   }
   counter.examined++;
   if(!complete)counter.incomplete++;else counter.complete++;
   if(witnesses.length)counter.supported++;
   if(complete&&!witnesses.length)counter.contradicted++;
  }
 }
 const rows=keys.map(sourceNodeKey=>{
  const [sourceId,sourceNodeId]=sourceNodeKey.split(':');
  const targets=claims.get(sourceNodeKey)||new Map();
  const candidates=sort(targets.keys()).map(targetNodeId=>{
   const incident=neighborFactors.get(sourceNodeKey)||[];
   const witnessed=incident.filter(f=>f.pathWitnesses.some(w=>
    f.sourceNodeKeys[0]===sourceNodeKey?w.startTargetNodeId===targetNodeId:w.endTargetNodeId===targetNodeId));
   const completeContradictions=incident.filter(f=>f.complete&&!f.pathWitnesses.some(w=>
    f.sourceNodeKeys[0]===sourceNodeKey?w.startTargetNodeId===targetNodeId:w.endTargetNodeId===targetNodeId));
   const sharedTarget=sort(byTarget.get(targetNodeId)||[]).filter(k=>k!==sourceNodeKey);
   return {targetNodeId,origins:sort(targets.get(targetNodeId)),
    witnessedFactorCount:witnessed.length,sourceFactorCount:incident.length,
    incompatibleFactorCount:completeContradictions.length,
    incompleteFactorCount:incident.filter(f=>!f.complete).length,
    competingSourceNodeKeys:sharedTarget,
    status:sharedTarget.length?'TARGET_CUSTODY_REVIEW':completeContradictions.length
      ?'PATH_CONTRADICTION_REVIEW':witnessed.length?'PATH_SUPPORTED_REVIEW':'UNPROVEN_REVIEW'};
  });
  const originDisagreement=candidates.length>1;
  const custodyConflict=candidates.some(x=>x.competingSourceNodeKeys.length>0);
  const state=!candidates.length?'NO_CANDIDATE':originDisagreement||custodyConflict?'CONFLICT'
    :candidates.some(x=>x.status==='PATH_CONTRADICTION_REVIEW')?'PATH_CONTRADICTION'
    :'REVIEW_ONLY';
  return {sourceNodeKey,sourceId,sourceNodeId,state,candidates,
   autoBound:(auto.rows.find(x=>x.rowKey===sourceNodeKey)?.state==='BOUND'),
   activeBound:(active.rows.find(x=>x.rowKey===sourceNodeKey)?.state==='BOUND'),
   physicalCertification:false,writerReady:false};
 });
 const summary={originalSourceNodeCount:keys.length,
  automaticBoundCount:auto.summary.BOUND,activeBoundCount:active.summary.BOUND,
  jointCandidateNodes:rows.filter(x=>x.candidates.length).length,
  unresolvedSourceNodes:rows.filter(x=>!x.candidates.length).length,
  differingTargetCandidates:rows.filter(x=>x.candidates.length>1).length,
  targetCustodyReviewCount:rows.filter(x=>x.candidates.some(c=>c.competingSourceNodeKeys.length)).length,
  nodeCandidates:rows.reduce((n,x)=>n+x.candidates.length,0),factors:counter,
  certifiedNodeCount:0,writerOperationCount:0};
 return deepFreeze({schema:CII_F2_JOINT_SCHEMA,status:'REVIEW_ONLY_NOT_CERTIFIED',policy:applied,
  originalCustody:custody,summary,rows,factors,
  canBindWriter:false,transferPlan:null,writeScope:null,writerReadiness:null});
}

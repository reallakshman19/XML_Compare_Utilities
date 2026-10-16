/**
 * Issue #106 W10: TEST-ONLY diagnostic of the 45 unverified physical
 * SOURCE nodes after the independently certified cumulative 105/150 baseline.
 *
 * The complete original SOURCE/T CII fixed-field ELEMENTS are decoded afresh.
 * Candidate TARGET nodes are searched globally, relative to already certified
 * SOURCE-member physical anchors. A candidate is NOT an identity binding,
 * certificate, manual anchor or Writer2 authority.
 */
import {parseCiiMidcycleOriginalPhysicalGeometry} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';
const memberKey=(member,node)=>String(member)+':'+String(node);
const other=(edge,current)=>edge.from===current?edge.to:edge.from;
function independentShortestPathIndex(graph,root){
 const states=new Map(),queue=[root];
 if(!graph.adjacency.has(root))return states;
 states.set(root,{distanceHops:0,ways:1,from:null,edge:null});
 for(let i=0;i<queue.length;i++){
  const node=queue[i],state=states.get(node);
  for(const edge of graph.adjacency.get(node)||[]){
   const adjacent=other(edge,node),distance=state.distanceHops+1;
   if(!states.has(adjacent)){
    states.set(adjacent,{distanceHops:distance,ways:state.ways,from:node,edge});
    queue.push(adjacent);
   }else if(states.get(adjacent).distanceHops===distance){
    states.get(adjacent).ways=Math.min(2,states.get(adjacent).ways+state.ways);
   }
  }
 }
 return states;
}
function pathSignature(states,from,to){
 const state=states.get(to);
 if(!state||state.ways!==1||state.distanceHops===0)return null;
 let node=to,v=[0,0,0],length=0,ods=[];
 while(node!==from){
  const prior=states.get(node),edge=prior?.edge;
  if(!prior||!edge)throw Error('W10_ORIGINAL_UNIQUE_SHORTEST_PATH_BROKEN');
  const sign=edge.from===prior.from?1:-1;
  v=v.map((x,i)=>x+sign*edge.delta[i]);
  length+=Math.hypot(...edge.delta);ods.push(edge.originalOdMm);
  node=prior.from;
 }
 const odValues=[...new Set(ods)].sort((a,b)=>a-b);
 return {hops:state.distanceHops,lengthMm:length,vectorMm:v,originalOdValues:odValues};
}
function componentOf(graph,id){return graph.componentByNode.get(id);}
function odSame(source,target){
 const a=source.originalOdValues,b=target.originalOdValues;
 return a.length===b.length&&a.every((n,i)=>Number.isFinite(n)&&n>0&&
  Number.isFinite(b[i])&&Math.abs(n-b[i])<=1);
}
function compareIndex(source,target,sourceDegree,targetDegree,tolerance){
 if(!source||!target)return false;
 if(sourceDegree>=3&&targetDegree<3)return false;
 if(!odSame(source,target))return false;
 if(Math.abs(source.lengthMm-target.lengthMm)>tolerance)return false;
 if(Math.hypot(...source.vectorMm.map((n,i)=>n-target.vectorMm[i]))>tolerance)return false;
 return true;
}
export function diagnoseCiiMidcycle150Unverified({
 originalSources,originalTarget,audit,rooted,
 pathToleranceMm=100,maxRootsPerNode=3,
}={}){
 if(!Array.isArray(originalSources)||originalSources.map(x=>x.sourceId).sort().join(',')!=='S1,S2,S3'||
  !Array.isArray(audit?.rows)||audit.rows.length!==150||
  !Number.isFinite(pathToleranceMm)||pathToleranceMm<0||
  !Number.isSafeInteger(maxRootsPerNode)||maxRootsPerNode<1)
  throw Error('W10_CUMULATIVE_SOURCE_AND_POLICY_REQUIRED');
 const sourceGraphs=new Map(originalSources.map(x=>[x.sourceId,parseCiiMidcycleOriginalPhysicalGeometry(x.bytes)]));
 const targetGraph=parseCiiMidcycleOriginalPhysicalGeometry(originalTarget);
 if(targetGraph.conflicts.length||[...sourceGraphs.values()].some(g=>g.conflicts.length))
  throw Error('W10_ORIGINAL_GEOMETRY_INCONSISTENT_CYCLE');
 const auditById=new Map();
 for(const row of audit.rows){
  const k=memberKey(row.sourceId,row.sourceNodeId);
  if(auditById.has(k))throw Error('W10_DUPLICATED_SOURCE_PHYSICAL_AUDIT');
  auditById.set(k,row);
 }
 if(auditById.size!==150)throw Error('W10_SOURCE_CENSUS_INCOMPLETE');
 const trusted=new Map();
 for(const proof of rooted?.certificates||[]){
  const k=String(proof.sourcePhysicalKey);
  if(trusted.has(k)||!auditById.has(k)||
     proof.certificateStatus!=='INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED'||
     !Array.isArray(proof.originalPhysicalWitnessIds)||!proof.originalPhysicalWitnessIds.length)
    throw Error('W10_TRUSTED_ROOT_PROVENANCE_UNQUALIFIED');
  const auditRow=auditById.get(k);
  if(auditRow.identityBound!==true||auditRow.state!=='BOUND'||auditRow.targetNodeIds?.length!==1||
    String(auditRow.targetNodeIds[0])!==String(proof.targetPhysicalNodeId))
    throw Error('W10_TRUSTED_ROOT_DISAGREES_WITH_PHYSICAL_BINDING');
  trusted.set(k,String(proof.targetPhysicalNodeId));
 }
 if(trusted.size!==rooted?.independentlyRootedVerifiedPhysicalNodes)
  throw Error('W10_CERTIFIED_ROOT_COUNT_INCONSISTENT');
 const occupiedTarget=new Set(trusted.values());
 if(occupiedTarget.size!==trusted.size)throw Error('W10_REUSED_TRUSTED_TARGET');
 const sourceCache=new Map(),targetCache=new Map();
 const sourcePaths=(member,root)=>{
   const k=memberKey(member,root);
   if(!sourceCache.has(k))sourceCache.set(k,independentShortestPathIndex(sourceGraphs.get(member),root));
   return sourceCache.get(k);
 };
 const targetPaths=root=>{
   if(!targetCache.has(root))targetCache.set(root,independentShortestPathIndex(targetGraph,root));
   return targetCache.get(root);
 };
 const originalTargetIds=[...targetGraph.adjacency.keys()].sort((a,b)=>Number(a)-Number(b));
 const rows=[];
 for(const [key,auditRow] of auditById){
  if(trusted.has(key))continue;
  const member=auditRow.sourceId,id=String(auditRow.sourceNodeId),graph=sourceGraphs.get(member);
  const sourceDegree=(graph.adjacency.get(id)||[]).length,sourceComponent=componentOf(graph,id);
  const candidateRoots=[...trusted].filter(([rootKey])=>rootKey.startsWith(member+':'))
    .map(([rootKey,rootTarget])=>{
      const rootId=rootKey.slice(member.length+1);
      const state=sourcePaths(member,rootId).get(id);
      return {rootKey,rootTarget,rootId,dist:state?.distanceHops??Infinity,
        ways:state?.ways??0};
    }).filter(x=>Number.isFinite(x.dist)&&x.dist>0&&x.ways===1)
      .sort((a,b)=>a.dist-b.dist||a.rootKey.localeCompare(b.rootKey))
      .slice(0,maxRootsPerNode);
  const rootedMatches=[];
  for(const root of candidateRoots){
   const srcPath=pathSignature(sourcePaths(member,root.rootId),root.rootId,id);
   const targetPathsByRoot=targetPaths(root.rootTarget);
   const alternatives=[];
   const gateCounts={availableTarget:0,uniqueOriginalRoute:0,
    branchCompatible:0,originalOdCompatible:0,
    originalLengthWithin100mm:0,signedVectorWithin100mm:0};
   for(const candidateTarget of originalTargetIds){
    if(occupiedTarget.has(candidateTarget))continue;
    gateCounts.availableTarget++;
    const targetPath=pathSignature(targetPathsByRoot,root.rootTarget,candidateTarget);
    if(!srcPath||!targetPath)continue;
    gateCounts.uniqueOriginalRoute++;
    if(sourceDegree>=3&&(targetGraph.adjacency.get(candidateTarget)||[]).length<3)continue;
    gateCounts.branchCompatible++;
    if(!odSame(srcPath,targetPath))continue;
    gateCounts.originalOdCompatible++;
    if(Math.abs(srcPath.lengthMm-targetPath.lengthMm)>pathToleranceMm)continue;
    gateCounts.originalLengthWithin100mm++;
    if(Math.hypot(...srcPath.vectorMm.map((n,i)=>n-targetPath.vectorMm[i]))>pathToleranceMm)continue;
    gateCounts.signedVectorWithin100mm++;
    alternatives.push(candidateTarget);
   }
   if(Object.keys(gateCounts).some((stage,i,a)=>i>0&&gateCounts[stage]>gateCounts[a[i-1]]))
     throw Error('W11_STAGE_GATE_COUNTERS_MUST_BE_MONOTONIC');
   rootedMatches.push({trustedPhysicalRoot:root.rootKey,
     originalTargetPhysicalRoot:root.rootTarget,sourceGraphHops:root.dist,
     originalTargetCandidates:alternatives,
     alternatives:alternatives.length,originalPhysicalGateCensus:gateCounts});
  }
  const candidateUnion=rootedMatches.length?new Set(rootedMatches[0].originalTargetCandidates):new Set();
  for(const result of rootedMatches.slice(1)){
   const allowed=new Set(result.originalTargetCandidates);
   for(const candidate of [...candidateUnion])if(!allowed.has(candidate))candidateUnion.delete(candidate);
  }
  const candidates=[...candidateUnion].sort((a,b)=>Number(a)-Number(b));
  const gates=['uniqueOriginalRoute','branchCompatible','originalOdCompatible',
   'originalLengthWithin100mm','signedVectorWithin100mm'];
  const blockers=rootedMatches.filter(x=>x.alternatives===0).map(x=>{
    const earliest=gates.find(stage=>x.originalPhysicalGateCensus[stage]===0);
    return earliest?'NO_CANDIDATE_AFTER_'+earliest.toUpperCase():
      'NO_CANDIDATE_AFTER_ALL_FIXED_PHYSICAL_GATES';
  });
  const originalCandidateRootCause=candidateRoots.length===0
   ?'NO_TRUSTED_ROOT_IN_ORIGINAL_COMPONENT'
   :candidates.length>0?'AT_LEAST_ONE_ORIGINAL_T_CANDIDATE_FOUND'
   :blockers.length?'ROOT_PATH_OR_GEOMETRY_VETO:'+blockers[0]
   :'MULTIPLE_ROOTS_DISAGREE_ON_ORIGINAL_T_CANDIDATE';
  const status=auditRow.identityBound===true?'BOUND_NOT_IN_CERTIFIED_ROOT_SET':
    candidateRoots.length===0?'NO_TRUSTED_ORIGINAL_SOURCE_COMPONENT_ROOT':
    candidates.length===0?'NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY':
    candidates.length>1?'MULTIPLE_ORIGINAL_T_CANDIDATES_REVIEW_REQUIRED':
    'ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND';
  rows.push({
    sourcePhysicalKey:key,sourceMemberId:member,sourcePhysicalNodeId:id,
    originalSourceNodeName:auditRow.sourceNodeName??'',
    matcherState:auditRow.state,matcherReasons:auditRow.reasons||[],
    originalSourceComponent:sourceComponent,originalSourceDegree:sourceDegree,
    trustedOriginalPhysicalRootsExamined:rootedMatches.length,
    trustedOriginalRootEvidence:rootedMatches.map(r=>({
      trustedPhysicalRoot:r.trustedPhysicalRoot,originalTargetPhysicalRoot:r.originalTargetPhysicalRoot,
      originalSourceHops:r.sourceGraphHops,originalTargetAlternativeCount:r.alternatives,
      originalPhysicalGateCensus:r.originalPhysicalGateCensus,
    })),
    originalTargetPhysicalCandidateCount:candidates.length,
    candidateOriginalTargetNodeIds:candidates.slice(0,12),
    originalCandidateRootCause,
    status,independentlyCertified:false,
    productionPromotionAuthorized:false,
  });
 }
 const count=(p)=>rows.filter(p).length;
 const reasons={};
 for(const row of rows)reasons[row.status]=(reasons[row.status]||0)+1;
 const matcherStateCounts={};
 for(const row of rows)matcherStateCounts[row.matcherState]=(matcherStateCounts[row.matcherState]||0)+1;
 const priorityCandidates=rows.filter(row=>row.status==='ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND');
 const exclusionReasons=rows.filter(row=>row.status==='NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY');
 const report={
  schema:'CiiMidcycle150UnverifiedRootedOriginalGeometryForensics.v1',
  cumulativeSourcePhysicalNodeCount:150,
  trustedIndependentlyCertifiedSourceNodeCount:trusted.size,
  unverifiedSourcePhysicalNodeCount:rows.length,
  unverifiedByMember:['S1','S2','S3'].map(sourceId=>({
    sourceId,unverified:count(r=>r.sourceMemberId===sourceId),
    singleCandidate:count(r=>r.sourceMemberId===sourceId&&r.status==='ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND'),
    missingTrustedRoot:count(r=>r.sourceMemberId===sourceId&&r.status==='NO_TRUSTED_ORIGINAL_SOURCE_COMPONENT_ROOT'),
  })),
  reasonCounts:reasons,
  matcherStateCounts,
  geometryRootCauseCounts:Object.fromEntries([...new Set(rows.map(r=>r.originalCandidateRootCause))].sort().map(code=>
    [code,rows.filter(r=>r.originalCandidateRootCause===code).length])),
  priorityCandidateCount:priorityCandidates.length,
  originalGeometryExcludedCount:exclusionReasons.length,
  priorityCandidates:priorityCandidates.map(row=>({
    sourcePhysicalKey:row.sourcePhysicalKey,
    originalSourceNodeName:row.originalSourceNodeName,
    matcherState:row.matcherState,matcherReasons:row.matcherReasons,
    candidateTargetPhysicalNodeId:row.candidateOriginalTargetNodeIds[0],
    vettedPhysicalIdentity:false,
    nextRequiredStep:'PRODUCTION_METHOD_A_OR_METHOD_B_QUALIFICATION_AND_INDEPENDENT_GLOBAL_CUSTODY',
  })),
  sourceOriginalShasAreExternalCustody: false,
  globalOriginalTargetCandidateDomainSize:originalTargetIds.length,
  originalCiiIndependentSearch:true,
  newlyCreditedPhysicalNodes:0,
  original428DenominatorPreserved:true,
  notes:'This is a read-only diagnostic. Unique geometry conditioned on trusted roots is not a production Method A/B promotion or a confirmed new AUTO binding.',
  rows,
 };
 if(trusted.size+rows.length!==150)throw Error('W10_CERTIFIED_AND_UNVERIFIED_CENSUS_DOES_NOT_EQUAL_150');
 return report;
}

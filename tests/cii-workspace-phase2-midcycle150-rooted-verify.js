/**
 * Test-only CII original-graph rooted physical correspondence proof.
 * Independently reconstruct original signed-vectors + shortest unique graph
 * paths and search ALL original T physical nodes for an unambiguous endpoint
 * relative to already trusted physical SOURCE->TARGET anchor witnesses.
 *
 * Root trust: original Owner 428-row uniquely mapped and engine-corroborated
 * physical pairs, plus exhaustive unique ORIGINAL-T translations of entire
 * bound-source connected geometric subgraphs. Never seed production matcher.
 * Never award credit from candidate BOUND status or local mutual agreement
 * alone; original trusted root and alternative target exhaustive veto required.
 */
import {parseCiiMidcycleOriginalPhysicalGeometry} from './cii-workspace-phase2-midcycle150-global-shape-verify.js';
const frozen=Object.freeze;
const key=(sourceId,id)=>sourceId+':'+id;
const other=(e,id)=>e.from===id?e.to:e.from;
function rootedShortestPhysicalPaths(graph,root){
 if(!graph.adjacency.has(root))return new Map();
 const q=[root],seen=new Map([[root,{ways:1,hops:0,totalLengthMm:0,vector:[0,0,0]}]]);
 for(let ix=0;ix<q.length;ix++){
  const id=q[ix],prev=seen.get(id);
  for(const edge of graph.adjacency.get(id)||[]){
   const next=other(edge,id),hops=prev.hops+1;
   if(!seen.has(next)){
    const sign=edge.from===id?1:-1,delta=edge.delta;
    seen.set(next,{
      ways:prev.ways,hops,totalLengthMm:prev.totalLengthMm+Math.hypot(...delta),
      vector:prev.vector.map((v,i)=>v+sign*delta[i]),
    });
    q.push(next);
   }else if(seen.get(next).hops===hops){
    seen.get(next).ways=Math.min(2,seen.get(next).ways+prev.ways);
   }
  }
 }
 return seen;
}
export function verifyCiiMidcycle150RootedCorrespondences({
 originalSources,originalTarget,audit,ownerCertificates,globalShape,
 localPathWitness,originalSourceSetSha256,originalTargetSha256,
 vectorToleranceMm=100,pathLengthToleranceMm=100,
}) {
 const names=[...originalSources.map(x=>x.sourceId)].sort();
 if(names.join(',')!=='S1,S2,S3')throw Error('MIDCYCLE_ROOTED_SOURCE_MEMBERS_MUST_BE_CUMULATIVE');
 const sourceGraphs=new Map(originalSources.map(r=>[r.sourceId,parseCiiMidcycleOriginalPhysicalGeometry(r.bytes)]));
 const targetGraph=parseCiiMidcycleOriginalPhysicalGeometry(originalTarget);
 if(targetGraph.conflicts.length)throw Error('MIDCYCLE_ROOTED_TARGET_ORIGINAL_GEOMETRY_CONFLICT');
 const sourceRows=new Map(),allBound=new Map(),claimedTarget=new Map();
 for(const r of audit.rows){
  const sk=key(r.sourceId,r.sourceNodeId);
  if(sourceRows.has(sk))throw Error('MIDCYCLE_ROOTED_SOURCE_NODE_DUPLICATE');
  sourceRows.set(sk,r);
  if(r.identityBound===true&&r.state==='BOUND'){
   if(r.targetNodeIds?.length!==1)throw Error('MIDCYCLE_ROOTED_AMBIGUOUS_BOUND');
   const t=String(r.targetNodeIds[0]);
   allBound.set(sk,t);
   if(!claimedTarget.has(t))claimedTarget.set(t,[]);
   claimedTarget.get(t).push(sk);
  }
 }
 if(sourceRows.size!==150||allBound.size<1)
   throw Error('MIDCYCLE_ROOTED_CUMULATIVE_150_CENSUS_REQUIRED');
 const claimantConflicts=new Set([...claimedTarget].filter(([,v])=>v.length>1).map(([t])=>t));
 const localMap=new Map(localPathWitness.rows.map(r=>[r.sourcePhysicalKey,r]));
 const verified=new Map(),targetUsed=new Map(),provenanceBySource=new Map();
 function establish(sk,tid,proof){
  if(!allBound.has(sk)||allBound.get(sk)!==tid||claimantConflicts.has(tid)||
     !sourceRows.has(sk)||!localMap.has(sk))return false;
  const witness=localMap.get(sk);
  if(witness.state!=='LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY'||
     !witness.locallyUniqueOriginalTargetRelativeToBoundNeighbors||
     !witness.independentLocalRouteWitnesses.some(w=>w.withinLengthTolerance&&w.withinVectorTolerance))
     return false;
  if(verified.has(sk))return verified.get(sk)===tid;
  if(targetUsed.has(tid))return false;
  verified.set(sk,tid);targetUsed.set(tid,sk);provenanceBySource.set(sk,proof);return true;
 }
 const ownerSeeds=ownerCertificates.certificates||[];
 for(const c of ownerSeeds){
  if(c.originalSourceSetSha256!==originalSourceSetSha256||
   c.originalTargetSha256!==originalTargetSha256||
   c.certificateStatus!=='INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED')
    throw Error('MIDCYCLE_ROOTED_OWNER_GOLDEN_ORIGINAL_SHA_OR_STATUS_MISMATCH');
  if(!establish(c.sourcePhysicalKey,String(c.targetPhysicalNodeId),{
   tier:'ORIGINAL_OWNER_NODENAME_GOLDEN_PLUS_ORIGINAL_GEOMETRY',
   trustedRootPhysicalWitnessIds:c.originalPhysicalWitnessIds,
  }))throw Error('MIDCYCLE_ROOTED_OWNER_TRUSTED_SEED_CONFLICT_OR_MISSING_ORIGINAL_WITNESS');
 }
 let globalShapeSeeds=0;
 for(const c of globalShape.uniquePlacementPhysicalNodes||[]){
  const sk=String(c.sourcePhysicalKey),tid=String(c.targetPhysicalNodeId);
  if(verified.has(sk))continue;
  if(establish(sk,tid,{
   tier:'EXHAUSTIVE_ORIGINAL_TARGET_TRANSLATION_UNIQUE_GEOMETRIC_SHAPE',
   trustedRootPhysicalWitnessIds:[c.globalOriginalShapeWitness],
  }))globalShapeSeeds++;
 }
 const sourcePathCache=new Map(),targetPathCache=new Map();
 const sourcePaths=(sourceId,root)=>{
  const id=key(sourceId,root);
  if(!sourcePathCache.has(id))sourcePathCache.set(id,rootedShortestPhysicalPaths(sourceGraphs.get(sourceId),root));
  return sourcePathCache.get(id);
 };
 const targetPaths=root=>{
  if(!targetPathCache.has(root))targetPathCache.set(root,rootedShortestPhysicalPaths(targetGraph,root));
  return targetPathCache.get(root);
 };
 const potentialTargets=[...targetGraph.adjacency.keys()];
 const steps=[];
 for(let pass=0;pass<150;pass++){
  const before=verified.size,candidates=[];
  for(const [sk,tid] of allBound){
   if(verified.has(sk)||claimantConflicts.has(tid))continue;
   const [sourceId,id]=sk.split(':'),g=sourceGraphs.get(sourceId);
   const sourcePos=g.positions.get(id);
   if(!sourcePos||!localMap.get(sk)?.independentLocalRouteWitnesses?.length)continue;
   const rootedProofs=[];
   for(const [trustedKey,trustedTarget] of verified){
    if(!trustedKey.startsWith(sourceId+':'))continue;
    const anchorSourceId=trustedKey.slice(sourceId.length+1);
    const sourcePath=sourcePaths(sourceId,anchorSourceId).get(id);
    if(!sourcePath||sourcePath.hops===0||sourcePath.ways!==1||sourcePath.totalLengthMm<=0)continue;
    // Original graph walk must have one unique minimum-hop route.
    const targetPathsFromRoot=targetPaths(trustedTarget);
    let first=null,n=0;
    for(const candidateId of potentialTargets){
     if(candidateId===trustedTarget)continue;
     const p=targetPathsFromRoot.get(candidateId);
     if(!p||p.ways!==1)continue;
     if(Math.abs(p.totalLengthMm-sourcePath.totalLengthMm)>pathLengthToleranceMm)continue;
     const vectorDelta=Math.hypot(...p.vector.map((v,i)=>v-sourcePath.vector[i]));
     if(vectorDelta>vectorToleranceMm)continue;
     n++;
     if(n===1)first=candidateId;
     if(n>1)break;
    }
    if(n===1&&first===tid){
     rootedProofs.push({
      anchorSourcePhysicalKey:trustedKey,anchorTargetPhysicalNodeId:trustedTarget,
      originalSourceHops:sourcePath.hops,
      originalSourcePathLengthMm:sourcePath.totalLengthMm,
      originalPhysicalVectorMm:sourcePath.vector,
      originalAlternativeTargetCandidateCount:n,
     });
    }
   }
   if(rootedProofs.length)candidates.push({sk,tid,rootedProofs});
  }
  // Only credit after all roots in the current pass are established; no
  // uncontrolled circular source/target hypothesis mutual certification.
  for(const c of candidates)establish(c.sk,c.tid,{
    tier:'TRUSTED_ROOT_EXHAUSTIVE_ORIGINAL_VECTOR_AND_PATH_UNIQUE_TARGET',
    originalIndependentRouteEvidence:c.rootedProofs,
    trustedRootPhysicalWitnessIds:c.rootedProofs.map(x=>'ROOT:'+x.anchorSourcePhysicalKey+'=>'+x.anchorTargetPhysicalNodeId),
  });
  steps.push({round:pass+1,certificatesBefore:before,certificatesAfter:verified.size,newCertificates:verified.size-before});
  if(verified.size===before)break;
 }
 const certificates=[...verified].map(([sk,tid])=>frozen({
  sourcePhysicalKey:sk,targetPhysicalNodeId:tid,
  certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
  originalSourceSetSha256,originalTargetSha256,
  originalPhysicalWitnessIds:frozen([
   'ORIGINAL_GEOMETRY_AND_TARGET_GRAPH_UNIQUE_ROOTED_PHYSICAL_MATCH:'+sk,
   ...(provenanceBySource.get(sk)?.trustedRootPhysicalWitnessIds||[]),
  ]),
  certificateBasis:provenanceBySource.get(sk).tier,
 }));
 const perMember=['S1','S2','S3'].map(sourceId=>({
  sourceId,independentlyRootedPhysicalMatches:certificates.filter(c=>c.sourcePhysicalKey.startsWith(sourceId+':')).length,
  boundPhysicalNodes:[...allBound.keys()].filter(k=>k.startsWith(sourceId+':')).length,
 }));
 return frozen({
  schema:'CiiMidcycle150RootedOriginalPhysicalWitnessProof.v1',
  originalSourceSetSha256,originalTargetSha256,
  totalSourcePhysicalNodes:150,totalMatcherBoundPhysicalNodes:allBound.size,
  ownerGoldenSeeds:ownerSeeds.length,
  additionalExhaustiveGlobalGeometrySeeds:globalShapeSeeds,
  independentlyRootedVerifiedPhysicalNodes:verified.size,
  unresolvedBoundPhysicalNodes:allBound.size-verified.size,
  strict70PercentPhysicalGoalMet:verified.size>=105,
  targetReuseConflicts:claimantConflicts.size,
  sourcePerMember:frozen(perMember),proofRounds:frozen(steps),
  proofPathsUseIndependentOriginalElements:true,
  originalTargetAlternativeSearchAllNodes:true,
  originalOwnerGoldenNeverFedToProductionMatcher:true,
  certificates:frozen(certificates),
 });
}

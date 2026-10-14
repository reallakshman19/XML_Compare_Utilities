/**
 * ARCH-01 A2-SHADOW-05 — independently reconcile recovered hypotheses.
 *
 * NOT a product correspondence engine; no Writer or APPLY authority.
 * Replays every A2-04 physical path from canonical immutable SOURCE/TARGET
 * graphs before adding to an isolated clone of A2-01 candidate domains.
 * Re-runs A2-02 and A2-03 without changing original evidence.
 */
import { createHash } from 'node:crypto';
import { ciiTransferPhysicalEntityRef } from '../tabs/cii-workspace/architecture/cii-transfer-capability-contracts.js';
import { inspectCiiA2PhysicalConstraints } from './cii-architecture-a2-physical-path-constraints.mjs';
import { solveCiiA2GlobalShadow } from './cii-architecture-a2-global-constraint-shadow.mjs';

const s=(v)=>String(v??'').trim();
const cmp=(a,b)=>s(a).localeCompare(s(b),undefined,{numeric:true});
const digest=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sorted=(values)=>[...values].sort(cmp);
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==='object')return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([k,v])=>[k,freeze(v)])));
  return value;
}
function fail(code){throw Error('A205_'+code);}
function graphValid(graph,side,hash){
  if(graph?.side!==side||graph.documentId!==side+':'+hash
    ||!Array.isArray(graph.edges)||!(graph.adjacency instanceof Map))fail('GRAPH_BRIDGE_CUSTODY_INVALID');
  const byId=new Map();
  for(const e of graph.edges){
    if(!s(e.elementId)||byId.has(e.elementId)||!s(e.from)||!s(e.to)
      ||!(graph.adjacency.get(s(e.from))||[]).some(x=>x.elementId===e.elementId)
      ||!(graph.adjacency.get(s(e.to))||[]).some(x=>x.elementId===e.elementId))
      fail('GRAPH_EDGE_INCIDENCE_INVALID');
    byId.set(s(e.elementId),e);
  }
  return byId;
}
const nodeKey=(sId,n)=>s(sId)+':'+s(n);
function verifyLineage(proposal,w,sourceGraph,targetGraph,sourceEdgeIndex,targetEdgeIndex,rootDomains,priorDomains,policy){
  const fromKey=s(w.fromSourceNode),sourceKey=s(proposal.sourceNodeKey);
  const sid=s(proposal.sourceId);
  if(w.origin!=='A2_04_SPECULATIVE_TOPOLOGY_FRONTIER'||!fromKey.startsWith(sid+':')
    ||!rootDomains.has(fromKey)||!rootDomains.has(sourceKey)||fromKey===sourceKey
    ||!s(w.sourceElementId)||!Array.isArray(w.targetElementIds)
    ||!Array.isArray(w.targetNodePath)||w.targetElementIds.length<1
    ||w.targetElementIds.length>policy.maxTargetPathSegments
    ||w.targetNodePath.length!==w.targetElementIds.length+1)
    fail('WITNESS_SHAPE_OR_NAMESPACE_INVALID');
  const edge=sourceEdgeIndex.get(w.sourceElementId);
  if(!edge||![[nodeKey(sid,edge.from),nodeKey(sid,edge.to)],
    [nodeKey(sid,edge.to),nodeKey(sid,edge.from)]]
    .some(([a,b])=>a===fromKey&&b===sourceKey))
    fail('WITNESS_SOURCE_EDGE_NOT_INCIDENT');
  if(!priorDomains.get(fromKey)?.has(w.fromTargetNode))
    fail('WITNESS_SEED_NOT_ORIGINALLY_OR_EARLIER_ATTESTED');
  if(w.targetNodePath[0]!==w.fromTargetNode
    ||w.targetNodePath.at(-1)!==proposal.targetNodeId
    ||new Set(w.targetNodePath).size!==w.targetNodePath.length
    ||!targetGraph.adjacency.has(proposal.targetNodeId))
    fail('WITNESS_TARGET_ENDPOINT_OR_SIMPLE_PATH_INVALID');
  let sum=0,vector=[0,0,0],warningOD=false,warningWall=false;
  for(let i=0;i<w.targetElementIds.length;i++){
    const edgeId=s(w.targetElementIds[i]),e=targetEdgeIndex.get(edgeId);
    const a=w.targetNodePath[i],b=w.targetNodePath[i+1];
    if(!e||!((s(e.from)===a&&s(e.to)===b)||(s(e.to)===a&&s(e.from)===b)))
      fail('WITNESS_TARGET_PHYSICAL_PATH_INVALID');
    if(i>0&&(targetGraph.adjacency.get(a)||[]).length!==2)
      fail('WITNESS_SUBDIVISION_INTERIOR_IS_BRANCH');
    if(s(e.componentKind)!==s(edge.componentKind)
      ||(w.targetElementIds.length>1&&s(edge.componentKind)!=='PIPE'))
      fail('WITNESS_COMPONENT_KIND_INCOMPATIBLE');
    const length=Number(e.lengthMm),sLen=Number(edge.lengthMm);
    if(!Number.isFinite(length)||length<=0||!Number.isFinite(sLen)||sLen<=0)
      fail('WITNESS_LENGTH_INVALID');
    sum+=length;
    const dir=s(e.from)===a?1:-1;
    for(let j=0;j<3;j++)vector[j]+=dir*Number([e.dx,e.dy,e.dz][j]);
    if(Math.abs(Number(e.diameter)-Number(edge.diameter))>policy.diameterWarningToleranceMm)warningOD=true;
    if(Math.abs(Number(e.wall)-Number(edge.wall))>policy.wallWarningToleranceMm)warningWall=true;
  }
  if(!Number.isFinite(Number(edge.diameter))||!Number.isFinite(Number(edge.wall))
    ||Math.abs(sum-Number(edge.lengthMm))>policy.pathLengthToleranceMm+1e-7)
    fail('WITNESS_PHYSICAL_METRIC_MISMATCH');
  const straight=Math.hypot(...vector)/Math.max(sum,1);
  if(w.targetElementIds.length>1&&(
    straight+1e-9<policy.minStraightness||
    Math.abs(straight-Math.hypot(Number(edge.dx),Number(edge.dy),Number(edge.dz))/Number(edge.lengthMm))
      >policy.straightnessTolerance+1e-9))fail('WITNESS_SUBDIVISION_NOT_STRAIGHT');
  if(Math.abs(Number(w.lengthDeltaMm)-Math.abs(sum-Number(edge.lengthMm)))>0.002
    ||Math.abs(Number(w.targetStraightness)-straight)>0.000002)
    fail('WITNESS_REPORTED_PHYSICAL_METRICS_TAMPERED');
  const warnings=[
    ...(warningOD?['OD_ENGINEERING_REVISION_OBSERVATION']:[]),
    ...(warningWall?['WALL_ENGINEERING_REVISION_OBSERVATION']:[]),
  ];
  if(JSON.stringify(warnings)!==JSON.stringify(w.propertyWarnings||[]))
    fail('WITNESS_ENGINEERING_PROPERTY_WARNING_TAMPERED');
  return freeze({
    sourceMember:sid,sourceNodeKey:sourceKey,sourceElementId:s(edge.elementId),
    fromSourceNode:fromKey,fromTargetNode:w.fromTargetNode,
    targetNodeId:proposal.targetNodeId,
    targetElementIds:[...w.targetElementIds],targetNodePath:[...w.targetNodePath],
    propertyWarnings:warnings,sourceOriginalHash:proposal.sourceOriginalSha256,
    targetOriginalHash:proposal.originalTargetSha256,round:proposal.round,
    status:'INDEPENDENT_LOCAL_WITNESS_RECHECKED_NOT_CERTIFIED',
  });
}
export function reconcileCiiA2RecoveredFrontier({
  joint,originalPathAudit,frontier,sourceGraphsById={},targetGraph,
  normalizedSourceShaById={},normalizedTargetSha256,
  pathPolicy={},globalPolicy={},
}={}){
  if(joint?.schema!=='CiiArchitectureA2ShadowJointEvidence.v1'
    ||joint?.status!=='SHADOW_REVIEW_ONLY'||joint.writerDispatchInstalled!==false
    ||joint.transferPlan!==null||joint.writeScope!==null)
    fail('ORIGINAL_JOINT_NONWRITING_REQUIRED');
  if(originalPathAudit?.schema!=='CiiArchitectureA2PhysicalConstraintAudit.v1'
    ||originalPathAudit.status!=='SHADOW_PHYSICAL_CONSTRAINTS_ONLY'
    ||originalPathAudit.writerReady!==false)
    fail('ORIGINAL_PATH_NONWRITING_REQUIRED');
  if(frontier?.schema!=='CiiArchitectureA204FrontierRecovery.v1'
    ||frontier.status!=='PROVISIONAL_FRONTIER_HYPOTHESES_NONWRITING'
    ||frontier.writerReady!==false||frontier.transferPlan!==null
    ||frontier.writeScope!==null||frontier.certifiedNodeCount!==0
    ||frontier.certifiedElementCount!==0)
    fail('NONWRITING_FRONTIER_REQUIRED');
  const custody=joint.provenance;
  const pa=originalPathAudit.provenance,fp=frontier.provenance;
  if(pa.originalSourceSetSha256!==custody.sourceSetSha256
    ||pa.originalTargetSha256!==custody.originalTargetSha256
    ||pa.jointSnapshotDigest!==custody.physicalOriginalSnapshotDigest
    ||fp.originalSourceSetSha256!==custody.sourceSetSha256
    ||fp.originalTargetSha256!==custody.originalTargetSha256
    ||fp.physicalOriginalSnapshotDigest!==custody.physicalOriginalSnapshotDigest
    ||fp.parentJointCandidateDigest!==digest(joint.hypotheses.map(x=>[x.sourceNodeKey,x.targetNodeId]))
    ||fp.parentLocalPathPolicyDigest!==originalPathAudit.policyDigest
    ||fp.normalizedTargetSha256!==pa.normalizedTargetSha256
    ||JSON.stringify(fp.normalizedSourceShaById)!==JSON.stringify(pa.normalizedSourceShaById)
    ||digest(frontier.policy)!==frontier.policyDigest)
    fail('FRONTIER_PROVENANCE_OR_POLICY_STALE');
  if(frontier.statusFlags.includes('ENUMERATION_TRUNCATED_NO_COMPLETENESS_CLAIM'))
    fail('TRUNCATED_FRONTIER_NOT_ADMITTED_FOR_RECONCILIATION');
  const members=sorted(Object.keys(custody.originalSourceShaById||{}));
  if(!members.length||members.join('|')!==sorted(Object.keys(sourceGraphsById)).join('|')
    ||members.join('|')!==sorted(Object.keys(normalizedSourceShaById)).join('|'))
    fail('SOURCE_MEMBER_SET_INCOMPLETE');
  const sourceEdgeMaps=new Map();
  for(const sid of members){
    if(pa.normalizedSourceShaById[sid]!==normalizedSourceShaById[sid])
      fail('SOURCE_NORMALIZED_HASH_MISMATCH');
    sourceEdgeMaps.set(sid,graphValid(sourceGraphsById[sid],'SOURCE',normalizedSourceShaById[sid]));
  }
  if(pa.normalizedTargetSha256!==normalizedTargetSha256)fail('TARGET_NORMALIZED_HASH_MISMATCH');
  const targetEdges=graphValid(targetGraph,'TARGET',normalizedTargetSha256);
  const rootDomains=new Map(),targetsByKey=new Map();
  for(const row of joint.nodeRows){
    if(row.sourceNodeKey!==nodeKey(row.sourceId,row.sourceNodeId)||rootDomains.has(row.sourceNodeKey))
      fail('SOURCE_PHYSICAL_NODE_CENSUS_INVALID');
    const set=new Set(row.targets||[]);
    if(set.size!==row.targets.length)fail('DUPLICATE_ORIGINAL_TARGET_CANDIDATE');
    rootDomains.set(row.sourceNodeKey,set);
    targetsByKey.set(row.sourceNodeKey,new Set(set));
  }
  if(rootDomains.size!==joint.summary.originalPhysicalSourceNodes)fail('PHYSICAL_NODE_POPULATION_CHANGED');
  const proposals=[...(frontier.proposals||[])].sort((a,b)=>a.round-b.round||cmp(a.sourceNodeKey,b.sourceNodeKey)||cmp(a.targetNodeId,b.targetNodeId));
  if(proposals.length!==frontier.newDistinctHypotheses)fail('FRONTIER_PROPOSAL_CENSUS_CHANGED');
  const seen=new Set(),witnesses=[];
  const rootMissing=originalPathAudit.edgeRows.filter(x=>x.status==='ENDPOINT_CANDIDATE_MISSING');
  if(rootMissing.length!==frontier.originalMissingPhysicalElementFactors)
    fail('MISSING_SOURCE_ELEMENT_BASELINE_CHANGED');
  const originalMissingKeys=rootMissing.map(x=>nodeKey(x.sourceMember,x.sourceElementId)).sort(cmp);
  if(frontier.rootCauses.length!==rootMissing.length
    ||JSON.stringify(sorted(frontier.rootCauses.map(x=>nodeKey(x.sourceMember,x.sourceElementId))))
      !==JSON.stringify(originalMissingKeys))fail('INCOMPLETE_FACTOR_CAUSE_INVENTORY_MISMATCH');
  const witnessBySource=new Map(),rounds=sorted(new Set(proposals.map(x=>x.round)));
  for(const round of rounds){
    const phase=proposals.filter(x=>x.round===round);
    const prior=new Map([...targetsByKey].map(([k,v])=>[k,new Set(v)]));
    for(const proposal of phase){
      const key=nodeKey(proposal.sourceId,proposal.sourceNodeId);
      if(key!==proposal.sourceNodeKey||!rootDomains.has(key)
        ||!Number.isSafeInteger(round)||round<1||round>frontier.policy.maxRounds
        ||seen.has(JSON.stringify([key,proposal.targetNodeId]))
        ||rootDomains.get(key).has(proposal.targetNodeId)
        ||proposal.sourceOriginalSha256!==custody.originalSourceShaById[proposal.sourceId]
        ||proposal.originalTargetSha256!==custody.originalTargetSha256
        ||proposal.certified!==false||proposal.canBindScope!==false
        ||proposal.claimStatus!=='RECOVERED_UNVERIFIED_TOPOLOGY_HYPOTHESIS'
        ||!Array.isArray(proposal.hypotheses)||!proposal.hypotheses.length
        ||proposal.hypotheses.length>frontier.policy.maxWitnessesPerProposal
        ||digest({sourceNodeKey:key,targetNodeId:proposal.targetNodeId,
          probes:proposal.hypotheses})!==proposal.evidenceDigest)
        fail('FRONTIER_CLAIM_IDENTITY_OR_EVIDENCE_DIGEST_INVALID');
      seen.add(JSON.stringify([key,proposal.targetNodeId]));
      const list=[];
      for(const w of proposal.hypotheses){
        const checked=verifyLineage(proposal,w,sourceGraphsById[proposal.sourceId],
          targetGraph,sourceEdgeMaps.get(proposal.sourceId),targetEdges,rootDomains,prior,frontier.policy);
        list.push(checked);witnesses.push(checked);
      }
      witnessBySource.set(key,(witnessBySource.get(key)||0)+1);
    }
    for(const proposal of phase)targetsByKey.get(proposal.sourceNodeKey).add(proposal.targetNodeId);
  }
  const byTarget=new Map();
  for(const [key,values] of targetsByKey)for(const target of values){
    if(!byTarget.has(target))byTarget.set(target,new Set());
    byTarget.get(target).add(key);
  }
  const collisions=proposals.filter(x=>byTarget.get(x.targetNodeId).size>1)
    .map(x=>freeze({sourceNodeKey:x.sourceNodeKey,targetNodeId:x.targetNodeId,
      otherSourceNodeKeys:sorted([...byTarget.get(x.targetNodeId)].filter(k=>k!==x.sourceNodeKey))}));
  const augmentedHypotheses=[
    ...joint.hypotheses,
    ...proposals.map(x=>{
      const sourceRef=ciiTransferPhysicalEntityRef({side:'SOURCE',sourceId:x.sourceId,
        originalSha256:custody.originalSourceShaById[x.sourceId],
        entityKind:'NODE',physicalId:x.sourceNodeId});
      const targetRef=ciiTransferPhysicalEntityRef({side:'TARGET',
        originalSha256:custody.originalTargetSha256,
        entityKind:'NODE',physicalId:x.targetNodeId});
      return freeze({
        claimId:digest({physicalOriginalSnapshotDigest:custody.physicalOriginalSnapshotDigest,
          source:sourceRef,target:targetRef}).slice(0,32),
        sourceRef,targetRef,sourceNodeKey:x.sourceNodeKey,targetNodeId:x.targetNodeId,
        evidence:[{origin:'A2_04_SPECULATIVE_TOPOLOGY_FRONTIER',
          replayMode:'A2_04_RECOVERY_NOT_REVIEWED',round:x.round,
          physicalQualification:'UNVERIFIED_PATH_CONTINUATION'}],
        evidenceDigest:x.evidenceDigest,
        claimStatus:'RECOVERED_UNVERIFIED_TOPOLOGY_HYPOTHESIS',canBindScope:false,
      });
    }),
  ];
  const augmentedRows=joint.nodeRows.map(row=>{
    const targets=sorted(targetsByKey.get(row.sourceNodeKey));
    const competition=targets.length>1;
    const custodyConflict=targets.some(x=>(byTarget.get(x)?.size||0)>1);
    const reasons=[
      ...(competition?['COMPETING_TARGET_IDENTITIES']:[]),
      ...(custodyConflict?['SHARED_TARGET_CUSTODY_NOT_QUALIFIED']:[]),
      'GLOBAL_PHYSICAL_CERTIFICATION_NOT_IMPLEMENTED',
    ];
    return freeze({...row,targets,
      claimIds:augmentedHypotheses.filter(h=>h.sourceNodeKey===row.sourceNodeKey).map(h=>h.claimId),
      state:targets.length===0?'UNMAPPED':competition||custodyConflict?'CONFLICT':'REVIEW_REQUIRED',
      reasons:targets.length?reasons:['NO_QUALIFIED_CANDIDATE_EMITTED'],
      certified:false,certificationId:null,writerReady:false,scopeApplyIds:[]});
  });
  const counts=Object.fromEntries(['UNMAPPED','REVIEW_REQUIRED','CONFLICT'].map(state=>
    [state,augmentedRows.filter(r=>r.state===state).length]));
  const augmented=freeze({
    ...joint,
    authority:'A2_01_ORIGINAL_PLUS_A2_04_UNVERIFIED_AUGMENTED_SHADOW',
    hypotheses:augmentedHypotheses,nodeRows:augmentedRows,
    summary:{...joint.summary,distinctSourceTargetHypotheses:augmentedHypotheses.length,
      byState:counts,directlyCompetingSourceNodes:augmentedRows.filter(r=>r.targets.length>1).map(r=>r.sourceNodeKey),
      sharedTargetCustodyNodes:augmentedRows.filter(r=>r.reasons.includes('SHARED_TARGET_CUSTODY_NOT_QUALIFIED')).map(r=>r.sourceNodeKey),
      physicallyCertifiedNodeCount:0,writerReadyOperationCount:0},
    augmentedBy:'A2_05_SEPARATE_NON_WRITING_HYPOTHESIS_RECONCILIATION',
    writerDispatchInstalled:false,transferPlan:null,writeScope:null,
  });
  // The second factor run is independent: A2-02 enumerates paths again from
  // the cloned NODE domains and the original canonical graphs, not A2-04 paths.
  const revisedPathAudit=inspectCiiA2PhysicalConstraints({
    joint:augmented,sourceGraphsById,targetGraph,normalizedSourceShaById,
    normalizedTargetSha256,policy:pathPolicy,
  });
  const revisedGlobal=solveCiiA2GlobalShadow({joint:augmented,pathAudit:revisedPathAudit,policy:globalPolicy});
  const statuses=(audit)=>Object.fromEntries(sorted(new Set(audit.edgeRows.map(x=>x.status))).map(status=>
    [status,audit.edgeRows.filter(x=>x.status===status).length]));
  const comparison=originalPathAudit.edgeRows.map(old=>{
    const current=revisedPathAudit.edgeRows.find(x=>x.sourceMember===old.sourceMember&&x.sourceElementId===old.sourceElementId);
    if(!current)fail('RECOMPUTED_SOURCE_ELEMENT_CENSUS_MISMATCH');
    return freeze({sourceMember:old.sourceMember,sourceElementId:old.sourceElementId,
      originalStatus:old.status,recomputedStatus:current.status,
      originalPairCount:old.candidatePairCount,recomputedPairCount:current.candidatePairCount,
      originalLocalPathWitnesses:old.pathWitnesses.length,
      recomputedLocalPathWitnesses:current.pathWitnesses.length,
      statusChanged:old.status!==current.status});
  });
  const missingBefore=originalPathAudit.edgeRows.filter(x=>x.status==='ENDPOINT_CANDIDATE_MISSING').length;
  const missingAfter=revisedPathAudit.edgeRows.filter(x=>x.status==='ENDPOINT_CANDIDATE_MISSING').length;
  if(missingBefore!==frontier.originalMissingPhysicalElementFactors
    ||missingAfter!==frontier.remainingFactorsWithoutBothEndpointHypotheses)
    fail('REGENERATED_ENDPOINT_COVERAGE_DISAGREES_WITH_FRONTIER_LEDGER');
  return freeze({
    schema:'CiiArchitectureA205FrontierReconciliation.v1',status:'RECONCILED_SHADOW_NONWRITING',
    originalPhysicalSnapshotDigest:custody.physicalOriginalSnapshotDigest,
    frontierEvidenceDigest:digest(frontier.proposals),
    originalCandidateCount:joint.hypotheses.length,addedCandidateCount:proposals.length,
    augmentedCandidateCount:augmentedHypotheses.length,
    uniqueNewlyCoveredNodes:witnessBySource.size,
    independentlyRecheckedPhysicalWitnesses:witnesses.length,
    proposalsWithSharedTargetCustodyWarnings:collisions.length,
    sharedTargetCustodyConflicts:collisions,
    originalFactorStatusCounts:statuses(originalPathAudit),
    recomputedFactorStatusCounts:statuses(revisedPathAudit),
    originalEndpointMissingFactors:missingBefore,
    recomputedEndpointMissingFactors:missingAfter,
    factorStatusChanges:comparison.filter(x=>x.statusChanged),
    allFactorComparisons:comparison,
    originalGlobalComponentCounts:null,
    recomputedGlobalComponentCounts:revisedGlobal.componentStates,
    recomputedGlobalComponents:revisedGlobal.components.map(x=>({
      sourceNodes:x.sourceNodes.length,sourceElements:x.sourceElements.length,
      status:x.status,incompleteFactors:x.factorsNotQualified?.length||0,
      solutionWitnesses:x.distinctSolutionWitnesses,
    })),
    augmentedJoint:augmented,recomputedPathAudit:revisedPathAudit,recomputedGlobalAudit:revisedGlobal,
    certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
    correspondenceCertificates:[],transferPlan:null,writeScope:null,
    limitations:[
      'CLONED_PROPOSALS_NOT_INDEPENDENT_M1_M2_IDENTITY_CERTIFICATES',
      'REGENERATED_PATH_FACTORS_ONLY_BOUNDED_LOCAL_FACTORS',
      'GLOBAL_UNIQUE_ASSIGNMENT_IF_ANY_STILL_NOT_WRITER_PROOF',
      'SOURCE_MEMBER_AND_CROSS_SOURCE_TARGET_CUSTODY_REMAIN_CONSERVATIVE',
      'NO_P1_RESTRAINT_NODE_NAME_WRITER_ADMISSION',
    ],
  });
}
export function assertCiiA205NoWrite(value){
  if(value?.schema!=='CiiArchitectureA205FrontierReconciliation.v1')
    fail('RECONCILIATION_SCHEMA_REQUIRED');
  fail('GLOBAL_SHADOW_RECONCILIATION_NEVER_WRITER_AUTHORITY');
}

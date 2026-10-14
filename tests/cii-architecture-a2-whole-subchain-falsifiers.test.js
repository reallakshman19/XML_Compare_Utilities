import {reviewCiiA213WholeSubchains,assertCiiA213NoWrite} from '../scripts/cii-architecture-a2-whole-subchain-falsifiers.mjs';
import {inspectCiiA212HeldOutDiscrepancies,assertCiiA212NoWrite} from '../scripts/cii-architecture-a2-heldout-discrepancies.mjs';
import {exploreCiiA211IndexedNativeGeometry,assertCiiA211NoWrite} from '../scripts/cii-architecture-a2-indexed-native-recall.mjs';
import {discoverCiiA210NativeGeometryHypotheses,assertCiiA210NoWrite} from '../scripts/cii-architecture-a2-native-geometry-hypotheses.mjs';
import { examineCiiA209IndependentRegistration,assertCiiA209NoWrite } from '../scripts/cii-architecture-a2-independent-registration.mjs';
import { investigateCiiA208GeometryRevision,assertCiiA208NoWrite } from '../scripts/cii-architecture-a2-geometry-revision-falsifiers.mjs';
import { investigateCiiA206PhysicalIslands,assertCiiA206NoWrite } from '../scripts/cii-architecture-a2-island-triage.mjs';
import { reconcileCiiA2RecoveredFrontier,assertCiiA205NoWrite } from '../scripts/cii-architecture-a2-frontier-reconciliation.mjs';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { recoverCiiA2FrontierHypotheses,assertCiiA204NoWrite } from '../scripts/cii-architecture-a2-frontier-recovery.mjs';
import { buildCiiA2ShadowJointEvidence } from '../scripts/cii-architecture-a2-shadow-joint-evidence.mjs';
import { inspectCiiA2PhysicalConstraints } from '../scripts/cii-architecture-a2-physical-path-constraints.mjs';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewFromPreparedSession,createCiiCommonAnalysisCache } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const h=(c)=>c.repeat(64);
const sha=(v)=>createHash('sha256').update(v).digest('hex');
function graph(side,normal,edges){
  const rows=edges.map(([elementId,from,to,lengthMm,diameter=100,wall=5,componentKind='PIPE'])=>({
    elementId,from,to,lengthMm,diameter,wall,componentKind,dx:lengthMm,dy:0,dz:0,
  }));
  const adjacency=new Map();
  for(const e of rows)for(const n of [e.from,e.to]){
    if(!adjacency.has(n))adjacency.set(n,[]);
    adjacency.get(n).push(e);
  }
  return {side,documentId:side+':'+normal,edges:rows,adjacency};
}
const s1=graph('SOURCE',h('1'),[['ES1','A','B',10],['ES2','B','C',8]]);
const s2=graph('SOURCE',h('2'),[]);
const target=graph('TARGET',h('3'),[
  ['E1','X','M',4,100,8],['E2','M','Y',6,100,8],['E3','Y','Z',8,100,8],
]);
const custody={
  sourceSetSha256:h('4'),originalTargetSha256:h('5'),
  originalSourceShaById:{S1:h('6'),S2:h('7')},physicalOriginalSnapshotDigest:h('8'),
};
const row=(sourceId,sourceNodeId,targets)=>({
  sourceId,sourceNodeId,sourceNodeKey:sourceId+':'+sourceNodeId,targets,
});
const originalRows=[row('S1','A',['X']),row('S1','B',[]),row('S1','C',[]),row('S2','Q',[])];
const hypotheses=[{sourceNodeKey:'S1:A',targetNodeId:'X',sourceRef:{
  sourceId:'S1',physicalId:'A',originalSha256:h('6')},
  targetRef:{physicalId:'X',originalSha256:h('5')}}];
const joint={schema:'CiiArchitectureA2ShadowJointEvidence.v1',status:'SHADOW_REVIEW_ONLY',
  writerDispatchInstalled:false,transferPlan:null,writeScope:null,
  provenance:custody,nodeRows:originalRows,hypotheses,summary:{originalPhysicalSourceNodes:4}};
const factor=(sourceElementId,a,b)=>({
  sourceMember:'S1',sourceElementId,sourceEndpoints:[a,b],
  candidatePairCount:0,pathWitnesses:[],truncated:false,status:'ENDPOINT_CANDIDATE_MISSING',
  blockers:['SOURCE_EDGE_ENDPOINT_NOT_IN_HYPOTHESIS_LEDGER'],
});
const audit={schema:'CiiArchitectureA2PhysicalConstraintAudit.v1',
  status:'SHADOW_PHYSICAL_CONSTRAINTS_ONLY',writerReady:false,
  certifiedNodeCount:0,certifiedElementCount:0,transferPlan:null,writeScope:null,
  provenance:{originalSourceSetSha256:h('4'),originalTargetSha256:h('5'),
    jointSnapshotDigest:h('8'),normalizedTargetSha256:h('3'),
    normalizedSourceShaById:{S1:h('1'),S2:h('2')}},
  policyDigest:h('9'),sourceElementCountExamined:2,
  edgeRows:[factor('ES1','A','B'),factor('ES2','B','C')]};
const args={joint,pathAudit:audit,sourceGraphsById:{S1:s1,S2:s2},targetGraph:target,
  policy:{pathLengthToleranceMm:0.01,maxRounds:2}};
const synthetic=recoverCiiA2FrontierHypotheses(args);
assert.equal(synthetic.schema,'CiiArchitectureA204FrontierRecovery.v1');
assert.equal(synthetic.originalMissingPhysicalElementFactors,2);
assert.deepEqual(synthetic.rootCauseCounts,{
  TO_ENDPOINT_HYPOTHESES_ABSENT:1,BOTH_ENDPOINT_HYPOTHESES_ABSENT:1,
});
assert.equal(synthetic.recoveryRoundEvidence.length,2);
assert.equal(synthetic.proposals.length,2);
assert.deepEqual(synthetic.proposals.map(x=>[x.sourceNodeKey,x.targetNodeId,x.round]),[
  ['S1:B','Y',1],['S1:C','Z',2],
]);
assert.deepEqual(synthetic.proposals[0].hypotheses[0].targetElementIds,['E1','E2']);
assert.deepEqual(synthetic.proposals[1].hypotheses[0].targetElementIds,['E3']);
assert.equal(synthetic.remainingFactorsWithoutBothEndpointHypotheses,0);
assert.equal(synthetic.sourceNodesOriginallyUnmapped.length,3);
assert.equal(synthetic.writerReady,false);
assert.equal(synthetic.certifiedNodeCount,0);
assert.equal(synthetic.certifiedElementCount,0);
assert.equal(synthetic.transferPlan,null);
assert.equal(synthetic.writeScope,null);
assert(Object.isFrozen(synthetic.proposals));
assert.throws(()=>assertCiiA204NoWrite(synthetic),/NEVER_WRITER_AUTHORITY/);
assert.equal(JSON.stringify(recoverCiiA2FrontierHypotheses(args)),JSON.stringify(synthetic));

const oneRound=recoverCiiA2FrontierHypotheses({...args,policy:{...args.policy,maxRounds:1}});
assert.equal(oneRound.proposals.length,1);
assert.equal(oneRound.remainingFactorsWithoutBothEndpointHypotheses,1);
const truncated=recoverCiiA2FrontierHypotheses({...args,policy:{
  ...args.policy,maxTraversalVisitsPerSeed:1}});
assert(truncated.statusFlags.includes('ENUMERATION_TRUNCATED_NO_COMPLETENESS_CLAIM'));
assert(truncated.remainingFactorsWithoutBothEndpointHypotheses>0);
const budget=recoverCiiA2FrontierHypotheses({...args,policy:{...args.policy,maxProposals:1}});
assert(budget.statusFlags.includes('ENUMERATION_TRUNCATED_NO_COMPLETENESS_CLAIM'));
assert.equal(budget.proposals.length,1);
const wallWarnings=recoverCiiA2FrontierHypotheses(args).proposals[0].hypotheses[0].propertyWarnings;
assert(wallWarnings.includes('WALL_ENGINEERING_REVISION_OBSERVATION'));
const branch=graph('TARGET',h('3'),[...target.edges.map(e=>[
  e.elementId,e.from,e.to,e.lengthMm,e.diameter,e.wall,e.componentKind]),
  ['BR','M','J',3]]);
const interrupted=recoverCiiA2FrontierHypotheses({...args,targetGraph:branch});
assert(!interrupted.proposals.some(x=>x.sourceNodeKey==='S1:B'&&x.targetNodeId==='Y'),
  'degree-3 target M cannot be an interior subdivision node');
const stale=structuredClone({joint,audit});stale.audit.provenance.originalTargetSha256=h('f');
assert.throws(()=>recoverCiiA2FrontierHypotheses({...args,joint:stale.joint,pathAudit:stale.audit}),
  /SOURCE_TARGET_CUSTODY_DIFFERENCE/);
const counterfeit=structuredClone({joint,audit});
counterfeit.joint.hypotheses[0].targetRef.originalSha256=h('f');
assert.throws(()=>recoverCiiA2FrontierHypotheses({...args,joint:counterfeit.joint,
  pathAudit:counterfeit.audit}),/UNATTESTED_OR_STALE_CANDIDATE/);
assert.throws(()=>recoverCiiA2FrontierHypotheses({...args,policy:{maxRounds:0}}),/BAD_POLICY/);

const originals={
  'S1.CII':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII':'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII':'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const bytes=Object.fromEntries(Object.entries(originals).map(([name,expected])=>{
  const value=readFileSync(new URL('../Benchmark/'+name,import.meta.url));
  assert.equal(sha(value),expected,name);return[name,value];
}));
const sources=[1,2,3].map(i=>({sourceId:'S'+i,fileName:'S'+i+'.CII',bytes:bytes['S'+i+'.CII']}));
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  {sources,targetBytes:bytes['T.CII'],targetFileName:'T.CII'},{cryptoRef:webcrypto});
const loops=Object.fromEntries(inspection.memberInspections.map(m=>{
  const choice=ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]);
  assert.equal(choice.status,'READY');return[m.sourceId,choice.baseLoops];
}));
function reviewed(preview){return Object.fromEntries(preview.memberPreviews.map(({sourceId,preview:p})=>[
  sourceId,{...(p.review||{}),
    reviewedCorrespondenceIds:(p.compareReview?.rows||[]).filter(x=>x.identityBound&&['HIGH','MEDIUM'].includes(x.confidence)).map(x=>x.correspondenceId),
    lockedCorrespondenceIds:(p.compareReview?.rows||[]).filter(x=>x.decision==='LOCKED').map(x=>x.correspondenceId),
    rejectedCorrespondenceIds:[]},
]));}
const snapshots=[],cache=createCiiCommonAnalysisCache();
for(const {mode,opts} of [
  {mode:'AUTO_ONLY',opts:{baseLoopsBySource:loops}},
  {mode:'UI_MIXED_BASE_PROXY',opts:{baseLoopsBySource:{S1:loops.S1},
    anchorPairsBySource:{
      S2:[{sourceNodeId:'420',targetNodeId:'415'}],
      S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
    }}},
]){
  const first=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,opts,
    {cryptoRef:webcrypto,commonAnalysisCache:cache});
  const p=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,
    {...opts,reviewBySource:reviewed(first)},{cryptoRef:webcrypto,commonAnalysisCache:cache});
  snapshots.push({mode,sourceSetSha256:p.sourceSetSha256,
    originalTargetSha256:p.targetAuthority.originalSha256,audit:buildCiiSourceTargetAudit(p)});
}
const graphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const originalJoint=buildCiiA2ShadowJointEvidence({
  authority:{sourceSetSha256:snapshots[0].sourceSetSha256,
    originalTargetSha256:originals['T.CII'],
    originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,sha(s.bytes)]))},
  snapshots,manualClaims:[
    {sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
    {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'},
  ],
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
});
const pathAudit=inspectCiiA2PhysicalConstraints({
  joint:originalJoint,sourceGraphsById:graphs,
  targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
assert.equal(pathAudit.summary.ENDPOINT_CANDIDATE_MISSING,49);
const real=recoverCiiA2FrontierHypotheses({
  joint:originalJoint,pathAudit,sourceGraphsById:graphs,
  targetGraph:preparedSession.target.targetGraph,
  policy:{maxRounds:2},
});
assert.equal(real.originalMissingPhysicalElementFactors,49);
assert.equal(real.rootCauses.length,49);
assert.equal(real.sourceNodesOriginallyUnmapped.length,45);
assert.equal(real.writerReady,false);
assert.equal(real.certifiedNodeCount,0);
assert.equal(real.certifiedElementCount,0);
assert.equal(real.correspondenceCertificates.length,0);
assert(Object.isFrozen(real));
assert.equal(JSON.stringify(real),JSON.stringify(recoverCiiA2FrontierHypotheses({
  joint:originalJoint,pathAudit,sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  policy:{maxRounds:2},
})));
const reportPath=process.argv.find(x=>x.startsWith('--out='))?.slice('--out='.length);
if(reportPath){
  const dest=resolve(reportPath);
  if(dest.replaceAll('\\\\','/').includes('/Benchmark/'))
    throw Error('A204_ORIGINAL_BENCHMARK_MUST_REMAIN_READ_ONLY');
  mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,JSON.stringify(real,null,2),'utf8');
  const replayed=JSON.parse(readFileSync(dest,'utf8'));
  assert.equal(replayed.proposals.length,real.proposals.length);
  assert.equal(replayed.rootCauses.length,49);
  assert.equal(replayed.provenance.originalSourceSetSha256,real.provenance.originalSourceSetSha256);
}

const originalOpts={
  joint:originalJoint,originalPathAudit:pathAudit,frontier:real,
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
};
const evaluated=reconcileCiiA2RecoveredFrontier(originalOpts);
assert.equal(evaluated.schema,'CiiArchitectureA205FrontierReconciliation.v1');
assert.equal(evaluated.status,'RECONCILED_SHADOW_NONWRITING');
assert.equal(evaluated.originalCandidateCount,108);
assert.equal(evaluated.addedCandidateCount,22);
assert.equal(evaluated.augmentedCandidateCount,130);
assert.equal(evaluated.uniqueNewlyCoveredNodes,16);
assert.equal(evaluated.originalEndpointMissingFactors,49);
assert.equal(evaluated.recomputedEndpointMissingFactors,33);
assert.equal(evaluated.allFactorComparisons.length,147);
assert.equal(evaluated.recomputedPathAudit.sourceElementCountExamined,147);
assert.deepEqual(evaluated.recomputedFactorStatusCounts,{
  ENDPOINT_CANDIDATE_MISSING:33,LOCAL_PATH_AMBIGUOUS:6,
  LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS:108,
});
assert.equal(evaluated.proposalsWithSharedTargetCustodyWarnings,6);
assert.equal(evaluated.independentlyRecheckedPhysicalWitnesses,24);
assert.deepEqual(evaluated.originalGlobalComponentCounts,{INCOMPLETE_PHYSICAL_EVIDENCE:3});
assert.deepEqual(evaluated.recomputedGlobalComponentCounts,{INCOMPLETE_PHYSICAL_EVIDENCE:3});
assert.deepEqual(evaluated.originalGlobalComponents.map(x=>x.incompleteFactors),[23,12,14]);
assert.deepEqual(evaluated.recomputedGlobalComponents.map(x=>x.incompleteFactors),[18,7,8]);
assert.equal(evaluated.factorStatusChanges.length,16);

assert.equal(evaluated.recomputedGlobalAudit.originalPhysicalSourceNodeCount,150);
assert.equal(evaluated.recomputedGlobalAudit.certifiedNodeCount,0);
assert.equal(evaluated.recomputedGlobalAudit.certifiedElementCount,0);
assert.equal(evaluated.augmentedJoint.hypotheses.length,130);
assert.equal(evaluated.augmentedJoint.nodeRows.length,150);
assert.equal(evaluated.augmentedJoint.hypotheses.slice(0,108).length,108);
for(let i=0;i<108;i++)assert.equal(
  JSON.stringify(evaluated.augmentedJoint.hypotheses[i]),
  JSON.stringify(originalJoint.hypotheses[i]),'no prior physical claims may be rewritten');
for(const item of evaluated.augmentedJoint.hypotheses.slice(108)){
  assert.equal(item.claimStatus,'RECOVERED_UNVERIFIED_TOPOLOGY_HYPOTHESIS');
  assert.equal(item.canBindScope,false);
}
assert(evaluated.recomputedGlobalAudit.componentStates.INCOMPLETE_PHYSICAL_EVIDENCE>=1,
  'must not invent a complete certified global assignment from 33 missing factors');
assert.equal(evaluated.writerReady,false);
assert.equal(evaluated.transferPlan,null);
assert.equal(evaluated.writeScope,null);
assert.deepEqual(evaluated.correspondenceCertificates,[]);
assert.equal(evaluated.certifiedNodeCount,0);
assert.equal(evaluated.certifiedElementCount,0);
assert(Object.isFrozen(evaluated));
assert(Object.isFrozen(evaluated.augmentedJoint));
assert(Object.isFrozen(evaluated.recomputedPathAudit));
assert(Object.isFrozen(evaluated.recomputedGlobalAudit));
assert.throws(()=>assertCiiA205NoWrite(evaluated),/NEVER_WRITER_AUTHORITY/);
const repeat=reconcileCiiA2RecoveredFrontier(originalOpts);
assert.equal(JSON.stringify(evaluated),JSON.stringify(repeat));

const alteredTarget=structuredClone(real);
alteredTarget.proposals[0].originalTargetSha256='f'.repeat(64);
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:alteredTarget}),
  /FRONTIER_CLAIM_IDENTITY_OR_EVIDENCE_DIGEST_INVALID|FRONTIER_PROVENANCE_OR_POLICY_STALE/);
const staleDigest=structuredClone(real);
staleDigest.provenance.parentJointCandidateDigest='f'.repeat(64);
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:staleDigest}),
  /FRONTIER_PROVENANCE_OR_POLICY_STALE/);
const truncatedFrontier=structuredClone(real);
truncatedFrontier.statusFlags.push('ENUMERATION_TRUNCATED_NO_COMPLETENESS_CLAIM');
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:truncatedFrontier}),
  /TRUNCATED_FRONTIER_NOT_ADMITTED/);
const forgedPath=structuredClone(real);
forgedPath.proposals[0].hypotheses[0].targetElementIds[0]='NONEXISTENT_PHYSICAL_EDGE';
forgedPath.proposals[0].evidenceDigest=sha(JSON.stringify({
  sourceNodeKey:forgedPath.proposals[0].sourceNodeKey,
  targetNodeId:forgedPath.proposals[0].targetNodeId,
  probes:forgedPath.proposals[0].hypotheses,
}));
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:forgedPath}),
  /WITNESS_TARGET_PHYSICAL_PATH_INVALID/);
const wrongSeed=structuredClone(real);
wrongSeed.proposals[0].hypotheses[0].fromTargetNode='INVALID_SEED';
wrongSeed.proposals[0].evidenceDigest=sha(JSON.stringify({
  sourceNodeKey:wrongSeed.proposals[0].sourceNodeKey,
  targetNodeId:wrongSeed.proposals[0].targetNodeId,
  probes:wrongSeed.proposals[0].hypotheses,
}));
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:wrongSeed}),
  /WITNESS_SEED_NOT_ORIGINALLY_OR_EARLIER_ATTESTED|WITNESS_TARGET_ENDPOINT_OR_SIMPLE_PATH_INVALID/);
const falseCoverage=structuredClone(real);
falseCoverage.remainingFactorsWithoutBothEndpointHypotheses=0;
assert.throws(()=>reconcileCiiA2RecoveredFrontier({...originalOpts,frontier:falseCoverage}),
  /REGENERATED_ENDPOINT_COVERAGE_DISAGREES/);
assert.throws(()=>reconcileCiiA2RecoveredFrontier({
  ...originalOpts,normalizedTargetSha256:'f'.repeat(64)}),
  /TARGET_NORMALIZED_HASH_MISMATCH/);

const investigationInputs={
  reconciliation:evaluated,
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(
    m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
};
const triage=investigateCiiA206PhysicalIslands(investigationInputs);
assert.equal(triage.schema,'CiiArchitectureA206PhysicalReviewIslands.v1');
assert.equal(triage.status,'PHYSICAL_ISLAND_REVIEW_ONLY');
assert.equal(triage.summary.sourceNodeCount,150);
assert.equal(triage.summary.sourceElementCount,147);
assert.equal(triage.summary.unresolvedFactorCount,33);
assert.equal(triage.summary.missingIslandCount,8);
assert.equal(triage.summary.totalReviewItems,20);
assert.equal(triage.summary.targetComponentCountObserved,5);
assert.equal(triage.summary.targetBoundedProbeCount,16);
assert.deepEqual(Object.fromEntries(Object.entries(triage.summary.bySource)
  .map(([member,stats])=>[member,stats.missingIslands])),{S1:2,S2:3,S3:3});
assert.equal(triage.summary.ambiguousElementCount,6);
assert.equal(triage.summary.custodyWarningProposalCount,6);
assert.deepEqual(Object.fromEntries(Object.entries(triage.summary.bySource)
  .map(([member,stats])=>[member,stats.incompleteSourceElements])),
  {S1:18,S2:7,S3:8});
assert.equal(triage.missingIslands.reduce((sum,x)=>sum+x.missingElementCount,0),33);
const retainedGiant=triage.missingIslands.find(x=>x.id==='S1-ISLAND-002');
assert.equal(retainedGiant.missingElementCount,15);
assert.equal(retainedGiant.boundaryNodeIds.length,1);
assert.deepEqual(retainedGiant.sourceElementIds,[
  'E42:4960->4970','E43:4970->5000','E44:5000->5030','E45:5030->5040',
  'E46:5040->5070','E47:5070->5080','E48:5080->5110','E49:5110->5140',
  'E50:5140->5150','E51:5150->5160','E52:5160->5190','E53:5190->5200',
  'E54:5200->5210','E55:5210->5220','E56:5220->5229',
]);
assert.deepEqual(triage.missingIslands.filter(x=>x.sourceMember==='S1')
  .map(x=>x.missingElementCount),[3,15]);
assert.deepEqual(triage.missingIslands.filter(x=>x.sourceMember==='S2')
  .map(x=>x.missingElementCount),[1,2,4]);
assert.deepEqual(triage.missingIslands.filter(x=>x.sourceMember==='S3')
  .map(x=>x.missingElementCount),[3,2,3]);
assert.equal(triage.summary.missingIslandCount,triage.missingIslands.length);
assert.equal(triage.summary.totalReviewItems,
  triage.missingIslands.length+triage.ambiguousElements.length
  +triage.targetNodeCustodyWarnings.length);
assert.equal(triage.summary.targetComponentEnumerationComplete,true);
assert.equal(triage.summary.targetBoundedProbeCount,triage.boundedTargetProbes.length);
for(const island of triage.missingIslands){
  assert(island.sourceNodeIds.length>=2,'island includes true original physical NODE endpoints');
  assert(island.sourceElementIds.length>=1,'island includes true SOURCE ELEMENTs');
  assert(island.boundaryNodeIds.every(id=>island.sourceNodeIds.includes(id)));
  assert(island.unmappedSourceNodeIds.every(id=>island.sourceNodeIds.includes(id)));
  assert.equal(island.certified,false);
}
const ids=new Set(triage.missingIslands.flatMap(x=>x.sourceElementIds.map(e=>x.sourceMember+':'+e)));
assert.equal(ids.size,33,'physical missing ELEMENTs must partition exactly once');
assert(triage.ambiguousElements.some(x=>x.sourceMember==='S1'
  &&x.sourceElementId==='E6:3940->3970'&&x.alternativeCount===2));
assert(triage.ambiguousElements.some(x=>x.sourceMember==='S3'
  &&x.sourceElementId==='E39:1820->1840'));
assert(triage.targetNodeCustodyWarnings.every(x=>x.otherSourceNodeKeys.length>=1));
assert(triage.reviewQueue.every(x=>x.type==='MISSING_EDGE_ISLAND'
  ||x.type==='AMBIGUOUS_TARGET_PATH'||x.type==='TARGET_NODE_CUSTODY_CONFLICT'));
assert.equal(triage.certifiedNodeCount,0);
assert.equal(triage.certifiedElementCount,0);
assert.equal(triage.writerReady,false);
assert.equal(triage.transferPlan,null);
assert.equal(triage.writeScope,null);
assert.deepEqual(triage.correspondenceCertificates,[]);
assert(Object.isFrozen(triage));
assert(Object.isFrozen(triage.missingIslands));
assert(Object.isFrozen(triage.reviewQueue));
assert.throws(()=>assertCiiA206NoWrite(triage),/NEVER_WRITER_AUTHORITY/);
const again=investigateCiiA206PhysicalIslands(investigationInputs);
assert.equal(JSON.stringify(triage),JSON.stringify(again));

const staleA206=structuredClone(evaluated);
staleA206.recomputedPathAudit.provenance.normalizedTargetSha256='f'.repeat(64);
assert.throws(()=>investigateCiiA206PhysicalIslands({
  ...investigationInputs,reconciliation:staleA206,
}),/A205_SHARED_ORIGINAL_PHYSICAL_BASIS_CHANGED|TARGET_NORMALIZED_HASH_MISMATCH/);
const forgedCustody=structuredClone(evaluated);
forgedCustody.sharedTargetCustodyConflicts[0].otherSourceNodeKeys=['S2:NONEXISTENT'];
assert.throws(()=>investigateCiiA206PhysicalIslands({
  ...investigationInputs,reconciliation:forgedCustody,
}),/CUSTODY_RIVAL_NOT_ATTESTED/);
const fakeAmbiguous=structuredClone(evaluated);
const ambiguousRow=fakeAmbiguous.recomputedPathAudit.edgeRows
  .find(r=>r.status==='LOCAL_PATH_AMBIGUOUS');
assert(ambiguousRow);
ambiguousRow.pathWitnesses[0].targetElementIds[0]='NOT_AN_ORIGINAL_TARGET_EDGE';
assert.throws(()=>investigateCiiA206PhysicalIslands({
  ...investigationInputs,reconciliation:fakeAmbiguous,
}),/AMBIGUOUS_WITNESS_NOT_CANONICAL_TARGET_ROUTE/);
const missingTampered=structuredClone(evaluated);
const missingRow=missingTampered.recomputedPathAudit.edgeRows
  .find(r=>r.status==='ENDPOINT_CANDIDATE_MISSING');
missingRow.sourceElementId='FORGED_MISSING_EDGE';
assert.throws(()=>investigateCiiA206PhysicalIslands({
  ...investigationInputs,reconciliation:missingTampered,
}),/MISSING_FACTOR_NOT_CANONICAL_SOURCE_ELEMENT/);
const truncatedTarget=investigateCiiA206PhysicalIslands({...investigationInputs,
  policy:{maxTargetComponentNodes:3,maxTargetProbeVisits:1}});
assert.equal(truncatedTarget.summary.targetComponentEnumerationComplete,false);
assert(truncatedTarget.missingIslands.every(i=>i.boundaryStatus
  ==='TARGET_TOPOLOGY_ENUMERATION_TRUNCATED'));
assert(truncatedTarget.boundedTargetProbes.every(p=>p.visitCount<=1));
assert.throws(()=>investigateCiiA206PhysicalIslands({...investigationInputs,
  policy:{maxMissingIslands:0}}),/INVALID_BOUNDED_POLICY/);
assert.throws(()=>investigateCiiA206PhysicalIslands({...investigationInputs,
  normalizedTargetSha256:'e'.repeat(64)}),/TARGET_NORMALIZED_HASH_MISMATCH/);

import { investigateCiiA207IndependentRoutes,assertCiiA207NoWrite } from '../scripts/cii-architecture-a2-independent-island-routes.mjs';
const A207base={
  triage,reconciliation:evaluated,sourceGraphsById:graphs,
  targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(
    m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
};
const originalRoutes=investigateCiiA207IndependentRoutes(A207base);
assert.equal(originalRoutes.schema,'CiiArchitectureA207IslandRouteWitnesses.v1');
assert.equal(originalRoutes.status,'INDEPENDENT_BOUNDED_PHYSICAL_ROUTE_REVIEW_ONLY');
assert.equal(originalRoutes.summary.originalPhysicalSourceNodes,150);
assert.equal(originalRoutes.summary.originalPhysicalSourceElements,147);
assert.equal(originalRoutes.summary.incompletePhysicalFactors,33);
assert.equal(originalRoutes.summary.islandCount,8);
assert.equal(originalRoutes.islands.length,8);
assert.equal(originalRoutes.summary.ambiguousPhysicalElementReviewCount,6);
assert.equal(originalRoutes.summary.targetCustodyWarningProposalCount,6);
assert.equal(originalRoutes.unresolvedAmbiguousElements.length,6);
assert.equal(originalRoutes.unresolvedTargetNodeCustodyWarnings.length,6);
assert(originalRoutes.summary.globalTargetWalkVisits<=originalRoutes.policy.maxGlobalExpansion);
const giantA207=originalRoutes.islands.find(x=>x.id==='S1-ISLAND-002');
assert(giantA207);
assert.equal(giantA207.missingElementCount,15);
assert.equal(giantA207.sourceMember,'S1');
assert.equal(giantA207.orderedSourceElementIds.length,15);
assert.equal(giantA207.boundaryMode,'SINGLE_BOUNDARY');
assert.equal(giantA207.startingBoundarySourceNode,'4960');
assert.equal(giantA207.endingBoundarySourceNode,'5229');
assert(giantA207.firstBoundaryNeighbourhood.length>=1,
  'original 15-edge S1 gap must retain target-side first-edge physical context');
assert(giantA207.firstBoundaryNeighbourhood.every(x=>x.sourceFirstElementId
  ===giantA207.orderedSourceElementIds[0]));
assert(giantA207.firstBoundaryNeighbourhood.every(x=>x.sourceFirstLengthMm>0));
assert.equal(giantA207.firstBoundaryNeighbourhood.length,1);
assert.equal(giantA207.firstBoundaryNeighbourhood[0].anchor,'1060');
assert.equal(giantA207.firstBoundaryNeighbourhood[0].sourceFirstElementId,'E42:4960->4970');
assert.equal(giantA207.firstBoundaryNeighbourhood[0].sourceFirstComponentKind,'BEND');
assert.equal(giantA207.firstBoundaryNeighbourhood[0].sourceFirstLengthMm,3027);
const actualS1TargetIncidents=giantA207.firstBoundaryNeighbourhood[0].targetIncidentPhysicalElements;
assert.deepEqual(actualS1TargetIncidents.map(e=>e.elementId),
  ['E212:1055->1060','E213:1060->1065']);
assert.deepEqual(actualS1TargetIncidents.map(e=>[e.componentKind,e.lengthMm,e.lengthDeltaMm]),
  [['PIPE',6500,3473],['BEND',2727,300]]);
assert(actualS1TargetIncidents.every(e=>e.couldBeSingleEdgeLengthCompatible===false),
  'source BEND 3027mm must not be silently treated as the 2727mm target BEND');
assert(giantA207.firstBoundaryNeighbourhood.every(x=>
  x.targetIncidentPhysicalElements.every(e=>e.lengthMm>0&&e.elementId)));
for(const island of originalRoutes.islands){
  assert.equal(island.fullRouteWitnesses.length<=originalRoutes.policy.maxFullRoutesPerIsland,true);
  assert.equal(island.missingElementCount,triage.missingIslands.find(x=>x.id===island.id).missingElementCount);
  for(const route of island.fullRouteWitnesses){
    assert.equal(route.orderedElementPaths.length,island.missingElementCount);
    assert.equal(route.sourceNodeAssignments.length,island.missingElementCount+1);
    assert.equal(route.certified,false);
    assert.equal(route.canBindScope,false);
  }
}
assert.equal(originalRoutes.certifiedNodeCount,0);
assert.equal(originalRoutes.certifiedElementCount,0);
assert.equal(originalRoutes.writerReady,false);
assert.equal(originalRoutes.transferPlan,null);
assert.equal(originalRoutes.writeScope,null);
assert.deepEqual(originalRoutes.correspondenceCertificates,[]);
assert(Object.isFrozen(originalRoutes));
assert(Object.isFrozen(originalRoutes.islands));
assert.throws(()=>assertCiiA207NoWrite(originalRoutes),/NEVER_WRITER_AUTHORITY/);
assert.equal(JSON.stringify(originalRoutes),
  JSON.stringify(investigateCiiA207IndependentRoutes(A207base)));

function grA207(side,hash,edges){
  const rows=edges.map(([elementId,from,to,L,dx=L])=>({
    elementId,from,to,lengthMm:L,dx,dy:0,dz:0,
    componentKind:'PIPE',diameter:100,wall:5,
  }));
  const adjacency=new Map();
  for(const edge of rows)for(const node of [edge.from,edge.to]){
    if(!adjacency.has(node))adjacency.set(node,[]);
    adjacency.get(node).push(edge);
  }
  return {side,documentId:side+':'+hash,edges:rows,adjacency};
}
const ha207=x=>x.repeat(64);
const pgA207={
  sourceSetSha256:ha207('a'),originalTargetSha256:ha207('b'),
  originalSourceShaById:{S1:ha207('c'),S2:ha207('d'),S3:ha207('e')},
  physicalOriginalSnapshotDigest:ha207('f'),
};
const sourceA207={
  S1:grA207('SOURCE',ha207('1'),[['ES1','A','B',10],['ES2','B','C',6]]),
  S2:grA207('SOURCE',ha207('2'),[]),
  S3:grA207('SOURCE',ha207('3'),[]),
};
const targetA207=grA207('TARGET',ha207('4'),[
  ['TK','X','K',4],['KY','K','Y',6],['YZ','Y','Z',6],
  ['XM','X','M',10],['MZ','M','Z',6],
]);
function syntheticA207(endTargets=['Z']){
  const nodeRows=[
    {sourceNodeKey:'S1:A',targets:['X']},
    {sourceNodeKey:'S1:B',targets:[]},
    {sourceNodeKey:'S1:C',targets:endTargets},
  ];
  const hypotheses=nodeRows.flatMap(r=>r.targets.map(t=>({sourceNodeKey:r.sourceNodeKey,targetNodeId:t})));
  const reconciliation={
    schema:'CiiArchitectureA205FrontierReconciliation.v1',
    status:'RECONCILED_SHADOW_NONWRITING',writerReady:false,
    certifiedNodeCount:0,certifiedElementCount:0,
    originalPhysicalSnapshotDigest:pgA207.physicalOriginalSnapshotDigest,
    recomputedEndpointMissingFactors:2,
    augmentedJoint:{provenance:pgA207,nodeRows,hypotheses},
    recomputedPathAudit:{provenance:{
      normalizedSourceShaById:{S1:ha207('1'),S2:ha207('2'),S3:ha207('3')},
      normalizedTargetSha256:ha207('4'),
    }},
  };
  const digestHypotheses=createHash('sha256').update(JSON.stringify(
    hypotheses.map(h=>[h.sourceNodeKey,h.targetNodeId]))).digest('hex');
  const triage={
    schema:'CiiArchitectureA206PhysicalReviewIslands.v1',
    status:'PHYSICAL_ISLAND_REVIEW_ONLY',writerReady:false,
    certifiedNodeCount:0,certifiedElementCount:0,
    authority:{sourceSetSha256:pgA207.sourceSetSha256,
      originalTargetSha256:pgA207.originalTargetSha256,
      physicalOriginalSnapshotDigest:pgA207.physicalOriginalSnapshotDigest,
      augmentedNodeHypothesisDigest:digestHypotheses,
      normalizedTargetSha256:ha207('4')},
    summary:{sourceNodeCount:3,sourceElementCount:2,unresolvedFactorCount:2,
      ambiguousElementCount:0,custodyWarningProposalCount:0},
    missingIslands:[{id:'S1-ISLAND-001',sourceMember:'S1',
      sourceNodeIds:['A','B','C'],sourceElementIds:['ES1','ES2'],
      boundaryNodeIds:endTargets.length?['A','C']:['A']}],
    ambiguousElements:[],targetNodeCustodyWarnings:[],
  };
  return {triage,reconciliation,sourceGraphsById:sourceA207,targetGraph:targetA207,
    normalizedSourceShaById:{S1:ha207('1'),S2:ha207('2'),S3:ha207('3')},
    normalizedTargetSha256:ha207('4'),policy:{
      lengthToleranceMm:0.01,relativeLengthTolerance:0.01,turnCosineTolerance:0.001,
    }};
}
const dualA207=investigateCiiA207IndependentRoutes(syntheticA207());
assert.equal(dualA207.summary.islandCount,1);
assert.equal(dualA207.islands[0].boundaryMode,'DUAL_BOUNDARY');
assert.equal(dualA207.islands[0].status,'MULTIPLE_DUAL_BOUNDARY_ROUTES_WITHIN_BOUNDS');
assert.equal(dualA207.islands[0].fullRouteWitnesses.length,2);
assert.equal(dualA207.islands[0].firstBoundaryNeighbourhood.length,1);
assert.deepEqual(dualA207.islands[0].firstBoundaryNeighbourhood[0]
  .targetIncidentPhysicalElements.map(x=>x.elementId),['TK','XM']);
assert(dualA207.islands[0].fullRouteWitnesses.some(x=>
  JSON.stringify(x.orderedElementPaths[0].targetElementIds)===JSON.stringify(['TK','KY'])));
assert(dualA207.islands[0].fullRouteWitnesses.some(x=>
  JSON.stringify(x.orderedElementPaths[0].targetElementIds)===JSON.stringify(['XM'])));
assert(dualA207.islands[0].fullRouteWitnesses.every(x=>x.endTargetNode==='Z'));
assert(dualA207.islands[0].fullRouteWitnesses.every(x=>x.sourceNodeAssignments.length===3));
assert.equal(dualA207.certifiedElementCount,0);
const singleA207=investigateCiiA207IndependentRoutes(syntheticA207([]));
assert.equal(singleA207.islands[0].boundaryMode,'SINGLE_BOUNDARY');
assert.equal(singleA207.islands[0].status,'SINGLE_END_FULL_CHAIN_HYPOTHESES_ONLY');
assert.equal(singleA207.islands[0].fullRouteWitnesses.length,2);
const clippedA207=investigateCiiA207IndependentRoutes({
  ...syntheticA207(),policy:{...syntheticA207().policy,maxBeamWidth:1},
});
assert.equal(clippedA207.islands[0].status,'BOUNDED_SEARCH_INCOMPLETE');
assert.equal(clippedA207.islands[0].truncated,true);
const oneEdgeA207=investigateCiiA207IndependentRoutes({
  ...syntheticA207(),policy:{...syntheticA207().policy,maxTargetPathSegmentsPerEdge:1},
});
assert.equal(oneEdgeA207.islands[0].fullRouteWitnesses.length,1);
const noEndpointA207=investigateCiiA207IndependentRoutes(syntheticA207(['NOBODY']));
assert.equal(noEndpointA207.islands[0].fullRouteWitnesses.length,0);
assert.equal(noEndpointA207.islands[0].status,'NO_FULL_CHAIN_ROUTE_IN_DECLARED_WITNESS_DOMAIN');
const tamperedBasisA207=structuredClone(syntheticA207());
tamperedBasisA207.triage.authority.originalTargetSha256=ha207('9');
assert.throws(()=>investigateCiiA207IndependentRoutes(tamperedBasisA207),
  /TRIAGE_CUSTODY_OR_CENSUS_STALE/);
assert.throws(()=>investigateCiiA207IndependentRoutes({
  ...syntheticA207(),normalizedTargetSha256:ha207('9'),
}),/TARGET_NORMALIZED_SHA_MISMATCH/);
assert.throws(()=>investigateCiiA207IndependentRoutes({
  ...syntheticA207(),policy:{maxGlobalExpansion:0},
}),/INVALID_POLICY/);
const wrongEdgesA207=syntheticA207();
wrongEdgesA207.triage.missingIslands[0].sourceElementIds[0]='FORGED-SOURCE-ELEMENT';
assert.throws(()=>investigateCiiA207IndependentRoutes(wrongEdgesA207),
  /ISLAND_EDGE_MISSING_IN_ORIGINAL_SOURCE/);
const routeEvidence={
  schema:originalRoutes.schema,status:originalRoutes.status,
  provenance:originalRoutes.provenance,policy:originalRoutes.policy,
  summary:originalRoutes.summary,islands:originalRoutes.islands,
  unresolvedAmbiguousElements:originalRoutes.unresolvedAmbiguousElements,
  unresolvedTargetNodeCustodyWarnings:originalRoutes.unresolvedTargetNodeCustodyWarnings,
  certifiedNodeCount:originalRoutes.certifiedNodeCount,
  certifiedElementCount:originalRoutes.certifiedElementCount,
  writerReady:originalRoutes.writerReady,
};
const reportA207=process.argv.find(x=>x.startsWith('--out='))?.slice('--out='.length);
if(reportA207){
  const loc=resolve(reportA207);
  if(loc.replaceAll('\\\\','/').includes('/Benchmark/'))throw Error('A207_BENCHMARK_READONLY');
  mkdirSync(dirname(loc),{recursive:true});
  writeFileSync(loc,JSON.stringify(routeEvidence,null,2),'utf8');
  assert.deepEqual(JSON.parse(readFileSync(loc,'utf8')),routeEvidence);
}
console.log('A2_07_ORIGINAL_ISLAND_PATH_EVIDENCE',JSON.stringify({
  summary:originalRoutes.summary,
  islandResults:originalRoutes.islands.map(x=>({
    id:x.id,status:x.status,sourceEdges:x.missingElementCount,
    matchedSourceEdgesWithinBound:x.maximumCompletedSourceEdges,
    routeWitnesses:x.fullRouteWitnesses.length,
    truncated:x.truncated,boundaryMode:x.boundaryMode,
    firstWitness:x.fullRouteWitnesses[0]?.orderedElementPaths.slice(0,3),
    firstBoundaryNeighbourhood:x.firstBoundaryNeighbourhood,
  })),
  certifiedNodes:0,certifiedElements:0,writerReady:false,
},null,2));
console.log('PASS A2-07: original 8 island dual/single bound routes, 1-to-many ordered physical subdivision and synthetic competing/short-capped alternatives; no global certificate or Writer rights');

const a208Input={
  routeAudit:originalRoutes,triage,reconciliation:evaluated,
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members
    .map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
};
const a208=investigateCiiA208GeometryRevision(a208Input);
assert.equal(a208.schema,'CiiArchitectureA208GeometryRevisionFalsifiers.v1');
assert.equal(a208.status,'GEOMETRY_REVISION_DIAGNOSIS_ONLY');
assert.equal(a208.summary.originalMissingElementFactors,33);
assert.equal(a208.summary.physicalIslandsExamined,8);
assert.equal(a208.summary.originalAmbiguousElementFactors,6);
assert.equal(a208.summary.originalCustodyWarningProposals,6);
assert.equal(a208.islands.length,8);
const actualS1Bend=a208.islands.find(i=>i.islandId==='S1-ISLAND-002');
assert(actualS1Bend,'must inspect complete 15-original-edge S1 deficit');
assert.equal(actualS1Bend.sourceFirstElementId,'E42:4960->4970');
assert.equal(actualS1Bend.startingSourceNode,'4960');
assert.deepEqual(actualS1Bend.currentTargetAnchors,['1060']);
assert.equal(actualS1Bend.sourceMetrics.lengthMm,3027);
assert.equal(actualS1Bend.sourceMetrics.componentKind,'BEND');
assert.deepEqual(actualS1Bend.boundaryGeometryComparisons
  .map(x=>x.targetIncidentElementId),['E212:1055->1060','E213:1060->1065']);
const targetPipe=actualS1Bend.boundaryGeometryComparisons
  .find(x=>x.targetIncidentElementId==='E212:1055->1060');
const targetBend=actualS1Bend.boundaryGeometryComparisons
  .find(x=>x.targetIncidentElementId==='E213:1060->1065');
assert.equal(targetPipe.targetMetrics.componentKind,'PIPE');
assert.equal(targetPipe.targetMetrics.lengthMm,6500);
assert.equal(targetPipe.componentKindMatches,false);
assert.equal(targetPipe.counterfactualBands.every(x=>!x.compatibleComponentAndLength),true);
assert.equal(targetBend.targetMetrics.componentKind,'BEND');
assert.equal(targetBend.targetMetrics.lengthMm,2727);
assert.equal(targetBend.lengthDeltaMm,300);
assert.equal(targetBend.lengthDeltaFraction,Number((300/3027).toFixed(6)));
assert.equal(targetBend.exactA207BaseLengthGate,false);
assert.deepEqual(targetBend.counterfactualBands
  .map(x=>[x.counterfactualLengthBandMm,x.compatibleComponentAndLength]),[
    [25,false],[100,false],[300,true],[350,true],
  ],'a 300 mm relaxed *counterfactual* length-only gate is not correspondence proof');
assert.equal(targetBend.sourceMetrics.chordMm,3027);
assert.equal(targetBend.targetMetrics.chordMm,2727);
assert.equal(targetBend.sourceMetrics.recordedLengthToChordRatio,1);
assert.equal(targetBend.targetMetrics.recordedLengthToChordRatio,1);
assert.equal(targetBend.sourceMetrics.bendCurvatureStatus,
  'RADIUS_AND_SWEEP_NOT_ATTESTED_BY_CANONICAL_EDGE');
assert.equal(targetBend.targetMetrics.bendCurvatureStatus,
  'RADIUS_AND_SWEEP_NOT_ATTESTED_BY_CANONICAL_EDGE');
assert.equal(targetBend.recordedLengthChordRatioDelta,0);
assert.equal(targetBend.sourceMetrics.wallMm,25.4);
assert.equal(targetBend.targetMetrics.wallMm,18.3);
assert.equal(targetBend.sourceMetrics.diameterMm,273);
assert.equal(targetBend.targetMetrics.diameterMm,273);
assert.equal(targetBend.originalPredecessorConstraintCount,1);
assert.deepEqual(targetBend.predecessorTurnInvariants.map(z=>[
  z.sourcePredecessorElementId,z.targetPredecessorElementId,
  z.claimedOtherSourceNode,z.claimedOtherTargetNode,
  z.sourceTurnCosine,z.targetTurnCosine,z.turnDifference,
]),[['E41:4930->4960','E212:1055->1060','4930','1055',1,1,0]]);
assert.equal(actualS1Bend.strictKindLengthChordCandidatesInTarget,9,
  'nine original TARGET bends have strict first-edge geometry but NO certified anchor identity');
assert.equal(actualS1Bend.unanchoredAlternativeScanComplete,true);
assert(actualS1Bend.strictKindLengthChordCandidateExamples.every(z=>
  z.relationToCurrentAnchor==='UNANCHORED_GLOBAL_TARGET_EDGE'),
  'strict unanchored resemblance cannot imply alternative physical NODE certification');
assert(actualS1Bend.strictBandCompatibleExistingAnchorEdges===0);
assert.equal(actualS1Bend.routeOutcome,'NO_FULL_CHAIN_ROUTE_IN_DECLARED_WITNESS_DOMAIN');
assert.equal(a208.certifiedNodeCount,0);
assert.equal(a208.certifiedElementCount,0);
assert.equal(a208.admittedCandidateCount,0);
assert.equal(a208.writerReady,false);
assert.deepEqual(a208.correspondenceCertificates,[]);
assert.equal(a208.transferPlan,null);
assert.equal(a208.writeScope,null);
assert(Object.isFrozen(a208));
assert(Object.isFrozen(a208.islands));
assert.throws(()=>assertCiiA208NoWrite(a208),/NOT_WRITER_AUTHORITY/);
assert.equal(JSON.stringify(a208),JSON.stringify(investigateCiiA208GeometryRevision(a208Input)));

const a208Synthetic=syntheticA207();
// The A2-07 minimal fixture predates A2-06's explicit island-count receipt;
// make it a fully schema-consistent independent A2-08 input.
a208Synthetic.triage.summary.missingIslandCount=1;
a208Synthetic.triage.missingIslands[0].missingElementCount=2;
const a208SyntheticAudit=investigateCiiA207IndependentRoutes(a208Synthetic);
const a208S=investigateCiiA208GeometryRevision({
  routeAudit:a208SyntheticAudit,...a208Synthetic,
});
assert.equal(a208S.islands.length,1);
assert.equal(a208S.islands[0].sourceFirstElementId,'ES1');
assert.equal(a208S.islands[0].sourceMetrics.lengthMm,10);
assert.equal(a208S.islands[0].boundaryGeometryComparisons.length,2);
assert.equal(a208S.islands[0].strictBandCompatibleExistingAnchorEdges,2);
assert.equal(a208S.writerReady,false);

const a208SmallScan=investigateCiiA208GeometryRevision({
  ...a208Input,policy:{maxTargetEdgesInspected:1,maxAlternativeRecords:1},
});
assert(a208SmallScan.islands.every(x=>x.unanchoredAlternativeScanComplete===false));
assert(a208SmallScan.islands.every(x=>x.targetEdgesInspected===1));
assert.equal(a208SmallScan.writerReady,false);
const a208Spoofed=structuredClone(originalRoutes);
a208Spoofed.islands.find(i=>i.id==='S1-ISLAND-002')
  .firstBoundaryNeighbourhood[0].targetIncidentPhysicalElements[0].elementId='FORGED_EDGE';
assert.throws(()=>investigateCiiA208GeometryRevision({
  ...a208Input,routeAudit:a208Spoofed,
}),/A207_FIRST_BOUNDARY_WITNESS_TAMPERED/);
const a208WrongSource=structuredClone(originalRoutes);
a208WrongSource.islands.find(i=>i.id==='S1-ISLAND-002')
  .orderedSourceElementIds[0]='FORGED_SOURCE';
assert.throws(()=>investigateCiiA208GeometryRevision({
  ...a208Input,routeAudit:a208WrongSource,
}),/ORIGINAL_FIRST_SOURCE_EDGE_ORIENTATION_MISMATCH/);
const a208HashWrong=structuredClone(originalRoutes);
a208HashWrong.provenance.originalTargetSha256='f'.repeat(64);
assert.throws(()=>investigateCiiA208GeometryRevision({
  ...a208Input,routeAudit:a208HashWrong,
}),/STALE_OR_MISMATCHED_ORIGINAL_EVIDENCE_CUSTODY/);
const a208GraphWrong=structuredClone(a208Synthetic);
a208GraphWrong.targetGraph.documentId='TARGET:'+'9'.repeat(64);
assert.throws(()=>investigateCiiA208GeometryRevision({
  routeAudit:a208SyntheticAudit,...a208GraphWrong,
}),/NORMALIZED_GRAPH_CUSTODY_MISMATCH_TARGET/);
assert.throws(()=>investigateCiiA208GeometryRevision({
  ...a208Input,policy:{revisionBandsMm:[300,25]},
}),/BAD_COUNTERFACTUAL_BANDS/);
assert.throws(()=>investigateCiiA208GeometryRevision({
  ...a208Input,policy:{maxTargetEdgesInspected:0},
}),/BAD_POLICY_maxTargetEdgesInspected/);


const originalSurveyInputs={
  geometryAudit:a208,routeAudit:originalRoutes,triage,reconciliation:evaluated,
  targetGraph:preparedSession.target.targetGraph,
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
};
const nativeInventory=[];
for(const member of preparedSession.members){
  const actual=examineCiiA209IndependentRegistration({
    ...originalSurveyInputs,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    normalizedSourceSha256:member.normalizedSha256,
  });
  assert.equal(actual.schema,'CiiArchitectureA209IndependentRegistration.v1');
  assert.equal(actual.status,'BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY');
  assert.equal(actual.surveyQualification,'NOT_ADMITTED');
  assert.equal(actual.certifiedNodeCount,0);
  assert.equal(actual.certifiedElementCount,0);
  assert.equal(actual.admittedCandidateCount,0);
  assert.equal(actual.writerReady,false);
  assert.equal(actual.transformDiagnostic,null);
  assert.deepEqual(actual.correspondenceCertificates,[]);
  assert.equal(actual.writeScope,null);
  assert.equal(actual.transferPlan,null);
  assert.equal(actual.nativePositionInventory.sourcePhysicalNodeCount,
    member.sourceGraph.nodes.length);
  assert.equal(actual.nativePositionInventory.targetPhysicalNodeCount,
    preparedSession.target.targetGraph.nodes.length);
  assert(Object.isFrozen(actual));
  assert.throws(()=>assertCiiA209NoWrite(actual),/NEVER_WRITER_AUTHORITY/);
  nativeInventory.push({
    member:member.sourceId,sourcePhysicalNodeCount:actual.nativePositionInventory.sourcePhysicalNodeCount,
    nativeCoordinateNodes:actual.nativePositionInventory.sourceNativeCoordinateNodeCount,
    targetPhysicalNodeCount:actual.nativePositionInventory.targetPhysicalNodeCount,
    targetNativeCoordinateNodes:actual.nativePositionInventory.targetNativeCoordinateNodeCount,
    status:actual.status,
  });
}
assert.equal(nativeInventory.length,3);
const g209=syntheticA207();
g209.triage.summary.missingIslandCount=1;
g209.triage.missingIslands[0].missingElementCount=2;
const route209=investigateCiiA207IndependentRoutes(g209);
const audit209=investigateCiiA208GeometryRevision({routeAudit:route209,...g209});
const sourcePoints={
  A:[0,0,0],B:[10,0,0],C:[0,10,0],D:[0,0,10],E:[4,6,8],
};
const targetPoint=([x,y,z])=>[100-y,200+x,300+z];
const match={A:'X',B:'K',C:'Y',D:'Z',E:'M'};
g209.sourceGraphsById.S1.nodes=Object.entries(sourcePoints).map(([id,position])=>({id,position}));
g209.targetGraph.nodes=Object.entries(match).map(([sourceId,id])=>({
  id,position:targetPoint(sourcePoints[sourceId]),
}));
const rootBasis=g209.reconciliation.augmentedJoint.provenance;
const survey209={
  status:'EXTERNALLY_REVIEWED_INDEPENDENT_COORDINATE_SURVEY',
  receiptSha256:'f'.repeat(64),
  sourceOriginalSha256:rootBasis.originalSourceShaById.S1,
  targetOriginalSha256:rootBasis.originalTargetSha256,
  sourceUnits:'mm',targetUnits:'mm',sourceHandedness:'RIGHT',targetHandedness:'RIGHT',
  sourceFrameId:'INDEPENDENT_SURVEY_SOURCE_FRAME',targetFrameId:'INDEPENDENT_SURVEY_TARGET_FRAME',
};
const pair=(name)=>({sourceNodeId:name,targetNodeId:match[name],
  attestation:{authority:'INDEPENDENT_EXTERNAL_PHYSICAL_SURVEY',
    status:'PHYSICAL_NODE_PAIR_INDEPENDENTLY_REVIEWED',
    sourceFrameId:survey209.sourceFrameId,targetFrameId:survey209.targetFrameId,
    sourceOriginalSha256:survey209.sourceOriginalSha256,
    targetOriginalSha256:survey209.targetOriginalSha256,
    receiptSha256:name.toLowerCase().repeat(64)},
});
const fit209=[pair('A'),pair('B'),pair('C')],hold209=[pair('D'),pair('E')];
const syntheticRegistration={
  geometryAudit:audit209,routeAudit:route209,
  triage:g209.triage,reconciliation:g209.reconciliation,
  sourceId:'S1',sourceGraph:g209.sourceGraphsById.S1,targetGraph:g209.targetGraph,
  normalizedSourceSha256:g209.normalizedSourceShaById.S1,
  normalizedTargetSha256:g209.normalizedTargetSha256,
  independentSurvey:survey209,fitPairs:fit209,heldOutPairs:hold209,
};
const passed209=examineCiiA209IndependentRegistration(syntheticRegistration);
assert.equal(passed209.status,'INDEPENDENT_SURVEY_RIGID_FIT_HELDOUT_PASS_NOT_CERTIFIED');
assert.equal(passed209.fitResidualsMm.length,3);
assert.equal(passed209.heldOutResidualsMm.length,2);
assert(passed209.fitResidualsMm.every(x=>x===0));
assert(passed209.heldOutResidualsMm.every(x=>x===0));
assert.deepEqual(passed209.transformDiagnostic.rotationRows,[
  [0,-1,0],[1,0,0],[0,0,1],
]);
assert.equal(passed209.transformDiagnostic.scale,1);
assert.equal(passed209.transformDiagnostic.reflectionAllowed,false);
assert.equal(passed209.certifiedNodeCount,0);
assert.equal(passed209.certifiedElementCount,0);
assert.equal(passed209.writerReady,false);
assert(Object.isFrozen(passed209));

const mirror209=structuredClone(syntheticRegistration);
mirror209.targetGraph.nodes=mirror209.targetGraph.nodes.map(n=>({
  ...n,position:[-n.position[0],n.position[1],n.position[2]],
}));
const reflected=examineCiiA209IndependentRegistration(mirror209);
assert.equal(reflected.status,'INDEPENDENT_SURVEY_RIGID_FIT_FALSIFIED',
  'noncoplanar heldout evidence must detect reflection despite three fitted in-plane points');
assert(reflected.transformDiagnostic.worstHeldOutResidualMm>5);
assert.equal(reflected.writerReady,false);
const drift209=structuredClone(syntheticRegistration);
drift209.targetGraph.nodes.find(n=>n.id==='M').position[0]+=30;
const drift=examineCiiA209IndependentRegistration(drift209);
assert.equal(drift.status,'INDEPENDENT_SURVEY_RIGID_FIT_FALSIFIED');
assert(drift.transformDiagnostic.worstHeldOutResidualMm>5);
const collinear209=structuredClone(syntheticRegistration);
collinear209.sourceGraph.nodes.find(n=>n.id==='C').position=[20,0,0];
assert.throws(()=>examineCiiA209IndependentRegistration(collinear209),
  /ANCHOR_TRIANGLE_COLLINEAR_OR_ILL_CONDITIONED/);
const duplicate209=structuredClone(syntheticRegistration);
duplicate209.heldOutPairs[0].targetNodeId=duplicate209.fitPairs[0].targetNodeId;
assert.throws(()=>examineCiiA209IndependentRegistration(duplicate209),
  /REUSED_NODE_OR_ATTESTATION_ACROSS_FIT_AND_HELDOUT/);
const fakeReceipt209=structuredClone(syntheticRegistration);
fakeReceipt209.fitPairs[0].attestation.authority='EXISTING_MANUAL_LOCK';
assert.throws(()=>examineCiiA209IndependentRegistration(fakeReceipt209),
  /PAIR_NOT_INDEPENDENTLY_ATTESTED/);
const stale209=structuredClone(syntheticRegistration);
stale209.independentSurvey.originalTargetSha256='0'.repeat(64);
stale209.independentSurvey.targetOriginalSha256='0'.repeat(64);
assert.equal(examineCiiA209IndependentRegistration(stale209).status,
  'BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY');
const missingPosition209=structuredClone(syntheticRegistration);
missingPosition209.sourceGraph.nodes.find(n=>n.id==='A').position=null;
assert.throws(()=>examineCiiA209IndependentRegistration(missingPosition209),
  /PAIR_NODE_POSITION_MISSING_OR_UNQUALIFIED/);
const reusedEvidence209=structuredClone(syntheticRegistration);
reusedEvidence209.heldOutPairs[0].attestation.receiptSha256=
  reusedEvidence209.fitPairs[0].attestation.receiptSha256;
assert.throws(()=>examineCiiA209IndependentRegistration(reusedEvidence209),
  /REUSED_NODE_OR_ATTESTATION_ACROSS_FIT_AND_HELDOUT/);
const wrongSha209=structuredClone(syntheticRegistration);
wrongSha209.geometryAudit.provenance.originalTargetSha256='e'.repeat(64);
assert.throws(()=>examineCiiA209IndependentRegistration(wrongSha209),
  /SOURCE_TARGET_SHA_PROVENANCE_MISMATCH/);
assert.throws(()=>examineCiiA209IndependentRegistration({
  ...syntheticRegistration,policy:{minTriangleSine:2},
}),/INVALID_POLICY_minTriangleSine/);
assert.equal(JSON.stringify(passed209),
  JSON.stringify(examineCiiA209IndependentRegistration(syntheticRegistration)));

const original209=examineCiiA209IndependentRegistration({
  ...originalSurveyInputs,sourceId:'S1',sourceGraph:graphs.S1,
  normalizedSourceSha256:preparedSession.members.find(m=>m.sourceId==='S1').normalizedSha256,
});

const originalA210Reports=[];
for(const member of preparedSession.members){
  const a209Block=examineCiiA209IndependentRegistration({
    ...originalSurveyInputs,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    normalizedSourceSha256:member.normalizedSha256,
  });
  const result=discoverCiiA210NativeGeometryHypotheses({
    registrationAudit:a209Block,geometryAudit:a208,routeAudit:originalRoutes,
    triage,reconciliation:evaluated,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  });
  assert.equal(result.schema,'CiiArchitectureA210NativeGeometryHypotheses.v1');
  assert.equal(result.provenance.originalSourceSetSha256,
    '5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3');
  assert.equal(result.provenance.previousSurveyState,
    'BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY');
  assert.equal(result.summary.sourceNativeCoordinateRows,member.sourceGraph.nodes.length);
  assert.equal(result.summary.targetNativeCoordinateRows,1619);
  assert.equal(result.summary.candidateSearchComplete,false);
  assert.equal(result.originalManualOrAutomaticClaimsUsedAsSeeds,false);
  assert.equal(result.certifiedNodeCount,0);
  assert.equal(result.certifiedElementCount,0);
  assert.equal(result.admittedCandidateCount,0);
  assert.equal(result.writerReady,false);
  assert.equal(result.transferPlan,null);
  assert.equal(result.writeScope,null);
  assert.deepEqual(result.correspondenceCertificates,[]);
  assert(result.hypotheses.every(x=>!x.certified&&!x.writerReady&&x.candidateNodePairAdmissions===0));
  assert(Object.isFrozen(result));
  assert.throws(()=>assertCiiA210NoWrite(result),/NEVER_WRITER_AUTHORITY/);
  assert.equal(JSON.stringify(result),JSON.stringify(discoverCiiA210NativeGeometryHypotheses({
    registrationAudit:a209Block,geometryAudit:a208,routeAudit:originalRoutes,
    triage,reconciliation:evaluated,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  })));
  originalA210Reports.push({
    sourceId:member.sourceId,
    sourceNativePositions:result.summary.sourceNativeCoordinateRows,
    targetNativePositions:result.summary.targetNativeCoordinateRows,
    status:result.status,
    searchSummary:result.summary,
    provisionalTransformHypotheses:result.hypotheses.map(x=>({
      fitSourceNodes:x.sourceFitNodes,fitTargetNodes:x.targetFitNodes,
      heldOutMatchCount:x.heldOut.matches.length,
      heldOutOutOfPlaneMm:x.heldOut.maxOutOfPlaneMm,
      evaluation:x.evaluation,surveyAuthenticated:false,
    })),
  });
}
// Synthetic controls: source and target are isomorphic only by graph geometry.
// Two translated copies of the same component demonstrate unresolved global
// symmetry; no labels/manual anchors/known identity pairs feed the generator.
const locations={
  A:[0,0,0],B:[100,0,0],C:[0,100,0],D:[0,0,80],
  E:[50,60,90],F:[200,30,45],G:[-30,80,80],H:[80,-60,110],
};
const links=[
  ['A','B','PIPE'],['A','C','BEND'],['A','D','PIPE'],['B','C','PIPE'],
  ['B','D','BEND'],['C','D','PIPE'],['D','E','PIPE'],['E','F','BEND'],
  ['E','G','PIPE'],['F','G','PIPE'],['G','H','PIPE'],['H','A','BEND'],
];
const destKeys={A:'X',B:'Y',C:'Z',D:'Q',E:'R',F:'P',G:'U',H:'V'};
function buildA210Graph(side,hash,points,edges){
  const nodes=Object.entries(points).map(([id,position])=>({id,position}));
  const rows=edges.map(([from,to,componentKind],i)=>{
    const a=points[from],b=points[to];const delta=b.map((x,j)=>x-a[j]);
    return {elementId:'G'+String(i+1),from,to,componentKind,
      lengthMm:Math.hypot(...delta),dx:delta[0],dy:delta[1],dz:delta[2],
      diameter:273,wall:25.4};
  });
  const adjacency=new Map();
  for(const edge of rows)for(const n of [edge.from,edge.to]){
    if(!adjacency.has(n))adjacency.set(n,[]);
    adjacency.get(n).push(edge);
  }
  return {side,documentId:side+':'+hash,nodes,edges:rows,adjacency};
}
const move=([x,y,z],offset=0)=>[900-y+offset,1200+x,1500+z];
const syntheticSource210=buildA210Graph('SOURCE',g209.normalizedSourceShaById.S1,locations,links);
const targetsA210={};
for(const [key,xyz] of Object.entries(locations))targetsA210[destKeys[key]]=move(xyz);
const targetLinksA210=links.map(([a,b,kind])=>[destKeys[a],destKeys[b],kind]);
const syntheticTarget210=buildA210Graph('TARGET',g209.normalizedTargetSha256,
  targetsA210,targetLinksA210);
const blockA210=examineCiiA209IndependentRegistration({
  ...syntheticRegistration,sourceGraph:syntheticSource210,targetGraph:syntheticTarget210,
  independentSurvey:null,fitPairs:[],heldOutPairs:[],
});
assert.equal(blockA210.status,'BLOCKED_NO_QUALIFIED_INDEPENDENT_COORDINATE_SURVEY');
const syntheticInput210={
  registrationAudit:blockA210,geometryAudit:audit209,routeAudit:route209,
  triage:g209.triage,reconciliation:g209.reconciliation,
  sourceId:'S1',sourceGraph:syntheticSource210,targetGraph:syntheticTarget210,
  normalizedSourceSha256:g209.normalizedSourceShaById.S1,
  normalizedTargetSha256:g209.normalizedTargetSha256,
};
const positive210=discoverCiiA210NativeGeometryHypotheses(syntheticInput210);
assert(positive210.hypotheses.some(x=>
  x.evaluation==='BOUNDED_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED'
  &&x.heldOut.matches.length>=2&&x.heldOut.maxOutOfPlaneMm>=5),
  'independent held-out noncoplanar graph geometry should corroborate correct rigid transform');
assert(positive210.hypotheses.some(x=>
  x.evaluation==='BOUNDED_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED'
  &&x.heldOutTopology.independentSourceEdgesChecked>=2
  &&x.heldOutTopology.agreementFraction===1
  &&x.heldOutCoverageFraction>=0.9),
  'both disjoint native NODE positions and independently held-out physical EDGE connectivity required');
assert.equal(positive210.certifiedNodeCount,0);
assert.equal(positive210.writerReady,false);
const dupTarget210=structuredClone(syntheticTarget210);
for(const [s,p] of Object.entries(locations)){
  const name='COPY'+destKeys[s];
  dupTarget210.nodes.push({id:name,position:move(p,3000)});
}
for(const [a,b,kind] of links){
  const from='COPY'+destKeys[a],to='COPY'+destKeys[b];
  const A=dupTarget210.nodes.find(n=>n.id===from).position;
  const B=dupTarget210.nodes.find(n=>n.id===to).position;
  const delta=B.map((x,j)=>x-A[j]);
  const edge={elementId:'COPY-'+String(dupTarget210.edges.length+1),from,to,
    componentKind:kind,lengthMm:Math.hypot(...delta),dx:delta[0],dy:delta[1],dz:delta[2],
    diameter:273,wall:25.4};
  dupTarget210.edges.push(edge);
  for(const n of [from,to]){
    if(!dupTarget210.adjacency.has(n))dupTarget210.adjacency.set(n,[]);
    dupTarget210.adjacency.get(n).push(edge);
  }
}
const duplicateInput210={...syntheticInput210,targetGraph:dupTarget210};
const ambiguous210=discoverCiiA210NativeGeometryHypotheses(duplicateInput210);
assert(ambiguous210.summary.distinctTransformHypotheses>=2,
  'duplicated TARGET component must retain competing transforms');
assert(ambiguous210.hypotheses.filter(x=>
  x.evaluation==='BOUNDED_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED').length>=2);
assert(ambiguous210.hypotheses.every(x=>x.certified===false));
const tiny210=discoverCiiA210NativeGeometryHypotheses({
  ...duplicateInput210,policy:{
    maxTargetCandidatesPerSeed:1,maxTupleChecks:3,maxTransformEvaluations:1,
    maxReturnedTransforms:1,
  },
});
assert.equal(tiny210.summary.candidateSearchComplete,false);
assert(tiny210.summary.searchLimitReached);
assert.equal(tiny210.certifiedNodeCount,0);
const mirrorTarget210=structuredClone(syntheticTarget210);
mirrorTarget210.nodes=mirrorTarget210.nodes.map(n=>({
  ...n,position:[n.position[0],n.position[1],-n.position[2]],
}));
const mirrored210=discoverCiiA210NativeGeometryHypotheses({
  ...syntheticInput210,targetGraph:mirrorTarget210,
});
assert.equal(mirrored210.summary.heldOutSupportedRetainedHypotheses,0,
  'noncoplanar held-out original positions reject reflected geometry in proper rigid fit');
// Relink two PIPE edges while preserving NODE positions and each endpoint's
// degree/component-kind multiset. A NODE-only/geometric fit looks identical,
// but held-out *EDGE incidence* must reject the fabricated correspondence.
const rewiredTarget210=structuredClone(syntheticTarget210);
const firstRewire=rewiredTarget210.edges.find(e=>e.elementId==='G4');
const secondRewire=rewiredTarget210.edges.find(e=>e.elementId==='G7');
assert.equal(firstRewire.componentKind,'PIPE');
assert.equal(secondRewire.componentKind,'PIPE');
const end1=firstRewire.to;firstRewire.to=secondRewire.to;secondRewire.to=end1;
for(const edge of [firstRewire,secondRewire]){
  const a=rewiredTarget210.nodes.find(n=>n.id===edge.from).position;
  const b=rewiredTarget210.nodes.find(n=>n.id===edge.to).position;
  const delta=b.map((x,i)=>x-a[i]);
  edge.dx=delta[0];edge.dy=delta[1];edge.dz=delta[2];
  edge.lengthMm=Math.hypot(...delta);
}
rewiredTarget210.adjacency=new Map();
for(const edge of rewiredTarget210.edges)for(const id of [edge.from,edge.to]){
  if(!rewiredTarget210.adjacency.has(id))rewiredTarget210.adjacency.set(id,[]);
  rewiredTarget210.adjacency.get(id).push(edge);
}
const topologyConflict210=discoverCiiA210NativeGeometryHypotheses({
  ...syntheticInput210,targetGraph:rewiredTarget210,
});
assert.equal(topologyConflict210.summary.heldOutSupportedRetainedHypotheses,0,
  'same native NODE geometry plus matching local signatures is insufficient without physical EDGE agreement');
assert(topologyConflict210.hypotheses.some(x=>x.heldOutTopology.agreementFraction<0.95));
const corrupt210=structuredClone(syntheticInput210);
corrupt210.registrationAudit.provenance.originalTargetSha256='0'.repeat(64);
assert.throws(()=>discoverCiiA210NativeGeometryHypotheses(corrupt210),
  /STALE_SNAPSHOT_OR_ORIGINAL_SHA/);
const badGraph210=structuredClone(syntheticInput210);
badGraph210.sourceGraph.edges[0].from='UNKNOWN_SOURCE_NODE';
assert.throws(()=>discoverCiiA210NativeGeometryHypotheses(badGraph210),
  /INVALID_PHYSICAL_EDGE_SOURCE/);
assert.throws(()=>discoverCiiA210NativeGeometryHypotheses({
  ...syntheticInput210,policy:{minTriangleSine:0},
}),/INVALID_POLICY_minTriangleSine/);
assert.equal(JSON.stringify(positive210),
  JSON.stringify(discoverCiiA210NativeGeometryHypotheses(syntheticInput210)));

const originalA211Reports=[];
const originalA211Raw=new Map();
for(const member of preparedSession.members){
  const previousSurvey=examineCiiA209IndependentRegistration({
    ...originalSurveyInputs,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    normalizedSourceSha256:member.normalizedSha256,
  });
  const baseline=discoverCiiA210NativeGeometryHypotheses({
    registrationAudit:previousSurvey,geometryAudit:a208,routeAudit:originalRoutes,
    triage,reconciliation:evaluated,sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  });
  const received=exploreCiiA211IndexedNativeGeometry({
    baseline,registrationAudit:previousSurvey,
    sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  });
  originalA211Raw.set(member.sourceId,{recall:received,registrationAudit:previousSurvey,member});
  assert.equal(received.schema,'CiiArchitectureA211IndexedNativeGeometry.v1');
  assert.equal(received.summary.sourceNativeCoordinateNodes,member.sourceGraph.nodes.length);
  assert.equal(received.summary.targetNativeCoordinateNodes,1619);
  assert.equal(received.summary.targetConnectedComponents,5);
  assert.equal(received.previousA210TransformTrials,0);
  assert.equal(received.summary.searchComplete,false);
  assert.equal(received.originalManualOrAutoAnchorsAsSeeds,false);
  assert(received.summary.targetSameKindChordEdgesWithinRetrievalBand>=0);
  assert(received.summary.targetTriangleChecks>=0);
  assert(received.sourceSeedRetrievalReports.length>1,
    'no single early SOURCE seed may monopolize the entire native geometry search');
  assert(received.sourceSeedRetrievalReports.every(row=>
    row.triangleChecksWithinSeed<=received.policy.maxTriangleChecksPerSourceSeed));
  assert(received.sourceSeedRetrievalReports.every(row=>
    row.targetComponentCoverageInSample<=received.summary.targetConnectedComponents));
  assert(received.summary.targetComponentsSampled>=1);
  assert.equal(received.admittedCandidateCount,0);
  assert.equal(received.certifiedNodeCount,0);
  assert.equal(received.certifiedElementCount,0);
  assert.equal(received.writerReady,false);
  assert.equal(received.transferPlan,null);
  assert.equal(received.writeScope,null);
  assert.deepEqual(received.correspondenceCertificates,[]);
  assert(received.hypotheses.every(h=>h.certified===false&&h.canBindScope===false
    &&h.externallySurveyed===false&&h.writerReady===false));
  assert.throws(()=>assertCiiA211NoWrite(received),/NEVER_WRITER_AUTHORITY/);
  assert.equal(JSON.stringify(received),JSON.stringify(exploreCiiA211IndexedNativeGeometry({
    baseline,registrationAudit:previousSurvey,
    sourceId:member.sourceId,sourceGraph:member.sourceGraph,
    targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  })));
  originalA211Reports.push({
    member:member.sourceId,status:received.status,
    summary:received.summary,sourceSeedRetrievalReports:received.sourceSeedRetrievalReports,
    possibleTransforms:received.hypotheses.map(x=>({
      fitSource:x.sourceTriangleNodeIds,fitTarget:x.targetTriangleNodeIds,
      component:x.targetComponentId,heldout:x.heldOut,
      status:x.reviewStatus,certified:false,
    })),
  });
}
// Authentic SOURCE-set original fixture qualification: retrieval found a
// promising S2 region but it remains intrinsically non-survey and cannot
// become a NODE/ELEMENT certificate or writer candidate.
assert.deepEqual(originalA211Reports.map(r=>r.summary.sourceSeedEdgesSelected),[24,24,24]);
assert.deepEqual(originalA211Reports.map(r=>r.summary.targetComponentsSampled),[5,5,5]);
assert.deepEqual(originalA211Reports.map(r=>r.summary.rigidTransformTrials),[2,13,0]);
assert.deepEqual(originalA211Reports.map(r=>r.summary.heldOutTopologySupportedRetained),[0,1,0]);
const s2Original211=originalA211Reports.find(x=>x.member==='S2');
assert(s2Original211);
assert(s2Original211.possibleTransforms.some(x=>
  x.fitSource.join('|')==='50|80|90'
  &&x.fitTarget.join('|')==='40040|40050|40060'
  &&x.heldout.supported===true
  &&x.heldout.heldOutNodeMatches===38
  &&x.heldout.sourceNodesHeldOut===44
  &&x.heldout.heldOutEdgesChecked===37
  &&x.heldout.heldOutEdgesCompatible===34),
  'pin authentic 38/44 nodes and 34/37 edges as provisional topology evidence, never correspondence authority');
const base211={
  baseline:positive210,registrationAudit:blockA210,
  sourceGraph:syntheticSource210,targetGraph:syntheticTarget210,
  sourceId:'S1',
  normalizedSourceSha256:g209.normalizedSourceShaById.S1,
  normalizedTargetSha256:g209.normalizedTargetSha256,
};
const positive211=exploreCiiA211IndexedNativeGeometry(base211);
assert(positive211.hypotheses.some(x=>
  x.reviewStatus==='GEOMETRY_TOPOLOGY_HELDOUT_SUPPORTED_NOT_CERTIFIED'
  &&x.heldOut.heldOutEdgesChecked>=2
  &&x.heldOut.heldOutEdgeAgreementFraction===1),
  'indexed retrieval must discover proper noncoplanar native geometry with held-out physical EDGE agreement');
assert.equal(positive211.certifiedNodeCount,0);
assert.equal(positive211.writerReady,false);
assert.equal(positive211.summary.searchComplete,false);

// Source geometry exists inside a late/larger TARGET component, preceded by
// many simple disjoint PIPE decoy components with lexically early NODE IDs.
// Retained candidate sampling must reach the genuine component, not take
// the first 50 IDs from a coarse topology fingerprint.
const manyDecoys211=structuredClone(syntheticTarget210);
for(let n=0;n<60;n++){
  const from='AAA'+String(n).padStart(3,'0')+'a';
  const to='AAA'+String(n).padStart(3,'0')+'b';
  const position=[n*9000+30000,8000,4000];
  manyDecoys211.nodes.push({id:from,position});
  manyDecoys211.nodes.push({id:to,position:[position[0]+100,position[1],position[2]]});
  const edge={elementId:'DECOY'+String(n),from,to,
    componentKind:'PIPE',lengthMm:100,dx:100,dy:0,dz:0,diameter:273,wall:25.4};
  manyDecoys211.edges.push(edge);
  manyDecoys211.adjacency.set(from,[edge]);
  manyDecoys211.adjacency.set(to,[edge]);
}
function inputForTarget211(graph){
  const registrationAudit=examineCiiA209IndependentRegistration({
    ...syntheticRegistration,sourceGraph:syntheticSource210,targetGraph:graph,
    independentSurvey:null,fitPairs:[],heldOutPairs:[],
  });
  const baseline=discoverCiiA210NativeGeometryHypotheses({
    ...syntheticInput210,registrationAudit,targetGraph:graph,
  });
  return {...base211,targetGraph:graph,registrationAudit,baseline};
}
const decoy211=exploreCiiA211IndexedNativeGeometry({
  ...inputForTarget211(manyDecoys211),
  policy:{maxTargetEdgeRecordsPerSourceSeed:200,maxTransformsEvaluated:150,
    maxReturnedHypotheses:30,maxTriangleChecks:60000},
});
assert(decoy211.summary.targetConnectedComponents===61);
assert(decoy211.summary.targetComponentsSampled>=1);
assert(decoy211.hypotheses.some(h=>h.heldOut.supported),
  'do not miss late physical target network when 60 unrelated early-ID components precede it');
assert(decoy211.hypotheses.some(h=>h.targetTriangleNodeIds.every(id=>!id.startsWith('AAA'))));
assert(decoy211.hypotheses.every(h=>h.certified===false));
const competing211=exploreCiiA211IndexedNativeGeometry({
  ...inputForTarget211(dupTarget210),
  policy:{maxTargetEdgeRecordsPerSourceSeed:200,maxTransformsEvaluated:150,
    maxReturnedHypotheses:40},
});
assert(competing211.summary.distinctRigidTransforms>=2,
  'two identical original physical TARGET components must remain distinct alternatives');
assert(competing211.hypotheses.filter(h=>h.heldOut.supported).length>=2);
const clipped211=exploreCiiA211IndexedNativeGeometry({
  ...inputForTarget211(dupTarget210),
  policy:{maxSourceSeedEdges:1,maxTargetEdgeRecordsPerSourceSeed:1,
    maxTransformsEvaluated:1,maxReturnedHypotheses:1,maxTriangleChecks:1},
});
assert.equal(clipped211.summary.searchComplete,false);
assert.equal(clipped211.summary.sourceEdgeSeedLimitReached,true);
assert.equal(clipped211.writerReady,false);
const mirror211=exploreCiiA211IndexedNativeGeometry({
  ...base211,baseline:mirrored210,targetGraph:mirrorTarget210,
});
assert.equal(mirror211.summary.heldOutTopologySupportedRetained,0);
const rewired211=exploreCiiA211IndexedNativeGeometry({
  ...base211,baseline:topologyConflict210,targetGraph:rewiredTarget210,
});
assert.equal(rewired211.summary.heldOutTopologySupportedRetained,0);
const wrongSha211=structuredClone(base211);
wrongSha211.baseline.provenance.sourceOriginalSha256='0'.repeat(64);
assert.throws(()=>exploreCiiA211IndexedNativeGeometry(wrongSha211),
  /A210_PROVENANCE_OR_CENSUS_STALE/);
const brokenEdge211=structuredClone(base211);
brokenEdge211.targetGraph.edges[0].to='NO_SUCH_NODE';
assert.throws(()=>exploreCiiA211IndexedNativeGeometry(brokenEdge211),
  /INVALID_EDGE_INCIDENCE_TARGET/);
assert.throws(()=>exploreCiiA211IndexedNativeGeometry({
  ...base211,policy:{minTriangleSine:0},
}),/INVALID_POLICY_minTriangleSine/);
assert.equal(JSON.stringify(positive211),JSON.stringify(exploreCiiA211IndexedNativeGeometry(base211)));

const auditInputsA212=(memberId)=>{
  const {recall,registrationAudit,member}=originalA211Raw.get(memberId);
  return {
    recall,registrationAudit,reconciliation:evaluated,sourceId:memberId,
    sourceGraph:member.sourceGraph,targetGraph:preparedSession.target.targetGraph,
    normalizedSourceSha256:member.normalizedSha256,
    normalizedTargetSha256:preparedSession.target.normalizedSha256,
  };
};
const s2A212=inspectCiiA212HeldOutDiscrepancies(auditInputsA212('S2'));
assert.equal(s2A212.schema,'CiiArchitectureA212HeldOutDiscrepancies.v1');
assert.equal(s2A212.status,'UNQUALIFIED_TRANSFORM_DISCREPANCIES_ATTESTED_NOT_WRITABLE');
assert.equal(s2A212.provenance.originalSourceSetSha256,
  '5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3');
assert.equal(s2A212.provenance.originalTargetSha256,
  'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060');
assert.deepEqual(s2A212.reviewCandidate.sourceFitNodeIds,['50','80','90']);
assert.deepEqual(s2A212.reviewCandidate.targetFitNodeIds,['40040','40050','40060']);
assert.equal(s2A212.summary.sourceNodeCount,47);
assert.equal(s2A212.summary.sourceElementCount,46);
assert.equal(s2A212.summary.originalTARGETNodeCount,1619);
assert.equal(s2A212.summary.heldOutNodeCount,44);
assert.equal(s2A212.summary.geometryAssignedHeldOutNodes,38);
assert.equal(s2A212.summary.unmatchedHeldOutNodes,6);
assert.equal(s2A212.summary.heldOutEdgesReinspected,37);
assert.equal(s2A212.summary.heldOutDirectTopologyCompatible,34);
assert.equal(s2A212.summary.heldOutDirectTopologyIncompatible,3);
assert.equal(s2A212.summary.originalA211ReportedEdgesCompatible,34);
assert.equal(s2A212.originalTopologyIncompatibleEdges.length,3);
assert.equal(s2A212.discrepancies.length,6);
assert.deepEqual(s2A212.discrepancies.map(n=>n.sourceNodeId),
  ['40','210','630','640','660','669']);
assert.deepEqual(s2A212.discrepancies.map(n=>n.status),[
  'LOCAL_TOPOLOGY_SIGNATURE_MISMATCH_WITHIN_30MM',
  'NO_TARGET_NODE_WITHIN_350MM',
  'NO_TARGET_NODE_WITHIN_30MM',
  'NO_TARGET_NODE_WITHIN_30MM',
  'NO_TARGET_NODE_WITHIN_30MM',
  'NO_TARGET_NODE_WITHIN_30MM',
]);
const ione=s2A212.discrepancies.find(n=>n.sourceNodeId==='40');
assert.equal(ione.nearestOriginalTargetGeometry[0].targetNodeId,'40030');
assert.equal(ione.nearestOriginalTargetGeometry[0].distanceMm,0);
assert.equal(ione.nearestOriginalTargetGeometry[0].degreeKindCompatible,false);
assert(ione.physicalBridgeCounterfactuals.some(b=>
  b.sourceElementId==='E1:40->50'
  &&b.toAlreadyProposedTargetNode==='40040'
  &&b.fromUnadmittedTargetCandidate==='40030'
  &&b.targetPhysicalPaths.some(p=>
    p.segmentationType==='PIPE_ONE_TO_MANY'
    &&p.lengthWithinDeclaredTolerance===true
    &&p.subdivisionStraightnessValid===true)),
  'SOURCE terminal NODE 40 -> TARGET 40030 has physical PIPE subdivision bridge but differing node-degree identity');
assert.equal(s2A212.discrepancies.find(n=>n.sourceNodeId==='210')
  .nearestOriginalTargetGeometry.length,0);
for(const name of ['630','640','660','669']){
 const n=s2A212.discrepancies.find(n=>n.sourceNodeId===name);
 assert(n.nearestOriginalTargetGeometry[0].distanceMm>=199.99);
 assert(n.nearestOriginalTargetGeometry[0].distanceMm<=200.03);
 assert.equal(n.nearestOriginalTargetGeometry[0].degreeKindCompatible,true);
}
assert.equal(s2A212.summary.missingNodesWithExactPhysicalBridgeCounterfactual>=1,true);
assert.deepEqual(s2A212.originalTopologyIncompatibleEdges.map(x=>x.sourceElementId),
  ['E5:120->140','E13:230->250','E25:360->370']);
assert.deepEqual(s2A212.originalTopologyIncompatibleEdges.map(x=>
  x.pathWitnesses.find(p=>p.segmentationType==='PIPE_ONE_TO_MANY')
  ?.physicalLengthDifferenceMm),[0,0,0]);
assert(s2A212.originalTopologyIncompatibleEdges.every(x=>
  x.pathWitnesses.some(p=>p.segmentationType==='PIPE_ONE_TO_MANY'
    &&p.subdivisionStraightnessValid
    &&p.lengthWithinDeclaredTolerance
    &&p.targetElementIds.length===2)));
assert.deepEqual(s2A212.existingCustodyWarnings.map(x=>[
 x.provisionalSourceNode,x.targetNodeId,x.preexistingOtherSourceClaim,
]),[['S2:90','40060','S2:50'],['S2:250','10170','S2:220']]);
assert(s2A212.discrepancies.every(n=>n.status!=='BOUNDED_GEOMETRIC_NODE_HYPOTHESIS_ONLY'));
assert(s2A212.discrepancies.every(n=>n.chosenTargetNodeId===null));
assert(s2A212.heldOutEdges.every(e=>e.originalEdgeWitnessCertified===false));
assert.equal(s2A212.summary.incompleteOriginalPhysicalElementsRepaired,0);
assert.equal(s2A212.summary.independentSurveyQualified,false);
assert.equal(s2A212.certifiedNodeCount,0);
assert.equal(s2A212.certifiedElementCount,0);
assert.equal(s2A212.admittedCandidateCount,0);
assert.equal(s2A212.writerReady,false);
assert.equal(s2A212.writeScope,null);
assert.equal(s2A212.transferPlan,null);
assert.deepEqual(s2A212.correspondenceCertificates,[]);
assert(Object.isFrozen(s2A212));
assert.throws(()=>assertCiiA212NoWrite(s2A212),/NEVER_WRITER_AUTHORITY/);
assert.equal(JSON.stringify(s2A212),
  JSON.stringify(inspectCiiA212HeldOutDiscrepancies(auditInputsA212('S2'))));
for(const memberId of ['S1','S3']){
 const r=inspectCiiA212HeldOutDiscrepancies(auditInputsA212(memberId));
 assert.equal(r.status,'NO_HELDOUT_SUPPORTED_TRANSFORM_IN_BOUNDED_PARENT_SEARCH');
 assert.equal(r.summary.transformSelected,false);
 assert.equal(r.admittedCandidateCount,0);
 assert.equal(r.certifiedNodeCount,0);
 assert.equal(r.certifiedElementCount,0);
 assert.equal(r.writerReady,false);
}
// Test independent synthetic native geometry inherited from the A2-11
// non-writing fixture without consulting a golden SOURCE/TARGET name map.
const positiveA212=inspectCiiA212HeldOutDiscrepancies({
  recall:positive211,registrationAudit:blockA210,
  reconciliation:g209.reconciliation,
  sourceId:'S1',sourceGraph:syntheticSource210,targetGraph:syntheticTarget210,
  normalizedSourceSha256:g209.normalizedSourceShaById.S1,
  normalizedTargetSha256:g209.normalizedTargetSha256,
});
assert.equal(positiveA212.status,
  'UNQUALIFIED_TRANSFORM_DISCREPANCIES_ATTESTED_NOT_WRITABLE');
assert.equal(positiveA212.summary.unmatchedHeldOutNodes,0);
assert.equal(positiveA212.summary.heldOutDirectTopologyIncompatible,0);
assert.equal(positiveA212.writerReady,false);
const tamperedA212=structuredClone(auditInputsA212('S2'));
tamperedA212.recall.provenance.originalTargetSha256='0'.repeat(64);
assert.throws(()=>inspectCiiA212HeldOutDiscrepancies(tamperedA212),
 /STALE_OR_UNQUALIFIED_ORIGINAL_BASIS/);
const badPhysicalA212=structuredClone(auditInputsA212('S2'));
badPhysicalA212.sourceGraph.edges[0].to='FORGED-NODE';
assert.throws(()=>inspectCiiA212HeldOutDiscrepancies(badPhysicalA212),
 /EDGE_INCIDENCE_SOURCE/);
assert.throws(()=>inspectCiiA212HeldOutDiscrepancies({
 ...auditInputsA212('S2'),policy:{nearestDiagnosticDistanceMm:10},
}),/DIAGNOSTIC_BAND_BELOW_ACCEPTANCE_BAND/);

const originalS2A213=reviewCiiA213WholeSubchains({
  discrepancy:s2A212,reconciliation:evaluated,sourceId:'S2',
  sourceGraph:auditInputsA212('S2').sourceGraph,
  targetGraph:auditInputsA212('S2').targetGraph,
  normalizedSourceSha256:auditInputsA212('S2').normalizedSourceSha256,
  normalizedTargetSha256:auditInputsA212('S2').normalizedTargetSha256,
});
assert.equal(originalS2A213.schema,'CiiArchitectureA213WholeSubchainFalsifiers.v1');
assert.equal(originalS2A213.status,
 'S2_WHOLE_SUBCHAINS_REVIEW_ONLY_WITH_CUSTODY_AND_BOUNDARY_VETOES');
assert.equal(originalS2A213.summary.sourceNodeCount,47);
assert.equal(originalS2A213.summary.sourceElementCount,46);
assert.equal(originalS2A213.summary.originalUnmatchedSourceNodes,6);
assert.equal(originalS2A213.summary.originalS2DirectOrSubdividedWitnessedHeldOutEdges,37);
assert.equal(originalS2A213.summary.zonesReviewed,3);
assert.deepEqual(originalS2A213.reviewZones.map(z=>z.zoneName),[
  'S2_END_NODE_DEGREE_AND_PIPE_SPLIT',
  'S2_1500MM_SINGLE_NODE_OUTLIER',
  'S2_FOUR_NODE_200MM_SHIFT']);
assert.deepEqual(originalS2A213.reviewZones.map(z=>z.originalSourceNodes),[
  ['40'],['210'],['630','640','660','669']]);
const zoneShift=originalS2A213.reviewZones[2];
assert.equal(zoneShift.coherentTranslationGeometryOnly,true);
assert.equal(zoneShift.unadmittedSourceTargetGeometryPairs.length,4);
assert.deepEqual(zoneShift.unadmittedSourceTargetGeometryPairs
  .map(x=>x.targetNodeHypothesis),['10470','10480','10490','10500']);
assert(Math.abs(zoneShift.meanTargetMinusGlobalTransformMm[1]+200)<=1e-6);
assert(zoneShift.maximumOffsetSpreadMm<5,
  'whole zone must have coherent 200 mm Y displacement, not random nearest neighbours');
assert.equal(zoneShift.physicalEngineeringRevisionAuthorized,false);
assert.deepEqual(zoneShift.orderedOriginalSubchainPhysicalComparisons.map(x=>
 [x.sourcePhysicalElements,x.targetPhysicalElements]),[
 [['E44:630->640'],['E1018:10470->10480']],
 [['E45:640->660'],['E1019:10480->10490']],
 [['E46:660->669'],['E1020:10490->10500']],
]);
assert(zoneShift.orderedOriginalSubchainPhysicalComparisons.every(x=>
 x.pairedEdgeComponentKindsCompatible===true&&x.strictOriginalLengthMatch===true
 &&x.noIdentityCertificate===true));
assert.equal(zoneShift.entireOrderedInternalPhysicalSubchainStrictlyCompatible,true);
const entry200=zoneShift.outsideBoundaryPhysicalEdges.find(x=>
 x.sourceElementId==='E43:620->630');
assert(entry200);
assert.equal(entry200.originalLengthMm,774.55);
assert.deepEqual(entry200.independentOriginalTargetPathWitnesses.map(x=>
 [x.targetElementIds,x.targetLengthMm,x.lengthDifferenceMm,x.physicalPathStrictlyCompatible]),
 [[['E1017:10460->10470'],574.55,200,false]]);
assert.equal(zoneShift.twoIndependentBoundaryClosuresProven,false,
  'do not promote coherent geometry without independent boundary custody and original physical witnesses');
const zoneTerminal=originalS2A213.reviewZones[0];
assert.equal(zoneTerminal.originalSourceNodes[0],'40');
assert.equal(zoneTerminal.unadmittedSourceTargetGeometryPairs[0].targetNodeHypothesis,'40030');
assert.equal(zoneTerminal.twoIndependentBoundaryClosuresProven,false);
const zoneOutlier=originalS2A213.reviewZones[1];
assert.equal(zoneOutlier.originalSourceNodes[0],'210');
assert.equal(zoneOutlier.coherentTranslationGeometryOnly,false);
assert.equal(zoneOutlier.unadmittedSourceTargetGeometryPairs[0]
  .distanceFromGlobalTransformMm,1500);
const outlierEnd=zoneOutlier.outsideBoundaryPhysicalEdges.find(x=>x.sourceElementId==='E11:210->220');
assert(outlierEnd);
assert.equal(outlierEnd.originalLengthMm,6500);
assert.deepEqual(outlierEnd.independentOriginalTargetPathWitnesses.map(w=>
 [w.targetElementIds,w.targetLengthMm,w.lengthDifferenceMm,w.physicalPathStrictlyCompatible]),
 [[['E983:10130->10140'],8000,1500,false]]);
assert.equal(originalS2A213.summary.unresolvedTargetCustodyVetoes,2);
assert.deepEqual(originalS2A213.custodyVetoes.map(x=>[
  x.provisionalSourceNode,x.targetNodeId,x.preexistingOtherSourceClaim,
]),[['S2:90','40060','S2:50'],['S2:250','10170','S2:220']]);
assert.equal(originalS2A213.summary.independentlyCertifiedSubchains,0);
assert.equal(originalS2A213.certifiedNodeCount,0);
assert.equal(originalS2A213.certifiedElementCount,0);
assert.equal(originalS2A213.admittedCandidateCount,0);
assert.equal(originalS2A213.writerReady,false);
assert.equal(originalS2A213.transferPlan,null);
assert.equal(originalS2A213.writeScope,null);
assert.deepEqual(originalS2A213.correspondenceCertificates,[]);
assert(Object.isFrozen(originalS2A213));
assert(Object.isFrozen(zoneShift));
assert.throws(()=>assertCiiA213NoWrite(originalS2A213),
  /A213_WHOLE_SUBCHAIN_GEOMETRY_NEVER_WRITER_AUTHORITY/);
const input213=()=>({
  discrepancy:s2A212,reconciliation:evaluated,sourceId:'S2',
  sourceGraph:auditInputsA212('S2').sourceGraph,
  targetGraph:auditInputsA212('S2').targetGraph,
  normalizedSourceSha256:auditInputsA212('S2').normalizedSourceSha256,
  normalizedTargetSha256:auditInputsA212('S2').normalizedTargetSha256,
});
assert.equal(JSON.stringify(originalS2A213),
 JSON.stringify(reviewCiiA213WholeSubchains(input213())));
for(const otherId of ['S1','S3']){
 const d=inspectCiiA212HeldOutDiscrepancies(auditInputsA212(otherId));
 const x=reviewCiiA213WholeSubchains({
   discrepancy:d,reconciliation:evaluated,sourceId:otherId,
   sourceGraph:auditInputsA212(otherId).sourceGraph,
   targetGraph:auditInputsA212(otherId).targetGraph,
   normalizedSourceSha256:auditInputsA212(otherId).normalizedSourceSha256,
   normalizedTargetSha256:auditInputsA212(otherId).normalizedTargetSha256,
 });
 assert.equal(x.status,'BLOCKED_WITHOUT_A212_HELDOUT_SUPPORTED_TRANSFORM');
 assert.equal(x.summary.independentlyCertifiedSubchains,0);
 assert.equal(x.writerReady,false);
}
const forgedSHA213=structuredClone(input213());
forgedSHA213.discrepancy.provenance.originalTargetSha256='f'.repeat(64);
assert.throws(()=>reviewCiiA213WholeSubchains(forgedSHA213),
  /ORIGINAL_SOURCE_TARGET_PROVENANCE_MISMATCH/);
const forgedSOURCEPosition213=structuredClone(input213());
forgedSOURCEPosition213.sourceGraph.nodes.find(n=>String(n.id)==='630').position=[0,0,0];
assert.throws(()=>reviewCiiA213WholeSubchains(forgedSOURCEPosition213),
  /A212_COORDINATE_WITNESS_NOT_REPRODUCIBLE/);
const forgedTARGETPosition213=structuredClone(input213());
forgedTARGETPosition213.targetGraph.nodes.find(n=>String(n.id)==='10480').position=[0,0,0];
assert.throws(()=>reviewCiiA213WholeSubchains(forgedTARGETPosition213),
  /A212_COORDINATE_WITNESS_NOT_REPRODUCIBLE/);
const forgedGRAPH213=structuredClone(input213());
forgedGRAPH213.sourceGraph.edges[0].from='FORGED-NODE';
assert.throws(()=>reviewCiiA213WholeSubchains(forgedGRAPH213),
  /INVALID_EDGE_INCIDENCE_SOURCE/);
const forgedCustody213=structuredClone(input213());
forgedCustody213.discrepancy.existingCustodyWarnings.pop();
assert.throws(()=>reviewCiiA213WholeSubchains(forgedCustody213),
  /PARENT_CUSTODY_VETO_TAMPERED/);
assert.throws(()=>reviewCiiA213WholeSubchains({
 ...input213(),policy:{minIndependentBoundaryEnds:1},
}),/BAD_POLICY_minIndependentBoundaryEnds/);

const retainedA213={
 schema:originalS2A213.schema,status:originalS2A213.status,
 provenance:originalS2A213.provenance,policy:originalS2A213.policy,
 summary:originalS2A213.summary,
 originalS2WholeSubchains:originalS2A213.reviewZones,
 custodyVetoes:originalS2A213.custodyVetoes,
 originalGlobalIncompleteElementFactors:33,
 certifiedNodeCount:0,certifiedElementCount:0,admittedCandidateCount:0,
 writerReady:false,
};
const outPathA213=process.argv.find(x=>x.startsWith('--out='))?.slice('--out='.length);
if(outPathA213){
 const outfile=resolve(outPathA213);
 if(outfile.replaceAll('\\\\','/').includes('/Benchmark/'))
   throw Error('A213_ORIGINAL_SOURCE_TARGET_READ_ONLY');
 mkdirSync(dirname(outfile),{recursive:true});
 writeFileSync(outfile,JSON.stringify(retainedA213,null,2),'utf8');
 assert.deepEqual(JSON.parse(readFileSync(outfile,'utf8')),retainedA213);
}
console.log('A2_13_ORIGINAL_WHOLE_SUBCHAIN_FALSIFIERS',JSON.stringify({
 summary:originalS2A213.summary,
 zones:originalS2A213.reviewZones.map(z=>({
  name:z.zoneName,source:z.originalSourceNodes,
  target:z.unadmittedSourceTargetGeometryPairs.map(x=>x.targetNodeHypothesis),
  translation:z.meanTargetMinusGlobalTransformMm,
  spread:z.maximumOffsetSpreadMm,
  relativeEndpointResidual:z.originalSourceAndTargetRelativeEndpointVectorResidualMm,
  sourceRoute:z.sourceWholeSubchainSegments,
  targetRoute:z.targetWholeSubchainSegments,
  orderedPhysicalSegments:z.orderedOriginalSubchainPhysicalComparisons,
  originalBoundaryCandidates:z.outsideBoundaryPhysicalEdges,
  wholeSubchainConnected:z.wholeSubchainRouteConnected,
  twoIndependentBoundaryClosuresProven:z.twoIndependentBoundaryClosuresProven,
 })),
 custodyVetoes:originalS2A213.custodyVetoes,
 certifiedNodes:0,certifiedElements:0,writerReady:false,
},null,2));
console.log('PASS A2-13: original S2 whole-subchain coherence and two independent boundary vetoes, 200mm cluster, 1500mm outlier, 2 custody conflicts, source/target SHA negative tests, no Writer');

// A2-14 uses the actual immutable original fixture reconstruction as a
// read-only input; no production code imports this exported test-only surface.
export const originalA214TestInputs=Object.freeze({
 subchains:originalS2A213,discrepancy:s2A212,reconciliation:evaluated,sourceId:'S2',
 sourceGraph:auditInputsA212('S2').sourceGraph,
 targetGraph:auditInputsA212('S2').targetGraph,
 normalizedSourceSha256:auditInputsA212('S2').normalizedSourceSha256,
 normalizedTargetSha256:auditInputsA212('S2').normalizedTargetSha256,
});

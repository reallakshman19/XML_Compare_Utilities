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
console.log(JSON.stringify({
  schema:real.schema,sourceSetSha256:real.provenance.originalSourceSetSha256,
  originalMissingPhysicalElementFactors:real.originalMissingPhysicalElementFactors,
  missingCauseCounts:real.rootCauseCounts,
  originalUnmappedNodeCount:real.sourceNodesOriginallyUnmapped.length,
  recoveryRoundEvidence:real.recoveryRoundEvidence,
  newDistinctHypotheses:real.newDistinctHypotheses,
  nodesWithNewHypotheses:real.sourceNodesWithNewHypotheses,
  remainingFactorsWithoutBothEndpointHypotheses:real.remainingFactorsWithoutBothEndpointHypotheses,
  exampleProposals:real.proposals.slice(0,8).map(r=>({
    sourceNode:r.sourceNodeKey,targetNode:r.targetNodeId,round:r.round,
    path:r.hypotheses[0]?.targetElementIds,warning:r.sharedTargetWarnings,
  })),
  statusFlags:real.statusFlags,
  certificationCount:0,writerReady:false,
},null,2));
console.log('PASS A2-04: bounded multi-round frontier alternatives, original SHA custody, subdivision branch veto, tampering/budget negatives and exact original CII no-write recovery diagnostics');

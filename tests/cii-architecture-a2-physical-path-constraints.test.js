import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectCiiA2PhysicalConstraints, assertCiiA2PhysicalNoWrite } from '../scripts/cii-architecture-a2-physical-path-constraints.mjs';
import { buildCiiA2ShadowJointEvidence } from '../scripts/cii-architecture-a2-shadow-joint-evidence.mjs';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewFromPreparedSession, createCiiCommonAnalysisCache } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const h=(digit)=>digit.repeat(64),digest=(b)=>createHash('sha256').update(b).digest('hex');
function graph(side,sha,records) {
  const edges=records.map(([id,from,to,len,dia=100,wall=5,kind='PIPE'])=>({
    elementId:id,from,to,lengthMm:len,diameter:dia,wall,componentKind:kind,dx:len,dy:0,dz:0,
  }));
  const adjacency=new Map();
  for(const edge of edges)for(const n of [edge.from,edge.to]){
    if(!adjacency.has(n))adjacency.set(n,[]);
    adjacency.get(n).push(edge);
  }
  return {side,documentId:side+':'+sha,edges,adjacency};
}
const s1=graph('SOURCE',h('1'),[['ES','A','B',10]]);
const s2=graph('SOURCE',h('2'),[]);
const t=graph('TARGET',h('3'),[['ET1','X','M',4],['ET2','M','Y',6]]);
const auth={
  sourceSetSha256:h('4'),originalTargetSha256:h('5'),
  originalSourceShaById:{S1:h('6'),S2:h('7')},
};
const ref=(id,original,side,src)=>({side,sourceId:src,originalSha256:original,entityKind:'NODE',physicalId:id});
function joint({nodes=[['S1','A','X'],['S1','B','Y']],other=[]}={}){
  const all=[...nodes,...other];
  const hypotheses=all.map(([s,n,target])=>({
    sourceNodeKey:s+':'+n,targetNodeId:target,
    sourceRef:ref(n,auth.originalSourceShaById[s],'SOURCE',s),
    targetRef:ref(target,auth.originalTargetSha256,'TARGET',null),
  }));
  const rowKeys=[...new Set(all.map(([s,n])=>s+':'+n))];
  return {
    schema:'CiiArchitectureA2ShadowJointEvidence.v1',status:'SHADOW_REVIEW_ONLY',
    writerDispatchInstalled:false,transferPlan:null,writeScope:null,
    provenance:{...auth,physicalOriginalSnapshotDigest:h('8')},
    hypotheses,nodeRows:rowKeys.map(k=>({sourceNodeKey:k,
      targets:all.filter(([s,n])=>s+':'+n===k).map(([, ,v])=>v)})),
  };
}
const base={joint:joint(),sourceGraphsById:{S1:s1,S2:s2},targetGraph:t,
  normalizedSourceShaById:{S1:h('1'),S2:h('2')},normalizedTargetSha256:h('3')};
const good=inspectCiiA2PhysicalConstraints(base);
assert.equal(good.schema,'CiiArchitectureA2PhysicalConstraintAudit.v1');
assert.equal(good.sourceElementCountExamined,1);
assert.equal(good.edgeRows[0].status,'LOCAL_PATH_SUPPORTED');
assert.deepEqual(good.edgeRows[0].pathWitnesses[0].targetElementIds,['ET1','ET2']);
assert.deepEqual(good.edgeRows[0].pathWitnesses[0].targetNodePath,['X','M','Y']);
assert.equal(good.edgeRows[0].pathWitnesses[0].relation,'SOURCE_ELEMENT_TO_SUBDIVIDED_TARGET_PATH');
assert.equal(good.edgeRows[0].pathWitnesses[0].lengthDeltaMm,0);
assert.equal(good.certifiedNodeCount,0);
assert.equal(good.certifiedElementCount,0);
assert.equal(good.writerReady,false);
assert.equal(good.mutationPlan,null);
assert.equal(good.writeScope,null);
assert(Object.isFrozen(good.edgeRows[0].pathWitnesses[0]));
assert.throws(()=>assertCiiA2PhysicalNoWrite(good),/NEVER_WRITE_AUTHORITY/);

const oneToOne=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),[['DIRECT','X','Y',10]])});
assert.equal(oneToOne.edgeRows[0].status,'LOCAL_PATH_SUPPORTED');
assert.deepEqual(oneToOne.edgeRows[0].pathWitnesses[0].targetElementIds,['DIRECT']);
assert.equal(oneToOne.edgeRows[0].pathWitnesses[0].relation,'ELEMENT_1_TO_1');

const odBad=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),
  [['ET1','X','M',4,200],['ET2','M','Y',6,200]])});
assert.equal(odBad.edgeRows[0].status,'LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS');
assert(odBad.edgeRows[0].pathWitnesses[0].propertyWarnings.includes('ELEMENT_OD_ENGINEERING_REVISION_DIFFERENCE'));
const wallBad=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),
  [['ET1','X','M',4,100,15],['ET2','M','Y',6,100,15]])});
assert.equal(wallBad.edgeRows[0].status,'LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS');
assert(wallBad.edgeRows[0].pathWitnesses[0].propertyWarnings.includes('ELEMENT_WALL_ENGINEERING_REVISION_DIFFERENCE'));
const lengthBad=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),
  [['ET1','X','M',40],['ET2','M','Y',60]])});
assert(lengthBad.edgeRows[0].invalidCandidatePairs[0].reasons.includes('PATH_LENGTH_MISMATCH'));
const nonPipe=inspectCiiA2PhysicalConstraints({...base,sourceGraphsById:{S1:graph('SOURCE',h('1'),
  [['ES','A','B',10,100,5,'RIGID']]),S2:s2}});
assert(nonPipe.edgeRows[0].invalidCandidatePairs[0].reasons.includes('SUBDIVISION_NON_PIPE_SOURCE'));
const branch=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),
  [['ET1','X','M',4],['ET2','M','Y',6],['BR','M','Z',1]])});
assert.equal(branch.edgeRows[0].status,'NO_COMPATIBLE_BOUNDED_PATH');
assert(branch.edgeRows[0].invalidCandidatePairs[0].reasons.includes('TARGET_PATH_INTERNAL_NODE_DEGREE_NOT_2'));
const reserved=inspectCiiA2PhysicalConstraints({...base,joint:joint({other:[['S2','C','M']]})});
assert.equal(reserved.edgeRows[0].status,'NO_COMPATIBLE_BOUNDED_PATH');
assert(reserved.edgeRows[0].invalidCandidatePairs[0].reasons.includes('TARGET_PATH_INTERNAL_NODE_RESERVED_BY_OTHER_CLAIM'));

const symmetric=inspectCiiA2PhysicalConstraints({...base,targetGraph:graph('TARGET',h('3'),[
  ['A1','X','M',4],['A2','M','Y',6],['B1','X','N',4],['B2','N','Y',6],
])});
assert.equal(symmetric.edgeRows[0].status,'LOCAL_PATH_AMBIGUOUS');
assert.equal(symmetric.edgeRows[0].pathWitnesses.length,2);
assert.equal(symmetric.certifiedElementCount,0);
const bounded=inspectCiiA2PhysicalConstraints({...base,policy:{maxTraversalVisits:1}});
assert.equal(bounded.edgeRows[0].status,'SEARCH_INCOMPLETE');
assert.equal(bounded.edgeRows[0].truncated,true);
assert.equal(bounded.edgeRows[0].pathWitnesses.length,0);
const clipped=inspectCiiA2PhysicalConstraints({...base,policy:{maxSegments:1}});
assert.equal(clipped.edgeRows[0].status,'NO_COMPATIBLE_BOUNDED_PATH');
assert.equal(clipped.edgeRows[0].pathWitnesses.length,0);
assert(clipped.limitations.includes('UNSEEN_TARGET_PATHS_BEYOND_LIMIT_MAY_EXIST'));
assert.throws(()=>inspectCiiA2PhysicalConstraints({...base,normalizedTargetSha256:h('9')}),/NORMALIZED_BRIDGE_GRAPH_CUSTODY_MISMATCH/);
assert.throws(()=>inspectCiiA2PhysicalConstraints({...base,policy:{maxSegments:100}}),/INVALID_POLICY_maxSegments/);
assert.throws(()=>inspectCiiA2PhysicalConstraints({...base,joint:{...base.joint,writerDispatchInstalled:true}}),
  /NONWRITING_JOINT_HYPOTHESIS_REQUIRED/);
const fake=structuredClone({auth});
assert.equal(fake.auth.originalTargetSha256,h('5'));

const originals={
  'S1.CII':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII':'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII':'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const input=Object.fromEntries(Object.entries(originals).map(([k,expected])=>{
  const bytes=readFileSync(new URL('../Benchmark/'+k,import.meta.url));
  assert.equal(digest(bytes),expected);return[k,bytes];
}));
const sources=[1,2,3].map(i=>({sourceId:'S'+i,fileName:'S'+i+'.CII',bytes:input['S'+i+'.CII']}));
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  {sources,targetBytes:input['T.CII'],targetFileName:'T.CII'},{cryptoRef:webcrypto});
const auto=Object.fromEntries(inspection.memberInspections.map(m=>{
  const c=ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]);
  assert.equal(c.status,'READY');return[m.sourceId,c.baseLoops];
}));
const modes=[
  {mode:'AUTO_ONLY',opts:{baseLoopsBySource:auto}},
  {mode:'UI_MIXED_BASE_PROXY',opts:{baseLoopsBySource:{S1:auto.S1},
    anchorPairsBySource:{S2:[{sourceNodeId:'420',targetNodeId:'415'}],
      S3:[{sourceNodeId:'1580',targetNodeId:'7880'}]}}},
];
function reviewFor(preview){return Object.fromEntries(preview.memberPreviews.map(({sourceId,preview:p})=>[
  sourceId,{...(p.review||{}),reviewedCorrespondenceIds:(p.compareReview?.rows||[])
    .filter(x=>x.identityBound&&['HIGH','MEDIUM'].includes(x.confidence)).map(x=>x.correspondenceId),
    lockedCorrespondenceIds:(p.compareReview?.rows||[]).filter(x=>x.decision==='LOCKED').map(x=>x.correspondenceId),
    rejectedCorrespondenceIds:[]},
]));}
const snapshots=[],cache=createCiiCommonAnalysisCache();
for(const {mode,opts} of modes){
  const initial=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,opts,
    {cryptoRef:webcrypto,commonAnalysisCache:cache});
  const p=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,
    {...opts,reviewBySource:reviewFor(initial)},{cryptoRef:webcrypto,commonAnalysisCache:cache});
  snapshots.push({mode,sourceSetSha256:p.sourceSetSha256,
    originalTargetSha256:p.targetAuthority.originalSha256,audit:buildCiiSourceTargetAudit(p)});
}
const jointReal=buildCiiA2ShadowJointEvidence({
  authority:{
    sourceSetSha256:snapshots[0].sourceSetSha256,
    originalTargetSha256:originals['T.CII'],
    originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,digest(s.bytes)])),
  },
  snapshots,manualClaims:[
    {sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
    {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'},
  ],
  sourceGraphsById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph])),
  targetGraph:preparedSession.target.targetGraph,
});
const real=inspectCiiA2PhysicalConstraints({
  joint:jointReal,sourceGraphsById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph])),
  targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
assert(real.sourceElementCountExamined>0,'must inspect actual original CII graphs');
console.log('A2P_ORIGINAL_FORENSICS',JSON.stringify({
  statusCounts:real.summary,
  totalWithBothEndpoints:real.edgeRows.filter(x=>x.candidatePairCount>0).length,
  sampledInvalid:real.edgeRows.filter(x=>x.candidatePairCount>0)
    .slice(0,8).map(x=>({sourceMember:x.sourceMember,sourceElementId:x.sourceElementId,
      status:x.status,pairs:x.candidatePairCount,
      invalid:x.invalidCandidatePairs.slice(0,3)})),
}));
assert(real.edgeRows.some(x=>x.status==='LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS'),
  'authentic T wall-revision differences must be observations, not a blanket physical identity veto');
assert(real.edgeRows.some(x=>x.candidatePairCount>0),
  'authentic SOURCE set should contain a physical edge with two NODE candidate endpoints');
assert.equal(real.writerReady,false);
assert.equal(real.certifiedNodeCount,0);
assert.equal(real.certifiedElementCount,0);
assert.equal(real.mutationPlan,null);
assert(Object.isFrozen(real));
assert.equal(JSON.stringify(real),JSON.stringify(inspectCiiA2PhysicalConstraints({
  joint:jointReal,sourceGraphsById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph])),
  targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
})),'same original inputs must be deterministic');
console.log(JSON.stringify({
  schema:real.schema,originalSourceSetSha256:real.provenance.originalSourceSetSha256,
  sourceElementCountExamined:real.sourceElementCountExamined,
  localStatuses:real.summary,
  exampleSubdivisionRoutes:real.edgeRows.flatMap(x=>x.pathWitnesses
    .filter(w=>w.relation==='SOURCE_ELEMENT_TO_SUBDIVIDED_TARGET_PATH')
    .map(w=>({sourceMember:x.sourceMember,sourceElementId:x.sourceElementId,
      targetElementIds:w.targetElementIds}))).slice(0,5),
  physicallyCertifiedNodes:0,writerReady:false,
},null,2));
console.log('PASS A2-02: bounded NODE/ELEMENT/PATH physical constraints, 1:many synthetic qualification, ambiguous/OD/wall/length/branch/custody/overflow veto and authentic SHA-bound CII fixture shadow replay');

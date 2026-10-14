import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { solveCiiA2GlobalShadow, assertCiiA203NoWrite } from '../scripts/cii-architecture-a2-global-constraint-shadow.mjs';
import { buildCiiA2ShadowJointEvidence } from '../scripts/cii-architecture-a2-shadow-joint-evidence.mjs';
import { inspectCiiA2PhysicalConstraints } from '../scripts/cii-architecture-a2-physical-path-constraints.mjs';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewFromPreparedSession, createCiiCommonAnalysisCache } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const h=(c)=>c.repeat(64),digest=(v)=>createHash('sha256').update(v).digest('hex');
const inputBasis={sourceSetSha256:h('a'),originalTargetSha256:h('b'),
  originalSourceShaById:{S1:h('c'),S2:h('d')},physicalOriginalSnapshotDigest:h('e')};
const fakePolicy={maxSegments:4};
function buildSynthetic(nodeEntries,factorEntries){
  const rows=nodeEntries.map(([sourceId,sourceNodeId,targets])=>({
    sourceNodeKey:sourceId+':'+sourceNodeId,sourceId,sourceNodeId,targets,
  }));
  const hypotheses=rows.flatMap(n=>n.targets.map(target=>({
    sourceNodeKey:n.sourceNodeKey,targetNodeId:target,
    sourceRef:{sourceId:n.sourceId,physicalId:n.sourceNodeId,
      originalSha256:inputBasis.originalSourceShaById[n.sourceId]},
    targetRef:{physicalId:target,originalSha256:inputBasis.originalTargetSha256},
  })));
  const joint={schema:'CiiArchitectureA2ShadowJointEvidence.v1',status:'SHADOW_REVIEW_ONLY',
    writerDispatchInstalled:false,transferPlan:null,writeScope:null,
    provenance:inputBasis,nodeRows:rows,hypotheses,
    summary:{originalPhysicalSourceNodes:rows.length}};
  const edgeRows=factorEntries.map(([s,edgeId,from,to,options,status='LOCAL_PATH_SUPPORTED'])=>({
    sourceMember:s,sourceElementId:edgeId,sourceEndpoints:[from,to],
    candidatePairCount:options.length,
    status,blockers:status==='ENDPOINT_CANDIDATE_MISSING'?['SOURCE_EDGE_ENDPOINT_NOT_IN_HYPOTHESIS_LEDGER']:[],
    truncated:status==='SEARCH_INCOMPLETE',
    pathWitnesses:options.map(([a,b,edgeNames,nodePath])=>({
      sourceElementId:edgeId,targetEndpoints:[a,b],targetElementIds:edgeNames,
      targetNodePath:nodePath||[a,b],relation:edgeNames.length>1?
        'SOURCE_ELEMENT_TO_SUBDIVIDED_TARGET_PATH':'ELEMENT_1_TO_1',propertyWarnings:[],
    })),
  }));
  const pathAudit={schema:'CiiArchitectureA2PhysicalConstraintAudit.v1',
    status:'SHADOW_PHYSICAL_CONSTRAINTS_ONLY',writerReady:false,
    mutationPlan:null,writeScope:null,certifiedNodeCount:0,certifiedElementCount:0,
    provenance:{originalSourceSetSha256:inputBasis.sourceSetSha256,
      originalTargetSha256:inputBasis.originalTargetSha256,
      jointSnapshotDigest:inputBasis.physicalOriginalSnapshotDigest,
      normalizedTargetSha256:h('1'),normalizedSourceShaById:{S1:h('2'),S2:h('3')}},
    policyDigest:h('4'),sourceElementCountExamined:edgeRows.length,edgeRows};
  return {joint,pathAudit};
}
const ids=(...names)=>names.map(x=>['S1',x]);
const chain=buildSynthetic([
  ['S1','A',['X','W']],['S1','B',['Y']],['S1','C',['Z']],
],[
  ['S1','E1','A','B',[['X','Y',['TX-Y']]]],
  ['S1','E2','B','C',[['Y','Z',['TY-Z']]]],
]);
const unique=solveCiiA2GlobalShadow(chain);
assert.equal(unique.status,'GLOBAL_SHADOW_NON_WRITING');
assert.equal(unique.componentStates.ONE_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET,1);
assert.equal(unique.components[0].initialNodeDomains['S1:A'].length,2);
assert.deepEqual(unique.components[0].propagatedNodeDomains['S1:A'],['X']);
assert.equal(unique.components[0].distinctSolutionWitnesses,1);
assert.deepEqual(unique.components[0].solutions[0].nodeAssignments,{
  'S1:A':'X','S1:B':'Y','S1:C':'Z',
});
assert.equal(unique.certifiedNodeCount,0);
assert.equal(unique.certifiedElementCount,0);
assert.deepEqual(unique.correspondentCertificates,[]);
assert.equal(unique.writerReady,false);
assert.equal(unique.writeScope,null);
assert.throws(()=>assertCiiA203NoWrite(unique),/NEVER_WRITE_AUTHORITY/);
assert(Object.isFrozen(unique.components[0]));

const symmetric=buildSynthetic([
  ['S1','A',['X','W']],['S1','B',['Y','V']],
],[
  ['S1','E1','A','B',[
    ['X','Y',['EXY']],['W','V',['EWV']],
  ],'LOCAL_PATH_AMBIGUOUS'],
]);
const ambiguous=solveCiiA2GlobalShadow(symmetric);
assert.equal(ambiguous.componentStates.MULTIPLE_GLOBAL_ASSIGNMENTS_WITHIN_BOUNDS,1);
assert.equal(ambiguous.components[0].distinctSolutionWitnesses,2);
assert.equal(ambiguous.components[0].enumerationComplete,false,
  'two witnesses demonstrate ambiguity; no claim of exhaustive enumeration');
assert.equal(ambiguous.certifiedNodeCount,0);
const tinyBudget=solveCiiA2GlobalShadow(symmetric,{policy:{maxSearchStates:1}});
assert.equal(tinyBudget.componentStates.SEARCH_INCOMPLETE,1);
assert.equal(tinyBudget.components[0].certified,false);

const missing=buildSynthetic([
  ['S1','A',['X']],['S1','B',[]],
],[
  ['S1','E1','A','B',[],'ENDPOINT_CANDIDATE_MISSING'],
]);
const incomplete=solveCiiA2GlobalShadow(missing);
assert.equal(incomplete.componentStates.INCOMPLETE_PHYSICAL_EVIDENCE,1);
assert.equal(incomplete.components[0].distinctSolutionWitnesses,0);

const contradiction=buildSynthetic([
  ['S1','A',['X']],['S1','B',['Y']],['S1','C',['Z']],
],[
  ['S1','E1','A','B',[['X','Y',['ET1']]]],
  ['S1','E2','B','C',[['Y','Z',['ET1']]]],
]);
const stolenEdge=solveCiiA2GlobalShadow(contradiction);
assert.equal(stolenEdge.componentStates.NO_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET,1,
  'two SOURCE elements cannot physically occupy the same target element');
const crossSource=buildSynthetic([
  ['S1','A',['X']],['S1','B',['Y']],
  ['S2','C',['X']],['S2','D',['Q']],
],[
  ['S1','E1','A','B',[['X','Y',['T1']]]],
  ['S2','E2','C','D',[['X','Q',['T2']]]],
]);
const globalCustody=solveCiiA2GlobalShadow(crossSource);
assert.equal(globalCustody.connectedConstraintComponents,1,
  'same TARGET candidate joins independent source member components');
assert.equal(globalCustody.componentStates.NO_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET,1);
assert.match(globalCustody.components[0].reason,/TWO_SOURCE_NODES_CLAIM_IDENTICAL_TARGET|CANDIDATE_DOMAINS/);

const interior=buildSynthetic([
  ['S1','A',['X']],['S1','B',['Y']],
  ['S2','C',['M']],['S2','D',['Q']],
],[
  ['S1','E1','A','B',[['X','Y',['T1','T2'],['X','M','Y']]]],
  ['S2','E2','C','D',[['M','Q',['T3']]]],
]);
const interiorCollision=solveCiiA2GlobalShadow(interior);
assert.equal(interiorCollision.connectedConstraintComponents,1,
  'subdivided TARGET interior reservation connects otherwise independent source members');
assert.equal(interiorCollision.componentStates.NO_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET,1);

const isolated=buildSynthetic([
  ['S1','A',['X']],['S1','B',['Y']],['S2','C',['Q']],
],[
  ['S1','E1','A','B',[['X','Y',['T1']]]],
]);
const dangling=solveCiiA2GlobalShadow(isolated);
assert.equal(dangling.componentStates.INCOMPLETE_PHYSICAL_EVIDENCE,1);
assert.equal(dangling.componentStates.ONE_GLOBAL_ASSIGNMENT_IN_DECLARED_WITNESS_SET,1);

const tamperedHash=structuredClone(chain);
tamperedHash.pathAudit.provenance.originalTargetSha256=h('f');
assert.throws(()=>solveCiiA2GlobalShadow(tamperedHash),/ORIGINAL_INPUT_AND_JOINT_CUSTODY_MISMATCH/);
const fakeClaim=structuredClone(chain);
fakeClaim.joint.hypotheses[0].targetRef.originalSha256=h('f');
assert.throws(()=>solveCiiA2GlobalShadow(fakeClaim),/UNATTESTED_OR_TAMPERED_PHYSICAL_CLAIM/);
const fakePath=structuredClone(chain);
fakePath.pathAudit.edgeRows[0].pathWitnesses[0].targetNodePath=['X','M','Y'];
assert.throws(()=>solveCiiA2GlobalShadow(fakePath),/INVALID_ORDERED_TARGET_PATH_WITNESS/);
const duplicate=structuredClone(chain);
duplicate.pathAudit.edgeRows.push(duplicate.pathAudit.edgeRows[0]);
duplicate.pathAudit.sourceElementCountExamined++;
assert.throws(()=>solveCiiA2GlobalShadow(duplicate),/DUPLICATE_OR_INVALID_SOURCE_ELEMENT/);
const truncated=structuredClone(chain);
truncated.pathAudit.edgeRows[0].truncated=true;
truncated.pathAudit.edgeRows[0].status='SEARCH_INCOMPLETE';
assert.equal(solveCiiA2GlobalShadow(truncated).componentStates.INCOMPLETE_PHYSICAL_EVIDENCE,1);
assert.throws(()=>solveCiiA2GlobalShadow(chain,{policy:{maxSearchStates:0}}),/INVALID_BOUNDED_POLICY/);
assert.equal(JSON.stringify(solveCiiA2GlobalShadow(chain)),JSON.stringify(unique));

const originals={
  'S1.CII':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII':'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII':'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const fixture=Object.fromEntries(Object.entries(originals).map(([name,expected])=>{
  const bytes=readFileSync(new URL('../Benchmark/'+name,import.meta.url));
  assert.equal(digest(bytes),expected);return[name,bytes];
}));
const sources=[1,2,3].map(i=>({sourceId:'S'+i,fileName:'S'+i+'.CII',bytes:fixture['S'+i+'.CII']}));
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  {sources,targetBytes:fixture['T.CII'],targetFileName:'T.CII'},{cryptoRef:webcrypto});
const loops=Object.fromEntries(inspection.memberInspections.map(m=>{
  const c=ciiAutomaticBaseSelection(m.inspection?.baseAnchorSuggestions||[]);
  assert.equal(c.status,'READY');return[m.sourceId,c.baseLoops];
}));
const variants=[
  {mode:'AUTO_ONLY',opts:{baseLoopsBySource:loops}},
  {mode:'UI_MIXED_BASE_PROXY',opts:{
    baseLoopsBySource:{S1:loops.S1},
    anchorPairsBySource:{S2:[{sourceNodeId:'420',targetNodeId:'415'}],
      S3:[{sourceNodeId:'1580',targetNodeId:'7880'}]},
  }},
];
function reviewFor(preview){
  return Object.fromEntries(preview.memberPreviews.map(({sourceId,preview:p})=>[
    sourceId,{...(p.review||{}),
      reviewedCorrespondenceIds:(p.compareReview?.rows||[]).filter(r=>r.identityBound&&['HIGH','MEDIUM'].includes(r.confidence)).map(r=>r.correspondenceId),
      lockedCorrespondenceIds:(p.compareReview?.rows||[]).filter(r=>r.decision==='LOCKED').map(r=>r.correspondenceId),
      rejectedCorrespondenceIds:[]},
  ]));
}
const snapshots=[],cache=createCiiCommonAnalysisCache();
for(const {mode,opts} of variants){
  const a=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,opts,{cryptoRef:webcrypto,commonAnalysisCache:cache});
  const b=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,
    {...opts,reviewBySource:reviewFor(a)},{cryptoRef:webcrypto,commonAnalysisCache:cache});
  snapshots.push({mode,sourceSetSha256:b.sourceSetSha256,
    originalTargetSha256:b.targetAuthority.originalSha256,audit:buildCiiSourceTargetAudit(b)});
}
const graphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const jointReal=buildCiiA2ShadowJointEvidence({
  authority:{sourceSetSha256:snapshots[0].sourceSetSha256,originalTargetSha256:originals['T.CII'],
    originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,digest(s.bytes)]))},
  snapshots,manualClaims:[{sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
    {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'}],
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
});
const pathReal=inspectCiiA2PhysicalConstraints({
  joint:jointReal,sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
assert.equal(pathReal.sourceElementCountExamined,147);
assert.equal(pathReal.summary.LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS,98);
assert.equal(pathReal.summary.ENDPOINT_CANDIDATE_MISSING,49);
const real=solveCiiA2GlobalShadow({joint:jointReal,pathAudit:pathReal});
assert.equal(real.originalPhysicalSourceNodeCount,150);
assert.equal(real.sourceElementFactorCount,147);
assert.equal(real.status,'GLOBAL_SHADOW_NON_WRITING');
assert(real.componentStates.INCOMPLETE_PHYSICAL_EVIDENCE>=1,
  'current Owner manual+automatic replay cannot be treated as globally resolved');
assert.equal(real.certifiedNodeCount,0);
assert.equal(real.certifiedElementCount,0);
assert.equal(real.correspondentCertificates.length,0);
assert.equal(real.writerReady,false);
assert.equal(real.writeScope,null);
assert.equal(real.transferPlan,null);
assert(Object.isFrozen(real));
assert.equal(JSON.stringify(real),JSON.stringify(solveCiiA2GlobalShadow({joint:jointReal,pathAudit:pathReal})));
console.log(JSON.stringify({
  schema:real.schema,sourceSetSha256:real.provenance.originalSourceSetSha256,
  physicalNodeCount:real.originalPhysicalSourceNodeCount,physicalElementFactors:real.sourceElementFactorCount,
  components:real.connectedConstraintComponents,componentStates:real.componentStates,
  componentSummaries:real.components.map(c=>({
    sourceNodeCount:c.sourceNodes.length,sourceElementCount:c.sourceElements.length,
    status:c.status,invalidFactors:c.factorsNotQualified?.length||0,
    searchStates:c.searchStates||0,solutionWitnesses:c.distinctSolutionWitnesses,
  })),
  certifiedNodes:real.certifiedNodeCount,certifiedElements:real.certifiedElementCount,writerReady:real.writerReady,
},null,2));
console.log('PASS A2-03: global arc consistency, injective cross-source target custody, target edge and subdivision interior reservations, distinct ambiguity proofs, bounded search, authentic original input and zero Writer authority');

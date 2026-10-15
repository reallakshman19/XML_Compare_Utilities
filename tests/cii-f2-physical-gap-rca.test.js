import assert from 'node:assert/strict';
import {buildCiiF2PhysicalGapLedger,ciiF2PhysicalGapLedgerToCsv} from '../tabs/cii-workspace/cii-workspace-f2-physical-gap-ledger.js';

// Synthetic original physical NODE / ELEMENT factors; these IDs are NOT an
// Owner PS->SL benchmark and never enter the matcher or runtime Writer.
const sha=x=>x.repeat(64);
const provenance={
 originalSourceSetSha256:sha('a'),originalTargetSha256:sha('b'),
 jointSnapshotDigest:sha('c'),normalizedSourceShaById:{S1:sha('1'),S2:sha('2')},
 normalizedTargetSha256:sha('3'),
};
const n=(sourceId,sourceNodeId,targets)=>({
 sourceId,sourceNodeId,sourceNodeKey:sourceId+':'+sourceNodeId,targets
});
const nodes=[
 n('S1','1',['10']),n('S1','2',[]),n('S1','3',[]),n('S1','4',['20']),
 n('S2','5',['30']),n('S2','6',['31'])
];
const joint={
 schema:'CiiArchitectureA2ShadowJointEvidence.v1',writerDispatchInstalled:false,
 transferPlan:null,writeScope:null,
 provenance:{sourceSetSha256:provenance.originalSourceSetSha256,
  originalTargetSha256:provenance.originalTargetSha256,
  physicalOriginalSnapshotDigest:provenance.jointSnapshotDigest},
 nodeRows:nodes,
};
const w=(a,b,id,extra={})=>({
 targetEndpoints:[a,b],targetElementIds:[id],
 targetNodePath:[a,b],relation:'ELEMENT_1_TO_1',
 propertyWarnings:[],...extra,
});
const edge=(sourceMember,sourceElementId,endpoints,status,pairCount,opts={})=>({
 sourceMember,sourceElementId,sourceEndpoints:endpoints,
 status,candidatePairCount:pairCount,
 pathWitnesses:opts.witnesses||[],invalidCandidatePairs:opts.invalid||[],
 truncated:opts.truncated||false,blockers:opts.blockers||[]
});
const originalRows=[
 edge('S1','E1',['1','2'],'ENDPOINT_CANDIDATE_MISSING',0),
 edge('S1','E2',['3','4'],'ENDPOINT_CANDIDATE_MISSING',0),
 edge('S2','E3',['5','6'],'LOCAL_PATH_AMBIGUOUS',1,{
  witnesses:[w('30','31','TA'),w('30','31','TB')]
 })
];
const newRows=[
 edge('S1','E1',['1','2'],'ENDPOINT_CANDIDATE_MISSING',0),
 edge('S1','E2',['3','4'],'LOCAL_PATH_SUPPORTED_WITH_PROPERTY_WARNINGS',1,{
  witnesses:[w('21','20','T2',{propertyWarnings:['WALL_ENGINEERING_REVISION_OBSERVATION']})]
 }),
 edge('S2','E3',['5','6'],'LOCAL_PATH_AMBIGUOUS',1,{
  witnesses:[w('30','31','TA'),w('30','31','TB')],
  invalid:[{targetEndpoints:['30','31'],route:[],reasons:['NO_SIMPLE_PATH','NO_SIMPLE_PATH']}]
 })
];
const audit=(rows)=>({
 schema:'CiiArchitectureA2PhysicalConstraintAudit.v1',
 status:'SHADOW_PHYSICAL_CONSTRAINTS_ONLY',writerReady:false,
 certifiedNodeCount:0,certifiedElementCount:0,
 provenance,sourceElementCountExamined:rows.length,edgeRows:rows,
 policyDigest:sha('f')
});
const original=audit(originalRows),recomputedPathAudit=audit(newRows);
const augmentedJoint={...joint,nodeRows:nodes.map(row=>row.sourceNodeKey==='S1:3'
 ? {...row,targets:['21']}:row)};
const reconciled={
 schema:'CiiArchitectureA205FrontierReconciliation.v1',writerReady:false,
 certifiedNodeCount:0,certifiedElementCount:0,
 originalEndpointMissingFactors:2,recomputedEndpointMissingFactors:1,
 recomputedPathAudit,augmentedJoint
};
const frontier={
 schema:'CiiArchitectureA204FrontierRecovery.v1',
 status:'PROVISIONAL_FRONTIER_HYPOTHESES_NONWRITING',writerReady:false,
 certifiedNodeCount:0,certifiedElementCount:0,
 provenance:{originalSourceSetSha256:provenance.originalSourceSetSha256,
 originalTargetSha256:provenance.originalTargetSha256},
 rootCauses:[
  {sourceMember:'S1',sourceElementId:'E1',primaryCause:'TO_ENDPOINT_HYPOTHESES_ABSENT',
   currentTargetCandidateCounts:[1,0]},
  {sourceMember:'S1',sourceElementId:'E2',primaryCause:'FROM_ENDPOINT_HYPOTHESES_ABSENT',
   currentTargetCandidateCounts:[0,1]},
 ],originalMissingPhysicalElementFactors:2,
 rootCauseCounts:{TO_ENDPOINT_HYPOTHESES_ABSENT:1,FROM_ENDPOINT_HYPOTHESES_ABSENT:1}
};
const ctx={joint,frontier};
const good=buildCiiF2PhysicalGapLedger(original,reconciled,ctx);
assert.equal(good.totalPhysicalSourceElements,3);
assert.equal(good.originalEndpointMissingFactors,2);
assert.equal(good.currentEndpointMissingFactors,1);
assert.deepEqual(good.currentMissingEndpointDirectionCounts,{BOTH:0,FROM:0,TO:1});
const [a,b,c]=good.rows;
assert.equal(a.sourceElementKey,'S1:E1');
assert.equal(a.originalRootCause,'TO_ENDPOINT_HYPOTHESES_ABSENT');
assert.equal(a.nextInvestigation,'INVESTIGATE_SOURCE_NODE_TARGET_DOMAIN');
assert.deepEqual(a.endpointDiagnosis.map(x=>x.recheckedTargets),[['10'],[]]);
assert.equal(a.endpointDiagnosis[1].missingAfter,true);
assert.equal(b.originalRootCause,'FROM_ENDPOINT_HYPOTHESES_ABSENT');
assert.equal(b.endpointDiagnosis[0].missingInitially,true);
assert.equal(b.endpointDiagnosis[0].missingAfter,false);
assert.deepEqual(b.endpointDiagnosis[0].newUnverifiedTargets,['21']);
assert.equal(b.targetPhysicalPathAlternatives[0].propertyWarnings[0],
 'WALL_ENGINEERING_REVISION_OBSERVATION');
assert.equal(b.recheckedPathWitnesses,1);
assert.equal(b.physicalIdentityCertified,false);
assert.equal(c.recheckedPathWitnesses,2);
assert.equal(c.nextInvestigation,'RECONCILE_ALL_PHYSICAL_TARGET_ROUTE_ALTERNATIVES');
assert.deepEqual(c.targetPathRejectionReasons,[{reason:'NO_SIMPLE_PATH',occurrences:2}]);
assert.deepEqual(c.targetPhysicalPathAlternatives.map(x=>x.targetElementIds),[['TA'],['TB']]);
assert.equal(good.certifiedNodeCount,0);
assert.equal(good.writerReady,false);
assert.equal(good.writeScope,null);
assert.equal(good.transferPlan,null);
assert.equal(JSON.stringify(good),JSON.stringify(buildCiiF2PhysicalGapLedger(original,reconciled,ctx)));
assert(Object.isFrozen(good.rows));
const csv=ciiF2PhysicalGapLedgerToCsv(good);
assert.equal(csv.trim().split('\n').length,good.totalPhysicalSourceElements+1);
assert(csv.includes('TO_ENDPOINT_HYPOTHESES_ABSENT'));
assert(csv.includes('WALL_ENGINEERING_REVISION_OBSERVATION'));
assert(csv.includes('INVESTIGATE_SOURCE_NODE_TARGET_DOMAIN'));
assert(csv.includes('RECONCILE_ALL_PHYSICAL_TARGET_ROUTE_ALTERNATIVES'));
assert(!csv.includes('PS02687.1'),'no Owner expected label in physical evidence');
assert.equal(ciiF2PhysicalGapLedgerToCsv(good),csv);
assert.throws(()=>ciiF2PhysicalGapLedgerToCsv({...good,writerReady:true}),
 /F2_GAP_CSV_REQUIRES_EXACT_NONWRITING_FACTOR_CENSUS/);
const fail=(o,r,c,why)=>assert.throws(
 ()=>buildCiiF2PhysicalGapLedger(o,r,c),why);
fail(original,reconciled,{...ctx,frontier:null},/FRONTIER_CAUSES_REQUIRED/);
fail(original,{...reconciled,writerReady:true},ctx,/RECHECKED_FRONTIER_REQUIRED/);
fail(original,{...reconciled,augmentedJoint:{
 ...augmentedJoint,nodeRows:augmentedJoint.nodeRows.map(x=>x.sourceNodeKey==='S1:1'
  ? {...x,targets:[]}:x)
}},ctx,/ORIGINAL_TARGET_HYPOTHESIS_REMOVED/);
fail(original,{...reconciled,recomputedPathAudit:audit([
 {...newRows[0],candidatePairCount:1},newRows[1],newRows[2]
 ])},ctx,/CANDIDATE_PAIR_PRODUCT_MISMATCH/);
fail(original,{...reconciled,recomputedPathAudit:{
 ...recomputedPathAudit,policyDigest:sha('0')
}},ctx,/SOURCE_POPULATION_CUSTODY_OR_SEARCH_POLICY_CHANGED/);
fail(original,reconciled,{...ctx,frontier:{...frontier,
 rootCauses:frontier.rootCauses.slice(1)}},/ORIGINAL_MISSING_FACTOR_CAUSES_INCOMPLETE/);
fail(original,reconciled,{...ctx,joint:{...joint,
 provenance:{...joint.provenance,originalTargetSha256:sha('0')}
}},/ORIGINAL_SHA_BOUND_JOINT_REQUIRED/);
fail(original,reconciled,{...ctx,frontier:{...frontier,
 rootCauses:[{...frontier.rootCauses[0],primaryCause:'BOTH_ENDPOINT_HYPOTHESES_ABSENT'},frontier.rootCauses[1]]
}},/ROOT_FACTOR_CAUSE_DOMAIN_MISMATCH/);
const incomplete=buildCiiF2PhysicalGapLedger(original,{
 ...reconciled,recomputedPathAudit:audit([
 newRows[0],newRows[1],{...newRows[2],status:'SEARCH_INCOMPLETE',truncated:true,blockers:['PATH_ENUMERATION_INCOMPLETE']}
 ])
},ctx);
assert.equal(incomplete.rows[2].disposition,'BOUND_EXCEEDED_NOT_PROVEN_ABSENT');
assert.equal(incomplete.rows[2].boundedSearchIncomplete,true);
assert.equal(incomplete.rows[2].physicalIdentityCertified,false);
console.log('CII_F2_FACTOR_ENDPOINT_RCA_SYNTHETIC_PASS',JSON.stringify({
 factors:good.totalPhysicalSourceElements,
 originallyMissing:good.originalEndpointMissingFactors,
 currentMissing:good.currentEndpointMissingFactors,
 ambiguous:good.byMember.S2.localPathAmbiguous,
 noWriter:true,noOwnerExpectedLabels:true
}));

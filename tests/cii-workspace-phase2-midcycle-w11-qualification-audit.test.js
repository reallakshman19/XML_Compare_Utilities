import assert from 'node:assert/strict';
import {reviewCiiMidcycleW11ProductionQualification} from './cii-workspace-phase2-midcycle-w11-qualification-audit.js';
const populations=[['S1',57,35],['S2',47,36],['S3',46,34]];
const all=populations.flatMap(([sourceId,population,bound],i)=>
 Array.from({length:population},(_,j)=>({
  sourceId,sourceNodeId:String(j+1),rowKey:sourceId+':'+(j+1),
  identityBound:j<bound,state:j<bound?'BOUND':j%2?'UNRESOLVED':'UNEMITTED',
  targetNodeIds:j<bound?[String(i*1000+j+1)]:[],
  confidence:j<bound?'HIGH':'REVIEW',reasons:j<bound?[]:['NEEDS_INDEPENDENT_PHYSICAL_EVIDENCE'],
 })));
const trusted=all.filter(x=>x.identityBound).map(x=>({
 sourcePhysicalKey:x.rowKey,targetPhysicalNodeId:x.targetNodeIds[0],
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalPhysicalWitnessIds:['TEST_TRUSTED_ROOT'],
}));
const unmatched=all.filter(x=>!x.identityBound);
assert.equal(unmatched.length,45);
const forensics={schema:'CiiMidcycle150UnverifiedRootedOriginalGeometryForensics.v1',
 rows:unmatched.map((x,i)=>({
  sourcePhysicalKey:x.rowKey,sourceMemberId:x.sourceId,sourcePhysicalNodeId:x.sourceNodeId,
  candidateOriginalTargetNodeIds:i<22?[String(9000+i)]:[],
  status:i<22?'ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND':
   'NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY',
 }))};
const members=['S1','S2','S3'].map(sourceId=>({sourceId,
 preview:{correspondence:{status:'UNRESOLVED',nodeRows:[],blockers:['GATE_VETO']}}}));
const kwargs={forensics,audit:{rows:all},rooted:{certificates:trusted},
 memberPreviews:members,compareReview:{rows:[]}};
const unqualified=reviewCiiMidcycleW11ProductionQualification(kwargs);
assert.equal(unqualified.leadCount,22);
assert.equal(unqualified.newIndependentlyCertifiedPhysicalNodeCount,0);
assert.equal(unqualified.dispositionCounts.PRODUCTION_NO_NODE_CORRESPONDENCE_EMITTED,22);
assert(unqualified.rows.every(x=>x.newIndependentPhysicalCredit===0));
const one=forensics.rows[0];
const matchingReview={kind:'NODE',sourceId:one.sourceMemberId,source:one.sourcePhysicalNodeId,
 target:one.candidateOriginalTargetNodeIds[0],identityBound:false,
 authority:'METHOD_A_QUALIFIED_ADJACENT_BOUNDARY',identityEvidenceBasis:'METHOD_A',
 decision:'REVIEW'};
const reviewed=reviewCiiMidcycleW11ProductionQualification({...kwargs,
 compareReview:{rows:[matchingReview]}});
assert.equal(reviewed.dispositionCounts.PRODUCTION_EXACT_TARGET_NOT_IDENTITY_BOUND,1);
assert.equal(reviewed.newIndependentlyCertifiedPhysicalNodeCount,0);
const differing=reviewCiiMidcycleW11ProductionQualification({...kwargs,
 compareReview:{rows:[{...matchingReview,target:'65432'}]}});
assert.equal(differing.dispositionCounts.PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET,1);
const reused=structuredClone(forensics);reused.rows[1].candidateOriginalTargetNodeIds=[one.candidateOriginalTargetNodeIds[0]];
const conflicted=reviewCiiMidcycleW11ProductionQualification({...kwargs,forensics:reused});
assert.equal(conflicted.conflictTargets.length,1);
assert.equal(conflicted.dispositionCounts.PROVISIONAL_TARGET_ALREADY_CLAIMED,2);
assert.throws(()=>reviewCiiMidcycleW11ProductionQualification({
 ...kwargs,audit:{rows:all.slice(0,149)},
}),/ORIGINAL_COMPLETE_CENSUS_AND_PRODUCTION_REVIEW_REQUIRED/);
assert.throws(()=>reviewCiiMidcycleW11ProductionQualification({
 ...kwargs,audit:{rows:[...all.slice(0,149),all[0]]},
}),/DUPLICATE_ORIGINAL_SOURCE_AUDIT/);
assert.throws(()=>reviewCiiMidcycleW11ProductionQualification({...kwargs,
 forensics:{...forensics,rows:forensics.rows.slice(0,44)}
}),/ORIGINAL_COMPLETE_CENSUS_AND_PRODUCTION_REVIEW_REQUIRED/);
console.log('PASS W11 unchanged Method A/B production-qualification gate audit: 22 leads, no geometric promotion, conflict and duplicate veto');

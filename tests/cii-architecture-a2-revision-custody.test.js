import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {originalA214TestInputs} from './cii-architecture-a2-whole-subchain-falsifiers.test.js';
import {reviewCiiA214EngineeringRevisionAndCustody,assertCiiA214NoWrite}
 from '../scripts/cii-architecture-a2-revision-custody-adjudicator.mjs';

const input=originalA214TestInputs;
const original=reviewCiiA214EngineeringRevisionAndCustody(input);
assert.equal(original.schema,'CiiArchitectureA214EngineeringRevisionCustodyLedger.v1');
assert.equal(original.writerReady,false);
assert.equal(original.transferPlan,null);
assert.equal(original.writeScope,null);
assert.equal(original.certifiedNodeCount,0);
assert.equal(original.certifiedElementCount,0);
assert.equal(original.admittedCandidateCount,0);
assert.deepEqual(original.correspondenceCertificates,[]);
assert.equal(original.summary.sourceOriginalNodes,47);
assert.equal(original.summary.sourceOriginalElements,46);
assert.equal(original.summary.zonesReviewed,3);
assert.equal(original.summary.engineeringRevisionDocumentsIndependentlyVerified,0);
assert.equal(original.summary.independentlyCertifiedSubchains,0);
assert.equal(original.summary.unresolvedGlobalTargetCustodyConflicts,2);
assert.deepEqual(original.zones.map(z=>z.zoneName),[
 'S2_END_NODE_DEGREE_AND_PIPE_SPLIT',
 'S2_1500MM_SINGLE_NODE_OUTLIER',
 'S2_FOUR_NODE_200MM_SHIFT']);
const [terminal,outlier,shift]=original.zones;
assert.equal(shift.independentRegistration,false);
assert.equal(shift.twoIndependentBoundariesProven,false);
assert.equal(shift.certifiedNodeCount,0);
assert.equal(shift.meanTargetMinusProvisionalFitMm[1],-200);
assert.deepEqual(shift.candidateTargetNodes,['10470','10480','10490','10500']);
const bend=shift.boundaries.find(x=>x.source.elementId==='E43:620->630');
assert(bend);
assert.equal(bend.source.recordedLengthMm,774.55);
assert.equal(bend.source.componentKind,'BEND');
assert.equal(bend.source.curvatureProof,'NOT_ATTESTED_BY_NORMALIZED_GRAPH');
assert.deepEqual(bend.provisionalTargetPaths.map(x=>[
 x.targetOriginalElementIds,x.targetTotalRecordedLengthMm,x.lengthDifferenceMm,
 x.localLengthCompatibilityOnly,x.identityCertified,
]),[[['E1017:10460->10470'],574.55,200,false,false]]);
const pipe=outlier.boundaries.find(x=>x.source.elementId==='E11:210->220');
assert(pipe);
assert.equal(pipe.source.recordedLengthMm,6500);
assert.deepEqual(pipe.provisionalTargetPaths.map(x=>[
 x.targetOriginalElementIds,x.targetTotalRecordedLengthMm,x.lengthDifferenceMm
]),[[['E983:10130->10140'],8000,1500]]);
assert.equal(pipe.engineeringRevisionRecordAuthenticated,false);
const split=terminal.boundaries.find(x=>x.source.elementId==='E1:40->50');
assert(split);
assert.equal(split.source.recordedLengthMm,8000);
assert(split.provisionalTargetPaths.some(p=>p.targetOriginalElementIds.length===2
 &&p.targetTotalRecordedLengthMm===8000&&p.lengthDifferenceMm===0));
assert(terminal.degreeDisagreements.some(x=>
 x.sourceNodeId==='40'&&x.targetNodeHypothesis==='40030'));
assert.deepEqual(original.custodyConflicts.map(x=>[
 x.targetNodeId,x.competingSourceNodeKeys
]),[
 ['10170',['S2:220','S2:250']],
 ['40060',['S2:50','S2:90']]
]);
assert(original.custodyConflicts.every(x=>
 x.independentCustodyDecisionAvailable===false));
assert(Object.isFrozen(original));
assert(Object.isFrozen(original.zones[2].boundaries));
assert.equal(JSON.stringify(original),
 JSON.stringify(reviewCiiA214EngineeringRevisionAndCustody(input)));
assert.throws(()=>assertCiiA214NoWrite(original),/NEVER_WRITER_AUTHORITY/);

const claim={
 sourceElementId:'E43:620->630',targetElementId:'E1017:10460->10470',
 sourceOriginalSha256:input.discrepancy.provenance.sourceOriginalSha256,
 targetOriginalSha256:input.discrepancy.provenance.originalTargetSha256,
 documentRef:'UNTRUSTED-REV-BEND-200',approvalStatus:'APPROVED',
};
const intake=reviewCiiA214EngineeringRevisionAndCustody({...input,revisionClaims:[claim]});
assert.equal(intake.externalRevisionClaims.length,1);
assert.equal(intake.externalRevisionClaims[0].independentlyReviewed,false);
assert.equal(intake.externalRevisionClaims[0].verifiedIndependentSurvey,false);
assert.equal(intake.externalRevisionClaims[0].disposition,
 'UNTRUSTED_EXTERNAL_DOCUMENT_REFERENCE_NOT_AUTHORITY');
assert.equal(intake.summary.engineeringRevisionDocumentsIndependentlyVerified,0);
assert.equal(intake.certifiedNodeCount,0);
assert.equal(intake.writerReady,false);
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody({
 ...input,revisionClaims:[{...claim,targetOriginalSha256:'0'.repeat(64)}]
}),/INVALID_OR_STALE_REVISION_CLAIM/);
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody({
 ...input,revisionClaims:[{...claim,targetElementId:'E983:10130->10140'}]
}),/CLAIM_PAIR_NOT_REPRODUCED_FROM_PHYSICAL_GRAPH/);
const cloned=(x)=>structuredClone(x);
const swapped=cloned(input);
swapped.subchains.custodyVetoes[0].targetNodeId='10170';
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(swapped),
 /PARENT_ORIGINAL_SHA_OR_LINEAGE_CHANGED/);
const lostClaim=cloned(input);
lostClaim.reconciliation.augmentedJoint.nodeRows=
 lostClaim.reconciliation.augmentedJoint.nodeRows.filter(x=>x.sourceNodeKey!=='S2:50');
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(lostClaim),
 /INCUMBENT_TARGET_CUSTODY_NOT_IN_LEDGER/);
const forgedEdge=cloned(input);
forgedEdge.sourceGraph.edges.find(x=>x.elementId==='E43:620->630').lengthMm=575;
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(forgedEdge),
 /A213_BOUNDARY_SOURCE_EDGE_CHANGED/);
const forgedTargetEdge=cloned(input);
forgedTargetEdge.targetGraph.edges.find(x=>x.elementId==='E1017:10460->10470').lengthMm=774.55;
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(forgedTargetEdge),
 /A213_TARGET_PATH_METRICS_DRIFT/);
const stale=cloned(input);
stale.normalizedTargetSha256='0'.repeat(64);
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(stale),
 /PARENT_ORIGINAL_SHA_OR_LINEAGE_CHANGED/);
const forgedAuthoritative=cloned(input);
forgedAuthoritative.subchains.certifiedNodeCount=1;
assert.throws(()=>reviewCiiA214EngineeringRevisionAndCustody(forgedAuthoritative),
 /UNQUALIFIED_READ_ONLY_PARENTS_REQUIRED/);

const output={
 schema:original.schema,status:original.status,
 provenance:original.provenance,summary:original.summary,
 originalPhysicalDiscrepancyZones:original.zones,
 originalGlobalCustodyVetoes:original.custodyConflicts,
 blockers:original.blockers,certifiedNodeCount:0,certifiedElementCount:0,
 writerReady:false,
};
const out=process.argv.find(s=>s.startsWith('--out='))?.slice(6);
if(out){
 const file=resolve(out);
 if(file.replaceAll('\\','/').includes('/Benchmark/'))throw Error('A214_BENCHMARK_WRITE_FORBIDDEN');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(output,null,2),'utf8');
 assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),output);
}
console.log('A2_14_ORIGINAL_REVISION_CUSTODY',JSON.stringify({
 zones:original.zones.map(z=>({
  zone:z.zoneName,originalBoundaryEdges:z.boundaries.map(b=>({
   source:b.source.elementId,sourceRecordedLengthMm:b.source.recordedLengthMm,
   targetPaths:b.provisionalTargetPaths.map(x=>({
    target:x.targetOriginalElementIds,targetRecordedLengthMm:x.targetTotalRecordedLengthMm,
    differenceMm:x.lengthDifferenceMm,
   })),
  })),
  independentBoundaries:z.twoIndependentBoundariesProven,
 })),
 custody:original.custodyConflicts.map(x=>({
  target:x.targetNodeId,competingSources:x.competingSourceNodeKeys,
 })),
 blockers:original.blockers,certifiedNodeCount:0,writerReady:false,
}));
console.log('PASS A2-14: original S2 BEND and PIPE revision differences, target custody, forgery negatives and no Writer authority');

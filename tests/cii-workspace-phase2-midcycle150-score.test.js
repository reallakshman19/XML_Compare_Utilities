import assert from 'node:assert/strict';
import {scoreCiiMidcycle150} from './cii-workspace-phase2-midcycle150-score.js';
const rows=[['S1',57],['S2',47],['S3',46]].flatMap(([sourceId,count])=>Array.from({length:count},(_,i)=>({
 sourceId,sourceNodeId:String(i+1),targetNodeIds:i<35?[String(i+1+(['S1','S2','S3'].indexOf(sourceId))*1000)]:[],
 state:i<35?'BOUND':'UNEMITTED',identityBound:i<35,
})));
const base={originalSourcePhysicalNodeCount:150,
 originalSourceSetSha256:'source-original-SHA',originalTargetSha256:'target-original-SHA',
 audit:{rows}};
const zero=scoreCiiMidcycle150(base);
assert.equal(zero.denominator,150);
assert.equal(zero.requiredValidatedPhysicalPairs,105);
assert.equal(zero.autoBoundCandidateCount,105);
assert.equal(zero.autoBoundCandidateCoverageRatio,.7);
assert.equal(zero.independentCertificateCount,0);
assert.equal(zero.MIDCYCLE_150_VALIDATED_RECALL,0);
assert.equal(zero.thresholdMet,false);
assert.equal(zero.unverifiedAutoBoundCandidates,105);
assert.deepEqual(zero.perMember.map(r=>r.totalOriginalSourcePhysicalNodes),[57,47,46]);
const originalLocalPathWitnesses={rows:rows.map(r=>({
  sourcePhysicalKey:r.sourceId+':'+r.sourceNodeId,
  targetNodeId:r.targetNodeIds[0]??null,
  state:r.identityBound?'LOCAL_ORIGINAL_PATH_EVIDENCE_ONLY':'NOT_BOUND',
  independentLocalRouteWitnessCount:r.identityBound?1:0,
  independentLocalRouteWitnesses:r.identityBound?[{
    withinLengthTolerance:true,targetPathStatus:'UNIQUE_MIN_HOP_ROUTE',sourceLengthMm:1000,
    targetPathLengthMm:1000,targetElementIndices:[1],
  }]:[],
}))};
const locallySupported=scoreCiiMidcycle150({...base,originalLocalPathWitnesses});
assert.equal(locallySupported.originalLocalRouteWitnessNodeCount,105);
assert.equal(locallySupported.originalLocalRouteWitnessCoverageRatio,0.7);
assert.equal(locallySupported.originalLocalRoute70PercentReached,true);
assert.equal(locallySupported.thresholdMet,false);
assert.equal(locallySupported.independentCertificateCount,0);
assert.equal(locallySupported.originalLocalRouteWitnessIsGlobalPhysicalCertification,false);
const forgedWitness={rows:originalLocalPathWitnesses.rows.map((x,i)=>i===0?
 {...x,targetNodeId:'99999'}:x)};
assert.throws(()=>scoreCiiMidcycle150({...base,originalLocalPathWitnesses:forgedWitness}),
 /LOCAL_ORIGINAL_GRAPH_PATH_EVIDENCE_INVALID/);
const certificates=rows.filter(r=>r.identityBound).map(r=>({
 sourcePhysicalKey:r.sourceId+':'+r.sourceNodeId,
 targetPhysicalNodeId:r.targetNodeIds[0],
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalSourceSetSha256:base.originalSourceSetSha256,
 originalTargetSha256:base.originalTargetSha256,
 originalPhysicalWitnessIds:['independently-original-graph-record'],
}));
const pass=scoreCiiMidcycle150({...base,independentCertificates:certificates});
assert.equal(pass.MIDCYCLE_150_VALIDATED_RECALL,.7);
assert.equal(pass.thresholdMet,true);
assert.equal(pass.unverifiedAutoBoundCandidates,0);
assert.equal(pass.status,'PASS_150_MILESTONE_CERTIFIED');
const partial=scoreCiiMidcycle150({...base,independentCertificates:certificates.slice(0,104)});
assert.equal(partial.thresholdMet,false);
assert.equal(partial.independentCertificateCount,104);
assert.throws(()=>scoreCiiMidcycle150({...base,independentCertificates:[
 {...certificates[0],originalPhysicalWitnessIds:[]},
]}),/CERTIFICATE_INSUFFICIENT_ORIGINAL_GRAPH_CUSTODY/);
assert.throws(()=>scoreCiiMidcycle150({...base,independentCertificates:[
 certificates[0],certificates[0],
]}),/CERTIFICATE_SOURCE_DUPLICATE_OR_NOT_IN_CENSUS/);
assert.throws(()=>scoreCiiMidcycle150({...base,independentCertificates:[
 {...certificates[0],targetPhysicalNodeId:'59999'},
]}),/CERTIFICATE_NOT_SAME_PHYSICAL_TARGET/);
assert.throws(()=>scoreCiiMidcycle150({...base,audit:{rows:[...rows.slice(0,149),rows[0]]}}),/SOURCE_MEMBER_CUSTODY_OR_DUPLICATE_VETO/);
const conflict=rows.map((r,i)=>i===1?{...r,targetNodeIds:rows[0].targetNodeIds}:r);
const conflicted=scoreCiiMidcycle150({...base,audit:{rows:conflict}});
assert.equal(conflicted.autoBoundTargetConflicts.length,1);
assert.throws(()=>scoreCiiMidcycle150({...base,audit:{rows:conflict},independentCertificates:[certificates[0]]}),/CERTIFICATE_GLOBAL_TARGET_CONFLICT/);
console.log('PASS Midcycle 150 score: 105/150 threshold, 105 BOUND unverified, full physical certificate and global target conflict veto');

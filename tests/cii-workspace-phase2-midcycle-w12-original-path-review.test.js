import assert from 'node:assert/strict';
import {investigateCiiMidcycleW12OriginalPaths}
 from './cii-workspace-phase2-midcycle-w12-original-path-review.js';
const fmt=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
function file(count,segmentLength=1000) {
 const lines=['#$ ELEMENTS'];
 for(let i=1;i<count;i++){
  const fields=[i,i+1,0,0,segmentLength,273];
  for(let line=0;line<15;line++)
   lines.push('  '+(line===0?fields:line===1?[25.4,0,0,0,0,0]:[0,0,0,0,0,0]).map(fmt).join(''));
 }
 lines.push('#$ NODENAME');return Buffer.from(lines.join('\n')+'\n');
}
const counts=[57,47,46],first=[1,58,105];
const originalSources=counts.map((count,i)=>({sourceId:'S'+(i+1),bytes:file(count)}));
const originalTarget=file(150);
const auditRows=counts.flatMap((count,i)=>Array.from({length:count},(_,j)=>{
 const trusted=j<([35,36,34][i]);
 return {sourceId:'S'+(i+1),sourceNodeId:String(j+1),
 identityBound:trusted,state:trusted?'BOUND':'UNEMITTED',
 targetNodeIds:trusted?[String(first[i]+j)]:[]};
}));
const certificates=auditRows.filter(x=>x.identityBound).map(x=>({
 sourcePhysicalKey:x.sourceId+':'+x.sourceNodeId,targetPhysicalNodeId:x.targetNodeIds[0],
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalPhysicalWitnessIds:['SYNTHETIC_PHYSICAL_ORIGINAL_GRAPH_ROOT']}));
const uncovered=auditRows.filter(x=>!x.identityBound);
assert.equal(uncovered.length,45);
const forensicsRows=uncovered.map((row,i)=>({
 sourcePhysicalKey:row.sourceId+':'+row.sourceNodeId,
 sourceMemberId:row.sourceId,sourcePhysicalNodeId:row.sourceNodeId,
 originalSourceNodeName:'',
 originalSourceDegree:1,
 originalCandidateRootCause:i<23?'ROOT_PATH_OR_GEOMETRY_VETO:NO_CANDIDATE_AFTER_ORIGINALLENGTHWITHIN100MM':
 'AT_LEAST_ONE_ORIGINAL_T_CANDIDATE_FOUND',
 status:i<23?'NO_ORIGINAL_T_CANDIDATE_MATCHING_TRUSTED_GEOMETRY':
 'ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND',
 trustedOriginalRootEvidence:[{
  trustedPhysicalRoot:row.sourceId+':1',
  originalTargetPhysicalRoot:String(first[Number(row.sourceId[1])-1]),
  originalSourceHops:Number(row.sourceNodeId)-1,
  originalTargetAlternativeCount:0,
 }],
}));
const eight=forensicsRows.slice(23,31).map((r,i)=>({
 sourcePhysicalKey:r.sourcePhysicalKey,sourceMemberId:r.sourceMemberId,
 sourceNodeId:r.sourcePhysicalNodeId,
 provisionalOriginalTargetPhysicalNodeId:String(140+i),
 productionCorrespondenceRows:1,
 productionReviewedTargetPhysicalNodeIds:[String(120+i)],
 w11Disposition:'PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET',
 matcherBlockers:['IDENTITY_NOT_BOUND']}));
const opts={originalSources,originalTarget,audit:{rows:auditRows},
 rooted:{certificates},forensics:{rows:forensicsRows},
 w11Qualification:{rows:eight}};
const report=investigateCiiMidcycleW12OriginalPaths(opts);
assert.equal(report.counts.countNoCandidate,23);
assert.equal(report.counts.differentTReviewCases,8);
assert.equal(report.counts.addedCertifiedPhysicalMatches,0);
assert.equal(report.certifiedMidcycle150Baseline,105);
assert.equal(report.pathTotalLengthToleranceMm,100);
assert(report.noCandidateOriginalPathReviews.every(r=>r.independentPhysicalCredit===0));
assert(report.eightCompetingOriginalTargetReviews.every(r=>r.newPhysicalCredit===0));
assert(report.eightCompetingOriginalTargetReviews.every(r=>
 r.originalRootComparisons.some(x=>x.comparedTargetClaims.some(y=>!y.isW10Hypothesis))));
assert.throws(()=>investigateCiiMidcycleW12OriginalPaths({...opts,pathTotalLengthToleranceMm:200}),
 /IMMUTABLE_100MM_POLICY_REQUIRED/);
assert.throws(()=>investigateCiiMidcycleW12OriginalPaths({...opts,
 originalSources:originalSources.slice(1)}),/CUMULATIVE_SOURCE_AND_IMMUTABLE_100MM_POLICY_REQUIRED/);
assert.throws(()=>investigateCiiMidcycleW12OriginalPaths({...opts,
 rooted:{certificates:[certificates[0],...certificates.slice(0,104)]}}),
 /ROOT_TARGET_REUSE_OR_UNQUALIFIED|EXPECTED_105_ROOTS_REQUIRED/);
const changedTarget=investigateCiiMidcycleW12OriginalPaths({...opts,
 originalTarget:file(150,1400)});
assert(changedTarget.noCandidateOriginalPathReviews.some(r=>
 r.perRootOriginalPathEvidence.some(root=>root.closestODBranchCompatibleAlternatives.some(v=>
 v.lengthDeltaMm>100))));
assert.equal(changedTarget.counts.addedCertifiedPhysicalMatches,0);
console.log('PASS W12 read-only original CII path/revision residual review and competing production TARGETs; no 105-score inflation');

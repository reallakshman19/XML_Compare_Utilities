/**
 * F2 source-first non-writing joint graph test, with no test oracle used
 * to select any production correspondence, from exact original SHA files.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import {buildCiiF2JointConstrainedReview} from '../tabs/cii-workspace/cii-workspace-f2-joint-constrained-review.js';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge}
 from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection}
 from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession,createCiiCommonAnalysisCache}
 from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const original=name=>readFileSync(fileURLToPath(new URL('../Benchmark/'+name+'.CII',import.meta.url)));
const expected={
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const sources=['S1','S2','S3'].map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:original(sourceId)}));
const targetBytes=original('T');
for(const source of sources)assert.equal(sha(source.bytes),expected[source.sourceId],source.sourceId);
assert.equal(sha(targetBytes),expected.T);
const cryptoRef=globalThis.crypto||webcrypto;
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge({
 sources,targetBytes,targetFileName:'T.CII',
},{cryptoRef});
const allAuto={};
for(const m of inspection.memberInspections){
 const selected=ciiAutomaticBaseSelection(m.inspection.baseAnchorSuggestions||[]);
 assert.equal(selected.status,'READY',m.sourceId);
 allAuto[m.sourceId]=selected.baseLoops;
}
const cache=createCiiCommonAnalysisCache();
const replay=async x=>createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,x,{cryptoRef,commonAnalysisCache:cache});
const automatic=await replay({baseLoopsBySource:allAuto});
const mixed=await replay({
 baseLoopsBySource:{S1:allAuto.S1},
 anchorPairsBySource:{
  S2:[{sourceNodeId:'420',targetNodeId:'415'}],
  S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
 },
});
const manualClaims=[
 {sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
 {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'},
];
const input={automaticPreview:automatic,activePreview:mixed,manualClaims};
const report=buildCiiF2JointConstrainedReview(input);
assert.equal(report.schema,'CiiF2JointConstrainedReview.v1');
assert.equal(report.status,'REVIEW_ONLY_NOT_CERTIFIED');
assert.equal(report.summary.originalSourceNodeCount,150);
assert.equal(report.rows.length,150);
assert.equal(new Set(report.rows.map(r=>r.sourceNodeKey)).size,150);
assert.equal(report.originalCustody.sourceSetSha256,inspection.sourceSet.sourceSetSha256);
assert.equal(report.originalCustody.targetOriginalSha256,expected.T);
assert.equal(report.summary.automaticBoundCount,105);
assert.equal(report.summary.activeBoundCount,38);
assert(report.summary.jointCandidateNodes>=105,'must retain AUTO evidence even if MANUAL active');
assert(report.summary.differingTargetCandidates>=2,'must preserve opposing manual/auto claims');
assert.equal(report.summary.certifiedNodeCount,0);
assert.equal(report.summary.writerOperationCount,0);
assert.equal(report.globalAssignmentReview.schema,'CiiF2GlobalCandidateAssignment.v1');
assert.equal(report.globalAssignmentReview.independentlyCertified,false);
assert.equal(report.globalAssignmentReview.writerReady,false);
assert.equal(report.globalAssignmentReview.originalTargetCoverageComplete,false);
assert(report.globalAssignmentReview.sampledSolutionCount<=2);
assert.equal(report.summary.globalAssignmentStatus,report.globalAssignmentReview.status);
assert.equal(report.canBindWriter,false);
assert.equal(report.transferPlan,null);
assert.equal(report.writeScope,null);
assert.equal(report.writerReadiness,null);
const s2=report.rows.find(x=>x.sourceNodeKey==='S2:420');
const s3=report.rows.find(x=>x.sourceNodeKey==='S3:1580');
for(const [row,claimed,other] of [[s2,'415','10330'],[s3,'7880','8895']]){
 assert(row);
 assert.equal(row.state,'CONFLICT');
 assert(row.candidates.some(x=>x.targetNodeId===claimed&&x.origins.includes('MANUAL_ASSERTION')));
 assert(row.candidates.some(x=>x.targetNodeId===other&&x.origins.includes('AUTO_REPLAY')));
 assert(row.candidates.every(x=>x.status!=='CERTIFIED'&&x.status!=='WRITER_READY'));
}
assert(report.summary.factors.examined>=147,'every original ELEMENT incidence must be examined');
assert.equal(report.summary.factors.examined,
 report.summary.factors.complete+report.summary.factors.incomplete);
const noManual=buildCiiF2JointConstrainedReview({
 automaticPreview:automatic,activePreview:automatic,manualClaims:[],
});
assert.equal(noManual.summary.originalSourceNodeCount,150);
assert.equal(noManual.summary.certifiedNodeCount,0);
assert.equal(noManual.summary.writerOperationCount,0);
assert.equal(noManual.summary.activeBoundCount,105);
assert.throws(()=>buildCiiF2JointConstrainedReview({...input,manualClaims:[
 {sourceId:'S2',sourceNodeId:'99999999',targetNodeId:'415'}]}),/F2_JOINT_CLAIM_OUTSIDE_ORIGINAL_PHYSICAL_GRAPH/);
assert.throws(()=>buildCiiF2JointConstrainedReview({...input,policy:{maxVisitsPerFactor:0}}),/F2_JOINT_INVALID_BOUNDED_POLICY/);
assert.throws(()=>buildCiiF2JointConstrainedReview({...input,policy:{pathLengthToleranceMm:200}}),/F2_JOINT_LENGTH_POLICY_INVALID/);
const limited=buildCiiF2JointConstrainedReview({...input,policy:{maxVisitsPerFactor:1}});
assert(limited.summary.factors.incomplete>0,'bounded search must report incomplete explicitly');
const assignedLimited=buildCiiF2JointConstrainedReview({...input,policy:{maxAssignmentSearchStates:1}});
assert.equal(assignedLimited.globalAssignmentReview.status,'SEARCH_INCOMPLETE');
assert.equal(assignedLimited.globalAssignmentReview.independentlyCertified,false);
assert.equal(limited.summary.certifiedNodeCount,0);
console.log('CII_F2_JOINT_ORIGINAL_RESULT',JSON.stringify({
 sourceSetSha256:report.originalCustody.sourceSetSha256,
 originalSourceNodeCount:report.summary.originalSourceNodeCount,
 automaticBound:report.summary.automaticBoundCount,
 manualActiveBound:report.summary.activeBoundCount,
 jointCandidateNodes:report.summary.jointCandidateNodes,
 disagreeingSourceNodes:report.summary.differingTargetCandidates,
 targetCustodyReviewCount:report.summary.targetCustodyReviewCount,
 factors:report.summary.factors,
 globalAssignment:{status:report.globalAssignmentReview.status,searchStates:report.globalAssignmentReview.searchStates,sampledSolutions:report.globalAssignmentReview.sampledSolutionCount},
 witnessS2:s2.candidates.map(x=>({target:x.targetNodeId,origins:x.origins,status:x.status})),
 witnessS3:s3.candidates.map(x=>({target:x.targetNodeId,origins:x.origins,status:x.status})),
 noWriter:true,
}));

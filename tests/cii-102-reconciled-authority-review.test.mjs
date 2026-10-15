import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge}
  from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection}
  from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiCommonAnalysisCache,createCiiWriter2SourceSetPreviewFromPreparedSession}
  from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit}
  from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import {buildCiiReconciledAuthorityReview,ciiReconciledAuthorityReviewMarkup}
  from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';

const expected={
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060'
};
const bytes=key=>readFileSync(fileURLToPath(new URL('../Benchmark/'+key+'.CII',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=['S1','S2','S3'].map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:bytes(sourceId)}));
const targetBytes=bytes('T');
for(const row of sources)assert.equal(sha(row.bytes),expected[row.sourceId]);
assert.equal(sha(targetBytes),expected.T);
const cryptoRef=globalThis.crypto||webcrypto;
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes,targetFileName:'T.CII'},{cryptoRef});
const bases={};
for(const member of inspection.memberInspections){
 const selected=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
 assert.equal(selected.status,'READY','original qualified AUTO source '+member.sourceId);
 bases[member.sourceId]=selected.baseLoops;
}
const manual=new Map([
 ['S2',[{sourceNodeId:'420',targetNodeId:'415'}]],
 ['S3',[{sourceNodeId:'1580',targetNodeId:'7880'}]]
]);
const manualInput={
 baseLoopsBySource:{S1:bases.S1},
 anchorPairsBySource:Object.fromEntries(manual)
};
const cache=createCiiCommonAnalysisCache();
const auto=await createCiiWriter2SourceSetPreviewFromPreparedSession(
 preparedSession,{baseLoopsBySource:bases},{cryptoRef,commonAnalysisCache:cache});
const active=await createCiiWriter2SourceSetPreviewFromPreparedSession(
 preparedSession,manualInput,{cryptoRef,commonAnalysisCache:cache});
const beforeAudit=buildCiiSourceTargetAudit(active);
const beforeCorrespondence=active.correspondence.correspondenceIdentity;
const beforePlan=JSON.stringify(active.transferPlan);
const beforeReview=JSON.stringify(active.compareReview);
const outcome=buildCiiReconciledAuthorityReview(active,auto,manual);
assert.equal(outcome.schema,'CiiReconciledAuthorityReview.v1');
assert.equal(outcome.sourceSetSha256,preparedSession.sourceSetSha256);
assert.equal(outcome.targetOriginalSha256,expected.T);
assert.equal(outcome.originalPhysicalSourceNodes,150);
assert.equal(outcome.activeBound,38);
assert.equal(outcome.autoBound,105);
assert.equal(outcome.activeUnemitted,99);
assert.equal(outcome.autoUnemitted,34);
assert(outcome.reviewOnlyAlternativeCount>0);
assert(outcome.bySource.some(x=>x.sourceId==='S2'&&x.newlyVisibleAutoAlternatives>0));
assert(outcome.bySource.some(x=>x.sourceId==='S3'&&x.newlyVisibleAutoAlternatives>0));
const s2=outcome.rows.find(x=>x.rowKey==='S2:420');
const s3=outcome.rows.find(x=>x.rowKey==='S3:1580');
assert.equal(s2?.status,'MANUAL_AUTO_CONFLICT');
assert.equal(s2.automaticTargetNodeId,'10330');
assert.deepEqual(s2.manuallyAssertedTargetNodeIds,['415']);
assert.equal(s3?.status,'MANUAL_AUTO_CONFLICT');
assert.equal(s3.automaticTargetNodeId,'8895');
assert.deepEqual(s3.manuallyAssertedTargetNodeIds,['7880']);
assert(outcome.rows.every(x=>x.physicallyCertified===false
  &&x.writerEligible===false&&x.canAccept===false));
assert.equal(outcome.writerReady,false);
assert.equal(outcome.writerDispatchInstalled,false);
assert.equal(outcome.newIndependentPhysicalCertificates,0);
assert.equal(outcome.newTransferOperations,0);
assert.equal(active.correspondence.correspondenceIdentity,beforeCorrespondence);
assert.equal(JSON.stringify(active.transferPlan),beforePlan);
assert.equal(JSON.stringify(active.compareReview),beforeReview);
assert.deepEqual(buildCiiSourceTargetAudit(active),beforeAudit);
const markup=ciiReconciledAuthorityReviewMarkup(outcome);
assert(markup.includes('data-ciiw-ms-reconciled-review="1"'));
assert(markup.includes('MANUAL_AUTO_CONFLICT'));
assert(markup.includes('10330'));
assert(markup.includes('8895'));
assert(!markup.includes('data-ciiw-ms-decision='));
assert(!markup.includes('data-ciiw-ms-bind-expected='));
assert.throws(()=>buildCiiReconciledAuthorityReview(active,
 {...auto,sourceSetSha256:'wrong-source'},manual),/CUSTODY_MISMATCH/);
assert.throws(()=>buildCiiReconciledAuthorityReview(active,
 {...auto,targetAuthority:{...auto.targetAuthority,originalSha256:'wrong-target'}},manual),/CUSTODY_MISMATCH/);
assert.throws(()=>buildCiiReconciledAuthorityReview(active,auto,
 new Map([['S2',[{sourceNodeId:'999999',targetNodeId:'415'}]]])),/SOURCE_NOT_IN_ORIGINAL_CENSUS/);
assert.throws(()=>ciiReconciledAuthorityReviewMarkup({...outcome,writerReady:true}),
 /NOT_NONWRITING/);
const metrics={
 originalSha:expected,
 sourceNodes:outcome.originalPhysicalSourceNodes,
 activeBound:outcome.activeBound,autoBound:outcome.autoBound,
 activeUnemitted:outcome.activeUnemitted,autoUnemitted:outcome.autoUnemitted,
 reviewOnlyAlternatives:outcome.reviewOnlyAlternativeCount,
 conflicts:outcome.conflictCount,
 bySource:outcome.bySource,
 contestedPairs:[s2,s3].map(x=>({source:x.rowKey,manual:x.manuallyAssertedTargetNodeIds,
  auto:x.automaticTargetNodeId,status:x.status})),
 operationalReviewUnchanged:true,operationalTransferUnchanged:true,
 newlyIndependentlyCertifiedPairs:0,
 ownerPhase2ValidatedRecall:'NOT_EVALUABLE'
};
console.log('CII102_EXISTING_COMPARE_RECONCILED_REAL_ORIGINAL_PASS',JSON.stringify(metrics));

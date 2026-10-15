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
import {computeCiiF2CanonicalShadow}
  from '../tabs/cii-workspace/cii-workspace-f2-canonical-shadow.js';
import {buildCiiF2OriginalChainReview,ciiF2OriginalChainReviewMarkup}
  from '../tabs/cii-workspace/cii-workspace-f2-original-chain-review.js';
const SHAS=Object.freeze({
  S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const read=name=>readFileSync(fileURLToPath(new URL('../Benchmark/'+name+'.CII',import.meta.url)));
const sources=['S1','S2','S3'].map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:read(sourceId)}));
const targetBytes=read('T');
for(const s of sources)assert.equal(createHash('sha256').update(s.bytes).digest('hex'),SHAS[s.sourceId]);
assert.equal(createHash('sha256').update(targetBytes).digest('hex'),SHAS.T);
const cryptoRef=globalThis.crypto||webcrypto;
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  {sources,targetBytes,targetFileName:'T.CII'},{cryptoRef});
const bases={};
for(const member of inspection.memberInspections){
  const selected=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
  assert.equal(selected.status,'READY');
  bases[member.sourceId]=selected.baseLoops;
}
const cache=createCiiCommonAnalysisCache();
const auto=await createCiiWriter2SourceSetPreviewFromPreparedSession(
  preparedSession,{baseLoopsBySource:bases},{cryptoRef,commonAnalysisCache:cache});
const active=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
  baseLoopsBySource:{S1:bases.S1},
  anchorPairsBySource:{
    S2:[{sourceNodeId:'420',targetNodeId:'415'}],
    S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
  },
},{cryptoRef,commonAnalysisCache:cache});
const frozenActivePlan=JSON.stringify(active.transferPlan);
const frozenCompare=JSON.stringify(active.compareReview);
const graphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const f2=computeCiiF2CanonicalShadow({
  authority:{
    sourceSetSha256:preparedSession.sourceSetSha256,
    originalTargetSha256:SHAS.T,
    originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,SHAS[s.sourceId]])),
  },
  snapshots:[
    {mode:'AUTO_ONLY',sourceSetSha256:auto.sourceSetSha256,
      originalTargetSha256:auto.targetAuthority.originalSha256,audit:buildCiiSourceTargetAudit(auto)},
    {mode:'UI_ACTIVE',sourceSetSha256:active.sourceSetSha256,
      originalTargetSha256:active.targetAuthority.originalSha256,audit:buildCiiSourceTargetAudit(active)},
  ],
  manualClaims:[
    {sourceId:'S2',sourceNodeId:'420',targetNodeId:'415'},
    {sourceId:'S3',sourceNodeId:'1580',targetNodeId:'7880'},
  ],
  sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
  normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[
    m.sourceId,m.normalizedSha256])),
  normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
assert.equal(f2.summary.originalPhysicalSourceNodes,150);
assert.equal(f2.physicalGapLedger.totalPhysicalSourceElements,147);
const review=buildCiiF2OriginalChainReview(f2);
assert.equal(review.schema,'CiiF2OriginalChainReview.v1');
assert.equal(review.status,'READ_ONLY_ORIGINAL_PATH_CONTINUITY_NOT_CERTIFICATION');
assert.equal(review.originalElementFactors,147);
assert.equal(review.originalPhysicalSourceNodes,150);
assert.equal(review.originalTargetSha256,SHAS.T);
assert.equal(review.originalSourceSetSha256,preparedSession.sourceSetSha256);
assert.equal(review.byMember.length,3);
assert.equal(review.byMember.reduce((sum,m)=>sum+m.originalElementFactors,0),147);
assert.equal(review.factorsWithWitnesses+review.factorsWithoutWitnesses,147);
assert(review.factorWitnesses>0,'expected true original A2 local path witnesses');
assert(review.groups.length>0,'expected joined read-only path groups');
assert(review.groups.every(g=>g.identityIndependentlyCertified===false
  &&g.reviewedCorrespondence===false&&g.writerEligible===false));
assert.equal(review.candidateGenerationPerformed,false);
assert.equal(review.searchCompletenessAsserted,false);
assert.equal(review.globalUniquenessAsserted,false);
assert.equal(review.certifiedNodeCount,0);
assert.equal(review.approvedIdentityCount,0);
assert.equal(review.writerReady,false);
assert.equal(review.transferPlan,null);
assert.equal(review.writeScope,null);
assert.equal(JSON.stringify(active.transferPlan),frozenActivePlan);
assert.equal(JSON.stringify(active.compareReview),frozenCompare);
const markup=ciiF2OriginalChainReviewMarkup(review);
assert(markup.includes('data-ciiw-f2-original-chain-review="1"'));
assert(markup.includes('data-ciiw-f2-chain-group="1"'));
assert(markup.includes('0 physically certified identities'));
assert(!markup.includes('data-ciiw-ms-decision='));
assert(!markup.includes('data-ciiw-ms-bind-expected='));
const exemplar=f2.physicalGapLedger.rows.find(row=>
  row.originalTargetPhysicalPathWitnesses?.length>0);
assert(exemplar,'at least one original factor with pre-frontier witness');
assert.equal(exemplar.originalTargetPhysicalPathWitnesses.length,exemplar.originalPathWitnesses);
const corrupted=f2.physicalGapLedger.rows.map(row=>row===exemplar?{
  ...row,
  originalTargetPhysicalPathWitnesses:[{
    ...row.originalTargetPhysicalPathWitnesses[0],
    targetNodePath:['NON_PHYSICAL'] // invalid endpoint or shape
  },...row.originalTargetPhysicalPathWitnesses.slice(1)],
}:row);
assert.throws(()=>buildCiiF2OriginalChainReview({
  ...f2,physicalGapLedger:{...f2.physicalGapLedger,rows:corrupted}
}),/ORIGINAL_CHAIN_INVALID_SOURCE_BOUND_WITNESS/);
assert.throws(()=>buildCiiF2OriginalChainReview({
  ...f2,physicalGapLedger:{...f2.physicalGapLedger,originalTargetSha256:'0'.repeat(64)}
}),/ORIGINAL_CHAIN_NONWRITING_CUSTODY_REQUIRED/);
assert.throws(()=>buildCiiF2OriginalChainReview({...f2,writerReady:true}),
  /ORIGINAL_CHAIN_NONWRITING_CUSTODY_REQUIRED/);
console.log('CII102_ORIGINAL_F2_CHAIN_REVIEW_PASS',JSON.stringify({
  sourceNodes:review.originalPhysicalSourceNodes,
  originalElementFactors:review.originalElementFactors,
  factorsWithOriginalWitnesses:review.factorsWithWitnesses,
  factorsWithoutOriginalWitnesses:review.factorsWithoutWitnesses,
  originalWitnesses:review.factorWitnesses,joinedEvidenceGroups:review.groups.length,
  byMember:review.byMember,
  newCertifiedCorrespondences:review.certifiedNodeCount,
  additionalTransferOperations:0,writerReady:false,
  ownerPhase2Recall:'NOT_EVALUABLE_ORIGINAL_GOLDEN_MISSING',
}));

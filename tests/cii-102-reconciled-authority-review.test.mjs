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
import {buildCiiReconciledAuthorityReview,qualifyCiiReconciledAuthorityPhysicalEvidence,ciiReconciledAuthorityReviewMarkup}
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
// Reuse the SAME canonical browser Worker implementation rather than an
// independent geometry resolver or expected-label lookup. The frozen 11
// Owner Phase-1 assertions below are independent observational holdouts.
const {computeCiiF2CanonicalShadow}=
  await import('../tabs/cii-workspace/cii-workspace-f2-canonical-shadow.js');
const graphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const f2=computeCiiF2CanonicalShadow({
 authority:{
  sourceSetSha256:preparedSession.sourceSetSha256,
  originalTargetSha256:expected.T,
  originalSourceShaById:Object.fromEntries(sources.map(x=>[x.sourceId,expected[x.sourceId]]))
 },
 snapshots:[
  {mode:'AUTO_ONLY',sourceSetSha256:auto.sourceSetSha256,
    originalTargetSha256:auto.targetAuthority.originalSha256,
    audit:buildCiiSourceTargetAudit(auto)},
  {mode:'UI_ACTIVE',sourceSetSha256:active.sourceSetSha256,
    originalTargetSha256:active.targetAuthority.originalSha256,
    audit:buildCiiSourceTargetAudit(active)}
 ],
 manualClaims:[...manual].flatMap(([sourceId,pairs])=>
  pairs.map(x=>({sourceId,sourceNodeId:x.sourceNodeId,targetNodeId:x.targetNodeId}))),
 sourceGraphsById:graphs,targetGraph:preparedSession.target.targetGraph,
 normalizedSourceShaById:Object.fromEntries(preparedSession.members.map(m=>[
   m.sourceId,m.normalizedSha256])),
 normalizedTargetSha256:preparedSession.target.normalizedSha256,
});
const physical=qualifyCiiReconciledAuthorityPhysicalEvidence(outcome,f2);
assert.equal(physical.rows.length,70);
assert.equal(physical.originalPhysicalFactorCount,147);
assert.equal(physical.writerReady,false);
assert.equal(physical.newIndependentPhysicalCertificates,0);
assert.equal(physical.newTransferOperations,0);
assert.equal(Object.values(physical.physicalStatusCounts).reduce((x,y)=>x+y,0),70);
assert.equal(physical.physicalStatusCounts.MANUAL_CONFLICT_REQUIRES_REVIEW,2);
assert.equal(physical.physicalStatusCounts.TARGET_CUSTODY_CONFLICT_REQUIRES_REVIEW,0);
assert.equal(physical.physicalStatusCounts.BOUNDED_PHYSICAL_SEARCH_INCOMPLETE,0);
// False-positive veto: every credited physical witness must predate speculative
// recovery at BOTH SOURCE endpoints (as recorded by canonical F2).
const originalFactorById=new Map(f2.physicalGapLedger.rows.map(row=>[
 row.sourceElementKey,row
]));
for(const row of physical.rows)for(const witness of row.localPhysicalEvidence.witnesses){
 const source=originalFactorById.get(witness.sourceElementKey);
 assert(source &&source.originalPathWitnesses>0);
 const endpoint=source.endpointDiagnosis.find(x=>x.sourceNodeKey===row.rowKey);
 assert(endpoint);
 const opposite=source.endpointDiagnosis.find(x=>x.sourceNodeKey!==row.rowKey);
 assert(opposite);
 assert(endpoint.originalTargets.includes(row.automaticTargetNodeId));
 const farTarget=endpoint.direction==='FROM'?witness.targetNodePath.at(-1):
   witness.targetNodePath[0];
 assert(opposite.originalTargets.includes(farTarget));
}
const originalWitness=physical.rows.find(x=>x.rowKey==='S2:90');
assert.equal(originalWitness?.automaticTargetNodeId,'40060');
assert(originalWitness.localPhysicalEvidence.supportingPhysicalFactors.every(
 x=>['S2:E3:80->90','S2:E4:90->120'].includes(x)));
assert(originalWitness.localPhysicalEvidence.witnesses.every(x=>
 x.targetNodePath.includes('40060')
 &&x.targetElementIds.length>0
 &&x.targetNodePath.length===x.targetElementIds.length+1));
assert(originalWitness.localPhysicalEvidence.proofStatus);
assert(physical.rows.every(x=>x.localPhysicalEvidence
 && x.localPhysicalEvidence.identityIndependentlyCertified===false
 && x.localPhysicalEvidence.writerEligible===false));
assert.equal(physical.rows.find(x=>x.rowKey==='S2:420').localPhysicalEvidence.proofStatus,
 'MANUAL_CONFLICT_REQUIRES_REVIEW');
assert.equal(physical.rows.find(x=>x.rowKey==='S3:1580').localPhysicalEvidence.proofStatus,
 'MANUAL_CONFLICT_REQUIRES_REVIEW');
assert.equal(physical.rows.find(x=>x.rowKey==='S2:420').writerEligible,false);
assert(ciiReconciledAuthorityReviewMarkup(physical)
 .includes('data-ciiw-ms-reconciled-physical="1"'));
assert.throws(()=>qualifyCiiReconciledAuthorityPhysicalEvidence(outcome,{
 ...f2,provenance:{...f2.provenance,sourceSetSha256:'wrong'}
}),/CUSTODY_OR_NONWRITING_INVALID/);
assert.throws(()=>qualifyCiiReconciledAuthorityPhysicalEvidence(outcome,{
 ...f2,writerReady:true
}),/CUSTODY_OR_NONWRITING_INVALID/);
assert.throws(()=>qualifyCiiReconciledAuthorityPhysicalEvidence(outcome,{
 ...f2,physicalGapLedger:{...f2.physicalGapLedger,rows:f2.physicalGapLedger.rows.slice(1)}
}),/GAP_LEDGER_ORIGINAL_POPULATION_INVALID/);
const holdouts=[
 ['S1','4410','970'],['S1','4440','975'],['S1','4470','980'],['S1','4490','985'],
 ['S2','360','10280'],['S2','370','10290'],['S2','390','10300'],['S2','400','10310'],
 ['S3','1610','8920'],['S3','1620','8940'],['S3','1640','8950']
];
const allAutomatic=buildCiiSourceTargetAudit(auto);
const heldout=holdouts.map(([member,sourceNode,targetNode])=>{
 const sourceKey=member+':'+sourceNode;
 const raw=allAutomatic.rows.find(row=>row.rowKey===sourceKey);
 assert(raw,'SOURCE PH1 holdout missing: '+sourceKey);
 const candidate=physical.rows.find(row=>row.rowKey===sourceKey);
 return {sourceKey,ownerTarget:targetNode,
  legacyAutoProposed:raw.targetNodeIds.includes(targetNode),
  candidatePhysicalStatus:candidate?.localPhysicalEvidence.proofStatus||'NOT_A_NEW_ALTERNATIVE',
  ownerAssertedPairIndependentlyCertified:false};
});
assert.equal(heldout.length,11);
assert(heldout.every(row=>row.legacyAutoProposed));
assert(heldout.every(row=>!row.ownerAssertedPairIndependentlyCertified));
assert(heldout.filter(x=>x.candidatePhysicalStatus!=='NOT_A_NEW_ALTERNATIVE').length===7);
assert.equal(heldout.filter(x=>x.candidatePhysicalStatus==='NOT_A_NEW_ALTERNATIVE').length,4);
assert.equal(JSON.stringify(active.transferPlan),beforePlan);
assert.equal(JSON.stringify(active.compareReview),beforeReview);
const corroboration={
 physicalStatusCounts:physical.physicalStatusCounts,
 localWitnesses:physical.rows.filter(x=>x.localPhysicalEvidence.witnessCount>0).length,
 multiEdgeCases:physical.rows.filter(x=>x.localPhysicalEvidence.supportingPhysicalFactors.length>=2).length,
 examples:physical.rows.slice(0,12).map(row=>({
  key:row.rowKey,target:row.automaticTargetNodeId,
  status:row.localPhysicalEvidence.proofStatus,
  incident:row.localPhysicalEvidence.sourceIncidentPhysicalFactors,
  factors:row.localPhysicalEvidence.supportingPhysicalFactors,
 })),
 phaseOneHeldout:heldout,
 independentCertificates:0,writerChanges:0,
};
console.log('CII102_P2_ORIGINAL_LOCAL_PHYSICAL_CORROBORATION',JSON.stringify(corroboration));

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

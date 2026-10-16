import assert from 'node:assert/strict';
import {scoreCiiOwnerPhysicalCandidateCoverage} from './cii-workspace-phase2-owner-conditional-coverage.js';
const candidate=(ordinal,sourceMemberId,sourcePhysicalNodeId,targetPhysicalNodeId)=>({
 ownerOrdinal:ordinal,exactlyOneCandidate:true,candidatePairs:[{sourceMemberId,sourcePhysicalNodeId,targetPhysicalNodeId}],
});
const audit=(entries)=>({
 sourceSetSha256:'original-source-set-sha',target:{contentSha256:'original-target-sha'},
 rows:entries.map(([source,target,state='BOUND'])=>({
   rowKey:source,identityBound:state==='BOUND',state,
   targetNodeIds:target==null?[]:Array.isArray(target)?target:[target],
   authorities:['QUALIFIED_INDEPENDENT_METHOD_A_B'],evidenceBases:['GEOMETRY'],
 })),
});
const complete=audit([['S1:10','5010'],['S2:20','5020']]);
const perfect=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010'),candidate(2,'S2','20','5020')],complete,{originalDenominator:428});
assert.equal(perfect.independentlyBoundPhysicalPairAgreement,2);
assert.equal(perfect.physicallyLocatableUniqueNameRows,2);
assert.equal(perfect.conditionalPhysicalPairAgreementRatio,1);
assert.equal(perfect.originalOwnerDenominator,428);
const custody=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010')],complete,{
  originalDenominator:428,sourceSetOriginalSha256:'original-source-set-sha',
  targetOriginalSha256:'original-raw-target-SHA-not-normalized-document',
});
assert.equal(custody.sourceSetOriginalSha256,'original-source-set-sha');
assert.equal(custody.targetOriginalSha256,'original-raw-target-SHA-not-normalized-document');
assert.equal(custody.auditedTargetDocumentContentSha256,'original-target-sha');
assert.notEqual(custody.targetOriginalSha256,custody.auditedTargetDocumentContentSha256);
assert.throws(()=>scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010')],complete,{
  originalDenominator:428,sourceSetOriginalSha256:'wrong-original-source-set',
}),/SOURCE_SET_ORIGINAL_SHA_CUSTODY_MISMATCH/);
assert.equal(perfect.totalEnumeratedSourcePhysicalNodes,2);
assert.equal(perfect.independentSolverBoundSourceNodeCount,2);
assert.equal(perfect.ownerConditionallyAgreedSourceNodeCount,2);
assert.equal(perfect.boundSourceNodesUnverifiedAgainstIncompleteOwnerOracle,0);
assert.equal(perfect.P2_VALIDATED_RECALL,null);
assert.equal(perfect.phase2SeventyPercentQualified,false);
assert.equal(perfect.isOwnerDirectionApproved,false);
assert(Object.isFrozen(perfect.rows));
const duplicate=scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','10','5010'),candidate(2,'S1','10','5010'),
],complete,{originalDenominator:428});
assert.equal(duplicate.independentlyBoundPhysicalPairAgreement,1);
assert.equal(duplicate.statusCounts.DUPLICATE_OWNER_PHYSICAL_PAIR_NO_EXTRA_CREDIT,1);
assert.equal(duplicate.distinctPhysicalOraclePairs,1);
const incorrect=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5099')],complete);
assert.equal(incorrect.independentBoundWrongTargets,1);
assert.equal(incorrect.independentlyBoundPhysicalPairAgreement,0);
assert.equal(incorrect.rows[0].status,'WRONG_BOUND_TARGET');
const missing=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S3','30','5030')],complete);
assert.equal(missing.rows[0].status,'AUDIT_SOURCE_PHYSICAL_NODE_NOT_FOUND');
const ambiguous=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010')],audit([['S1:10',['5010','5020'],'AMBIGUOUS']]));
assert.equal(ambiguous.rows[0].status,'SOLVER_AMBIGUOUS');
const unresolved=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010')],audit([['S1:10',null,'UNRESOLVED']]));
assert.equal(unresolved.rows[0].status,'SOLVER_UNRESOLVED');
const targetClaimedTwice=scoreCiiOwnerPhysicalCandidateCoverage([candidate(1,'S1','10','5010')],audit([['S1:10','5010'],['S2:20','5010']]));
assert.equal(targetClaimedTwice.rows[0].status,'GLOBAL_TARGET_CUSTODY_CONFLICT');
assert.equal(targetClaimedTwice.globalDuplicateTargetClaims.length,1);
const ownerTargetConflict=scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','10','5010'),candidate(2,'S2','20','5010'),
],complete,{originalDenominator:428});
assert.equal(ownerTargetConflict.oracleTargetConflicts.length,1);
assert.equal(ownerTargetConflict.oracleTargetConflicts[0].targetPhysicalNodeId,'5010');
assert.equal(ownerTargetConflict.independentlyBoundPhysicalPairAgreement,0,
 'conflicting Owner physical target may not credit either source claim');
assert.equal(ownerTargetConflict.statusCounts.ORACLE_TARGET_MULTIPLE_SOURCES,2);

const inconsistentOwner=scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','10','5010'),candidate(2,'S1','10','5011'),
],complete);
assert.equal(inconsistentOwner.statusCounts.ORACLE_SOURCE_MULTIPLE_TARGETS,2);
assert.equal(inconsistentOwner.independentlyBoundPhysicalPairAgreement,0);
const missingName=scoreCiiOwnerPhysicalCandidateCoverage([
 {ownerOrdinal:1,exactlyOneCandidate:false,candidatePairs:[]},
 candidate(2,'S1','10','5010'),
],complete);
assert.equal(missingName.statusCounts.NOT_A_UNIQUE_PHYSICAL_CANDIDATE,1);
assert.equal(missingName.independentlyBoundPhysicalPairAgreement,1);
assert.equal(missingName.independentSolverBoundSourceNodeCount,2);
assert.equal(missingName.boundSourceNodesUnverifiedAgainstIncompleteOwnerOracle,1,
 'unseen bound SOURCE pair is neither a false positive nor an Owner-certified match');
assert.throws(()=>scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','10','5010'),candidate(1,'S2','20','5020'),
],complete),/OWNER_ORDINAL_DUPLICATE_OR_INVALID/);
assert.throws(()=>scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','10','5010'),
],audit([['S1:10','5010'],['S1:10','5010']])),/AUDIT_PHYSICAL_SOURCE_CUSTODY_DUPLICATE/);
assert.throws(()=>scoreCiiOwnerPhysicalCandidateCoverage([
 candidate(1,'S1','bad','5010'),
],complete),/PHYSICAL_NODE_ID_INVALID/);
console.log('PASS original physical conditional coverage scorer: global custody, wrong target, original denominator, same-pair dedup and independent Method A/B boundary');

/**
 * Issue #106 Owner-directed SL(S1/S2/S3) -> PS(T) acceptance arithmetic.
 * This module is TEST-ONLY. It never grants physical qualification, seed
 * selection, or Writer2 mutation authority.
 *
 * Counting rule:
 *  - Keep all frozen original owner rows in N.
 *  - R <= number of distinct original physical SOURCE (member, NODE) IDs.
 *  - One SOURCE NODE or TARGET NODE can receive at most one one-to-one credit.
 *  - Duplicate owner lexical rows, repeated NodeNames and conflicting mappings
 *    cannot manufacture new independent physical NODE obligations.
 *  - Solver BOUND agreement is conditional evidence, NOT an independent
 *    Method A/B-global physically certified recall.
 */
const freeze=Object.freeze;
function int(value,label){
 if(!Number.isSafeInteger(value)||value<0)throw new Error('P2_ACCEPTANCE_INVALID_'+label);
 return value;
}
export function scoreCiiOwnerPhase2PhysicalAcceptance({
  ownerRows,originalSourcePhysicalNodeCount,originalTargetPhysicalNodeCount,
  minRecall=0.70,ownerDirectionConfirmed,physicalCoverage,
}) {
 const N=int(ownerRows,'ORIGINAL_OWNER_ROWS');
 const sourceCount=int(originalSourcePhysicalNodeCount,'SOURCE_PHYSICAL_NODE_COUNT');
 const targetCount=int(originalTargetPhysicalNodeCount,'TARGET_PHYSICAL_NODE_COUNT');
 if(!Number.isFinite(minRecall)||minRecall<=0||minRecall>1)throw Error('P2_ACCEPTANCE_INVALID_RECALL_THRESHOLD');
 if(physicalCoverage?.originalOwnerDenominator!==N||physicalCoverage?.originalOwnerRowsSubmitted!==N)
   throw Error('P2_ACCEPTANCE_OWNER_FULL_DENOMINATOR_REQUIRED');
 if(physicalCoverage?.totalEnumeratedSourcePhysicalNodes!==sourceCount)
   throw Error('P2_ACCEPTANCE_SOURCE_CENSUS_MISMATCH');
 if(ownerDirectionConfirmed!==true||physicalCoverage.isOwnerDirectionApproved!==true)
   throw Error('P2_ACCEPTANCE_OWNER_DIRECTION_NOT_CONFIRMED');
 const requiredCredits=Math.ceil(N*minRecall);
 const maximumIndependentPhysicalCredits=Math.min(sourceCount,targetCount,N);
 const cap=maximumIndependentPhysicalCredits/N;
 const bound=physicalCoverage.independentlyBoundPhysicalPairAgreement;
 const uniqueOracle=physicalCoverage.distinctPhysicalOraclePairs;
 if(!Number.isSafeInteger(bound)||bound<0||bound>uniqueOracle||bound>sourceCount)
   throw Error('P2_ACCEPTANCE_INVALID_INDEPENDENT_AGREEMENT_COUNTS');
 if(bound>maximumIndependentPhysicalCredits)throw Error('P2_ACCEPTANCE_DUPLICATE_PHYSICAL_CREDIT_OVERFLOW');
 if((physicalCoverage.oracleTargetConflicts||[]).length>0 && bound>0)
   throw Error('P2_ACCEPTANCE_ORACLE_TARGET_CONFLICT_NOT_VETOED');
 const impossible=maximumIndependentPhysicalCredits<requiredCredits;
 const observed=freeze({
   correctPhysicalSolverBindingsAmongResolvableOwnerPairs:bound,
   physicallyResolvableDistinctOwnerPairs:uniqueOracle,
   observedAgreementFractionOfFrozenOwnerRows:N?bound/N:null,
   observedWithinResolvedPairFraction:uniqueOracle?bound/uniqueOracle:null,
   observedWrongBoundTargets:physicalCoverage.independentBoundWrongTargets,
   otherBoundPhysicalSourceNodesNotVerifiedByOracle:physicalCoverage.boundSourceNodesUnverifiedAgainstIncompleteOwnerOracle,
   globalTargetConflicts:(physicalCoverage.globalDuplicateTargetClaims||[]).length,
   oracleTargetConflicts:(physicalCoverage.oracleTargetConflicts||[]).length,
   // Both numbers below are explicitly NOT independently physically certified.
   strictIndependentlyPhysicalCertifiedCount:null,
   P2_VALIDATED_RECALL:null,
 });
 return freeze({
   schema:'CiiOwnerPhase2OneToOnePhysicalAcceptance.v1',
   ownerConfirmedDirection:'SL(S1/S2/S3)->PS(T)',
   inputOwnerRows:N,requiredValidatedPhysicalRowCredits:requiredCredits,
   originalSourcePhysicalNodeCount:sourceCount,
   originalTargetPhysicalNodeCount:targetCount,
   countingRule:'ONE_CREDIT_PER_UNIQUE_SOURCE_MEMBER_PHYSICAL_NODE_TO_UNIQUE_TARGET_PHYSICAL_NODE_WITH_GLOBAL_CONFLICT_AND_DUPLICATE_VETO',
   oneToOnePhysicalCounting:true,
   maxIndependentPhysicalRowCredits:maximumIndependentPhysicalCredits,
   upperBoundRecall:cap,
   requiredRecall:minRecall,
   structuralFeasibility:impossible?'FAIL_ONE_TO_ONE_PHYSICAL_CENSUS_CAP':'POTENTIALLY_ATTAINABLE',
   acceptanceStatus:impossible?'FAIL_STRUCTURALLY_UNATTAINABLE_ON_PINNED_FILES':'NOT_EVALUABLE_INDEPENDENT_PHYSICAL_VALIDATION',
   ownerInputUnmodified:true,productionMatcherUsesOwnerLabels:false,writerAuthorizationGranted:false,
   observed,
 });
}

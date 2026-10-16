import assert from 'node:assert/strict';
import {scoreCiiOwnerPhase2PhysicalAcceptance} from './cii-workspace-phase2-owner-physical-acceptance.js';
const audit={
 originalOwnerDenominator:428,originalOwnerRowsSubmitted:428,
 totalEnumeratedSourcePhysicalNodes:150,
 independentlyBoundPhysicalPairAgreement:33,distinctPhysicalOraclePairs:33,
 isOwnerDirectionApproved:true,
 oracleTargetConflicts:[],globalDuplicateTargetClaims:[],
 independentBoundWrongTargets:0,boundSourceNodesUnverifiedAgainstIncompleteOwnerOracle:72,
};
const score=scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:428,originalSourcePhysicalNodeCount:150,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:true,physicalCoverage:audit,
});
assert.equal(score.requiredValidatedPhysicalRowCredits,300);
assert.equal(score.maxIndependentPhysicalRowCredits,150);
assert.equal(score.upperBoundRecall,150/428);
assert.equal(score.structuralFeasibility,'FAIL_ONE_TO_ONE_PHYSICAL_CENSUS_CAP');
assert.equal(score.acceptanceStatus,'FAIL_STRUCTURALLY_UNATTAINABLE_ON_PINNED_FILES');
assert.equal(score.observed.correctPhysicalSolverBindingsAmongResolvableOwnerPairs,33);
assert.equal(score.observed.observedAgreementFractionOfFrozenOwnerRows,33/428);
assert.equal(score.observed.observedWithinResolvedPairFraction,1);
assert.equal(score.observed.P2_VALIDATED_RECALL,null);
assert.equal(score.writerAuthorizationGranted,false);
assert.equal(score.oneToOnePhysicalCounting,true);
assert(Object.isFrozen(score));
assert.throws(()=>scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:428,originalSourcePhysicalNodeCount:150,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:false,physicalCoverage:audit,
}),/OWNER_DIRECTION_NOT_CONFIRMED/);
assert.throws(()=>scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:428,originalSourcePhysicalNodeCount:149,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:true,physicalCoverage:audit,
}),/SOURCE_CENSUS_MISMATCH/);
assert.throws(()=>scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:428,originalSourcePhysicalNodeCount:150,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:true,
 physicalCoverage:{...audit,originalOwnerRowsSubmitted:427},
}),/OWNER_FULL_DENOMINATOR_REQUIRED/);
assert.throws(()=>scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:428,originalSourcePhysicalNodeCount:150,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:true,
 physicalCoverage:{...audit,independentlyBoundPhysicalPairAgreement:151,distinctPhysicalOraclePairs:151},
}),/INVALID_INDEPENDENT_AGREEMENT_COUNTS/);
const possible=scoreCiiOwnerPhase2PhysicalAcceptance({
 ownerRows:100,originalSourcePhysicalNodeCount:150,
 originalTargetPhysicalNodeCount:1619,ownerDirectionConfirmed:true,
 physicalCoverage:{...audit,originalOwnerDenominator:100,originalOwnerRowsSubmitted:100},
});
assert.equal(possible.structuralFeasibility,'POTENTIALLY_ATTAINABLE');
assert.equal(possible.acceptanceStatus,'NOT_EVALUABLE_INDEPENDENT_PHYSICAL_VALIDATION');
assert.equal(possible.observed.P2_VALIDATED_RECALL,null);
console.log('PASS owner-confirmed physical 428-rule; 300 required and 150 cap; no false 70% approval');

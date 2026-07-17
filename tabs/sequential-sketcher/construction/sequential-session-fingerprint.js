import { stableToken } from '../sequential-sketcher-contract.js';

function decisionEvidence(decision) {
  return [
    decision.decisionId,
    decision.reason,
    decision.state,
    decision.resolution?.action || null,
    decision.resolution?.selectedCandidateId || null,
  ];
}

function boundaryEvidence(classification) {
  return [
    classification.classificationId,
    classification.boundaryRole,
    classification.branchId,
    classification.rawReference,
    classification.normalizedReference,
    classification.classification,
    classification.dialect,
    classification.patternId,
    classification.policySchema,
    classification.policyId,
    classification.policyRevision,
    classification.policyDialect,
    classification.policyFingerprint,
    classification.confidence,
    [...(classification.basis || [])],
    classification.activePortId,
    classification.positionStatus,
    classification.positionGapMm,
    classification.exactBoundaryToleranceMm,
    classification.toleranceEvidenceType,
    classification.tolerancePolicySchema,
    classification.tolerancePolicyId,
    classification.tolerancePolicyRevision,
    classification.tolerancePolicyFingerprint,
  ];
}

export function sequentialSessionFingerprint(session) {
  const evidence = {
    rootBranchId: session?.rootBranchId || null,
    state: session?.state || null,
    activeBranchId: session?.activeBranchId || null,
    activeComponentId: session?.activeComponentId || null,
    activePortId: session?.activeExitPortId || null,
    confirmedComponentIds: [...(session?.confirmedComponentIds || [])],
    connections: (session?.committedConnections || []).map((connection) => [
      connection.connectionId,
      connection.fromPortId,
      connection.toPortId,
      connection.status,
    ]),
    repairs: (session?.repairLedger || []).map((repair) => [
      repair.repairId,
      repair.connectionId,
      repair.gapMm,
      repair.approvedBy,
    ]),
    decisions: (session?.decisionLedger || []).map(decisionEvidence),
    boundaryClassifications: (session?.boundaryClassifications || []).map(boundaryEvidence),
    completedBranchIds: [...(session?.completedBranchIds || [])],
  };
  return stableToken(JSON.stringify(evidence));
}

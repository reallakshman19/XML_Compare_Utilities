import { stableToken } from '../sequential-sketcher-contract.js';

function decisionEvidence(decision) {
  return [
    decision.decisionId,
    decision.reason,
    decision.state,
    decision.resolution?.action || null,
    decision.resolution?.selectedCandidateId || null,
    decision.resolution?.selectedFromPortId || null,
    decision.resolution?.selectedToPortId || null,
    decision.resolution?.evidenceNote || null,
  ];
}

function openDecisionEvidence(decision) {
  if (!decision) return null;
  return [
    decision.decisionId,
    decision.reason,
    decision.state,
    decision.activePortId || null,
    (decision.candidates || []).map((row) => [
      row.candidateId || null,
      row.fromPortId || row.connectedPortId || null,
      row.toPortId || row.targetPortId || row.entryPortId || null,
    ]),
    decision.deferral?.reason || null,
    decision.deferral?.evidenceNote || null,
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
    activeEntryPortId: session?.activeEntryPortId || null,
    activePortId: session?.activeExitPortId || null,
    startComponentId: session?.startComponentId || null,
    startEntryPortId: session?.startEntryPortId || null,
    confirmedComponentIds: [...(session?.confirmedComponentIds || [])],
    connections: (session?.committedConnections || []).map((connection) => [
      connection.connectionId,
      connection.fromPortId,
      connection.toPortId,
      connection.status,
      connection.approvalProvenance || null,
      connection.approvalReason || null,
      connection.approvalEvidenceNote || null,
    ]),
    repairs: (session?.repairLedger || []).map((repair) => [
      repair.repairId,
      repair.connectionId,
      repair.gapMm,
      repair.approvedBy,
    ]),
    decisions: (session?.decisionLedger || []).map(decisionEvidence),
    openDecision: openDecisionEvidence(session?.currentDecisionRequest),
    deferredDecisionIds: [...(session?.deferredDecisionIds || [])],
    componentTraversalOverrides: (session?.componentTraversalOverrides || []).map((row) => [
      row.overrideId,
      row.componentId,
      row.previousEntryPortId || null,
      row.entryPortId,
      row.decisionId || null,
      row.provenance || null,
    ]),
    boundaryClassifications: (session?.boundaryClassifications || []).map(boundaryEvidence),
    completedBranchIds: [...(session?.completedBranchIds || [])],
  };
  return stableToken(JSON.stringify(evidence));
}

/** A0 read-only reconciliation of existing product data; never certifies identity or writes CII. */
import {
  ciiCanonicalWriter2MutationSelection,
  ciiWriter1CNodeNameReplacementOperation,
  ciiWriter2NodeNameCardinalityOperation,
  ciiBm001CorrespondenceCoverage,
} from '../tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js';

const STATES = Object.freeze(['BOUND', 'UNRESOLVED', 'AMBIGUOUS', 'UNEMITTED']);
const text = (value) => String(value ?? '').trim();

export function classifyCiiSnapshotOperations(transferPlan = {}) {
  const allById = new Map();
  for (const op of [...(transferPlan.operations || []), ...(transferPlan.excludedOperations || [])]) {
    const id = text(op?.operationId);
    if (!id) continue;
    if (allById.has(id)) throw new Error('A0_DUPLICATE_OPERATION_ID:' + id);
    allById.set(id, op);
  }
  const all = [...allById.values()];
  const canonical = ciiCanonicalWriter2MutationSelection(all);
  const categories = { WRITER1C_REPLACE: 0, WRITER2_CREATE: 0, WRITER2_DELETE: 0 };
  const canonicalRows = canonical.appliedOperationIds.map((id) => {
    const op = allById.get(id);
    if (!op) throw new Error('A0_CANONICAL_OPERATION_NOT_FOUND:' + id);
    const replacement = ciiWriter1CNodeNameReplacementOperation(op);
    const structural = ciiWriter2NodeNameCardinalityOperation(op);
    if (replacement === structural) throw new Error('A0_CANONICAL_OPERATION_FAMILY_INVALID:' + id);
    const family = replacement ? 'WRITER1C_REPLACE' : op.action === 'CREATE' ? 'WRITER2_CREATE' : 'WRITER2_DELETE';
    categories[family] += 1;
    return Object.freeze({
      operationId: id, sourceId: text(op.sourceId),
      targetIdentity: text(op.targetEvidence?.identity || op.targetEvidence?.nodeId),
      family, originalAction: text(op.action), before: text(op.before ?? op.targetEvidence?.value),
      proposed: text(op.proposed ?? op.sourceEvidence?.value),
      physicalMutationKey: canonical.corroborationGroups.find((group) => group.appliedOperationId === id)?.physicalMutationKey || null,
    });
  }).sort((a, b) => a.operationId.localeCompare(b.operationId));
  const candidateTotal = Object.values(categories).reduce((sum, count) => sum + count, 0);
  if (candidateTotal !== canonical.appliedOperationIds.length) throw new Error('A0_CANONICAL_FAMILY_PARTITION_INCOMPLETE');
  const qualifiedRawIds = new Set([...canonical.appliedOperationIds, ...canonical.duplicateOperationIds]);
  const unqualifiedNodeName = all.filter((op) => op.family === 'NODE_NAME'
    && op.action !== 'KEEP' && !qualifiedRawIds.has(op.operationId));
  return Object.freeze({
    totalTransferOperations: all.length,
    canonicalPotentialMutationCount: candidateTotal,
    potentialByWriterFamily: Object.freeze(categories),
    duplicateCorroborationCount: canonical.duplicateOperationIds.length,
    conflictingPhysicalTargetCount: canonical.conflicts.length,
    unqualifiedNodeNameOperationCount: unqualifiedNodeName.length,
    unqualifiedNodeNameOperations: Object.freeze(unqualifiedNodeName.map((op) => Object.freeze({
      operationId: op.operationId, action: op.action, status: op.status,
      blockers: op.blockers || [], targetIdentity: text(op.targetEvidence?.identity || op.targetEvidence?.nodeId),
    }))),
    canonicalOperations: Object.freeze(canonicalRows),
    physicalConflicts: canonical.conflicts,
  });
}

export function reconcileCiiSnapshot(preview, audit, { mode = 'UNKNOWN', evidenceLimit = 150 } = {}) {
  if (!preview?.transferPlan || !preview?.correspondence || !audit?.summary) throw new Error('A0_PREVIEW_AND_SOURCE_AUDIT_REQUIRED');
  const rows = audit.rows || [];
  const keys = rows.map((row) => text(row.rowKey));
  if (keys.some((key) => !key) || new Set(keys).size !== keys.length) throw new Error('A0_PHYSICAL_SOURCE_KEY_NOT_UNIQUE');
  const states = Object.fromEntries(STATES.map((state) => [state, rows.filter((row) => row.state === state).length]));
  if (Object.values(states).reduce((sum, value) => sum + value, 0) !== rows.length) throw new Error('A0_SOURCE_STATE_PARTITION_INCOMPLETE');
  if (rows.length !== audit.summary.totalSourceNodes) throw new Error('A0_SOURCE_AUDIT_DENOMINATOR_MISMATCH');
  const bySource = [...(audit.summary.bySource || [])].map((member) => {
    const memberRows = rows.filter((row) => row.sourceId === member.sourceId);
    const counts = Object.fromEntries(STATES.map((state) => [state, memberRows.filter((row) => row.state === state).length]));
    if (memberRows.length !== member.enumeratedNodeCount ||
      Object.values(counts).reduce((sum, value) => sum + value, 0) !== memberRows.length) throw new Error('A0_MEMBER_DENOMINATOR_MISMATCH:' + member.sourceId);
    return Object.freeze({
      sourceId: member.sourceId, total: memberRows.length,
      declaredNodeCount: member.declaredNodeCount, populationStatus: member.populationStatus, states: Object.freeze(counts),
    });
  });
  const reviewRows = preview.compareReview?.rows || [];
  const reviewConfidenceByKind = {};
  for (const row of reviewRows) {
    const kind = text(row.kind) || 'UNKNOWN';
    if (!reviewConfidenceByKind[kind]) reviewConfidenceByKind[kind] = {};
    const grade = text(row.confidence) || 'UNSPECIFIED';
    reviewConfidenceByKind[kind][grade] = (reviewConfidenceByKind[kind][grade] || 0) + 1;
  }
  const plan = preview.transferPlan;
  const mutation = classifyCiiSnapshotOperations(plan);
  const bm = ciiBm001CorrespondenceCoverage(plan);
  const scope = plan.transferScope || null;
  const rawScopeState = scope?.status === 'BOUND' ? 'BOUND' : 'UNBOUND';
  const applied = scope?.status === 'BOUND' ? Number(scope.appliedOperationCount ?? scope.appliedOperationIds?.length ?? 0) : null;
  const causal = preview.writerReadiness?.blockerCausality || null;
  return Object.freeze({
    schema: 'SnapshotReconciliation.v1', mode,
    evidenceType: 'READ_ONLY_EXISTING_PRODUCT_DATA_NOT_CERTIFIED_PHYSICAL_MATCH',
    sourceSetSha256: text(preview.sourceSetSha256), originalTargetSha256: text(preview.targetAuthority?.originalSha256),
    correspondenceStatus: text(preview.correspondence.status),
    transferPlanStatus: text(plan.status), writerReadinessStatus: text(preview.writerReadiness?.status),
    physicalNodeCensus: Object.freeze({ total: rows.length, states: Object.freeze(states), bySource: Object.freeze(bySource) }),
    reviewRowPopulation: Object.freeze({
      total: reviewRows.length, confidenceByKind: Object.freeze(reviewConfidenceByKind),
    }),
    mutation,
    bm001Observation: Object.freeze({
      matchedRows: bm.matchedRowCount, expectedRows: bm.expectedRowCount,
      status: bm.status, observationStatus: bm.observationStatus, invalidBindingIds: bm.invalidOperationIds,
    }),
    scope: Object.freeze({ state: rawScopeState, appliedCount: applied,
      excludedOperationCount: plan.excludedOperations?.length || 0 }),
    blockers: Object.freeze({
      transferPlan: plan.blockers || [], writerReadiness: preview.writerReadiness?.blockers || [],
      primary: causal?.primary || [], derived: causal?.derived || [],
    }),
    physicalNodes: Object.freeze(rows.slice(0, evidenceLimit).map((row) => Object.freeze({
      rowKey: row.rowKey, state: row.state, sourceNodeName: row.sourceNodeName,
      targetNodeId: row.targetNodeId, targetNodeName: row.targetNodeName,
      confidence: row.confidence, reviewDecisions: row.reviewDecisions, reasons: row.reasons,
      qualifiedNodeNameChange: row.qualifiedNodeNameChange,
    }))),
    limitations: Object.freeze([
      'BM001_OBSERVATION_NOT_NODE_CORRESPONDENCE_COUNT',
      'CANDIDATE_COUNT_MIXES_WRITER1C_AND_WRITER2',
      'MANUAL_ASSERTION_NOT_INDEPENDENT_PHYSICAL_CERTIFICATION',
      'NO_MUTATION_OR_SCOPE_WRITE_PERFORMED',
    ]),
  });
}

export function compareCiiNodeCensuses(left, right) {
  const a = new Map((left.physicalNodes || []).map((row) => [row.rowKey, row]));
  const b = new Map((right.physicalNodes || []).map((row) => [row.rowKey, row]));
  if (a.size !== left.physicalNodeCensus.total || b.size !== right.physicalNodeCensus.total)
    throw new Error('A0_CENSUS_DIFF_REQUIRES_COMPLETE_PHYSICAL_ROWS');
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  return Object.freeze({
    leftMode: left.mode, rightMode: right.mode,
    differences: Object.freeze(keys.flatMap((key) => {
      const prior = a.get(key), current = b.get(key);
      if (prior?.state === current?.state && prior?.targetNodeId === current?.targetNodeId) return [];
      return [Object.freeze({
        sourceNode: key, leftState: prior?.state || null, rightState: current?.state || null,
        leftTarget: prior?.targetNodeId || null, rightTarget: current?.targetNodeId || null,
      })];
    })),
  });
}

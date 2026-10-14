/** ARCH-01 A0b: independent, READ-ONLY reconciliation of A0 original-file replay evidence.
 * This module reasons about competing correspondence assertions; it does NOT certify either one.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const text = (value) => String(value ?? '').trim();
function frozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(frozen));
  if (value && typeof value === 'object') return Object.freeze(
    Object.fromEntries(Object.entries(value).map(([key, item]) => [key, frozen(item)])));
  return value;
}
const ordered = (rows) => [...rows].sort((a, b) => a.sourceNode.localeCompare(b.sourceNode, undefined, { numeric: true }));

function validateMode(mode) {
  if (mode?.reviewed?.physicalNodeCensus?.total !== 150 || mode?.reviewed?.physicalNodes?.length !== 150) {
    throw new Error('A0B_EXACT_COMPLETE_150_NODE_CENSUS_REQUIRED');
  }
  if (new Set(mode.reviewed.physicalNodes.map((row) => row.rowKey)).size !== 150) {
    throw new Error('A0B_DUPLICATE_PHYSICAL_NODE_ID');
  }
  if (mode.reviewed.sourceSetSha256 !== mode.discovery?.sourceSetSha256 ||
    mode.reviewed.originalTargetSha256 !== mode.discovery?.originalTargetSha256) {
    throw new Error('A0B_DISCOVERY_REVIEW_SNAPSHOT_MISMATCH');
  }
}
function identitySummary(row) {
  return frozen({
    state: row?.state || null, targetNodeId: row?.targetNodeId || null,
    confidence: row?.confidence || null, sourceNodeName: row?.sourceNodeName || '',
    targetNodeName: row?.targetNodeName || '', review: row?.reviewDecisions || [],
    reasons: row?.reasons || [],
  });
}
function changeKind(before, after) {
  if (before?.state === 'BOUND' && after?.state === 'BOUND' && before?.targetNodeId !== after?.targetNodeId)
    return 'COMPETING_BOUND_TARGETS';
  if (before?.state === 'BOUND' && after?.state === 'UNRESOLVED') return 'BOUND_TO_UNRESOLVED';
  if (before?.state === 'BOUND' && after?.state === 'UNEMITTED') return 'BOUND_TO_UNEMITTED';
  if (before?.state === 'UNRESOLVED' && after?.state === 'UNEMITTED') return 'UNRESOLVED_TO_UNEMITTED';
  return 'OTHER_STATE_OR_TARGET_CHANGE';
}
function sameClassification(a, b) {
  return a?.state === b?.state && a?.targetNodeId === b?.targetNodeId;
}

export function investigateCiiArchitectureA0b(evidence = {}) {
  if (evidence.schema !== 'CiiRetainedArchitectureA0Evidence.v1')
    throw new Error('A0B_EXPECTED_RETAINED_EVIDENCE_SCHEMA_REQUIRED');
  const automatic = evidence.modes?.find((m) => m.mode === 'AUTO_ONLY');
  const mixed = evidence.modes?.find((m) => m.mode === 'UI_MIXED_BASE_PROXY');
  if (!automatic || !mixed) throw new Error('A0B_REQUIRED_MODES_MISSING');
  validateMode(automatic); validateMode(mixed);
  if (automatic.reviewed.sourceSetSha256 !== mixed.reviewed.sourceSetSha256 ||
    automatic.reviewed.originalTargetSha256 !== mixed.reviewed.originalTargetSha256)
    throw new Error('A0B_MODES_MUST_SHARE_EXACT_SOURCE_AND_TARGET_CUSTODY');
  const left = new Map(automatic.reviewed.physicalNodes.map((row) => [row.rowKey, row]));
  const right = new Map(mixed.reviewed.physicalNodes.map((row) => [row.rowKey, row]));
  if ([...left.keys()].some((key) => !right.has(key))) throw new Error('A0B_SOURCE_CENSUS_KEY_MISMATCH');
  const distinctions = [];
  const grouped = {};
  for (const [key, oldRow] of left) {
    const newRow = right.get(key);
    if (sameClassification(oldRow, newRow)) continue;
    const kind = changeKind(oldRow, newRow);
    const member = key.split(':')[0];
    if (!grouped[member]) grouped[member] = {};
    grouped[member][kind] = (grouped[member][kind] || 0) + 1;
    distinctions.push(frozen({
      sourceNode: key, classification: kind,
      automatic: identitySummary(oldRow), manualBase: identitySummary(newRow),
      physicalCertification: 'NOT_ASSESSED_BY_A0B',
    }));
  }
  const sorted = ordered(distinctions);
  const legacyCount = evidence.reviewedModeDifference?.differences?.length;
  if (sorted.length !== legacyCount) throw new Error('A0B_INDEPENDENT_DIFF_NOT_EQUAL_PREDECESSOR:' + sorted.length + ':' + legacyCount);
  const manualClaims = Object.entries(mixed.manualPairsBySource || {}).flatMap(([sourceId, pairs]) => (pairs || []).map((pair) => {
    const key = sourceId + ':' + text(pair.sourceNodeId);
    const auto = left.get(key), manual = right.get(key);
    if (!auto || !manual) throw new Error('A0B_MANUAL_ANCHOR_NOT_IN_CENSUS:' + key);
    if (manual.targetNodeId !== text(pair.targetNodeId) || manual.state !== 'BOUND' ||
      !manual.reviewDecisions?.includes('LOCKED')) {
      throw new Error('A0B_MANUAL_ASSERTION_NOT_RETAINED_EXACTLY:' + key);
    }
    return frozen({
      sourceNode: key, manuallyClaimedTarget: text(pair.targetNodeId),
      autoBaseProposedTarget: auto.targetNodeId || null,
      autoBaseState: auto.state, manualState: manual.state,
      manualConfidence: manual.confidence,
      samePhysicalTargetProposal: auto.targetNodeId === text(pair.targetNodeId),
      independentlyCertifiedManualIdentity: false,
      reason: 'MANUAL_LOCK_IS_ASSERTION_NOT_INDEPENDENT_GEOMETRY_CERTIFICATE',
    });
  }));
  const bySource = {};
  for (const member of ['S1','S2','S3']) {
    const a = automatic.reviewed.physicalNodeCensus.bySource.find((row) => row.sourceId === member);
    const b = mixed.reviewed.physicalNodeCensus.bySource.find((row) => row.sourceId === member);
    if (!a || !b || a.total !== b.total) throw new Error('A0B_SOURCE_DENOMINATOR_CHANGED:' + member);
    bySource[member] = frozen({
      total: a.total, automaticStates: a.states, manualBaseStates: b.states,
      differences: sorted.filter((row) => row.sourceNode.startsWith(member + ':')).length,
      lostBound: a.states.BOUND - b.states.BOUND,
    });
  }
  const benchmarks = {};
  for (const [name, item] of Object.entries(evidence.exactPartialPostimageComparison || {})) {
    benchmarks[name] = frozen({
      knownPositive: item.knownPositiveCount,
      physicalActionTargetMatched: item.actionTargetMatchedCount,
      compatibleNames: item.compatibleKnownPositiveCount,
      missingPhysicalActionTargets: item.missingActionTargetKeys || [],
      unalignedExactRawNames: (item.incompatibleValueEvidence || []).map((row) => frozen({
        physicalTargetAction: row.key,
        exactSourceNameProposed: row.proposedRawName,
        partialOracleName: row.partialOracleName,
        status: 'LEXICAL_BENCHMARK_DISCREPANCY_NOT_PHYSICAL_IDENTITY_VETO',
      })),
      originalTargetValueDisagreements: item.beforeValueMismatches || [],
    });
  }
  const causes = frozen({
    F1: { kind: 'PROVEN_CONFIGURATION_CAUSE',
      evidence: 'UI_MIXED_BASE_PROXY excludes S2/S3 auto bases while preserving current manual anchors; same raw source/target hash yields changed census',
      changedPhysicalNodeOutcomes: sorted.length },
    F2: { kind: 'ALGORITHM_LIMITATION_NOT_QUANTIFIED_HERE',
      evidence: 'local frontier and node-custody ambiguity can stop outward propagation; A0b does not solve physical graph' },
    F3: { kind: 'PROVEN_AGGREGATE_PLAN_GATE',
      evidence: 'MIXED correspondence UNRESOLVED and scope UNBOUND; no Writer APPLY operation emitted' },
    F4: { kind: 'COUNTER_CATEGORY_ERROR',
      evidence: 'CANDIDATE_WRITER1C_REPLACE not WRITER2_CREATE_DELETE; benchmark and physical node populations differ' },
  });
  return frozen({
    schema: 'CiiArchitectureA0bForensicReconciliation.v1',
    type: 'READ_ONLY_DISCREPANCY_FORENSICS_NO_IDENTITY_CERTIFICATION',
    sourceSetSha256: automatic.reviewed.sourceSetSha256,
    originalTargetSha256: automatic.reviewed.originalTargetSha256,
    autoOnly: { physicalBound: automatic.reviewed.physicalNodeCensus.states.BOUND,
      candidateByWriterFamily: automatic.reviewed.mutation.potentialByWriterFamily },
    manualBase: { physicalBound: mixed.reviewed.physicalNodeCensus.states.BOUND,
      candidateByWriterFamily: mixed.reviewed.mutation.potentialByWriterFamily },
    changeCount: sorted.length, bySource, classifications: grouped,
    competingBoundTargets: sorted.filter((row) => row.classification === 'COMPETING_BOUND_TARGETS'),
    manualClaims, allChangedPhysicalNodes: sorted,
    benchmarks, causalEvaluation: causes,
    independentReviewGaps: [
      'A1_CERTIFICATE_MUST_BIND_TO_EXACT_SNAPSHOT_SOURCE_TARGET_AND_POLICY_DIGEST_BEFORE_A2',
      'A1_CERTIFIED_STATUS_STRING_ALONE_IS_NOT_PROOF_OF_PHYSICAL_IDENTITY',
      'A0_CANONICAL_DUPLICATE_WRITE_COLLAPSE_NEEDS_CROSS_MEMBER_PHYSICAL_CUSTODY_BEFORE_EXECUTION',
      'MANUAL_CLAIM_PHYSICAL_OD_TOPOLOGY_AND_SUBDIVISION_FALSIFIERS_REQUIRE_INDEPENDENT_WITNESSES',
      'THREE_TEXPECTED_SL305_NAMES_ARE_NOT_RAW_SOURCE_NAME_MATCHES',
      'A2_GLOBAL_RESOLVER_NOT_IMPLEMENTED; NO_AUTOMATIC_OR_MANUAL_CANDIDATE_ADMITTED',
    ],
  });
}

function args(argv) {
  return Object.fromEntries(argv.filter((item) => /^--[^=]+=/.test(item)).map((item) => {
    const at = item.indexOf('=');
    return [item.slice(2, at), item.slice(at + 1)];
  }));
}
if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  const options = args(process.argv.slice(2));
  if (!options.evidence) throw new Error('A0B_RETAINED_EVIDENCE_JSON_REQUIRED');
  const report = investigateCiiArchitectureA0b(JSON.parse(readFileSync(resolve(options.evidence), 'utf8')));
  const json = JSON.stringify(report, null, 2) + '\n';
  if (options.out) {
    const file = resolve(options.out);
    if (file.includes('/Benchmark/')) throw new Error('A0B_BENCHMARK_WRITE_FORBIDDEN');
    mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, json, 'utf8');
  }
  console.log(JSON.stringify({
    schema: report.schema, sourceSetSha256: report.sourceSetSha256, changeCount: report.changeCount,
    bySource: report.bySource, categories: report.classifications,
    competingBoundTargets: report.competingBoundTargets.map((x) => ({
      sourceNode: x.sourceNode, automaticTarget: x.automatic.targetNodeId, manualBaseTarget: x.manualBase.targetNodeId,
    })),
    manualAssertions: report.manualClaims, benchmark: Object.fromEntries(Object.entries(report.benchmarks).map(([name, data]) =>
      [name, { matched: data.physicalActionTargetMatched, compatible: data.compatibleNames,
        incompatibleExactSourceNames: data.unalignedExactRawNames.length, missing: data.missingPhysicalActionTargets.length }])),
    saved: options.out || null,
  }, null, 2));
}

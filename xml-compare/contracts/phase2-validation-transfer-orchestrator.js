export const XML_COMPARE_PHASE2_ORCHESTRATOR_SCHEMA = 'xml-compare-phase2-orchestrator/v1';

export const MATCH_CANDIDATE_SET_SCHEMA = 'match-candidate-set/v1';
export const MATCH_DECISION_SCHEMA = 'match-decision/v1';
export const APPROVED_MATCH_SET_SCHEMA = 'approved-match-set/v1';
export const TRANSFORM_POLICY_SCHEMA = 'transform-policy/v1';
export const VALIDATION_MODEL_V2_SCHEMA = 'validation-model/v2';
export const VALIDATION_AUDIT_V2_SCHEMA = 'validation-audit/v2';
export const APPROVED_TRANSFER_CASE_SCHEMA = 'approved-transfer-case/v1';
export const TRANSFER_PLAN_SCHEMA = 'transfer-plan/v1';
export const TRANSFER_PATCH_AUDIT_SCHEMA = 'transfer-patch-audit/v1';
export const POST_TRANSFER_VALIDATION_SCHEMA = 'post-transfer-validation/v1';

export const DEFAULT_TRANSFORM_POLICY = Object.freeze({
  schema: TRANSFORM_POLICY_SCHEMA,
  allowedTransforms: Object.freeze([
    'identity-offset',
    'known-axis-map',
    'known-yup-zup-conversion',
    'manual-approved',
  ]),
  blockFreeAxisPermutation: true,
  diagnosticFreeSearchAllowed: true,
  approved: false,
  approvalBasis: '',
});

export const DEFAULT_NUMERIC_TOLERANCE_POLICY = Object.freeze({
  pressure: Object.freeze({ abs: 0.01, unit: 'MPa' }),
  temperature: Object.freeze({ abs: 0.5, unit: 'C' }),
  coordinate: Object.freeze({ abs: 1, unit: 'mm' }),
  wallThickness: Object.freeze({ abs: 0.01, unit: 'mm' }),
  length: Object.freeze({ abs: 1, unit: 'mm' }),
  default: Object.freeze({ abs: 0, unit: '' }),
});

const TOLERANCE_BUCKETS = Object.freeze({ exact: 0.01, approx1: 25, approx2: 125, approx3: 1000 });
const APPROVED_STATUSES = new Set(['approved']);
const BLOCKING_ROW_STATUSES = new Set([
  'DUPLICATE_TARGET_CLAIM',
  'COORDINATE_FRAME_NOT_COMPARABLE',
  'ANCHOR_MISSING',
  'TRANSFORM_NOT_APPROVED',
  'IDENTITY_LOW_CONFIDENCE',
  'MISMATCH',
]);

const clean = (value) => String(value ?? '').trim();
const finite = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const cloneArray = (items = []) => Object.freeze([...(Array.isArray(items) ? items : [])]);

export function diagnostic(severity = 'INFO', code = '', message = '', ref = {}) {
  return Object.freeze({ severity: clean(severity), code: clean(code), message: clean(message), ref: Object.freeze({ ...(ref || {}) }) });
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function stableHash(value) {
  const text = stableJson(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createTransformPolicy(input = {}) {
  const allowed = Array.isArray(input.allowedTransforms) && input.allowedTransforms.length
    ? input.allowedTransforms.map(clean).filter(Boolean)
    : [...DEFAULT_TRANSFORM_POLICY.allowedTransforms];
  return Object.freeze({
    schema: TRANSFORM_POLICY_SCHEMA,
    allowedTransforms: Object.freeze(allowed),
    blockFreeAxisPermutation: input.blockFreeAxisPermutation !== false,
    diagnosticFreeSearchAllowed: input.diagnosticFreeSearchAllowed !== false,
    approved: Boolean(input.approved),
    approvalBasis: clean(input.approvalBasis),
  });
}

function toleranceBucket(deltaMm = Number.POSITIVE_INFINITY, tolerance = TOLERANCE_BUCKETS) {
  const d = finite(deltaMm, Number.POSITIVE_INFINITY);
  if (d <= finite(tolerance.exact, TOLERANCE_BUCKETS.exact)) return 'exact';
  if (d <= finite(tolerance.approx1, TOLERANCE_BUCKETS.approx1)) return 'approx1';
  if (d <= finite(tolerance.approx2, TOLERANCE_BUCKETS.approx2)) return 'approx2';
  if (d <= finite(tolerance.approx3, TOLERANCE_BUCKETS.approx3)) return 'approx3';
  return 'rejected';
}

function bucketRank(bucket = '') {
  return { exact: 0, approx1: 1, approx2: 2, approx3: 3, rejected: 99 }[bucket] ?? 99;
}

function pairKey(sourceUid = '', targetUid = '') {
  return `${clean(sourceUid)}=>${clean(targetUid)}`;
}

function withSecondBest(candidates = []) {
  const bySource = new Map();
  for (const candidate of candidates) {
    const key = clean(candidate.sourceUid);
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(candidate);
  }
  const secondBest = new Map();
  for (const [sourceUid, rows] of bySource.entries()) {
    const sorted = [...rows].sort((a, b) => bucketRank(a.toleranceBucket) - bucketRank(b.toleranceBucket) || a.deltaMm - b.deltaMm);
    secondBest.set(sourceUid, sorted[1]?.deltaMm ?? null);
  }
  return candidates.map((candidate) => Object.freeze({
    ...candidate,
    secondBestDeltaMm: candidate.secondBestDeltaMm ?? secondBest.get(clean(candidate.sourceUid)),
  }));
}

function ambiguousPairSet(candidates = []) {
  const ambiguous = new Set();
  const bySource = new Map();
  for (const candidate of candidates.filter((item) => item.status !== 'rejected')) {
    const sourceUid = clean(candidate.sourceUid);
    if (!bySource.has(sourceUid)) bySource.set(sourceUid, []);
    bySource.get(sourceUid).push(candidate);
  }
  for (const rows of bySource.values()) {
    const sorted = [...rows].sort((a, b) => bucketRank(a.toleranceBucket) - bucketRank(b.toleranceBucket) || a.deltaMm - b.deltaMm);
    const topBucket = sorted[0]?.toleranceBucket;
    const topRows = sorted.filter((item) => item.toleranceBucket === topBucket);
    if (topRows.length > 1) topRows.forEach((item) => ambiguous.add(pairKey(item.sourceUid, item.targetUid)));
  }
  return ambiguous;
}

function conflictPairSet(candidates = []) {
  const conflicts = new Set();
  const byTarget = new Map();
  for (const candidate of candidates.filter((item) => item.status !== 'rejected')) {
    const targetUid = clean(candidate.targetUid);
    if (!byTarget.has(targetUid)) byTarget.set(targetUid, []);
    byTarget.get(targetUid).push(candidate);
  }
  for (const rows of byTarget.values()) {
    const uniqueSources = new Set(rows.map((item) => clean(item.sourceUid)));
    if (uniqueSources.size > 1) rows.forEach((item) => conflicts.add(pairKey(item.sourceUid, item.targetUid)));
  }
  return conflicts;
}

export function createMatchCandidateSet({ sourceId = 'source', targetId = 'target', candidates = [], tolerance = TOLERANCE_BUCKETS, transformPolicy = null } = {}) {
  const initial = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
    const deltaMm = finite(candidate.deltaMm ?? candidate.delta?.maxAbs ?? candidate.delta?.srss, Number.POSITIVE_INFINITY);
    const status = clean(candidate.status || 'candidate');
    return Object.freeze({
      sourceUid: clean(candidate.sourceUid),
      targetUid: clean(candidate.targetUid),
      basis: Object.freeze([...(Array.isArray(candidate.basis) ? candidate.basis : [candidate.basis || 'unspecified']).map(clean).filter(Boolean)]),
      score: finite(candidate.score, 0),
      deltaMm,
      secondBestDeltaMm: candidate.secondBestDeltaMm == null ? null : finite(candidate.secondBestDeltaMm, null),
      identityConfidence: finite(candidate.identityConfidence ?? candidate.confidence, 0),
      coordinateFrameOk: candidate.coordinateFrameOk !== false,
      transformBasis: clean(candidate.transformBasis || candidate.transform?.basis || 'identity-offset'),
      toleranceBucket: toleranceBucket(deltaMm, tolerance),
      status: status === 'rejected' ? 'rejected' : 'candidate',
      diagnostics: cloneArray(candidate.diagnostics || []),
    });
  }).filter((candidate) => candidate.sourceUid && candidate.targetUid);

  const withBest = withSecondBest(initial);
  const ambiguous = ambiguousPairSet(withBest);
  const conflicts = conflictPairSet(withBest);
  const normalized = withBest.map((candidate) => {
    const key = pairKey(candidate.sourceUid, candidate.targetUid);
    const status = candidate.status === 'rejected'
      ? 'rejected'
      : ambiguous.has(key)
        ? 'ambiguous'
        : conflicts.has(key)
          ? 'conflict'
          : 'candidate';
    return Object.freeze({ ...candidate, status });
  });
  return Object.freeze({
    schema: MATCH_CANDIDATE_SET_SCHEMA,
    sourceId: clean(sourceId),
    targetId: clean(targetId),
    transformPolicy: createTransformPolicy(transformPolicy || {}),
    candidates: Object.freeze(normalized),
    summary: Object.freeze({
      candidateCount: normalized.length,
      ambiguousCount: normalized.filter((item) => item.status === 'ambiguous').length,
      conflictCount: normalized.filter((item) => item.status === 'conflict').length,
      rejectedCount: normalized.filter((item) => item.status === 'rejected').length,
    }),
  });
}

export function createMatchDecision(input = {}) {
  return Object.freeze({
    schema: MATCH_DECISION_SCHEMA,
    sourceUid: clean(input.sourceUid),
    targetUid: clean(input.targetUid),
    decision: ['approved', 'rejected', 'needs-review'].includes(clean(input.decision)) ? clean(input.decision) : 'needs-review',
    decisionBasis: clean(input.decisionBasis || 'manual-review'),
    reviewer: clean(input.reviewer),
    createdAt: clean(input.createdAt || new Date(0).toISOString()),
    confidence: finite(input.confidence, 0),
    diagnostics: cloneArray(input.diagnostics || []),
  });
}

export function createApprovedMatchSet({ sourceGraph = null, targetGraph = null, decisions = [], candidateSet = null, transformPolicy = null } = {}) {
  const policy = createTransformPolicy(transformPolicy || candidateSet?.transformPolicy || {});
  const candidatesByPair = new Map((candidateSet?.candidates || []).map((candidate) => [pairKey(candidate.sourceUid, candidate.targetUid), candidate]));
  const normalizedDecisions = (Array.isArray(decisions) ? decisions : []).map(createMatchDecision);
  const approvedMatches = [];
  const rejectedMatches = [];
  const ambiguousMatches = [];
  const diagnostics = [];

  for (const decision of normalizedDecisions) {
    const candidate = candidatesByPair.get(pairKey(decision.sourceUid, decision.targetUid));
    if (decision.decision === 'rejected') {
      rejectedMatches.push(Object.freeze({ sourceUid: decision.sourceUid, targetUid: decision.targetUid, decision }));
      continue;
    }
    if (!APPROVED_STATUSES.has(decision.decision)) continue;
    if (!candidate) {
      diagnostics.push(diagnostic('BLOCKER', 'MATCH_CANDIDATE_MISSING', 'Approved decision references a missing candidate.', { sourceUid: decision.sourceUid, targetUid: decision.targetUid }));
      continue;
    }
    if (candidate.status === 'ambiguous' || candidate.status === 'conflict') {
      ambiguousMatches.push(Object.freeze({ sourceUid: decision.sourceUid, targetUid: decision.targetUid, status: candidate.status, decision, candidate }));
      diagnostics.push(diagnostic('BLOCKER', candidate.status === 'ambiguous' ? 'MATCH_AMBIGUOUS' : 'MATCH_CONFLICT', 'Approved decision is blocked by candidate status.', { sourceUid: decision.sourceUid, targetUid: decision.targetUid, status: candidate.status }));
      continue;
    }
    approvedMatches.push(Object.freeze({
      sourceUid: decision.sourceUid,
      targetUid: decision.targetUid,
      sourceStableKey: clean(candidate.sourceStableKey || decision.sourceUid),
      targetStableKey: clean(candidate.targetStableKey || decision.targetUid),
      matchType: clean(decision.decisionBasis || 'manual'),
      confidence: Math.max(finite(decision.confidence, 0), finite(candidate.score, 0), finite(candidate.identityConfidence, 0)),
      identityConfidence: finite(candidate.identityConfidence, 0),
      coordinateDeltaMm: finite(candidate.deltaMm, null),
      basis: cloneArray(candidate.basis || []),
      transformBasis: clean(candidate.transformBasis),
      reviewerStatus: decision.decision,
      diagnostics: cloneArray([...candidate.diagnostics, ...decision.diagnostics]),
    }));
  }

  return Object.freeze({
    schema: APPROVED_MATCH_SET_SCHEMA,
    sourceGraphHash: stableHash(sourceGraph || {}),
    targetGraphHash: stableHash(targetGraph || {}),
    transformPolicy: policy,
    approvedMatches: Object.freeze(approvedMatches),
    rejectedMatches: Object.freeze(rejectedMatches),
    ambiguousMatches: Object.freeze(ambiguousMatches),
    diagnostics: Object.freeze(diagnostics),
    summary: Object.freeze({
      approvedCount: approvedMatches.length,
      rejectedCount: rejectedMatches.length,
      ambiguousCount: ambiguousMatches.length,
      blockerCount: diagnostics.filter((item) => item.severity === 'BLOCKER').length,
    }),
  });
}

function point(record = {}) {
  const src = record.position || record.coordinate || record.coOrds || record.points?.[0] || record;
  const x = finite(src?.x, null);
  const y = finite(src?.y, null);
  const z = finite(src?.z, null);
  return [x, y, z].every((value) => value != null) ? Object.freeze({ x, y, z }) : null;
}

function distanceMm(a = null, b = null) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

function readField(record = {}, field = '') {
  const keys = [field, clean(field), clean(field).toUpperCase()].filter(Boolean);
  for (const bag of [record, record.fields, record.attributes, record.raw, record.raw?.attributes]) {
    for (const keyName of keys) if (bag && bag[keyName] != null) return bag[keyName];
  }
  return undefined;
}

function toleranceForField(field = '', policy = DEFAULT_NUMERIC_TOLERANCE_POLICY) {
  const name = clean(field).toLowerCase();
  if (/press|^p[0-9]/.test(name)) return policy.pressure || DEFAULT_NUMERIC_TOLERANCE_POLICY.pressure;
  if (/temp|^t[0-9]/.test(name)) return policy.temperature || DEFAULT_NUMERIC_TOLERANCE_POLICY.temperature;
  if (/coord|global|x$|y$|z$/.test(name)) return policy.coordinate || DEFAULT_NUMERIC_TOLERANCE_POLICY.coordinate;
  if (/wall|thick/.test(name)) return policy.wallThickness || DEFAULT_NUMERIC_TOLERANCE_POLICY.wallThickness;
  if (/length|delta/.test(name)) return policy.length || DEFAULT_NUMERIC_TOLERANCE_POLICY.length;
  return policy.default || DEFAULT_NUMERIC_TOLERANCE_POLICY.default;
}

function fieldValidationRows(sourceRecord = {}, targetRecord = {}, fields = [], policy = DEFAULT_NUMERIC_TOLERANCE_POLICY) {
  return (fields || []).map((field) => {
    const sourceValue = readField(sourceRecord, field);
    const targetValue = readField(targetRecord, field);
    const sn = finite(sourceValue, null);
    const tn = finite(targetValue, null);
    if (sn == null || tn == null) {
      return Object.freeze({ field: clean(field), sourceValue: sourceValue ?? '', targetValue: targetValue ?? '', status: clean(sourceValue) === clean(targetValue) ? 'OK' : 'MISMATCH', mode: 'text' });
    }
    const tolerance = toleranceForField(field, policy);
    const delta = tn - sn;
    return Object.freeze({ field: clean(field), sourceValue, targetValue, delta, tolerance, status: Math.abs(delta) <= finite(tolerance.abs, 0) ? 'OK' : 'MISMATCH', mode: 'numeric-tolerance' });
  });
}

function coordinateFrameComparable(record = {}) {
  const status = record.coordinateFrameStatus || record.raw?.coordinateFrameStatus;
  if (!status) return true;
  return status.comparableForDelta !== false;
}

export function createValidationModelV2({ sourceRecords = [], targetRecords = [], approvedMatchSet = null, compareFields = [], numericTolerancePolicy = DEFAULT_NUMERIC_TOLERANCE_POLICY, identityConfidenceThreshold = 0.75 } = {}) {
  const sourceByUid = new Map((sourceRecords || []).map((record) => [clean(record.uid), record]));
  const targetByUid = new Map((targetRecords || []).map((record) => [clean(record.uid), record]));
  const targetClaims = new Map();
  for (const match of approvedMatchSet?.approvedMatches || []) {
    const targetUid = clean(match.targetUid);
    targetClaims.set(targetUid, (targetClaims.get(targetUid) || 0) + 1);
  }

  const diagnostics = [];
  if (!approvedMatchSet?.approvedMatches?.length) diagnostics.push(diagnostic('BLOCKER', 'APPROVED_MATCH_SET_EMPTY', 'Validation requires at least one approved match.'));

  const rows = (approvedMatchSet?.approvedMatches || []).map((match) => {
    const source = sourceByUid.get(clean(match.sourceUid));
    const target = targetByUid.get(clean(match.targetUid));
    const sourcePoint = point(source);
    const targetPoint = point(target);
    const coordinateDeltaMm = Number.isFinite(match.coordinateDeltaMm) ? match.coordinateDeltaMm : distanceMm(sourcePoint, targetPoint);
    const fieldRows = fieldValidationRows(source || {}, target || {}, compareFields, numericTolerancePolicy);
    let status = 'OK';
    const rowDiagnostics = [];

    if (!source || !target) {
      status = 'ANCHOR_MISSING';
      rowDiagnostics.push(diagnostic('BLOCKER', 'ANCHOR_MISSING', 'Approved match record is missing in source or target records.', { sourceUid: match.sourceUid, targetUid: match.targetUid }));
    } else if (targetClaims.get(clean(match.targetUid)) > 1) {
      status = 'DUPLICATE_TARGET_CLAIM';
      rowDiagnostics.push(diagnostic('BLOCKER', 'DUPLICATE_TARGET_CLAIM', 'Multiple source records claim the same target record.', { targetUid: match.targetUid }));
    } else if (!coordinateFrameComparable(source) || !coordinateFrameComparable(target)) {
      status = 'COORDINATE_FRAME_NOT_COMPARABLE';
      rowDiagnostics.push(diagnostic('BLOCKER', 'COORDINATE_FRAME_NOT_COMPARABLE', 'Coordinate frame is not comparable for engineering delta.', { sourceUid: match.sourceUid, targetUid: match.targetUid }));
    } else if (approvedMatchSet.transformPolicy?.blockFreeAxisPermutation && match.transformBasis === 'free-axis-permutation' && !approvedMatchSet.transformPolicy?.approved) {
      status = 'TRANSFORM_NOT_APPROVED';
      rowDiagnostics.push(diagnostic('BLOCKER', 'TRANSFORM_NOT_APPROVED', 'Free axis/sign transform requires explicit approval before validation/transfer.', { transformBasis: match.transformBasis }));
    } else if (finite(match.identityConfidence, 0) < identityConfidenceThreshold) {
      status = 'IDENTITY_LOW_CONFIDENCE';
      rowDiagnostics.push(diagnostic('BLOCKER', 'IDENTITY_LOW_CONFIDENCE', 'Stable identity confidence is below policy.', { identityConfidence: match.identityConfidence }));
    } else if (fieldRows.some((row) => row.status !== 'OK')) {
      status = 'MISMATCH';
    }

    return Object.freeze({
      sourceUid: clean(match.sourceUid),
      targetUid: clean(match.targetUid),
      sourceStableKey: clean(match.sourceStableKey),
      targetStableKey: clean(match.targetStableKey),
      status,
      coordinateDeltaMm,
      identityConfidence: finite(match.identityConfidence, 0),
      transformBasis: clean(match.transformBasis),
      fieldRows: Object.freeze(fieldRows),
      diagnostics: Object.freeze(rowDiagnostics),
    });
  });

  const blockerCount = rows.filter((row) => BLOCKING_ROW_STATUSES.has(row.status)).length + diagnostics.filter((item) => item.severity === 'BLOCKER').length;
  return Object.freeze({
    schema: VALIDATION_MODEL_V2_SCHEMA,
    mode: compareFields.length ? 'approved-match-field-coordinate-validation' : 'approved-match-coordinate-validation',
    transformUsed: Object.freeze({ ...(approvedMatchSet?.transformPolicy || DEFAULT_TRANSFORM_POLICY) }),
    coordinateFramePolicy: 'block-non-comparable-coordinate-frames',
    numericTolerancePolicy: Object.freeze({ ...numericTolerancePolicy }),
    rows: Object.freeze(rows),
    diagnostics: Object.freeze([...diagnostics, ...rows.flatMap((row) => row.diagnostics || [])]),
    blockers: Object.freeze(rows.filter((row) => BLOCKING_ROW_STATUSES.has(row.status))),
    summary: Object.freeze({
      rowCount: rows.length,
      okCount: rows.filter((row) => row.status === 'OK').length,
      mismatchCount: rows.filter((row) => row.status !== 'OK').length,
      duplicateTargetClaimCount: rows.filter((row) => row.status === 'DUPLICATE_TARGET_CLAIM').length,
      blockerCount,
    }),
  });
}

export function createValidationAuditV2({ validationModel = null, approvedMatchSet = null } = {}) {
  return Object.freeze({
    schema: VALIDATION_AUDIT_V2_SCHEMA,
    approvedMatchSetHash: stableHash(approvedMatchSet || {}),
    validationModelHash: stableHash(validationModel || {}),
    mode: clean(validationModel?.mode),
    transformUsed: Object.freeze({ ...(validationModel?.transformUsed || {}) }),
    numericTolerancePolicy: Object.freeze({ ...(validationModel?.numericTolerancePolicy || {}) }),
    rows: cloneArray(validationModel?.rows || []),
    diagnostics: cloneArray(validationModel?.diagnostics || []),
    summary: Object.freeze({ ...(validationModel?.summary || {}) }),
  });
}

export function createApprovedTransferCases({ approvedMatchSet = null, validationModel = null, requestedBlocks = [] } = {}) {
  const validationByPair = new Map((validationModel?.rows || []).map((row) => [pairKey(row.sourceUid, row.targetUid), row]));
  const blocks = (Array.isArray(requestedBlocks) && requestedBlocks.length ? requestedBlocks : ['NodeNameBlock']).map(clean).filter(Boolean);
  const cases = [];
  for (const match of approvedMatchSet?.approvedMatches || []) {
    const row = validationByPair.get(pairKey(match.sourceUid, match.targetUid));
    for (const blockName of blocks) {
      cases.push(Object.freeze({
        schema: APPROVED_TRANSFER_CASE_SCHEMA,
        sourceNodeKey: clean(match.sourceStableKey || match.sourceUid),
        targetNodeKey: clean(match.targetStableKey || match.targetUid),
        sourceElementKey: clean(match.sourceElementKey || ''),
        targetElementKey: clean(match.targetElementKey || ''),
        sourceLineNo: clean(match.sourceLineNo || ''),
        targetLineNo: clean(match.targetLineNo || ''),
        blockName,
        approvalStatus: row?.status === 'OK' ? 'approved' : 'needs-review',
        identityConfidence: finite(match.identityConfidence, 0),
        coordinateDeltaMm: finite(row?.coordinateDeltaMm ?? match.coordinateDeltaMm, null),
        validationStatus: clean(row?.status || 'NOT_VALIDATED'),
        sourceEvidenceRef: clean(match.sourceUid),
        targetEvidenceRef: clean(match.targetUid),
        approvedAt: row?.status === 'OK' ? new Date(0).toISOString() : '',
      }));
    }
  }
  return Object.freeze(cases);
}

export function createTransferPlan({ approvedMatchSet = null, transferCases = [], scope = 'node', sourceText = '', targetText = '', workspaceRevision = 0 } = {}) {
  const approvedCases = (transferCases || []).filter((item) => item.approvalStatus === 'approved');
  const diagnostics = [];
  if (!approvedMatchSet?.approvedMatches?.length) diagnostics.push(diagnostic('BLOCKER', 'APPROVED_MATCH_SET_REQUIRED', 'Transfer requires an ApprovedMatchSet.v1.'));
  if (!approvedCases.length) diagnostics.push(diagnostic('BLOCKER', 'APPROVED_TRANSFER_CASE_REQUIRED', 'Transfer requires at least one approved transfer case.'));
  const base = Object.freeze({
    schema: TRANSFER_PLAN_SCHEMA,
    scope: clean(scope || 'node'),
    sourceHash: stableHash(sourceText),
    targetHash: stableHash(targetText),
    approvedMatchSetHash: stableHash(approvedMatchSet || {}),
    transferCases: Object.freeze(approvedCases),
    workspaceRevision: finite(workspaceRevision, 0),
    diagnostics: Object.freeze(diagnostics),
    resultTarget: 'target-only',
  });
  return Object.freeze({ ...base, transferPlanHash: stableHash(base), ok: diagnostics.length === 0 });
}

export function createTransferStage({ plan = null, workspaceRevision = 0 } = {}) {
  return Object.freeze({
    scope: clean(plan?.scope || 'node'),
    plan,
    sourceHash: clean(plan?.sourceHash),
    targetHash: clean(plan?.targetHash),
    planHash: clean(plan?.transferPlanHash),
    workspaceRevision: finite(workspaceRevision, finite(plan?.workspaceRevision, 0)),
    createdAt: new Date(0).toISOString(),
  });
}

export function validateTransferStage({ stage = null, sourceText = '', targetText = '', plan = null, workspaceRevision = 0 } = {}) {
  const diagnostics = [];
  if (!stage?.plan) diagnostics.push(diagnostic('BLOCKER', 'TRANSFER_STAGE_MISSING', 'Stage Transfer before applying.'));
  if (stage?.sourceHash && stage.sourceHash !== stableHash(sourceText)) diagnostics.push(diagnostic('BLOCKER', 'BLOCKED_STALE_STAGE_SOURCE', 'Source XML changed after transfer stage.'));
  if (stage?.targetHash && stage.targetHash !== stableHash(targetText)) diagnostics.push(diagnostic('BLOCKER', 'BLOCKED_STALE_STAGE_TARGET', 'Target XML changed after transfer stage.'));
  if (stage?.planHash && plan && stage.planHash !== stableHash({ ...plan, transferPlanHash: undefined })) diagnostics.push(diagnostic('BLOCKER', 'BLOCKED_STALE_STAGE_PLAN', 'Transfer plan changed after staging.'));
  if (finite(stage?.workspaceRevision, 0) !== finite(workspaceRevision, 0)) diagnostics.push(diagnostic('BLOCKER', 'BLOCKED_STALE_STAGE_WORKSPACE', 'Workspace revision changed after transfer stage.'));
  return Object.freeze({ ok: diagnostics.length === 0, diagnostics: Object.freeze(diagnostics) });
}

export function createTransferPatchAudit({ transferPlan = null, result = null, diagnostics = [] } = {}) {
  const changedBlocks = result?.changedBlocks || result?.audit?.filter?.((row) => row.status === 'updated') || [];
  const skippedBlocks = result?.skippedBlocks || result?.audit?.filter?.((row) => row.status === 'skipped') || [];
  const allDiagnostics = [...(diagnostics || []), ...(transferPlan?.diagnostics || [])];
  return Object.freeze({
    schema: TRANSFER_PATCH_AUDIT_SCHEMA,
    sourceHash: clean(transferPlan?.sourceHash),
    targetHash: clean(transferPlan?.targetHash),
    resultHash: stableHash(result?.xml || result || ''),
    approvedMatchSetHash: clean(transferPlan?.approvedMatchSetHash),
    transferPlanHash: clean(transferPlan?.transferPlanHash),
    transferCases: cloneArray(transferPlan?.transferCases || []),
    changedBlocks: cloneArray(changedBlocks),
    skippedBlocks: cloneArray(skippedBlocks),
    blockerCount: allDiagnostics.filter((item) => item.severity === 'BLOCKER').length,
    warningCount: allDiagnostics.filter((item) => item.severity === 'WARNING').length,
    diagnostics: Object.freeze(allDiagnostics),
    resultOk: Boolean(result?.ok || result?.xml),
  });
}

export function createPostTransferValidation({ transferAudit = null } = {}) {
  const blockers = (transferAudit?.diagnostics || []).filter((item) => item.severity === 'BLOCKER');
  return Object.freeze({
    schema: POST_TRANSFER_VALIDATION_SCHEMA,
    resultOk: Boolean(transferAudit?.resultOk) && blockers.length === 0,
    blockerCount: blockers.length,
    diagnostics: cloneArray(transferAudit?.diagnostics || []),
  });
}

export function orchestrateValidationTransferPhase({
  sourceReadiness = null,
  targetReadiness = null,
  sourceGraph = null,
  targetGraph = null,
  sourceRecords = [],
  targetRecords = [],
  candidates = [],
  decisions = [],
  transformPolicy = null,
  compareFields = [],
  requestedBlocks = [],
  sourceText = '',
  targetText = '',
  workspaceRevision = 0,
} = {}) {
  const readinessDiagnostics = [];
  if (sourceReadiness && sourceReadiness.readyForConnector === false) readinessDiagnostics.push(diagnostic('BLOCKER', 'SOURCE_NOT_READY_FOR_CONNECTOR', 'Source readiness audit failed.'));
  if (targetReadiness && targetReadiness.readyForConnector === false) readinessDiagnostics.push(diagnostic('BLOCKER', 'TARGET_NOT_READY_FOR_CONNECTOR', 'Target readiness audit failed.'));

  const policy = createTransformPolicy(transformPolicy || {});
  const candidateSet = createMatchCandidateSet({ sourceId: sourceReadiness?.sourceId || 'source', targetId: targetReadiness?.sourceId || 'target', candidates, transformPolicy: policy });
  const approvedMatchSet = createApprovedMatchSet({ sourceGraph, targetGraph, decisions, candidateSet, transformPolicy: policy });
  const validationModel = createValidationModelV2({ sourceRecords, targetRecords, approvedMatchSet, compareFields });
  const transferCases = createApprovedTransferCases({ approvedMatchSet, validationModel, requestedBlocks });
  const transferPlan = createTransferPlan({ approvedMatchSet, transferCases, scope: 'node', sourceText, targetText, workspaceRevision });
  const transferStage = createTransferStage({ plan: transferPlan, workspaceRevision });
  const transferAudit = createTransferPatchAudit({ transferPlan, diagnostics: readinessDiagnostics });
  const postTransferValidation = createPostTransferValidation({ transferAudit });

  return Object.freeze({
    schema: XML_COMPARE_PHASE2_ORCHESTRATOR_SCHEMA,
    readinessGateOk: readinessDiagnostics.length === 0,
    candidateSet,
    approvedMatchSet,
    validationModel,
    transferCases,
    transferPlan,
    transferStage,
    transferAudit,
    postTransferValidation,
    diagnostics: Object.freeze(readinessDiagnostics),
    summary: Object.freeze({
      candidateCount: candidateSet.summary.candidateCount,
      approvedMatchCount: approvedMatchSet.summary.approvedCount,
      validationBlockerCount: validationModel.summary.blockerCount,
      approvedTransferCaseCount: transferCases.filter((item) => item.approvalStatus === 'approved').length,
      transferReady: transferPlan.ok,
    }),
  });
}

export const _test = Object.freeze({
  toleranceBucket,
  bucketRank,
  ambiguousPairSet,
  conflictPairSet,
  fieldValidationRows,
  coordinateFrameComparable,
  pairKey,
});

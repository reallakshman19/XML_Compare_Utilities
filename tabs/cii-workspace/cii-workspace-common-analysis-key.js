import { deepFreeze, stableStringify } from './cii-workspace-contracts.js';
import { ciiSha256 } from './cii-workspace-v11-v14-converter.js';

export const CII_COMMON_ANALYSIS_AUTHORITY_KEY_SCHEMA = 'CIIWorkspaceCommonAnalysisAuthorityKey.v1';

const ANALYSIS_OPTION_KEYS = Object.freeze([
  'axisLabelSnapDeg',
  'candidateLimit',
  'candidatePassingScore',
  'diameterToleranceMm',
  'engineeringGeometryToleranceMm',
  'engineeringMassTolerance',
  'engineeringNumericTolerance',
  'highConfidenceScore',
  'independentAxisAngleDeg',
  'lengthToleranceMm',
  'maxRunElements',
  'nonCollinearSinTolerance',
  'odToleranceFactor',
  'pathLengthToleranceMm',
  'registrationProbePoints',
  'runCollinearAngleDeg',
  'subdivisionMinStraightness',
  'subdivisionStraightnessTolerance',
  'wallToleranceMm',
  'winnerGap',
]);

function text(value) { return String(value ?? '').trim(); }
function sha(value, label) {
  const normalized = text(value).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error(`CII_COMMON_ANALYSIS_KEY_${label}_SHA256_REQUIRED`);
  return normalized;
}
function numberValue(value) {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}
function canonicalPoint(value) {
  if (!value || typeof value !== 'object') return value;
  const point = {};
  for (const key of ['x', 'y', 'z']) {
    const parsed = Number(value[key]);
    if (Number.isFinite(parsed)) point[key] = parsed;
  }
  return point;
}
function pointOrder(left, right) {
  return Number(left?.x || 0) - Number(right?.x || 0)
    || Number(left?.y || 0) - Number(right?.y || 0)
    || Number(left?.z || 0) - Number(right?.z || 0);
}
function canonicalProbePoints(rows) {
  return (rows || []).map(canonicalPoint).sort(pointOrder);
}
function pair(value) {
  const sourceNodeId = text(value?.sourceNodeId);
  const targetNodeId = text(value?.targetNodeId);
  if (!sourceNodeId || !targetNodeId) throw new Error('CII_COMMON_ANALYSIS_KEY_ANCHOR_PAIR_REQUIRED');
  return Object.freeze({ sourceNodeId, targetNodeId });
}
function pairToken(value) { return `${value.sourceNodeId}=>${value.targetNodeId}`; }
function canonicalPairs(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const item = pair(row);
    map.set(pairToken(item), item);
  }
  return Object.freeze([...map.values()].sort((a, b) => pairToken(a).localeCompare(pairToken(b), undefined, { numeric: true })));
}
function normalizedMethod(value) {
  const method = text(value).toUpperCase();
  if (['A', 'METHOD_A', 'METHOD_A_SPATIAL'].includes(method)) return 'METHOD_A_SPATIAL';
  if (['B', 'METHOD_B', 'METHOD_B_NETWORK'].includes(method)) return 'METHOD_B_NETWORK';
  if (method === 'METHOD_A_AND_B') return 'METHOD_A_AND_B';
  return method;
}
function canonicalLoop(loop, index) {
  const method = normalizedMethod(loop?.method);
  if (!method) throw new Error(`CII_COMMON_ANALYSIS_KEY_LOOP_METHOD_REQUIRED:${index}`);
  const baseId = text(loop?.baseId || `BASE_${index + 1}`);
  return Object.freeze({
    method,
    baseId,
    anchorPairs: canonicalPairs(loop?.anchorPairs || (loop?.sourceNodeId != null && loop?.targetNodeId != null ? [loop] : [])),
    probePoints: Object.freeze(canonicalProbePoints(loop?.probePoints || [])),
  });
}
function canonicalLoops(rows) {
  return Object.freeze((rows || []).map(canonicalLoop)
    .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b), undefined, { numeric: true })));
}
function canonicalAuthority(input = {}) {
  if (Array.isArray(input?.baseLoops)) {
    return Object.freeze({
      mode: 'EXPLICIT_BASE_LOOPS',
      loops: canonicalLoops(input.baseLoops),
    });
  }
  const anchorPairs = canonicalPairs(input?.anchorPairs || []);
  const independent = text(input?.anchorPairMode).toUpperCase() === 'INDEPENDENT_SEEDS';
  return Object.freeze({
    mode: independent ? 'INDEPENDENT_MANUAL_SEEDS' : 'LEGACY_ANCHOR_PAIRS',
    anchorPairs,
  });
}

export function ciiCommonAnalysisOptions(options = {}) {
  const result = {};
  for (const key of ANALYSIS_OPTION_KEYS) {
    if (options?.[key] == null) continue;
    result[key] = key === 'registrationProbePoints'
      ? canonicalProbePoints(options[key])
      : numberValue(options[key]);
  }
  return deepFreeze(result);
}

function preparedMember(preparedSession, sourceIdValue) {
  if (preparedSession?.schema !== 'CIIWorkspacePreparedSourceSetSession.v1'
    || preparedSession?.status !== 'PREPARED') {
    throw new Error('CII_COMMON_ANALYSIS_KEY_PREPARED_SESSION_REQUIRED');
  }
  const sourceId = text(sourceIdValue);
  if (!sourceId) throw new Error('CII_COMMON_ANALYSIS_KEY_SOURCE_ID_REQUIRED');
  const rows = (preparedSession.members || []).filter((member) => text(member?.sourceId) === sourceId);
  if (rows.length !== 1) throw new Error(`CII_COMMON_ANALYSIS_KEY_SOURCE_MEMBER_REQUIRED:${sourceId}`);
  return rows[0];
}
function custody(preparedSession, sourceIdValue) {
  const member = preparedMember(preparedSession, sourceIdValue);
  const target = preparedSession.target;
  if (!target) throw new Error('CII_COMMON_ANALYSIS_KEY_TARGET_CUSTODY_REQUIRED');
  return Object.freeze({
    sourceSetSha256: sha(preparedSession.sourceSetSha256, 'SOURCE_SET'),
    source: Object.freeze({
      sourceId: text(member.sourceId),
      fileName: text(member.fileName),
      originalVersion: Number(member.originalVersion),
      normalizedVersion: Number(member.normalizedVersion),
      originalSha256: sha(member.originalSha256, 'SOURCE_ORIGINAL'),
      normalizedSha256: sha(member.normalizedSha256, 'SOURCE_NORMALIZED'),
      baselineCanonicalSha256: sha(member.baselineCanonicalSha256, 'SOURCE_BASELINE_CANONICAL'),
    }),
    target: Object.freeze({
      fileName: text(target.fileName),
      originalVersion: Number(target.originalVersion),
      normalizedVersion: Number(target.normalizedVersion),
      originalSha256: sha(target.originalSha256, 'TARGET_ORIGINAL'),
      normalizedSha256: sha(target.normalizedSha256, 'TARGET_NORMALIZED'),
      baselineCanonicalSha256: sha(target.baselineCanonicalSha256, 'TARGET_BASELINE_CANONICAL'),
    }),
    conversionSource: preparedSession.versionBridge?.conversionSource || null,
  });
}

export function canonicalCiiCommonAnalysisAuthorityPreimage({
  preparedSession,
  sourceId,
  input = {},
  options = {},
} = {}) {
  return stableStringify({
    schema: CII_COMMON_ANALYSIS_AUTHORITY_KEY_SCHEMA,
    custody: custody(preparedSession, sourceId),
    authority: canonicalAuthority(input),
    analysisOptions: ciiCommonAnalysisOptions(options),
  });
}

export async function ciiCommonAnalysisAuthorityKey(args = {}, cryptoRef = globalThis.crypto) {
  const preimage = canonicalCiiCommonAnalysisAuthorityPreimage(args);
  const digest = await ciiSha256(preimage, cryptoRef);
  return `cii-common-analysis-v1:${digest}`;
}

export const _test = Object.freeze({
  ANALYSIS_OPTION_KEYS,
  canonicalAuthority,
  canonicalLoops,
  canonicalPairs,
  canonicalProbePoints,
  normalizedMethod,
  custody,
});

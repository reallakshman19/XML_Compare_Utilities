import { deepFreeze, stableId, stableStringify } from './cii-workspace-contracts.js';
import { ciiWorkspaceArtifactBundle } from './cii-workspace-export.js';
import {
  CII_PREPARED_SOURCE_SET_SESSION_SCHEMA,
  CII_SOURCE_SET_SCHEMA,
  ciiSourceSetSha256,
} from './cii-workspace-source-set.js';
import { createCiiWorkspacePreviewWithVersionBridge } from './cii-workspace-writer-version-bridge.js';
import {
  createCiiWorkspaceCommonAnalysis,
  projectCiiWorkspacePreviewFromCommonAnalysis,
} from './cii-workspace-core.js';
import {
  canonicalCiiPreparedCommonAnalysisCustody,
  ciiCommonAnalysisAuthorityKey,
} from './cii-workspace-common-analysis-key.js';

export const CII_MS_REVIEW_ONLY_SCHEMA = 'CIIWorkspaceMultiSourceReviewOnlyPreview.v1';
export const CII_MS_REVIEW_ONLY_WRITE_BLOCKER = 'CII_MS_REVIEW_ONLY_WRITE_AUTHORITY_REQUIRED';

function text(value) { return String(value ?? '').trim(); }
function sourceRows(input) {
  const rows = Array.isArray(input?.sources) ? input.sources : [];
  if (rows.length < 2) throw new Error('CII_MS_REVIEW_ONLY_TWO_OR_MORE_SOURCES_REQUIRED');
  const ids = rows.map((row, index) => text(row?.sourceId || `S${index + 1}`));
  if (ids.some((id) => !id)) throw new Error('CII_MS_REVIEW_ONLY_SOURCE_ID_REQUIRED');
  if (new Set(ids).size !== ids.length) throw new Error('CII_MS_REVIEW_ONLY_DUPLICATE_SOURCE_ID');
  return rows;
}
function sourceId(source, index) { return text(source?.sourceId || `S${index + 1}`); }
function sourceFileName(source, index) { return text(source?.fileName || `${sourceId(source, index)}.CII`); }
function targetBytes(input) { return input?.targetBytes ?? input?.targetText; }
function memberBaseLoops(input, source, id) { return source?.baseLoops || input?.baseLoopsBySource?.[id] || undefined; }
function memberAnchorPairs(input, source, id) { return source?.anchorPairs || input?.anchorPairsBySource?.[id] || undefined; }
function memberReview(input, id) { return input?.reviewBySource?.[id] || input?.reviews?.[id] || undefined; }
function prefixedId(kind, sourceIdValue, id) { return stableId(kind, sourceIdValue, text(id)); }

function targetCustodyKey(preview) {
  const target = preview?.versionBridge?.target;
  return [target?.originalVersion, target?.originalSha256, target?.normalizedSha256, target?.baselineCanonicalSha256].join('|');
}
function assertSameTarget(memberPreviews) {
  const keys = new Set(memberPreviews.map(({ preview }) => targetCustodyKey(preview)));
  if (keys.size !== 1 || [...keys][0].includes('undefined')) throw new Error('CII_MS_REVIEW_ONLY_TARGET_CUSTODY_MISMATCH');
}
function prefixCorrespondenceRow(row, sourceIdValue) {
  const memberCorrespondenceId = text(row?.correspondenceId);
  return deepFreeze({
    ...row,
    sourceId: sourceIdValue,
    memberCorrespondenceId,
    correspondenceId: prefixedId('ms-corr', sourceIdValue, memberCorrespondenceId),
  });
}
function memberCorrespondence(sourceIdValue, preview) {
  const correspondence = preview?.correspondence || {};
  return deepFreeze({
    sourceId: sourceIdValue,
    memberStatus: correspondence.status || 'UNRESOLVED',
    memberBlockers: deepFreeze([...(correspondence.blockers || [])]),
    nodeRows: deepFreeze((correspondence.nodeRows || []).map((row) => prefixCorrespondenceRow(row, sourceIdValue))),
    elementRows: deepFreeze((correspondence.elementRows || []).map((row) => prefixCorrespondenceRow(row, sourceIdValue))),
    componentRows: deepFreeze((correspondence.componentRows || []).map((row) => prefixCorrespondenceRow(row, sourceIdValue))),
    memberCorrespondenceIdentity: text(correspondence.correspondenceIdentity),
  });
}
function combinedCorrespondence(sourceSetSha256, members) {
  const blocked = members.filter((item) => !['READY', 'LOCKED'].includes(item.memberStatus));
  const blockers = blocked.flatMap((item) => item.memberBlockers.map((blocker) => `${item.sourceId}:${blocker}`));
  const nodeRows = members.flatMap((item) => item.nodeRows);
  const elementRows = members.flatMap((item) => item.elementRows);
  const componentRows = members.flatMap((item) => item.componentRows);
  return deepFreeze({
    schema: 'CIIWorkspaceMultiSourceCorrespondence.v1',
    status: blocked.length ? 'UNRESOLVED' : 'READY',
    authority: 'PER_SOURCE_EXISTING_CORRESPONDENCE_REVIEW_ONLY',
    sourceSetSha256,
    memberCount: members.length,
    members: deepFreeze(members),
    blockers: deepFreeze([...new Set(blockers)]),
    conflicts: deepFreeze([]),
    targetCustodyConflicts: deepFreeze([]),
    nodeRows: deepFreeze(nodeRows),
    elementRows: deepFreeze(elementRows),
    componentRows: deepFreeze(componentRows),
    correspondenceIdentity: stableId('ms-review-only-correspondence', sourceSetSha256,
      members.map((item) => `${item.sourceId}:${item.memberCorrespondenceIdentity}`).join('|')),
  });
}
function prefixedReviewIds(values, sourceIdValue) {
  return deepFreeze((values || []).map((id) => prefixedId('ms-corr', sourceIdValue, id)));
}
function combinedReview(memberPreviews) {
  return deepFreeze({
    reviewedCorrespondenceIds: deepFreeze(memberPreviews.flatMap(({ sourceId: id, preview }) => [...prefixedReviewIds(preview?.review?.reviewedCorrespondenceIds, id)])),
    lockedCorrespondenceIds: deepFreeze(memberPreviews.flatMap(({ sourceId: id, preview }) => [...prefixedReviewIds(preview?.review?.lockedCorrespondenceIds, id)])),
    rejectedCorrespondenceIds: deepFreeze(memberPreviews.flatMap(({ sourceId: id, preview }) => [...prefixedReviewIds(preview?.review?.rejectedCorrespondenceIds, id)])),
  });
}
function prefixDelta(row, sourceIdValue) {
  const memberCorrespondenceId = text(row?.correspondenceId);
  const memberEngineeringDeltaId = text(row?.deltaId);
  return deepFreeze({
    ...row,
    sourceId: sourceIdValue,
    memberCorrespondenceId,
    memberEngineeringDeltaId,
    correspondenceId: prefixedId('ms-corr', sourceIdValue, memberCorrespondenceId),
    deltaId: prefixedId('ms-delta', sourceIdValue, memberEngineeringDeltaId),
  });
}
function combinedEngineeringDeltas(memberPreviews) {
  const rows = memberPreviews.flatMap(({ sourceId: id, preview }) => (preview?.engineeringDeltas?.rows || []).map((row) => prefixDelta(row, id)));
  const changedRows = rows.filter((row) => row.changed);
  const categories = {};
  for (const row of changedRows) categories[row.category] = (categories[row.category] || 0) + 1;
  return deepFreeze({
    schema: 'CIIWorkspaceEngineeringDeltaSet.v1',
    authority: 'PER_SOURCE_ENGINEERING_DELTA_AGGREGATION_REVIEW_ONLY',
    rows: deepFreeze(rows),
    changedRows: deepFreeze(changedRows),
    limitations: deepFreeze([CII_MS_REVIEW_ONLY_WRITE_BLOCKER]),
    summary: deepFreeze({ engineeringChangeCount: changedRows.length, changeFamilyCounts: deepFreeze(categories) }),
  });
}
function prefixCompareRow(row, sourceIdValue) {
  const memberCorrespondenceId = text(row?.correspondenceId);
  return deepFreeze({
    ...row,
    sourceId: sourceIdValue,
    memberCorrespondenceId,
    correspondenceId: prefixedId('ms-corr', sourceIdValue, memberCorrespondenceId),
  });
}
function combinedCompareReview(memberPreviews, engineeringDeltas) {
  const rows = memberPreviews.flatMap(({ sourceId: id, preview }) => (preview?.compareReview?.rows || []).map((row) => prefixCompareRow(row, id)));
  return deepFreeze({
    schema: 'CIIWorkspaceCompareReview.v1',
    rows: deepFreeze(rows),
    summary: deepFreeze({
      correspondence: deepFreeze({ total: rows.length, matched: rows.filter((row) => row.identityBound).length }),
      review: deepFreeze({
        accepted: rows.filter((row) => row.decision === 'ACCEPTED').length,
        locked: rows.filter((row) => row.decision === 'LOCKED').length,
        rejected: rows.filter((row) => row.decision === 'REJECTED').length,
        pending: rows.filter((row) => row.decision === 'REVIEW').length,
      }),
      engineering: engineeringDeltas.summary,
    }),
  });
}
function sourceSetMembers(sources, memberPreviews) {
  return deepFreeze(memberPreviews.map(({ sourceId: id, preview }, index) => {
    const bridge = preview?.versionBridge?.source || {};
    if (!bridge.originalSha256 || !bridge.normalizedSha256) throw new Error(`CII_MS_REVIEW_ONLY_SOURCE_BRIDGE_EVIDENCE_REQUIRED:${id}`);
    return deepFreeze({
      sourceId: id,
      fileName: sourceFileName(sources[index], index),
      originalVersion: bridge.originalVersion,
      normalizedVersion: bridge.normalizedVersion,
      originalSha256: bridge.originalSha256,
      normalizedSha256: bridge.normalizedSha256,
      normalizationStatus: 'PASS_BRIDGE_EVIDENCE',
      baselineCanonicalSha256: bridge.baselineCanonicalSha256,
      exactBaselineRoundTrip: bridge.exactBaselineRoundTrip,
    });
  }));
}
function targetAuthorityFrom(preview) {
  const target = preview?.versionBridge?.target || {};
  return deepFreeze({
    kind: 'ORIGINAL_TARGET',
    originalSha256: target.originalSha256,
    originalVersion: target.originalVersion,
    normalizedSha256: target.normalizedSha256,
    baselineCanonicalSha256: target.baselineCanonicalSha256,
  });
}
function reviewOnlyTransferPlan(sourceSet, targetDocument, targetAuthority) {
  return deepFreeze({
    schema: 'CIIWorkspaceTransferPlan.v1',
    direction: 'SOURCE_TO_TARGET',
    inputAuthority: 'MULTISOURCE_ENGINEERING_DELTA_SET_REVIEW_ONLY',
    mutationAuthority: 'BLOCKED',
    sourceAuthorityKind: 'SOURCE_SET',
    sourceSetSha256: sourceSet.sourceSetSha256,
    sourceAuthority: deepFreeze({ kind: 'SOURCE_SET', sourceSetSha256: sourceSet.sourceSetSha256, members: sourceSet.members }),
    targetAuthorityKind: 'ORIGINAL_TARGET',
    targetAuthority,
    targetDocument: deepFreeze({ fileName: targetDocument?.fileName || '', contentSha256: targetDocument?.contentSha256 || '' }),
    operations: deepFreeze([]),
    excludedOperations: deepFreeze([]),
    conflicts: deepFreeze([]),
    status: 'BLOCKED',
    blockers: deepFreeze([CII_MS_REVIEW_ONLY_WRITE_BLOCKER]),
    policy: deepFreeze({
      review: 'MULTISOURCE_CORRESPONDENCE_AND_ENGINEERING_DELTA_ONLY',
      writer2Mutation: 'EXACT_RETAINED_BM001_AUTHORITY_REQUIRED',
      topologyMutation: 'BLOCKED_WRITER_3_ONLY',
    }),
    summary: deepFreeze({ operationCount: 0, previewReadyCount: 0, blockedCount: 0, protectedCount: 0, byAction: deepFreeze({}) }),
  });
}
function reviewOnlyVersionBridge(sourceSet, memberPreviews) {
  const first = memberPreviews[0]?.preview?.versionBridge || {};
  return deepFreeze({
    schema: 'CIIWorkspaceWriterVersionBridge.v2',
    mode: 'MULTI_SOURCE_SET_REVIEW_ONLY_V14_VIA_V11',
    sourceAuthorityKind: 'SOURCE_SET',
    sourceSetSha256: sourceSet.sourceSetSha256,
    sourceSet: deepFreeze({ sourceSetSha256: sourceSet.sourceSetSha256, members: sourceSet.members }),
    target: first.target,
    conversionSource: first.conversionSource,
    v14WritePolicy: 'REVIEW_ONLY_NO_WRITE_AUTHORITY',
  });
}

async function buildReviewOnlyResult(input, sources, memberPreviews, options = {}) {
  assertSameTarget(memberPreviews);
  const members = sourceSetMembers(sources, memberPreviews);
  const sourceSetSha256 = await ciiSourceSetSha256(members, options.cryptoRef);
  const sourceSet = deepFreeze({
    schema: CII_SOURCE_SET_SCHEMA,
    status: 'CUSTODY_READY',
    authority: 'INDEPENDENT_SOURCE_MEMBERS',
    mode: 'V11_V14_BRIDGE_MEMBER_CUSTODY_REVIEW_ONLY',
    memberCount: members.length,
    sourceSetSha256,
    members,
  });
  const memberCorrespondences = memberPreviews.map(({ sourceId: id, preview }) => memberCorrespondence(id, preview));
  const correspondence = combinedCorrespondence(sourceSetSha256, memberCorrespondences);
  const review = combinedReview(memberPreviews);
  const engineeringDeltas = combinedEngineeringDeltas(memberPreviews);
  const compareReview = combinedCompareReview(memberPreviews, engineeringDeltas);
  const targetDocument = memberPreviews[0]?.preview?.targetDocument || {};
  const targetAuthority = targetAuthorityFrom(memberPreviews[0]?.preview);
  const transferPlan = reviewOnlyTransferPlan(sourceSet, targetDocument, targetAuthority);
  const writerReadiness = deepFreeze({ ready: false, status: 'BLOCKED', blockers: deepFreeze([CII_MS_REVIEW_ONLY_WRITE_BLOCKER]) });
  const versionBridge = reviewOnlyVersionBridge(sourceSet, memberPreviews);
  const audit = deepFreeze({
    schema: 'CIIWorkspaceAudit.v1',
    direction: 'SOURCE_SET_TO_TARGET_REVIEW_ONLY',
    writerVersion: '2',
    mode: 'REVIEW_ONLY',
    sourceSet,
    target: deepFreeze({ fileName: targetDocument.fileName || input?.targetFileName || 'TARGET.CII', originalSha256: targetAuthority.originalSha256 }),
    correspondence,
    review,
    engineeringDeltas,
    compareReview,
    transferPreview: transferPlan,
    writerReadiness,
    versionBridge,
  });
  const result = {
    schema: CII_MS_REVIEW_ONLY_SCHEMA,
    mode: 'REVIEW_ONLY',
    writerVersion: '2',
    sourceSet,
    sourceSetSha256,
    memberPreviews: deepFreeze(memberPreviews),
    targetDocument,
    targetAuthority,
    correspondence,
    review,
    engineeringDeltas,
    compareReview,
    transferPlan,
    writerReadiness,
    versionBridge,
    audit,
  };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return deepFreeze(result);
}

function preparedReviewOnlyMembers(preparedSession) {
  if (preparedSession?.schema !== CII_PREPARED_SOURCE_SET_SESSION_SCHEMA || preparedSession?.status !== 'PREPARED') {
    throw new Error('CII_MS_REVIEW_ONLY_PREPARED_SESSION_REQUIRED');
  }
  const members = preparedSession.members || [];
  if (members.length < 2) throw new Error('CII_MS_REVIEW_ONLY_PREPARED_TWO_OR_MORE_SOURCES_REQUIRED');
  const ids = members.map((member) => text(member?.sourceId));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error('CII_MS_REVIEW_ONLY_PREPARED_SOURCE_ID_CUSTODY_INVALID');
  }
  return members;
}
function preparedReviewOnlyInput(input, id) {
  const baseLoops = input?.baseLoopsBySource?.[id];
  const anchorPairs = input?.anchorPairsBySource?.[id];
  const review = memberReview(input, id);
  return {
    ...(baseLoops ? { baseLoops } : {}),
    ...(anchorPairs ? { anchorPairs, anchorPairMode: 'INDEPENDENT_SEEDS' } : {}),
    ...(review ? { review } : {}),
  };
}
function preparedReviewOnlyModels(preparedSession, member) {
  const target = preparedSession?.target;
  if (!member?.sourceDocument || !member?.sourceGraph || !target?.targetDocument || !target?.targetGraph) {
    throw new Error(`CII_MS_REVIEW_ONLY_PREPARED_MODELS_REQUIRED:${text(member?.sourceId)}`);
  }
  if (member.sourceDocument.contentSha256 !== member.normalizedSha256) {
    throw new Error(`CII_MS_REVIEW_ONLY_PREPARED_SOURCE_HASH_MISMATCH:${text(member?.sourceId)}`);
  }
  if (target.targetDocument.contentSha256 !== target.normalizedSha256) {
    throw new Error('CII_MS_REVIEW_ONLY_PREPARED_TARGET_HASH_MISMATCH');
  }
  return {
    sourceDocument: member.sourceDocument,
    sourceGraph: member.sourceGraph,
    targetDocument: target.targetDocument,
    targetGraph: target.targetGraph,
  };
}
function preparedReviewOnlyVersionBridge(preparedSession, member) {
  const source = member?.bridge;
  const target = preparedSession?.target?.bridge;
  const shared = preparedSession?.versionBridge;
  if (!source?.originalSha256 || !source?.normalizedSha256 || !target?.originalSha256 || !target?.normalizedSha256) {
    throw new Error(`CII_MS_REVIEW_ONLY_PREPARED_BRIDGE_REQUIRED:${text(member?.sourceId)}`);
  }
  if (!shared?.conversionSource || !shared?.v14WritePolicy) {
    throw new Error('CII_MS_REVIEW_ONLY_PREPARED_BRIDGE_POLICY_REQUIRED');
  }
  const mode = target?.writer2Shadow?.enabled
    ? 'V14_TARGET_SHADOW_CHANGE_ISOLATED_VIA_V11'
    : (Number(source.originalVersion) === 11 && Number(target.originalVersion) === 11
      ? 'DIRECT_V11' : 'CHANGE_ISOLATED_V14_VIA_V11');
  return deepFreeze({
    schema: 'CIIWorkspaceWriterVersionBridge.v2',
    mode,
    source,
    target,
    conversionSource: shared.conversionSource,
    v14WritePolicy: shared.v14WritePolicy,
  });
}
function attachPreparedReviewOnlyBridge(preview, versionBridge) {
  const audit = deepFreeze({ ...(preview?.audit || {}), versionBridge });
  const result = { ...preview, versionBridge, audit };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return deepFreeze(result);
}
function reviewOnlyAnalysisOptions(options = {}) {
  const { commonAnalysisCache: _cache, previewFactory: _factory, ...analysisOptions } = options || {};
  return analysisOptions;
}
function reviewOnlyCache(options = {}) {
  const cache = options?.commonAnalysisCache;
  if (cache == null) return null;
  if (cache?.schema !== 'CIIWorkspaceCommonAnalysisCache.v1' || !(cache.entries instanceof Map)) {
    throw new Error('CII_MS_REVIEW_ONLY_COMMON_ANALYSIS_CACHE_REQUIRED');
  }
  if (cache.sessionIdentity == null && cache.entries.size) {
    throw new Error('CII_MS_REVIEW_ONLY_COMMON_ANALYSIS_CACHE_STATE_INVALID');
  }
  return cache;
}
function reviewOnlySessionIdentity(preparedSession) {
  const ids = (preparedSession?.members || []).map((member) => text(member?.sourceId)).filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!ids.length) throw new Error('CII_MS_REVIEW_ONLY_PREPARED_SOURCE_MEMBER_REQUIRED');
  return stableStringify(canonicalCiiPreparedCommonAnalysisCustody(preparedSession, ids[0]));
}
function ensureReviewOnlyCacheSession(cache, identity, instrumentation) {
  if (!cache) return;
  if (cache.sessionIdentity == null) {
    cache.sessionIdentity = identity;
    return;
  }
  if (cache.sessionIdentity === identity) return;
  cache.entries.clear();
  cache.sessionIdentity = identity;
  instrumentation?.record?.('CII_COMMON_ANALYSIS_CACHE_RESET', 1);
}
async function reviewOnlyCommonAnalysis(preparedSession, member, payload, options, cache, sessionIdentity) {
  const analysisOptions = reviewOnlyAnalysisOptions(options);
  if (!cache) {
    return createCiiWorkspaceCommonAnalysis(
      payload,
      analysisOptions,
      preparedReviewOnlyModels(preparedSession, member),
    );
  }
  ensureReviewOnlyCacheSession(cache, sessionIdentity, analysisOptions.instrumentation);
  const id = text(member?.sourceId);
  const key = await ciiCommonAnalysisAuthorityKey({
    preparedSession,
    sourceId: id,
    input: payload,
    options: analysisOptions,
  }, analysisOptions.cryptoRef);
  const existing = cache.entries.get(id);
  if (existing?.key === key && existing?.commonAnalysis) {
    analysisOptions.instrumentation?.record?.('CII_COMMON_ANALYSIS_CACHE_HIT', 1);
    return existing.commonAnalysis;
  }
  analysisOptions.instrumentation?.record?.('CII_COMMON_ANALYSIS_CACHE_MISS', 1);
  const common = await createCiiWorkspaceCommonAnalysis(
    payload,
    analysisOptions,
    preparedReviewOnlyModels(preparedSession, member),
  );
  cache.entries.set(id, { key, commonAnalysis: common });
  return common;
}

export async function createCiiMultiSourceReviewOnlyPreviewFromPreparedSession(preparedSession, input = {}, options = {}) {
  const members = preparedReviewOnlyMembers(preparedSession);
  const cache = reviewOnlyCache(options);
  const sessionIdentity = cache ? reviewOnlySessionIdentity(preparedSession) : null;
  ensureReviewOnlyCacheSession(cache, sessionIdentity, options.instrumentation);
  const memberPreviews = [];
  for (const member of members) {
    const id = text(member?.sourceId);
    const payload = preparedReviewOnlyInput(input, id);
    const common = await reviewOnlyCommonAnalysis(preparedSession, member, payload, options, cache, sessionIdentity);
    const versionBridge = preparedReviewOnlyVersionBridge(preparedSession, member);
    const preview = attachPreparedReviewOnlyBridge(
      projectCiiWorkspacePreviewFromCommonAnalysis(
        common,
        payload,
        { ...reviewOnlyAnalysisOptions(options), writerVersion: '2' },
      ),
      versionBridge,
    );
    memberPreviews.push(deepFreeze({ sourceId: id, preview }));
  }
  const sources = members.map((member) => ({
    sourceId: text(member?.sourceId),
    fileName: text(member?.fileName),
  }));
  return buildReviewOnlyResult(input, sources, memberPreviews, reviewOnlyAnalysisOptions(options));
}

export async function createCiiMultiSourceReviewOnlyPreviewWithVersionBridge(input, options = {}) {
  const sources = sourceRows(input);
  if (targetBytes(input) == null) throw new Error('CII_MS_REVIEW_ONLY_TARGET_REQUIRED');
  const previewFactory = options.previewFactory || createCiiWorkspacePreviewWithVersionBridge;
  const memberPreviews = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const id = sourceId(source, index);
    const baseLoops = memberBaseLoops(input, source, id);
    const anchorPairs = memberAnchorPairs(input, source, id);
    const review = memberReview(input, id);
    const preview = await previewFactory({
      sourceBytes: source?.bytes,
      sourceText: source?.text,
      sourceFileName: sourceFileName(source, index),
      targetBytes: input?.targetBytes,
      targetText: input?.targetText,
      targetFileName: input?.targetFileName || 'TARGET.CII',
      ...(baseLoops ? { baseLoops } : {}),
      ...(anchorPairs ? { anchorPairs } : {}),
      ...(review ? { review } : {}),
    }, { ...options, previewFactory: undefined, writerVersion: '2' });
    memberPreviews.push(deepFreeze({ sourceId: id, preview }));
  }
  return buildReviewOnlyResult(input, sources, memberPreviews, options);
}

export const _test = Object.freeze({
  sourceRows, targetCustodyKey, prefixCorrespondenceRow, combinedCorrespondence,
  combinedReview, combinedEngineeringDeltas, combinedCompareReview, reviewOnlyTransferPlan, buildReviewOnlyResult,
  preparedReviewOnlyMembers, preparedReviewOnlyInput, preparedReviewOnlyModels,
  preparedReviewOnlyVersionBridge, reviewOnlyAnalysisOptions, reviewOnlyCache,
  reviewOnlySessionIdentity, ensureReviewOnlyCacheSession,
});

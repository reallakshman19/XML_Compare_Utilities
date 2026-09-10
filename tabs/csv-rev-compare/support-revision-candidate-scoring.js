import { coordinateDelta } from './support-revision-normalization.js';

export const SUPPORT_LINEAGE_SCORE_POLICY_V2 = Object.freeze({
  schema: 'support-revision-lineage-score-policy/v2',
  policyId: 'SUPPORT_LINEAGE_SCORE_V2',
  version: '2.0.0',
  minimumFrameAnchors: 3,
  minimumApproximateSignals: 3,
  weights: Object.freeze({
    persistentReferenceSetExact: 100,
    persistentReferenceOverlapBase: 72,
    persistentReferenceOverlapJaccardMax: 18,
    supportLocationIdentityExact: 60,
    prevNameExact: 18,
    pipeCoreExact: 18,
    pipeLineExact: 10,
    secondaryFamilyExact: 8,
    boreMatch: 12,
  }),
  coordinateBands: Object.freeze([
    Object.freeze({ maxResidualMm: 5, weight: 12, code: 'COORDINATE_FRAME_DELTA_LE_5MM' }),
    Object.freeze({ maxResidualMm: 25, weight: 8, code: 'COORDINATE_FRAME_DELTA_LE_25MM' }),
    Object.freeze({ maxResidualMm: 50, weight: 6, code: 'COORDINATE_FRAME_DELTA_LE_50MM' }),
    Object.freeze({ maxResidualMm: 100, weight: 3, code: 'COORDINATE_FRAME_DELTA_LE_100MM' }),
  ]),
});

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const intersects = (a = [], b = []) => a.filter((value) => b.includes(value));

export function scoreSupportRevisionCandidate(source, target, frame, comparePolicy, scorePolicy = SUPPORT_LINEAGE_SCORE_POLICY_V2) {
  const sharedReferences = intersects(source?.persistentReferences, target?.persistentReferences);
  const union = new Set([...(source?.persistentReferences || []), ...(target?.persistentReferences || [])]).size;
  const referenceJaccard = union ? sharedReferences.length / union : 0;
  const exactReferenceSet = Boolean(source?.referenceSetKey) && source.referenceSetKey === target?.referenceSetKey;
  const sameSupportLocationIdentity = Boolean(source?.supportLocationIdentity) && source.supportLocationIdentity === target?.supportLocationIdentity;
  const samePrevName = Boolean(source?.legacyIdentity) && upper(source.legacyIdentity) === upper(target?.legacyIdentity);
  const sameFamily = Boolean(source?.family) && upper(source.family) === upper(target?.family);
  const samePipeCore = Boolean(source?.pipe?.normalizedCore) && source.pipe.normalizedCore === target?.pipe?.normalizedCore;
  const sameLine = Boolean(source?.pipe?.lineNumber) && upper(source.pipe.lineNumber) === upper(target?.pipe?.lineNumber);
  const bore = compareBore(source, target);
  const coordinate = scoreCoordinate(source, target, frame, comparePolicy, scorePolicy);
  const breakdown = [];
  const add = (signal, active, contribution, maxContribution, reasonCode, evidence = null) => {
    breakdown.push(Object.freeze({ signal, active: Boolean(active), contribution: active ? contribution : 0, maxContribution, reasonCode: active ? reasonCode : '', evidence }));
  };
  add('persistent-reference-set', exactReferenceSet, scorePolicy.weights.persistentReferenceSetExact, scorePolicy.weights.persistentReferenceSetExact, 'PERSISTENT_REFERENCE_SET_EXACT', { sharedReferences });
  const refOverlapWeight = scorePolicy.weights.persistentReferenceOverlapBase + Math.round(referenceJaccard * scorePolicy.weights.persistentReferenceOverlapJaccardMax);
  add('persistent-reference-overlap', !exactReferenceSet && sharedReferences.length > 0, refOverlapWeight, scorePolicy.weights.persistentReferenceOverlapBase + scorePolicy.weights.persistentReferenceOverlapJaccardMax, 'PERSISTENT_REFERENCE_OVERLAP', { sharedReferences, referenceJaccard });
  add('support-location-identity', sameSupportLocationIdentity, scorePolicy.weights.supportLocationIdentityExact, scorePolicy.weights.supportLocationIdentityExact, 'SUPPORT_LOCATION_IDENTITY_EXACT');
  add('prev-name', samePrevName, scorePolicy.weights.prevNameExact, scorePolicy.weights.prevNameExact, 'PREV_NAME_EQUAL', { source: source?.legacyIdentity || '', target: target?.legacyIdentity || '' });
  add('pipe-core', samePipeCore, scorePolicy.weights.pipeCoreExact, scorePolicy.weights.pipeCoreExact, 'PIPE_CORE_EQUAL');
  add('pipe-line', !samePipeCore && sameLine, scorePolicy.weights.pipeLineExact, scorePolicy.weights.pipeLineExact, 'PIPE_LINE_EQUAL');
  add('secondary-family', sameFamily, scorePolicy.weights.secondaryFamilyExact, scorePolicy.weights.secondaryFamilyExact, 'SECONDARY_FAMILY_EQUAL');
  add('bore', bore.status === 'MATCH', scorePolicy.weights.boreMatch, scorePolicy.weights.boreMatch, 'BORE_MATCH', bore);
  breakdown.push(Object.freeze({ signal: 'coordinate-delta', active: coordinate.contribution > 0, contribution: coordinate.contribution, maxContribution: scorePolicy.coordinateBands[0]?.weight || 0, reasonCode: coordinate.reasonCode, evidence: coordinate }));

  const hardRejected = bore.status === 'MISMATCH';
  const strongEvidence = exactReferenceSet || sharedReferences.length > 0 || sameSupportLocationIdentity;
  const approximateSignals = [samePrevName, sameFamily, samePipeCore || sameLine, coordinate.contribution > 0].filter(Boolean).length;
  const approximateEligible = bore.status === 'MATCH' && approximateSignals >= scorePolicy.minimumApproximateSignals;
  const eligible = !hardRejected && (strongEvidence || approximateEligible);
  const score = breakdown.reduce((sum, item) => sum + item.contribution, 0);
  const reasonCodes = breakdown.filter((item) => item.active && item.reasonCode).map((item) => item.reasonCode);
  if (hardRejected) reasonCodes.push('BORE_MISMATCH_REJECTED');
  if (!strongEvidence && !approximateEligible) reasonCodes.push('INSUFFICIENT_APPROXIMATE_CORROBORATION');
  const method = sameSupportLocationIdentity ? 'civil-pipe-location-identity'
    : exactReferenceSet ? 'persistent-reference-set'
      : sharedReferences.length ? 'persistent-reference-overlap'
        : samePrevName && samePipeCore ? 'prev-name-pipe-structure'
          : samePipeCore ? 'pipe-structure'
            : 'weighted-approximation';
  return Object.freeze({
    source,
    target,
    score,
    method,
    reasonCodes: Object.freeze(reasonCodes),
    sharedReferences: Object.freeze([...sharedReferences]),
    eligible,
    hardRejected,
    strongEvidence,
    approximateEligible,
    approximateSignalCount: approximateSignals,
    scorePolicyId: scorePolicy.policyId,
    scorePolicyVersion: scorePolicy.version,
    weightBreakdown: Object.freeze(breakdown),
    evidence: Object.freeze({
      exactReferenceSet,
      referenceJaccard,
      sameSupportLocationIdentity,
      samePrevName,
      sameFamily,
      samePipeCore,
      sameLine,
      bore,
      coordinate,
    }),
  });
}

export function candidateOutcome(top, second, comparePolicy) {
  if (!top?.eligible || top.score < comparePolicy.candidate.likelyScore) return 'NO_MATCH';
  const deterministicEvidence = top.strongEvidence;
  const closeCompetitor = second?.eligible && second.score >= comparePolicy.candidate.likelyScore && top.score - second.score <= comparePolicy.candidate.ambiguityMargin;
  if (closeCompetitor) return 'AMBIGUOUS';
  return deterministicEvidence ? 'DETERMINISTIC' : 'LIKELY';
}

export function compareBore(source, target) {
  const left = boreEvidence(source);
  const right = boreEvidence(target);
  if (!left.available || !right.available) return Object.freeze({ status: 'UNKNOWN', compatible: true, source: left, target: right });
  const comparable = left.kind === right.kind || (left.kind === 'NUMERIC' && right.kind === 'NUMERIC');
  if (!comparable) return Object.freeze({ status: 'UNKNOWN', compatible: true, source: left, target: right });
  const equal = left.kind === 'NUMERIC'
    ? Math.abs(left.numericValue - right.numericValue) <= 1e-6
    : left.normalized === right.normalized;
  return Object.freeze({ status: equal ? 'MATCH' : 'MISMATCH', compatible: equal, source: left, target: right });
}

export function boreEvidence(location) {
  const sizeRaw = clean(location?.size);
  if (sizeRaw) return parseBoreValue(sizeRaw, 'SIZE');
  const pipeNps = clean(location?.pipe?.nps);
  if (pipeNps) return parseBoreValue(pipeNps, 'PIPE_NPS');
  return Object.freeze({ available: false, source: 'NONE', raw: '', kind: 'EMPTY', numericValue: null, normalized: '' });
}

export function buildTrustedCoordinateAnchors(sourceModel, targetModel) {
  const sourceByIdentity = groupUniqueByIdentity(sourceModel?.locations || []);
  const targetByIdentity = groupUniqueByIdentity(targetModel?.locations || []);
  const anchors = [];
  for (const [identity, source] of sourceByIdentity) {
    const target = targetByIdentity.get(identity);
    if (!target) continue;
    const bore = compareBore(source, target);
    if (bore.status === 'MISMATCH') continue;
    anchors.push(Object.freeze({ source, target, basis: 'UNIQUE_SUPPORT_LOCATION_IDENTITY', boreStatus: bore.status }));
  }
  return Object.freeze(anchors);
}

function scoreCoordinate(source, target, frame, comparePolicy, scorePolicy) {
  const delta = coordinateDelta(source?.position, target?.position, frame, comparePolicy);
  const frameUsable = frame?.status === 'SOLVED' && Number(frame?.anchorCount || 0) >= scorePolicy.minimumFrameAnchors;
  if (!frameUsable || delta.residualMm == null) return Object.freeze({ ...delta, frameUsable, contribution: 0, reasonCode: frameUsable ? 'COORDINATE_DELTA_UNAVAILABLE' : 'COORDINATE_FRAME_UNPROVEN' });
  const band = scorePolicy.coordinateBands.find((item) => delta.residualMm <= item.maxResidualMm) || null;
  return Object.freeze({
    ...delta,
    frameUsable,
    contribution: band?.weight || 0,
    reasonCode: band?.code || 'COORDINATE_FRAME_DELTA_GT_100MM',
    band: band ? Object.freeze({ ...band }) : null,
  });
}

function parseBoreValue(raw, source) {
  const normalized = upper(raw).replace(/\s+/g, '');
  const match = normalized.replace(/,/g, '').match(/[-+]?\d+(?:\.\d+)?/);
  if (match) return Object.freeze({ available: true, source, raw, kind: 'NUMERIC', numericValue: Number(match[0]), normalized });
  return Object.freeze({ available: true, source, raw, kind: 'TEXT', numericValue: null, normalized });
}

function groupUniqueByIdentity(locations) {
  const grouped = new Map();
  for (const location of locations) {
    const key = upper(location?.supportLocationIdentity);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(location);
  }
  return new Map([...grouped.entries()].flatMap(([key, rows]) => rows.length === 1 ? [[key, rows[0]]] : []));
}

export const _test = Object.freeze({ parseBoreValue, groupUniqueByIdentity, scoreCoordinate });

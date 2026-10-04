import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';

function rowSource(row) { return row.sourceNodeId || row.sourceComponentId || row.sourceElementId || row.sourceElementIds?.join('|') || ''; }
function rowTarget(row) { return row.targetNodeId || row.targetComponentId || row.targetElementIds?.join('|') || ''; }
function candidateEvidence(row) { return row?.evidence?.candidates || row?.evidence?.element?.candidates || null; }
function candidateWinner(candidates) {
  return candidates?.rankedCandidates?.find((item) => item.targetElementId === candidates.winnerTargetElementId)
    || candidates?.rankedCandidates?.[0]
    || null;
}
function explicitConfidence(row, candidates) {
  const winner = candidateWinner(candidates);
  return candidates?.winnerIdentityConfidence
    || winner?.identityConfidence
    || row?.evidence?.identityConfidence
    || row?.evidence?.element?.identityConfidence
    || null;
}
function adjacentBoundaryEvidence(row) {
  const evidence = row?.evidence;
  if (row?.authority !== 'ADJACENT_MATCH_BOUNDARY' || !evidence?.leftElement || !evidence?.rightElement) return null;
  const summarize = (item) => Object.freeze({
    confidence: item?.identityConfidence || 'UNRESOLVED',
    identitySupported: item?.identitySupported === true,
    m1Pass: item?.methods?.m1Spatial?.pass ?? null,
    m2Pass: item?.methods?.m2Network?.pass ?? null,
    odConfidence: item?.odConfidence?.confidence || null,
    odPercentError: item?.odConfidence?.percentError ?? null,
  });
  const left = summarize(evidence.leftElement); const right = summarize(evidence.rightElement);
  const highCount = [left, right].filter((item) => item.identitySupported && item.confidence === 'HIGH').length;
  return Object.freeze({ basis: 'ADJACENT_EDGE_CONSENSUS', highCount, requiredHighCount: 2, left, right });
}
function reviewIdentityBound(row, candidates, boundary) {
  if (row?.status === 'LOCKED') return true;
  if (['UNRESOLVED', 'CONFLICT', 'DELETED', 'INSERTED'].includes(row?.status)) return false;
  if (row?.evidence?.nodeCustodyGate) return false;
  if (candidates) return candidates.status === 'SUPPORTED';
  if (boundary) return boundary.highCount === boundary.requiredHighCount;
  const evidence = row?.evidence?.element || row?.evidence;
  return evidence?.identitySupported === true;
}
function reviewConfidence(row, candidates, boundary, identityBound) {
  if (row?.status === 'LOCKED') return 'LOCKED';
  if (['UNRESOLVED', 'CONFLICT', 'DELETED', 'INSERTED'].includes(row?.status)) return 'UNRESOLVED';
  if (row?.evidence?.nodeCustodyGate) return 'REVIEW';
  if (candidates?.status === 'AMBIGUOUS') return 'REVIEW';
  if (candidates?.status === 'UNRESOLVED') return 'UNRESOLVED';
  if (boundary) return identityBound ? 'HIGH' : 'REVIEW';
  const confidence = explicitConfidence(row, candidates);
  if (confidence === 'HIGH') return identityBound ? 'HIGH' : 'REVIEW';
  if (['MEDIUM', 'REVIEW'].includes(confidence)) return confidence;
  return 'REVIEW';
}
function winnerEvidence(row) {
  const candidates = candidateEvidence(row);
  if (!candidates) return row?.evidence?.element || row?.evidence || null;
  return candidateWinner(candidates);
}
function decision(review, row) {
  if (row.status === 'LOCKED') return 'LOCKED';
  const id = row.correspondenceId;
  if ((review?.lockedCorrespondenceIds || []).includes(id)) return 'LOCKED';
  if ((review?.rejectedCorrespondenceIds || []).includes(id)) return 'REJECTED';
  if ((review?.reviewedCorrespondenceIds || []).includes(id)) return 'ACCEPTED';
  return 'REVIEW';
}
function byCorrespondence(deltaSet) {
  const map = new Map();
  for (const row of deltaSet?.rows || []) {
    if (!map.has(row.correspondenceId)) map.set(row.correspondenceId, []);
    map.get(row.correspondenceId).push(row);
  }
  return map;
}
function projection(row, review, changeMap) {
  const candidates = candidateEvidence(row); const winner = winnerEvidence(row); const boundary = adjacentBoundaryEvidence(row);
  const identityBound = reviewIdentityBound(row, candidates, boundary);
  const changes = (changeMap.get(row.correspondenceId) || []).filter((item) => item.changed);
  const m1 = winner?.methods?.m1Spatial || row?.evidence?.methods?.m1Spatial || null;
  const m2 = winner?.methods?.m2Network || row?.evidence?.methods?.m2Network || null;
  const dimensions = winner?.dimensions || row?.evidence?.dimensions || null;
  return deepFreeze({
    correspondenceId: row.correspondenceId,
    kind: row.kind,
    workflowStatus: row.status,
    confidence: reviewConfidence(row, candidates, boundary, identityBound),
    identityBound,
    identityEvidenceBasis: boundary?.basis || (candidates ? 'CANDIDATE_EVIDENCE' : (row?.status === 'LOCKED' ? 'USER_LOCKED_ANCHOR' : 'DIRECT_EVIDENCE')),
    adjacentBoundary: boundary,
    source: rowSource(row), target: rowTarget(row),
    methodA: m1 ? Object.freeze({
      pass: Boolean(m1.pass), available: m1.available !== false, score: m1.score ?? 0, distanceMm: m1.distanceMm ?? null, toleranceMm: m1.toleranceMm ?? null,
      basis: m1.basis || '', registrationStatus: m1.registrationStatus || null, registrationReason: m1.registrationReason || null, reasons: m1.reasons || [],
    }) : null,
    methodB: m2 ? Object.freeze({ pass: Boolean(m2.pass), available: m2.available !== false, score: m2.score ?? 0, threshold: m2.threshold ?? null, components: m2.components || null, blockers: m2.blockers || [], reasons: m2.reasons || [] }) : null,
    od: dimensions?.diameter ? Object.freeze({
      pass: Boolean(dimensions.diameter.pass), available: dimensions.diameter.available !== false, source: dimensions.diameter.source, target: dimensions.diameter.target,
      relativeDelta: dimensions.diameter.relativeDelta, tolerance: dimensions.diameter.tolerance, confidence: winner?.odConfidence?.confidence || candidates?.winnerOdConfidence?.confidence || null,
      percentError: winner?.odConfidence?.percentError ?? candidates?.winnerOdConfidence?.percentError ?? null,
    }) : null,
    wall: dimensions?.wall ? Object.freeze({ pass: Boolean(dimensions.wall.pass), available: dimensions.wall.available !== false, source: dimensions.wall.source, target: dimensions.wall.target, relativeDelta: dimensions.wall.relativeDelta, tolerance: dimensions.wall.tolerance }) : null,
    nodeName: winner?.nodeNameEvidence || candidates?.winnerNodeNameEvidence || null,
    corroborationBand: winner?.corroborationBand || candidates?.winnerCorroborationBand || null,
    identityReasons: winner?.identityReasons || row?.evidence?.identityReasons || [],
    winnerGap: candidates?.winnerGap ?? null,
    requiredWinnerGap: candidates?.requiredWinnerGap ?? null,
    candidateStatus: candidates?.status || null,
    methodWinners: candidates?.methodWinners || null,
    reasons: candidates?.reasons || row?.evidence?.identityReasons || [],
    alternatives: Object.freeze((candidates?.rankedCandidates || []).slice(0, 5).map((item) => Object.freeze({
      target: item.targetElementId, confidence: item.identityConfidence, score: item.score, rankingScore: item.rankingScore,
      m1Score: item.methods?.m1Spatial?.score ?? null, m1Pass: item.methods?.m1Spatial?.pass ?? null,
      m2Score: item.methods?.m2Network?.score ?? null, m2Pass: item.methods?.m2Network?.pass ?? null,
    }))),
    changeCount: changes.length,
    changeFamilies: Object.freeze([...new Set(changes.map((item) => item.category))].sort()),
    changes: Object.freeze(changes),
    decision: decision(review, row),
    authority: row.authority || '',
  });
}
function countBy(rows, accessor, allowed) {
  const result = Object.fromEntries(allowed.map((key) => [key, 0]));
  for (const row of rows) {
    const key = accessor(row); if (Object.hasOwn(result, key)) result[key] += 1;
  }
  return Object.freeze(result);
}
function correspondenceSummary(rows) {
  const primary = rows.filter((row) => row.kind !== 'COMPONENT');
  const confidence = countBy(primary, (row) => row.confidence, ['HIGH', 'MEDIUM', 'REVIEW', 'UNRESOLVED', 'LOCKED']);
  const kinds = countBy(rows, (row) => row.kind, ['NODE', 'ELEMENT', 'ELEMENT_PATH', 'COMPONENT']);
  return Object.freeze({
    total: primary.length,
    matched: primary.filter((row) => row.identityBound).length,
    unresolved: primary.filter((row) => !row.identityBound && !['INSERTED', 'DELETED'].includes(row.workflowStatus)).length,
    inserted: primary.filter((row) => row.workflowStatus === 'INSERTED').length,
    deleted: primary.filter((row) => row.workflowStatus === 'DELETED').length,
    confidence,
    kinds,
  });
}
function reviewSummary(rows) {
  return Object.freeze({
    accepted: rows.filter((row) => row.decision === 'ACCEPTED').length,
    rejected: rows.filter((row) => row.decision === 'REJECTED').length,
    locked: rows.filter((row) => row.decision === 'LOCKED').length,
    pending: rows.filter((row) => row.decision === 'REVIEW').length,
  });
}

export function buildCiiCompareReviewModel(sourceDocument, targetDocument, correspondence, review, deltaSet) {
  const changeMap = byCorrespondence(deltaSet);
  const rawRows = [
    ...(correspondence?.nodeRows || []),
    ...(correspondence?.elementRows || []),
    ...(correspondence?.componentRows || []),
  ];
  const rows = rawRows.map((row) => projection(row, review, changeMap));
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.compareReview,
    source: Object.freeze({ fileName: sourceDocument?.fileName || '', nodeCount: sourceDocument?.summary?.nodeCount ?? null, elementCount: sourceDocument?.summary?.elementCount ?? null }),
    target: Object.freeze({ fileName: targetDocument?.fileName || '', nodeCount: targetDocument?.summary?.nodeCount ?? null, elementCount: targetDocument?.summary?.elementCount ?? null }),
    correspondenceStatus: correspondence?.status || 'UNRESOLVED',
    rows: Object.freeze(rows),
    summary: Object.freeze({
      correspondence: correspondenceSummary(rows),
      review: reviewSummary(rows),
      engineering: deltaSet?.summary || null,
      capabilityLimitations: deltaSet?.limitations || [],
    }),
  });
}

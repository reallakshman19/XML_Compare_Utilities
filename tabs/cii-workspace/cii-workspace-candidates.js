import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';
import { scoreCiiEdgeCandidate } from './cii-workspace-evidence.js';

function candidateLimit(options) { return Math.max(1, Number(options.candidateLimit || 8)); }
function winnerGap(options) { return Math.max(0, Number(options.winnerGap || 8)); }
function passingScore(options) { return Math.max(0, Number(options.candidatePassingScore ?? 45)); }

function rankedRows(sourceEdge, targetEdges, options) {
  return (targetEdges || []).map((targetEdge) => {
    const evidence = scoreCiiEdgeCandidate(sourceEdge, targetEdge, options);
    return deepFreeze({
      targetElementId: targetEdge.elementId,
      score: evidence.score,
      hardFail: evidence.hardFail,
      blockers: evidence.blockers,
      components: evidence.components,
      methods: evidence.methods,
      dimensions: evidence.dimensions,
      identityConfidence: evidence.identityConfidence,
      identitySupported: evidence.identitySupported,
      identityReasons: evidence.identityReasons,
      weightedScores: evidence.weightedScores,
    });
  }).sort((a, b) => b.score - a.score || String(a.targetElementId).localeCompare(String(b.targetElementId), undefined, { numeric: true }));
}

function methodWinner(rows, methodKey) {
  return [...(rows || [])]
    .filter((row) => row.methods?.[methodKey]?.pass)
    .sort((a, b) => Number(b.methods[methodKey].score || 0) - Number(a.methods[methodKey].score || 0)
      || b.score - a.score
      || String(a.targetElementId).localeCompare(String(b.targetElementId), undefined, { numeric: true }))[0] || null;
}

function auditRows(all, winner, limit) {
  const rows = []; const seen = new Set();
  const add = (row) => {
    if (!row || seen.has(row.targetElementId) || rows.length >= limit) return;
    seen.add(row.targetElementId); rows.push(row);
  };
  add(winner);
  for (const row of all) add(row);
  return Object.freeze(rows);
}

export function buildCiiCandidateEvidence(sourceEdge, targetEdges, expectedTargetId, options = {}) {
  const all = rankedRows(sourceEdge, targetEdges, options);
  const m1Winner = methodWinner(all, 'm1Spatial');
  const m2Winner = methodWinner(all, 'm2Network');
  const methodDisagreement = Boolean(m1Winner && m2Winner && m1Winner.targetElementId !== m2Winner.targetElementId);
  const winner = !methodDisagreement
    ? (m1Winner || m2Winner || all[0] || null)
    : (all[0] || null);
  const runner = winner ? all.find((row) => row.targetElementId !== winner.targetElementId) || null : null;
  const gap = winner ? winner.score - (runner?.score || 0) : 0;
  const winnerPasses = Boolean(winner && winner.identitySupported && winner.score >= passingScore(options));
  const unique = Boolean(winnerPasses && (!runner || gap >= winnerGap(options)));
  const expectedIsWinner = Boolean(winner && String(winner.targetElementId) === String(expectedTargetId || ''));

  let status = 'UNRESOLVED';
  if (winnerPasses) {
    if (methodDisagreement || winner.identityConfidence === 'REVIEW') status = 'AMBIGUOUS';
    else if (unique && expectedIsWinner) status = 'SUPPORTED';
    else status = 'AMBIGUOUS';
  }

  const reasons = [];
  if (!winner) reasons.push('NO_BOUNDED_CANDIDATES');
  else if (!winner.identitySupported) reasons.push('TOP_CANDIDATE_IDENTITY_UNSUPPORTED');
  else if (winner.score < passingScore(options)) reasons.push('TOP_CANDIDATE_BELOW_THRESHOLD');
  if (methodDisagreement) reasons.push('METHOD_A_B_DISAGREE');
  if (winnerPasses && winner.identityConfidence === 'REVIEW') reasons.push('METHOD_FUSION_REVIEW_REQUIRED');
  if (winnerPasses && runner && gap < winnerGap(options)) reasons.push('WINNER_GAP_NOT_SATISFIED');
  if (winnerPasses && expectedTargetId && !expectedIsWinner) reasons.push('ALIGNMENT_TARGET_NOT_BEST_CANDIDATE');

  const bounded = auditRows(all, winner, candidateLimit(options));
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.candidateEvidence,
    sourceElementId: sourceEdge?.elementId || null,
    expectedTargetElementId: expectedTargetId || null,
    candidateCount: all.length,
    candidateLimit: candidateLimit(options),
    reachedCandidateLimit: all.length > candidateLimit(options),
    rankedCandidates: bounded,
    winnerTargetElementId: winner?.targetElementId || null,
    winnerScore: winner?.score || 0,
    winnerIdentityConfidence: winner?.identityConfidence || 'UNRESOLVED',
    runnerUpScore: runner?.score || 0,
    winnerGap: Number(gap.toFixed(1)),
    requiredWinnerGap: winnerGap(options),
    passingScore: passingScore(options),
    methodWinners: Object.freeze({
      m1Spatial: m1Winner?.targetElementId || null,
      m2Network: m2Winner?.targetElementId || null,
      disagree: methodDisagreement,
    }),
    status,
    reasons: Object.freeze(reasons),
  });
}

export function candidateStatus(evidence, baseStatus) {
  if (!evidence) return baseStatus;
  if (evidence.status === 'AMBIGUOUS') return 'REVIEW';
  if (evidence.status === 'UNRESOLVED') return 'UNRESOLVED';
  // MEDIUM is an engineering confidence band, while the existing workflow
  // status remains REVIEW until an engineer accepts/locks the correspondence.
  if (evidence.winnerIdentityConfidence === 'MEDIUM') return 'REVIEW';
  return baseStatus;
}

export function targetCustodyConflicts(rows) {
  const claimed = new Map(); const conflicts = [];
  for (const row of rows || []) {
    if (!['HIGH', 'REVIEW', 'LOCKED'].includes(row.status)) continue;
    for (const targetId of row.targetElementIds || (row.targetElementId ? [row.targetElementId] : [])) {
      if (claimed.has(targetId)) conflicts.push(Object.freeze({ targetElementId: targetId, first: claimed.get(targetId), second: row.correspondenceId }));
      else claimed.set(targetId, row.correspondenceId);
    }
  }
  return Object.freeze(conflicts);
}

import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';
import { scoreCiiEdgeCandidate } from './cii-workspace-evidence.js';

function candidateLimit(options) { return Math.max(1, Number(options.candidateLimit || 8)); }
function winnerGap(options) { return Math.max(0, Number(options.winnerGap || 8)); }
function passingScore(options) { return Math.max(0, Number(options.candidatePassingScore || 55)); }

function rankedRows(sourceEdge, targetEdges, options) {
  return (targetEdges || []).map((targetEdge) => {
    const evidence = scoreCiiEdgeCandidate(sourceEdge, targetEdge, options);
    return deepFreeze({ targetElementId: targetEdge.elementId, score: evidence.score, hardFail: evidence.hardFail, blockers: evidence.blockers, components: evidence.components });
  }).sort((a, b) => b.score - a.score || String(a.targetElementId).localeCompare(String(b.targetElementId), undefined, { numeric: true }));
}

export function buildCiiCandidateEvidence(sourceEdge, targetEdges, expectedTargetId, options = {}) {
  const all = rankedRows(sourceEdge, targetEdges, options);
  const bounded = all.slice(0, candidateLimit(options));
  const winner = bounded[0] || null; const runner = bounded[1] || null;
  const gap = winner ? winner.score - (runner?.score || 0) : 0;
  const winnerPasses = Boolean(winner && !winner.hardFail && winner.score >= passingScore(options));
  const unique = Boolean(winnerPasses && (!runner || gap >= winnerGap(options)));
  const expectedIsWinner = Boolean(winner && String(winner.targetElementId) === String(expectedTargetId || ''));
  const status = !winnerPasses ? 'UNRESOLVED' : (unique && expectedIsWinner ? 'SUPPORTED' : 'AMBIGUOUS');
  const reasons = [];
  if (!winner) reasons.push('NO_BOUNDED_CANDIDATES');
  else if (winner.hardFail) reasons.push('TOP_CANDIDATE_HARD_CONFLICT');
  else if (winner.score < passingScore(options)) reasons.push('TOP_CANDIDATE_BELOW_THRESHOLD');
  if (winnerPasses && runner && gap < winnerGap(options)) reasons.push('WINNER_GAP_NOT_SATISFIED');
  if (winnerPasses && expectedTargetId && !expectedIsWinner) reasons.push('ALIGNMENT_TARGET_NOT_BEST_CANDIDATE');
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.candidateEvidence,
    sourceElementId: sourceEdge?.elementId || null,
    expectedTargetElementId: expectedTargetId || null,
    candidateCount: all.length,
    candidateLimit: candidateLimit(options),
    reachedCandidateLimit: all.length > candidateLimit(options),
    rankedCandidates: Object.freeze(bounded),
    winnerTargetElementId: winner?.targetElementId || null,
    winnerScore: winner?.score || 0,
    runnerUpScore: runner?.score || 0,
    winnerGap: Number(gap.toFixed(1)),
    requiredWinnerGap: winnerGap(options),
    passingScore: passingScore(options),
    status,
    reasons: Object.freeze(reasons),
  });
}

export function candidateStatus(evidence, baseStatus) {
  if (!evidence || evidence.status === 'SUPPORTED') return baseStatus;
  if (evidence.status === 'AMBIGUOUS') return 'REVIEW';
  return 'UNRESOLVED';
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

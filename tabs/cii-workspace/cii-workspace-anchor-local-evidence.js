import { deepFreeze } from './cii-workspace-contracts.js';

// Read-only local context for a USER LOCKED node pair. A one-hop comparison
// cannot establish physical identity or rule out a target-side subdivision.
function values(graph, nodeId, property) {
  return (graph?.adjacency?.get(String(nodeId)) || [])
    .map((edge) => Number(edge?.[property]))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}
function rounded(value) {
  return value == null ? null : Number(value.toFixed(2));
}
function nearestOdErrorPercent(sourceOds, targetOds) {
  if (!sourceOds.length || !targetOds.length) return null;
  return Math.max(...sourceOds.map((source) => Math.min(...targetOds.map((target) =>
    100 * Math.abs(source - target) / source))));
}
function maxOneHopLengthDeltaMm(sourceLengths, targetLengths) {
  if (!sourceLengths.length || sourceLengths.length !== targetLengths.length) return null;
  return Math.max(...sourceLengths.map((value, index) => Math.abs(value - targetLengths[index])));
}

/**
 * Advisory-only. NEVER use these local signals as an identity decision,
 * a target correspondence, automatic anchor selection or Writer authority.
 * Differently subdivided TARGET routes require independent path-level review.
 */
export function assessCiiLockedAnchorLocalEvidence(sourceGraph, targetGraph, sourceNodeId, targetNodeId, options = {}) {
  const sourceEdges = sourceGraph?.adjacency?.get(String(sourceNodeId)) || [];
  const targetEdges = targetGraph?.adjacency?.get(String(targetNodeId)) || [];
  if (!sourceEdges.length || !targetEdges.length) return null;

  const sourceOdMm = values(sourceGraph, sourceNodeId, 'diameter');
  const targetOdMm = values(targetGraph, targetNodeId, 'diameter');
  const sourceLengthMm = values(sourceGraph, sourceNodeId, 'lengthMm');
  const targetLengthMm = values(targetGraph, targetNodeId, 'lengthMm');
  const nearestOdMaxPercent = rounded(nearestOdErrorPercent(sourceOdMm, targetOdMm));
  const oneHopMaxLengthDeltaMm = rounded(maxOneHopLengthDeltaMm(sourceLengthMm, targetLengthMm));
  const oneHopLengthToleranceMm = Number(options.networkLocalLengthToleranceMm || 250);
  const signals = [];
  if (nearestOdMaxPercent != null && nearestOdMaxPercent > 50) signals.push('INCIDENT_OD_CONTEXT_OVER_50_PERCENT');
  if (oneHopMaxLengthDeltaMm != null && oneHopMaxLengthDeltaMm > oneHopLengthToleranceMm) {
    signals.push('ONE_HOP_LENGTH_CONTEXT_DIFFERS');
  }
  return deepFreeze({
    status: signals.length ? 'LOCAL_CONTEXT_REQUIRES_REVIEW' : 'NO_LOCAL_CONFLICT_SIGNAL',
    sourceDegree: sourceEdges.length,
    targetDegree: targetEdges.length,
    sourceOdMm: Object.freeze(sourceOdMm),
    targetOdMm: Object.freeze(targetOdMm),
    sourceLengthMm: Object.freeze(sourceLengthMm),
    targetLengthMm: Object.freeze(targetLengthMm),
    nearestOdMaxPercent, oneHopMaxLengthDeltaMm, oneHopLengthToleranceMm,
    signals: Object.freeze(signals),
    authority: 'ADVISORY_LOCAL_CONTEXT_ONLY',
    identityQualified: false,
    caveat: 'ONE_HOP_COMPARISON_CANNOT_QUALIFY_IDENTITY_OR_EXCLUDE_TARGET_SUBDIVISIONS',
  });
}

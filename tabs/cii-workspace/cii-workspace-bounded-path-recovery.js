import { deepFreeze } from './cii-workspace-contracts.js';
import { scoreCiiEdgeCandidate } from './cii-workspace-evidence.js';

function other(edge, node) { return edge.from === node ? edge.to : edge.from; }
function incident(graph, node) {
  return [...(graph?.adjacency?.get(String(node)) || [])]
    .sort((a, b) => String(a.elementId).localeCompare(String(b.elementId), undefined, { numeric: true }));
}
function number(value) { return Number(value); }
function vector(edge, from) {
  const sign = edge.from === from ? 1 : -1;
  return [number(edge.dx || 0) * sign, number(edge.dy || 0) * sign, number(edge.dz || 0) * sign];
}
function straightness(steps) {
  const result = [0, 0, 0];
  for (const step of steps) {
    const v = vector(step.edge, step.from);
    for (let i = 0; i < 3; i += 1) result[i] += v[i];
  }
  const length = steps.reduce((sum, step) => sum + number(step.edge.lengthMm || 0), 0);
  return length > 0 ? Math.hypot(...result) / length : 0;
}
function physicalCompatible(source, target, options) {
  // BEND is admissible as a one-to-one physical LOOKAHEAD witness only.
  // Actual root frontier recovery and all target subdivisions stay PIPE-only.
  if (source.componentKind !== target.componentKind
    || !['PIPE', 'BEND'].includes(source.componentKind)) return false;
  const a = number(source.diameter), b = number(target.diameter);
  if (!(a > 0 && b > 0) || Math.abs(a - b) > Math.min(number(options.pathRecoveryOdToleranceMm ?? 2), a * 0.1)) return false;
  return true;
}
function composite(edge, steps, start, end) {
  const first = steps[0].edge, last = steps.at(-1).edge;
  const vectorSum = steps.reduce((sum, step) => {
    const v = vector(step.edge, step.from);
    return sum.map((value, i) => value + v[i]);
  }, [0, 0, 0]);
  return {
    ...first, from: start, to: end,
    fromContext: first.from === start ? first.fromContext : first.toContext,
    toContext: last.to === end ? last.toContext : last.fromContext,
    dx: vectorSum[0], dy: vectorSum[1], dz: vectorSum[2],
    lengthMm: steps.reduce((sum, step) => sum + number(step.edge.lengthMm), 0),
  };
}
function pathChoices(graph, node, sourceEdge, firstEdges, options, occupied, occupiedNodes) {
  const limit = Math.min(4, Math.max(1, number(options.pathRecoveryMaxTargetSegments ?? 3)));
  const tolerance = number(options.pathRecoveryLengthToleranceMm ?? 25);
  const results = []; let overflow = false;
  for (const first of firstEdges) {
    let cursor = String(node), edge = first, steps = [], visited = new Set([cursor]), length = 0;
    for (let n = 0; edge && n < limit; n += 1) {
      if (occupied.has(edge.elementId) || !physicalCompatible(sourceEdge, edge, options)) break;
      const next = other(edge, cursor);
      if (visited.has(next) || (n > 0 && occupiedNodes.has(next))) break;
      steps.push({ edge, from: cursor, to: next }); length += number(edge.lengthMm);
      if (length > number(sourceEdge.lengthMm) + tolerance) break;
      const wallCompatibleSubdivision = steps.length === 1 || (sourceEdge.componentKind === 'PIPE'
        && steps.every(step => {
        const sw = number(sourceEdge.wall), tw = number(step.edge.wall);
        return (sw > 0 && tw > 0 && Math.abs(sw - tw) <= number(options.pathRecoveryWallToleranceMm ?? 1))
          || (sw === 0 && tw === 0);
      }));
      if (Math.abs(length - number(sourceEdge.lengthMm)) <= tolerance
        && (steps.length === 1 || sourceEdge.componentKind === 'PIPE')
        && wallCompatibleSubdivision
        && (steps.length === 1 || straightness(steps) >= number(options.pathRecoveryMinStraightness ?? 0.995))) {
        const target = composite(first, steps, String(node), next);
        const m2 = scoreCiiEdgeCandidate(sourceEdge, target, {
          ...options, propagation: true, geometryTransform: {
            status: 'UNDERDETERMINED', mode: 'SINGLE_LOCKED_ANCHOR',
            reason: 'ONE_ANCHOR_CANNOT_ESTABLISH_ROTATION',
          },
        });
        if (m2.methods.m2Network.pass && m2.identitySupported && !m2.hardFail) {
          results.push({
            targetIds: steps.map(s => s.edge.elementId),
            internalNodes: steps.slice(0, -1).map(s => s.to), firstId: first.elementId, lastId: edge.elementId,
            targetNode: next, lengthDeltaMm: Math.abs(length - number(sourceEdge.lengthMm)),
            m2Score: m2.methods.m2Network.score, m2Threshold: m2.methods.m2Network.threshold,
            score: 0,
          });
          if (results.length > 24) { overflow = true; break; }
        }
      }
      if (incident(graph, next).length !== 2 || occupiedNodes.has(next)) break;
      const successors = incident(graph, next).filter(item => item.elementId !== edge.elementId);
      if (successors.length !== 1) break;
      visited.add(next); cursor = next; edge = successors[0];
    }
    if (overflow) break;
  }
  return { choices: results, overflow };
}
function lookahead(sourceGraph, targetGraph, sourceEdge, sourceNode, candidate, options, occupiedSource, occupiedTarget, occupiedNodes) {
  const required = Math.max(2, Math.min(3, number(options.pathRecoveryRequiredLookahead ?? 2)));
  let sourceAt = other(sourceEdge, String(sourceNode)), targetAt = candidate.targetNode;
  let sourcePrevious = sourceEdge.elementId, targetPrevious = candidate.lastId, count = 0;
  const seenSource = new Set([String(sourceNode), sourceAt]);
  const seenTarget = new Set([String(candidate.targetNode)]); // TARGET NODE IDs never share SOURCE identity space
  for (let i = 0; i < required; i += 1) {
    const sourceNext = incident(sourceGraph, sourceAt).filter(e => e.elementId !== sourcePrevious && !occupiedSource.has(e.elementId));
    const targetNext = incident(targetGraph, targetAt).filter(e => e.elementId !== targetPrevious && !occupiedTarget.has(e.elementId));
    if (sourceNext.length !== 1 || targetNext.length !== 1) break;
    const source = sourceNext[0];
    if (!['PIPE', 'BEND'].includes(source.componentKind) || seenSource.has(other(source, sourceAt))) break;
    const available = pathChoices(targetGraph, targetAt, source, targetNext, options, occupiedTarget, occupiedNodes);
    if (available.overflow || available.choices.length !== 1) break;
    const matched = available.choices[0];
    if (seenTarget.has(matched.targetNode)) break;
    count += 1;
    seenSource.add(other(source, sourceAt)); seenTarget.add(matched.targetNode);
    sourcePrevious = source.elementId; targetPrevious = matched.lastId;
    sourceAt = other(source, sourceAt); targetAt = matched.targetNode;
  }
  return count;
}

/**
 * Opt-in, fail-closed rescue only for an ambiguous single-locked-anchor frontier.
 * Strict local M2+OD/length + 2 independent forward steps are required for
 * every outgoing source edge. No names, auto-approved target identities, or
 * relaxation of the normal candidate scorer are involved.
 */
export function recoverCiiBoundedFrontierPaths(sourceGraph, targetGraph, sourceNode, targetNode, sourceEdges, targetEdges, options = {}, custody = {}) {
  const blocked = (blocker) => deepFreeze({ status: 'BLOCKED', blocker });
  if (!sourceEdges.length || sourceEdges.length > 2 || targetEdges.length > 3) return blocked('PATH_RECOVERY_FRONTIER_BUDGET');
  const occupiedSource = new Set(custody.sourceEdgeIds || []);
  const occupiedTarget = new Set(custody.targetEdgeIds || []);
  const occupiedNodes = new Set(custody.targetNodeIds || []);
  occupiedNodes.delete(String(targetNode));
  const candidates = [];
  for (const source of sourceEdges) {
    if (source.componentKind !== 'PIPE') return blocked('PATH_RECOVERY_NON_PIPE_SOURCE');
    const found = pathChoices(targetGraph, targetNode, source, targetEdges, options, occupiedTarget, occupiedNodes);
    if (found.overflow) return blocked('PATH_RECOVERY_CANDIDATE_OVERFLOW');
    const admissible = found.choices.map(choice => ({
      ...choice, sourceId: source.elementId,
      lookaheadCount: lookahead(sourceGraph, targetGraph, source, sourceNode, choice, options,
        occupiedSource, occupiedTarget, occupiedNodes),
    })).filter(item => item.lookaheadCount >= Math.max(2, Math.min(3, number(options.pathRecoveryRequiredLookahead ?? 2))));
    if (!admissible.length) return blocked('PATH_RECOVERY_INSUFFICIENT_UNIQUE_LOOKAHEAD');
    candidates.push(admissible.map(item => ({
      ...item, score: Number((item.m2Score + 8 * item.lookaheadCount - item.lengthDeltaMm / 25).toFixed(2)),
    })));
  }
  const assignments = []; const used = new Set(), usedNodes = new Set();
  const budget = Math.min(64, Math.max(1, number(options.pathRecoveryMaxAssignments ?? 32)));
  let overflow = false;
  function enumerate(i, chosen) {
    if (assignments.length >= budget) { overflow = true; return; }
    if (i === candidates.length) {
      const score = chosen.reduce((n, item) => n + item.score, 0) / chosen.length;
      assignments.push({ score, paths: [...chosen] }); return;
    }
    for (const item of candidates[i]) {
      if (item.targetIds.some(id => used.has(id))
        || item.internalNodes.some(id => usedNodes.has(id) || occupiedNodes.has(id))
        || usedNodes.has(item.targetNode) || occupiedNodes.has(item.targetNode)) continue;
      item.targetIds.forEach(id => used.add(id));
      [...item.internalNodes, item.targetNode].forEach(id => usedNodes.add(id));
      enumerate(i + 1, [...chosen, item]);
      item.targetIds.forEach(id => used.delete(id));
      [...item.internalNodes, item.targetNode].forEach(id => usedNodes.delete(id));
      if (overflow) return;
    }
  }
  enumerate(0, []);
  if (overflow) return blocked('PATH_RECOVERY_ASSIGNMENT_OVERFLOW');
  if (!assignments.length) return blocked('PATH_RECOVERY_NO_COMPLETE_CUSTODY_SAFE_ASSIGNMENT');
  assignments.sort((a, b) => b.score - a.score
    || a.paths.map(p => p.targetIds.join(',')).join('|').localeCompare(b.paths.map(p => p.targetIds.join(',')).join('|')));
  const gap = assignments.length > 1 ? assignments[0].score - assignments[1].score : 100;
  const requiredGap = number(options.frontierWinnerGap ?? options.winnerGap ?? 8);
  if (gap < requiredGap) return blocked('PATH_RECOVERY_WINNER_GAP_NOT_SATISFIED');
  return deepFreeze({
    status: 'READY', score: Number(assignments[0].score.toFixed(2)), gap: Number(gap.toFixed(2)),
    requiredGap, sourceNode: String(sourceNode), targetNode: String(targetNode),
    paths: Object.freeze(assignments[0].paths.map(row => deepFreeze(row))),
    authority: 'BOUNDED_M2_OD_PATH_LOOKAHEAD_OPT_IN',
    limitations: Object.freeze(['SINGLE_ANCHOR_M1_UNDERDETERMINED', 'NO_NAME_ONLY_IDENTITY']),
  });
}

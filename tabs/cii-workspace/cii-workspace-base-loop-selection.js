import { deepFreeze } from './cii-workspace-contracts.js';

function text(value) { return String(value ?? '').trim(); }
function pair(sourceNodeId, targetNodeId) {
  return Object.freeze({ sourceNodeId: text(sourceNodeId), targetNodeId: text(targetNodeId) });
}
function pairKey(value) { return `${text(value?.sourceNodeId)}=>${text(value?.targetNodeId)}`; }
export function ciiSuggestionSelectionKey(row) { return pairKey(row); }

function methodIncludesA(method) { return method === 'METHOD_A_SPATIAL' || method === 'METHOD_A_AND_B'; }
function methodIncludesB(method) { return method === 'METHOD_B_NETWORK' || method === 'METHOD_A_AND_B'; }
function validAnchorPairs(rows) {
  return (rows || []).map((row) => pair(row?.sourceNodeId, row?.targetNodeId))
    .filter((row) => row.sourceNodeId && row.targetNodeId);
}
function methodALoop(row) {
  const method = text(row?.basisMethod); const evidence = row?.methodA; const base = evidence?.bestBase;
  if (!methodIncludesA(method) || evidence?.status !== 'READY' || !base?.baseId) return null;
  const anchorPairs = validAnchorPairs(base.anchorPairs);
  if (anchorPairs.length < 3) return null;
  return Object.freeze({ method: 'METHOD_A_SPATIAL', baseId: text(base.baseId), anchorPairs: Object.freeze(anchorPairs) });
}
function methodBLoop(row) {
  const method = text(row?.basisMethod); const evidence = row?.methodB;
  if (!methodIncludesB(method) || evidence?.status !== 'READY') return null;
  const sourceNodeId = text(row?.sourceNodeId); const targetNodeId = text(row?.targetNodeId);
  if (!sourceNodeId || !targetNodeId) return null;
  return Object.freeze({
    method: 'METHOD_B_NETWORK', baseId: `METHOD_B_ACCEPTED_${sourceNodeId}_${targetNodeId}`,
    anchorPairs: Object.freeze([pair(sourceNodeId, targetNodeId)]),
  });
}

export function ciiQualifiedLoopsForSuggestion(row) {
  return deepFreeze([methodALoop(row), methodBLoop(row)].filter(Boolean));
}
function loopKey(loop) {
  if (loop.method === 'METHOD_A_SPATIAL') return `A:${loop.baseId}`;
  return `B:${pairKey(loop.anchorPairs?.[0])}`;
}
export function buildCiiSelectedBaseLoops(suggestions = [], selectedKeys = []) {
  const selected = new Set([...selectedKeys].map(text)); const loops = new Map();
  for (const row of suggestions || []) {
    if (!selected.has(ciiSuggestionSelectionKey(row))) continue;
    for (const loop of ciiQualifiedLoopsForSuggestion(row)) if (!loops.has(loopKey(loop))) loops.set(loopKey(loop), loop);
  }
  return deepFreeze([...loops.values()]);
}
export function ciiSelectedAnchorPairs(baseLoops = []) {
  const rows = new Map();
  for (const loop of baseLoops || []) for (const item of loop.anchorPairs || []) {
    const key = pairKey(item); if (item.sourceNodeId && item.targetNodeId && !rows.has(key)) rows.set(key, pair(item.sourceNodeId, item.targetNodeId));
  }
  return deepFreeze([...rows.values()]);
}
export function ciiBaseSelectionSummary(baseLoops = []) {
  const methodA = (baseLoops || []).filter((loop) => loop.method === 'METHOD_A_SPATIAL').length;
  const methodB = (baseLoops || []).filter((loop) => loop.method === 'METHOD_B_NETWORK').length;
  return deepFreeze({ loopCount: methodA + methodB, methodA, methodB, combination: 'OR_WITH_CONFLICT_VETO' });
}
export function ciiApplyBaseSelection(baseInput, baseLoops, legacyAnchorPairs) {
  const { anchorPairs: _anchors, baseLoops: _loops, ...rest } = baseInput || {};
  if (Array.isArray(baseLoops) && baseLoops.length) return { ...rest, baseLoops };
  return { ...rest, anchorPairs: legacyAnchorPairs };
}

export const _test = Object.freeze({ methodALoop, methodBLoop, loopKey, pairKey });

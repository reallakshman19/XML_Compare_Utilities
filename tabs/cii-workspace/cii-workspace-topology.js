import { buildElementPaths, scorePathMatch, alignElementSequence } from '../model-converters/xml-cii-inputxml-path-aligner.js';
import { deepFreeze, stableId } from './cii-workspace-contracts.js';
import { ciiAlignmentScore } from './cii-workspace-evidence.js';
import { deriveCiiAlignmentCorrespondence } from './cii-workspace-alignment.js';

function otherNode(edge, current) { return edge.from === current ? edge.to : edge.from; }
function sortIncidents(rows) { return [...(rows || [])].sort((a, b) => a.elementId.localeCompare(b.elementId)); }

function reachableWithoutEdge(graph, start, end, blockedEdgeId) {
  const visited = new Set([start]); const queue = [start];
  while (queue.length) {
    const node = queue.shift(); if (node === end) return true;
    for (const edge of sortIncidents(graph.adjacency.get(node))) {
      if (edge.elementId === blockedEdgeId) continue;
      const next = otherNode(edge, node); if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return false;
}

function routeHasAlternative(graph, start, end, steps) {
  return steps.some((step) => reachableWithoutEdge(graph, start, end, step.edge.elementId));
}

function uniqueShortestRoute(graph, start, end) {
  const source = String(start); const target = String(end);
  if (!graph.adjacency.has(source) || !graph.adjacency.has(target)) return { status: 'BLOCKED', blocker: 'LOCKED_ANCHOR_NODE_NOT_FOUND' };
  const distance = new Map([[source, 0]]); const ways = new Map([[source, 1]]); const previous = new Map();
  const queue = [source];
  while (queue.length) {
    const node = queue.shift();
    for (const edge of sortIncidents(graph.adjacency.get(node))) {
      const next = otherNode(edge, node); const candidate = distance.get(node) + 1;
      if (!distance.has(next)) { distance.set(next, candidate); ways.set(next, ways.get(node)); previous.set(next, { node, edge }); queue.push(next); }
      else if (distance.get(next) === candidate) ways.set(next, Math.min(2, (ways.get(next) || 0) + (ways.get(node) || 0)));
    }
  }
  if (!distance.has(target)) return { status: 'BLOCKED', blocker: 'LOCKED_ANCHORS_DISCONNECTED' };
  if ((ways.get(target) || 0) !== 1) return { status: 'BLOCKED', blocker: 'AMBIGUOUS_ANCHOR_ROUTE' };
  const steps = [];
  for (let node = target; node !== source;) {
    const item = previous.get(node); if (!item) return { status: 'BLOCKED', blocker: 'ANCHOR_ROUTE_RECONSTRUCTION_FAILED' };
    steps.push({ edge: item.edge, from: item.node, to: node }); node = item.node;
  }
  steps.reverse();
  if (routeHasAlternative(graph, source, target, steps)) return { status: 'BLOCKED', blocker: 'AMBIGUOUS_ANCHOR_ROUTE' };
  return { status: 'READY', steps };
}

function orientEdge(step) {
  const edge = step.edge; const reverse = edge.from !== step.from;
  return {
    ...edge,
    routeFrom: step.from, routeTo: step.to,
    dx: reverse ? -edge.dx : edge.dx, dy: reverse ? -edge.dy : edge.dy, dz: reverse ? -edge.dz : edge.dz,
    fromPos: reverse ? edge.toPos : edge.fromPos, toPos: reverse ? edge.fromPos : edge.toPos,
    fromContext: reverse ? edge.toContext : edge.fromContext, toContext: reverse ? edge.fromContext : edge.toContext,
  };
}

function routePath(route, pathId, toleranceMm) {
  const elements = route.steps.map(orientEdge); let station = 0;
  for (const edge of elements) {
    edge.pathStationStartMm = station; station += Number(edge.lengthMm || 0);
    edge.pathStationEndMm = station; edge.pathStationMidMm = (edge.pathStationStartMm + station) / 2;
  }
  for (const edge of elements) edge.pathTotalLengthMm = station;
  const bucket = (value) => Math.round(Number(value || 0) / toleranceMm) * toleranceMm;
  return {
    pathId, startNode: route.steps[0]?.from || '', endNode: route.steps.at(-1)?.to || '',
    startAnchorType: 'LOCKED', endAnchorType: 'LOCKED', elements,
    totalLengthMm: station, packetSequence: elements.map((edge) => edge.componentKind || 'PIPE'),
    lengthSequence: elements.map((edge) => bucket(edge.lengthMm)),
  };
}

function pathNodes(path) { return [path.startNode, ...path.elements.map((edge) => edge.routeTo)]; }
function intermediateAnchorBlocker(sourcePath, targetPath, anchors) {
  if (anchors.length <= 2) return '';
  const sourceNodes = pathNodes(sourcePath); const targetNodes = pathNodes(targetPath);
  let sourceLast = -1; let targetLast = -1;
  for (const pair of anchors) {
    const sourceIndex = sourceNodes.indexOf(String(pair.sourceNodeId)); const targetIndex = targetNodes.indexOf(String(pair.targetNodeId));
    if (sourceIndex < 0 || targetIndex < 0) return 'LOCKED_ANCHOR_OUTSIDE_SPAN';
    if (sourceIndex <= sourceLast || targetIndex <= targetLast) return 'LOCKED_ANCHOR_ORDER_CONTRADICTION';
    sourceLast = sourceIndex; targetLast = targetIndex;
  }
  return '';
}

function subdivisionEvidence(sourcePath, targetPath, options) {
  if (sourcePath.elements.length !== 1 || targetPath.elements.length < 2) return null;
  const source = sourcePath.elements[0]; const internalNodes = targetPath.elements.slice(0, -1).map((edge) => edge.routeTo);
  if (source.componentKind !== 'PIPE') return null;
  if (internalNodes.some((id) => (options.targetGraph.adjacency.get(id) || []).length !== 2)) return null;
  const lengthDeltaMm = Math.abs(sourcePath.totalLengthMm - targetPath.totalLengthMm);
  const lengthOk = lengthDeltaMm <= Number(options.pathLengthToleranceMm || 25);
  const diameterOk = targetPath.elements.every((edge) => Math.abs(edge.diameter - source.diameter) <= Number(options.diameterToleranceMm || 2));
  const componentOk = targetPath.elements.every((edge) => edge.componentKind === 'PIPE');
  return deepFreeze({ compatible: lengthOk && diameterOk && componentOk, lengthDeltaMm, lengthOk, diameterOk, componentOk, internalNodes });
}

function lockedNodeRows(anchorPairs) {
  return anchorPairs.map((pair) => deepFreeze({
    correspondenceId: stableId('node', pair.sourceNodeId, pair.targetNodeId), kind: 'NODE',
    sourceNodeId: String(pair.sourceNodeId), targetNodeId: String(pair.targetNodeId), status: 'LOCKED', authority: 'USER_LOCKED_ANCHOR',
  }));
}

function insertedRows(subdivision) {
  if (!subdivision?.compatible) return [];
  return subdivision.internalNodes.map((targetNodeId) => deepFreeze({
    correspondenceId: stableId('insert', targetNodeId), kind: 'NODE', sourceNodeId: null, targetNodeId,
    status: 'INSERTED', authority: 'SOURCE_1_TO_TARGET_N_SUBDIVISION',
  }));
}

export function compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchorPairs, options = {}) {
  if (!Array.isArray(anchorPairs) || anchorPairs.length < 2) {
    return deepFreeze({ status: 'BLOCKED', blockers: Object.freeze(['TWO_LOCKED_ANCHOR_PAIRS_REQUIRED']), nodeRows: Object.freeze(lockedNodeRows(anchorPairs || [])) });
  }
  const ordered = [...anchorPairs];
  const first = ordered[0]; const last = ordered[ordered.length - 1];
  const sourceRoute = uniqueShortestRoute(sourceGraph, first.sourceNodeId, last.sourceNodeId);
  const targetRoute = uniqueShortestRoute(targetGraph, first.targetNodeId, last.targetNodeId);
  const blockers = [sourceRoute, targetRoute].filter((item) => item.status !== 'READY').map((item) => item.blocker);
  if (blockers.length) return deepFreeze({ status: 'BLOCKED', blockers: Object.freeze(blockers), nodeRows: Object.freeze(lockedNodeRows(ordered)) });
  const toleranceMm = Number(options.lengthToleranceMm || 6);
  const sourcePath = routePath(sourceRoute, 'LOCKED-SOURCE', toleranceMm);
  const targetPath = routePath(targetRoute, 'LOCKED-TARGET', toleranceMm);
  const anchorOrderBlocker = intermediateAnchorBlocker(sourcePath, targetPath, ordered);
  if (anchorOrderBlocker) return deepFreeze({ status: 'BLOCKED', blockers: Object.freeze([anchorOrderBlocker]), nodeRows: Object.freeze(lockedNodeRows(ordered)) });
  const scoreOptions = { ...options, geometryTransform: options.geometryTransform };
  const alignment = alignElementSequence(sourcePath, targetPath, (a, b) => ciiAlignmentScore(a, b, scoreOptions), options);
  const alignmentRows = deriveCiiAlignmentCorrespondence(alignment, scoreOptions);
  const subdivision = subdivisionEvidence(sourcePath, targetPath, { ...options, targetGraph });
  const pathScore = scorePathMatch(sourcePath, targetPath, options);
  const elementRows = subdivision?.compatible ? [deepFreeze({
    correspondenceId: stableId('path', sourcePath.elements[0].elementId, ...targetPath.elements.map((edge) => edge.elementId)),
    kind: 'ELEMENT_PATH', sourceElementIds: Object.freeze([sourcePath.elements[0].elementId]),
    targetElementIds: Object.freeze(targetPath.elements.map((edge) => edge.elementId)), status: 'HIGH',
    authority: 'LOCKED_ANCHOR_SPAN_SUBDIVISION', evidence: subdivision,
  })] : alignmentRows.elementRows;
  const nodeRows = [
    ...lockedNodeRows(ordered),
    ...(subdivision?.compatible ? insertedRows(subdivision) : alignmentRows.nodeRows),
  ];
  const hardConflicts = elementRows.filter((row) => row.status === 'CONFLICT');
  const matched = elementRows.some((row) => ['HIGH', 'REVIEW'].includes(row.status) || row.kind === 'ELEMENT_PATH');
  const status = hardConflicts.length ? 'CONFLICT' : (matched ? 'READY' : 'UNRESOLVED');
  return deepFreeze({
    schema: 'CIIWorkspaceCorrespondence.v1', status, blockers: Object.freeze([]),
    pathScore: Number(pathScore.toFixed(1)), sourcePath, targetPath,
    alignment: deepFreeze({ score: alignment.score, operations: alignment.operations.map((op) => ({ op: op.op, sourceElementId: op.refEdge?.elementId || null, targetElementId: op.targetEdge?.elementId || null })) }),
    nodeRows: Object.freeze(nodeRows), elementRows: Object.freeze(elementRows),
  });
}

export function buildCiiAutomaticPathAudit(sourceGraph, targetGraph, options = {}) {
  const source = buildElementPaths(sourceGraph, options); const target = buildElementPaths(targetGraph, options);
  return deepFreeze({
    sourcePathRows: source.pathRows, targetPathRows: target.pathRows,
    sourceAnchorNodeCount: source.anchorNodeCount, targetAnchorNodeCount: target.anchorNodeCount,
  });
}

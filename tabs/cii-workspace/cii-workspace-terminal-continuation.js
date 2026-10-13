import { deepFreeze, stableId } from './cii-workspace-contracts.js';
import { registeredCiiPoint } from './cii-workspace-geometry.js';
import { scoreCiiEdgeCandidate } from './cii-workspace-evidence.js';
import { buildCiiCandidateEvidence } from './cii-workspace-candidates.js';

// Bounded, explicitly opt-in Method A extension. Neither a SOURCE-only route
// nor Node Name creates NODE authority; each emitted step has independent M1,
// M2, OD, local candidate uniqueness and existing-claim custody.
const nodeId = (value) => String(value ?? '');
const sortIds = (a, b) => nodeId(a).localeCompare(nodeId(b), undefined, { numeric: true });
const otherNode = (edge, at) => nodeId(edge.from) === nodeId(at) ? nodeId(edge.to) : nodeId(edge.from);
const incidentEdges = (graph, at, spanIds, previousElementId) =>
  [...(graph?.adjacency?.get(nodeId(at)) || [])]
    .filter((edge) => !spanIds.has(nodeId(edge.elementId)) && nodeId(edge.elementId) !== nodeId(previousElementId))
    .sort((a, b) => sortIds(a.elementId, b.elementId));
function oriented(edge, start) {
  const forward = nodeId(edge.from) === nodeId(start);
  return {
    ...edge, routeFrom: nodeId(start), routeTo: otherNode(edge, start),
    fromPos: forward ? edge.fromPos : edge.toPos,
    toPos: forward ? edge.toPos : edge.fromPos,
    fromContext: forward ? edge.fromContext : edge.toContext,
    toContext: forward ? edge.toContext : edge.fromContext,
    dx: forward ? edge.dx : -Number(edge.dx || 0),
    dy: forward ? edge.dy : -Number(edge.dy || 0),
    dz: forward ? edge.dz : -Number(edge.dz || 0),
  };
}
function uniqueRegisteredTarget(sourceGraph, targetGraph, geometry, sourceNodeId, expectedTargetId, toleranceMm) {
  const source = (sourceGraph?.nodes || []).find((node) => nodeId(node.id) === nodeId(sourceNodeId));
  const registered = registeredCiiPoint(geometry, source?.position);
  if (!registered || !Number.isFinite(toleranceMm) || toleranceMm <= 0) return false;
  let matches = 0; let expected = false;
  for (const node of targetGraph?.nodes || []) {
    const pos = node.position;
    if (!pos) continue;
    const distance = Math.hypot(registered.x - pos.x, registered.y - pos.y, registered.z - pos.z);
    if (!Number.isFinite(distance) || distance > toleranceMm) continue;
    matches += 1;
    if (nodeId(node.id) === nodeId(expectedTargetId)) expected = true;
    if (matches > 1) return false;
  }
  return matches === 1 && expected;
}
function existingClaims(correspondence) {
  const sources = new Set(); const targets = new Set();
  const sourceEdges = new Set(); const targetEdges = new Set();
  for (const row of correspondence?.nodeRows || []) {
    if (row.sourceNodeId != null) sources.add(nodeId(row.sourceNodeId));
    if (row.targetNodeId != null) targets.add(nodeId(row.targetNodeId));
  }
  for (const row of correspondence?.elementRows || []) {
    if (row.sourceElementId) sourceEdges.add(nodeId(row.sourceElementId));
    for (const value of row.targetElementIds || []) targetEdges.add(nodeId(value));
  }
  return { sources, targets, sourceEdges, targetEdges };
}
function extendFlank(sourceGraph, targetGraph, loop, correspondence, side, claims, options) {
  const sourcePath = correspondence.sourcePath; const targetPath = correspondence.targetPath;
  const start = side === 'START';
  const sourceRoot = nodeId(start ? sourcePath.startNode : sourcePath.endNode);
  const targetRoot = nodeId(start ? targetPath.startNode : targetPath.endNode);
  const sourceSpan = new Set(sourcePath.elements.map((edge) => nodeId(edge.elementId)));
  const targetSpan = new Set(targetPath.elements.map((edge) => nodeId(edge.elementId)));
  const lockedRoot = (correspondence.nodeRows || []).some((row) =>
    row.kind === 'NODE' && row.status === 'LOCKED'
    && nodeId(row.sourceNodeId) === sourceRoot && nodeId(row.targetNodeId) === targetRoot);
  if (!lockedRoot) return { side, status: 'ANCHOR_ROOT_NOT_VERIFIED', rows: [], steps: [] };
  let sCurrent = sourceRoot; let tCurrent = targetRoot;
  let sPrevious = null; let tPrevious = null;
  const sourceVisited = new Set([sCurrent]); const targetVisited = new Set([tCurrent]);
  const rows = []; const steps = [];
  for (let step = 0; step < 100; step += 1) {
    const sOutgoing = incidentEdges(sourceGraph, sCurrent, sourceSpan, sPrevious);
    const tOutgoing = incidentEdges(targetGraph, tCurrent, targetSpan, tPrevious);
    if (!sOutgoing.length) return { side, status: 'SOURCE_TAIL_EXHAUSTED', rows, steps };
    if (sOutgoing.length !== 1 || tOutgoing.length !== 1) return {
      side, status: 'EXTERIOR_ROUTE_NONUNIQUE_OR_TARGET_EXHAUSTED', rows, steps,
    };
    const sEdge = oriented(sOutgoing[0], sCurrent);
    const tEdge = oriented(tOutgoing[0], tCurrent);
    const sTo = sEdge.routeTo; const tTo = tEdge.routeTo;
    if (sourceVisited.has(sTo) || targetVisited.has(tTo)) return {
      side, status: 'EXTERIOR_CYCLE', rows, steps,
    };
    if (claims.sources.has(sTo) || claims.targets.has(tTo)
      || claims.sourceEdges.has(nodeId(sEdge.elementId))
      || claims.targetEdges.has(nodeId(tEdge.elementId))) return {
      side, status: 'EXISTING_CORRESPONDENCE_CUSTODY', rows, steps,
    };
    const scored = scoreCiiEdgeCandidate(sEdge, tEdge, { ...options, geometryTransform: loop.geometry });
    const m1 = scored.methods?.m1Spatial; const m2 = scored.methods?.m2Network;
    const od = scored.dimensions?.diameter;
    const candidates = buildCiiCandidateEvidence(sEdge, [tEdge], nodeId(tEdge.elementId),
      { ...options, geometryTransform: loop.geometry });
    const uniqueRegistered = uniqueRegisteredTarget(sourceGraph, targetGraph, loop.geometry,
      sTo, tTo, Number(m1?.toleranceMm));
    const supported = scored.hardFail !== true
      && m1?.available === true && m1?.basis === 'REGISTERED'
      && m1?.orientation === 'DIRECT' && m1?.pass === true
      && (m1?.endpointDistancesMm || []).length === 2
      && (m1.endpointDistancesMm || []).every((distance) => Number.isFinite(distance)
        && distance <= Number(m1.toleranceMm))
      && m2?.pass === true && od?.pass === true && uniqueRegistered
      && candidates.status === 'SUPPORTED'
      && nodeId(candidates.winnerTargetElementId) === nodeId(tEdge.elementId);
    const stepEvidence = deepFreeze({
      side, step: step + 1, sourceNodeId: sTo, targetNodeId: tTo,
      sourceElementId: nodeId(sEdge.elementId), targetElementId: nodeId(tEdge.elementId),
      registeredM1: deepFreeze({
        basis: m1?.basis || null, orientation: m1?.orientation || null, pass: m1?.pass === true,
        endpointDistancesMm: deepFreeze([...(m1?.endpointDistancesMm || [])]),
        toleranceMm: m1?.toleranceMm ?? null,
      }),
      m2Pass: m2?.pass === true, m2Score: m2?.score ?? null,
      m2Threshold: m2?.threshold ?? null, odPass: od?.pass === true,
      candidateStatus: candidates.status,
      candidateWinnerTargetElementId: candidates.winnerTargetElementId || null,
      uniqueRegisteredTarget: uniqueRegistered,
      identitySupported: supported,
    });
    steps.push(stepEvidence);
    if (!supported) return { side, status: 'FIRST_NONQUALIFYING_EXTERIOR_EDGE', rows, steps };
    const confidence = loop.confidence;
    rows.push(deepFreeze({
      correspondenceId: stableId('node', sTo, tTo),
      kind: 'NODE', sourceNodeId: sTo, targetNodeId: tTo,
      status: 'REVIEW', authority: 'METHOD_A_REGISTERED_TERMINAL_PREFIX',
      evidence: deepFreeze({
        identitySupported: true, identityConfidence: confidence,
        identityEvidenceBasis: 'METHOD_A_REGISTERED_TERMINAL_PREFIX',
        methodALoopId: nodeId(loop.loopId || loop.baseId),
        terminalStep: stepEvidence,
        // This is diagnostic candidate evidence; do not turn REVIEW into an
        // automatic identity by placing this under evidence.candidates.
        terminalCandidate: deepFreeze(candidates),
      }),
    }));
    claims.sources.add(sTo); claims.targets.add(tTo);
    claims.sourceEdges.add(nodeId(sEdge.elementId)); claims.targetEdges.add(nodeId(tEdge.elementId));
    sPrevious = nodeId(sEdge.elementId); tPrevious = nodeId(tEdge.elementId);
    sCurrent = sTo; tCurrent = tTo;
    sourceVisited.add(sTo); targetVisited.add(tTo);
  }
  return { side, status: 'HARD_STEP_LIMIT', rows, steps };
}
export function qualifyCiiMethodATerminalContinuation(sourceGraph, targetGraph, loop, correspondence, options = {}) {
  if (loop?.method !== 'METHOD_A_SPATIAL'
    || !['HIGH', 'MEDIUM'].includes(loop.confidence)
    || loop?.geometry?.status !== 'READY'
    || correspondence?.status !== 'READY'
    || correspondence?.pathGate?.status !== 'SUPPORTED'
    || !correspondence.sourcePath?.elements?.length
    || !correspondence.targetPath?.elements?.length) {
    return deepFreeze({ status: 'NOT_QUALIFIED', nodeRows: deepFreeze([]), regions: deepFreeze([]) });
  }
  const claims = existingClaims(correspondence);
  const regions = ['START', 'END'].map((side) =>
    extendFlank(sourceGraph, targetGraph, loop, correspondence, side, claims, options));
  const nodeRows = regions.flatMap((region) => region.rows);
  return deepFreeze({
    status: nodeRows.length ? 'QUALIFIED_PREFIXES' : 'NO_QUALIFIED_PREFIX',
    nodeRows: deepFreeze(nodeRows),
    regions: deepFreeze(regions.map((region) => deepFreeze({
      side: region.side, status: region.status, steps: deepFreeze(region.steps),
      emittedNodeCount: region.rows.length,
    }))),
  });
}

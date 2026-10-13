import { registeredCiiPoint } from '../tabs/cii-workspace/cii-workspace-geometry.js';
import { scoreCiiEdgeCandidate } from '../tabs/cii-workspace/cii-workspace-evidence.js';

// REC-03 READ-ONLY forensic: no source/target correspondence is ever created here.
// Candidate distances do not establish identity and never influence Writer2.
const id = (value) => String(value ?? '');
const byId = (a, b) => id(a).localeCompare(id(b), undefined, { numeric: true });
const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : null;
const other = (edge, node) => id(edge.from) === id(node) ? id(edge.to) : id(edge.from);
const incidents = (graph, node) => [...(graph.adjacency?.get(id(node)) || [])]
  .sort((a, b) => byId(a.elementId, b.elementId));
const nodeIndex = (graph) => new Map((graph.nodes || []).map((row) => [id(row.id), row]));
function walkExterior(graph, root, spanElementIds, maxSteps = 100) {
  const legs = incidents(graph, root).filter((edge) => !spanElementIds.has(id(edge.elementId)));
  const paths = legs.map((first) => {
    const nodes = [id(root)]; const edges = []; let current = id(root); let next = first;
    const visited = new Set();
    let stop = 'MAX_STEPS';
    for (let index = 0; index < maxSteps; index += 1) {
      if (!next || visited.has(id(next.elementId))) { stop = 'EDGE_REPEAT'; break; }
      visited.add(id(next.elementId));
      const end = other(next, current);
      edges.push({ elementId: id(next.elementId), from: current, to: end,
        diameter: next.diameter ?? null, lengthMm: next.lengthMm ?? null });
      nodes.push(end);
      const alternatives = incidents(graph, end)
        .filter((edge) => id(edge.elementId) !== id(next.elementId) && !spanElementIds.has(id(edge.elementId)));
      if (!alternatives.length) { stop = 'TERMINAL_OR_SPAN_EDGE'; break; }
      if (alternatives.length > 1) { stop = 'BRANCH_AMBIGUITY'; break; }
      current = end; next = alternatives[0];
    }
    return { nodes, edges, stop };
  });
  return { root: id(root), incidentOutsideSpan: legs.map((edge) => id(edge.elementId)), paths };
}
function oriented(edge, from) {
  if (id(edge.from) === id(from)) return {
    ...edge, routeFrom: id(from), routeTo: id(edge.to) };
  return { ...edge, routeFrom: id(from), routeTo: id(edge.from),
    fromPos: edge.toPos, toPos: edge.fromPos,
    fromContext: edge.toContext, toContext: edge.fromContext,
    dx: -(edge.dx || 0), dy: -(edge.dy || 0), dz: -(edge.dz || 0) };
}
function firstEdgeScore(sourceGraph, targetGraph, sourceRoot, targetRoot, sourceElementId, targetElementId, geometry) {
  const source = incidents(sourceGraph, sourceRoot).find((edge) => id(edge.elementId) === id(sourceElementId));
  const target = incidents(targetGraph, targetRoot).find((edge) => id(edge.elementId) === id(targetElementId));
  if (!source || !target) return null;
  const scored = scoreCiiEdgeCandidate(oriented(source, sourceRoot), oriented(target, targetRoot), { geometryTransform: geometry });
  const m1 = scored.methods?.m1Spatial || {};
  const m2 = scored.methods?.m2Network || {};
  const od = scored.dimensions?.diameter || {};
  return { sourceElementId: id(sourceElementId), targetElementId: id(targetElementId),
    m1: { available: m1.available === true, basis: m1.basis || null,
      orientation: m1.orientation || null, pass: m1.pass === true,
      endpointDistancesMm: m1.endpointDistancesMm || [], toleranceMm: m1.toleranceMm ?? null },
    m2: { pass: m2.pass === true, score: m2.score ?? null,
      threshold: m2.threshold ?? null, blockers: m2.blockers || [] },
    od: { pass: od.pass === true, source: od.source ?? null, target: od.target ?? null },
    hardFail: scored.hardFail === true, identitySupported: scored.identitySupported === true };
}
function spatialCandidates(sourceNodeId, sourceGraph, targetGraph, geometry, targetOwnerSet) {
  const source = nodeIndex(sourceGraph).get(id(sourceNodeId))?.position || null;
  const registered = registeredCiiPoint(geometry, source);
  if (!registered) return { sourceNodeId: id(sourceNodeId), transformStatus: geometry?.status || 'UNAVAILABLE',
    candidateCountWithin100Mm: 0, closest: [] };
  const ranked = [...nodeIndex(targetGraph)].map(([targetNodeId, node]) => ({
    targetNodeId, distanceMm: distance(registered, node?.position),
    targetDegree: incidents(targetGraph, targetNodeId).length,
    claimedByBoundSource: targetOwnerSet.has(targetNodeId),
  })).filter((row) => Number.isFinite(row.distanceMm))
    .sort((a, b) => a.distanceMm - b.distanceMm || byId(a.targetNodeId, b.targetNodeId));
  return {
    sourceNodeId: id(sourceNodeId),
    candidateCountWithin100Mm: ranked.filter((row) => row.distanceMm <= 100).length,
    nearest: ranked.slice(0, 3).map((row) => ({
      ...row, distanceMm: Number(row.distanceMm.toFixed(3)) })),
  };
}
export function ciiRetainedMethodATerminalForensics(preparedSession, preview, sourceAudit) {
  const targetGraph = preparedSession.target?.targetGraph;
  const ownerSet = new Set((sourceAudit.rows || []).filter((row) => row.state === 'BOUND')
    .map((row) => id(row.targetNodeId)));
  const result = [];
  for (const member of preparedSession.members || []) {
    const sourceId = id(member.sourceId);
    const sourceGraph = member.sourceGraph;
    const memberPreview = (preview.memberPreviews || []).find((row) => row.sourceId === sourceId)?.preview;
    const selected = (memberPreview?.multiBaseCorrespondence?.loopResults || [])
      .find((row) => row.loop?.method === 'METHOD_A_SPATIAL');
    if (!selected?.correspondence?.sourcePath || !selected?.correspondence?.targetPath)
      throw new Error(sourceId + ': READY Method A selected routes required for terminal forensics');
    const sourcePath = selected.correspondence.sourcePath;
    const targetPath = selected.correspondence.targetPath;
    const sourceSpan = new Set(sourcePath.elements.map((edge) => id(edge.elementId)));
    const targetSpan = new Set(targetPath.elements.map((edge) => id(edge.elementId)));
    for (const side of ['START', 'END']) {
      const sourceRoot = side === 'START' ? sourcePath.startNode : sourcePath.endNode;
      const targetRoot = side === 'START' ? targetPath.startNode : targetPath.endNode;
      const source = walkExterior(sourceGraph, sourceRoot, sourceSpan);
      const target = walkExterior(targetGraph, targetRoot, targetSpan);
      const sourceExteriorNodes = [...new Set(source.paths.flatMap((path) => path.nodes.slice(1)))];
      const physicalGapRows = (sourceAudit.rows || []).filter((row) =>
        row.sourceId === sourceId && sourceExteriorNodes.includes(id(row.sourceNodeId)) && row.state === 'UNEMITTED');
      const sourceFirst = source.incidentOutsideSpan;
      const targetFirst = target.incidentOutsideSpan;
      const edgeEvidence = sourceFirst.flatMap((sourceElementId) => targetFirst.map((targetElementId) =>
        firstEdgeScore(sourceGraph, targetGraph, sourceRoot, targetRoot, sourceElementId, targetElementId,
          selected.loop.geometry)));
      result.push({
        sourceId, side, sourceRoot: id(sourceRoot), targetRoot: id(targetRoot),
        sourceExterior: source, targetExterior: target,
        sourceExteriorNodeCount: sourceExteriorNodes.length,
        unemittedExteriorRowKeys: physicalGapRows.map((row) => row.rowKey).sort(byId),
        firstEdgeCandidateEvidence: edgeEvidence,
        registeredNearestForUnemitted: physicalGapRows.map((row) => spatialCandidates(
          row.sourceNodeId, sourceGraph, targetGraph, selected.loop.geometry, ownerSet)),
      });
    }
  }
  return {
    schema: 'CiiMethodATerminalContinuationForensics.v1',
    evidenceStatus: 'READ_ONLY_SOURCE_TARGET_GRAPH_NOT_CORRESPONDENCE_AUTHORITY',
    groupedRegionCount: result.length,
    actualExteriorUnemittedRowCount: result.reduce((sum, row) => sum + row.unemittedExteriorRowKeys.length, 0),
    regions: result,
  };
}

import { CII_WORKSPACE_SCHEMAS, deepFreeze, uniqueStrings } from './cii-workspace-contracts.js';

function otherNode(edge, nodeId) { return String(edge.from) === String(nodeId) ? String(edge.to) : String(edge.from); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function mag(a) { return Math.sqrt(dot(a, a)); }
function mul(a, scale) { return a.map((value) => value * scale); }
function clamp(value) { return Math.max(-1, Math.min(1, value)); }
function unit(vector) { const length = mag(vector); return length > 1e-9 ? mul(vector, 1 / length) : null; }
function angleDeg(a, b, undirected = false) {
  const cosine = dot(a, b);
  return Math.acos(clamp(undirected ? Math.abs(cosine) : cosine)) * 180 / Math.PI;
}
function edgeLength(edge) { return Number(edge.lengthMm || Math.hypot(Number(edge.dx || 0), Number(edge.dy || 0), Number(edge.dz || 0))); }
function rawVector(edge) { return [Number(edge.dx || 0), Number(edge.dy || 0), Number(edge.dz || 0)]; }
function awayVector(edge, nodeId) { return String(edge.from) === String(nodeId) ? rawVector(edge) : mul(rawVector(edge), -1); }
function edgeId(edge) { return String(edge.elementId || `${edge.from}->${edge.to}`); }

function canonicalUndirected(direction) {
  const result = [...direction];
  const pivot = result.find((value) => Math.abs(value) > 1e-12);
  return pivot != null && pivot < 0 ? mul(result, -1) : result;
}
function axisLabel(direction, snapDeg) {
  const axes = [['X', [1, 0, 0]], ['Y', [0, 1, 0]], ['Z', [0, 0, 1]]];
  for (const [label, axis] of axes) if (angleDeg(direction, axis, true) <= snapDeg) return label;
  return `SKEW(${direction.map((value) => Number(value.toFixed(6))).join(',')})`;
}
function terminator(kind, nodeId, componentKind = null) {
  return Object.freeze({ kind, nodeId: String(nodeId), componentKind });
}

function continueRay(graph, currentNode, previousEdge, currentDirection, options) {
  const incident = [...(graph?.adjacency?.get(String(currentNode)) || [])];
  if (incident.length <= 1) return { stop: terminator('TERMINAL', currentNode) };
  if (incident.length >= 3) return { stop: terminator('BRANCH', currentNode) };
  const next = incident.find((edge) => edge !== previousEdge && edgeId(edge) !== edgeId(previousEdge));
  if (!next) return { stop: terminator('TERMINAL', currentNode) };
  if (next.componentKind !== 'PIPE') return { stop: terminator('COMPONENT_TRANSITION', currentNode, next.componentKind) };
  const direction = unit(awayVector(next, currentNode));
  if (!direction) return { stop: terminator('INVALID_GEOMETRY', currentNode) };
  if (angleDeg(currentDirection, direction) > options.runCollinearAngleDeg) {
    return { stop: terminator('DIRECTION_CHANGE', currentNode) };
  }
  return { next, direction };
}

function walkRay(graph, anchorNodeId, startEdge, options) {
  const firstDirection = unit(awayVector(startEdge, anchorNodeId));
  if (!firstDirection || edgeLength(startEdge) <= 1e-9) return null;
  let currentNode = otherNode(startEdge, anchorNodeId); let previousEdge = startEdge;
  let currentDirection = firstDirection; let totalLengthMm = edgeLength(startEdge);
  const elementIds = [edgeId(startEdge)]; let end = null;
  while (!end) {
    if (elementIds.length >= options.maxRunElements) { end = terminator('TRUNCATED', currentNode); break; }
    const nextStep = continueRay(graph, currentNode, previousEdge, currentDirection, options);
    if (nextStep.stop) { end = nextStep.stop; break; }
    const next = nextStep.next; totalLengthMm += edgeLength(next); elementIds.push(edgeId(next));
    previousEdge = next; currentDirection = nextStep.direction; currentNode = otherNode(next, currentNode);
  }
  return { axis: canonicalUndirected(firstDirection), totalLengthMm, elementIds, terminator: end };
}

function mergeRays(rays, options) {
  const groups = [];
  for (const ray of [...rays].sort((a, b) => a.elementIds[0].localeCompare(b.elementIds[0], undefined, { numeric: true }))) {
    let group = groups.find((item) => angleDeg(item.axis, ray.axis, true) <= options.runCollinearAngleDeg);
    if (!group) { group = { axis: ray.axis, rays: [] }; groups.push(group); }
    group.rays.push(ray);
  }
  return groups.map((group, index) => {
    const elementIds = uniqueStrings(group.rays.flatMap((ray) => ray.elementIds));
    const terminators = group.rays.map((ray) => ray.terminator);
    return Object.freeze({
      runId: `R${index + 1}`, axis: Object.freeze(group.axis), axisLabel: axisLabel(group.axis, options.axisLabelSnapDeg),
      totalLengthMm: group.rays.reduce((sum, ray) => sum + ray.totalLengthMm, 0), elementCount: elementIds.length,
      elementIds: Object.freeze(elementIds), terminators: Object.freeze(terminators),
      terminatorClasses: Object.freeze(terminators.map((item) => `${item.kind}:${item.componentKind || ''}`).sort()),
      truncated: terminators.some((item) => item.kind === 'TRUNCATED'),
    });
  });
}

function independentPairs(runs, minimumAngleDeg) {
  const result = [];
  for (let a = 0; a < runs.length - 1; a += 1) {
    for (let b = a + 1; b < runs.length; b += 1) {
      const includedAngleDeg = angleDeg(runs[a].axis, runs[b].axis, true);
      if (includedAngleDeg >= minimumAngleDeg) result.push({ indexes: [a, b], includedAngleDeg });
    }
  }
  return result;
}
function maxIndependentCount(runs, minimumAngleDeg) {
  if (!runs.length) return 0;
  if (runs.length > 12) return independentPairs(runs, minimumAngleDeg).length ? 2 : 1;
  let best = 0;
  const visit = (index, chosen) => {
    if (index === runs.length) { best = Math.max(best, chosen.length); return; }
    visit(index + 1, chosen);
    if (chosen.every((item) => angleDeg(runs[item].axis, runs[index].axis, true) >= minimumAngleDeg)) visit(index + 1, [...chosen, index]);
  };
  visit(0, []); return best;
}

function optionsFor(raw = {}) {
  return {
    runCollinearAngleDeg: Number(raw.runCollinearAngleDeg ?? 0.5),
    axisLabelSnapDeg: Number(raw.axisLabelSnapDeg ?? 2),
    independentAxisAngleDeg: Number(raw.independentAxisAngleDeg ?? 15),
    runIncludedAngleToleranceDeg: Number(raw.runIncludedAngleToleranceDeg ?? 2),
    runLengthRelativeTolerance: Number(raw.runLengthRelativeTolerance ?? 0.1),
    maxRunElements: Math.max(1, Number(raw.maxRunElements ?? 256)),
  };
}

export function extractCiiPipeRunsAtNode(graph, nodeId, rawOptions = {}) {
  const options = optionsFor(rawOptions); const key = String(nodeId);
  const incident = [...(graph?.adjacency?.get(key) || [])].filter((edge) => edge.componentKind === 'PIPE');
  const rays = incident.map((edge) => walkRay(graph, key, edge, options)).filter(Boolean);
  const runs = mergeRays(rays, options); const pairs = independentPairs(runs, options.independentAxisAngleDeg);
  return deepFreeze({
    nodeId: key, runs, runCount: runs.length, independentAxisRunCount: maxIndependentCount(runs, options.independentAxisAngleDeg),
    independentPairs: pairs, truncated: runs.some((run) => run.truncated),
    policy: Object.freeze({ runCollinearAngleDeg: options.runCollinearAngleDeg, independentAxisAngleDeg: options.independentAxisAngleDeg,
      axisLabelSnapDeg: options.axisLabelSnapDeg, maxRunElements: options.maxRunElements }),
  });
}

function sameStrings(left, right) { return left.length === right.length && left.every((value, index) => value === right[index]); }
function relativeError(left, right) { return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right), 1); }
function mappingEvidence(sourceRuns, targetRuns, mapping, options) {
  const rows = mapping.map(([sourceIndex, targetIndex]) => {
    const source = sourceRuns[sourceIndex]; const target = targetRuns[targetIndex];
    const lengthRelativeError = relativeError(source.totalLengthMm, target.totalLengthMm);
    return { sourceRunId: source.runId, targetRunId: target.runId, lengthRelativeError,
      terminatorsCompatible: sameStrings(source.terminatorClasses, target.terminatorClasses) };
  });
  const maxLengthRelativeError = Math.max(...rows.map((row) => row.lengthRelativeError));
  return { rows, maxLengthRelativeError,
    qualified: maxLengthRelativeError <= options.runLengthRelativeTolerance && rows.every((row) => row.terminatorsCompatible) };
}
function comparePairBasis(source, target, sourcePair, targetPair, options) {
  const angleDifferenceDeg = Math.abs(sourcePair.includedAngleDeg - targetPair.includedAngleDeg);
  if (angleDifferenceDeg > options.runIncludedAngleToleranceDeg) return [];
  const [sa, sb] = sourcePair.indexes; const [ta, tb] = targetPair.indexes;
  return [[[sa, ta], [sb, tb]], [[sa, tb], [sb, ta]]].map((mapping) => ({
    sourcePair: sourcePair.indexes, targetPair: targetPair.indexes,
    sourceIncludedAngleDeg: sourcePair.includedAngleDeg, targetIncludedAngleDeg: targetPair.includedAngleDeg,
    angleDifferenceDeg, mapping: mappingEvidence(source.runs, target.runs, mapping, options),
  }));
}

export function qualifyCiiMethodBRunBasis(sourceGraph, targetGraph, sourceNodeId, targetNodeId, rawOptions = {}) {
  const options = optionsFor(rawOptions);
  const source = extractCiiPipeRunsAtNode(sourceGraph, sourceNodeId, options);
  const target = extractCiiPipeRunsAtNode(targetGraph, targetNodeId, options);
  const candidates = [];
  for (const sourcePair of source.independentPairs) for (const targetPair of target.independentPairs) {
    candidates.push(...comparePairBasis(source, target, sourcePair, targetPair, options));
  }
  const qualified = candidates.filter((item) => item.mapping.qualified).sort((a, b) => a.angleDifferenceDeg - b.angleDifferenceDeg
    || a.mapping.maxLengthRelativeError - b.mapping.maxLengthRelativeError
    || a.sourcePair.join('-').localeCompare(b.sourcePair.join('-')) || a.targetPair.join('-').localeCompare(b.targetPair.join('-')));
  const hardGate = source.independentAxisRunCount >= 2 && target.independentAxisRunCount >= 2 && !source.truncated && !target.truncated;
  const status = hardGate && qualified.length ? 'READY' : 'REVIEW';
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.methodBRunBasis, method: 'METHOD_B_NETWORK', status,
    sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId), source, target,
    compatibleBasisCount: qualified.length, selectedBasis: qualified[0] || null,
    reason: status === 'READY' ? 'TWO_AXIS_RUN_BASIS_COMPATIBLE' : (!hardGate ? 'METHOD_B_TWO_AXIS_GATE_NOT_MET' : 'NO_COMPATIBLE_TWO_AXIS_RUN_BASIS'),
    identityExclusions: Object.freeze(['NODE_NUMBER_OFFSET_NOT_USED', 'OD_NOT_USED', 'WALL_NOT_USED']),
    policy: Object.freeze({ independentAxisAngleDeg: options.independentAxisAngleDeg,
      runIncludedAngleToleranceDeg: options.runIncludedAngleToleranceDeg, runLengthRelativeTolerance: options.runLengthRelativeTolerance }),
  });
}

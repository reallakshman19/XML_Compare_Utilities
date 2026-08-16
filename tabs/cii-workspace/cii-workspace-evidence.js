import { deepFreeze } from './cii-workspace-contracts.js';
import { registeredCiiPoint } from './cii-workspace-geometry.js';

function closeness(a, b, tolerance) {
  const left = Number(a); const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.max(0, 1 - Math.abs(left - right) / Math.max(Number(tolerance) || 1, 1e-9));
}

function endpointDegrees(edge) {
  return [edge?.fromContext?.degree || 0, edge?.toContext?.degree || 0].sort((a, b) => a - b);
}

function transitionSignature(edge) {
  return [Boolean(edge?.fromContext?.sizeTransition), Boolean(edge?.toContext?.sizeTransition)].sort().join('|');
}

function relativeDelta(a, b) {
  const left = Number(a); const right = Number(b);
  if (!(left > 0) || !(right > 0)) return 0;
  return Math.abs(left - right) / Math.max(left, right);
}

function structuralBlockers(source, target, options) {
  const blockers = [];
  const sDegrees = endpointDegrees(source); const tDegrees = endpointDegrees(target);
  if ((sDegrees[1] >= 3) !== (tDegrees[1] >= 3)) blockers.push('BRANCH_TOPOLOGY_INCOMPATIBLE');
  if ((source.componentKind === 'RIGID') !== (target.componentKind === 'RIGID')) blockers.push('RIGID_COMPONENT_KIND_INCOMPATIBLE');
  if (transitionSignature(source) !== transitionSignature(target)) blockers.push('SIZE_TRANSITION_CONTEXT_INCOMPATIBLE');
  if (relativeDelta(source.diameter, target.diameter) > Number(options.hardDiameterRelativeTolerance ?? 0.12)) blockers.push('OD_INCOMPATIBLE');
  if (relativeDelta(source.wall, target.wall) > Number(options.hardWallRelativeTolerance ?? 0.35)) blockers.push('WALL_THICKNESS_INCOMPATIBLE');
  return blockers;
}

function jaccard(left = [], right = []) {
  const a = new Set(left); const b = new Set(right);
  if (!a.size && !b.size) return 1;
  let hits = 0;
  for (const value of a) if (b.has(value)) hits += 1;
  return hits / Math.max(new Set([...a, ...b]).size, 1);
}

function contextSimilarity(left, right) {
  const a = left?.neighbourhoodLayers || []; const b = right?.neighbourhoodLayers || [];
  if (!a.length && !b.length) return closeness(left?.degree || 0, right?.degree || 0, 2);
  const weights = [1, 0.7, 0.45]; let total = 0; let weight = 0;
  for (let index = 0; index < weights.length; index += 1) {
    if (!a[index] && !b[index]) continue;
    total += weights[index] * jaccard(a[index] || [], b[index] || []); weight += weights[index];
  }
  return weight ? total / weight : 0;
}

function neighbourhoodSimilarity(source, target) {
  const direct = (contextSimilarity(source?.fromContext, target?.fromContext) + contextSimilarity(source?.toContext, target?.toContext)) / 2;
  const reverse = (contextSimilarity(source?.fromContext, target?.toContext) + contextSimilarity(source?.toContext, target?.fromContext)) / 2;
  return Math.max(direct, reverse);
}

function sequenceSimilarity(source, target) {
  const a = source?.pathSequenceContext || []; const b = target?.pathSequenceContext || [];
  if (!a.length || !b.length) return 0;
  const length = Math.max(a.length, b.length); let matches = 0;
  for (let index = 0; index < length; index += 1) if (a[index] === b[index]) matches += 1;
  return matches / length;
}

function stationFraction(edge) {
  if (edge?.pathStationMidMm == null) return null;
  const total = Number(edge.pathTotalLengthMm || edge.pathTotalVectorLengthMm || 0);
  return total > 0 ? Number(edge.pathStationMidMm) / total : null;
}

function midpoint(edge) {
  if (!edge?.fromPos || !edge?.toPos) return null;
  return {
    x: (Number(edge.fromPos.x) + Number(edge.toPos.x)) / 2,
    y: (Number(edge.fromPos.y) + Number(edge.toPos.y)) / 2,
    z: (Number(edge.fromPos.z) + Number(edge.toPos.z)) / 2,
  };
}

function geometryEvidence(source, target, transform) {
  if (transform?.status !== 'READY') return { score: 0, distanceMm: null, available: false };
  const registered = registeredCiiPoint(transform, midpoint(source)); const targetMid = midpoint(target);
  if (!registered || !targetMid) return { score: 0, distanceMm: null, available: false };
  const distanceMm = Math.hypot(registered.x - targetMid.x, registered.y - targetMid.y, registered.z - targetMid.z);
  return { score: 8 * closeness(distanceMm, 0, 25), distanceMm, available: true };
}

export function scoreCiiEdgeCandidate(source, target, options = {}) {
  const blockers = structuralBlockers(source, target, options);
  const sDegrees = endpointDegrees(source); const tDegrees = endpointDegrees(target);
  const topology = 18 * ((sDegrees[0] === tDegrees[0] && sDegrees[1] === tDegrees[1]) ? 1 : 0);
  const neighbourhood = 15 * neighbourhoodSimilarity(source, target);
  const pathSequence = 12 * sequenceSimilarity(source, target);
  const length = 14 * closeness(source.lengthMm, target.lengthMm, options.lengthToleranceMm || 25);
  const od = 10 * closeness(source.diameter, target.diameter, options.diameterToleranceMm || 2);
  const wall = 5 * closeness(source.wall, target.wall, options.wallToleranceMm || 1);
  const componentKind = source.componentKind === target.componentKind ? 12 : (source.componentKind === 'PIPE' && target.componentKind === 'BEND' ? 2 : 0);
  const rigidLength = source.componentKind === 'RIGID' && target.componentKind === 'RIGID'
    ? 8 * closeness(source.lengthMm, target.lengthMm, options.rigidLengthToleranceMm || 6) : 0;
  const sourceStation = stationFraction(source); const targetStation = stationFraction(target);
  const pathStation = sourceStation != null && targetStation != null ? 10 * closeness(sourceStation, targetStation, 0.08) : 0;
  const geometry = geometryEvidence(source, target, options.geometryTransform);
  const components = { topology, neighbourhood, pathSequence, length, od, wall, componentKind, rigidLength, pathStation, registeredGeometry: geometry.score };
  const score = blockers.length ? 0 : Math.min(100, Object.values(components).reduce((sum, value) => sum + value, 0));
  return deepFreeze({
    score: Number(score.toFixed(1)),
    components: Object.freeze(Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Number(value.toFixed(1))]))),
    blockers: Object.freeze(blockers), geometryDistanceMm: geometry.distanceMm, hardFail: blockers.length > 0,
  });
}

export function ciiAlignmentScore(source, target, options = {}) {
  return scoreCiiEdgeCandidate(source, target, options).score;
}

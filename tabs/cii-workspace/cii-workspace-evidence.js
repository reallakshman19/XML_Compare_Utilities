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

function structuralBlockers(source, target) {
  const blockers = [];
  const sDegrees = endpointDegrees(source); const tDegrees = endpointDegrees(target);
  if ((sDegrees[1] >= 3) !== (tDegrees[1] >= 3)) blockers.push('BRANCH_TOPOLOGY_INCOMPATIBLE');
  if ((source.componentKind === 'RIGID') !== (target.componentKind === 'RIGID')) blockers.push('RIGID_COMPONENT_KIND_INCOMPATIBLE');
  return blockers;
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
  const registered = registeredCiiPoint(transform, midpoint(source));
  const targetMid = midpoint(target);
  if (!registered || !targetMid) return { score: 0, distanceMm: null, available: false };
  const distanceMm = Math.hypot(registered.x - targetMid.x, registered.y - targetMid.y, registered.z - targetMid.z);
  const score = 8 * closeness(distanceMm, 0, 25);
  return { score, distanceMm, available: true };
}

export function scoreCiiEdgeCandidate(source, target, options = {}) {
  const blockers = structuralBlockers(source, target);
  const length = 14 * closeness(source.lengthMm, target.lengthMm, options.lengthToleranceMm || 25);
  const od = 12 * closeness(source.diameter, target.diameter, options.diameterToleranceMm || 2);
  const wall = 5 * closeness(source.wall, target.wall, options.wallToleranceMm || 1);
  const sDegrees = endpointDegrees(source); const tDegrees = endpointDegrees(target);
  const topology = 20 * ((sDegrees[0] === tDegrees[0] && sDegrees[1] === tDegrees[1]) ? 1 : 0);
  const neighbourhood = 13 * (closeness(sDegrees[0], tDegrees[0], 2) + closeness(sDegrees[1], tDegrees[1], 2)) / 2;
  const component = source.componentKind === target.componentKind ? 16 : (source.componentKind === 'PIPE' && target.componentKind === 'BEND' ? 2 : 0);
  const station = source.pathStationMidMm != null && target.pathStationMidMm != null
    ? 12 * closeness(source.pathStationMidMm / Math.max(source.pathTotalLengthMm || 1, 1), target.pathStationMidMm / Math.max(target.pathTotalLengthMm || 1, 1), 0.08) : 0;
  const geometry = geometryEvidence(source, target, options.geometryTransform);
  const components = { topology, neighbourhood, pathSequence: 0, length, od, wall, componentKind: component, rigidLength: 0, pathStation: station, registeredGeometry: geometry.score };
  const score = blockers.length ? 0 : Math.min(100, Object.values(components).reduce((sum, value) => sum + value, 0));
  return deepFreeze({
    score: Number(score.toFixed(1)),
    components: Object.freeze(Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Number(value.toFixed(1))]))),
    blockers: Object.freeze(blockers),
    geometryDistanceMm: geometry.distanceMm,
    hardFail: blockers.length > 0,
  });
}

export function ciiAlignmentScore(source, target, options = {}) {
  return scoreCiiEdgeCandidate(source, target, options).score;
}

import { deepFreeze } from './cii-workspace-contracts.js';
import { evaluateCiiMatchMethods } from './cii-workspace-match-methods.js';

function compatibilityComponents(evaluation) {
  const network = evaluation.m2Network?.components || {};
  const dimensions = evaluation.dimensions || {};
  return Object.freeze({
    topology: Number(network.topology || 0),
    neighbourhood: Number(network.neighbourhood || 0),
    pathSequence: Number(network.pathSequence || 0),
    length: Number(network.localLength || 0),
    od: dimensions.diameter?.pass ? 30 : 0,
    wall: dimensions.wall?.pass ? 30 : 0,
    componentKind: Number(network.componentKind || 0),
    rigidLength: 0,
    pathStation: Number(network.pathStation || 0),
    registeredGeometry: evaluation.m1Spatial?.available
      ? Number((0.5 * Number(evaluation.m1Spatial.score || 0)).toFixed(1)) : 0,
  });
}

/**
 * Candidate evidence contract.
 *
 * Identity is established only by M1 Spatial and/or M2 Network. OD and wall
 * are supporting revision evidence and can never establish identity by
 * themselves. The numeric score remains useful for candidate ranking, while
 * `identityConfidence` carries the engineering meaning for review/UI.
 */
export function scoreCiiEdgeCandidate(source, target, options = {}) {
  const evaluation = evaluateCiiMatchMethods(source, target, options);
  const blockers = evaluation.m2Network?.blockers || [];
  return deepFreeze({
    score: evaluation.identity.score,
    weightedScores: evaluation.identity.weightedScores,
    identityConfidence: evaluation.identity.confidence,
    identitySupported: evaluation.identity.identitySupported,
    identityReasons: evaluation.identity.reasons,
    methods: Object.freeze({
      m1Spatial: evaluation.m1Spatial,
      m2Network: evaluation.m2Network,
    }),
    dimensions: evaluation.dimensions,
    components: compatibilityComponents(evaluation),
    blockers,
    geometryDistanceMm: evaluation.m1Spatial?.distanceMm ?? null,
    hardFail: !evaluation.identity.identitySupported,
  });
}

export function ciiAlignmentScore(source, target, options = {}) {
  return scoreCiiEdgeCandidate(source, target, options).score;
}

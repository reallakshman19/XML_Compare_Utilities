import { deepFreeze } from './cii-workspace-contracts.js';
import { evaluateCiiMatchMethods } from './cii-workspace-match-methods.js';

function compatibilityComponents(evaluation) {
  const network = evaluation.m2Network?.components || {};
  const dimensions = evaluation.dimensions || {};
  return Object.freeze({
    topology: Number(network.topology || 0),
    neighbourhood: Number(network.neighbourhood || 0),
    pathSequence: Number(network.pathSequence || 0),
    // Preserve the historical 14-point public component scale while M2 uses a
    // 10-point local-length contribution internally.
    length: Number((1.4 * Number(network.localLength || 0)).toFixed(1)),
    od: dimensions.diameter?.pass ? 30 : 0,
    wall: dimensions.wall?.pass ? 30 : 0,
    componentKind: Number(network.componentKind || 0),
    rigidLength: 0,
    pathStation: Number(network.pathStation || 0),
    registeredGeometry: evaluation.m1Spatial?.available
      ? Number((0.5 * Number(evaluation.m1Spatial.score || 0)).toFixed(1)) : 0,
  });
}

function rankingScore(evaluation) {
  if (!evaluation.identity?.identitySupported) return 0;
  const methodQuality = [
    evaluation.m1Spatial?.pass ? Number(evaluation.m1Spatial.score || 0) : null,
    evaluation.m2Network?.pass ? Number(evaluation.m2Network.score || 0) : null,
  ].filter(Number.isFinite);
  const quality = methodQuality.length ? Math.max(...methodQuality) : 0;
  return Number((0.5 * Number(evaluation.identity.score || 0) + 0.5 * quality).toFixed(1));
}

/**
 * Candidate evidence contract.
 *
 * Identity is established only by M1 Spatial and/or M2 Network. OD and wall
 * are supporting revision evidence and can never establish identity by
 * themselves. `score` is the configured 50/30/30 confidence score;
 * `rankingScore` adds method quality only for candidate/path ordering.
 */
export function scoreCiiEdgeCandidate(source, target, options = {}) {
  const evaluation = evaluateCiiMatchMethods(source, target, options);
  const blockers = evaluation.m2Network?.blockers || [];
  return deepFreeze({
    score: evaluation.identity.score,
    rankingScore: rankingScore(evaluation),
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
  return scoreCiiEdgeCandidate(source, target, options).rankingScore;
}

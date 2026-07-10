/**
 * evidence-scorer.js — configurable element-pair evidence scoring.
 *
 * Pure scoring: given one source object and one target object (plus their
 * path context), returns a score with a full reason/evidence breakdown.
 * No candidate selection happens here.
 */

export const DEFAULT_COMPARE_CONFIG = Object.freeze({
  shortElementToleranceMm: 6,
  lengthToleranceMm: 6,
  minCandidateScore: 40,
  ambiguityGap: 8,
  highConfidenceScore: 75,
  mediumConfidenceScore: 55,
  useDiameterEvidence: true,
  useNameEvidence: true,
  useStationEvidence: true,
  usePacketEvidence: true,
  diameterRatioTolerance: 0.02,
  registrationResidualToleranceMm: 50,
});

function ratioScore(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return ratio;
}

function nameTokens(name) {
  return String(name ?? '').toUpperCase().split(/[^A-Z0-9]+/).filter((t) => t.length >= 2);
}

/**
 * Score a source/target element pair. Weights sum to 100.
 * Returns { score, breakdown: [{evidence, weight, earned, detail}], reasons, conflicts }.
 */
export function scoreElementPair(source, target, config = DEFAULT_COMPARE_CONFIG, context = {}) {
  const breakdown = [];
  const reasons = [];
  const conflicts = [];
  let weightTotal = 0;
  let earnedTotal = 0;
  const add = (evidence, weight, fraction, detail) => {
    if (fraction === null) return; // evidence unavailable — weight redistributed
    weightTotal += weight;
    earnedTotal += weight * Math.max(0, Math.min(1, fraction));
    breakdown.push({ evidence, weight, earned: Number((weight * fraction).toFixed(2)), detail });
    if (fraction >= 0.9) reasons.push(`${evidence}: ${detail}`);
    if (fraction <= 0.25) conflicts.push(`${evidence}: ${detail}`);
  };

  // Kind (pipe / rigid / bend)
  add('kind', 10, source.kind === target.kind ? 1 : 0.2, `${source.kind} vs ${target.kind}`);

  // Length ratio
  const lengthRatio = ratioScore(source.lengthMm, target.lengthMm);
  const lengthDelta = Math.abs(source.lengthMm - target.lengthMm);
  add('length', 30,
    lengthRatio === null ? null : (lengthDelta <= config.lengthToleranceMm ? 1 : Math.max(0, (lengthRatio - 0.5) * 2)),
    `Δ=${lengthDelta.toFixed(1)}mm ratio=${lengthRatio === null ? 'n/a' : lengthRatio.toFixed(3)}`);

  // Diameter
  if (config.useDiameterEvidence) {
    const diaRatio = ratioScore(source.diameterMm, target.diameterMm);
    add('diameter', 20,
      diaRatio === null ? null : (diaRatio >= 1 - config.diameterRatioTolerance ? 1 : Math.max(0, (diaRatio - 0.7) / 0.3)),
      `src=${source.diameterMm ?? '?'} tgt=${target.diameterMm ?? '?'}`);
  }

  // Path station (relative position along path)
  if (config.useStationEvidence && context.sourcePathLength > 0 && context.targetPathLength > 0) {
    const srcRel = source.stationMm / context.sourcePathLength;
    const tgtRel = target.stationMm / context.targetPathLength;
    const stationDelta = Math.abs(srcRel - tgtRel);
    add('station', 20, Math.max(0, 1 - stationDelta * 4), `relΔ=${stationDelta.toFixed(3)}`);
  }

  // Property packet signature
  if (config.usePacketEvidence) {
    const srcSig = source.packets.map((p) => p.kind).sort().join('+');
    const tgtSig = target.packets.map((p) => p.kind).sort().join('+');
    if (srcSig || tgtSig) {
      add('packets', 12, srcSig === tgtSig ? 1 : (srcSig && tgtSig ? 0.4 : 0.2), `src=[${srcSig}] tgt=[${tgtSig}]`);
    }
  }

  // Name / tag tokens
  if (config.useNameEvidence) {
    const srcTokens = nameTokens(source.name);
    const tgtTokens = nameTokens(target.name);
    if (srcTokens.length && tgtTokens.length) {
      const common = srcTokens.filter((t) => tgtTokens.includes(t));
      add('name', 8, common.length / Math.max(srcTokens.length, tgtTokens.length), `common=[${common.join(',')}]`);
    }
  }

  const score = weightTotal > 0 ? (earnedTotal / weightTotal) * 100 : 0;
  return { score: Number(score.toFixed(2)), breakdown, reasons, conflicts };
}

export function confidenceForScore(score, gap, config = DEFAULT_COMPARE_CONFIG) {
  if (gap < config.ambiguityGap) return 'NONE'; // ambiguous — caller decides
  if (score >= config.highConfidenceScore) return 'HIGH';
  if (score >= config.mediumConfidenceScore) return 'MEDIUM';
  if (score >= config.minCandidateScore) return 'LOW';
  return 'NONE';
}

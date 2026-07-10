/**
 * compare-engine.js — the compare orchestrator (Phase 4).
 *
 * runCompare(graphA, graphB, config, manualOverrides) →
 *   CompareAudit.v1 wrapping ObjectDiff.v1 rows, ConflictLedger.v1 rows,
 *   MatchCandidate.v1 rows, path audit, and RegistrationAudit.v1.
 *
 * Invariants:
 *  - every canonical source object appears in exactly one diff row
 *  - every canonical target object appears in exactly one diff row
 *  - no ambiguous row carries an auto-selected target
 *  - rejected candidates stay visible in matchCandidates
 */

import { CONTRACT_VERSIONS, DIFF_STATUS, PATH_OPS, CONFIDENCE } from '../contracts/contracts.js';
import { scoreElementPair, confidenceForScore, DEFAULT_COMPARE_CONFIG } from './evidence-scorer.js';
import { matchPaths, alignPathElements } from './path-aligner.js';
import { buildRegistration } from './registration-engine.js';

function normalizedDirection(graph, object) {
  const nodeCoord = new Map(graph.nodes.map((n) => [n.nodeId, n.coordMm]));
  const a = nodeCoord.get(object.fromNode);
  const b = nodeCoord.get(object.toNode);
  if (!a || !b) return null;
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-6) return null;
  return v.map((x) => x / len);
}

function packetSignature(object) {
  return object.packets.map((p) => p.kind).sort().join('+');
}

function diffProperties(source, target) {
  const changed = [];
  const keys = new Set([...Object.keys(source.properties), ...Object.keys(target.properties)]);
  for (const key of keys) {
    const a = source.properties[key] ?? '';
    const b = target.properties[key] ?? '';
    if (a === b) continue;
    const numA = Number(a); const numB = Number(b);
    if (Number.isFinite(numA) && Number.isFinite(numB) && Math.abs(numA - numB) < 1e-4) continue;
    changed.push({ property: key, sourceValue: a, targetValue: b });
  }
  const sigA = packetSignature(source);
  const sigB = packetSignature(target);
  if (sigA !== sigB) changed.push({ property: 'PACKETS', sourceValue: sigA, targetValue: sigB });
  return changed;
}

function geometryChanged(graphA, source, graphB, target, config) {
  if (Math.abs(source.lengthMm - target.lengthMm) > config.lengthToleranceMm) return `length Δ=${Math.abs(source.lengthMm - target.lengthMm).toFixed(1)}mm`;
  const dirA = normalizedDirection(graphA, source);
  const dirB = normalizedDirection(graphB, target);
  if (dirA && dirB) {
    const dot = Math.abs(dirA[0] * dirB[0] + dirA[1] * dirB[1] + dirA[2] * dirB[2]);
    if (dot < 0.985) return `direction differs (cos=${dot.toFixed(3)})`; // ~10°
  }
  return null;
}

export function runCompare(graphA, graphB, userConfig = {}, manualOverrides = []) {
  const config = { ...DEFAULT_COMPARE_CONFIG, ...userConfig };
  const objA = new Map(graphA.objects.map((o) => [o.objectId, o]));
  const objB = new Map(graphB.objects.map((o) => [o.objectId, o]));
  const pathsA = new Map(graphA.paths.map((p) => [p.pathId, p]));
  const pathsB = new Map(graphB.paths.map((p) => [p.pathId, p]));

  // ── 1. Path matching ──────────────────────────────────────────────────
  const pathResult = matchPaths(graphA, graphB, config);

  // ── 2. Element alignment inside matched paths ─────────────────────────
  const alignmentRows = [];
  const matchRecords = []; // { sourceObjectId, targetObjectId, pair, via }
  const splitRows = [];
  const mergeRows = [];
  const leftoverSource = new Set(graphA.objects.map((o) => o.objectId));
  const leftoverTarget = new Set(graphB.objects.map((o) => o.objectId));
  const candidateRows = [];

  for (const mapping of pathResult.mappings) {
    const pathA = pathsA.get(mapping.sourcePathId);
    const pathB = pathsB.get(mapping.targetPathId);
    if (!pathA || !pathB) continue;
    const ops = alignPathElements(graphA, pathA, graphB, pathB, config);
    for (const op of ops) {
      alignmentRows.push({
        sourcePathId: mapping.sourcePathId,
        targetPathId: mapping.targetPathId,
        pathStatus: mapping.status,
        op: op.op,
        sourceObjectId: op.sourceObjectId,
        targetObjectId: op.targetObjectId,
        score: op.pair?.score ?? null,
      });
      if (op.pair) {
        candidateRows.push({
          contract: CONTRACT_VERSIONS.MatchCandidate,
          sourceObjectId: op.sourceObjectId,
          targetObjectId: op.targetObjectId,
          score: op.pair.score,
          reasons: op.pair.reasons,
          conflicts: op.pair.conflicts,
          breakdown: op.pair.breakdown,
          origin: 'path-alignment',
          selected: false,
        });
      }
      if (op.op === PATH_OPS.MATCH && mapping.status === PATH_OPS.MATCH) {
        matchRecords.push({ sourceObjectId: op.sourceObjectId, targetObjectId: op.targetObjectId, pair: op.pair, via: 'path-alignment' });
        leftoverSource.delete(op.sourceObjectId);
        leftoverTarget.delete(op.targetObjectId);
      } else if (op.op === PATH_OPS.SPLIT) {
        if (op.sourceObjectId) { splitRows.push(op); leftoverSource.delete(op.sourceObjectId); }
        if (op.targetObjectId) { splitRows.push(op); leftoverTarget.delete(op.targetObjectId); }
      } else if (op.op === PATH_OPS.MERGE) {
        if (op.sourceObjectId) { mergeRows.push(op); leftoverSource.delete(op.sourceObjectId); }
        if (op.targetObjectId) { mergeRows.push(op); leftoverTarget.delete(op.targetObjectId); }
      }
    }
  }

  // ── 3. Global leftover candidate pass (cross-path) ────────────────────
  const leftoverPairs = [];
  for (const sid of leftoverSource) {
    for (const tid of leftoverTarget) {
      const pair = scoreElementPair(objA.get(sid), objB.get(tid), config, {});
      if (pair.score < config.minCandidateScore) continue;
      leftoverPairs.push({ sourceObjectId: sid, targetObjectId: tid, pair });
      candidateRows.push({
        contract: CONTRACT_VERSIONS.MatchCandidate,
        sourceObjectId: sid,
        targetObjectId: tid,
        score: pair.score,
        reasons: pair.reasons,
        conflicts: pair.conflicts,
        breakdown: pair.breakdown,
        origin: 'global-leftover',
        selected: false,
      });
    }
  }
  leftoverPairs.sort((a, b) => b.pair.score - a.pair.score);
  const ambiguousRecords = []; // { sourceObjectId, candidates: [{targetObjectId, score}], bestScore, gap }
  for (const cand of leftoverPairs) {
    if (!leftoverSource.has(cand.sourceObjectId) || !leftoverTarget.has(cand.targetObjectId)) continue;
    const rivals = leftoverPairs.filter((p) => p !== cand
      && ((p.sourceObjectId === cand.sourceObjectId && leftoverTarget.has(p.targetObjectId))
        || (p.targetObjectId === cand.targetObjectId && leftoverSource.has(p.sourceObjectId))));
    const nextBestScore = rivals[0]?.pair.score ?? 0;
    const gap = cand.pair.score - nextBestScore;
    if (gap < config.ambiguityGap && nextBestScore >= config.minCandidateScore) {
      // Ambiguous — do NOT auto-match; leave the target available.
      const candidates = [cand, ...rivals.filter((r) => r.sourceObjectId === cand.sourceObjectId)]
        .map((p) => ({ targetObjectId: p.targetObjectId, score: p.pair.score }));
      ambiguousRecords.push({ sourceObjectId: cand.sourceObjectId, candidates, bestScore: cand.pair.score, gap: Number(gap.toFixed(2)) });
      leftoverSource.delete(cand.sourceObjectId);
      continue;
    }
    matchRecords.push({ sourceObjectId: cand.sourceObjectId, targetObjectId: cand.targetObjectId, pair: cand.pair, via: 'global-leftover' });
    leftoverSource.delete(cand.sourceObjectId);
    leftoverTarget.delete(cand.targetObjectId);
  }

  // ── 4. Manual overrides (ManualOverrideLedger.v1 rows) ────────────────
  for (const override of manualOverrides) {
    if (override.type === 'REJECT') {
      const idx = matchRecords.findIndex((m) => m.sourceObjectId === override.sourceObjectId && m.targetObjectId === override.targetObjectId);
      if (idx >= 0) {
        const [removed] = matchRecords.splice(idx, 1);
        leftoverSource.add(removed.sourceObjectId);
        leftoverTarget.add(removed.targetObjectId);
      }
    } else if (override.type === 'LINK' || override.type === 'ACCEPT') {
      // Free both ends of any existing assignments, then force the link.
      for (let idx = matchRecords.length - 1; idx >= 0; idx -= 1) {
        const m = matchRecords[idx];
        if (m.sourceObjectId === override.sourceObjectId || m.targetObjectId === override.targetObjectId) {
          matchRecords.splice(idx, 1);
          leftoverSource.add(m.sourceObjectId);
          leftoverTarget.add(m.targetObjectId);
        }
      }
      const ambIdx = ambiguousRecords.findIndex((a) => a.sourceObjectId === override.sourceObjectId);
      if (ambIdx >= 0) ambiguousRecords.splice(ambIdx, 1);
      const pair = scoreElementPair(objA.get(override.sourceObjectId), objB.get(override.targetObjectId), config, {});
      matchRecords.push({ sourceObjectId: override.sourceObjectId, targetObjectId: override.targetObjectId, pair, via: 'manual-override' });
      leftoverSource.delete(override.sourceObjectId);
      leftoverTarget.delete(override.targetObjectId);
    }
  }
  for (const record of matchRecords) {
    const row = candidateRows.find((c) => c.sourceObjectId === record.sourceObjectId && c.targetObjectId === record.targetObjectId);
    if (row) row.selected = true;
  }

  // ── 5. Registration ────────────────────────────────────────────────────
  const registration = buildRegistration(graphA, graphB, pathResult.mappings, config);

  // ── 6. Diff rows ───────────────────────────────────────────────────────
  const diffRows = [];
  const conflictRows = [];
  let diffSeq = 0;
  let conflictSeq = 0;
  const nextDiffId = () => `D${(diffSeq += 1)}`;
  const nextConflictId = () => `C${(conflictSeq += 1)}`;

  for (const record of matchRecords) {
    const source = objA.get(record.sourceObjectId);
    const target = objB.get(record.targetObjectId);
    const bestRival = candidateRows
      .filter((c) => !c.selected && (c.sourceObjectId === record.sourceObjectId || c.targetObjectId === record.targetObjectId))
      .reduce((best, c) => Math.max(best, c.score), 0);
    const gap = Number((record.pair.score - bestRival).toFixed(2));
    const confidence = record.via === 'manual-override'
      ? CONFIDENCE.HIGH
      : confidenceForScore(record.pair.score, gap, config);
    const changedProperties = diffProperties(source, target);
    const geometryIssue = geometryChanged(graphA, source, graphB, target, config);
    const status = geometryIssue ? DIFF_STATUS.GEOMETRY_CHANGED
      : changedProperties.length ? DIFF_STATUS.PROPERTY_CHANGED
        : DIFF_STATUS.MATCHED_UNCHANGED;
    const diffId = nextDiffId();
    diffRows.push({
      diffId,
      status,
      sourceObjectId: record.sourceObjectId,
      targetObjectId: record.targetObjectId,
      score: record.pair.score,
      nextBestScore: bestRival,
      scoreGap: gap,
      confidence,
      via: record.via,
      reasons: record.pair.reasons,
      conflicts: record.pair.conflicts,
      breakdown: record.pair.breakdown,
      changedProperties,
      geometryIssue,
    });
    if (record.pair.conflicts.length && status !== DIFF_STATUS.MATCHED_UNCHANGED) {
      conflictRows.push({
        conflictId: nextConflictId(),
        diffId,
        kind: 'EVIDENCE_CONFLICT',
        sourceObjectId: record.sourceObjectId,
        targetObjectId: record.targetObjectId,
        detail: record.pair.conflicts.join('; '),
        resolution: 'OPEN',
      });
    }
  }

  for (const amb of ambiguousRecords) {
    const diffId = nextDiffId();
    diffRows.push({
      diffId,
      status: DIFF_STATUS.AMBIGUOUS,
      sourceObjectId: amb.sourceObjectId,
      targetObjectId: null,
      score: amb.bestScore,
      nextBestScore: Number((amb.bestScore - amb.gap).toFixed(2)),
      scoreGap: amb.gap,
      confidence: CONFIDENCE.NONE,
      via: 'ambiguity-gate',
      reasons: [],
      conflicts: [`ambiguous: ${amb.candidates.length} candidate(s) within gap ${amb.gap}`],
      candidateTargetIds: amb.candidates.map((c) => c.targetObjectId),
      changedProperties: [],
      geometryIssue: null,
    });
    conflictRows.push({
      conflictId: nextConflictId(),
      diffId,
      kind: 'AMBIGUOUS_MATCH',
      sourceObjectId: amb.sourceObjectId,
      targetObjectId: null,
      detail: `Candidates: ${amb.candidates.map((c) => `${c.targetObjectId} (${c.score})`).join(', ')}`,
      resolution: 'OPEN',
    });
  }

  const emitted = new Set();
  for (const op of splitRows.concat(mergeRows)) {
    const key = `${op.sourceObjectId ?? ''}|${op.targetObjectId ?? ''}`;
    if (emitted.has(key)) continue;
    emitted.add(key);
    diffRows.push({
      diffId: nextDiffId(),
      status: op.op === PATH_OPS.SPLIT ? DIFF_STATUS.SPLIT : DIFF_STATUS.MERGE,
      sourceObjectId: op.sourceObjectId,
      targetObjectId: op.targetObjectId,
      score: null,
      confidence: CONFIDENCE.NONE,
      via: 'path-alignment',
      reasons: [op.splitOf ? `split of ${op.splitOf}` : op.mergedInto ? `merged into ${op.mergedInto}` : 'split/merge event'],
      conflicts: [],
      changedProperties: [],
      geometryIssue: null,
    });
  }

  for (const sid of leftoverSource) {
    diffRows.push({
      diffId: nextDiffId(),
      status: DIFF_STATUS.MISSING_IN_TARGET,
      sourceObjectId: sid,
      targetObjectId: null,
      score: null,
      confidence: CONFIDENCE.NONE,
      via: 'unmatched',
      reasons: [],
      conflicts: [],
      changedProperties: [],
      geometryIssue: null,
    });
  }
  for (const tid of leftoverTarget) {
    diffRows.push({
      diffId: nextDiffId(),
      status: DIFF_STATUS.NEW_IN_TARGET,
      sourceObjectId: null,
      targetObjectId: tid,
      score: null,
      confidence: CONFIDENCE.NONE,
      via: 'unmatched',
      reasons: [],
      conflicts: [],
      changedProperties: [],
      geometryIssue: null,
    });
  }

  for (const warning of registration.warnings) {
    conflictRows.push({ conflictId: nextConflictId(), diffId: null, kind: 'REGISTRATION_WARNING', sourceObjectId: null, targetObjectId: null, detail: warning, resolution: 'OPEN' });
  }
  for (const mapping of pathResult.mappings.filter((m) => m.status === PATH_OPS.AMBIGUOUS)) {
    conflictRows.push({ conflictId: nextConflictId(), diffId: null, kind: 'AMBIGUOUS_PATH', sourceObjectId: null, targetObjectId: null, detail: `${mapping.sourcePathId} vs ${mapping.targetPathId} score=${mapping.score} gap=${mapping.scoreGap}`, resolution: 'OPEN' });
  }

  // ── 7. Dashboard counts (derived from rows — never recomputed elsewhere)
  const count = (status) => diffRows.filter((r) => r.status === status).length;
  const matchedRows = diffRows.filter((r) => r.sourceObjectId && r.targetObjectId);
  const confidences = matchedRows.filter((r) => Number.isFinite(r.score));
  const summary = {
    sourceRawElements: graphA.rawElementCount,
    targetRawElements: graphB.rawElementCount,
    sourceCanonicalElements: graphA.canonicalElementCount,
    targetCanonicalElements: graphB.canonicalElementCount,
    consumedSourceElements: graphA.consumedRows.length,
    consumedTargetElements: graphB.consumedRows.length,
    sourcePaths: graphA.paths.length,
    targetPaths: graphB.paths.length,
    matchedPaths: pathResult.mappings.filter((m) => m.status === PATH_OPS.MATCH).length,
    ambiguousPaths: pathResult.mappings.filter((m) => m.status === PATH_OPS.AMBIGUOUS).length,
    matchedElements: matchedRows.length,
    unchangedElements: count(DIFF_STATUS.MATCHED_UNCHANGED),
    propertyChangedElements: count(DIFF_STATUS.PROPERTY_CHANGED),
    geometryChangedElements: count(DIFF_STATUS.GEOMETRY_CHANGED),
    missingInTarget: count(DIFF_STATUS.MISSING_IN_TARGET),
    newInTarget: count(DIFF_STATUS.NEW_IN_TARGET),
    ambiguousElements: count(DIFF_STATUS.AMBIGUOUS),
    splitElements: count(DIFF_STATUS.SPLIT),
    mergeElements: count(DIFF_STATUS.MERGE),
    highConfidenceElements: matchedRows.filter((r) => r.confidence === CONFIDENCE.HIGH).length,
    mediumConfidenceElements: matchedRows.filter((r) => r.confidence === CONFIDENCE.MEDIUM).length,
    lowConfidenceElements: matchedRows.filter((r) => r.confidence === CONFIDENCE.LOW).length,
    evidenceConflictElements: conflictRows.filter((c) => c.kind === 'EVIDENCE_CONFLICT').length,
    conflictCount: conflictRows.length,
    averageMatchScore: confidences.length ? Number((confidences.reduce((s, r) => s + r.score, 0) / confidences.length).toFixed(2)) : 0,
    registrationAnchorCount: registration.anchorCount,
    registrationResidualMaxMm: registration.residualMaxMm,
    registrationResidualAvgMm: registration.residualAvgMm,
  };

  return {
    contract: CONTRACT_VERSIONS.CompareAudit,
    generatedAt: new Date().toISOString(),
    config,
    sourceModelId: graphA.modelId,
    targetModelId: graphB.modelId,
    sourceObjectIds: graphA.objects.map((o) => o.objectId),
    targetObjectIds: graphB.objects.map((o) => o.objectId),
    summary,
    objectDiff: { contract: CONTRACT_VERSIONS.ObjectDiff, rows: diffRows },
    conflictLedger: { contract: CONTRACT_VERSIONS.ConflictLedger, rows: conflictRows },
    matchCandidates: { contract: CONTRACT_VERSIONS.MatchCandidate, rows: candidateRows },
    pathAudit: {
      mappings: pathResult.mappings,
      unmatchedSourcePaths: pathResult.unmatchedSourcePaths,
      unmatchedTargetPaths: pathResult.unmatchedTargetPaths,
      alignmentRows,
    },
    registration,
    manualOverrides: { contract: CONTRACT_VERSIONS.ManualOverrideLedger, rows: manualOverrides },
    normalization: {
      source: { rule: graphA.normalizationRule, consumedRows: graphA.consumedRows },
      target: { rule: graphB.normalizationRule, consumedRows: graphB.consumedRows },
    },
  };
}

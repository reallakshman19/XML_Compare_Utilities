import { NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, normalizeConfig, text } from './navis-tag-isonote-contracts.js';
import { applyAppliesToPropagation } from './navis-tag-applies-to.js';
import { applyAnchorTransformation } from './navis-tag-xml-parser.js';

export const NAVIS_CANDIDATE_SCORE_MODEL = 'TOLERANCE_NORMALIZED_V2';

function chooseSupportPosition(trace, config) {
  const tablePoint = trace.tableRecord?.position || null;
  const jsonPoint = trace.position || null;
  const mode = config.supportCoordinateSource;
  const comparison = tablePoint && jsonPoint ? Math.hypot(tablePoint.x - jsonPoint.x, tablePoint.y - jsonPoint.y, tablePoint.z - jsonPoint.z) : null;
  if (mode === 'table-only') return { point: tablePoint, source: tablePoint ? 'TABLE' : 'NONE', comparison, sourcePath: trace.tableRecord?.positionColumn || '' };
  if (mode === 'json-only') return { point: jsonPoint, source: jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: trace.positionSourcePath || '' };
  if (mode === 'prefer-json-fallback-table') return { point: jsonPoint || tablePoint, source: jsonPoint ? 'STAGED_JSON' : tablePoint ? 'TABLE' : 'NONE', comparison, sourcePath: jsonPoint ? trace.positionSourcePath || '' : trace.tableRecord?.positionColumn || '' };
  if (mode === 'compare-table-json') return { point: tablePoint || jsonPoint, source: tablePoint && jsonPoint ? 'TABLE_AND_STAGED_JSON' : tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: tablePoint ? trace.tableRecord?.positionColumn || '' : trace.positionSourcePath || '' };
  return { point: tablePoint || jsonPoint, source: tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison, sourcePath: tablePoint ? trace.tableRecord?.positionColumn || '' : trace.positionSourcePath || '' };
}

function verticalResidual(deltaEl, odMm, useOdHalf) {
  const hypotheses = [{ basis: 'CENTERLINE', residual: Math.abs(deltaEl) }];
  if (useOdHalf && Number.isFinite(Number(odMm))) {
    const half = Number(odMm) / 2;
    hypotheses.push({ basis: 'OD_HALF_ABOVE', residual: Math.abs(deltaEl - half) });
    hypotheses.push({ basis: 'OD_HALF_BELOW', residual: Math.abs(deltaEl + half) });
  }
  return hypotheses.sort((a, b) => a.residual - b.residual)[0];
}

function toleranceRatio(value, tolerance) {
  const denominator = Math.max(Number(tolerance) || 0, 0.000001);
  return Math.abs(Number(value) || 0) / denominator;
}
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function fixed(value) { return Number(Number(value).toFixed(6)); }

function candidateScore(candidate, config) {
  const ratios = {
    e: toleranceRatio(candidate.deltaEMm, config.eastingToleranceMm),
    n: toleranceRatio(candidate.deltaNMm, config.northingToleranceMm),
    el: toleranceRatio(candidate.verticalResidualMm, config.elevationToleranceMm),
  };
  const rms = Math.sqrt(([ratios.e, ratios.n, ratios.el].reduce((sum, value) => sum + (clamp01(value) ** 2), 0)) / 3);
  let score = 20 + (60 * (1 - clamp01(rms)));
  const reasons = ['ALL_AXES_WITHIN_TOLERANCE', `NORMALIZED_GEOMETRY_RMS_${rms.toFixed(6)}`];
  if (candidate.commentBody) { score += 10; reasons.push('COMMENT_BODY_PRESENT'); }
  if (candidate.positionSource === 'RLTAG_POS3D') { score += 5; reasons.push('DIRECT_RLTAG_POS3D'); }
  if (candidate.diagnostics.length) { score -= 10; reasons.push('TAG_DIAGNOSTIC_PENALTY'); }
  else { score += 5; reasons.push('NO_TAG_DIAGNOSTICS'); }
  if (candidate.verticalBasis !== 'CENTERLINE') reasons.push(candidate.verticalBasis);
  if (!Number.isFinite(candidate.odMm)) reasons.push('OD_UNAVAILABLE');
  return { score: fixed(Math.max(0, Math.min(100, score))), reasons, ratios, rms: fixed(rms) };
}

function axisFailures(deltaE, deltaN, vertical, config) {
  const failedAxes = [];
  if (Math.abs(deltaE) > config.eastingToleranceMm) failedAxes.push('E');
  if (Math.abs(deltaN) > config.northingToleranceMm) failedAxes.push('N');
  if (vertical.residual > config.elevationToleranceMm) failedAxes.push('EL');
  return failedAxes;
}

function candidateFromTag(trace, supportPosition, tag, config) {
  const deltaE = tag.position.x - supportPosition.x;
  const deltaN = tag.position.y - supportPosition.y;
  const deltaEl = tag.position.z - supportPosition.z;
  const vertical = verticalResidual(deltaEl, trace.odMm, config.useOdHalfAlternatives);
  const failedAxes = axisFailures(deltaE, deltaN, vertical, config);
  const ratios = {
    e: toleranceRatio(deltaE, config.eastingToleranceMm),
    n: toleranceRatio(deltaN, config.northingToleranceMm),
    el: toleranceRatio(vertical.residual, config.elevationToleranceMm),
  };
  const candidate = {
    evidenceId: tag.evidenceId, viewName: tag.viewName, viewGuid: tag.viewGuid, tagId: tag.tagId,
    commentId: tag.commentId, commentBody: tag.commentBody, commentUser: tag.commentUser,
    commentStatus: tag.commentStatus, commentDate: tag.commentDate, tagPosition: tag.position,
    positionSource: tag.positionSource, deltaEMm: deltaE, deltaNMm: deltaN, deltaElMm: deltaEl,
    horizontalDistanceMm: Math.hypot(deltaE, deltaN), spatialDistanceMm: Math.hypot(deltaE, deltaN, vertical.residual),
    verticalBasis: vertical.basis, verticalResidualMm: vertical.residual, odMm: trace.odMm,
    odSource: trace.odSource || 'NONE', boreNominalMm: trace.boreNominalMm,
    diagnostics: [...(tag.diagnostics || [])], failedAxes, withinTolerance: failedAxes.length === 0,
    rejectionReasons: failedAxes.map((axis) => `${axis}_OUTSIDE_TOLERANCE`),
    normalizedResidualE: fixed(ratios.e), normalizedResidualN: fixed(ratios.n), normalizedResidualEL: fixed(ratios.el),
    normalizedToleranceDistance: Math.max(ratios.e, ratios.n, ratios.el),
    scoringModel: NAVIS_CANDIDATE_SCORE_MODEL, score: 0, confidenceReasons: [], normalizedGeometryRms: null,
  };
  if (candidate.withinTolerance) {
    const scoring = candidateScore(candidate, config);
    candidate.score = scoring.score;
    candidate.confidenceReasons = scoring.reasons;
    candidate.normalizedGeometryRms = scoring.rms;
  } else candidate.confidenceReasons = [...candidate.rejectionReasons];
  return candidate;
}

function evaluateCandidates(trace, supportPosition, navisTags, config) {
  const accepted = [];
  const rejected = [];
  for (const tag of navisTags) {
    if (!tag.position || !tag.commentBody) continue;
    const candidate = candidateFromTag(trace, supportPosition, tag, config);
    (candidate.withinTolerance ? accepted : rejected).push(candidate);
  }
  accepted.sort((a, b) => b.score - a.score || a.normalizedGeometryRms - b.normalizedGeometryRms || a.horizontalDistanceMm - b.horizontalDistanceMm || a.verticalResidualMm - b.verticalResidualMm || a.evidenceId.localeCompare(b.evidenceId));
  rejected.sort((a, b) => a.normalizedToleranceDistance - b.normalizedToleranceDistance || a.spatialDistanceMm - b.spatialDistanceMm || a.evidenceId.localeCompare(b.evidenceId));
  return { candidates: accepted, nearestRejected: rejected[0] || null };
}

function confidence(score) { if (score >= 85) return 'HIGH'; if (score >= 65) return 'MEDIUM'; if (score >= 40) return 'LOW'; return 'UNRESOLVED'; }
function decisionMeta(candidates, config, distinctCommentCount = 0) {
  const top = candidates[0] || null;
  const runnerUp = candidates[1] || null;
  return {
    scoringModel: NAVIS_CANDIDATE_SCORE_MODEL,
    topCandidateTagId: top?.tagId || '', topCandidateScore: top?.score ?? null,
    runnerUpTagId: runnerUp?.tagId || '', runnerUpScore: runnerUp?.score ?? null,
    scoreGap: runnerUp ? fixed(top.score - runnerUp.score) : null,
    requiredScoreGap: config.ambiguityScoreGap, distinctCommentCount,
  };
}
function unresolvedDecision(nearestRejected, config) {
  const tagLabel = nearestRejected?.tagId || nearestRejected?.evidenceId || '';
  const failed = nearestRejected?.failedAxes?.join('_') || '';
  return {
    status: 'UNRESOLVED', selected: null, nearestRejected,
    ambiguity: nearestRejected ? `NEAREST_TAG_${tagLabel}_OUTSIDE_${failed}_TOLERANCE` : 'NO_PROXIMITY_CANDIDATE',
    decisionReason: nearestRejected ? 'NO_IN_TOLERANCE_CANDIDATE' : 'NO_PROXIMITY_CANDIDATE',
    confidence: 'UNRESOLVED', score: 0,
    confidenceReasons: nearestRejected ? [`NEAREST_TAG_${tagLabel}`, ...(nearestRejected.rejectionReasons || [])] : [],
    ...decisionMeta([], config),
  };
}
function decision(candidates, config, nearestRejected = null) {
  if (!candidates.length) return unresolvedDecision(nearestRejected, config);
  const uniqueText = new Map();
  candidates.forEach((candidate) => {
    const key = text(candidate.commentBody).toUpperCase().replace(/\s+/g, ' ');
    if (!uniqueText.has(key)) uniqueText.set(key, candidate);
  });
  const selected = candidates[0];
  const meta = decisionMeta(candidates, config, uniqueText.size);
  const modelReason = `SCORE_MODEL_${NAVIS_CANDIDATE_SCORE_MODEL}`;
  if (uniqueText.size === 1) return {
    status: 'RESOLVED', selected, nearestRejected, decisionReason: candidates.length > 1 ? 'DUPLICATE_SAME_TEXT' : 'UNIQUE_CANDIDATE',
    ambiguity: candidates.length > 1 ? 'DUPLICATE_SAME_TEXT' : '', confidence: confidence(selected.score), score: selected.score,
    confidenceReasons: [...selected.confidenceReasons, modelReason, candidates.length > 1 ? 'DUPLICATE_TEXT_DEDUPLICATED' : 'UNIQUE_CANDIDATE'], ...meta,
  };
  if ((meta.scoreGap ?? 0) >= config.ambiguityScoreGap) return {
    status: 'RESOLVED', selected, nearestRejected, decisionReason: 'RUNNER_UP_REJECTED_BY_SCORE_GAP',
    ambiguity: 'RUNNER_UP_REJECTED_BY_SCORE_GAP', confidence: confidence(selected.score), score: selected.score,
    confidenceReasons: [...selected.confidenceReasons, modelReason, `RUNNER_UP_GAP_${meta.scoreGap}`], ...meta,
  };
  return {
    status: 'AMBIGUOUS', selected: null, nearestRejected, decisionReason: 'CONFLICTING_NEARBY_COMMENTS',
    ambiguity: 'CONFLICTING_NEARBY_COMMENTS', confidence: 'AMBIGUOUS', score: selected.score,
    confidenceReasons: [modelReason, 'MULTIPLE_DIFFERENT_COMMENTS', `TOP_SCORE_GAP_${meta.scoreGap ?? 0}`], ...meta,
  };
}

function positionLabel(point) { return point ? `E=${point.x};N=${point.y};EL=${point.z}` : ''; }
function nearestRejectedMessage(candidate, config) {
  const label = candidate?.tagId ? `Tag ${candidate.tagId}` : candidate?.evidenceId || 'Nearest Navis tag';
  return `${label} (${candidate?.viewName || 'unnamed view'}) is the nearest rejected tag: ΔE ${candidate.deltaEMm.toFixed(3)} mm, ΔN ${candidate.deltaNMm.toFixed(3)} mm, ΔEL ${candidate.deltaElMm.toFixed(3)} mm, vertical residual ${candidate.verticalResidualMm.toFixed(3)} mm. Failed axes: ${candidate.failedAxes.join(', ') || '(none)'}. Tolerances: E ${config.eastingToleranceMm} mm, N ${config.northingToleranceMm} mm, EL ${config.elevationToleranceMm} mm.`;
}
function ledgerBase(record, trace, positionChoice) {
  return {
    tableRowId: record.rowId, tableRowIndex: record.rowIndex, canonicalIdentity: record.identity,
    tableIdentityRaw: record.identityRaw, groupedIdentities: record.groupedIdentities || [record.identity].filter(Boolean),
    groupMemberCount: record.groupMemberCount || 1, supportRoot: record.supportRoot, inputPipe: record.inputPipe,
    jsonNodeId: trace?.selectedNodeId || '', jsonSourceFile: trace?.selectedSourceFile || '', jsonPath: trace?.selectedJsonPath || '',
    jsonAncestorIds: trace?.selectedAncestorIds || [], jsonIdentityPath: trace?.selectedIdentityPath || '',
    jsonPositionPath: trace?.positionSourcePath || '', resolvedBranch: trace?.resolvedBranch || '',
    resolvedPipe: trace?.resolvedPipe || '', resolvedZone: trace?.resolvedZone || '', odMm: trace?.odMm ?? null,
    odSource: trace?.odSource || 'NONE', boreNominalMm: trace?.boreNominalMm ?? null,
    supportPositionSource: positionChoice.source, supportPositionPath: positionChoice.sourcePath,
    supportPosition: positionChoice.point, tableJsonCoordinateDeltaMm: positionChoice.comparison,
  };
}
function resultEvidence(result) {
  return {
    scoringModel: result.scoringModel, decisionStatus: result.status, decisionReason: result.decisionReason,
    topCandidateTagId: result.topCandidateTagId, topCandidateScore: result.topCandidateScore,
    runnerUpTagId: result.runnerUpTagId, runnerUpScore: result.runnerUpScore,
    scoreGap: result.scoreGap, requiredScoreGap: result.requiredScoreGap,
    distinctCommentCount: result.distinctCommentCount,
  };
}
function appendCandidateLedger(candidateLedger, base, candidates, result) {
  candidates.forEach((candidate, index) => candidateLedger.push({
    ledgerId: `${base.tableRowId}:C${index + 1}`, ledgerKind: 'ACCEPTED_CANDIDATE', ...base,
    candidateRank: index + 1, accepted: result.selected?.evidenceId === candidate.evidenceId,
    ...resultEvidence(result), ...candidate,
  }));
}
function appendNearestRejected(candidateLedger, diagnostics, base, result, config) {
  if (result.selected || !result.nearestRejected || result.topCandidateTagId) return;
  candidateLedger.push({
    ledgerId: `${base.tableRowId}:NEAREST-REJECTED`, ledgerKind: 'NEAREST_REJECTED', ...base,
    candidateRank: 1, accepted: false, ...resultEvidence(result), ...result.nearestRejected,
  });
  diagnostics.push({
    severity: 'WARN', code: 'NAVIS_NEAREST_TAG_OUTSIDE_TOLERANCE', rowId: base.tableRowId,
    identity: base.canonicalIdentity, evidenceId: result.nearestRejected.evidenceId,
    tagId: result.nearestRejected.tagId, viewName: result.nearestRejected.viewName,
    failedAxes: result.nearestRejected.failedAxes, deltaEMm: result.nearestRejected.deltaEMm,
    deltaNMm: result.nearestRejected.deltaNMm, deltaElMm: result.nearestRejected.deltaElMm,
    verticalResidualMm: result.nearestRejected.verticalResidualMm,
    message: nearestRejectedMessage(result.nearestRejected, config),
  });
}
function buildDecisionRow(record, trace, positionChoice, candidates, result) {
  const nearest = result.nearestRejected || null;
  return {
    decisionId: `DECISION-${record.rowId}`, ...ledgerBase(record, trace, positionChoice),
    identityStatus: trace?.status || 'UNRESOLVED', identityTraceId: trace?.traceId || '',
    odPath: trace?.odPath || '', odLookupName: trace?.odLookupName || '', borePath: trace?.borePath || '',
    boreUnits: trace?.boreUnits || '', candidateCount: candidates.length, status: result.status,
    ambiguity: result.ambiguity, confidence: result.confidence, confidenceScore: result.score,
    confidenceReasons: result.confidenceReasons, ...resultEvidence(result), supportIsonote: result.selected?.commentBody || '',
    selectedEvidenceId: result.selected?.evidenceId || '', selectedViewName: result.selected?.viewName || '',
    selectedViewGuid: result.selected?.viewGuid || '', selectedTagId: result.selected?.tagId || '',
    selectedCommentId: result.selected?.commentId || '', selectedNavisPosition: result.selected?.tagPosition || null,
    selectedNavisPositionSource: result.selected?.positionSource || '', selectedCandidate: result.selected,
    nearestRejectedEvidenceId: nearest?.evidenceId || '', nearestRejectedViewName: nearest?.viewName || '',
    nearestRejectedViewGuid: nearest?.viewGuid || '', nearestRejectedTagId: nearest?.tagId || '',
    nearestRejectedCommentId: nearest?.commentId || '', nearestRejectedCommentBody: nearest?.commentBody || '',
    nearestRejectedNavisPosition: nearest?.tagPosition || null, nearestRejectedAxes: nearest?.failedAxes || [],
    nearestRejectedDeltaEMm: nearest?.deltaEMm ?? null, nearestRejectedDeltaNMm: nearest?.deltaNMm ?? null,
    nearestRejectedDeltaElMm: nearest?.deltaElMm ?? null, nearestRejectedVerticalResidualMm: nearest?.verticalResidualMm ?? null,
    nearestRejectedCandidate: nearest,
  };
}
function buildAugmentedRow(record, decisionRow, result, candidates) {
  return {
    ...record.rawRow, 'Support ISONOTE': decisionRow.supportIsonote, 'Proximity PS/SL': record.supportRoot,
    'Resolved Branch Name': decisionRow.resolvedBranch, 'Resolved Pipe Name': decisionRow.resolvedPipe,
    'Resolved Zone Name': decisionRow.resolvedZone, 'Resolved Support POS': positionLabel(decisionRow.supportPosition),
    'Support Position Path': decisionRow.supportPositionPath, 'Navis Tag POS': positionLabel(result.selected?.tagPosition),
    'Navis Position Source': result.selected?.positionSource || '', 'Delta E mm': result.selected?.deltaEMm ?? '',
    'Delta N mm': result.selected?.deltaNMm ?? '', 'Delta EL mm': result.selected?.deltaElMm ?? '',
    'Bore Nominal mm': decisionRow.boreNominalMm ?? '', 'Bore Source Path': decisionRow.borePath,
    'OD mm': decisionRow.odMm ?? '', 'OD Source Path': decisionRow.odPath, 'OD Source': decisionRow.odSource,
    'OD Lookup Name': decisionRow.odLookupName, 'Vertical Basis': result.selected?.verticalBasis || '',
    'Vertical Residual mm': result.selected?.verticalResidualMm ?? '', 'Candidate Count': candidates.length,
    'Candidate Score Model': decisionRow.scoringModel, 'Decision Reason': decisionRow.decisionReason,
    'Top Candidate Tag ID': decisionRow.topCandidateTagId, 'Top Candidate Score': decisionRow.topCandidateScore ?? '',
    'Runner-up Tag ID': decisionRow.runnerUpTagId, 'Runner-up Score': decisionRow.runnerUpScore ?? '',
    'Score Gap': decisionRow.scoreGap ?? '', 'Required Score Gap': decisionRow.requiredScoreGap,
    'Distinct Comment Count': decisionRow.distinctCommentCount, Ambiguities: decisionRow.ambiguity,
    Confidence: decisionRow.confidence, 'Confidence Score': decisionRow.confidenceScore,
    'Confidence Reasons': decisionRow.confidenceReasons.join('|'), 'Match Source': decisionRow.supportPositionSource,
    'Evidence ID': decisionRow.selectedEvidenceId, 'Navis View Name': decisionRow.selectedViewName,
    'Navis View GUID': decisionRow.selectedViewGuid, 'Navis Tag ID': decisionRow.selectedTagId,
    'Navis Comment ID': decisionRow.selectedCommentId, 'Nearest Rejected Navis Tag ID': decisionRow.nearestRejectedTagId,
    'Nearest Rejected Navis View': decisionRow.nearestRejectedViewName,
    'Nearest Rejected Axes': decisionRow.nearestRejectedAxes.join('|'),
    'Nearest Rejected Delta E mm': decisionRow.nearestRejectedDeltaEMm ?? '',
    'Nearest Rejected Delta N mm': decisionRow.nearestRejectedDeltaNMm ?? '',
    'Nearest Rejected Delta EL mm': decisionRow.nearestRejectedDeltaElMm ?? '',
    'Nearest Rejected Vertical Residual mm': decisionRow.nearestRejectedVerticalResidualMm ?? '',
    'Identity Trace ID': decisionRow.identityTraceId,
  };
}

export function resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, inputConfig = {}) {
  let config = normalizeConfig({ ...(tableBuild?.config || {}), ...(identityTrace?.config || {}), ...inputConfig });
  const configuredSupportCoordinateSource = config.supportCoordinateSource;
  if (navisParse && identityTrace) {
    applyAnchorTransformation(navisParse, identityTrace, config);
    if (navisParse.anchor?.active) config = {
      ...config, navisEastingDatumMm: navisParse.anchor.deltaEMm,
      navisNorthingDatumMm: navisParse.anchor.deltaNMm, navisElevationDatumMm: navisParse.anchor.deltaElMm,
      supportCoordinateSource: 'prefer-json-fallback-table',
    };
  }
  const traceByRow = new Map((identityTrace?.rows || []).map((row) => [row.tableRowId, row]));
  const candidateLedger = [];
  const decisions = [];
  const augmentedRows = [];
  const diagnostics = [...(tableBuild?.diagnostics || []), ...(identityTrace?.diagnostics || []), ...(navisParse?.diagnostics || [])];
  if (navisParse?.anchor?.active && configuredSupportCoordinateSource !== config.supportCoordinateSource) diagnostics.push({
    severity: 'INFO', code: 'ANCHOR_JSON_COORDINATE_SOURCE_OVERRIDE', anchorTagId: navisParse.anchor.tagId,
    anchorSupportIdentity: navisParse.anchor.supportIdentity, configuredSupportCoordinateSource,
    appliedSupportCoordinateSource: config.supportCoordinateSource,
    message: `Anchor mode changed the Stage 3 support coordinate source from ${configuredSupportCoordinateSource} to ${config.supportCoordinateSource} so matching uses the staged JSON frame that defined the anchor.`,
  });
  for (const record of tableBuild?.records || []) {
    const trace = traceByRow.get(record.rowId);
    const positionChoice = trace ? chooseSupportPosition(trace, config) : { point: record.position, source: record.position ? 'TABLE' : 'NONE', comparison: null, sourcePath: record.positionColumn || '' };
    if (Number.isFinite(positionChoice.comparison) && positionChoice.comparison > config.coordinateDisagreementToleranceMm) diagnostics.push({ severity: 'WARN', code: 'TABLE_JSON_COORDINATE_DISAGREEMENT', rowId: record.rowId, identity: record.identity, distanceMm: positionChoice.comparison, message: `Table and staged coordinates differ by ${positionChoice.comparison.toFixed(3)} mm.` });
    const evaluation = positionChoice.point ? evaluateCandidates(trace || {}, positionChoice.point, navisParse?.tags || [], config) : { candidates: [], nearestRejected: null };
    const candidates = evaluation.candidates;
    const result = positionChoice.point ? decision(candidates, config, evaluation.nearestRejected) : { ...unresolvedDecision(null, config), ambiguity: trace?.status || 'SUPPORT_POSITION_UNAVAILABLE', decisionReason: 'SUPPORT_POSITION_UNAVAILABLE', confidenceReasons: ['SUPPORT_POSITION_UNAVAILABLE'] };
    const base = ledgerBase(record, trace, positionChoice);
    appendCandidateLedger(candidateLedger, base, candidates, result);
    appendNearestRejected(candidateLedger, diagnostics, base, result, config);
    const decisionRow = buildDecisionRow(record, trace, positionChoice, candidates, result);
    decisions.push(decisionRow);
    augmentedRows.push(buildAugmentedRow(record, decisionRow, result, candidates));
  }
  const matchedRows = decisions.filter((row) => row.status === 'RESOLVED');
  const ambiguousRows = decisions.filter((row) => row.status === 'AMBIGUOUS');
  const rejectedRows = decisions.filter((row) => row.status === 'UNRESOLVED');
  const directAudit = {
    schema: NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, config,
    summary: {
      tableRowCount: tableBuild?.records?.length || 0, identityResolvedCount: identityTrace?.summary?.resolvedCount || 0,
      navisTagCount: navisParse?.summary?.tagCount || 0, resolvedCount: matchedRows.length,
      ambiguousCount: ambiguousRows.length, unresolvedCount: rejectedRows.length,
      nearestRejectedCount: decisions.filter((row) => row.nearestRejectedTagId).length,
      candidateLedgerCount: candidateLedger.length, scoringModel: NAVIS_CANDIDATE_SCORE_MODEL,
    },
    augmentedRows, decisions, matchedRows, ambiguousRows, rejectedRows, candidateLedger, diagnostics,
  };
  return applyAppliesToPropagation(directAudit, inputConfig);
}

export const _test = Object.freeze({ axisFailures, candidateFromTag, candidateScore, chooseSupportPosition, decision, evaluateCandidates, verticalResidual });

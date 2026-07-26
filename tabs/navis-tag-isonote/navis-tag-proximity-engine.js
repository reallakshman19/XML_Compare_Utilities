import { NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, normalizeConfig, text } from './navis-tag-isonote-contracts.js';
import { applyAppliesToPropagation } from './navis-tag-applies-to.js';
import { applyAnchorTransformation } from './navis-tag-xml-parser.js';

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
function candidateScore(candidate, config) {
  let score = 35;
  const reasons = [];
  if (candidate.horizontalDistanceMm <= 50) { score += 20; reasons.push('EN_WITHIN_50MM'); }
  else { score += 10; reasons.push('EN_WITHIN_CONFIGURED_TOLERANCE'); }
  if (candidate.verticalResidualMm <= 50) { score += 20; reasons.push('VERTICAL_WITHIN_50MM'); }
  else { score += 10; reasons.push('VERTICAL_WITHIN_CONFIGURED_TOLERANCE'); }
  if (candidate.verticalBasis !== 'CENTERLINE') { score += 5; reasons.push(candidate.verticalBasis); }
  if (candidate.commentBody) { score += 10; reasons.push('COMMENT_BODY_PRESENT'); }
  if (candidate.positionSource === 'RLTAG_POS3D') { score += 5; reasons.push('DIRECT_RLTAG_POS3D'); }
  if (!Number.isFinite(candidate.odMm)) reasons.push('OD_UNAVAILABLE');
  if (candidate.diagnostics.length) score -= 10;
  return { score: Math.max(0, Math.min(100, score)), reasons };
}
function axisFailures(deltaE, deltaN, vertical, config) {
  const failedAxes = [];
  if (Math.abs(deltaE) > config.eastingToleranceMm) failedAxes.push('E');
  if (Math.abs(deltaN) > config.northingToleranceMm) failedAxes.push('N');
  if (vertical.residual > config.elevationToleranceMm) failedAxes.push('EL');
  return failedAxes;
}
function toleranceRatio(value, tolerance) {
  const denominator = Math.max(Number(tolerance) || 0, 0.000001);
  return Math.abs(Number(value) || 0) / denominator;
}
function candidateFromTag(trace, supportPosition, tag, config) {
  const deltaE = tag.position.x - supportPosition.x;
  const deltaN = tag.position.y - supportPosition.y;
  const deltaEl = tag.position.z - supportPosition.z;
  const vertical = verticalResidual(deltaEl, trace.odMm, config.useOdHalfAlternatives);
  const failedAxes = axisFailures(deltaE, deltaN, vertical, config);
  const candidate = {
    evidenceId: tag.evidenceId,
    viewName: tag.viewName,
    viewGuid: tag.viewGuid,
    tagId: tag.tagId,
    commentId: tag.commentId,
    commentBody: tag.commentBody,
    commentUser: tag.commentUser,
    commentStatus: tag.commentStatus,
    commentDate: tag.commentDate,
    tagPosition: tag.position,
    positionSource: tag.positionSource,
    deltaEMm: deltaE,
    deltaNMm: deltaN,
    deltaElMm: deltaEl,
    horizontalDistanceMm: Math.hypot(deltaE, deltaN),
    spatialDistanceMm: Math.hypot(deltaE, deltaN, vertical.residual),
    verticalBasis: vertical.basis,
    verticalResidualMm: vertical.residual,
    odMm: trace.odMm,
    odSource: trace.odSource || 'NONE',
    boreNominalMm: trace.boreNominalMm,
    diagnostics: [...(tag.diagnostics || [])],
    failedAxes,
    withinTolerance: failedAxes.length === 0,
    rejectionReasons: failedAxes.map((axis) => `${axis}_OUTSIDE_TOLERANCE`),
    normalizedToleranceDistance: Math.max(
      toleranceRatio(deltaE, config.eastingToleranceMm),
      toleranceRatio(deltaN, config.northingToleranceMm),
      toleranceRatio(vertical.residual, config.elevationToleranceMm),
    ),
    score: 0,
    confidenceReasons: [],
  };
  if (candidate.withinTolerance) {
    const scoring = candidateScore(candidate, config);
    candidate.score = scoring.score;
    candidate.confidenceReasons = scoring.reasons;
  } else {
    candidate.confidenceReasons = [...candidate.rejectionReasons];
  }
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
  accepted.sort((a, b) => b.score - a.score || a.horizontalDistanceMm - b.horizontalDistanceMm || a.verticalResidualMm - b.verticalResidualMm || a.evidenceId.localeCompare(b.evidenceId));
  rejected.sort((a, b) => a.normalizedToleranceDistance - b.normalizedToleranceDistance || a.spatialDistanceMm - b.spatialDistanceMm || a.evidenceId.localeCompare(b.evidenceId));
  return { candidates: accepted, nearestRejected: rejected[0] || null };
}
function confidence(score) { if (score >= 85) return 'HIGH'; if (score >= 65) return 'MEDIUM'; if (score >= 40) return 'LOW'; return 'UNRESOLVED'; }
function decision(candidates, config, nearestRejected = null) {
  if (!candidates.length) {
    const tagLabel = nearestRejected?.tagId || nearestRejected?.evidenceId || '';
    const failed = nearestRejected?.failedAxes?.join('_') || '';
    return {
      status: 'UNRESOLVED',
      selected: null,
      nearestRejected,
      ambiguity: nearestRejected ? `NEAREST_TAG_${tagLabel}_OUTSIDE_${failed}_TOLERANCE` : 'NO_PROXIMITY_CANDIDATE',
      confidence: 'UNRESOLVED',
      score: 0,
      confidenceReasons: nearestRejected ? [`NEAREST_TAG_${tagLabel}`, ...(nearestRejected.rejectionReasons || [])] : [],
    };
  }
  const uniqueText = new Map();
  candidates.forEach((candidate) => {
    const key = text(candidate.commentBody).toUpperCase().replace(/\s+/g, ' ');
    if (!uniqueText.has(key)) uniqueText.set(key, candidate);
  });
  const selected = candidates[0];
  if (uniqueText.size === 1) return { status: 'RESOLVED', selected, nearestRejected, ambiguity: candidates.length > 1 ? 'DUPLICATE_SAME_TEXT' : '', confidence: confidence(selected.score), score: selected.score, confidenceReasons: [...selected.confidenceReasons, candidates.length > 1 ? 'DUPLICATE_TEXT_DEDUPLICATED' : 'UNIQUE_CANDIDATE'].filter(Boolean) };
  const gap = selected.score - (candidates[1]?.score ?? 0);
  if (gap >= config.ambiguityScoreGap) return { status: 'RESOLVED', selected, nearestRejected, ambiguity: 'RUNNER_UP_REJECTED_BY_SCORE_GAP', confidence: confidence(selected.score), score: selected.score, confidenceReasons: [...selected.confidenceReasons, `RUNNER_UP_GAP_${gap}`] };
  return { status: 'AMBIGUOUS', selected: null, nearestRejected, ambiguity: 'CONFLICTING_NEARBY_COMMENTS', confidence: 'AMBIGUOUS', score: selected.score, confidenceReasons: ['MULTIPLE_DIFFERENT_COMMENTS', `TOP_SCORE_GAP_${gap}`] };
}
function positionLabel(point) { return point ? `E=${point.x};N=${point.y};EL=${point.z}` : ''; }
function nearestRejectedMessage(candidate, config) {
  const label = candidate?.tagId ? `Tag ${candidate.tagId}` : candidate?.evidenceId || 'Nearest Navis tag';
  return `${label} (${candidate?.viewName || 'unnamed view'}) is the nearest rejected tag: ΔE ${candidate.deltaEMm.toFixed(3)} mm, ΔN ${candidate.deltaNMm.toFixed(3)} mm, ΔEL ${candidate.deltaElMm.toFixed(3)} mm, vertical residual ${candidate.verticalResidualMm.toFixed(3)} mm. Failed axes: ${candidate.failedAxes.join(', ') || '(none)'}. Tolerances: E ${config.eastingToleranceMm} mm, N ${config.northingToleranceMm} mm, EL ${config.elevationToleranceMm} mm.`;
}

export function resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, inputConfig = {}) {
  let config = normalizeConfig({ ...(tableBuild?.config || {}), ...(identityTrace?.config || {}), ...inputConfig });
  if (navisParse && identityTrace) {
    applyAnchorTransformation(navisParse, identityTrace, config);
    if (navisParse.anchor?.active) {
      config = {
        ...config,
        navisEastingDatumMm: navisParse.anchor.deltaEMm,
        navisNorthingDatumMm: navisParse.anchor.deltaNMm,
        navisElevationDatumMm: navisParse.anchor.deltaElMm,
      };
    }
  }
  const traceByRow = new Map((identityTrace?.rows || []).map((row) => [row.tableRowId, row]));
  const candidateLedger = [];
  const decisions = [];
  const augmentedRows = [];
  const diagnostics = [...(tableBuild?.diagnostics || []), ...(identityTrace?.diagnostics || []), ...(navisParse?.diagnostics || [])];
  for (const record of tableBuild?.records || []) {
    const trace = traceByRow.get(record.rowId);
    const positionChoice = trace ? chooseSupportPosition(trace, config) : { point: record.position, source: record.position ? 'TABLE' : 'NONE', comparison: null, sourcePath: record.positionColumn || '' };
    if (Number.isFinite(positionChoice.comparison) && positionChoice.comparison > config.coordinateDisagreementToleranceMm) diagnostics.push({ severity: 'WARN', code: 'TABLE_JSON_COORDINATE_DISAGREEMENT', rowId: record.rowId, identity: record.identity, distanceMm: positionChoice.comparison, message: `Table and staged coordinates differ by ${positionChoice.comparison.toFixed(3)} mm.` });
    const evaluation = positionChoice.point ? evaluateCandidates(trace || {}, positionChoice.point, navisParse?.tags || [], config) : { candidates: [], nearestRejected: null };
    const candidates = evaluation.candidates;
    const result = positionChoice.point ? decision(candidates, config, evaluation.nearestRejected) : { status: 'UNRESOLVED', selected: null, nearestRejected: null, ambiguity: trace?.status || 'SUPPORT_POSITION_UNAVAILABLE', confidence: 'UNRESOLVED', score: 0, confidenceReasons: ['SUPPORT_POSITION_UNAVAILABLE'] };
    const ledgerBase = {
      tableRowId: record.rowId,
      tableRowIndex: record.rowIndex,
      canonicalIdentity: record.identity,
      tableIdentityRaw: record.identityRaw,
      groupedIdentities: record.groupedIdentities || [record.identity].filter(Boolean),
      groupMemberCount: record.groupMemberCount || 1,
      supportRoot: record.supportRoot,
      inputPipe: record.inputPipe,
      jsonNodeId: trace?.selectedNodeId || '',
      jsonSourceFile: trace?.selectedSourceFile || '',
      jsonPath: trace?.selectedJsonPath || '',
      jsonAncestorIds: trace?.selectedAncestorIds || [],
      jsonIdentityPath: trace?.selectedIdentityPath || '',
      jsonPositionPath: trace?.positionSourcePath || '',
      resolvedBranch: trace?.resolvedBranch || '',
      resolvedPipe: trace?.resolvedPipe || '',
      resolvedZone: trace?.resolvedZone || '',
      odMm: trace?.odMm ?? null,
      odSource: trace?.odSource || 'NONE',
      boreNominalMm: trace?.boreNominalMm ?? null,
      supportPositionSource: positionChoice.source,
      supportPositionPath: positionChoice.sourcePath,
      supportPosition: positionChoice.point,
      tableJsonCoordinateDeltaMm: positionChoice.comparison,
    };
    candidates.forEach((candidate, index) => candidateLedger.push({
      ledgerId: `${record.rowId}:C${index + 1}`,
      ledgerKind: 'ACCEPTED_CANDIDATE',
      ...ledgerBase,
      candidateRank: index + 1,
      accepted: result.selected?.evidenceId === candidate.evidenceId,
      ...candidate,
    }));
    if (!candidates.length && result.nearestRejected) {
      candidateLedger.push({
        ledgerId: `${record.rowId}:NEAREST-REJECTED`,
        ledgerKind: 'NEAREST_REJECTED',
        ...ledgerBase,
        candidateRank: 1,
        accepted: false,
        ...result.nearestRejected,
      });
      diagnostics.push({
        severity: 'WARN',
        code: 'NAVIS_NEAREST_TAG_OUTSIDE_TOLERANCE',
        rowId: record.rowId,
        identity: record.identity,
        evidenceId: result.nearestRejected.evidenceId,
        tagId: result.nearestRejected.tagId,
        viewName: result.nearestRejected.viewName,
        failedAxes: result.nearestRejected.failedAxes,
        deltaEMm: result.nearestRejected.deltaEMm,
        deltaNMm: result.nearestRejected.deltaNMm,
        deltaElMm: result.nearestRejected.deltaElMm,
        verticalResidualMm: result.nearestRejected.verticalResidualMm,
        message: nearestRejectedMessage(result.nearestRejected, config),
      });
    }
    const nearest = result.nearestRejected || null;
    const decisionRow = {
      decisionId: `DECISION-${record.rowId}`,
      tableRowId: record.rowId,
      tableRowIndex: record.rowIndex,
      canonicalIdentity: record.identity,
      tableIdentityRaw: record.identityRaw,
      groupedIdentities: record.groupedIdentities || [record.identity].filter(Boolean),
      groupMemberCount: record.groupMemberCount || 1,
      supportRoot: record.supportRoot,
      identityStatus: trace?.status || 'UNRESOLVED',
      identityTraceId: trace?.traceId || '',
      jsonNodeId: trace?.selectedNodeId || '',
      jsonSourceFile: trace?.selectedSourceFile || '',
      jsonPath: trace?.selectedJsonPath || '',
      jsonAncestorIds: trace?.selectedAncestorIds || [],
      jsonIdentityPath: trace?.selectedIdentityPath || '',
      jsonPositionPath: trace?.positionSourcePath || '',
      resolvedBranch: trace?.resolvedBranch || '',
      resolvedPipe: trace?.resolvedPipe || '',
      resolvedZone: trace?.resolvedZone || '',
      odMm: trace?.odMm ?? null,
      odPath: trace?.odPath || '',
      odSource: trace?.odSource || 'NONE',
      odLookupName: trace?.odLookupName || '',
      boreNominalMm: trace?.boreNominalMm ?? null,
      borePath: trace?.borePath || '',
      boreUnits: trace?.boreUnits || config.jsonBoreUnits,
      supportPositionSource: positionChoice.source,
      supportPositionPath: positionChoice.sourcePath,
      supportPosition: positionChoice.point,
      tableJsonCoordinateDeltaMm: positionChoice.comparison,
      candidateCount: candidates.length,
      status: result.status,
      ambiguity: result.ambiguity,
      confidence: result.confidence,
      confidenceScore: result.score,
      confidenceReasons: result.confidenceReasons,
      supportIsonote: result.selected?.commentBody || '',
      selectedEvidenceId: result.selected?.evidenceId || '',
      selectedViewName: result.selected?.viewName || '',
      selectedViewGuid: result.selected?.viewGuid || '',
      selectedTagId: result.selected?.tagId || '',
      selectedCommentId: result.selected?.commentId || '',
      selectedNavisPosition: result.selected?.tagPosition || null,
      selectedNavisPositionSource: result.selected?.positionSource || '',
      selectedCandidate: result.selected,
      nearestRejectedEvidenceId: nearest?.evidenceId || '',
      nearestRejectedViewName: nearest?.viewName || '',
      nearestRejectedViewGuid: nearest?.viewGuid || '',
      nearestRejectedTagId: nearest?.tagId || '',
      nearestRejectedCommentId: nearest?.commentId || '',
      nearestRejectedCommentBody: nearest?.commentBody || '',
      nearestRejectedNavisPosition: nearest?.tagPosition || null,
      nearestRejectedAxes: nearest?.failedAxes || [],
      nearestRejectedDeltaEMm: nearest?.deltaEMm ?? null,
      nearestRejectedDeltaNMm: nearest?.deltaNMm ?? null,
      nearestRejectedDeltaElMm: nearest?.deltaElMm ?? null,
      nearestRejectedVerticalResidualMm: nearest?.verticalResidualMm ?? null,
      nearestRejectedCandidate: nearest,
    };
    decisions.push(decisionRow);
    augmentedRows.push({
      ...record.rawRow,
      'Support ISONOTE': decisionRow.supportIsonote,
      'Proximity PS/SL': record.supportRoot,
      'Resolved Branch Name': decisionRow.resolvedBranch,
      'Resolved Pipe Name': decisionRow.resolvedPipe,
      'Resolved Zone Name': decisionRow.resolvedZone,
      'Resolved Support POS': positionLabel(decisionRow.supportPosition),
      'Support Position Path': decisionRow.supportPositionPath,
      'Navis Tag POS': positionLabel(result.selected?.tagPosition),
      'Navis Position Source': result.selected?.positionSource || '',
      'Delta E mm': result.selected?.deltaEMm ?? '',
      'Delta N mm': result.selected?.deltaNMm ?? '',
      'Delta EL mm': result.selected?.deltaElMm ?? '',
      'Bore Nominal mm': decisionRow.boreNominalMm ?? '',
      'Bore Source Path': decisionRow.borePath,
      'OD mm': decisionRow.odMm ?? '',
      'OD Source Path': decisionRow.odPath,
      'OD Source': decisionRow.odSource,
      'OD Lookup Name': decisionRow.odLookupName,
      'Vertical Basis': result.selected?.verticalBasis || '',
      'Vertical Residual mm': result.selected?.verticalResidualMm ?? '',
      'Candidate Count': candidates.length,
      Ambiguities: decisionRow.ambiguity,
      Confidence: decisionRow.confidence,
      'Confidence Score': decisionRow.confidenceScore,
      'Confidence Reasons': decisionRow.confidenceReasons.join('|'),
      'Match Source': decisionRow.supportPositionSource,
      'Evidence ID': decisionRow.selectedEvidenceId,
      'Navis View Name': decisionRow.selectedViewName,
      'Navis View GUID': decisionRow.selectedViewGuid,
      'Navis Tag ID': decisionRow.selectedTagId,
      'Navis Comment ID': decisionRow.selectedCommentId,
      'Nearest Rejected Navis Tag ID': decisionRow.nearestRejectedTagId,
      'Nearest Rejected Navis View': decisionRow.nearestRejectedViewName,
      'Nearest Rejected Axes': decisionRow.nearestRejectedAxes.join('|'),
      'Nearest Rejected Delta E mm': decisionRow.nearestRejectedDeltaEMm ?? '',
      'Nearest Rejected Delta N mm': decisionRow.nearestRejectedDeltaNMm ?? '',
      'Nearest Rejected Delta EL mm': decisionRow.nearestRejectedDeltaElMm ?? '',
      'Nearest Rejected Vertical Residual mm': decisionRow.nearestRejectedVerticalResidualMm ?? '',
      'Identity Trace ID': decisionRow.identityTraceId,
    });
  }
  const matchedRows = decisions.filter((row) => row.status === 'RESOLVED');
  const ambiguousRows = decisions.filter((row) => row.status === 'AMBIGUOUS');
  const rejectedRows = decisions.filter((row) => row.status === 'UNRESOLVED');
  const directAudit = {
    schema: NAVIS_TAG_ISONOTE_AUDIT_SCHEMA,
    config,
    summary: {
      tableRowCount: tableBuild?.records?.length || 0,
      identityResolvedCount: identityTrace?.summary?.resolvedCount || 0,
      navisTagCount: navisParse?.summary?.tagCount || 0,
      resolvedCount: matchedRows.length,
      ambiguousCount: ambiguousRows.length,
      unresolvedCount: rejectedRows.length,
      nearestRejectedCount: decisions.filter((row) => row.nearestRejectedTagId).length,
      candidateLedgerCount: candidateLedger.length,
    },
    augmentedRows,
    decisions,
    matchedRows,
    ambiguousRows,
    rejectedRows,
    candidateLedger,
    diagnostics,
  };
  return applyAppliesToPropagation(directAudit, inputConfig);
}

export const _test = Object.freeze({ axisFailures, candidateFromTag, evaluateCandidates, verticalResidual });

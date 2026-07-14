import { NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, normalizeConfig, text } from './navis-tag-isonote-contracts.js';

function chooseSupportPosition(trace, config) {
  const tablePoint = trace.tableRecord?.position || null;
  const jsonPoint = trace.position || null;
  const mode = config.supportCoordinateSource;
  const comparison = tablePoint && jsonPoint ? Math.hypot(tablePoint.x - jsonPoint.x, tablePoint.y - jsonPoint.y, tablePoint.z - jsonPoint.z) : null;
  if (mode === 'table-only') return { point: tablePoint, source: tablePoint ? 'TABLE' : 'NONE', comparison };
  if (mode === 'json-only') return { point: jsonPoint, source: jsonPoint ? 'STAGED_JSON' : 'NONE', comparison };
  if (mode === 'prefer-json-fallback-table') return { point: jsonPoint || tablePoint, source: jsonPoint ? 'STAGED_JSON' : tablePoint ? 'TABLE' : 'NONE', comparison };
  if (mode === 'compare-table-json') return { point: tablePoint || jsonPoint, source: tablePoint && jsonPoint ? 'TABLE_AND_STAGED_JSON' : tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison };
  return { point: tablePoint || jsonPoint, source: tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison };
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
function buildCandidates(trace, supportPosition, navisTags, config) {
  const candidates = [];
  for (const tag of navisTags) {
    if (!tag.position || !tag.commentBody) continue;
    const deltaE = tag.position.x - supportPosition.x;
    const deltaN = tag.position.y - supportPosition.y;
    const deltaEl = tag.position.z - supportPosition.z;
    if (Math.abs(deltaE) > config.eastingToleranceMm || Math.abs(deltaN) > config.northingToleranceMm) continue;
    const vertical = verticalResidual(deltaEl, trace.odMm, config.useOdHalfAlternatives);
    if (vertical.residual > config.elevationToleranceMm) continue;
    const candidate = {
      evidenceId: tag.evidenceId, viewName: tag.viewName, viewGuid: tag.viewGuid, tagId: tag.tagId, commentId: tag.commentId,
      commentBody: tag.commentBody, commentUser: tag.commentUser, commentStatus: tag.commentStatus, commentDate: tag.commentDate,
      tagPosition: tag.position, positionSource: tag.positionSource,
      deltaEMm: deltaE, deltaNMm: deltaN, deltaElMm: deltaEl, horizontalDistanceMm: Math.hypot(deltaE, deltaN),
      verticalBasis: vertical.basis, verticalResidualMm: vertical.residual, odMm: trace.odMm,
      diagnostics: [...(tag.diagnostics || [])], score: 0, confidenceReasons: [],
    };
    const scoring = candidateScore(candidate, config);
    candidate.score = scoring.score;
    candidate.confidenceReasons = scoring.reasons;
    candidates.push(candidate);
  }
  return candidates.sort((a, b) => b.score - a.score || a.horizontalDistanceMm - b.horizontalDistanceMm || a.verticalResidualMm - b.verticalResidualMm || a.evidenceId.localeCompare(b.evidenceId));
}
function confidence(score) { if (score >= 85) return 'HIGH'; if (score >= 65) return 'MEDIUM'; if (score >= 40) return 'LOW'; return 'UNRESOLVED'; }
function decision(candidates, config) {
  if (!candidates.length) return { status: 'UNRESOLVED', selected: null, ambiguity: 'NO_PROXIMITY_CANDIDATE', confidence: 'UNRESOLVED', score: 0, confidenceReasons: [] };
  const uniqueText = new Map();
  candidates.forEach((candidate) => {
    const key = text(candidate.commentBody).toUpperCase().replace(/\s+/g, ' ');
    if (!uniqueText.has(key)) uniqueText.set(key, candidate);
  });
  const selected = candidates[0];
  if (uniqueText.size === 1) return { status: 'RESOLVED', selected, ambiguity: candidates.length > 1 ? 'DUPLICATE_SAME_TEXT' : '', confidence: confidence(selected.score), score: selected.score, confidenceReasons: [...selected.confidenceReasons, candidates.length > 1 ? 'DUPLICATE_TEXT_DEDUPLICATED' : 'UNIQUE_CANDIDATE'].filter(Boolean) };
  const gap = selected.score - (candidates[1]?.score ?? 0);
  if (gap >= config.ambiguityScoreGap) return { status: 'RESOLVED', selected, ambiguity: 'RUNNER_UP_REJECTED_BY_SCORE_GAP', confidence: confidence(selected.score), score: selected.score, confidenceReasons: [...selected.confidenceReasons, `RUNNER_UP_GAP_${gap}`] };
  return { status: 'AMBIGUOUS', selected: null, ambiguity: 'CONFLICTING_NEARBY_COMMENTS', confidence: 'AMBIGUOUS', score: selected.score, confidenceReasons: ['MULTIPLE_DIFFERENT_COMMENTS', `TOP_SCORE_GAP_${gap}`] };
}
function positionLabel(point) { return point ? `E=${point.x};N=${point.y};EL=${point.z}` : ''; }

export function resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, inputConfig = {}) {
  const config = normalizeConfig({ ...(tableBuild?.config || {}), ...(identityTrace?.config || {}), ...inputConfig });
  const traceByRow = new Map((identityTrace?.rows || []).map((row) => [row.tableRowId, row]));
  const candidateLedger = [];
  const decisions = [];
  const augmentedRows = [];
  const diagnostics = [...(tableBuild?.diagnostics || []), ...(identityTrace?.diagnostics || []), ...(navisParse?.diagnostics || [])];
  for (const record of tableBuild?.records || []) {
    const trace = traceByRow.get(record.rowId);
    const positionChoice = trace ? chooseSupportPosition(trace, config) : { point: record.position, source: record.position ? 'TABLE' : 'NONE', comparison: null };
    if (Number.isFinite(positionChoice.comparison) && positionChoice.comparison > config.coordinateDisagreementToleranceMm) diagnostics.push({ severity: 'WARN', code: 'TABLE_JSON_COORDINATE_DISAGREEMENT', rowId: record.rowId, identity: record.identity, distanceMm: positionChoice.comparison, message: `Table and staged coordinates differ by ${positionChoice.comparison.toFixed(3)} mm.` });
    const candidates = positionChoice.point ? buildCandidates(trace || {}, positionChoice.point, navisParse?.tags || [], config) : [];
    const result = positionChoice.point ? decision(candidates, config) : { status: 'UNRESOLVED', selected: null, ambiguity: trace?.status || 'SUPPORT_POSITION_UNAVAILABLE', confidence: 'UNRESOLVED', score: 0, confidenceReasons: ['SUPPORT_POSITION_UNAVAILABLE'] };
    candidates.forEach((candidate, index) => candidateLedger.push({
      ledgerId: `${record.rowId}:C${index + 1}`, tableRowId: record.rowId, tableRowIndex: record.rowIndex,
      canonicalIdentity: record.identity, supportRoot: record.supportRoot, inputPipe: record.inputPipe,
      jsonNodeId: trace?.selectedNodeId || '', jsonPath: trace?.selectedJsonPath || '', jsonIdentityPath: trace?.selectedIdentityPath || '', jsonPositionPath: trace?.positionSourcePath || '', resolvedBranch: trace?.resolvedBranch || '',
      supportPositionSource: positionChoice.source, supportPosition: positionChoice.point, tableJsonCoordinateDeltaMm: positionChoice.comparison,
      candidateRank: index + 1, accepted: result.selected?.evidenceId === candidate.evidenceId, ...candidate,
    }));
    const decisionRow = {
      decisionId: `DECISION-${record.rowId}`, tableRowId: record.rowId, tableRowIndex: record.rowIndex,
      canonicalIdentity: record.identity, supportRoot: record.supportRoot, identityStatus: trace?.status || 'UNRESOLVED', identityTraceId: trace?.traceId || '',
      jsonNodeId: trace?.selectedNodeId || '', jsonPath: trace?.selectedJsonPath || '', jsonIdentityPath: trace?.selectedIdentityPath || '', jsonPositionPath: trace?.positionSourcePath || '', resolvedBranch: trace?.resolvedBranch || '',
      supportPositionSource: positionChoice.source, supportPosition: positionChoice.point, tableJsonCoordinateDeltaMm: positionChoice.comparison,
      candidateCount: candidates.length, status: result.status, ambiguity: result.ambiguity, confidence: result.confidence, confidenceScore: result.score, confidenceReasons: result.confidenceReasons,
      supportIsonote: result.selected?.commentBody || '', selectedEvidenceId: result.selected?.evidenceId || '', selectedViewGuid: result.selected?.viewGuid || '', selectedTagId: result.selected?.tagId || '', selectedCommentId: result.selected?.commentId || '', selectedCandidate: result.selected,
    };
    decisions.push(decisionRow);
    augmentedRows.push({
      ...record.rawRow,
      'Support ISONOTE': decisionRow.supportIsonote,
      'Proximity PS/SL': record.supportRoot,
      'Resolved Branch Name': decisionRow.resolvedBranch,
      'Resolved Support POS': positionLabel(decisionRow.supportPosition),
      'Support Position Path': decisionRow.jsonPositionPath || record.positionColumn || '',
      'Navis Tag POS': positionLabel(result.selected?.tagPosition),
      'Navis Position Source': result.selected?.positionSource || '',
      'Delta E mm': result.selected?.deltaEMm ?? '', 'Delta N mm': result.selected?.deltaNMm ?? '', 'Delta EL mm': result.selected?.deltaElMm ?? '',
      'OD mm': trace?.odMm ?? '', 'Vertical Basis': result.selected?.verticalBasis || '', 'Vertical Residual mm': result.selected?.verticalResidualMm ?? '',
      'Candidate Count': candidates.length, Ambiguities: decisionRow.ambiguity, Confidence: decisionRow.confidence, 'Confidence Score': decisionRow.confidenceScore, 'Confidence Reasons': decisionRow.confidenceReasons.join('|'),
      'Match Source': decisionRow.supportPositionSource, 'Evidence ID': decisionRow.selectedEvidenceId,
      'Navis View GUID': decisionRow.selectedViewGuid, 'Navis Tag ID': decisionRow.selectedTagId, 'Navis Comment ID': decisionRow.selectedCommentId,
      'Identity Trace ID': decisionRow.identityTraceId,
    });
  }
  const matchedRows = decisions.filter((row) => row.status === 'RESOLVED');
  const ambiguousRows = decisions.filter((row) => row.status === 'AMBIGUOUS');
  const rejectedRows = decisions.filter((row) => row.status === 'UNRESOLVED');
  return {
    schema: NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, config,
    summary: { tableRowCount: tableBuild?.records?.length || 0, identityResolvedCount: identityTrace?.summary?.resolvedCount || 0, navisTagCount: navisParse?.summary?.tagCount || 0, resolvedCount: matchedRows.length, ambiguousCount: ambiguousRows.length, unresolvedCount: rejectedRows.length, candidateLedgerCount: candidateLedger.length },
    augmentedRows, decisions, matchedRows, ambiguousRows, rejectedRows, candidateLedger, diagnostics,
  };
}

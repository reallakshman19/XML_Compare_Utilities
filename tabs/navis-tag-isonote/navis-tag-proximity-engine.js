import { NAVIS_TAG_ISONOTE_AUDIT_SCHEMA, normalizeConfig, parseCoordinate, text } from './navis-tag-isonote-contracts.js';

function chooseSupportPosition(trace, config) {
  const tablePoint = trace.tableRecord?.position || null;
  const jsonPoint = trace.position || null;
  const mode = config.supportCoordinateSource;
  if (mode === 'table-only') return { point: tablePoint, source: tablePoint ? 'TABLE' : 'NONE' };
  if (mode === 'json-only') return { point: jsonPoint, source: jsonPoint ? 'STAGED_JSON' : 'NONE' };
  if (mode === 'prefer-json-fallback-table') return { point: jsonPoint || tablePoint, source: jsonPoint ? 'STAGED_JSON' : tablePoint ? 'TABLE' : 'NONE' };
  if (mode === 'compare-table-json') return { point: tablePoint || jsonPoint, source: tablePoint && jsonPoint ? 'TABLE_AND_STAGED_JSON' : tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE', comparison: tablePoint && jsonPoint ? Math.hypot(tablePoint.x - jsonPoint.x, tablePoint.y - jsonPoint.y, tablePoint.z - jsonPoint.z) : null };
  return { point: tablePoint || jsonPoint, source: tablePoint ? 'TABLE' : jsonPoint ? 'STAGED_JSON' : 'NONE' };
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
  let score = 45;
  const h = candidate.horizontalDistanceMm;
  const v = candidate.verticalResidualMm;
  score += h <= 50 ? 20 : h <= Math.max(config.eastingToleranceMm, config.northingToleranceMm) ? 10 : 0;
  score += v <= 50 ? 20 : v <= config.elevationToleranceMm ? 10 : 0;
  if (candidate.verticalBasis !== 'CENTERLINE') score += 5;
  if (candidate.commentBody) score += 10;
  if (candidate.diagnostics.length) score -= 10;
  return Math.max(0, Math.min(100, score));
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
      deltaEMm: deltaE,
      deltaNMm: deltaN,
      deltaElMm: deltaEl,
      horizontalDistanceMm: Math.hypot(deltaE, deltaN),
      verticalBasis: vertical.basis,
      verticalResidualMm: vertical.residual,
      odMm: trace.odMm,
      diagnostics: [...(tag.diagnostics || [])],
      score: 0,
    };
    candidate.score = candidateScore(candidate, config);
    candidates.push(candidate);
  }
  return candidates.sort((a, b) => b.score - a.score || a.horizontalDistanceMm - b.horizontalDistanceMm || a.verticalResidualMm - b.verticalResidualMm || a.evidenceId.localeCompare(b.evidenceId));
}

function decision(candidates, config) {
  if (!candidates.length) return { status: 'UNRESOLVED', selected: null, ambiguity: 'NO_PROXIMITY_CANDIDATE', confidence: 'UNRESOLVED', score: 0 };
  const uniqueText = new Map();
  candidates.forEach((candidate) => {
    const key = text(candidate.commentBody).toUpperCase().replace(/\s+/g, ' ');
    if (!uniqueText.has(key)) uniqueText.set(key, candidate);
  });
  const selected = candidates[0];
  if (uniqueText.size === 1) {
    return { status: 'RESOLVED', selected, ambiguity: candidates.length > 1 ? 'DUPLICATE_SAME_TEXT' : '', confidence: selected.score >= 85 ? 'HIGH' : selected.score >= 65 ? 'MEDIUM' : 'LOW', score: selected.score };
  }
  const gap = selected.score - (candidates[1]?.score ?? 0);
  if (gap >= config.ambiguityScoreGap) return { status: 'RESOLVED', selected, ambiguity: 'RUNNER_UP_REJECTED_BY_SCORE_GAP', confidence: selected.score >= 85 ? 'HIGH' : 'MEDIUM', score: selected.score };
  return { status: 'AMBIGUOUS', selected: null, ambiguity: 'CONFLICTING_NEARBY_COMMENTS', confidence: 'AMBIGUOUS', score: selected.score };
}

export function resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, inputConfig = {}) {
  const config = normalizeConfig({ ...(tableBuild?.config || {}), ...(identityTrace?.config || {}), ...inputConfig });
  const traceByRow = new Map((identityTrace?.rows || []).map((row) => [row.tableRowId, row]));
  const candidateLedger = [];
  const decisions = [];
  const augmentedRows = [];
  const diagnostics = [...(tableBuild?.diagnostics || []), ...(identityTrace?.diagnostics || []), ...(navisParse?.diagnostics || [])];

  for (const record of tableBuild?.records || []) {
    const trace = traceByRow.get(record.rowId);
    const positionChoice = trace ? chooseSupportPosition(trace, config) : { point: record.position, source: record.position ? 'TABLE' : 'NONE' };
    const canResolveFromTable = Boolean(positionChoice.point && String(positionChoice.source).includes('TABLE'));
    const canResolveFromJson = Boolean(positionChoice.point && trace?.selectedNodeId);
    const candidates = canResolveFromTable || canResolveFromJson ? buildCandidates(trace || {}, positionChoice.point, navisParse?.tags || [], config) : [];
    const result = canResolveFromTable || canResolveFromJson
      ? decision(candidates, config)
      : { status: 'UNRESOLVED', selected: null, ambiguity: trace?.status || 'IDENTITY_UNRESOLVED', confidence: 'UNRESOLVED', score: 0 };
    candidates.forEach((candidate, index) => candidateLedger.push({
      ledgerId: `${record.rowId}:C${index + 1}`,
      tableRowId: record.rowId,
      tableRowIndex: record.rowIndex,
      canonicalIdentity: record.identity,
      supportRoot: record.supportRoot,
      inputPipe: record.inputPipe,
      jsonNodeId: trace?.selectedNodeId || '',
      jsonPath: trace?.selectedJsonPath || '',
      jsonIdentityPath: trace?.selectedIdentityPath || '',
      resolvedBranch: trace?.resolvedBranch || '',
      supportPositionSource: positionChoice.source,
      supportPosition: positionChoice.point,
      candidateRank: index + 1,
      accepted: result.selected?.evidenceId === candidate.evidenceId,
      ...candidate,
    }));
    const decisionRow = {
      decisionId: `DECISION-${record.rowId}`,
      tableRowId: record.rowId,
      canonicalIdentity: record.identity,
      supportRoot: record.supportRoot,
      identityStatus: trace?.status || 'UNRESOLVED',
      identityTraceId: trace?.traceId || '',
      jsonNodeId: trace?.selectedNodeId || '',
      jsonPath: trace?.selectedJsonPath || '',
      resolvedBranch: trace?.resolvedBranch || '',
      supportPositionSource: positionChoice.source,
      supportPosition: positionChoice.point,
      candidateCount: candidates.length,
      status: result.status,
      ambiguity: result.ambiguity,
      confidence: result.confidence,
      confidenceScore: result.score,
      supportIsonote: result.selected?.commentBody || '',
      selectedEvidenceId: result.selected?.evidenceId || '',
      selectedCandidate: result.selected,
    };
    decisions.push(decisionRow);
    augmentedRows.push({
      ...record.rawRow,
      'Support ISONOTE': decisionRow.supportIsonote,
      'Proximity PS/SL': record.supportRoot,
      'Resolved Branch Name': decisionRow.resolvedBranch,
      'Resolved Support POS': decisionRow.supportPosition ? `E=${decisionRow.supportPosition.x};N=${decisionRow.supportPosition.y};EL=${decisionRow.supportPosition.z}` : '',
      'Navis Tag POS': result.selected?.tagPosition ? `E=${result.selected.tagPosition.x};N=${result.selected.tagPosition.y};EL=${result.selected.tagPosition.z}` : '',
      'Delta E mm': result.selected?.deltaEMm ?? '',
      'Delta N mm': result.selected?.deltaNMm ?? '',
      'Delta EL mm': result.selected?.deltaElMm ?? '',
      'OD mm': trace?.odMm ?? '',
      'Vertical Basis': result.selected?.verticalBasis || '',
      'Vertical Residual mm': result.selected?.verticalResidualMm ?? '',
      'Candidate Count': candidates.length,
      Ambiguities: decisionRow.ambiguity,
      Confidence: decisionRow.confidence,
      'Confidence Score': decisionRow.confidenceScore,
      'Match Source': decisionRow.supportPositionSource,
      'Evidence ID': decisionRow.selectedEvidenceId,
      'Identity Trace ID': decisionRow.identityTraceId,
    });
  }

  return {
    schema: NAVIS_TAG_ISONOTE_AUDIT_SCHEMA,
    config,
    summary: {
      tableRowCount: tableBuild?.records?.length || 0,
      identityResolvedCount: identityTrace?.summary?.resolvedCount || 0,
      navisTagCount: navisParse?.summary?.tagCount || 0,
      resolvedCount: decisions.filter((row) => row.status === 'RESOLVED').length,
      ambiguousCount: decisions.filter((row) => row.status === 'AMBIGUOUS').length,
      unresolvedCount: decisions.filter((row) => row.status === 'UNRESOLVED').length,
    },
    augmentedRows,
    decisions,
    candidateLedger,
    diagnostics,
  };
}

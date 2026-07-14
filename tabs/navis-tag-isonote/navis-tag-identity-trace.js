import { IDENTITY_NODE_TRACE_SCHEMA, normalizeConfig, text } from './navis-tag-isonote-contracts.js';

function branchMatches(record, entry) {
  const pipe = text(record.inputPipe).toUpperCase();
  const branch = text(entry.resolvedBranch || entry.resolvedPipe).toUpperCase();
  return Boolean(pipe && branch && branch.includes(pipe));
}
function candidateScore(record, entry, matchType) {
  let score = matchType === 'EXACT_FULL_IDENTITY' ? 100 : 60;
  if (branchMatches(record, entry)) score += 20;
  if (entry.position) score += 10;
  if (Number.isFinite(entry.odMm)) score += 5;
  return score;
}
function candidateSummary(record, entry, matchType) {
  return {
    nodeId: entry.nodeId,
    sourceFile: entry.sourceFile,
    jsonPath: entry.jsonPath,
    ancestorIds: entry.ancestorIds,
    hierarchyPath: entry.hierarchyPath,
    rawType: entry.rawType,
    rawName: entry.rawName,
    identity: entry.identity,
    identityRaw: entry.identityRaw,
    identityPath: entry.identityPath,
    supportRoot: entry.supportRoot,
    resolvedBranch: entry.resolvedBranch,
    resolvedBranchPath: entry.resolvedBranchPath,
    resolvedPipe: entry.resolvedPipe,
    resolvedPipePath: entry.resolvedPipePath,
    resolvedZone: entry.resolvedZone,
    resolvedZonePath: entry.resolvedZonePath,
    branchMatch: branchMatches(record, entry),
    positionPath: entry.positionPath,
    positionRaw: entry.positionRaw,
    position: entry.position,
    odMm: entry.odMm,
    odPath: entry.odPath,
    odSource: entry.odSource,
    odLookupName: entry.odLookupName,
    boreNominalMm: entry.boreNominalMm,
    borePath: entry.borePath,
    boreUnits: entry.boreUnits,
    score: candidateScore(record, entry, matchType),
  };
}
function rankCandidates(record, candidates, matchType) {
  return candidates.map((entry) => ({ entry, summary: candidateSummary(record, entry, matchType) })).sort((a, b) => b.summary.score - a.summary.score || Number(Boolean(b.entry.position)) - Number(Boolean(a.entry.position)) || a.entry.jsonPath.localeCompare(b.entry.jsonPath));
}
function selectCandidate(ranked, matchType) {
  if (!ranked.length) return { status: 'UNRESOLVED', selected: null, reason: 'NO_JSON_IDENTITY_CANDIDATE' };
  if (ranked.length === 1) return { status: matchType === 'EXACT_FULL_IDENTITY' ? 'RESOLVED_EXACT' : 'RESOLVED_ROOT', selected: ranked[0].entry, reason: matchType };
  const top = ranked[0];
  const second = ranked[1];
  const gap = top.summary.score - second.summary.score;
  if (top.summary.branchMatch && !second.summary.branchMatch && gap >= 15) return { status: matchType === 'EXACT_FULL_IDENTITY' ? 'RESOLVED_EXACT_PIPE' : 'RESOLVED_ROOT_PIPE', selected: top.entry, reason: `${matchType}_UNIQUE_BRANCH` };
  return { status: matchType === 'EXACT_FULL_IDENTITY' ? 'AMBIGUOUS_EXACT_IDENTITY' : 'AMBIGUOUS_ROOT_MATCH', selected: null, reason: 'CANDIDATE_SCORE_GAP_INSUFFICIENT' };
}
function pendingNavisFields() {
  return {
    navisResolutionStatus: 'PENDING_NAVIS_RESOLUTION',
    navisAmbiguity: '',
    navisConfidence: '',
    navisConfidenceScore: 0,
    navisConfidenceReasons: [],
    selectedNavisEvidenceId: '',
    selectedNavisViewName: '',
    selectedNavisViewGuid: '',
    selectedNavisTagId: '',
    selectedNavisCommentId: '',
    selectedNavisCommentBody: '',
    selectedNavisPosition: null,
    selectedNavisPositionSource: '',
    deltaEMm: null,
    deltaNMm: null,
    deltaElMm: null,
    verticalBasis: '',
    verticalResidualMm: null,
    supportIsonote: '',
  };
}

export function buildIdentityNodeTrace(tableRecords = [], stagedIndex, inputConfig = {}) {
  const config = normalizeConfig({ ...(stagedIndex?.config || {}), ...inputConfig });
  const rows = [];
  const diagnostics = [];
  for (const record of tableRecords) {
    const exact = stagedIndex?.byIdentity?.get(record.identity) || [];
    const root = stagedIndex?.byRoot?.get(record.supportRoot) || [];
    let matchType = 'NONE';
    let candidates = [];
    if (exact.length) { matchType = 'EXACT_FULL_IDENTITY'; candidates = exact; }
    else if (root.length) { matchType = 'SUPPORT_ROOT'; candidates = root; }
    const ranked = rankCandidates(record, candidates, matchType);
    const selection = selectCandidate(ranked, matchType);
    const selected = selection.selected;
    if (!record.identity) diagnostics.push({ severity: 'ERROR', code: 'TABLE_IDENTITY_UNAVAILABLE', rowId: record.rowId, message: 'No canonical table identity is available.' });
    else if (!ranked.length) diagnostics.push({ severity: 'WARN', code: 'JSON_IDENTITY_NOT_FOUND', rowId: record.rowId, identity: record.identity, message: `No staged JSON node matches ${record.identity}.` });
    else if (!selected) diagnostics.push({ severity: 'WARN', code: selection.status, rowId: record.rowId, identity: record.identity, candidateCount: ranked.length, message: `${ranked.length} staged JSON nodes match ${record.identity}; no dominant candidate was proven.` });
    rows.push({
      schema: IDENTITY_NODE_TRACE_SCHEMA,
      traceId: `IDENTITY-${record.rowId}`,
      tableRowId: record.rowId,
      tableRowIndex: record.rowIndex,
      tableIdentityRaw: record.identityRaw,
      canonicalIdentity: record.identity,
      supportRoot: record.supportRoot,
      tableIdentityColumn: record.identityColumn,
      tablePositionMode: config.tablePositionMode,
      tablePositionSourceColumn: record.positionColumn,
      tablePositionRaw: record.positionRaw,
      tablePosition: record.position,
      tablePositionUnits: config.tableUnits,
      inputPipe: record.inputPipe,
      inputPipeColumn: record.inputPipeColumn,
      matchType,
      candidateCount: ranked.length,
      status: selection.status,
      selectionReason: selection.reason,
      selectedNodeId: selected?.nodeId || '',
      selectedSourceFile: selected?.sourceFile || '',
      selectedJsonPath: selected?.jsonPath || '',
      selectedAncestorIds: selected?.ancestorIds || [],
      selectedRawType: selected?.rawType || '',
      selectedRawName: selected?.rawName || '',
      selectedIdentityRaw: text(selected?.identityRaw),
      selectedIdentityPath: selected?.identityPath || '',
      hierarchyPath: selected?.hierarchyPath || [],
      resolvedBranch: selected?.resolvedBranch || '',
      resolvedBranchPath: selected?.resolvedBranchPath || '',
      resolvedPipe: selected?.resolvedPipe || '',
      resolvedPipePath: selected?.resolvedPipePath || '',
      resolvedZone: selected?.resolvedZone || '',
      resolvedZonePath: selected?.resolvedZonePath || '',
      positionSourcePath: selected?.positionPath || '',
      positionRaw: selected?.positionRaw ?? '',
      position: selected?.position || null,
      jsonPositionUnits: config.jsonUnits,
      odMm: selected?.odMm ?? null,
      odPath: selected?.odPath || '',
      odSource: selected?.odSource || 'NONE',
      odLookupName: selected?.odLookupName || '',
      boreNominalMm: selected?.boreNominalMm ?? null,
      borePath: selected?.borePath || '',
      boreUnits: selected?.boreUnits || config.jsonBoreUnits,
      identityConfidence: selected ? selection.status.includes('EXACT') ? 'HIGH' : 'MEDIUM' : ranked.length ? 'AMBIGUOUS' : 'UNRESOLVED',
      candidates: ranked.map((item) => item.summary),
      selectedEntry: selected || null,
      tableRecord: record,
      config,
      ...pendingNavisFields(),
    });
  }
  return partitionIdentityRows({ config, rows, diagnostics });
}

function partitionIdentityRows(trace) {
  const rows = trace.rows || [];
  return {
    ...trace,
    matchedRows: rows.filter((row) => row.selectedNodeId),
    ambiguousRows: rows.filter((row) => row.status.startsWith('AMBIGUOUS')),
    rejectedRows: rows.filter((row) => row.status === 'UNRESOLVED'),
    summary: {
      rowCount: rows.length,
      resolvedCount: rows.filter((row) => row.selectedNodeId).length,
      exactResolvedCount: rows.filter((row) => row.status.includes('EXACT') && row.selectedNodeId).length,
      rootResolvedCount: rows.filter((row) => row.status.includes('ROOT') && row.selectedNodeId).length,
      ambiguousCount: rows.filter((row) => row.status.startsWith('AMBIGUOUS')).length,
      unresolvedCount: rows.filter((row) => row.status === 'UNRESOLVED').length,
      navisResolvedCount: rows.filter((row) => row.navisResolutionStatus === 'RESOLVED').length,
      navisAmbiguousCount: rows.filter((row) => row.navisResolutionStatus === 'AMBIGUOUS').length,
      navisUnresolvedCount: rows.filter((row) => row.navisResolutionStatus === 'UNRESOLVED').length,
    },
  };
}

export function attachNavisResolutionToIdentityTrace(identityTrace, audit) {
  const decisions = new Map((audit?.decisions || []).map((row) => [row.tableRowId, row]));
  const rows = (identityTrace?.rows || []).map((row) => {
    const decision = decisions.get(row.tableRowId);
    if (!decision) return { ...row, ...pendingNavisFields(), navisResolutionStatus: 'UNRESOLVED' };
    const selected = decision.selectedCandidate || null;
    return {
      ...row,
      navisResolutionStatus: decision.status,
      navisAmbiguity: decision.ambiguity || '',
      navisConfidence: decision.confidence || '',
      navisConfidenceScore: decision.confidenceScore || 0,
      navisConfidenceReasons: decision.confidenceReasons || [],
      selectedNavisEvidenceId: decision.selectedEvidenceId || '',
      selectedNavisViewName: selected?.viewName || '',
      selectedNavisViewGuid: selected?.viewGuid || decision.selectedViewGuid || '',
      selectedNavisTagId: selected?.tagId || decision.selectedTagId || '',
      selectedNavisCommentId: selected?.commentId || decision.selectedCommentId || '',
      selectedNavisCommentBody: selected?.commentBody || '',
      selectedNavisPosition: selected?.tagPosition || null,
      selectedNavisPositionSource: selected?.positionSource || '',
      deltaEMm: selected?.deltaEMm ?? null,
      deltaNMm: selected?.deltaNMm ?? null,
      deltaElMm: selected?.deltaElMm ?? null,
      verticalBasis: selected?.verticalBasis || '',
      verticalResidualMm: selected?.verticalResidualMm ?? null,
      supportIsonote: decision.supportIsonote || '',
    };
  });
  return partitionIdentityRows({ ...identityTrace, rows });
}

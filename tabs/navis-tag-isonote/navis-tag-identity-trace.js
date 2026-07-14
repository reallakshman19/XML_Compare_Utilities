import { IDENTITY_NODE_TRACE_SCHEMA, normalizeConfig, text } from './navis-tag-isonote-contracts.js';

function candidateSummary(entry) {
  return {
    nodeId: entry.nodeId,
    sourceFile: entry.sourceFile,
    jsonPath: entry.jsonPath,
    hierarchyPath: entry.hierarchyPath,
    identity: entry.identity,
    identityRaw: entry.identityRaw,
    identityPath: entry.identityPath,
    supportRoot: entry.supportRoot,
    resolvedBranch: entry.resolvedBranch,
    resolvedBranchPath: entry.resolvedBranchPath,
    positionPath: entry.positionPath,
    positionRaw: entry.positionRaw,
    position: entry.position,
    odMm: entry.odMm,
    odPath: entry.odPath,
    bore: entry.bore,
    borePath: entry.borePath,
  };
}

function rankCandidates(record, candidates) {
  return [...candidates].sort((a, b) => {
    const aPipe = record.inputPipe && a.resolvedBranch && a.resolvedBranch.toUpperCase().includes(record.inputPipe.toUpperCase()) ? 1 : 0;
    const bPipe = record.inputPipe && b.resolvedBranch && b.resolvedBranch.toUpperCase().includes(record.inputPipe.toUpperCase()) ? 1 : 0;
    return bPipe - aPipe || Number(Boolean(b.position)) - Number(Boolean(a.position)) || a.jsonPath.localeCompare(b.jsonPath);
  });
}

export function buildIdentityNodeTrace(tableRecords = [], stagedIndex, inputConfig = {}) {
  const config = normalizeConfig({ ...(stagedIndex?.config || {}), ...inputConfig });
  const rows = [];
  const diagnostics = [];
  for (const record of tableRecords) {
    const exact = stagedIndex?.byIdentity?.get(record.identity) || [];
    const root = stagedIndex?.byRoot?.get(record.supportRoot) || [];
    let matchType = '';
    let candidates = [];
    if (exact.length) { matchType = 'EXACT_FULL_IDENTITY'; candidates = exact; }
    else if (root.length) { matchType = 'SUPPORT_ROOT'; candidates = root; }
    const ranked = rankCandidates(record, candidates);
    let status = 'UNRESOLVED';
    let selected = null;
    if (ranked.length === 1) { status = matchType === 'EXACT_FULL_IDENTITY' ? 'RESOLVED_EXACT' : 'RESOLVED_ROOT'; selected = ranked[0]; }
    else if (ranked.length > 1) {
      const firstPipe = record.inputPipe && ranked[0].resolvedBranch?.toUpperCase().includes(record.inputPipe.toUpperCase());
      const secondPipe = record.inputPipe && ranked[1].resolvedBranch?.toUpperCase().includes(record.inputPipe.toUpperCase());
      if (matchType === 'EXACT_FULL_IDENTITY' && firstPipe && !secondPipe) { status = 'RESOLVED_EXACT_PIPE'; selected = ranked[0]; }
      else status = matchType === 'EXACT_FULL_IDENTITY' ? 'AMBIGUOUS_EXACT_IDENTITY' : 'AMBIGUOUS_ROOT_MATCH';
    }
    if (!record.identity) diagnostics.push({ severity: 'ERROR', code: 'TABLE_IDENTITY_UNAVAILABLE', rowId: record.rowId, message: 'No canonical table identity is available.' });
    else if (!ranked.length) diagnostics.push({ severity: 'WARN', code: 'JSON_IDENTITY_NOT_FOUND', rowId: record.rowId, identity: record.identity, message: `No staged JSON node matches ${record.identity}.` });
    else if (!selected) diagnostics.push({ severity: 'WARN', code: status, rowId: record.rowId, identity: record.identity, candidateCount: ranked.length, message: `${ranked.length} staged JSON nodes match ${record.identity}.` });

    rows.push({
      schema: IDENTITY_NODE_TRACE_SCHEMA,
      traceId: `IDENTITY-${record.rowId}`,
      tableRowId: record.rowId,
      tableRowIndex: record.rowIndex,
      tableIdentityRaw: record.identityRaw,
      canonicalIdentity: record.identity,
      supportRoot: record.supportRoot,
      tableIdentityColumn: record.identityColumn,
      inputPipe: record.inputPipe,
      matchType: matchType || 'NONE',
      candidateCount: ranked.length,
      status,
      selectedNodeId: selected?.nodeId || '',
      selectedJsonPath: selected?.jsonPath || '',
      selectedIdentityRaw: text(selected?.identityRaw),
      selectedIdentityPath: selected?.identityPath || '',
      hierarchyPath: selected?.hierarchyPath || [],
      resolvedBranch: selected?.resolvedBranch || '',
      resolvedBranchPath: selected?.resolvedBranchPath || '',
      positionSourcePath: selected?.positionPath || '',
      positionRaw: selected?.positionRaw ?? '',
      position: selected?.position || null,
      odMm: selected?.odMm ?? null,
      odPath: selected?.odPath || '',
      bore: selected?.bore ?? null,
      borePath: selected?.borePath || '',
      identityConfidence: selected ? (status === 'RESOLVED_EXACT' || status === 'RESOLVED_EXACT_PIPE' ? 'HIGH' : 'MEDIUM') : (ranked.length ? 'AMBIGUOUS' : 'UNRESOLVED'),
      candidates: ranked.map(candidateSummary),
      selectedEntry: selected || null,
      tableRecord: record,
      config,
    });
  }
  return { config, rows, diagnostics, summary: { rowCount: rows.length, resolvedCount: rows.filter((row) => row.selectedNodeId).length, ambiguousCount: rows.filter((row) => row.status.startsWith('AMBIGUOUS')).length, unresolvedCount: rows.filter((row) => row.status === 'UNRESOLVED').length } };
}

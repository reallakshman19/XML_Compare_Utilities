function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function badge(status) {
  const value = String(status || '');
  const css = /RESOLVED|READY|HIGH|MEDIUM|VALID|SELECTED/.test(value) && !/UNRESOLVED|INVALID|NOT_SELECTED/.test(value)
    ? 'nti-ok'
    : /AMBIGUOUS|WARN|PENDING|PARTIAL|NOT_SELECTED/.test(value) ? 'nti-warn' : 'nti-error';
  return `<span class="nti-badge ${css}">${esc(value)}</span>`;
}
function compactNumber(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : '';
}
function renderTable(headers, rows, tableClass, emptyMessage) {
  if (!rows.length) return `<div class="nti-help">${esc(emptyMessage)}</div>`;
  return `<div class="nti-table-wrap"><table class="nti-table ${esc(tableClass)}"><thead><tr>${headers.map((header) => `<th title="${esc(header.help || '')}">${esc(header.label)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 5000).map((row) => `<tr>${headers.map((header) => {
    const value = row[header.key];
    const display = Array.isArray(value) ? value.join(' → ') : typeof value === 'object' && value ? JSON.stringify(value) : value;
    return `<td title="${esc(display)}">${header.badge ? badge(display) : esc(display)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function stageIntro(number, title, description) {
  return `<div class="nti-help"><b>Stage ${number} of 3 — ${esc(title)}</b><br>${esc(description)}</div>`;
}
function pointColumns(point, prefix) {
  return {
    [`${prefix}E`]: compactNumber(point?.x),
    [`${prefix}N`]: compactNumber(point?.y),
    [`${prefix}EL`]: compactNumber(point?.z),
  };
}
export function jsonTraceRows(state) {
  return (state.identityTrace?.rows || []).map((row) => ({
    resolutionRow: row.tableRowIndex,
    groupedIdentityRaw: row.tableIdentityRaw,
    canonicalIdentity: row.canonicalIdentity,
    supportRoot: row.supportRoot,
    identityStatus: row.status,
    selectionReason: row.selectionReason,
    candidateCount: row.candidateCount,
    jsonNodeId: row.selectedNodeId,
    jsonSourceFile: row.selectedSourceFile,
    jsonPath: row.selectedJsonPath,
    rawType: row.selectedRawType,
    rawName: row.selectedRawName,
    identityPath: row.selectedIdentityPath,
    referenceRaw: row.selectedReferenceRaw,
    referencePath: row.selectedReferencePath,
    positionPath: row.positionSourcePath,
    ...pointColumns(row.position, 'json'),
    sourceUnit: row.position?.sourceUnit || '',
    unitScale: compactNumber(row.position?.unitScale, 6),
    datumOffsets: row.position?.datumOffsetMm || '',
    coordinateProfile: row.position?.profileName || '',
    resolvedBranch: row.resolvedBranch,
    resolvedPipe: row.resolvedPipe,
    resolvedZone: row.resolvedZone,
    identityConfidence: row.identityConfidence,
  }));
}
export function navisCoordinateRows(state) {
  return (state.navisParse?.tags || []).map((tag) => {
    const raw = tag.rawPosition || {};
    const transformed = tag.position || {};
    const datum = transformed.datumOffsetMm || {};
    const valid = Boolean(tag.position && tag.commentBody);
    return {
      viewIndex: tag.viewIndex,
      viewName: tag.viewName,
      viewGuid: tag.viewGuid,
      tagId: tag.tagId,
      commentId: tag.commentId,
      commentBody: tag.commentBody,
      commentUser: tag.commentUser,
      positionSource: tag.positionSource,
      xmlX: compactNumber(raw.x, 6),
      xmlY: compactNumber(raw.y, 6),
      xmlZ: compactNumber(raw.z, 6),
      sourceUnit: transformed.sourceUnit || tag.units || '',
      unitScaleToMm: compactNumber(transformed.unitScale, 6),
      datumE: compactNumber(datum.x),
      datumN: compactNumber(datum.y),
      datumEL: compactNumber(datum.z),
      navisToJsonE: compactNumber(transformed.x),
      navisToJsonN: compactNumber(transformed.y),
      navisToJsonEL: compactNumber(transformed.z),
      coordinateProfile: transformed.profileName || tag.coordinateProfileName || '',
      axisBasis: transformed.axisBasis || '',
      transform: tag.position ? `raw × ${transformed.unitScale} + datum` : '',
      coordinateStatus: valid ? 'VALID_FOR_MATCHING' : tag.position ? 'COORDINATE_ONLY' : 'INVALID',
      diagnostics: (tag.diagnostics || []).join(' | '),
    };
  });
}
export function matchRows(state) {
  return (state.identityTrace?.rows || []).map((row) => ({
    resolutionRow: row.tableRowIndex,
    groupedJsonIdentities: row.tableIdentityRaw,
    jsonAnchorIdentity: row.canonicalIdentity,
    jsonNodeId: row.selectedNodeId,
    jsonPath: row.selectedJsonPath,
    ...pointColumns(row.position, 'json'),
    navisStatus: row.navisResolutionStatus,
    navisTagId: row.selectedNavisTagId,
    navisView: row.selectedNavisViewName,
    navisCommentId: row.selectedNavisCommentId,
    navisComment: row.selectedNavisCommentBody,
    ...pointColumns(row.selectedNavisPosition, 'navis'),
    deltaE: compactNumber(row.deltaEMm),
    deltaN: compactNumber(row.deltaNMm),
    deltaEL: compactNumber(row.deltaElMm),
    verticalBasis: row.verticalBasis,
    verticalResidual: compactNumber(row.verticalResidualMm),
    candidateCount: row.navisProximityEvidence?.candidateCount ?? '',
    ambiguity: row.navisAmbiguity,
    confidence: row.navisConfidence,
    selectedIsonote: row.supportIsonote,
  }));
}
function candidateRows(state) {
  return (state.audit?.candidateLedger || []).map((row) => ({ ...row, selectedLabel: row.accepted ? 'SELECTED' : 'NOT_SELECTED' }));
}
function renderJsonTrace(state) {
  const headers = [
    ['resolutionRow','Resolution row'], ['groupedIdentityRaw','Grouped source identities'], ['canonicalIdentity','Resolver anchor identity'], ['supportRoot','Support root'],
    ['identityStatus','JSON identity result',true], ['selectionReason','Why this JSON node was selected'], ['candidateCount','JSON candidates'], ['jsonNodeId','Selected JSON node ID'],
    ['jsonSourceFile','JSON source file'], ['jsonPath','Selected JSON object path'], ['rawType','JSON node type'], ['rawName','JSON node name'],
    ['identityPath','Identity attribute path'], ['referenceRaw','JSON reference value'], ['referencePath','Reference attribute path'], ['positionPath','Coordinate attribute path'],
    ['jsonE','JSON E (comparison mm)'], ['jsonN','JSON N (comparison mm)'], ['jsonEL','JSON EL (comparison mm)'], ['sourceUnit','JSON source unit'],
    ['unitScale','JSON unit scale → mm'], ['datumOffsets','JSON datum offsets mm'], ['coordinateProfile','JSON coordinate profile'],
    ['resolvedBranch','Resolved branch'], ['resolvedPipe','Resolved pipe'], ['resolvedZone','Resolved zone'], ['identityConfidence','JSON identity confidence',true],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  return `<section class="nti-card"><h3>JSON Trace — selected support nodes</h3>${stageIntro(1, 'JSON Trace', 'One row is one coordinate-grouped support target. It explains which staged JSON node supplies identity, reference, hierarchy and comparison-frame coordinates.')}<div class="nti-actions"><button class="nti-btn" data-nti-action="download-trace" ${state.identityTrace?.rows?.length ? '' : 'disabled'}>Download full trace CSV</button></div><input class="nti-filter" data-nti-table-filter="json-trace" placeholder="Filter identity, node ID, JSON path, pipe, branch, zone or status...">${renderTable(headers, jsonTraceRows(state), 'nti-filter-table-json-trace', 'Parse the staged JSON source to create the JSON trace.')}</section>`;
}
function renderNavisCoordinates(state) {
  const headers = [
    ['viewIndex','View #'], ['viewName','Navis view'], ['viewGuid','View GUID'], ['tagId','Navis Tag ID'], ['commentId','Comment ID'],
    ['commentBody','Comment / candidate ISONOTE'], ['commentUser','Comment author'], ['positionSource','XML coordinate source'],
    ['xmlX','XML X raw'], ['xmlY','XML Y raw'], ['xmlZ','XML Z raw'], ['sourceUnit','XML source unit'], ['unitScaleToMm','Unit scale → mm'],
    ['datumE','Navis E datum mm'], ['datumN','Navis N datum mm'], ['datumEL','Navis EL datum mm'],
    ['navisToJsonE','Transformed E (JSON comparison mm)'], ['navisToJsonN','Transformed N (JSON comparison mm)'], ['navisToJsonEL','Transformed EL (JSON comparison mm)'],
    ['coordinateProfile','Navis coordinate profile'], ['axisBasis','Axis interpretation'], ['transform','Transformation applied'], ['coordinateStatus','Ready for Stage 3?',true], ['diagnostics','Coordinate / comment issues'],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  return `<section class="nti-card"><h3>Navis Tag Coordinate Resolution — one row per Tag ID</h3>${stageIntro(2, 'Navis Tag Coordinate Resolution', 'Shows the original XML coordinates and the exact transformed coordinates used against JSON. No JSON node selection is performed here.')}<div class="nti-help">Transformation: raw XML XYZ × detected/configured unit scale + Navis datum offsets = JSON comparison-frame E/N/EL in millimetres.</div><input class="nti-filter" data-nti-table-filter="navis-coordinate" placeholder="Filter Tag ID, view, comment, status or coordinate...">${renderTable(headers, navisCoordinateRows(state), 'nti-filter-table-navis-coordinate', 'Parse Navis Tag XML to list Tag ID coordinate transformations.')}</section>`;
}
function renderMatch(state) {
  const matchHeaders = [
    ['resolutionRow','Resolution row'], ['groupedJsonIdentities','Grouped JSON identities'], ['jsonAnchorIdentity','JSON resolver anchor'], ['jsonNodeId','JSON node ID'], ['jsonPath','JSON path'],
    ['jsonE','JSON E mm'], ['jsonN','JSON N mm'], ['jsonEL','JSON EL mm'], ['navisStatus','Match result',true], ['navisTagId','Selected Navis Tag ID'],
    ['navisView','Selected Navis view'], ['navisCommentId','Selected Comment ID'], ['navisComment','Selected Navis comment'],
    ['navisE','Navis transformed E mm'], ['navisN','Navis transformed N mm'], ['navisEL','Navis transformed EL mm'],
    ['deltaE','ΔE mm'], ['deltaN','ΔN mm'], ['deltaEL','ΔEL mm'], ['verticalBasis','Vertical comparison basis'], ['verticalResidual','Vertical residual mm'],
    ['candidateCount','Candidates within tolerance'], ['ambiguity','Ambiguity'], ['confidence','Match confidence',true], ['selectedIsonote','Selected Support ISONOTE'],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  const candidateHeaders = [
    ['tableRowIndex','Resolution row'], ['canonicalIdentity','JSON identity'], ['jsonSourceFile','JSON source'], ['jsonPath','JSON path'], ['tagId','Navis Tag ID'],
    ['viewName','Navis view'], ['commentBody','Navis comment'], ['deltaEMm','ΔE mm'], ['deltaNMm','ΔN mm'], ['deltaElMm','ΔEL mm'],
    ['verticalResidualMm','Vertical residual mm'], ['score','Candidate score'], ['confidenceReasons','Scoring reasons'], ['selectedLabel','Selected?',true],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  return `<section class="nti-card"><h3>Navis Tag ↔ JSON Node Match — final decisions</h3>${stageIntro(3, 'Navis Tag vs JSON Node Match', 'Compares Stage 1 JSON coordinates with Stage 2 transformed Navis coordinates. Deltas, tolerances, ambiguity, confidence and selected comment are shown together.')}<input class="nti-filter" data-nti-table-filter="json-navis-match" placeholder="Filter JSON identity, Tag ID, comment, status or delta...">${renderTable(matchHeaders, matchRows(state), 'nti-filter-table-json-navis-match', 'Run proximity resolution to generate final JSON ↔ Navis decisions.')}</section><section class="nti-card"><h3>Candidate comparisons within configured tolerances</h3><div class="nti-help">These pairs reached scoring. The final decision table above identifies the selected candidate or unresolved outcome.</div><input class="nti-filter" data-nti-table-filter="candidate-comparison" placeholder="Filter candidate Tag ID, JSON identity, score or delta...">${renderTable(candidateHeaders, candidateRows(state), 'nti-filter-table-candidate-comparison', 'Run proximity resolution to create candidate comparisons.')}</section>`;
}
export function renderNavisTagIsonoteEvidencePane(state) {
  if (state.activeTab === 'hierarchy') return renderJsonTrace(state);
  if (state.activeTab === 'identity') return renderNavisCoordinates(state);
  if (state.activeTab === 'candidates') return renderMatch(state);
  return null;
}
export const _test = Object.freeze({ jsonTraceRows, navisCoordinateRows, matchRows, candidateRows });

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function badge(status) {
  const value = String(status || '');
  const css = /RESOLVED|READY|HIGH|MEDIUM|VALID|SELECTED_MATCH|WITHIN_TOLERANCE|CURRENT|APPLIED|DIRECT|PROPAGATED/.test(value) && !/UNRESOLVED|INVALID|NOT_SELECTED|OUTSIDE|REBUILD_REQUIRED|REJECTED|NONE/.test(value)
    ? 'nti-ok'
    : /AMBIGUOUS|WARN|PENDING|PARTIAL|NOT_SELECTED|NEAREST_REJECTED|OUTSIDE|REBUILD_REQUIRED|STALE|REJECTED/.test(value) ? 'nti-warn' : 'nti-error';
  return `<span class="nti-badge ${css}">${esc(value)}</span>`;
}
function compactNumber(value, digits = 3) {
  if (value == null || value === '') return '';
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
function axisFormula(rawValue, scaleValue, offsetValue, resultValue) {
  const raw = Number(rawValue);
  const scale = Number(scaleValue);
  const offset = Number(offsetValue);
  const result = Number(resultValue);
  if (![raw, scale, offset, result].every(Number.isFinite)) return '';
  return `${compactNumber(raw, 6)} × ${compactNumber(scale, 6)} ${offset < 0 ? '−' : '+'} ${compactNumber(Math.abs(offset))} = ${compactNumber(result)} mm`;
}
function configuredDatum(state, axis) {
  const key = axis === 'x' ? 'navisEastingDatumMm' : axis === 'y' ? 'navisNorthingDatumMm' : 'navisElevationDatumMm';
  const value = Number(state.config?.[key]);
  return Number.isFinite(value) ? value : 0;
}
function sameNumber(left, right) {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.000001;
}
function joined(values) { return (Array.isArray(values) ? values : []).join(' | '); }

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
  const configured = {
    x: configuredDatum(state, 'x'),
    y: configuredDatum(state, 'y'),
    z: configuredDatum(state, 'z'),
  };
  return (state.navisParse?.tags || []).map((tag) => {
    const raw = tag.rawPosition || {};
    const transformed = tag.position || {};
    const applied = transformed.datumOffsetMm || {};
    const valid = Boolean(tag.position && tag.commentBody);
    const datumStatus = !state.inputsDirty
      && sameNumber(applied.x, configured.x)
      && sameNumber(applied.y, configured.y)
      && sameNumber(applied.z, configured.z)
      ? 'CURRENT'
      : 'REBUILD_REQUIRED';
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
      configuredDatumE: compactNumber(configured.x),
      configuredDatumN: compactNumber(configured.y),
      configuredDatumEL: compactNumber(configured.z),
      appliedDatumE: compactNumber(applied.x),
      appliedDatumN: compactNumber(applied.y),
      appliedDatumEL: compactNumber(applied.z),
      datumStatus,
      navisToJsonE: compactNumber(transformed.x),
      navisToJsonN: compactNumber(transformed.y),
      navisToJsonEL: compactNumber(transformed.z),
      eFormula: axisFormula(raw.x, transformed.unitScale, applied.x, transformed.x),
      nFormula: axisFormula(raw.y, transformed.unitScale, applied.y, transformed.y),
      elFormula: axisFormula(raw.z, transformed.unitScale, applied.z, transformed.z),
      coordinateProfile: transformed.profileName || tag.coordinateProfileName || '',
      axisBasis: transformed.axisBasis || '',
      transform: tag.position ? `raw XYZ × ${transformed.unitScale} + applied datum offsets` : '',
      coordinateStatus: valid ? 'VALID_FOR_MATCHING' : tag.position ? 'COORDINATE_ONLY' : 'INVALID',
      diagnostics: (tag.diagnostics || []).join(' | '),
    };
  });
}
export function matchRows(state) {
  const decisions = new Map((state.audit?.decisions || []).map((decision) => [decision.tableRowId, decision]));
  return (state.identityTrace?.rows || []).map((row) => {
    const decision = decisions.get(row.tableRowId);
    const selected = decision?.selectedCandidate || null;
    const nearest = decision?.nearestRejectedCandidate || null;
    const rowSelected = row.selectedNavisTagId ? {
      tagId: row.selectedNavisTagId,
      viewName: row.selectedNavisViewName,
      commentId: row.selectedNavisCommentId,
      commentBody: row.selectedNavisCommentBody,
      tagPosition: row.selectedNavisPosition,
      deltaEMm: row.deltaEMm,
      deltaNMm: row.deltaNMm,
      deltaElMm: row.deltaElMm,
      verticalBasis: row.verticalBasis,
      verticalResidualMm: row.verticalResidualMm,
    } : null;
    const displayed = selected || nearest || rowSelected;
    const propagated = decision?.propagatedIsonotes || row.propagatedIsonotes || [];
    const displayedRole = selected || rowSelected ? 'SELECTED_MATCH' : nearest ? 'NEAREST_REJECTED' : propagated.length ? 'PROPAGATED_NOTE_ONLY' : '';
    const displayedPoint = displayed?.tagPosition || null;
    const failedAxes = nearest?.failedAxes || decision?.nearestRejectedAxes || [];
    return {
      resolutionRow: row.tableRowIndex,
      groupedJsonIdentities: row.tableIdentityRaw,
      jsonAnchorIdentity: row.canonicalIdentity,
      jsonNodeId: row.selectedNodeId,
      jsonPath: row.selectedJsonPath,
      ...pointColumns(row.position, 'json'),
      navisStatus: decision?.status || row.navisResolutionStatus,
      displayedNavisRole: displayedRole,
      toleranceResult: selected || rowSelected ? 'WITHIN_TOLERANCE' : nearest ? 'OUTSIDE_TOLERANCE' : '',
      navisTagId: displayed?.tagId || decision?.selectedTagId || decision?.nearestRejectedTagId || '',
      navisView: displayed?.viewName || decision?.selectedViewName || decision?.nearestRejectedViewName || '',
      navisCommentId: displayed?.commentId || decision?.selectedCommentId || decision?.nearestRejectedCommentId || '',
      navisComment: displayed?.commentBody || decision?.nearestRejectedCommentBody || '',
      ...pointColumns(displayedPoint, 'navis'),
      deltaE: compactNumber(displayed?.deltaEMm ?? decision?.nearestRejectedDeltaEMm),
      deltaN: compactNumber(displayed?.deltaNMm ?? decision?.nearestRejectedDeltaNMm),
      deltaEL: compactNumber(displayed?.deltaElMm ?? decision?.nearestRejectedDeltaElMm),
      verticalBasis: displayed?.verticalBasis || '',
      verticalResidual: compactNumber(displayed?.verticalResidualMm ?? decision?.nearestRejectedVerticalResidualMm),
      failedAxes: failedAxes.join(' | '),
      candidateCount: decision?.candidateCount ?? row.navisProximityEvidence?.candidateCount ?? '',
      ambiguity: decision?.ambiguity || row.navisAmbiguity,
      confidence: decision?.confidence || row.navisConfidence,
      isonoteSource: decision?.isonoteSource || row.isonoteSource || '',
      directIsonote: decision?.directSupportIsonote ?? row.directSupportIsonote ?? '',
      propagatedFromTagIds: joined(decision?.propagatedFromTagIds || row.propagatedFromTagIds),
      propagatedCount: propagated.length,
      appliesToTargets: joined(decision?.appliesToDirective?.targets || row.appliesToDirective?.targets),
      selectedIsonote: decision?.supportIsonote ?? row.supportIsonote ?? '',
    };
  });
}
function candidateRows(state) {
  return (state.audit?.candidateLedger || []).map((row) => ({
    ...row,
    failedAxesDisplay: (row.failedAxes || []).join(' | '),
    rejectionReasonsDisplay: (row.rejectionReasons || []).join(' | '),
    comparisonOutcome: row.accepted
      ? 'SELECTED_MATCH'
      : row.ledgerKind === 'NEAREST_REJECTED' ? 'NEAREST_REJECTED' : 'IN_TOLERANCE_NOT_SELECTED',
  }));
}
export function propagationRows(state) {
  return (state.audit?.propagationLedger || []).map((row) => ({
    ...row,
    ...pointColumns(row.sourcePosition, 'source'),
    ...pointColumns(row.targetPosition, 'target'),
    deltaE: compactNumber(row.deltaE),
    deltaN: compactNumber(row.deltaN),
    deltaEL: compactNumber(row.deltaEl),
    alongAxisDelta: compactNumber(row.alongAxisDeltaMm),
    parallelOffset: compactNumber(row.parallelOffsetMm),
    elevationDelta: compactNumber(row.elevationDeltaMm),
    alongAxisTolerance: compactNumber(row.alongAxisToleranceMm),
    parallelOffsetTolerance: compactNumber(row.parallelOffsetToleranceMm),
    elevationTolerance: compactNumber(row.elevationToleranceMm),
    rejectionReasonsDisplay: joined(row.rejectionReasons),
    propagationResult: row.applied ? 'APPLIED' : row.outcome || 'REJECTED',
  }));
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
    ['configuredDatumE','Configured E offset mm'], ['configuredDatumN','Configured N offset mm'], ['configuredDatumEL','Configured EL offset mm'],
    ['appliedDatumE','Applied E offset mm'], ['appliedDatumN','Applied N offset mm'], ['appliedDatumEL','Applied EL offset mm'], ['datumStatus','Configured offsets applied?',true],
    ['navisToJsonE','Transformed E (JSON comparison mm)'], ['navisToJsonN','Transformed N (JSON comparison mm)'], ['navisToJsonEL','Transformed EL (JSON comparison mm)'],
    ['eFormula','E transformation formula'], ['nFormula','N transformation formula'], ['elFormula','EL transformation formula'],
    ['coordinateProfile','Navis coordinate profile'], ['axisBasis','Axis interpretation'], ['transform','Transformation basis'], ['coordinateStatus','Ready for Stage 3?',true], ['diagnostics','Coordinate / comment issues'],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  const cfg = state.config || {};
  const freshness = state.inputsDirty
    ? '<div class="nti-help"><b>Configuration/source changes are pending.</b> These rows show the last applied offsets. Run resolution to rebuild automatically with the configured values.</div>'
    : '<div class="nti-help">Configured and applied offsets are current for these parsed Navis coordinates.</div>';
  return `<section class="nti-card"><h3>Navis Tag Coordinate Resolution — one row per Tag ID</h3>${stageIntro(2, 'Navis Tag Coordinate Resolution', 'Shows the original XML coordinates, configured datum offsets, offsets actually applied during parsing, and the exact transformed coordinates used against JSON.')}<div class="nti-help">Transformation: raw XML XYZ × detected/configured unit scale + configured Navis datum offsets = JSON comparison-frame E/N/EL in millimetres. Current configured offsets: E ${esc(cfg.navisEastingDatumMm ?? 0)} mm; N ${esc(cfg.navisNorthingDatumMm ?? 0)} mm; EL ${esc(cfg.navisElevationDatumMm ?? 0)} mm.</div>${freshness}<input class="nti-filter" data-nti-table-filter="navis-coordinate" placeholder="Filter Tag ID, view, comment, offset status, formula or coordinate...">${renderTable(headers, navisCoordinateRows(state), 'nti-filter-table-navis-coordinate', 'Parse Navis Tag XML to list Tag ID coordinate transformations.')}</section>`;
}
function renderMatch(state) {
  const matchHeaders = [
    ['resolutionRow','Resolution row'], ['groupedJsonIdentities','Grouped JSON identities'], ['jsonAnchorIdentity','JSON resolver anchor'], ['jsonNodeId','JSON node ID'], ['jsonPath','JSON path'],
    ['jsonE','JSON E mm'], ['jsonN','JSON N mm'], ['jsonEL','JSON EL mm'], ['navisStatus','Direct match result',true], ['displayedNavisRole','Displayed Navis evidence',true],
    ['toleranceResult','Direct tolerance result',true], ['navisTagId','Direct / nearest Navis Tag ID'], ['navisView','Navis view'], ['navisCommentId','Comment ID'], ['navisComment','Navis comment'],
    ['navisE','Navis transformed E mm'], ['navisN','Navis transformed N mm'], ['navisEL','Navis transformed EL mm'],
    ['deltaE','ΔE mm'], ['deltaN','ΔN mm'], ['deltaEL','ΔEL mm'], ['verticalBasis','Vertical comparison basis'], ['verticalResidual','Vertical residual mm'],
    ['failedAxes','Failed tolerance axes (direct)'], ['candidateCount','Direct candidates within tolerance'], ['ambiguity','Direct decision / rejection reason'], ['confidence','Direct match confidence',true],
    ['isonoteSource','Final ISONOTE source',true], ['directIsonote','Direct ISONOTE'], ['propagatedFromTagIds','Propagated from Tag IDs'], ['propagatedCount','Propagation count'],
    ['appliesToTargets','Source directive target pipes'], ['selectedIsonote','Final Support ISONOTE'],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  const candidateHeaders = [
    ['tableRowIndex','Resolution row'], ['canonicalIdentity','JSON identity'], ['jsonSourceFile','JSON source'], ['jsonPath','JSON path'], ['ledgerKind','Comparison type'],
    ['tagId','Navis Tag ID'], ['viewName','Navis view'], ['commentBody','Navis comment'], ['withinTolerance','Within tolerance?'],
    ['failedAxesDisplay','Failed axes'], ['rejectionReasonsDisplay','Rejection reasons'], ['deltaEMm','ΔE mm'], ['deltaNMm','ΔN mm'], ['deltaElMm','ΔEL mm'],
    ['verticalResidualMm','Vertical residual mm'], ['score','Candidate score'], ['confidenceReasons','Scoring / rejection reasons'], ['comparisonOutcome','Outcome',true],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  const propagationHeaders = [
    ['sourceTagId','Source Tag ID'], ['sourceTableRowId','Source resolution row'], ['sourcePipe','Source pipe'], ['sourceAxis','Source pipe axis'], ['sourceAxisBasis','Source axis basis'],
    ['requestedTargetPipe','Requested target pipe'], ['requestedLineKey','Extracted line key'], ['matchedTargetPipe','Matched staged pipe'], ['pipeMatchBasis','Pipe match basis'],
    ['targetPipeAxis','Target pipe axis'], ['targetAxisBasis','Target axis basis'], ['targetTableRowIndex','Target resolution row'], ['targetIdentity','Target support identity'], ['targetSupportRoot','Target support root'],
    ['sourceE','Source E mm'], ['sourceN','Source N mm'], ['sourceEL','Source EL mm'], ['targetE','Target E mm'], ['targetN','Target N mm'], ['targetEL','Target EL mm'],
    ['deltaE','ΔE mm'], ['deltaN','ΔN mm'], ['deltaEL','ΔEL mm'], ['alongAxisDelta','Along-axis delta mm'], ['alongAxisTolerance','Along-axis tolerance mm'],
    ['parallelOffset','Parallel offset mm'], ['parallelOffsetTolerance','Parallel offset tolerance mm'], ['elevationDelta','Elevation delta mm'], ['elevationTolerance','Elevation tolerance mm'],
    ['baseIsonote','Base ISONOTE'], ['derivedIsonote','Derived target ISONOTE'], ['propagationResult','Propagation result',true], ['rejectionReasonsDisplay','Rejection reasons'],
  ].map(([key,label,isBadge]) => ({ key, label, badge: Boolean(isBadge) }));
  return `<section class="nti-card"><h3>Navis Tag ↔ JSON Node Match — final decisions</h3>${stageIntro(3, 'Navis Tag vs JSON Node Match', 'Direct Tag proximity and applies-to pipe propagation are separate evidence channels. A support may remain unresolved by direct proximity while receiving a traceable propagated ISONOTE.')}<input class="nti-filter" data-nti-table-filter="json-navis-match" placeholder="Filter JSON identity, Tag ID, ISONOTE source, comment, status, failed axis or delta...">${renderTable(matchHeaders, matchRows(state), 'nti-filter-table-json-navis-match', 'Run proximity resolution to generate final JSON ↔ Navis decisions.')}</section><section class="nti-card"><h3>Applies-to pipe propagation</h3><div class="nti-help">The full requested pipe name is matched first. Only when that fails is the configured line-key regex used. Source and target pipes must have the same proven N–S or E–W axis, and the target support must pass the configured along-axis, parallel-offset and elevation windows.</div><input class="nti-filter" data-nti-table-filter="pipe-propagation" placeholder="Filter source Tag, requested or matched pipe, line key, support, axis, result or rejection reason...">${renderTable(propagationHeaders, propagationRows(state), 'nti-filter-table-pipe-propagation', 'No applies-to directives were resolved or no propagation candidates were produced.')}</section><section class="nti-card"><h3>Candidate and nearest-rejected coordinate comparisons</h3><div class="nti-help">Accepted candidates passed every configured direct-proximity tolerance and reached scoring. When none passed, the nearest rejected Navis tag is retained with its failed axes and rejection reasons.</div><input class="nti-filter" data-nti-table-filter="candidate-comparison" placeholder="Filter Tag ID, JSON identity, comparison type, rejection reason, score or delta...">${renderTable(candidateHeaders, candidateRows(state), 'nti-filter-table-candidate-comparison', 'Run proximity resolution to create candidate and nearest-rejected comparisons.')}</section>`;
}
export function renderNavisTagIsonoteEvidencePane(state) {
  if (state.activeTab === 'hierarchy') return renderJsonTrace(state);
  if (state.activeTab === 'identity') return renderNavisCoordinates(state);
  if (state.activeTab === 'candidates') return renderMatch(state);
  return null;
}
export const _test = Object.freeze({ jsonTraceRows, navisCoordinateRows, matchRows, candidateRows, propagationRows, axisFormula });

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function joinList(values) { return (Array.isArray(values) ? values : []).join('\n'); }
function metric(label, value) { return `<div class="nti-metric"><span>${esc(label)}</span><strong>${esc(value ?? 0)}</strong></div>`; }
function statusBadge(label, loaded, detail = '') { return `<span class="nti-source-badge ${loaded ? 'is-loaded' : 'is-missing'}">${loaded ? '✓' : '!'} ${esc(label)}${detail ? `: ${esc(detail)}` : ''}</span>`; }
function badge(status) {
  const value = String(status || '');
  const css = /RESOLVED|READY|HIGH|MEDIUM/.test(value) && !/UNRESOLVED/.test(value) ? 'nti-ok' : /AMBIGUOUS|WARN/.test(value) ? 'nti-warn' : 'nti-error';
  return `<span class="nti-badge ${css}">${esc(value)}</span>`;
}
function renderTable(headers, rows, tableClass = '') {
  if (!rows.length) return '<div class="nti-help">No rows available.</div>';
  return `<div class="nti-table-wrap"><table class="nti-table ${esc(tableClass)}"><thead><tr>${headers.map((header) => `<th>${esc(header.label || header)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 5000).map((row) => `<tr>${headers.map((header) => {
    const key = header.key || header;
    const value = row[key];
    const stringValue = Array.isArray(value) ? value.join(' → ') : typeof value === 'object' && value ? JSON.stringify(value) : value;
    return `<td title="${esc(stringValue)}">${header.badge ? badge(String(value || '')) : esc(stringValue)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderMetrics(state) {
  const tree = state.tree?.summary || {};
  const trace = state.identityTrace?.summary || {};
  const navis = state.navisParse?.summary || {};
  const audit = state.audit?.summary || {};
  return `<div class="nti-metrics">${metric('Table rows', state.tableBuild?.records?.length || 0)}${metric('JSON nodes', tree.nodeCount || 0)}${metric('JSON objects', tree.objectCount || 0)}${metric('JSON arrays', tree.arrayCount || 0)}${metric('Indexed identities', state.stagedIndex?.summary?.indexedNodeCount || 0)}${metric('Identity resolved', trace.resolvedCount || 0)}${metric('Identity ambiguous', trace.ambiguousCount || 0)}${metric('Navis tags', navis.tagCount || 0)}${metric('ISONOTE resolved', audit.resolvedCount || 0)}${metric('ISONOTE ambiguous', audit.ambiguousCount || 0)}</div>`;
}
function renderReadiness(state) {
  const readiness = state.readiness;
  if (!readiness) return '<section class="nti-card"><h3>Source Readiness</h3><div class="nti-help">Parse the sources to generate readiness evidence.</div></section>';
  const records = [...readiness.blockers, ...readiness.warnings];
  return `<section class="nti-card"><h3>Source Readiness ${badge(readiness.status)}</h3><div class="nti-help">Resolution is blocked only by explicit reason codes. Warnings remain reviewable.</div>${records.length ? renderTable(['severity','code','message'], records) : '<div class="nti-ok-text">All configured evidence gates are ready.</div>'}</section>`;
}
function pathOptions(state, key) {
  const recommendationKey = { jsonIdentityPaths: 'identity', jsonPositionPaths: 'position', jsonBranchPaths: 'branch', jsonOdPaths: 'od', jsonBorePaths: 'bore' }[key];
  const recommended = state.tree?.pathRecommendations?.[recommendationKey] || [];
  const all = state.tree?.pathCatalogue || [];
  const byPath = new Map();
  recommended.forEach((item) => byPath.set(item.path, { ...item, recommended: true }));
  all.forEach((item) => { if (!byPath.has(item.path)) byPath.set(item.path, { ...item, score: 0, recommended: false }); });
  return [...byPath.values()];
}
function renderPathPicker(state, key, label) {
  const selected = new Set(state.config[key] || []);
  const options = pathOptions(state, key);
  if (!options.length) return '';
  return `<label class="nti-field">${esc(label)}<select multiple size="8" data-nti-path-select="${esc(key)}">${options.map((item) => `<option value="${esc(item.path)}" ${selected.has(item.path) ? 'selected' : ''}>${item.recommended ? '★ ' : ''}${esc(item.path)} · ${esc(item.count || 0)}${item.score ? ` · score ${esc(item.score)}` : ''}</option>`).join('')}</select></label>`;
}
function renderInputs(state) {
  const cfg = state.config;
  const names = state.sourceNames || {};
  return `<section class="nti-card"><h3>Source Inputs</h3><div class="nti-help">All staged JSON objects and arrays are constructed into the canonical hierarchy before identity, branch, coordinate, OD or bore indexes are built.</div><div class="nti-source-status">${statusBadge('Support table', Boolean(state.tableText), names.table || '')}${statusBadge('Navis Tag XML', Boolean(state.navisText), names.navis || '')}${statusBadge('Staged JSON / ZIP', Boolean(state.stagedDocuments?.length), names.staged || '')}</div><div class="nti-grid">
    <label class="nti-field">Support table CSV/TSV/XLSX<input type="file" data-nti-file="table" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods"></label>
    <label class="nti-field">Navis Tag XML<input type="file" data-nti-file="navis" accept=".xml"></label>
    <label class="nti-field">Managed staged JSON / ZIP<input type="file" data-nti-file="staged" accept=".json,.zip"></label>
  </div><div class="nti-grid-2"><label class="nti-field">Support table preview / paste<textarea data-nti-field="tableText" placeholder="Name of the element&#9;PIPE&#9;POS">${esc(state.tableText)}</textarea></label><label class="nti-field">Navis Tag XML preview / paste<textarea data-nti-field="navisText" placeholder="&lt;exchange units=&quot;m&quot;&gt;...">${esc(state.navisText)}</textarea></label></div><div class="nti-actions"><button class="nti-btn nti-btn-primary" data-nti-action="build">Parse sources + build hierarchy/index/identity trace</button><button class="nti-btn" data-nti-action="run" ${state.readiness && !state.readiness.canResolve ? 'disabled' : ''}>Run ISONOTE proximity resolution</button><span class="nti-status">${esc(state.status)}</span></div></section>
  <section class="nti-card"><h3>Configurable Identity and Proximity Mapping</h3><div class="nti-grid">
    <label class="nti-field">Table support identity columns<textarea data-nti-config="tableIdentityColumns">${esc(joinList(cfg.tableIdentityColumns))}</textarea></label>
    <label class="nti-field">Table pipe/branch columns<textarea data-nti-config="tablePipeColumns">${esc(joinList(cfg.tablePipeColumns))}</textarea></label>
    <label class="nti-field">JSON support identity paths<textarea data-nti-config="jsonIdentityPaths">${esc(joinList(cfg.jsonIdentityPaths))}</textarea></label>
    <label class="nti-field">JSON proximity position paths<textarea data-nti-config="jsonPositionPaths">${esc(joinList(cfg.jsonPositionPaths))}</textarea></label>
    <label class="nti-field">Table proximity position column<input data-nti-config="tablePositionColumn" value="${esc(cfg.tablePositionColumn)}"></label>
    <label class="nti-field">JSON branch paths<textarea data-nti-config="jsonBranchPaths">${esc(joinList(cfg.jsonBranchPaths))}</textarea></label>
    <label class="nti-field">JSON OD paths<textarea data-nti-config="jsonOdPaths">${esc(joinList(cfg.jsonOdPaths))}</textarea></label>
    <label class="nti-field">JSON bore paths<textarea data-nti-config="jsonBorePaths">${esc(joinList(cfg.jsonBorePaths))}</textarea></label>
    <label class="nti-field">Support coordinate source<select data-nti-config="supportCoordinateSource">${['prefer-table-fallback-json','prefer-json-fallback-table','table-only','json-only','compare-table-json'].map((value) => `<option value="${value}" ${cfg.supportCoordinateSource === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">Table units<select data-nti-config="tableUnits">${['auto','mm','m','cm','ft','in'].map((value) => `<option value="${value}" ${cfg.tableUnits === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">JSON position units<select data-nti-config="jsonUnits">${['auto','mm','m','cm','ft','in'].map((value) => `<option value="${value}" ${cfg.jsonUnits === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">JSON OD units<select data-nti-config="jsonOdUnits">${['mm','m','cm','ft','in'].map((value) => `<option value="${value}" ${cfg.jsonOdUnits === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">E tolerance mm<input type="number" min="0" data-nti-config="eastingToleranceMm" value="${esc(cfg.eastingToleranceMm)}"></label>
    <label class="nti-field">N tolerance mm<input type="number" min="0" data-nti-config="northingToleranceMm" value="${esc(cfg.northingToleranceMm)}"></label>
    <label class="nti-field">EL / OD-half tolerance mm<input type="number" min="0" data-nti-config="elevationToleranceMm" value="${esc(cfg.elevationToleranceMm)}"></label>
    <label class="nti-field">Table-vs-JSON disagreement mm<input type="number" min="0" data-nti-config="coordinateDisagreementToleranceMm" value="${esc(cfg.coordinateDisagreementToleranceMm)}"></label>
  </div>${state.tree ? `<h4>Discovered staged JSON paths</h4><div class="nti-grid">${renderPathPicker(state, 'jsonIdentityPaths', 'Identity paths')}${renderPathPicker(state, 'jsonPositionPaths', 'Position paths')}${renderPathPicker(state, 'jsonBranchPaths', 'Branch paths')}${renderPathPicker(state, 'jsonOdPaths', 'OD paths')}${renderPathPicker(state, 'jsonBorePaths', 'Bore paths')}</div>` : '<div class="nti-help">Build the hierarchy to populate discovered path selectors and recommendations.</div>'}<div class="nti-actions"><button class="nti-btn" data-nti-action="save-config">Save mapping config</button></div></section>${renderMetrics(state)}${renderReadiness(state)}`;
}
function renderTreeNode(tree, nodeId, depth = 0) {
  const node = tree.byId.get(nodeId);
  if (!node) return '';
  const values = Object.entries(node.values || {}).slice(0, 30).map(([path, value]) => `${path}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n');
  return `<details ${depth < 2 ? 'open' : ''}><summary><b>${esc(node.rawType)}</b> ${esc(node.rawName)} <span class="nti-help">${esc(node.nodeId)} · ${esc(node.jsonPath)}</span></summary><div class="nti-tree-meta">Source: ${esc(node.sourceFile)}\nBranch: ${esc(node.resolvedBranch || '(none)')}\n${esc(values)}</div>${node.childNodeIds.map((childId) => renderTreeNode(tree, childId, depth + 1)).join('')}</details>`;
}
function renderHierarchy(state) {
  if (!state.tree) return '<section class="nti-card"><h3>Staged JSON Hierarchy</h3><div class="nti-help">Build the source index first.</div></section>';
  const paths = state.tree.pathCatalogue.slice(0, 500).map((item) => `<div>${esc(item.path)}</div><div>${esc(item.count)}</div><div>${esc(item.valueTypes?.join('|'))}</div><div>${esc(item.samples.join(' | '))}</div>`).join('');
  return `<section class="nti-card"><h3>Complete Canonical Staged JSON Hierarchy</h3><div class="nti-help">Every staged JSON object and array is represented as a canonical node. Resolver indexes use only these nodes and derived value maps.</div><input class="nti-filter" data-nti-filter-target=".nti-tree details" placeholder="Filter hierarchy text..."><div class="nti-tree">${state.tree.roots.map((id) => renderTreeNode(state.tree, id)).join('')}</div></section><section class="nti-card"><h3>Discovered JSON Path Catalogue</h3><div class="nti-paths nti-paths-4"><div><b>Path</b></div><div><b>Coverage</b></div><div><b>Types</b></div><div><b>Samples</b></div>${paths}</div></section>`;
}
const IDENTITY_HEADERS = [
  { key: 'tableRowIndex', label: 'Table Row' }, { key: 'tableIdentityRaw', label: 'Table Identity Raw' }, { key: 'canonicalIdentity', label: 'Canonical Identity' },
  { key: 'supportRoot', label: 'Support Root' }, { key: 'tableIdentityColumn', label: 'Table Identity Column' }, { key: 'status', label: 'Status', badge: true },
  { key: 'candidateCount', label: 'Candidates' }, { key: 'selectionReason', label: 'Selection Reason' }, { key: 'selectedNodeId', label: 'JSON Node ID' },
  { key: 'selectedIdentityPath', label: 'JSON Identity Path' }, { key: 'selectedJsonPath', label: 'JSON Path' }, { key: 'hierarchyPath', label: 'Hierarchy Path' },
  { key: 'resolvedBranch', label: 'Resolved Branch' }, { key: 'positionSourcePath', label: 'Position Source Path' }, { key: 'position', label: 'Position' }, { key: 'identityConfidence', label: 'Identity Confidence', badge: true },
];
function renderIdentityRows(title, help, rows, filterId) { return `<section class="nti-card"><h3>${esc(title)}</h3><div class="nti-help">${esc(help)}</div><input class="nti-filter" data-nti-table-filter="${esc(filterId)}" placeholder="Filter by identity, root, branch, JSON path or status...">${renderTable(IDENTITY_HEADERS, rows, `nti-filter-table-${filterId}`)}</section>`; }
function renderIdentityTrace(state) { return renderIdentityRows('Identity-wise Node Trace', 'Table identity → canonical JSON node → hierarchy ancestors → branch → configured coordinate evidence.', state.identityTrace?.rows || [], 'identity'); }
function renderIdentityPartition(state, kind) {
  const map = {
    matched: ['Matched Identity Trace', 'Resolved exact/root identity evidence.', state.identityTrace?.matchedRows || []],
    ambiguous: ['Ambiguous Identity Trace', 'Multiple staged hierarchy nodes remain plausible.', state.identityTrace?.ambiguousRows || []],
    rejected: ['Rejected / Unresolved Identity Trace', 'No staged identity candidate or no resolvable support position.', state.identityTrace?.rejectedRows || []],
  };
  return renderIdentityRows(...map[kind], kind);
}
function renderAugmented(state) {
  const rows = state.audit?.augmentedRows || [];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return `<section class="nti-card"><h3>Augmented Support Table</h3><div class="nti-help">Support ISONOTE is a separate traceable column and never overwrites the imported ISOMETRIC NOTES value.</div><div class="nti-actions"><button class="nti-btn" data-nti-action="download-csv" ${rows.length ? '' : 'disabled'}>Download augmented CSV</button><button class="nti-btn" data-nti-action="download-audit" ${state.audit ? '' : 'disabled'}>Download audit JSON</button><button class="nti-btn" data-nti-action="download-ambiguous" ${state.audit?.ambiguousRows?.length ? '' : 'disabled'}>Download ambiguous CSV</button><button class="nti-btn" data-nti-action="download-rejected" ${state.audit?.rejectedRows?.length ? '' : 'disabled'}>Download rejected CSV</button></div><input class="nti-filter" data-nti-table-filter="augmented" placeholder="Filter augmented rows...">${renderTable(headers, rows, 'nti-filter-table-augmented')}</section>`;
}
function renderCandidates(state) {
  const headers = ['tableRowIndex','canonicalIdentity','jsonPath','jsonIdentityPath','jsonPositionPath','resolvedBranch','supportPositionSource','viewName','viewGuid','tagId','commentId','commentBody','positionSource','deltaEMm','deltaNMm','deltaElMm','verticalBasis','verticalResidualMm','score','confidenceReasons','accepted'];
  return `<section class="nti-card"><h3>Candidate Evidence Ledger</h3><input class="nti-filter" data-nti-table-filter="candidates" placeholder="Filter candidate evidence...">${renderTable(headers, state.audit?.candidateLedger || [], 'nti-filter-table-candidates')}</section>`;
}
function renderDecisionPartition(state, kind) {
  const rows = kind === 'matched' ? state.audit?.matchedRows || [] : kind === 'ambiguous' ? state.audit?.ambiguousRows || [] : state.audit?.rejectedRows || [];
  const title = kind === 'matched' ? 'Matched ISONOTE Decisions' : kind === 'ambiguous' ? 'Ambiguous ISONOTE Decisions' : 'Rejected ISONOTE Decisions';
  const headers = ['tableRowIndex','canonicalIdentity','supportRoot','identityStatus','resolvedBranch','supportPositionSource','candidateCount','status','ambiguity','confidence','confidenceScore','confidenceReasons','supportIsonote','selectedEvidenceId'];
  return `<section class="nti-card"><h3>${title}</h3><input class="nti-filter" data-nti-table-filter="decision-${kind}" placeholder="Filter decision rows...">${renderTable(headers, rows, `nti-filter-table-decision-${kind}`)}</section>`;
}
function renderDiagnostics(state) {
  const diagnostics = [...(state.tableBuild?.diagnostics || []), ...(state.identityTrace?.diagnostics || []), ...(state.navisParse?.diagnostics || []), ...(state.audit?.diagnostics || [])];
  return `<section class="nti-card"><h3>Diagnostics / Rejected Evidence</h3><input class="nti-filter" data-nti-table-filter="diagnostics" placeholder="Filter diagnostics...">${renderTable(['severity','code','rowId','identity','evidenceId','message'], diagnostics, 'nti-filter-table-diagnostics')}</section>`;
}
export function renderNavisTagIsonotePane(state) {
  if (state.activeTab === 'hierarchy') return renderHierarchy(state);
  if (state.activeTab === 'identity') return renderIdentityTrace(state);
  if (state.activeTab === 'identity-matched') return renderIdentityPartition(state, 'matched');
  if (state.activeTab === 'identity-ambiguous') return renderIdentityPartition(state, 'ambiguous');
  if (state.activeTab === 'identity-rejected') return renderIdentityPartition(state, 'rejected');
  if (state.activeTab === 'augmented') return renderAugmented(state);
  if (state.activeTab === 'decision-matched') return renderDecisionPartition(state, 'matched');
  if (state.activeTab === 'decision-ambiguous') return renderDecisionPartition(state, 'ambiguous');
  if (state.activeTab === 'decision-rejected') return renderDecisionPartition(state, 'rejected');
  if (state.activeTab === 'candidates') return renderCandidates(state);
  if (state.activeTab === 'diagnostics') return renderDiagnostics(state);
  return renderInputs(state);
}

export const _test = Object.freeze({ renderReadiness, renderIdentityRows, renderPathPicker });

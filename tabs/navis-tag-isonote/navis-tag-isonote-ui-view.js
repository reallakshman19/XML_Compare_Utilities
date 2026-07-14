function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function joinList(values) { return (Array.isArray(values) ? values : []).join('\n'); }
function metric(label, value) { return `<div class="nti-metric"><span>${esc(label)}</span><strong>${esc(value ?? 0)}</strong></div>`; }
function renderMetrics(state) {
  const tree = state.tree?.summary || {};
  const trace = state.identityTrace?.summary || {};
  const navis = state.navisParse?.summary || {};
  const audit = state.audit?.summary || {};
  return `<div class="nti-metrics">${metric('Table rows', state.tableBuild?.records?.length || 0)}${metric('JSON nodes', tree.nodeCount || 0)}${metric('Indexed identities', state.stagedIndex?.summary?.indexedNodeCount || 0)}${metric('Identity resolved', trace.resolvedCount || 0)}${metric('Identity ambiguous', trace.ambiguousCount || 0)}${metric('Navis tags', navis.tagCount || 0)}${metric('ISONOTE resolved', audit.resolvedCount || 0)}${metric('ISONOTE ambiguous', audit.ambiguousCount || 0)}</div>`;
}

function renderInputs(state) {
  const cfg = state.config;
  return `<section class="nti-card"><h3>Source Inputs</h3><div class="nti-help">All staged JSON documents are parsed into a canonical hierarchy tree before identity or coordinate indexes are built.</div><div class="nti-grid">
    <label class="nti-field">Support table CSV/TSV/XLSX<input type="file" data-nti-file="table" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods"></label>
    <label class="nti-field">Navis Tag XML<input type="file" data-nti-file="navis" accept=".xml"></label>
    <label class="nti-field">Managed staged JSON / ZIP<input type="file" data-nti-file="staged" accept=".json,.zip"></label>
  </div><div class="nti-grid-2">
    <label class="nti-field">Support table preview / paste<textarea data-nti-field="tableText" placeholder="Name of the element&#9;PIPE&#9;POS">${esc(state.tableText)}</textarea></label>
    <label class="nti-field">Navis Tag XML preview / paste<textarea data-nti-field="navisText" placeholder="&lt;exchange units=&quot;m&quot;&gt;...">${esc(state.navisText)}</textarea></label>
  </div><div class="nti-actions"><button class="nti-btn nti-btn-primary" data-nti-action="build">Parse all sources + build trace</button><button class="nti-btn" data-nti-action="run">Run ISONOTE proximity resolution</button><span class="nti-status">${esc(state.status)}</span></div></section>
  <section class="nti-card"><h3>Configurable Identity and Proximity Mapping</h3><div class="nti-grid">
    <label class="nti-field">Table support identity columns<textarea data-nti-config="tableIdentityColumns">${esc(joinList(cfg.tableIdentityColumns))}</textarea></label>
    <label class="nti-field">JSON support identity paths<textarea data-nti-config="jsonIdentityPaths">${esc(joinList(cfg.jsonIdentityPaths))}</textarea></label>
    <label class="nti-field">JSON proximity position paths<textarea data-nti-config="jsonPositionPaths">${esc(joinList(cfg.jsonPositionPaths))}</textarea></label>
    <label class="nti-field">Table proximity position column<input data-nti-config="tablePositionColumn" value="${esc(cfg.tablePositionColumn)}"></label>
    <label class="nti-field">JSON branch paths<textarea data-nti-config="jsonBranchPaths">${esc(joinList(cfg.jsonBranchPaths))}</textarea></label>
    <label class="nti-field">JSON OD paths<textarea data-nti-config="jsonOdPaths">${esc(joinList(cfg.jsonOdPaths))}</textarea></label>
    <label class="nti-field">Support coordinate source<select data-nti-config="supportCoordinateSource">${['prefer-table-fallback-json','prefer-json-fallback-table','table-only','json-only','compare-table-json'].map((value) => `<option ${cfg.supportCoordinateSource === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">Table units<select data-nti-config="tableUnits">${['auto','mm','m','cm','ft','in'].map((value) => `<option ${cfg.tableUnits === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">JSON units<select data-nti-config="jsonUnits">${['auto','mm','m','cm','ft','in'].map((value) => `<option ${cfg.jsonUnits === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
    <label class="nti-field">E tolerance mm<input type="number" min="0" data-nti-config="eastingToleranceMm" value="${esc(cfg.eastingToleranceMm)}"></label>
    <label class="nti-field">N tolerance mm<input type="number" min="0" data-nti-config="northingToleranceMm" value="${esc(cfg.northingToleranceMm)}"></label>
    <label class="nti-field">EL / OD-half tolerance mm<input type="number" min="0" data-nti-config="elevationToleranceMm" value="${esc(cfg.elevationToleranceMm)}"></label>
  </div><div class="nti-actions"><button class="nti-btn" data-nti-action="save-config">Save mapping config</button></div></section>${renderMetrics(state)}`;
}

function renderTreeNode(tree, nodeId, depth = 0) {
  const node = tree.byId.get(nodeId);
  if (!node) return '';
  const values = Object.entries(node.values || {}).slice(0, 20).map(([path, value]) => `${path}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n');
  return `<details ${depth < 2 ? 'open' : ''}><summary><b>${esc(node.rawType)}</b> ${esc(node.rawName)} <span class="nti-help">${esc(node.nodeId)} · ${esc(node.jsonPath)}</span></summary><div class="nti-tree-meta">Branch: ${esc(node.resolvedBranch || '(none)')}\n${esc(values)}</div>${node.childNodeIds.map((childId) => renderTreeNode(tree, childId, depth + 1)).join('')}</details>`;
}
function renderHierarchy(state) {
  if (!state.tree) return '<section class="nti-card"><h3>Staged JSON Hierarchy</h3><div class="nti-help">Build the source index first.</div></section>';
  const paths = state.tree.pathCatalogue.slice(0, 200).map((item) => `<div>${esc(item.path)}</div><div>${esc(item.count)}</div><div>${esc(item.samples.join(' | '))}</div>`).join('');
  return `<section class="nti-card"><h3>Complete Canonical Staged JSON Hierarchy</h3><div class="nti-help">Every object/array is represented by a canonical node. Resolver indexes use only these nodes and their derived value maps.</div><div class="nti-tree">${state.tree.roots.map((id) => renderTreeNode(state.tree, id)).join('')}</div></section><section class="nti-card"><h3>Discovered JSON Path Catalogue</h3><div class="nti-paths"><div><b>Path</b></div><div><b>Coverage</b></div><div><b>Samples</b></div>${paths}</div></section>`;
}

function badge(status) {
  const css = /RESOLVED|HIGH|MEDIUM/.test(status) ? 'nti-ok' : /AMBIGUOUS|WARN/.test(status) ? 'nti-warn' : 'nti-error';
  return `<span class="nti-badge ${css}">${esc(status)}</span>`;
}
function renderTable(headers, rows) {
  if (!rows.length) return '<div class="nti-help">No rows available.</div>';
  return `<div class="nti-table-wrap"><table class="nti-table"><thead><tr>${headers.map((header) => `<th>${esc(header.label || header)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 2000).map((row) => `<tr>${headers.map((header) => { const key = header.key || header; const value = row[key]; return `<td title="${esc(typeof value === 'object' ? JSON.stringify(value) : value)}">${header.badge ? badge(String(value || '')) : esc(Array.isArray(value) ? value.join(' → ') : typeof value === 'object' && value ? JSON.stringify(value) : value)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderIdentityTrace(state) {
  const rows = state.identityTrace?.rows || [];
  const headers = [
    { key: 'tableRowIndex', label: 'Table Row' }, { key: 'tableIdentityRaw', label: 'Table Identity Raw' }, { key: 'canonicalIdentity', label: 'Canonical Identity' },
    { key: 'supportRoot', label: 'Support Root' }, { key: 'tableIdentityColumn', label: 'Table Identity Column' }, { key: 'status', label: 'Status', badge: true },
    { key: 'candidateCount', label: 'Candidates' }, { key: 'selectedNodeId', label: 'JSON Node ID' }, { key: 'selectedIdentityPath', label: 'JSON Identity Path' },
    { key: 'selectedJsonPath', label: 'JSON Path' }, { key: 'hierarchyPath', label: 'Hierarchy Path' }, { key: 'resolvedBranch', label: 'Resolved Branch' },
    { key: 'positionSourcePath', label: 'Position Source Path' }, { key: 'position', label: 'Position' }, { key: 'identityConfidence', label: 'Identity Confidence', badge: true },
  ];
  return `<section class="nti-card"><h3>Identity-wise Node Trace</h3><div class="nti-help">Table identity → canonical JSON node → hierarchy ancestors → branch → configured coordinate evidence.</div>${renderTable(headers, rows)}</section>`;
}
function renderAugmented(state) {
  const rows = state.audit?.augmentedRows || [];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return `<section class="nti-card"><h3>Augmented Support Table</h3><div class="nti-help">Support ISONOTE is added as a new traceable column and never overwrites the existing ISOMETRIC NOTES input.</div><div class="nti-actions"><button class="nti-btn" data-nti-action="download-csv" ${rows.length ? '' : 'disabled'}>Download augmented CSV</button><button class="nti-btn" data-nti-action="download-audit" ${state.audit ? '' : 'disabled'}>Download audit JSON</button></div>${renderTable(headers, rows)}</section>`;
}
function renderCandidates(state) {
  const headers = ['tableRowIndex','canonicalIdentity','jsonPath','resolvedBranch','supportPositionSource','viewName','tagId','commentId','commentBody','deltaEMm','deltaNMm','deltaElMm','verticalBasis','verticalResidualMm','score','accepted'];
  return `<section class="nti-card"><h3>Candidate Evidence Ledger</h3>${renderTable(headers, state.audit?.candidateLedger || [])}</section>`;
}
function renderDiagnostics(state) {
  const diagnostics = [...(state.tableBuild?.diagnostics || []), ...(state.identityTrace?.diagnostics || []), ...(state.navisParse?.diagnostics || []), ...(state.audit?.diagnostics || [])];
  return `<section class="nti-card"><h3>Diagnostics / Rejected Evidence</h3>${renderTable(['severity','code','rowId','identity','evidenceId','message'], diagnostics)}</section>`;
}
export function renderNavisTagIsonotePane(state) {
  if (state.activeTab === 'hierarchy') return renderHierarchy(state);
  if (state.activeTab === 'identity') return renderIdentityTrace(state);
  if (state.activeTab === 'augmented') return renderAugmented(state);
  if (state.activeTab === 'candidates') return renderCandidates(state);
  if (state.activeTab === 'diagnostics') return renderDiagnostics(state);
  return renderInputs(state);
}

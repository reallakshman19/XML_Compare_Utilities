// Step 8 UI: manual-anchor workflow surface — anchor rail, candidate review grid (2.2/2.3), and the
// field compare panel (3.2). Reads the models already computed on the workspace (anchor, candidatePairs,
// compareReport) and emits data-attributed controls handled by the XML Compare tab.
export const XML_COMPARE_ANCHOR_REVIEW_PANEL_SCHEMA = 'xml-compare-anchor-review-panel/v1';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();
const label = (record = {}) => clean(record.displayName || record.nodeName || record.nodeNumber || record.elementKey || record.uid);
const mm = (value) => (value == null ? '—' : Number(value).toFixed(3));
const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
const STATUS_LABEL = Object.freeze({ valid: 'VALID', review: 'REVIEW', conflict: 'CONFLICT', 'no-target': 'NO TARGET' });

function anchorRail(workspace = {}) {
  const anchor = workspace.anchor || null;
  const selected = workspace.selectedRecords || {};
  const readySet = selected.source && selected.target;
  return `<div class="xmlc-anchor-rail">
    <div class="xmlc-anchor-cell"><b>Anchor (base pair)</b><span>${anchor ? `${esc(anchor.sourceUid)} ↔ ${esc(anchor.targetUid)}` : 'not set'}</span></div>
    <div class="xmlc-anchor-cell"><b>Selected</b><span>${selected.source ? esc(label(selected.source)) : '(pick a Source node)'} ↔ ${selected.target ? esc(label(selected.target)) : '(pick a Target node)'}</span></div>
    <div class="xmlc-anchor-actions">
      <button type="button" data-xml-compare-action="auto-map-node" ${readySet ? '' : 'disabled'}>Set Anchor</button>
      <button type="button" data-xml-compare-action="clear-auto-map" ${anchor ? '' : 'disabled'}>Clear Anchor</button>
    </div>
  </div>`;
}

const NODE_TRANSFER_BLOCKS = Object.freeze(['DerivedCoordinateBlock', 'TemperatureBlock', 'RestraintsBlock', 'DisplacementsBlock', 'ForcesMomentsBlock', 'SifBlock']);
// AIM config: match basis (coordinate vs node-name) + which node blocks to transfer (e.g. RestraintsBlock only).
function aimConfig(workspace = {}) {
  const aim = workspace.aim || {};
  const basis = aim.basis === 'name' ? 'name' : 'coordinate';
  const blocks = new Set(aim.transferBlocks || []);
  const nameControls = basis === 'name'
    ? `<label>Name field <input data-xml-compare-aim-name-field value="${esc(aim.nameField || 'nodeName')}" style="width:110px"></label>
       <label>Delimiter <input data-xml-compare-aim-name-delimiter value="${esc(aim.nameDelimiter || '')}" style="width:44px" placeholder="."></label>
       <label>Token # <input type="number" min="0" data-xml-compare-aim-name-position value="${esc(aim.namePosition || 0)}" style="width:56px" title="0 = whole name; N = Nth delimiter token"></label>`
    : '';
  const blockChecks = NODE_TRANSFER_BLOCKS.map((name) => `<label class="xmlc-block-chk"><input type="checkbox" data-xml-compare-aim-block="${esc(name)}" ${blocks.has(name) ? 'checked' : ''}> ${esc(name)}</label>`).join('');
  return `<div class="xmlc-aim-config">
    <div class="xmlc-aim-row"><b>Match basis</b><select data-xml-compare-aim-basis><option value="coordinate" ${basis === 'coordinate' ? 'selected' : ''}>Coordinate (nearest within tolerance)</option><option value="name" ${basis === 'name' ? 'selected' : ''}>Node name (exact / delimiter token)</option></select>${nameControls}</div>
    <div class="xmlc-aim-row"><b>Transfer blocks</b><div class="xmlc-block-checks">${blockChecks}</div></div>
  </div>`;
}
function candidateRow(pair = {}) {
  const data = `data-source-uid="${esc(pair.sourceUid)}" data-target-uid="${esc(pair.targetUid)}" data-source-stable="${esc(pair.sourceStableKey)}" data-target-stable="${esc(pair.targetStableKey)}" data-source-label="${esc(pair.sourceLabel)}" data-target-label="${esc(pair.targetLabel)}" data-status="${esc(pair.status)}"`;
  const actions = pair.isAnchor
    ? '<span class="xmlc-anchor-tag">anchor</span>'
    : `<button type="button" class="xmlc-approve" data-xml-compare-candidate-approve ${data}>Approve</button><button type="button" class="xmlc-reject" data-xml-compare-candidate-reject ${data}>Reject</button>`;
  return `<tr class="xmlc-cand is-${esc(pair.status)}"><td>${esc(pair.sourceLabel)}</td><td>→ ${esc(pair.targetLabel || '—')}</td><td>${mm(pair.deltaMm)}</td><td>${pct(pair.matchPct)}</td><td><span class="xmlc-chip is-${esc(pair.status)}">${esc(STATUS_LABEL[pair.status] || pair.status)}</span></td><td class="xmlc-cand-actions">${actions}</td></tr>`;
}

function candidateGrid(workspace = {}) {
  if (!workspace.anchor) return '<div class="xmlc-empty">Select one Source node and one Target node, then <b>Set Anchor</b> to compute candidate pairs.</div>';
  const model = workspace.candidatePairs || {};
  const pairs = model.pairs || [];
  if (!pairs.length) return '<div class="xmlc-empty">No candidate pairs — Source or Target records lack coordinates.</div>';
  const summary = model.summary || {};
  const criterion = model.mode === 'numeric' ? `Δ ≤ ${model.toleranceMm} mm` : model.mode === 'text' ? `text ≥ ${Math.round((model.textMatchThreshold || 0) * 100)}%` : `Δ ≤ ${model.toleranceMm} mm or text ≥ ${Math.round((model.textMatchThreshold || 0) * 100)}%`;
  const isNumeric = model.mode === 'numeric' || model.mode === 'both';
  const isText = model.mode === 'text' || model.mode === 'both';
  let bulkHtml = '<div class="xml-compare-validation-bulk-actions" style="margin-bottom:8px;">';
  if (isNumeric) {
    bulkHtml += `<label>Valid when Δ ≤ <input type="number" min="0" step="0.1" value="${esc(model.toleranceMm ?? 6)}" data-xml-compare-candidate-bulk-numeric-threshold style="width: 80px; display: inline-block;"> mm</label>`;
  }
  if (isText) {
    bulkHtml += `<label style="margin-left: ${isNumeric ? '12px' : '0'};">Valid when text ≥ <input type="number" min="0" step="1" value="${esc(Math.round((model.textMatchThreshold || 0.6) * 100))}" data-xml-compare-candidate-bulk-text-threshold style="width: 80px; display: inline-block;"> %</label>`;
  }
  bulkHtml += `<button type="button" class="xml-compare-validation-action-btn" data-xml-compare-action="bulk-approve-candidate-pairs" style="margin-left:auto;">Approve all valid cases</button></div>`;
  const rows = pairs.map(candidateRow).join('');
  return `<div class="xmlc-cand-summary">VALID ${summary.validCount || 0} · REVIEW ${summary.reviewCount || 0} · CONFLICT ${summary.conflictCount || 0}${summary.noTargetCount ? ` · NO TARGET ${summary.noTargetCount}` : ''} <span class="xmlc-criterion">valid when ${esc(criterion)} (Field type: ${esc(model.mode || 'both')})</span></div>
    ${bulkHtml}
    <div class="xmlc-table-scroll"><table class="xmlc-table"><thead><tr><th>Source</th><th>Nearest target</th><th>Δ mm</th><th>Text %</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function compareValueCell(row = {}) {
  if (row.valueType === 'number' && row.delta != null) return Number(row.delta).toFixed(3);
  if (row.matchPct != null) return pct(row.matchPct);
  return '';
}
export function comparePanel(workspace = {}) {
  const report = workspace.compareReport || {};
  if (!report.pairCount) return '<div class="xmlc-empty">Approve at least one pair to compare selected fields.</div>';
  const t = report.totals || {};
  const rows = (report.pairs || []).flatMap((pairReport) => (pairReport.rows || []).map((row) => `<tr class="is-${esc(row.status)}"><td>${esc(pairReport.sourceUid)} → ${esc(pairReport.targetUid)}</td><td>${esc(row.field)}</td><td>${esc(row.sourceValue)}</td><td>${esc(row.targetValue)}</td><td>${esc(compareValueCell(row))}</td><td><span class="xmlc-chip is-${esc(row.status)}">${esc(row.status)}</span></td></tr>`)).join('');
  return `<div class="xmlc-cand-summary">fields ${t.fieldCount || 0} · unchanged ${t.unchangedCount || 0} · within-tol ${t.withinToleranceCount || 0} · changed ${t.changedCount || 0} · missing ${t.missingCount || 0}</div>
    <div class="xmlc-table-scroll"><table class="xmlc-table"><thead><tr><th>Pair</th><th>Field</th><th>Source</th><th>Target (aligned)</th><th>Δ / match</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No compare fields selected.</td></tr>'}</tbody></table></div>
    <div class="xmlc-anchor-actions"><button type="button" data-xml-compare-action="export-compare-csv">Export compare CSV</button><button type="button" data-xml-compare-action="export-compare-json">Export compare JSON</button></div>`;
}

export function renderXmlCompareAnchorReviewPanelHtml(workspace = {}) {
  return `<section class="xml-compare-panel xmlc-anchor-review" data-xml-compare-anchor-review data-schema="${XML_COMPARE_ANCHOR_REVIEW_PANEL_SCHEMA}">
    <div class="xml-compare-panel-title">Manual anchor · candidate review</div>
    ${anchorRail(workspace)}
    ${aimConfig(workspace)}
    <div class="xmlc-subtitle">Candidate pairs (nearest target per source node under the anchor)</div>
    ${candidateGrid(workspace)}
  </section>`;
}

export const _test = Object.freeze({ esc, clean, label, mm, pct, anchorRail, candidateGrid, comparePanel, candidateRow });


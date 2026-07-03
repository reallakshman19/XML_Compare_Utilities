export const XML_COMPARE_GRAPH_CONNECTOR_LANE_SCHEMA = 'xml-compare-graph-connector-lane/v7';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();

function connectorLabel(conn = {}) {
  if (conn.status === 'approved') return 'APPROVED';
  if (conn.locked) return 'LOCKED';
  if (conn.type === 'EXACT') return 'AUTO';
  if (conn.type === 'CANDIDATE') return 'CAND';
  if (conn.type) return conn.type.replace('APPROX_', 'A');
  return 'LINK';
}

function connectorLine(conn, index, total) {
  const y = total <= 1 ? 50 : 16 + (index * (68 / Math.max(1, total - 1)));
  const cls = conn.status === 'approved' ? 'is-approved' : conn.type === 'EXACT' ? 'is-auto-exact' : conn.type === 'CANDIDATE' ? 'is-candidate' : 'is-auto-approx';
  return `<g class="xml-compare-connector-line ${cls}" data-xml-compare-connector-id="${esc(conn.id)}"><path d="M 4 ${y} C 32 ${Math.max(8, y - 18)}, 68 ${Math.min(92, y + 18)}, 96 ${y}"/><circle cx="4" cy="${y}" r="2.8"/><circle cx="96" cy="${y}" r="2.8"/><text x="50" y="${Math.max(10, y - 5)}">${esc(connectorLabel(conn))}</text></g>`;
}

function pairKey(conn = {}) {
  return `${clean(conn.sourceUid)}->${clean(conn.targetUid)}`;
}

function allConnectors(manualConnectors = [], autoConnectors = [], candidateConnectors = []) {
  const locked = new Set([...manualConnectors, ...autoConnectors].map(pairKey));
  return Object.freeze([...manualConnectors, ...autoConnectors, ...candidateConnectors.filter((conn) => !locked.has(pairKey(conn)))]);
}

function actionPanel() {
  return '<div class="xml-compare-auto-map-actions"><button type="button" data-xml-compare-action="auto-map-node">Auto Map Selected Node</button><button type="button" data-xml-compare-action="auto-map-line">Auto Map Selected Line</button><button type="button" data-xml-compare-action="clear-auto-map">Clear Auto</button></div>';
}

function pendingPanel(preview = null) {
  if (!preview) return '<small>Select Source and Target records to preview a connector. Approval requires Approve Link.</small>';
  return `<article class="xml-compare-pending-connector" data-xml-compare-pending-connector><b>Pending connector preview</b><small>Source: ${esc(preview.sourceLabel || preview.sourceUid)}<br>Target: ${esc(preview.targetLabel || preview.targetUid)}<br>Basis: ${esc((preview.basis || []).join(', '))}<br>Confidence: ${Number(preview.confidence || 0).toFixed(2)}</small><div class="xml-compare-candidate-actions"><button type="button" data-xml-compare-action="approve-pending-connector">Approve Link</button><button type="button" data-xml-compare-action="reject-pending-connector">Reject</button><button type="button" data-xml-compare-action="clear-pending-connector">Clear</button></div></article>`;
}

function candidateAction(action, id, label, disabled = false) {
  return `<button type="button" ${disabled ? 'disabled' : ''} data-xml-compare-candidate-action="${esc(action)}" data-xml-compare-candidate-id="${esc(id)}">${esc(label)}</button>`;
}

function candidateDataset(candidate = {}) {
  return `data-source-uid="${esc(candidate.sourceUid)}" data-target-uid="${esc(candidate.targetUid)}" data-source-label="${esc(candidate.sourceLabel)}" data-target-label="${esc(candidate.targetLabel)}" data-source-field="${esc(candidate.sourceField)}" data-target-field="${esc(candidate.targetField)}" data-source-value="${esc(candidate.sourceValue)}" data-target-value="${esc(candidate.targetValue)}" data-score="${esc(candidate.score)}" data-basis="${esc((candidate.basis || []).join('|'))}"`;
}

function candidateRows(candidates = [], enabled = false, decisions = {}) {
  if (!enabled) return '<small>Manual-first mode: automatic candidate suggestions are off.</small>';
  if (!candidates.length) return '<small>No preview candidates at the selected levels/fields.</small>';
  const rejected = new Set(decisions.rejectedCandidateIds || []);
  return `<div class="xml-compare-candidate-list">${candidates.slice(0, 5).map((candidate) => candidateRow(candidate, rejected.has(candidate.id))).join('')}</div>`;
}

function candidateRow(candidate, rejected = false) {
  return `<article data-xml-compare-candidate-row="${esc(candidate.id)}" ${candidateDataset(candidate)} ${rejected ? 'data-xml-compare-candidate-rejected="true"' : ''}><small><b>${esc(candidate.sourceLabel)}</b> → <b>${esc(candidate.targetLabel)}</b><br>${esc(candidate.sourceField)} = ${esc(candidate.sourceValue)}${rejected ? '<br><b>Rejected</b>' : ''}</small><div class="xml-compare-candidate-actions">${candidateAction('accept', candidate.id, 'Accept', rejected)}${candidateAction('reject', candidate.id, rejected ? 'Rejected' : 'Reject', rejected)}</div></article>`;
}

export function renderXmlCompareGraphConnectorLaneHtml({ manualState = null, matchMap = null, connectorCandidates = null } = {}) {
  const manualConnectors = Array.isArray(manualState?.connectors) ? manualState.connectors : [];
  const autoConnectors = Array.isArray(matchMap?.matches) ? matchMap.matches : [];
  const candidateEnabled = connectorCandidates?.summary?.enabled === true;
  const candidateConnectors = candidateEnabled && Array.isArray(connectorCandidates?.candidates) ? connectorCandidates.candidates : [];
  const connectors = allConnectors(manualConnectors, autoConnectors, candidateConnectors);
  const autoScope = matchMap?.request?.scope || 'not-run';
  const approvedCount = manualState?.approvedMatchSet?.summary?.approvedCount || manualConnectors.length;
  const blockers = manualState?.approvedValidationModel?.summary?.blockerCount || 0;
  return `<section class="xml-compare-graph-connector-lane" data-xml-compare-graph-connector-lane data-xml-compare-connector-overlay><header><b>Connectors</b><span>Source → Target</span></header>${actionPanel()}<div class="xml-compare-graph-connector-counts"><div><b>Approved</b><span>${approvedCount}</span></div><div><b>Auto</b><span>${autoConnectors.length}</span></div><div><b>Mode</b><span>${candidateEnabled ? 'Candidates' : 'Manual'}</span></div><div><b>Scope</b><span>${esc(autoScope)}</span></div><div><b>Validation blockers</b><span>${blockers}</span></div></div>${pendingPanel(manualState?.pendingConnectorPreview || null)}<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="xml-compare-graph-connector-svg">${connectors.map((conn, index) => connectorLine(conn, index, connectors.length)).join('')}${manualState?.pendingConnectorPreview && !connectors.length ? '<g class="xml-compare-connector-line is-pending"><path d="M 4 50 C 32 30, 68 70, 96 50"/><circle cx="4" cy="50" r="2.8"/><text x="50" y="43">PENDING</text></g>' : ''}</svg>${candidateRows(candidateConnectors, candidateEnabled, manualState?.candidateDecisions)}<small>Selection previews a connector only. Use Approve Link to create MatchDecision.v1 / ApprovedMatchSet.v1.</small></section>`;
}

export const _test = Object.freeze({
  esc,
  connectorLabel,
  pairKey,
  allConnectors,
  actionPanel,
  pendingPanel,
  candidateAction,
  candidateDataset,
  candidateRows,
});

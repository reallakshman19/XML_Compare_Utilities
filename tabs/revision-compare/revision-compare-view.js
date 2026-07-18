/** HTML projections for the RC-001 revision session; no state is stored here. */

import { DIFF_CSV_COLUMNS, CONFLICT_CSV_COLUMNS, TRANSFER_CSV_COLUMNS } from '../../workbench3d/apply/exporters.js';
import { DIFF_STATUS, APPROVAL_STATUS, TRANSFER_RULES, CONFIDENCE } from '../../workbench3d/contracts/contracts.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function slotMarkup(slotId, label) {
  const isA = slotId === 'baseline';
  const colorClass = isA ? 'revc-slot-a' : 'revc-slot-b';
  const title = isA ? 'Baseline' : 'Candidate';
  return `<section class="revc-slot ${colorClass}" data-revc-slot="${slotId}">
    <header><div><span class="revc-tag">${label}</span><strong>${title}</strong></div><b data-revc-slot-state="${slotId}">Not loaded</b></header>
    <label class="revc-file">Load staged JSON / PSI XML<input type="file" accept=".json,.xml,application/json,application/xml,text/xml" data-revc-file="${slotId}"></label>
    <div class="revc-scope"><label>Branch scope wildcard<input type="text" data-revc-scope="${slotId}" placeholder="Example: /PIPE-* or AREA-01"></label><button type="button" data-revc-apply-scope="${slotId}" disabled>Apply scope</button></div>
    <p class="revc-slot-message" data-revc-slot-message="${slotId}">Choose an inputxml-managed-stage/v1 JSON file or an AVEVA PSI PipeStressExport XML (converted automatically).</p>
    <dl data-revc-facts="${slotId}">${emptyFacts()}</dl>
  </section>`;
}

function emptyFacts() {
  return '<div><dt>File</dt><dd>—</dd></div><div><dt>Source hash</dt><dd>—</dd></div><div><dt>Scope</dt><dd>—</dd></div><div><dt>Inventory</dt><dd>—</dd></div>';
}

/** Full modal markup for the dual-revision preflight capability. */
export function revisionCompareWorkspaceMarkup() {
  return `<section class="revc-dialog" role="dialog" aria-modal="true" aria-labelledby="revc-title">
    <header class="revc-head"><div><span>WORKBENCH PLATFORM · RC-001</span><h2 id="revc-title">Revision Compare Foundation</h2><p>Load and scope two immutable staged JSON revisions. This phase validates the comparison basis; matching and transfer remain disabled.</p></div><button type="button" data-revc-close aria-label="Close Revision Compare">Close</button></header>
    <main class="revc-body">
      <div class="revc-setup-container" data-revc-setup>
        <section class="revc-principle"><b>Authoritative inputs</b><span>Rev A and Rev B remain unchanged. The downloadable session manifest contains hashes and metadata, never raw project data.</span></section>
        <div class="revc-slots">${slotMarkup('baseline', 'REV A')}${slotMarkup('candidate', 'REV B')}</div>
        <section class="revc-preflight" data-revc-preflight>
          <header><div><span>SESSION PREFLIGHT</span><strong data-revc-preflight-status>INCOMPLETE</strong></div><div class="revc-actions"><button type="button" data-revc-download>Download session manifest</button><button type="button" class="revc-btn-primary revc-run-btn" data-revc-run-compare disabled title="Available after RC-002 identity adaptation and RC-003 comparison">▶ Run compare (3D)</button></div></header>
          <div class="revc-preflight-grid"><div><h3>Blockers</h3><ul data-revc-blockers><li>baseline revision is not loaded.</li><li>candidate revision is not loaded.</li></ul></div><div><h3>Warnings</h3><ul data-revc-warnings><li>None.</li></ul></div><div><h3>Notes</h3><ul data-revc-notes><li>None.</li></ul></div></div>
        </section>
      </div>
      
      <!-- Integrated 3D Data Compare Workbench UI -->
      <section class="revc-workbench-ui" data-revc-workbench-ui hidden>
        <div class="revc-workbench-left">
          <div class="revc-canvas-section">
            <header>
              <h3>3D visual compare</h3>
              <div class="revc-canvas-controls">
                <label>Layout <select data-revc-layout-mode>
                  <option value="overlaid" selected>Overlaid</option>
                  <option value="side-by-side">Side-by-side</option>
                </select></label>
                <label>Connectors <select data-revc-connector-mode>
                  <option value="hidden">None</option>
                  <option value="selection">Selection only</option>
                  <option value="basis">Basis anchors</option>
                  <option value="matches" selected>Matches (basis + derived)</option>
                  <option value="candidates">Candidates</option>
                  <option value="conflicts">Conflicts</option>
                  <option value="transfer">Transfer (planned)</option>
                  <option value="registration">Registration anchors</option>
                </select></label>
                <span class="revc-connector-legend">
                  <i style="background:#f59e0b"></i>Basis
                  <i style="background:#22c55e"></i>High
                  <i style="background:#84cc16"></i>Medium
                  <i style="background:#ef4444"></i>Low
                  <i style="background:#0891b2"></i>Transfer
                </span>
              </div>
            </header>
            <div class="revc-canvas-host" data-revc-canvas-host>
              <div class="revc-connector-tip" data-revc-connector-tip hidden></div>
              <div class="revc-hover-tip" data-revc-hover-tip hidden></div>
              <div class="revc-approval-overlay" data-revc-approval-overlay hidden></div>
            </div>
          </div>
        </div>
        <div class="revc-workbench-right">
          <div class="revc-dashboard-host" data-revc-dashboard-host></div>
          <div class="revc-tables-host" data-revc-tables-host></div>
          <div class="revc-transfer-host" data-revc-transfer-host></div>
        </div>
      </section>
    </main>
    <footer><span data-revc-session-id></span><span aria-live="polite" data-revc-live>Revision session is ready for input.</span></footer>
  </section>`;
}

function fact(label, value) { return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`; }
function shortHash(value) { const text = String(value ?? ''); return text ? `${text.slice(0, 12)}…${text.slice(-8)}` : '—'; }

/** Render one immutable ProjectDocument manifest into its slot card. */
export function renderRevisionSlot(root, slotId, document, message) {
  const state = root.querySelector(`[data-revc-slot-state="${slotId}"]`);
  const facts = root.querySelector(`[data-revc-facts="${slotId}"]`);
  const scopeButton = root.querySelector(`[data-revc-apply-scope="${slotId}"]`);
  const messageNode = root.querySelector(`[data-revc-slot-message="${slotId}"]`);
  if (messageNode) messageNode.textContent = message;
  if (scopeButton) scopeButton.disabled = !document;
  if (state) { state.textContent = document ? 'Loaded' : 'Not loaded'; state.dataset.status = document ? 'ready' : 'idle'; }
  if (!facts) return;
  if (!document) { facts.innerHTML = emptyFacts(); return; }
  facts.innerHTML = [
    fact('File', document.fileName), fact('Source hash', shortHash(document.sourceHash)),
    fact('Scoped hash', shortHash(document.scopedHash)), fact('Schema', document.stagedSchema),
    fact('Root shape', document.rootShape), fact('Scope', document.scope.wildcard || 'All branches'),
    fact('Inventory', `${document.stats.branchCount} branches · ${document.stats.componentCount} components`),
    fact('Frame', `${document.unit} · up ${document.verticalAxis} · ${document.coordinateFrame}`),
  ].join('');
}

function renderMessages(host, values) {
  if (!host) return;
  host.innerHTML = values.length ? values.map((value) => `<li>${escapeHtml(value)}</li>`).join('') : '<li>None.</li>';
}

/** Render preflight blockers/warnings/notes derived from ProjectSession only. */
export function renderRevisionPreflight(root, preflight) {
  const status = root.querySelector('[data-revc-preflight-status]');
  if (status) { status.textContent = preflight.status; status.dataset.status = preflight.status.toLowerCase(); }
  renderMessages(root.querySelector('[data-revc-blockers]'), preflight.blockers);
  renderMessages(root.querySelector('[data-revc-warnings]'), preflight.warnings);
  renderMessages(root.querySelector('[data-revc-notes]'), preflight.notes);
}

// --- Workbench UI Integrations ---

function tableHtml(columns, rows, { rowAttrs = () => '', limit = 300 } = {}) {
  if (!rows?.length) return '<p class="wb3d-muted">No rows.</p>';
  const shown = rows.slice(0, limit);
  const cell = (value) => escapeHtml(Array.isArray(value) ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join('; ') : (typeof value === 'object' && value !== null ? JSON.stringify(value) : value));
  return `<div class="wb3d-table-wrap"><table><thead><tr>${columns.map(([, l]) => `<th>${escapeHtml(l)}</th>`).join('')}</tr></thead>
    <tbody>${shown.map((row) => `<tr ${rowAttrs(row)}>${columns.map(([k]) => `<td>${cell(row?.[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${rows.length > limit ? `<p class="wb3d-muted">Showing ${limit} of ${rows.length} rows — full data in exports.</p>` : ''}</div>`;
}

export function renderWorkbenchDashboard(host, state) {
  if (!state.audit) { host.innerHTML = '<section class="wb3d-card"><h3>Variance dashboard</h3><p class="wb3d-muted">Run a compare to populate the dashboard.</p></section>'; return; }
  const s = state.audit.summary;
  const plain = (label, value) => `<div class="wb3d-tile"><strong>${value ?? 0}</strong><span>${label}</span></div>`;
  const warnings = state.audit.registration?.warnings ?? [];
  host.innerHTML = `
  <section class="wb3d-card">
    <h3>Variance dashboard</h3>
    ${warnings.length ? `<div class="wb3d-alert">⚠ ${warnings.map(escapeHtml).join('<br>⚠ ')}</div>` : ''}
    <div class="wb3d-tiles">
      ${plain('Source canonical', s.sourceCanonicalElements)}
      ${plain('Target canonical', s.targetCanonicalElements)}
      ${plain('Matched elements', s.matchedElements)}
      ${plain('Basis anchors', s.basisElements)}
      ${plain('Unchanged', s.unchangedElements)}
      ${plain('Property changed', s.propertyChangedElements)}
      ${plain('Geometry changed', s.geometryChangedElements)}
      ${plain('Missing in target', s.missingInTarget)}
      ${plain('New in target', s.newInTarget)}
      ${plain('Ambiguous', s.ambiguousElements)}
      ${plain('Conflict rows', s.conflictCount)}
    </div>
  </section>`;
}

export function renderWorkbenchTables(host, state) {
  if (!state.audit) { host.innerHTML = ''; return; }
  const diffRows = state.audit.objectDiff.rows ?? [];
  const conflictRows = state.audit.conflictLedger.rows ?? [];
  host.innerHTML = `
  <details class="wb3d-card" open>
    <summary><h3>Object diff <span class="wb3d-muted">${diffRows.length} row(s)</span></h3></summary>
    ${tableHtml(DIFF_CSV_COLUMNS, diffRows, { rowAttrs: (r) => `data-action="select-object" data-object="${escapeHtml(r.sourceObjectId || r.targetObjectId)}" class="wb3d-row-click"` })}
  </details>
  <details class="wb3d-card" ${conflictRows.length ? 'open' : ''}>
    <summary><h3>Conflicts <span class="wb3d-muted">${conflictRows.length} row(s)</span></h3></summary>
    ${tableHtml(CONFLICT_CSV_COLUMNS, conflictRows, { rowAttrs: (r) => (r.sourceObjectId ? `data-action="select-object" data-object="${escapeHtml(r.sourceObjectId)}" class="wb3d-row-click"` : '') })}
  </details>`;
}

export function renderWorkbenchTransfer(host, state) {
  if (!state.audit) { host.innerHTML = ''; return; }
  const plan = state.plan;
  const approveButtons = (row) => row.approval === APPROVAL_STATUS.BLOCKED
    ? `<span class="wb3d-muted">${escapeHtml(row.blockedReason)}</span>`
    : `<button class="wb3d-btn wb3d-btn-mini" data-action="approve-row" data-row="${escapeHtml(row.rowId)}" ${row.approval === APPROVAL_STATUS.APPROVED ? 'disabled' : ''}>Approve</button>
       <button class="wb3d-btn wb3d-btn-mini" data-action="reject-row" data-row="${escapeHtml(row.rowId)}" ${row.approval === APPROVAL_STATUS.REJECTED ? 'disabled' : ''}>Reject</button>`;
  const columns = [...TRANSFER_CSV_COLUMNS.filter(([k]) => k !== 'blockedReason'), ['__actions', 'Actions']];
  const rows = (plan?.rows ?? []).map((r) => ({ ...r, __actions: approveButtons(r) }));
  host.innerHTML = `
  <section class="wb3d-card">
    <h3>Transfer preview &amp; approval</h3>
    <div class="wb3d-toolbar">
      <label>Rule <select data-transfer-config="rule">${Object.values(TRANSFER_RULES).map((r) => `<option ${state.transferConfig?.rule === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label>Min confidence <select data-transfer-config="minConfidence">${[CONFIDENCE.HIGH, CONFIDENCE.MEDIUM, CONFIDENCE.LOW].map((c) => `<option ${state.transferConfig?.minConfidence === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <button class="wb3d-btn wb3d-btn-primary" data-action="build-plan">Build transfer plan</button>
      ${plan ? `<button class="wb3d-btn" data-action="batch-approve">Batch approve ≥ min confidence</button>` : ''}
      ${plan ? `<button class="wb3d-btn" data-action="download-updated-xml" title="Apply APPROVED rows to the candidate PSI XML and download the updated copy">Download updated target XML</button>` : ''}
    </div>
    ${plan ? `<p>${plan.summary.totalRows} row(s): <strong>${plan.summary.approvedRows ?? 0} approved</strong>, ${plan.summary.pendingRows} pending, ${plan.summary.blockedRows} blocked.</p>` : '<p class="wb3d-muted">No plan yet.</p>'}
    ${plan ? `<div data-wb3d-transfer-table>${tableHtml(columns, rows)}</div>` : ''}
  </section>`;
}

export const _test = Object.freeze({ escapeHtml, emptyFacts, shortHash });


/** HTML projections for the RC-001 revision session; no state is stored here. */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function slotMarkup(slotId, label) {
  return `<section class="revc-slot" data-revc-slot="${slotId}">
    <header><div><span>${label}</span><strong>${slotId === 'baseline' ? 'Baseline' : 'Candidate'}</strong></div><b data-revc-slot-state="${slotId}">Not loaded</b></header>
    <label class="revc-file">Load staged JSON<input type="file" accept=".json,application/json" data-revc-file="${slotId}"></label>
    <div class="revc-scope"><label>Branch scope wildcard<input type="text" data-revc-scope="${slotId}" placeholder="Example: /PIPE-* or AREA-01"></label><button type="button" data-revc-apply-scope="${slotId}" disabled>Apply scope</button></div>
    <p class="revc-slot-message" data-revc-slot-message="${slotId}">Choose an inputxml-managed-stage/v1 or shape-compatible JSON file.</p>
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
      <section class="revc-principle"><b>Authoritative inputs</b><span>Rev A and Rev B remain unchanged. The downloadable session manifest contains hashes and metadata, never raw project data.</span></section>
      <div class="revc-slots">${slotMarkup('baseline', 'REV A')}${slotMarkup('candidate', 'REV B')}</div>
      <section class="revc-preflight" data-revc-preflight>
        <header><div><span>SESSION PREFLIGHT</span><strong data-revc-preflight-status>INCOMPLETE</strong></div><div class="revc-actions"><button type="button" data-revc-download>Download session manifest</button><button type="button" disabled title="Available after RC-002 identity adaptation and RC-003 comparison">Run comparison</button></div></header>
        <div class="revc-preflight-grid"><div><h3>Blockers</h3><ul data-revc-blockers><li>baseline revision is not loaded.</li><li>candidate revision is not loaded.</li></ul></div><div><h3>Warnings</h3><ul data-revc-warnings><li>None.</li></ul></div><div><h3>Notes</h3><ul data-revc-notes><li>None.</li></ul></div></div>
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

export const _test = Object.freeze({ escapeHtml, emptyFacts, shortHash });


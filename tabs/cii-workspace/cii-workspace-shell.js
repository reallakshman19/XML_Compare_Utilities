import { createCiiWorkspacePreview, inspectCiiWorkspaceModels } from './cii-workspace-core.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';
import { stableStringify } from './cii-workspace-contracts.js';
import { updateCiiReviewDecisions } from './cii-workspace-review.js';

function h(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function parseNodes(value) { return String(value || '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean); }
function anchorPairs(source, target) {
  const left = parseNodes(source); const right = parseNodes(target);
  if (left.length !== right.length || left.length < 1) throw new Error('Provide at least one SOURCE and TARGET anchor node in corresponding order.');
  return left.map((sourceNodeId, index) => ({ sourceNodeId, targetNodeId: right[index] }));
}
function download(documentRef, name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = documentRef.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(6)).toString() : '—';
  if (typeof value === 'object') return stableStringify(value);
  return String(value);
}
function passText(evidence) {
  if (!evidence || evidence.available === false) return '—';
  return evidence.pass ? 'PASS' : 'FAIL';
}
function stageMarkup() {
  return createCiiWorkspaceStageModel().map((stage) => `<section class="ciiw-stage" data-ciiw-stage="${stage.id}">
<h3>${h(stage.id)} ${h(stage.label)}</h3><p>Status: <b>${h(stage.status)}</b></p>
${stage.id === '06' ? `<p>${h(stage.blockers?.[0])}</p><button type="button" disabled data-ciiw-apply>Apply to target CII</button>` : ''}
</section>`).join('');
}
function componentText(summary) {
  const rows = Object.entries(summary?.componentCounts || {}).sort(([a], [b]) => a.localeCompare(b));
  return rows.length ? rows.map(([kind, count]) => `${kind}:${count}`).join(', ') : 'none';
}
function landmarkSide(label, side) {
  const rows = side?.landmarks || [];
  const items = rows.length ? rows.map((row) => `<li><b>${h(row.nodeId)}</b> — ${h(row.reasons.join(', '))} <small>SUGGESTED · engineer lock required</small></li>`).join('') : '<li>No distinctive landmark suggestions.</li>';
  const summary = side?.summary || {};
  return `<div class="ciiw-model-card"><h4>${h(label)} model</h4><p><b>${h(side?.fileName || '')}</b></p><p>Version: ${h(summary.version || 'unspecified')}</p><p>${h(summary.elementCount ?? '—')} elements · ${h(summary.nodeCount ?? '—')} nodes · ${h(summary.terminalCount ?? '—')} terminals · ${h(summary.branchCount ?? '—')} branches</p><p>Components: ${h(componentText(summary))} · ${h(summary.bendCount ?? '—')} bends · ${h(summary.rigidRecordCount ?? '—')} rigid records</p><h5>Suggested landmarks</h5><ul>${items}</ul></div>`;
}
function landmarkMarkup(inspection) { return `<div class="ciiw-landmark-grid">${landmarkSide('SOURCE', inspection?.source)}${landmarkSide('TARGET', inspection?.target)}</div>`; }
function decisionControl(row, decisions) {
  const current = decisions.get(row.correspondenceId) || '';
  if (row.workflowStatus === 'LOCKED' || row.decision === 'LOCKED') return '<span class="ciiw-pill">LOCKED</span>';
  return `<select data-ciiw-decision="${h(row.correspondenceId)}"><option value="">Review…</option><option value="LOCK" ${current === 'LOCK' ? 'selected' : ''}>Lock</option><option value="ACCEPT" ${current === 'ACCEPT' ? 'selected' : ''}>Accept</option><option value="REJECT" ${current === 'REJECT' ? 'selected' : ''}>Reject</option></select>`;
}
function correspondenceMarkup(current, decisions, filter = {}) {
  const rows = current?.compareReview?.rows || [];
  const confidence = String(filter.confidence || 'ALL'); const search = String(filter.search || '').trim().toLowerCase();
  const changedOnly = Boolean(filter.changedOnly);
  const visible = rows.filter((row) => {
    if (confidence !== 'ALL' && row.confidence !== confidence) return false;
    if (changedOnly && !row.changeCount) return false;
    if (search) {
      const haystack = [row.source, row.target, row.kind, row.confidence, ...(row.changeFamilies || [])].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  if (!visible.length) return '<p>No correspondence rows match the current filters.</p>';
  return `<table class="ciiw-grid"><thead><tr><th>Decision</th><th>Kind</th><th>Confidence</th><th>Source</th><th>Target</th><th>M1 Spatial</th><th>M2 Gang</th><th>OD</th><th>WT</th><th>Winner gap</th><th>Engineering changes</th><th>Evidence</th></tr></thead><tbody>${visible.map((row) => `<tr>
<td>${decisionControl(row, decisions)}</td><td>${h(row.kind)}</td><td><b>${h(row.confidence)}</b><small>${h(row.workflowStatus)}</small></td><td>${h(row.source)}</td><td>${h(row.target)}</td>
<td>${h(passText(row.methodA))}${row.methodA?.distanceMm != null ? `<small>${h(formatValue(row.methodA.distanceMm))} mm / ${h(formatValue(row.methodA.toleranceMm))}</small>` : ''}</td>
<td>${h(passText(row.methodB))}${row.methodB ? `<small>score ${h(formatValue(row.methodB.score))}</small>` : ''}</td>
<td>${h(passText(row.od))}</td><td>${h(passText(row.wall))}</td><td>${h(row.winnerGap ?? '—')} / ${h(row.requiredWinnerGap ?? '—')}</td>
<td>${row.changeCount ? `<b>${h(row.changeCount)}</b><small>${h(row.changeFamilies.join(', '))}</small>` : '—'}</td>
<td><button type="button" data-ciiw-inspect-row="${h(row.correspondenceId)}">Inspect</button></td></tr>`).join('')}</tbody></table>`;
}
function executiveMarkup(current) {
  const model = current?.compareReview; if (!model) return '<p>Run Compare models to build the executive summary.</p>';
  const c = model.summary?.correspondence || {}; const confidence = c.confidence || {}; const engineering = model.summary?.engineering || {}; const review = model.summary?.review || {};
  const families = Object.entries(engineering.changeFamilyCounts || {}).map(([key, value]) => `${key} ${value}`).join(' · ') || 'No qualified engineering changes';
  return `<div class="ciiw-exec-head"><div><b>${h(model.source.fileName)}</b><span> SOURCE</span></div><div class="ciiw-arrow">→</div><div><b>${h(model.target.fileName)}</b><span> TARGET</span></div></div>
<div class="ciiw-kpis"><div><b>${h(confidence.HIGH || 0)}</b><span>HIGH</span></div><div><b>${h(confidence.MEDIUM || 0)}</b><span>MEDIUM</span></div><div><b>${h(confidence.REVIEW || 0)}</b><span>REVIEW</span></div><div><b>${h(confidence.UNRESOLVED || 0)}</b><span>UNRESOLVED</span></div><div><b>${h(engineering.engineeringChangeCount || 0)}</b><span>Engineering changes</span></div><div><b>${h(review.locked || 0)}</b><span>Locked</span></div></div>
<p class="ciiw-family-summary">${h(families)}</p>`;
}
function inspectorMarkup(row) {
  if (!row) return '<p>Select a correspondence row to inspect its evidence.</p>';
  const alternatives = row.alternatives?.length ? `<table><thead><tr><th>Target</th><th>Confidence</th><th>Score</th><th>Rank</th><th>M1</th><th>M2</th></tr></thead><tbody>${row.alternatives.map((item) => `<tr><td>${h(item.target)}</td><td>${h(item.confidence)}</td><td>${h(formatValue(item.score))}</td><td>${h(formatValue(item.rankingScore))}</td><td>${h(item.m1Pass == null ? '—' : item.m1Pass ? 'PASS' : 'FAIL')} ${h(formatValue(item.m1Score))}</td><td>${h(item.m2Pass == null ? '—' : item.m2Pass ? 'PASS' : 'FAIL')} ${h(formatValue(item.m2Score))}</td></tr>`).join('')}</tbody></table>` : '<p>No alternative candidate list is available for this identity kind.</p>';
  const changes = row.changes?.length ? `<table><thead><tr><th>Category</th><th>Property</th><th>Source</th><th>Target</th><th>Delta / change</th><th>Evidence</th></tr></thead><tbody>${row.changes.map((item) => `<tr><td>${h(item.category)}</td><td>${h(item.property)}</td><td>${h(formatValue(item.sourceValue))}</td><td>${h(formatValue(item.targetValue))}</td><td>${h(item.semanticChange)} ${h(formatValue(item.delta))}</td><td>${h(item.evidenceStatus)}</td></tr>`).join('')}</tbody></table>` : '<p>No qualified engineering changes for this correspondence.</p>';
  return `<div class="ciiw-inspector-head"><div><b>${h(row.source)}</b> → <b>${h(row.target)}</b></div><span class="ciiw-pill">${h(row.confidence)}</span></div>
<div class="ciiw-evidence-cards"><div><b>M1 Spatial</b><span>${h(passText(row.methodA))}</span><small>${row.methodA?.distanceMm != null ? `${h(formatValue(row.methodA.distanceMm))} mm / ${h(formatValue(row.methodA.toleranceMm))} mm · ${h(row.methodA.basis)}` : 'Unavailable'}</small></div><div><b>M2 Network</b><span>${h(passText(row.methodB))}</span><small>${row.methodB ? `score ${h(formatValue(row.methodB.score))} / ${h(formatValue(row.methodB.threshold))}` : 'Unavailable'}</small></div><div><b>OD</b><span>${h(passText(row.od))}</span></div><div><b>Wall</b><span>${h(passText(row.wall))}</span></div><div><b>Winner gap</b><span>${h(row.winnerGap ?? '—')} / ${h(row.requiredWinnerGap ?? '—')}</span></div></div>
${row.reasons?.length ? `<p><b>Identity notes:</b> ${h(row.reasons.join(', '))}</p>` : ''}<h4>Alternative candidates</h4>${alternatives}<h4>Engineering changes</h4>${changes}`;
}
function deltaMarkup(current) {
  const rows = current?.engineeringDeltas?.changedRows || [];
  if (!rows.length) return '<p>No qualified engineering changes were detected.</p>';
  return `<table class="ciiw-grid"><thead><tr><th>Source</th><th>Target</th><th>Identity confidence</th><th>Category</th><th>Property</th><th>Source value</th><th>Target value</th><th>Delta / semantic change</th><th>Evidence</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.sourceIdentity)}</td><td>${h(row.targetIdentity)}</td><td>${h(row.identityConfidence)}</td><td>${h(row.category)}</td><td>${h(row.property)}</td><td>${h(formatValue(row.sourceValue))}</td><td>${h(formatValue(row.targetValue))}</td><td>${h(row.semanticChange)} ${h(formatValue(row.delta))}</td><td>${h(row.evidenceStatus)}</td></tr>`).join('')}</tbody></table>`;
}
function limitationMarkup(current) {
  const rows = current?.engineeringDeltas?.limitations || [];
  if (!rows.length) return '';
  return `<div class="ciiw-limitations"><h4>Capability limits</h4>${rows.map((item) => `<div><b>${h(item.label)}</b><span>${h(item.comparisonState)}</span><small>SOURCE ${h(item.sourceState)} / TARGET ${h(item.targetState)} · ${h(item.reason)}</small></div>`).join('')}</div>`;
}
function transferMarkup(current) {
  const plan = current?.transferPlan;
  if (!plan) return '<p>Build and review correspondence before transfer preview.</p>';
  const operations = plan.operations || [];
  const table = operations.length ? `<table class="ciiw-grid"><thead><tr><th>Property</th><th>Custody</th><th>Before</th><th>Proposed</th><th>Status</th><th>Blockers</th></tr></thead><tbody>${operations.map((item) => `<tr><td>${h(item.property)}</td><td>${h(item.custody)}</td><td>${h(formatValue(item.before))}</td><td>${h(formatValue(item.proposed))}</td><td>${h(item.status)}</td><td>${h((item.blockers || []).join(', ') || '—')}</td></tr>`).join('')}</tbody></table>` : '<p>No transfer-preview operations are currently proposed.</p>';
  return `<div class="ciiw-transfer-banner"><b>TRANSFER PREVIEW · ${h(plan.status)}</b><span>Target mutation is not implemented. Geometry, OD and wall remain protected.</span></div><p>${h(plan.summary?.operationCount || 0)} planned · ${h(plan.summary?.previewReadyCount || 0)} preview-ready · ${h(plan.summary?.blockedCount || 0)} blocked</p>${plan.blockers?.length ? `<p><b>Blockers:</b> ${h(plan.blockers.join(', '))}</p>` : ''}${table}<button type="button" disabled data-ciiw-apply-target>Apply to target CII</button>`;
}
function reviewFrom(decisions) {
  const reviewedCorrespondenceIds = []; const lockedCorrespondenceIds = []; const rejectedCorrespondenceIds = [];
  for (const [id, decision] of decisions.entries()) {
    if (decision === 'LOCK') lockedCorrespondenceIds.push(id);
    if (decision === 'ACCEPT') reviewedCorrespondenceIds.push(id);
    if (decision === 'REJECT') rejectedCorrespondenceIds.push(id);
  }
  return { reviewedCorrespondenceIds, lockedCorrespondenceIds, rejectedCorrespondenceIds };
}

export function mountCiiWorkspaceShell(container, options = {}) {
  container.innerHTML = `<div class="ciiw-workspace"><header><div><h2>CII Workspace</h2><p>Compare CAESAR II neutral models and review engineering changes</p></div><button type="button" data-ciiw-close>Close</button></header>
<nav class="ciiw-tabs"><button type="button" data-ciiw-tab="inputs">1 Inputs &amp; Match Basis</button><button type="button" data-ciiw-tab="compare">2 Compare Review</button><button type="button" data-ciiw-tab="transfer">3 Transfer Preview</button></nav>
<section data-ciiw-panel="inputs"><div class="ciiw-intake"><label>SOURCE CII <input type="file" accept=".cii,.accdb" data-ciiw-source></label><label>TARGET CII <input type="file" accept=".cii,.accdb" data-ciiw-target></label>
<button type="button" data-ciiw-inspect>Inspect models &amp; suggest landmarks</button><div data-ciiw-landmarks></div>
<label>SOURCE locked anchors <input type="text" placeholder="10 or 10, 200" data-ciiw-source-anchors></label><label>TARGET locked anchors <input type="text" placeholder="20010 or 20010, 20200" data-ciiw-target-anchors></label>
<button type="button" data-ciiw-analyze>Compare models →</button></div><div class="ciiw-status" data-ciiw-status>Load two neutral CII files, inspect suggested landmarks, then enter engineer-locked anchor pair(s).</div></section>
<section data-ciiw-panel="compare"><div class="ciiw-results"><h3>1. Executive Summary</h3><div data-ciiw-executive></div><h3>2. Correspondence Review</h3><div class="ciiw-toolbar"><label>Confidence <select data-ciiw-confidence-filter><option>ALL</option><option>HIGH</option><option>MEDIUM</option><option>REVIEW</option><option>UNRESOLVED</option><option>LOCKED</option></select></label><label>Search <input type="search" data-ciiw-search placeholder="Node, element, family"></label><label><input type="checkbox" data-ciiw-changed-only> Changed only</label></div><div data-ciiw-results></div><aside class="ciiw-inspector" data-ciiw-inspector></aside><h3>3. Engineering Delta Grid</h3><div data-ciiw-deltas></div><div data-ciiw-limitations></div>
<button type="button" data-ciiw-refresh-review disabled>Refresh property-transfer preview</button><button type="button" data-ciiw-export-csv disabled>Export correspondence CSV</button><button type="button" data-ciiw-export-json disabled>Export audit JSON</button></div></section>
<section data-ciiw-panel="transfer"><div data-ciiw-transfer></div><div class="ciiw-stages">${stageMarkup()}</div></section></div>`;
  let current = null; let baseInput = null; let disposed = false; const decisions = new Map();
  const filters = { confidence: 'ALL', search: '', changedOnly: false };
  const query = (selector) => container.querySelector(selector); const status = query('[data-ciiw-status]'); const results = query('[data-ciiw-results]'); const landmarkBox = query('[data-ciiw-landmarks]');
  const executive = query('[data-ciiw-executive]'); const inspector = query('[data-ciiw-inspector]'); const deltas = query('[data-ciiw-deltas]'); const limits = query('[data-ciiw-limitations]'); const transfer = query('[data-ciiw-transfer]');
  const reviewButton = query('[data-ciiw-refresh-review]'); const csvButton = query('[data-ciiw-export-csv]'); const jsonButton = query('[data-ciiw-export-json]');
  const switchTab = (name) => {
    container.querySelectorAll('[data-ciiw-panel]').forEach((panel) => { panel.hidden = panel.dataset.ciiwPanel !== name; });
    container.querySelectorAll('[data-ciiw-tab]').forEach((button) => { button.setAttribute('aria-current', button.dataset.ciiwTab === name ? 'page' : 'false'); });
  };
  const renderCorrespondence = () => {
    results.innerHTML = correspondenceMarkup(current, decisions, filters);
    results.querySelectorAll('[data-ciiw-decision]').forEach((select) => select.addEventListener('change', () => { decisions.set(select.dataset.ciiwDecision, select.value); }));
    results.querySelectorAll('[data-ciiw-inspect-row]').forEach((button) => button.addEventListener('click', () => {
      const row = current?.compareReview?.rows?.find((item) => item.correspondenceId === button.dataset.ciiwInspectRow);
      inspector.innerHTML = inspectorMarkup(row); switchTab('compare');
    }));
  };
  const render = () => {
    executive.innerHTML = executiveMarkup(current); renderCorrespondence(); deltas.innerHTML = deltaMarkup(current); limits.innerHTML = limitationMarkup(current); transfer.innerHTML = transferMarkup(current);
    inspector.innerHTML = inspectorMarkup(current?.compareReview?.rows?.[0] || null);
  };
  const invalidate = (message, clearLandmarks = false) => {
    current = null; baseInput = null; decisions.clear(); results.innerHTML = ''; executive.innerHTML = ''; inspector.innerHTML = ''; deltas.innerHTML = ''; limits.innerHTML = ''; transfer.innerHTML = '';
    reviewButton.disabled = true; csvButton.disabled = true; jsonButton.disabled = true;
    if (clearLandmarks) landmarkBox.innerHTML = '';
    status.textContent = message; switchTab('inputs');
  };
  const readFiles = async () => {
    const sourceFile = query('[data-ciiw-source]').files?.[0]; const targetFile = query('[data-ciiw-target]').files?.[0];
    if (!sourceFile || !targetFile) throw new Error('SOURCE and TARGET CII files are required.');
    return { sourceText: await sourceFile.text(), sourceFileName: sourceFile.name, targetText: await targetFile.text(), targetFileName: targetFile.name };
  };
  const run = async (review = undefined) => {
    current = await createCiiWorkspacePreview({ ...baseInput, ...(review ? { review } : {}) });
    if (disposed) return;
    status.textContent = `Correspondence ${current.correspondence.status}; transfer preview ${current.transferPlan.status}.`;
    render(); reviewButton.disabled = false; csvButton.disabled = false; jsonButton.disabled = false; switchTab('compare');
  };
  const inspect = async () => {
    try {
      status.textContent = 'Inspecting model summaries and landmark evidence…'; decisions.clear(); current = null; baseInput = await readFiles();
      const inspection = await inspectCiiWorkspaceModels(baseInput);
      if (disposed) return;
      landmarkBox.innerHTML = landmarkMarkup(inspection);
      status.textContent = 'Suggested landmarks are evidence only. Enter corresponding SOURCE/TARGET anchors to lock engineer authority.';
      reviewButton.disabled = true; csvButton.disabled = true; jsonButton.disabled = true;
    } catch (error) { if (!disposed) { status.textContent = error.message || String(error); landmarkBox.innerHTML = ''; } }
  };
  const analyze = async () => {
    try {
      status.textContent = 'Building correspondence and engineering delta review…'; decisions.clear(); baseInput = await readFiles();
      baseInput.anchorPairs = anchorPairs(query('[data-ciiw-source-anchors]').value, query('[data-ciiw-target-anchors]').value);
      await run();
    } catch (error) { if (!disposed) { current = null; status.textContent = error.message || String(error); results.innerHTML = ''; reviewButton.disabled = true; csvButton.disabled = true; jsonButton.disabled = true; } }
  };
  query('[data-ciiw-close]').addEventListener('click', () => options.close?.()); query('[data-ciiw-inspect]').addEventListener('click', inspect); query('[data-ciiw-analyze]').addEventListener('click', analyze);
  container.querySelectorAll('[data-ciiw-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.ciiwTab)));
  for (const selector of ['[data-ciiw-source]', '[data-ciiw-target]']) query(selector).addEventListener('change', () => invalidate('CII files changed. Inspect the models again before using prior correspondence.', true));
  for (const selector of ['[data-ciiw-source-anchors]', '[data-ciiw-target-anchors]']) query(selector).addEventListener('input', () => invalidate('Locked anchors changed. Rebuild correspondence before review or export.'));
  query('[data-ciiw-confidence-filter]').addEventListener('change', (event) => { filters.confidence = event.target.value || 'ALL'; renderCorrespondence(); });
  query('[data-ciiw-search]').addEventListener('input', (event) => { filters.search = event.target.value || ''; renderCorrespondence(); });
  query('[data-ciiw-changed-only]').addEventListener('change', (event) => { filters.changedOnly = Boolean(event.target.checked); renderCorrespondence(); });
  reviewButton.addEventListener('click', async () => {
    try {
      if (!current?.review) throw new Error('Bound review ledger is unavailable. Rebuild correspondence.');
      status.textContent = 'Refreshing reviewed preview…'; await run(updateCiiReviewDecisions(current.review, reviewFrom(decisions)));
    } catch (error) { status.textContent = error.message || String(error); }
  });
  csvButton.addEventListener('click', () => current && download(container.ownerDocument, 'cii-correspondence.csv', current.artifacts.correspondenceCsv, 'text/csv'));
  jsonButton.addEventListener('click', () => current && download(container.ownerDocument, 'cii-workspace-audit.json', current.artifacts.auditJson, 'application/json'));
  switchTab('inputs');
  return { destroy() { disposed = true; container.innerHTML = ''; }, getCurrentResult() { return current; } };
}

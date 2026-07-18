/** Fixed 3D + queue + authoritative inspector markup for RC-002. */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function titleText(row) { return row.context.revBIdentity || row.context.revAIdentity || row.context.componentType || row.differenceId; }
function humanCertainty(value) { return String(value).replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function humanCategory(value) { return String(value).replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function primaryReason(row) {
  if (row.matchCertainty === 'AMBIGUOUS') return 'Multiple bounded candidates require a decision.';
  if (row.changeReasons.includes('GEOMETRY')) return 'Supported geometry changed.';
  if (row.changeReasons.includes('PROPERTIES')) return 'Engineering properties changed.';
  if (row.differenceCategory === 'ADDED') return 'Present only in Rev B.';
  if (row.differenceCategory === 'REMOVED') return 'Present only in Rev A.';
  return 'No supported engineering change.';
}
function rowSearchText(row) {
  return `${titleText(row)} ${row.context.branchId} ${row.context.componentType} ${row.differenceCategory} ${row.matchCertainty} ${primaryReason(row)}`.toLowerCase();
}
function rowMatchesReason(row, selectedReasons) {
  if (row.differenceCategory !== 'CHANGED' || !row.changeReasons.length) return true;
  return row.changeReasons.some((reason) => selectedReasons.has(reason));
}
export function visibleRevisionDifferenceRows(audit, queue) {
  const categories = new Set(queue.categories); const reasons = new Set(queue.changedReasons);
  const search = String(queue.search ?? '').trim().toLowerCase();
  return audit.differenceRows.filter((row) => {
    if (row.differenceCategory === 'UNCHANGED') return false;
    if (queue.needsDecisionOnly && row.matchCertainty !== 'AMBIGUOUS') return false;
    if (!queue.needsDecisionOnly && !categories.has(row.differenceCategory)) return false;
    if (!rowMatchesReason(row, reasons)) return false;
    return !search || rowSearchText(row).includes(search);
  });
}
function summaryCard(label, value, tone) { return `<div data-tone="${tone}"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`; }
function summaryMarkup(audit) {
  return `<section class="revc-review-summary"><h2>Change summary</h2><div>${summaryCard('Changed', audit.summary.changed, 'changed')}${summaryCard('Added', audit.summary.added, 'added')}${summaryCard('Removed', audit.summary.removed, 'removed')}${summaryCard('Needs decision', audit.summary.needsDecision, 'decision')}</div></section>`;
}
function pressed(value) { return value ? 'aria-pressed="true"' : 'aria-pressed="false"'; }
function categoryControls(compare) {
  const active = new Set(compare.queue.categories);
  return `<div class="revc-filter-row" aria-label="Difference categories">${['CHANGED', 'ADDED', 'REMOVED'].map((item) => `<button type="button" data-revc-category="${item}" ${pressed(active.has(item))}>${humanCategory(item)}</button>`).join('')}<label><input type="checkbox" data-revc-needs-decision ${compare.queue.needsDecisionOnly ? 'checked' : ''}>Needs decision</label></div>`;
}
function reasonControls(compare) {
  const active = new Set(compare.queue.changedReasons);
  const labels = { GEOMETRY: 'Geometry', PROPERTIES: 'Properties', CONNECTIVITY: 'Connectivity', SUPPORT_HIERARCHY: 'Support / hierarchy' };
  return `<div class="revc-filter-row revc-reason-filters">${Object.entries(labels).map(([key, label]) => `<label><input type="checkbox" data-revc-changed-reason="${key}" ${active.has(key) ? 'checked' : ''}>${label}</label>`).join('')}</div>`;
}
function queueRow(row, selected) {
  return `<button type="button" class="revc-queue-row" data-revc-difference-id="${escapeHtml(row.differenceId)}" ${selected ? 'aria-current="true"' : ''}><span><b>${escapeHtml(titleText(row))}</b><small>${escapeHtml(row.context.branchId)} · ${escapeHtml(row.context.componentType)}</small></span><em data-category="${row.differenceCategory.toLowerCase()}">${escapeHtml(humanCategory(row.differenceCategory))}</em><span class="revc-queue-reason">${escapeHtml(primaryReason(row))}</span><small>${escapeHtml(humanCertainty(row.matchCertainty))}</small></button>`;
}
function queueMarkup(state) {
  const audit = state.compare.audit; const rows = visibleRevisionDifferenceRows(audit, state.compare.queue);
  const hidden = audit.differenceRows.filter((row) => row.differenceCategory !== 'UNCHANGED').length - rows.length;
  return `<section class="revc-review-queue"><header><h2>Change queue</h2><span>${rows.length} shown · ${hidden} hidden</span></header><label class="revc-review-search">Search queue<input type="search" data-revc-queue-search value="${escapeHtml(state.compare.queue.search)}" placeholder="Object, branch, type, reason"></label>${categoryControls(state.compare)}${reasonControls(state.compare)}<div class="revc-queue-list">${rows.length ? rows.map((row) => queueRow(row, row.differenceId === state.compare.selectedDifferenceId)).join('') : '<p class="revc-empty">No queue rows match the active filters.</p>'}</div></section>`;
}
function propertyRows(row) {
  if (!row.changedProperties.length) return '<p class="revc-empty">No supported scalar property changes.</p>';
  return `<table class="revc-property-table"><thead><tr><th>Property</th><th>Rev A</th><th>Rev B</th></tr></thead><tbody>${row.changedProperties.map((item) => `<tr><th>${escapeHtml(item.propertyKey)}</th><td>${escapeHtml(item.revAValue)}</td><td>${escapeHtml(item.revBValue)}</td></tr>`).join('')}</tbody></table>`;
}
function candidateEvidence(audit, row) {
  if (!row.candidateEvidenceId) return '<p>No bounded candidate evidence was required.</p>';
  const evidence = audit.candidateEvidence.find((item) => item.candidateEvidenceId === row.candidateEvidenceId);
  if (!evidence) return '<p>Candidate evidence reference is unavailable.</p>';
  return `<dl class="revc-evidence-facts"><div><dt>Candidates</dt><dd>${evidence.candidateCount} / cap ${evidence.candidateLimit}</dd></div><div><dt>Decision basis</dt><dd>${escapeHtml(evidence.scoreGapOrDecisionBasis)}</dd></div><div><dt>Accepted</dt><dd>${escapeHtml(evidence.acceptedCandidateId || 'No')}</dd></div></dl><ol>${evidence.rankedEvidence.map((item) => `<li><b>${escapeHtml(item.targetRecordId)}</b> · score ${escapeHtml(item.score)} · ${escapeHtml(item.reasons.join(', ') || 'no passing evidence')}</li>`).join('')}</ol>`;
}
function inspectorMarkup(state) {
  const audit = state.compare.audit; const row = audit.differenceRows.find((item) => item.differenceId === state.compare.selectedDifferenceId);
  if (!row) return '<section class="revc-inspector"><h2>Selected change</h2><p class="revc-empty">Select a queue row.</p></section>';
  return `<section class="revc-inspector"><header><div><span>${escapeHtml(humanCategory(row.differenceCategory))}</span><h2>${escapeHtml(titleText(row))}</h2></div><strong>${escapeHtml(humanCertainty(row.matchCertainty))}</strong></header><dl class="revc-inspector-facts"><div><dt>Rev A identity</dt><dd>${escapeHtml(row.context.revAIdentity || 'Not applicable')}</dd></div><div><dt>Rev B identity</dt><dd>${escapeHtml(row.context.revBIdentity || 'Not applicable')}</dd></div><div><dt>Branch</dt><dd>${escapeHtml(row.context.branchId)}</dd></div><div><dt>Component type</dt><dd>${escapeHtml(row.context.componentType)}</dd></div></dl><div class="revc-explanation"><b>Engineering explanation</b><p>${escapeHtml(primaryReason(row))}</p></div><section><h3>Changed properties</h3>${propertyRows(row)}</section><section><h3>Geometry</h3><p>${escapeHtml(row.geometryDelta.reason)}</p></section><details class="revc-evidence"><summary>Evidence</summary><p>${escapeHtml(row.evidenceSummary.primary)}</p>${candidateEvidence(audit, row)}</details></section>`;
}
function viewerToolbar(compare) {
  return `<div class="revc-view-toolbar"><div><button type="button" data-revc-presentation="overlay" ${pressed(compare.presentationMode === 'overlay')}>Overlay</button><button type="button" data-revc-presentation="side-by-side" ${pressed(compare.presentationMode === 'side-by-side')}>Side-by-side</button></div><div><button type="button" data-revc-fit-all>Fit all</button><button type="button" data-revc-fit-selected>Fit selected</button><button type="button" data-revc-edit-scope>Change scope</button></div></div>`;
}
export function revisionCompareReviewMarkup(state, viewerEvidence = {}) {
  const audit = state.compare.audit;
  return `<main class="revc-review-workspace"><section class="revc-view-column"><header class="revc-review-context"><div><span>REV A ↔ REV B</span><h2>${escapeHtml(state.slots.baseline.fileName)} ↔ ${escapeHtml(state.slots.candidate.fileName)}</h2><p>${state.basis.scopeSummary.includedBranchCountA} Rev A branches · ${state.basis.scopeSummary.includedBranchCountB} Rev B branches · current basis</p></div></header>${viewerToolbar(state.compare)}${viewerEvidence.failed ? `<div class="revc-viewer-failure"><b>3D viewer unavailable</b><p>${escapeHtml(viewerEvidence.error)}</p><span>The change queue and inspector remain available.</span></div>` : ''}<div class="revc-viewer-host" data-revc-viewer-host aria-label="Revision comparison 3D context"></div></section><aside class="revc-review-side">${summaryMarkup(audit)}${queueMarkup(state)}${inspectorMarkup(state)}</aside></main>`;
}
export const _test = Object.freeze({ primaryReason, rowSearchText });

/** Scope confirmation markup for common and one-sided branches. */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function rowSelected(proposal, group, branchId) {
  if (group === 'revBOnly') return proposal.includedBranchIdsB.includes(branchId);
  return proposal.includedBranchIdsA.includes(branchId);
}

function countText(entry, group) {
  if (group === 'common') return `${entry.componentCountA} / ${entry.componentCountB} components`;
  return `${entry.componentCount} components`;
}

function searchableText(entry) {
  return `${entry.label} ${entry.site} ${entry.owner}`.toLowerCase();
}

function branchRow(entry, group, proposal) {
  const checked = rowSelected(proposal, group, entry.branchId) ? 'checked' : '';
  return `<label class="revc-scope-row" data-revc-scope-row>
    <input type="checkbox" data-revc-branch-id="${escapeHtml(entry.branchId)}" ${checked}>
    <span><b>${escapeHtml(entry.label)}</b><small>${escapeHtml(entry.site || 'No site')} · ${escapeHtml(entry.owner || 'No owner')}</small></span>
    <em>${escapeHtml(countText(entry, group))}</em>
  </label>`;
}

function filteredRows(entries, query) {
  const normalized = String(query ?? '').trim().toLowerCase();
  if (!normalized) return entries;
  return entries.filter((entry) => searchableText(entry).includes(normalized));
}

function groupMarkup(group, title, description, entries, proposal, search) {
  const visible = filteredRows(entries, search);
  const hiddenCount = entries.length - visible.length;
  return `<section class="revc-scope-group" data-revc-scope-group="${group}">
    <header>
      <div><h3>${escapeHtml(title)} <span>${entries.length}</span></h3><p>${escapeHtml(description)}</p></div>
      <div class="revc-group-actions">
        <button type="button" data-revc-group="${group}" data-revc-include="all">Select all</button>
        <button type="button" data-revc-group="${group}" data-revc-include="none">Clear all</button>
      </div>
    </header>
    <label class="revc-search">Filter ${escapeHtml(title)}
      <input type="search" value="${escapeHtml(search)}" data-revc-search="${group}" placeholder="Branch, site, or owner">
    </label>
    ${hiddenCount ? `<p class="revc-filter-note">${hiddenCount} row(s) hidden by this filter; scope is unchanged.</p>` : ''}
    <div class="revc-scope-list">${visible.length ? visible.map((entry) => branchRow(entry, group, proposal)).join('') : '<p class="revc-empty">No branches in this group.</p>'}</div>
  </section>`;
}

export function revisionScopeMarkup(state, preflight) {
  const proposal = state.proposal;
  if (!proposal) return '';
  const summary = proposal.summary;
  const disabled = preflight.status !== 'READY' ? 'disabled' : '';
  return `<section class="revc-scope-stage" aria-labelledby="revc-scope-title">
    <header class="revc-stage-head">
      <div><span>STAGE 2</span><h2 id="revc-scope-title">Confirm branch scope</h2><p>Common and one-sided branches are selected by default. Exclusions are deliberate and recorded.</p></div>
      <strong data-status="${escapeHtml(state.basisStatus.toLowerCase())}">${escapeHtml(state.basisStatus)}</strong>
    </header>
    <div class="revc-scope-summary">
      <div><b>${summary.commonBranchCount}</b><span>Common</span></div>
      <div><b>${summary.revAOnlyBranchCount}</b><span>Rev A only</span></div>
      <div><b>${summary.revBOnlyBranchCount}</b><span>Rev B only</span></div>
      <div><b>${summary.includedBranchCountA} / ${summary.includedBranchCountB}</b><span>Included A / B</span></div>
      <div><b>${summary.retainedComponentCountA} / ${summary.retainedComponentCountB}</b><span>Components A / B</span></div>
    </div>
    <div class="revc-scope-groups">
      ${groupMarkup('common', 'Common branches', 'Exact branch identity exists in both revisions.', proposal.commonBranches, proposal, state.search.common)}
      ${groupMarkup('revAOnly', 'Rev A only', 'Included as future removal candidates.', proposal.revAOnlyBranches, proposal, state.search.revAOnly)}
      ${groupMarkup('revBOnly', 'Rev B only', 'Included as future addition candidates.', proposal.revBOnlyBranches, proposal, state.search.revBOnly)}
    </div>
    <div class="revc-scope-footer">
      <div><b>Active basis</b><span>${summary.includedBranchCountA} Rev A branches · ${summary.includedBranchCountB} Rev B branches · ${summary.excludedBranchCount} excluded</span></div>
      <div class="revc-actions">
        <button type="button" data-revc-download-scope>Download scope/basis manifest</button>
        <button type="button" class="revc-primary" data-revc-approve-basis ${disabled}>Approve comparison basis</button>
      </div>
    </div>
  </section>`;
}

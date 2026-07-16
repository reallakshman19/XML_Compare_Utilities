export function renderSupportSteelSummary(bundle) {
  const summary = bundle?.summary || {};
  return [
    summaryCard('Support families', summary.supportFamilyCount ?? 0),
    summaryCard('Steel groups', summary.steelGroupCount ?? 0),
    summaryCard('Resolved', summary.resolvedFamilyCount ?? 0),
    summaryCard('Ambiguous', summary.ambiguousFamilyCount ?? 0),
    summaryCard('Unresolved', summary.unresolvedFamilyCount ?? 0),
  ].join('');
}

export function renderSupportSteelRelationshipTable(bundle, query = '') {
  const needle = String(query || '').trim().toUpperCase();
  const rows = (bundle?.relationships || []).filter((row) => {
    const text = [
      row.supportFamilyId,
      row.steelGroupId,
      row.relationshipStatus,
      ...(row.relationshipBasis || []),
      ...(row.branchIds || []),
    ].join(' ').toUpperCase();
    return !needle || text.includes(needle);
  });
  if (!rows.length) return emptyState('No relationships match the current filter.');
  return `<div class="ssrb-table-wrap" role="region" tabindex="0" aria-label="Support and steel relationships"><table class="ssrb-table"><thead><tr><th>Support family</th><th>Steel group</th><th>Status</th><th>Evidence</th><th>Distance mm</th><th>Branches</th></tr></thead><tbody>${rows.map(relationshipRow).join('')}</tbody></table></div>`;
}

export function renderSupportSteelTree(bundle) {
  const families = bundle?.supportFamilies || [];
  if (!families.length) return emptyState('Build relationships to populate the support-centred hierarchy.');
  return `<div class="ssrb-tree">${families.map(familyTree).join('')}</div>`;
}

export function renderSupportSteelEvidence(bundle, relationshipId) {
  const relationship = (bundle?.relationships || []).find((row) => row.relationshipId === relationshipId)
    || bundle?.relationships?.[0];
  if (!relationship) return emptyState('Select a relationship after running the builder.');
  const family = bundle.supportFamilies.find((row) => row.familyId === relationship.supportFamilyId);
  const steel = bundle.steelGroups.find((row) => row.steelGroupId === relationship.steelGroupId);
  return `<div class="ssrb-evidence-grid">${evidenceCard('Relationship', relationshipDetails(relationship))}${evidenceCard('Support family evidence', supportEvidence(family))}${evidenceCard('Steel group evidence', steelEvidence(steel))}</div>`;
}

export function renderSupportSteelDiagnostics(bundle) {
  const rows = bundle?.diagnostics || [];
  if (!rows.length) return emptyState('No relationship diagnostics.');
  return `<div class="ssrb-diagnostics">${rows.map((row) => `<article class="ssrb-diagnostic ssrb-${h(row.severity || 'info').toLowerCase()}"><b>${h(row.code)}</b><span>${h(row.supportFamilyId || '')}</span><p>${h(row.message)}</p></article>`).join('')}</div>`;
}

function relationshipRow(row) {
  const steel = row.steelGroupId || row.nearestSteelGroupId || 'UNRESOLVED';
  return `<tr data-ssrb-relationship-row="${h(row.relationshipId)}"><td><button type="button" class="ssrb-link" data-ssrb-select="${h(row.relationshipId)}">${h(row.supportFamilyId)}</button></td><td>${h(steel)}</td><td>${statusBadge(row.relationshipStatus)}</td><td>${h((row.relationshipBasis || []).join(' + ') || '—')}</td><td>${row.distanceMm ?? '—'}</td><td>${h((row.branchIds || []).join(', ') || '—')}</td></tr>`;
}

function familyTree(family) {
  const members = (family.members || []).map((member) => `<li><span class="ssrb-role">${h(member.semanticRole || 'OTHER')}</span><code>${h(member.memberId || '(unresolved)')}</code></li>`).join('');
  const relationships = (family.steelRelationships || []).map((row) => `<li><button type="button" data-ssrb-select="${h(row.relationshipId)}">${h(row.steelGroupId || 'UNRESOLVED')}</button>${statusBadge(row.relationshipStatus)}</li>`).join('');
  return `<details class="ssrb-tree-family" open><summary><b>${h(family.familyId)}</b><span>${family.members?.length || 0} members · ${family.branchIds?.length || 0} branches</span></summary><div class="ssrb-tree-columns"><section><h5>Pipe branches</h5><ul>${listItems(family.branchIds)}</ul><h5>Family members</h5><ul>${members || '<li>None</li>'}</ul></section><section><h5>Steel relationships</h5><ul>${relationships || '<li>None</li>'}</ul></section></div></details>`;
}

function relationshipDetails(row) {
  return `<dl><dt>Support family</dt><dd>${h(row.supportFamilyId)}</dd><dt>Steel group</dt><dd>${h(row.steelGroupId || 'UNRESOLVED')}</dd><dt>Status</dt><dd>${statusBadge(row.relationshipStatus)}</dd><dt>Basis</dt><dd>${h((row.relationshipBasis || []).join(', ') || 'None')}</dd><dt>Distance</dt><dd>${row.distanceMm ?? '—'} mm</dd><dt>Confidence</dt><dd>${h(row.confidence)}</dd></dl>`;
}

function supportEvidence(family) {
  if (!family) return '<p>No support family evidence available.</p>';
  return `<dl><dt>Family</dt><dd>${h(family.familyId)}</dd><dt>Branches</dt><dd>${h((family.branchIds || []).join(', ') || 'None')}</dd><dt>Carriers</dt><dd>${h((family.carrierIds || []).join(', ') || 'None')}</dd><dt>Members</dt><dd>${family.members?.length || 0}</dd><dt>Explicit references</dt><dd>${h((family.explicitReferences || []).join(', ') || 'None')}</dd></dl><ul class="ssrb-evidence-list">${(family.members || []).map((member) => `<li><code>${h(member.memberId || '(unresolved)')}</code><span>${h(member.semanticRole || 'OTHER')}</span></li>`).join('')}</ul>`;
}

function steelEvidence(steel) {
  if (!steel) return '<p>No resolved steel group evidence available.</p>';
  return `<dl><dt>Steel group</dt><dd>${h(steel.steelGroupId)}</dd><dt>Source records</dt><dd>${steel.records?.length || 0}</dd><dt>Owners</dt><dd>${h((steel.owners || []).join(', ') || 'None')}</dd><dt>Related supports</dt><dd>${h((steel.supportFamilyIds || []).join(', ') || 'None')}</dd></dl><ul class="ssrb-evidence-list">${(steel.records || []).map((record) => `<li><code>${h(record.recordId || '(unresolved)')}</code><span>${h(record.sourceRecordType || 'UNKNOWN')}</span></li>`).join('')}</ul>`;
}

function evidenceCard(title, body) {
  return `<section class="ssrb-evidence-card"><h4>${h(title)}</h4>${body}</section>`;
}

function summaryCard(label, value) {
  return `<div class="ssrb-summary-card"><span>${h(label)}</span><strong>${h(value)}</strong></div>`;
}

function statusBadge(status) {
  const key = String(status || 'UNRESOLVED').toLowerCase().replace(/_/g, '-');
  return `<span class="ssrb-status ssrb-status-${h(key)}">${h(status || 'UNRESOLVED')}</span>`;
}

function listItems(values = []) {
  return values.length ? values.map((value) => `<li><code>${h(value)}</code></li>`).join('') : '<li>None</li>';
}

function emptyState(message) {
  return `<div class="ssrb-empty">${h(message)}</div>`;
}

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

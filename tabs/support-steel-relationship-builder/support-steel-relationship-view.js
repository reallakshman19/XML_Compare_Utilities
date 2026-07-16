export function renderSupportSteelSummary(bundle) {
  const summary = bundle?.summary || {};
  return [
    summaryCard('Support families', summary.supportFamilyCount ?? 0),
    summaryCard('Steel groups', summary.steelGroupCount ?? 0),
    summaryCard('Analytical steel', summary.analyticalSteelGroupCount ?? 0),
    summaryCard('Physical members', summary.analyticalSupportMemberCount ?? 0),
    summaryCard('Chain edges', summary.supportChainEdgeCount ?? 0),
    summaryCard('Terminal edges', summary.structuralTerminalEdgeCount ?? 0),
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
      row.structuralMemberId,
      row.relationshipStatus,
      row.relationshipCardinality,
      row.evidenceClass,
      row.geometryMethod,
      row.geometryQuality,
      ...(row.relationshipBasis || []),
      ...(row.branchIds || []),
    ].join(' ').toUpperCase();
    return !needle || text.includes(needle);
  });
  if (!rows.length) return emptyState('No relationships match the current filter.');
  return `<div class="ssrb-table-wrap" role="region" tabindex="0" aria-label="Support and steel relationships"><table class="ssrb-table"><thead><tr><th>Support family</th><th>Steel group</th><th>Structural member</th><th>Status</th><th>Cardinality</th><th>Geometry method</th><th>Quality</th><th>Distance mm</th><th>Relationship basis</th><th>Branches</th></tr></thead><tbody>${rows.map(relationshipRow).join('')}</tbody></table></div>`;
}

export function renderSupportSteelTree(bundle) {
  const families = bundle?.supportFamilies || [];
  if (!families.length) return emptyState('Build relationships to populate the support-centred hierarchy.');
  return `<div class="ssrb-tree">${families.map(familyTree).join('')}</div>`;
}

export function renderSupportMemberChain(bundle) {
  const chain = bundle?.supportMemberChain;
  if (!chain?.familyChains?.length) return emptyState('Build relationships to populate support member chains.');
  return `<div class="ssrb-chain-summary">${summaryCard('Physical contacts', chain.summary.supportChainEdgeCount ?? 0)}${summaryCard('Nearby clearances', chain.summary.nearbyCandidateEdgeCount ?? 0)}${summaryCard('Reference edges', chain.summary.referenceEdgeCount ?? 0)}${summaryCard('Structural terminals', chain.summary.structuralTerminalEdgeCount ?? 0)}${summaryCard('Unresolved physical', chain.summary.unresolvedPhysicalMemberCount ?? 0)}</div><div class="ssrb-chain-families">${chain.familyChains.map(chainFamily).join('')}</div>`;
}

export function renderSupportSteelEvidence(bundle, relationshipId) {
  const relationship = (bundle?.relationships || []).find((row) => row.relationshipId === relationshipId)
    || bundle?.relationships?.[0];
  if (!relationship) return emptyState('Select a relationship after running the builder.');
  const family = bundle.supportFamilies.find((row) => row.familyId === relationship.supportFamilyId);
  const steel = bundle.steelGroups.find((row) => row.steelGroupId === relationship.steelGroupId);
  return `<div class="ssrb-evidence-grid">${evidenceCard('Inferred relationship', relationshipDetails(relationship))}${evidenceCard('Support family evidence', supportEvidence(family))}${evidenceCard('Structural analytical evidence', steelEvidence(steel, relationship))}</div>`;
}

export function renderSupportSteelDiagnostics(bundle) {
  const rows = bundle?.diagnostics || [];
  if (!rows.length) return emptyState('No relationship diagnostics.');
  return `<div class="ssrb-diagnostics">${rows.map((row) => `<article class="ssrb-diagnostic ssrb-${h(row.severity || 'info').toLowerCase()}"><b>${h(row.code)}</b><span>${h(row.supportFamilyId || '')}</span><p>${h(row.message)}</p></article>`).join('')}</div>`;
}

function relationshipRow(row) {
  const steel = row.steelGroupId || row.nearestSteelGroupId || 'UNRESOLVED';
  return `<tr data-ssrb-relationship-row="${h(row.relationshipId)}"><td><button type="button" class="ssrb-link" data-ssrb-select="${h(row.relationshipId)}">${h(row.supportFamilyId)}</button></td><td>${h(steel)}</td><td>${h(row.structuralMemberId || '—')}</td><td>${statusBadge(row.relationshipStatus)}</td><td>${h(row.relationshipCardinality || '—')}</td><td>${h(row.geometryMethod || 'UNAVAILABLE')}</td><td>${h(row.geometryQuality || 'NONE')}</td><td>${row.distanceMm ?? '—'}</td><td>${h((row.relationshipBasis || []).join(' + ') || '—')}</td><td>${h((row.branchIds || []).join(', ') || '—')}</td></tr>`;
}

function familyTree(family) {
  const members = (family.members || []).map((member) => `<li><span class="ssrb-role">${h(member.semanticRole || 'OTHER')}</span><code>${h(member.memberId || '(unresolved)')}</code><small>${member.analyticalGeometry?.physicalGeometryAvailable ? h((member.analyticalGeometry.geometryMethods || []).join(' + ')) : 'symbolic / no geometry'}</small></li>`).join('');
  const relationships = (family.steelRelationships || []).map((row) => `<li><button type="button" data-ssrb-select="${h(row.relationshipId)}">${h(row.steelGroupId || 'UNRESOLVED')}</button>${statusBadge(row.relationshipStatus)}<small>${h(row.geometryMethod || 'UNAVAILABLE')}</small></li>`).join('');
  return `<details class="ssrb-tree-family" open><summary><b>${h(family.familyId)}</b><span>${family.members?.length || 0} members · ${family.analyticalMemberCount || 0} physical · ${family.branchIds?.length || 0} branches</span></summary><div class="ssrb-tree-columns"><section><h5>Pipe branches</h5><ul>${listItems(family.branchIds)}</ul><h5>Family members</h5><ul>${members || '<li>None</li>'}</ul></section><section><h5>Inferred steel relationships</h5><ul>${relationships || '<li>None</li>'}</ul></section></div></details>`;
}

function chainFamily(family) {
  const contactRows = family.supportChainEdges || [];
  const nearbyRows = family.nearbyCandidateEdges || [];
  const referenceRows = family.referenceEdges || [];
  const terminalRows = family.structuralTerminalEdges || [];
  return `<details class="ssrb-chain-family" open><summary><b>${h(family.familyId)}</b><span>${contactRows.length} contacts · ${nearbyRows.length} nearby · ${terminalRows.length} terminals</span></summary><div class="ssrb-chain-sections">${chainSection('Physical member contacts', contactRows, contactEdgeRow)}${chainSection('Nearby clearance candidates', nearbyRows, contactEdgeRow)}${chainSection('Symbolic member references', referenceRows, referenceEdgeRow)}${chainSection('Structural terminal edges', terminalRows, terminalEdgeRow)}${unresolvedChainMembers(family)}</div></details>`;
}

function chainSection(title, rows, renderer) {
  return `<section><h4>${h(title)}</h4>${rows.length ? `<div class="ssrb-table-wrap"><table class="ssrb-table ssrb-chain-table"><thead>${chainHeader(title)}</thead><tbody>${rows.map(renderer).join('')}</tbody></table></div>` : '<p class="ssrb-chain-empty">None</p>'}</section>`;
}

function chainHeader(title) {
  if (title.includes('Structural')) return '<tr><th>Support member</th><th>Steel target</th><th>Status</th><th>Evidence</th><th>Distance mm</th></tr>';
  if (title.includes('reference')) return '<tr><th>From member</th><th>To member</th><th>Status</th><th>Evidence</th></tr>';
  return '<tr><th>Member A</th><th>Member B</th><th>Status</th><th>Geometry</th><th>Quality</th><th>Distance mm</th><th>Contact evidence</th></tr>';
}

function contactEdgeRow(row) {
  return `<tr><td><code>${h(row.supportA)}</code><small>${h(row.roleA || '')}</small></td><td><code>${h(row.supportB)}</code><small>${h(row.roleB || '')}</small></td><td>${statusBadge(row.relationshipStatus)}</td><td>${h(row.geometryMethod || 'UNAVAILABLE')}</td><td>${h(row.geometryQuality || 'NONE')}</td><td>${row.distanceMm ?? '—'}</td><td>${h(row.contactEvidenceStatus || 'NOT_PROVEN')}</td></tr>`;
}

function referenceEdgeRow(row) {
  return `<tr><td><code>${h(row.fromMemberId)}</code></td><td><code>${h(row.toMemberId)}</code></td><td>${statusBadge(row.relationshipStatus)}</td><td>${h((row.relationshipBasis || []).join(' + '))}</td></tr>`;
}

function terminalEdgeRow(row) {
  const target = row.structuralMemberId || row.steelGroupId || 'UNRESOLVED';
  return `<tr><td><code>${h(row.supportMemberId)}</code><small>${h(row.supportMemberRole || '')}</small></td><td><code>${h(target)}</code></td><td>${statusBadge(row.relationshipStatus)}</td><td>${h((row.relationshipBasis || []).join(' + '))}</td><td>${row.distanceMm ?? '—'}</td></tr>`;
}

function unresolvedChainMembers(family) {
  const ids = family.unresolvedPhysicalMemberIds || [];
  return `<section><h4>Unresolved physical members</h4>${ids.length ? `<ul class="ssrb-evidence-list">${ids.map((id) => `<li><code>${h(id)}</code><span>No analytical contact edge</span></li>`).join('')}</ul>` : '<p class="ssrb-chain-empty">None</p>'}</section>`;
}

function relationshipDetails(row) {
  return `<dl><dt>Evidence ID</dt><dd>${h(row.evidenceId || '')}</dd><dt>Evidence source</dt><dd>${h(row.evidenceSource || '')}</dd><dt>Evidence class</dt><dd>${h(row.evidenceClass || '')}</dd><dt>Contact proof</dt><dd>${h(row.contactEvidenceStatus || 'NOT_PROVEN')}</dd><dt>Support family</dt><dd>${h(row.supportFamilyId)}</dd><dt>Steel group</dt><dd>${h(row.steelGroupId || row.nearestSteelGroupId || 'UNRESOLVED')}</dd><dt>Structural member</dt><dd>${h(row.structuralMemberId || 'None')}</dd><dt>Status</dt><dd>${statusBadge(row.relationshipStatus)}</dd><dt>Cardinality</dt><dd>${h(row.relationshipCardinality || '')}</dd><dt>Basis</dt><dd>${h((row.relationshipBasis || []).join(', ') || 'None')}</dd><dt>Geometry method</dt><dd>${h(row.geometryMethod || 'UNAVAILABLE')}</dd><dt>Geometry quality</dt><dd>${h(row.geometryQuality || 'NONE')}</dd><dt>Analytical geometry</dt><dd>${row.analyticalGeometryAvailable ? 'Available' : 'Unavailable'}</dd><dt>Distance</dt><dd>${row.distanceMm ?? '—'} mm</dd><dt>Within tolerance</dt><dd>${row.withinProjectionTolerance ? 'Yes' : 'No'}</dd><dt>Confidence</dt><dd>${h(row.confidence)}</dd></dl>`;
}

function supportEvidence(family) {
  if (!family) return '<p>No support family evidence available.</p>';
  return `<dl><dt>Family</dt><dd>${h(family.familyId)}</dd><dt>Branches</dt><dd>${h((family.branchIds || []).join(', ') || 'None')}</dd><dt>Carriers</dt><dd>${h((family.carrierIds || []).join(', ') || 'None')}</dd><dt>Members</dt><dd>${family.members?.length || 0}</dd><dt>Physical geometry members</dt><dd>${family.analyticalMemberCount || 0}</dd><dt>Explicit steel references</dt><dd>${h((family.explicitReferences || []).join(', ') || 'None')}</dd></dl><ul class="ssrb-evidence-list">${(family.members || []).map((member) => `<li><code>${h(member.memberId || '(unresolved)')}</code><span>${h(member.semanticRole || 'OTHER')} · ${member.analyticalGeometry?.physicalGeometryAvailable ? 'analytical geometry' : 'symbolic/no geometry'}</span></li>`).join('')}</ul>`;
}

function steelEvidence(steel, relationship) {
  if (!steel) return `<p>No resolved steel group. Nearest geometry method: ${h(relationship?.geometryMethod || 'UNAVAILABLE')}.</p>`;
  const summary = steel.analyticalGeometry || {};
  return `<dl><dt>Steel group</dt><dd>${h(steel.steelGroupId)}</dd><dt>Source records</dt><dd>${steel.records?.length || 0}</dd><dt>Analytical members</dt><dd>${summary.analyticalMemberCount || 0}</dd><dt>Representative-only members</dt><dd>${summary.representativeOnlyMemberCount || 0}</dd><dt>Geometry methods</dt><dd>${h((summary.methods || []).join(', ') || 'None')}</dd><dt>Selected structural member</dt><dd>${h(relationship?.structuralMemberId || 'None')}</dd><dt>Owners</dt><dd>${h((steel.owners || []).join(', ') || 'None')}</dd><dt>Related supports</dt><dd>${h((steel.supportFamilyIds || []).join(', ') || 'None')}</dd></dl><ul class="ssrb-evidence-list">${(steel.records || []).map((record) => `<li><code>${h(record.recordId || '(unresolved)')}</code><span>${h((record.analyticalGeometry?.geometryMethods || []).join(' + ') || record.sourceRecordType || 'UNKNOWN')}</span></li>`).join('')}</ul>`;
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

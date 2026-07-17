export function renderSupportSteelSummary(bundle) {
  const summary = bundle?.summary || {};
  const chain = bundle?.supportMemberChain?.summary || {};
  return [
    summaryCard('Support families', summary.supportFamilyCount ?? 0),
    summaryCard('Steel groups', summary.steelGroupCount ?? 0),
    summaryCard('Carrier objects', summary.carrierObjectCount ?? 0),
    summaryCard('Resolved carriers', summary.resolvedPhysicalCarrierCount ?? 0),
    summaryCard('Analytical steel', summary.analyticalSteelGroupCount ?? 0),
    summaryCard('Resolved', summary.resolvedFamilyCount ?? 0),
    summaryCard('Member contacts', chain.resolvedContactEdgeCount ?? 0),
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

export function renderSupportSteelEvidence(bundle, relationshipId) {
  const relationship = (bundle?.relationships || []).find((row) => row.relationshipId === relationshipId)
    || bundle?.relationships?.[0];
  if (!relationship) return emptyState('Select a relationship after running the builder.');
  const family = bundle.supportFamilies.find((row) => row.familyId === relationship.supportFamilyId);
  const steel = bundle.steelGroups.find((row) => row.steelGroupId === relationship.steelGroupId);
  return `<div class="ssrb-evidence-grid">${evidenceCard('Inferred relationship', relationshipDetails(relationship))}${evidenceCard('Support family and line context', supportEvidence(family))}${evidenceCard('Authoritative carrier-object evidence', carrierEvidence(family))}${evidenceCard('Structural analytical evidence', steelEvidence(steel, relationship))}</div>`;
}

export function renderSupportSteelMemberChain(bundle) {
  const chain = bundle?.supportMemberChain;
  if (!chain) return emptyState('Build relationships to populate support-member chain evidence.');
  const physical = chain.supportChainEdges || [];
  const nearby = chain.nearbyCandidateEdges || [];
  const references = chain.referenceEdges || [];
  const terminals = chain.structuralTerminalEdges || [];
  return `<div class="ssrb-chain-grid">${chainSection('Physical member contacts', physical, physicalEdgeTable)}${chainSection('Nearby clearance candidates', nearby, physicalEdgeTable)}${chainSection('Symbolic member references', references, referenceEdgeTable)}${chainSection('Structural terminals', terminals, terminalEdgeTable)}</div>${chainDiagnostics(chain)}`;
}

export const renderSupportMemberChain = renderSupportSteelMemberChain;

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
  const members = (family.members || []).map((member) => {
    const carrier = member.carrierResolution || {};
    const target = carrier.carrierObjectId || carrier.branchContextId || 'UNRESOLVED';
    return `<li><span class="ssrb-role">${h(member.semanticRole || 'OTHER')}</span><code>${h(member.memberId || '(unresolved)')}</code><small>${h(carrier.resolutionStatus || 'NO_CARRIER_EVIDENCE')} → ${h(target)}</small></li>`;
  }).join('');
  const relationships = (family.steelRelationships || []).map((row) => `<li><button type="button" data-ssrb-select="${h(row.relationshipId)}">${h(row.steelGroupId || 'UNRESOLVED')}</button>${statusBadge(row.relationshipStatus)}<small>${h(row.geometryMethod || 'UNAVAILABLE')}</small></li>`).join('');
  const context = family.lineContext || {};
  const contextItems = [
    `<li><b>Primary line</b> <code>${h(context.lineFamily || family.lineFamily || 'None')}</code></li>`,
    `<li><b>Full line tags</b> ${h((context.fullLineTags || family.fullLineTags || []).join(', ') || 'None')}</li>`,
    `<li><b>Context quality</b> ${h(context.contextQuality || 'NONE')}</li>`,
    `<li><b>OWNER fallback</b> ${context.ownerFallbackUsed ? 'Yes' : 'No'}</li>`,
    `<li><b>Physical carrier resolutions</b> ${family.resolvedPhysicalCarrierCount || 0}</li>`,
    `<li><b>Branch-context-only members</b> ${family.branchContextOnlyMemberCount || 0}</li>`,
  ].join('');
  const lineCount = (context.fullLineTags || family.fullLineTags || []).length;
  return `<details class="ssrb-tree-family" open><summary><b>${h(family.familyId)}</b><span>${family.members?.length || 0} members · ${family.branchIds?.length || 0} branches · ${lineCount} lines</span></summary><div class="ssrb-tree-columns"><section><h5>Normalized line and carrier context</h5><ul>${contextItems}</ul><h5>Pipe branches</h5><ul>${listItems(family.branchIds)}</ul><h5>Family members</h5><ul>${members || '<li>None</li>'}</ul></section><section><h5>Inferred steel relationships</h5><ul>${relationships || '<li>None</li>'}</ul></section></div></details>`;
}

function relationshipDetails(row) {
  return `<dl><dt>Evidence ID</dt><dd>${h(row.evidenceId || '')}</dd><dt>Evidence source</dt><dd>${h(row.evidenceSource || '')}</dd><dt>Evidence class</dt><dd>${h(row.evidenceClass || '')}</dd><dt>Contact proof</dt><dd>${h(row.contactEvidenceStatus || 'NOT_PROVEN')}</dd><dt>Support family</dt><dd>${h(row.supportFamilyId)}</dd><dt>Steel group</dt><dd>${h(row.steelGroupId || row.nearestSteelGroupId || 'UNRESOLVED')}</dd><dt>Structural member</dt><dd>${h(row.structuralMemberId || 'None')}</dd><dt>Status</dt><dd>${statusBadge(row.relationshipStatus)}</dd><dt>Cardinality</dt><dd>${h(row.relationshipCardinality || '')}</dd><dt>Basis</dt><dd>${h((row.relationshipBasis || []).join(', ') || 'None')}</dd><dt>Geometry method</dt><dd>${h(row.geometryMethod || 'UNAVAILABLE')}</dd><dt>Geometry quality</dt><dd>${h(row.geometryQuality || 'NONE')}</dd><dt>Analytical geometry</dt><dd>${row.analyticalGeometryAvailable ? 'Available' : 'Unavailable'}</dd><dt>Distance</dt><dd>${row.distanceMm ?? '—'} mm</dd><dt>Within tolerance</dt><dd>${row.withinProjectionTolerance ? 'Yes' : 'No'}</dd><dt>Confidence</dt><dd>${h(row.confidence)}</dd></dl>`;
}

function supportEvidence(family) {
  if (!family) return '<p>No support family evidence available.</p>';
  const context = family.lineContext || {};
  return `<dl><dt>Family</dt><dd>${h(family.familyId)}</dd><dt>Primary branch</dt><dd>${h(context.branchNode || family.branchId || 'None')}</dd><dt>All branches</dt><dd>${h((context.branchNodes || family.branchIds || []).join(', ') || 'None')}</dd><dt>Primary full line tag</dt><dd>${h(context.fullLineTag || family.fullLineTag || 'None')}</dd><dt>All full line tags</dt><dd>${h((context.fullLineTags || family.fullLineTags || []).join(', ') || 'None')}</dd><dt>Primary line family</dt><dd>${h(context.lineFamily || family.lineFamily || 'None')}</dd><dt>Pipe owner</dt><dd>${h(context.pipeOwner || family.pipeOwner || 'None')}</dd><dt>Carrier object IDs</dt><dd>${h((family.carrierObjectIds || []).join(', ') || 'None')}</dd><dt>Context quality</dt><dd>${h(context.contextQuality || 'NONE')}</dd><dt>Context evidence</dt><dd>${h((context.contextEvidence || []).join(', ') || 'None')}</dd><dt>OWNER fallback used</dt><dd>${context.ownerFallbackUsed ? 'Yes' : 'No'}</dd><dt>Context cardinality</dt><dd>${h((context.contextConflicts || []).join(', ') || 'Single context')}</dd><dt>Members</dt><dd>${family.members?.length || 0}</dd><dt>Explicit steel references</dt><dd>${h((family.explicitReferences || []).join(', ') || 'None')}</dd></dl>`;
}

function carrierEvidence(family) {
  if (!family) return '<p>No carrier evidence available.</p>';
  const rows = (family.members || []).map((member) => member.carrierResolution).filter(Boolean);
  if (!rows.length) return '<p>No carrier resolution rows.</p>';
  return `<dl><dt>Resolved physical carrier members</dt><dd>${family.resolvedPhysicalCarrierCount || 0}</dd><dt>Branch-context-only members</dt><dd>${family.branchContextOnlyMemberCount || 0}</dd><dt>Unresolved carrier members</dt><dd>${family.unresolvedCarrierMemberCount || 0}</dd><dt>Carrier contact proof</dt><dd>NOT_PROVEN</dd></dl><ul class="ssrb-evidence-list">${rows.map((row) => `<li><code>${h(row.supportMemberId || '(unresolved)')}</code><span>${h(row.resolutionStatus)} · ${h(row.carrierObjectId || row.branchContextId || 'UNRESOLVED')} · ${h(row.confidence)}</span></li>`).join('')}</ul>`;
}

function steelEvidence(steel, relationship) {
  if (!steel) return `<p>No resolved steel group. Nearest geometry method: ${h(relationship?.geometryMethod || 'UNAVAILABLE')}.</p>`;
  const summary = steel.analyticalGeometry || {};
  return `<dl><dt>Steel group</dt><dd>${h(steel.steelGroupId)}</dd><dt>Source records</dt><dd>${steel.records?.length || 0}</dd><dt>Analytical members</dt><dd>${summary.analyticalMemberCount || 0}</dd><dt>Representative-only members</dt><dd>${summary.representativeOnlyMemberCount || 0}</dd><dt>Geometry methods</dt><dd>${h((summary.methods || []).join(', ') || 'None')}</dd><dt>Selected structural member</dt><dd>${h(relationship?.structuralMemberId || 'None')}</dd><dt>Owners</dt><dd>${h((steel.owners || []).join(', ') || 'None')}</dd><dt>Related supports</dt><dd>${h((steel.supportFamilyIds || []).join(', ') || 'None')}</dd></dl>`;
}

function chainSection(title, rows, renderer) {
  return `<section class="ssrb-chain-section"><h4>${h(title)} <span>${rows.length}</span></h4>${rows.length ? renderer(rows) : emptyState(`No ${title.toLowerCase()}.`)}</section>`;
}

function physicalEdgeTable(rows) {
  return `<div class="ssrb-table-wrap"><table class="ssrb-table"><thead><tr><th>Family</th><th>Member A</th><th>Member B</th><th>Roles</th><th>Status</th><th>Method</th><th>Distance mm</th><th>Confidence</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.supportFamilyId)}</td><td>${h(row.supportA)}</td><td>${h(row.supportB)}</td><td>${h(row.roleA)} ↔ ${h(row.roleB)}</td><td>${statusBadge(row.relationshipStatus)}</td><td>${h(row.geometryMethod)}</td><td>${row.distanceMm ?? '—'}</td><td>${h(row.confidence)}</td></tr>`).join('')}</tbody></table></div>`;
}

function referenceEdgeTable(rows) {
  return `<div class="ssrb-table-wrap"><table class="ssrb-table"><thead><tr><th>Family</th><th>From member</th><th>To member</th><th>Basis</th><th>Contact proof</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.supportFamilyId)}</td><td>${h(row.fromMemberId)}</td><td>${h(row.toMemberId)}</td><td>${h((row.relationshipBasis || []).join(', '))}</td><td>${h(row.contactEvidenceStatus)}</td></tr>`).join('')}</tbody></table></div>`;
}

function terminalEdgeTable(rows) {
  return `<div class="ssrb-table-wrap"><table class="ssrb-table"><thead><tr><th>Family</th><th>Support member</th><th>Role</th><th>Steel group</th><th>Structural member</th><th>Edge type</th><th>Status</th><th>Distance mm</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.supportFamilyId)}</td><td>${h(row.supportMemberId)}</td><td>${h(row.supportMemberRole || 'SYMBOLIC')}</td><td>${h(row.steelGroupId)}</td><td>${h(row.structuralMemberId || '—')}</td><td>${h(row.edgeType)}</td><td>${h(row.contactEvidenceStatus || row.relationshipStatus)}</td><td>${row.distanceMm ?? '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function chainDiagnostics(chain) {
  const unresolved = chain.unresolvedPhysicalMembers || [];
  const diagnostics = chain.diagnostics || [];
  if (!unresolved.length && !diagnostics.length) return '';
  return `<div class="ssrb-chain-diagnostics"><h4>Member-chain diagnostics</h4>${unresolved.map((row) => `<p><b>${h(row.supportFamilyId)}</b> unresolved physical member <code>${h(row.memberId)}</code></p>`).join('')}${diagnostics.map((row) => `<p><b>${h(row.code)}</b> ${h(row.message)}</p>`).join('')}</div>`;
}

function evidenceCard(title, body) { return `<section class="ssrb-evidence-card"><h4>${h(title)}</h4>${body}</section>`; }
function summaryCard(label, value) { return `<div class="ssrb-summary-card"><span>${h(label)}</span><strong>${h(value)}</strong></div>`; }
function statusBadge(status) { const key = String(status || 'UNRESOLVED').toLowerCase().replace(/_/g, '-'); return `<span class="ssrb-status ssrb-status-${h(key)}">${h(status || 'UNRESOLVED')}</span>`; }
function listItems(values = []) { return values.length ? values.map((value) => `<li><code>${h(value)}</code></li>`).join('') : '<li>None</li>'; }
function emptyState(message) { return `<div class="ssrb-empty">${h(message)}</div>`; }
function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

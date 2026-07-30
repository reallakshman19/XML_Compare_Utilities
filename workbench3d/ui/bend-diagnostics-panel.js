/** Read-only InputXML bend-geometry diagnostics for the Workbench compare UI. */

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function count(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function displayName(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function groupDiagnostics(rows) {
  const groups = new Map();
  for (const row of rows) {
    const code = String(row?.code || 'BEND_GEOMETRY_BLOCKED');
    const current = groups.get(code) ?? { code, count: 0, objectIds: [], messages: [] };
    current.count += 1;
    if (row?.objectId && !current.objectIds.includes(row.objectId)) current.objectIds.push(row.objectId);
    if (row?.message && !current.messages.includes(row.message)) current.messages.push(row.message);
    groups.set(code, current);
  }
  return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function disposition(summary, loaded) {
  if (!loaded) return 'NOT_LOADED';
  if (!summary.requested) return 'NO_BENDS';
  if (!summary.blocked && summary.resolved === summary.requested) return 'READY';
  return 'REVIEW_REQUIRED';
}

function sideModel(label, name, visual) {
  const loaded = Boolean(visual?.bendSummary);
  const summary = {
    requested: count(visual?.bendSummary?.requested),
    resolved: count(visual?.bendSummary?.resolved),
    blocked: count(visual?.bendSummary?.blocked),
    arcSegments: count(visual?.bendSummary?.arcSegments),
  };
  const diagnostics = groupDiagnostics(Array.isArray(visual?.geometryDiagnostics)
    ? visual.geometryDiagnostics : []);
  return Object.freeze({
    label,
    name,
    loaded,
    disposition: disposition(summary, loaded),
    summary: Object.freeze(summary),
    diagnostics: Object.freeze(diagnostics.map((row) => Object.freeze({
      ...row,
      objectIds: Object.freeze([...row.objectIds]),
      messages: Object.freeze([...row.messages]),
    }))),
  });
}

export function buildBendDiagnosticsModel(state = {}) {
  const source = sideModel('Source A', displayName(state.sourceName, 'Source A'), state.visuals?.A);
  const target = sideModel('Target B', displayName(state.targetName, 'Target B'), state.visuals?.B);
  return Object.freeze({
    source,
    target,
    totals: Object.freeze({
      requested: source.summary.requested + target.summary.requested,
      resolved: source.summary.resolved + target.summary.resolved,
      blocked: source.summary.blocked + target.summary.blocked,
      arcSegments: source.summary.arcSegments + target.summary.arcSegments,
    }),
    authorityNote: 'Visual derivation evidence only; no XML, topology, comparison, or export authority is changed.',
  });
}

function tile(label, value) {
  return `<div class="wb3d-tile"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function diagnosticRows(side) {
  if (!side.diagnostics.length) return '<p class="wb3d-muted">No blocked bend diagnostics.</p>';
  const rows = side.diagnostics.map((row) => {
    const firstObjectId = row.objectIds[0] ?? '';
    const inspect = firstObjectId
      ? `<button class="wb3d-btn wb3d-btn-mini" data-action="select-object" data-object="${esc(firstObjectId)}">Inspect</button>`
      : '';
    return `<tr><td>${esc(row.code)}</td><td>${row.count}</td><td>${esc(row.messages.join(' · '))}</td><td>${inspect}</td></tr>`;
  }).join('');
  return `<div class="wb3d-table-wrap"><table><thead><tr><th>Code</th><th>Count</th><th>Reason</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function sideHtml(side) {
  const summary = side.summary;
  return `<div><h4>${esc(side.label)} <span class="wb3d-muted">${esc(side.name)}</span> <span class="wb3d-badge">${esc(side.disposition.replaceAll('_', ' '))}</span></h4><div class="wb3d-tiles">${tile('Requested bends', summary.requested)}${tile('Resolved bends', summary.resolved)}${tile('Blocked bends', summary.blocked)}${tile('Arc chords', summary.arcSegments)}</div>${diagnosticRows(side)}</div>`;
}

export function bendDiagnosticsPanelHtml(state = {}) {
  const model = buildBendDiagnosticsModel(state);
  if (!model.source.loaded && !model.target.loaded) return '';
  return `<details class="wb3d-card" data-wb3d-bend-diagnostics ${model.totals.blocked ? 'open' : ''}><summary><h3>InputXML bend geometry <span class="wb3d-muted">${model.totals.resolved}/${model.totals.requested} resolved · ${model.totals.blocked} blocked</span></h3></summary><p class="wb3d-muted">${esc(model.authorityNote)}</p><div class="wb3d-evi-cols">${sideHtml(model.source)}${sideHtml(model.target)}</div></details>`;
}

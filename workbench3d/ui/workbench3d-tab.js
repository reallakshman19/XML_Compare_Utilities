/**
 * workbench3d-tab.js — "3D Compare Workbench" tab shell.
 *
 * Wires the contract pipeline together:
 *   file/paste → adapters → CanonicalObjectGraph.v1 → compare engine →
 *   CompareAudit.v1 → viewer/dashboard/tables → TransferPlan.v1 →
 *   approved apply → downloads.
 *
 * The tab renders view models only; all engine logic lives in workbench3d/
 * compare + adapters + apply modules.
 */

import { parseInputXmlRecords, XML_SCHEMA_KINDS } from '../adapters/inputxml-adapter.js';
import { buildCanonicalGraph } from '../adapters/canonical-graph-builder.js';
import { buildVisualModel } from '../adapters/visual-model-builder.js';
import { runCompare } from '../compare/compare-engine.js';
import { DEFAULT_COMPARE_CONFIG } from '../compare/evidence-scorer.js';
import { buildTransferPlan, batchApprove, refreshTransferSummary, DEFAULT_TRANSFER_CONFIG } from '../compare/transfer-planner.js';
import { applyTransferPlan } from '../apply/transfer-apply.js';
import { buildExportBundle, downloadFile, rowsToCsv, DIFF_CSV_COLUMNS, CONFLICT_CSV_COLUMNS, TRANSFER_CSV_COLUMNS, PATH_CSV_COLUMNS } from '../apply/exporters.js';
import { createWorkbenchViewer, STATUS_STYLES } from '../viewer/workbench-viewer.js';
import { validateCompareAudit, DIFF_STATUS, APPROVAL_STATUS, TRANSFER_RULES, CONFIDENCE } from '../contracts/contracts.js';

const STATE_KEY = '__workbench3dState';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function hexColor(int) { return `#${int.toString(16).padStart(6, '0')}`; }

function ensureState(container) {
  if (!container[STATE_KEY]) {
    container[STATE_KEY] = {
      sourceXml: '', targetXml: '', sourceName: '', targetName: '',
      config: { ...DEFAULT_COMPARE_CONFIG, canonicalNormalization: true },
      transferConfig: { ...DEFAULT_TRANSFER_CONFIG },
      manualOverrides: [],
      graphs: null, visuals: null, audit: null, plan: null, applyResult: null,
      viewer: null, viewerError: null,
      selection: null, statusFilter: new Set(),
      status: 'Load a source and target XML/InputXML, then run compare.',
    };
  }
  return container[STATE_KEY];
}

// ── pipeline actions ───────────────────────────────────────────────────────

function rebuildGraphs(state) {
  const tolerance = state.config.canonicalNormalization ? state.config.shortElementToleranceMm : 0;
  const src = parseInputXmlRecords(state.sourceXml);
  const tgt = parseInputXmlRecords(state.targetXml);
  if (src.schema === XML_SCHEMA_KINDS.UNKNOWN) throw new Error(`Source: ${src.warnings.join(' ')}`);
  if (tgt.schema === XML_SCHEMA_KINDS.UNKNOWN) throw new Error(`Target: ${tgt.warnings.join(' ')}`);
  const graphA = buildCanonicalGraph('source', src.records, { shortElementToleranceMm: tolerance });
  const graphB = buildCanonicalGraph('target', tgt.records, { shortElementToleranceMm: tolerance });
  state.graphs = { A: graphA, B: graphB, sourceSchema: src.schema, targetSchema: tgt.schema, warnings: [...src.warnings, ...tgt.warnings] };
  state.visuals = { A: buildVisualModel(graphA), B: buildVisualModel(graphB) };
}

function runComparePipeline(state) {
  rebuildGraphs(state);
  state.audit = runCompare(state.graphs.A, state.graphs.B, state.config, state.manualOverrides);
  const contractErrors = validateCompareAudit(state.audit);
  if (contractErrors.length) throw new Error(`CompareAudit contract violation: ${contractErrors[0]}`);
  state.plan = null;
  state.applyResult = null;
  state.selection = null;
  state.status = `Compared ${state.audit.summary.sourceCanonicalElements} source vs ${state.audit.summary.targetCanonicalElements} target canonical element(s): ${state.audit.summary.matchedElements} matched, ${state.audit.summary.ambiguousElements} ambiguous, ${state.audit.summary.conflictCount} conflict row(s).`;
}

function statusMapForViewer(state) {
  const map = new Map();
  if (!state.audit) return map;
  for (const row of state.audit.objectDiff.rows) {
    if (row.sourceObjectId) map.set(row.sourceObjectId, row.status);
    if (row.targetObjectId) map.set(row.targetObjectId, row.status);
  }
  return map;
}

function transferReadiness(state) {
  if (!state.plan) return { ready: 0, blocked: 0 };
  const byApproval = (statuses) => new Set(state.plan.rows.filter((r) => statuses.includes(r.approval)).map((r) => r.targetObjectId)).size;
  return {
    ready: byApproval([APPROVAL_STATUS.PENDING, APPROVAL_STATUS.APPROVED]),
    blocked: byApproval([APPROVAL_STATUS.BLOCKED]),
  };
}

// ── section renderers ─────────────────────────────────────────────────────

function importSection(state) {
  const schemaBadge = (label, xml) => {
    if (!xml) return `<span class="wb3d-badge">${label}: none</span>`;
    const kind = parseInputXmlRecords(xml).schema;
    const cls = kind === XML_SCHEMA_KINDS.UNKNOWN ? 'is-bad' : 'is-ok';
    return `<span class="wb3d-badge ${cls}">${label}: ${kind}</span>`;
  };
  return `
  <section class="wb3d-card">
    <h3>Import <span class="wb3d-muted">source (property donor) and target (receiver)</span></h3>
    <div class="wb3d-import-grid">
      <div>
        <label class="wb3d-file">Source XML/InputXML <input type="file" data-action="load-file" data-side="source" accept=".xml,.txt,text/xml,application/xml,text/plain"></label>
        ${schemaBadge('Detected', state.sourceXml)} ${state.sourceName ? `<span class="wb3d-muted">${esc(state.sourceName)}</span>` : ''}
        <textarea data-field="sourceXml" spellcheck="false" placeholder="…or paste source XML here">${esc(state.sourceXml.length > 400000 ? '' : state.sourceXml)}</textarea>
      </div>
      <div>
        <label class="wb3d-file">Target XML/InputXML <input type="file" data-action="load-file" data-side="target" accept=".xml,.txt,text/xml,application/xml,text/plain"></label>
        ${schemaBadge('Detected', state.targetXml)} ${state.targetName ? `<span class="wb3d-muted">${esc(state.targetName)}</span>` : ''}
        <textarea data-field="targetXml" spellcheck="false" placeholder="…or paste target XML here">${esc(state.targetXml.length > 400000 ? '' : state.targetXml)}</textarea>
      </div>
    </div>
    <div class="wb3d-toolbar">
      <label>Short/consume tol mm <input type="number" data-config="shortElementToleranceMm" value="${state.config.shortElementToleranceMm}" step="1"></label>
      <label>Length tol mm <input type="number" data-config="lengthToleranceMm" value="${state.config.lengthToleranceMm}" step="1"></label>
      <label>Min score <input type="number" data-config="minCandidateScore" value="${state.config.minCandidateScore}" step="1"></label>
      <label>Ambiguity gap <input type="number" data-config="ambiguityGap" value="${state.config.ambiguityGap}" step="1"></label>
      <label class="wb3d-check"><input type="checkbox" data-config="canonicalNormalization" ${state.config.canonicalNormalization ? 'checked' : ''}> canonical normalization (raw when off)</label>
      <button class="wb3d-btn wb3d-btn-primary" data-action="run-compare">Run Compare</button>
    </div>
  </section>`;
}

function dashboardSection(state) {
  if (!state.audit) return '<section class="wb3d-card"><h3>Variance dashboard</h3><p class="wb3d-muted">Run a compare to populate the dashboard.</p></section>';
  const s = state.audit.summary;
  const readiness = transferReadiness(state);
  const clickable = (label, value, status) => `
    <button class="wb3d-tile ${status ? `wb3d-tile-${status}` : ''} ${status && state.statusFilter.has(status) ? 'is-active' : ''}" ${status ? `data-action="toggle-status-filter" data-status="${status}"` : 'disabled'}>
      <strong>${value ?? 0}</strong><span>${label}</span>
    </button>`;
  const plain = (label, value) => `<div class="wb3d-tile"><strong>${value ?? 0}</strong><span>${label}</span></div>`;
  const warnings = state.audit.registration.warnings ?? [];
  return `
  <section class="wb3d-card">
    <h3>Variance dashboard <span class="wb3d-muted">tiles with a colored bar filter the 3D view + tables</span></h3>
    ${warnings.length ? `<div class="wb3d-alert">⚠ ${warnings.map(esc).join('<br>⚠ ')}</div>` : ''}
    <div class="wb3d-tiles">
      ${plain('Source raw', s.sourceRawElements)}
      ${plain('Target raw', s.targetRawElements)}
      ${plain('Source canonical', s.sourceCanonicalElements)}
      ${plain('Target canonical', s.targetCanonicalElements)}
      ${plain('Consumed src', s.consumedSourceElements)}
      ${plain('Consumed tgt', s.consumedTargetElements)}
      ${plain('Paths src/tgt', `${s.sourcePaths}/${s.targetPaths}`)}
      ${plain('Matched paths', s.matchedPaths)}
      ${plain('Matched elements', s.matchedElements)}
      ${clickable('Unchanged', s.unchangedElements, DIFF_STATUS.MATCHED_UNCHANGED)}
      ${clickable('Property changed', s.propertyChangedElements, DIFF_STATUS.PROPERTY_CHANGED)}
      ${clickable('Geometry changed', s.geometryChangedElements, DIFF_STATUS.GEOMETRY_CHANGED)}
      ${clickable('Missing in target', s.missingInTarget, DIFF_STATUS.MISSING_IN_TARGET)}
      ${clickable('New in target', s.newInTarget, DIFF_STATUS.NEW_IN_TARGET)}
      ${clickable('Ambiguous', s.ambiguousElements, DIFF_STATUS.AMBIGUOUS)}
      ${clickable('Split', s.splitElements, DIFF_STATUS.SPLIT)}
      ${clickable('Merge', s.mergeElements, DIFF_STATUS.MERGE)}
      ${plain('High conf', s.highConfidenceElements)}
      ${plain('Medium conf', s.mediumConfidenceElements)}
      ${plain('Low conf', s.lowConfidenceElements)}
      ${plain('Evidence conflicts', s.evidenceConflictElements)}
      ${plain('Conflict rows', s.conflictCount)}
      ${plain('Avg score', s.averageMatchScore)}
      ${plain('Reg anchors', s.registrationAnchorCount)}
      ${plain('Reg residual max', s.registrationResidualMaxMm ?? 'n/a')}
      ${plain('Transfer-ready elems', readiness.ready)}
      ${plain('Transfer-blocked elems', readiness.blocked)}
    </div>
  </section>`;
}

function legendHtml() {
  return Object.entries(STATUS_STYLES)
    .map(([key, style]) => `<span class="wb3d-legend-item"><i style="background:${hexColor(style.color)}"></i>${esc(style.label)}</span>`)
    .join('');
}

function viewerSection(state) {
  return `
  <section class="wb3d-card">
    <h3>3D visual compare</h3>
    <div class="wb3d-toolbar">
      <div class="wb3d-seg" role="group">
        <button class="wb3d-btn" data-action="set-mode" data-mode="overlay">Overlay</button>
        <button class="wb3d-btn" data-action="set-mode" data-mode="side-by-side">Side-by-side</button>
        <button class="wb3d-btn" data-action="set-mode" data-mode="diff-only">Diff-only</button>
      </div>
      <div class="wb3d-seg" role="group">
        <button class="wb3d-btn" data-action="set-view" data-view="iso">Iso</button>
        <button class="wb3d-btn" data-action="set-view" data-view="top">Top</button>
        <button class="wb3d-btn" data-action="set-view" data-view="front">Front</button>
        <button class="wb3d-btn" data-action="set-view" data-view="side">Side</button>
      </div>
      <button class="wb3d-btn" data-action="fit-all">Fit all</button>
      <button class="wb3d-btn" data-action="clear-isolation">Clear isolation</button>
      <label>Ghost opacity <input type="range" min="5" max="100" value="32" data-action="set-opacity"></label>
    </div>
    <div class="wb3d-viewer-row">
      <div class="wb3d-canvas-host" data-wb3d-canvas>
        ${state.viewerError ? `<div class="wb3d-viewer-fallback">3D viewer unavailable: ${esc(state.viewerError)}<br>All compare data remains available in the tables below.</div>` : ''}
      </div>
      <aside class="wb3d-selection" data-wb3d-selection>${selectionPanelHtml(state)}</aside>
    </div>
    <div class="wb3d-legend">${legendHtml()}</div>
  </section>`;
}

function selectionPanelHtml(state) {
  if (!state.selection || !state.graphs) return '<p class="wb3d-muted">Click an element in the 3D view (or a table row) to inspect it.</p>';
  const { objectId } = state.selection;
  const graph = objectId.startsWith('source:') ? state.graphs.A : state.graphs.B;
  const object = graph.objects.find((o) => o.objectId === objectId);
  if (!object) return '<p class="wb3d-muted">Selection no longer exists (re-run compare?).</p>';
  const diffRow = state.audit?.objectDiff.rows.find((r) => r.sourceObjectId === objectId || r.targetObjectId === objectId);
  const counterpartId = diffRow ? (diffRow.sourceObjectId === objectId ? diffRow.targetObjectId : diffRow.sourceObjectId) : null;
  const packets = object.packets.map((p) => `<li>${esc(p.kind)}${p.consumedFrom ? ` <em>(from consumed ${esc(p.consumedFrom)})</em>` : ''}: ${esc(JSON.stringify(p.attrs))}</li>`).join('');
  const props = Object.entries(object.properties).map(([k, v]) => `<li>${esc(k)} = ${esc(v)}</li>`).join('');
  const breakdown = (diffRow?.breakdown ?? []).map((b) => `<li>${esc(b.evidence)}: ${b.earned}/${b.weight} <em>${esc(b.detail)}</em></li>`).join('');
  const candidates = (diffRow?.candidateTargetIds ?? []).map((tid) => `
    <li>${esc(tid)} <button class="wb3d-btn wb3d-btn-mini" data-action="manual-link" data-source="${esc(diffRow.sourceObjectId)}" data-target="${esc(tid)}">Link</button></li>`).join('');
  const transferRows = (state.plan?.rows ?? []).filter((r) => r.sourceObjectId === objectId || r.targetObjectId === objectId);
  const transferHtml = transferRows.map((r) => `
    <li class="${r.approval === APPROVAL_STATUS.BLOCKED ? 'is-blocked' : ''}">${esc(r.property)}: "${esc(r.oldValue)}" → "${esc(r.newValue)}" <em>${esc(r.approval)}${r.blockedReason ? ` — ${esc(r.blockedReason)}` : ''}</em></li>`).join('');
  return `
    <h4>${esc(objectId)} <span class="wb3d-badge">${esc(object.kind)}</span> ${diffRow ? `<span class="wb3d-badge" style="background:${hexColor((STATUS_STYLES[diffRow.status] ?? STATUS_STYLES.GHOST).color)}33">${esc(diffRow.status)}</span>` : ''}</h4>
    <div class="wb3d-kv">
      <div>FROM→TO</div><div>${esc(object.canonicalFromTo)}</div>
      <div>Length</div><div>${object.lengthMm} mm</div>
      <div>Diameter</div><div>${object.diameterMm ?? '—'} mm</div>
      <div>Path</div><div>${esc(object.pathId)} @ ${object.stationMm} mm</div>
      ${object.lineId ? `<div>Line</div><div>${esc(object.lineId)}</div>` : ''}
      ${diffRow?.score != null ? `<div>Score / gap</div><div>${diffRow.score} / ${diffRow.scoreGap ?? '—'} (${esc(diffRow.confidence)})</div>` : ''}
      ${diffRow?.geometryIssue ? `<div>Geometry</div><div>${esc(diffRow.geometryIssue)}</div>` : ''}
    </div>
    ${counterpartId ? `<button class="wb3d-btn wb3d-btn-mini" data-action="select-object" data-object="${esc(counterpartId)}">Go to matched ${esc(counterpartId)}</button>
      <button class="wb3d-btn wb3d-btn-mini" data-action="manual-reject" data-source="${esc(diffRow.sourceObjectId)}" data-target="${esc(diffRow.targetObjectId)}">Reject match</button>` : ''}
    ${candidates ? `<h5>Ambiguous candidates</h5><ul class="wb3d-list">${candidates}</ul>` : ''}
    ${breakdown ? `<h5>Evidence</h5><ul class="wb3d-list">${breakdown}</ul>` : ''}
    ${(diffRow?.changedProperties ?? []).length ? `<h5>Changed properties</h5><ul class="wb3d-list">${diffRow.changedProperties.map((c) => `<li>${esc(c.property)}: "${esc(c.sourceValue)}" vs "${esc(c.targetValue)}"</li>`).join('')}</ul>` : ''}
    ${props ? `<h5>Properties</h5><ul class="wb3d-list">${props}</ul>` : ''}
    ${packets ? `<h5>Property packets</h5><ul class="wb3d-list">${packets}</ul>` : ''}
    ${transferHtml ? `<h5>Transfer rows (before → after)</h5><ul class="wb3d-list">${transferHtml}</ul>` : ''}`;
}

function hierarchySection(state) {
  if (!state.graphs) return '';
  const tree = (graph, label) => {
    const lines = graph.hierarchy.map((line) => {
      const paths = line.paths.map((p) => {
        const path = graph.paths.find((x) => x.pathId === p.pathId);
        return `<li><button class="wb3d-link" data-action="isolate-path" data-path="${esc(p.pathId)}" data-model="${esc(graph.modelId)}">${esc(p.pathId)}</button> <span class="wb3d-muted">${path?.startAnchorType}→${path?.endAnchorType}, ${p.elementIds.length} elem, ${path?.totalLengthMm} mm</span>
          <ul>${p.elementIds.map((id) => `<li><button class="wb3d-link" data-action="select-object" data-object="${esc(id)}">${esc(id)}</button></li>`).join('')}</ul></li>`;
      }).join('');
      return `<li><strong>${esc(line.lineId)}</strong><ul>${paths}</ul></li>`;
    }).join('');
    return `<div><h4>${esc(label)}</h4><ul class="wb3d-tree">${lines}</ul></div>`;
  };
  return `
  <details class="wb3d-card">
    <summary><h3>Hierarchy <span class="wb3d-muted">line → path → element; click to isolate in 3D</span></h3></summary>
    <div class="wb3d-import-grid">${tree(state.graphs.A, `Source (${state.graphs.A.modelId})`)}${tree(state.graphs.B, `Target (${state.graphs.B.modelId})`)}</div>
  </details>`;
}

function tableHtml(columns, rows, { rowAttrs = () => '', limit = 300 } = {}) {
  if (!rows?.length) return '<p class="wb3d-muted">No rows.</p>';
  const shown = rows.slice(0, limit);
  const cell = (value) => esc(Array.isArray(value) ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join('; ') : (typeof value === 'object' && value !== null ? JSON.stringify(value) : value));
  return `<div class="wb3d-table-wrap"><table><thead><tr>${columns.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead>
    <tbody>${shown.map((row) => `<tr ${rowAttrs(row)}>${columns.map(([k]) => `<td>${cell(row?.[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${rows.length > limit ? `<p class="wb3d-muted">Showing ${limit} of ${rows.length} rows — full data in exports.</p>` : ''}</div>`;
}

function filteredDiffRows(state) {
  const rows = state.audit?.objectDiff.rows ?? [];
  if (!state.statusFilter.size) return rows;
  return rows.filter((r) => state.statusFilter.has(r.status));
}

function tablesSection(state) {
  if (!state.audit) return '';
  const diffRows = filteredDiffRows(state);
  const conflictRows = state.audit.conflictLedger.rows;
  const conflictActions = (row) => row.kind === 'AMBIGUOUS_MATCH'
    ? `data-action="select-object" data-object="${esc(row.sourceObjectId)}" class="wb3d-row-click"`
    : (row.sourceObjectId ? `data-action="select-object" data-object="${esc(row.sourceObjectId)}" class="wb3d-row-click"` : '');
  return `
  <details class="wb3d-card" open>
    <summary><h3>Object diff <span class="wb3d-muted">${diffRows.length} row(s)${state.statusFilter.size ? ' (filtered)' : ''} — click a row to inspect</span></h3></summary>
    ${tableHtml(DIFF_CSV_COLUMNS, diffRows, { rowAttrs: (r) => `data-action="select-object" data-object="${esc(r.sourceObjectId || r.targetObjectId)}" class="wb3d-row-click"` })}
  </details>
  <details class="wb3d-card">
    <summary><h3>Path alignment audit <span class="wb3d-muted">${state.audit.pathAudit.alignmentRows.length} operation(s)</span></h3></summary>
    ${tableHtml(PATH_CSV_COLUMNS, state.audit.pathAudit.alignmentRows)}
  </details>
  <details class="wb3d-card" ${conflictRows.length ? 'open' : ''}>
    <summary><h3>Conflicts <span class="wb3d-muted">${conflictRows.length} row(s) — click ambiguous rows to resolve in the panel</span></h3></summary>
    ${tableHtml(CONFLICT_CSV_COLUMNS, conflictRows, { rowAttrs: conflictActions })}
  </details>
  <details class="wb3d-card">
    <summary><h3>Normalization audit <span class="wb3d-muted">consumed short/zero elements</span></h3></summary>
    <h4>Source</h4>${tableHtml([['elementName', 'Element'], ['fromTo', 'FROM→TO'], ['retainedNode', 'Retained'], ['droppedNode', 'Dropped'], ['lengthMm', 'Len mm'], ['packetEvidence', 'Packets'], ['action', 'Action']], state.audit.normalization.source.consumedRows)}
    <h4>Target</h4>${tableHtml([['elementName', 'Element'], ['fromTo', 'FROM→TO'], ['retainedNode', 'Retained'], ['droppedNode', 'Dropped'], ['lengthMm', 'Len mm'], ['packetEvidence', 'Packets'], ['action', 'Action']], state.audit.normalization.target.consumedRows)}
  </details>`;
}

function transferSection(state) {
  if (!state.audit) return '';
  const plan = state.plan;
  const approveButtons = (row) => row.approval === APPROVAL_STATUS.BLOCKED
    ? `<span class="wb3d-muted">${esc(row.blockedReason)}</span>`
    : `<button class="wb3d-btn wb3d-btn-mini" data-action="approve-row" data-row="${esc(row.rowId)}" ${row.approval === APPROVAL_STATUS.APPROVED ? 'disabled' : ''}>Approve</button>
       <button class="wb3d-btn wb3d-btn-mini" data-action="reject-row" data-row="${esc(row.rowId)}" ${row.approval === APPROVAL_STATUS.REJECTED ? 'disabled' : ''}>Reject</button>`;
  const columns = [...TRANSFER_CSV_COLUMNS.filter(([k]) => k !== 'blockedReason'), ['__actions', 'Actions']];
  const rows = (plan?.rows ?? []).map((r) => ({ ...r, __actions: approveButtons(r) }));
  return `
  <section class="wb3d-card">
    <h3>Transfer preview &amp; approval <span class="wb3d-muted">planner never edits XML; apply exports a modified copy</span></h3>
    <div class="wb3d-toolbar">
      <label>Rule <select data-transfer-config="rule">${Object.values(TRANSFER_RULES).map((r) => `<option ${state.transferConfig.rule === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label>Min confidence <select data-transfer-config="minConfidence">${[CONFIDENCE.HIGH, CONFIDENCE.MEDIUM, CONFIDENCE.LOW].map((c) => `<option ${state.transferConfig.minConfidence === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <button class="wb3d-btn wb3d-btn-primary" data-action="build-plan">Build transfer plan</button>
      ${plan ? `<button class="wb3d-btn" data-action="batch-approve">Batch approve ≥ ${esc(state.transferConfig.minConfidence)}</button>` : ''}
    </div>
    ${plan ? `<p>${plan.summary.totalRows} row(s): <strong>${plan.summary.approvedRows ?? 0} approved</strong>, ${plan.summary.pendingRows} pending, ${plan.summary.blockedRows} blocked.</p>` : '<p class="wb3d-muted">No plan yet.</p>'}
    ${plan ? `<div data-wb3d-transfer-table>${tableHtml(columns, rows)}</div>` : ''}
  </section>`;
}

function exportSection(state) {
  if (!state.audit) return '';
  const applied = state.applyResult;
  return `
  <section class="wb3d-card">
    <h3>Apply &amp; export <span class="wb3d-muted">approved rows only; original files are never modified</span></h3>
    <div class="wb3d-toolbar">
      <button class="wb3d-btn" data-action="export" data-file="compare-audit.json">compare-audit.json</button>
      <button class="wb3d-btn" data-action="export" data-file="object-diff.csv">object-diff.csv</button>
      <button class="wb3d-btn" data-action="export" data-file="path-alignment.csv">path-alignment.csv</button>
      <button class="wb3d-btn" data-action="export" data-file="conflicts.csv">conflicts.csv</button>
      ${state.plan ? `<button class="wb3d-btn" data-action="export" data-file="transfer-plan.json">transfer-plan.json</button>
      <button class="wb3d-btn" data-action="export" data-file="transfer-preview.csv">transfer-preview.csv</button>
      <button class="wb3d-btn wb3d-btn-primary" data-action="apply-plan">Apply approved → download transferred target XML</button>` : ''}
      ${applied ? `<button class="wb3d-btn" data-action="export" data-file="rollback-ledger.json">rollback-ledger.json</button>` : ''}
    </div>
    ${applied ? `<p>Applied <strong>${applied.appliedCount}</strong> change(s); ${applied.skippedRows.length} skipped; geometry violations: ${applied.geometryViolations.length}. Rollback ledger has ${applied.rollbackLedger.rows.length} row(s).</p>` : ''}
  </section>`;
}

// ── main render ────────────────────────────────────────────────────────────

function fullHtml(state) {
  return `
  <div class="wb3d-root">
    <header class="wb3d-header">
      <div>
        <h2>3D Data Compare Workbench</h2>
        <p class="wb3d-muted">Variance-first structured compare: canonical graph → match engine → 3D diff → conflict resolution → approved transfer → audited export.</p>
      </div>
    </header>
    <div class="wb3d-status" data-wb3d-status>${esc(state.status)}</div>
    ${importSection(state)}
    <div data-wb3d-dashboard>${dashboardSection(state)}</div>
    ${viewerSection(state)}
    <div data-wb3d-hierarchy>${hierarchySection(state)}</div>
    <div data-wb3d-tables>${tablesSection(state)}</div>
    <div data-wb3d-transfer>${transferSection(state)}</div>
    <div data-wb3d-export>${exportSection(state)}</div>
  </div>`;
}

function setStatus(container, state, message) {
  state.status = message;
  const el = container.querySelector('[data-wb3d-status]');
  if (el) el.textContent = message;
}

function refreshDerivedSections(container, state) {
  container.querySelector('[data-wb3d-dashboard]').innerHTML = dashboardSection(state);
  container.querySelector('[data-wb3d-hierarchy]').innerHTML = hierarchySection(state);
  container.querySelector('[data-wb3d-tables]').innerHTML = tablesSection(state);
  container.querySelector('[data-wb3d-transfer]').innerHTML = transferSection(state);
  container.querySelector('[data-wb3d-export]').innerHTML = exportSection(state);
  const panel = container.querySelector('[data-wb3d-selection]');
  if (panel) panel.innerHTML = selectionPanelHtml(state);
}

async function ensureViewer(container, state) {
  const host = container.querySelector('[data-wb3d-canvas]');
  if (!host) return;
  if (state.viewer) {
    // Tab HTML was re-rendered — move the existing canvas into the new host.
    state.viewer.reattach(host);
    return;
  }
  if (state.viewerError) return;
  try {
    state.viewer = await createWorkbenchViewer(host, {
      onPick: (pick) => {
        state.selection = pick;
        const panel = container.querySelector('[data-wb3d-selection]');
        if (panel) panel.innerHTML = selectionPanelHtml(state);
      },
    });
  } catch (error) {
    state.viewerError = String(error?.message || error);
    host.innerHTML = `<div class="wb3d-viewer-fallback">3D viewer unavailable: ${esc(state.viewerError)}<br>All compare data remains available in the tables below.</div>`;
  }
}

function pushModelsToViewer(state) {
  if (!state.viewer || !state.visuals) return;
  state.viewer.setModels({
    source: state.visuals.A,
    target: state.visuals.B,
    registrationTranslation: state.audit?.registration.translationMm ?? [0, 0, 0],
  });
  state.viewer.setStatuses(statusMapForViewer(state));
  state.viewer.setStatusFilter(state.statusFilter);
  state.viewer.fitAll();
}

function exportBundleFile(state, filename) {
  const files = buildExportBundle({
    compareAudit: state.audit,
    transferPlan: state.plan,
    rollbackLedger: state.applyResult?.rollbackLedger,
    outputXml: state.applyResult?.outputXml,
  });
  const file = files.find((f) => f.filename === filename);
  if (file) downloadFile(file.filename, file.content, file.type);
}

export function renderWorkbench3dTab(container) {
  const state = ensureState(container);
  container.innerHTML = fullHtml(state);
  ensureViewer(container, state).then(() => pushModelsToViewer(state));

  const rerunCompare = () => {
    try {
      runComparePipeline(state);
      refreshDerivedSections(container, state);
      setStatus(container, state, state.status);
      pushModelsToViewer(state);
    } catch (error) {
      setStatus(container, state, `Compare failed: ${error?.message || error}`);
    }
  };

  container.addEventListener('input', (event) => {
    const field = event.target.dataset?.field;
    if (field) state[field] = event.target.value;
    const config = event.target.dataset?.config;
    if (config) {
      state.config[config] = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
    }
    const transferConfig = event.target.dataset?.transferConfig;
    if (transferConfig) state.transferConfig[transferConfig] = event.target.value;
  });

  container.addEventListener('change', async (event) => {
    if (event.target.dataset?.action !== 'load-file') return;
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (event.target.dataset.side === 'source') { state.sourceXml = text; state.sourceName = file.name; }
    else { state.targetXml = text; state.targetName = file.name; }
    setStatus(container, state, `Loaded ${file.name} (${Math.round(text.length / 1024)} KB) as ${event.target.dataset.side}.`);
    renderWorkbench3dTab(container);
  });

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn || btn.dataset.action === 'load-file') return;
    const action = btn.dataset.action;

    if (action === 'run-compare') rerunCompare();

    if (action === 'set-mode' && state.viewer) {
      state.viewer.setMode(btn.dataset.mode);
      container.querySelectorAll('[data-action="set-mode"]').forEach((b) => b.classList.toggle('is-active', b === btn));
    }
    if (action === 'set-view' && state.viewer) state.viewer.setStandardView(btn.dataset.view);
    if (action === 'fit-all' && state.viewer) state.viewer.fitAll();
    if (action === 'clear-isolation' && state.viewer) state.viewer.isolate(null);
    if (action === 'set-opacity' && state.viewer) state.viewer.setSourceOpacity(Number(btn.value) / 100);

    if (action === 'toggle-status-filter') {
      const status = btn.dataset.status;
      if (state.statusFilter.has(status)) state.statusFilter.delete(status);
      else state.statusFilter.add(status);
      state.viewer?.setStatusFilter(state.statusFilter);
      refreshDerivedSections(container, state);
    }

    if (action === 'select-object') {
      const objectId = btn.dataset.object;
      if (!objectId) return;
      state.selection = { objectId };
      const panel = container.querySelector('[data-wb3d-selection]');
      if (panel) panel.innerHTML = selectionPanelHtml(state);
      state.viewer?.fitObject(objectId);
    }

    if (action === 'isolate-path') {
      const graph = btn.dataset.model === 'source' ? state.graphs?.A : state.graphs?.B;
      const path = graph?.paths.find((p) => p.pathId === btn.dataset.path);
      if (path) {
        const ids = new Set(path.elementIds);
        // include matched counterparts so the isolation shows both sides
        for (const row of state.audit?.objectDiff.rows ?? []) {
          if (row.sourceObjectId && ids.has(row.sourceObjectId) && row.targetObjectId) ids.add(row.targetObjectId);
          if (row.targetObjectId && ids.has(row.targetObjectId) && row.sourceObjectId) ids.add(row.sourceObjectId);
        }
        state.viewer?.isolate(ids);
      }
    }

    if (action === 'manual-link' || action === 'manual-reject') {
      state.manualOverrides.push({
        type: action === 'manual-link' ? 'LINK' : 'REJECT',
        sourceObjectId: btn.dataset.source,
        targetObjectId: btn.dataset.target,
        at: new Date().toISOString(),
      });
      rerunCompare();
    }

    if (action === 'build-plan') {
      if (!state.audit || !state.graphs) return;
      state.plan = buildTransferPlan(state.audit, state.graphs.A, state.graphs.B, state.transferConfig);
      state.applyResult = null;
      refreshDerivedSections(container, state);
      setStatus(container, state, `Transfer plan: ${state.plan.summary.totalRows} row(s), ${state.plan.summary.blockedRows} blocked.`);
    }
    if (action === 'batch-approve' && state.plan) {
      batchApprove(state.plan, state.transferConfig.minConfidence);
      refreshDerivedSections(container, state);
      setStatus(container, state, `Batch approved: ${state.plan.summary.approvedRows} row(s) now approved.`);
    }
    if ((action === 'approve-row' || action === 'reject-row') && state.plan) {
      const row = state.plan.rows.find((r) => r.rowId === btn.dataset.row);
      if (row && row.approval !== APPROVAL_STATUS.BLOCKED) {
        row.approval = action === 'approve-row' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
        refreshTransferSummary(state.plan);
        refreshDerivedSections(container, state);
      }
    }

    if (action === 'apply-plan' && state.plan) {
      try {
        refreshTransferSummary(state.plan);
        if (!state.plan.summary.approvedRows) {
          setStatus(container, state, 'Nothing approved yet — approve rows (or batch approve) before applying.');
          return;
        }
        state.applyResult = applyTransferPlan(state.targetXml, state.plan);
        downloadFile('transferred-target-inputxml.xml', state.applyResult.outputXml, 'application/xml;charset=utf-8');
        refreshDerivedSections(container, state);
        setStatus(container, state, `Applied ${state.applyResult.appliedCount} approved change(s); transferred XML downloaded. Geometry violations: ${state.applyResult.geometryViolations.length}.`);
      } catch (error) {
        setStatus(container, state, `Apply failed: ${error?.message || error}`);
      }
    }

    if (action === 'export') exportBundleFile(state, btn.dataset.file);
  });

  return () => {
    state.viewer?.dispose();
    state.viewer = null;
  };
}

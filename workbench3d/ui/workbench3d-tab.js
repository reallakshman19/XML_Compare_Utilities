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
import { buildConnectorModel } from '../viewer/connector-model.js';
import {
  loadSettings, saveSettings, normalizeSettings, discoverPacketKinds, effectiveStatusStyles, packetKindVisible,
} from '../core/wb3d-settings.js';
import { settingsButtonHtml, settingsPanelHtml } from './settings-panel.js';
import { blockInspectorHtml, nodeInfoPanelHtml } from './block-inspector.js';
import { buildNodeInfoIndex } from '../adapters/node-resolver.js';
import {
  objectDiffPanelRows, conflictPanelRows, approvalPanelRows, applyPanelFilters, objectHoverTooltipLines,
} from './panel-view-models.js';
import { floatingPanelsHtml, panelToggleButtonsHtml, attachFloatingPanelDrag } from './floating-panels.js';
import { buildNodeSetGraph } from '../adapters/nodeset-adapter.js';
import { runNodeCompare } from '../compare/node-compare-engine.js';
import { buildHeatmapOverrides } from '../viewer/heatmap.js';
import {
  tableToXmlSection, handleTableToXmlClick, handleTableToXmlInput, handleTableToXmlFile,
  ensureTablexmlState, autoParseActiveTable,
} from './table-to-xml-tab.js';
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
      settings: loadSettings(globalThis.localStorage),
      settingsOpen: false,
      panelColumnPicker: null,
      activeView: 'compare',
      nodeInfo: null,
      status: 'Load a source and target XML/InputXML, then run compare.',
    };
  }
  return container[STATE_KEY];
}

function markerOptionsFromSettings(settings) {
  return {
    markerPlacement: settings.markerPlacement,
    packetMarkerKinds: Array.isArray(settings.tooltipPacketKinds) ? settings.tooltipPacketKinds : null,
    showAllNodes: settings.showAllNodes,
    nodeMarkerSizeMm: settings.nodeMarkerSizeMm,
  };
}

// ── pipeline actions ───────────────────────────────────────────────────────

function rebuildGraphs(state) {
  const tolerance = state.config.canonicalNormalization ? state.config.shortElementToleranceMm : 0;
  const src = parseInputXmlRecords(state.sourceXml);
  const tgt = parseInputXmlRecords(state.targetXml);
  if (src.schema === XML_SCHEMA_KINDS.UNKNOWN) throw new Error(`Source: ${src.warnings.join(' ')}`);
  if (tgt.schema === XML_SCHEMA_KINDS.UNKNOWN) throw new Error(`Target: ${tgt.warnings.join(' ')}`);
  const srcIsNodeset = src.schema === XML_SCHEMA_KINDS.NODESET_XML;
  const tgtIsNodeset = tgt.schema === XML_SCHEMA_KINDS.NODESET_XML;
  if (srcIsNodeset !== tgtIsNodeset) throw new Error('Source and target schemas mix piping and node-set XML — both sides must be the same kind.');
  const graphA = srcIsNodeset ? buildNodeSetGraph('source', state.sourceXml) : buildCanonicalGraph('source', src.records, { shortElementToleranceMm: tolerance });
  const graphB = tgtIsNodeset ? buildNodeSetGraph('target', state.targetXml) : buildCanonicalGraph('target', tgt.records, { shortElementToleranceMm: tolerance });
  state.graphs = { A: graphA, B: graphB, sourceSchema: src.schema, targetSchema: tgt.schema, warnings: [...src.warnings, ...tgt.warnings] };
  rebuildVisuals(state);
}

function rebuildVisuals(state) {
  if (!state.graphs) return;
  const options = markerOptionsFromSettings(state.settings);
  state.visuals = { A: buildVisualModel(state.graphs.A, options), B: buildVisualModel(state.graphs.B, options) };
  state.nodeInfo = { A: buildNodeInfoIndex(state.graphs.A), B: buildNodeInfoIndex(state.graphs.B) };
}

function isNodeCompare(state) {
  return state.graphs?.A?.graphKind === 'nodeset' && state.graphs?.B?.graphKind === 'nodeset';
}

function runComparePipeline(state) {
  rebuildGraphs(state);
  state.audit = isNodeCompare(state)
    ? runNodeCompare(state.graphs.A, state.graphs.B, state.config.nodeCompare ?? {}, state.manualOverrides)
    : runCompare(state.graphs.A, state.graphs.B, state.config, state.manualOverrides);
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

function connectorModelFor(state) {
  if (!state.audit || !state.visuals) return { connectors: [] };
  return buildConnectorModel({
    compareAudit: state.audit,
    transferPlan: state.plan,
    sourceVisual: state.visuals.A,
    targetVisual: state.visuals.B,
    sourceGraph: state.graphs.A,
    targetGraph: state.graphs.B,
  });
}

function pushConnectors(state) {
  state.viewer?.setConnectors(connectorModelFor(state));
}

/** Matched counterpart / candidates / transfer receivers for an object. */
function relatedIdsFor(state, objectId) {
  const related = new Set();
  for (const row of state.audit?.objectDiff.rows ?? []) {
    if (row.sourceObjectId === objectId) {
      if (row.targetObjectId) related.add(row.targetObjectId);
      for (const cid of row.candidateTargetIds ?? []) related.add(cid);
    }
    if (row.targetObjectId === objectId && row.sourceObjectId) related.add(row.sourceObjectId);
  }
  return [...related];
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

/** Rule-based alerts derived from CompareAudit + TransferPlan (function 12). */
function buildAlerts(state) {
  if (!state.audit) return [];
  const s = state.audit.summary;
  const rows = state.audit.objectDiff.rows;
  const idsWhere = (predicate) => rows.flatMap((r) => [r.sourceObjectId, r.targetObjectId].filter(Boolean).filter(() => predicate(r)));
  const alerts = [];
  for (const warning of state.audit.registration.warnings ?? []) {
    alerts.push({ severity: 'HIGH', rule: 'REGISTRATION_RESIDUAL', message: warning, isolateIds: [] });
  }
  if (s.ambiguousElements > 0) alerts.push({ severity: 'HIGH', rule: 'AMBIGUOUS_MATCH', message: `${s.ambiguousElements} ambiguous element(s) — transfer blocked until resolved.`, isolateIds: idsWhere((r) => r.status === DIFF_STATUS.AMBIGUOUS) });
  if (s.geometryChangedElements > 0) alerts.push({ severity: 'MEDIUM', rule: 'GEOMETRY_CONFLICT', message: `${s.geometryChangedElements} matched element(s) have geometry differences.`, isolateIds: idsWhere((r) => r.status === DIFF_STATUS.GEOMETRY_CHANGED) });
  if (s.lowConfidenceElements > 0) alerts.push({ severity: 'MEDIUM', rule: 'WEAK_MATCH', message: `${s.lowConfidenceElements} match(es) at LOW confidence.`, isolateIds: idsWhere((r) => r.confidence === 'LOW') });
  if (s.evidenceConflictElements > 0) alerts.push({ severity: 'MEDIUM', rule: 'EVIDENCE_CONFLICT', message: `${s.evidenceConflictElements} match(es) carry conflicting evidence.`, isolateIds: [] });
  if (s.missingInTarget > 0) alerts.push({ severity: 'MEDIUM', rule: 'MISSING_IN_TARGET', message: `${s.missingInTarget} source element(s) have no target counterpart.`, isolateIds: idsWhere((r) => r.status === DIFF_STATUS.MISSING_IN_TARGET) });
  const blockedRows = (state.plan?.rows ?? []).filter((r) => r.approval === APPROVAL_STATUS.BLOCKED);
  if (blockedRows.length) alerts.push({ severity: 'MEDIUM', rule: 'TRANSFER_BLOCKED', message: `${blockedRows.length} transfer row(s) blocked by rule/confidence gates.`, isolateIds: [...new Set(blockedRows.map((r) => r.targetObjectId))] });
  if (state.audit.pathAudit.unmatchedSourcePaths.length || state.audit.pathAudit.unmatchedTargetPaths.length) {
    alerts.push({ severity: 'LOW', rule: 'UNMATCHED_PATHS', message: `Unmatched paths — source: ${state.audit.pathAudit.unmatchedSourcePaths.length}, target: ${state.audit.pathAudit.unmatchedTargetPaths.length}.`, isolateIds: [] });
  }
  return alerts;
}

function alertsSection(state) {
  if (!state.audit) return '';
  const alerts = buildAlerts(state);
  if (!alerts.length) return '<section class="wb3d-card"><h3>Rule alerts</h3><p class="wb3d-muted">No rule alerts — clean compare.</p></section>';
  const rows = alerts.map((a, i) => `
    <li class="wb3d-alert-row wb3d-alert-${a.severity}">
      <span class="wb3d-badge">${esc(a.severity)}</span>
      <span class="wb3d-badge">${esc(a.rule)}</span>
      <span>${esc(a.message)}</span>
      ${a.isolateIds.length ? `<button class="wb3d-btn wb3d-btn-mini" data-action="isolate-ids" data-alert-index="${i}">Show in 3D (${a.isolateIds.length})</button>` : ''}
    </li>`).join('');
  return `<section class="wb3d-card"><h3>Rule alerts <span class="wb3d-muted">${alerts.length} active rule(s)</span></h3><ul class="wb3d-alerts">${rows}</ul></section>`;
}

/** Pivot/summary comparison: line/path × diff status matrix (function 9). */
function pivotSection(state) {
  if (!state.audit || !state.graphs) return '';
  const lineOf = new Map();
  for (const graph of [state.graphs.A, state.graphs.B]) {
    for (const object of graph.objects) lineOf.set(object.objectId, object.lineId || '(model)');
  }
  const statuses = [...new Set(state.audit.objectDiff.rows.map((r) => r.status))];
  const buckets = new Map(); // line -> status -> Set<objectId>
  for (const row of state.audit.objectDiff.rows) {
    for (const id of [row.sourceObjectId, row.targetObjectId]) {
      if (!id) continue;
      const line = lineOf.get(id) ?? '(model)';
      if (!buckets.has(line)) buckets.set(line, new Map());
      const perStatus = buckets.get(line);
      if (!perStatus.has(row.status)) perStatus.set(row.status, new Set());
      perStatus.get(row.status).add(id);
    }
  }
  const header = `<tr><th>Line / group</th>${statuses.map((s) => `<th>${esc(s)}</th>`).join('')}<th>Total</th></tr>`;
  const body = [...buckets.entries()].map(([line, perStatus]) => {
    let total = 0;
    const cells = statuses.map((status) => {
      const ids = perStatus.get(status);
      total += ids?.size ?? 0;
      return ids?.size
        ? `<td><button class="wb3d-link" data-action="isolate-pivot" data-line="${esc(line)}" data-status="${esc(status)}">${ids.size}</button></td>`
        : '<td class="wb3d-muted">—</td>';
    }).join('');
    return `<tr><td>${esc(line)}</td>${cells}<td>${total}</td></tr>`;
  }).join('');
  return `
  <details class="wb3d-card">
    <summary><h3>Pivot summary <span class="wb3d-muted">line × status; click a count to isolate in 3D</span></h3></summary>
    <div class="wb3d-table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>
  </details>`;
}

function legendHtml(state) {
  const styles = effectiveStatusStyles(state.settings, STATUS_STYLES);
  return Object.values(styles)
    .map((style) => `<span class="wb3d-legend-item"><i style="background:${style.colorHex};opacity:${style.alpha}"></i>${esc(style.label)}</span>`)
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
      <label>Connectors <select data-action="connector-mode">
        <option value="selection" selected>On selection</option>
        <option value="matches">All matches</option>
        <option value="candidates">All candidates</option>
        <option value="conflicts">Conflicts</option>
        <option value="transfer">Transfer</option>
        <option value="registration">Registration anchors</option>
        <option value="hidden">Hidden</option>
      </select></label>
      <label>Ghost opacity <input type="range" min="5" max="100" value="32" data-action="set-opacity"></label>
      ${settingsButtonHtml()}
      <span class="wb3d-seg" role="group" data-wb3d-panel-toggles>${panelToggleButtonsHtml(state)}</span>
    </div>
    <div data-wb3d-settings-host>${settingsPanelHtml(state, discoverPacketKinds(state.graphs?.A, state.graphs?.B), effectiveStatusStyles(state.settings, STATUS_STYLES))}</div>
    <div class="wb3d-viewer-row">
      <div class="wb3d-canvas-host" data-wb3d-canvas>
        <div class="wb3d-connector-tip" data-wb3d-connector-tip hidden></div>
        <div class="wb3d-connector-tip wb3d-hover-tip" data-wb3d-hover-tip hidden></div>
        <div class="wb3d-approval-overlay" data-wb3d-approval-overlay hidden></div>
        ${state.viewerError ? `<div class="wb3d-viewer-fallback">3D viewer unavailable: ${esc(state.viewerError)}<br>All compare data remains available in the tables below.</div>` : ''}
      </div>
      <aside class="wb3d-selection" data-wb3d-selection>${selectionPanelHtml(state)}</aside>
    </div>
    <div class="wb3d-legend">${legendHtml(state)}</div>
  </section>`;
}

function selectionPanelHtml(state) {
  if (!state.selection || !state.graphs) return '<p class="wb3d-muted">Click an element or node in the 3D view (or a table row) to inspect it.</p>';
  // Node selection: show the node-wise resolver panel.
  if (!state.selection.objectId && state.selection.nodeId) {
    const preferred = state.selection.modelId === 'target' ? ['B', 'A'] : ['A', 'B'];
    for (const side of preferred) {
      const info = state.nodeInfo?.[side]?.get(state.selection.nodeId);
      if (info) return `<div class="wb3d-badge">${side === 'A' ? 'source' : 'target'} node</div>${nodeInfoPanelHtml(info)}`;
    }
    return nodeInfoPanelHtml(null);
  }
  const { objectId } = state.selection;
  const graph = objectId.startsWith('source:') ? state.graphs.A : state.graphs.B;
  const object = graph.objects.find((o) => o.objectId === objectId);
  if (!object) return '<p class="wb3d-muted">Selection no longer exists (re-run compare?).</p>';
  const diffRow = state.audit?.objectDiff.rows.find((r) => r.sourceObjectId === objectId || r.targetObjectId === objectId);
  const counterpartId = diffRow ? (diffRow.sourceObjectId === objectId ? diffRow.targetObjectId : diffRow.sourceObjectId) : null;
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
    <h5>Blocks</h5>${blockInspectorHtml(object)}
    ${transferHtml ? `<h5>Transfer rows (before → after)</h5><ul class="wb3d-list">${transferHtml}</ul>` : ''}`;
}

/** Filtered rows for the three floating panels (+ unfiltered for chip rows). */
function floatingPanelRows(state) {
  const diffAll = objectDiffPanelRows(state.audit);
  const confAll = conflictPanelRows(state.audit);
  const approvalAll = approvalPanelRows(state.plan);
  const panels = state.settings.panels;
  return {
    objectDiff: applyPanelFilters(diffAll, panels.objectDiff),
    objectDiffUnfiltered: diffAll,
    conflicts: applyPanelFilters(confAll, panels.conflicts),
    conflictsUnfiltered: confAll,
    approval: approvalAll,
    approvalUnfiltered: approvalAll,
  };
}

/** ✓/✗ approval overlay over the canvas for the selected node object. */
function updateApprovalOverlay(container, state) {
  const overlay = container.querySelector('[data-wb3d-approval-overlay]');
  if (!overlay) return;
  const objectId = state.selection?.objectId;
  const eligible = objectId && state.viewer && state.audit && state.plan
    && state.plan.rows.some((r) => r.targetObjectId === objectId || r.sourceObjectId === objectId);
  if (!eligible) { overlay.hidden = true; return; }
  const diffRow = state.audit.objectDiff.rows.find((r) => r.sourceObjectId === objectId || r.targetObjectId === objectId);
  const targetId = diffRow?.targetObjectId;
  if (!targetId) { overlay.hidden = true; return; }
  const graph = targetId.startsWith('source:') ? state.graphs.A : state.graphs.B;
  const object = graph.objects.find((o) => o.objectId === targetId);
  const node = graph.nodes.find((n) => n.nodeId === object?.fromNode);
  if (!node) { overlay.hidden = true; return; }
  const screen = state.viewer.worldToScreen(node.coordMm);
  if (!screen) { overlay.hidden = true; return; }
  overlay.hidden = false;
  overlay.style.left = `${Math.round(screen.x)}px`;
  overlay.style.top = `${Math.round(screen.y - 34)}px`;
  overlay.innerHTML = `
    <button class="wb3d-btn wb3d-btn-mini" data-action="approve-element" data-object="${esc(targetId)}" data-approval="APPROVED" title="Approve all transfer rows for ${esc(stripModelPrefixLocal(targetId))}">✔</button>
    <button class="wb3d-btn wb3d-btn-mini" data-action="approve-element" data-object="${esc(targetId)}" data-approval="REJECTED" title="Reject all transfer rows">✖</button>`;
}

function stripModelPrefixLocal(id) {
  return String(id ?? '').replace(/^(source|target):/, '');
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
  const compareView = `
    ${importSection(state)}
    <div data-wb3d-dashboard>${dashboardSection(state)}</div>
    <div data-wb3d-alerts>${alertsSection(state)}</div>
    ${viewerSection(state)}
    <div data-wb3d-pivot>${pivotSection(state)}</div>
    <div data-wb3d-hierarchy>${hierarchySection(state)}</div>
    <div data-wb3d-tables>${tablesSection(state)}</div>
    <div data-wb3d-transfer>${transferSection(state)}</div>
    <div data-wb3d-export>${exportSection(state)}</div>`;
  return `
  <div class="wb3d-root">
    <header class="wb3d-header">
      <div>
        <h2>3D Data Compare Workbench</h2>
        <p class="wb3d-muted">Variance-first structured compare: canonical graph → match engine → 3D diff → conflict resolution → approved transfer → audited export.</p>
      </div>
      <div class="wb3d-seg" role="group">
        <button class="wb3d-btn ${state.activeView === 'compare' ? 'is-active' : ''}" data-action="set-active-view" data-view="compare">Compare</button>
        <button class="wb3d-btn ${state.activeView === 'table-to-xml' ? 'is-active' : ''}" data-action="set-active-view" data-view="table-to-xml">Table to XML</button>
      </div>
    </header>
    <div class="wb3d-status" data-wb3d-status>${esc(state.status)}</div>
    ${state.activeView === 'table-to-xml' ? tableToXmlSection(state, state.settings.tablexml.customRules) : compareView}
    <div class="wb3d-panels-layer" data-wb3d-panels>${state.audit ? floatingPanelsHtml(state, floatingPanelRows(state)) : ''}</div>
  </div>`;
}

function setStatus(container, state, message) {
  state.status = message;
  const el = container.querySelector('[data-wb3d-status]');
  if (el) el.textContent = message;
}

function refreshDerivedSections(container, state) {
  const set = (selector, html) => {
    const el = container.querySelector(selector);
    if (el) el.innerHTML = html;
  };
  set('[data-wb3d-dashboard]', dashboardSection(state));
  set('[data-wb3d-alerts]', alertsSection(state));
  set('[data-wb3d-pivot]', pivotSection(state));
  set('[data-wb3d-hierarchy]', hierarchySection(state));
  set('[data-wb3d-tables]', tablesSection(state));
  set('[data-wb3d-transfer]', transferSection(state));
  set('[data-wb3d-export]', exportSection(state));
  set('[data-wb3d-selection]', selectionPanelHtml(state));
  set('[data-wb3d-settings-host]', settingsPanelHtml(state, discoverPacketKinds(state.graphs?.A, state.graphs?.B), effectiveStatusStyles(state.settings, STATUS_STYLES)));
  set('[data-wb3d-panels]', state.audit ? floatingPanelsHtml(state, floatingPanelRows(state)) : '');
  const toggles = container.querySelector('[data-wb3d-panel-toggles]');
  if (toggles) toggles.innerHTML = panelToggleButtonsHtml(state);
  const legend = container.querySelector('.wb3d-legend');
  if (legend) legend.innerHTML = legendHtml(state);
  updateApprovalOverlay(container, state);
}

function refreshTablexmlSection(container, state) {
  const host = container.querySelector('[data-wb3d-tablexml]');
  if (!host) return;
  host.outerHTML = tableToXmlSection(state, state.settings.tablexml.customRules);
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
  const placeTip = (tip, event) => {
    const hostRect = tip.parentElement.getBoundingClientRect();
    tip.style.left = `${Math.min(event.clientX - hostRect.left + 12, hostRect.width - 260)}px`;
    tip.style.top = `${event.clientY - hostRect.top + 12}px`;
  };
  try {
    state.viewer = await createWorkbenchViewer(host, {
      onPick: (pick) => {
        state.selection = pick;
        if (pick.objectId) state.viewer?.setSelection(pick.objectId, relatedIdsFor(state, pick.objectId));
        else state.viewer?.setSelection(null);
        const panel = container.querySelector('[data-wb3d-selection]');
        if (panel) panel.innerHTML = selectionPanelHtml(state);
        updateApprovalOverlay(container, state);
      },
      onHoverConnector: (connector, event) => {
        const tip = container.querySelector('[data-wb3d-connector-tip]');
        if (!tip) return;
        if (!connector) { tip.hidden = true; return; }
        tip.hidden = false;
        tip.textContent = `${connector.type} · ${connector.status ?? ''} · ${connector.reason} · audit ${connector.auditRowId}`;
        placeTip(tip, event);
      },
      onHoverObject: (hover, event) => {
        const tip = container.querySelector('[data-wb3d-hover-tip]');
        if (!tip) return;
        if (!hover || (!hover.objectId && !hover.nodeId)) { tip.hidden = true; return; }
        let lines = [];
        if (hover.objectId) {
          lines = objectHoverTooltipLines(state.audit, state.graphs, hover.objectId, state.settings);
          if (hover.fallback) lines.push('⚠ marker placement fell back to midpoint (unknown NODE)');
        } else {
          const info = state.nodeInfo?.[hover.modelId === 'target' ? 'B' : 'A']?.get(hover.nodeId);
          lines = info
            ? [`Node ${info.nodeId} (${info.anchorType})`, `[${info.coordMm.map((v) => Number(v).toFixed(0)).join(', ')}] mm`, ...info.packets.filter((p) => packetKindVisible(state.settings, p.kind)).map((p) => `${p.kind} via ${p.resolvedBy}`)]
            : [`Node ${hover.nodeId}`];
        }
        if (!lines.length) { tip.hidden = true; return; }
        tip.hidden = false;
        tip.innerHTML = lines.map((l) => `<div>${esc(l)}</div>`).join('');
        placeTip(tip, event);
      },
      onCameraChange: () => updateApprovalOverlay(container, state),
    });
  } catch (error) {
    state.viewerError = String(error?.message || error);
    host.innerHTML = `<div class="wb3d-viewer-fallback">3D viewer unavailable: ${esc(state.viewerError)}<br>All compare data remains available in the tables below.</div>`;
  }
}

function pushModelsToViewer(state, { fit = true } = {}) {
  if (!state.viewer || !state.visuals) return;
  state.viewer.setStatusStyles(effectiveStatusStyles(state.settings, STATUS_STYLES));
  state.viewer.setModels({
    source: state.visuals.A,
    target: state.visuals.B,
    registrationTranslation: state.audit?.registration.translationMm ?? [0, 0, 0],
  });
  state.viewer.setStatuses(statusMapForViewer(state));
  state.viewer.setColorOverrides(buildHeatmapOverrides(state.audit, state.settings));
  state.viewer.setStatusFilter(state.statusFilter);
  pushConnectors(state);
  if (fit) state.viewer.fitAll();
}

/** Single funnel for every settings change: persist → viewer → sections. */
function applySettings(container, state) {
  state.settings = normalizeSettings(state.settings);
  saveSettings(globalThis.localStorage, state.settings);
  if (state.graphs) rebuildVisuals(state);
  pushModelsToViewer(state, { fit: false });
  refreshDerivedSections(container, state);
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

function renderView(container, state) {
  container.innerHTML = fullHtml(state);
  ensureViewer(container, state).then(() => pushModelsToViewer(state, { fit: false }));
}

/** Settings changes are debounced (color/range inputs fire rapidly). */
function queueApplySettings(container, state) {
  clearTimeout(state.__settingsTimer);
  state.__settingsTimer = setTimeout(() => applySettings(container, state), 150);
}

function bindHandlers(container) {
  const state = () => ensureState(container);

  const rerunCompare = () => {
    const s = state();
    try {
      runComparePipeline(s);
      refreshDerivedSections(container, s);
      setStatus(container, s, s.status);
      pushModelsToViewer(s);
    } catch (error) {
      setStatus(container, s, `Compare failed: ${error?.message || error}`);
    }
  };

  attachFloatingPanelDrag(container, (panelId, x, y) => {
    const s = state();
    s.settings.panels[panelId].x = x;
    s.settings.panels[panelId].y = y;
    saveSettings(globalThis.localStorage, s.settings);
  });

  container.addEventListener('input', (event) => {
    const s = state();
    const field = event.target.dataset?.field;
    if (field) s[field] = event.target.value;
    const config = event.target.dataset?.config;
    if (config) {
      s.config[config] = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
    }
    const transferConfig = event.target.dataset?.transferConfig;
    if (transferConfig) s.transferConfig[transferConfig] = event.target.value;
    if (event.target.dataset?.action === 'connector-mode') s.viewer?.setConnectorMode(event.target.value);

    // ── settings panel inputs ──────────────────────────────────────────
    const el = event.target;
    if (el.dataset?.settingColor) {
      const status = el.dataset.settingColor;
      s.settings.statusStyles[status] = { ...s.settings.statusStyles[status], color: el.value };
      queueApplySettings(container, s);
    }
    if (el.dataset?.settingAlpha) {
      const status = el.dataset.settingAlpha;
      s.settings.statusStyles[status] = { ...s.settings.statusStyles[status], alpha: Number(el.value) / 100 };
      queueApplySettings(container, s);
    }
    if (el.dataset?.settingPacketKind) {
      const kind = el.dataset.settingPacketKind;
      const current = Array.isArray(s.settings.tooltipPacketKinds) ? s.settings.tooltipPacketKinds : discoverPacketKinds(s.graphs?.A, s.graphs?.B);
      s.settings.tooltipPacketKinds = el.checked ? [...new Set([...current, kind])] : current.filter((k) => k !== kind);
      queueApplySettings(container, s);
    }
    const setting = el.dataset?.setting;
    if (setting === 'packetKindsAll') {
      s.settings.tooltipPacketKinds = el.checked ? null : discoverPacketKinds(s.graphs?.A, s.graphs?.B);
      queueApplySettings(container, s);
    } else if (setting === 'markerPlacement') {
      s.settings.markerPlacement = el.value;
      queueApplySettings(container, s);
    } else if (setting === 'showAllNodes') {
      s.settings.showAllNodes = el.checked;
      queueApplySettings(container, s);
    } else if (setting === 'nodeMarkerSizeMm') {
      s.settings.nodeMarkerSizeMm = Number(el.value);
      queueApplySettings(container, s);
    } else if (setting === 'heatmapEnabled') {
      s.settings.heatmap.enabled = el.checked;
      queueApplySettings(container, s);
    } else if (setting === 'heatmapMaxDeltaMm') {
      s.settings.heatmap.maxDeltaMm = Number(el.value);
      queueApplySettings(container, s);
    }

    // ── table-to-xml inputs ────────────────────────────────────────────
    if (s.activeView === 'table-to-xml') {
      if (handleTableToXmlInput(s, el)) {
        refreshTablexmlSection(container, s);
      } else if (el.matches?.('[data-txml-text]')) {
        // Auto-parse after paste (debounced; only on paste-sized changes so
        // hand-editing doesn't lose focus to a re-render).
        clearTimeout(s.__txmlParseTimer);
        s.__txmlParseTimer = setTimeout(() => {
          try {
            if (autoParseActiveTable(s)) refreshTablexmlSection(container, s);
          } catch (error) {
            setStatus(container, s, `Table parse failed: ${error?.message || error}`);
          }
        }, 600);
      }
    }
  });

  container.addEventListener('change', async (event) => {
    const s = state();
    if (event.target.matches?.('[data-txml-file]')) {
      if (await handleTableToXmlFile(s, event.target)) refreshTablexmlSection(container, s);
      return;
    }
    if (event.target.dataset?.action !== 'load-file') return;
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (event.target.dataset.side === 'source') { s.sourceXml = text; s.sourceName = file.name; }
    else { s.targetXml = text; s.targetName = file.name; }
    s.status = `Loaded ${file.name} (${Math.round(text.length / 1024)} KB) as ${event.target.dataset.side}.`;
    renderView(container, s);
  });

  container.addEventListener('click', (event) => {
    const state = ensureState(container);
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
      state.viewer?.setSelection(objectId, relatedIdsFor(state, objectId));
      state.viewer?.fitObject(objectId);
      updateApprovalOverlay(container, state);
    }

    if (action === 'isolate-ids') {
      const alert = buildAlerts(state)[Number(btn.dataset.alertIndex)];
      if (alert?.isolateIds.length) state.viewer?.isolate(new Set(alert.isolateIds));
    }

    if (action === 'isolate-pivot') {
      const line = btn.dataset.line;
      const status = btn.dataset.status;
      const lineOf = new Map();
      for (const graph of [state.graphs.A, state.graphs.B]) {
        for (const object of graph.objects) lineOf.set(object.objectId, object.lineId || '(model)');
      }
      const ids = new Set();
      for (const row of state.audit.objectDiff.rows) {
        if (row.status !== status) continue;
        for (const id of [row.sourceObjectId, row.targetObjectId]) {
          if (id && lineOf.get(id) === line) ids.add(id);
        }
      }
      if (ids.size) state.viewer?.isolate(ids);
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
      pushConnectors(state);
      setStatus(container, state, `Transfer plan: ${state.plan.summary.totalRows} row(s), ${state.plan.summary.blockedRows} blocked.`);
    }
    if (action === 'batch-approve' && state.plan) {
      batchApprove(state.plan, state.transferConfig.minConfidence);
      refreshDerivedSections(container, state);
      pushConnectors(state);
      setStatus(container, state, `Batch approved: ${state.plan.summary.approvedRows} row(s) now approved.`);
    }
    if ((action === 'approve-row' || action === 'reject-row') && state.plan) {
      const row = state.plan.rows.find((r) => r.rowId === btn.dataset.row);
      if (row && row.approval !== APPROVAL_STATUS.BLOCKED) {
        row.approval = action === 'approve-row' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
        refreshTransferSummary(state.plan);
        refreshDerivedSections(container, state);
        pushConnectors(state);
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

    // ── view switcher ──────────────────────────────────────────────────
    if (action === 'set-active-view') {
      state.activeView = btn.dataset.view;
      renderView(container, state);
    }

    // ── settings panel ─────────────────────────────────────────────────
    if (action === 'toggle-settings') {
      state.settingsOpen = !state.settingsOpen;
      refreshDerivedSections(container, state);
    }
    if (action === 'reset-settings') {
      state.settings = normalizeSettings(null);
      applySettings(container, state);
    }

    // ── floating panels ────────────────────────────────────────────────
    if (action === 'toggle-panel') {
      const cfg = state.settings.panels[btn.dataset.panel];
      cfg.open = !cfg.open;
      saveSettings(globalThis.localStorage, state.settings);
      refreshDerivedSections(container, state);
    }
    if (action === 'panel-collapse') {
      const cfg = state.settings.panels[btn.dataset.panel];
      cfg.collapsed = !cfg.collapsed;
      saveSettings(globalThis.localStorage, state.settings);
      refreshDerivedSections(container, state);
    }
    if (action === 'panel-colpicker') {
      state.panelColumnPicker = state.panelColumnPicker === btn.dataset.panel ? null : btn.dataset.panel;
      refreshDerivedSections(container, state);
    }
    if (action === 'panel-column') {
      const cfg = state.settings.panels[btn.dataset.panel];
      const column = btn.dataset.column;
      cfg.columns = cfg.columns.includes(column) ? cfg.columns.filter((c) => c !== column) : [...cfg.columns, column];
      if (!cfg.columns.length) cfg.columns = [column];
      saveSettings(globalThis.localStorage, state.settings);
      refreshDerivedSections(container, state);
    }
    if (action === 'panel-filter') {
      const cfg = state.settings.panels[btn.dataset.panel];
      const key = btn.dataset.filter;
      const value = btn.dataset.value;
      cfg[key] = cfg[key].includes(value) ? cfg[key].filter((v) => v !== value) : [...cfg[key], value];
      saveSettings(globalThis.localStorage, state.settings);
      refreshDerivedSections(container, state);
    }

    // ── element-level approval override (panel 3 + canvas ✓/✗ overlay) ──
    if (action === 'approve-element' && state.plan) {
      const targetId = btn.dataset.object;
      const approval = btn.dataset.approval === 'REJECTED' ? APPROVAL_STATUS.REJECTED : APPROVAL_STATUS.APPROVED;
      let touched = 0;
      for (const row of state.plan.rows) {
        if (row.targetObjectId !== targetId || row.approval === APPROVAL_STATUS.BLOCKED) continue;
        row.approval = approval;
        touched += 1;
      }
      refreshTransferSummary(state.plan);
      refreshDerivedSections(container, state);
      pushConnectors(state);
      setStatus(container, state, `Approval override: ${touched} row(s) for ${stripModelPrefixLocal(targetId)} set to ${approval}.`);
    }

    // ── table-to-xml actions ───────────────────────────────────────────
    if (action?.startsWith('txml-')) {
      if (action === 'txml-load-compare') {
        const tx = ensureTablexmlState(state);
        const table = tx.tables[tx.active];
        if (!table.xml) return;
        if (tx.active === 'source') { state.sourceXml = table.xml; state.sourceName = 'table-1-nodeset.xml'; }
        else { state.targetXml = table.xml; state.targetName = 'table-2-nodeset.xml'; }
        const bothLoaded = /nodeset\/v1/.test(state.sourceXml) && /nodeset\/v1/.test(state.targetXml);
        state.activeView = 'compare';
        state.status = `Loaded generated NodeSet XML as ${tx.active}.${bothLoaded ? ' Both sides ready — running node compare…' : ' Generate/load the other side, then run compare.'}`;
        renderView(container, state);
        if (bothLoaded) rerunCompare();
        return;
      }
      try {
        if (handleTableToXmlClick(state, btn, state.settings.tablexml.customRules)) {
          refreshTablexmlSection(container, state);
        }
      } catch (error) {
        setStatus(container, state, `Table to XML failed: ${error?.message || error}`);
      }
    }
  });
}

export function renderWorkbench3dTab(container) {
  const state = ensureState(container);
  renderView(container, state);
  if (!container.__wb3dBound) {
    bindHandlers(container);
    container.__wb3dBound = true;
  }
  return () => {
    state.viewer?.dispose();
    state.viewer = null;
  };
}

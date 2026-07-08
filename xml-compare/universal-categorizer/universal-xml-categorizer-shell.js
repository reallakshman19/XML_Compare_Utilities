import { createLinewiseUniversalPreset, summarizeUniversalProfile } from './universal-xml-categorizer-contracts.js';
import { createLinewiseUniversalAttachmentPreviewModel } from './universal-attachment-preview.js';
import { createLinewiseUniversalCategorizedGraphPreview } from './universal-graph-builder.js';
import { evaluateUniversalXmlExportGate } from './universal-export-gate.js';

export const UNIVERSAL_XML_CATEGORIZER_SHELL_SCHEMA = 'universal-xml-categorizer-shell/v1-shadow';
export const UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR = 'data-xml-compare-universal-categorizer-open';
export const UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR = 'data-xml-compare-universal-categorizer-popup';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function renderUniversalXmlCategorizerButtonHtml() {
  return `<button type="button" class="xml-compare-universal-categorizer-btn" ${UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR}>Universal XML Categorizer</button>`;
}

export function renderUniversalXmlCategorizerShellHtml(profile = createLinewiseUniversalPreset()) {
  const p = profile || createLinewiseUniversalPreset();
  const summary = summarizeUniversalProfile(p);
  const previewModel = createLinewiseUniversalAttachmentPreviewModel(p);
  const graphPreview = createLinewiseUniversalCategorizedGraphPreview(p);
  const exportGate = evaluateUniversalXmlExportGate({ graph: graphPreview });
  return `<div class="universal-xml-categorizer-backdrop" ${UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR}>${styleHtml()}<section class="universal-xml-categorizer-dialog" role="dialog" aria-modal="true" aria-label="Universal XML Categorizer"><header class="uxc-hero"><div class="uxc-hero-title"><span class="uxc-eyebrow">Universal Categorizer Workspace</span><h3>Build a governed XML / table hierarchy</h3><p>Define sources, attach sideload data, preview the categorized graph, and keep export locked until graph proof is approved. Existing Line-wise and Table-to-Categorized workflows remain unchanged.</p></div><div class="uxc-hero-actions"><span class="uxc-status-chip is-shadow">Shadow mode</span><span class="uxc-status-chip is-locked">Export locked</span><button type="button" data-universal-categorizer-close>Close</button></div></header>${workflowRailHtml()}${summaryHtml(summary, graphPreview, exportGate)}<main class="uxc-workspace"><section class="uxc-workspace-column is-left">${recipeMapHtml(p)}${sourceRegistryHtml(previewModel.registry)}</section><section class="uxc-workspace-column is-right">${sideloadHtml(p, previewModel.preview)}${attachmentPreviewHtml(previewModel.preview)}${graphPreviewHtml(graphPreview)}${exportGateHtml(exportGate)}</section>${boundaryHtml()}</main></section></div>`;
}

function workflowRailHtml() {
  const steps = [
    ['01', 'Source Registry', 'Normalize primary XML and sideload tables'],
    ['02', 'Attachment Rules', 'Map source keys into graph levels and blocks'],
    ['03', 'Graph Preview', 'Build CategorizedGraph.v1 in shadow mode'],
    ['04', 'Export Gate', 'Keep XML output locked until proof approval'],
  ];
  return `<nav class="uxc-step-rail" aria-label="Universal Categorizer workflow">${steps.map(([number, title, caption]) => `<div class="uxc-step"><b>${esc(number)}</b><span>${esc(title)}</span><small>${esc(caption)}</small></div>`).join('')}</nav>`;
}

function summaryHtml(summary, graph, exportGate) {
  const cards = [
    ['Sources', summary.sources, 'Registered inputs'],
    ['Sideloads', summary.sideloadSources, 'External enrichers'],
    ['Levels', summary.levels, 'Hierarchy depth'],
    ['Graph nodes', graph.summary.nodes, 'Preview output'],
    ['Export', exportGate.blocked ? 'Locked' : 'Open', exportGate.status],
  ];
  return `<section class="uxc-readiness-strip" aria-label="Universal Categorizer readiness summary">${cards.map(([label, value, note]) => `<article><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(note)}</span></article>`).join('')}</section>`;
}

function recipeMapHtml(profile) {
  return `<section class="uxc-panel uxc-recipe-map"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Hierarchy design</span><h4>Structure Recipe Builder bridge</h4></div><span class="uxc-status-chip">Graph-first</span></div><p>The future editable builder owns the hierarchy. This preview shows the level/block structure before any XML export is allowed.</p><div class="uxc-tree">${rootLevels(profile).map((level) => levelRow(level, profile, 0)).join('')}</div></section>`;
}

function levelRow(level, profile, depth) {
  const children = (level.children || []).map((id) => profile.levelDefinitions.find((item) => item.levelId === id)).filter(Boolean);
  return `<div class="uxc-level" data-depth="${depth}"><div><b>${esc(level.displayName)}</b><small>${esc(level.levelId)}</small></div><em>${esc(blocksFor(profile, level.levelId).join(', ') || 'No blocks yet')}</em></div>${children.map((child) => levelRow(child, profile, depth + 1)).join('')}`;
}

function rootLevels(profile) {
  const referenced = new Set(profile.levelDefinitions.flatMap((level) => level.children || []));
  const roots = profile.levelDefinitions.filter((level) => !referenced.has(level.levelId));
  return roots.length ? roots : profile.levelDefinitions;
}

function blocksFor(profile, levelId) {
  return profile.blockDefinitions.filter((block) => block.attachToLevelId === levelId).map((block) => block.blockName);
}

function sourceRegistryHtml(registry) {
  const rows = registry.sources.map((source) => `<tr><td><b>${esc(source.sourceId)}</b><small>${esc(source.displayName || source.sourceKind)}</small></td><td>${statusPill(source.role)}</td><td>${esc(source.requiredColumns.join(', ') || '—')}</td><td>${source.missingRequiredColumns.length ? `<span class="uxc-pill is-warn">${esc(source.missingRequiredColumns.join(', '))}</span>` : '<span class="uxc-pill is-ok">Ready</span>'}</td><td>${esc(source.rowCount)}</td></tr>`).join('');
  return `<section class="uxc-panel"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Input readiness</span><h4>Universal source registry</h4></div><span class="uxc-status-chip">${esc(registry.sources.length)} sources</span></div><p>Primary and sideload sources are normalized before graph build. Missing columns stay diagnostic-only.</p><table><thead><tr><th>Source</th><th>Role</th><th>Required columns</th><th>Status</th><th>Rows</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function sideloadHtml(profile, preview) {
  const previewByRule = Object.fromEntries((preview?.rules || []).map((rule) => [rule.ruleId, rule]));
  const rows = profile.sideloadAttachments.map((rule) => {
    const rulePreview = previewByRule[rule.ruleId];
    return `<tr><td><b>${esc(rule.sourceId)}</b><small>${esc(rule.ruleId)}</small></td><td>${esc(rule.attachToLevelId)}</td><td>${esc(rule.blockName)}</td><td><code>${esc(rule.sourceKey)}</code></td><td><span class="uxc-pill is-ok">${esc(rulePreview?.matchedCount ?? 0)} matched</span></td><td>${rulePreview?.missingTargetRows?.length ? `<span class="uxc-pill is-warn">${esc(rulePreview.missingTargetRows.length)} missing</span>` : '<span class="uxc-pill">0 missing</span>'}</td></tr>`;
  }).join('');
  return `<section class="uxc-panel"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Sideload orchestration</span><h4>Attachment rules</h4></div><span class="uxc-status-chip">Preview only</span></div><p>Each sideload source is mapped to a graph level and block through explicit keys, not hardcoded text areas.</p><table><thead><tr><th>Source / rule</th><th>Level</th><th>Block</th><th>Source key</th><th>Match</th><th>Missing target</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function attachmentPreviewHtml(preview) {
  const rows = preview.rules.map((rule) => `<tr><td><b>${esc(rule.ruleId)}</b></td><td>${esc(rule.targetLevel.displayName || rule.targetLevelId)}</td><td>${esc(rule.targetBlock.blockName)}</td><td>${esc(rule.matchedCount)}</td><td>${esc(rule.unmatchedSourceRows.length)}</td><td>${esc(rule.missingTargetRows.length)}</td><td>${esc(rule.targetRowsWithoutSource.length)}</td></tr>`).join('');
  return `<section class="uxc-panel"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Match diagnostics</span><h4>Attachment preview</h4></div><span class="uxc-status-chip">No mutation</span></div><p>Preview matched rows, source rows without keys, source rows with missing targets, and existing target rows without source matches.</p><table><thead><tr><th>Rule</th><th>Target level</th><th>Target block</th><th>Matched</th><th>No key</th><th>Missing</th><th>Target only</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function graphPreviewHtml(graph) {
  const rows = graph.nodes.map((node) => `<tr><td><b>${esc(node.nodeId)}</b></td><td>${esc(node.levelId)}</td><td><code>${esc(node.key)}</code></td><td>${esc(Object.keys(node.blocks || {}).join(', ') || '—')}</td><td>${esc(Object.values(node.blocks || {}).reduce((sum, block) => sum + (block.attachments?.length || 0), 0))}</td></tr>`).join('');
  return `<section class="uxc-panel is-feature"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Graph result</span><h4>CategorizedGraph.v1 preview</h4></div><span class="uxc-status-chip is-shadow">${esc(graph.exportStatus)}</span></div><div class="uxc-metric-grid"><div><b>${esc(graph.summary.nodes)}</b><small>Graph nodes</small></div><div><b>${esc(graph.summary.blocks)}</b><small>Blocks</small></div><div><b>${esc(graph.summary.sideloadAttachments)}</b><small>Sideload attachments</small></div><div><b>${esc(graph.summary.diagnostics)}</b><small>Diagnostics</small></div></div><table><thead><tr><th>Node</th><th>Level</th><th>Key</th><th>Blocks</th><th>Attachments</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function exportGateHtml(gate) {
  return `<section class="uxc-panel is-export-gate"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Controlled output</span><h4>XML export gate</h4></div><span class="uxc-status-chip is-locked">${esc(gate.status)}</span></div><p>${esc(gate.reason)}</p><div class="uxc-gate-card"><b>Export is locked</b><span>Allowed: ${esc(gate.allowed)}</span><span>Blocked: ${esc(gate.blocked)}</span><span>Graph signature: ${esc(gate.graphSignature || 'pending')}</span></div></section>`;
}

function boundaryHtml() {
  return `<section class="uxc-panel is-boundary"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Safety boundary</span><h4>Shadow-mode boundary</h4></div><span class="uxc-status-chip is-locked">No production side effects</span></div><ul><li>No existing converter, sideload, enrichment, XML export, pivot, or canvas module is changed.</li><li>This workspace proves source registry, attachment preview, graph preview, deterministic proof, and export gate in shadow mode only.</li><li>Next approval point: editable recipe builder and deterministic graph parity review.</li></ul></section>`;
}

function statusPill(value) {
  const normalized = String(value || '').toLowerCase();
  const className = normalized === 'primary' ? 'uxc-pill is-primary' : normalized === 'sideload' ? 'uxc-pill is-accent' : 'uxc-pill';
  return `<span class="${className}">${esc(value)}</span>`;
}

function styleHtml() {
  return `<style data-universal-categorizer-style>.universal-xml-categorizer-backdrop{position:fixed;inset:0;z-index:74;background:radial-gradient(circle at top left,rgba(79,70,229,.28),transparent 34%),rgba(2,6,23,.78);display:grid;place-items:center;padding:14px}.universal-xml-categorizer-dialog{width:min(1240px,100%);height:min(860px,100%);display:grid;grid-template-rows:auto auto auto 1fr;border:1px solid rgba(148,163,184,.28);border-radius:22px;background:linear-gradient(180deg,#0f172a,#111827);color:#dbeafe;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.45)}.uxc-hero{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(148,163,184,.16);background:linear-gradient(135deg,rgba(30,41,59,.96),rgba(30,27,75,.78))}.uxc-eyebrow,.uxc-panel-kicker{display:block;margin-bottom:5px;color:#93c5fd;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:900}.uxc-hero h3,.uxc-panel h4{margin:0;color:#f8fafc}.uxc-hero h3{font-size:24px}.uxc-hero p,.uxc-panel p,.uxc-panel li,.uxc-panel small,.uxc-step small,.uxc-readiness-strip span{color:#94a3b8}.uxc-hero-actions{display:flex;align-items:flex-start;justify-content:flex-end;gap:8px;flex-wrap:wrap}.uxc-hero-actions button{border:1px solid rgba(191,219,254,.28);border-radius:12px;background:#020617;color:#e0f2fe;padding:9px 13px;font-weight:900}.uxc-status-chip,.uxc-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(148,163,184,.24);border-radius:999px;background:rgba(15,23,42,.82);color:#dbeafe;padding:5px 9px;font-size:11px;font-weight:900;white-space:nowrap}.uxc-status-chip.is-shadow,.uxc-pill.is-primary{border-color:rgba(96,165,250,.36);background:rgba(37,99,235,.18);color:#bfdbfe}.uxc-status-chip.is-locked,.uxc-pill.is-warn{border-color:rgba(251,191,36,.42);background:rgba(120,53,15,.28);color:#fde68a}.uxc-pill.is-ok{border-color:rgba(34,197,94,.38);background:rgba(20,83,45,.24);color:#bbf7d0}.uxc-pill.is-accent{border-color:rgba(167,139,250,.38);background:rgba(88,28,135,.24);color:#ddd6fe}.uxc-step-rail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px 18px;border-bottom:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36)}.uxc-step{display:grid;grid-template-columns:auto 1fr;gap:2px 9px;align-items:start;border:1px solid rgba(148,163,184,.16);border-radius:14px;background:rgba(15,23,42,.62);padding:10px}.uxc-step b{grid-row:1/3;display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:rgba(37,99,235,.2);color:#bfdbfe}.uxc-step span{color:#e5e7eb;font-weight:900}.uxc-readiness-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:12px 18px;border-bottom:1px solid rgba(148,163,184,.12)}.uxc-readiness-strip article,.uxc-metric-grid div{border:1px solid rgba(148,163,184,.16);border-radius:16px;background:rgba(15,23,42,.58);padding:12px}.uxc-readiness-strip small,.uxc-readiness-strip b,.uxc-readiness-strip span,.uxc-metric-grid b,.uxc-metric-grid small{display:block}.uxc-readiness-strip b,.uxc-metric-grid b{margin:4px 0;color:#f8fafc;font-size:22px}.uxc-workspace{display:grid;grid-template-columns:minmax(360px,.86fr) minmax(520px,1.14fr);gap:14px;padding:16px 18px;overflow:auto}.uxc-workspace-column{display:grid;gap:14px;align-content:start}.uxc-panel{border:1px solid rgba(148,163,184,.18);border-radius:18px;background:rgba(15,23,42,.72);padding:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}.uxc-panel.is-feature{border-color:rgba(96,165,250,.28);background:linear-gradient(180deg,rgba(30,41,59,.82),rgba(15,23,42,.72))}.uxc-panel.is-export-gate{border-color:rgba(251,191,36,.32);background:linear-gradient(180deg,rgba(69,26,3,.32),rgba(15,23,42,.76))}.uxc-panel.is-boundary{grid-column:1/-1}.uxc-panel-heading{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px}.uxc-tree{display:grid;gap:8px;margin-top:12px}.uxc-level{display:flex;justify-content:space-between;gap:10px;border-left:3px solid #60a5fa;border-radius:12px;background:rgba(2,6,23,.38);padding:9px 10px;margin-left:calc(var(--depth,0)*14px)}.uxc-level[data-depth="1"]{margin-left:18px;border-left-color:#a78bfa}.uxc-level[data-depth="2"]{margin-left:36px;border-left-color:#22c55e}.uxc-level[data-depth="3"]{margin-left:54px}.uxc-level b,.uxc-level small{display:block}.uxc-level em{color:#c4b5fd;font-style:normal;font-size:12px}.uxc-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.uxc-gate-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;border:1px solid rgba(251,191,36,.28);border-radius:14px;background:rgba(2,6,23,.38);padding:12px}.uxc-gate-card b{grid-column:1/-1;color:#fde68a}.uxc-gate-card span{color:#e5e7eb;font-size:12px}.universal-xml-categorizer-dialog table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;overflow:hidden;border-radius:12px}.universal-xml-categorizer-dialog th{background:rgba(30,41,59,.88);color:#bfdbfe;text-transform:uppercase;letter-spacing:.06em;font-size:10px}.universal-xml-categorizer-dialog th,.universal-xml-categorizer-dialog td{border-bottom:1px solid rgba(148,163,184,.12);padding:8px;text-align:left;vertical-align:top}.universal-xml-categorizer-dialog td small,.universal-xml-categorizer-dialog td b{display:block}.universal-xml-categorizer-dialog code{color:#bfdbfe}@media(max-width:980px){.uxc-hero,.uxc-workspace{grid-template-columns:1fr;display:grid}.uxc-step-rail,.uxc-readiness-strip,.uxc-metric-grid{grid-template-columns:1fr 1fr}.uxc-workspace{grid-template-columns:1fr}.uxc-gate-card{grid-template-columns:1fr}}@media(max-width:620px){.uxc-step-rail,.uxc-readiness-strip,.uxc-metric-grid{grid-template-columns:1fr}.uxc-hero{padding:16px}}</style>`;
}

export const _test = Object.freeze({ workflowRailHtml, summaryHtml, recipeMapHtml, sourceRegistryHtml, sideloadHtml, attachmentPreviewHtml, graphPreviewHtml, exportGateHtml, boundaryHtml });

import { pivotViewIdentity, treeViewIdentity } from './universal-viewport-state.js';

const arr = (value) => Array.isArray(value) ? value : [];
const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function modeButtons(model) {
  return model.modes.map((mode) => `<button type="button" role="tab" data-uxc-mode="${mode.id}" aria-selected="${model.mode === mode.id}" class="${model.mode === mode.id ? 'is-active' : ''}">${esc(mode.label)}</button>`).join('');
}

export function renderUniversalViewportActions(model) {
  return model.shell.actions.map((action) => `<button type="button" data-uxc-view-action="${esc(action.id)}">${esc(action.label)}</button>`).join('');
}

function treeRows(tree, state) {
  return arr(tree.nodes).map((node) => {
    const id = treeViewIdentity(node);
    const selected = state.selectedTreeId === id;
    const matched = state.selectionIndex.pivotByTree[id]?.includes(state.selectedPivotId);
    const className = selected ? 'is-selected' : matched ? 'is-related' : '';
    return `<button type="button" class="uxc-tree-row ${className}" data-uxc-tree-id="${esc(id)}" data-depth="${esc(node.depth)}" style="--uxc-depth:${Number(node.depth) || 0}" aria-pressed="${selected}"><span>${esc(node.level)}</span><b>${esc(node.label)}</b><small>${esc(node.key || 'root')}</small></button>`;
  }).join('');
}

function pivotRows(pivot, state) {
  return arr(pivot.rows).map((row, index) => {
    const id = pivotViewIdentity(row, index);
    const selected = state.selectedPivotId === id;
    const matched = state.selectionIndex.treeByPivot[id] === state.selectedTreeId && Boolean(state.selectedTreeId);
    const cells = arr(pivot.columns).map((column) => `<td>${esc(row[String(column).toLowerCase()] ?? '')}</td>`).join('');
    const className = selected ? 'is-selected' : matched ? 'is-related' : '';
    return `<tr tabindex="0" class="${className}" data-uxc-pivot-id="${esc(id)}" aria-selected="${selected}">${cells}</tr>`;
  }).join('');
}

function treeSurface(preview, state) {
  return `<section class="uxc-viewport-surface uxc-tree-surface" data-uxc-surface="tree" tabindex="0" aria-label="Tree preview viewport"><div data-uxc-viewport-content>${treeRows(preview.tree, state)}</div></section>`;
}

function pivotSurface(preview, state) {
  return `<section class="uxc-viewport-surface uxc-pivot-surface" data-uxc-surface="pivot" tabindex="0" aria-label="Pivot preview viewport"><div data-uxc-viewport-content><table><thead><tr>${arr(preview.pivot.columns).map((column) => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${pivotRows(preview.pivot, state)}</tbody></table></div></section>`;
}

function diagnostics(model, viewModel) {
  const items = [...arr(model.diagnostics), ...arr(viewModel.samplePreview?.advancedDiagnostics?.items)];
  return `<section class="uxc-viewport-diagnostics" data-uxc-surface="diagnostics"><h5>Read-only diagnostics</h5>${items.length ? `<ul>${items.slice(0, 100).map((item) => `<li><b>${esc(item.code)}</b> ${esc(item.message)}</li>`).join('')}</ul>` : '<p>No diagnostics.</p>'}</section>`;
}

export function renderUniversalViewportInspector(model) {
  const item = model.inspector;
  return `<aside class="uxc-viewport-inspector" aria-live="polite"><b>${model.contextStatus === 'loaded' ? 'Loaded preview' : 'Sample preview'}</b><dl><dt>Path</dt><dd>${esc(item.path)}</dd><dt>Level</dt><dd>${esc(item.level)}</dd><dt>Key</dt><dd>${esc(item.key)}</dd><dt>Block</dt><dd>${esc(item.block)}</dd><dt>Field</dt><dd>${esc(item.field)}</dd><dt>Value / source</dt><dd>${esc(item.value)} · ${esc(item.source)}</dd></dl><small>Context ${esc(model.contextSignature)}</small></aside>`;
}

function rangePalette() {
  return `<form class="uxc-range-palette" data-uxc-range-palette hidden><label>Min X<input name="minX" type="number" step="any"></label><label>Max X<input name="maxX" type="number" step="any"></label><label>Min Y<input name="minY" type="number" step="any"></label><label>Max Y<input name="maxY" type="number" step="any"></label><button type="submit">Apply</button><button type="button" data-uxc-range-cancel>Cancel</button><p data-uxc-range-error></p></form>`;
}

function surfaces(model, preview, state, viewModel) {
  return `<div class="uxc-preview-surfaces" data-uxc-preview-surfaces data-mode="${esc(model.mode)}"><div class="uxc-side-by-side">${treeSurface(preview, state)}${pivotSurface(preview, state)}</div>${diagnostics(model, viewModel)}</div>`;
}

export function renderUniversalViewportShell(model, viewModel, state) {
  const preview = viewModel.samplePreview;
  return `<section class="uxc-panel uxc-preview-panel" data-uxc-viewport-shell data-mode="${esc(model.mode)}"><div class="uxc-panel-heading"><div><span class="uxc-panel-kicker">Preview</span><h4>Interactive Tree / Pivot Workbench</h4></div><span class="uxc-status-chip is-locked">Export locked</span></div><div class="uxc-mode-toolbar" role="tablist" aria-label="Preview mode">${modeButtons(model)}</div><div class="uxc-viewport-toolbar">${renderUniversalViewportActions(model)}</div><div class="uxc-viewport-layout">${surfaces(model, preview, state, viewModel)}${renderUniversalViewportInspector(model)}</div>${rangePalette()}<p class="uxc-viewport-status" data-uxc-viewport-status>${esc(model.shell.statusSegments.join(' · '))}</p></section>`;
}

export function universalViewportStyleHtml() {
  return `<style>
  .universal-xml-categorizer-backdrop{position:fixed;inset:0;background:#07101ed9;z-index:2147482000;display:grid;place-items:center;padding:18px}.universal-xml-categorizer-dialog{width:min(1500px,98vw);height:min(920px,96vh);overflow:auto;background:#101927;color:#e8eef7;border:1px solid #43516a;border-radius:12px;font:14px/1.4 system-ui}.uxc-hero{display:flex;justify-content:space-between;gap:16px;padding:18px;position:sticky;top:0;background:#101927;z-index:4;border-bottom:1px solid #334159}.uxc-hero h3{margin:2px 0;font-size:22px}.uxc-hero p{margin:0;color:#aab7c9}.uxc-hero-actions{display:flex;gap:8px;align-items:center}.uxc-status-chip{padding:4px 8px;border:1px solid #53637d;border-radius:999px}.is-locked{color:#ffc76b}.uxc-workflow,.uxc-readiness-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;padding:12px 18px}.uxc-workflow article,.uxc-readiness-strip article{background:#172337;padding:10px;border-radius:8px}.uxc-builder-workspace{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px 18px 24px}.uxc-panel{background:#142033;border:1px solid #334159;border-radius:10px;padding:12px;min-width:0}.uxc-preview-panel{grid-column:1/-1}.uxc-panel-heading{display:flex;justify-content:space-between;gap:10px;align-items:start}.uxc-panel h4{margin:2px 0 8px}.uxc-panel-kicker{font-size:11px;text-transform:uppercase;color:#79b8ff}.uxc-panel table{width:100%;border-collapse:collapse;font-size:12px}.uxc-panel th,.uxc-panel td{padding:6px;border-bottom:1px solid #2d3a50;text-align:left}.uxc-panel button{background:#243754;color:#eef5ff;border:1px solid #536987;border-radius:6px;padding:6px 9px}.uxc-panel button:disabled{opacity:.55}.uxc-source-card,.uxc-level,.uxc-review-groups article{display:flex;gap:10px;justify-content:space-between;padding:7px;border-bottom:1px solid #2d3a50}.uxc-mode-toolbar,.uxc-viewport-toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.uxc-mode-toolbar .is-active{outline:2px solid #69b8ff;background:#174f79}.uxc-viewport-layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:10px}.uxc-side-by-side{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0}.uxc-preview-surfaces[data-mode="tree"] .uxc-pivot-surface,.uxc-preview-surfaces[data-mode="tree"] .uxc-viewport-diagnostics,.uxc-preview-surfaces[data-mode="pivot"] .uxc-tree-surface,.uxc-preview-surfaces[data-mode="pivot"] .uxc-viewport-diagnostics,.uxc-preview-surfaces[data-mode="side-by-side"] .uxc-viewport-diagnostics,.uxc-preview-surfaces[data-mode="diagnostics"] .uxc-side-by-side{display:none}.uxc-preview-surfaces[data-mode="tree"] .uxc-side-by-side,.uxc-preview-surfaces[data-mode="pivot"] .uxc-side-by-side{display:block}.uxc-viewport-surface{height:420px;overflow:auto;background:#07111f;border:1px solid #3c506d;position:relative}.uxc-viewport-surface [data-uxc-viewport-content]{min-width:max-content}.uxc-tree-row{display:grid;grid-template-columns:75px minmax(180px,1fr) minmax(120px,auto);gap:8px;width:100%;text-align:left;margin-left:calc(var(--uxc-depth)*20px);border:0;border-bottom:1px solid #233249;border-radius:0;background:transparent}.uxc-tree-row.is-selected,.uxc-pivot-surface tr.is-selected{background:#174f79}.uxc-tree-row.is-related,.uxc-pivot-surface tr.is-related{background:#253f59}.uxc-pivot-surface table{min-width:900px}.uxc-pivot-surface tr{cursor:pointer}.uxc-viewport-inspector{background:#0c1625;border:1px solid #334159;padding:10px;overflow:auto}.uxc-viewport-inspector dl{display:grid;grid-template-columns:90px 1fr;gap:4px}.uxc-viewport-inspector dt{color:#95a7be}.uxc-viewport-inspector dd{margin:0}.uxc-range-palette{position:fixed;z-index:2147482100;background:#101927;border:1px solid #536987;padding:10px;display:grid;grid-template-columns:repeat(2,120px);gap:7px}.uxc-range-palette[hidden]{display:none}.uxc-range-palette label{display:grid;gap:3px}.uxc-range-palette input{width:100%}.uxc-viewport-diagnostics{height:420px;overflow:auto;background:#07111f;padding:12px}.uxc-viewport-status{font-family:ui-monospace,monospace;color:#a8bfdc}.uxc-locked-actions{display:flex;gap:6px;flex-wrap:wrap}.uxc-eyebrow{color:#79b8ff;text-transform:uppercase;font-size:11px}
  @media(max-width:900px){.uxc-builder-workspace{grid-template-columns:1fr}.uxc-viewport-layout{grid-template-columns:1fr}.uxc-side-by-side{grid-template-columns:1fr}.uxc-viewport-inspector{max-height:220px}}
  </style>`;
}

export const _test = Object.freeze({ modeButtons, treeRows, pivotRows, rangePalette, surfaces });

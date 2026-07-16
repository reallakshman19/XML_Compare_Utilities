const WORKSPACE_TABS = Object.freeze([
  ['input', 'Input'],
  ['rules', 'Rules'],
  ['build', 'Build'],
  ['relationships', 'Relationships'],
  ['evidence', 'Evidence'],
  ['export', 'Export'],
]);

export function renderSupportSteelLauncher() {
  return `<button type="button" class="psmap-card psmap-tile ssrb-launcher" data-ssrb-open="1" title="Build XML-free, evidence-backed relationships between support families and structural steel groups."><span class="psmap-tile-icon ssrb-launcher-icon" aria-hidden="true">⌁</span><b>Support / Steel Relationship Builder</b><span class="psmap-help-text">World-geometry support ↔ steel inference</span></button>`;
}

export function renderSupportSteelDialog() {
  return `<div class="ssrb-dialog-head"><div><div class="ssrb-title-row"><b id="ssrb-dialog-title">Support / Steel Relationship Builder</b><span>XML-free geometry workspace</span></div><p id="ssrb-dialog-description">Reconstruct support families, compose hierarchy transforms, build structural analytical geometry and infer support-to-steel relationships directly from staged model data. Clash-detection XML is not an input.</p></div><div class="ssrb-dialog-actions"><button type="button" data-ssrb-fullscreen="1" aria-pressed="false">Full screen</button><button type="button" data-ssrb-close="1" aria-label="Close Support Steel Relationship Builder">Close</button></div></div>${renderWorkspace()}`;
}

export function renderSupportSteelWorkspace() {
  return renderWorkspace();
}

function renderWorkspace() {
  return `<div class="ssrb-workspace"><div class="ssrb-summary-strip" data-ssrb-summary>${initialSummary()}</div>${renderTabs()}${renderPanel('input', renderInputPanel(), true)}${renderPanel('rules', renderRulesPanel())}${renderPanel('build', renderBuildPanel())}${renderPanel('relationships', renderRelationshipsPanel())}${renderPanel('evidence', renderEvidencePanel())}${renderPanel('export', renderExportPanel())}</div>`;
}

function renderTabs() {
  return `<nav class="ssrb-tabs" aria-label="Support steel relationship workflow">${WORKSPACE_TABS.map(([key, label], index) => `<button type="button" data-ssrb-tab="${key}" class="${index === 0 ? 'active' : ''}" aria-selected="${index === 0}">${label}</button>`).join('')}</nav>`;
}

function renderInputPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">1</span><b>Load staged support and steel sources</b></div><button type="button" data-ssrb-load-sample="1">Load PS-14259 demo</button></header><div class="ssrb-input-grid">${sourceInput('support', 'Support source', 'Staged JSON or PipeSupportProjectionBundle.v1')}${sourceInput('steel', 'Steel source', 'Staged JSON with structural hierarchy, transforms, axes or bounds')}</div><div class="ssrb-scope-note"><b>XML-free scope:</b> no Navisworks clash XML is consumed. The engine uses hierarchy identity, explicit engineering references, composed world transforms and analytical structural geometry. Physical contact remains unproven until support-side geometry is available.</div></section>`;
}

function sourceInput(key, title, hint) {
  return `<div class="ssrb-source-card"><div class="ssrb-source-head"><b>${title}</b><label class="ssrb-file-button">Choose JSON<input type="file" accept=".json,application/json" data-ssrb-file="${key}"></label></div><span>${hint}</span><textarea rows="15" data-ssrb-input="${key}" spellcheck="false" placeholder="Paste ${title.toLowerCase()} JSON"></textarea><small data-ssrb-file-status="${key}">No file selected</small></div>`;
}

function renderRulesPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">2</span><b>Relationship and geometry rules</b></div></header><div class="ssrb-rule-grid"><label>Support family regex<input data-ssrb-rule="supportFamilyPattern" value="^/(PS-[A-Z0-9_-]+)"></label><label>Steel group regex<input data-ssrb-rule="steelGroupPattern" value="^/((?:SL|PS)-[A-Z0-9_.-]+)"></label><label>Support record types<input data-ssrb-rule="supportTypes" value="ATTA, ANCI, SUPPORT"></label><label>Steel group types<input data-ssrb-rule="steelTypes" value="STEEL, STEEL_GROUP, STRUCTURE, STRUCTURAL_GROUP, FRMW, SCTN, GROUP"></label><label>Projection tolerance mm<input data-ssrb-rule="projectionToleranceMm" type="number" min="0.001" step="0.5" value="25"></label><label>Ambiguity delta mm<input data-ssrb-rule="ambiguityDeltaMm" type="number" min="0" step="0.5" value="2"></label><label class="ssrb-checkbox-rule"><input data-ssrb-rule="requireAnalyticalGeometryForSpatialResolution" type="checkbox" checked><span>Require structural axis or bounds for automatic spatial resolution</span></label></div><div class="ssrb-priority"><b>Evidence priority</b><ol><li>Same canonical group ID or explicit steel reference</li><li>Unique world-space analytical geometry proximity within tolerance</li><li>Unique shared owner only when stronger evidence is unavailable</li></ol><p><code>OWNER</code> is never explicit steel evidence. Representative <code>POS</code> proximity is diagnostic-only by default. Generic <code>GROUP</code> records require structural class evidence.</p></div></section>`;
}

function renderBuildPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">3</span><b>Build XML-free relationship bundle</b></div></header><div class="ssrb-build-grid"><div><h3>SupportSteelRelationshipBundle.v1 + SupportSteelAnalyticalGeometry.v1</h3><p>Composes parent and child transforms, converts local structural axes and bounds to world space, measures support points against structural OBB/AABB/axis geometry, and preserves inference provenance. Representative-point distance cannot resolve a relationship while the strict geometry rule is enabled.</p><button type="button" class="ssrb-primary" data-ssrb-build="1">Build Relationships</button></div><div class="ssrb-run-state" data-ssrb-run-state><b>Not built</b><span>Load staged sources, review geometry rules and run the builder.</span></div></div><div data-ssrb-diagnostics></div></section>`;
}

function renderRelationshipsPanel() {
  return `<section class="ssrb-card ssrb-results-card"><header><div><span class="ssrb-step">4</span><b>XML-free support ↔ steel relationships</b></div><label class="ssrb-search">Filter<input data-ssrb-search placeholder="PS-14259, SL-4201, member, method or status"></label></header><div class="ssrb-results-layout"><div><h4>Support-centred hierarchy</h4><div data-ssrb-tree></div></div><div><h4>Geometry evidence ledger</h4><div data-ssrb-table></div></div></div></section>`;
}

function renderEvidencePanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">5</span><b>Selected relationship and geometry evidence</b></div></header><div data-ssrb-evidence></div></section>`;
}

function renderExportPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">6</span><b>Export XML-free evidence package</b></div></header><div class="ssrb-export-grid"><div><div class="ssrb-export-tabs"><button type="button" class="active" data-ssrb-export-view="json">Bundle JSON</button><button type="button" data-ssrb-export-view="csv">Relationship CSV</button><button type="button" data-ssrb-export-view="tree">Hierarchy TXT</button></div><pre data-ssrb-export-preview>Build relationships to preview exports.</pre></div><div class="ssrb-export-actions"><button type="button" data-ssrb-copy="1">Copy preview</button><button type="button" class="ssrb-primary" data-ssrb-download="1">Download selected</button></div></div></section>`;
}

function renderPanel(key, body, active = false) {
  return `<section data-ssrb-panel="${key}" ${active ? '' : 'hidden'}>${body}</section>`;
}

function initialSummary() {
  return ['Support families', 'Steel groups', 'Analytical steel', 'Resolved', 'Ambiguous', 'Unresolved']
    .map((label) => `<div class="ssrb-summary-card"><span>${label}</span><strong>0</strong></div>`)
    .join('');
}

export const _test = Object.freeze({ renderTabs, renderInputPanel, renderRulesPanel, renderBuildPanel });

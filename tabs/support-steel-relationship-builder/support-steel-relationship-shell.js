const WORKSPACE_TABS = Object.freeze([
  ['input', 'Input'],
  ['rules', 'Rules'],
  ['build', 'Build'],
  ['relationships', 'Relationships'],
  ['evidence', 'Evidence'],
  ['export', 'Export'],
]);

export function renderSupportSteelLauncher() {
  return `<button type="button" class="psmap-card psmap-tile ssrb-launcher" data-ssrb-open="1" title="Build evidence-backed relationships between support families and structural steel groups."><span class="psmap-tile-icon ssrb-launcher-icon" aria-hidden="true">⌁</span><b>Support / Steel Relationship Builder</b><span class="psmap-help-text">Support family ↔ steel group relationship workspace</span></button>`;
}

export function renderSupportSteelDialog() {
  return `<div class="ssrb-dialog-head"><div><div class="ssrb-title-row"><b id="ssrb-dialog-title">Support / Steel Relationship Builder</b><span>Relationship workspace</span></div><p id="ssrb-dialog-description">Reconstruct support families, identify structural steel groups and build auditable relationships. This utility does not perform clash detection or edit pipe geometry.</p></div><div class="ssrb-dialog-actions"><button type="button" data-ssrb-fullscreen="1" aria-pressed="false">Full screen</button><button type="button" data-ssrb-close="1" aria-label="Close Support Steel Relationship Builder">Close</button></div></div>${renderWorkspace()}`;
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
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">1</span><b>Load support and steel sources</b></div><button type="button" data-ssrb-load-sample="1">Load PS-14259 demo</button></header><div class="ssrb-input-grid">${sourceInput('support', 'Support source', 'Staged JSON or PipeSupportProjectionBundle.v1')}${sourceInput('steel', 'Steel source', 'Staged JSON containing structural groups')}</div><div class="ssrb-scope-note"><b>Scope lock:</b> relationship construction only. No clash audit, support geometry generation, pipe editing or matrix composition.</div></section>`;
}

function sourceInput(key, title, hint) {
  return `<div class="ssrb-source-card"><div class="ssrb-source-head"><b>${title}</b><label class="ssrb-file-button">Choose JSON<input type="file" accept=".json,application/json" data-ssrb-file="${key}"></label></div><span>${hint}</span><textarea rows="15" data-ssrb-input="${key}" spellcheck="false" placeholder="Paste ${title.toLowerCase()} JSON"></textarea><small data-ssrb-file-status="${key}">No file selected</small></div>`;
}

function renderRulesPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">2</span><b>Relationship rules</b></div></header><div class="ssrb-rule-grid"><label>Support family regex<input data-ssrb-rule="supportFamilyPattern" value="^/(PS-[A-Z0-9_-]+)"></label><label>Steel group regex<input data-ssrb-rule="steelGroupPattern" value="^/((?:SL|PS)-[A-Z0-9_.-]+)"></label><label>Support record types<input data-ssrb-rule="supportTypes" value="ATTA, ANCI, SUPPORT"></label><label>Steel group types<input data-ssrb-rule="steelTypes" value="STEEL, STEEL_GROUP, STRUCTURE, STRUCTURAL_GROUP, FRMW, SCTN, GROUP"></label><label>Projection tolerance mm<input data-ssrb-rule="projectionToleranceMm" type="number" min="0.001" step="0.5" value="25"></label><label>Ambiguity delta mm<input data-ssrb-rule="ambiguityDeltaMm" type="number" min="0" step="0.5" value="2"></label></div><div class="ssrb-priority"><b>Evidence priority</b><ol><li>Same canonical group ID or explicit steel reference</li><li>Unique point proximity within tolerance</li><li>Unique shared owner when coordinate evidence is unavailable</li></ol><p>Out-of-tolerance or tied candidates remain unresolved or ambiguous; the nearest steel group is never silently accepted.</p></div></section>`;
}

function renderBuildPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">3</span><b>Build relationship bundle</b></div></header><div class="ssrb-build-grid"><div><h3>SupportSteelRelationshipBundle.v1</h3><p>Produces a support-centred hierarchy containing family members, related branches and carriers, resolved steel groups, relationship basis, distance and diagnostics.</p><button type="button" class="ssrb-primary" data-ssrb-build="1">Build Relationships</button></div><div class="ssrb-run-state" data-ssrb-run-state><b>Not built</b><span>Load both sources, review rules and run the builder.</span></div></div><div data-ssrb-diagnostics></div></section>`;
}

function renderRelationshipsPanel() {
  return `<section class="ssrb-card ssrb-results-card"><header><div><span class="ssrb-step">4</span><b>Support ↔ steel relationships</b></div><label class="ssrb-search">Filter<input data-ssrb-search placeholder="PS-14259, SL-4201, branch or status"></label></header><div class="ssrb-results-layout"><div><h4>Support-centred hierarchy</h4><div data-ssrb-tree></div></div><div><h4>Relationship ledger</h4><div data-ssrb-table></div></div></div></section>`;
}

function renderEvidencePanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">5</span><b>Selected relationship evidence</b></div></header><div data-ssrb-evidence></div></section>`;
}

function renderExportPanel() {
  return `<section class="ssrb-card"><header><div><span class="ssrb-step">6</span><b>Export relationship package</b></div></header><div class="ssrb-export-grid"><div><div class="ssrb-export-tabs"><button type="button" class="active" data-ssrb-export-view="json">Bundle JSON</button><button type="button" data-ssrb-export-view="csv">Relationship CSV</button><button type="button" data-ssrb-export-view="tree">Hierarchy TXT</button></div><pre data-ssrb-export-preview>Build relationships to preview exports.</pre></div><div class="ssrb-export-actions"><button type="button" data-ssrb-copy="1">Copy preview</button><button type="button" class="ssrb-primary" data-ssrb-download="1">Download selected</button></div></div></section>`;
}

function renderPanel(key, body, active = false) {
  return `<section data-ssrb-panel="${key}" ${active ? '' : 'hidden'}>${body}</section>`;
}

function initialSummary() {
  return ['Support families', 'Steel groups', 'Resolved', 'Ambiguous', 'Unresolved']
    .map((label) => `<div class="ssrb-summary-card"><span>${label}</span><strong>0</strong></div>`)
    .join('');
}

export const _test = Object.freeze({ renderTabs, renderInputPanel, renderRulesPanel, renderBuildPanel });

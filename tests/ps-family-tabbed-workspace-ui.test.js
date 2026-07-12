import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
const source = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
const professionalCss = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js', 'utf8');

for (const tab of ['Input', 'Preview', 'Config', 'Run Audit', 'Reports', 'Export']) {
  assert.ok(shell.includes(`>${tab}</button>`), `missing primary workspace tab ${tab}`);
}
assert.doesNotMatch(shell, />Run &amp; Export<\/button>/);
assert.ok(shell.includes('class="psmap-tabs psfa-tabs"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab active"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab config"'));
assert.ok(launcher.includes('class="psmap-card psmap-tile ps-family-clash-audit-launcher"'));
assert.ok(launcher.includes('class="psmap-tile-icon ps-family-clash-audit-launcher-icon"'));

assert.match(professionalCss, /PS_FAMILY_PROFESSIONAL_UI_SCHEMA = 'ps-family-clash-audit-professional-ui\/v5-shell-split-run-export'/);
assert.match(professionalCss, /grid-template-rows:auto auto auto minmax\(0,1fr\)/);
assert.match(professionalCss, /\.psfa-tabs\{[^}]*min-height:42px/);
assert.match(professionalCss, /\.psfa-tab\{[^}]*height:30px/);
assert.match(professionalCss, /\.psfa-shell>\[data-psfa-panel\]\{min-height:0;overflow:auto\}/);
assert.match(professionalCss, /\.psfa-preview-grid pre\{min-height:180px/);
assert.match(professionalCss, /\.psfa-prefix-card/);
assert.match(professionalCss, /\.psfa-run-grid/);
assert.match(professionalCss, /\.psfa-export-preview/);

assert.match(shell, /data-psfa-panel="input"[^>]*>/);
assert.match(shell, /data-psfa-panel="preview" hidden/);
assert.match(shell, /data-psfa-panel="config" hidden/);
assert.match(shell, /data-psfa-panel="run" hidden/);
assert.match(shell, /data-psfa-panel="reports" hidden/);
assert.match(shell, /data-psfa-panel="export" hidden/);

assert.ok(shell.includes('Official sample loaders'));
assert.ok(shell.includes('Load sample clash XML'));
assert.ok(shell.includes('Load sample PSClash XML'));
assert.ok(shell.includes('data-psfa-file="xml"'));
assert.ok(shell.includes('data-psfa-file="psclash"'));
assert.ok(shell.includes('data-psfa="xml"'));
assert.ok(shell.includes('data-psfa="psclash"'));
assert.ok(shell.includes('data-psfa="expected"'));
assert.ok(shell.includes('data-psfa="details"'));
assert.ok(shell.includes('class="psfa-input-wide"'));

assert.ok(shell.includes('Clash XML preview/count'));
assert.ok(shell.includes('PSClash XML preview/count'));
assert.ok(shell.includes('Expected PS/SL CSV preview/count'));
assert.ok(shell.includes('Element Detail CSV preview/count'));
assert.ok(shell.includes('data-psfa-preview="xml"'));
assert.ok(shell.includes('data-psfa-preview="psclash"'));
assert.ok(shell.includes('data-psfa-preview="expected"'));
assert.ok(shell.includes('data-psfa-preview="details"'));

assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family override'));
assert.ok(shell.includes('Valid family prefixes'));
assert.ok(shell.includes('data-psfa="family-prefixes"'));
assert.ok(shell.includes('Generated detector'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Copy-(n)-of names are preserved'));

assert.ok(shell.includes('Audit Controls'));
assert.ok(shell.includes('Readiness / Run Summary'));
assert.ok(shell.includes('Check Readiness'));
assert.ok(shell.includes('Run Audit'));
assert.ok(shell.includes('Export Active Report'));
assert.ok(shell.includes('Export Package'));
assert.ok(shell.includes('Coverage CSV'));
assert.ok(shell.includes('PSClash report CSV'));
assert.ok(shell.includes('Audit JSON'));
assert.ok(shell.includes('class="psfa-export-package"'));
assert.ok(shell.includes('data-psfa-export-preview="coverage"'));
assert.ok(shell.includes('data-psfa="download-selected"'));
assert.ok(shell.includes('data-psfa="copy-export-preview"'));

assert.ok(shell.includes('Report search'));
assert.ok(shell.includes('data-psfa-tab="coverage"'));
assert.ok(shell.includes('data-psfa-tab="clashRows"'));
assert.ok(shell.includes('data-psfa-tab="psClashReport"'));
assert.ok(shell.includes('data-psfa-tab="hierarchy"'));
assert.ok(shell.includes('data-psfa-report-maturity="draft"'));
assert.ok(shell.includes('data-psfa-report-maturity="stable"'));
assert.ok(shell.includes('class="psfa-report-table psmap-table-wrap"'));

assert.ok(popup.includes('PS / SL Family Clash Audit'));
assert.ok(popup.includes('Professional Audit Workspace'));
assert.ok(popup.includes('data-psfa-close="1"'));
assert.ok(popup.includes('>Close</button>'));
assert.match(source, /if \(popup\) return;/);
assert.match(source, /showWorkspacePanel/);
assert.match(source, /button\.classList\.toggle\('active', active\)/);
assert.match(source, /wirePrefixInput/);
assert.match(source, /wireExportPreviewButtons/);
assert.match(source, /event\.key === 'Escape'/);
assert.doesNotMatch(shell, /Markdown Report/);

console.log('ps-family-tabbed-workspace-ui tests passed');

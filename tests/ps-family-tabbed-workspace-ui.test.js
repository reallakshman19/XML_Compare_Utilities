import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
const source = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
const professionalCss = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js', 'utf8');

for (const tab of ['Input', 'Preview', 'Config', 'Run Audit', 'Reports', 'Export']) assert.ok(shell.includes(`>${tab}</button>`), `missing primary workspace tab ${tab}`);
assert.doesNotMatch(shell, />Run &amp; Export<\/button>/);
assert.ok(shell.includes('class="psmap-tabs psfa-tabs"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab active"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab config"'));
assert.ok(launcher.includes('class="psmap-card psmap-tile ps-family-clash-audit-launcher"'));
assert.ok(launcher.includes('SupportChangeXML'));

assert.match(professionalCss, /PS_FAMILY_PROFESSIONAL_UI_SCHEMA = 'ps-family-clash-audit-professional-ui\/v7-zone-classification'/);
assert.match(professionalCss, /grid-template-rows:auto auto auto minmax\(0,1fr\)/);
assert.match(professionalCss, /\.psfa-tabs\{[^}]*min-height:42px/);
assert.match(professionalCss, /\.psfa-tab\{[^}]*height:30px/);
assert.match(professionalCss, /\.psfa-shell>\[data-psfa-panel\]\{min-height:0;overflow:auto\}/);
assert.match(professionalCss, /\.psfa-preview-grid pre\{min-height:180px/);
assert.match(professionalCss, /\.psfa-prefix-card/);
assert.match(professionalCss, /\.psfa-zone-grid/);
assert.match(professionalCss, /\.psfa-run-grid/);
assert.match(professionalCss, /\.psfa-export-preview/);
assert.match(professionalCss, /\.psfa-export-picker button\[aria-selected="true"\],\.psfa-export-picker button\.active/);

assert.match(shell, /data-psfa-panel="input"[^>]*>/);
assert.match(shell, /data-psfa-panel="preview" hidden/);
assert.match(shell, /data-psfa-panel="config" hidden/);
assert.match(shell, /data-psfa-panel="run" hidden/);
assert.match(shell, /data-psfa-panel="reports" hidden/);
assert.match(shell, /data-psfa-panel="export" hidden/);

assert.ok(shell.includes('Official sample loaders'));
assert.ok(shell.includes('Load sample StructureGroup vs Supports XML'));
assert.ok(shell.includes('Load sample Clash within Supports XML'));
assert.ok(shell.includes('data-psfa-file="structure"'));
assert.ok(shell.includes('data-psfa-file="support"'));
assert.ok(shell.includes('data-psfa="structure"'));
assert.ok(shell.includes('data-psfa="support"'));
assert.ok(!shell.includes('data-psfa="expected"'));
assert.ok(!shell.includes('data-psfa="details"'));

assert.ok(shell.includes('StructureGroup vs Supports XML preview/count'));
assert.ok(shell.includes('Clash within Supports XML preview/count'));
assert.ok(shell.includes('data-psfa-preview="structure"'));
assert.ok(shell.includes('data-psfa-preview="support"'));

assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family override'));
assert.ok(shell.includes('Valid family prefixes'));
assert.ok(shell.includes('data-psfa="family-prefixes"'));
assert.ok(shell.includes('Generated detector'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Structural zones'));
assert.ok(shell.includes('Support zones'));
assert.ok(shell.includes('data-psfa="structural-zones"'));
assert.ok(shell.includes('data-psfa="support-zones"'));

assert.ok(shell.includes('Audit Controls'));
assert.ok(shell.includes('Readiness / Run Summary'));
assert.ok(shell.includes('Check Readiness'));
assert.ok(shell.includes('Run Audit'));
assert.ok(shell.includes('Export Active Report'));
assert.ok(shell.includes('Export Package'));
assert.ok(shell.includes('SupportGroup Summary CSV'));
assert.ok(shell.includes('Line Support Tree TXT'));
assert.ok(shell.includes('SupportChange Exceptions CSV'));
assert.ok(shell.includes('Input Evidence Ledger CSV'));
assert.ok(shell.includes('Audit JSON'));
assert.ok(!shell.includes('StructureGroup Contacts CSV'));
assert.ok(!shell.includes('Support Chain CSV'));
assert.ok(!shell.includes('SupportGroup Members CSV'));
assert.ok(!shell.includes('Connectivity Matrix CSV'));
assert.ok(!shell.includes('Clash Rows CSV'));
assert.ok(shell.includes('data-psfa-export-preview="support-summary"'));
assert.ok(shell.includes('data-psfa="download-selected"'));
assert.ok(shell.includes('data-psfa="download-all-zip"'));
assert.ok(shell.includes('Download All ZIP'));
assert.ok(shell.includes('data-psfa="copy-export-preview"'));

assert.ok(shell.includes('Report search'));
for (const tab of ['supportSummary', 'lineSupportTree', 'supportExceptions', 'inputEvidence', 'structureContacts', 'supportChain', 'supportMembers', 'connectivityMatrix', 'clashRows', 'diagnostics']) assert.ok(shell.includes(`data-psfa-tab="${tab}"`));
assert.ok(shell.includes('data-psfa-report-maturity="draft"'));
assert.ok(shell.includes('data-psfa-report-maturity="stable"'));
assert.ok(shell.includes('class="psfa-report-table psmap-table-wrap"'));

assert.ok(popup.includes('PS / SL Family Clash Audit'));
assert.ok(popup.includes('SupportChangeXML Workspace'));
assert.ok(popup.includes('data-psfa-close="1"'));
assert.ok(popup.includes('>Close</button>'));
assert.match(source, /showWorkspacePanel/);
assert.match(source, /button\.classList\.toggle\('active', active\)/);
assert.match(source, /wirePrefixInput/);
assert.match(source, /wireExportPreviewButtons/);
assert.match(source, /saveZipTextFiles/);
assert.match(source, /updateExportPickerSelection/);
assert.match(source, /function buildExportEntries/);
assert.match(source, /event\.key === 'Escape'/);
assert.doesNotMatch(shell, /Markdown Report/);
assert.doesNotMatch(shell, /PSClash XML/);

const prefixNode = { kind: 'prefix-detector' };
const exportTitleNode = { kind: 'export-title' };
const fakeRoot = {
  querySelector(selector) {
    if (selector === '[data-psfa-prefix-detector]') return prefixNode;
    if (selector === '[data-psfa-export-title]') return exportTitleNode;
    return null;
  },
};
const get = _test.createGetter(fakeRoot);
assert.equal(get('root'), fakeRoot);
assert.equal(get('prefix-detector'), prefixNode);
assert.equal(get('export-title'), exportTitleNode);
assert.equal(get('unknown-control'), null);

console.log('ps-family-tabbed-workspace-ui tests passed');

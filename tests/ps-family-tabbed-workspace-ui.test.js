import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_PROFESSIONAL_UI_SCHEMA } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
const source = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
const professionalCss = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js', 'utf8');

for (const tab of ['Input', 'Preview', 'Config', 'Run Audit', 'Reports', 'Export Package']) assert.ok(shell.includes(`>${tab}</button>`), `missing primary workspace tab ${tab}`);
assert.ok(shell.includes('class="psmap-tabs psfa-tabs"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab active"'));
assert.ok(shell.includes('class="psmap-tab psfa-tab config"'));
assert.ok(launcher.includes('class="psmap-card psmap-tile ps-family-clash-audit-launcher"'));
assert.ok(launcher.includes('SupportChangeXML'));

assert.equal(PS_FAMILY_PROFESSIONAL_UI_SCHEMA, 'ps-family-clash-audit-professional-ui/v10-report-ribbon-export-fullscreen');
assert.match(professionalCss, /grid-template-rows:repeat\(2,minmax\(36px,auto\)\)/);
assert.match(professionalCss, /grid-auto-flow:column/);
assert.match(professionalCss, /\.psfa-report-subtabs\{[^}]*overflow-x:auto/);
assert.match(professionalCss, /\.psfa-report-table\{[^}]*overflow-x:auto;[^}]*overflow-y:auto/);
assert.match(professionalCss, /\.psfa-report-controls/);
assert.match(professionalCss, /\.psfa-window-actions/);

assert.match(shell, /data-psfa-panel="input"[^>]*>/);
for (const key of ['preview', 'config', 'run', 'reports', 'export']) assert.match(shell, new RegExp(`data-psfa-panel="${key}" hidden`));
assert.ok(shell.includes('Official sample loaders'));
assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Valid family prefixes'));
assert.ok(shell.includes('Audit Controls'));
assert.ok(shell.includes('Export Active Report CSV'));
assert.ok(shell.includes('Export current report as CSV'));
assert.ok(shell.includes('data-psfa="report-export-csv"'));
assert.ok(shell.includes('data-psfa-report-subtabs="all"'));
assert.equal((shell.match(/data-psfa-report-subtabs=/g) || []).length, 1);

for (const group of PS_FAMILY_CLASH_AUDIT_CONFIG.reportGroups) assert.ok(shell.includes(`data-psfa-report-group="${group.key}"`));
for (const label of ['Support Group', 'Structure Group Basis', 'Line Tree', 'Structure Tree', 'Clash Summary', 'Clash Audit Outcome']) assert.ok(shell.includes(`>${label}</span>`), `missing report group ${label}`);
for (const label of ['SupportGroup Summary', 'Support Chain Report', 'Support Members', 'StructureGroup Line Support Proximity Basis', 'Structure Contacts', 'Line Tree', 'Structure Tree', 'Input Evidence', 'Connectivity Matrix', 'Clash Detail Rows', 'SupportChange Exceptions', 'Diagnostics']) assert.ok(shell.includes(label), `missing report label ${label}`);
for (const tab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) assert.ok(shell.includes(`data-psfa-tab="${tab.key}"`));
assert.equal((shell.match(/data-psfa-tab="supportSummary"/g) || []).length, 2, 'SupportGroup Summary must remain available in Support Group and Clash Summary');
assert.ok(shell.includes('data-psfa-report-maturity="draft"'));
assert.ok(shell.includes('<span class="psfa-draft-badge">Review</span>'));
assert.ok(shell.includes('class="psfa-report-table psmap-table-wrap"'));

assert.ok(popup.includes('PS / SL Family Clash Audit'));
assert.ok(popup.includes('SupportChangeXML Workspace'));
assert.ok(popup.includes('data-psfa="fullscreen"'));
assert.ok(popup.includes('aria-pressed="false">Full Screen</button>'));
assert.ok(popup.includes('data-psfa-close="1"'));
assert.match(source, /toggleFullscreen/);
assert.match(source, /exportActiveReportCsv/);
assert.match(source, /get\('report-export-csv'\)/);
assert.match(source, /modal\.classList\.contains\('psfa-fullscreen'\)/);

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
assert.equal(_test.firstReportKey(PS_FAMILY_CLASH_AUDIT_CONFIG, 'clashOutcome'), 'supportExceptions');

console.log('ps-family-tabbed-workspace-ui tests passed');

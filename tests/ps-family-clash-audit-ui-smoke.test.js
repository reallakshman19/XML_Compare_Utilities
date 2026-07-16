import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_PROFESSIONAL_UI_SCHEMA, psFamilyProfessionalCss } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports, renderPsFamilySummary } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(launcher.includes('PS / SL Family Clash Audit'));
assert.ok(launcher.includes('SupportChangeXML'));
assert.ok(launcher.includes('data-psfa-open="1"'));
assert.ok(!launcher.includes('Clash XML<textarea'));

const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(popup.includes('data-psfa-close="1"'));
assert.ok(popup.includes('>Close</button>'));
assert.ok(popup.includes('aria-label="Close PS Family Clash Audit popup"'));
assert.ok(popup.includes('SupportChangeXML Workspace'));
assert.ok(popup.includes('StructureGroup vs Supports XML + Clash within Supports XML'));

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
for (const tab of ['input', 'preview', 'config', 'run', 'reports', 'export']) assert.ok(shell.includes(`data-psfa-workspace-tab="${tab}"`));
assert.ok(shell.includes('Load sample StructureGroup vs Supports XML'));
assert.ok(shell.includes('Load sample Clash within Supports XML'));
assert.ok(shell.includes('StructureGroup vs Supports XML'));
assert.ok(shell.includes('Clash within Supports XML'));
assert.ok(shell.includes('Valid family prefixes'));
assert.ok(shell.includes('Run Audit'));
for (const label of ['Support Group', 'Structure Group Basis', 'Line Tree', 'Structure Tree', 'Clash Summary', 'Clash Audit Outcome']) assert.ok(shell.includes(label), `missing structured report label ${label}`);
assert.ok(shell.includes('Support Group Summary'));
assert.ok(shell.includes('Support Chain'));
assert.ok(shell.includes('Structure Evidence Tree'));
assert.ok(shell.includes('Connectivity Matrix'));
assert.ok(shell.includes('SupportChange Exceptions'));
assert.ok(shell.includes('Support Group Summary CSV'));
assert.ok(shell.includes('Line Tree TXT'));
assert.ok(shell.includes('Audit JSON'));
assert.ok(!shell.includes('PSClash XML'));
assert.ok(!shell.includes('Expected PS/SL CSV'));
assert.ok(!shell.includes('Run &amp; Export'));
assert.ok(shell.includes('data-psfa-report-group="supportGroup"'));
assert.ok(shell.includes('data-psfa-report-group="clashOutcome"'));
assert.ok(shell.includes('data-psfa-report-subtabs="structureTree"'));

const tabSource = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
assert.match(tabSource, /if \(doc\.querySelector\('\[data-psfa-popup="1"\]'\)\) return;/);
assert.match(tabSource, /ps-family-clash-audit-backdrop/);
assert.match(tabSource, /ps-family-clash-audit-dialog/);
assert.match(tabSource, /event\.target === modal/);
assert.match(tabSource, /keydown/);
assert.match(tabSource, /event\.key === 'Escape'/);
assert.match(tabSource, /aria-modal/);
assert.match(tabSource, /aria-labelledby/);
assert.match(tabSource, /aria-describedby/);
assert.match(tabSource, /showWorkspacePanel/);
assert.match(tabSource, /updateReportNavigation/);
assert.match(tabSource, /activeReportGroup/);

assert.equal(PS_FAMILY_PROFESSIONAL_UI_SCHEMA, 'ps-family-clash-audit-professional-ui/v8-structured-reports');
const reportCss = psFamilyProfessionalCss();
assert.match(reportCss, /\.psfa-report-layout\{[^}]*grid-template-columns:minmax\(210px,250px\) minmax\(0,1fr\)/);
assert.match(reportCss, /\.psfa-report-groups\{[^}]*display:grid/);
assert.match(reportCss, /\.psfa-report-group\.active,\.psfa-report-group\[aria-selected="true"\]/);
assert.match(reportCss, /\.psfa-report-subtabs\{[^}]*overflow-x:auto/);
assert.match(reportCss, /\.psfa-report-table\{[^}]*overflow-x:auto;[^}]*overflow-y:auto;[^}]*scrollbar-gutter:stable both-edges/);
assert.doesNotMatch(reportCss, /\.psfa-report-table\{[^}]*overflow-x:hidden/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table-wrap\{[^}]*overflow-x:auto/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table-wrap:focus\{[^}]*outline:2px solid/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table\{[^}]*width:max-content;[^}]*min-width:100%/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table th,\.psfa-report-table \.psmap-table td\{white-space:nowrap\}/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table th\{[^}]*position:sticky/);

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
const summary = renderPsFamilySummary(audit);
const supportSummary = renderPsFamilyReports(audit, 'supportSummary', PS_FAMILY_CLASH_AUDIT_CONFIG, '', 'supportGroup');
const structureTree = renderPsFamilyReports(audit, 'structureTree', PS_FAMILY_CLASH_AUDIT_CONFIG, '', 'structureTree');
const diagnostics = renderPsFamilyReports(audit, 'diagnostics', PS_FAMILY_CLASH_AUDIT_CONFIG, '', 'clashOutcome');
assert.ok(summary.includes('Support groups'));
assert.ok(summary.includes('1'));
assert.ok(supportSummary.includes('S8810011_PS-14396'));
assert.ok(supportSummary.includes('Support Group'));
assert.ok(structureTree.includes('Structure Path'));
assert.ok(diagnostics.includes('Clash Audit Outcome'));
for (const reportTab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) {
  const report = renderPsFamilyReports(audit, reportTab.key, PS_FAMILY_CLASH_AUDIT_CONFIG);
  assert.ok(report.includes('class="psmap-table-wrap"'), `${reportTab.label} must render through the horizontal-scroll table wrapper`);
  assert.ok(report.includes('role="region"'), `${reportTab.label} horizontal scroll region must be announced as a region`);
  assert.ok(report.includes('tabindex="0"'), `${reportTab.label} horizontal scroll region must be keyboard focusable`);
}

console.log('ps-family-clash-audit-ui-smoke tests passed');

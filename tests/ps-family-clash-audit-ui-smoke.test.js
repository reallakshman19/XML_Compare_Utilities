import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { psFamilyProfessionalCss } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-professional-ui.js';
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
assert.ok(shell.includes('SupportGroup Summary'));
assert.ok(shell.includes('Line Support Tree'));
assert.ok(shell.includes('SupportChange Exceptions'));
assert.ok(shell.includes('Input Evidence Ledger'));
assert.ok(shell.includes('SupportGroup Summary CSV'));
assert.ok(shell.includes('Line Support Tree TXT'));
assert.ok(shell.includes('Audit JSON'));
assert.ok(!shell.includes('PSClash XML'));
assert.ok(!shell.includes('Expected PS/SL CSV'));
assert.ok(!shell.includes('Run &amp; Export'));

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

const reportCss = psFamilyProfessionalCss();
assert.match(reportCss, /\.psfa-report-table\{[^}]*overflow-x:hidden;[^}]*overflow-y:auto/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table-wrap\{[^}]*overflow-x:auto/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table\{[^}]*width:max-content;[^}]*min-width:100%/);
assert.match(reportCss, /\.psfa-report-table \.psmap-table th,\.psfa-report-table \.psmap-table td\{white-space:nowrap\}/);

const audit = createPsFamilyClashAuditFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
const summary = renderPsFamilySummary(audit);
const supportSummary = renderPsFamilyReports(audit, 'supportSummary', PS_FAMILY_CLASH_AUDIT_CONFIG);
const diagnostics = renderPsFamilyReports(audit, 'diagnostics', PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(summary.includes('SupportGroups'));
assert.ok(summary.includes('1'));
assert.ok(supportSummary.includes('S8810011_PS-14396'));
assert.ok(diagnostics.includes('Diagnostics'));
for (const reportTab of PS_FAMILY_CLASH_AUDIT_CONFIG.reportTabs) {
  const report = renderPsFamilyReports(audit, reportTab.key, PS_FAMILY_CLASH_AUDIT_CONFIG);
  assert.ok(report.includes('class="psmap-table-wrap"'), `${reportTab.label} must render through the horizontal-scroll table wrapper`);
}

console.log('ps-family-clash-audit-ui-smoke tests passed');

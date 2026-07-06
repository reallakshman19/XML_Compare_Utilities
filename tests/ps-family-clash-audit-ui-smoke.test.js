import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports, renderPsFamilySummary } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(launcher.includes('PS / SL Family Clash Audit'));
assert.ok(launcher.includes('⚠️↔️'));
assert.ok(launcher.includes('Audit Navis clash XML against configurable support-family mapping.'));
assert.ok(launcher.includes('data-psfa-open="1"'));
assert.ok(!launcher.includes('Clash XML<textarea'));

const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(popup.includes('data-psfa-close="1"'));
assert.ok(popup.includes('>Close</button>'));
assert.ok(popup.includes('aria-label="Close PS Family Clash Audit popup"'));
assert.ok(popup.includes('id="ps-family-clash-audit-title"'));
assert.ok(popup.includes('id="ps-family-clash-audit-desc"'));
assert.ok(popup.includes('Navis clash XML + expected CSV + element detail CSV audit workspace.'));

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('data-psfa="status-strip"'));
assert.ok(shell.includes('data-psfa-workspace-tab="input"'));
assert.ok(shell.includes('data-psfa-workspace-tab="preview"'));
assert.ok(shell.includes('data-psfa-workspace-tab="config"'));
assert.ok(shell.includes('data-psfa-workspace-tab="run"'));
assert.ok(shell.includes('data-psfa-workspace-tab="reports"'));
assert.ok(shell.includes('Load sample clash XML'));
assert.ok(shell.includes('Load sample expected CSV'));
assert.ok(shell.includes('Load sample detail CSV'));
assert.ok(shell.includes('Clash XML'));
assert.ok(shell.includes('Expected PS/SL CSV'));
assert.ok(shell.includes('Element Detail CSV'));
assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family override'));
assert.ok(shell.includes('Valid family prefixes'));
assert.ok(shell.includes('Generated detector'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Check Readiness'));
assert.ok(shell.includes('Run Audit'));
assert.ok(shell.includes('Report search'));
assert.ok(shell.includes('Coverage'));
assert.ok(shell.includes('Hierarchy'));
assert.ok(shell.includes('Diagnostics'));
assert.ok(shell.includes('Missing CSV'));
assert.ok(shell.includes('Diagnostics CSV'));
assert.ok(shell.includes('Download Selected'));
assert.ok(shell.includes('Copy Preview'));

const tabSource = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
assert.match(tabSource, /if \(popup\) return;/);
assert.match(tabSource, /ps-family-clash-audit-backdrop/);
assert.match(tabSource, /ps-family-clash-audit-dialog/);
assert.match(tabSource, /document\.body \|\| root/);
assert.match(tabSource, /event\.target === modal/);
assert.match(tabSource, /keydown/);
assert.match(tabSource, /event\.key === 'Escape'/);
assert.match(tabSource, /aria-modal/);
assert.match(tabSource, /aria-labelledby/);
assert.match(tabSource, /aria-describedby/);
assert.match(tabSource, /showWorkspacePanel/);

const audit = createPsFamilyClashAuditFromTextInputs({
  expectedCsvText: 'Item Name\n/SL-11147.1\n',
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});

const summary = renderPsFamilySummary(audit);
const coverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG);
const diagnostics = renderPsFamilyReports(audit, 'diagnostics', PS_FAMILY_CLASH_AUDIT_CONFIG);

assert.ok(summary.includes('SL-11147'));
assert.ok(summary.includes('Expected / Found / Missing'));
assert.ok(coverage.includes('Coverage'));
assert.ok(coverage.includes('SL-11147.1'));
assert.ok(diagnostics.includes('Diagnostics'));

console.log('ps-family-clash-audit-ui-smoke tests passed');

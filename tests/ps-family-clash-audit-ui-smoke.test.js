import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports, renderPsFamilySummary } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const launcher = _test.renderLauncher(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(launcher.includes('PS clash check'));
assert.ok(launcher.includes('data-psfa-open="1"'));
assert.ok(!launcher.includes('Clash XML'));

const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(popup.includes('data-psfa-close="1"'));
assert.ok(popup.includes('Close PS clash check'));
assert.ok(popup.includes('aria-label="Close PS Family Clash Audit popup"'));
assert.ok(popup.includes('id="ps-family-clash-audit-title"'));
assert.ok(popup.includes('id="ps-family-clash-audit-desc"'));

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.ok(shell.includes('1. Input actions'));
assert.ok(shell.includes('2. Input text and settings'));
assert.ok(shell.includes('3. Audit actions and exports'));
assert.ok(shell.includes('4. Report review'));
assert.ok(shell.includes('aria-live="polite"'));
assert.ok(shell.includes('Load sample clash XML'));
assert.ok(shell.includes('Load sample expected CSV'));
assert.ok(shell.includes('Load sample detail CSV'));
assert.ok(shell.includes('Clash XML'));
assert.ok(shell.includes('Expected PS CSV'));
assert.ok(shell.includes('Element Detail CSV'));
assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Check Readiness'));
assert.ok(shell.includes('Run Audit'));
assert.ok(shell.includes('Coverage'));
assert.ok(shell.includes('Diagnostics'));
assert.ok(shell.includes('Missing CSV'));
assert.ok(shell.includes('Diagnostics CSV'));

const tabSource = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');
assert.match(tabSource, /if \(popup\) return;/);
assert.match(tabSource, /keydown/);
assert.match(tabSource, /event\.key === 'Escape'/);
assert.match(tabSource, /aria-labelledby/);
assert.match(tabSource, /aria-describedby/);

const audit = createPsFamilyClashAuditFromTextInputs({
  expectedCsvText: 'Item Name\n/PS-11147.1\n',
  config: { sourceSide: 'auto', sourceFamily: '', posToleranceMm: 25 },
});

const summary = renderPsFamilySummary(audit);
const coverage = renderPsFamilyReports(audit, 'coverage', PS_FAMILY_CLASH_AUDIT_CONFIG);
const diagnostics = renderPsFamilyReports(audit, 'diagnostics', PS_FAMILY_CLASH_AUDIT_CONFIG);

assert.ok(summary.includes('PS-11147'));
assert.ok(summary.includes('Expected / Found / Missing'));
assert.ok(coverage.includes('Coverage'));
assert.ok(coverage.includes('PS-11147.1'));
assert.ok(diagnostics.includes('Diagnostics'));

console.log('ps-family-clash-audit-ui-smoke tests passed');

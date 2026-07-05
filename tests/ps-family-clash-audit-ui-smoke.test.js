import assert from 'node:assert/strict';
import { createPsFamilyClashAuditFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { renderPsFamilyReports, renderPsFamilySummary } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);

assert.ok(shell.includes('PS Family Clash Audit'));
assert.ok(shell.includes('Clash XML'));
assert.ok(shell.includes('Expected PS CSV'));
assert.ok(shell.includes('Element Detail CSV'));
assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Coverage'));
assert.ok(shell.includes('Diagnostics'));
assert.ok(shell.includes('Missing CSV'));
assert.ok(shell.includes('Diagnostics CSV'));

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

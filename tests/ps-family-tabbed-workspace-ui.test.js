import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
const popup = _test.renderPopup(PS_FAMILY_CLASH_AUDIT_CONFIG);
const source = readFileSync('tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js', 'utf8');

for (const tab of ['Input', 'Preview', 'Config', 'Reports']) {
  assert.ok(shell.includes(`>${tab}</button>`), `missing primary workspace tab ${tab}`);
}
assert.ok(shell.includes('>Run &amp; Export</button>'));

assert.match(shell, /data-psfa-panel="input"[^>]*>/);
assert.match(shell, /data-psfa-panel="preview" hidden/);
assert.match(shell, /data-psfa-panel="config" hidden/);
assert.match(shell, /data-psfa-panel="run" hidden/);
assert.match(shell, /data-psfa-panel="reports" hidden/);

assert.ok(shell.includes('Official sample loaders'));
assert.ok(shell.includes('Load sample clash XML'));
assert.ok(shell.includes('data-psfa-file="xml"'));
assert.ok(shell.includes('data-psfa="xml"'));
assert.ok(shell.includes('data-psfa="expected"'));
assert.ok(shell.includes('data-psfa="details"'));

assert.ok(shell.includes('Clash XML preview/count'));
assert.ok(shell.includes('Expected CSV preview/count'));
assert.ok(shell.includes('Element Detail CSV preview/count'));
assert.ok(shell.includes('data-psfa-preview="xml"'));
assert.ok(shell.includes('data-psfa-preview="expected"'));
assert.ok(shell.includes('data-psfa-preview="details"'));

assert.ok(shell.includes('Source side'));
assert.ok(shell.includes('Source family override'));
assert.ok(shell.includes('POS tolerance mm'));
assert.ok(shell.includes('Copy-(n)-of names are preserved'));

assert.ok(shell.includes('Check Readiness'));
assert.ok(shell.includes('Run Audit'));
assert.ok(shell.includes('Export Active Report'));
assert.ok(shell.includes('Coverage CSV'));
assert.ok(shell.includes('Audit JSON'));

assert.ok(shell.includes('Report search'));
assert.ok(shell.includes('data-psfa-tab="coverage"'));
assert.ok(shell.includes('data-psfa-tab="clashRows"'));
assert.ok(shell.includes('data-psfa-tab="hierarchy"'));
assert.ok(shell.includes('data-psfa="summary"'));
assert.ok(shell.includes('data-psfa="reports"'));

assert.ok(popup.includes('PS Family Clash Audit'));
assert.ok(popup.includes('Close PS clash check'));
assert.match(source, /if \(popup\) return;/);
assert.match(source, /showWorkspacePanel/);
assert.match(source, /panel\.hidden = panel\.dataset\.psfaPanel !== tabKey/);
assert.match(source, /event\.key === 'Escape'/);
assert.doesNotMatch(shell, /Markdown Report/);

console.log('ps-family-tabbed-workspace-ui tests passed');

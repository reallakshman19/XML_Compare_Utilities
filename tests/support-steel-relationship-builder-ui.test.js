import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  renderSupportSteelDialog,
  renderSupportSteelLauncher,
  renderSupportSteelWorkspace,
} from '../tabs/support-steel-relationship-builder/support-steel-relationship-shell.js';

const launcher = renderSupportSteelLauncher();
assert.match(launcher, /Support \/ Steel Relationship Builder/);
assert.match(launcher, /data-ssrb-open="1"/);
assert.match(launcher, /Support family ↔ steel group inference/);

const dialog = renderSupportSteelDialog();
assert.match(dialog, /inferred relationship/i);
assert.match(dialog, /does not prove physical contact/i);
assert.match(dialog, /perform clash detection/i);
assert.match(dialog, /data-ssrb-fullscreen="1"/);
assert.match(dialog, /data-ssrb-close="1"/);

const workspace = renderSupportSteelWorkspace();
for (const tab of ['input', 'rules', 'build', 'relationships', 'evidence', 'export']) {
  assert.ok(workspace.includes(`data-ssrb-tab="${tab}"`), `missing ${tab} tab`);
}
for (const label of [
  'Support source',
  'Steel source',
  'Support family regex',
  'Steel group regex',
  'Projection tolerance mm',
  'Build Relationships',
  'Support-centred hierarchy',
  'Inferred relationship ledger',
  'Selected relationship evidence',
  'Bundle JSON',
  'OWNER',
  'Physical contact remains unproven',
]) assert.ok(workspace.includes(label), `missing UI label ${label}`);

const utilityTab = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const layout = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
assert.match(utilityTab, /installSupportSteelRelationshipBuilderTile/);
assert.match(utilityTab, /destroySupportSteelRelationshipBuilder/);
assert.match(layout, /data-ssrb-open/);

const css = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.css', 'utf8');
assert.match(css, /\.ssrb-results-layout/);
assert.match(css, /\.ssrb-table-wrap/);
assert.match(css, /position:sticky/);
assert.match(css, /\.ssrb-status-resolved-explicit/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('support-steel-relationship-builder-ui tests passed');

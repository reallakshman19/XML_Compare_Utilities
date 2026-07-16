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
assert.match(launcher, /World-geometry support ↔ steel inference/);

const dialog = renderSupportSteelDialog();
assert.match(dialog, /XML-free geometry workspace/i);
assert.match(dialog, /compose hierarchy transforms/i);
assert.match(dialog, /Clash-detection XML is not an input/i);
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
  'Require structural axis or bounds for automatic spatial resolution',
  'SupportSteelAnalyticalGeometry.v1',
  'Build Relationships',
  'Support-centred hierarchy',
  'Geometry evidence ledger',
  'Selected relationship and geometry evidence',
  'Bundle JSON',
  'OWNER',
  'Representative',
  'no Navisworks clash XML is consumed',
]) assert.ok(workspace.includes(label), `missing UI label ${label}`);

const utilityTab = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const layout = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
const relationshipTab = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.js', 'utf8');
const engine = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-engine.js', 'utf8');
assert.match(utilityTab, /installSupportSteelRelationshipBuilderTile/);
assert.match(utilityTab, /destroySupportSteelRelationshipBuilder/);
assert.match(layout, /data-ssrb-open/);
assert.match(relationshipTab, /requireAnalyticalGeometryForSpatialResolution/);
assert.match(relationshipTab, /ssrb-world-geometry-1/);
assert.match(engine, /minimumSupportToSteelGeometryDistance/);
assert.match(engine, /ANALYTICAL_GEOMETRY_PROXIMITY/);
assert.match(engine, /REPRESENTATIVE_POINT_PROXIMITY_NOT_ACCEPTED/);

const css = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.css', 'utf8');
assert.match(css, /\.ssrb-results-layout/);
assert.match(css, /\.ssrb-table-wrap/);
assert.match(css, /position:sticky/);
assert.match(css, /\.ssrb-status-resolved-explicit/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('support-steel-relationship-builder-ui tests passed');

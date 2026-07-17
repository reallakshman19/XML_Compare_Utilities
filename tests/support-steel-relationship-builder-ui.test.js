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
assert.match(launcher, /data-ssrb-version="carrier-structure-path-1"/);
assert.match(launcher, /Complete carrier-to-structure evidence/);

const dialog = renderSupportSteelDialog();
assert.match(dialog, /XML-free assembly workspace/i);
assert.match(dialog, /resolve authoritative carriers/i);
assert.match(dialog, /audit complete carrier-to-structure paths/i);
assert.match(dialog, /Clash-detection XML is not an input/i);
assert.match(dialog, /data-ssrb-fullscreen="1"/);
assert.match(dialog, /data-ssrb-close="1"/);

const workspace = renderSupportSteelWorkspace();
for (const tab of ['input', 'rules', 'build', 'relationships', 'chain', 'evidence', 'export']) {
  assert.ok(workspace.includes(`data-ssrb-tab="${tab}"`), `missing ${tab} tab`);
}
for (const label of [
  'Support source', 'Steel source', 'Support family regex', 'Steel group regex',
  'Steel projection tolerance mm', 'Member contact tolerance mm',
  'Carrier attachment tolerance mm', 'Carrier topology exact tolerance mm',
  'Carrier topology small-gap tolerance mm', 'Complete-path policy',
  'SupportCarrierToStructurePathBundle.v1', 'Build Relationships',
  'Support-centred hierarchy', 'Geometry evidence ledger',
  'Carrier-to-structure path evidence',
  'Complete paths and missing-link exceptions are reported separately',
  'Selected relationship and complete-path evidence',
  'Carrier → Structure Path CSV',
  'Every missing or ambiguous link is reported explicitly',
  'Complete paths remain analytical candidates',
]) assert.ok(workspace.includes(label), `missing UI label ${label}`);

const utilityTab = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const layout = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
const relationshipTab = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.js', 'utf8');
const relationshipView = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-view.js', 'utf8');
const evidenceBundle = readFileSync('tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js', 'utf8');
const pathEngine = readFileSync('tabs/support-steel-relationship-builder/support-carrier-to-structure-path.js', 'utf8');
const pathExport = readFileSync('tabs/support-steel-relationship-builder/support-carrier-to-structure-path-export.js', 'utf8');
const topologyEngine = readFileSync('tabs/support-steel-relationship-builder/support-carrier-topology-engine.js', 'utf8');
const carrierAttachment = readFileSync('tabs/support-steel-relationship-builder/support-carrier-attachment-engine.js', 'utf8');
const chainEngine = readFileSync('tabs/support-steel-relationship-builder/support-member-chain-engine.js', 'utf8');
assert.match(utilityTab, /installSupportSteelRelationshipBuilderTile/);
assert.match(utilityTab, /destroySupportSteelRelationshipBuilder/);
assert.match(layout, /data-ssrb-open/);
assert.match(relationshipTab, /supportCarrierToStructurePathsToCsv/);
assert.match(relationshipTab, /structurePath/);
assert.match(relationshipTab, /ssrb-carrier-structure-path-1/);
assert.match(relationshipView, /Complete carrier-to-structure paths/);
assert.match(relationshipView, /Carrier-to-structure missing-link exceptions/);
assert.match(relationshipView, /ANALYTICAL_PATH_CANDIDATE/);
assert.match(evidenceBundle, /buildSupportCarrierToStructurePathBundle/);
assert.match(evidenceBundle, /STRUCTURE_PATH_AUDIT/);
assert.match(pathEngine, /SupportCarrierToStructurePathBundle\.v1/);
assert.match(pathEngine, /COMPLETE_CARRIER_TO_STRUCTURE_PATH/);
assert.match(pathEngine, /CARRIER_IDENTITY_NOT_RESOLVED/);
assert.match(pathEngine, /SUPPORT_CHAIN_TO_STRUCTURE_INCOMPLETE/);
assert.match(pathEngine, /ANALYTICAL_PATH_CANDIDATE/);
assert.match(pathExport, /supportCarrierToStructurePathsToCsv/);
assert.match(topologyEngine, /EXACT_PORT_CONNECTION/);
assert.match(carrierAttachment, /SUPPORT_MEMBER_TO_CARRIER_ATTACHMENT/);
assert.match(chainEngine, /SUPPORT_MEMBER_TO_STRUCTURE/);

const css = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.css', 'utf8');
assert.match(css, /\.ssrb-results-layout/);
assert.match(css, /\.ssrb-table-wrap/);
assert.match(css, /position:sticky/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('support-steel-relationship-builder-ui tests passed');

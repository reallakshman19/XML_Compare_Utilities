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
assert.match(launcher, /data-ssrb-version="carrier-topology-1"/);
assert.match(launcher, /World-geometry support assembly evidence/);

const dialog = renderSupportSteelDialog();
assert.match(dialog, /XML-free assembly workspace/i);
assert.match(dialog, /resolve authoritative carrier objects/i);
assert.match(dialog, /fail-closed pipe and fitting topology continuity/i);
assert.match(dialog, /support and steel geometry/i);
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
  'Member candidate tolerance mm', 'Carrier attachment tolerance mm',
  'Carrier nearby tolerance mm', 'Carrier topology exact tolerance mm',
  'Carrier topology small-gap tolerance mm',
  'SupportCarrierResolution.v1', 'SupportCarrierAttachmentBundle.v1',
  'SupportCarrierTopologyBundle.v1', 'SupportMemberChainBundle.v1',
  'Build Relationships', 'Support-centred hierarchy', 'Geometry evidence ledger',
  'Support member and carrier topology evidence',
  'Selected relationship, carrier topology and geometry evidence',
  'Member Chain CSV', 'Carrier Resolution CSV', 'Carrier Attachment CSV',
  'Carrier Topology CSV', 'mutually unique exact ports',
  'Multiple exact or repair candidates remain unresolved',
  'no Navisworks clash XML is consumed',
]) assert.ok(workspace.includes(label), `missing UI label ${label}`);

const utilityTab = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const layout = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
const relationshipTab = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.js', 'utf8');
const relationshipView = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-view.js', 'utf8');
const evidenceBundle = readFileSync('tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js', 'utf8');
const topologyCatalog = readFileSync('tabs/support-steel-relationship-builder/support-carrier-topology-catalog.js', 'utf8');
const topologyEngine = readFileSync('tabs/support-steel-relationship-builder/support-carrier-topology-engine.js', 'utf8');
const topologyExport = readFileSync('tabs/support-steel-relationship-builder/support-carrier-topology-export.js', 'utf8');
const carrierResolution = readFileSync('tabs/support-steel-relationship-builder/support-carrier-resolution.js', 'utf8');
const carrierAttachment = readFileSync('tabs/support-steel-relationship-builder/support-carrier-attachment-engine.js', 'utf8');
const chainEngine = readFileSync('tabs/support-steel-relationship-builder/support-member-chain-engine.js', 'utf8');
assert.match(utilityTab, /installSupportSteelRelationshipBuilderTile/);
assert.match(utilityTab, /destroySupportSteelRelationshipBuilder/);
assert.match(layout, /data-ssrb-open/);
assert.match(relationshipTab, /supportCarrierTopologyToCsv/);
assert.match(relationshipTab, /carrierTopologyExactToleranceMm/);
assert.match(relationshipTab, /ssrb-carrier-topology-1/);
assert.match(relationshipView, /Carrier topology continuity/);
assert.match(relationshipView, /Accepted carrier topology/);
assert.match(relationshipView, /Carrier topology review exceptions/);
assert.match(evidenceBundle, /collectSupportCarrierTopologyCatalog/);
assert.match(evidenceBundle, /buildSupportCarrierTopologyBundle/);
assert.match(evidenceBundle, /RELATIONSHIP_MEMBER_CONNECTIVITY_CARRIER_CONTEXT_ATTACHMENT_AND_TOPOLOGY_INFERENCE/);
assert.match(topologyCatalog, /SupportCarrierTopologyCatalog\.v1/);
assert.match(topologyCatalog, /RUN_IN/);
assert.match(topologyCatalog, /BRANCH_OUT/);
assert.match(topologyCatalog, /HOST_ATTACHMENT/);
assert.match(topologyEngine, /SupportCarrierTopologyBundle\.v1/);
assert.match(topologyEngine, /EXACT_PORT_CONNECTION/);
assert.match(topologyEngine, /SMALL_GAP_CARRIER_REPAIR/);
assert.match(topologyEngine, /AMBIGUOUS_EXACT_CARRIER_CONNECTION/);
assert.match(topologyEngine, /CARRIER_COMPONENT_ATTACHMENT/);
assert.match(topologyExport, /supportCarrierTopologyToCsv/);
assert.match(carrierResolution, /SUPPORT_MEMBER_TO_CARRIER/);
assert.match(carrierAttachment, /SUPPORT_MEMBER_TO_CARRIER_ATTACHMENT/);
assert.match(chainEngine, /SUPPORT_MEMBER_TO_STRUCTURE/);

const css = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.css', 'utf8');
assert.match(css, /\.ssrb-results-layout/);
assert.match(css, /\.ssrb-table-wrap/);
assert.match(css, /position:sticky/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('support-steel-relationship-builder-ui tests passed');

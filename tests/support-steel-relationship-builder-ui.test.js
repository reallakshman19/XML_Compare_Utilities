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
assert.match(launcher, /data-ssrb-version="carrier-attachment-1"/);
assert.match(launcher, /World-geometry support assembly evidence/);

const dialog = renderSupportSteelDialog();
assert.match(dialog, /XML-free assembly workspace/i);
assert.match(dialog, /resolve authoritative pipe\/carrier objects/i);
assert.match(dialog, /analytical support-to-carrier attachment candidates/i);
assert.match(dialog, /support and steel analytical geometry/i);
assert.match(dialog, /Clash-detection XML is not an input/i);
assert.match(dialog, /data-ssrb-fullscreen="1"/);
assert.match(dialog, /data-ssrb-close="1"/);

const workspace = renderSupportSteelWorkspace();
for (const tab of ['input', 'rules', 'build', 'relationships', 'chain', 'evidence', 'export']) {
  assert.ok(workspace.includes(`data-ssrb-tab="${tab}"`), `missing ${tab} tab`);
}
for (const label of [
  'Support source',
  'Steel source',
  'Support family regex',
  'Steel group regex',
  'Steel projection tolerance mm',
  'Member contact tolerance mm',
  'Member candidate tolerance mm',
  'Carrier attachment tolerance mm',
  'Carrier nearby tolerance mm',
  'Require structural axis or bounds for steel spatial resolution',
  'Show nearby member clearances separately from contact edges',
  'SupportCarrierResolution.v1',
  'SupportCarrierAttachmentBundle.v1',
  'SupportMemberChainBundle.v1',
  'Build Relationships',
  'Support-centred hierarchy',
  'Geometry evidence ledger',
  'Support member chain evidence',
  'carrier attachment, nearby clearance and symbolic reference remain separate edge classes',
  'Selected relationship, carrier attachment and geometry evidence',
  'Member Chain CSV',
  'Carrier Resolution CSV',
  'Carrier Attachment CSV',
  'Branch context never becomes a physical carrier edge',
  'Representative points may remain diagnostic but cannot resolve carrier attachment',
  'no Navisworks clash XML is consumed',
]) assert.ok(workspace.includes(label), `missing UI label ${label}`);

const utilityTab = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const layout = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
const relationshipTab = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.js', 'utf8');
const evidenceBundle = readFileSync('tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js', 'utf8');
const carrierCatalog = readFileSync('tabs/support-steel-relationship-builder/support-carrier-catalog.js', 'utf8');
const carrierResolution = readFileSync('tabs/support-steel-relationship-builder/support-carrier-resolution.js', 'utf8');
const carrierAttachment = readFileSync('tabs/support-steel-relationship-builder/support-carrier-attachment-engine.js', 'utf8');
const carrierGeometry = readFileSync('tabs/support-steel-relationship-builder/support-carrier-analytical-geometry.js', 'utf8');
const carrierExport = readFileSync('tabs/support-steel-relationship-builder/support-carrier-resolution-export.js', 'utf8');
const engine = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-engine.js', 'utf8');
const chainEngine = readFileSync('tabs/support-steel-relationship-builder/support-member-chain-engine.js', 'utf8');
const memberGeometry = readFileSync('tabs/support-steel-relationship-builder/support-member-analytical-geometry.js', 'utf8');
assert.match(utilityTab, /installSupportSteelRelationshipBuilderTile/);
assert.match(utilityTab, /destroySupportSteelRelationshipBuilder/);
assert.match(layout, /data-ssrb-open/);
assert.match(relationshipTab, /renderSupportMemberChain/);
assert.match(relationshipTab, /supportMemberChainToCsv/);
assert.match(relationshipTab, /supportCarrierResolutionToCsv/);
assert.match(relationshipTab, /supportCarrierAttachmentToCsv/);
assert.match(relationshipTab, /ssrb-carrier-attachment-1/);
assert.match(evidenceBundle, /buildSupportCarrierResolutionBundle/);
assert.match(evidenceBundle, /buildSupportCarrierAttachmentBundle/);
assert.match(evidenceBundle, /RELATIONSHIP_MEMBER_CONNECTIVITY_CARRIER_CONTEXT_AND_ATTACHMENT_INFERENCE/);
assert.match(carrierCatalog, /SupportCarrierCatalog\.v1/);
assert.match(carrierCatalog, /PHYSICAL_PIPE_CARRIER/);
assert.match(carrierResolution, /SupportCarrierResolution\.v1/);
assert.match(carrierResolution, /SUPPORT_MEMBER_TO_CARRIER/);
assert.match(carrierResolution, /SUPPORT_MEMBER_TO_BRANCH_CONTEXT/);
assert.match(carrierResolution, /contactEvidenceStatus: 'NOT_PROVEN'/);
assert.match(carrierAttachment, /SupportCarrierAttachmentBundle\.v1/);
assert.match(carrierAttachment, /SUPPORT_MEMBER_TO_CARRIER_ATTACHMENT/);
assert.match(carrierAttachment, /SUPPORT_MEMBER_TO_CARRIER_NEARBY/);
assert.match(carrierAttachment, /ANALYTICAL_CONTACT_CANDIDATE/);
assert.match(carrierGeometry, /SupportCarrierAnalyticalGeometry\.v1/);
assert.match(carrierGeometry, /supportToCarrierGeometryDistance/);
assert.match(carrierExport, /supportCarrierResolutionToCsv/);
assert.match(carrierExport, /supportCarrierAttachmentToCsv/);
assert.match(engine, /buildSupportMemberChainBundle/);
assert.match(engine, /RELATIONSHIP_AND_MEMBER_CONNECTIVITY_INFERENCE/);
assert.match(chainEngine, /SUPPORT_MEMBER_CONTACT/);
assert.match(chainEngine, /SUPPORT_MEMBER_TO_STRUCTURE/);
assert.match(chainEngine, /contactEvidenceStatus: 'NOT_PROVEN'/);
assert.match(memberGeometry, /WORLD_OBB_SAT_OVERLAP/);
assert.match(memberGeometry, /REPRESENTATIVE_POINT_TO_POINT/);

const css = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.css', 'utf8');
assert.match(css, /\.ssrb-results-layout/);
assert.match(css, /\.ssrb-table-wrap/);
assert.match(css, /position:sticky/);
assert.match(css, /\.ssrb-status-resolved-explicit/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('support-steel-relationship-builder-ui tests passed');

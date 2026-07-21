import './psnm-utility/psnm-context-actions.js?v=20260613-context-actions-no-blocker-1';
import './psnm-utility/psnm-lite-persistence-transform-preview.js?v=20260609-lite-persist-preview-2';
import { renderPSNM_UtilityTab as renderPSNMCoreUtilityTab } from './psnm-utility-tab-coordinate-audit-ui.js?v=20260615-coordinate-audit-phase-d-1';
import { installPsnmAxisAutoAnchorAddon } from './psnm-utility/psnm-axis-auto-anchor-addon.js?v=20260612-axis-auto-anchor-addon-1';
import { installPsnmAnchorPersistenceAddon } from './psnm-utility/psnm-anchor-persistence-addon.js?v=20260613-anchor-persistence-1';
import { installPsMappingUtilityTile } from './ps-mapping-utility-tab-support-prefix-ui.js?v=20260614-support-prefix-ui-no-duplicate-playground-1';
import { installPsMappingModalBridge } from './ps-mapping-utility/ps-mapping-modal-bridge.js?v=20260611-modal-bridge-1';
import { installPsFamilyClashAuditTile } from './ps-family-clash-audit/ps-family-clash-audit-tab.js?v=20260716-ps-family-evidence-graph-1';
import { installPipeline3dModelTile } from './pipeline-3d-model/pipeline-3d-model-tab.js?v=20260712-marker-triangles-1';
import { installPipeline3dTablePasteAddon } from './pipeline-3d-model/pipeline-3d-model-table-paste-addon.js?v=20260721-bend-policy-v3-1';
import { installInputXmlWorkspaceTile } from './inputxml-workspace/inputxml-workspace-tab.js?v=20260710-inputxml-workspace-1';
import { installXmlBuilderUtilityTile } from './xml-builder/xml-builder-utility-tile.js?v=20260710-xml-builder-utility-1';
import { installNavisTagIsonoteUtilityTile } from './navis-tag-isonote/navis-tag-isonote-tab.js?v=20260714-nti-001';
import { installSupportSteelRelationshipBuilderTile } from './support-steel-relationship-builder/support-steel-relationship-tab.js?v=20260717-ssrb-preview-stale-1';
import { installTopologyTraceValidatorTile } from './topology-trace-validator/topology-trace-validator-tab.js?v=20260718-edit-nav-icons-v3';
import { installPsnmUtilityLayoutStabilizer } from './psnm-utility-tab-layout-stabilizer.js?v=20260716-ssrb-layout-1';
import { installSequentialSketcherTile } from './sequential-sketcher/sequential-sketcher-tab.js?v=20260718-ssk-geometry-order-1';
import { installRevisionCompareTile } from './revision-compare/revision-compare-tab.js?v=20260717-rc-001';
import './ps-mapping-utility/ps-mapping-mandatory-audit-shim.js?v=20260610-psmap-audit-tag-1';

function utilityRoot(container) {
  return container.querySelector('.psnm-root') || container;
}

function mountPsMappingLauncher(container, ctx) {
  const root = utilityRoot(container);
  if (root.querySelector('[data-psmap-action="open"]')) return null;
  return installPsMappingUtilityTile(root, ctx);
}

function mountPsFamilyClashAudit(container, ctx) {
  return installPsFamilyClashAuditTile(utilityRoot(container), ctx);
}

function mountPipeline3dModel(container, ctx) {
  return installPipeline3dModelTile(utilityRoot(container), ctx);
}

function mountInputXmlWorkspace(container, ctx) {
  return installInputXmlWorkspaceTile(utilityRoot(container), ctx);
}

function mountXmlBuilder(container, ctx) {
  return installXmlBuilderUtilityTile(utilityRoot(container), ctx);
}

function mountNavisTagIsonote(container, ctx) {
  return installNavisTagIsonoteUtilityTile(utilityRoot(container), ctx);
}

function mountSupportSteelRelationshipBuilder(container, ctx) {
  return installSupportSteelRelationshipBuilderTile(utilityRoot(container), ctx);
}

function mountTopologyTraceValidator(container, ctx) {
  return installTopologyTraceValidatorTile(utilityRoot(container), ctx);
}

function mountSequentialSketcher(container, ctx) {
  return installSequentialSketcherTile(utilityRoot(container), ctx);
}

function mountRevisionCompare(container, ctx) {
  return installRevisionCompareTile(utilityRoot(container), ctx);
}

export function renderPSNM_UtilityTab(container, ctx = {}) {
  const deckRoot = installPsnmUtilityLayoutStabilizer(container, ctx);
  const destroyPSNM = renderPSNMCoreUtilityTab(deckRoot, ctx);
  const destroyAxisAutoAnchor = installPsnmAxisAutoAnchorAddon(deckRoot, ctx);
  const destroyAnchorPersistence = installPsnmAnchorPersistenceAddon(deckRoot, ctx);
  const destroyPsMapping = installPsMappingUtilityTile(deckRoot, ctx);
  const destroySupportSteelRelationshipBuilder = installSupportSteelRelationshipBuilderTile(deckRoot, ctx);
  const destroyPsFamilyClashAudit = installPsFamilyClashAuditTile(deckRoot, ctx);
  const destroyPipeline3dModel = installPipeline3dModelTile(deckRoot, ctx);
  const destroyPipeline3dTablePaste = installPipeline3dTablePasteAddon(deckRoot);
  const destroyInputXmlWorkspace = installInputXmlWorkspaceTile(deckRoot, ctx);
  const destroyXmlBuilder = installXmlBuilderUtilityTile(deckRoot, ctx);
  const destroyNavisTagIsonote = installNavisTagIsonoteUtilityTile(deckRoot, ctx);
  const destroyTopologyTraceValidator = installTopologyTraceValidatorTile(deckRoot, ctx);
  const destroySequentialSketcher = installSequentialSketcherTile(deckRoot, ctx);
  const destroyRevisionCompare = installRevisionCompareTile(deckRoot, ctx);
  const destroyBridge = installPsMappingModalBridge(deckRoot, ctx);

  return () => {
    if (typeof destroyRevisionCompare === 'function') destroyRevisionCompare();
    if (typeof destroySequentialSketcher === 'function') destroySequentialSketcher();
    if (typeof destroyTopologyTraceValidator === 'function') destroyTopologyTraceValidator();
    if (typeof destroyBridge === 'function') destroyBridge();
    if (typeof destroyNavisTagIsonote === 'function') destroyNavisTagIsonote();
    if (typeof destroyXmlBuilder === 'function') destroyXmlBuilder();
    if (typeof destroyInputXmlWorkspace === 'function') destroyInputXmlWorkspace();
    if (typeof destroyPipeline3dTablePaste === 'function') destroyPipeline3dTablePaste();
    if (typeof destroyPipeline3dModel === 'function') destroyPipeline3dModel();
    if (typeof destroyPsFamilyClashAudit === 'function') destroyPsFamilyClashAudit();
    if (typeof destroySupportSteelRelationshipBuilder === 'function') destroySupportSteelRelationshipBuilder();
    if (typeof destroyPsMapping === 'function') destroyPsMapping();
    if (typeof destroyAnchorPersistence === 'function') destroyAnchorPersistence();
    if (typeof destroyAxisAutoAnchor === 'function') destroyAxisAutoAnchor();
    if (typeof destroyPSNM === 'function') destroyPSNM();
    container.innerHTML = '';
  };
}

export default renderPSNM_UtilityTab;

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const sceneAdapter = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-scene-adapter.js');
const readModel = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-read-model.js');
const contracts = source('tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js');
const commandTargets = source('tabs/sequential-sketcher/scoped-edit/sequential-command-targets.js');
const gateway = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-gateway.js');
const panel = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-panel.js');
const panelTargets = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-panel-targets.js');
const presentation = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-presentation.js');
const candidateTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-target-selection.js');
const decisionTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-decision-target.js');
const reversalTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-reversal-target.js');
const supportTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-target.js');
const supportDraft = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-draft.js');
const supportApply = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-apply.js');
const supportPanel = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-panel.js');
const supportFeature = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-feature.js');
const supportBoundary = source('tabs/sequential-sketcher/scoped-edit/sequential-support-adjustment-boundary.js');
const adjustmentRegister = source('tabs/sequential-sketcher/support/sequential-support-adjustment-register.js');
const adjustedProjection = source('tabs/sequential-sketcher/support/sequential-support-adjusted-projection.js');
const svgAuthority = source('tabs/sequential-sketcher/sequential-engineering-svg-authority.js');
const ownerBridge = source('tabs/sequential-sketcher/sequential-engineering-svg-owner-bridge.js');
const boundary = source('tabs/sequential-sketcher/scoped-edit/sequential-workspace-command-boundary.js');
const index = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-index.js');
const markup = source('tabs/sequential-sketcher/sequential-sketcher-markup.js');
const tab = source('tabs/sequential-sketcher/sequential-sketcher-tab.js');
const workspace = source('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
const fixture = source('tests/browser/sequential-engineering-svg-preview-fixture.html');
const browserSpec = source('tests/browser/sequential-scoped-edit-3d.spec.mjs');
const workbenchFixture = source('tests/browser/sequential-scoped-edit-3d-workbench-fixture.html');
const workbenchSpec = source('tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs');
const lifecycleFixture = source('tests/browser/sequential-draft-edit-command-lifecycle-fixture.html');
const lifecycleSpec = source('tests/browser/sequential-draft-edit-command-lifecycle.spec.mjs');
const lifecycleDoc = source('docs/ssk-ts-3h-browser-command-lifecycle.md');
const config = source('playwright.sequential-scoped-edit-3d.config.mjs');

for (const [name, value] of [
  ['visual model', visual], ['3D controller', controller], ['scene adapter', sceneAdapter],
  ['read model', readModel], ['command contracts', contracts], ['command targets', commandTargets],
  ['command gateway', gateway], ['command panel', panel], ['panel targets', panelTargets],
  ['command presentation', presentation], ['candidate target resolver', candidateTarget],
  ['decision target resolver', decisionTarget], ['reversal target resolver', reversalTarget],
  ['support move target', supportTarget], ['support move draft', supportDraft],
  ['support move apply', supportApply], ['support move panel', supportPanel],
  ['support move feature', supportFeature], ['support adjustment boundary', supportBoundary],
  ['support adjustment register', adjustmentRegister], ['adjusted support projection', adjustedProjection],
  ['engineering SVG authority', svgAuthority], ['owner bridge', ownerBridge],
  ['workspace command boundary', boundary],
]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
}
assert(workspace.split(/\r?\n/).length - 1 <= 486,
  'existing Sequential workspace exception must remain at or below 486 lines');

assert.match(sceneAdapter, /category === 'support'/);
assert.match(sceneAdapter, /editCapabilities: \['MOVE_DRAFT'\]/);
assert.match(sceneAdapter, /supportMoveDraftPreview: true/);
assert.match(sceneAdapter, /editing: false/);
assert.match(visual, /composeSequentialSupportMoveDraftScene/);
assert.match(visual, /ORIGINAL SUPPORT/);
assert.match(visual, /DRAFT SUPPORT/);
assert.match(visual, /OVERLAY_STYLE/);

assert.match(adjustmentRegister, /SequentialSupportAdjustmentRegister\.v1/);
assert.match(adjustmentRegister, /headFingerprint/);
assert.match(adjustmentRegister, /appendSequentialSupportAdjustment/);
assert.match(adjustmentRegister, /current adjusted point/);
assert.doesNotMatch(adjustmentRegister, /querySelector|gateway\.|publishCandidate|localStorage/);
assert.match(adjustedProjection, /SequentialAdjustedSupportProjection\.v1/);
assert.match(adjustedProjection, /resolvedSupportFamilies/);
assert.match(adjustedProjection, /supportFamilies/);
assert.match(adjustedProjection, /baseProjectionMutated: false/);
assert.match(adjustedProjection, /silently substitute coordinates/);
assert.doesNotMatch(adjustedProjection, /Object\.assign\(base|localStorage|sessionStorage/);

assert.match(svgAuthority, /validateSupportAuthority/);
assert.match(svgAuthority, /supportAdjustmentRegisterFingerprint/);
assert.match(svgAuthority, /assertSequentialAdjustedSupportProjection/);
assert.match(ownerBridge, /createSequentialAdjustedEngineeringSvgOwnerSnapshot/);
assert.match(ownerBridge, /baseSupportProjection/);
assert.match(ownerBridge, /supportAdjustmentRegister/);
assert.match(readModel, /supportAdjustmentRegisterFingerprint/);

assert.match(supportBoundary, /SequentialSupportAdjustmentBoundary\.v1/);
assert.match(supportBoundary, /const byBranch = new Map\(\)/);
assert.match(supportBoundary, /readEffectiveOwnerSnapshot/);
assert.match(supportBoundary, /readView/);
assert.match(supportBoundary, /publishCandidate/);
assert.match(supportBoundary, /assertSequentialAdjustedSupportProjection/);
assert.doesNotMatch(supportBoundary,
  /restorePackage|constructionTransaction|commandJournal|localStorage|sessionStorage|indexedDB/,
  'support adjustments must remain branch-local and outside construction/persistence authority');

assert.match(supportApply, /SequentialPreparedSupportAdjustment\.v1/);
assert.match(supportApply, /locateSupportOnCarrier/);
assert.match(supportApply, /NOT_SAME_CARRIER/);
assert.match(supportApply, /HIDDEN_SNAP/);
assert.match(supportApply, /appendSequentialSupportAdjustment/);
assert.match(supportApply, /publicationState: 'NOT_PUBLISHED'/);
assert.match(supportApply, /publicationState: 'COMMITTED'/);
assert.doesNotMatch(supportApply,
  /applyConstructionDecision|advanceConstruction|transactionLedger|decisionLedger|commandJournal/);

assert.match(supportTarget, /SequentialDraftEditSupportMoveTarget\.v1/);
assert.match(supportTarget, /SEQUENTIAL_CONFIRMED_SUPPORT/);
assert.match(supportTarget, /MOVE_DRAFT/);
assert.match(supportTarget, /supportAdjustmentRegisterFingerprint/);
assert.doesNotMatch(supportTarget,
  /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|querySelector|gateway\./);
assert.match(supportDraft, /createEngineeringSvgDraftStore/);
assert.match(supportDraft, /type: 'MOVE_ENTITY'/);
assert.match(supportDraft, /publicationState: 'NOT_PUBLISHED'/);
assert.doesNotMatch(supportDraft, /commandGateway|\.commit\(|publishCandidate|gateway\.|transaction|journal/);

assert.match(supportPanel, /Preview move draft/);
assert.match(supportPanel, /Apply adjustment/);
assert.match(supportPanel, /Apply is the only publication action/);
assert.match(supportPanel, /data-ssk-support-move-review/);
assert.match(supportPanel, /data-ssk-draft-edit-actor/);
assert.doesNotMatch(supportPanel, /gateway\.|commandGateway|publishCandidate/);
assert.match(supportFeature, /createSequentialDraftEditSupportMoveApplyService/);
assert.match(supportFeature, /applyService\.prepare/);
assert.match(supportFeature, /applyService\.accept/);
assert.match(supportFeature, /supportAdjustmentBoundary/);
assert.doesNotMatch(supportFeature, /restorePackage|constructionTransaction|commandJournal/);

assert.match(controller, /supportAdjustmentBoundary\.readView/);
assert.match(controller, /supportAdjustmentBoundary: state\.supportAdjustmentBoundary/);
assert.match(controller, /category === 'support'/);
assert.match(controller, /prepareCommand: gateway\.prepare/);
assert.match(controller, /acceptCommand: gateway\.accept/);
const pickBlock = controller.match(/function selectPick[\s\S]*?function viewerOptions/)?.[0] || '';
assert.doesNotMatch(pickBlock, /gateway\.(prepare|accept|execute)|publishCandidate/,
  'picking any target must never prepare, accept, execute or publish');
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand|MOVE_NODE/);
assert.match(tab, /createSequentialSupportAdjustmentBoundary/);
assert.match(tab, /supportAdjustmentAppliedAtProvider/);
assert(tab.indexOf('draftEdit3dController?.destroy();')
  < tab.indexOf('supportAdjustmentBoundary?.destroy();'));
assert(tab.indexOf('supportAdjustmentBoundary?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));

const enabledBlock = contracts.match(/SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES[\s\S]*?\]\);/)?.[0] || '';
for (const commandType of [
  'ADVANCE_ONE', 'RUN_UNTIL_BLOCKED', 'CONNECT_CANDIDATE', 'MANUAL_CONNECT',
  'REJECT_CANDIDATE', 'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT',
  'DEFER_DECISION', 'RESUME_DECISION', 'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(enabledBlock, new RegExp(`'${commandType}'`));
assert.match(commandTargets, /projectSequentialReversalCandidates/);
assert.doesNotMatch(commandTargets, /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition/);
assert.match(reversalTarget, /validateSequentialDraftEditReversalTarget/);
assert.match(panelTargets, /SEQUENTIAL_DRAFT_EDIT_REVERSAL_COMMANDS/);
assert.match(panel, /gateway\.prepare\(/);
assert.match(panel, /gateway\.accept\(/);
assert.doesNotMatch(panel, /gateway\.execute\(/);
for (const label of [
  'Reversal candidate:', 'Component:', 'Entry port:', 'Scene entity:',
  'Predicted outcome:', 'Prepared ID:', 'Authority ID:', 'Transaction mapping:',
]) assert.match(presentation, new RegExp(label));

for (const moduleName of [
  'sequential-draft-edit-reversal-target', 'sequential-draft-edit-support-move-target',
  'sequential-draft-edit-support-move-draft', 'sequential-draft-edit-support-move-panel',
  'sequential-draft-edit-support-move-feature', 'sequential-draft-edit-support-move-apply',
  'sequential-support-adjustment-boundary',
]) assert.match(index, new RegExp(moduleName));
assert.equal([...markup.matchAll(/data-ssk-draft-edit-command="/g)].length, 12,
  'SSK-TS-3I must preserve exactly twelve qualified construction command buttons');
for (const commandType of [
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE',
  'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT', 'ADVANCE_ONE',
  'RUN_UNTIL_BLOCKED', 'DEFER_DECISION', 'RESUME_DECISION',
  'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(markup, new RegExp(`data-ssk-draft-edit-command="${commandType}"`));
assert.doesNotMatch(markup, /data-ssk-support-move-(?:apply|publish|commit)/);
assert.match(gateway, /createSequentialCommandService/);
assert.doesNotMatch(gateway, /querySelector|addEventListener|onPick|beginDrag|commitDrag/);
assert.match(boundary, /SequentialWorkspaceRestoration\.v2/);
assert.doesNotMatch(boundary, /supportAdjustment|Object\.assign\(model/,
  'construction command boundary must not own support adjustments');

assert.match(fixture, /createSequentialScopedEdit3dViewer/);
assert.match(browserSpec, /SSK-TS-1B-B10/);
assert.match(workbenchFixture, /type="importmap"/);
assert.match(workbenchSpec, /SSK-TS-1B-W04/);
assert.match(lifecycleFixture, /createSequentialDraftEditCommandPanel/);
assert.equal([...lifecycleFixture.matchAll(/data-ssk-draft-edit-command="/g)].length, 12);
assert.doesNotMatch(lifecycleFixture,
  /data-ssk-(?:candidate|component|connection|entry-port|from-port|to-port)-id/);
assert.match(lifecycleSpec, /SSK-TS-3H-B01/);
assert.match(lifecycleSpec, /SSK-TS-3H-B07/);
assert.match(lifecycleSpec, /\.locator\([^\n]+\)\.click\(\)/);
assert.doesNotMatch(lifecycleSpec,
  /panel\.(?:prepare|accept)\(|gateway\.(?:prepare|accept|execute)\(|prepareCommand\(|acceptCommand\(|executeCommand\(/);
assert.match(lifecycleDoc, /Browser-qualified supervised command lifecycle/);
assert.match(config, /sequential-draft-edit-command-lifecycle\.spec\.mjs/);

console.log('Sequential SSK-TS-3I support adjustment and browser lifecycle containment: ok');

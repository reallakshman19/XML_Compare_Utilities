import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const sceneAdapter = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-scene-adapter.js');
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
const supportPanel = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-panel.js');
const supportFeature = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-feature.js');
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
const lifecycleDoc = source('docs/ssk-ts-3h-q-browser-command-lifecycle.md');
const config = source('playwright.sequential-scoped-edit-3d.config.mjs');

for (const [name, value] of [
  ['visual model', visual], ['3D controller', controller], ['scene adapter', sceneAdapter],
  ['command contracts', contracts], ['command targets', commandTargets], ['command gateway', gateway],
  ['command panel', panel], ['panel targets', panelTargets], ['command presentation', presentation],
  ['candidate target resolver', candidateTarget], ['decision target resolver', decisionTarget],
  ['reversal target resolver', reversalTarget], ['support move target', supportTarget],
  ['support move draft', supportDraft], ['support move panel', supportPanel],
  ['support move feature', supportFeature], ['workspace command boundary', boundary],
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
assert.match(visual, /reversalCandidate/);

assert.match(controller, /createSequentialDraftEditSupportMoveFeature/);
assert.match(controller, /category === 'support'/);
assert.match(controller, /state\.supportMove\.select/);
assert.match(controller, /draft: state\.supportMove\?\.getDraft/);
assert.match(controller, /supportMove\?\.invalidate/);
assert.match(controller, /supportMove\?\.setActive\(false\)/);
assert.match(controller, /selectSequentialDraftEditCandidateTarget/);
assert.match(controller, /selectSequentialDraftEditReversalTarget/);
assert.match(controller, /prepareCommand: gateway\.prepare/);
assert.match(controller, /acceptCommand: gateway\.accept/);
assert.match(controller, /executeCommand: gateway\.execute/);
const pickBlock = controller.match(/function selectPick[\s\S]*?function viewerOptions/)?.[0] || '';
assert.doesNotMatch(pickBlock, /gateway\.(prepare|accept|execute)|publishCandidate/,
  'picking any target must never prepare, accept, execute or publish');
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand|MOVE_NODE/);

const enabledBlock = contracts.match(/SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES[\s\S]*?\]\);/)?.[0] || '';
for (const commandType of [
  'ADVANCE_ONE', 'RUN_UNTIL_BLOCKED', 'CONNECT_CANDIDATE', 'MANUAL_CONNECT',
  'REJECT_CANDIDATE', 'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT',
  'DEFER_DECISION', 'RESUME_DECISION', 'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(enabledBlock, new RegExp(`'${commandType}'`));

assert.match(commandTargets, /projectSequentialReversalCandidates/);
assert.match(commandTargets, /command\.commandType === 'REVERSE_COMPONENT'/);
assert.doesNotMatch(commandTargets, /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition/);

assert.match(reversalTarget, /SequentialDraftEditReversalTarget\.v1/);
assert.match(reversalTarget, /validateSequentialDraftEditReversalTarget/);
assert.doesNotMatch(reversalTarget,
  /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|coordinateTolerance|querySelector|gateway\./);

assert.match(supportTarget, /SequentialDraftEditSupportMoveTarget\.v1/);
assert.match(supportTarget, /SEQUENTIAL_CONFIRMED_SUPPORT/);
assert.match(supportTarget, /MOVE_DRAFT/);
assert.match(supportTarget, /SequentialConfirmedSupportProjection\.v1/);
assert.match(supportTarget, /centerlinePointGlobal/);
assert.match(supportTarget, /validateSequentialDraftEditSupportMoveTarget/);
assert.doesNotMatch(supportTarget,
  /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|querySelector|gateway\./,
  'support targeting must use exact certified identity only');

assert.match(supportDraft, /createEngineeringSvgDraftStore/);
assert.match(supportDraft, /createEngineeringEditIntent/);
assert.match(supportDraft, /type: 'MOVE_ENTITY'/);
assert.match(supportDraft, /composeEngineeringSvgDraftScene/);
assert.match(supportDraft, /publicationState: 'NOT_PUBLISHED'/);
assert.doesNotMatch(supportDraft, /commandGateway|\.commit\(|publishCandidate|gateway\.|transaction|journal/,
  'support move draft must expose no publication path');

assert.match(supportPanel, /Preview move draft/);
assert.match(supportPanel, /Cancel draft/);
assert.match(supportPanel, /data-ssk-draft-edit-actor/);
assert.match(supportPanel, /data-ssk-draft-edit-reason/);
assert.match(supportPanel, /data-ssk-draft-edit-evidence/);
assert.doesNotMatch(supportPanel, /Apply|Accept|Commit|Publish|gateway\.|publishCandidate/);
assert.match(supportFeature, /validateSequentialDraftEditSupportMoveTarget/);
assert.match(supportFeature, /onDraftChanged/);
assert.doesNotMatch(supportFeature, /gateway\.|publishCandidate|commandGateway|\.commit\(/);

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
  'sequential-draft-edit-support-move-feature',
]) assert.match(index, new RegExp(moduleName));
assert.match(markup, /data-ssk-draft-edit-3d/);
assert.equal([...markup.matchAll(/data-ssk-draft-edit-command="/g)].length, 12,
  'SSK-TS-3H must preserve exactly twelve qualified construction command buttons');
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
assert.doesNotMatch(boundary, /Object\.assign\(model/);
assert.match(tab, /createSequentialWorkspaceCommandBoundary/);
assert(tab.indexOf('draftEdit3dController?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));
assert.match(fixture, /createSequentialScopedEdit3dViewer/);
assert.match(browserSpec, /SSK-TS-1B-B10/);
assert.doesNotMatch(browserSpec, /appendEditCommand|commitDrag|beginDrag/);
assert.match(workbenchFixture, /type="importmap"/);
assert.match(workbenchSpec, /SSK-TS-1B-W04/);

assert.match(lifecycleFixture, /createSequentialDraftEditCommandPanel/);
assert.match(lifecycleFixture, /projectSequentialReversalCandidates/);
assert.equal([...lifecycleFixture.matchAll(/data-ssk-draft-edit-command="/g)].length, 12,
  'SSK-TS-3H-Q fixture must expose exactly twelve supervised command controls');
assert.doesNotMatch(lifecycleFixture,
  /data-ssk-(?:candidate|component|connection|entry-port|from-port|to-port)-id/,
  'browser qualification must not expose free-form authority inputs');
assert.match(lifecycleFixture, /setMode\('candidate'\)/);
assert.match(lifecycleFixture, /panel\.setActive\(false\)/);
assert.match(lifecycleSpec, /SSK-TS-3H-B01/);
assert.match(lifecycleSpec, /SSK-TS-3H-B07/);
assert.match(lifecycleSpec, /\.locator\([^\n]+\)\.click\(\)/);
assert.match(lifecycleSpec, /data-ssk-draft-edit-command-accept/);
assert.match(lifecycleSpec, /data-ssk-draft-edit-command-cancel/);
assert.doesNotMatch(lifecycleSpec,
  /panel\.(?:prepare|accept)\(|gateway\.(?:prepare|accept|execute)\(|prepareCommand\(|acceptCommand\(|executeCommand\(/,
  'primary browser lifecycle proof must use visible DOM controls');
assert.doesNotMatch(lifecycleSpec, /appendEditCommand|commitDrag|beginDrag|rotate|stretch|breakTopology/);
assert.match(lifecycleDoc, /Browser-qualified supervised command lifecycle/);
assert.match(lifecycleDoc, /Exact-head Playwright execution: not available/);
assert.match(config, /sequential-scoped-edit-3d-workbench\.spec\.mjs/);
assert.match(config, /sequential-draft-edit-command-lifecycle\.spec\.mjs/);

console.log('Sequential SSK-TS-3H-Q browser lifecycle plus support move containment: ok');

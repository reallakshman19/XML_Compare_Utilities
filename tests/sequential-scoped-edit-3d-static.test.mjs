import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const contracts = source('tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js');
const commandTargets = source('tabs/sequential-sketcher/scoped-edit/sequential-command-targets.js');
const gateway = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-gateway.js');
const panel = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-panel.js');
const panelTargets = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-panel-targets.js');
const presentation = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-presentation.js');
const candidateTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-target-selection.js');
const decisionTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-decision-target.js');
const reversalTarget = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-reversal-target.js');
const boundary = source('tabs/sequential-sketcher/scoped-edit/sequential-workspace-command-boundary.js');
const index = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-index.js');
const markup = source('tabs/sequential-sketcher/sequential-sketcher-markup.js');
const tab = source('tabs/sequential-sketcher/sequential-sketcher-tab.js');
const workspace = source('tabs/sequential-sketcher/sequential-sketcher-workspace.js');
const fixture = source('tests/browser/sequential-engineering-svg-preview-fixture.html');
const browserSpec = source('tests/browser/sequential-scoped-edit-3d.spec.mjs');
const workbenchFixture = source('tests/browser/sequential-scoped-edit-3d-workbench-fixture.html');
const workbenchSpec = source('tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs');
const config = source('playwright.sequential-scoped-edit-3d.config.mjs');

for (const [name, value] of [
  ['visual model', visual], ['3D controller', controller], ['command contracts', contracts],
  ['command targets', commandTargets], ['command gateway', gateway], ['command panel', panel],
  ['panel targets', panelTargets], ['command presentation', presentation],
  ['candidate target resolver', candidateTarget], ['decision target resolver', decisionTarget],
  ['reversal target resolver', reversalTarget], ['workspace command boundary', boundary],
]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
}
assert(workspace.split(/\r?\n/).length - 1 <= 486,
  'existing Sequential workspace exception must remain at or below 486 lines');

assert.match(visual, /createVisualGeometryModelV2/);
assert.match(visual, /reversalCandidate/);
assert.match(controller, /selectSequentialDraftEditCandidateTarget/);
assert.match(controller, /selectSequentialDraftEditReversalTarget/);
assert.match(controller, /selectionCategory/);
assert.match(controller, /category === 'reversalCandidate'/);
assert.match(controller, /setReversalTarget/);
assert.match(controller, /clearReversalTarget/);
assert.match(controller, /Pick alone does not issue a command/);
assert.match(controller, /invalidateTarget: true/);
assert.match(controller, /commandPanel\?\.setActive\(false\)/);
assert.match(controller, /getSequentialScopedEdit3dController/);
assert.match(controller, /prepareCommand: gateway\.prepare/);
assert.match(controller, /acceptCommand: gateway\.accept/);
assert.match(controller, /executeCommand: gateway\.execute/);
const pickBlock = controller.match(/function selectPick[\s\S]*?function viewerOptions/)?.[0] || '';
assert.doesNotMatch(pickBlock, /gateway\.(prepare|accept|execute)|publishCandidate/,
  'picking a reversal entry must never prepare, accept, execute or publish');
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand/);

const enabledBlock = contracts.match(/SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES[\s\S]*?\]\);/)?.[0] || '';
for (const commandType of [
  'ADVANCE_ONE', 'RUN_UNTIL_BLOCKED', 'CONNECT_CANDIDATE', 'MANUAL_CONNECT',
  'REJECT_CANDIDATE', 'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT',
  'DEFER_DECISION', 'RESUME_DECISION', 'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(enabledBlock, new RegExp(`'${commandType}'`));

assert.match(commandTargets, /projectSequentialReversalCandidates/);
assert.match(commandTargets, /command\.commandType === 'REVERSE_COMPONENT'/);
assert.match(commandTargets, /candidate\.componentId !== command\.componentId/);
assert.match(commandTargets, /entryPort\.componentId !== component\.componentId/);
assert.doesNotMatch(commandTargets, /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition/);

assert.match(reversalTarget, /SequentialDraftEditReversalTarget\.v1/);
assert.match(reversalTarget, /assertSequentialScopedEditReadModel/);
assert.match(reversalTarget, /assertSequentialScopedEditSceneAncestry/);
assert.match(reversalTarget, /projectSequentialReversalCandidates/);
assert.match(reversalTarget, /state\.session\.confirmedComponentIds/);
assert.match(reversalTarget, /reversalTargetId/);
assert.match(reversalTarget, /validateSequentialDraftEditReversalTarget/);
assert.doesNotMatch(reversalTarget,
  /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|coordinateTolerance|querySelector|gateway\./,
  'reversal targeting must use exact certified identity only');

assert.match(panelTargets, /SEQUENTIAL_DRAFT_EDIT_REVERSAL_COMMANDS/);
assert.match(panelTargets, /projectSequentialReversalCandidates/);
assert.match(panelTargets, /createSequentialDraftEditCommandRequest/);
assert.match(panelTargets, /componentId: target\?\.componentId/);
assert.match(panelTargets, /entryPortId: target\?\.entryPortId/);
assert.match(panelTargets, /reversalTargetId: target\?\.reversalTargetId/);
assert.match(panelTargets, /Operator actor ID is required/);
assert.match(panelTargets, /requires an operator reason/);
assert.match(panelTargets, /requires an evidence note/);
assert.doesNotMatch(panelTargets, /gateway\.|publishCandidate|querySelector/);

assert.match(panel, /setReversalTarget/);
assert.match(panel, /clearReversalTarget/);
assert.match(panel, /createSequentialDraftEditCommandRequest/);
assert.match(panel, /gateway\.prepare\(/);
assert.match(panel, /gateway\.accept\(/);
assert.match(panel, /Prepared command cancelled without authority mutation/);
assert.match(panel, /Prepare does not publish authority/);
assert.doesNotMatch(panel, /gateway\.execute\(/,
  'visible command controls must never use direct execute');
assert.doesNotMatch(panel, /\bbeginDrag\b|\bcommitDrag\b|\brotate\b|\bstretch\b|breakTopology/);

for (const label of [
  'Reversal candidate:', 'Component:', 'Entry port:', 'Scene entity:',
  'Predicted outcome:', 'Prepared ID:', 'Authority ID:', 'Transaction mapping:',
]) assert.match(presentation, new RegExp(label));
assert.doesNotMatch(presentation, /gateway\.|readCurrentState|deriveSequentialEditAuthority|publishCandidate/,
  'presentation helper must not own command authority');

assert.match(index, /sequential-draft-edit-reversal-target/);
assert.match(markup, /data-ssk-draft-edit-3d/);
assert.equal([...markup.matchAll(/data-ssk-draft-edit-command="/g)].length, 12,
  'SSK-TS-3G must expose exactly twelve qualified command buttons');
for (const commandType of [
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE',
  'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT', 'ADVANCE_ONE',
  'RUN_UNTIL_BLOCKED', 'DEFER_DECISION', 'RESUME_DECISION',
  'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(markup, new RegExp(`data-ssk-draft-edit-command="${commandType}"`));
assert.equal([...markup.matchAll(/data-ssk-draft-edit-command="REVERSE_COMPONENT"/g)].length, 1);
assert.doesNotMatch(markup,
  /data-ssk-(?:from|to|entry)-port|data-ssk-(?:manual|reversal)-(?:port|component)|data-ssk-command-execute|data-ssk-coordinate-edit/,
  'reversal and manual connect must not expose free-form target or execution controls');

assert.match(gateway, /createSequentialCommandService/);
assert.doesNotMatch(gateway, /querySelector|addEventListener|onPick|beginDrag|commitDrag/);
assert.match(boundary, /SequentialWorkspaceRestoration\.v2/);
assert.doesNotMatch(boundary, /Object\.assign\(model/);
assert.match(tab, /createSequentialWorkspaceCommandBoundary/);
assert.match(tab, /commandBoundary/);
assert(tab.indexOf('draftEdit3dController?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));
assert.match(fixture, /createSequentialScopedEdit3dViewer/);
assert.match(browserSpec, /SSK-TS-1B-B10/);
assert.doesNotMatch(browserSpec, /appendEditCommand|commitDrag|beginDrag/);
assert.match(workbenchFixture, /type="importmap"/);
assert.match(workbenchSpec, /SSK-TS-1B-W04/);
assert.match(config, /sequential-scoped-edit-3d-workbench\.spec\.mjs/);

console.log('Sequential SSK-TS-3G supervised component reversal static containment: ok');
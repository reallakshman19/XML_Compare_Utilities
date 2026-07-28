import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(relative) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

const authority = source('tabs/sequential-sketcher/sequential-engineering-svg-authority.js');
const scene = source('tabs/sequential-sketcher/sequential-engineering-svg-scene.js');
const reversalScene = source('tabs/sequential-sketcher/sequential-engineering-svg-reversal-scene.js');
const readModel = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-read-model.js');
const visual = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js');
const controller = source('tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js');
const contracts = source('tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js');
const gateway = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-gateway.js');
const panel = source('tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-panel.js');
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
  ['engineering SVG authority', authority], ['engineering SVG scene', scene],
  ['reversal scene projection', reversalScene], ['read model', readModel],
  ['visual model', visual], ['3D controller', controller], ['command contracts', contracts],
  ['command gateway', gateway], ['command panel', panel], ['command presentation', presentation],
  ['candidate target resolver', candidateTarget], ['decision target resolver', decisionTarget],
  ['reversal target resolver', reversalTarget], ['workspace command boundary', boundary],
]) {
  assert(value.split(/\r?\n/).length <= 300, `${name} must remain under 300 lines`);
  assert.doesNotMatch(value, /export\s+default|module\.exports|exports\./);
}
assert(workspace.split(/\r?\n/).length - 1 <= 486,
  'existing Sequential workspace exception must remain at or below 486 lines');

assert.match(authority, /projectSequentialReversalCandidates/);
assert.match(authority, /reversalCandidates: projectSequentialReversalCandidates\(session, indexes\)/);
assert.match(scene, /buildSequentialReversalSceneEntities/);
assert.match(scene, /reversalCandidateCount/);
assert.match(reversalScene, /buildSequentialReversalCandidates/);
assert.match(reversalScene, /SEQUENTIAL_REVERSAL_CANDIDATE/);
assert.match(reversalScene, /category: 'reversalCandidate'/);
assert.match(reversalScene, /createPointGeometry\(position\)/);
assert.match(reversalScene, /REVERSAL_ENTRY_PORT_POSITION_MISSING/);
assert.match(reversalScene, /editCapabilities: \[\]/);
assert.doesNotMatch(reversalScene,
  /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|coordinateTolerance/,
  'reversal scene projection must not infer geometry or proximity');
assert.match(readModel, /`ssk:reversal:\$\{text\}`/);

assert.match(visual, /createVisualGeometryModelV2/);
assert.match(visual, /assertSequentialScopedEditSceneAncestry/);
assert.match(visual, /reversalCandidate: Object\.freeze/);
assert.match(visual, /REVERSE ENTRY/);
assert.match(controller, /workbench-viewer\.js/);
assert.match(controller, /setMode\('target-only'\)/);
assert.match(controller, /selectSequentialDraftEditCandidateTarget/);
assert.match(controller, /createSequentialDraftEditDecisionTarget/);
assert.match(controller, /selectSequentialDraftEditReversalTarget/);
assert.match(controller, /validateSequentialDraftEditReversalTarget/);
assert.match(controller, /function selectReversalPick/);
assert.match(controller, /Selection is read-only/);
assert.match(controller, /reversalTarget: state\.reversalTarget/);
assert.match(controller, /state\.reversalTarget = null/);
assert.match(controller, /onPick: \(pick\) => selectPick/);
assert.match(controller, /Pick alone does not issue a command/);
assert.match(controller, /setCandidateTarget/);
assert.match(controller, /clearCandidateTarget/);
assert.match(controller, /setDecisionTarget/);
assert.match(controller, /clearDecisionTarget/);
assert.match(controller, /invalidateTarget: true/);
assert.match(controller, /prepareCommand: gateway\.prepare/);
assert.match(controller, /acceptCommand: gateway\.accept/);
assert.match(controller, /executeCommand: gateway\.execute/);
assert.doesNotMatch(controller,
  /function selectReversalPick[\s\S]{0,700}gateway\.(prepare|accept|execute)/,
  'reversal selection must not prepare, accept or execute a command');
assert.doesNotMatch(controller, /wireTopologyEditGestures|beginDrag|commitDrag|appendEditCommand/);

const enabledBlock = contracts.match(/SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES[\s\S]*?\]\);/)?.[0] || '';
for (const commandType of [
  'ADVANCE_ONE', 'RUN_UNTIL_BLOCKED', 'CONNECT_CANDIDATE', 'MANUAL_CONNECT',
  'REJECT_CANDIDATE', 'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY',
  'DEFER_DECISION', 'RESUME_DECISION', 'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(enabledBlock, new RegExp(`'${commandType}'`));
assert.doesNotMatch(enabledBlock, /'REVERSE_COMPONENT'/);

assert.match(gateway, /createSequentialCommandService/);
assert.match(gateway, /SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES/);
assert.match(gateway, /validateSequentialCommandJournalState/);
assert.match(gateway, /deriveSequentialEditAuthority/);
assert.match(gateway, /COMMAND_BRANCH_MISMATCH/);
assert.match(gateway, /COMMAND_RUNTIME_NOT_DETERMINISTIC/);
assert.match(gateway, /COMMAND_AUTHORITY_MISMATCH/);
assert.doesNotMatch(gateway, /querySelector|addEventListener|onPick|beginDrag|commitDrag/);

for (const targetSource of [candidateTarget, decisionTarget, reversalTarget]) {
  assert.match(targetSource, /assertSequentialScopedEditReadModel/);
  assert.match(targetSource, /assertSequentialScopedEditSceneAncestry/);
  assert.match(targetSource, /deriveSequentialEditAuthority/);
  assert.doesNotMatch(targetSource,
    /Math\.hypot|distance\s*\(|nearest|raycast|screenPosition|coordinateTolerance/);
  assert.doesNotMatch(targetSource, /querySelector|addEventListener|onPick|gateway\./);
}
assert.match(candidateTarget, /entity\.domainRef\?\.category !== 'candidate'/);
assert.match(candidateTarget, /targetSelectionId/);
assert.match(candidateTarget, /validateSequentialDraftEditCandidateTarget/);
assert.match(decisionTarget, /SEQUENTIAL_DRAFT_EDIT_BOUNDARY_REASONS/);
assert.match(decisionTarget, /decisionTargetId/);
assert.match(decisionTarget, /validateSequentialDraftEditDecisionTarget/);
assert.match(reversalTarget, /projectSequentialReversalCandidates/);
assert.match(reversalTarget, /ref\.category !== 'reversalCandidate'/);
assert.match(reversalTarget, /indexes\.components/);
assert.match(reversalTarget, /indexes\.ports/);
assert.match(reversalTarget, /entryPort\.componentId !== resolved\.componentId/);
assert.match(reversalTarget, /reversalTargetId/);
assert.match(reversalTarget, /validateSequentialDraftEditReversalTarget/);

assert.match(panel, /MANUAL_CONNECT/);
assert.match(panel, /exactManualPorts/);
assert.match(panel, /gateway\.prepare\(/);
assert.match(panel, /gateway\.accept\(/);
assert.match(panel, /setCandidateTarget/);
assert.match(panel, /setDecisionTarget/);
assert.match(panel, /Prepared command cancelled without authority mutation/);
assert.match(panel, /Prepare does not publish authority/);
assert.doesNotMatch(panel, /gateway\.execute\(/);
assert.doesNotMatch(panel, /REVERSE_COMPONENT/);
assert.doesNotMatch(panel, /\bbeginDrag\b|\bcommitDrag\b|\brotate\b|\bstretch\b|breakTopology/);
assert.match(presentation, /sequentialDraftEditCommandPanelElements/);
assert.match(presentation, /sequentialDraftEditPreparedPreview/);
assert.doesNotMatch(presentation,
  /gateway\.|readCurrentState|deriveSequentialEditAuthority|publishCandidate/);

assert.match(boundary, /SequentialWorkspaceRestoration\.v2/);
assert.match(boundary, /restorePackage/);
assert.match(boundary, /expectedJournalImpact: 'REPLACE'/);
assert.match(boundary, /before-commit/);
assert.match(boundary, /SequentialCommandOwnerRevision\.v1/);
assert.match(boundary, /journalHeadFingerprint/);
assert.doesNotMatch(boundary, /Object\.assign\(model/);

assert.match(index, /sequential-draft-edit-command-gateway/);
assert.match(index, /sequential-draft-edit-command-panel/);
assert.match(index, /sequential-draft-edit-target-selection/);
assert.match(index, /sequential-draft-edit-decision-target/);
assert.match(index, /sequential-draft-edit-reversal-target/);
assert.match(index, /sequential-workspace-command-boundary/);
assert.match(markup, /data-ssk-draft-edit-command-panel hidden aria-hidden="true" inert/);
assert.equal([...markup.matchAll(/data-ssk-draft-edit-command="/g)].length, 11,
  'SSK-TS-3F must preserve exactly eleven qualified command-selection buttons');
for (const commandType of [
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE',
  'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'ADVANCE_ONE',
  'RUN_UNTIL_BLOCKED', 'DEFER_DECISION', 'RESUME_DECISION',
  'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]) assert.match(markup, new RegExp(`data-ssk-draft-edit-command="${commandType}"`));
assert.doesNotMatch(markup, /REVERSE_COMPONENT/);
assert.doesNotMatch(markup,
  /data-ssk-(?:from|to)-port|data-ssk-manual-port|data-ssk-command-execute|data-ssk-draft-edit-drag|data-ssk-coordinate-edit/);

assert.match(tab, /createSequentialWorkspaceCommandBoundary/);
assert.match(tab, /scopedEditShadow\?\.observe\(\)/);
assert.match(tab, /createViewer: context\.createSequentialScopedEdit3dViewer/);
assert(tab.indexOf('draftEdit3dController?.destroy();') < tab.indexOf('scopedEditShadow?.destroy();'));
assert.match(fixture, /createSequentialScopedEdit3dViewer/);
assert.match(fixture, /getSequentialScopedEdit3dController/);
assert.match(browserSpec, /SSK-TS-1B-B10/);
assert.doesNotMatch(browserSpec, /appendEditCommand|commitDrag|beginDrag/);
assert.match(workbenchFixture, /three@0\.160\.0/);
assert.match(workbenchSpec, /SSK-TS-1B-W04/);
assert.match(config, /sequential-scoped-edit-3d-workbench\.spec\.mjs/);

console.log('Sequential SSK-TS-3F certified reversal candidate projection containment: ok');

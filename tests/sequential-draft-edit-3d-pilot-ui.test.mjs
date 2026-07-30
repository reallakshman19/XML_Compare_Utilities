import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createSequentialConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { createSequentialCommandJournalState } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js';
import { SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js';
import { createSequentialDraftEdit3dPilotFeature } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js';

class FakeElement {
  constructor(tag, root = null) {
    this.tagName = tag; this.root = root; this.listeners = new Map();
    this.attributes = new Map(); this.disabled = false; this.isConnected = true;
    this.textContent = ''; this.download = ''; this.href = '';
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'data-ssk-draft-edit-pilot-export') this.root.baseline = this;
    if (name === 'data-ssk-draft-edit-walkthrough-export') this.root.walkthrough = this;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  insertAdjacentElement(_where, element) {
    element.root = this.root; element.isConnected = true;
    if (element.attributes.has('data-ssk-draft-edit-pilot-export')) this.root.baseline = element;
    if (element.attributes.has('data-ssk-draft-edit-walkthrough-export')) this.root.walkthrough = element;
    return element;
  }
  click() {
    const listener = this.listeners.get('click');
    if (listener) listener({ preventDefault() {}, stopImmediatePropagation() {}, target: this });
    else if (this.tagName === 'a') this.root.downloads.push({ fileName: this.download, href: this.href });
  }
  remove() {
    this.isConnected = false;
    if (this.root?.baseline === this) this.root.baseline = null;
    if (this.root?.walkthrough === this) this.root.walkthrough = null;
  }
}
class FakeDocument {
  constructor(root) { this.root = root; this.body = { appendChild: (node) => { node.isConnected = true; } }; }
  createElement(tag) { return new FakeElement(tag, this.root); }
}
class FakeRoot {
  constructor() {
    this.baseline = null; this.walkthrough = null; this.downloads = [];
    this.draft = new FakeElement('button', this); this.ownerDocument = new FakeDocument(this);
  }
  querySelector(selector) {
    if (selector === '[data-ssk-draft-edit-3d]') return this.draft;
    if (selector === '[data-ssk-draft-edit-pilot-export]') return this.baseline;
    if (selector === '[data-ssk-draft-edit-walkthrough-export]') return this.walkthrough;
    return null;
  }
}

const registry = createSequentialBranchWorkspaceRegistry();
registry.reset(['B1']);
registry.save('B1', { session: createSequentialConstructionSession('B1') });
const journalState = createSequentialCommandJournalState({
  documentId: 'DOC-UI', sessionId: 'SESSION-UI', sourceFingerprint: 'SOURCE',
  branchSetFingerprint: 'BRANCH-SET-UI', branchRegistry: registry,
  adoptedAt: '2026-07-30T02:20:00.000Z',
});
const state = {
  available: false, exports: [], walkthroughs: [], unsubscribed: false, ownerListener: null,
};
const controllerState = () => ({ available: state.available, mounted: true, active: true,
  mountKey: 'MOUNT', failureCount: 0, destroyed: false, viewerState: { runtimeError: null },
  commandGateway: { allowedCommandTypes: SEQUENTIAL_DRAFT_EDIT_3D_CAPABILITIES.supervisedCommands } });
const root = new FakeRoot();
const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
URL.createObjectURL = () => 'blob:pilot'; URL.revokeObjectURL = () => {};
const common = {
  controller: { schema: 'SequentialScopedEdit3dController.v1', getState: controllerState },
  shadow: { evidence: () => ({ schema: 'SequentialScopedEditProductionShadowEvidence.v1', mountKey: 'MOUNT' }) },
  commandBoundary: { readCurrentState: () => ({ sourceFingerprint: 'SOURCE', session: { rootBranchId: 'B1' }, journalState }) },
  supportBoundary: { readCurrentState: () => ({}) },
  geometryBoundary: {
    readCurrentState: () => ({ geometryEditJournal: { headFingerprint: 'GH', entries: [] } }),
    readView: () => ({ readModel: { schema: 'SequentialScopedEditReadModel.v1', branchId: 'B1', authorityId: 'AUTH', revision: { id: 'R' } },
      scene: { schema: 'EngineeringScene.v1', sceneId: 'SCENE', entities: [{ id: 'E1' }] } }),
  },
  workspace: { subscribeEngineeringSvgOwnerState(listener) { state.ownerListener = listener; return () => { state.unsubscribed = true; }; } },
};
try {
  const feature = createSequentialDraftEdit3dPilotFeature({ root, ...common,
    onExport: (value) => state.exports.push(value),
    onWalkthroughExport: (value) => state.walkthroughs.push(value) });
  assert.equal(root.baseline.textContent, 'Download 3D pilot baseline');
  assert.equal(root.walkthrough.textContent, 'Download 3D walkthrough worksheet');
  assert.equal(root.baseline.disabled, true);
  assert.equal(root.walkthrough.disabled, true);
  state.available = true; state.ownerListener({});
  assert.equal(root.baseline.disabled, false);
  assert.equal(root.walkthrough.disabled, false);
  const first = feature.exportEvidence();
  const second = feature.exportEvidence();
  const worksheet = feature.exportWalkthroughWorksheet();
  assert.equal(JSON.stringify(second), JSON.stringify(first));
  assert.equal(first.createdAt, journalState.journal.updatedAt);
  assert.equal(state.exports.length, 2);
  assert.equal(state.exports[1].manifestFingerprint, first.manifestFingerprint);
  assert.equal(state.walkthroughs.length, 1);
  assert.equal(worksheet.status, 'PENDING_OPERATOR_EXECUTION');
  assert.equal(worksheet.releaseManifest.manifestFingerprint, first.manifestFingerprint);
  assert.equal(worksheet.stepResults.length, 12);
  assert.equal(worksheet.stepResults.every((row) => row.result === null), true);
  assert.deepEqual(root.downloads.map((row) => row.fileName), [
    'ssk-draft-edit-3d.B1.release-manifest.v1.json',
    'ssk-draft-edit-3d.B1.release-manifest.v1.json',
    'ssk-draft-edit-3d.B1.operator-walkthrough.v1.json',
  ]);
  assert.equal(feature.getState().available, true);
  assert.equal(feature.getState().walkthroughAvailable, true);
  assert.equal(feature.getState().lastError, null);
  state.available = false; state.ownerListener({});
  assert.equal(root.baseline.disabled, true);
  assert.equal(root.walkthrough.disabled, true);
  assert.throws(() => feature.exportEvidence(), /authoritative open branch/);
  assert.throws(() => feature.exportWalkthroughWorksheet(), /authoritative open branch/);
  assert.equal(feature.destroy(), true);
  assert.equal(state.unsubscribed, true);
  assert.equal(root.baseline, null);
  assert.equal(root.walkthrough, null);
  assert.equal(feature.destroy(), false);

  const missingRoot = new FakeRoot();
  state.available = true;
  const missing = createSequentialDraftEdit3dPilotFeature({ root: missingRoot, ...common,
    commandBoundary: { readCurrentState: () => ({ sourceFingerprint: 'SOURCE',
      session: { rootBranchId: 'B1' }, journalState: null }) } });
  assert.equal(missing.getState().available, false);
  assert.equal(missing.getState().walkthroughAvailable, false);
  assert.match(missing.getState().lastError, /commandState\.journalState is required/);
  assert.equal(missingRoot.baseline.disabled, true);
  assert.equal(missingRoot.walkthrough.disabled, true);
  missing.destroy();

  const failedRoot = new FakeRoot();
  assert.throws(() => createSequentialDraftEdit3dPilotFeature({ root: failedRoot, ...common,
    workspace: { subscribeEngineeringSvgOwnerState: () => null } }), /unsubscribe function/);
  assert.equal(failedRoot.baseline, null);
  assert.equal(failedRoot.walkthrough, null);
} finally {
  URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
}

const featureSource = readFileSync(new URL('../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('../tabs/sequential-sketcher/sequential-sketcher-tab.js', import.meta.url), 'utf8');
const browserSource = readFileSync(new URL('./browser/sequential-scoped-edit-3d-workbench.spec.mjs', import.meta.url), 'utf8');
const fixtureSource = readFileSync(new URL('./browser/sequential-scoped-edit-3d-workbench-fixture.html', import.meta.url), 'utf8');
assert.match(featureSource, /Download 3D pilot baseline/);
assert.match(featureSource, /Download 3D walkthrough worksheet/);
assert.match(featureSource, /exportWalkthroughWorksheet/);
assert.doesNotMatch(featureSource, /publishCandidate|restorePackage|applyPrepared|publishHistoryCandidate/);
assert.doesNotMatch(featureSource, /options\.now|state\.now|new Date/);
assert.match(tabSource, /createSequentialDraftEdit3dPilotFeature/);
assert.match(tabSource, /onSequentialDraftEdit3dOperatorWalkthroughWorksheet/);
assert.doesNotMatch(tabSource, /sequentialDraftEdit3dPilotEvidenceAtProvider/);
assert.doesNotMatch(fixtureSource, /sequentialDraftEdit3dPilotEvidenceAtProvider/);
assert.match(tabSource, /runtime\.pilotFeature\?\.destroy\(\)/);
assert.match(browserSource, /injected scene failure returns to Construction SVG/);
assert.match(browserSource, /SequentialDraftEdit3dReleaseManifest\.v1/);
assert.match(browserSource, /SequentialDraftEdit3dOperatorWalkthroughWorksheet\.v1/);
assert.match(browserSource, /PENDING_OPERATOR_EXECUTION/);
console.log('[PASS] baseline and pending walkthrough exports, fail-closed gate and lifecycle containment');

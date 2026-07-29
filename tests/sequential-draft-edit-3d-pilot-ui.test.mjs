import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createSequentialDraftEdit3dPilotFeature,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js';

function source(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

class FakeButton {
  constructor() {
    this.disabled = true;
    this.title = '';
    this.attributes = new Map();
    this.listeners = new Map();
  }

  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  removeEventListener(name) { this.listeners.delete(name); }
  click() {
    this.listeners.get('click')?.({ preventDefault() {}, stopPropagation() {} });
  }
}

function authority(branchId) {
  return {
    branchId, authorityId: 'AUTHORITY-UI', sourceFingerprint: 'SOURCE-UI',
    branchSetFingerprint: 'BRANCH-SET-UI', journalHeadFingerprint: 'COMMAND-HEAD-UI',
    ownerRevisionFingerprint: 'OWNER-REVISION-UI',
  };
}
function runtime() {
  const branchId = '/SSK/PILOT/UI';
  return {
    authority: authority(branchId),
    supportAdjustmentRegister: { headFingerprint: 'SUPPORT-HEAD-UI' },
    supportAdjustmentHistory: { historyFingerprint: 'SUPPORT-HISTORY-UI' },
    geometryEditJournal: { headFingerprint: 'GEOMETRY-HEAD-UI' },
    ownerSnapshot: { schema: 'SequentialGeometryEditOwnerSnapshot.v1', revision: 'OWNER-UI' },
    readModel: { schema: 'SequentialEffectiveGeometryReadModel.v1',
      authorityId: 'READ-UI', sceneId: 'SCENE-UI', branchId },
    scene: { schema: 'EngineeringScene.v1', sceneId: 'SCENE-UI', branchId,
      entities: [{ id: 'ENTITY-UI' }] },
    shadowEvidence: { schema: 'SequentialProductionShadow.v1', status: 'MOUNTED',
      mounted: true, authorityId: 'SHADOW-UI', mountKey: 'MOUNT-UI' },
    controllerState: { active: true, available: true, mounted: true, destroyed: false,
      failureCount: 0, mountKey: 'MOUNT-UI:READ-UI' },
    viewerState: { contract: 'ViewerStateSnapshot.v1', mode: 'target-only',
      runtimePending: false },
    surfaces: { constructionHidden: true, draftEdit3dHidden: false },
  };
}

const markup = source('../tabs/sequential-sketcher/sequential-sketcher-markup.js');
const controllerSource = source(
  '../tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js',
);
const featureSource = source(
  '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js',
);
const manifestSource = source(
  '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js',
);
assert.match(markup, /data-ssk-draft-edit-3d-pilot-export/);
assert.match(markup, /Download 3D pilot baseline evidence/);
assert.match(markup, /data-ssk-draft-edit-3d-pilot-export[^>]*disabled/);
assert.match(controllerSource, /createSequentialDraftEdit3dPilotFeature/);
assert.match(controllerSource, /exportPilotBaselineEvidence/);
assert.match(controllerSource, /Construction SVG retained/);
assert.match(manifestSource, /application\/json/);
assert.doesNotMatch(featureSource, /export\s+default/);
assert.doesNotMatch(controllerSource, /export\s+default/);

const button = new FakeButton();
const downloads = [];
const statuses = [];
let current = runtime();
const root = {
  ownerDocument: {},
  querySelector(selector) {
    return selector === '[data-ssk-draft-edit-3d-pilot-export]' ? button : null;
  },
};
const before = JSON.stringify(current);
const feature = createSequentialDraftEdit3dPilotFeature({
  root,
  readRuntime: () => current,
  download: (artifact) => downloads.push(artifact),
  onStatus: (message, status) => statuses.push({ message, status }),
});
assert.equal(feature.getState().enabled, true);
assert.equal(button.disabled, false);
assert.equal(button.attributes.get('aria-disabled'), 'false');

button.click();
assert.equal(downloads.length, 1);
assert.equal(downloads[0].filename, 'ssk-sequential-draft-edit-3d-pilot-baseline.json');
assert.equal(downloads[0].mimeType, 'application/json');
assert.equal(JSON.stringify(current), before, 'evidence export must not mutate runtime input');
const downloaded = JSON.parse(downloads[0].content);
assert.equal(downloaded.schema, 'SequentialDraftEdit3dReleaseManifest.v1');
assert.equal(downloaded.runtime.authority.editAuthorityId, 'AUTHORITY-UI');
assert.equal(feature.getState().exportCount, 1);
assert.equal(feature.getState().lastFingerprint, downloaded.fingerprint);
assert.match(statuses.at(-1).message, /Pilot baseline evidence downloaded/);

current = {
  ...current,
  readModel: { ...current.readModel, branchId: '/DIFFERENT' },
};
assert.equal(feature.refresh(), false);
assert.equal(button.disabled, true);
assert.match(button.title, /exactly one current authoritative branch/);
assert.equal(feature.getState().enabled, false);
assert.match(feature.getState().disabledReason, /Pilot evidence unavailable/);

assert.equal(feature.destroy(), true);
assert.equal(feature.destroy(), false);
assert.equal(feature.getState().destroyed, true);
assert.equal(button.listeners.size, 0);

const unavailableButton = new FakeButton();
const unavailable = createSequentialDraftEdit3dPilotFeature({
  root: {
    ownerDocument: {},
    querySelector: () => unavailableButton,
  },
  readRuntime: () => { throw new Error('No authoritative branch is open.'); },
  download: () => { throw new Error('Download must remain unreachable.'); },
});
assert.equal(unavailable.getState().enabled, false);
assert.equal(unavailableButton.disabled, true);
assert.match(unavailableButton.title, /No authoritative branch is open/);
unavailable.destroy();

console.log('Sequential Draft Edit 3D pilot UI/static contract: ok');

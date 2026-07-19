import { createEngineeringSvgAdapterBridge } from '../../core/engineering-svg/engineering-svg-adapter-bridge.js';
import { createEngineeringSvgWorkspaceShellFromAdapterBridge } from '../../core/engineering-svg/shell-runtime.js';
import { createSequentialEngineeringSvgAdapter } from './sequential-engineering-svg-adapter.js';

export const SEQUENTIAL_ENGINEERING_SVG_SHADOW_WORKSPACE_SCHEMA = 'SequentialEngineeringSvgShadowWorkspace.v1';

const PROJECTIONS = Object.freeze(['ISO', 'XY', 'XZ', 'YZ']);
const APPROVED_OMISSIONS = Object.freeze({
  network: 'DERIVED_NETWORK_NOT_TRACEABLE_TO_CONFIRMED_CONSTRUCTION',
  restraint: 'NO_STABLE_SEQUENTIAL_RESTRAINT_DIRECTION_OWNER',
  analyticalSupportAttachment: 'NO_SEQUENTIAL_CONSTRUCTION_FINGERPRINT_BRIDGE',
});

function requiredHost(value) {
  if (!value?.ownerDocument?.createElement) {
    throw new TypeError('Sequential engineering SVG shadow workspace requires a DOM host.');
  }
  return value;
}

function requiredText(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`Sequential engineering SVG shadow workspace requires ${label}.`);
  return result;
}

function requiredFunction(value, label) {
  if (typeof value !== 'function') {
    throw new TypeError(`Sequential engineering SVG shadow workspace requires ${label}.`);
  }
  return value;
}

function ownerState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Sequential engineering SVG owner state must be an object.');
  }
  return value;
}

function ownerEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Sequential engineering SVG owner event must be an object.');
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'state')) {
    throw new TypeError('Sequential engineering SVG owner event requires state.');
  }
  const reason = String(value.reason ?? '').trim();
  if (!reason) throw new TypeError('Sequential engineering SVG owner event requires reason.');
  if (value.visibleProjection != null && !PROJECTIONS.includes(value.visibleProjection)) {
    throw new TypeError(`Sequential engineering SVG owner event has unsupported projection "${value.visibleProjection}".`);
  }
  return Object.freeze({ ...value, state: ownerState(value.state), reason });
}

function countOmissions(parity, category) {
  return parity.omissions.filter((row) => row.category === category
    && !Object.prototype.hasOwnProperty.call(APPROVED_OMISSIONS, category)).length;
}

function assertEmpty(values, label) {
  if (values?.length) throw new Error(`Sequential engineering SVG shadow parity has ${label}: ${values.join(', ')}.`);
}

function assertMappedCounts(parity) {
  const pairs = [
    ['repair', 'repairCount'],
    ['candidate', 'candidateCount'],
    ['activePort', 'activePortCount'],
    ['support', 'supportCount'],
    ['rejectedCandidate', 'rejectedCandidateCount'],
  ];
  for (const [category, countKey] of pairs) {
    const mapped = parity.mappedCountByCategory?.[category] ?? 0;
    const omitted = countOmissions(parity, category);
    if (mapped + omitted !== parity[countKey]) {
      throw new Error(`Sequential engineering SVG shadow ${category} parity is inconsistent.`);
    }
  }
  if (parity.confirmedGeometryCount !== parity.mappedCountByCategory?.confirmed) {
    throw new Error('Sequential engineering SVG shadow confirmed geometry parity is inconsistent.');
  }
}

export function validateSequentialEngineeringSvgShadowParity(parity) {
  if (parity?.schema !== 'SequentialEngineeringSvgParityReport.v1') {
    throw new TypeError('Sequential engineering SVG shadow requires SequentialEngineeringSvgParityReport.v1.');
  }
  const approved = parity.omissions.filter((row) => (
    Object.prototype.hasOwnProperty.call(APPROVED_OMISSIONS, row.category)
  ));
  for (const [category, reason] of Object.entries(APPROVED_OMISSIONS)) {
    const rows = approved.filter((row) => row.category === category && row.reason === reason);
    if (rows.length !== 1) throw new Error(`Sequential engineering SVG shadow must preserve approved omission "${category}".`);
  }
  const unexplained = parity.omissions.filter((row) => !String(row?.category || '').trim()
    || !String(row?.reason || '').trim());
  if (unexplained.length) throw new Error('Sequential engineering SVG shadow contains an unexplained omission.');
  assertMappedCounts(parity);
  assertEmpty(parity.duplicateIds, 'duplicate entity IDs');
  assertEmpty(parity.invalidGeometry, 'invalid geometry');
  assertEmpty(parity.supportAttachmentsMissingCarrierEvidence, 'supports without carrier evidence');
  if (parity.propertySetCoverage?.eligible !== parity.propertySetCoverage?.mapped) {
    throw new Error('Sequential engineering SVG shadow property coverage is incomplete.');
  }
  if (parity.revisionConsistency?.supportMatchesConfirmed !== true) {
    throw new Error('Sequential engineering SVG shadow support evidence is stale.');
  }
  const domainOmissions = parity.omissions.filter((row) => (
    !Object.prototype.hasOwnProperty.call(APPROVED_OMISSIONS, row.category)
  ));
  return Object.freeze({
    approvedOmissions: Object.freeze(approved),
    domainOmissions: Object.freeze(domainOmissions),
    unexplainedOmissions: Object.freeze(unexplained),
    diagnostics: Object.freeze({
      unresolvedPorts: parity.unresolvedPorts,
      disconnectedConfirmedGeometry: parity.disconnectedConfirmedGeometry,
      candidatesMissingContinuityEvidence: parity.candidatesMissingContinuityEvidence,
    }),
  });
}

function subscribeOwner(subscribe, sequential, listener) {
  const unsubscribe = subscribe((rawEvent) => {
    const event = ownerEvent(rawEvent);
    const snapshot = sequential.buildSnapshot(event.state, {
      visibleProjection: event.visibleProjection,
    });
    validateSequentialEngineeringSvgShadowParity(snapshot.parity);
    listener(event);
  });
  if (typeof unsubscribe !== 'function') {
    throw new TypeError('Sequential engineering SVG owner subscription must return an unsubscribe function.');
  }
  return unsubscribe;
}

function childSnapshot(host) {
  return new Set(host.children ? [...host.children] : []);
}

function removeAddedChildren(host, before) {
  if (!host.children) return;
  [...host.children].forEach((child) => {
    if (!before.has(child)) child.remove();
  });
}

function reconcileSelection(shell, scene) {
  const available = new Set(scene.entities.map((entity) => entity.id));
  const selected = shell.getSelection();
  const surviving = selected.filter((id) => available.has(id));
  if (surviving.length !== selected.length) shell.setSelection(surviving, 'scene-identity-reconcile');
}

export async function createSequentialEngineeringSvgShadowWorkspace(options = {}) {
  const host = requiredHost(options.host);
  const adapterId = requiredText(options.adapterId, 'adapterId');
  const sceneId = requiredText(options.sceneId, 'sceneId');
  const shellId = requiredText(options.shellId, 'shellId');
  const getState = requiredFunction(options.getState, 'getState owner function');
  const subscribeState = requiredFunction(options.subscribeState, 'subscribeState owner function');
  const initialState = ownerState(getState());
  let sequential;

  sequential = createSequentialEngineeringSvgAdapter({
    adapterId,
    sceneId,
    getState: () => ownerState(getState()),
    subscribeState: (listener) => subscribeOwner(subscribeState, sequential, listener),
    coordinateSystem: options.coordinateSystem,
  });
  const initialBuild = sequential.buildSnapshot(initialState, {
    visibleProjection: options.projection ?? initialState.visibleProjection,
  });
  const initialParityEvidence = validateSequentialEngineeringSvgShadowParity(initialBuild.parity);
  const bridge = await createEngineeringSvgAdapterBridge(sequential.adapter);
  const before = childSnapshot(host);
  let shell;

  try {
    shell = createEngineeringSvgWorkspaceShellFromAdapterBridge({
      bridge,
      shellId,
      host,
      projection: options.projection,
      viewport: options.viewport,
      padding: options.padding,
      selectedIds: options.selectedIds,
      ariaLabel: options.ariaLabel,
    });
  } catch (error) {
    removeAddedChildren(host, before);
    bridge.dispose();
    throw error;
  }

  let unsubscribeReconcile;
  try {
    const sceneSource = bridge.getDependencies().sceneSource;
    unsubscribeReconcile = sceneSource.subscribe((event) => {
      validateSequentialEngineeringSvgShadowParity(sequential.getParityReport());
      reconcileSelection(shell, event.scene);
    });
  } catch (error) {
    shell.destroy();
    bridge.dispose();
    throw error;
  }

  let destroyed = false;
  return Object.freeze({
    schema: SEQUENTIAL_ENGINEERING_SVG_SHADOW_WORKSPACE_SCHEMA,
    adapter: sequential.adapter,
    bridge,
    shell,
    initialParityEvidence,
    buildSnapshot: sequential.buildSnapshot,
    getParityReport: sequential.getParityReport,
    getParityEvidence: () => validateSequentialEngineeringSvgShadowParity(sequential.getParityReport()),
    getAuthoritySnapshot: () => {
      const snapshot = sequential.buildSnapshot(ownerState(getState()));
      validateSequentialEngineeringSvgShadowParity(snapshot.parity);
      return snapshot.authority;
    },
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      unsubscribeReconcile();
      try {
        shell.destroy();
      } finally {
        bridge.dispose();
      }
      return true;
    },
  });
}

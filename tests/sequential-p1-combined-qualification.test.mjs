import assert from 'node:assert/strict';
import {
  appendSequentialGeometryEdit,
  createSequentialGeometryEditJournal,
  sequentialGeometryEditBaseFingerprint,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-geometry-edit-journal.js';
import {
  consumeSequentialGeometryHistoryTransition,
  createSequentialGeometryEditHistory,
  sequentialGeometryEditHistoryCapabilities,
  sequentialGeometryEditHistoryJournal,
  transitionSequentialGeometryEditHistory,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-geometry-edit-history.js';
import {
  createSequentialRotationBoundaryDiagnosis,
  createSequentialRotationTransform,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-rotation-geometry.js';
import {
  createSequentialGeometryEditPackageState,
  restoreGeometryEditPackageMaps,
} from '../tabs/sequential-sketcher/persistence/sequential-geometry-edit-package-state.js';
import {
  assertSequentialDraftEditPackageExtension,
  createSequentialDraftEditPackageExtension,
} from '../tabs/sequential-sketcher/persistence/sequential-draft-edit-package-extension.js';
import {
  createSequentialDraftEditRecoveryRecord,
  sequentialDraftEditRecoveryContextMatches,
  sequentialDraftEditRecoveryTargetMatches,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-recovery-contract.js';
import {
  createSequentialDraftEditRecoveryStorage,
  SEQUENTIAL_DRAFT_EDIT_RECOVERY_STORAGE_NAMESPACE,
} from '../tabs/sequential-sketcher/persistence/sequential-draft-edit-recovery-storage.js';

const BRANCH = '/P1/COMBINED';
const AT = '2026-07-31T03:35:00.000Z';
const point = (x, y, z = 0) => ({ x, y, z });
const geometryPoint = (x, y, z = 0) => ({
  schema: 'EngineeringPoint3D.v1', x, y, z,
});
const segment = (start, end) => ({
  schema: 'EngineeringGeometry.v1',
  kind: 'segment',
  start: geometryPoint(start.x, start.y, start.z),
  end: geometryPoint(end.x, end.y, end.z),
});
const geometryRow = (start, end) => ({
  geometryPartId: 'PART-1', nodeIds: ['NODE-1', 'NODE-2'], geometry: segment(start, end),
});
const wholeState = (start, end) => ({
  geometryParts: [geometryRow(start, end)],
  ports: [
    { portId: 'PORT-1', position: start },
    { portId: 'PORT-2', position: end },
  ],
  nodes: [
    { nodeId: 'NODE-1', position: start },
    { nodeId: 'NODE-2', position: end },
  ],
});
const stretchState = (start, end) => ({
  geometryParts: [geometryRow(start, end)],
  ports: [{ portId: 'PORT-2', position: end }],
  nodes: [{ nodeId: 'NODE-2', position: end }],
});
const operator = (reason) => ({
  actorId: 'P1_Q_OPERATOR', reason, evidenceNote: 'Combined P1 qualification evidence.',
  appliedAt: AT,
});

const snapshot = Object.freeze({
  schema: 'SequentialEditableTopologySnapshot.v1',
  authority: { confirmedConstructionFingerprint: 'CONFIRMED-P1-Q' },
  branch: { branchId: BRANCH },
  components: [{
    componentId: 'COMP-1', canonicalType: 'PIPE', portIds: ['PORT-1', 'PORT-2'],
    nodeIds: ['NODE-1', 'NODE-2'], geometryPartIds: ['PART-1'],
  }],
  ports: [
    { portId: 'PORT-1', componentId: 'COMP-1', nodeId: 'NODE-1', position: point(0, 0) },
    { portId: 'PORT-2', componentId: 'COMP-1', nodeId: 'NODE-2', position: point(10, 0) },
  ],
  nodes: [
    { nodeId: 'NODE-1', incidentComponentIds: ['COMP-1'], position: point(0, 0) },
    { nodeId: 'NODE-2', incidentComponentIds: ['COMP-1'], position: point(10, 0) },
  ],
  geometryParts: [{
    geometryPartId: 'PART-1', componentId: 'COMP-1', geometry: segment(point(0, 0), point(10, 0)),
  }],
  internalEdges: [], committedConnections: [], repairs: [],
});

let journal = createSequentialGeometryEditJournal({
  branchId: BRANCH,
  confirmedConstructionFingerprint: snapshot.authority.confirmedConstructionFingerprint,
  baseFingerprint: sequentialGeometryEditBaseFingerprint(snapshot),
});
journal = appendSequentialGeometryEdit(journal, {
  type: 'MOVE_COMPONENT', componentId: 'COMP-1', targetId: 'MOVE-TARGET',
  operationId: 'MOVE-1', eligibilityId: 'MOVE-ELIGIBLE',
  rawDelta: point(10, 0), delta: point(10, 0), snapSelection: null,
  before: wholeState(point(0, 0), point(10, 0)),
  after: wholeState(point(10, 0), point(20, 0)),
  ancestry: { authorityId: 'AUTH-P1-Q' },
  operator: operator('Accepted exact component move.'),
}, snapshot).journal;
journal = appendSequentialGeometryEdit(journal, {
  type: 'STRETCH_NODE', componentId: 'COMP-1', targetId: 'STRETCH-TARGET',
  operationId: 'STRETCH-1', eligibilityId: 'STRETCH-ELIGIBLE', nodeId: 'NODE-2',
  affectedComponentIds: ['COMP-1'], targetPosition: point(25, 0),
  profile: { minimumLengthMm: 1, zeroLengthToleranceMm: 1e-9,
    collinearityTolerance: 1e-9 },
  rawDelta: point(5, 0), delta: point(5, 0), snapSelection: null,
  before: stretchState(point(10, 0), point(20, 0)),
  after: stretchState(point(10, 0), point(25, 0)),
  ancestry: { authorityId: 'AUTH-P1-Q' },
  operator: operator('Accepted connected node stretch.'),
}, snapshot).journal;
const rotation = createSequentialRotationTransform({
  pivot: point(10, 0), axis: point(0, 0, 1), angleDegrees: 90,
});
const boundaryDiagnosis = createSequentialRotationBoundaryDiagnosis([], rotation);
journal = appendSequentialGeometryEdit(journal, {
  type: 'ROTATE_SUBGRAPH', componentId: 'COMP-1', targetId: 'ROTATE-TARGET',
  operationId: 'ROTATE-1', eligibilityId: 'ROTATE-ELIGIBLE',
  seedComponentId: 'COMP-1', scope: 'COMPONENT_ONLY', affectedComponentIds: ['COMP-1'],
  pivot: rotation.pivot, axis: rotation.axis, angleDegrees: rotation.angleDegrees,
  angleRadians: rotation.angleRadians, transformFingerprint: rotation.transformFingerprint,
  profile: rotation.profile, boundaryDiagnosis,
  rawDelta: point(0, 15), delta: point(0, 15), snapSelection: null,
  before: wholeState(point(10, 0), point(25, 0)),
  after: wholeState(point(10, 0), point(10, 15)),
  ancestry: { authorityId: 'AUTH-P1-Q' },
  operator: operator('Accepted rigid component rotation.'),
}, snapshot).journal;

let history = createSequentialGeometryEditHistory({ journal });
history = transitionSequentialGeometryEditHistory(history, 'UNDO_GEOMETRY_EDIT').history;
history = consumeSequentialGeometryHistoryTransition(history, 'UNDO-PREPARED-1');
assert.deepEqual(history.entries.map((entry) => entry.type), [
  'MOVE_COMPONENT', 'STRETCH_NODE', 'ROTATE_SUBGRAPH',
]);
assert.deepEqual(sequentialGeometryEditHistoryCapabilities(history), {
  canUndo: true, canRedo: true, cursor: 2, totalCount: 3, activeCount: 2, redoCount: 1,
  undoEntry: history.entries[1], redoEntry: history.entries[2],
  undoBlockedReason: null, redoBlockedReason: null,
  historyFingerprint: history.historyFingerprint,
  activeHeadFingerprint: history.activeHeadFingerprint,
});
assert.deepEqual(sequentialGeometryEditHistoryJournal(history).entries.map((entry) => entry.type),
  ['MOVE_COMPONENT', 'STRETCH_NODE']);

const packageState = createSequentialGeometryEditPackageState([{
  branchId: BRANCH, history,
  consumedPreparedIds: ['MOVE-PREPARED-1', 'STRETCH-PREPARED-1', 'ROTATE-PREPARED-1'],
}]);
assert.deepEqual({
  editCount: packageState.editCount,
  activeEditCount: packageState.activeEditCount,
  redoEditCount: packageState.redoEditCount,
  consumedPreparedCount: packageState.consumedPreparedCount,
  consumedTransitionCount: packageState.consumedTransitionCount,
}, {
  editCount: 3, activeEditCount: 2, redoEditCount: 1,
  consumedPreparedCount: 3, consumedTransitionCount: 1,
});
const restoredPackage = restoreGeometryEditPackageMaps(packageState);
const restoredHistory = restoredPackage.byBranch.get(BRANCH);
assert.deepEqual(restoredHistory, history);
assert.deepEqual([...restoredPackage.consumedByBranch.get(BRANCH)], [
  'MOVE-PREPARED-1', 'ROTATE-PREPARED-1', 'STRETCH-PREPARED-1',
]);

const extension = createSequentialDraftEditPackageExtension({
  sourceFingerprint: 'SOURCE-P1-Q', branchSetFingerprint: 'BRANCHES-P1-Q',
  commandJournalHeadFingerprint: 'COMMAND-JOURNAL-P1-Q',
  supportBranches: [], geometryBranches: packageState.branches,
});
assert.deepEqual(extension.summary, {
  supportBranchCount: 0, supportAdjustmentCount: 0,
  geometryBranchCount: 1, geometryEditCount: 3,
  activeGeometryEditCount: 2, geometryRedoCount: 1,
  geometryHistoryTransitionCount: 1,
});
assert.equal(assertSequentialDraftEditPackageExtension(extension).extensionFingerprint,
  extension.extensionFingerprint);

class MemoryStorage {
  constructor() { this.rows = new Map(); }
  getItem(key) { return this.rows.get(key) ?? null; }
  setItem(key, value) { this.rows.set(key, value); }
  removeItem(key) { this.rows.delete(key); }
}
const authority = Object.freeze({
  authorityId: 'AUTH-P1-Q', sourceFingerprint: 'SOURCE-P1-Q', branchId: BRANCH,
  branchSetFingerprint: 'BRANCHES-P1-Q', journalHeadFingerprint: 'COMMAND-JOURNAL-P1-Q',
  confirmedConstructionFingerprint: 'CONFIRMED-P1-Q', supportProjectionFingerprint: 'SUPPORT-P1-Q',
  ownerRevisionFingerprint: 'OWNER-P1-Q',
});
const pending = createSequentialDraftEditRecoveryRecord({
  kind: 'ROTATE_SUBGRAPH', authority,
  editBaseFingerprint: restoredHistory.historyFingerprint,
  selector: { objectId: 'PART-1', scope: 'COMPONENT_ONLY' },
  targetEvidence: { targetId: 'ROTATE-PENDING-TARGET', authorityId: authority.authorityId,
    sceneRevision: 'SCENE-P1-Q', snapshotFingerprint: 'SNAPSHOT-P1-Q',
    eligibilityIds: ['ROTATE-PENDING-ELIGIBLE'] },
  input: { pivot: rotation.pivot, axis: rotation.axis, angleDegrees: 15,
    profile: rotation.profile }, savedAt: AT,
});
const adapter = new MemoryStorage();
const recovery = createSequentialDraftEditRecoveryStorage({ storage: adapter });
assert.equal(recovery.save(pending), true);
assert.equal(recovery.list().length, 1);
assert.equal(sequentialDraftEditRecoveryContextMatches(pending, {
  authority, editBaseFingerprint: restoredHistory.historyFingerprint,
}), true);
assert.equal(sequentialDraftEditRecoveryTargetMatches(pending, pending.targetEvidence), true);
const redoneHistory = transitionSequentialGeometryEditHistory(restoredHistory,
  'REDO_GEOMETRY_EDIT').history;
assert.equal(sequentialDraftEditRecoveryContextMatches(pending, {
  authority, editBaseFingerprint: redoneHistory.historyFingerprint,
}), false, 'history cursor change must stale the pending draft');
assert.equal(sequentialDraftEditRecoveryTargetMatches(pending, {
  ...pending.targetEvidence, sceneRevision: 'CHANGED',
}), false);

const serializedExtension = JSON.stringify(extension);
assert.doesNotMatch(serializedExtension, /SequentialDraftEditRecovery|recordFingerprint/);
assert.equal(serializedExtension.includes(SEQUENTIAL_DRAFT_EDIT_RECOVERY_STORAGE_NAMESPACE), false);
assert.throws(() => createSequentialDraftEditRecoveryRecord({
  ...pending, input: { ...pending.input, preparedId: 'FORBIDDEN' },
}), /forbidden|not allowed/i);
assert.equal(recovery.remove(BRANCH, 'ROTATE_SUBGRAPH'), true);
assert.equal(recovery.list().length, 0);
assert.deepEqual(restoredPackage.byBranch.get(BRANCH), history,
  'discarding recovery must not mutate accepted package history');
const tampered = structuredClone(extension);
tampered.geometryBranches[0].history.historyFingerprint = 'TAMPERED';
assert.throws(() => assertSequentialDraftEditPackageExtension(tampered),
  /canonical|fingerprint/i);
recovery.destroy();

console.log('Sequential P1 combined package, history and recovery qualification: ok');

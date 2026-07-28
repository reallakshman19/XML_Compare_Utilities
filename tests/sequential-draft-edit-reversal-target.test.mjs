import assert from 'node:assert/strict';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import { createSequentialConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { freezeConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-contract.js';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createSequentialEngineeringSvgOwnerBridge } from '../tabs/sequential-sketcher/sequential-engineering-svg-owner-bridge.js';
import { createSequentialJournalAdoption } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';
import { createSequentialScopedEditReadModel } from '../tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-read-model.js';
import { buildSequentialScopedEditEngineeringScene } from '../tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-scene-adapter.js';
import { createSequentialScopedEditVisualModel } from '../tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-visual-model.js';
import {
  SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION,
  selectSequentialDraftEditReversalTarget,
  validateSequentialDraftEditReversalTarget,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-reversal-target.js';

const BRANCH_ID = '/REVERSAL/TARGET';
const ADOPTED_AT = '2026-07-28T02:00:00.000Z';

function buildFixture() {
  const records = [{
    type: 'BRANCH', name: BRANCH_ID,
    attributes: { NAME: BRANCH_ID, HPOS: { x: 0, y: 0, z: 0 } },
    children: [{
      type: 'PIPE', name: 'P1',
      attributes: { NAME: 'P1', APOS: { x: -100, y: 0, z: 0 }, LPOS: { x: 100, y: 0, z: 0 } },
    }],
  }];
  const evidenceModel = buildSequentialEvidenceModel(records);
  const indexes = indexSequentialEvidence(evidenceModel);
  const component = [...indexes.components.values()][0];
  const activePort = component.ports[0];
  const session = freezeConstructionSession({
    ...createSequentialConstructionSession(BRANCH_ID),
    state: 'USER_DECISION_REQUIRED',
    activeComponentId: component.componentId,
    activeExitPortId: activePort.portId,
    currentDecisionRequest: Object.freeze({
      schema: 'SequentialConnectionDecision.v1',
      decisionId: 'DECISION-REVERSAL-TARGET',
      state: 'OPEN', reason: 'AMBIGUOUS_BRANCH_START',
      candidates: Object.freeze([]), resolution: null,
      branchId: BRANCH_ID, decisionScope: 'COMPONENT_TRAVERSAL',
      componentId: component.componentId, startComponentId: component.componentId,
      entryPortId: null,
    }),
  });
  const ownerState = {
    session, evidenceModel, indexes, confirmedConstruction: null,
    supportProjection: null, visibleProjection: 'ISO',
  };
  const bridge = createSequentialEngineeringSvgOwnerBridge({ readOwnerState: () => ownerState });
  const ownerSnapshot = bridge.getSnapshot();
  const readModel = createSequentialScopedEditReadModel(ownerSnapshot);
  const scene = buildSequentialScopedEditEngineeringScene(readModel);
  const branchRegistry = createSequentialBranchWorkspaceRegistry();
  branchRegistry.reset([BRANCH_ID]); branchRegistry.save(BRANCH_ID, { session });
  const sourceFingerprint = 'SOURCE-REVERSAL-TARGET';
  const journalState = createSequentialJournalAdoption({
    documentId: 'sequential-document:reversal-target',
    sessionId: 'sequential-session:reversal-target',
    sourceFingerprint, branchRegistry, adoptedAt: ADOPTED_AT,
  });
  return Object.freeze({
    bridge, component, readModel, scene,
    currentState: {
      ...ownerState, sourceFingerprint, branchRegistry, journalState, ownerSnapshot,
    },
  });
}

const fixture = buildFixture();
const entities = fixture.scene.entities.filter((row) => row.domainRef.category === 'reversalCandidate');
assert.equal(entities.length, 2);
const selected = entities[0];
const target = selectSequentialDraftEditReversalTarget({
  objectId: selected.id,
  readModel: fixture.readModel,
  scene: fixture.scene,
  currentState: fixture.currentState,
});
assert.equal(target.schema, 'SequentialDraftEditReversalTarget.v1');
assert.equal(target.entityId, selected.id);
assert.equal(target.decisionId, 'DECISION-REVERSAL-TARGET');
assert.equal(target.candidateId, selected.domainRef.candidateId);
assert.equal(target.componentId, selected.domainRef.componentId);
assert.equal(target.entryPortId, selected.domainRef.entryPortId);
assert.deepEqual(target.sourcePosition, selected.geometry.position);
assert.match(target.reversalTargetId, /^fnv1a32-canonical-json-v1:SSK3DREVERSAL:/);
assert.deepEqual(validateSequentialDraftEditReversalTarget(target, {
  readModel: fixture.readModel, scene: fixture.scene, currentState: fixture.currentState,
}), target);

const visual = createSequentialScopedEditVisualModel({
  readModel: fixture.readModel, scene: fixture.scene,
});
const marker = visual.markers.find((row) => row.objectId === selected.id);
assert.ok(marker);
assert.equal(marker.label, 'REVERSE ENTRY');
assert.equal(marker.colorInt, 0xa78bfa);

const nonReversal = fixture.scene.entities.find((row) => row.domainRef.category === 'activePort');
assert.throws(() => selectSequentialDraftEditReversalTarget({
  objectId: nonReversal.id,
  readModel: fixture.readModel,
  scene: fixture.scene,
  currentState: fixture.currentState,
}), (error) => error.code === SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION.ENTITY_NOT_REVERSAL);

const staleSession = freezeConstructionSession({
  ...fixture.currentState.session,
  currentDecisionRequest: Object.freeze({
    ...fixture.currentState.session.currentDecisionRequest,
    decisionId: 'DECISION-STALE',
  }),
});
assert.throws(() => selectSequentialDraftEditReversalTarget({
  objectId: selected.id,
  readModel: fixture.readModel,
  scene: fixture.scene,
  currentState: { ...fixture.currentState, session: staleSession },
}), (error) => error.code === SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION.AUTHORITY_STALE);

const missingPorts = new Map(fixture.currentState.indexes.ports);
missingPorts.delete(target.entryPortId);
assert.throws(() => selectSequentialDraftEditReversalTarget({
  objectId: selected.id,
  readModel: fixture.readModel,
  scene: fixture.scene,
  currentState: {
    ...fixture.currentState,
    indexes: { ...fixture.currentState.indexes, ports: missingPorts },
  },
}), (error) => error.code === SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION.ENTRY_PORT_MISMATCH);

assert.throws(() => validateSequentialDraftEditReversalTarget({
  ...target, entryPortId: 'PORT-TAMPERED',
}, {
  readModel: fixture.readModel, scene: fixture.scene, currentState: fixture.currentState,
}), (error) => error.code === SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION.AUTHORITY_STALE);

assert.throws(() => selectSequentialDraftEditReversalTarget({
  objectId: 'ssk:reversal:missing',
  readModel: fixture.readModel,
  scene: fixture.scene,
  currentState: fixture.currentState,
}), (error) => error.code === SEQUENTIAL_DRAFT_EDIT_REVERSAL_REJECTION.ENTITY_MISSING);

fixture.bridge.destroy();
console.log('Sequential SSK-TS-3F exact reversal target evidence: ok');

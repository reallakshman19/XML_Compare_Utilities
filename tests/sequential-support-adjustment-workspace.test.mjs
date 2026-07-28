import assert from 'node:assert/strict';
import { stableToken } from '../tabs/sequential-sketcher/sequential-sketcher-contract.js';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createSequentialConstructionSession, runConstructionUntilBlocked } from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { createConfirmedSequentialConstruction } from '../tabs/sequential-sketcher/construction/sequential-construction-acceptance.js';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import { buildConfirmedConstructionSupportProjection } from '../tabs/sequential-sketcher/support/sequential-confirmed-support-projection.js';
import { createSequentialEngineeringSvgOwnerBridge } from '../tabs/sequential-sketcher/sequential-engineering-svg-owner-bridge.js';
import { createSequentialJournalAdoption } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';
import { createSequentialSupportAdjustmentBoundary } from '../tabs/sequential-sketcher/scoped-edit/sequential-support-adjustment-boundary.js';
import { selectSequentialDraftEditSupportMoveTarget } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-target.js';
import { createSequentialDraftEditSupportMoveDraftStore } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-draft.js';
import { createSequentialDraftEditSupportMoveApplyService } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-apply.js';

const AT = '2026-07-28T07:00:00.000Z';
function branchFixture(branchId, length = 1000, supportX = 250) {
  const source = [{
    type: 'BRANCH', name: branchId, attributes: { NAME: branchId, HPOS: { x: 0, y: 0, z: 0 } },
    children: [
      { type: 'PIPE', name: 'P1', attributes: { NAME: 'P1', APOS: { x: 0, y: 0, z: 0 }, LPOS: { x: length, y: 0, z: 0 } } },
      { type: 'SUPPORT', name: 'SUPPORT FAMILY', attributes: { NAME: '/PS-1/DATUM', TYPE: 'ATTA', OWNER: branchId, POS: { x: supportX, y: 0, z: 0 }, CMPSUPTYPE: 'REST' } },
      { type: 'SUPPORT', name: 'SUPPORT FAMILY', attributes: { NAME: '/PS-1.1', TYPE: 'ATTA', OWNER: branchId, POS: { x: supportX, y: 0, z: 0 }, CMPSUPTYPE: 'SH-100' } },
      { type: 'CAP', name: 'C1', attributes: { NAME: 'C1', APOS: { x: length, y: 0, z: 0 } } },
    ],
  }];
  const evidence = buildSequentialEvidenceModel(source);
  const indexes = indexSequentialEvidence(evidence);
  const session = runConstructionUntilBlocked(
    createSequentialConstructionSession(branchId), evidence, indexes, { commandIssuedAt: AT },
  ).session;
  const confirmedConstruction = createConfirmedSequentialConstruction(session, indexes);
  const supportProjection = buildConfirmedConstructionSupportProjection(confirmedConstruction, indexes, {});
  const branchRegistry = createSequentialBranchWorkspaceRegistry();
  branchRegistry.reset([branchId]); branchRegistry.save(branchId, { session, confirmedConstruction, supportProjection });
  const sourceFingerprint = `SOURCE-${stableToken(JSON.stringify(source))}`;
  const journalState = createSequentialJournalAdoption({
    documentId: `document:${sourceFingerprint}`, sessionId: `session:${sourceFingerprint}`,
    sourceFingerprint, branchRegistry, adoptedAt: AT,
  });
  const ownerBridge = createSequentialEngineeringSvgOwnerBridge({
    readOwnerState: () => ({ session, evidenceModel: evidence, indexes,
      confirmedConstruction, supportProjection, visibleProjection: 'ISO' }),
  });
  const state = {
    sourceFingerprint, evidence, indexes, session, branchRegistry, journalState,
    confirmedConstruction, supportProjection,
    ownerSnapshot: Object.freeze({ revision: ownerBridge.getSnapshot().revision }), engineOptions: {},
  };
  return { branchId, source, supportProjection, state, ownerBridge };
}

const branchA = branchFixture('/SSK/3I/BRANCH-A');
const branchB = branchFixture('/SSK/3I/BRANCH-B', 1200, 400);
const branchAChanged = branchFixture('/SSK/3I/BRANCH-A', 1400, 350);
let active = branchA;
let publications = 0;
const boundary = createSequentialSupportAdjustmentBoundary({
  readBaseState: () => active.state,
  readBaseOwnerSnapshot: () => active.ownerBridge.getSnapshot(),
  onPublished: () => { publications += 1; },
});
const service = createSequentialDraftEditSupportMoveApplyService({
  readCurrentState: boundary.readCurrentState,
  publishCandidate: boundary.publishCandidate,
  now: () => AT,
});
function previewAt(x) {
  const view = boundary.readView();
  const entity = view.scene.entities.find((row) => row.domainRef.category === 'support');
  const target = selectSequentialDraftEditSupportMoveTarget({
    objectId: entity.id, readModel: view.readModel, scene: view.scene,
    currentState: boundary.readCurrentState(),
  });
  const store = createSequentialDraftEditSupportMoveDraftStore();
  return store.stage({ target, position: { x, y: 0, z: 0 }, actorId: 'operator-3i',
    reason: 'Branch-local adjustment.', evidenceNote: 'Branch and carrier checked.' });
}

const preparedA = service.prepare(previewAt(300));
assert.equal(service.accept(preparedA).accepted, true);
assert.equal(publications, 1);
assert.equal(boundary.readCurrentState().supportProjection.supportGlyphs[0].centerlinePointGlobal.x, 300);
assert.equal(boundary.getState().branchCount, 1);

active = branchB;
assert.equal(boundary.readCurrentState().supportProjection.supportGlyphs[0].centerlinePointGlobal.x, 400);
assert.equal(boundary.readCurrentState().supportAdjustmentRegister.entries.length, 0);
assert.equal(boundary.getState().branchCount, 2);

active = branchA;
assert.equal(boundary.readCurrentState().supportProjection.supportGlyphs[0].centerlinePointGlobal.x, 300,
  'switching back must restore branch-local adjustment');
assert.equal(boundary.readCurrentState().supportAdjustmentRegister.entries.length, 1);

active = branchAChanged;
assert.notEqual(branchAChanged.supportProjection.constructionFingerprint,
  branchA.supportProjection.constructionFingerprint);
assert.equal(boundary.readCurrentState().supportAdjustmentRegister.entries.length, 0,
  'changed confirmed construction must clear incompatible adjustment register');
assert.equal(boundary.readCurrentState().supportProjection.supportGlyphs[0].centerlinePointGlobal.x, 350);

boundary.destroy();
for (const row of [branchA, branchB, branchAChanged]) row.ownerBridge.destroy();
console.log('Sequential SSK-TS-3I branch-local support adjustment lifecycle: ok');

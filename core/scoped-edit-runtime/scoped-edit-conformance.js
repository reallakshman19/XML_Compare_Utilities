/** Reusable certification for the synthetic scoped-edit integration boundary. */
import { immutableJson } from '../../contracts/contract-values.js';
import { replayEditJournal } from '../edit-journal/index.js';
import { validateScopeClosure } from '../engineering-scope/index.js';
import {
  SCOPED_EDIT_RUNTIME_CONFORMANCE_V1,
  SCOPED_EDIT_RUNTIME_STATUS,
} from './scoped-edit-contracts.js';
import {
  assertScopedEditHostContract,
  isScopedEditDeeplyFrozen,
  readScopedEditHostContext,
} from './scoped-edit-host.js';
import { createScopedEditRuntime } from './scoped-edit-runtime.js';

function requiredFixture(fixtures) {
  if (!fixtures?.synthetic || typeof fixtures.createFixture !== 'function') {
    throw new TypeError('Conformance requires an explicit synthetic fixture family.');
  }
  for (const name of ['dragRequest', 'validRay', 'envelope', 'readEvidence', 'referencesOf']) {
    if (typeof fixtures[name] !== 'function') throw new TypeError(`Synthetic fixture is missing ${name}().`);
  }
  return fixtures;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function certify(checks) {
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length) throw new Error(`Scoped-edit conformance failed: ${failed.join(', ')}.`);
  return checks;
}

function runtimeFor(fixture) {
  return createScopedEditRuntime({
    host: fixture.host, scopeRequest: fixture.scopeRequest,
    reducerRegistry: fixture.reducerRegistry, journalProjection: fixture.journalProjection,
  });
}

function solveOnce(fixture, entityId = fixture.editableIds[0]) {
  const runtime = runtimeFor(fixture);
  runtime.beginDrag({ entityId, dragRequest: fixture.dragRequest(entityId) });
  const result = runtime.solveDrag(fixture.validRay(entityId));
  return { runtime, result };
}

function commitOnce(fixture, sequence = fixture.journalProjection.envelopes.length + 1) {
  const { runtime, result: dragResult } = solveOnce(fixture);
  const envelope = fixture.envelope(sequence, 'ENTITY_POSITION_SET', fixture.editableIds[0], dragResult.point);
  runtime.prepareCommit({ commandName: 'ENTITY_POSITION_SET', targetIds: [fixture.editableIds[0]], envelope });
  return { runtime, result: runtime.commitPrepared(), envelope };
}

function boundaryDenied(fixtures, policy) {
  const fixture = fixtures.createFixture({ boundaryPolicy: policy });
  const { runtime, result: dragResult } = solveOnce(fixture);
  const envelope = fixture.envelope(1, 'ENTITY_POSITION_SET', fixture.editableIds[0], dragResult.point);
  const result = runtime.prepareCommit({
    commandName: 'ENTITY_POSITION_SET',
    targetIds: [fixture.editableIds[0], fixture.boundaryIds[0]], envelope,
  });
  return result.status === 'REJECTED' && fixture.readEvidence().appendCalls === 0;
}

function corruptAppendRejected(fixtures) {
  const seed = fixtures.envelope(1, 'ENTITY_REMARK_SET', fixtures.editableIds[1], 'seed');
  const projection = fixtures.createFixture().journalProjection;
  const seeded = immutableJson({ ...projection, envelopes: [seed], activeCommandIds: [seed.commandId] }, 'Seeded projection');
  const fixture = fixtures.createFixture({ corruption: 'OMIT_APPENDED', journalProjection: seeded });
  const { result } = commitOnce(fixture, 2);
  return result.status === 'REJECTED'
    && result.rejectionCode === 'APPEND_PROJECTION_INVALID'
    && sameJson(result.journalProjection, seeded);
}

function reducerFailureContained(fixtures) {
  const fixture = fixtures.createFixture({ failCommandType: 'ENTITY_POSITION_SET' });
  const before = fixture.journalProjection;
  const { result } = commitOnce(fixture);
  return result.status === 'REJECTED' && result.rejectionCode === 'REPLAY_FAILED'
    && sameJson(result.journalProjection, before) && /SER-000001/.test(result.message);
}

function replayDeterministic(result, registry) {
  const input = {
    initialState: result.journalProjection.initialState,
    envelopes: result.journalProjection.envelopes,
    activeCommandIds: result.journalProjection.activeCommandIds,
    registry,
  };
  return sameJson(replayEditJournal(input), replayEditJournal(input));
}

function destroyTerminal(fixtures) {
  const fixture = fixtures.createFixture();
  const runtime = runtimeFor(fixture), first = runtime.destroy(), second = runtime.destroy();
  let rejected = false;
  try { runtime.beginDrag({ entityId: fixture.editableIds[0], dragRequest: fixture.dragRequest() }); }
  catch (error) { rejected = error.code === 'RUNTIME_DESTROYED'; }
  return sameJson(first, second) && first.status === SCOPED_EDIT_RUNTIME_STATUS.DESTROYED && rejected;
}

/** Certify only an explicit synthetic fixture, never a production consumer. */
export function runScopedEditRuntimeConformance(input = {}) {
  const fixtures = requiredFixture(input.fixtures);
  const before = JSON.stringify({ scene: fixtures.scene, request: input.scopeRequest, projection: fixtures.journalProjection });
  const hostReport = assertScopedEditHostContract(input.host);
  const context = readScopedEditHostContext(input.host, input.scopeRequest);
  const closure = validateScopeClosure(context.scopedScene, { referencesOf: fixtures.referencesOf });
  const first = solveOnce(fixtures), twinFixture = fixtures.createFixture();
  const twin = solveOnce(twinFixture);
  const evidenceBeforeCommit = fixtures.readEvidence();
  const envelope = fixtures.envelope(1, 'ENTITY_POSITION_SET', fixtures.editableIds[0], first.result.point);
  first.runtime.prepareCommit({ commandName: 'ENTITY_POSITION_SET', targetIds: [fixtures.editableIds[0]], envelope });
  const committed = first.runtime.commitPrepared(), evidenceAfterCommit = fixtures.readEvidence();
  const callOrder = evidenceAfterCommit.callOrder;
  const checks = certify({
    hostShapeValid: hostReport.valid === true,
    sceneValidAndImmutable: isScopedEditDeeplyFrozen(context.scene),
    scopeValidAndClosed: closure.closed && isScopedEditDeeplyFrozen(context.scope),
    editableAuthorizationCorrect: context.scopedScene.entityRoles[fixtures.editableIds[0]] === 'EDITABLE',
    boundaryAuthorizationCorrect: boundaryDenied(fixtures, 'FROZEN') && boundaryDenied(fixtures, 'GHOSTED'),
    dragResultDeterministic: sameJson(first.result, twin.result),
    appendCalledOnlyAfterAuthorization: evidenceBeforeCommit.appendCalls === 0 && evidenceAfterCommit.appendCalls === 1,
    appendPrecedesReplay: callOrder.indexOf(`append:${envelope.commandId}`) < callOrder.indexOf(`replay:${envelope.commandId}`),
    replayDeterministic: replayDeterministic(committed, input.reducerRegistry),
    corruptAppendRejected: corruptAppendRejected(fixtures),
    reducerFailureContained: reducerFailureContained(fixtures),
    inputsUnchanged: before === JSON.stringify({ scene: fixtures.scene, request: input.scopeRequest, projection: fixtures.journalProjection }),
    outputsImmutable: [context.scope, context.scopedScene, first.result, committed].every((value) => isScopedEditDeeplyFrozen(value)),
    destroyTerminal: destroyTerminal(fixtures),
  });
  return immutableJson({
    schema: SCOPED_EDIT_RUNTIME_CONFORMANCE_V1, passed: true, syntheticOnly: true, checks,
  }, 'Scoped edit runtime conformance report');
}

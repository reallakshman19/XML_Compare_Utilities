import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stableToken } from '../tabs/sequential-sketcher/sequential-sketcher-contract.js';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import {
  createSequentialConstructionSession,
  runConstructionUntilBlocked,
} from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import {
  freezeConstructionSession,
} from '../tabs/sequential-sketcher/construction/sequential-construction-contract.js';
import { sequentialSessionFingerprint } from '../tabs/sequential-sketcher/construction/sequential-session-fingerprint.js';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import {
  SEQUENTIAL_COMMAND_REJECTION,
  sameSequentialContractValue,
  sequentialSemanticFingerprint,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js';
import {
  createSequentialCommandJournalState,
  validateSequentialCommandJournalState,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js';
import { createSequentialCommandService, createSequentialJournalAdoption } from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';
import { deriveSequentialEditAuthority } from '../tabs/sequential-sketcher/scoped-edit/sequential-edit-authority.js';

const ADOPTED_AT = '2026-07-26T15:00:00.000Z';
const ISSUED_AT = '2026-07-26T15:01:00.000Z';
function pipe(name, start, end) { return { type: 'PIPE', name, attributes: { APOS: start, LPOS: end } }; }
function branch(name, attributes, children) { return { type: 'BRANCH', name, attributes: { NAME: name, ...attributes }, children }; }
function sourceFingerprint(records) { return `TEST-SOURCE-${stableToken(JSON.stringify(records))}`; }
function ownerRevision(label) { return Object.freeze({ revision: Object.freeze({ schema: 'EngineeringRevisionToken.v1', token: label }) }); }
function completeRecords(branchId) {
  return [branch(branchId, { HPOS: { x: 0, y: 0, z: 0 } }, [
    pipe('P1', { x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }),
    { type: 'CAP', name: 'C1', attributes: { APOS: { x: 100, y: 0, z: 0 } } },
  ])];
}
function blockedRecords(branchId) {
  return [branch(branchId, {
    HPOS: { x: 0, y: 100, z: 0 }, TREF: '/AUTH/MISSING/TARGET',
  }, [pipe('P2', { x: 0, y: 100, z: 0 }, { x: 100, y: 100, z: 0 })])];
}
function createFixture(records, branchId, suppliedSession = null, publisher = null) {
  const evidence = buildSequentialEvidenceModel(records);
  const indexes = indexSequentialEvidence(evidence);
  const session = suppliedSession || createSequentialConstructionSession(branchId);
  const branchRegistry = createSequentialBranchWorkspaceRegistry();
  branchRegistry.reset(evidence.branches.map((row) => row.branchId).sort());
  branchRegistry.save(branchId, { session });
  const fingerprint = sourceFingerprint(records);
  const journalState = createSequentialJournalAdoption({
    documentId: `sequential-document:${fingerprint}`,
    sessionId: `sequential-session:${fingerprint}`,
    sourceFingerprint: fingerprint,
    branchRegistry,
    adoptedAt: ADOPTED_AT,
  });
  let state = {
    sourceFingerprint: fingerprint, evidence, indexes, session, branchRegistry, journalState,
    confirmedConstruction: null, supportProjection: null, ownerSnapshot: ownerRevision('REV-0'),
    engineOptions: {},
  };
  let publicationCount = 0;
  function atomicPublish({ candidate, expectedAuthority, preparedId, envelope }) {
    assert(sameSequentialContractValue(deriveSequentialEditAuthority(state), expectedAuthority));
    if (publisher) return publisher({ candidate, expectedAuthority, preparedId, envelope, state });
    branchRegistry.replace(branchRegistry.ids(), candidate.branchEntries);
    state = {
      ...state,
      session: candidate.session,
      confirmedConstruction: candidate.confirmedConstruction,
      supportProjection: candidate.supportProjection,
      journalState: candidate.journalState,
      ownerSnapshot: ownerRevision(sequentialSemanticFingerprint('TESTREV', {
        preparedId, session: sequentialSessionFingerprint(candidate.session),
        journalSequence: candidate.journalState.journal.nextSequence,
      })),
    };
    publicationCount += 1;
    return Object.freeze({ schema: 'SequentialCommandPublication.v1', committed: true, preparedId });
  }
  return Object.freeze({
    read: () => state,
    set: (patch) => { state = { ...state, ...patch }; },
    branchRegistry,
    service: () => createSequentialCommandService({ readCurrentState: () => state, publishCandidate: atomicPublish }),
    publications: () => publicationCount,
  });
}
function prepareAdvance(fixture) {
  return fixture.service().prepare({
    command: { commandType: 'ADVANCE_ONE', branchId: fixture.read().session.rootBranchId },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  });
}

{
  const fixture = createFixture(completeRecords('/AUTH/COMPLETE'), '/AUTH/COMPLETE');
  const service = fixture.service();
  const prepared = service.prepare({
    command: { commandType: 'ADVANCE_ONE', branchId: '/AUTH/COMPLETE' },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  });
  assert.equal(prepared.envelope.transactionId, prepared.candidate.transactionIds[0]);
  assert.equal(prepared.candidate.session.transactionLedger.at(-1).createdAt, ISSUED_AT);
  assert.equal(prepared.candidate.journalState.journal.entries.at(-1).transactionId, prepared.envelope.transactionId);
  const acceptance = service.accept(prepared);
  assert.equal(acceptance.accepted, true);
  assert.equal(acceptance.publication.committed, true);
  assert.equal(fixture.publications(), 1);
  assert.equal(fixture.read().journalState.journal.entries.length, 1);
}

{
  const left = prepareAdvance(createFixture(completeRecords('/AUTH/DETERMINISTIC'), '/AUTH/DETERMINISTIC'));
  const right = prepareAdvance(createFixture(completeRecords('/AUTH/DETERMINISTIC'), '/AUTH/DETERMINISTIC'));
  assert(sameSequentialContractValue(left, right), 'explicit issuedAt must make preparation byte-semantically deterministic');
}

for (const [label, mutate] of [
  ['owner revision', (fixture) => fixture.set({ ownerSnapshot: ownerRevision('REV-STALE') })],
  ['journal head', (fixture, prepared) => fixture.set({ journalState: prepared.candidate.journalState })],
  ['branch set', (fixture) => fixture.branchRegistry.save(fixture.read().session.rootBranchId, {
    session: fixture.read().session, selectedCandidateId: 'STALE-SELECTION',
  })],
  ['support state', (fixture) => fixture.set({ supportProjection: Object.freeze({
    schema: 'SequentialConfirmedSupportProjection.v1', constructionFingerprint: 'STALE-SUPPORT', supportGlyphs: [],
  }) })],
  ['undo head', (fixture) => fixture.set({ session: freezeConstructionSession({
    ...fixture.read().session,
    undoStack: [{ transactionId: 'TXN-STALE-UNDO' }],
  }) })],
]) {
  const branchId = `/AUTH/STALE/${label.replaceAll(' ', '-')}`;
  const fixture = createFixture(completeRecords(branchId), branchId);
  const service = fixture.service();
  const prepared = service.prepare({
    command: { commandType: 'ADVANCE_ONE', branchId },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  });
  mutate(fixture, prepared);
  const acceptance = service.accept(prepared);
  assert.equal(acceptance.accepted, false, `${label} change must reject stale work`);
  assert.equal(acceptance.reasonCode, SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_STALE);
  assert.equal(fixture.publications(), 0);
}

{
  const fixture = createFixture(completeRecords('/AUTH/TAMPER'), '/AUTH/TAMPER');
  const service = fixture.service();
  const prepared = service.prepare({
    command: { commandType: 'ADVANCE_ONE', branchId: '/AUTH/TAMPER' },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  });
  const tampered = Object.freeze({ ...prepared, candidate: Object.freeze({ ...prepared.candidate, outcome: 'TAMPERED' }) });
  const acceptance = service.accept(tampered);
  assert.equal(acceptance.accepted, false);
  assert.equal(acceptance.reasonCode, SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_INVALID);
  assert.equal(fixture.publications(), 0);
}

{
  const branchId = '/AUTH/BLOCKED';
  const records = blockedRecords(branchId);
  const evidence = buildSequentialEvidenceModel(records);
  const indexes = indexSequentialEvidence(evidence);
  const blocked = runConstructionUntilBlocked(
    createSequentialConstructionSession(branchId), evidence, indexes, { commandIssuedAt: ADOPTED_AT },
  ).session;
  assert.equal(blocked.state, 'USER_DECISION_REQUIRED');
  const fixture = createFixture(records, branchId, blocked);
  const service = fixture.service();
  assert.throws(() => service.prepare({
    command: { commandType: 'DEFER_DECISION', branchId, decisionId: 'D-WRONG' },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  }), (error) => error.code === SEQUENTIAL_COMMAND_REJECTION.CURRENT_DECISION_MISMATCH);
}

{
  const branchId = '/AUTH/CORRUPT';
  const session = createSequentialConstructionSession(branchId);
  const after = freezeConstructionSession({ ...session, state: 'BUILDING' });
  const transaction = Object.freeze({
    schema: 'SequentialConstructionTransaction.v1', transactionId: 'TXN-CORRUPT',
    beforeFingerprint: sequentialSessionFingerprint(session), afterFingerprint: sequentialSessionFingerprint(after),
  });
  const corrupt = freezeConstructionSession({
    ...after,
    transactionLedger: [transaction],
    undoStack: [{
      schema: 'SequentialConstructionUndoEntry.v1', transactionId: transaction.transactionId,
      action: 'ADVANCE_ONE', beforeFingerprint: 'CORRUPTED', afterFingerprint: transaction.afterFingerprint,
      beforeSnapshot: session, afterSnapshot: after,
    }],
  });
  const registry = createSequentialBranchWorkspaceRegistry();
  registry.reset([branchId]); registry.save(branchId, { session: corrupt });
  assert.throws(() => createSequentialCommandJournalState({
    documentId: 'sequential-document:corrupt', sessionId: 'sequential-session:corrupt',
    sourceFingerprint: 'SOURCE-CORRUPT', branchRegistry: registry,
    branchSetFingerprint: 'BRANCHSET-CORRUPT', adoptedAt: ADOPTED_AT,
  }), (error) => error.code === SEQUENTIAL_COMMAND_REJECTION.LEGACY_HISTORY_INVALID);
}

{
  let attempted = 0;
  const failure = Object.assign(new Error('Persistence failed before atomic commit.'), { code: 'PERSISTENCE_FAILED' });
  const fixture = createFixture(completeRecords('/AUTH/PUBLISH-FAIL'), '/AUTH/PUBLISH-FAIL', null, () => {
    attempted += 1; throw failure;
  });
  const before = deriveSequentialEditAuthority(fixture.read());
  const service = fixture.service();
  const acceptance = service.accept(service.prepare({
    command: { commandType: 'ADVANCE_ONE', branchId: '/AUTH/PUBLISH-FAIL' },
    origin: { kind: 'USER', actorId: 'AUTHORITY_TEST', issuedAt: ISSUED_AT },
  }));
  assert.equal(acceptance.accepted, false);
  assert.equal(acceptance.reasonCode, 'PERSISTENCE_FAILED');
  assert.equal(attempted, 1);
  assert(sameSequentialContractValue(deriveSequentialEditAuthority(fixture.read()), before));
}

{
  const fixture = createFixture(completeRecords('/AUTH/JOURNAL'), '/AUTH/JOURNAL');
  assert.deepEqual(validateSequentialCommandJournalState(fixture.read().journalState), []);
  const corrupt = structuredClone(fixture.read().journalState);
  corrupt.adoptionCheckpoint.checkpointId = 'SADOPT-CORRUPTED';
  assert.match(validateSequentialCommandJournalState(corrupt).join('; '), /checkpoint fingerprint|journal identity/);
}

const modules = [
  'tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-command-targets.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-command-journal.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-edit-authority.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-command-preparation.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-command-acceptance.js',
  'tabs/sequential-sketcher/scoped-edit/sequential-command-service.js',
];
for (const relative of modules) {
  const source = readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
  assert(source.split(/\r?\n/).length <= 300, `${relative} must remain under 300 lines`);
  assert.doesNotMatch(source, /export\s+default/);
}
console.log('Sequential SSK-TS-1A command authority foundation tests passed');

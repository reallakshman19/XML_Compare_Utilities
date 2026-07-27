import assert from 'node:assert/strict';
import { createSequentialBranchWorkspaceRegistry } from '../tabs/sequential-sketcher/sequential-branch-workspace-state.js';
import { createSequentialConstructionSession } from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';
import { sequentialSessionFingerprint } from '../tabs/sequential-sketcher/construction/sequential-session-fingerprint.js';
import {
  createSequentialWorkspacePackage,
  restoreSequentialWorkspacePackage,
  sequentialSourceRecordsFingerprint,
  sequentialWorkspacePackageFingerprint,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-package.js';
import {
  createSequentialWorkspacePackageV2,
  restoreSequentialWorkspacePackageV2,
} from '../tabs/sequential-sketcher/persistence/sequential-workspace-package-v2.js';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import {
  createSequentialNativeCommand,
  sequentialSemanticFingerprint,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-command-contracts.js';
import {
  createSequentialCommandService,
  createSequentialJournalAdoption,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-command-service.js';

const ADOPTED_AT = '2026-07-27T04:30:00.000Z';
const ISSUED_AT = '2026-07-27T04:31:00.000Z';
const BRANCH_ID = '/PKG/V2/AUTHORITY';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function pipe(name, start, end) { return { type: 'PIPE', name, attributes: { APOS: start, LPOS: end } }; }
function branch(name, children) {
  return { type: 'BRANCH', name, attributes: { NAME: name, HPOS: { x: 0, y: 0, z: 0 } }, children };
}
function ownerRevision(token) {
  return Object.freeze({ revision: Object.freeze({ schema: 'EngineeringRevisionToken.v1', token }) });
}
function refreshAuthorityFingerprint(value) {
  const { authorityFingerprint: ignored, ...material } = value.commandAuthority;
  void ignored;
  value.commandAuthority.authorityFingerprint = sequentialSemanticFingerprint('SWPKGAUTH', material);
}
function refreshPackageFingerprint(value) {
  value.packageFingerprint = sequentialWorkspacePackageFingerprint(value);
  return value;
}

const records = [branch(BRANCH_ID, [
  pipe('P1', { x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }),
  { type: 'CAP', name: 'C1', attributes: { APOS: { x: 100, y: 0, z: 0 } } },
])];
const evidence = buildSequentialEvidenceModel(records);
const indexes = indexSequentialEvidence(evidence);
const sourceFingerprint = sequentialSourceRecordsFingerprint(records);
const branchRegistry = createSequentialBranchWorkspaceRegistry();
branchRegistry.reset([BRANCH_ID]);
branchRegistry.save(BRANCH_ID, { session: createSequentialConstructionSession(BRANCH_ID) });

let state = {
  sourceFingerprint,
  evidence,
  indexes,
  session: branchRegistry.get(BRANCH_ID).session,
  branchRegistry,
  journalState: createSequentialJournalAdoption({
    documentId: `sequential-document:${sourceFingerprint}`,
    sessionId: `sequential-session:${sourceFingerprint}`,
    sourceFingerprint,
    branchRegistry,
    adoptedAt: ADOPTED_AT,
  }),
  confirmedConstruction: null,
  supportProjection: null,
  ownerSnapshot: ownerRevision('PKG-V2-REV-0'),
  engineOptions: {},
};

const service = createSequentialCommandService({
  readCurrentState: () => state,
  publishCandidate({ candidate, expectedAuthority, preparedId }) {
    branchRegistry.replace(branchRegistry.ids(), candidate.branchEntries);
    state = {
      ...state,
      session: candidate.session,
      confirmedConstruction: candidate.confirmedConstruction,
      supportProjection: candidate.supportProjection,
      journalState: candidate.journalState,
      ownerSnapshot: ownerRevision(sequentialSemanticFingerprint('PKGV2REV', {
        preparedId,
        sessionFingerprint: sequentialSessionFingerprint(candidate.session),
        authorityId: expectedAuthority.authorityId,
      })),
    };
    return Object.freeze({
      schema: 'SequentialCommandPublication.v1', committed: true, preparedId,
      expectedAuthorityId: expectedAuthority.authorityId,
    });
  },
});

const execution = service.execute({
  command: { commandType: 'ADVANCE_ONE', branchId: BRANCH_ID },
  origin: { kind: 'USER', actorId: 'PACKAGE_V2_TEST', issuedAt: ISSUED_AT },
});
assert.equal(execution.acceptance.accepted, true);
assert.equal(state.journalState.journal.entries.length, 1);
assert.equal(state.journalState.journal.entries[0].transactionId,
  state.session.transactionLedger.at(-1).transactionId);

const packageV2 = createSequentialWorkspacePackageV2({
  records,
  evidence,
  branchRegistry,
  activeBranchId: BRANCH_ID,
  journalState: state.journalState,
});
assert.equal(packageV2.schema, 'SequentialWorkspacePackage.v2');
assert.equal(packageV2.revision, 2);
assert.equal(packageV2.minimumReaderRevision, 2);
assert.equal(packageV2.commandAuthority.journalState.journal.entries.length, 1);
assert.notEqual(packageV2.commandAuthority.adoptionBranchSetFingerprint,
  packageV2.commandAuthority.branchSetFingerprint);

const restored = restoreSequentialWorkspacePackageV2(JSON.stringify(packageV2));
assert.equal(restored.schema, 'SequentialWorkspaceRestoration.v2');
assert.equal(restored.packageFingerprint, packageV2.packageFingerprint);
assert.equal(restored.journalState.journal.entries.length, 1);
assert.equal(restored.commandAuthority.journalHeadFingerprint,
  packageV2.commandAuthority.journalHeadFingerprint);
assert.equal(restored.workspaces[0].snapshot.session.transactionLedger.at(-1).transactionId,
  restored.journalState.journal.entries[0].transactionId);

{
  const future = clone(packageV2);
  future.minimumReaderRevision = 3;
  refreshPackageFingerprint(future);
  assert.throws(() => restoreSequentialWorkspacePackageV2(future), /WORKSPACE_PACKAGE_V2_READER_UNSUPPORTED/);
}
{
  const unknownBranch = clone(packageV2);
  const entry = unknownBranch.commandAuthority.journalState.journal.entries[0];
  entry.payload = createSequentialNativeCommand({ ...entry.payload, branchId: '/UNKNOWN' });
  refreshAuthorityFingerprint(unknownBranch);
  refreshPackageFingerprint(unknownBranch);
  assert.throws(() => restoreSequentialWorkspacePackageV2(unknownBranch), /WORKSPACE_COMMAND_BRANCH_UNKNOWN/);
}
{
  const unknownTransaction = clone(packageV2);
  unknownTransaction.commandAuthority.journalState.journal.entries[0].transactionId = 'TXN-UNKNOWN';
  refreshAuthorityFingerprint(unknownTransaction);
  refreshPackageFingerprint(unknownTransaction);
  assert.throws(() => restoreSequentialWorkspacePackageV2(unknownTransaction), /WORKSPACE_COMMAND_TRANSACTION_UNKNOWN/);
}
{
  const invalidJournal = clone(packageV2);
  invalidJournal.commandAuthority.journalState.journal.activeCommandIds = ['CJ-UNKNOWN'];
  refreshAuthorityFingerprint(invalidJournal);
  refreshPackageFingerprint(invalidJournal);
  assert.throws(() => restoreSequentialWorkspacePackageV2(invalidJournal), /WORKSPACE_COMMAND_JOURNAL_INVALID/);
}

const legacy = createSequentialWorkspacePackage({
  records,
  evidence,
  branchRegistry,
  activeBranchId: BRANCH_ID,
});
assert.equal(legacy.schema, 'SequentialWorkspacePackage.v1');
assert.equal(restoreSequentialWorkspacePackage(legacy).schema, 'SequentialWorkspaceRestoration.v1');

console.log('sequential workspace command-authority package v2 tests passed');

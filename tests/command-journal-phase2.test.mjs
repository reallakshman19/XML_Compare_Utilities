import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  activeJournalCommands, parseCommandJournal, serializeCommandJournal, validateCommandJournal,
} from '../contracts/command-journal.js';
import { attachProjectDocument, createProjectDocument, createProjectSession } from '../contracts/project-session-contracts.js';
import { createTopologyDraftRecovery } from '../tabs/topology-trace-validator/topology-draft-recovery.js';
import { createTopologyEditJournalService } from '../tabs/topology-trace-validator/topology-edit-journal-service.js';
import { assertTopologyDraftBasis, parseTopologyEditSessionDraft, serializeTopologyEditSessionDraft } from '../tabs/topology-trace-validator/topology-edit-session-draft.js';
import { replayTopologyCommandJournal, topologyReplayStateHash } from '../tabs/topology-trace-validator/topology-command-replay.js';
import { semanticHash } from '../tabs/topology-trace-validator/topology-validator-values.js';

const NOW = '2026-07-17T11:11:44.000Z';
const later = (seconds) => `2026-07-17T11:11:${String(44 + seconds).padStart(2, '0')}.000Z`;
const sourceHash = 'b'.repeat(64);
const document = createProjectDocument({
  documentId: 'topology-document:test', slotId: 'baseline', fileName: 'test.json', sourceHash, scopedHash: sourceHash,
  stagedSchema: 'TopologyEditSource.v1', rootShape: 'branches', unit: 'MM', verticalAxis: 'Y', coordinateFrame: 'UNKNOWN',
  stats: { branchCount: 1, componentCount: 1, scanned: 1, matched: 1, filtered: 0 },
  scope: { wildcard: '', selectedIds: [] }, createdAt: NOW,
});
const session = attachProjectDocument(createProjectSession({ sessionId: 'topology-session:test', createdAt: NOW }), document, NOW);
const context = Object.freeze({ document, session });
const baseDraft = Object.freeze({
  schema: 'TopologyEditDraft.v1', baseCanonicalTopologyHash: 'canonical:test', commands: Object.freeze([]),
  redoCommands: Object.freeze([]), engineeringOverrides: Object.freeze({}), settings: Object.freeze({}),
  nextCommandSequence: 1, topologyEditDraftHash: 'draft:base',
});

const fakeCore = Object.freeze({
  appendTopologyEditCommand(draft, type, payload) {
    const sequence = draft.nextCommandSequence;
    const command = Object.freeze({ schema: 'TopologyEditCommand.v1', id: `EC-${String(sequence).padStart(6, '0')}`, type, payload: structuredClone(payload) });
    const next = { ...draft, commands: Object.freeze([...draft.commands, command]), redoCommands: Object.freeze([]), nextCommandSequence: sequence + 1 };
    return Object.freeze({ ...next, topologyEditDraftHash: semanticHash(next) });
  },
});

function memoryStorage() {
  const values = new Map();
  return Object.freeze({
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key),
  });
}

const storage = memoryStorage(), recovery = createTopologyDraftRecovery(storage);
const service = createTopologyEditJournalService({ core: fakeCore, context, baseDraft, recovery, createdAt: NOW });
const uiState = Object.freeze({ projection: 'XY', tool: 'SELECT', contextEdgeId: '', supportScale: 2.5, selection: [] });
const origin = Object.freeze({ kind: 'USER', actorId: 'LOCAL_USER', issuedAt: later(1) });
const native = fakeCore.appendTopologyEditCommand(baseDraft, 'MOVE_NODE', { nodeId: 'CN-1', position: { x: 1, y: 2, z: 3 } }).commands[0];
service.appendNative(native, origin, uiState, later(1));
service.appendAttribute({ branchIndex: 0, childIndex: 0, sourcePath: '$[0].children[0]', field: 'STATUS', before: '', after: 'CHECKED', reason: 'review', fixCode: 'REVIEW' }, { ...origin, issuedAt: later(2) }, uiState, later(2));
service.setRemark('EC-000001', 'verified', { ...origin, issuedAt: later(3) }, uiState, later(3));

let evidence = service.evidence();
assert.equal(evidence.journal.entries.length, 3);
assert.equal(evidence.commandEnvelopes.length, 3);
assert(evidence.commandEnvelopes.every((entry) => entry.inverse), 'every command carries inverse evidence');
assert.equal(evidence.state.draft.commands.length, 1);
assert.equal(evidence.state.attributeLedger.edits.length, 1);
assert.equal(evidence.state.remarks['EC-000001'], 'verified');
assert.deepEqual(validateCommandJournal(evidence.journal), []);
assert.equal(parseCommandJournal(serializeCommandJournal(evidence.journal)).entries.length, 3);

service.undo(uiState, later(4));
assert.equal(service.evidence().state.remarks['EC-000001'], undefined, 'unified undo removes last remark command');
service.undo(uiState, later(5));
assert.equal(service.evidence().state.attributeLedger.edits.length, 0, 'unified undo removes attribute command');
service.redo(uiState, later(6)); service.redo(uiState, later(7));
assert.equal(service.evidence().state.remarks['EC-000001'], 'verified');

for (let index = 0; index < 7; index += 1) {
  const time = later(8 + index);
  service.setRemark(`ROW-${index}`, `value-${index}`, { ...origin, issuedAt: time }, uiState, time);
}
evidence = service.evidence();
assert.equal(evidence.journal.activeCommandIds.length, 10);
assert.equal(evidence.journal.checkpoints.length, 1, 'ten active commands create an automatic checkpoint');
assert.equal(evidence.journal.checkpoints[0].stateHash, topologyReplayStateHash(evidence.state));

const serializedDraft = serializeTopologyEditSessionDraft(evidence.lastSnapshot);
const persisted = parseTopologyEditSessionDraft(serializedDraft);
const restoredService = createTopologyEditJournalService({ core: fakeCore, context, baseDraft, recovery, createdAt: NOW });
const restored = restoredService.restore();
assert.equal(restored.commandCount, 10);
assert.equal(topologyReplayStateHash(restored.state), topologyReplayStateHash(evidence.state));
assert.deepEqual(replayTopologyCommandJournal(persisted.commandJournal, baseDraft, fakeCore), restored.state);
assert.deepEqual(activeJournalCommands(persisted.commandJournal).map((entry) => entry.commandId), persisted.commandJournal.activeCommandIds);
const mismatchedContext = Object.freeze({ ...context, document: Object.freeze({ ...document, sourceHash: 'c'.repeat(64) }) });
assert.throws(() => assertTopologyDraftBasis(persisted, mismatchedContext), /does not match loaded source/);

const batchService = createTopologyEditJournalService({ core: fakeCore, context, baseDraft, recovery: createTopologyDraftRecovery(memoryStorage()), createdAt: NOW });
const first = fakeCore.appendTopologyEditCommand(baseDraft, 'MOVE_NODE', { nodeId: 'CN-2' });
const second = fakeCore.appendTopologyEditCommand(first, 'MOVE_NODE', { nodeId: 'CN-3' });
batchService.appendNativeBatch(second.commands, { ...origin, kind: 'AUTOFIX', issuedAt: later(15) }, uiState, later(15));
const batchEvidence = batchService.evidence();
assert.equal(new Set(batchEvidence.commandEnvelopes.map((entry) => entry.transactionId)).size, 1);
assert.equal(batchEvidence.state.draft.commands.length, 2, 'autofix batches replay as one persisted transition');

const modules = ['contracts/command-journal.js', 'tabs/topology-trace-validator/topology-command-replay.js',
  'tabs/topology-trace-validator/topology-edit-session-draft.js', 'tabs/topology-trace-validator/topology-draft-recovery.js',
  'tabs/topology-trace-validator/topology-edit-journal-service.js', 'tabs/topology-trace-validator/topology-edit-persistence-actions.js',
  'tabs/topology-trace-validator/topology-edit-ui-state.js'];
for (const relative of modules) {
  const source = readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
  assert(source.split(/\r?\n/).length <= 300, `${relative} exceeds 300 lines`);
  assert.doesNotMatch(source, /export\s+default/, `${relative} must use named exports`);
}
console.log('[SIMULATED] Phase 2 unified journal, inverse evidence, checkpoints, replay, round-trip, and crash recovery passed.');

/** Stateful adapter that commits replayable journal transitions before exposing them. */

import { activeJournalCommands, checkpointCommandJournal, redoCommandJournal, undoCommandJournal } from '../../contracts/command-journal.js';
import {
  appendTopologyAttributeJournalCommand, appendTopologyNativeJournalCommand, appendTopologyNativeJournalCommands, appendTopologyRemarkJournalCommand,
  createTopologyCommandJournal, replayTopologyCommandJournal, topologyReplayStateHash,
} from './topology-command-replay.js';
import { assertTopologyDraftBasis, createTopologyEditSessionDraft } from './topology-edit-session-draft.js';
import { asArray, cleanText, objectRecord } from './topology-validator-values.js';

function assertBaseDraft(draft, baseDraft) {
  if (draft.baseCanonicalTopologyHash !== baseDraft.baseCanonicalTopologyHash) throw new Error('Persisted draft canonical basis does not match the current producer basis.');
}

function createServiceState(input) {
  const journal = createTopologyCommandJournal(input.context, input.createdAt);
  return {
    core: input.core, context: input.context, baseDraft: input.baseDraft, recovery: input.recovery,
    journal, replayState: replayTopologyCommandJournal(journal, input.baseDraft, input.core), lastSnapshot: null,
  };
}

function replay(state, journal) {
  return replayTopologyCommandJournal(journal, state.baseDraft, state.core);
}

function shouldAutoCheckpoint(journal) {
  const sequence = journal.nextSequence - 1, last = journal.checkpoints.at(-1);
  return sequence > 0 && sequence % 10 === 0 && last?.sequence !== sequence;
}

function commit(state, journal, replayState, uiState, savedAt, forceCheckpoint) {
  const checkpoint = forceCheckpoint || shouldAutoCheckpoint(journal);
  const finalJournal = checkpoint ? checkpointCommandJournal(journal, topologyReplayStateHash(replayState), savedAt) : journal;
  const snapshot = createTopologyEditSessionDraft({
    context: state.context, baseDraft: state.baseDraft, commandJournal: finalJournal, uiState, savedAt,
  });
  state.recovery.save(snapshot); state.journal = finalJournal; state.replayState = replayState; state.lastSnapshot = snapshot;
  return state.replayState;
}

function appendNative(state, nativeCommand, origin, uiState, updatedAt) {
  const journal = appendTopologyNativeJournalCommand(state.journal, state.baseDraft, nativeCommand, origin, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function appendNativeBatch(state, nativeCommands, origin, uiState, updatedAt) {
  const journal = appendTopologyNativeJournalCommands(state.journal, state.baseDraft, nativeCommands, origin, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function appendAttribute(state, edit, origin, uiState, updatedAt) {
  const journal = appendTopologyAttributeJournalCommand(state.journal, state.baseDraft, edit, origin, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function setRemark(state, targetId, value, origin, uiState, updatedAt) {
  const previous = cleanText(state.replayState.remarks[cleanText(targetId)]);
  const journal = appendTopologyRemarkJournalCommand(state.journal, state.baseDraft, targetId, value, previous, origin, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function undo(state, uiState, updatedAt) {
  const journal = undoCommandJournal(state.journal, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function redo(state, uiState, updatedAt) {
  const journal = redoCommandJournal(state.journal, updatedAt);
  return commit(state, journal, replay(state, journal), uiState, updatedAt, false);
}

function restore(state) {
  const recovered = state.recovery.load(state.context.document.documentId);
  if (!recovered) return null;
  assertTopologyDraftBasis(recovered, state.context); assertBaseDraft(recovered.baseDraft, state.baseDraft);
  state.journal = recovered.commandJournal; state.replayState = replay(state, state.journal); state.lastSnapshot = recovered;
  return Object.freeze({ state: state.replayState, uiState: recovered.uiState, commandCount: state.journal.activeCommandIds.length });
}

function load(state, persisted, updatedAt) {
  assertTopologyDraftBasis(persisted, state.context); assertBaseDraft(persisted.baseDraft, state.baseDraft);
  const replayState = replay(state, persisted.commandJournal);
  commit(state, persisted.commandJournal, replayState, persisted.uiState, updatedAt, false);
  return Object.freeze({ state: state.replayState, uiState: persisted.uiState });
}

function importLegacy(state, legacy, origin, uiState, updatedAt) {
  if (legacy?.schema !== 'TopologyEditDraft.v1') throw new TypeError('Legacy import requires TopologyEditDraft.v1.');
  assertBaseDraft(legacy, state.baseDraft);
  let journal = createTopologyCommandJournal(state.context, updatedAt);
  for (const command of asArray(legacy.commands).map(objectRecord)) {
    journal = appendTopologyNativeJournalCommand(journal, state.baseDraft, command, origin, updatedAt);
  }
  return commit(state, journal, replay(state, journal), uiState, updatedAt, true);
}

/** Create one journal authority for a single topology Edit controller. */
export function createTopologyEditJournalService(input) {
  const state = createServiceState(input);
  return Object.freeze({
    appendNative: (...args) => appendNative(state, ...args), appendNativeBatch: (...args) => appendNativeBatch(state, ...args),
    appendAttribute: (...args) => appendAttribute(state, ...args),
    setRemark: (...args) => setRemark(state, ...args), undo: (...args) => undo(state, ...args), redo: (...args) => redo(state, ...args),
    checkpoint: (uiState, updatedAt) => commit(state, state.journal, state.replayState, uiState, updatedAt, true),
    restore: () => restore(state), load: (...args) => load(state, ...args), importLegacy: (...args) => importLegacy(state, ...args),
    evidence: () => Object.freeze({ journal: state.journal, state: state.replayState,
      commandEnvelopes: activeJournalCommands(state.journal), lastSnapshot: state.lastSnapshot }),
  });
}

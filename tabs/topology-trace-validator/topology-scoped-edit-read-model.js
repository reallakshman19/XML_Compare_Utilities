/** Immutable accepted-authority read model for Topology scoped-edit qualification. */
import { immutableJson, requiredContractText } from '../../contracts/contract-values.js';
import { validateCommandJournal } from '../../contracts/command-journal.js';
import { validateProjectDocument } from '../../contracts/project-session-contracts.js';
import {
  TOPOLOGY_SCOPED_EDIT_AUTHORITY_BASIS_V1,
  createTopologyScopedEditAuthorityBasis,
} from './topology-scoped-edit-authority-contracts.js';
import { createTopologyScopedEditCommandScope } from './topology-scoped-edit-command-scope.js';
import {
  createTopologyReplayState,
  replayTopologyCommandJournal,
  topologyReplayStateHash,
} from './topology-command-replay.js';
import { semanticHash, semanticStringify } from './topology-validator-values.js';
import { createTopologyScopedEditJournalProjection } from './topology-scoped-edit-journal-projection.js';

export const TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1 = 'TopologyScopedEditReadModel.v1';
export const TOPOLOGY_SCOPED_EDIT_SELECTION_SNAPSHOT_V1 = 'TopologyScopedEditSelectionSnapshot.v1';
export const TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION = Object.freeze({
  AUTHORITY_MISMATCH: 'READ_MODEL_AUTHORITY_MISMATCH',
  DOCUMENT_MISMATCH: 'READ_MODEL_DOCUMENT_MISMATCH',
  JOURNAL_MISMATCH: 'READ_MODEL_JOURNAL_MISMATCH',
  REPLAY_MISMATCH: 'READ_MODEL_REPLAY_MISMATCH',
  DRAFT_MISMATCH: 'READ_MODEL_DRAFT_MISMATCH',
  CANONICAL_MISMATCH: 'READ_MODEL_CANONICAL_MISMATCH',
  SOURCE_BASIS_MISMATCH: 'READ_MODEL_SOURCE_BASIS_MISMATCH',
  COORDINATE_MISMATCH: 'READ_MODEL_COORDINATE_MISMATCH',
  COMMAND_SCOPE_MISMATCH: 'READ_MODEL_COMMAND_SCOPE_MISMATCH',
});

function fail(code, message, Constructor = TypeError) {
  const error = new Constructor(message);
  error.code = code;
  throw error;
}

function record(value, label, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${label} must be an object.`);
  return value;
}

function same(left, right) {
  return semanticStringify(left) === semanticStringify(right);
}

function normalizedUnit(value) {
  const unit = requiredContractText(value, 'Topology project unit').toLowerCase();
  if (unit !== 'mm') fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH,
    `Unsupported Topology project unit ${value}.`, RangeError);
  return 'mm';
}

function coordinateSystem(input, projectDocument, canonical) {
  const evidence = record(input, 'coordinateSystemEvidence',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH);
  const frame = requiredContractText(evidence.frame, 'coordinate frame');
  const coordinateAuthority = requiredContractText(evidence.authority, 'coordinate authority');
  const canonicalFrame = requiredContractText(canonical.coordinateFrame?.schema, 'canonical coordinate frame');
  const projectFrame = requiredContractText(projectDocument.coordinateFrame, 'project coordinate frame');
  if (frame !== canonicalFrame || (projectFrame !== 'UNKNOWN' && projectFrame !== frame)) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH,
      'Project, canonical and supplied coordinate-frame evidence disagree.');
  }
  if (projectFrame === 'UNKNOWN' && coordinateAuthority !== 'CanonicalTopology.v1') {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH,
      'UNKNOWN project coordinate frame requires explicit CanonicalTopology.v1 evidence.');
  }
  const verticalAxis = requiredContractText(projectDocument.verticalAxis, 'vertical axis').toUpperCase();
  if (!['X', 'Y', 'Z'].includes(verticalAxis) || !['left', 'right'].includes(evidence.handedness)) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH,
      'Topology vertical axis or handedness is unsupported.');
  }
  const unit = normalizedUnit(projectDocument.unit);
  if (normalizedUnit(canonical.coordinateFrame?.unit) !== unit) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COORDINATE_MISMATCH,
      'Project and canonical coordinate units disagree.');
  }
  return immutableJson({ unit, frame, verticalAxis, handedness: evidence.handedness,
    authority: coordinateAuthority }, 'Topology coordinate-system evidence');
}

function validateDocument(input, journal, authority) {
  const document = record(input.projectDocument, 'projectDocument',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DOCUMENT_MISMATCH);
  const documentErrors = validateProjectDocument(document);
  if (documentErrors.length) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DOCUMENT_MISMATCH,
    `Invalid ProjectDocument: ${documentErrors.join('; ')}`);
  const documentId = requiredContractText(document.documentId, 'project documentId');
  const sourceHash = requiredContractText(document.sourceHash, 'project sourceHash');
  const sessionId = requiredContractText(input.sessionId, 'project sessionId');
  if (journal.documentId !== documentId || journal.sessionId !== sessionId
    || authority.documentId !== documentId || authority.sourceHash !== sourceHash) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DOCUMENT_MISMATCH,
      'Project, journal and Topology authority document identities disagree.');
  }
  return { document, documentId, sourceHash, sessionId };
}

function replayEvidence(input, dependencies, journal) {
  const baseDraft = record(input.baseDraft, 'baseDraft',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DRAFT_MISMATCH);
  const core = dependencies.core;
  if (typeof core?.appendTopologyEditCommand !== 'function') {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH,
      'Read-model validation requires the pure Topology replay core.');
  }
  const replay = replayTopologyCommandJournal(journal, baseDraft, core);
  const supplied = record(input.replayState, 'replayState',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH);
  if (!same(replay, supplied)) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH,
    'Supplied replay state does not match active CommandJournal replay.');
  return { baseDraft, replay };
}

function validateDraft(input, baseDraft, replay, authority) {
  const draft = record(input.editDraft, 'editDraft',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DRAFT_MISMATCH);
  if (draft.schema !== 'TopologyEditDraft.v1' || baseDraft.schema !== 'TopologyEditDraft.v1'
    || !same(draft, replay.draft) || draft.topologyEditDraftHash !== authority.currentDraftHash
    || baseDraft.baseCanonicalTopologyHash !== authority.baseCanonicalTopologyHash) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.DRAFT_MISMATCH,
      'Base, replayed, supplied draft and authority hashes disagree.');
  }
  if (!same(input.attributeLedger, replay.attributeLedger) || !same(input.remarks, replay.remarks)) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.REPLAY_MISMATCH,
      'Attribute ledger or remarks do not match accepted journal replay.');
  }
  return draft;
}

function validateCanonical(input, authority, documentId, sourceHash, draft) {
  const canonical = record(input.canonicalTopology, 'canonicalTopology',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.CANONICAL_MISMATCH);
  const ancestry = record(input.canonicalAncestry, 'canonicalAncestry',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.CANONICAL_MISMATCH);
  const hash = requiredContractText(canonical.canonicalTopologyHash, 'canonicalTopologyHash');
  if (canonical.schema !== 'CanonicalTopology.v1' || ancestry.authorityId !== authority.authorityId
    || ancestry.documentId !== documentId || ancestry.sourceHash !== sourceHash
    || ancestry.draftHash !== draft.topologyEditDraftHash || ancestry.canonicalTopologyHash !== hash
    || (canonical.topologyEditDraftHash && canonical.topologyEditDraftHash !== draft.topologyEditDraftHash)) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.CANONICAL_MISMATCH,
      'Canonical topology does not match accepted authority ancestry.');
  }
  if (canonical.sourceIdentity?.sourceHash && canonical.sourceIdentity.sourceHash !== sourceHash) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.SOURCE_BASIS_MISMATCH,
      'Canonical source identity does not match the project source hash.');
  }
  return canonical;
}

function validateAuthority(input, journal, replay) {
  const supplied = record(input.authority, 'authority',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH);
  if (supplied.schema !== TOPOLOGY_SCOPED_EDIT_AUTHORITY_BASIS_V1) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH,
      'Topology authority schema is invalid.');
  }
  const derived = createTopologyScopedEditAuthorityBasis({ documentId: supplied.documentId,
    sourceHash: supplied.sourceHash, baseCanonicalTopologyHash: supplied.baseCanonicalTopologyHash,
    currentDraftHash: replay.draft.topologyEditDraftHash, journalHash: semanticHash(journal),
    replayHash: topologyReplayStateHash(replay), activeCommandIds: journal.activeCommandIds,
    redoCommandIds: journal.redoCommandIds });
  if (!same(derived, supplied)) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH,
    'Supplied Topology authority does not match journal and replay evidence.');
  return supplied;
}

function commandScope(input, canonical) {
  const basisInput = record(input.commandScopeInput, 'commandScopeInput',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COMMAND_SCOPE_MISMATCH);
  const derived = createTopologyScopedEditCommandScope({ canonical, ...basisInput });
  if (input.commandScopeBasis && !same(input.commandScopeBasis, derived)) {
    fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.COMMAND_SCOPE_MISMATCH,
      'Supplied command scope does not recompute from current canonical authority.');
  }
  return { basis: derived, input: basisInput };
}

function selectionSnapshot(input, authorityId, canonical) {
  const supplied = input.selectionSnapshot ?? { authorityId, entityIds: [] };
  const ids = [...new Set((supplied.entityIds ?? []).map((value) => requiredContractText(value,
    'selection entityId')))].sort();
  const candidateIds = new Set(['nodes', 'edges', 'supports', 'junctions', 'boundaries', 'bends', 'pointFeatures']
    .flatMap((collection) => (canonical[collection] ?? []).map((row) => row.id)));
  if (ids.some((id) => !candidateIds.has(id))) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH,
    'Selection snapshot contains an entity outside the accepted canonical population.');
  if (supplied.authorityId !== authorityId) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.AUTHORITY_MISMATCH,
    'Selection snapshot authority is stale.');
  return immutableJson({ schema: TOPOLOGY_SCOPED_EDIT_SELECTION_SNAPSHOT_V1,
    authorityId, entityIds: ids }, 'Topology selection snapshot');
}

export function createTopologyScopedEditReadModel(input = {}, dependencies = {}) {
  const journal = record(input.commandJournal, 'commandJournal',
    TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.JOURNAL_MISMATCH);
  const errors = validateCommandJournal(journal);
  if (errors.length) fail(TOPOLOGY_SCOPED_EDIT_READ_MODEL_REJECTION.JOURNAL_MISMATCH,
    `Invalid accepted CommandJournal: ${errors.join('; ')}`);
  const { baseDraft, replay } = replayEvidence(input, dependencies, journal);
  const authority = validateAuthority(input, journal, replay);
  const { document, documentId, sourceHash, sessionId } = validateDocument(input, journal, authority);
  const draft = validateDraft(input, baseDraft, replay, authority);
  const canonical = validateCanonical(input, authority, documentId, sourceHash, draft);
  const coordinates = coordinateSystem(input.coordinateSystemEvidence, document, canonical);
  const scope = commandScope(input, canonical);
  const initialState = createTopologyReplayState(baseDraft);
  const journalProjection = createTopologyScopedEditJournalProjection({ authorityId: authority.authorityId,
    journal, initialState });
  return immutableJson({ schema: TOPOLOGY_SCOPED_EDIT_READ_MODEL_V1, authorityId: authority.authorityId,
    documentId, sessionId, sourceHash, canonicalTopologyHash: canonical.canonicalTopologyHash,
    draftHash: draft.topologyEditDraftHash, journalHash: semanticHash(journal),
    replayHash: topologyReplayStateHash(replay), projectDocument: document, coordinateSystem: coordinates,
    canonicalTopology: canonical, baseDraft, editDraft: draft, commandJournal: journal,
    journalProjection, replayState: replay, attributeLedger: replay.attributeLedger, remarks: replay.remarks,
    commandScopeBasis: scope.basis, commandScopeInput: scope.input,
    selectionSnapshot: selectionSnapshot(input, authority.authorityId, canonical), authority,
  }, 'Topology scoped-edit read model');
}

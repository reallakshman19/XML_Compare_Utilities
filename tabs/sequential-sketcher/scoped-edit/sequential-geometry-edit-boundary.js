/** Branch-keyed geometry journal publication boundary layered after support authority. */
import {
  sameSequentialContractValue,
  sequentialSemanticFingerprint,
} from './sequential-command-contracts.js';
import { deriveSequentialEditAuthority } from './sequential-edit-authority.js';
import {
  assertSequentialGeometryEditJournal,
  createSequentialGeometryEditJournal,
  sequentialGeometryEditBaseFingerprint,
} from './sequential-geometry-edit-journal.js';
import {
  applySequentialGeometryEditJournalToScene,
  applySequentialGeometryEditJournalToTopology,
} from './sequential-geometry-edit-projection.js';
import { createSequentialEffectiveGeometryReadModel } from './sequential-effective-geometry-read-model.js';
import { createSequentialEditableTopologySnapshot } from './sequential-editable-topology-snapshot.js';
import { buildSequentialScopedEditEngineeringScene } from './sequential-scoped-edit-scene-adapter.js';

export const SEQUENTIAL_GEOMETRY_EDIT_BOUNDARY_SCHEMA =
  'SequentialGeometryEditBoundary.v1';
export const SEQUENTIAL_PREPARED_GEOMETRY_EDIT_CANDIDATE_SCHEMA =
  'SequentialPreparedGeometryEditCandidate.v1';
export const SEQUENTIAL_PREPARED_GEOMETRY_MOVE_CANDIDATE_SCHEMA =
  'SequentialPreparedGeometryMoveCandidate.v1';

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function branchId(view) { return String(view?.readModel?.branchId || '').trim(); }
function wrappedOwner(ownerSnapshot, journal) {
  if (!ownerSnapshot?.revision) return ownerSnapshot || null;
  return Object.freeze({
    ...ownerSnapshot,
    revision: Object.freeze({
      schema: 'SequentialGeometryEditOwnerRevision.v1',
      ownerRevision: ownerSnapshot.revision,
      geometryEditJournalHeadFingerprint: journal.headFingerprint,
    }),
  });
}
function baseSnapshot(view) {
  if (!view?.readModel || !view?.scene) {
    throw new RangeError('Geometry edit boundary requires a current base read view.');
  }
  return createSequentialEditableTopologySnapshot(view.readModel);
}
function createJournal(snapshot) {
  return createSequentialGeometryEditJournal({
    branchId: snapshot.branch.branchId,
    confirmedConstructionFingerprint: snapshot.authority.confirmedConstructionFingerprint,
    baseFingerprint: sequentialGeometryEditBaseFingerprint(snapshot),
  });
}
function effectiveView(view, journal) {
  const readModel = createSequentialEffectiveGeometryReadModel(view.readModel, journal);
  return Object.freeze({
    baseReadModel: view.readModel, baseScene: view.scene, readModel,
    scene: buildSequentialScopedEditEngineeringScene(readModel),
    geometryEditJournal: journal,
  });
}
function candidateEvidence(view, journal) {
  const snapshot = baseSnapshot(view);
  const readModel = createSequentialEffectiveGeometryReadModel(view.readModel, journal);
  const scene = applySequentialGeometryEditJournalToScene(view.scene, journal, {
    revision: readModel.revision, sceneId: readModel.sceneId,
  });
  const topology = applySequentialGeometryEditJournalToTopology(snapshot, journal);
  return Object.freeze({
    readModel, scene, topology,
    sceneFingerprint: sequentialSemanticFingerprint('SSKGEOMETRYSCENE', scene),
    topologyFingerprint: topology.effectiveGeometryFingerprint,
  });
}
function currentJournal(runtime, view = runtime.readBaseView()) {
  if (runtime.destroyed) throw new Error('Geometry edit boundary is destroyed.');
  const snapshot = baseSnapshot(view);
  const id = branchId(view);
  if (!id) throw new RangeError('Geometry edit boundary requires a current branch.');
  const stored = runtime.byBranch.get(id);
  if (!stored) return resetJournal(runtime, id, snapshot);
  try { return assertSequentialGeometryEditJournal(stored, snapshot); } catch (error) {
    if (stored.entries.length) throw error;
    return resetJournal(runtime, id, snapshot);
  }
}
function resetJournal(runtime, id, snapshot) {
  const journal = createJournal(snapshot);
  runtime.byBranch.set(id, journal);
  runtime.consumedByBranch.set(id, new Set());
  return journal;
}
function readView(runtime) {
  const view = runtime.readBaseView();
  return effectiveView(view, currentJournal(runtime, view));
}
function readCurrentState(runtime) {
  const base = runtime.readBaseState();
  const view = runtime.readBaseView();
  const journal = currentJournal(runtime, view);
  return { ...base, geometryEditJournal: journal,
    ownerSnapshot: wrappedOwner(base.ownerSnapshot, journal) };
}
function publicationAuthority(runtime, input) {
  const state = readCurrentState(runtime);
  const authority = deriveSequentialEditAuthority(state);
  if (!sameSequentialContractValue(authority, input.expectedAuthority)) {
    throw new RangeError('Prepared geometry edit is stale against current edit authority.');
  }
  const view = runtime.readBaseView();
  return Object.freeze({ state, authority, view, journal: currentJournal(runtime, view) });
}
function candidateSchema(value) {
  return value === SEQUENTIAL_PREPARED_GEOMETRY_EDIT_CANDIDATE_SCHEMA
    || value === SEQUENTIAL_PREPARED_GEOMETRY_MOVE_CANDIDATE_SCHEMA;
}
function validateCandidate(current, candidate) {
  if (!candidateSchema(candidate?.schema)) {
    throw new TypeError('Geometry publication requires a prepared geometry-edit candidate.');
  }
  if (candidate.expectedJournalHeadFingerprint !== current.journal.headFingerprint) {
    throw new RangeError('Prepared geometry journal head is stale.');
  }
  const journal = assertSequentialGeometryEditJournal(candidate.journal, baseSnapshot(current.view));
  const entry = journal.entries.at(-1);
  if (!entry || !sameSequentialContractValue(entry, candidate.entry)) {
    throw new RangeError('Prepared geometry entry is not the canonical journal tail.');
  }
  const evidence = candidateEvidence(current.view, journal);
  if (candidate.effectiveReadAuthorityId !== evidence.readModel.authorityId
    || candidate.effectiveSceneFingerprint !== evidence.sceneFingerprint
    || candidate.effectiveTopologyFingerprint !== evidence.topologyFingerprint) {
    throw new RangeError('Prepared effective geometry differs from deterministic regeneration.');
  }
  return Object.freeze({ journal, entry, evidence });
}
function commonPublication(current, preparedId, validated) {
  return {
    committed: true, preparedId,
    entryId: validated.entry.entryId,
    operationId: validated.entry.operationId,
    componentId: validated.entry.componentId,
    expectedAuthorityId: current.authority.authorityId,
    journalHeadFingerprint: validated.journal.headFingerprint,
    effectiveReadAuthorityId: validated.evidence.readModel.authorityId,
    effectiveSceneFingerprint: validated.evidence.sceneFingerprint,
    effectiveTopologyFingerprint: validated.evidence.topologyFingerprint,
  };
}
function publicationRecord(current, preparedId, validated) {
  const common = commonPublication(current, preparedId, validated);
  if (validated.entry.type !== 'STRETCH_NODE') {
    return Object.freeze({ schema: 'SequentialGeometryMovePublication.v1', ...common });
  }
  return Object.freeze({
    schema: 'SequentialNodeStretchPublication.v1', ...common,
    type: validated.entry.type, nodeId: validated.entry.nodeId,
    affectedComponentIds: validated.entry.affectedComponentIds,
  });
}
function publishCandidate(runtime, input = {}) {
  if (runtime.destroyed) throw new Error('Geometry edit boundary is destroyed.');
  const current = publicationAuthority(runtime, input);
  const id = current.authority.branchId;
  const consumed = runtime.consumedByBranch.get(id) || new Set();
  if (consumed.has(input.preparedId)) {
    throw new RangeError('Prepared geometry edit has already been consumed.');
  }
  const validated = validateCandidate(current, input.candidate);
  runtime.byBranch.set(id, validated.journal);
  consumed.add(input.preparedId);
  runtime.consumedByBranch.set(id, consumed);
  const publication = publicationRecord(current, input.preparedId, validated);
  runtime.onPublished(publication);
  return publication;
}
function boundaryState(runtime) {
  return Object.freeze({
    branchCount: runtime.byBranch.size,
    branches: Object.freeze([...runtime.byBranch.entries()].map(([id, journal]) => Object.freeze({
      branchId: id, entryCount: journal.entries.length,
      journalHeadFingerprint: journal.headFingerprint,
      consumedPreparedCount: runtime.consumedByBranch.get(id)?.size || 0,
    }))),
    destroyed: runtime.destroyed,
  });
}
function destroyBoundary(runtime) {
  if (runtime.destroyed) return false;
  runtime.destroyed = true; runtime.byBranch.clear(); runtime.consumedByBranch.clear();
  return true;
}

export function createSequentialGeometryEditBoundary(options = {}) {
  const runtime = {
    readBaseState: requiredFunction(options.readBaseState, 'readBaseState'),
    readBaseView: requiredFunction(options.readBaseView, 'readBaseView'),
    onPublished: requiredFunction(options.onPublished, 'onPublished'),
    byBranch: new Map(), consumedByBranch: new Map(), destroyed: false,
  };
  return Object.freeze({
    schema: SEQUENTIAL_GEOMETRY_EDIT_BOUNDARY_SCHEMA,
    readCurrentState: () => readCurrentState(runtime),
    readJournal: () => currentJournal(runtime, runtime.readBaseView()),
    readView: () => readView(runtime),
    publishCandidate: (input) => publishCandidate(runtime, input),
    getState: () => boundaryState(runtime),
    destroy: () => destroyBoundary(runtime),
  });
}

export const _test = Object.freeze({ candidateEvidence, effectiveView, validateCandidate });

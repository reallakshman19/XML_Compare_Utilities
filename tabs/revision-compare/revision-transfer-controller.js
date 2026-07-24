/** Explicit transfer selection, lifecycle orchestration and retained-artifact downloads. */
import { deepFreeze } from './revision-contract-utils.js';
import { sha256Text } from './revision-hash.js';
import {
  findRevisionCompareEntity, findRevisionCompareEntityForEvidencePath,
  revisionCompareRelativeFieldPath,
} from './revision-transfer-address.js';
import { createRevisionCompareTransferSelection } from './revision-transfer-contracts.js';
import { classifyRevisionCompareTransferField } from './revision-transfer-policy.js';

const ARTIFACT_INDEX = Object.freeze({ patched: 0, audit: 1, proof: 2, manifest: 3 });
const ARTIFACT_SCHEMA = 'RevisionCompareTransferArtifact.v1';

function unique(values, label, blockers) {
  if (!values.length) blockers.push(`${label} resolves to zero records.`);
  if (values.length > 1) blockers.push(`${label} resolves to multiple records.`);
  return values.length === 1 ? values[0] : null;
}
function reviewItem(state, differenceId, blockers) {
  const item = unique((state?.review?.session?.items ?? []).filter((entry) => entry.differenceId === differenceId), `Review item ${differenceId}`, blockers);
  if (item && item.reviewState !== 'REVIEWED') blockers.push(`Review item ${differenceId} is ${item.reviewState}; only REVIEWED items are transferable.`);
  return item;
}
function targetRelationship(state, row, blockers) {
  if (row?.targetRecordId) return { targetRecordId: row.targetRecordId, targetDifferenceId: row.differenceId, decisionState: 'NOT_REQUIRED' };
  if (row?.matchCertainty !== 'AMBIGUOUS') { blockers.push('The audited source row has no target relationship.'); return null; }
  const decision = unique((state?.decision?.ledger?.decisions ?? []).filter((entry) => entry.differenceId === row.differenceId), `Decision ${row.differenceId}`, blockers);
  if (!decision) return null;
  if (decision.decisionState !== 'ACCEPTED_CANDIDATE') blockers.push(`Ambiguity decision ${row.differenceId} is ${decision.decisionState}; ACCEPTED_CANDIDATE is required.`);
  const target = unique((state?.compare?.audit?.differenceRows ?? []).filter((entry) => entry.differenceId === decision.acceptedTargetDifferenceId && entry.targetRecordId === decision.acceptedTargetRecordId), `Accepted target ${decision.acceptedTargetDifferenceId}`, blockers);
  return target ? { targetRecordId: target.targetRecordId, targetDifferenceId: target.differenceId, decisionState: decision.decisionState } : null;
}
function globalBlockers(state) {
  const blockers = [];
  if (state?.basisStatus !== 'CURRENT') blockers.push('A CURRENT comparison basis is required.');
  if (state?.compare?.audit?.validation?.status !== 'READY') blockers.push('A READY comparison audit is required.');
  if (state?.review?.session?.status !== 'CURRENT') blockers.push('A CURRENT review session is required.');
  if (state?.decision?.ledger?.status !== 'CURRENT') blockers.push('A CURRENT ambiguity-decision ledger is required.');
  if (!state?.slots?.baseline?.jsonSnapshot || !state?.slots?.candidate?.jsonSnapshot) blockers.push('Lossless Rev A and Rev B snapshots are required.');
  return blockers;
}
function targetFieldPath(state, row, target, property, blockers) {
  const revA = state?.slots?.baseline?.jsonSnapshot; const revB = state?.slots?.candidate?.jsonSnapshot;
  let targetEntity;
  try { targetEntity = findRevisionCompareEntity(revB, target.targetRecordId); }
  catch (error) { blockers.push(error.message); return null; }
  try {
    const source = findRevisionCompareEntityForEvidencePath(revA, row.sourceRecordId, property.revAEvidencePath);
    const sourcePath = revisionCompareRelativeFieldPath(source.canonicalPath, property.revAEvidencePath);
    if (!property.revBEvidencePath) return sourcePath;
    const owner = findRevisionCompareEntityForEvidencePath(revB, target.targetRecordId, property.revBEvidencePath);
    if (owner.canonicalPath !== targetEntity.canonicalPath) blockers.push('Rev B evidence path does not belong to the selected target entity.');
    return revisionCompareRelativeFieldPath(owner.canonicalPath, property.revBEvidencePath);
  } catch (error) { blockers.push(error.message); return null; }
}
function fieldCandidate(state, row, target, property, pairBlockers) {
  const blockers = [...pairBlockers];
  const path = targetFieldPath(state, row, target, property, blockers) ?? '';
  const policy = classifyRevisionCompareTransferField({ propertyKey: property.propertyKey, fieldPath: path });
  blockers.push(...policy.blockers);
  const field = {
    fieldKey: `${encodeURIComponent(property.propertyKey)}|${encodeURIComponent(path)}`, propertyKey: property.propertyKey,
    revAEvidencePath: property.revAEvidencePath, revBEvidencePath: property.revBEvidencePath ?? null,
    targetFieldPath: path, sourceValue: property.revAValue,
    targetState: property.revBEvidencePath ? 'PRESENT' : 'ABSENT', policy,
    eligible: blockers.length === 0, blockers: Object.freeze([...new Set(blockers)]),
  };
  if (property.revBEvidencePath) field.targetValue = property.revBValue;
  return deepFreeze(field);
}
function pairCandidate(state, row, sharedBlockers) {
  const blockers = [...sharedBlockers]; reviewItem(state, row.differenceId, blockers);
  const target = targetRelationship(state, row, blockers);
  if (target?.targetDifferenceId !== row.differenceId) reviewItem(state, target?.targetDifferenceId, blockers);
  if (!row.sourceRecordId) blockers.push('A stable Rev A source record identity is required.');
  const fields = target ? (row.changedProperties ?? []).map((property) => fieldCandidate(state, row, target, property, blockers)) : [];
  if (!fields.length) blockers.push('No changed-property evidence is available for transfer selection.');
  return deepFreeze({
    differenceId: row.differenceId, sourceRecordId: row.sourceRecordId ?? null,
    targetRecordId: target?.targetRecordId ?? null, targetDifferenceId: target?.targetDifferenceId ?? null,
    decisionState: target?.decisionState ?? 'UNRESOLVED', matchCertainty: row.matchCertainty,
    fields: Object.freeze(fields), eligible: blockers.length === 0 && fields.some((field) => field.eligible),
    blockers: Object.freeze([...new Set(blockers)]),
  });
}
export function deriveRevisionCompareTransferCandidates(state) {
  const shared = globalBlockers(state);
  const rows = (state?.compare?.audit?.differenceRows ?? []).filter((row) => row.sourceRecordId && row.differenceCategory !== 'UNCHANGED');
  return Object.freeze(rows.map((row) => pairCandidate(state, row, shared)).sort((a, b) => a.differenceId.localeCompare(b.differenceId)));
}
export function createRevisionCompareTransferDraft() { return deepFreeze({ revision: 0, pairs: Object.freeze([]) }); }
function pairMap(draft) { return new Map((draft?.pairs ?? []).map((pair) => [pair.differenceId, { differenceId: pair.differenceId, fieldKeys: [...pair.fieldKeys] }])); }
function frozenDraft(revision, pairs) {
  const values = [...pairs.values()].map((pair) => deepFreeze({ differenceId: pair.differenceId, fieldKeys: Object.freeze([...new Set(pair.fieldKeys)].sort()) })).sort((a, b) => a.differenceId.localeCompare(b.differenceId));
  return deepFreeze({ revision, pairs: Object.freeze(values) });
}
export function updateRevisionCompareTransferDraft(draft, candidates, change) {
  const candidate = candidates.find((item) => item.differenceId === change.differenceId); const pairs = pairMap(draft);
  if (change.kind === 'PAIR') {
    if (change.checked && candidate?.eligible) pairs.set(change.differenceId, { differenceId: change.differenceId, fieldKeys: [] });
    else pairs.delete(change.differenceId);
  } else if (change.kind === 'FIELD') {
    const pair = pairs.get(change.differenceId); const field = candidate?.fields.find((item) => item.fieldKey === change.fieldKey);
    if (!pair || !field?.eligible) return draft;
    pair.fieldKeys = change.checked ? [...pair.fieldKeys, change.fieldKey] : pair.fieldKeys.filter((key) => key !== change.fieldKey);
  }
  const next = frozenDraft((draft?.revision ?? 0) + 1, pairs);
  return JSON.stringify(next.pairs) === JSON.stringify(draft?.pairs ?? []) ? draft : next;
}
export function reconcileRevisionCompareTransferDraft(draft, candidates) {
  const pairs = new Map();
  for (const pair of draft?.pairs ?? []) {
    const candidate = candidates.find((item) => item.differenceId === pair.differenceId); if (!candidate?.eligible) continue;
    const allowed = new Set(candidate.fields.filter((field) => field.eligible).map((field) => field.fieldKey));
    pairs.set(pair.differenceId, { differenceId: pair.differenceId, fieldKeys: pair.fieldKeys.filter((key) => allowed.has(key)) });
  }
  return frozenDraft(draft?.revision ?? 0, pairs);
}
export function revisionCompareTransferDraftCounts(draft) {
  return deepFreeze({ pairCount: draft?.pairs?.length ?? 0, fieldCount: (draft?.pairs ?? []).reduce((sum, pair) => sum + pair.fieldKeys.length, 0) });
}
export function createRevisionCompareTransferSelectionFromDraft(draft, candidates) {
  const items = [];
  for (const pair of draft?.pairs ?? []) {
    const candidate = candidates.find((item) => item.differenceId === pair.differenceId); if (!candidate) continue;
    const fields = pair.fieldKeys.map((key) => candidate.fields.find((field) => field.fieldKey === key)).filter((field) => field?.eligible);
    if (fields.length) items.push({ differenceId: candidate.differenceId, sourceRecordId: candidate.sourceRecordId, targetRecordId: candidate.targetRecordId,
      fields: fields.map((field) => ({ propertyKey: field.propertyKey, revAEvidencePath: field.revAEvidencePath, revBEvidencePath: field.revBEvidencePath, targetFieldPath: field.targetFieldPath })) });
  }
  return items.length ? createRevisionCompareTransferSelection({ selectionRevision: draft.revision, items }) : null;
}
function artifactFor(state, kind) { return state?.transfer?.artifacts?.[ARTIFACT_INDEX[kind]] ?? null; }
export async function validateRevisionCompareTransferArtifact(artifact, cryptoRef) {
  if (artifact?.descriptorSchema !== ARTIFACT_SCHEMA) throw new TypeError('A retained RevisionCompareTransferArtifact.v1 descriptor is required.');
  const hash = await sha256Text(artifact.text, cryptoRef); if (hash !== artifact.contentSha256) throw new Error('Transfer artifact text SHA-256 does not match its retained descriptor.');
  const size = new TextEncoder().encode(artifact.text).byteLength; if (size !== artifact.sizeBytes) throw new Error('Transfer artifact byte length does not match its retained descriptor.');
  return artifact;
}
export async function downloadRevisionCompareTransferArtifact(root, artifact, options = {}) {
  const cryptoRef = options.cryptoRef ?? root.ownerDocument.defaultView.crypto; await validateRevisionCompareTransferArtifact(artifact, cryptoRef);
  const windowRef = root.ownerDocument.defaultView; const URLRef = options.URLRef ?? windowRef.URL; const BlobRef = options.BlobRef ?? windowRef.Blob;
  const url = URLRef.createObjectURL(new BlobRef([artifact.text], { type: artifact.mimeType }));
  const anchor = root.ownerDocument.createElement('a'); anchor.href = url; anchor.download = artifact.filename;
  try { root.appendChild(anchor); anchor.click(); } finally { anchor.remove(); URLRef.revokeObjectURL(url); }
  return artifact;
}
export function createRevisionCompareTransferController(options) {
  let draft = createRevisionCompareTransferDraft(); let destroyed = false; const deps = options.dependencies;
  function model() { const candidates = deriveRevisionCompareTransferCandidates(options.readState()); draft = reconcileRevisionCompareTransferDraft(draft, candidates); return deepFreeze({ candidates, draft, counts: revisionCompareTransferDraftCounts(draft) }); }
  function commit(next) { if (destroyed) return; options.writeState(next); options.render(next); }
  function handleChange(target) {
    const pair = target.dataset.revcTransferPair; const field = target.dataset.revcTransferField;
    if (!pair && !field) return;
    const current = model(); draft = updateRevisionCompareTransferDraft(draft, current.candidates, pair
      ? { kind: 'PAIR', differenceId: pair, checked: target.checked }
      : { kind: 'FIELD', differenceId: target.dataset.revcTransferDifferenceId, fieldKey: field, checked: target.checked });
    const selection = createRevisionCompareTransferSelectionFromDraft(draft, current.candidates);
    commit(deps.setSelection(options.readState(), selection));
  }
  async function createPlan() {
    const current = model(); const selection = createRevisionCompareTransferSelectionFromDraft(draft, current.candidates);
    if (!selection) throw new Error('Select at least one eligible pair and field before creating a transfer plan.');
    const captured = options.readState(); const started = deps.startPlan(captured, selection); const generation = started.transfer.requestGeneration; commit(started);
    try { const plan = await deps.createPlan(captured, selection, { cryptoRef: options.cryptoRef }); commit(deps.completePlan(options.readState(), generation, plan)); options.showToast?.('Transfer plan created.', 'success'); }
    catch (error) { commit(deps.failPlan(options.readState(), generation, error)); throw error; }
  }
  async function apply() {
    const createdAt = options.now(); const started = deps.startApply(options.readState(), createdAt);
    if (started === options.readState()) return; const generation = started.transfer.applyGeneration; commit(started);
    try { const application = await deps.createApplication(started, { createdAt, cryptoRef: options.cryptoRef }); commit(deps.completeApply(options.readState(), generation, application)); options.showToast?.('Transfer applied to a cloned Rev B target.', 'success'); }
    catch (error) { commit(deps.failApply(options.readState(), generation, error)); throw error; }
  }
  async function download(kind) {
    const state = options.readState(); if (state.transfer.status !== 'APPLIED') throw new Error('Only a current APPLIED transfer exposes downloadable artifacts.');
    return downloadRevisionCompareTransferArtifact(options.root, artifactFor(state, kind), { cryptoRef: options.cryptoRef });
  }
  async function handleClick(button) {
    try {
      if (button.hasAttribute('data-revc-create-transfer-plan')) await createPlan();
      else if (button.hasAttribute('data-revc-apply-transfer')) await apply();
      else for (const [kind, selector] of Object.entries({ patched: 'data-revc-download-patched-json', audit: 'data-revc-download-transfer-audit', proof: 'data-revc-download-transfer-proof', manifest: 'data-revc-download-transfer-manifest' })) if (button.hasAttribute(selector)) await download(kind);
    } catch (error) { options.reportFailure(error); }
  }
  return Object.freeze({ model, handleChange, handleClick, destroy: () => { destroyed = true; draft = createRevisionCompareTransferDraft(); } });
}

export const _test = Object.freeze({ artifactFor, fieldCandidate, globalBlockers, targetRelationship });

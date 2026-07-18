/** RC-001 actions: load, refine scope, approve basis, and download manifests. */

import { createRevisionComparisonBasis } from './revision-comparison-basis.js';
import { createRevisionSessionManifest, createRevisionScopeManifest } from './revision-manifests.js';
import { revisionComparisonPreflight } from './revision-preflight.js';
import { createRevisionScopeProposal, updateScopeDecision, updateScopeGroup } from './revision-scope-proposal.js';
import { RevisionRequestSupersededError } from './revision-load-service.js';
import {
  failWorkspaceLoad, finishWorkspaceLoad, finishWorkspaceScope, resetWorkspaceSlot,
  setWorkspaceBasis, setWorkspaceMessage, setWorkspaceProposal, setWorkspaceSearch, startWorkspaceLoad,
} from './revision-workspace-state.js';

function labelFor(slotId) { return slotId === 'baseline' ? 'Rev A' : 'Rev B'; }
function preflight(context, state) { return revisionComparisonPreflight(state.slots.baseline, state.slots.candidate, state.proposal); }
function commit(context, state) { context.writeState(state); context.render(state); return state; }

export function createRevisionActionAuthority() {
  let revision = 0;
  return Object.freeze({
    invalidate: () => { revision += 1; return revision; },
    capture: () => revision,
    isCurrent: (token) => token === revision,
  });
}

function commitAuthoritative(context, state) {
  context.authority.invalidate();
  return commit(context, state);
}

async function proposalFor(context, state, decisions) {
  if (!state.slots.baseline.document || !state.slots.candidate.document) return null;
  return createRevisionScopeProposal(state.slots.baseline, state.slots.candidate, decisions, context.cryptoRef);
}

function report(context, error) {
  const message = error?.message || String(error);
  const live = context.root.querySelector('[data-revc-live]');
  if (live) live.textContent = message;
  context.options?.showToast?.(message, 'error');
}

async function refreshProposal(context, decisions) {
  const token = context.authority.capture();
  const proposal = await proposalFor(context, context.readState(), decisions);
  if (!context.authority.isCurrent(token)) return false;
  commitAuthoritative(context, setWorkspaceProposal(context.readState(), proposal, decisions));
  return true;
}

async function loadRevision(context, slotId, file) {
  const generation = context.service.begin(slotId);
  commitAuthoritative(context, startWorkspaceLoad(context.readState(), slotId, generation, file.name, file.size, context.now()));
  try {
    const result = await context.service.loadFile(slotId, file, context.now(), generation);
    const loaded = finishWorkspaceLoad(context.readState(), slotId, result, context.now());
    if (loaded === context.readState()) return;
    commitAuthoritative(context, loaded);
    await refreshProposal(context, {});
    context.options?.showToast?.(`${labelFor(slotId)} loaded.`, 'success');
  } catch (error) {
    if (error instanceof RevisionRequestSupersededError) return;
    const failed = failWorkspaceLoad(context.readState(), slotId, generation, error);
    if (failed !== context.readState()) commitAuthoritative(context, failed);
    report(context, error);
  }
}

async function cancelRevision(context, slotId) {
  const token = context.authority.invalidate();
  try {
    const generation = await context.service.cancel(slotId);
    if (!context.authority.isCurrent(token)) return;
    commitAuthoritative(context, resetWorkspaceSlot(context.readState(), slotId, generation, context.now()));
  } catch (error) { report(context, error); }
}

async function refineScope(context, decisions) {
  const token = context.authority.invalidate();
  const proposal = await proposalFor(context, context.readState(), decisions);
  if (!context.authority.isCurrent(token)) return;
  commitAuthoritative(context, setWorkspaceProposal(context.readState(), proposal, decisions));
}

async function setBranch(context, branchId, included) {
  const decisions = updateScopeDecision(context.readState().scopeDecisions, branchId, !included);
  await refineScope(context, decisions);
}

async function setGroup(context, group, included) {
  const proposal = context.readState().proposal;
  if (!proposal) return;
  const groups = { common: proposal.commonBranches, revAOnly: proposal.revAOnlyBranches, revBOnly: proposal.revBOnlyBranches };
  const ids = (groups[group] ?? []).map((entry) => entry.branchId);
  await refineScope(context, updateScopeGroup(context.readState().scopeDecisions, ids, included));
}

function scopeDraft(proposal, side) {
  const selectedIds = side === 'A' ? proposal.includedBranchIdsA : proposal.includedBranchIdsB;
  return Object.freeze({ selectedIds, exclusions: proposal.excludedBranches });
}

async function approveBasis(context) {
  const token = context.authority.invalidate();
  const state = context.readState();
  const current = preflight(context, state);
  if (current.status !== 'READY') throw new Error(current.blockers[0] || 'Comparison basis is blocked.');
  const proposal = state.proposal;
  const [baseline, candidate] = await Promise.all([
    context.service.applyScope('baseline', { selectedIds: proposal.includedBranchIdsA }, context.now()),
    context.service.applyScope('candidate', { selectedIds: proposal.includedBranchIdsB }, context.now()),
  ]);
  if (!context.authority.isCurrent(token)) return;
  const scoped = finishWorkspaceScope(context.readState(), { baseline, candidate }, {
    baseline: scopeDraft(proposal, 'A'), candidate: scopeDraft(proposal, 'B'),
  }, context.now());
  commitAuthoritative(context, scoped);
  const basisToken = context.authority.capture();
  const basis = await createRevisionComparisonBasis({
    sessionId: scoped.session.sessionId, revA: scoped.slots.baseline, revB: scoped.slots.candidate,
    proposal, preflight: preflight(context, scoped),
  }, context.cryptoRef);
  if (!context.authority.isCurrent(basisToken)) return;
  commitAuthoritative(context, setWorkspaceBasis(context.readState(), basis));
  context.options?.showToast?.('Comparison basis approved.', 'success');
}

function safe(context, operation) {
  return async (...args) => { try { await operation(...args); } catch (error) { report(context, error); } };
}

function downloadSession(context) {
  const state = context.readState();
  context.downloadArtifact(context.root, `${state.session.sessionId}.session.json`, createRevisionSessionManifest(state, preflight(context, state)));
}

function downloadScope(context) {
  const state = context.readState();
  context.downloadArtifact(context.root, `${state.session.sessionId}.scope-basis.json`, createRevisionScopeManifest(state, preflight(context, state)));
}

/** Create user actions for the mounted RC-001 workspace. */
export function createRevisionActions(context) {
  const guarded = { ...context, authority: createRevisionActionAuthority() };
  return Object.freeze({
    load: (slotId, file) => loadRevision(guarded, slotId, file),
    cancel: (slotId) => cancelRevision(guarded, slotId),
    setBranchIncluded: safe(guarded, (id, included) => setBranch(guarded, id, included)),
    setGroupIncluded: safe(guarded, (group, included) => setGroup(guarded, group, included)),
    setSearch: (group, value) => commit(guarded, setWorkspaceSearch(guarded.readState(), group, value)),
    approveBasis: safe(guarded, () => approveBasis(guarded)),
    downloadSession: safe(guarded, () => downloadSession(guarded)),
    downloadScope: safe(guarded, () => downloadScope(guarded)),
    close: () => guarded.options?.close?.(),
    setMessage: (message) => commit(guarded, setWorkspaceMessage(guarded.readState(), message)),
  });
}

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

async function loadRevision(context, slotId, file) {
  const generation = context.service.begin(slotId);
  commit(context, startWorkspaceLoad(context.readState(), slotId, generation, file.name, file.size, context.now()));
  try {
    const result = await context.service.loadFile(slotId, file, context.now(), generation);
    let next = finishWorkspaceLoad(context.readState(), slotId, result, context.now());
    const proposal = await proposalFor(context, next, {});
    if (proposal) next = setWorkspaceProposal(next, proposal, {});
    commit(context, next);
    context.options?.showToast?.(`${labelFor(slotId)} loaded.`, 'success');
  } catch (error) {
    if (error instanceof RevisionRequestSupersededError) return;
    commit(context, failWorkspaceLoad(context.readState(), slotId, generation, error));
    report(context, error);
  }
}

async function cancelRevision(context, slotId) {
  try {
    const generation = await context.service.cancel(slotId);
    commit(context, resetWorkspaceSlot(context.readState(), slotId, generation, context.now()));
  } catch (error) { report(context, error); }
}

async function refineScope(context, decisions) {
  const state = context.readState();
  const proposal = await proposalFor(context, state, decisions);
  commit(context, setWorkspaceProposal(state, proposal, decisions));
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
  const state = context.readState();
  const current = preflight(context, state);
  if (current.status !== 'READY') throw new Error(current.blockers[0] || 'Comparison basis is blocked.');
  const proposal = state.proposal;
  const results = {
    baseline: await context.service.applyScope('baseline', { selectedIds: proposal.includedBranchIdsA }, context.now()),
    candidate: await context.service.applyScope('candidate', { selectedIds: proposal.includedBranchIdsB }, context.now()),
  };
  let next = finishWorkspaceScope(state, results, { baseline: scopeDraft(proposal, 'A'), candidate: scopeDraft(proposal, 'B') }, context.now());
  const basis = await createRevisionComparisonBasis({
    sessionId: next.session.sessionId, revA: next.slots.baseline, revB: next.slots.candidate,
    proposal, preflight: preflight(context, next),
  }, context.cryptoRef);
  next = setWorkspaceBasis(next, basis);
  commit(context, next);
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
  return Object.freeze({
    load: (slotId, file) => loadRevision(context, slotId, file),
    cancel: (slotId) => cancelRevision(context, slotId),
    setBranchIncluded: safe(context, (id, included) => setBranch(context, id, included)),
    setGroupIncluded: safe(context, (group, included) => setGroup(context, group, included)),
    setSearch: (group, value) => commit(context, setWorkspaceSearch(context.readState(), group, value)),
    approveBasis: safe(context, () => approveBasis(context)),
    downloadSession: safe(context, () => downloadSession(context)),
    downloadScope: safe(context, () => downloadScope(context)),
    close: () => context.options?.close?.(),
    setMessage: (message) => commit(context, setWorkspaceMessage(context.readState(), message)),
  });
}

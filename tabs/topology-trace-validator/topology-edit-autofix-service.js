/** Edit Draft commit services for reviewed and safe automatic topology fixes. */

import { planSafeTopologyAutoFixes, topologyGeometryHash } from './topology-checker-auto-fix.js';

export async function applyReviewedTopologyFixes(input) {
  const selected = input.selectedSuggestions;
  if (!Array.isArray(selected) || !selected.length) throw new Error('At least one topology fix suggestion is required.');
  if (!input.approvedOnly && selected.length !== 1) throw new Error('Reviewed fixes must be applied one suggestion at a time.');
  const candidate = input.approvedOnly ? input.core.applyApprovedTopologyFixes(input.draft, selected)
    : input.core.applyTopologyFixSuggestion(input.draft, selected[0]);
  if (candidate === input.draft) throw new Error('No approved topology fixes passed their deterministic preconditions.');
  const built = await input.core.buildEditedComponentTopologyArtifacts(input.sourceText, candidate, input.options);
  const commands = candidate.commands.slice(input.draft.commands.length);
  const state = input.journalService.appendNativeBatch(commands, input.origin, input.uiState, input.origin.issuedAt);
  if (state.draft.topologyEditDraftHash !== candidate.topologyEditDraftHash) throw new Error('Autofix journal replay differs from validated candidate.');
  return Object.freeze({ state, built });
}

export async function applySafeTopologyAutoFixes(input) {
  const plan = await planSafeTopologyAutoFixes(input);
  if (!plan.run.committed) return Object.freeze({ ...plan, state: null, built: null });
  const built = await input.core.buildEditedComponentTopologyArtifacts(input.sourceText, plan.candidateDraft, input.options);
  if (topologyGeometryHash(built.canonicalTopology) !== plan.geometryHash) {
    throw new Error('Full Auto fix regeneration differs from safe preflight topology.');
  }
  const commands = plan.candidateDraft.commands.slice(input.draft.commands.length);
  const state = input.journalService.appendNativeBatch(commands, input.origin, input.uiState, input.origin.issuedAt);
  if (state.draft.topologyEditDraftHash !== plan.candidateDraft.topologyEditDraftHash) throw new Error('Auto fix journal replay differs from validated candidate.');
  const run = Object.freeze({ ...plan.run, afterTopologyHash: built.canonicalTopology.canonicalTopologyHash });
  return Object.freeze({ ...plan, run, state, built });
}

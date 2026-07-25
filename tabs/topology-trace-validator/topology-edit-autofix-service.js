/** Edit Draft commit services for provenance-bound reviewed and safe automatic fixes. */
import { planSafeTopologyAutoFixes, topologyGeometryHash } from './topology-checker-auto-fix.js';
import { TOPOLOGY_COMMAND_AUTHORITY_MODE } from './topology-scoped-edit-command-scope.js';
import { asArray } from './topology-validator-values.js';
function acceptedState(acceptance) { if (!acceptance.accepted) { const error = new Error(acceptance.message); error.code = acceptance.reasonCode; throw error; } return acceptance.state; }
function acceptBatch(input, commands, built, expectedDraftHash, authorityMode, evidence) {
  const current = input.journalService.currentAuthority();
  const grant = input.journalService.issueModelWideAuthority({ capability: input.authorityCapability,
    expectedAuthorityId: current.authorityId, authorityMode, nativeCommands: commands,
    canonical: input.canonical, evidence });
  const prepared = input.journalService.prepareNativeBatch({ expectedAuthorityId: current.authorityId,
    nativeCommands: commands, origin: input.origin, uiState: input.uiState,
    updatedAt: input.origin.issuedAt, expectedDraftHash, canonical: input.canonical,
    modelWideGrant: grant });
  const regeneration = input.journalService.certifyRegeneration(prepared, built);
  return acceptedState(input.journalService.acceptPrepared(prepared, regeneration));
}
export async function applyReviewedTopologyFixes(input) {
  const selected = input.selectedSuggestions;
  if (!Array.isArray(selected) || !selected.length) throw new Error('At least one topology fix suggestion is required.');
  if (!input.approvedOnly && selected.length !== 1) throw new Error('Reviewed fixes must be applied one suggestion at a time.');
  const candidate = input.approvedOnly ? input.core.applyApprovedTopologyFixes(input.draft, selected)
    : input.core.applyTopologyFixSuggestion(input.draft, selected[0]);
  if (candidate === input.draft) throw new Error('No approved topology fixes passed their deterministic preconditions.');
  const built = await input.core.buildEditedComponentTopologyArtifacts(input.sourceText, candidate, input.options);
  const commands = candidate.commands.slice(input.draft.commands.length);
  const state = acceptBatch(input, commands, built, candidate.topologyEditDraftHash,
    TOPOLOGY_COMMAND_AUTHORITY_MODE.MODEL_WIDE_REVIEWED_FIX,
    { selectedSuggestions: selected, approvedOnly: input.approvedOnly === true,
      approvalDisposition: input.approvedOnly ? 'AUTO_APPROVED' : 'USER_CONFIRMED' });
  return Object.freeze({ state, built });
}
export async function applySafeTopologyAutoFixes(input) {
  const plan = await planSafeTopologyAutoFixes(input);
  if (!plan.run.committed) return Object.freeze({ ...plan, state: null, built: null });
  const built = await input.core.buildEditedComponentTopologyArtifacts(input.sourceText, plan.candidateDraft, input.options);
  if (topologyGeometryHash(built.canonicalTopology) !== plan.geometryHash) throw new Error('Full Auto fix regeneration differs from safe preflight topology.');
  const commands = plan.candidateDraft.commands.slice(input.draft.commands.length);
  const state = acceptBatch(input, commands, built, plan.candidateDraft.topologyEditDraftHash,
    TOPOLOGY_COMMAND_AUTHORITY_MODE.MODEL_WIDE_SAFE_AUTOFIX, { plan });
  const run = Object.freeze({ ...plan.run, afterTopologyHash: built.canonicalTopology.canonicalTopologyHash });
  return Object.freeze({ ...plan, run, state, built });
}
export const _test = Object.freeze({ acceptBatch, countCommands: (value) => asArray(value).length });

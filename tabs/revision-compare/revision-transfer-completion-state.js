/** Immutable WorkspaceState lifecycle for patched-target completion evidence. */
import { assertJsonSafe, deepFreeze, stableStringify } from './revision-contract-utils.js';
import {
  REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA,
  revisionCompareTransferCompletionReadiness,
} from './revision-transfer-completion.js';
import { REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA } from './revision-transfer-handover.js';

export const REVISION_COMPARE_TRANSFER_COMPLETION_STATE_SCHEMA = 'RevisionCompareTransferCompletionState.v1';
export const REVISION_COMPARE_TRANSFER_COMPLETION_STATUS = Object.freeze({ IDLE: 'IDLE', READY: 'READY', CREATED: 'CREATED', STALE: 'STALE', FAILED: 'FAILED' });
function blank(status = 'IDLE') { return { schema: REVISION_COMPARE_TRANSFER_COMPLETION_STATE_SCHEMA, status, report: null, bundle: null, reportArtifact: null, bundleArtifact: null, sourceEvidencePackageId: null, sourceEvidencePackageContentSha256: null, sourcePlanId: null, sourcePlanContentSha256: null, sourceResultId: null, sourceResultContentSha256: null, sourcePatchedTargetSha256: null, error: null }; }
export function createRevisionCompareTransferCompletionState() { return deepFreeze(blank()); }
export function revisionCompareTransferCompletionStateForReadiness(workspace) { const current = workspace?.transferCompletion; if (current?.report) return current; const status = revisionCompareTransferCompletionReadiness(workspace).status === 'READY' ? 'READY' : 'IDLE'; return deepFreeze(blank(status)); }
export function completeRevisionCompareTransferCompletionState(application) {
  const report = application?.report; const bundle = application?.bundle;
  if (report?.schema !== REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA || bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA || !application?.reportArtifact || !application?.bundleArtifact) throw new TypeError('One complete transfer completion application is required.');
  const state = deepFreeze({ schema: REVISION_COMPARE_TRANSFER_COMPLETION_STATE_SCHEMA, status: 'CREATED', report, bundle, reportArtifact: application.reportArtifact, bundleArtifact: application.bundleArtifact, sourceEvidencePackageId: report.sourceEvidence.packageId, sourceEvidencePackageContentSha256: report.sourceEvidence.packageContentSha256, sourcePlanId: report.transferEvidence.planId, sourcePlanContentSha256: report.transferEvidence.planContentSha256, sourceResultId: report.transferEvidence.resultId, sourceResultContentSha256: report.transferEvidence.resultContentSha256, sourcePatchedTargetSha256: report.transferEvidence.patchedTargetSha256, error: null });
  assertJsonSafe(state, REVISION_COMPARE_TRANSFER_COMPLETION_STATE_SCHEMA); return state;
}
export function failRevisionCompareTransferCompletionState(error) { return deepFreeze({ ...blank('FAILED'), error: String(error?.message ?? error) }); }
export function staleRevisionCompareTransferCompletionState(state) { if (!state?.report || state.status === 'STALE') return state ?? createRevisionCompareTransferCompletionState(); return deepFreeze({ ...state, status: 'STALE', error: null }); }
export function captureRevisionCompareTransferCompletionAuthority(workspace) { const transfer = workspace?.transfer; return deepFreeze({ sessionId: workspace?.session?.sessionId ?? null, basisId: workspace?.basis?.basisId ?? null, auditId: workspace?.compare?.audit?.auditId ?? null, reviewSessionId: workspace?.review?.session?.reviewSessionId ?? null, reviewRevision: workspace?.review?.session?.revision ?? null, decisionLedgerId: workspace?.decision?.ledger?.ledgerId ?? null, decisionRevision: workspace?.decision?.ledger?.revision ?? null, selection: transfer?.selection ?? null, policyVersion: transfer?.policyVersion ?? null, planId: transfer?.plan?.planId ?? null, planContentSha256: transfer?.plan?.contentSha256 ?? null, resultId: transfer?.result?.resultId ?? null, resultContentSha256: transfer?.result?.contentSha256 ?? null, transferAuditContentSha256: transfer?.audit?.contentSha256 ?? null, transferProofContentSha256: transfer?.proof?.contentSha256 ?? null, transferManifestContentSha256: transfer?.manifest?.contentSha256 ?? null, artifactDescriptors: (transfer?.artifacts ?? []).map((item) => ({ filename: item.filename, contentSha256: item.contentSha256, sizeBytes: item.sizeBytes })), patchedTargetSha256: transfer?.patchedSnapshot?.sourceContentSha256 ?? null }); }
export function revisionCompareTransferCompletionAuthorityMatches(before, after) { return stableStringify(captureRevisionCompareTransferCompletionAuthority(before)) === stableStringify(captureRevisionCompareTransferCompletionAuthority(after)) && revisionCompareTransferCompletionReadiness(after).status === 'READY'; }
export const _test = Object.freeze({ blank });

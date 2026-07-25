/** Deterministic self-contained transfer handover bundle. */
import { assertJsonSafe, deepFreeze } from './revision-contract-utils.js';
import { canonicalRevisionCompareEvidenceValue } from './revision-evidence-package.js';
import { sha256Text } from './revision-hash.js';
import { REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA } from './revision-transfer-completion.js';

export const REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA = 'RevisionCompareTransferHandoverBundle.v1';
export const REVISION_COMPARE_TRANSFER_HANDOVER_ID_PREFIX = 'revision-transfer-handover:';
function copy(value, path) { return deepFreeze(canonicalRevisionCompareEvidenceValue(JSON.parse(JSON.stringify(value)), path)); }
export function revisionCompareTransferHandoverHashMaterial(value) { return copy({ schema: value?.schema, identity: value?.identity, payload: value?.payload, validation: value?.validation }, 'transferHandoverHashMaterial'); }
export async function createRevisionCompareTransferHandoverBundle(input, options = {}) {
  const cryptoRef = options.cryptoRef ?? globalThis.crypto; const workspace = input.workspace;
  if (input.report?.schema !== REVISION_COMPARE_TRANSFER_COMPLETION_REPORT_SCHEMA) throw new TypeError('A current RevisionCompareTransferCompletionReport.v1 is required.');
  const transfer = workspace?.transfer;
  if (!transfer?.plan || !transfer?.result || !transfer?.audit || !transfer?.proof || !transfer?.manifest || transfer?.artifacts?.length !== 4) throw new Error('Complete retained transfer evidence is required for handover.');
  const material = revisionCompareTransferHandoverHashMaterial({
    schema: REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA,
    identity: { sessionId: workspace.session.sessionId, evidencePackageId: input.evidencePackage.packageId, completionReportId: input.report.reportId, planId: transfer.plan.planId, resultId: transfer.result.resultId, originalTargetSha256: transfer.result.originalTargetSha256, patchedTargetSha256: transfer.result.patchedTargetSha256 },
    payload: { evidencePackage: input.evidencePackage, transferPlan: transfer.plan, transferResult: transfer.result, transferAudit: transfer.audit, transferProof: transfer.proof, transferManifest: transfer.manifest, transferArtifacts: transfer.artifacts, completionReport: input.report },
    validation: { status: 'READY', errors: [] },
  });
  const hash = await sha256Text(JSON.stringify(material), cryptoRef);
  const bundle = copy({ ...material, bundleId: `${REVISION_COMPARE_TRANSFER_HANDOVER_ID_PREFIX}${hash}`, contentSha256: hash }, REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA);
  assertJsonSafe(bundle, REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA); return bundle;
}
export async function validateRevisionCompareTransferHandoverBundleIdentity(bundle, cryptoRef = globalThis.crypto) { if (bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA} is required.`); const hash = await sha256Text(JSON.stringify(revisionCompareTransferHandoverHashMaterial(bundle)), cryptoRef); if (bundle.contentSha256 !== hash || bundle.bundleId !== `${REVISION_COMPARE_TRANSFER_HANDOVER_ID_PREFIX}${hash}`) throw new Error('Transfer handover bundle identity does not recompute.'); return bundle; }
export function serializeRevisionCompareTransferHandoverBundle(bundle) { if (bundle?.schema !== REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA) throw new TypeError(`A ${REVISION_COMPARE_TRANSFER_HANDOVER_BUNDLE_SCHEMA} is required.`); return `${JSON.stringify(canonicalRevisionCompareEvidenceValue(bundle), null, 2)}\n`; }
export function revisionCompareTransferHandoverFileName(sessionId, bundleId) { const safe = (value) => String(value ?? '').trim().replace(/[^A-Za-z0-9._-]/g, '_'); if (!safe(sessionId) || !safe(bundleId)) throw new TypeError('Session ID and bundle ID are required.'); return `${safe(sessionId)}.${safe(bundleId)}.json`; }
export const _test = Object.freeze({ copy });

/** Verify one archived RevisionCompareEvidencePackage.v1 without source replay. */
import { deepFreeze } from './revision-contract-utils.js';
import { validateRevisionComparisonBasis } from './revision-comparison-basis.js';
import {
  REVISION_COMPARE_EVIDENCE_PACKAGE_FIELDS,
  REVISION_COMPARE_EVIDENCE_PACKAGE_ID_PREFIX,
  REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA,
  canonicalRevisionCompareEvidenceValue,
  revisionCompareEvidencePackageHashMaterial,
} from './revision-evidence-package.js';
import { reattachVerifiedReviewRecord, verifyReviewSessionRecord } from './revision-review-manifest.js';
import { reattachVerifiedDecisionRecord, verifyDecisionEvidenceRecord } from './revision-decision-manifest.js';
import { sha256Text } from './revision-hash.js';
import { validateProjectDocument, validateProjectSession } from './revision-session-contracts.js';

export const REVISION_EVIDENCE_PACKAGE_IMPORT_RECEIPT_SCHEMA = 'RevisionEvidencePackageImportReceipt.v1';
export const REVISION_EVIDENCE_PACKAGE_AUTHENTICITY_STATEMENT = 'Integrity and authority-chain consistency verified. Package authenticity is not established.';
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const DECISION_PAYLOAD_KEY = ['decision', 'Ledger'].join('');
const DECISION_IDENTITY_KEY = `${DECISION_PAYLOAD_KEY}Id`;
const PAYLOAD_FIELDS = Object.freeze(['sessionManifest', 'scopeBasisManifest', 'audit', 'reviewSession', DECISION_PAYLOAD_KEY]);
const IDENTITY_FIELDS = Object.freeze(['sessionId', 'basisId', 'auditId', 'reviewSessionId', DECISION_IDENTITY_KEY, 'revADocumentId', 'revBDocumentId', 'engineVersion']);
const STATUS_FIELDS = Object.freeze(['basisStatus', 'auditValidationStatus', 'reviewStatus', 'decisionStatus']);

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, allowed, label) {
  if (!plainObject(value)) throw new TypeError(`${label} must be a plain JSON object.`);
  const actual = Object.keys(value).sort(); const expected = [...allowed].sort();
  if (actual.join('|') !== expected.join('|')) throw new TypeError(`${label} contains unsupported or missing fields.`);
}
function requireReady(receipt, label) {
  exactKeys(receipt, ['status', 'errors'], label);
  if (receipt.status !== 'READY' || !Array.isArray(receipt.errors) || receipt.errors.length) {
    throw new TypeError(`${label} must contain a READY validation receipt with no errors.`);
  }
}
function sameJson(left, right) {
  const canonicalLeft = canonicalRevisionCompareEvidenceValue(left, 'left');
  const canonicalRight = canonicalRevisionCompareEvidenceValue(right, 'right');
  return JSON.stringify(canonicalLeft) === JSON.stringify(canonicalRight);
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`);
}
function requiredSchema(value, schema, label) {
  if (value?.schema !== schema) throw new TypeError(`${label} schema must be ${schema}.`);
}

function verifyDocuments(sessionManifest, scopeManifest) {
  const session = sessionManifest.session; const revA = sessionManifest.revisions?.revA; const revB = sessionManifest.revisions?.revB;
  requiredSchema(session, 'ProjectSession.v1', 'Project session');
  const sessionErrors = validateProjectSession(session); if (sessionErrors.length) throw new TypeError(`Invalid ProjectSession.v1: ${sessionErrors.join(' ')}`);
  for (const [slot, intake, role] of [['baseline', revA, 'REFERENCE'], ['candidate', revB, 'CANDIDATE']]) {
    if (intake?.schema !== 'RevisionIntakeState.v1' || intake.slotId !== slot || intake.role !== role) throw new TypeError(`${slot} intake manifest is invalid.`);
    const errors = validateProjectDocument(intake.document); if (errors.length) throw new TypeError(`Invalid ${slot} ProjectDocument.v1: ${errors.join(' ')}`);
    if (intake.document.slotId !== slot || session.documents?.[slot]?.documentId !== intake.document.documentId) throw new TypeError(`${slot} document does not occupy its packaged session slot.`);
    if (!sameJson(session.documents[slot], intake.document)) throw new TypeError(`${slot} session document differs from its intake manifest.`);
  }
  const proposal = scopeManifest.proposal; const basis = scopeManifest.basis;
  if (proposal?.schema !== 'RevisionScopeProposal.v1' || proposal.validation?.status !== 'READY') throw new TypeError('Scope proposal must be a READY RevisionScopeProposal.v1.');
  if (proposal.revADocumentId !== revA.document.documentId || proposal.revBDocumentId !== revB.document.documentId) throw new TypeError('Scope proposal document identities do not match the packaged revisions.');
  return { session, revA, revB, proposal, basis };
}

function verifyBasis(manifests, documents) {
  const { sessionManifest, scopeManifest } = manifests; const { session, revA, revB, proposal, basis } = documents;
  requiredSchema(sessionManifest, 'RevisionSessionManifest.v1', 'Session manifest');
  requiredSchema(scopeManifest, 'RevisionScopeBasisManifest.v1', 'Scope/basis manifest');
  requiredSchema(basis, 'RevisionComparisonBasis.v1', 'Comparison basis');
  const errors = validateRevisionComparisonBasis(basis); if (errors.length) throw new TypeError(`Invalid RevisionComparisonBasis.v1: ${errors.join(' ')}`);
  if (sessionManifest.basisStatus !== 'CURRENT' || scopeManifest.basisStatus !== 'CURRENT') throw new TypeError('Packaged basis status must be CURRENT.');
  if (scopeManifest.sessionId !== session.sessionId || basis.sessionId !== session.sessionId) throw new TypeError('Session and basis identities do not reconcile.');
  if (sessionManifest.scopeProposalId !== proposal.proposalId || !sameJson(sessionManifest.scopeSummary, proposal.summary)) throw new TypeError('Session scope evidence does not match the scope proposal.');
  if (sessionManifest.basisId !== basis.basisId) throw new TypeError('Session manifest basis identity does not match the scope manifest.');
  if (basis.revADocumentId !== revA.document.documentId || basis.revBDocumentId !== revB.document.documentId) throw new TypeError('Basis document identities do not match the packaged revisions.');
  if (basis.revAContentHash !== revA.document.sourceHash || basis.revBContentHash !== revB.document.sourceHash) throw new TypeError('Basis source hashes do not match the packaged revisions.');
  if (basis.revAScopeIdentity !== revA.document.scopedHash || basis.revBScopeIdentity !== revB.document.scopedHash) throw new TypeError('Basis scope hashes do not match the packaged revisions.');
  if (!sameJson(basis.includedBranchesA, proposal.includedBranchIdsA) || !sameJson(basis.includedBranchesB, proposal.includedBranchIdsB)) throw new TypeError('Basis included branches do not match the packaged scope proposal.');
  if (!sameJson(sessionManifest.preflight, scopeManifest.preflight)) throw new TypeError('Packaged preflight evidence does not reconcile.');
}

function visualObjectIds(audit) {
  const models = audit.visualModels; if (!plainObject(models)) throw new TypeError('Audit visualModels must be a plain object.');
  const objects = [];
  for (const side of ['revA', 'revB']) {
    const model = models[side]; requiredSchema(model, 'VisualGeometryModel.v2', `${side} visual model`);
    if (!Array.isArray(model.segments) || !Array.isArray(model.markers)) throw new TypeError(`${side} visual primitives are invalid.`);
    objects.push(...model.segments.map((item) => item.objectId), ...model.markers.map((item) => item.objectId));
  }
  unique(objects, 'Audit visual object IDs'); return new Set(objects);
}
function expectedSummary(rows) {
  const count = (value) => rows.filter((row) => row.differenceCategory === value).length;
  return {
    unchanged: count('UNCHANGED'), changed: count('CHANGED'), added: count('ADDED'), removed: count('REMOVED'),
    needsDecision: rows.filter((row) => row.matchCertainty === 'AMBIGUOUS').length,
    exact: rows.filter((row) => row.matchCertainty === 'EXACT').length,
    inferred: rows.filter((row) => row.matchCertainty === 'INFERRED').length,
  };
}
function verifyAudit(audit, basis, revA, revB) {
  requiredSchema(audit, 'RevisionCompareAudit.v1', 'Comparison audit'); requireReady(audit.validation, 'Audit validation');
  if (audit.basisId !== basis.basisId || audit.revADocumentId !== revA.document.documentId || audit.revBDocumentId !== revB.document.documentId) throw new TypeError('Audit basis or document identities do not reconcile.');
  if (!String(audit.engineVersion ?? '').trim()) throw new TypeError('Audit engineVersion is required.');
  if (!Array.isArray(audit.differenceRows) || !Array.isArray(audit.candidateEvidence)) throw new TypeError('Audit rows and candidate evidence are required.');
  unique(audit.differenceRows.map((row) => row.differenceId), 'Audit difference IDs');
  unique(audit.candidateEvidence.map((item) => item.candidateEvidenceId), 'Audit candidate evidence IDs');
  const evidenceIds = new Set(audit.candidateEvidence.map((item) => item.candidateEvidenceId)); const objectIds = visualObjectIds(audit);
  for (const row of audit.differenceRows) {
    requiredSchema(row, 'RevisionDifferenceRow.v1', `Difference ${row?.differenceId}`);
    if (row.candidateEvidenceId && !evidenceIds.has(row.candidateEvidenceId)) throw new TypeError(`${row.differenceId} references missing candidate evidence.`);
    for (const objectId of Object.values(row.visualRefs ?? {})) if (objectId && !objectIds.has(objectId)) throw new TypeError(`${row.differenceId} references missing visual evidence.`);
  }
  const statusMap = audit.visualModels.statusByObjectId; if (!plainObject(statusMap)) throw new TypeError('Audit status map is invalid.');
  for (const objectId of Object.keys(statusMap)) if (!objectIds.has(objectId)) throw new TypeError(`Audit status map references unknown object ${objectId}.`);
  if (!sameJson(audit.summary, expectedSummary(audit.differenceRows))) throw new TypeError('Audit summary does not reconcile with difference rows.');
  if (audit.visualModels.revA.documentId !== revA.document.documentId || audit.visualModels.revB.documentId !== revB.document.documentId) throw new TypeError('Audit visual models do not match packaged documents.');
}

function verifyTopLevel(packageValue, documents) {
  const { session, basis } = documents; const audit = packageValue.payload.audit;
  const reviewSession = packageValue.payload.reviewSession; const decisionRecord = packageValue.payload[DECISION_PAYLOAD_KEY];
  exactKeys(packageValue.identity, IDENTITY_FIELDS, 'Package identity'); exactKeys(packageValue.authorityStatus, STATUS_FIELDS, 'Package authorityStatus');
  const expectedIdentity = {
    sessionId: session.sessionId, basisId: basis.basisId, auditId: audit.auditId,
    reviewSessionId: reviewSession.reviewSessionId, [DECISION_IDENTITY_KEY]: decisionRecord.ledgerId,
    revADocumentId: audit.revADocumentId, revBDocumentId: audit.revBDocumentId, engineVersion: audit.engineVersion,
  };
  if (!sameJson(packageValue.identity, expectedIdentity)) throw new TypeError('Package identity does not equal its nested authority identities.');
  const expectedStatus = { basisStatus: 'CURRENT', auditValidationStatus: 'READY', reviewStatus: reviewSession.status, decisionStatus: decisionRecord.status };
  if (!sameJson(packageValue.authorityStatus, expectedStatus)) throw new TypeError('Package authorityStatus does not equal its nested authority statuses.');
}

function liveIntake(manifest) {
  return deepFreeze({
    ...manifest,
    branchTree: Object.freeze([]), branchIndex: Object.freeze([]),
    scopeDraft: deepFreeze({ selectedIds: Object.freeze([]), exclusions: Object.freeze([]) }),
  });
}

export async function verifyRevisionCompareEvidencePackageJson(text, fileName, importedAt, cryptoRef) {
  let parsed; try { parsed = JSON.parse(String(text ?? '')); }
  catch (error) { throw new SyntaxError(`Evidence package JSON is invalid: ${error.message}`); }
  exactKeys(parsed, REVISION_COMPARE_EVIDENCE_PACKAGE_FIELDS, 'Evidence package');
  requiredSchema(parsed, REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA, 'Evidence package');
  exactKeys(parsed.payload, PAYLOAD_FIELDS, 'Evidence package payload'); requireReady(parsed.validation, 'Package validation');
  if (!HASH_PATTERN.test(parsed.contentSha256 ?? '')) throw new TypeError('contentSha256 must be a lowercase 64-character SHA-256.');
  if (parsed.packageId !== `${REVISION_COMPARE_EVIDENCE_PACKAGE_ID_PREFIX}${parsed.contentSha256}`) throw new TypeError('packageId does not match contentSha256.');
  const frozen = deepFreeze(canonicalRevisionCompareEvidenceValue(parsed, REVISION_COMPARE_EVIDENCE_PACKAGE_SCHEMA));
  const material = revisionCompareEvidencePackageHashMaterial(frozen);
  if (await sha256Text(JSON.stringify(material), cryptoRef) !== frozen.contentSha256) throw new TypeError('Evidence package canonical SHA-256 does not match contentSha256.');
  const manifests = { sessionManifest: frozen.payload.sessionManifest, scopeManifest: frozen.payload.scopeBasisManifest };
  const documents = verifyDocuments(manifests.sessionManifest, manifests.scopeManifest); verifyBasis(manifests, documents);
  const audit = frozen.payload.audit; verifyAudit(audit, documents.basis, documents.revA, documents.revB);
  await verifyReviewSessionRecord(frozen.payload.reviewSession, audit, cryptoRef);
  const archivedDecision = frozen.payload[DECISION_PAYLOAD_KEY];
  await verifyDecisionEvidenceRecord(archivedDecision, audit, cryptoRef); verifyTopLevel(frozen, documents);
  const reviewReattached = frozen.payload.reviewSession.status === 'STALE';
  const decisionReattached = archivedDecision.status === 'STALE';
  const reviewSession = reviewReattached ? reattachVerifiedReviewRecord(frozen.payload.reviewSession, audit, importedAt) : frozen.payload.reviewSession;
  const decisionRecord = decisionReattached ? reattachVerifiedDecisionRecord(archivedDecision, audit, importedAt) : archivedDecision;
  return deepFreeze({
    session: documents.session,
    slots: { baseline: liveIntake(documents.revA), candidate: liveIntake(documents.revB) },
    proposal: documents.proposal, basis: documents.basis, audit, reviewSession,
    [DECISION_PAYLOAD_KEY]: decisionRecord,
    receipt: {
      schema: REVISION_EVIDENCE_PACKAGE_IMPORT_RECEIPT_SCHEMA, fileName: String(fileName ?? ''),
      packageId: frozen.packageId, contentSha256: frozen.contentSha256, integrityStatus: 'VERIFIED',
      reviewReattached, decisionReattached, authenticityStatus: 'NOT_ESTABLISHED',
    },
  });
}

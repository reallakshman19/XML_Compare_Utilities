import assert from 'node:assert/strict';
import { buildBendReviewPackageManifest, serializeBendReviewPackageManifest } from '../workbench3d/ui/bend-review-package.js';
import {
  BEND_REVIEW_VERIFICATION_STATUS,
  bendReviewVerifierHtml,
  parseBendReviewPackageText,
  verificationResultHtml,
  verifyBendReviewPackage,
} from '../workbench3d/ui/bend-review-package-verifier.js';
import {
  BEND_REVIEW_VERIFICATION_RECEIPT_CONTRACT,
  buildBendReviewVerificationReceipt,
  serializeBendReviewVerificationReceipt,
} from '../workbench3d/ui/bend-review-verification-receipt.js';

const bendAudit = (signature) => ({
  contract: 'BendGeometryAudit.v1', signatureAlgorithm: 'stable-json-fnv1a32', signature,
  payload: { summaryConsistent: true, declaredSummary: { requested: 1, resolved: 1, blocked: 0, arcSegments: 12 } },
});
const visual = (signature) => ({ bendSummary: { requested: 1, resolved: 1, blocked: 0, arcSegments: 12 }, geometryDiagnostics: [], bendAudit: bendAudit(signature) });
const state = {
  sourceName: 'source.xml', targetName: 'target.xml', sourceXml: '<A/>', targetXml: '<B/>',
  graphs: { sourceSchema: 'INPUT_XML', targetSchema: 'INPUT_XML' }, config: { lengthToleranceMm: 6 },
  audit: { contract: 'CompareAudit.v1', compareKind: 'topology-edge', sourceObjectIds: ['source:E1'], targetObjectIds: ['target:E1'], objectDiff: { rows: [] }, conflictLedger: { rows: [] } },
  visuals: { A: visual('wb3d-bend-11111111'), B: visual('wb3d-bend-22222222') },
};
const imported = buildBendReviewPackageManifest(state);
const current = buildBendReviewPackageManifest(state);
const matching = verifyBendReviewPackage(imported, current);
assert.strictEqual(matching.status, BEND_REVIEW_VERIFICATION_STATUS.MATCH);
assert.strictEqual(verifyBendReviewPackage(imported, buildBendReviewPackageManifest({ ...state, sourceXml: '<A changed="1"/>' })).status, BEND_REVIEW_VERIFICATION_STATUS.STALE_INPUT);
assert.strictEqual(verifyBendReviewPackage(imported, buildBendReviewPackageManifest({ ...state, config: { lengthToleranceMm: 7 } })).status, BEND_REVIEW_VERIFICATION_STATUS.STALE_COMPARE);
assert.strictEqual(verifyBendReviewPackage(imported, buildBendReviewPackageManifest({ ...state, visuals: { ...state.visuals, B: visual('wb3d-bend-33333333') } })).status, BEND_REVIEW_VERIFICATION_STATUS.STALE_BEND_EVIDENCE);
assert.strictEqual(verifyBendReviewPackage({ ...imported, packageSignature: 'wb3d-review-00000000' }, imported).status, BEND_REVIEW_VERIFICATION_STATUS.INVALID_PACKAGE);
const parsed = parseBendReviewPackageText(serializeBendReviewPackageManifest(imported));
assert.strictEqual(parsed.ok, true);
assert.strictEqual(parsed.manifest.packageSignature, imported.packageSignature);
assert.strictEqual(parseBendReviewPackageText('{bad').ok, false);
assert.match(bendReviewVerifierHtml(imported), /wb3d-bend-review-verifier/);
assert.match(bendReviewVerifierHtml(imported), /data-current=/);

const receipt = buildBendReviewVerificationReceipt({ importedManifest: imported, currentManifest: current, verification: matching });
assert.strictEqual(receipt.contract, BEND_REVIEW_VERIFICATION_RECEIPT_CONTRACT);
assert.match(receipt.receiptSignature, /^wb3d-verify-[0-9a-f]{8}$/);
assert.strictEqual(receipt.payload.importedPackage.packageSignature, imported.packageSignature);
assert.strictEqual(receipt.payload.currentPackage.packageSignature, current.packageSignature);
assert.strictEqual(receipt.payload.verification.status, 'MATCH');
assert.strictEqual(receipt.payload.verification.differenceCount, 0);
assert.strictEqual(serializeBendReviewVerificationReceipt(receipt), serializeBendReviewVerificationReceipt(receipt));
assert.doesNotMatch(serializeBendReviewVerificationReceipt(receipt), /<A\/>|sourceXml|targetXml|"inputs"/);
assert.match(verificationResultHtml(matching, receipt), /Export verification receipt/);
assert.match(verificationResultHtml(matching, receipt), new RegExp(receipt.receiptSignature));

const stale = verifyBendReviewPackage(imported, buildBendReviewPackageManifest({ ...state, sourceXml: '<A changed="1"/>' }));
const staleReceipt = buildBendReviewVerificationReceipt({ importedManifest: imported, currentManifest: current, verification: stale });
assert.strictEqual(staleReceipt.payload.verification.differenceCount, stale.differences.length);
assert.notStrictEqual(staleReceipt.receiptSignature, receipt.receiptSignature);
console.log('workbench3d-bend-review-package-verifier.test.js passed');

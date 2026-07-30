/** Read-only import and verification for Workbench bend review packages. */

import {
  BEND_REVIEW_PACKAGE_AUTHORITY,
  BEND_REVIEW_PACKAGE_CONTRACT,
  BEND_REVIEW_PACKAGE_SIGNATURE_ALGORITHM,
  computeBendReviewPackageSignature,
  serializeBendReviewPackageManifest,
} from './bend-review-package.js';
import {
  buildBendReviewVerificationReceipt,
  serializeBendReviewVerificationReceipt,
} from './bend-review-verification-receipt.js';

export const BEND_REVIEW_VERIFICATION_STATUS = Object.freeze({
  MATCH: 'MATCH',
  STALE_INPUT: 'STALE_INPUT',
  STALE_COMPARE: 'STALE_COMPARE',
  STALE_BEND_EVIDENCE: 'STALE_BEND_EVIDENCE',
  INVALID_PACKAGE: 'INVALID_PACKAGE',
});

const MAX_IMPORT_CHARACTERS = 1_000_000;
const ELEMENT_NAME = 'wb3d-bend-review-verifier';

function text(value) { return String(value ?? '').trim(); }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function same(a, b) { return text(a) === text(b); }
function result(status, code, message, differences = []) {
  return Object.freeze({ status, code, message, differences: Object.freeze(differences) });
}
function difference(field, imported, current) {
  return Object.freeze({ field, imported: text(imported) || '—', current: text(current) || '—' });
}

export function parseBendReviewPackageText(value = '') {
  const source = String(value ?? '');
  if (!source.trim()) return Object.freeze({ ok: false, error: 'Package JSON is empty.' });
  if (source.length > MAX_IMPORT_CHARACTERS) {
    return Object.freeze({ ok: false, error: `Package JSON exceeds ${MAX_IMPORT_CHARACTERS} characters.` });
  }
  try {
    const manifest = JSON.parse(source);
    if (!object(manifest)) return Object.freeze({ ok: false, error: 'Package JSON must contain one object.' });
    return Object.freeze({ ok: true, manifest });
  } catch (error) {
    return Object.freeze({ ok: false, error: `Package JSON is invalid: ${error?.message || error}` });
  }
}

function validateImportedManifest(manifest) {
  if (!object(manifest)) return 'Package object is missing.';
  if (manifest.contract !== BEND_REVIEW_PACKAGE_CONTRACT) return `Unsupported package contract: ${text(manifest.contract) || 'missing'}.`;
  if (manifest.signatureAlgorithm !== BEND_REVIEW_PACKAGE_SIGNATURE_ALGORITHM) return `Unsupported signature algorithm: ${text(manifest.signatureAlgorithm) || 'missing'}.`;
  if (manifest.authority !== BEND_REVIEW_PACKAGE_AUTHORITY) return `Unexpected package authority: ${text(manifest.authority) || 'missing'}.`;
  if (manifest.deterministic !== true) return 'Package must declare deterministic=true.';
  if (!object(manifest.payload)) return 'Package payload is missing.';
  const expected = computeBendReviewPackageSignature(manifest.payload);
  if (manifest.packageSignature !== expected) return `Package signature mismatch; expected ${expected}.`;
  return '';
}

function inputDifferences(imported, current) {
  const rows = [];
  for (const [key, label] of [['source', 'Source'], ['target', 'Target']]) {
    const left = imported?.payload?.inputs?.[key] ?? {};
    const right = current?.payload?.inputs?.[key] ?? {};
    if (!same(left.contentSignature, right.contentSignature)) rows.push(difference(`${label} content`, left.contentSignature, right.contentSignature));
    if (!same(left.identitySignature, right.identitySignature)) rows.push(difference(`${label} file identity`, left.identitySignature, right.identitySignature));
  }
  return rows;
}

function compareDifferences(imported, current) {
  const left = imported?.payload?.comparison ?? {};
  const right = current?.payload?.comparison ?? {};
  const rows = [];
  for (const [field, label] of [
    ['contract', 'Compare contract'], ['compareKind', 'Compare kind'],
    ['settingsSignature', 'Compare settings'], ['runSignature', 'Comparison run'],
  ]) {
    if (!same(left[field], right[field])) rows.push(difference(label, left[field], right[field]));
  }
  if (Boolean(left.available) !== Boolean(right.available)) rows.push(difference('Compare availability', left.available, right.available));
  return rows;
}

function bendDifferences(imported, current) {
  const rows = [];
  for (const [key, label] of [['source', 'Source'], ['target', 'Target']]) {
    const left = imported?.payload?.bends?.[key] ?? {};
    const right = current?.payload?.bends?.[key] ?? {};
    if (Boolean(left.available) !== Boolean(right.available)) rows.push(difference(`${label} bend availability`, left.available, right.available));
    if (!same(left.contract, right.contract)) rows.push(difference(`${label} bend contract`, left.contract, right.contract));
    if (!same(left.signature, right.signature)) rows.push(difference(`${label} bend audit`, left.signature, right.signature));
  }
  return rows;
}

export function verifyBendReviewPackage(imported, current) {
  const invalid = validateImportedManifest(imported);
  if (invalid) return result(BEND_REVIEW_VERIFICATION_STATUS.INVALID_PACKAGE, 'PACKAGE_INVALID', invalid);
  if (!object(current?.payload)) return result(BEND_REVIEW_VERIFICATION_STATUS.STALE_COMPARE, 'CURRENT_STATE_UNAVAILABLE', 'Current Workbench review evidence is unavailable.');

  const inputs = inputDifferences(imported, current);
  if (inputs.length) return result(BEND_REVIEW_VERIFICATION_STATUS.STALE_INPUT, 'INPUT_IDENTITY_CHANGED', 'Loaded source or target identity differs from the imported package.', inputs);

  const comparison = compareDifferences(imported, current);
  if (comparison.length) return result(BEND_REVIEW_VERIFICATION_STATUS.STALE_COMPARE, 'COMPARE_EVIDENCE_CHANGED', 'Current comparison evidence differs from the imported package.', comparison);

  const bends = bendDifferences(imported, current);
  if (bends.length) return result(BEND_REVIEW_VERIFICATION_STATUS.STALE_BEND_EVIDENCE, 'BEND_EVIDENCE_CHANGED', 'Current bend evidence differs from the imported package.', bends);

  if (imported.packageSignature !== current.packageSignature) {
    return result(BEND_REVIEW_VERIFICATION_STATUS.STALE_BEND_EVIDENCE, 'PACKAGE_BINDING_CHANGED', 'Package-level completeness or bend binding differs from the current state.', [difference('Review package', imported.packageSignature, current.packageSignature)]);
  }
  return result(BEND_REVIEW_VERIFICATION_STATUS.MATCH, 'PACKAGE_MATCH', 'Imported package matches the current Workbench inputs, comparison, and bend evidence.');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function receiptLink(receipt) {
  if (!receipt) return '';
  const content = encodeURIComponent(serializeBendReviewVerificationReceipt(receipt));
  return `<a class="wb3d-btn wb3d-btn-mini" href="data:application/json;charset=utf-8,${content}" download="workbench-bend-verification-receipt.json">Export verification receipt</a>`;
}

export function verificationResultHtml(verification, receipt = null) {
  const style = verification.status === BEND_REVIEW_VERIFICATION_STATUS.MATCH ? 'is-ok'
    : verification.status === BEND_REVIEW_VERIFICATION_STATUS.INVALID_PACKAGE ? 'is-bad' : '';
  const rows = verification.differences.length
    ? `<ul class="wb3d-list">${verification.differences.map((row) => `<li>${esc(row.field)}: imported <code>${esc(row.imported)}</code> · current <code>${esc(row.current)}</code></li>`).join('')}</ul>` : '';
  return `<div><span class="wb3d-badge ${style}">${esc(verification.status.replaceAll('_', ' '))}</span> <span class="wb3d-muted">${esc(verification.message)}</span>${rows}${receiptLink(receipt)}</div>`;
}

export function bendReviewVerifierHtml(currentManifest) {
  const current = encodeURIComponent(serializeBendReviewPackageManifest(currentManifest));
  return `<${ELEMENT_NAME} data-current="${esc(current)}"></${ELEMENT_NAME}>`;
}

function registerVerifierElement() {
  if (!globalThis.customElements || !globalThis.HTMLElement || customElements.get(ELEMENT_NAME)) return;
  class BendReviewVerifierElement extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';
      this.innerHTML = `<div class="wb3d-toolbar"><label class="wb3d-file">Verify review package <input type="file" accept=".json,application/json"></label><span class="wb3d-muted" data-verification-result>Select a package JSON exported by this Workbench.</span></div>`;
      const input = this.querySelector('input[type="file"]');
      const output = this.querySelector('[data-verification-result]');
      let current;
      try { current = JSON.parse(decodeURIComponent(this.dataset.current || '')); } catch { current = null; }
      input?.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        let verification;
        let importedManifest = null;
        try {
          const parsed = parseBendReviewPackageText(await file.text());
          importedManifest = parsed.ok ? parsed.manifest : null;
          verification = parsed.ok ? verifyBendReviewPackage(importedManifest, current)
            : result(BEND_REVIEW_VERIFICATION_STATUS.INVALID_PACKAGE, 'PACKAGE_PARSE_FAILED', parsed.error);
        } catch (error) {
          verification = result(BEND_REVIEW_VERIFICATION_STATUS.INVALID_PACKAGE, 'PACKAGE_READ_FAILED', `Package could not be read: ${error?.message || error}`);
        }
        const receipt = buildBendReviewVerificationReceipt({ importedManifest, currentManifest: current, verification });
        if (output) output.innerHTML = verificationResultHtml(verification, receipt);
        input.value = '';
      });
    }
  }
  customElements.define(ELEMENT_NAME, BendReviewVerifierElement);
}

registerVerifierElement();

/** User-facing trusted intake, bounded comparison, guided review and decisions. */
import { revisionScopeMarkup } from './revision-scope-view.js';
import { revisionCompareReviewMarkup } from './revision-compare-review-view.js';
import { revisionVisualReadiness } from './revision-compare-readiness.js';
import { REVISION_REVIEW_STYLES } from './revision-review-styles.js';
import { REVISION_DECISION_STYLES } from './revision-decision-styles.js';
import { reviewSessionControlsMarkup } from './revision-review-view.js';
import { decisionLedgerControlsMarkup } from './revision-decision-view.js';
import { REVISION_EVIDENCE_PACKAGE_AUTHENTICITY_STATEMENT } from './revision-evidence-package-import.js';
import { REVISION_COMPARE_SVG_CSS } from './revision-compare-svg-styles.js';

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function shortHash(value) { const text = String(value ?? ''); return text ? `${text.slice(0, 12)}…${text.slice(-8)}` : '—'; }
function fact(label, value, attribute = '') { return `<div><dt>${escapeHtml(label)}</dt><dd ${attribute}>${escapeHtml(value)}</dd></div>`; }
function messageList(title, values, tone) {
  if (!values?.length) return '';
  return `<div class="revc-message-list" data-tone="${tone}"><b>${escapeHtml(title)}</b><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>`;
}
function slotFacts(slot) {
  if (!slot.document) return '<p class="revc-empty">No revision loaded.</p>';
  const document = slot.document;
  return `<dl class="revc-facts">${fact('Branches', document.stats.branchCount)}${fact('Components / records', `${document.stats.componentCount} / ${document.stats.recordCount}`)}${fact('Units', document.unit)}${fact('Coordinate frame', document.coordinateFrame)}${fact('Vertical axis', document.verticalAxis)}${fact('Root shape', document.rootShape)}</dl><details class="revc-details"><summary>File details</summary><dl>${fact('File size', `${document.fileSizeBytes} bytes`)}${fact('Content hash', shortHash(document.sourceHash))}${fact('Document ID', document.documentId)}${fact('Staged schema', document.stagedSchema)}${fact('Scoped hash', shortHash(document.scopedHash))}</dl></details>`;
}
function slotCard(slot, label, subtitle, disabled = false) {
  const loading = slot.status === 'LOADING'; const status = loading ? 'Loading / indexing' : slot.status.replaceAll('_', ' ').toLowerCase();
  return `<section class="revc-slot" data-slot="${escapeHtml(slot.slotId)}"><header><div><span>${escapeHtml(label)}</span><h2>${escapeHtml(subtitle)}</h2></div><strong data-status="${escapeHtml(slot.status.toLowerCase())}">${escapeHtml(status)}</strong></header><div class="revc-slot-body"><label class="revc-file-button">${slot.document ? 'Replace staged JSON' : 'Load staged JSON'}<input type="file" accept=".json,application/json" data-revc-file="${escapeHtml(slot.slotId)}" ${loading || disabled ? 'disabled' : ''}></label>${loading ? `<button type="button" class="revc-cancel" data-revc-cancel="${escapeHtml(slot.slotId)}">Cancel load</button>` : ''}${slot.fileName ? `<p class="revc-file-name">${escapeHtml(slot.fileName)}</p>` : ''}${slotFacts(slot)}${messageList('Blockers', slot.blockers, 'blocker')}${messageList('Warnings', slot.warnings, 'warning')}${slot.error ? `<details class="revc-details"><summary>Technical error</summary><pre>${escapeHtml(slot.error)}</pre></details>` : ''}</div></section>`;
}
function packageImportMarkup(state) {
  const lifecycle = state.evidencePackageImport; const importing = lifecycle.status === 'IMPORTING';
  const detail = importing ? 'Canonical package integrity and nested authority evidence are being verified.'
    : lifecycle.error || 'Import a RevisionCompareEvidencePackage.v1 into this fresh workspace.';
  return `<section class="revc-preflight" data-revc-evidence-package-import-panel data-status="${escapeHtml(lifecycle.status.toLowerCase())}" aria-busy="${importing}"><header><div><span>EVIDENCE PACKAGE</span><h2>Resume archived review evidence</h2></div><strong data-status="${escapeHtml(lifecycle.status.toLowerCase())}">${escapeHtml(lifecycle.status)}</strong></header><p data-revc-evidence-package-import-status>${escapeHtml(detail)}</p><label class="revc-file-button">Import evidence package<input type="file" accept=".json,application/json" data-revc-evidence-package-import></label></section>`;
}
function importedPackageMarkup(state) {
  const lifecycle = state.evidencePackageImport; if (lifecycle.status !== 'VERIFIED') return '';
  const review = lifecycle.reviewReattached ? 'Reattached from archived STALE status' : 'Attached exactly as packaged CURRENT authority';
  const decision = lifecycle.decisionReattached ? 'Reattached from archived STALE status' : 'Attached exactly as packaged CURRENT authority';
  return `<section class="revc-preflight" data-revc-imported-evidence-package><header><div><span>EVIDENCE PACKAGE</span><h2>Imported evidence package</h2></div><strong data-status="ready">VERIFIED</strong></header><dl class="revc-facts">${fact('Package ID', lifecycle.packageId, 'data-revc-imported-package-id')}${fact('Content SHA-256', lifecycle.contentSha256, 'data-revc-imported-package-sha')}${fact('Rev A file', state.slots.baseline.fileName, 'data-revc-imported-rev-a-file')}${fact('Rev B file', state.slots.candidate.fileName, 'data-revc-imported-rev-b-file')}${fact('Review authority', review, 'data-revc-imported-review-status')}${fact('Decision authority', decision, 'data-revc-imported-decision-status')}</dl><p data-revc-package-authenticity-boundary>${escapeHtml(REVISION_EVIDENCE_PACKAGE_AUTHENTICITY_STATEMENT)}</p></section>`;
}
function compatibilityLine(item) { return `<li data-status="${item.status.toLowerCase()}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.revA)} ↔ ${escapeHtml(item.revB)}</span><em>${escapeHtml(item.status)}</em></li>`; }
function preflightMarkup(preflight) {
  return `<section class="revc-preflight"><header><div><span>COMPATIBILITY PREFLIGHT</span><h2>Trusted comparison boundary</h2></div><strong data-status="${escapeHtml(preflight.status.toLowerCase())}">${escapeHtml(preflight.status)}</strong></header><ul class="revc-compatibility">${compatibilityLine(preflight.compatibility.unitCompatibility)}${compatibilityLine(preflight.compatibility.coordinateFrameCompatibility)}${compatibilityLine(preflight.compatibility.verticalAxisCompatibility)}</ul><div class="revc-preflight-messages">${messageList('Blocking', preflight.blockers, 'blocker')}${messageList('Warnings', preflight.warnings, 'warning')}${messageList('Information', preflight.notes, 'note')}</div></section>`;
}
function progressMetrics(progress) {
  if (!progress) return '';
  return `<div class="revc-progress-metrics"><span>${escapeHtml(progress.recordsProcessed ?? 0)} records processed</span><span>${escapeHtml(progress.candidatePairsEvaluated ?? 0)} candidate pairs</span><span>${escapeHtml(progress.maximumCandidatesForOneRecord ?? 0)} max candidates</span></div>`;
}
function comparisonControlMarkup(state) {
  if (!state.basis) return '';
  const readiness = revisionVisualReadiness(state); const active = ['PROJECTING', 'COMPARING', 'BUILDING_VISUAL'].includes(state.compare.status);
  if (active) return `<section class="revc-compare-control" data-status="active"><header><div><span>STAGE 3</span><h2>Running visual comparison</h2></div><strong>${escapeHtml(state.compare.status)}</strong></header><div class="revc-progress"><b>${escapeHtml(state.compare.progress?.stage || 'Starting')}</b>${progressMetrics(state.compare.progress)}<button type="button" data-revc-cancel-comparison>Cancel comparison</button></div></section>`;
  return `<section class="revc-compare-control"><header><div><span>STAGE 3</span><h2>Bounded visual comparison</h2><p>Run deterministic exact and bounded inferred matching from the current approved basis.</p></div><strong data-status="${readiness.status.toLowerCase()}">${readiness.status}</strong></header>${messageList('Visual-readiness blockers', readiness.blockers, 'blocker')}${state.compare.error ? messageList('Comparison failure', [state.compare.error], 'blocker') : ''}<div class="revc-compare-actions"><button type="button" class="revc-primary" data-revc-run-compare ${readiness.status !== 'READY' ? 'disabled' : ''}>Run visual comparison</button>${state.compare.audit ? '<button type="button" data-revc-open-review>Open visual review</button>' : ''}</div></section>`;
}
function setupMarkup(state, preflight) {
  const importing = state.evidencePackageImport.status === 'IMPORTING';
  const review = state.review.session ? reviewSessionControlsMarkup(state, false) : '';
  const decision = state.decision.ledger ? decisionLedgerControlsMarkup(state, false) : '';
  return `<main class="revc-body">${packageImportMarkup(state)}<section class="revc-load-stage" aria-labelledby="revc-load-title"><header class="revc-stage-head"><div><span>STAGE 1</span><h2 id="revc-load-title">Load revisions</h2><p>Rev A is the previous/reference revision. Rev B is the current/candidate revision.</p></div></header><div class="revc-slots">${slotCard(state.slots.baseline, 'REV A', 'Previous / reference revision', importing)}${slotCard(state.slots.candidate, 'REV B', 'Current / candidate revision', importing)}</div></section>${review}${decision}${preflightMarkup(preflight)}${revisionScopeMarkup(state, preflight)}${comparisonControlMarkup(state)}</main>`;
}
function footerMarkup(state, canDownload) {
  const imported = state.evidencePackageImport.status === 'VERIFIED';
  const sessionDownload = canDownload && !imported ? '<button type="button" data-revc-download-session>Download session manifest</button>' : '';
  return `<footer><div><span>Session</span><b>${escapeHtml(state.session.sessionId)}</b></div><div><span>Scope</span><b>${state.proposal ? `${state.proposal.summary.includedBranchCountA} A / ${state.proposal.summary.includedBranchCountB} B` : 'Not proposed'}</b></div><div><span>Basis</span><b data-status="${escapeHtml(state.basisStatus.toLowerCase())}">${escapeHtml(state.basisStatus)}</b></div><div class="revc-actions">${sessionDownload}<button type="button" data-revc-close>Close</button></div><p aria-live="polite" data-revc-live>${escapeHtml(state.message)}</p></footer>`;
}
export function revisionCompareWorkspaceMarkup(state, preflight, viewerEvidence = {}) {
  const canDownload = state.slots.baseline.document || state.slots.candidate.document;
  const review = state.compare.reviewVisible && state.compare.audit && state.basisStatus === 'CURRENT';
  const content = review ? `${importedPackageMarkup(state)}${revisionCompareReviewMarkup(state, viewerEvidence)}` : setupMarkup(state, preflight);
  return `<style>${REVISION_REVIEW_STYLES}${REVISION_DECISION_STYLES}${REVISION_COMPARE_SVG_CSS}</style><section class="revc-dialog ${review ? 'revc-review-dialog' : ''}" role="dialog" aria-modal="true" aria-labelledby="revc-title"><header class="revc-head"><div><span>REVISION COMPARE · RC-004</span><h1 id="revc-title">${review ? 'Guided visual revision review' : 'Trusted revision intake and scope'}</h1><p>${review ? '3D or read-only SVG context, guided review, persisted ambiguity evidence, and explicit decision history.' : 'Load immutable staged revisions, approve scope, and run bounded visual comparison.'}</p></div><button type="button" data-revc-close aria-label="Close Revision Compare">Close</button></header>${content}${footerMarkup(state, canDownload)}</section>`;
}
export const _test = Object.freeze({ comparisonControlMarkup, escapeHtml, importedPackageMarkup, packageImportMarkup, shortHash });

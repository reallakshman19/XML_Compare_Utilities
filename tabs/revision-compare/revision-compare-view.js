/** User-focused projections for trusted dual-revision intake and scope approval. */

import { revisionScopeMarkup } from './revision-scope-view.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function shortHash(value) {
  const text = String(value ?? '');
  return text ? `${text.slice(0, 12)}…${text.slice(-8)}` : '—';
}

function fact(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function messageList(title, values, tone) {
  if (!values?.length) return '';
  return `<div class="revc-message-list" data-tone="${tone}"><b>${escapeHtml(title)}</b><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>`;
}

function slotFacts(slot) {
  if (!slot.document) return '<p class="revc-empty">No revision loaded.</p>';
  const document = slot.document;
  return `<dl class="revc-facts">
    ${fact('Branches', document.stats.branchCount)}
    ${fact('Components / records', `${document.stats.componentCount} / ${document.stats.recordCount}`)}
    ${fact('Units', document.unit)}
    ${fact('Coordinate frame', document.coordinateFrame)}
    ${fact('Vertical axis', document.verticalAxis)}
    ${fact('Root shape', document.rootShape)}
  </dl>
  <details class="revc-details"><summary>File details</summary><dl>
    ${fact('File size', `${document.fileSizeBytes} bytes`)}
    ${fact('Content hash', shortHash(document.sourceHash))}
    ${fact('Document ID', document.documentId)}
    ${fact('Staged schema', document.stagedSchema)}
    ${fact('Scoped hash', shortHash(document.scopedHash))}
  </dl></details>`;
}

function slotCard(slot, label, subtitle) {
  const loading = slot.status === 'LOADING';
  const status = loading ? 'Loading / indexing' : slot.status.replaceAll('_', ' ').toLowerCase();
  return `<section class="revc-slot" data-slot="${escapeHtml(slot.slotId)}">
    <header><div><span>${escapeHtml(label)}</span><h2>${escapeHtml(subtitle)}</h2></div><strong data-status="${escapeHtml(slot.status.toLowerCase())}">${escapeHtml(status)}</strong></header>
    <div class="revc-slot-body">
      <label class="revc-file-button">${slot.document ? 'Replace staged JSON' : 'Load staged JSON'}
        <input type="file" accept=".json,application/json" data-revc-file="${escapeHtml(slot.slotId)}" ${loading ? 'disabled' : ''}>
      </label>
      ${loading ? `<button type="button" class="revc-cancel" data-revc-cancel="${escapeHtml(slot.slotId)}">Cancel load</button>` : ''}
      ${slot.fileName ? `<p class="revc-file-name">${escapeHtml(slot.fileName)}</p>` : ''}
      ${slotFacts(slot)}
      ${messageList('Blockers', slot.blockers, 'blocker')}
      ${messageList('Warnings', slot.warnings, 'warning')}
      ${slot.error ? `<details class="revc-details"><summary>Technical error</summary><pre>${escapeHtml(slot.error)}</pre></details>` : ''}
    </div>
  </section>`;
}

function compatibilityLine(item) {
  const status = item.status.toLowerCase();
  return `<li data-status="${status}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.revA)} ↔ ${escapeHtml(item.revB)}</span><em>${escapeHtml(item.status)}</em></li>`;
}

function preflightMarkup(preflight) {
  return `<section class="revc-preflight">
    <header><div><span>COMPATIBILITY PREFLIGHT</span><h2>Trusted comparison boundary</h2></div><strong data-status="${escapeHtml(preflight.status.toLowerCase())}">${escapeHtml(preflight.status)}</strong></header>
    <ul class="revc-compatibility">
      ${compatibilityLine(preflight.compatibility.unitCompatibility)}
      ${compatibilityLine(preflight.compatibility.coordinateFrameCompatibility)}
      ${compatibilityLine(preflight.compatibility.verticalAxisCompatibility)}
    </ul>
    <div class="revc-preflight-messages">
      ${messageList('Blocking', preflight.blockers, 'blocker')}
      ${messageList('Warnings', preflight.warnings, 'warning')}
      ${messageList('Information', preflight.notes, 'note')}
    </div>
  </section>`;
}

export function revisionCompareWorkspaceMarkup(state, preflight) {
  const canDownload = state.slots.baseline.document || state.slots.candidate.document;
  return `<section class="revc-dialog" role="dialog" aria-modal="true" aria-labelledby="revc-title">
    <header class="revc-head">
      <div><span>REVISION COMPARE · RC-001</span><h1 id="revc-title">Trusted revision intake and scope</h1><p>Load two immutable staged revisions, confirm compatibility, and approve the exact branch basis.</p></div>
      <button type="button" data-revc-close aria-label="Close Revision Compare">Close</button>
    </header>
    <main class="revc-body">
      <section class="revc-load-stage" aria-labelledby="revc-load-title">
        <header class="revc-stage-head"><div><span>STAGE 1</span><h2 id="revc-load-title">Load revisions</h2><p>Rev A is the previous/reference revision. Rev B is the current/candidate revision.</p></div></header>
        <div class="revc-slots">
          ${slotCard(state.slots.baseline, 'REV A', 'Previous / reference revision')}
          ${slotCard(state.slots.candidate, 'REV B', 'Current / candidate revision')}
        </div>
      </section>
      ${preflightMarkup(preflight)}
      ${revisionScopeMarkup(state, preflight)}
    </main>
    <footer>
      <div><span>Session</span><b>${escapeHtml(state.session.sessionId)}</b></div>
      <div><span>Scope</span><b>${state.proposal ? `${state.proposal.summary.includedBranchCountA} A / ${state.proposal.summary.includedBranchCountB} B` : 'Not proposed'}</b></div>
      <div><span>Basis</span><b data-status="${escapeHtml(state.basisStatus.toLowerCase())}">${escapeHtml(state.basisStatus)}</b></div>
      <div class="revc-actions">${canDownload ? '<button type="button" data-revc-download-session>Download session manifest</button>' : ''}<button type="button" data-revc-close>Close</button></div>
      <p aria-live="polite" data-revc-live>${escapeHtml(state.message)}</p>
    </footer>
  </section>`;
}

export const _test = Object.freeze({ escapeHtml, shortHash });

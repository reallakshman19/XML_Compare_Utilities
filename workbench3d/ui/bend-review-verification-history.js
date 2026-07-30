/** Bounded page-memory history for Workbench package and receipt checks. */

export const BEND_REVIEW_HISTORY_AUTHORITY = 'SESSION_MEMORY_ONLY';
export const BEND_REVIEW_HISTORY_LIMIT = 12;
export const BEND_REVIEW_HISTORY_KIND = Object.freeze({
  PACKAGE: 'PACKAGE',
  RECEIPT: 'RECEIPT',
});

let historyEntries = Object.freeze([]);
let historySequence = 0;

function text(value) { return String(value ?? '').trim(); }
function array(value) { return Array.isArray(value) ? value : []; }
function kind(value) {
  return Object.values(BEND_REVIEW_HISTORY_KIND).includes(value)
    ? value : BEND_REVIEW_HISTORY_KIND.PACKAGE;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

export function buildBendReviewHistoryEntry({
  checkKind, verification, artifactSignature, currentManifest,
} = {}) {
  historySequence += 1;
  return Object.freeze({
    sequence: historySequence,
    kind: kind(checkKind),
    status: text(verification?.status) || 'UNAVAILABLE',
    code: text(verification?.code) || 'VERIFICATION_UNAVAILABLE',
    artifactSignature: text(artifactSignature),
    currentPackageSignature: text(currentManifest?.packageSignature),
    differenceCount: array(verification?.differences).length,
  });
}

export function recordBendReviewHistory(input = {}) {
  const entry = buildBendReviewHistoryEntry(input);
  historyEntries = Object.freeze([entry, ...historyEntries]
    .slice(0, BEND_REVIEW_HISTORY_LIMIT));
  return historyEntries;
}

export function getBendReviewHistory() {
  return historyEntries;
}

export function clearBendReviewHistory() {
  historyEntries = Object.freeze([]);
  historySequence = 0;
  return historyEntries;
}

export function bendReviewHistoryCount(entries = historyEntries) {
  const count = array(entries).length;
  return `${count} check${count === 1 ? '' : 's'}`;
}

function historyRow(entry) {
  const status = text(entry?.status).replaceAll('_', ' ');
  const artifact = text(entry?.artifactSignature) || '—';
  const current = text(entry?.currentPackageSignature) || '—';
  return `<tr><td>${entry.sequence}</td><td>${esc(entry.kind)}</td><td>${esc(status)}</td><td>${esc(entry.code)}</td><td><code>${esc(artifact)}</code></td><td><code>${esc(current)}</code></td><td>${entry.differenceCount}</td></tr>`;
}

export function bendReviewHistoryHtml(entries = historyEntries) {
  const rows = array(entries);
  if (!rows.length) return '<p class="wb3d-muted">No package or receipt checks in this browser session.</p>';
  return `<div class="wb3d-table-wrap"><table><thead><tr><th>#</th><th>Check</th><th>Status</th><th>Code</th><th>Artifact</th><th>Current package</th><th>Differences</th></tr></thead><tbody>${rows.map(historyRow).join('')}</tbody></table></div>`;
}

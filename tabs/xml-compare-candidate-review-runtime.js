const RUNTIME_SCHEMA = 'xml-compare-candidate-review-runtime/v2';
let installed = false;

function clean(value) {
  return String(value ?? '').trim();
}

function basisList(value = '') {
  return clean(value).split('|').map(clean).filter(Boolean);
}

function candidateFromRow(row = null) {
  if (!row?.dataset) return null;
  const sourceUid = clean(row.dataset.sourceUid);
  const targetUid = clean(row.dataset.targetUid);
  if (!sourceUid || !targetUid) return null;
  return Object.freeze({
    id: clean(row.dataset.xmlCompareCandidateRow),
    sourceUid,
    targetUid,
    sourceLabel: clean(row.dataset.sourceLabel || sourceUid),
    targetLabel: clean(row.dataset.targetLabel || targetUid),
    sourceField: clean(row.dataset.sourceField),
    targetField: clean(row.dataset.targetField),
    sourceValue: clean(row.dataset.sourceValue),
    targetValue: clean(row.dataset.targetValue),
    basis: Object.freeze(basisList(row.dataset.basis)),
    score: Number(row.dataset.score || 0),
    identityConfidence: Number(row.dataset.score || 0),
    transformBasis: 'identity-offset',
  });
}

function dispatchStateAction(detail = {}, dispatchTarget = document) {
  if (!dispatchTarget?.dispatchEvent || typeof CustomEvent === 'undefined') return false;
  return dispatchTarget.dispatchEvent(new CustomEvent('xml-compare:state-action', { detail }));
}

function acceptRow(row, dispatchTarget = document) {
  const candidate = candidateFromRow(row);
  if (!candidate) return false;
  return dispatchStateAction({ type: 'accept-candidate', candidate }, dispatchTarget);
}

function rejectRow(row, dispatchTarget = document) {
  const candidate = candidateFromRow(row);
  if (!candidate) return false;
  return dispatchStateAction({ type: 'reject-candidate', candidateId: candidate.id, candidate }, dispatchTarget);
}

function onClick(event) {
  const button = event.target.closest('[data-xml-compare-candidate-action]');
  if (!button) return;
  const row = button.closest('[data-xml-compare-candidate-row]');
  const action = clean(button.dataset.xmlCompareCandidateAction);
  if (action !== 'accept' && action !== 'reject') return;
  event.preventDefault();
  if (action === 'accept') acceptRow(row);
  if (action === 'reject') rejectRow(row);
}

export function installXmlCompareCandidateReviewRuntime() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', onClick, true);
  document.documentElement.dataset.xmlCompareCandidateReviewRuntime = RUNTIME_SCHEMA;
}

installXmlCompareCandidateReviewRuntime();

export const _test = Object.freeze({
  clean,
  basisList,
  candidateFromRow,
  dispatchStateAction,
  acceptRow,
  rejectRow,
});

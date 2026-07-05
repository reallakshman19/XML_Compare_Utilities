export const XML_COMPARE_CANDIDATE_REVIEW_RUNTIME_SCHEMA = 'xml-compare-candidate-review-runtime/v3-inert-helpers';

const clean = (value) => String(value ?? '').trim();

function basisList(value = '') {
  return clean(value).split('|').map(clean).filter(Boolean);
}

export function candidateFromApproveRejectButton(button = null) {
  if (!button?.dataset) return null;
  const sourceUid = clean(button.dataset.sourceUid);
  const targetUid = clean(button.dataset.targetUid);
  if (!sourceUid || !targetUid) return null;
  return Object.freeze({
    id: `candidate:${sourceUid}=>${targetUid}`,
    sourceUid,
    targetUid,
    sourceStableKey: clean(button.dataset.sourceStable),
    targetStableKey: clean(button.dataset.targetStable),
    sourceLabel: clean(button.dataset.sourceLabel || sourceUid),
    targetLabel: clean(button.dataset.targetLabel || targetUid),
    status: clean(button.dataset.status),
    method: clean(button.dataset.method),
    basis: Object.freeze(basisList(button.dataset.basis)),
    allowDuplicateTarget: button.dataset.allowDuplicateTarget === 'true',
    score: Number(button.dataset.score || 0.85),
    identityConfidence: Number(button.dataset.score || 0.85),
  });
}

export function installXmlCompareCandidateReviewRuntime() {
  return false;
}

export const _test = Object.freeze({
  clean,
  basisList,
  candidateFromApproveRejectButton,
  installXmlCompareCandidateReviewRuntime,
});

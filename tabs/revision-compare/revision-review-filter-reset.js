/** Pure model and bounded action for restoring the complete Revision Compare review queue. */
import { cleanText, deepFreeze } from './revision-contract-utils.js';
import { createComparisonLifecycleState } from './revision-compare-lifecycle.js';
import { createDecisionFilters } from './revision-decision-projection.js';
import { createReviewFilters } from './revision-review-priority.js';

const DEFAULT_QUEUE = createComparisonLifecycleState().queue;
const DEFAULT_REVIEW_FILTERS = createReviewFilters();
const DEFAULT_DECISION_FILTERS = createDecisionFilters();

function setMatches(values, expected) {
  if (!Array.isArray(values) || values.length !== expected.length) return false;
  const current = new Set(values);
  return current.size === expected.length && expected.every((value) => current.has(value));
}

function activeFilterKeys(state) {
  const keys = [];
  const queue = state?.compare?.queue ?? {};
  const review = state?.review?.filters ?? {};
  const decision = state?.decision?.filters ?? {};
  if (cleanText(review.search)) keys.push('reviewSearch');
  if (!setMatches(review.reviewStates, DEFAULT_REVIEW_FILTERS.reviewStates)) keys.push('reviewStates');
  if (!setMatches(queue.categories, DEFAULT_QUEUE.categories)) keys.push('categories');
  if (!setMatches(review.certainties, DEFAULT_REVIEW_FILTERS.certainties)) keys.push('certainties');
  if (!setMatches(queue.changedReasons, DEFAULT_QUEUE.changedReasons)) keys.push('changedReasons');
  if (queue.needsDecisionOnly) keys.push('needsDecisionOnly');
  if (!setMatches(decision.decisionStates, DEFAULT_DECISION_FILTERS.decisionStates)) keys.push('decisionStates');
  if (decision.unresolvedOnly) keys.push('unresolvedOnly');
  return keys;
}

function clearedMessage(count) {
  return `Cleared ${count} review filter${count === 1 ? '' : 's'}.`;
}

export function revisionReviewFilterResetModel(state) {
  const activeKeys = Object.freeze(activeFilterKeys(state));
  const count = activeKeys.length;
  return deepFreeze({
    visible: count > 0,
    activeCount: count,
    activeKeys,
    label: count === 1 ? 'Clear 1 review filter' : `Clear ${count} review filters`,
    message: count === 1 ? 'Reveal the complete queue by clearing 1 active review filter.'
      : `Reveal the complete queue by clearing ${count} active review filters.`,
  });
}

export function clearRevisionReviewFilters(state) {
  const model = revisionReviewFilterResetModel(state);
  if (!model.visible) return deepFreeze({ model, state, message: '' });
  const message = clearedMessage(model.activeCount);
  const compare = deepFreeze({ ...state.compare, queue: DEFAULT_QUEUE });
  const review = deepFreeze({ ...state.review, filters: DEFAULT_REVIEW_FILTERS });
  const decision = deepFreeze({ ...state.decision, filters: DEFAULT_DECISION_FILTERS });
  return deepFreeze({ model, state: deepFreeze({ ...state, compare, review, decision, message }), message });
}

export function createRevisionReviewFilterResetAction(context) {
  return () => {
    const result = clearRevisionReviewFilters(context.readState());
    if (!result.model.visible) return;
    context.writeState(result.state);
    context.render(result.state);
    context.showToast?.(result.message, 'success');
  };
}

export const _test = Object.freeze({ activeFilterKeys, clearedMessage, setMatches });

import assert from 'node:assert/strict';
import {
  clearRevisionReviewFilters,
  createRevisionReviewFilterResetAction,
  revisionReviewFilterResetModel,
} from '../tabs/revision-compare/revision-review-filter-reset.js';
import { revisionCompareWorkspaceEventTest } from '../tabs/revision-compare/revision-compare-workspace-events.js';
import { _test as reviewViewTest } from '../tabs/revision-compare/revision-review-view.js';
import {
  createRevisionWorkspaceState,
  setWorkspaceDecisionUnresolvedOnly,
  setWorkspaceNeedsDecision,
  setWorkspaceReviewSearch,
  toggleWorkspaceCategory,
  toggleWorkspaceChangedReason,
  toggleWorkspaceDecisionFilter,
  toggleWorkspaceReviewFilter,
} from '../tabs/revision-compare/revision-workspace-state.js';

const NOW = '2026-07-30T03:00:00.000Z';

function filteredWorkspace() {
  let state = createRevisionWorkspaceState('review-filter-reset-session', NOW);
  state = setWorkspaceReviewSearch(state, '  pump  ');
  state = toggleWorkspaceReviewFilter(state, 'reviewStates', 'REVIEWED');
  state = toggleWorkspaceCategory(state, 'REMOVED');
  state = toggleWorkspaceReviewFilter(state, 'certainties', 'EXACT');
  state = toggleWorkspaceChangedReason(state, 'GEOMETRY');
  state = setWorkspaceNeedsDecision(state, true);
  state = toggleWorkspaceDecisionFilter(state, 'DEFERRED');
  state = setWorkspaceDecisionUnresolvedOnly(state, true);
  const audit = Object.freeze({ auditId: 'audit-1' });
  const reviewSession = Object.freeze({ reviewSessionId: 'review-1' });
  const decisionLedger = Object.freeze({ ledgerId: 'ledger-1' });
  const preview = Object.freeze({ differenceId: 'difference-1', candidateIndex: 2 });
  return Object.freeze({
    ...state,
    basis: Object.freeze({ basisId: 'basis-1' }),
    compare: Object.freeze({ ...state.compare, audit, selectedDifferenceId: 'difference-1' }),
    review: Object.freeze({ ...state.review, session: reviewSession }),
    decision: Object.freeze({ ...state.decision, ledger: decisionLedger, preview }),
    signOff: Object.freeze({ report: Object.freeze({ reportId: 'report-1' }) }),
    trustReceipt: Object.freeze({ receiptId: 'receipt-1' }),
    transfer: Object.freeze({ transferId: 'transfer-1' }),
    visualMetadataDeclaration: Object.freeze({ declarationId: 'declaration-1' }),
  });
}

function assertModel(state) {
  const model = revisionReviewFilterResetModel(state);
  assert.equal(model.visible, true);
  assert.equal(model.activeCount, 8);
  assert.deepEqual(model.activeKeys, [
    'reviewSearch', 'reviewStates', 'categories', 'certainties',
    'changedReasons', 'needsDecisionOnly', 'decisionStates', 'unresolvedOnly',
  ]);
  assert.equal(model.label, 'Clear 8 review filters');
  assert(Object.isFrozen(model));
  assert(Object.isFrozen(model.activeKeys));
}

function assertAuthorityReferences(before, after) {
  assert.equal(after.slots, before.slots);
  assert.equal(after.session, before.session);
  assert.equal(after.scopeDecisions, before.scopeDecisions);
  assert.equal(after.proposal, before.proposal);
  assert.equal(after.basis, before.basis);
  assert.equal(after.compare.audit, before.compare.audit);
  assert.equal(after.compare.selectedDifferenceId, before.compare.selectedDifferenceId);
  assert.equal(after.review.session, before.review.session);
  assert.equal(after.decision.ledger, before.decision.ledger);
  assert.equal(after.decision.preview, before.decision.preview);
  assert.equal(after.signOff, before.signOff);
  assert.equal(after.trustReceipt, before.trustReceipt);
  assert.equal(after.transfer, before.transfer);
  assert.equal(after.visualMetadataDeclaration, before.visualMetadataDeclaration);
}

function assertPureReset(state) {
  const result = clearRevisionReviewFilters(state);
  assert.equal(result.message, 'Cleared 8 review filters.');
  assert.deepEqual(result.state.compare.queue.categories, ['CHANGED', 'ADDED', 'REMOVED']);
  assert.deepEqual(result.state.compare.queue.changedReasons, ['GEOMETRY', 'PROPERTIES', 'CONNECTIVITY', 'SUPPORT_HIERARCHY']);
  assert.equal(result.state.compare.queue.needsDecisionOnly, false);
  assert.equal(result.state.review.filters.search, '');
  assert.equal(result.state.review.filters.reviewStates.length, 4);
  assert.equal(result.state.review.filters.certainties.length, 4);
  assert.equal(result.state.decision.filters.decisionStates.length, 5);
  assert.equal(result.state.decision.filters.unresolvedOnly, false);
  assert.equal(result.state.message, result.message);
  assertAuthorityReferences(state, result.state);
  assert.notEqual(result.state, state);
  assert(Object.isFrozen(result.state));
  assert.equal(revisionReviewFilterResetModel(result.state).visible, false);
}

function actionHarness(initialState) {
  let state = initialState;
  const writes = []; const renders = []; const toasts = [];
  const action = createRevisionReviewFilterResetAction({
    readState: () => state,
    writeState: (next) => { state = next; writes.push(next); },
    render: (next) => renders.push(next),
    showToast: (message, tone) => toasts.push({ message, tone }),
  });
  return Object.freeze({ action, readState: () => state, writes, renders, toasts });
}

function assertAction(state) {
  const harness = actionHarness(state);
  harness.action();
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.renders.length, 1);
  assert.equal(harness.writes[0], harness.renders[0]);
  assert.deepEqual(harness.toasts, [{ message: 'Cleared 8 review filters.', tone: 'success' }]);
  harness.action();
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.renders.length, 1);
  assert.equal(harness.toasts.length, 1);
}

function assertMarkup(state) {
  const markup = reviewViewTest.reviewFilterResetMarkup(state);
  assert.match(markup, /Clear 8 review filters/);
  assert.match(markup, /data-revc-clear-review-filters/);
  assert.match(markup, /data-revc-filter-count="8"/);
  const imported = Object.freeze({
    ...state,
    evidencePackageImport: Object.freeze({ ...state.evidencePackageImport, status: 'VERIFIED' }),
  });
  assert.equal(reviewViewTest.reviewFilterResetMarkup(imported), '');
  assert.equal(reviewViewTest.reviewFilterResetMarkup(clearRevisionReviewFilters(state).state), '');
}

function assertEventRoute() {
  let calls = 0;
  const button = { hasAttribute: (name) => name === 'data-revc-clear-review-filters', dataset: {} };
  const target = { closest: () => button };
  const actions = new Proxy({ clearReviewFilters: () => { calls += 1; }, transferClick: () => {} }, {
    get: (value, key) => value[key] ?? (() => {}),
  });
  revisionCompareWorkspaceEventTest.actionClick(actions, target);
  assert.equal(calls, 1);
}

function assertWhitespaceInactive() {
  const state = setWorkspaceReviewSearch(createRevisionWorkspaceState('whitespace-session', NOW), '   ');
  assert.equal(revisionReviewFilterResetModel(state).visible, false);
  assert.equal(clearRevisionReviewFilters(state).state, state);
}

const state = filteredWorkspace();
assertModel(state);
assertPureReset(state);
assertAction(state);
assertMarkup(state);
assertEventRoute();
assertWhitespaceInactive();
console.log('revision-compare-review-filter-reset: PASS');

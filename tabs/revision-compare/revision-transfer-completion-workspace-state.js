/** Workspace transitions for patched-target completion authority. */
import { deepFreeze } from './revision-contract-utils.js';
import {
  completeRevisionCompareTransferCompletionState, createRevisionCompareTransferCompletionState,
  failRevisionCompareTransferCompletionState, revisionCompareTransferCompletionAuthorityMatches,
  revisionCompareTransferCompletionStateForReadiness, staleRevisionCompareTransferCompletionState,
} from './revision-transfer-completion-state.js';

function nextCompletion(previous, next) {
  const prior = previous?.transferCompletion ?? createRevisionCompareTransferCompletionState();
  return prior.report ? staleRevisionCompareTransferCompletionState(prior)
    : revisionCompareTransferCompletionStateForReadiness(next);
}
export function reconcileRevisionCompareTransferCompletionAfterAuthorityChange(previous, next) {
  const transferCompletion = nextCompletion(previous, next);
  return transferCompletion === next.transferCompletion ? next : deepFreeze({ ...next, transferCompletion });
}
export function completeWorkspaceTransferCompletion(state, captured, application) {
  if (!revisionCompareTransferCompletionAuthorityMatches(captured, state)) {
    return deepFreeze({ ...state, transferCompletion: failRevisionCompareTransferCompletionState(
      'Transfer completion authority changed during creation. Create the completion record again.',
    ) });
  }
  return deepFreeze({
    ...state,
    transferCompletion: completeRevisionCompareTransferCompletionState(application, state),
  });
}
export function failWorkspaceTransferCompletion(state, error) {
  return deepFreeze({ ...state, transferCompletion: failRevisionCompareTransferCompletionState(error) });
}
export const _test = Object.freeze({ nextCompletion });

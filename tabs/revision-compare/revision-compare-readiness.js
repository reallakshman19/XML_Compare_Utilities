/** RC-002 visual-readiness gate derived only from the current approved basis. */
import { deepFreeze } from './revision-contract-utils.js';

export function revisionVisualReadiness(state) {
  const blockers = [];
  if (state?.basisStatus !== 'CURRENT') blockers.push('Comparison basis is not current.');
  const basis = state?.basis;
  if (!basis || basis.validation?.status !== 'READY') blockers.push('An approved RevisionComparisonBasis.v1 is required.');
  for (const item of [basis?.unitCompatibility, basis?.coordinateFrameCompatibility, basis?.verticalAxisCompatibility]) {
    if (item?.status !== 'COMPATIBLE') blockers.push(`${item?.label ?? 'Compatibility evidence'} is ${item?.status ?? 'UNKNOWN'}.`);
  }
  if (!basis?.includedBranchesA?.length) blockers.push('Rev A included scope is empty.');
  if (!basis?.includedBranchesB?.length) blockers.push('Rev B included scope is empty.');
  return deepFreeze({ status: blockers.length ? 'BLOCKED' : 'READY', blockers: Object.freeze(blockers) });
}

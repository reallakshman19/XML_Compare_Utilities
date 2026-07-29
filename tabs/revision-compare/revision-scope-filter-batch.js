/** Shared filter and batch-selection authority for Revision Compare branch scope. */
import { cleanText, deepFreeze, frozenStrings } from './revision-contract-utils.js';
import { updateScopeGroup } from './revision-scope-proposal.js';

const GROUP_FIELDS = Object.freeze({
  common: 'commonBranches',
  revAOnly: 'revAOnlyBranches',
  revBOnly: 'revBOnlyBranches',
});

function normalizedQuery(value) {
  return cleanText(value).toLowerCase();
}

function searchableText(entry) {
  return [entry?.label, entry?.site, entry?.owner].map(cleanText).join(' ').toLowerCase();
}

export function revisionScopeGroupEntries(proposal, group) {
  const field = GROUP_FIELDS[group];
  if (!field) throw new RangeError(`Unknown revision scope group: ${group}`);
  return Object.freeze([...(proposal?.[field] ?? [])]);
}

export function filterRevisionScopeEntries(entries, query) {
  const normalized = normalizedQuery(query);
  if (!normalized) return Object.freeze([...(entries ?? [])]);
  return Object.freeze((entries ?? []).filter((entry) => searchableText(entry).includes(normalized)));
}

export function revisionScopeBatchModel(state, group) {
  const entries = revisionScopeGroupEntries(state?.proposal, group);
  const query = normalizedQuery(state?.search?.[group]);
  const visibleEntries = filterRevisionScopeEntries(entries, query);
  const filtered = Boolean(query);
  return deepFreeze({
    group,
    query,
    filtered,
    entries: visibleEntries,
    branchIds: frozenStrings(visibleEntries.map((entry) => entry.branchId)),
    totalCount: entries.length,
    visibleCount: visibleEntries.length,
    hiddenCount: entries.length - visibleEntries.length,
    selectLabel: filtered ? 'Select visible' : 'Select all',
    clearLabel: filtered ? 'Clear visible' : 'Clear all',
  });
}

export function applyRevisionScopeBatch(decisions, state, group, include) {
  const batch = revisionScopeBatchModel(state, group);
  return deepFreeze({
    batch,
    decisions: updateScopeGroup(decisions, batch.branchIds, include),
  });
}

export const _test = Object.freeze({ normalizedQuery, searchableText });

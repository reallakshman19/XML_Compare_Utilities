/**
 * Functionality: renders immutable source-search matches into the left result
 * panel. Input is the view model search slice. Output is inert HTML with
 * object identity keys for explicit controller focus. Fallback: an empty
 * message is shown when no source component matches every active field.
 */

import { asArray, escapeMarkup, objectRecord } from './topology-validator-values.js';

/** @param {Record<string, unknown>} viewModel @returns {string} */
export function buildTopologySearchResultsMarkup(viewModel) {
  const summary = objectRecord(viewModel.filterSummary), results = asArray(viewModel.searchResults).map(objectRecord);
  if (summary.searchActive !== true) return '';
  const heading = `<h2>Search results <span>${escapeMarkup(summary.sourceMatchCount)}</span></h2>`;
  if (!results.length) return `${heading}<p class="ttv-search-empty">No source objects match all active search fields.</p>`;
  const buttons = results.map((result) => `<button type="button" data-object-key="${escapeMarkup(result.objectKey)}"><b>${escapeMarkup(result.componentCategory)}</b><span>${escapeMarkup(result.name || result.ref || result.sourcePath)}</span><small>${escapeMarkup(result.sourcePath)}</small></button>`).join('');
  const overflow = Number(summary.sourceMatchCount) > results.length ? `<p class="ttv-search-overflow">Showing first ${results.length} matches.</p>` : '';
  return `${heading}<div class="ttv-search-result-list">${buttons}</div>${overflow}`;
}

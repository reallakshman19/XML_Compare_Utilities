/**
 * Dedicated modeless topology-checker dashboard controller.
 * Canonical evidence is checked by the pinned core. Review/filter state is
 * separate from evidence; fixes are delegated to the reversible draft engine.
 */

import { loadTopologyProducerCore } from './topology-producer-loader.js';
import { wireTopologyCheckerLayout } from './topology-checker-layout.js';
import {
  checkerBucketMarkup, checkerDetailMarkup, checkerIssueRowMarkup, checkerKpiMarkup,
  renderCheckerFilterOptions,
} from './topology-checker-panel.js';
import {
  CHECKER_FILTER_DEFAULTS, checkerCategoryCounts, checkerFilterValues, checkerIssueRow,
  checkerObjectIndexes, checkerSelectionRows, filterCheckerIssueRows,
} from './topology-checker-model.js';
import { clearTopologyCheckerOverlay, renderTopologyCheckerOverlay } from './topology-checker-overlay.js';
import { asArray, cleanText, objectRecord } from './topology-validator-values.js';

const FILTER_KEY = 'xml-compare.topology-checker.filters.v1';
const ROW_HEIGHT = 54;

/** @param {Record<string,Element>} elements @param {Record<string,Function>} dependencies @returns {Readonly<Record<string,Function>>} */
export function createTopologyCheckerController(elements, dependencies) {
  const storage = elements.panel.ownerDocument.defaultView?.localStorage ?? null;
  const layout = wireTopologyCheckerLayout(elements.panel, storage);
  let core = null, canonical = null, report = null, suggestions = [], reviewState = null;
  let rows = [], filteredRows = [], selectedIssueId = '', filters = readFilters(storage), destroyed = false;

  /** @param {string} message @returns {void} */
  function announce(message) { elements.live.textContent = message; elements.subtitle.textContent = message; }
  /** @returns {Record<string,unknown>} */
  function currentCanonical() {
    const evidence = objectRecord(dependencies.evidence()), edit = objectRecord(evidence.edit), trace = objectRecord(evidence.trace);
    const edited = objectRecord(objectRecord(edit.editedArtifacts).canonicalTopology);
    const loaded = objectRecord(objectRecord(trace.artifacts).canonical);
    const value = edited.schema === 'CanonicalTopology.v1' ? edited : loaded;
    if (value.schema !== 'CanonicalTopology.v1') throw new Error('Build or load CanonicalTopology.v1 before running the checker.');
    return value;
  }
  /** @returns {Record<string,unknown>} */
  function baseCanonical() {
    const evidence = objectRecord(dependencies.evidence()), edit = objectRecord(evidence.edit), trace = objectRecord(evidence.trace);
    return objectRecord(objectRecord(edit.baseArtifacts).canonicalTopology).schema === 'CanonicalTopology.v1'
      ? objectRecord(objectRecord(edit.baseArtifacts).canonicalTopology) : objectRecord(objectRecord(trace.artifacts).canonical);
  }
  /** @returns {Set<string>} */
  function selectedObjectIds() {
    return new Set(asArray(objectRecord(dependencies.evidence()).edit?.selection).map((row) => cleanText(objectRecord(row).id)).filter(Boolean));
  }
  /** @param {Record<string,unknown>} nextReport @returns {Record<string,unknown>} */
  function restoreReviewState(nextReport) {
    const key = reviewKey(nextReport.canonicalTopologyHash), raw = storage?.getItem(key);
    if (!raw) return core.createTopologyReviewState(nextReport);
    const parsed = JSON.parse(raw);
    if (parsed.schema !== 'TopologyReviewState.v1' || parsed.canonicalTopologyHash !== nextReport.canonicalTopologyHash) {
      throw new Error(`Stored topology review state does not match ${nextReport.canonicalTopologyHash}.`);
    }
    return parsed;
  }
  /** @returns {Promise<Record<string,unknown>>} */
  async function refresh() {
    core ??= await loadTopologyProducerCore(); canonical = currentCanonical();
    const started = performance.now(); report = core.runTopologyChecks(canonical, checkerOptions(canonical));
    suggestions = [...core.buildTopologyFixSuggestions(canonical, report, {})]; reviewState = restoreReviewState(report);
    const base = baseCanonical(), baseReport = base.canonicalTopologyHash === canonical.canonicalTopologyHash
      ? report : core.runTopologyChecks(base, checkerOptions(base));
    rebuildRows(new Set(baseReport.issues.map((issue) => issue.id)));
    announce(`${report.issues.length.toLocaleString()} findings · ${(performance.now() - started).toFixed(1)} ms`);
    return report;
  }
  /** @param {Set<string>} baselineIssueIds @returns {void} */
  function rebuildRows(baselineIssueIds) {
    const indexes = checkerObjectIndexes(canonical), suggestionByIssue = new Map(suggestions.map((row) => [row.issueId, row]));
    rows = report.issues.map((issue) => checkerIssueRow(issue, suggestionByIssue.get(issue.id) ?? null, { indexes, reviewState, baselineIssueIds }));
    applyFilters(); updateSummary(); renderFilterLists(); renderDetail();
  }
  /** @returns {void} */
  function applyFilters() {
    filteredRows = filterCheckerIssueRows(rows, filters, selectedObjectIds());
    if (selectedIssueId && !filteredRows.some((row) => row.id === selectedIssueId)) selectedIssueId = '';
    elements.scroll.scrollTop = 0; renderVisibleRows();
  }
  /** @returns {void} */
  function renderVisibleRows() {
    const visible = Math.max(12, Math.ceil((elements.scroll.clientHeight || 360) / ROW_HEIGHT) + 12);
    const start = Math.max(0, Math.floor(elements.scroll.scrollTop / ROW_HEIGHT) - 6);
    const slice = filteredRows.slice(start, start + visible).map((row) => ({ ...row, selected: row.id === selectedIssueId }));
    elements.spacer.style.height = `${filteredRows.length * ROW_HEIGHT}px`;
    elements.rows.style.transform = `translateY(${start * ROW_HEIGHT}px)`;
    elements.rows.innerHTML = slice.map(checkerIssueRowMarkup).join('');
  }
  /** @returns {void} */
  function updateSummary() {
    const status = (issue) => cleanText(reviewState.issueStates?.[issue.id]?.status) || 'OPEN';
    const open = report.issues.filter((issue) => status(issue) === 'OPEN');
    const summary = {
      ...report.summary, openCount: open.length, blockingCount: open.filter((row) => row.blocking).length,
      warningCount: open.filter((row) => row.severity === 'WARNING').length,
      autoApprovedCount: open.filter((row) => row.fixability === 'AUTO_APPROVED').length,
      needsConfirmationCount: open.filter((row) => row.fixability === 'NEEDS_CONFIRMATION').length,
      resolvedCount: report.issues.filter((row) => status(row) === 'RESOLVED').length,
      suppressedCount: report.issues.filter((row) => status(row) === 'SUPPRESSED').length,
    };
    elements.kpis.innerHTML = checkerKpiMarkup(summary); elements.buckets.innerHTML = checkerBucketMarkup(checkerCategoryCounts(rows), filters.category);
    elements.badge.textContent = String(summary.openCount); elements.badge.hidden = summary.openCount === 0;
    elements.launcher.classList.toggle('has-blockers', summary.blockingCount > 0);
  }
  /** @returns {void} */
  function renderFilterLists() {
    for (const field of ['severity', 'category', 'code', 'branch', 'objectType', 'confidence', 'fixability', 'status']) {
      renderCheckerFilterOptions(elements.panel.querySelector(`[data-ttv-checker-filter="${field}"]`), checkerFilterValues(rows, field), cleanText(filters[field]));
    }
    renderCheckerFilterOptions(elements.panel.querySelector('[data-ttv-checker-filter="baseline"]'), ['BASELINE', 'NEW'], cleanText(filters.baseline));
    elements.panel.querySelector('[data-ttv-checker-filter="search"]').value = cleanText(filters.search);
    elements.panel.querySelector('[data-ttv-checker-filter="selectedOnly"]').checked = filters.selectedOnly === true;
  }
  /** @returns {void} */
  function renderDetail() {
    const issue = rows.find((row) => row.id === selectedIssueId) ?? null;
    const suggestion = issue ? suggestions.find((row) => row.issueId === issue.id) ?? null : null;
    elements.detail.innerHTML = checkerDetailMarkup(issue, suggestion, issue?.status ?? '');
    clearTopologyCheckerOverlay(elements.workspace);
    if (issue) renderTopologyCheckerOverlay(elements.workspace, issue, suggestion);
  }
  /** @param {string} issueId @returns {void} */
  function selectIssue(issueId) {
    const issue = rows.find((row) => row.id === issueId); if (!issue) return;
    selectedIssueId = issue.id; renderVisibleRows(); renderDetail();
    const selection = checkerSelectionRows(canonical, issue); dependencies.select(selection); dependencies.focus(selection);
    announce(`${issue.code}: ${issue.message}`);
  }
  /** @param {string} name @param {unknown} value @returns {void} */
  function setFilter(name, value) {
    filters = { ...filters, [name]: name === 'selectedOnly' ? value === true : cleanText(value) };
    storage?.setItem(FILTER_KEY, JSON.stringify(filters)); applyFilters(); updateSummary(); renderDetail();
  }
  /** @param {string} status @returns {void} */
  function setReviewStatus(status) {
    const reason = status === 'SUPPRESSED' ? elements.panel.ownerDocument.defaultView?.prompt('Suppression reason (required):', '') : '';
    if (status === 'SUPPRESSED' && reason === null) return;
    reviewState = core.setTopologyIssueStatus(report, reviewState, selectedIssueId, status, reason ?? '');
    storage?.setItem(reviewKey(report.canonicalTopologyHash), JSON.stringify(reviewState));
    rebuildRows(new Set(rows.filter((row) => row.baselineState === 'BASELINE').map((row) => row.id)));
  }
  /** @param {Record<string,unknown>[]} selected @param {boolean} approvedOnly @returns {Promise<void>} */
  async function applySuggestions(selected, approvedOnly) {
    if (!selected.length) throw new Error('No executable topology fix matches the current selection.');
    if (!approvedOnly && selected.some((row) => row.fixability !== 'AUTO_APPROVED')) {
      const confirmed = elements.panel.ownerDocument.defaultView?.confirm('Apply this reviewed topology fix as one reversible Edit Draft transaction?');
      if (!confirmed) return;
    }
    await dependencies.applySuggestions(selected, approvedOnly); await refresh();
  }
  /** @returns {void} */
  function exportReport() {
    const payload = { ...report, reviewState, suggestions, filteredIssueIds: filteredRows.map((row) => row.id) };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
    const link = elements.panel.ownerDocument.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'topology-check-report.json'; link.click(); URL.revokeObjectURL(link.href);
  }
  /** @returns {Promise<void>} */
  async function open() { elements.panel.hidden = false; elements.launcher.setAttribute('aria-expanded', 'true'); if (!report || report.canonicalTopologyHash !== currentCanonical().canonicalTopologyHash) await refresh(); }
  /** @returns {void} */
  function close() { elements.panel.hidden = true; elements.launcher.setAttribute('aria-expanded', 'false'); clearTopologyCheckerOverlay(elements.workspace); }

  const onClick = (event) => handleClick(event).catch((error) => announce(`Checker error: ${error?.message || String(error)}`));
  const onChange = (event) => { const target = event.target.closest?.('[data-ttv-checker-filter]'); if (target) setFilter(target.dataset.ttvCheckerFilter, target.type === 'checkbox' ? target.checked : target.value); };
  const onInput = (event) => { if (event.target.matches?.('[data-ttv-checker-filter="search"]')) setFilter('search', event.target.value); };
  async function handleClick(event) {
    const target = event.target.closest?.('button'); if (!target) return;
    if (target === elements.launcher) { await open(); return; }
    if (target.matches('[data-ttv-checker-close]')) { close(); return; }
    if (target.matches('[data-ttv-checker-collapse]')) { layout.toggleCollapsed(); return; }
    if (target.dataset.ttvCheckerLayout) { target.dataset.ttvCheckerLayout === 'reset' ? layout.reset() : layout.setMode(target.dataset.ttvCheckerLayout); return; }
    if (target.dataset.ttvCheckerIssue) { selectIssue(target.dataset.ttvCheckerIssue); return; }
    if (target.dataset.ttvCheckerBucket) { setFilter('category', filters.category === target.dataset.ttvCheckerBucket ? '' : target.dataset.ttvCheckerBucket); renderFilterLists(); return; }
    if (target.matches('[data-ttv-checker-refresh]')) { await refresh(); return; }
    if (target.matches('[data-ttv-checker-apply-approved]')) { await applySuggestions(suggestions.filter((row) => row.approvedByDefault && row.operations?.length), true); return; }
    if (target.matches('[data-ttv-checker-apply-selected]')) {
      const selectedIds = new Set([...elements.panel.querySelectorAll('.ttv-checker-bulk-select:checked')].map(cb => cb.dataset.ttvCheckerBulkId));
      await applySuggestions(suggestions.filter((row) => selectedIds.has(row.issueId) && row.operations?.length), false);
      return;
    }
    if (target.dataset.ttvCheckerApply) { await applySuggestions(suggestions.filter((row) => row.id === target.dataset.ttvCheckerApply), false); return; }
    if (target.dataset.ttvCheckerStatus) { setReviewStatus(target.dataset.ttvCheckerStatus); return; }
    if (target.matches('[data-ttv-checker-export]')) exportReport();
  }

  elements.workspace.addEventListener('click', onClick); elements.panel.addEventListener('change', onChange);
  elements.panel.addEventListener('input', onInput); elements.scroll.addEventListener('scroll', renderVisibleRows);
  return Object.freeze({ open, close, refresh, selectIssue, evidence: () => Object.freeze({ report, suggestions, reviewState, filters, filteredCount: filteredRows.length }), destroy: () => {
    if (destroyed) return; destroyed = true; elements.workspace.removeEventListener('click', onClick); elements.panel.removeEventListener('change', onChange);
    elements.panel.removeEventListener('input', onInput); elements.scroll.removeEventListener('scroll', renderVisibleRows); layout.destroy(); clearTopologyCheckerOverlay(elements.workspace);
  } });
}

/** @param {Storage|null} storage @returns {Record<string,unknown>} */
function readFilters(storage) { const raw = storage?.getItem(FILTER_KEY); return raw ? { ...CHECKER_FILTER_DEFAULTS, ...JSON.parse(raw) } : { ...CHECKER_FILTER_DEFAULTS }; }
/** @param {string} hash @returns {string} */
function reviewKey(hash) { return `xml-compare.topology-checker.review.${cleanText(hash)}`; }
/** @param {Record<string,unknown>} canonical @returns {Readonly<Record<string,number>>} */
function checkerOptions(canonical) { return Object.freeze({ shortElementMm: 6, toleranceMm: Number(canonical.toleranceMm ?? 0.1), snapToleranceMm: 25, angleToleranceDeg: 5, originToleranceMm: 0.1, clearanceMm: 0 }); }

export const _test = Object.freeze({ FILTER_KEY, ROW_HEIGHT, readFilters, reviewKey, checkerOptions });

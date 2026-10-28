import { readPsMappingResult } from './ps-mapping-utility-tab-result-cache.js';
import { installPsMappingUtilityTile as installBasePsMappingUtilityTile } from './ps-mapping-utility-tab-tally-ui.js?v=20260612-psmap-compact-tally-ui-1';
import {
  DEFAULT_OPTIONS,
  runPsMappingResolver,
} from './ps-mapping-utility/ps-mapping-engine-diagnostics-v2.js?v=20260614-node-restraint-coverage-1';

const STORAGE_KEY = 'psmap.showDetailDiagnosticColumns';
const STYLE_ID = 'psmap-candidate-copy-ui-style';

// Engineering-first sequence shared by the on-screen candidate matrix and
// complete CSV/clipboard exports. The raw model support gap belongs to Table-2,
// not to Table-1's required gap or a derived numeric clearance.
const BASIC_COLUMNS = [
  ['supportNoModel', 'Model Support No'],
  ['candidateNode', 'Reference Node'],
  ['table1SupportNo', 'Reference Support No'],
  ['supportTypesRequested', 'Model Restraints'],
  ['t1NodeRestraints', 'Required at Node'],
  ['t2CoveredRestraints', 'Covered by Model'],
  ['nodeIsonote', 'Reference ISONOTE'],
  ['consolidatedNodeWiseAction', 'Node-wide Action (all mapped rows)'],
  ['missingNodeRestraints', 'Missing Restraints'],
  ['extraTable2Restraints', 'Extra Model Restraints'],
  ['supportMatch', 'Restraint Verdict'],
  ['supportGapRaw', 'Support Gap'],
  ['supportGapMatch', 'Gap / Clearance Verdict'],
  ['finalStatus', 'Mapping Status'],
  ['supportNoWiseAction', 'Required Model Action'],
  ['reason', 'Assessment / Evidence'],
  ['modelBore', 'Model Bore'],
  ['lineFamily', 'Model Line Family'],
  ['nodeLineFamily', 'Reference Line Family'],
];
const DETAIL_COLUMNS = [
  ['pipeSizeRaw', 'Reference Pipe Size'],
  ['derivedDn', 'Derived DN'],
  ['tag', 'Reference Tag'],
  ['source', 'Reference Source'],
  ['proposedMissingSupportPsNo', 'Proposed Missing Support No'],
  ['psBasis', 'Support Number Basis'],
  ['boreBasis', 'Bore Basis'],
  ['lineBasis', 'Line Comparison'],
  ['supportBasis', 'Restraint Comparison Basis'],
  ['lineRegexBasis', 'Model Regex Basis'],
  ['nodeLineRegexBasis', 'Reference Regex Basis'],
  ['nearDistance', 'Line Difference'],
  ['eligible', 'Passes Basic Checks'],
  ['autoSelectable', 'Auto-map Allowed'],
  ['reviewRequired', 'Needs Review'],
  ['selected', 'Chosen Mapping'],
  ['confidence', 'Confidence Level'],
  ['confidenceScore', 'Confidence /100'],
  ['score', 'Internal Rank'],
  ['warnings', 'Warnings'],
  ['reviewAction', 'Review Action'],
  ['nodeCoverageNote', 'Node Coverage Explanation'],
  ['nodeCoverageStatus', 'Node Coverage Status'],
  ['nodeComplianceStatus', 'Node Compliance Status'],
  ['table2SourceId', 'Model Table Source ID'],
  ['modelSourceId', 'Model Source ID'],
];
const candidateView = { page: 0, search: '', filter: 'all' };
const CANDIDATE_PAGE_SIZE = 100;
const installedPanels = new WeakSet();

const PRIMARY_KEYS = new Set([...BASIC_COLUMNS, ...DETAIL_COLUMNS].map(([key]) => key));
const EXPORT_EXCLUDE_KEYS = new Set(['rawColumns']);

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .psmap-candidate-copy-note{font-size:12px;color:#cbd5e1;border:1px solid rgba(148,163,184,.22);border-radius:10px;background:rgba(15,23,42,.62);padding:9px 11px;line-height:1.45;}
    .psmap-candidate-copy-note b{color:#bfdbfe;}
    .psmap-candidate-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:12px 0}
    .psmap-candidate-toolbar input,.psmap-candidate-toolbar select{padding:8px;border:1px solid #64748b;border-radius:7px;background:#0f172a;color:#f8fafc}
    .psmap-candidate-summary{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
    .psmap-candidate-summary span{padding:7px;border:1px solid #64748b;border-radius:7px;font-size:12px}
    .psmap-candidate-pager,.psmap-table-pager{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:8px 0;font-size:12px;color:#cbd5e1}
    .psmap-candidate-pager button:disabled,.psmap-table-pager button:disabled{opacity:.45;cursor:not-allowed}
    .psmap-candidate-legend{color:#cbd5e1;font-size:12px;line-height:1.5}
    .psmap-candidate-verdict{display:inline-block;border-radius:5px;padding:3px 6px;background:rgba(100,116,139,.2);white-space:normal}
    .psmap-candidate-verdict.good{background:rgba(16,185,129,.12);color:#86efac}
    .psmap-candidate-verdict.warn{background:rgba(245,158,11,.14);color:#fcd34d}
    [data-psmap-candidate-table] td{vertical-align:top;line-height:1.45}
    [data-psmap-candidate-table] td:nth-child(8),[data-psmap-candidate-table] td:nth-child(15),[data-psmap-candidate-table] td:nth-child(16){min-width:200px;max-width:360px;white-space:normal}
    [data-psmap-candidate-table] tr.psmap-candidate-review td:first-child{box-shadow:inset 3px 0 #d97706}
  `;
  document.head.appendChild(style);
}

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function displayList(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

function readShowDetails() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function writeShowDetails(value) {
  try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch {}
}

function boolLabel(value) {
  if (value === true) return 'YES';
  if (value === false) return 'NO';
  const text = String(value ?? '').trim();
  if (/^(true|false)$/i.test(text)) return /^true$/i.test(text) ? 'YES' : 'NO';
  return text;
}

function lineBasisLabel(value) {
  const text = String(value ?? '').trim();
  if (text === 'LINE_EXACT') return 'Full Line Exact';
  if (text === 'LINE_FAMILY') return 'Line Family Exact';
  if (text === 'LINE_FAMILY_NEAR_MISMATCH') return 'Near Line Review';
  if (text === 'LINE_CONFLICT') return 'Line Conflict';
  if (text === 'LINE_MISSING') return 'Line Missing';
  return text;
}

function supportGapValue(row = {}) {
  return row.supportGapMatch || row.gapMatch || row.supportGapBasis || '';
}

function valueFor(row = {}, key) {
  // Never show Table-1 required gap/clearance as the physical model gap.
  // If a Table-2 row left this field blank, it must stay blank.
  if (key === 'supportGapRaw') return row.supportGapRaw ?? '';
  if (key === 'supportGapMatch') return supportGapValue(row);
  if (key === 'lineBasis') return lineBasisLabel(row.lineBasis);
  if (['eligible', 'autoSelectable', 'reviewRequired', 'selected'].includes(key)) return boolLabel(row[key]);
  return displayList(row[key]);
}

function sourceValue(modal, key) {
  return modal?.querySelector?.(`[data-psmap-source="${key}"]`)?.value || '';
}

function collectInputFromModal(modal) {
  return {
    table1PsNodeText: sourceValue(modal, 'table1Text'),
    table1aNodeDiaText: sourceValue(modal, 'table1AText'),
    table1bNodeLineText: sourceValue(modal, 'table1BText'),
    table1cNodeIsonoteText: sourceValue(modal, 'table1CText'),
    table1dKeywordText: sourceValue(modal, 'table1DText'),
    table2ModelText: sourceValue(modal, 'table2Text'),
  };
}

function parseOptionsFromModal(modal) {
  const options = { ...DEFAULT_OPTIONS };
  for (const input of modal?.querySelectorAll?.('[data-psmap-setup]') || []) {
    const key = input.dataset.psmapSetup;
    if (!key) continue;
    if (input.type === 'checkbox') options[key] = input.checked;
    else if (input.type === 'number') options[key] = Number(input.value);
    else if (key === 'requireLineFamilyInIdentity') options[key] = input.value !== 'false';
    else options[key] = input.value;
  }
  return options;
}

function resolveCurrent() {
  return readPsMappingResult();
}

function visibleCandidateColumns(showDetails = readShowDetails()) {
  return showDetails ? [...BASIC_COLUMNS, ...DETAIL_COLUMNS] : BASIC_COLUMNS;
}

function exportCandidateColumns(rows = []) {
  const columns = [...BASIC_COLUMNS, ...DETAIL_COLUMNS];
  const seen = new Set(columns.map(([key]) => key));
  const extra = [];
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (seen.has(key) || EXPORT_EXCLUDE_KEYS.has(key)) continue;
      seen.add(key);
      extra.push([key, key]);
    }
  }
  extra.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  return [...columns, ...extra];
}

function rowsToCsv(rows = [], columns = []) {
  return [
    columns.map(([, label]) => csvEscape(label)).join(','),
    ...rows.map((row) => columns.map(([key]) => csvEscape(valueFor(row, key))).join(',')),
  ].join('\n');
}

function filteredCandidates(rows) {
  let result = rows;
  if (candidateView.filter === 'review') result = result.filter((row) => row.reviewRequired === true || row.finalStatus === 'USER_REVIEW_REQUIRED');
  if (candidateView.filter === 'restraints') result = result.filter((row) => String(row.missingNodeRestraints || '').trim() || String(row.extraTable2Restraints || '').trim());
  if (candidateView.filter === 'gaps') result = result.filter((row) => /CONFLICT|MISSING_/i.test(supportGapValue(row)));
  const query = candidateView.search.trim().toUpperCase();
  if (query) {
    const fields = ['supportNoModel', 'psnoModel', 'table1SupportNo', 'table1PsNo', 'candidateNode', 'nodeIsonote', 'supportTypesRequested', 'supportGapRaw', 'supportMatch', 'supportGapMatch', 'supportNoWiseAction', 'modelSourceId'];
    result = result.filter((row) => fields.some((key) => String(valueFor(row, key) || '').toUpperCase().includes(query)));
  }
  return result;
}

function readableCandidateValue(row, key) {
  const raw = String(valueFor(row, key) ?? '').trim();
  if (!raw) return '—';
  if (key === 'finalStatus') {
    const names = { MATCHED: 'Mapped', USER_REVIEW_REQUIRED: 'Review required', SUPPORT_MISSING_REQUIRED: 'Required support missing', NO_MATCH: 'No match' };
    return names[raw] || raw.replace(/_/g, ' ').toLowerCase();
  }
  if (key === 'supportGapMatch' && /^(REST_CLEARANCE|GUIDE_GAP|LINE_STOP_GAP|GAP)_/.test(raw)) {
    const words = raw
      .replace(/^REST_CLEARANCE_/, 'REST clearance · ')
      .replace(/^GUIDE_GAP_/, 'GUIDE gap · ')
      .replace(/^LINE_STOP_GAP_/, 'LINE STOP gap · ')
      .replace(/^GAP_/, 'Gap · ')
      .replace(/MISSING_TABLE1/, 'not specified in reference')
      .replace(/MISSING_TABLE2/, 'value missing in model')
      .replace(/CONFLICT/, 'different values')
      .replace(/EXACT/, 'matches')
      .replace(/_/g, ' ');
    return words;
  }
  return raw;
}

function candidateCell(row, key) {
  const value = readableCandidateValue(row, key);
  if (['finalStatus', 'supportGapMatch', 'supportMatch'].includes(key)) {
    const upper = String(value).toUpperCase();
    const severity = /CONFLICT|DIFFERENT VALUES|MISSING|REVIEW|NO MATCH/.test(upper) ? 'warn'
      : /EXACT|MATCH|MAPPED/.test(upper) ? 'good' : '';
    return '<td><span class="psmap-candidate-verdict ' + severity + '">' + html(value) + '</span></td>';
  }
  return '<td>' + html(value) + '</td>';
}

function candidateTable(rows = [], columns = []) {
  if (!rows.length) return '<div class="psmap-banner">No candidates match this filter. Try All candidates or a different search.</div>';
  const header = columns.map((column) => '<th scope="col">' + html(column[1]) + '</th>').join('');
  const body = rows.map((row) => '<tr' + (row.reviewRequired === true || row.finalStatus === 'USER_REVIEW_REQUIRED' ? ' class="psmap-candidate-review"' : '') + '>' + columns.map((column) => candidateCell(row, column[0])).join('') + '</tr>').join('');
  return '<div class="psmap-tablewrap"><table class="psmap-table"><thead><tr class="psmap-labels">' + header + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

function renderCandidatePage(panel, result) {
  const all = result?.candidates || result?.candidateRows || [];
  const filtered = filteredCandidates(all);
  const pages = Math.max(1, Math.ceil(filtered.length / CANDIDATE_PAGE_SIZE));
  candidateView.page = Math.max(0, Math.min(pages - 1, candidateView.page));
  const start = candidateView.page * CANDIDATE_PAGE_SIZE;
  const visible = filtered.slice(start, start + CANDIDATE_PAGE_SIZE);
  const host = panel.querySelector('[data-psmap-candidate-table]');
  if (host) host.innerHTML = candidateTable(visible, visibleCandidateColumns());
  const count = panel.querySelector('[data-psmap-candidate-count]');
  if (count) count.textContent = (filtered.length ? 'Showing ' + (start + 1) + '–' + (start + visible.length) + ' of ' + filtered.length.toLocaleString() : 'No matching rows') + ' · ' + all.length.toLocaleString() + ' total candidates';
  const prev = panel.querySelector('[data-psmap-candidate-prev]');
  const next = panel.querySelector('[data-psmap-candidate-next]');
  if (prev) prev.disabled = candidateView.page === 0;
  if (next) next.disabled = candidateView.page + 1 >= pages;
  const label = panel.querySelector('[data-psmap-candidate-page]');
  if (label) label.textContent = 'Page ' + (candidateView.page + 1) + ' of ' + pages;
}

function renderCandidatePanel(panel, result) {
  if (!panel) return;
  ensureStyle();
  const rows = result?.candidates || result?.candidateRows || [];
  const reviews = rows.filter((row) => row.reviewRequired === true || row.finalStatus === 'USER_REVIEW_REQUIRED').length;
  const gaps = rows.filter((row) => /CONFLICT|MISSING_/i.test(supportGapValue(row))).length;
  const missing = rows.filter((row) => String(row.missingNodeRestraints || '').trim()).length;
  const filterOptions = [
    ['all', 'All candidates'],
    ['review', 'Requires review'],
    ['restraints', 'Missing / extra restraints'],
    ['gaps', 'Gap / clearance issues'],
  ];
  panel.innerHTML = '<section class="psmap-card">' +
    '<div class="psmap-card-head"><div><b>Candidate Matrix</b><div class="psmap-candidate-legend">Proposed model-to-reference pairings · Not every candidate is an approved mapping</div></div>' +
    '<div class="psmap-actions"><button type="button" class="psmap-btn secondary" data-psmap-action="copyCandidates">Copy CSV</button> ' +
    '<button type="button" class="psmap-btn" data-psmap-action="exportCandidatesCsv">Export all candidates (CSV)</button></div></div>' +
    '<div class="psmap-card-body">' +
    '<div class="psmap-candidate-summary"><span>Total candidates <b>' + rows.length.toLocaleString() + '</b></span><span>Needs review <b>' + reviews.toLocaleString() + '</b></span><span>Gap / clearance issues <b>' + gaps.toLocaleString() + '</b></span><span>Rows with missing restraints <b>' + missing.toLocaleString() + '</b></span></div>' +
    '<p class="psmap-candidate-legend"><b>How to read:</b> Required at Node comes from Table-1. Covered by Model summarizes model restraints at that node. The Restraint Verdict applies to this candidate; Gap / Clearance Verdict is restraint-type specific. Support Gap is copied verbatim from that Table-2 component; it is not the Table-1 requirement. REST_CLEARANCE refers to DO NOT REST non-contact clearance, not an active REST restraint. Required Model Action is row-specific; Node-wide Action summarizes all mapped rows.</p>' +
    '<div class="psmap-candidate-toolbar"><label>Find support or node <input type="search" data-psmap-candidate-search value="' + html(candidateView.search) + '" placeholder="Support No, node, keyword"></label>' +
    '<button type="button" class="psmap-btn secondary" data-psmap-candidate-apply>Search</button>' +
    '<label>Show <select data-psmap-candidate-filter>' + filterOptions.map((item) => '<option value="' + item[0] + '"' + (candidateView.filter === item[0] ? ' selected' : '') + '>' + item[1] + '</option>').join('') + '</select></label>' +
    '<label data-psmap-candidate-detail-toggle="1"><input type="checkbox" data-psmap-candidate-detail-checkbox ' + (readShowDetails() ? 'checked' : '') + '> Show detail diagnostic columns</label></div>' +
    '<div class="psmap-candidate-pager"><span data-psmap-candidate-count></span><div><button type="button" class="psmap-btn secondary" data-psmap-candidate-prev>Previous</button> <span data-psmap-candidate-page></span> <button type="button" class="psmap-btn secondary" data-psmap-candidate-next>Next</button></div></div>' +
    '<div data-psmap-candidate-table></div><p class="psmap-candidate-legend">Up to 100 rows per page. Export all candidates (CSV) includes the entire result and all diagnostic fields, not just this page.</p>' +
    '</div></section>';
  renderCandidatePage(panel, result);
  if (installedPanels.has(panel)) return;
  installedPanels.add(panel);
  function applySearch() {
    candidateView.search = panel.querySelector('[data-psmap-candidate-search]')?.value || '';
    candidateView.page = 0;
    renderCandidatePage(panel, readPsMappingResult());
  }
  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-psmap-candidate-apply]')) applySearch();
    if (event.target.closest('[data-psmap-candidate-prev]')) {
      candidateView.page = Math.max(0, candidateView.page - 1);
      renderCandidatePage(panel, readPsMappingResult());
    }
    if (event.target.closest('[data-psmap-candidate-next]')) {
      candidateView.page += 1;
      renderCandidatePage(panel, readPsMappingResult());
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('[data-psmap-candidate-search]')) { event.preventDefault(); applySearch(); }
  });
  panel.addEventListener('change', (event) => {
    if (event.target.matches('[data-psmap-candidate-filter]')) {
      candidateView.filter = event.target.value;
      candidateView.page = 0;
      renderCandidatePage(panel, readPsMappingResult());
    }
    if (event.target.matches('[data-psmap-candidate-detail-checkbox]')) {
      writeShowDetails(event.target.checked);
      renderCandidatePage(panel, readPsMappingResult());
    }
  });
}

function enhanceCandidatePanel() {
  const modal = document.querySelector('[data-psmap-modal]');
  const panel = modal?.querySelector?.('[data-psmap-panel="candidates"].active');
  if (!modal || !panel) return;
  try { renderCandidatePanel(panel, resolveCurrent()); }
  catch (error) { console.warn('[psmap] candidate enhancement failed', error); }
}

let enhanceQueued = false;
function scheduleEnhance() {
  if (enhanceQueued) return;
  enhanceQueued = true;
  requestAnimationFrame(() => setTimeout(() => {
    enhanceQueued = false;
    enhanceCandidatePanel();
  }, 0));
}

function currentRows() {
  const result = resolveCurrent();
  return result?.candidates || result?.candidateRows || [];
}

async function copyCurrentCandidates(event, ctx = {}) {
  if (!document.querySelector('[data-psmap-modal]')) return;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  try {
    const rows = currentRows();
    if (!rows.length) { ctx.showToast?.('Run Mapping before copying candidates.', 'warning'); return; }
    await navigator.clipboard.writeText(rowsToCsv(rows, exportCandidateColumns(rows)));
    ctx.showToast?.('Copied all ' + rows.length.toLocaleString() + ' candidates.', 'success');
  } catch (error) { ctx.showToast?.('Copy failed: ' + (error?.message || error), 'error'); }
}

async function exportCandidatesCsv(event, ctx = {}) {
  if (!document.querySelector('[data-psmap-modal]')) return;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  try {
    const rows = currentRows();
    if (!rows.length) { ctx.showToast?.('Run Mapping before exporting candidates.', 'warning'); return; }
    const columns = exportCandidateColumns(rows);
    const parts = [columns.map((col) => csvEscape(col[1])).join(',')];
    // Yield every 250 records, keeping CSV generation responsive for large exports.
    for (let i = 0; i < rows.length; i += 250) {
      parts.push(rows.slice(i, i + 250).map((row) => columns.map((col) => csvEscape(valueFor(row, col[0]))).join(',')).join('\r\n'));
      if (i + 250 < rows.length) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const blob = new Blob([parts.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ps-mapping-candidates-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ctx.showToast?.('Downloaded all ' + rows.length.toLocaleString() + ' candidates as CSV.', 'success');
  } catch (error) { ctx.showToast?.('CSV export failed: ' + (error?.message || error), 'error'); }
}

export function installPsMappingUtilityTile(container, ctx = {}) {
  const destroyBase = installBasePsMappingUtilityTile(container, ctx);
  const clickHandler = (event) => {
    const action = event.target?.closest?.('[data-psmap-action]')?.dataset?.psmapAction;
    if (action === 'copyCandidates') {
      copyCurrentCandidates(event, ctx);
      return;
    }
    if (action === 'exportCandidatesCsv') {
      exportCandidatesCsv(event, ctx);
      return;
    }
    const tab = event.target?.closest?.('[data-psmap-tab]')?.dataset?.psmapTab;
    if (action === 'open' || tab === 'candidates') scheduleEnhance();
  };
  document.addEventListener('click', clickHandler, true);
  scheduleEnhance();
  return () => {
    document.removeEventListener('click', clickHandler, true);
    if (typeof destroyBase === 'function') destroyBase();
  };
}

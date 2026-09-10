import {
  SUPPORT_REPORT_COLUMNS,
  supportReportColumnValue,
} from './support-report-contract.js?v=20260910-support-report-owner-contract-15';
import { supportReportCompleteness } from './support-report-ui-state.js?v=20260910-support-report-ui-completeness-16';

export function renderSupportReportWorkspace(report) {
  if (!report) return '<div class="ssrb-empty"><b>Support Report not built</b><span>Load Support Report clash XML, then build the report. Build Relationships first when a combined staged model is available to enrich complete member lists and native attributes.</span></div>';
  const summary = report.summary || {};
  return `<div class="ssrb-report-summary">${summaryCard('Clash evidence', summary.clashEvidenceCount)}${summaryCard('Report rows', summary.reportRowCount)}${summaryCard('Secondary families', summary.secondarySupportFamilyCount)}${summaryCard('Enriched rows', summary.enrichedRowCount)}${summaryCard('XML-only rows', summary.xmlOnlyRowCount)}${summaryCard('Native-only members recovered', summary.nativeOnlyMemberCount)}</div>${renderSupportReportCompleteness(report)}${renderSupportReportTable(report)}${renderSupportReportDiagnostics(report)}`;
}

export function renderSupportReportCompleteness(report) {
  const completeness = supportReportCompleteness(report);
  if (completeness.partial) {
    const rows = completeness.xmlOnlyRowCount === 1 ? 'row remains' : 'rows remain';
    return `<div class="ssrb-scope-note" data-ssr-completeness="partial"><b>Partial enrichment:</b> ${completeness.xmlOnlyRowCount} report ${rows} XML-only. Export is allowed for evidence review; unresolved native members or attributes are not complete engineering output.</div>`;
  }
  return '<div class="ssrb-scope-note" data-ssr-completeness="no-xml-only-rows"><b>Enrichment status:</b> no XML-only report rows remain in this bundle.</div>';
}

export function renderSupportReportTable(report) {
  const rows = report?.rows || [];
  if (!rows.length) return '<div class="ssrb-empty">No Support Report rows available.</div>';
  const headers = SUPPORT_REPORT_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => `<tr>${SUPPORT_REPORT_COLUMNS.map((column) => `<td>${escapeHtml(displayValue(supportReportColumnValue(row, column)))}</td>`).join('')}</tr>`).join('');
  return `<div class="ssrb-table-wrap"><table class="ssrb-table ssrb-report-table"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function renderSupportReportDiagnostics(report) {
  const diagnostics = report?.diagnostics || [];
  if (!diagnostics.length) return '<div class="ssrb-scope-note"><b>Support Report diagnostics:</b> no report-specific exceptions.</div>';
  const counts = diagnostics.reduce((acc, row) => {
    const key = String(row.severity || 'INFO').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return `<div class="ssrb-scope-note"><b>Support Report diagnostics:</b> ${counts.ERROR || 0} error · ${counts.WARN || counts.WARNING || 0} warn · ${counts.INFO || 0} info</div><div class="ssrb-diagnostic-list">${diagnostics.slice(0, 40).map((row) => `<div><b>${escapeHtml(row.code || row.severity || 'INFO')}</b><span>${escapeHtml(row.message || '')}</span></div>`).join('')}</div>`;
}

function summaryCard(label, value) {
  return `<div class="ssrb-summary-card"><span>${escapeHtml(label)}</span><strong>${Number(value || 0)}</strong></div>`;
}
function displayValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

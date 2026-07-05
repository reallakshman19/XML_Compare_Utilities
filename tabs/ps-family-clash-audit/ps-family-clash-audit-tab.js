import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderSummary(audit) {
  if (!audit) return '<div class="psmap-help-text">Load inputs and run audit.</div>';
  const s = audit.summary;
  return `<div class="psmap-grid-2">
    <div><b>Source family</b><br>${h(s.sourceFamily)}</div>
    <div><b>Coverage</b><br>${h(s.coveragePct)}%</div>
    <div><b>Expected / Found / Missing</b><br>${s.expectedCount} / ${s.foundExactCount} / ${s.missingCount}</div>
    <div><b>Out-of-family / Duplicate / POSFamily</b><br>${s.outOfFamilyCount} / ${s.duplicateMemberCount} / ${s.posFamilyCount}</div>
  </div>`;
}

function renderTable(headers, rows, limit = 50) {
  const shown = rows.slice(0, limit);
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr>${headers.map((item) => `<th>${h(item.label)}</th>`).join('')}</tr></thead><tbody>${shown.map((row) => `<tr>${headers.map((item) => `<td>${h(item.value(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length > limit ? `<div class="psmap-help-text">Showing first ${limit} of ${rows.length} rows.</div>` : ''}</div>`;
}

function renderReports(audit) {
  if (!audit) return '';
  return `<div class="psmap-card"><div class="psmap-card-head"><b>Coverage</b></div>${renderTable([
    { label: 'Expected Member', value: (row) => row.expectedMember },
    { label: 'Status', value: (row) => row.status },
    { label: 'Clashes', value: (row) => row.clashNames.join(', ') },
    { label: 'POSFamily', value: (row) => row.posFamilyId },
    { label: 'Line Family', value: (row) => row.lineFamily || row.lineFamilies.join(', ') },
    { label: 'Pipe', value: (row) => row.pipe || row.fullLineTags.join(', ') },
  ], audit.coverageRows)}</div>
  <div class="psmap-card"><div class="psmap-card-head"><b>Source vs POSFamily Count</b></div>${renderTable([
    { label: 'Source', value: (row) => row.source },
    { label: 'POSFamily Count', value: (row) => row.posFamilyCount },
    { label: 'Element Count', value: (row) => row.elementCount },
    { label: 'Clash Count', value: (row) => row.clashCount },
    { label: 'Line Families', value: (row) => row.lineFamilies.join(', ') },
  ], audit.sourceVsPosFamilyRows)}</div>`;
}

export function installPsFamilyClashAuditTile(container) {
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-ps-family-clash-audit]')) return null;
  let audit = null;
  const host = document.createElement('section');
  host.className = 'psmap-card';
  host.setAttribute('data-ps-family-clash-audit', '1');
  host.innerHTML = `<div class="psmap-card-head"><b>PS Family Clash Audit</b></div>
    <div class="psmap-card-body">
      <div class="psmap-help-text">Clash XML + expected PS CSV + element-detail CSV → missing/out-of-family/duplicate/POSFamily reports.</div>
      <div class="psmap-grid-2">
        <label>Clash XML<textarea data-psfa="xml" rows="5" placeholder="Paste Navis clash XML"></textarea></label>
        <label>Expected PS CSV<textarea data-psfa="expected" rows="5" placeholder="Paste Item Name CSV"></textarea></label>
        <label>Element Detail CSV<textarea data-psfa="details" rows="5" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label>
        <label>POS tolerance mm<input data-psfa="tolerance" type="number" value="25" min="0" step="0.001"></label>
      </div>
      <div class="psmap-actions"><button type="button" data-psfa="run">Run Audit</button><button type="button" data-psfa="coverage">Export Coverage CSV</button><button type="button" data-psfa="json">Export JSON</button></div>
      <div data-psfa="summary"></div>
      <div data-psfa="reports"></div>
    </div>`;
  utilitiesRoot.appendChild(host);

  const get = (name) => host.querySelector(`[data-psfa="${name}"]`);
  const render = () => {
    get('summary').innerHTML = renderSummary(audit);
    get('reports').innerHTML = renderReports(audit);
  };

  get('run').addEventListener('click', () => {
    const xml = parsePsFamilyClashXml(get('xml').value);
    const expected = parsePsFamilyRegisterCsv(get('expected').value);
    const details = parsePsFamilyElementDetailCsv(get('details').value);
    const pos = buildPsFamilyPosFamilies(details.rows, { toleranceMm: Number(get('tolerance').value) || 25 });
    audit = buildPsFamilyClashAudit({
      clashRows: xml.rows,
      expectedRows: expected.rows,
      elementDetailRows: pos.rows,
      posFamilies: pos.posFamilies,
      diagnostics: [...xml.diagnostics, ...expected.diagnostics, ...details.diagnostics, ...pos.diagnostics],
    });
    render();
  });
  get('coverage').addEventListener('click', () => { if (audit) downloadText(`ps-family-clash-coverage-${audit.summary.sourceFamily || 'audit'}.csv`, createPsFamilyAuditExports(audit).coverageCsv, 'text/csv'); });
  get('json').addEventListener('click', () => { if (audit) downloadText(`ps-family-clash-audit-${audit.summary.sourceFamily || 'audit'}.json`, createPsFamilyAuditExports(audit).auditJson, 'application/json'); });
  render();
  return () => host.remove();
}

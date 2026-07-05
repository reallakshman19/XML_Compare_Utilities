import { parsePsFamilyClashXml } from './ps-family-clash-xml-parser.js';
import { parsePsFamilyRegisterCsv } from './ps-family-register-csv-parser.js';
import { parsePsFamilyElementDetailCsv } from './ps-family-element-detail-csv-parser.js';
import { buildPsFamilyPosFamilies } from './ps-family-posfamily-engine.js';
import { buildPsFamilyClashAudit } from './ps-family-clash-audit-engine.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';
import { renderPsFamilyReports, renderPsFamilySummary } from './ps-family-clash-audit-view.js';

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeSource(audit) {
  return audit?.summary?.sourceFamily || 'audit';
}

function renderInputShell() {
  return `<div class="psmap-card-head"><b>PS Family Clash Audit</b></div>
    <div class="psmap-card-body">
      <div class="psmap-help-text">Clash XML + expected PS CSV + element-detail CSV → coverage, missing, out-of-family, duplicate, line-family, POSFamily, and Source-vs-POSFamily reports.</div>
      <div class="psmap-grid-2">
        <label>Clash XML<textarea data-psfa="xml" rows="5" placeholder="Paste Navis clash XML"></textarea></label>
        <label>Expected PS CSV<textarea data-psfa="expected" rows="5" placeholder="Paste Item Name CSV"></textarea></label>
        <label>Element Detail CSV<textarea data-psfa="details" rows="5" placeholder="Paste Name/p1bore/pipe/Position CSV"></textarea></label>
        <label>POS tolerance mm<input data-psfa="tolerance" type="number" value="25" min="0" step="0.001"></label>
      </div>
      <div class="psmap-actions">
        <button type="button" data-psfa="run">Run Audit</button>
        <button type="button" data-psfa="coverage">Coverage CSV</button>
        <button type="button" data-psfa="clash">Clash Rows CSV</button>
        <button type="button" data-psfa="source-pos">Source vs POSFamily CSV</button>
        <button type="button" data-psfa="all-json">Audit JSON</button>
      </div>
      <div data-psfa="summary"></div>
      <div data-psfa="reports"></div>
    </div>`;
}

export function installPsFamilyClashAuditTile(container) {
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-ps-family-clash-audit]')) return null;
  let audit = null;
  const host = document.createElement('section');
  host.className = 'psmap-card';
  host.setAttribute('data-ps-family-clash-audit', '1');
  host.innerHTML = renderInputShell();
  utilitiesRoot.appendChild(host);

  const get = (name) => host.querySelector(`[data-psfa="${name}"]`);
  const render = () => {
    get('summary').innerHTML = renderPsFamilySummary(audit);
    get('reports').innerHTML = renderPsFamilyReports(audit);
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
  get('coverage').addEventListener('click', () => { if (audit) downloadText(`ps-family-clash-coverage-${safeSource(audit)}.csv`, createPsFamilyAuditExports(audit).coverageCsv, 'text/csv'); });
  get('clash').addEventListener('click', () => { if (audit) downloadText(`ps-family-clash-rows-${safeSource(audit)}.csv`, createPsFamilyAuditExports(audit).clashRowsCsv, 'text/csv'); });
  get('source-pos').addEventListener('click', () => { if (audit) downloadText(`ps-family-source-vs-posfamily-${safeSource(audit)}.csv`, createPsFamilyAuditExports(audit).sourceVsPosFamilyCsv, 'text/csv'); });
  get('all-json').addEventListener('click', () => { if (audit) downloadText(`ps-family-clash-audit-${safeSource(audit)}.json`, createPsFamilyAuditExports(audit).auditJson, 'application/json'); });
  render();
  return () => host.remove();
}

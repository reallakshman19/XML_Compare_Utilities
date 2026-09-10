import { runSupportRevisionCompare, SUPPORT_REVISION_WORKFLOW_STAGES } from './support-revision-engine.js';
import { supportRevisionToXlsxBytes } from './support-revision-export.js';

export function installCsvRevCompareTile(container, context = {}) {
  if (container.querySelector('[data-csv-rev-compare-open]')) return () => {};
  const doc = container.ownerDocument;
  const tile = doc.createElement('button');
  tile.type = 'button';
  tile.className = 'psmap-card psmap-tile';
  tile.setAttribute('data-csv-rev-compare-open', '1');
  tile.innerHTML = '<span class="revc-launcher-icon">CSV↔XML</span><b>CSV Rev Compare (XML Based)</b><span>Compare two Support Report revisions through governed categorized XML</span>';
  container.appendChild(tile);
  let overlay = null;
  const open = () => {
    if (overlay) return;
    overlay = mountWorkspace(doc, context, () => { overlay?.remove(); overlay = null; });
  };
  tile.addEventListener('click', open);
  return () => { tile.removeEventListener('click', open); overlay?.remove(); overlay = null; tile.remove(); };
}

function mountWorkspace(doc, context, close) {
  const overlay = doc.createElement('div');
  overlay.className = 'revc-backdrop';
  overlay.setAttribute('data-csv-rev-compare-workspace', '1');
  overlay.innerHTML = workspaceHtml();
  doc.body.appendChild(overlay);
  const q = (selector) => overlay.querySelector(selector);
  const rev1 = q('[data-csvrc-rev="1"]'), rev2 = q('[data-csvrc-rev="2"]');
  const runButton = q('[data-csvrc-run]'), status = q('[data-csvrc-status]');
  const preview = q('[data-csvrc-preview]'), diagnostics = q('[data-csvrc-diagnostics]'), review = q('[data-csvrc-review]');
  let result = null;
  const setFromFile = async (input, area) => { const file = input.files?.[0]; if (file) area.value = await file.text(); };
  q('[data-csvrc-file="1"]').addEventListener('change', (event) => setFromFile(event.currentTarget, rev1));
  q('[data-csvrc-file="2"]').addEventListener('change', (event) => setFromFile(event.currentTarget, rev2));
  q('[data-csvrc-close]').addEventListener('click', close);
  runButton.addEventListener('click', () => {
    result = runSupportRevisionCompare(rev1.value, rev2.value);
    renderResult(result, { status, preview, diagnostics, review, root: overlay });
    context.showToast?.(result.ok ? 'XML-based revision comparison ready.' : result.stage === 'REVIEW_REQUIRED' ? 'Ambiguous lineage requires review.' : 'Revision conversion is blocked.');
  });
  overlay.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-csvrc-download]');
    if (!button || !result) return;
    const kind = button.dataset.csvrcDownload;
    if (kind === 'xlsx') {
      if (!result.output) return;
      const bytes = await supportRevisionToXlsxBytes(result);
      downloadBlob(doc, 'support-revision-compare.xlsx', bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return;
    }
    const artifact = artifactFor(result, kind);
    if (artifact) downloadBlob(doc, artifact.name, artifact.text, artifact.type);
  });
  return overlay;
}

function workspaceHtml() {
  return `<section class="revc-shell" style="width:min(1500px,96vw);height:min(94vh,1000px);overflow:auto;background:var(--panel,#fff);margin:2vh auto;padding:18px;border-radius:12px">
    <header style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start"><div><h2>CSV Rev Compare (XML Based)</h2><p>CSV is ingress/egress. Categorized XML and its graph are the comparison authority.</p></div><button type="button" data-csvrc-close>Close</button></header>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${revisionInputHtml(1, 'REVISION 1 / EARLIER')}${revisionInputHtml(2, 'REVISION 2 / LATER')}
    </div>
    <details open><summary><b>Workflow</b></summary><ol>${SUPPORT_REVISION_WORKFLOW_STAGES.map((stage, index) => `<li data-csvrc-stage="${index + 1}">${stage}</li>`).join('')}</ol></details>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" data-csvrc-run><b>Run XML-based Rev Compare</b></button><span data-csvrc-status>Load both revisions to begin.</span></div>
    <section><h3>Conversion diagnostics / candidate review</h3><pre data-csvrc-diagnostics style="max-height:220px;overflow:auto;white-space:pre-wrap"></pre><div data-csvrc-review></div></section>
    <section><h3>Revision output preview</h3><div data-csvrc-preview style="max-height:320px;overflow:auto"></div></section>
    <section><h3>Exports</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
      <button data-csvrc-download="csv" disabled>CSV</button><button data-csvrc-download="xlsx" disabled>XLSX</button><button data-csvrc-download="audit" disabled>Comparison audit JSON</button><button data-csvrc-download="rev1xml" disabled>REV1 XML</button><button data-csvrc-download="rev2xml" disabled>REV2 XML</button><button data-csvrc-download="rev1graph" disabled>REV1 graph</button><button data-csvrc-download="rev2graph" disabled>REV2 graph</button><button data-csvrc-download="profile" disabled>Profile JSON</button>
    </div></section>
  </section>`;
}
function revisionInputHtml(number, label) { return `<section><h3>${label}</h3><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" data-csvrc-file="${number}"><textarea data-csvrc-rev="${number}" rows="13" style="width:100%;font-family:monospace" placeholder="Paste CSV, TSV, or another table format supported by Table-to-Categorized-XML"></textarea></section>`; }

function renderResult(result, ui) {
  const conversionErrors = result.pair?.diagnostics || result.diagnostics || [];
  ui.diagnostics.textContent = JSON.stringify(conversionErrors, null, 2);
  if (!result.pair?.ok) {
    ui.status.textContent = 'Conversion blocked. Inspect schema/diagnostics.';
    ui.preview.innerHTML = '';
    setDownloads(ui.root, false, true);
    return;
  }
  ui.status.textContent = result.stage === 'REVIEW_REQUIRED' ? `${result.lineage.ambiguous.length} ambiguous candidate(s) require review; automatic output is not qualified.` : `${result.ledger.events.length} structured event(s); output ready.`;
  ui.review.innerHTML = result.lineage.ambiguous.length ? candidateReviewHtml(result.lineage) : '<p>No ambiguous lineage candidates.</p>';
  ui.preview.innerHTML = outputTableHtml(result.output);
  setDownloads(ui.root, true, false);
}
function candidateReviewHtml(lineage) {
  const rows = lineage.candidates.filter((item) => item.outcome === 'AMBIGUOUS');
  return `<p><b>Ambiguous lineage is never auto-selected.</b> Candidate evidence is retained in the audit for explicit disposition.</p><table><thead><tr><th>Source XML node</th><th>Target XML node</th><th>Score</th><th>Method</th><th>Reasons</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.sourceNodeId)}</td><td>${h(row.targetNodeId)}</td><td>${h(row.score)}</td><td>${h(row.matchingMethod)}</td><td>${h(row.reasonCodes.join(', '))}</td></tr>`).join('')}</tbody></table>`;
}
function outputTableHtml(output) {
  const rows = output?.rows?.slice(0, 100) || [];
  if (!rows.length) return '<p>No output rows.</p>';
  return `<table><thead><tr>${output.headers.map((header) => `<th>${h(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.values.map((value) => `<td>${h(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>${output.rows.length > rows.length ? `<p>Previewing first ${rows.length} of ${output.rows.length} rows.</p>` : ''}`;
}
function setDownloads(root, conversionReady, conversionBlocked) { root.querySelectorAll('[data-csvrc-download]').forEach((button) => { const auditKind = !['csv','xlsx'].includes(button.dataset.csvrcDownload); button.disabled = conversionBlocked || (!conversionReady && !auditKind); }); }
function artifactFor(result, kind) {
  const a = result.artifacts || {};
  const specs = { csv:['support-revision-compare.csv',a.outputCsv,'text/csv'], audit:['support-revision-comparison-audit.json',a.comparisonAuditJson,'application/json'], rev1xml:['support-revision-rev1.xml',a.rev1Xml,'application/xml'], rev2xml:['support-revision-rev2.xml',a.rev2Xml,'application/xml'], rev1graph:['support-revision-rev1-graph.json',a.rev1GraphJson,'application/json'], rev2graph:['support-revision-rev2-graph.json',a.rev2GraphJson,'application/json'], profile:['support-revision-csv-xml-v1.json',a.profileJson,'application/json'] };
  const spec = specs[kind]; return spec && spec[1] != null ? { name: spec[0], text: spec[1], type: spec[2] } : null;
}
function downloadBlob(doc, name, content, type) { const blob = content instanceof Uint8Array ? new Blob([content], { type }) : new Blob([String(content ?? '')], { type }); const url = URL.createObjectURL(blob); const a = doc.createElement('a'); a.href = url; a.download = name; a.style.display = 'none'; doc.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function h(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }

export const _test = Object.freeze({ artifactFor, outputTableHtml, candidateReviewHtml, workspaceHtml });

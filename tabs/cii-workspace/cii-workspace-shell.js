import { createCiiWorkspacePreview } from './cii-workspace-core.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';

function h(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function parseNodes(value) { return String(value || '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean); }
function anchorPairs(source, target) {
  const left = parseNodes(source); const right = parseNodes(target);
  if (left.length !== right.length || left.length < 2) throw new Error('Provide at least two SOURCE and TARGET anchor nodes in corresponding order.');
  return left.map((sourceNodeId, index) => ({ sourceNodeId, targetNodeId: right[index] }));
}
function download(documentRef, name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = documentRef.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function stageMarkup() {
  return createCiiWorkspaceStageModel().map((stage) => `<section class="ciiw-stage" data-ciiw-stage="${stage.id}">
<h3>${h(stage.id)} ${h(stage.label)}</h3><p>Status: <b>${h(stage.status)}</b></p>
${stage.id === '06' ? `<p>${h(stage.blockers?.[0])}</p><button type="button" disabled data-ciiw-apply>Apply to target CII</button>` : ''}
</section>`).join('');
}
function rowSource(row) { return row.sourceNodeId || row.sourceElementId || row.sourceElementIds?.join('|') || ''; }
function rowTarget(row) { return row.targetNodeId || row.targetElementIds?.join('|') || ''; }
function correspondenceMarkup(result, decisions) {
  const nodeRows = result?.correspondence?.nodeRows || []; const elementRows = result?.correspondence?.elementRows || [];
  const rows = [...nodeRows, ...elementRows];
  if (!rows.length) return '<p>No correspondence rows.</p>';
  return `<table><thead><tr><th>Decision</th><th>Kind</th><th>Status</th><th>Source</th><th>Target</th></tr></thead><tbody>${rows.map((row) => {
    const decision = decisions.get(row.correspondenceId) || '';
    const controls = row.kind === 'NODE' && row.status === 'LOCKED' ? 'LOCKED' : `<select data-ciiw-decision="${h(row.correspondenceId)}"><option value="">Review…</option><option value="ACCEPT" ${decision === 'ACCEPT' ? 'selected' : ''}>Accept</option><option value="REJECT" ${decision === 'REJECT' ? 'selected' : ''}>Reject</option></select>`;
    return `<tr><td>${controls}</td><td>${h(row.kind)}</td><td>${h(row.status)}</td><td>${h(rowSource(row))}</td><td>${h(rowTarget(row))}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function reviewFrom(decisions) {
  const reviewedCorrespondenceIds = []; const rejectedCorrespondenceIds = [];
  for (const [id, decision] of decisions.entries()) {
    if (decision === 'ACCEPT') reviewedCorrespondenceIds.push(id);
    if (decision === 'REJECT') rejectedCorrespondenceIds.push(id);
  }
  return { reviewedCorrespondenceIds, rejectedCorrespondenceIds };
}

export function mountCiiWorkspaceShell(container, options = {}) {
  container.innerHTML = `<div class="ciiw-workspace"><header><h2>CII Workspace</h2><button type="button" data-ciiw-close>Close</button></header>
<div class="ciiw-intake"><label>SOURCE CII <input type="file" accept=".cii,.accdb" data-ciiw-source></label>
<label>TARGET CII <input type="file" accept=".cii,.accdb" data-ciiw-target></label>
<label>SOURCE anchors <input type="text" placeholder="100, 200" data-ciiw-source-anchors></label>
<label>TARGET anchors <input type="text" placeholder="5000, 5020" data-ciiw-target-anchors></label>
<button type="button" data-ciiw-analyze>Build correspondence preview</button></div>
<div class="ciiw-status" data-ciiw-status>Load two neutral CII files and enter corresponding locked anchors.</div>
<div class="ciiw-stages">${stageMarkup()}</div>
<section class="ciiw-results"><h3>Correspondence review</h3><div data-ciiw-results></div>
<button type="button" data-ciiw-refresh-review disabled>Refresh property-transfer preview</button>
<button type="button" data-ciiw-export-csv disabled>Export correspondence CSV</button>
<button type="button" data-ciiw-export-json disabled>Export audit JSON</button></section></div>`;
  let current = null; let baseInput = null; let disposed = false; const decisions = new Map();
  const query = (selector) => container.querySelector(selector); const status = query('[data-ciiw-status]'); const results = query('[data-ciiw-results]');
  const reviewButton = query('[data-ciiw-refresh-review]'); const csvButton = query('[data-ciiw-export-csv]'); const jsonButton = query('[data-ciiw-export-json]');
  const render = () => {
    results.innerHTML = correspondenceMarkup(current, decisions);
    results.querySelectorAll('[data-ciiw-decision]').forEach((select) => select.addEventListener('change', () => { decisions.set(select.dataset.ciiwDecision, select.value); }));
  };
  const run = async (review = {}) => {
    current = await createCiiWorkspacePreview({ ...baseInput, review });
    if (disposed) return;
    status.textContent = `Correspondence ${current.correspondence.status}; transfer preview ${current.transferPlan.status}.`;
    render(); reviewButton.disabled = false; csvButton.disabled = false; jsonButton.disabled = false;
  };
  const analyze = async () => {
    try {
      const sourceFile = query('[data-ciiw-source]').files?.[0]; const targetFile = query('[data-ciiw-target]').files?.[0];
      if (!sourceFile || !targetFile) throw new Error('SOURCE and TARGET CII files are required.');
      status.textContent = 'Building preview…'; decisions.clear();
      baseInput = { sourceText: await sourceFile.text(), sourceFileName: sourceFile.name, targetText: await targetFile.text(), targetFileName: targetFile.name,
        anchorPairs: anchorPairs(query('[data-ciiw-source-anchors]').value, query('[data-ciiw-target-anchors]').value) };
      await run();
    } catch (error) { if (!disposed) { current = null; status.textContent = error.message || String(error); results.innerHTML = ''; reviewButton.disabled = true; csvButton.disabled = true; jsonButton.disabled = true; } }
  };
  query('[data-ciiw-close]').addEventListener('click', () => options.close?.()); query('[data-ciiw-analyze]').addEventListener('click', analyze);
  reviewButton.addEventListener('click', async () => { try { status.textContent = 'Refreshing reviewed preview…'; await run(reviewFrom(decisions)); } catch (error) { status.textContent = error.message || String(error); } });
  csvButton.addEventListener('click', () => current && download(container.ownerDocument, 'cii-correspondence.csv', current.artifacts.correspondenceCsv, 'text/csv'));
  jsonButton.addEventListener('click', () => current && download(container.ownerDocument, 'cii-workspace-audit.json', current.artifacts.auditJson, 'application/json'));
  return { destroy() { disposed = true; container.innerHTML = ''; }, getCurrentResult() { return current; } };
}

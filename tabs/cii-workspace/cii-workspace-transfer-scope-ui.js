import { mountCiiWorkspaceEngineeringShell } from './cii-workspace-engineering-ui.js';
import { applyCiiWorkspaceTargetWriter1B } from './cii-workspace-core.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';
import { ciiEngineeringDeltaMarkup, ciiEngineeringValueText, ciiTransferPreviewMarkup } from './cii-workspace-review-presentation.js';
import {
  bindCiiTransferScopeToPreview, ciiTransferScopeCandidateOperations, createCiiTransferScopeSelection,
} from './cii-workspace-transfer-scope.js';

const STYLE_ID = 'cii-workspace-transfer-scope-style';
function h(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function stylesheet(documentRef) {
  if (documentRef.getElementById(STYLE_ID)) return;
  const link = documentRef.createElement('link'); link.id = STYLE_ID; link.rel = 'stylesheet';
  link.href = new URL('./cii-workspace-transfer-scope-ui.css', import.meta.url).href; documentRef.head.appendChild(link);
}
function download(documentRef, name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })); const link = documentRef.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
function stageMarkup(readiness) {
  return createCiiWorkspaceStageModel(readiness).map((stage) => `<section class="ciiw-stage" data-ciiw-stage="${h(stage.id)}"><h3>${h(stage.id)} ${h(stage.label)}</h3><p>Status: <b>${h(stage.status)}</b></p>${stage.id === '06' && stage.blockers?.length ? `<p>${h(stage.blockers[0])}</p>` : ''}</section>`).join('');
}
function reviewKey(preview) {
  const review = preview?.review || {};
  return [...(review.reviewedCorrespondenceIds || []), '|', ...(review.lockedCorrespondenceIds || []), '|', ...(review.rejectedCorrespondenceIds || [])].join(',');
}
function rawKey(preview) {
  const plan = preview?.transferPlan; if (!plan) return '';
  const ids = ciiTransferScopeCandidateOperations(plan).map((operation) => operation.operationId).sort();
  return [plan.sourceDocument?.contentSha256 || '', plan.targetDocument?.contentSha256 || '', reviewKey(preview), ids.join('|')].join('::');
}
function approval(row) {
  if (row?.decision === 'LOCKED') return 'LOCKED';
  if (row?.decision === 'ACCEPTED') return 'APPROVED';
  if (row?.decision === 'REJECTED') return 'REJECTED';
  return 'PENDING';
}
function candidateRows(plan) { return ciiTransferScopeCandidateOperations(plan); }
function scopePanelMarkup(raw, decisions, view, reviewDirty) {
  const candidates = candidateRows(raw?.transferPlan); const scope = view?.transferPlan?.transferScope || { status: 'UNBOUND' };
  const mutableCount = candidates.filter((item) => item.action !== 'KEEP').length;
  const rows = candidates.length ? candidates.map((item) => {
    const id = String(item.operationId || ''); const fixedKeep = item.action === 'KEEP'; const decision = fixedKeep ? 'KEEP' : (decisions.get(id) || 'EXCLUDE');
    const control = fixedKeep ? '<b>KEEP</b>' : `<select data-ciiw-transfer-scope-decision="${h(id)}"><option value="APPLY" ${decision === 'APPLY' ? 'selected' : ''}>APPLY</option><option value="EXCLUDE" ${decision === 'EXCLUDE' ? 'selected' : ''}>EXCLUDE</option></select>`;
    return `<tr><td>${control}</td><td><b>${h(item.family || '—')}</b><small>${h(item.property || '—')}</small></td><td>${h(item.action || '—')}</td><td>${h(item.status || '—')}<small>${h((item.blockers || []).join(' · ') || 'No row blocker')}</small></td></tr>`;
  }).join('') : '<tr><td colspan="4">No reviewed transfer operations are available yet.</td></tr>';
  const bound = scope.status === 'BOUND';
  return `<section class="ciiw-transfer-scope"><header><div><h3>Explicit mutation scope</h3><p>Every mutable operation is explicitly APPLY or EXCLUDE before Writer 1B can run.</p></div><div class="ciiw-transfer-scope-status" data-state="${h(scope.status)}">${h(scope.status)}</div></header><p><b>Authority:</b> USER_EXPLICIT_OPERATION_SCOPE · <b>Candidates:</b> ${h(mutableCount)} · <b>APPLY:</b> ${h(scope.appliedOperationCount || 0)} · <b>EXCLUDE:</b> ${h(scope.excludedOperationCount || 0)}</p>${bound && scope.scopeId ? `<small>Scope ID: ${h(scope.scopeId)}</small>` : ''}${reviewDirty ? '<p><b>Review changed:</b> re-apply correspondence approvals before binding mutation scope.</p>' : ''}<div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-scope-apply-ready ${reviewDirty || !mutableCount ? 'disabled' : ''}>APPLY all preview-ready</button><button type="button" data-ciiw-scope-exclude-all ${reviewDirty || !mutableCount ? 'disabled' : ''}>EXCLUDE all</button><button type="button" data-ciiw-bind-transfer-scope ${reviewDirty || !mutableCount ? 'disabled' : ''}>Bind APPLY / EXCLUDE scope</button><button type="button" data-ciiw-export-scoped-audit ${bound ? '' : 'disabled'}>Export scoped audit JSON</button></div><table><thead><tr><th>Scope</th><th>Family / property</th><th>Action</th><th>Classified status</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}
function excludedMarkup(view) {
  const rows = view?.transferPlan?.excludedOperations || [];
  if (!rows.length) return '';
  return `<section class="ciiw-transfer-excluded"><h3>Explicitly excluded operations</h3><p>These operations remain in audit custody but are absent from the Writer mutation set.</p><table class="ciiw-grid"><thead><tr><th>Scope</th><th>Family / property</th><th>SOURCE candidate</th><th>Current TARGET</th><th>Original classification</th></tr></thead><tbody>${rows.map((item) => `<tr><td><b>EXCLUDE</b></td><td><b>${h(item.family || '—')}</b><small>${h(item.property || '—')}</small></td><td>${h(ciiEngineeringValueText(item.sourceEvidence?.value ?? item.proposed))}</td><td>${h(ciiEngineeringValueText(item.before))}</td><td>${h(item.status || '—')}<small>${h((item.blockers || []).join(' · ') || 'No row blocker')}</small></td></tr>`).join('')}</tbody></table></section>`;
}
function seedDecisions(raw, decisions) {
  decisions.clear();
  for (const operation of candidateRows(raw?.transferPlan)) if (operation.action !== 'KEEP') decisions.set(String(operation.operationId), 'EXCLUDE');
}
function statusText(view, reviewDirty) {
  if (reviewDirty) return 'Correspondence decisions changed. Re-apply approvals before binding APPLY / EXCLUDE mutation scope.';
  const scope = view?.transferPlan?.transferScope;
  if (scope?.status !== 'BOUND') return 'Transfer scope is not bound. Explicitly choose APPLY / EXCLUDE for every mutable operation before Writer 1B can run.';
  return `Transfer scope ${scope.scopeId}: ${scope.appliedOperationCount} APPLY / ${scope.excludedOperationCount} EXCLUDE; Writer 1B ${view.writerReadiness?.status || 'BLOCKED'}.`;
}

export function mountCiiWorkspaceScopedEngineeringShell(container, options = {}) {
  stylesheet(container.ownerDocument);
  const legacy = mountCiiWorkspaceEngineeringShell(container, options); const documentRef = container.ownerDocument;
  const transfer = container.querySelector('[data-ciiw-transfer]'); const stages = container.querySelector('[data-ciiw-stages]');
  const deltas = container.querySelector('[data-ciiw-deltas]'); const status = container.querySelector('[data-ciiw-status]');
  const targetInput = container.querySelector('[data-ciiw-target]'); const reviewButton = container.querySelector('[data-ciiw-refresh-review]');
  const csvButton = container.querySelector('[data-ciiw-export-csv]'); const auditButton = container.querySelector('[data-ciiw-export-json]');
  const decisions = new Map(); let lastRaw = null; let lastKey = ''; let scopedPreview = null; let reviewDirty = false; let awaitingReviewBind = false; let disposed = false; let observer = null;

  const render = () => {
    if (disposed) return; const raw = legacy.getCurrentResult?.(); if (!raw?.transferPlan || !transfer) return;
    const key = rawKey(raw);
    if (raw !== lastRaw || key !== lastKey) {
      lastRaw = raw; lastKey = key; scopedPreview = null; seedDecisions(raw, decisions);
      if (awaitingReviewBind) { reviewDirty = false; awaitingReviewBind = false; }
    }
    const view = scopedPreview || bindCiiTransferScopeToPreview(raw, null);
    observer?.disconnect();
    transfer.innerHTML = `${scopePanelMarkup(raw, decisions, view, reviewDirty)}${ciiTransferPreviewMarkup(view)}${excludedMarkup(view)}`;
    if (stages) stages.innerHTML = stageMarkup(view.writerReadiness);
    if (deltas && !reviewDirty) deltas.innerHTML = ciiEngineeringDeltaMarkup(view, approval);
    if (status) status.textContent = statusText(view, reviewDirty);

    transfer.querySelectorAll('[data-ciiw-transfer-scope-decision]').forEach((select) => select.addEventListener('change', () => {
      decisions.set(select.dataset.ciiwTransferScopeDecision, select.value === 'APPLY' ? 'APPLY' : 'EXCLUDE'); scopedPreview = null; render();
    }));
    transfer.querySelector('[data-ciiw-scope-apply-ready]')?.addEventListener('click', () => {
      for (const item of candidateRows(raw.transferPlan)) if (item.action !== 'KEEP') decisions.set(String(item.operationId), item.status === 'PREVIEW_READY' ? 'APPLY' : 'EXCLUDE');
      scopedPreview = null; render();
    });
    transfer.querySelector('[data-ciiw-scope-exclude-all]')?.addEventListener('click', () => {
      for (const item of candidateRows(raw.transferPlan)) if (item.action !== 'KEEP') decisions.set(String(item.operationId), 'EXCLUDE');
      scopedPreview = null; render();
    });
    transfer.querySelector('[data-ciiw-bind-transfer-scope]')?.addEventListener('click', () => {
      if (reviewDirty) return; const selection = createCiiTransferScopeSelection(raw.transferPlan, decisions);
      scopedPreview = bindCiiTransferScopeToPreview(raw, selection); render();
    });
    transfer.querySelector('[data-ciiw-export-scoped-audit]')?.addEventListener('click', () => {
      if (scopedPreview?.transferPlan?.transferScope?.status !== 'BOUND') return;
      download(documentRef, 'cii-workspace-scoped-audit.json', scopedPreview.artifacts.auditJson, 'application/json');
    });
    const applyButton = transfer.querySelector('[data-ciiw-apply-target]');
    if (applyButton) {
      const authorized = scopedPreview?.transferPlan?.transferScope?.status === 'BOUND' && scopedPreview?.writerReadiness?.ready === true && !reviewDirty;
      applyButton.disabled = !authorized;
      applyButton.addEventListener('click', async () => {
        try {
          if (!authorized || !scopedPreview) throw new Error('Bind an explicit APPLY / EXCLUDE scope before target mutation.');
          const targetFile = targetInput?.files?.[0]; if (!targetFile) throw new Error('TARGET CII file is required.');
          applyButton.disabled = true; if (status) status.textContent = 'Applying explicitly scoped Writer 1B operations and reparsing TARGET CII…';
          const applied = await applyCiiWorkspaceTargetWriter1B(scopedPreview, await targetFile.text(), { cryptoRef: options.cryptoRef });
          download(documentRef, applied.fileName, applied.text, 'text/plain');
          if (status) status.textContent = `Scoped TARGET CII exported: ${applied.mutationCount} field changes; unexpected semantic deltas ${applied.validation.unexpectedSemanticDeltaCount}.`;
        } catch (error) { if (status) status.textContent = error?.message || String(error); render(); }
      });
    }
    observer?.observe(transfer, { childList: true, subtree: true });
  };

  const MutationObserverRef = documentRef.defaultView?.MutationObserver || globalThis.MutationObserver;
  observer = transfer && MutationObserverRef ? new MutationObserverRef(() => render()) : null;
  observer?.observe(transfer, { childList: true, subtree: true });
  const onDecisionChange = (event) => {
    if (!event.target?.matches?.('[data-ciiw-decision]')) return;
    reviewDirty = true; scopedPreview = null; render();
  };
  const onBulk = (event) => {
    if (!event.target?.matches?.('[data-ciiw-accept-high], [data-ciiw-accept-medium]')) return;
    reviewDirty = true; scopedPreview = null;
    const schedule = documentRef.defaultView?.queueMicrotask || globalThis.queueMicrotask || ((callback) => Promise.resolve().then(callback));
    schedule(render);
  };
  const onReviewBind = () => { awaitingReviewBind = true; scopedPreview = null; };
  const onScopedAuditExport = (event) => {
    if (scopedPreview?.transferPlan?.transferScope?.status !== 'BOUND') return;
    event.preventDefault(); event.stopImmediatePropagation();
    download(documentRef, 'cii-workspace-audit.json', scopedPreview.artifacts.auditJson, 'application/json');
  };
  const onScopedCsvExport = (event) => {
    if (scopedPreview?.transferPlan?.transferScope?.status !== 'BOUND') return;
    event.preventDefault(); event.stopImmediatePropagation();
    download(documentRef, 'cii-correspondence.csv', scopedPreview.artifacts.correspondenceCsv, 'text/csv');
  };
  container.addEventListener('change', onDecisionChange, true); container.addEventListener('click', onBulk, true); reviewButton?.addEventListener('click', onReviewBind, true);
  auditButton?.addEventListener('click', onScopedAuditExport, true); csvButton?.addEventListener('click', onScopedCsvExport, true);
  render();
  return {
    destroy() {
      disposed = true; observer?.disconnect(); container.removeEventListener('change', onDecisionChange, true); container.removeEventListener('click', onBulk, true);
      reviewButton?.removeEventListener('click', onReviewBind, true); auditButton?.removeEventListener('click', onScopedAuditExport, true); csvButton?.removeEventListener('click', onScopedCsvExport, true); legacy.destroy();
    },
    getCurrentResult() { return scopedPreview || legacy.getCurrentResult?.(); },
    getSelectedBaseLoops() { return legacy.getSelectedBaseLoops?.() || []; },
    getTransferScopePreview() { return scopedPreview; },
  };
}

export const _test = Object.freeze({ rawKey, approval, candidateRows, scopePanelMarkup, excludedMarkup, statusText });

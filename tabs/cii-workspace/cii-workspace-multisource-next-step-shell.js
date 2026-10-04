import {
  ciiMultiSourceCorrespondenceAudit,
  ciiMultiSourceCorrespondenceAuditCsv,
  ciiMultiSourceCorrespondenceAuditJson,
  ciiMultiSourceCorrespondenceAuditMarkup,
} from './cii-workspace-multisource-correspondence-audit.js?v=20261004-source-target-audit-1';

function selectedFiles(input) { return [...(input?.files || [])]; }
function multiSource(container) { return selectedFiles(container.querySelector('[data-ciiw-source]')).length > 1; }
function download(documentRef, name, payload, type) {
  const url = URL.createObjectURL(new Blob([payload], { type }));
  const link = documentRef.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function transferWaitingMarkup(authorityReady) {
  return `<section class="ciiw-transfer-scope ciiw-ms-transfer-waiting" data-ciiw-ms-transfer-waiting="1"><header><div><h3>Multi-source Writer2</h3><p>${authorityReady ? 'Exact retained S1/S2/S3 custody is ready. Build correspondence before transfer scope can exist.' : 'This Writer2 route requires the exact retained S1/S2/S3 files. Set anchor authority for every SOURCE member before building correspondence.'}</p></div><div class="ciiw-transfer-scope-status">${authorityReady ? 'READY FOR COMPARE' : 'WAITING FOR ANCHORS'}</div></header>${authorityReady ? '<div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-ms-transfer-compare-now>Compare models →</button></div><small>The Compare Review tab is navigation only. Writer1A is not used by this S1/S2/S3 Writer2 route.</small>' : '<small>Writer1A is not used by this S1/S2/S3 Writer2 route.</small>'}</section>`;
}

function compareTarget(event) {
  return event.target?.closest?.('[data-ciiw-ms-compare-now], [data-ciiw-ms-transfer-compare-now]') || null;
}
function auditTarget(event) {
  return event.target?.closest?.('[data-ciiw-ms-correspondence-audit-csv], [data-ciiw-ms-correspondence-audit-json]') || null;
}

export function mountCiiWriter2MultiSourceNextStepShell(container, options, mountCore) {
  if (typeof mountCore !== 'function') throw new Error('CII_MS_WRITER2_CORE_MOUNT_REQUIRED');
  const core = mountCore(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]');
  const analyzeButton = container.querySelector('[data-ciiw-analyze]');
  const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
  const results = container.querySelector('[data-ciiw-results]');
  const transfer = container.querySelector('[data-ciiw-transfer]');
  const stages = container.querySelector('[data-ciiw-stages]');
  const initialTransferHtml = transfer?.innerHTML || '';
  let disposed = false; let auditQueued = false;

  const currentAudit = () => {
    const preview = core?.getMultiSourcePreview?.();
    return preview?.memberPreviews?.length ? ciiMultiSourceCorrespondenceAudit(preview) : null;
  };
  const renderAudit = () => {
    auditQueued = false;
    if (disposed || !results) return;
    const existing = results.querySelector('[data-ciiw-ms-correspondence-audit]');
    if (!multiSource(container)) {
      existing?.remove();
      return;
    }
    const audit = currentAudit();
    if (!audit) {
      existing?.remove();
      return;
    }
    if (existing) return;
    results.insertAdjacentHTML('afterbegin', ciiMultiSourceCorrespondenceAuditMarkup(audit));
  };
  const queueAudit = () => {
    if (auditQueued || disposed) return; auditQueued = true; queueMicrotask(renderAudit);
  };
  const refresh = () => {
    if (disposed) return;
    const active = multiSource(container);
    if (stages) stages.hidden = active;
    if (transfer) {
      if (!active) {
        if (transfer.querySelector('[data-ciiw-ms-transfer-waiting]')) transfer.innerHTML = initialTransferHtml;
      } else if (!transfer.querySelector('[data-ciiw-ms-transfer="1"]')) {
        const ready = Boolean(analyzeButton && !analyzeButton.disabled);
        const next = transferWaitingMarkup(ready);
        if (transfer.innerHTML !== next) transfer.innerHTML = next;
      }
    }
    queueAudit();
  };

  const onClick = (event) => {
    const auditButton = auditTarget(event);
    if (auditButton && multiSource(container)) {
      event.preventDefault(); event.stopImmediatePropagation();
      const audit = currentAudit(); if (!audit) return;
      const isCsv = auditButton.matches('[data-ciiw-ms-correspondence-audit-csv]');
      download(container.ownerDocument, isCsv ? 'cii-source-vs-target-correspondence.csv' : 'cii-source-vs-target-correspondence.json',
        isCsv ? ciiMultiSourceCorrespondenceAuditCsv(audit) : ciiMultiSourceCorrespondenceAuditJson(audit), isCsv ? 'text/csv' : 'application/json');
      return;
    }
    const button = compareTarget(event);
    if (!button || !multiSource(container)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.disabled || analyzeButton?.disabled) return;
    analyzeButton?.click();
  };
  const onSourceChange = () => queueMicrotask(refresh);
  container.addEventListener('click', onClick, true);
  sourceInput?.addEventListener('change', onSourceChange);
  const evidenceObserver = evidence && typeof MutationObserver !== 'undefined'
    ? new MutationObserver(() => refresh()) : null;
  evidenceObserver?.observe(evidence, { childList: true, subtree: true });
  const resultsObserver = results && typeof MutationObserver !== 'undefined'
    ? new MutationObserver(() => queueAudit()) : null;
  resultsObserver?.observe(results, { childList: true, subtree: false });
  refresh();

  return {
    ...core,
    destroy() {
      disposed = true;
      evidenceObserver?.disconnect(); resultsObserver?.disconnect();
      container.removeEventListener('click', onClick, true);
      sourceInput?.removeEventListener('change', onSourceChange);
      if (stages) stages.hidden = false;
      core?.destroy?.();
    },
  };
}

export const _test = Object.freeze({ selectedFiles, multiSource, transferWaitingMarkup, compareTarget, auditTarget });

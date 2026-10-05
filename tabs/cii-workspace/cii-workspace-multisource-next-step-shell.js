import { CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256 } from './cii-workspace-multisource-nodename-authority.js';
import {
  ciiMultiSourceBulkEligibleRows,
  seedCiiMultiSourceReviewDecisions,
} from './cii-workspace-multisource-review-ui.js';
import {
  ciiWriter2SessionStorage,
  ciiWriter2SessionStorageKey,
  createCiiWriter2SessionSnapshot,
  loadCiiWriter2Session,
  restoreCiiWriter2ReviewDecisions,
  saveCiiWriter2Session,
} from './cii-workspace-multisource-session-persistence.js';

function selectedFiles(input) { return [...(input?.files || [])]; }
function multiSource(container) { return selectedFiles(container.querySelector('[data-ciiw-source]')).length > 1; }
function text(value) { return String(value ?? '').trim(); }
function validNode(value) {
  const raw = text(value); const number = Number(raw);
  return raw && Number.isSafeInteger(number) ? String(number) : null;
}
function scheduleFor(container, callback) {
  const schedule = container.ownerDocument?.defaultView?.queueMicrotask || globalThis.queueMicrotask || ((fn) => Promise.resolve().then(fn));
  schedule(callback);
}
function dispatch(field, type) {
  const EventRef = field?.ownerDocument?.defaultView?.Event || globalThis.Event;
  if (field && EventRef) field.dispatchEvent(new EventRef(type, { bubbles: true }));
}
function retainedReviewOnly(container) { return Boolean(container.querySelector('[data-ciiw-ms-review-only-transfer="1"]')); }
function retainedLedger(container) { return !retainedReviewOnly(container) && container.querySelector('[data-ciiw-ms-anchor-ledger="1"]'); }
function memberSections(container) { return [...container.querySelectorAll('[data-ciiw-ms-member]')]; }

function selectedBySourceFromDom(container) {
  const rows = {};
  for (const member of memberSections(container)) {
    const sourceId = text(member.dataset.ciiwMsMember); if (!sourceId) continue;
    rows[sourceId] = [...member.querySelectorAll('[data-ciiw-evidence-card][data-selected="true"]')]
      .map((card) => text(card.dataset.ciiwEvidenceCard)).filter(Boolean);
  }
  return rows;
}
function manualBySourceFromDom(container) {
  const rows = {};
  for (const member of memberSections(container)) {
    const sourceId = text(member.dataset.ciiwMsMember); if (sourceId) rows[sourceId] = [];
  }
  for (const row of container.querySelectorAll('[data-ciiw-ms-anchor-ledger-row="manual"]')) {
    const source = row.querySelector('[data-ciiw-ms-ledger-source]'); const target = row.querySelector('[data-ciiw-ms-ledger-target]');
    const sourceId = text(source?.dataset?.ciiwMsLedgerSourceId); const sourceNodeId = validNode(source?.value); const targetNodeId = validNode(target?.value);
    if (!sourceId || !sourceNodeId || !targetNodeId) continue;
    if (!rows[sourceId]) rows[sourceId] = [];
    const key = `${sourceNodeId}=>${targetNodeId}`;
    if (!rows[sourceId].some((item) => `${item.sourceNodeId}=>${item.targetNodeId}` === key)) rows[sourceId].push({ sourceNodeId, targetNodeId });
  }
  return rows;
}
function manualDraftBySourceFromDom(container) {
  const rows = {};
  for (const member of memberSections(container)) {
    const sourceId = text(member.dataset.ciiwMsMember); if (!sourceId) continue;
    rows[sourceId] = {
      sourceNodeId: text(member.querySelector('[data-ciiw-ms-manual-source]')?.value).slice(0, 64),
      targetNodeId: text(member.querySelector('[data-ciiw-ms-manual-target]')?.value).slice(0, 64),
    };
  }
  return rows;
}
function anchorDomState(container) {
  return Object.freeze({
    selectedBySource: Object.freeze(selectedBySourceFromDom(container)),
    manualBySource: Object.freeze(manualBySourceFromDom(container)),
    manualDraftBySource: Object.freeze(manualDraftBySourceFromDom(container)),
  });
}
function decisionControls(container) { return [...container.querySelectorAll('[data-ciiw-ms-decision]')]; }
function decisionControl(container, correspondenceId) {
  return decisionControls(container).find((item) => text(item.dataset.ciiwMsDecision) === text(correspondenceId)) || null;
}
function selectedKeysInMember(member) {
  return new Set([...member.querySelectorAll('[data-ciiw-evidence-card][data-selected="true"]')]
    .map((card) => text(card.dataset.ciiwEvidenceCard)).filter(Boolean));
}
function availableSelectionKeys(member) {
  return new Set([...member.querySelectorAll('[data-ciiw-base-action][data-ciiw-selection-key]')]
    .map((button) => text(button.dataset.ciiwSelectionKey)).filter(Boolean));
}
function clickSelectionKey(member, key) {
  const button = [...member.querySelectorAll('[data-ciiw-base-action][data-ciiw-selection-key]')]
    .find((item) => text(item.dataset.ciiwSelectionKey) === text(key));
  button?.click(); return Boolean(button);
}

export function transferWaitingMarkup(authorityReady) {
  return `<section class="ciiw-transfer-scope ciiw-ms-transfer-waiting" data-ciiw-ms-transfer-waiting="1"><header><div><h3>Multi-source Writer2</h3><p>${authorityReady ? 'Exact retained S1/S2/S3 custody is ready. Build correspondence before transfer scope can exist.' : 'This Writer2 route requires the exact retained S1/S2/S3 files. Set anchor authority for every SOURCE member before building correspondence.'}</p></div><div class="ciiw-transfer-scope-status">${authorityReady ? 'READY FOR COMPARE' : 'WAITING FOR ANCHORS'}</div></header>${authorityReady ? '<div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-ms-transfer-compare-now>Compare models →</button></div><small>The Compare Review tab is navigation only. Writer1A is not used by this S1/S2/S3 Writer2 route.</small>' : '<small>Writer1A is not used by this S1/S2/S3 Writer2 route.</small>'}</section>`;
}

function compareTarget(event) {
  return event.target?.closest?.('[data-ciiw-ms-compare-now], [data-ciiw-ms-transfer-compare-now]') || null;
}

export function mountCiiWriter2MultiSourceNextStepShell(container, options, mountCore) {
  if (typeof mountCore !== 'function') throw new Error('CII_MS_WRITER2_CORE_MOUNT_REQUIRED');
  const core = mountCore(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]');
  const targetInput = container.querySelector('[data-ciiw-target]');
  const analyzeButton = container.querySelector('[data-ciiw-analyze]');
  const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
  const results = container.querySelector('[data-ciiw-results]');
  const executive = container.querySelector('[data-ciiw-executive]');
  const transfer = container.querySelector('[data-ciiw-transfer]');
  const stages = container.querySelector('[data-ciiw-stages]');
  const initialTransferHtml = transfer?.innerHTML || '';
  const documentRef = container.ownerDocument;
  const storage = ciiWriter2SessionStorage(documentRef?.defaultView || globalThis);
  const storageKey = ciiWriter2SessionStorageKey(CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256);
  let persistedSnapshot = loadCiiWriter2Session(storage, storageKey);
  let disposed = false; let restoringAnchors = false; let anchorRestoreDone = false; let restoringReview = false;
  let reviewIdentity = ''; let reviewValidated = false; let reviewShadow = new Map(); let lastPreview = null; let reviewRestoreIdentity = '';
  let anchorSaveQueued = false; let reviewSyncQueued = false;

  const retainedActive = () => Boolean(retainedLedger(container));
  const currentPreview = () => retainedReviewOnly(container) ? null : core?.getMultiSourcePreview?.();
  const reviewForSave = () => {
    if (reviewValidated) return { correspondenceIdentity: reviewIdentity, decisions: reviewShadow };
    const saved = persistedSnapshot?.review || {};
    return { correspondenceIdentity: text(saved.correspondenceIdentity), decisions: new Map(Object.entries(saved.decisions || {})) };
  };
  const saveSession = () => {
    if (!retainedActive()) return false;
    const anchors = anchorDomState(container); const review = reviewForSave();
    const snapshot = createCiiWriter2SessionSnapshot({
      sourceSetSha256: CII_MS_SOURCE_SET_SHA256,
      targetOriginalSha256: CII_MS_TARGET_SHA256,
      ...anchors,
      correspondenceIdentity: review.correspondenceIdentity,
      reviewDecisions: review.decisions,
    });
    if (!snapshot || !saveCiiWriter2Session(storage, storageKey, snapshot)) return false;
    persistedSnapshot = snapshot; return true;
  };
  const queueAnchorSave = () => {
    if (anchorSaveQueued || disposed || restoringAnchors || !retainedActive()) return;
    anchorSaveQueued = true; scheduleFor(container, () => { anchorSaveQueued = false; if (!disposed && !restoringAnchors) saveSession(); });
  };
  const normalizePair = (row) => {
    const sourceNodeId = validNode(row?.sourceNodeId); const targetNodeId = validNode(row?.targetNodeId);
    return sourceNodeId && targetNodeId ? { sourceNodeId, targetNodeId } : null;
  };
  const restoreAnchors = () => {
    if (disposed || restoringAnchors || anchorRestoreDone || !retainedActive()) return;
    anchorRestoreDone = true;
    if (!persistedSnapshot || persistedSnapshot.schema !== 'CIIWorkspaceWriter2Session.v1'
      || text(persistedSnapshot.sourceSetSha256) !== CII_MS_SOURCE_SET_SHA256
      || text(persistedSnapshot.targetOriginalSha256) !== CII_MS_TARGET_SHA256) return;
    restoringAnchors = true;
    try {
      for (const initial of memberSections(container)) {
        const sourceId = text(initial.dataset.ciiwMsMember); if (!sourceId) continue;
        const rawManual = Array.isArray(persistedSnapshot.manualBySource?.[sourceId]) ? persistedSnapshot.manualBySource[sourceId] : [];
        const desiredManual = rawManual.map(normalizePair).filter(Boolean);
        if (desiredManual.length) {
          for (const pair of desiredManual) {
            const state = anchorDomState(container); const existing = state.manualBySource?.[sourceId] || [];
            if (existing.some((row) => row.sourceNodeId === pair.sourceNodeId && row.targetNodeId === pair.targetNodeId)) continue;
            const member = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!member) break;
            const source = member.querySelector('[data-ciiw-ms-manual-source]'); const target = member.querySelector('[data-ciiw-ms-manual-target]');
            if (!source || !target) break;
            source.value = pair.sourceNodeId; target.value = pair.targetNodeId; dispatch(source, 'input'); dispatch(target, 'input');
            member.querySelector('[data-ciiw-ms-manual-add]')?.click();
          }
          continue;
        }
        if (!Object.prototype.hasOwnProperty.call(persistedSnapshot.selectedBySource || {}, sourceId)) continue;
        const member = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!member) continue;
        const desired = new Set((persistedSnapshot.selectedBySource?.[sourceId] || []).map(text).filter(Boolean));
        const available = availableSelectionKeys(member);
        if ([...desired].some((key) => !available.has(key))) continue;
        const current = selectedKeysInMember(member);
        for (const key of new Set([...current, ...desired])) if (current.has(key) !== desired.has(key)) {
          const activeMember = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!activeMember) break;
          clickSelectionKey(activeMember, key);
        }
      }
      for (const member of memberSections(container)) {
        const sourceId = text(member.dataset.ciiwMsMember); const draft = persistedSnapshot.manualDraftBySource?.[sourceId]; if (!sourceId || !draft) continue;
        const source = member.querySelector('[data-ciiw-ms-manual-source]'); const target = member.querySelector('[data-ciiw-ms-manual-target]');
        if (source) { source.value = text(draft.sourceNodeId).slice(0, 64); dispatch(source, 'input'); }
        if (target) { target.value = text(draft.targetNodeId).slice(0, 64); dispatch(target, 'input'); }
      }
    } finally {
      restoringAnchors = false; saveSession();
    }
  };
  const resetReviewFilters = () => {
    const confidence = container.querySelector('[data-ciiw-confidence-filter]');
    const search = container.querySelector('[data-ciiw-search]');
    const changed = container.querySelector('[data-ciiw-changed-only]');
    if (confidence && confidence.value !== 'ALL') { confidence.value = 'ALL'; dispatch(confidence, 'change'); }
    if (search && search.value) { search.value = ''; dispatch(search, 'input'); }
    if (changed?.checked) { changed.checked = false; dispatch(changed, 'change'); }
  };
  const replayReviewDecisions = (baseline, desired) => {
    restoringReview = true;
    try {
      resetReviewFilters();
      for (const [id, decision] of desired.entries()) {
        if (!decision || baseline.get(id) === decision) continue;
        const control = decisionControl(container, id); if (!control || control.disabled) continue;
        control.value = decision; dispatch(control, 'change');
      }
    } finally { restoringReview = false; }
  };
  const syncReviewFromPreview = () => {
    reviewSyncQueued = false;
    if (disposed || !retainedActive()) return;
    const preview = currentPreview();
    const identity = text(preview?.correspondence?.correspondenceIdentity);
    const rows = preview?.compareReview?.rows || [];
    if (!identity || !rows.length || preview === lastPreview) return;
    lastPreview = preview;
    const baseline = seedCiiMultiSourceReviewDecisions(preview, new Map());
    const validIds = rows.map((row) => text(row?.correspondenceId)).filter(Boolean);
    const restored = restoreCiiWriter2ReviewDecisions(persistedSnapshot, identity, validIds);
    const desired = new Map(baseline);
    if (restored.matched) for (const [id, decision] of Object.entries(restored.decisions || {})) desired.set(id, decision);
    reviewIdentity = identity; reviewValidated = true; reviewShadow = desired;
    if (reviewRestoreIdentity !== identity && restored.matched) {
      reviewRestoreIdentity = identity; replayReviewDecisions(baseline, desired);
    }
    saveSession();
  };
  const queueReviewSync = () => {
    if (reviewSyncQueued || disposed) return; reviewSyncQueued = true;
    scheduleFor(container, syncReviewFromPreview);
  };

  const refresh = () => {
    if (disposed) return;
    const active = multiSource(container);
    if (stages) stages.hidden = active;
    if (active && retainedActive()) restoreAnchors();
    if (!transfer) { queueReviewSync(); return; }
    if (!active) {
      if (transfer.querySelector('[data-ciiw-ms-transfer-waiting]')) transfer.innerHTML = initialTransferHtml;
      return;
    }
    if (!transfer.querySelector('[data-ciiw-ms-transfer="1"]')) {
      const ready = Boolean(analyzeButton && !analyzeButton.disabled);
      const next = transferWaitingMarkup(ready);
      if (transfer.innerHTML !== next) transfer.innerHTML = next;
    }
    queueReviewSync();
  };

  const onClick = (event) => {
    const button = compareTarget(event);
    if (!button || !multiSource(container)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.disabled || analyzeButton?.disabled) return;
    analyzeButton?.click();
  };
  const onDocumentClick = (event) => {
    if (disposed || restoringReview || !retainedActive()) return;
    const button = event.target?.closest?.('[data-ciiw-accept-high], [data-ciiw-accept-medium]');
    if (!button || !container.contains(button) || button.disabled) return;
    const preview = currentPreview(); if (!preview) return;
    const identity = text(preview?.correspondence?.correspondenceIdentity);
    if (!reviewValidated || reviewIdentity !== identity) {
      reviewIdentity = identity; reviewValidated = true; reviewShadow = seedCiiMultiSourceReviewDecisions(preview, new Map());
    }
    const confidence = button.matches('[data-ciiw-accept-high]') ? 'HIGH' : 'MEDIUM';
    for (const row of ciiMultiSourceBulkEligibleRows(preview, reviewShadow, confidence)) reviewShadow.set(text(row.correspondenceId), 'ACCEPT');
    scheduleFor(container, saveSession);
  };
  const onDocumentChange = (event) => {
    if (disposed) return;
    if (event.target === sourceInput || event.target === targetInput) {
      anchorRestoreDone = false; reviewRestoreIdentity = ''; reviewValidated = false; reviewIdentity = ''; reviewShadow = new Map(); lastPreview = null;
      scheduleFor(container, refresh); return;
    }
    if (restoringReview || !retainedActive() || !event.target?.matches?.('[data-ciiw-ms-decision]')) return;
    const id = text(event.target.dataset.ciiwMsDecision); const decision = text(event.target.value).toUpperCase();
    if (!id) return; if (decision) reviewShadow.set(id, decision); else reviewShadow.delete(id);
    scheduleFor(container, saveSession);
  };
  const onDocumentInput = (event) => {
    if (disposed || restoringAnchors || !retainedActive()) return;
    if (event.target?.matches?.('[data-ciiw-ms-manual-source], [data-ciiw-ms-manual-target]')) scheduleFor(container, saveSession);
  };
  const onSourceChange = () => scheduleFor(container, refresh);
  container.addEventListener('click', onClick, true);
  sourceInput?.addEventListener('change', onSourceChange);
  documentRef?.addEventListener('click', onDocumentClick, true);
  documentRef?.addEventListener('change', onDocumentChange, true);
  documentRef?.addEventListener('input', onDocumentInput, true);
  const evidenceObserver = evidence && typeof MutationObserver !== 'undefined'
    ? new MutationObserver(() => { refresh(); queueAnchorSave(); })
    : null;
  evidenceObserver?.observe(evidence, { childList: true, subtree: true });
  const reviewObserver = (results || executive) && typeof MutationObserver !== 'undefined'
    ? new MutationObserver(queueReviewSync)
    : null;
  if (results) reviewObserver?.observe(results, { childList: true, subtree: true });
  else if (executive) reviewObserver?.observe(executive, { childList: true, subtree: true });
  refresh();

  return {
    ...core,
    destroy() {
      disposed = true;
      evidenceObserver?.disconnect(); reviewObserver?.disconnect();
      container.removeEventListener('click', onClick, true);
      sourceInput?.removeEventListener('change', onSourceChange);
      documentRef?.removeEventListener('click', onDocumentClick, true);
      documentRef?.removeEventListener('change', onDocumentChange, true);
      documentRef?.removeEventListener('input', onDocumentInput, true);
      if (stages) stages.hidden = false;
      core?.destroy?.();
    },
  };
}

export const _test = Object.freeze({
  selectedFiles, multiSource, transferWaitingMarkup, compareTarget,
  validNode, selectedBySourceFromDom, manualBySourceFromDom, manualDraftBySourceFromDom, anchorDomState,
  selectedKeysInMember, availableSelectionKeys,
});

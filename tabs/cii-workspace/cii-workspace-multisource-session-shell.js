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
  restoreCiiWriter2AnchorSnapshot,
  restoreCiiWriter2ReviewDecisions,
  saveCiiWriter2Session,
} from './cii-workspace-multisource-session-persistence.js';

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
function reviewOnlyRoute(container) { return Boolean(container.querySelector('[data-ciiw-ms-review-only-transfer="1"]')); }
function retainedActive(container) { return !reviewOnlyRoute(container) && Boolean(container.querySelector('[data-ciiw-ms-anchor-ledger="1"]')); }
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
function validSelectionKeysBySourceFromDom(container) {
  const rows = {};
  for (const member of memberSections(container)) {
    const sourceId = text(member.dataset.ciiwMsMember); if (!sourceId) continue;
    rows[sourceId] = [...member.querySelectorAll('[data-ciiw-base-action][data-ciiw-selection-key]')]
      .map((button) => text(button.dataset.ciiwSelectionKey)).filter(Boolean);
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
export function ciiWriter2AnchorDomState(container) {
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
function clickSelectionKey(member, key) {
  const button = [...member.querySelectorAll('[data-ciiw-base-action][data-ciiw-selection-key]')]
    .find((item) => text(item.dataset.ciiwSelectionKey) === text(key));
  button?.click(); return Boolean(button);
}
function retainedCustody() {
  return Object.freeze({
    sourceSetSha256: CII_MS_SOURCE_SET_SHA256,
    targetOriginalSha256: CII_MS_TARGET_SHA256,
    storageKey: ciiWriter2SessionStorageKey(CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256),
  });
}

export function mountCiiWriter2SessionPersistenceShell(container, core) {
  const sourceInput = container.querySelector('[data-ciiw-source]'); const targetInput = container.querySelector('[data-ciiw-target]');
  const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
  const results = container.querySelector('[data-ciiw-results]'); const executive = container.querySelector('[data-ciiw-executive]');
  const documentRef = container.ownerDocument; const custody = retainedCustody();
  const storage = ciiWriter2SessionStorage(documentRef?.defaultView || globalThis);
  let persistedSnapshot = loadCiiWriter2Session(storage, custody.storageKey);
  let disposed = false; let restoringAnchors = false; let anchorRestoreDone = false; let restoringReview = false;
  let reviewIdentity = ''; let reviewValidated = false; let reviewShadow = new Map(); let lastPreview = null; let reviewRestoreIdentity = '';
  let anchorSaveQueued = false; let reviewSyncQueued = false;

  const currentPreview = () => reviewOnlyRoute(container) ? null : core?.getMultiSourcePreview?.();
  const reviewForSave = () => {
    if (reviewValidated) return { correspondenceIdentity: reviewIdentity, decisions: reviewShadow };
    const saved = persistedSnapshot?.review || {};
    return { correspondenceIdentity: text(saved.correspondenceIdentity), decisions: new Map(Object.entries(saved.decisions || {})) };
  };
  const saveSession = () => {
    if (!retainedActive(container)) return false;
    const review = reviewForSave();
    const snapshot = createCiiWriter2SessionSnapshot({
      sourceSetSha256: custody.sourceSetSha256,
      targetOriginalSha256: custody.targetOriginalSha256,
      ...ciiWriter2AnchorDomState(container),
      correspondenceIdentity: review.correspondenceIdentity,
      reviewDecisions: review.decisions,
    });
    if (!snapshot || !saveCiiWriter2Session(storage, custody.storageKey, snapshot)) return false;
    persistedSnapshot = snapshot; return true;
  };
  const queueAnchorSave = () => {
    if (anchorSaveQueued || disposed || restoringAnchors || !retainedActive(container)) return;
    anchorSaveQueued = true; scheduleFor(container, () => { anchorSaveQueued = false; if (!disposed && !restoringAnchors) saveSession(); });
  };
  const restoreAnchors = () => {
    if (disposed || restoringAnchors || anchorRestoreDone || !retainedActive(container)) return;
    anchorRestoreDone = true;
    const sourceIds = memberSections(container).map((member) => text(member.dataset.ciiwMsMember)).filter(Boolean);
    const restored = restoreCiiWriter2AnchorSnapshot(persistedSnapshot, custody, sourceIds, validSelectionKeysBySourceFromDom(container));
    if (!restored) return;
    const stale = new Set(restored.staleSelectionSourceIds || []);
    restoringAnchors = true;
    try {
      for (const sourceId of sourceIds) {
        const desiredManual = restored.manualBySource?.[sourceId] || [];
        if (desiredManual.length) {
          for (const pair of desiredManual) {
            const existing = ciiWriter2AnchorDomState(container).manualBySource?.[sourceId] || [];
            if (existing.some((row) => row.sourceNodeId === pair.sourceNodeId && row.targetNodeId === pair.targetNodeId)) continue;
            const member = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!member) break;
            const source = member.querySelector('[data-ciiw-ms-manual-source]'); const target = member.querySelector('[data-ciiw-ms-manual-target]');
            if (!source || !target) break;
            source.value = pair.sourceNodeId; target.value = pair.targetNodeId; dispatch(source, 'input'); dispatch(target, 'input');
            member.querySelector('[data-ciiw-ms-manual-add]')?.click();
          }
          continue;
        }
        if (stale.has(sourceId) || !Object.prototype.hasOwnProperty.call(restored.selectedBySource || {}, sourceId)) continue;
        const desired = new Set(restored.selectedBySource[sourceId] || []);
        const member = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!member) continue;
        const current = selectedKeysInMember(member);
        for (const key of new Set([...current, ...desired])) if (current.has(key) !== desired.has(key)) {
          const activeMember = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); if (!activeMember) break;
          clickSelectionKey(activeMember, key);
        }
      }
      for (const sourceId of sourceIds) {
        const member = memberSections(container).find((item) => text(item.dataset.ciiwMsMember) === sourceId); const draft = restored.manualDraftBySource?.[sourceId];
        if (!member || !draft) continue;
        const source = member.querySelector('[data-ciiw-ms-manual-source]'); const target = member.querySelector('[data-ciiw-ms-manual-target]');
        if (source) { source.value = draft.sourceNodeId; dispatch(source, 'input'); }
        if (target) { target.value = draft.targetNodeId; dispatch(target, 'input'); }
      }
    } finally { restoringAnchors = false; saveSession(); }
  };
  const resetReviewFilters = () => {
    const confidence = container.querySelector('[data-ciiw-confidence-filter]'); const search = container.querySelector('[data-ciiw-search]'); const changed = container.querySelector('[data-ciiw-changed-only]');
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
  const seedReviewShadow = (preview, restorePersisted = false) => {
    const identity = text(preview?.correspondence?.correspondenceIdentity); const rows = preview?.compareReview?.rows || [];
    const baseline = seedCiiMultiSourceReviewDecisions(preview, new Map()); const validIds = rows.map((row) => text(row?.correspondenceId)).filter(Boolean);
    const restored = restorePersisted ? restoreCiiWriter2ReviewDecisions(persistedSnapshot, identity, validIds) : { matched: false, decisions: {} };
    const desired = new Map(baseline); if (restored.matched) for (const [id, decision] of Object.entries(restored.decisions || {})) desired.set(id, decision);
    reviewIdentity = identity; reviewValidated = Boolean(identity); reviewShadow = desired;
    return { identity, baseline, restored, desired };
  };
  const syncReviewFromPreview = () => {
    reviewSyncQueued = false;
    if (disposed || !retainedActive(container)) return;
    const preview = currentPreview(); const identity = text(preview?.correspondence?.correspondenceIdentity); const rows = preview?.compareReview?.rows || [];
    if (!identity || !rows.length || preview === lastPreview) return;
    lastPreview = preview;
    const seeded = seedReviewShadow(preview, true);
    if (reviewRestoreIdentity !== identity && seeded.restored.matched) {
      reviewRestoreIdentity = identity; replayReviewDecisions(seeded.baseline, seeded.desired);
    }
    saveSession();
  };
  const queueReviewSync = () => {
    if (reviewSyncQueued || disposed) return; reviewSyncQueued = true; scheduleFor(container, syncReviewFromPreview);
  };
  const onDocumentClick = (event) => {
    if (disposed || restoringReview || !retainedActive(container)) return;
    const button = event.target?.closest?.('[data-ciiw-accept-high], [data-ciiw-accept-medium]');
    if (!button || !container.contains(button) || button.disabled) return;
    const preview = currentPreview(); if (!preview) return;
    const identity = text(preview?.correspondence?.correspondenceIdentity);
    if (!reviewValidated || reviewIdentity !== identity) seedReviewShadow(preview, true);
    const confidence = button.matches('[data-ciiw-accept-high]') ? 'HIGH' : 'MEDIUM';
    for (const row of ciiMultiSourceBulkEligibleRows(preview, reviewShadow, confidence)) reviewShadow.set(text(row.correspondenceId), 'ACCEPT');
    scheduleFor(container, saveSession);
  };
  const resetRuntime = () => {
    anchorRestoreDone = false; reviewRestoreIdentity = ''; reviewValidated = false; reviewIdentity = ''; reviewShadow = new Map(); lastPreview = null;
  };
  const onDocumentChange = (event) => {
    if (disposed) return;
    if (event.target === sourceInput || event.target === targetInput) { resetRuntime(); return; }
    if (restoringReview || !retainedActive(container) || !event.target?.matches?.('[data-ciiw-ms-decision]')) return;
    const id = text(event.target.dataset.ciiwMsDecision); const decision = text(event.target.value).toUpperCase(); if (!id) return;
    if (decision) reviewShadow.set(id, decision); else reviewShadow.delete(id);
    scheduleFor(container, saveSession);
  };
  const onDocumentInput = (event) => {
    if (disposed || restoringAnchors || !retainedActive(container)) return;
    if (event.target?.matches?.('[data-ciiw-ms-manual-source], [data-ciiw-ms-manual-target]')) scheduleFor(container, saveSession);
  };

  documentRef?.addEventListener('click', onDocumentClick, true);
  documentRef?.addEventListener('change', onDocumentChange, true);
  documentRef?.addEventListener('input', onDocumentInput, true);
  const evidenceObserver = evidence && typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { restoreAnchors(); queueAnchorSave(); }) : null;
  evidenceObserver?.observe(evidence, { childList: true, subtree: true });
  const reviewObserver = (results || executive) && typeof MutationObserver !== 'undefined' ? new MutationObserver(queueReviewSync) : null;
  if (results) reviewObserver?.observe(results, { childList: true, subtree: true }); else if (executive) reviewObserver?.observe(executive, { childList: true, subtree: true });
  restoreAnchors(); queueReviewSync();

  return Object.freeze({
    save: saveSession,
    destroy() {
      disposed = true; evidenceObserver?.disconnect(); reviewObserver?.disconnect();
      documentRef?.removeEventListener('click', onDocumentClick, true); documentRef?.removeEventListener('change', onDocumentChange, true); documentRef?.removeEventListener('input', onDocumentInput, true);
    },
  });
}

export const _test = Object.freeze({
  validNode, reviewOnlyRoute, retainedActive, memberSections,
  selectedBySourceFromDom, validSelectionKeysBySourceFromDom, manualBySourceFromDom, manualDraftBySourceFromDom,
  decisionControl, selectedKeysInMember, retainedCustody,
});

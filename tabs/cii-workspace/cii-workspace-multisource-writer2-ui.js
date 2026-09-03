import { mountCiiWorkspaceScopedEngineeringShell } from './cii-workspace-transfer-scope-ui.js';
import { baseAnchorEvidenceMarkup } from './cii-workspace-engineering-ui.js';
import {
  buildCiiSelectedBaseLoops,
  ciiQualifiedLoopsForSuggestion,
  ciiSuggestionSelectionKey,
} from './cii-workspace-base-loop-selection.js';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from './cii-workspace-source-set.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from './cii-workspace-multisource-preview.js';
import { createCiiExpectedNodeNameSourceSetSelection } from './cii-workspace-multisource-scope.js';
import { bindCiiTransferScopeToPreview } from './cii-workspace-transfer-scope.js';
import { applyCiiWorkspaceTargetWriter2WithVersionBridge } from './cii-workspace-writer-version-bridge.js';
import { ciiSha256 } from './cii-workspace-v11-v14-converter.js';

const CII_MS_SOURCE_SHA_TO_ID = Object.freeze({
  '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b': 'S1',
  '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd': 'S2',
  'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa': 'S3',
});
const CII_MS_CANONICAL_SOURCE_IDS = Object.freeze(['S1', 'S2', 'S3']);

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
function selectedFiles(input) { return [...(input?.files || [])]; }
function sourceRows(files) { return files.map((file, index) => ({ sourceId: `S${index + 1}`, fileName: file.name, file })); }
function canonicalSourceIdForSha256(value) { return CII_MS_SOURCE_SHA_TO_ID[String(value || '').toLowerCase()] || null; }
async function sourceInputs(files, cryptoRef = globalThis.crypto) {
  const byId = new Map();
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha256 = await ciiSha256(bytes, cryptoRef);
    const sourceId = canonicalSourceIdForSha256(sha256);
    if (!sourceId) throw new Error(`Unrecognized SOURCE file ${file.name}. This retained Writer2 route requires the exact S1/S2/S3 files.`);
    if (byId.has(sourceId)) throw new Error(`Duplicate retained SOURCE identity ${sourceId}. Select S1, S2 and S3 exactly once.`);
    byId.set(sourceId, { sourceId, fileName: file.name, bytes, originalSha256: sha256 });
  }
  const missing = CII_MS_CANONICAL_SOURCE_IDS.filter((id) => !byId.has(id));
  if (missing.length || byId.size !== CII_MS_CANONICAL_SOURCE_IDS.length) {
    throw new Error(`Writer2 multi-source requires exact S1/S2/S3 custody. Missing: ${missing.join(', ') || 'none'}.`);
  }
  return CII_MS_CANONICAL_SOURCE_IDS.map((id) => byId.get(id));
}
function shortSha(value) {
  const text = String(value || '');
  return text.length > 20 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text || '—';
}
function binaryBytes(value) {
  const raw = String(value ?? ''); const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index) & 0xff;
  return bytes;
}
function downloadApplied(documentRef, applied) {
  if (applied?.versionBridgeValidation?.status !== 'PASS' || typeof applied?.byteString !== 'string') {
    throw new Error('CII_MS_WRITER2_VERSION_BRIDGE_OUTPUT_REQUIRED');
  }
  const url = URL.createObjectURL(new Blob([binaryBytes(applied.byteString)], { type: 'text/plain' }));
  const link = documentRef.createElement('a'); link.href = url; link.download = applied.fileName; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
export function ciiSourceSetCustodyMarkup(inspection) {
  const sourceSet = inspection?.sourceSet; const rows = sourceSet?.members || [];
  if (!sourceSet || !rows.length) return '<div class="ciiw-method-empty"><b>Source-set custody unavailable.</b></div>';
  return `<section class="ciiw-base-set" data-ciiw-source-set-custody="1"><header><div><b>Writer 2 multi-source custody</b><span>${h(rows.length)} independent SOURCE members</span></div><span class="ciiw-corroboration">SOURCE SET</span></header><p><b>Source-set SHA-256:</b> <code>${h(sourceSet.sourceSetSha256)}</code></p><table class="ciiw-mini-grid"><thead><tr><th>ID</th><th>File</th><th>Version</th><th>Original SHA</th><th>Normalized SHA</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${h(row.sourceId)}</b></td><td>${h(row.fileName)}</td><td>${h(row.originalVersion)} → ${h(row.normalizedVersion)}</td><td><code>${h(shortSha(row.originalSha256))}</code></td><td><code>${h(shortSha(row.normalizedSha256))}</code></td></tr>`).join('')}</tbody></table><p><b>TARGET original SHA:</b> <code>${h(inspection.versionBridge?.target?.originalSha256 || '—')}</code></p></section>`;
}
function setManualDisabled(container, disabled) {
  const source = container.querySelector('[data-ciiw-source-anchors]'); const target = container.querySelector('[data-ciiw-target-anchors]');
  if (source) source.disabled = disabled; if (target) target.disabled = disabled;
}
function setMultiSourceStatus(container, message) {
  const status = container.querySelector('[data-ciiw-status]'); if (status) status.textContent = message;
}
function multiSource(container) { return selectedFiles(container.querySelector('[data-ciiw-source]')).length > 1; }
function manualRows(manualBySource, sourceId) { return [...(manualBySource.get(sourceId) || [])]; }
function manualDraft(manualDraftBySource, sourceId) {
  return manualDraftBySource.get(sourceId) || { sourceNodeId: '', targetNodeId: '' };
}
function manualAnchorMarkup(item, manualBySource, manualDraftBySource) {
  const pairs = manualRows(manualBySource, item.sourceId); const draft = manualDraft(manualDraftBySource, item.sourceId);
  const pairList = pairs.length
    ? `<ol>${pairs.map((pair, index) => `<li><b>${h(pair.sourceNodeId)} ↔ ${h(pair.targetNodeId)}</b> <button type="button" data-ciiw-ms-manual-remove="${index}">Remove</button></li>`).join('')}</ol>`
    : '<p>No reviewed manual anchor is locked for this SOURCE.</p>';
  return `<section class="ciiw-base-set" data-ciiw-ms-manual-editor="1"><header><div><b>Manual / reviewed anchor fallback</b><span>${h(pairs.length)} locked pair${pairs.length === 1 ? '' : 's'}</span></div><span class="ciiw-corroboration">USER LOCKED</span>${pairs.length ? '<button type="button" data-ciiw-ms-manual-clear>Clear manual anchors</button>' : ''}</header><p>Use this when Method A/B cannot qualify a base. Enter nodes that you have reviewed as the same physical point. Manual anchors replace automatic base loops for this SOURCE; they do not weaken target-conflict checks.</p>${pairList}<div class="ciiw-detail-grid"><label><b>SOURCE node</b><input type="text" inputmode="numeric" data-ciiw-ms-manual-source value="${h(draft.sourceNodeId)}" placeholder="e.g. 1360"></label><label><b>TARGET node</b><input type="text" inputmode="numeric" data-ciiw-ms-manual-target value="${h(draft.targetNodeId)}" placeholder="reviewed target node"></label></div><div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-ms-manual-add>Add reviewed anchor</button></div><small>Tip: clicking “Use manual anchor” above only prefills these fields. Edit either node before adding if the structural suggestion is not the point you intend to lock.</small></section>`;
}
function renderMemberAnchors(inspection, selectedBySource, manualBySource = new Map(), manualDraftBySource = new Map()) {
  const members = inspection?.memberInspections || [];
  return `${ciiSourceSetCustodyMarkup(inspection)}${members.map((item) => {
    const selected = selectedBySource.get(item.sourceId) || new Set();
    return `<section class="ciiw-method-evidence" data-ciiw-ms-member="${h(item.sourceId)}"><h3>${h(item.sourceId)} · ${h(item.fileName)}</h3>${baseAnchorEvidenceMarkup(item.inspection, selected)}${manualAnchorMarkup(item, manualBySource, manualDraftBySource)}</section>`;
  }).join('')}`;
}
function selectedBaseLoopsBySource(inspection, selectedBySource) {
  const rows = [];
  for (const item of inspection?.memberInspections || []) {
    const loops = buildCiiSelectedBaseLoops(item.inspection?.baseAnchorSuggestions || [], selectedBySource.get(item.sourceId) || new Set());
    if (loops.length) rows.push([item.sourceId, loops]);
  }
  return Object.fromEntries(rows);
}
function manualAnchorPairsBySource(inspection, manualBySource) {
  const rows = [];
  for (const item of inspection?.memberInspections || []) {
    const pairs = manualRows(manualBySource, item.sourceId);
    if (pairs.length) rows.push([item.sourceId, pairs]);
  }
  return Object.fromEntries(rows);
}
function allMembersHaveBase(inspection, selectedBySource, manualBySource = new Map()) {
  const automatic = selectedBaseLoopsBySource(inspection, selectedBySource);
  const manual = manualAnchorPairsBySource(inspection, manualBySource);
  return (inspection?.memberInspections || []).length > 0
    && (inspection?.memberInspections || []).every((item) => (automatic[item.sourceId] || []).length > 0 || (manual[item.sourceId] || []).length > 0);
}
function validManualNode(value) {
  const text = String(value ?? '').trim(); const number = Number(text);
  return text && Number.isSafeInteger(number) ? String(number) : null;
}
function buildAutomaticReview(preview) {
  return Object.fromEntries((preview?.memberPreviews || []).map(({ sourceId, preview: member }) => {
    const rows = member?.compareReview?.rows || [];
    return [sourceId, {
      reviewedCorrespondenceIds: rows.filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).map((row) => row.correspondenceId),
      lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
      rejectedCorrespondenceIds: [],
    }];
  }));
}
function nodeNameChangeRows(preview) {
  return (preview?.engineeringDeltas?.changedRows || []).filter((row) => row.category === 'NODE_NAME' && row.property === 'Node name / to-name');
}
function nodeNameChangesMarkup(preview) {
  const rows = nodeNameChangeRows(preview); const operations = new Map((preview?.transferPlan?.operations || [])
    .filter((operation) => operation?.engineeringDeltaId).map((operation) => [operation.engineeringDeltaId, operation]));
  if (!rows.length) return '<p>No qualified multi-source Node Name changes are currently available.</p>';
  return `<table class="ciiw-grid"><thead><tr><th>Source</th><th>Correspondence</th><th>SOURCE candidate</th><th>Current TARGET</th><th>Writer2</th><th>BM-001</th></tr></thead><tbody>${rows.map((row) => {
    const operation = operations.get(row.deltaId); const acceptance = operation?.bm001Acceptance;
    return `<tr><td><b>${h(row.sourceId)}</b></td><td>${h(row.sourceIdentity)} → ${h(row.targetIdentity)}</td><td>${h(row.sourceValue || '—')}</td><td>${h(row.targetValue || '—')}</td><td>${h(operation?.action || '—')}<small>${h(operation?.status || '—')}</small></td><td>${acceptance?.status === 'BOUND' ? `<b>BOUND</b><small>${h(acceptance.groupedKey)}</small>` : 'NOT BOUND'}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function transferMarkup(raw, scoped) {
  const view = scoped || raw; const plan = view?.transferPlan; if (!plan) return '';
  const scope = plan.transferScope; const candidates = [...(raw?.transferPlan?.operations || []), ...(raw?.transferPlan?.excludedOperations || [])];
  const boundExpected = candidates.filter((item) => item?.bm001Acceptance?.status === 'BOUND' && ['CREATE', 'DELETE'].includes(item.action)).length;
  const ready = scope?.status === 'BOUND' && view?.writerReadiness?.ready === true;
  const excluded = plan.excludedOperations?.length || 0;
  return `<section class="ciiw-transfer-scope" data-ciiw-ms-transfer="1"><header><div><h3>Multi-source Writer2 exact scope</h3><p>Only BM-001-bound NODENAME CREATE/DELETE can become APPLY. All other mutable candidates are EXCLUDE.</p></div><div class="ciiw-transfer-scope-status">${h(scope?.status || 'UNBOUND')}</div></header><p><b>Source-set:</b> <code>${h(raw.sourceSetSha256)}</code><br><b>Original TARGET:</b> <code>${h(raw.targetAuthority?.originalSha256 || '—')}</code></p><p><b>BM-001:</b> ${h(raw.bm001Authority?.rowCount || 0)} expected rows · <b>bound Writer2 candidates:</b> ${h(boundExpected)} · <b>EXCLUDE:</b> ${h(excluded)}</p><div class="ciiw-transfer-scope-actions"><button type="button" data-ciiw-ms-bind-expected ${raw.transferPlan?.status === 'PREVIEW_READY' ? '' : 'disabled'}>Bind expected Node Name changes only</button><button type="button" data-ciiw-ms-apply ${ready ? '' : 'disabled'}>Apply scoped Writer2 to TARGET copy</button></div>${scope?.scopeId ? `<small>Scope ID: ${h(scope.scopeId)}</small>` : ''}${view?.writerReadiness?.blockers?.length ? `<p><b>Writer blockers:</b> ${h(view.writerReadiness.blockers.join(' · '))}</p>` : ''}</section>`;
}
function switchTab(container, name) { container.querySelector(`[data-ciiw-tab="${name}"]`)?.click(); }

export function mountCiiWriter2MultiSourceShell(container, options = {}) {
  const legacy = mountCiiWorkspaceScopedEngineeringShell(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]'); const targetInput = container.querySelector('[data-ciiw-target]');
  const inspectButton = container.querySelector('[data-ciiw-inspect]'); const analyzeButton = container.querySelector('[data-ciiw-analyze]');
  const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
  const results = container.querySelector('[data-ciiw-results]'); const transfer = container.querySelector('[data-ciiw-transfer]');
  if (!sourceInput || !targetInput || !inspectButton || !analyzeButton) return legacy;
  sourceInput.multiple = true;
  let disposed = false; let inspection = null; let cachedSources = null; let cachedTargetBytes = null; let cachedTargetName = null;
  let preview = null; let scopedPreview = null; const selectedBySource = new Map(); const manualBySource = new Map(); const manualDraftBySource = new Map();

  const authorityReady = () => allMembersHaveBase(inspection, selectedBySource, manualBySource);
  const refreshAnchorEvidence = () => {
    if (evidence && inspection) { evidence.innerHTML = renderMemberAnchors(inspection, selectedBySource, manualBySource, manualDraftBySource); bindAnchorActions(); }
    analyzeButton.disabled = !authorityReady();
  };
  const resetMulti = () => {
    inspection = null; cachedSources = null; cachedTargetBytes = null; cachedTargetName = null; preview = null; scopedPreview = null;
    selectedBySource.clear(); manualBySource.clear(); manualDraftBySource.clear();
    if (multiSource(container)) {
      analyzeButton.disabled = true; setManualDisabled(container, true);
      setMultiSourceStatus(container, `${selectedFiles(sourceInput).length} SOURCE CII files selected. Inspect each member, then select a qualified base or add a reviewed manual anchor per source.`);
    } else {
      analyzeButton.disabled = false; setManualDisabled(container, false);
    }
  };
  function bindAnchorActions() {
    if (!evidence || !inspection) return;
    evidence.querySelectorAll('[data-ciiw-ms-member]').forEach((section) => {
      const id = section.dataset.ciiwMsMember; const member = inspection.memberInspections.find((item) => item.sourceId === id);
      section.querySelectorAll('[data-ciiw-base-action]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault(); event.stopImmediatePropagation();
          const key = button.dataset.ciiwSelectionKey; const suggestion = (member?.inspection?.baseAnchorSuggestions || []).find((row) => ciiSuggestionSelectionKey(row) === key);
          if (!suggestion) return;
          if (!ciiQualifiedLoopsForSuggestion(suggestion).length) {
            manualDraftBySource.set(id, { sourceNodeId: String(suggestion.sourceNodeId), targetNodeId: String(suggestion.targetNodeId) });
            refreshAnchorEvidence();
            setMultiSourceStatus(container, `${id}: manual fallback prefilled ${suggestion.sourceNodeId} ↔ ${suggestion.targetNodeId}. Review/edit both node IDs, then click Add reviewed anchor.`);
            return;
          }
          manualBySource.set(id, []); manualDraftBySource.set(id, { sourceNodeId: '', targetNodeId: '' });
          const selected = selectedBySource.get(id) || new Set(); if (selected.has(key)) selected.delete(key); else selected.add(key); selectedBySource.set(id, selected);
          refreshAnchorEvidence();
          setMultiSourceStatus(container, authorityReady() ? 'All SOURCE members have base authority. Compare multi-source models.' : 'For every SOURCE, select a qualified base or add at least one reviewed manual anchor.');
        }, true);
      });
      const sourceField = section.querySelector('[data-ciiw-ms-manual-source]'); const targetField = section.querySelector('[data-ciiw-ms-manual-target]');
      const updateDraft = () => manualDraftBySource.set(id, { sourceNodeId: sourceField?.value || '', targetNodeId: targetField?.value || '' });
      sourceField?.addEventListener('input', updateDraft); targetField?.addEventListener('input', updateDraft);
      section.querySelector('[data-ciiw-ms-manual-add]')?.addEventListener('click', (event) => {
        event.preventDefault(); updateDraft();
        const draft = manualDraft(manualDraftBySource, id); const sourceNodeId = validManualNode(draft.sourceNodeId); const targetNodeId = validManualNode(draft.targetNodeId);
        if (!sourceNodeId || !targetNodeId) { setMultiSourceStatus(container, `${id}: enter integer SOURCE and TARGET node IDs before adding the reviewed anchor.`); return; }
        const pairs = manualRows(manualBySource, id); const key = `${sourceNodeId}=>${targetNodeId}`;
        if (!pairs.some((pair) => `${pair.sourceNodeId}=>${pair.targetNodeId}` === key)) pairs.push({ sourceNodeId, targetNodeId });
        manualBySource.set(id, pairs); selectedBySource.set(id, new Set()); manualDraftBySource.set(id, { sourceNodeId: '', targetNodeId: '' });
        refreshAnchorEvidence();
        setMultiSourceStatus(container, `${id}: reviewed manual anchor ${sourceNodeId} ↔ ${targetNodeId} locked. ${authorityReady() ? 'All SOURCE members now have base authority.' : 'Add/select base authority for the remaining SOURCE members.'}`);
      });
      section.querySelectorAll('[data-ciiw-ms-manual-remove]').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault(); const index = Number(button.dataset.ciiwMsManualRemove); const pairs = manualRows(manualBySource, id); pairs.splice(index, 1); manualBySource.set(id, pairs); refreshAnchorEvidence();
        setMultiSourceStatus(container, `${id}: manual anchor removed.`);
      }));
      section.querySelector('[data-ciiw-ms-manual-clear]')?.addEventListener('click', (event) => {
        event.preventDefault(); manualBySource.set(id, []); refreshAnchorEvidence(); setMultiSourceStatus(container, `${id}: manual anchors cleared.`);
      });
    });
  }
  const inspectMultiSource = async (event) => {
    if (!multiSource(container)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try {
      const targetFile = selectedFiles(targetInput)[0]; if (!targetFile) throw new Error('TARGET CII file is required.');
      cachedSources = await sourceInputs(selectedFiles(sourceInput), options.cryptoRef); cachedTargetBytes = new Uint8Array(await targetFile.arrayBuffer()); cachedTargetName = targetFile.name;
      setMultiSourceStatus(container, `Inspecting ${cachedSources.length} canonical SOURCE members S1/S2/S3 through the frozen V11↔V14 bridge…`);
      inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({ sources: cachedSources, targetBytes: cachedTargetBytes, targetFileName: cachedTargetName }, { cryptoRef: options.cryptoRef });
      if (disposed) return; selectedBySource.clear(); manualBySource.clear(); manualDraftBySource.clear();
      for (const item of inspection.memberInspections) { selectedBySource.set(item.sourceId, new Set()); manualBySource.set(item.sourceId, []); manualDraftBySource.set(item.sourceId, { sourceNodeId: '', targetNodeId: '' }); }
      refreshAnchorEvidence();
      setMultiSourceStatus(container, `Source-set custody READY: ${inspection.sourceSet.memberCount} members in canonical S1/S2/S3 order. Select a qualified base or add a reviewed manual anchor independently for each source.`);
    } catch (error) {
      if (!disposed) { if (evidence) evidence.innerHTML = `<div class="ciiw-method-empty"><b>Multi-source intake blocked</b><p>${h(error?.message || error)}</p></div>`; setMultiSourceStatus(container, error?.message || String(error)); }
    }
  };
  const analyzeMultiSource = async (event) => {
    if (!multiSource(container)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try {
      if (!inspection || !cachedSources || !cachedTargetBytes) throw new Error('Inspect the source set before Compare.');
      const baseLoopsBySource = selectedBaseLoopsBySource(inspection, selectedBySource);
      const anchorPairsBySource = manualAnchorPairsBySource(inspection, manualBySource);
      if (!allMembersHaveBase(inspection, selectedBySource, manualBySource)) throw new Error('Each SOURCE requires either a qualified Method A/B base or at least one reviewed manual anchor.');
      setMultiSourceStatus(container, 'Building per-source correspondence with reviewed base authority and target conflict veto…');
      const firstPass = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        sources: cachedSources, targetBytes: cachedTargetBytes, targetFileName: cachedTargetName, baseLoopsBySource, anchorPairsBySource,
        acceptanceIdentityResolver: options.acceptanceIdentityResolver,
      }, { cryptoRef: options.cryptoRef });
      const reviewBySource = buildAutomaticReview(firstPass);
      preview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
        sources: cachedSources, targetBytes: cachedTargetBytes, targetFileName: cachedTargetName, baseLoopsBySource, anchorPairsBySource, reviewBySource,
        acceptanceIdentityResolver: options.acceptanceIdentityResolver,
      }, { cryptoRef: options.cryptoRef });
      if (disposed) return; scopedPreview = null;
      if (results) results.innerHTML = nodeNameChangesMarkup(preview);
      if (transfer) { transfer.innerHTML = transferMarkup(preview, scopedPreview); bindTransferActions(); }
      switchTab(container, 'compare');
      setMultiSourceStatus(container, `Multi-source correspondence ${preview.correspondence.status}. Node Name changes ${nodeNameChangeRows(preview).length}; BM-001 expected ${preview.bm001Authority.rowCount}.`);
    } catch (error) { if (!disposed) setMultiSourceStatus(container, error?.message || String(error)); }
  };
  const bindExpectedScope = async () => {
    if (!preview) return;
    try {
      const exact = await createCiiExpectedNodeNameSourceSetSelection(preview.transferPlan, { cryptoRef: options.cryptoRef });
      scopedPreview = bindCiiTransferScopeToPreview(preview, exact.selection);
      if (transfer) { transfer.innerHTML = transferMarkup(preview, scopedPreview); bindTransferActions(); }
      switchTab(container, 'transfer');
      setMultiSourceStatus(container, `Expected-only scope bound: ${exact.appliedOperationIds.length} APPLY; ${exact.excludedOperationIds.length} EXCLUDE. Writer2 ${scopedPreview.writerReadiness.status}.`);
    } catch (error) { setMultiSourceStatus(container, error?.message || String(error)); }
  };
  const applyScoped = async () => {
    if (!scopedPreview?.writerReadiness?.ready) return;
    try {
      setMultiSourceStatus(container, 'Applying expected-only Writer2 NODENAME scope to one TARGET copy through the frozen V11↔V14 bridge…');
      const applied = await applyCiiWorkspaceTargetWriter2WithVersionBridge(scopedPreview, cachedTargetBytes, { cryptoRef: options.cryptoRef });
      downloadApplied(container.ownerDocument, applied);
      setMultiSourceStatus(container, `Modified TARGET exported: ${applied.mutationCount} Writer2 field changes; version bridge ${applied.versionBridgeValidation.status}.`);
    } catch (error) { setMultiSourceStatus(container, error?.message || String(error)); }
  };
  function bindTransferActions() {
    transfer?.querySelector('[data-ciiw-ms-bind-expected]')?.addEventListener('click', () => { void bindExpectedScope(); });
    transfer?.querySelector('[data-ciiw-ms-apply]')?.addEventListener('click', () => { void applyScoped(); });
  }
  const blockLegacyAnalyze = (event) => { if (multiSource(container)) { event.preventDefault(); event.stopImmediatePropagation(); } };
  sourceInput.addEventListener('change', resetMulti); targetInput.addEventListener('change', resetMulti);
  inspectButton.addEventListener('click', inspectMultiSource, true);
  analyzeButton.addEventListener('click', analyzeMultiSource, true);
  analyzeButton.addEventListener('click', blockLegacyAnalyze, true);
  resetMulti();
  return {
    ...legacy,
    getMultiSourcePreview() { return scopedPreview || preview; },
    destroy() {
      disposed = true; sourceInput.removeEventListener('change', resetMulti); targetInput.removeEventListener('change', resetMulti);
      inspectButton.removeEventListener('click', inspectMultiSource, true); analyzeButton.removeEventListener('click', analyzeMultiSource, true);
      analyzeButton.removeEventListener('click', blockLegacyAnalyze, true); legacy.destroy();
    },
  };
}

export const _test = Object.freeze({
  selectedFiles, sourceRows, sourceInputs, canonicalSourceIdForSha256, shortSha,
  selectedBaseLoopsBySource, manualAnchorPairsBySource, allMembersHaveBase, validManualNode,
  buildAutomaticReview, nodeNameChangeRows,
});
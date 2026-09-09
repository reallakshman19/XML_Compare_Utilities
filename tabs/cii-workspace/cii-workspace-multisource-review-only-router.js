import { ciiAutomaticBaseSelection } from './cii-workspace-base-loop-selection.js';
import {
  CII_MS_REVIEW_ONLY_WRITE_BLOCKER,
  createCiiMultiSourceReviewOnlyPreviewWithVersionBridge,
} from './cii-workspace-multisource-review-only.js';
import { ciiMultiSourceReviewMarkup, ciiMultiSourceReviewSummaryMarkup } from './cii-workspace-multisource-review-ui.js';
import { CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256 } from './cii-workspace-multisource-nodename-authority.js';
import { inspectCiiWorkspaceSourceSetWithVersionBridge, ciiSourceSetSha256 } from './cii-workspace-source-set.js';
import { ciiSha256 } from './cii-workspace-v11-v14-converter.js';
import { mountCiiWriter2MultiSourceShell } from './cii-workspace-multisource-writer2-ui.js?v=20260909-ms-custody-auto-1';

const ROUTER_MODE = 'GENERIC_REVIEW_ONLY';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
function selectedFiles(input) { return Array.from(input?.files || []); }
async function bytesForFile(file) { return new Uint8Array(await file.arrayBuffer()); }
function sourceSetMembersForHashes(hashes) {
  return hashes.map((originalSha256, index) => ({ sourceId: `S${index + 1}`, originalSha256 }));
}
function threePermutations(values) {
  if (values.length !== 3) return [];
  return [
    [values[0], values[1], values[2]], [values[0], values[2], values[1]],
    [values[1], values[0], values[2]], [values[1], values[2], values[0]],
    [values[2], values[0], values[1]], [values[2], values[1], values[0]],
  ];
}
async function retainedSourceHashSet(hashes, cryptoRef = globalThis.crypto) {
  for (const permutation of threePermutations(hashes)) {
    const digest = await ciiSourceSetSha256(sourceSetMembersForHashes(permutation), cryptoRef);
    if (digest === CII_MS_SOURCE_SET_SHA256) return true;
  }
  return false;
}
async function classifyMultiSourceFiles(sourceFiles, targetFile, cryptoRef = globalThis.crypto) {
  const sourceBytes = await Promise.all(sourceFiles.map(bytesForFile));
  const targetBytes = await bytesForFile(targetFile);
  const sourceHashes = await Promise.all(sourceBytes.map((bytes) => ciiSha256(bytes, cryptoRef)));
  const targetSha256 = await ciiSha256(targetBytes, cryptoRef);
  const retained = sourceFiles.length === 3
    && targetSha256 === CII_MS_TARGET_SHA256
    && await retainedSourceHashSet(sourceHashes, cryptoRef);
  return Object.freeze({ retained, sourceBytes: Object.freeze(sourceBytes), targetBytes, sourceHashes: Object.freeze(sourceHashes), targetSha256 });
}
function genericSources(files, bytes) {
  return Object.freeze(files.map((file, index) => Object.freeze({
    sourceId: `S${index + 1}`,
    fileName: file.name || `SOURCE-${index + 1}.CII`,
    bytes: bytes[index],
  })));
}
function autoAnchorState(inspection) {
  const choices = []; const baseLoopsBySource = {}; const unresolved = [];
  for (const member of inspection?.memberInspections || []) {
    const choice = ciiAutomaticBaseSelection(member?.inspection?.baseAnchorSuggestions || []);
    const sourceId = String(member?.sourceId || '');
    choices.push(Object.freeze({ sourceId, fileName: member?.fileName || '', ...choice }));
    if (choice.status === 'READY' && (choice.baseLoops || []).length) baseLoopsBySource[sourceId] = choice.baseLoops;
    else unresolved.push(sourceId);
  }
  return Object.freeze({
    choices: Object.freeze(choices),
    baseLoopsBySource: Object.freeze(baseLoopsBySource),
    unresolved: Object.freeze(unresolved),
    ready: choices.length > 1 && unresolved.length === 0,
  });
}
function inspectionMarkup(state) {
  const rows = state.auto.choices.map((choice) => `<tr><td><b>${h(choice.sourceId)}</b><small>${h(choice.fileName)}</small></td><td>${h(choice.status || 'REVIEW')}</td><td>${h(choice.sourceNodeId || '—')} ↔ ${h(choice.targetNodeId || '—')}</td><td>${h(choice.confidence || '—')}</td><td>${h(choice.basisMethod || choice.reason || '—')}</td></tr>`).join('');
  return `<section class="ciiw-base-set" data-ciiw-ms-review-only-inspection="1"><header><div><b>Generic multi-source review only</b><span>${h(state.sources.length)} independent SOURCE members · no Writer2 write authority</span></div><span class="ciiw-corroboration">REVIEW ONLY</span></header><p>Each source is normalized and compared independently against the same TARGET. Only deterministic READY Auto Anchor bases are admitted in this generic UI path. No BM-001 scope or Writer2 Apply can be created.</p><table class="ciiw-mini-grid"><thead><tr><th>Source</th><th>Auto Anchor</th><th>Base pair</th><th>Confidence</th><th>Basis</th></tr></thead><tbody>${rows}</tbody></table><p><b>${state.auto.ready ? 'READY FOR REVIEW' : 'REVIEW BLOCKED'}</b>${state.auto.unresolved.length ? ` · deterministic base unresolved for ${h(state.auto.unresolved.join(', '))}` : ''}</p></section>`;
}
function waitingMarkup(state) {
  return `<section class="ciiw-transfer-scope" data-ciiw-ms-transfer="1" data-ciiw-ms-review-only-transfer="1"><header><div><h3>Multi-source review-only boundary</h3><p>Correspondence review is allowed; target mutation is blocked by design.</p></div><div class="ciiw-transfer-scope-status">${state.auto.ready ? 'READY FOR REVIEW' : 'BLOCKED'}</div></header><p><b>Writer2 blocker:</b> ${h(CII_MS_REVIEW_ONLY_WRITE_BLOCKER)}</p></section>`;
}
function transferMarkup(preview) {
  return `<section class="ciiw-transfer-scope" data-ciiw-ms-transfer="1" data-ciiw-ms-review-only-transfer="1"><header><div><h3>Multi-source review-only result</h3><p>Review/audit evidence exists, but no target mutation operation is authorized.</p></div><div class="ciiw-transfer-scope-status">REVIEW ONLY</div></header><p><b>Source-set:</b> <code>${h(preview?.sourceSetSha256 || '—')}</code><br><b>Original TARGET:</b> <code>${h(preview?.targetAuthority?.originalSha256 || '—')}</code></p><p><b>Correspondence:</b> ${h(preview?.correspondence?.status || '—')} · <b>review rows:</b> ${h(preview?.compareReview?.rows?.length || 0)} · <b>Writer2 operations:</b> 0</p><p><b>Writer2 blocker:</b> ${h(CII_MS_REVIEW_ONLY_WRITE_BLOCKER)}</p></section>`;
}
function setStatus(container, message) {
  const status = container.querySelector('[data-ciiw-status]');
  if (status) status.textContent = message;
}
function downloadPayload(documentRef, fileName, payload, type) {
  const blob = new Blob([payload], { type }); const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.style.display = 'none';
  documentRef.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

export function mountCiiWriter2MultiSourceReviewRouter(container, options = {}) {
  const retained = mountCiiWriter2MultiSourceShell(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]'); const targetInput = container.querySelector('[data-ciiw-target]');
  const inspectButton = container.querySelector('[data-ciiw-inspect]'); const analyzeButton = container.querySelector('[data-ciiw-analyze]');
  const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
  const executive = container.querySelector('[data-ciiw-executive]'); const results = container.querySelector('[data-ciiw-results]');
  const deltas = container.querySelector('[data-ciiw-deltas]'); const transfer = container.querySelector('[data-ciiw-transfer]');
  const reviewButton = container.querySelector('[data-ciiw-refresh-review]'); const acceptHigh = container.querySelector('[data-ciiw-accept-high]');
  const acceptMedium = container.querySelector('[data-ciiw-accept-medium]'); const csvButton = container.querySelector('[data-ciiw-export-csv]');
  const jsonButton = container.querySelector('[data-ciiw-export-json]');
  if (!sourceInput || !targetInput || !inspectButton || !analyzeButton) return retained;

  let disposed = false; let state = null; let bypassRetainedInspect = false;
  const disableWriteReviewControls = () => {
    if (reviewButton) reviewButton.disabled = true; if (acceptHigh) acceptHigh.disabled = true; if (acceptMedium) acceptMedium.disabled = true;
  };
  const resetGeneric = () => { state = null; disableWriteReviewControls(); if (csvButton) csvButton.disabled = true; if (jsonButton) jsonButton.disabled = true; };
  const inspectGeneric = async (classified, sourceFiles, targetFile) => {
    const sources = genericSources(sourceFiles, classified.sourceBytes);
    setStatus(container, `Inspecting ${sources.length} SOURCE members in REVIEW ONLY mode…`);
    const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
      sources, targetBytes: classified.targetBytes, targetFileName: targetFile.name || 'TARGET.CII',
    }, { cryptoRef: options.cryptoRef });
    if (disposed) return;
    const auto = autoAnchorState(inspection);
    state = { mode: ROUTER_MODE, sources, targetBytes: classified.targetBytes, targetFileName: targetFile.name || 'TARGET.CII', inspection, auto, preview: null };
    if (evidence) evidence.innerHTML = inspectionMarkup(state);
    if (results) results.innerHTML = `<p>${auto.ready ? 'Deterministic base authority is ready. Click Compare models for read-only correspondence review.' : 'Generic review needs deterministic READY Auto Anchor bases for every source. No Writer2 authority is available.'}</p>`;
    if (executive) executive.innerHTML = '';
    if (deltas) deltas.innerHTML = '<p>Engineering deltas will appear after read-only Compare.</p>';
    if (transfer) transfer.innerHTML = waitingMarkup(state);
    analyzeButton.disabled = !auto.ready; disableWriteReviewControls();
    if (csvButton) csvButton.disabled = true; if (jsonButton) jsonButton.disabled = true;
    setStatus(container, auto.ready
      ? `Generic multi-source custody READY for ${sources.length} members. REVIEW ONLY: Compare is enabled; Writer2 Apply remains unavailable.`
      : `Generic multi-source custody READY, but Auto Anchor is unresolved for ${auto.unresolved.join(', ')}. REVIEW ONLY remains blocked.`);
  };
  const compareGeneric = async () => {
    if (!state?.auto?.ready) return;
    setStatus(container, 'Building generic multi-source correspondence in REVIEW ONLY mode…');
    const preview = await createCiiMultiSourceReviewOnlyPreviewWithVersionBridge({
      sources: state.sources,
      targetBytes: state.targetBytes,
      targetFileName: state.targetFileName,
      baseLoopsBySource: state.auto.baseLoopsBySource,
    }, { cryptoRef: options.cryptoRef });
    if (disposed) return;
    state = { ...state, preview };
    if (executive) executive.innerHTML = ciiMultiSourceReviewSummaryMarkup(preview, new Map());
    if (results) {
      results.innerHTML = ciiMultiSourceReviewMarkup(preview, new Map());
      results.querySelectorAll('[data-ciiw-ms-decision]').forEach((control) => { control.disabled = true; });
    }
    if (deltas) deltas.innerHTML = `<p><b>${h(preview.engineeringDeltas?.summary?.engineeringChangeCount || 0)}</b> engineering change rows are available for review/audit only.</p>`;
    if (transfer) transfer.innerHTML = transferMarkup(preview);
    disableWriteReviewControls(); if (csvButton) csvButton.disabled = false; if (jsonButton) jsonButton.disabled = false;
    setStatus(container, `Generic multi-source correspondence ${preview.correspondence.status}. REVIEW ONLY: Writer2 operations 0; write authority blocked.`);
  };
  const routeInspect = async () => {
    const sourceFiles = selectedFiles(sourceInput); const targetFile = selectedFiles(targetInput)[0];
    if (!targetFile) { setStatus(container, 'TARGET CII file is required.'); return; }
    try {
      setStatus(container, 'Classifying multi-source custody…');
      const classified = await classifyMultiSourceFiles(sourceFiles, targetFile, options.cryptoRef);
      if (disposed) return;
      if (classified.retained) {
        state = null; bypassRetainedInspect = true; inspectButton.click(); return;
      }
      await inspectGeneric(classified, sourceFiles, targetFile);
    } catch (error) { setStatus(container, error?.message || String(error)); }
  };
  const onClickCapture = (event) => {
    const target = event.target?.closest?.('button,select,a'); if (!target) return;
    if (target === inspectButton && selectedFiles(sourceInput).length >= 2) {
      if (bypassRetainedInspect) { bypassRetainedInspect = false; return; }
      stop(event); void routeInspect(); return;
    }
    if (state?.mode !== ROUTER_MODE) return;
    if (target === analyzeButton || target.matches('[data-ciiw-ms-compare-now]')) { stop(event); void compareGeneric(); return; }
    if (target === csvButton && state.preview) { stop(event); downloadPayload(container.ownerDocument, 'cii-multisource-review-only-correspondence.csv', state.preview.artifacts.correspondenceCsv, 'text/csv'); return; }
    if (target === jsonButton && state.preview) { stop(event); downloadPayload(container.ownerDocument, 'cii-multisource-review-only-audit.json', state.preview.artifacts.auditJson, 'application/json'); return; }
    if (target.matches('[data-ciiw-refresh-review],[data-ciiw-accept-high],[data-ciiw-accept-medium],[data-ciiw-ms-bind-expected],[data-ciiw-ms-apply]')) {
      stop(event); setStatus(container, `REVIEW ONLY: ${CII_MS_REVIEW_ONLY_WRITE_BLOCKER}. Exact retained BM-001 custody is required for Writer2 transfer.`);
    }
  };
  const onChangeCapture = (event) => {
    if (event.target !== sourceInput && event.target !== targetInput) return;
    resetGeneric();
    queueMicrotask(() => {
      if (disposed || selectedFiles(sourceInput).length < 2) return;
      setStatus(container, `${selectedFiles(sourceInput).length} SOURCE files selected. Inspect will use exact retained Writer2 mode only when frozen custody matches; otherwise it opens REVIEW ONLY.`);
    });
  };
  container.addEventListener('click', onClickCapture, true);
  container.addEventListener('change', onChangeCapture, true);
  const retainedDestroy = retained?.destroy?.bind(retained);
  return {
    ...retained,
    destroy() {
      disposed = true; container.removeEventListener('click', onClickCapture, true); container.removeEventListener('change', onChangeCapture, true);
      retainedDestroy?.();
    },
  };
}

export const _test = Object.freeze({ selectedFiles, sourceSetMembersForHashes, threePermutations, retainedSourceHashSet,
  classifyMultiSourceFiles, genericSources, autoAnchorState, inspectionMarkup, waitingMarkup, transferMarkup });

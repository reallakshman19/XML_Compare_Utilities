import { compareInputXmlTopology, mappingRowsToCsv } from './xml-cii-inputxml-compare-core.js?v=20260709-5d-core-6';

const STATE_KEY = '__xmlCiiInputXmlCompare5DState';
function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function checked(value) { return value ? 'checked' : ''; }
function ensureState(target) {
  const state = target[STATE_KEY] || {};
  target[STATE_KEY] = state;
  if (state.lengthToleranceMm == null) state.lengthToleranceMm = 6;
  if (state.minCandidateScore == null) state.minCandidateScore = 35;
  if (state.useDiameterRatioEvidence == null) state.useDiameterRatioEvidence = true;
  if (state.useNameEvidence == null) state.useNameEvidence = true;
  if (state.useAnchorCoordinateEvidence == null) state.useAnchorCoordinateEvidence = true;
  if (state.applySupplementalEvidenceScore == null) state.applySupplementalEvidenceScore = false;
  if (state.downgradeOnSupplementalConflict == null) state.downgradeOnSupplementalConflict = false;
  if (state.upgradeWithCleanSupplementalEvidence == null) state.upgradeWithCleanSupplementalEvidence = false;
  if (state.auditSupplementalEvidenceConflicts == null) state.auditSupplementalEvidenceConflicts = true;
  if (state.diameterRatioTolerancePct == null) state.diameterRatioTolerancePct = 2;
  if (state.anchorCoordinateTolerance == null) state.anchorCoordinateTolerance = 0.03;
  if (state.status == null) state.status = '';
  return state;
}
function downloadText(filename, value, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([String(value || '')], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function looksLikeInputXml(value) {
  const raw = text(value);
  return raw.length > 100 && /<PIPINGELEMENT\b/i.test(raw) && /FROM_NODE\s*=/i.test(raw) && /TO_NODE\s*=/i.test(raw);
}
function findWorkflowInputXml(root) {
  const candidates = [];
  const push = (source, value) => { const raw = text(value); if (looksLikeInputXml(raw)) candidates.push({ source, value: raw }); };
  const scope = root || document;
  scope.querySelectorAll?.('textarea,input[type="hidden"]').forEach((el, index) => push(`workflow-dom-${index}`, el.value || el.textContent));
  try {
    const payload = JSON.parse(localStorage.getItem('xmlCii2019.matchedPreview.lastDiagnostics.v1') || '{}');
    push('latest-diagnostics.inputXml', payload.inputXml || payload.inputXmlText || payload.enrichedInputXml || payload.enrichedText);
  } catch {}
  try {
    for (let i = 0; i < Math.min(localStorage.length, 200); i += 1) {
      const key = localStorage.key(i);
      if (!key || !/inputxml|cii|workflow|preview|diagnostic/i.test(key)) continue;
      push(`localStorage:${key}`, localStorage.getItem(key));
    }
  } catch {}
  candidates.sort((a, b) => b.value.length - a.value.length);
  return candidates[0] || null;
}
function statusClass(value) { return Number(value || 0) ? 'is-ok' : 'is-warn'; }
function summaryCards(result) {
  const s = result?.summary || {};
  const cards = [
    ['Ref raw elements', s.referenceRawElements],
    ['Target raw elements', s.targetRawElements],
    ['Ref canonical elements', s.referenceElements],
    ['Target canonical elements', s.targetElements],
    ['Ref consumed short', s.consumedReferenceElements],
    ['Target consumed short', s.consumedTargetElements],
    ['Ref paths', s.referencePaths],
    ['Target paths', s.targetPaths],
    ['Matched paths', s.matchedPaths],
    ['Ambiguous paths', s.ambiguousPaths],
    ['Path conflicts', s.pathConflicts],
    ['Aligned candidates', s.alignedElementCandidates],
    ['Matched elements', s.matchedElements],
    ['High confidence', s.highConfidenceElements],
    ['Medium confidence', s.mediumConfidenceElements],
    ['Evidence conflicts', s.evidenceConflictElements],
    ['Conflicts', s.conflictCount],
    ['Transfer preview', s.transferPreviewElements],
  ];
  return `<div class="xml-cii-native-status-list">${cards.map(([label, value]) => `<div class="xml-cii-native-status-row ${statusClass(value)}"><span class="xml-cii-native-status-icon">${Number(value || 0) ? 'OK' : 'INFO'}</span><span>${esc(label)}</span><strong>${esc(value ?? 0)}</strong></div>`).join('')}</div>`;
}
function table(columns, rows, empty) {
  if (!rows?.length) return `<div class="model-converters-workflow-detail-note">${esc(empty || 'No rows.')}</div>`;
  return `<div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([key]) => `<td>${esc(row?.[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function inputCards(state) {
  return `<section class="xml-cii-native-card">
    <div class="model-converters-workflow-section-title">5D InputXML Compare Inputs</div>
    <div class="model-converters-workflow-detail-note" style="margin-bottom:8px;">Element-wise compare. Primary transfer unit is PIPINGELEMENT. Supplemental evidence is now controlled in the 5D Config section.</div>
    <div class="xml-cii-native-toolbar" style="gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <input data-xml-cii-5d-ref-file type="file" accept=".xml,.XML,text/xml,application/xml">
      <input data-xml-cii-5d-target-file type="file" accept=".xml,.XML,text/xml,application/xml">
      <button type="button" class="model-converters-download-btn" data-xml-cii-5d-use-workflow-target>Use latest workflow InputXML as target</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <label class="model-converters-workflow-detail-note">Reference / property source InputXML<textarea data-xml-cii-5d-ref spellcheck="false" style="width:100%;min-height:180px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(state.referenceXml || '')}</textarea></label>
      <label class="model-converters-workflow-detail-note">Target / generated InputXML<textarea data-xml-cii-5d-target spellcheck="false" style="width:100%;min-height:180px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(state.targetXml || '')}</textarea></label>
    </div>
  </section>`;
}
function configCard(state) {
  const configJson = JSON.stringify({
    useDiameterRatioEvidence: !!state.useDiameterRatioEvidence,
    useNameEvidence: !!state.useNameEvidence,
    useAnchorCoordinateEvidence: !!state.useAnchorCoordinateEvidence,
    applySupplementalEvidenceScore: !!state.applySupplementalEvidenceScore,
    downgradeOnSupplementalConflict: !!state.downgradeOnSupplementalConflict,
    upgradeWithCleanSupplementalEvidence: !!state.upgradeWithCleanSupplementalEvidence,
    auditSupplementalEvidenceConflicts: !!state.auditSupplementalEvidenceConflicts,
    diameterRatioTolerance: Number(state.diameterRatioTolerancePct || 2) / 100,
    anchorCoordinateTolerance: Number(state.anchorCoordinateTolerance || 0.03),
  }, null, 2);
  return `<details class="xml-cii-native-card" data-xml-cii-5d-config open><summary><strong>5D Config</strong> <span style="color:#9aa8ba;">supplemental evidence toggles</span></summary>
    <div class="model-converters-workflow-detail-note" style="margin:8px 0;">Default behavior: evidence is calculated and displayed, but it does not affect score or downgrade confidence unless enabled below.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:10px 0;">
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-use-dia type="checkbox" ${checked(state.useDiameterRatioEvidence)}> use diameter-ratio evidence</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-use-name type="checkbox" ${checked(state.useNameEvidence)}> use likely NodeName / name evidence</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-use-anchor-coord type="checkbox" ${checked(state.useAnchorCoordinateEvidence)}> use relative anchor-coordinate evidence</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-apply-evidence-score type="checkbox" ${checked(state.applySupplementalEvidenceScore)}> apply evidence to element score</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-downgrade-conflict type="checkbox" ${checked(state.downgradeOnSupplementalConflict)}> downgrade confidence on evidence conflict</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-upgrade-clean type="checkbox" ${checked(state.upgradeWithCleanSupplementalEvidence)}> upgrade clean medium matches to high</label>
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5d-audit-conflict type="checkbox" ${checked(state.auditSupplementalEvidenceConflicts)}> list supplemental conflicts in conflict table</label>
    </div>
    <div class="xml-cii-native-toolbar" style="gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
      <label class="model-converters-workflow-detail-note">Diameter ratio tolerance % <input data-xml-cii-5d-dia-tol-pct type="number" step="0.1" value="${esc(state.diameterRatioTolerancePct)}" style="width:90px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:4px 6px;"></label>
      <label class="model-converters-workflow-detail-note">Anchor coord tolerance <input data-xml-cii-5d-anchor-tol type="number" step="0.005" value="${esc(state.anchorCoordinateTolerance)}" style="width:90px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:4px 6px;"></label>
    </div>
    <textarea readonly data-xml-cii-5d-config-json style="width:100%;min-height:118px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(configJson)}</textarea>
  </details>`;
}
function actionCard(state) {
  return `<section class="xml-cii-native-card">
    <div class="model-converters-workflow-section-title">Path-aligned Element Compare</div>
    <div class="xml-cii-native-toolbar" style="gap:10px;flex-wrap:wrap;align-items:center;">
      <label class="model-converters-workflow-detail-note">Length / consume tolerance mm <input data-xml-cii-5d-length-tol type="number" value="${esc(state.lengthToleranceMm)}" style="width:80px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:4px 6px;"></label>
      <label class="model-converters-workflow-detail-note">Min score <input data-xml-cii-5d-min-score type="number" value="${esc(state.minCandidateScore)}" style="width:80px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:4px 6px;"></label>
      <button type="button" class="model-converters-run-btn" data-xml-cii-5d-compare>Compare Elements</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5d-download-json ${state.result ? '' : 'disabled'}>Download Audit JSON</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5d-download-element-csv ${state.result ? '' : 'disabled'}>Download Element Map CSV</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5d-download-path-csv ${state.result ? '' : 'disabled'}>Download Path Alignment CSV</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5d-download-conflict-csv ${state.result ? '' : 'disabled'}>Download Conflict CSV</button>
    </div>
    <div class="xml-cii-native-hint">Core path/element topology remains active. Supplemental evidence can be disabled or kept as audit-only from 5D Config.</div>
  </section>`;
}
function normalizationAudit(result) {
  const consumedCols = [['referenceElement', 'Element'], ['fromTo', 'FROM→TO'], ['retainedNode', 'Retained node'], ['droppedNode', 'Dropped node'], ['lengthMm', 'Length mm'], ['toleranceMm', 'Tolerance'], ['packetEvidence', 'Packet'], ['action', 'Action']];
  const anchorCols = [['element', 'Element'], ['canonicalFromTo', 'Canonical FROM→TO'], ['lengthMm', 'Length mm'], ['anchorFlags', 'Anchor flags'], ['packetEvidence', 'Packet evidence']];
  const compCols = [['componentId', 'Component'], ['startNode', 'Start node'], ['nodeCount', 'Nodes'], ['elementCount', 'Elements'], ['componentLengthMm', 'Length mm']];
  const ref = result?.normalization?.reference || {};
  const tgt = result?.normalization?.target || {};
  return `<details class="xml-cii-native-card" open><summary><strong>Canonical normalization audit</strong></summary>
    <div class="model-converters-workflow-detail-note">Rule: ${esc(ref.rule || tgt.rule || '')}</div>
    <h4>Reference consumed short/zero elements</h4>${table(consumedCols, ref.consumedRows || [], 'No reference short/zero elements consumed.')}
    <h4>Target consumed short/zero elements</h4>${table(consumedCols, tgt.consumedRows || [], 'No target short/zero elements consumed.')}
    <h4>Reference components / station basis</h4>${table(compCols, ref.componentRows || [], 'No reference component rows.')}
    <h4>Target components / station basis</h4>${table(compCols, tgt.componentRows || [], 'No target component rows.')}
    <h4>Reference anchor elements</h4>${table(anchorCols, ref.anchorRows || [], 'No reference anchor elements.')}
    <h4>Target anchor elements</h4>${table(anchorCols, tgt.anchorRows || [], 'No target anchor elements.')}
  </details>`;
}
function pathAudit(result) {
  const pathCols = [['pathId', 'Path'], ['startNode', 'Start'], ['endNode', 'End'], ['startAnchorType', 'Start anchor'], ['endAnchorType', 'End anchor'], ['elementCount', 'Elements'], ['totalLengthMm', 'Length mm'], ['vectorLengthMm', 'Vector length'], ['packetSequence', 'Packet sequence']];
  const mapCols = [['referencePath', 'Ref path'], ['targetPath', 'Target path'], ['referenceLengthMm', 'Ref length'], ['targetLengthMm', 'Target length'], ['referenceElements', 'Ref elements'], ['targetElements', 'Target elements'], ['score', 'Score'], ['nextBestScore', 'Next best'], ['scoreGap', 'Gap'], ['status', 'Status']];
  const alignCols = [['referencePath', 'Ref path'], ['targetPath', 'Target path'], ['op', 'Operation'], ['referenceElement', 'Reference element'], ['targetElement', 'Target element'], ['referenceStationMm', 'Ref station'], ['targetStationMm', 'Target station'], ['referenceCoord', 'Ref rel coord'], ['targetCoord', 'Target rel coord'], ['elementScore', 'Element score'], ['pathStatus', 'Path status']];
  const p = result?.paths || {};
  return `<details class="xml-cii-native-card" open><summary><strong>Path decomposition and dynamic alignment audit</strong></summary>
    <h4>Reference paths</h4>${table(pathCols, p.referencePathRows || [], 'No reference paths built.')}
    <h4>Target paths</h4>${table(pathCols, p.targetPathRows || [], 'No target paths built.')}
    <h4>Path mapping</h4>${table(mapCols, p.pathMappings || [], 'No path mappings found.')}
    <h4>Dynamic element alignment operations</h4>${table(alignCols, p.alignmentRows || [], 'No dynamic alignment rows.')}
  </details>`;
}
function resultHtml(state) {
  const result = state.result;
  if (!result) return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-note">No 5D comparison yet. Paste/upload two InputXML files and click <strong>Compare Elements</strong>.</div></section>`;
  const elementCols = [['referencePath', 'Ref path'], ['targetPath', 'Target path'], ['alignmentOp', 'Align op'], ['referenceElement', 'Reference element'], ['targetElement', 'Target element'], ['referenceFromTo', 'Ref canonical FROM→TO'], ['targetFromTo', 'Target canonical FROM→TO'], ['referenceLengthMm', 'Ref length'], ['targetLengthMm', 'Target length'], ['lengthDeltaMm', 'Δ length'], ['referenceStationMm', 'Ref path station'], ['targetStationMm', 'Target path station'], ['pathScore', 'Path score'], ['score', 'Element score'], ['evidenceScore', 'Evidence score'], ['diameterRatio', 'Dia ratio'], ['diameterStatus', 'Dia status'], ['nameStatus', 'Name status'], ['nameCommon', 'Name common'], ['anchorCoordDistance', 'Anchor coord Δ'], ['anchorCoordStatus', 'Anchor coord status'], ['evidenceFlags', 'Evidence flags'], ['nextBestScore', 'Next best'], ['scoreGap', 'Gap'], ['confidence', 'Confidence'], ['transferAction', 'Transfer action']];
  const transferCols = [['referencePath', 'Ref path'], ['targetPath', 'Target path'], ['referenceElement', 'Reference element'], ['targetElement', 'Target element'], ['confidence', 'Confidence'], ['evidenceScore', 'Evidence score'], ['evidenceFlags', 'Evidence flags'], ['transferable', 'Transferable'], ['action', 'Action']];
  const conflictCols = [['referenceElement', 'Reference element / path'], ['targetElement', 'Target element / path'], ['issue', 'Issue'], ['detail', 'Detail']];
  return `<section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">5D Summary</div>${summaryCards(result)}</section>
    ${normalizationAudit(result)}
    ${pathAudit(result)}
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">Path-aligned element mapping with configurable evidence</div>${table(elementCols, result.elementMappings, 'No element mappings found.')}</section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">Conflicts / ambiguous rows</div>${table(conflictCols, result.conflictRows, 'No conflicts or ambiguous rows.')}</section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">Element property transfer preview</div>${table(transferCols, result.transferRows, 'No transfer candidates found.')}</section>`;
}
function bindControls(target, root, state, options) {
  const rerender = () => renderXmlCiiInputXmlCompare5DPanel(target, options);
  const setInputsFromDom = () => {
    state.referenceXml = target.querySelector('[data-xml-cii-5d-ref]')?.value || '';
    state.targetXml = target.querySelector('[data-xml-cii-5d-target]')?.value || '';
    state.lengthToleranceMm = Number(target.querySelector('[data-xml-cii-5d-length-tol]')?.value || 6);
    state.minCandidateScore = Number(target.querySelector('[data-xml-cii-5d-min-score]')?.value || 35);
    state.useDiameterRatioEvidence = !!target.querySelector('[data-xml-cii-5d-use-dia]')?.checked;
    state.useNameEvidence = !!target.querySelector('[data-xml-cii-5d-use-name]')?.checked;
    state.useAnchorCoordinateEvidence = !!target.querySelector('[data-xml-cii-5d-use-anchor-coord]')?.checked;
    state.applySupplementalEvidenceScore = !!target.querySelector('[data-xml-cii-5d-apply-evidence-score]')?.checked;
    state.downgradeOnSupplementalConflict = !!target.querySelector('[data-xml-cii-5d-downgrade-conflict]')?.checked;
    state.upgradeWithCleanSupplementalEvidence = !!target.querySelector('[data-xml-cii-5d-upgrade-clean]')?.checked;
    state.auditSupplementalEvidenceConflicts = !!target.querySelector('[data-xml-cii-5d-audit-conflict]')?.checked;
    state.diameterRatioTolerancePct = Number(target.querySelector('[data-xml-cii-5d-dia-tol-pct]')?.value || 2);
    state.anchorCoordinateTolerance = Number(target.querySelector('[data-xml-cii-5d-anchor-tol]')?.value || 0.03);
  };
  target.querySelector('[data-xml-cii-5d-ref-file]')?.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; state.referenceXml = await file.text(); state.status = `Loaded reference ${file.name}.`; rerender(); });
  target.querySelector('[data-xml-cii-5d-target-file]')?.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; state.targetXml = await file.text(); state.status = `Loaded target ${file.name}.`; rerender(); });
  target.querySelector('[data-xml-cii-5d-use-workflow-target]')?.addEventListener('click', () => { const found = findWorkflowInputXml(root); if (found) { state.targetXml = found.value; state.status = `Loaded target from ${found.source}.`; } else state.status = 'No workflow InputXML target found.'; rerender(); });
  target.querySelector('[data-xml-cii-5d-compare]')?.addEventListener('click', () => {
    setInputsFromDom();
    if (!looksLikeInputXml(state.referenceXml) || !looksLikeInputXml(state.targetXml)) { state.status = 'Both reference and target must be InputXML with PIPINGELEMENT FROM_NODE/TO_NODE.'; rerender(); return; }
    try {
      state.result = compareInputXmlTopology(state.referenceXml, state.targetXml, {
        lengthToleranceMm: state.lengthToleranceMm,
        shortElementToleranceMm: state.lengthToleranceMm,
        minCandidateScore: state.minCandidateScore,
        useDiameterRatioEvidence: state.useDiameterRatioEvidence,
        useNameEvidence: state.useNameEvidence,
        useAnchorCoordinateEvidence: state.useAnchorCoordinateEvidence,
        applySupplementalEvidenceScore: state.applySupplementalEvidenceScore,
        downgradeOnSupplementalConflict: state.downgradeOnSupplementalConflict,
        upgradeWithCleanSupplementalEvidence: state.upgradeWithCleanSupplementalEvidence,
        auditSupplementalEvidenceConflicts: state.auditSupplementalEvidenceConflicts,
        diameterRatioTolerance: Number(state.diameterRatioTolerancePct || 2) / 100,
        anchorCoordinateTolerance: state.anchorCoordinateTolerance,
      });
      state.status = `Matched ${state.result.summary.matchedElements} element(s); evidence conflicts=${state.result.summary.evidenceConflictElements}; conflicts=${state.result.summary.conflictCount}.`;
    } catch (error) {
      state.result = null;
      state.status = `5D compare failed: ${error?.message || String(error)}`;
    }
    rerender();
  });
  target.querySelector('[data-xml-cii-5d-download-json]')?.addEventListener('click', () => { if (state.result) downloadText('5d-inputxml-element-compare-audit.json', JSON.stringify(state.result, null, 2), 'application/json;charset=utf-8'); });
  target.querySelector('[data-xml-cii-5d-download-element-csv]')?.addEventListener('click', () => { if (state.result) downloadText('5d-element-map.csv', mappingRowsToCsv(state.result.elementMappings), 'text/csv;charset=utf-8'); });
  target.querySelector('[data-xml-cii-5d-download-path-csv]')?.addEventListener('click', () => { if (state.result) downloadText('5d-path-alignment.csv', mappingRowsToCsv(state.result.paths?.alignmentRows || []), 'text/csv;charset=utf-8'); });
  target.querySelector('[data-xml-cii-5d-download-conflict-csv]')?.addEventListener('click', () => { if (state.result) downloadText('5d-conflicts.csv', mappingRowsToCsv(state.result.conflictRows), 'text/csv;charset=utf-8'); });
}
export function renderXmlCiiInputXmlCompare5DPanel(target, options = {}) {
  if (!target) return null;
  const root = options.root || target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document;
  const state = ensureState(target);
  target.innerHTML = `<div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">5D InputXML Element Compare / Property Transfer</div><div class="model-converters-workflow-detail-text">Match two InputXML files by canonical PIPINGELEMENT topology, anchor-to-anchor path decomposition, dynamic element alignment, and optional evidence checks.</div></div></div>${state.status ? `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-note">${esc(state.status)}</div></section>` : ''}${inputCards(state)}${configCard(state)}${actionCard(state)}${resultHtml(state)}`;
  bindControls(target, root, state, options);
  return state.result || null;
}

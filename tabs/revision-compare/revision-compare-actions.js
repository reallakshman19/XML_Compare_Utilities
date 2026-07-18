/**
 * RC action handlers: state transitions for load/scope/compare/plan/approve.
 * 3D specifics (viewer, connectors, overlay, PSI apply) live in
 * revision-compare-wb3d.js; raw PSI XML loads are converted to staged JSON by
 * the psi-staged-adapter before staging.
 */

import { buildTransferPlan, batchApprove, refreshTransferSummary, DEFAULT_TRANSFER_CONFIG } from '../../workbench3d/compare/transfer-planner.js';
import { attachProjectDocument } from './revision-session-contracts.js';
import { convertPsiXmlToStaged, isPsiPipeStressXml } from '../../workbench3d/adapters/psi-staged-adapter.js';
import {
  buildCompareWorkbench, createRevisionViewer, refreshConnectors,
  updateApprovalOverlay, downloadUpdatedTargetXml,
} from './revision-compare-wb3d.js';

export function createRevisionActions({
  root, options, service, readState, writeState,
  renderWorkspace, isoNow, downloadManifest, reportError
}) {
  const safe = (operation) => async (...args) => {
    try { await operation(...args); } catch (error) { reportError(root, options, error); }
  };

  const load = safe(async (slotId, file) => {
    renderWorkspace(root, readState(), { [slotId]: `Parsing ${file.name} and hashing exact input bytes…` });
    let text = await file.text();
    let rawXml = null;
    let convertedNote = '';
    if (isPsiPipeStressXml(text)) {
      rawXml = text;
      text = JSON.stringify(convertPsiXmlToStaged(text, file.name));
      convertedNote = ' (converted from PipeStressExport XML)';
    }
    const result = await service.loadText(slotId, file.name, text, isoNow());

    const state = readState();
    const documents = Object.freeze({ ...state.documents, [slotId]: result.document });
    const stagedJsons = Object.freeze({ ...state.stagedJsons, [slotId]: result.filtered });
    const rawXmls = Object.freeze({ ...(state.rawXmls ?? {}), [slotId]: rawXml });
    const session = attachProjectDocument(state.session, result.document, isoNow());
    writeState(Object.freeze({ session, documents, stagedJsons, rawXmls, wb3d: state.wb3d }));

    options?.showToast?.(`${slotId} revision loaded${convertedNote}.`, 'success');
    renderWorkspace(root, readState(), { [slotId]: `Loaded ${result.document.stats.branchCount} branch(es)${convertedNote}.` });
  });

  const scope = safe(async (slotId) => {
    const wildcard = root.querySelector(`[data-revc-scope="${slotId}"]`)?.value || '';
    const result = await service.applyScope(slotId, { wildcard, selectedIds: [] }, isoNow());

    const state = readState();
    const documents = Object.freeze({ ...state.documents, [slotId]: result.document });
    const stagedJsons = Object.freeze({ ...state.stagedJsons, [slotId]: result.filtered });
    const session = attachProjectDocument(state.session, result.document, isoNow());
    writeState(Object.freeze({ session, documents, stagedJsons, rawXmls: state.rawXmls, wb3d: state.wb3d }));

    renderWorkspace(root, readState(), { [slotId]: `Scope retained ${result.document.stats.matched}/${result.document.stats.scanned} branch(es).` });
  });

  const runCompareAction = safe(async () => {
    const currentState = readState();
    if (!currentState.stagedJsons.baseline || !currentState.stagedJsons.candidate) return;
    options?.showToast?.('Building models and comparing...', 'success');

    const manualOverrides = currentState.wb3d?.manualOverrides ?? [];
    const { topos, audit, visuals } = await buildCompareWorkbench({
      stagedJsons: currentState.stagedJsons,
      documents: currentState.documents,
      manualOverrides,
    });

    const ui = root.querySelector('[data-revc-workbench-ui]');
    if (ui) ui.hidden = false;

    const canvasHost = root.querySelector('[data-revc-canvas-host]');
    let viewer = currentState.wb3d?.viewer;
    if (!viewer && canvasHost) {
      viewer = await createRevisionViewer(root, canvasHost, { readState, writeState });
    }
    if (viewer) {
      viewer.setModels({
        source: visuals.source,
        target: visuals.target,
        registrationTranslation: audit.registration?.translationMm ?? [0, 0, 0],
      });
    }

    writeState({
      ...currentState,
      wb3d: { topos, visuals, audit, viewer, plan: null, manualOverrides, transferConfig: { ...DEFAULT_TRANSFER_CONFIG } },
    });

    refreshConnectors(readState());
    const modeSelect = root.querySelector('[data-revc-connector-mode]');
    if (modeSelect && viewer) viewer.setConnectorMode(modeSelect.value);
    renderWorkspace(root, readState(), null);
    options?.showToast?.(
      `Comparison complete — ${audit.summary.matchedElements} matched (${audit.summary.basisElements ?? 0} basis anchors).`,
      'success',
    );
  });

  const selectObject = safe(async (objectId) => {
    const s = readState();
    if (!s.wb3d?.viewer) return;
    const pick = { objectId, nodeId: null, modelId: null };
    const related = new Set();
    for (const row of s.wb3d.audit?.objectDiff.rows ?? []) {
      if (row.sourceObjectId === pick.objectId && row.targetObjectId) related.add(row.targetObjectId);
      if (row.targetObjectId === pick.objectId && row.sourceObjectId) related.add(row.sourceObjectId);
    }
    s.wb3d.viewer.setSelection(pick.objectId, [...related]);
    writeState({ ...s, wb3d: { ...s.wb3d, selection: pick } });
    renderWorkspace(root, readState(), null);
    setTimeout(() => updateApprovalOverlay(root, readState()), 0);
  });

  const setConnectorMode = safe(async (mode) => {
    const s = readState();
    if (s.wb3d?.viewer) s.wb3d.viewer.setConnectorMode(mode);
  });

  const setLayoutMode = safe(async (mode) => {
    const s = readState();
    if (!s.wb3d?.viewer) return;
    s.wb3d.layoutMode = mode;
    const vGeoA = s.wb3d.visuals?.source;
    let translation = s.wb3d.audit?.registration?.translationMm ?? [0, 0, 0];
    if (mode === 'side-by-side' && vGeoA?.bounds) {
      const dx = vGeoA.bounds[3] - vGeoA.bounds[0];
      translation = [Math.round(dx + 2000), 0, 0];
    }
    s.wb3d.viewer.setModels({
      source: s.wb3d.visuals?.source,
      target: s.wb3d.visuals?.target,
      registrationTranslation: translation
    });
    writeState({ ...s });
  });

  const buildPlan = safe(async () => {
    const s = readState();
    if (!s.wb3d?.audit || !s.wb3d?.topos) return;
    s.wb3d.plan = buildTransferPlan(s.wb3d.audit, s.wb3d.topos.A, s.wb3d.topos.B, s.wb3d.transferConfig);
    writeState({ ...s });
    refreshConnectors(readState());
    renderWorkspace(root, readState(), null);
  });

  const batchApproveAction = safe(async () => {
    const s = readState();
    if (!s.wb3d?.plan) return;
    batchApprove(s.wb3d.plan, s.wb3d.transferConfig.minConfidence);
    writeState({ ...s });
    refreshConnectors(readState());
    renderWorkspace(root, readState(), null);
  });

  const setApproval = safe(async (rowId, approvalStatus) => {
    const s = readState();
    if (!s.wb3d?.plan) return;
    const row = s.wb3d.plan.rows.find((r) => r.rowId === rowId);
    if (row && row.approval !== 'BLOCKED') {
      row.approval = approvalStatus;
      refreshTransferSummary(s.wb3d.plan);
      writeState({ ...s });
      refreshConnectors(readState());
      renderWorkspace(root, readState(), null);
    }
  });

  const approveElement = safe(async (targetId, approvalStatus) => {
    const s = readState();
    if (!s.wb3d?.plan) return;
    let changed = false;
    for (const row of s.wb3d.plan.rows) {
      if ((row.targetObjectId === targetId || row.sourceObjectId === targetId) && row.approval !== 'BLOCKED') {
        row.approval = approvalStatus;
        changed = true;
      }
    }
    if (changed) {
      refreshTransferSummary(s.wb3d.plan);
      writeState({ ...s });
      refreshConnectors(readState());
      renderWorkspace(root, readState(), null);
    }
  });

  const downloadUpdatedXml = safe(async () => downloadUpdatedTargetXml(root, readState(), options));

  return Object.freeze({
    load, scope, runCompare: runCompareAction, selectObject, setConnectorMode, setLayoutMode,
    buildPlan, batchApprove: batchApproveAction, setApproval, approveElement, downloadUpdatedXml,
    download: () => { try { downloadManifest(root, readState().session); } catch (error) { reportError(root, options, error); } },
    close: () => options?.close?.(),
  });
}

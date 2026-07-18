/**
 * RC 3D workbench glue: canonical model building, viewer creation, connector
 * refresh, approval overlay, and PSI apply/download. Pure orchestration over
 * workbench3d modules — owns no state; actions inject read/write accessors.
 */

import { runCompare } from '../../workbench3d/compare/compare-engine.js';
import { createWorkbenchViewer } from '../../workbench3d/viewer/workbench-viewer.js';
import { DEFAULT_COMPARE_CONFIG } from '../../workbench3d/compare/evidence-scorer.js';
import { buildComponentTopologyArtifacts } from '../../vendor/3d-converters/topology-browser-core.mjs';
import { visualGeometry, buildBoreIndex } from '../topology-trace-validator/topology-edit-3d-geometry.js';
import { createVisualGeometryModelV2 } from '../../contracts/visual-geometry-model.js';
import { annotateTopology } from '../../workbench3d/compare/topology-identity.js';
import { buildConnectorModel } from '../../workbench3d/viewer/connector-model.js';
import { applyTransferPlanToPsi } from '../../workbench3d/apply/psi-transfer-apply.js';

/** Bore indexes are keyed "$[i]…" but topology sourcePaths use the staged root. */
function boreIndexFor(staged) {
  const branches = Array.isArray(staged) ? staged : staged.objects || staged.hierarchy || staged.branches || [];
  const rootPath = Array.isArray(staged) ? '$' : staged.objects ? '$.objects' : staged.hierarchy ? '$.hierarchy' : '$.branches';
  const index = buildBoreIndex(branches);
  if (rootPath === '$') return index;
  const rekeyed = new Map();
  for (const [key, value] of index) rekeyed.set(key.replace(/^\$/, rootPath), value);
  return rekeyed;
}

function visualModelFor(modelId, document, geometry) {
  const doc = document || { unit: 'mm', coordinateFrame: { schema: 'ManagedStage.XYZ.v1' } };
  return createVisualGeometryModelV2({
    modelId, documentId: doc.documentId || modelId, revisionId: modelId, unit: doc.unit || 'mm',
    coordinateFrame: doc.coordinateFrame, verticalAxis: 'Z', origin: [0, 0, 0],
    segments: geometry.segments, markers: geometry.markers, bounds: geometry.bounds,
  });
}

/**
 * Build annotated topologies, compare audit, and visual models from the two
 * staged revisions. Manual overrides become basis connections in the audit.
 */
export async function buildCompareWorkbench({ stagedJsons, documents, manualOverrides = [] }) {
  const textA = JSON.stringify(stagedJsons.baseline);
  const textB = JSON.stringify(stagedJsons.candidate);
  const rawTopoA = (await buildComponentTopologyArtifacts(textA, { sourceName: 'baseline', toleranceMm: 6 })).canonicalTopology;
  const rawTopoB = (await buildComponentTopologyArtifacts(textB, { sourceName: 'candidate', toleranceMm: 6 })).canonicalTopology;
  const topoA = annotateTopology(rawTopoA, stagedJsons.baseline, 'source');
  const topoB = annotateTopology(rawTopoB, stagedJsons.candidate, 'target');

  const audit = runCompare(topoA, topoB, { ...DEFAULT_COMPARE_CONFIG }, manualOverrides);

  const vGeoA = visualGeometry(topoA, null, 'Z', boreIndexFor(stagedJsons.baseline), 1.0);
  const vGeoB = visualGeometry(topoB, null, 'Z', boreIndexFor(stagedJsons.candidate), 1.0);
  return {
    topos: { A: topoA, B: topoB },
    audit,
    visuals: {
      source: visualModelFor('source', documents.baseline, vGeoA),
      target: visualModelFor('target', documents.candidate, vGeoB),
    },
  };
}

/** Show approve/reject buttons beside the selected element when a plan exists. */
export function updateApprovalOverlay(root, state) {
  const overlay = root.querySelector('[data-revc-approval-overlay]');
  if (!overlay) return;
  const wb3d = state.wb3d;
  const objectId = wb3d?.selection?.objectId;
  const eligible = objectId && wb3d.viewer && wb3d.audit && wb3d.plan
    && wb3d.plan.rows.some((r) => r.targetObjectId === objectId || r.sourceObjectId === objectId);
  if (!eligible) { overlay.hidden = true; return; }
  const diffRow = wb3d.audit.objectDiff.rows.find((r) => r.sourceObjectId === objectId || r.targetObjectId === objectId);
  const targetId = diffRow?.targetObjectId;
  if (!targetId) { overlay.hidden = true; return; }
  const topo = targetId.startsWith('source:') ? wb3d.topos.A : wb3d.topos.B;
  const edge = topo.edges.find((e) => e.id === targetId);
  const node = topo.nodes.find((n) => n.id === edge?.fromNodeId);
  if (!node) { overlay.hidden = true; return; }
  const screen = wb3d.viewer.worldToScreen([node.position.x, node.position.y, node.position.z]);
  if (!screen) { overlay.hidden = true; return; }
  overlay.hidden = false;
  overlay.style.left = `${Math.round(screen.x)}px`;
  overlay.style.top = `${Math.round(screen.y - 34)}px`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  overlay.innerHTML = `
    <button class="wb3d-btn wb3d-btn-mini" data-action="approve-element" data-object="${esc(targetId)}" data-approval="APPROVED" title="Approve all transfer rows for ${esc(targetId.replace(/^(source|target):/, ''))}">✔</button>
    <button class="wb3d-btn wb3d-btn-mini" data-action="approve-element" data-object="${esc(targetId)}" data-approval="REJECTED" title="Reject all transfer rows">✖</button>`;
}

/** Create the workbench viewer wired to picks, hover tips, and the overlay. */
export async function createRevisionViewer(root, canvasHost, { readState, writeState }) {
  const placeTip = (tip, event) => {
    const hostRect = tip.parentElement.getBoundingClientRect();
    tip.style.left = `${Math.min(event.clientX - hostRect.left + 12, hostRect.width - 260)}px`;
    tip.style.top = `${event.clientY - hostRect.top + 12}px`;
  };
  return createWorkbenchViewer(canvasHost, {
    onPick: (pick) => {
      const s = readState();
      if (!s.wb3d) return;
      const nextWb3d = { ...s.wb3d, selection: pick };
      if (pick.objectId) {
        const related = new Set();
        for (const row of s.wb3d.audit?.objectDiff.rows ?? []) {
          if (row.sourceObjectId === pick.objectId && row.targetObjectId) related.add(row.targetObjectId);
          if (row.targetObjectId === pick.objectId && row.sourceObjectId) related.add(row.sourceObjectId);
        }
        nextWb3d.viewer?.setSelection(pick.objectId, [...related]);
      } else {
        nextWb3d.viewer?.setSelection(null);
      }
      writeState({ ...s, wb3d: nextWb3d });
      updateApprovalOverlay(root, readState());
    },
    onHoverConnector: (connector, event) => {
      const tip = root.querySelector('[data-revc-connector-tip]');
      if (!tip) return;
      if (!connector) { tip.hidden = true; return; }
      tip.hidden = false;
      const grade = connector.basis ? 'BASIS' : connector.confidence ?? '';
      tip.textContent = `${connector.type} · ${grade} · ${connector.status ?? ''} · ${connector.reason} · audit ${connector.auditRowId}`;
      placeTip(tip, event);
    },
    onHoverObject: (hover, event) => {
      const tip = root.querySelector('[data-revc-hover-tip]');
      if (!tip) return;
      if (!hover || (!hover.objectId && !hover.nodeId)) { tip.hidden = true; return; }
      tip.hidden = false;
      tip.innerHTML = hover.objectId ? `<div>${hover.objectId}</div>` : `<div>Node ${hover.nodeId}</div>`;
      placeTip(tip, event);
    },
    onCameraChange: () => updateApprovalOverlay(root, readState()),
  });
}

/** Rebuild ConnectorModel.v1 from the current audit + plan and hand it to the viewer. */
export function refreshConnectors(state) {
  const wb3d = state.wb3d;
  if (!wb3d?.viewer || !wb3d.audit) return;
  const graphOf = (topo) => ({
    nodes: (topo?.nodes ?? []).map((n) => ({ nodeId: n.id, coordMm: [n.position.x, n.position.y, n.position.z] })),
  });
  const model = buildConnectorModel({
    compareAudit: wb3d.audit,
    transferPlan: wb3d.plan,
    sourceVisual: wb3d.visuals?.source,
    targetVisual: wb3d.visuals?.target,
    sourceGraph: graphOf(wb3d.topos?.A),
    targetGraph: graphOf(wb3d.topos?.B),
  });
  wb3d.viewer.setConnectors(model);
}

/** Apply APPROVED rows to the candidate PSI XML and download the updated copy. */
export function downloadUpdatedTargetXml(root, state, options) {
  const rawXml = state.rawXmls?.candidate;
  if (!state.wb3d?.plan) throw new Error('Build a transfer plan and approve rows first.');
  if (!rawXml) throw new Error('The candidate revision was not loaded from a PipeStressExport XML file.');
  const approved = state.wb3d.plan.rows.filter((r) => r.approval === 'APPROVED').length;
  if (!approved) throw new Error('No approved transfer rows to apply.');
  const result = applyTransferPlanToPsi(rawXml, state.wb3d.plan, state.wb3d.topos.B);
  const windowRef = root.ownerDocument.defaultView;
  const blob = new windowRef.Blob([result.xmlText], { type: 'application/xml;charset=utf-8' });
  const url = windowRef.URL.createObjectURL(blob);
  const anchor = root.ownerDocument.createElement('a');
  anchor.href = url;
  anchor.download = (state.documents.candidate?.fileName || 'target.xml').replace(/\.xml$/i, '') + '.transferred.xml';
  anchor.click();
  windowRef.URL.revokeObjectURL(url);
  options?.showToast?.(`Applied ${result.applied} change(s); skipped ${result.skipped.length}.`, 'success');
}

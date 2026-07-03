import { renderXmlCompareTransferResultReviewPanelHtml } from './XmlCompareTransferResultReviewPanel.js';

export const XML_COMPARE_TRANSFER_STAGE_PANEL_SCHEMA = 'xml-compare-transfer-stage-panel/v2';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();
const shortHash = (value = '') => clean(value).replace(/^fnv1a32:/, '') || '-';

function statusLabel(state = {}) {
  if (state.transferLastResult?.ok && state.transferLastResult?.patchedTargetText) return 'Applied in memory';
  if (state.transferStage?.plan) return 'Staged';
  if (state.transferLastResult?.ok === false) return 'Blocked';
  return 'Not staged';
}

function diagnosticsList(state = {}) {
  const diagnostics = state.transferAudit?.diagnostics || state.transferStage?.plan?.diagnostics || [];
  if (!diagnostics.length) return '<small>No blocker diagnostics.</small>';
  return `<ul>${diagnostics.map((item) => `<li><b>${esc(item.code)}</b> ${esc(item.message)}</li>`).join('')}</ul>`;
}

function metric(label, value) {
  return `<span><b>${esc(label)}</b><br>${esc(value || '-')}</span>`;
}

function metrics(state = {}) {
  const stage = state.transferStage || {};
  const plan = stage.plan || state.transferPreviewPlans?.node || state.transferPreviewPlans?.element || state.transferPreviewPlans?.line || {};
  return `<div class="xml-compare-validation-summary">${metric('Stage status', statusLabel(state))}${metric('Scope', stage.scope || plan.scope || 'node')}${metric('Selected blocks', (stage.selectedBlocks || plan.selectedBlocks || []).join(', ') || '-')}${metric('Approved pairs', String(plan.transferCases?.length || stage.plan?.transferCases?.length || 0))}${metric('Source hash', shortHash(stage.sourceHash || plan.sourceHash))}${metric('Target hash', shortHash(stage.targetHash || plan.targetHash))}${metric('Plan hash', shortHash(stage.planHash || plan.transferPlanHash))}${metric('Workspace rev', String(stage.workspaceRevision ?? plan.workspaceRevision ?? 0))}</div>`;
}

function actions(scope = 'node') {
  const attr = `data-xml-compare-transfer-scope="${esc(scope)}"`;
  return `<div class="xml-compare-transfer-apply-actions" data-xml-compare-transfer-state-actions><button type="button" data-xml-compare-transfer-state-action="stage-transfer" ${attr}>Stage Transfer</button><button type="button" data-xml-compare-transfer-state-action="clear-transfer-stage" ${attr}>Clear Stage</button><button type="button" data-xml-compare-transfer-state-action="apply-staged-transfer" ${attr}>Apply Staged Transfer</button><button type="button" data-xml-compare-transfer-state-action="export-staged-transfer" ${attr}>Export Patched Target XML</button><button type="button" data-xml-compare-transfer-state-action="export-transfer-audit" ${attr}>Export Transfer Audit JSON</button></div>`;
}

export function renderXmlCompareTransferStagePanelHtml({ transferState = null, scope = 'node' } = {}) {
  const state = transferState || {};
  return `<section class="xml-compare-automap-panel" data-xml-compare-transfer-stage-panel><header><b>State-backed transfer stage</b><span>TransferPlan.v1 · TransferPatchAudit.v1</span></header>${metrics(state)}${actions(scope)}<div class="xml-compare-warning">${diagnosticsList(state)}</div></section>${renderXmlCompareTransferResultReviewPanelHtml({ transferState: state })}`;
}

export const _test = Object.freeze({ esc, clean, shortHash, statusLabel, diagnosticsList, metric, metrics, actions });

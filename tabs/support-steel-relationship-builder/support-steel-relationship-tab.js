import { supportCarrierToStructurePathsToCsv } from './support-carrier-to-structure-path-export.js';
import { supportCarrierTopologyToCsv } from './support-carrier-topology-export.js';
import {
  supportCarrierAttachmentToCsv,
  supportCarrierResolutionToCsv,
} from './support-carrier-resolution-export.js';
import {
  supportMemberChainToCsv,
  supportSteelBundleToJson,
  supportSteelHierarchyToText,
  supportSteelRelationshipsToCsv,
} from './support-steel-relationship-export.js';
import { buildSupportSteelRelationshipBundle } from './support-steel-evidence-bundle.js';
// The 3D-edit "scalable projects" migration reuses these exact exporters via
// supportSteelProjectArtifacts in the project adapter (extended FORMATS).
import { buildSupportSteelProjectMigration } from './support-steel-project-adapter.js';
import { supportSteelSampleText } from './support-steel-relationship-samples.js';
import {
  renderSupportSteelDialog,
  renderSupportSteelLauncher,
} from './support-steel-relationship-shell.js';
import { parseSupportSteelJson } from './support-steel-source-utils.js';
import {
  renderSupportMemberChain,
  renderSupportSteelDiagnostics,
  renderSupportSteelEvidence,
  renderSupportSteelRelationshipTable,
  renderSupportSteelSummary,
  renderSupportSteelTree,
} from './support-steel-relationship-view.js';

const STYLE_ID = 'support-steel-relationship-builder-style';
const POPUP_SELECTOR = '[data-ssrb-popup="1"]';
const EXPORT_FORMATS = Object.freeze({
  json: { filename: 'support-steel-relationship-bundle.json', mime: 'application/json' },
  csv: { filename: 'support-steel-relationships.csv', mime: 'text/csv' },
  tree: { filename: 'support-steel-relationship-hierarchy.txt', mime: 'text/plain' },
  chain: { filename: 'support-member-chain.csv', mime: 'text/csv' },
  carrier: { filename: 'support-carrier-resolutions.csv', mime: 'text/csv' },
  attachment: { filename: 'support-carrier-attachments.csv', mime: 'text/csv' },
  topology: { filename: 'support-carrier-topology.csv', mime: 'text/csv' },
  structurePath: { filename: 'support-carrier-to-structure-paths.csv', mime: 'text/csv' },
});

export function installSupportSteelRelationshipBuilderTile(root, ctx = {}) {
  if (!root || root.querySelector('[data-ssrb-open="1"]')) return null;
  ensureStyle(root.ownerDocument || globalThis.document);
  root.insertAdjacentHTML('beforeend', renderSupportSteelLauncher());
  const launcher = root.querySelector('[data-ssrb-open="1"]');
  const open = () => openSupportSteelRelationshipBuilder(ctx);
  launcher?.addEventListener('click', open);
  return () => launcher?.removeEventListener('click', open);
}

export function openSupportSteelRelationshipBuilder(ctx = {}) {
  const doc = globalThis.document;
  if (!doc || doc.querySelector(POPUP_SELECTOR)) return;
  ensureStyle(doc);
  const modal = doc.createElement('div');
  modal.className = 'ssrb-backdrop';
  modal.dataset.ssrbPopup = '1';
  modal.innerHTML = `<div class="ssrb-dialog" role="dialog" aria-modal="true" aria-labelledby="ssrb-dialog-title" aria-describedby="ssrb-dialog-description">${renderSupportSteelDialog()}</div>`;
  (doc.body || doc.documentElement).appendChild(modal);
  wireDialog(modal, ctx);
}

function wireDialog(modal, ctx) {
  const state = { bundle: null, platformMigration: null, selectedRelationshipId: '', exportView: 'json', search: '' };
  const get = (selector) => modal.querySelector(selector);
  const close = () => { modal.remove(); globalThis.document?.removeEventListener('keydown', onKey); };
  const onKey = (event) => {
    if (event.key !== 'Escape') return;
    if (modal.classList.contains('ssrb-fullscreen')) setFullscreen(modal, false);
    else close();
  };
  get('[data-ssrb-close]')?.addEventListener('click', close);
  get('[data-ssrb-fullscreen]')?.addEventListener('click', () => setFullscreen(modal, !modal.classList.contains('ssrb-fullscreen')));
  modal.addEventListener('click', (event) => handleModalClick(event, modal, state, ctx));
  modal.addEventListener('input', (event) => handleModalInput(event, modal, state));
  wireFileInputs(modal);
  globalThis.document?.addEventListener('keydown', onKey);
  renderState(modal, state);
}

function handleModalClick(event, modal, state, ctx) {
  if (event.target === modal && !modal.classList.contains('ssrb-fullscreen')) {
    modal.remove();
    return;
  }
  const tab = event.target.closest('[data-ssrb-tab]')?.dataset.ssrbTab;
  if (tab) showPanel(modal, tab);
  if (event.target.closest('[data-ssrb-load-sample]')) loadSample(modal, ctx);
  if (event.target.closest('[data-ssrb-build]')) void runBuilder(modal, state, ctx);
  const selected = event.target.closest('[data-ssrb-select]')?.dataset.ssrbSelect;
  if (selected) selectRelationship(modal, state, selected);
  const exportView = event.target.closest('[data-ssrb-export-view]')?.dataset.ssrbExportView;
  if (exportView) selectExportView(modal, state, exportView);
  if (event.target.closest('[data-ssrb-copy]')) void copyPreview(modal, ctx);
  if (event.target.closest('[data-ssrb-download]')) downloadPreview(modal, state, ctx);
}

function handleModalInput(event, modal, state) {
  if (!event.target.matches('[data-ssrb-search]')) return;
  state.search = event.target.value;
  getHost(modal, 'table').innerHTML = renderSupportSteelRelationshipTable(state.bundle, state.search);
}

function wireFileInputs(modal) {
  modal.querySelectorAll('[data-ssrb-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const key = input.dataset.ssrbFile;
    const textarea = modal.querySelector(`[data-ssrb-input="${key}"]`);
    const status = modal.querySelector(`[data-ssrb-file-status="${key}"]`);
    textarea.value = await file.text();
    status.textContent = `${file.name} · ${file.size} bytes`;
  }));
}

function loadSample(modal, ctx) {
  modal.querySelector('[data-ssrb-input="model"]').value = supportSteelSampleText();
  modal.querySelector('[data-ssrb-file-status="model"]').textContent = 'Combined PS-14259 piping, support and structural demo loaded';
  ctx.showToast?.('Combined staged model demo loaded.', 'success');
}

async function runBuilder(modal, state, ctx) {
  try {
    const combinedInput = parseSupportSteelJson(
      modal.querySelector('[data-ssrb-input="model"]').value,
      'Combined staged model source',
    );
    state.bundle = buildSupportSteelRelationshipBundle({
      combinedInput,
      config: readRules(modal),
    });
    state.platformMigration = await buildSupportSteelProjectMigration({
      bundle: state.bundle, supportSourceText: supportText, steelSourceText: steelText,
      sourceName: 'support-steel-sources.json', createdAt: new Date().toISOString(),
      cryptoRef: globalThis.crypto,
    });
    state.selectedRelationshipId = state.bundle.relationships[0]?.relationshipId || '';
    renderState(modal, state);
    showPanel(modal, 'chain');
    ctx.showToast?.('XML-free carrier-to-structure path audit built from one combined model.', 'success');
  } catch (error) {
    const host = modal.querySelector('[data-ssrb-run-state]');
    host.innerHTML = `<b>Build blocked</b><span>${escapeHtml(error.message || error)}</span>`;
    ctx.showToast?.(`Relationship build failed: ${error.message || error}`, 'error');
  }
}

function readRules(modal) {
  const node = (key) => modal.querySelector(`[data-ssrb-rule="${key}"]`);
  const read = (key) => node(key)?.value || '';
  return {
    supportFamilyPattern: read('supportFamilyPattern'),
    steelGroupPattern: read('steelGroupPattern'),
    supportTypes: read('supportTypes'),
    steelTypes: read('steelTypes'),
    projectionToleranceMm: Number(read('projectionToleranceMm')),
    ambiguityDeltaMm: Number(read('ambiguityDeltaMm')),
    memberContactToleranceMm: Number(read('memberContactToleranceMm')),
    memberCandidateToleranceMm: Number(read('memberCandidateToleranceMm')),
    carrierContactToleranceMm: Number(read('carrierContactToleranceMm')),
    carrierCandidateToleranceMm: Number(read('carrierCandidateToleranceMm')),
    carrierTopologyExactToleranceMm: Number(read('carrierTopologyExactToleranceMm')),
    carrierTopologySmallGapToleranceMm: Number(read('carrierTopologySmallGapToleranceMm')),
    requireAnalyticalGeometryForSpatialResolution: Boolean(node('requireAnalyticalGeometryForSpatialResolution')?.checked),
    emitNearbyMemberCandidates: Boolean(node('emitNearbyMemberCandidates')?.checked),
    emitNearbyCandidates: Boolean(node('emitNearbyMemberCandidates')?.checked),
  };
}

function renderState(modal, state) {
  getHost(modal, 'summary').innerHTML = state.bundle ? renderSupportSteelSummary(state.bundle) : initialSummaryHtml();
  getHost(modal, 'tree').innerHTML = renderSupportSteelTree(state.bundle);
  getHost(modal, 'table').innerHTML = renderSupportSteelRelationshipTable(state.bundle, state.search);
  getHost(modal, 'chain').innerHTML = renderSupportMemberChain(state.bundle);
  getHost(modal, 'evidence').innerHTML = renderSupportSteelEvidence(state.bundle, state.selectedRelationshipId);
  getHost(modal, 'diagnostics').innerHTML = renderSupportSteelDiagnostics(state.bundle);
  renderRunState(modal, state.bundle);
  renderExportPreview(modal, state);
}

function renderRunState(modal, bundle) {
  const host = modal.querySelector('[data-ssrb-run-state]');
  if (!bundle) return;
  host.innerHTML = `<b>Bundle ready</b><span>${bundle.summary.completeCarrierToStructurePathCount || 0} complete paths · ${bundle.summary.completeCarrierToStructureFamilyCount || 0} complete families · ${bundle.summary.incompleteCarrierToStructureFamilyCount || 0} incomplete families · ${bundle.summary.carrierToStructurePathExceptionCount || 0} path exceptions</span>`;
}

function selectRelationship(modal, state, relationshipId) {
  state.selectedRelationshipId = relationshipId;
  getHost(modal, 'evidence').innerHTML = renderSupportSteelEvidence(state.bundle, relationshipId);
  showPanel(modal, 'evidence');
}
function selectExportView(modal, state, key) {
  state.exportView = EXPORT_FORMATS[key] ? key : 'json';
  modal.querySelectorAll('[data-ssrb-export-view]').forEach((button) => button.classList.toggle('active', button.dataset.ssrbExportView === state.exportView));
  renderExportPreview(modal, state);
}
function renderExportPreview(modal, state) {
  const host = modal.querySelector('[data-ssrb-export-preview]');
  if (!state.bundle) { host.textContent = 'Build relationships to preview exports.'; return; }
  host.textContent = exportText(state.bundle, state.exportView);
}
async function copyPreview(modal, ctx) {
  try {
    await globalThis.navigator?.clipboard?.writeText(modal.querySelector('[data-ssrb-export-preview]')?.textContent || '');
    ctx.showToast?.('Evidence export preview copied.', 'success');
  } catch (error) { ctx.showToast?.(`Copy failed: ${error.message || error}`, 'error'); }
}
function downloadPreview(modal, state, ctx) {
  if (!state.bundle) return;
  const format = EXPORT_FORMATS[state.exportView];
  const blob = new Blob([exportText(state.bundle, state.exportView)], { type: `${format.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = format.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  ctx.showToast?.(`${format.filename} downloaded.`, 'success');
}
function exportText(bundle, key) {
  if (key === 'csv') return supportSteelRelationshipsToCsv(bundle);
  if (key === 'tree') return supportSteelHierarchyToText(bundle);
  if (key === 'chain') return supportMemberChainToCsv(bundle);
  if (key === 'carrier') return supportCarrierResolutionToCsv(bundle);
  if (key === 'attachment') return supportCarrierAttachmentToCsv(bundle);
  if (key === 'topology') return supportCarrierTopologyToCsv(bundle);
  if (key === 'structurePath') return supportCarrierToStructurePathsToCsv(bundle);
  return supportSteelBundleToJson(bundle);
}
function showPanel(modal, key) {
  modal.querySelectorAll('[data-ssrb-panel]').forEach((panel) => { panel.hidden = panel.dataset.ssrbPanel !== key; });
  modal.querySelectorAll('[data-ssrb-tab]').forEach((button) => {
    const active = button.dataset.ssrbTab === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}
function setFullscreen(modal, active) {
  modal.classList.toggle('ssrb-fullscreen', active);
  const button = modal.querySelector('[data-ssrb-fullscreen]');
  button?.setAttribute('aria-pressed', String(active));
  if (button) button.textContent = active ? 'Exit full screen' : 'Full screen';
}
function ensureStyle(doc) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const link = doc.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./support-steel-relationship-tab.css?v=20260717-ssrb-combined-model-1', import.meta.url).href;
  doc.head?.appendChild(link);
}
function getHost(modal, key) { return modal.querySelector(`[data-ssrb-${key}]`); }
function initialSummaryHtml() {
  return ['Support families', 'Carrier objects', 'Carrier attachments', 'Topology paths', 'Complete structure paths', 'Complete families', 'Incomplete families', 'Path exceptions']
    .map((label) => `<div class="ssrb-summary-card"><span>${label}</span><strong>0</strong></div>`).join('');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export const _test = Object.freeze({ readRules, exportText, showPanel, setFullscreen });

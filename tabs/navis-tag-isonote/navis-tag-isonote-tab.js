import { DEFAULT_NAVIS_TAG_ISONOTE_CONFIG, normalizeConfig } from './navis-tag-isonote-contracts.js';
import { buildSupportTableRecords, parseSupportTableText, rowsToCsv } from './navis-tag-table-source.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from './navis-tag-staged-tree.js';
import { parseNavisTagXml } from './navis-tag-xml-parser.js';
import { buildIdentityNodeTrace } from './navis-tag-identity-trace.js';
import { resolveNavisTagIsonotes } from './navis-tag-proximity-engine.js';
import { ensureNavisTagIsonoteStyle } from './navis-tag-isonote-ui-style.js';
import { renderNavisTagIsonotePane } from './navis-tag-isonote-ui-view.js';
import { downloadNavisTagFile, readNavisTagStagedFile, readNavisTagTableFile } from './navis-tag-isonote-ui-io.js';

const POPUP_TITLE_ID = 'navis-tag-isonote-title';
const CONFIG_STORE = 'navisTagIsonote.config.v1';
const ACTIVATE = 'click';

function readConfig() {
  try { return normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_STORE) || '{}')); }
  catch { return normalizeConfig(DEFAULT_NAVIS_TAG_ISONOTE_CONFIG); }
}
function saveConfig(config) { try { localStorage.setItem(CONFIG_STORE, JSON.stringify(config)); } catch {} }
function createState() {
  return {
    config: readConfig(), activeTab: 'inputs', tableText: '', navisText: '', stagedDocuments: [], stagedSourceName: '',
    tableParsed: null, tableBuild: null, tree: null, stagedIndex: null, identityTrace: null, navisParse: null, audit: null,
    status: 'Load the support table, Navis Tag XML, and managed staged JSON/ZIP.', running: false,
  };
}

function collectConfig(root, state) {
  const next = { ...state.config };
  root.querySelectorAll('[data-nti-config]').forEach((input) => {
    const key = input.dataset.ntiConfig;
    next[key] = input.type === 'number' ? Number(input.value) : input.value;
  });
  state.config = normalizeConfig(next);
  const table = root.querySelector('[data-nti-field="tableText"]');
  const navis = root.querySelector('[data-nti-field="navisText"]');
  if (table) state.tableText = table.value;
  if (navis) state.navisText = navis.value;
}

function buildAll(state) {
  state.tableParsed = parseSupportTableText(state.tableText);
  state.tableBuild = buildSupportTableRecords(state.tableParsed, state.config);
  state.tree = buildStagedJsonHierarchy(state.stagedDocuments, state.config);
  state.stagedIndex = buildStagedSupportIndex(state.tree, state.config);
  state.identityTrace = buildIdentityNodeTrace(state.tableBuild.records, state.stagedIndex, state.config);
  state.navisParse = parseNavisTagXml(state.navisText, state.config);
  state.status = `Built ${state.tree.summary.nodeCount} JSON hierarchy nodes; resolved ${state.identityTrace.summary.resolvedCount}/${state.identityTrace.summary.rowCount} identities.`;
}
function runResolution(state) {
  if (!state.identityTrace || !state.navisParse) buildAll(state);
  state.audit = resolveNavisTagIsonotes(state.tableBuild, state.identityTrace, state.navisParse, state.config);
  state.status = `ISONOTE resolution: ${state.audit.summary.resolvedCount} resolved, ${state.audit.summary.ambiguousCount} ambiguous, ${state.audit.summary.unresolvedCount} unresolved.`;
}

function render(root, state) {
  const tabs = [
    ['inputs','Inputs & Config'], ['hierarchy','JSON Hierarchy'], ['identity','Identity Node Trace'], ['augmented','Augmented Table'], ['candidates','Candidate Ledger'], ['diagnostics','Diagnostics'],
  ];
  root.innerHTML = `<div class="nti-tabs">${tabs.map(([id, label]) => `<button class="nti-tab ${state.activeTab === id ? 'is-active' : ''}" data-nti-tab="${id}">${label}</button>`).join('')}</div><div class="nti-body">${renderNavisTagIsonotePane(state)}</div>`;
  root.querySelectorAll('[data-nti-tab]').forEach((button) => button.addEventListener(ACTIVATE, () => { state.activeTab = button.dataset.ntiTab; render(root, state); }));
  root.querySelector('[data-nti-action="save-config"]')?.addEventListener(ACTIVATE, () => { collectConfig(root, state); saveConfig(state.config); state.status = 'Mapping config saved.'; render(root, state); });
  root.querySelector('[data-nti-action="build"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); buildAll(state); } catch (error) { state.status = error?.message || String(error); } render(root, state); });
  root.querySelector('[data-nti-action="run"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); runResolution(state); state.activeTab = 'augmented'; } catch (error) { state.status = error?.message || String(error); } render(root, state); });
  root.querySelector('[data-nti-action="download-csv"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote.csv', rowsToCsv(state.audit?.augmentedRows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-audit"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote-audit.json', JSON.stringify(state.audit, (key, value) => key === 'selectedEntry' || key === 'tableRecord' || key === 'node' ? undefined : value, 2), 'application/json'));
  root.querySelectorAll('[data-nti-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    state.status = `Loading ${file.name}...`; render(root, state);
    try {
      if (input.dataset.ntiFile === 'table') state.tableText = await readNavisTagTableFile(file);
      if (input.dataset.ntiFile === 'navis') state.navisText = await file.text();
      if (input.dataset.ntiFile === 'staged') { state.stagedDocuments = await readNavisTagStagedFile(file); state.stagedSourceName = file.name; }
      state.status = `${file.name} loaded.`;
    } catch (error) { state.status = `Load failed: ${error?.message || error}`; }
    render(root, state);
  }));
}

export function renderNavisTagIsonoteTab(container) {
  ensureNavisTagIsonoteStyle(container?.ownerDocument || document);
  const state = createState();
  render(container, state);
  return () => { container.innerHTML = ''; };
}
function renderLauncher() {
  return `<button type="button" class="psmap-card psmap-tile nti-launcher" data-nti-open="1" title="Open Navis Tag to ISONOTE"><span class="nti-launcher-icon" aria-hidden="true">TAG→ISO</span><b>Navis Tag to ISONOTE</b><span>Map Navis comments to support rows by configurable identity and proximity</span></button>`;
}
function mountPopup(root, onClose) {
  ensureNavisTagIsonoteStyle(root?.ownerDocument || document);
  const modal = document.createElement('div'); modal.className = 'nti-backdrop';
  const dialog = document.createElement('section'); dialog.className = 'psmap-card nti-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  dialog.innerHTML = `<div class="nti-head"><div><b id="${POPUP_TITLE_ID}">Navis Tag to ISONOTE</b><span>Canonical staged JSON hierarchy, configurable identity/position mapping, identity node trace, and Navis comment proximity.</span></div><button class="nti-close" data-nti-close="1">Close</button></div><div data-nti-host style="display:contents"></div>`;
  modal.appendChild(dialog); (document.body || root).appendChild(modal);
  renderNavisTagIsonoteTab(dialog.querySelector('[data-nti-host]'));
  modal.addEventListener(ACTIVATE, (event) => { if (event.target === modal || event.target.closest?.('[data-nti-close="1"]')) { modal.remove(); onClose(); } });
  return modal;
}
export function installNavisTagIsonoteUtilityTile(container) {
  ensureNavisTagIsonoteStyle(container?.ownerDocument || document);
  const utilitiesRoot = container.querySelector('.psnm-root') || container;
  if (utilitiesRoot.querySelector('[data-nti-launcher]')) return null;
  const launcher = document.createElement('section'); launcher.dataset.ntiLauncher = '1'; launcher.innerHTML = renderLauncher(); utilitiesRoot.appendChild(launcher);
  let popup = null;
  launcher.querySelector('[data-nti-open="1"]').addEventListener(ACTIVATE, () => { if (!popup) popup = mountPopup(utilitiesRoot, () => { popup = null; }); });
  return () => { popup?.remove(); launcher.remove(); };
}

export const _test = Object.freeze({ renderLauncher, createState, buildAll, runResolution });

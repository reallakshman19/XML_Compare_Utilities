import { DEFAULT_NAVIS_TAG_ISONOTE_CONFIG, normalizeConfig } from './navis-tag-isonote-contracts.js';
import { buildSupportTableRecords, parseSupportTableText, rowsToCsv } from './navis-tag-table-source.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from './navis-tag-staged-tree.js';
import { parseNavisTagXml } from './navis-tag-xml-parser.js';
import { attachNavisResolutionToIdentityTrace, buildIdentityNodeTrace } from './navis-tag-identity-trace.js';
import { resolveNavisTagIsonotes } from './navis-tag-proximity-engine.js';
import { buildNavisTagIsonoteReadiness } from './navis-tag-readiness.js';
import { ensureNavisTagIsonoteStyle } from './navis-tag-isonote-ui-style.js';
import { renderNavisTagIsonotePane } from './navis-tag-isonote-ui-view.js';
import { downloadNavisTagFile, readNavisTagStagedFile, readNavisTagTableFile } from './navis-tag-isonote-ui-io.js';

const POPUP_TITLE_ID = 'navis-tag-isonote-title';
const CONFIG_STORE = 'navisTagIsonote.config.v3';
const ACTIVATE = 'click';
function readConfig() { try { return normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_STORE) || '{}')); } catch { return normalizeConfig(DEFAULT_NAVIS_TAG_ISONOTE_CONFIG); } }
function saveConfig(config) { try { localStorage.setItem(CONFIG_STORE, JSON.stringify(config)); } catch {} }
function createState() {
  return {
    config: readConfig(), activeTab: 'inputs', tableText: '', navisText: '', stagedDocuments: [], sourceNames: { table: '', navis: '', staged: '' },
    tableParsed: null, tableBuild: null, tree: null, stagedIndex: null, identityTrace: null, navisParse: null, readiness: null, audit: null,
    status: 'Load the support table, Navis Tag XML, and managed staged JSON/ZIP.', running: false,
  };
}
function collectConfig(root, state) {
  const next = { ...state.config };
  root.querySelectorAll('[data-nti-config]').forEach((input) => {
    const key = input.dataset.ntiConfig;
    if (input.type === 'number') next[key] = Number(input.value);
    else if (input.type === 'checkbox') next[key] = input.checked;
    else next[key] = input.value;
  });
  root.querySelectorAll('[data-nti-path-select]').forEach((select) => {
    const selected = [...select.selectedOptions].map((option) => option.value).filter(Boolean);
    if (selected.length) next[select.dataset.ntiPathSelect] = selected;
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
  state.readiness = buildNavisTagIsonoteReadiness({
    config: state.config,
    tableBuild: state.tableBuild,
    tree: state.tree,
    stagedIndex: state.stagedIndex,
    identityTrace: state.identityTrace,
    navisParse: state.navisParse,
    hasSourceText: Boolean(state.tableText || state.navisText || state.stagedDocuments.length),
  });
  state.audit = null;
  state.status = `${state.readiness.status}: ${state.tree.summary.nodeCount} JSON nodes; ${state.identityTrace.summary.resolvedCount}/${state.identityTrace.summary.rowCount} identities resolved; ${state.navisParse.summary.validTagCount} valid Navis tags.`;
}
function runResolution(state) {
  if (!state.identityTrace || !state.navisParse || !state.readiness) buildAll(state);
  if (!state.readiness.canResolve) throw new Error(`Resolution blocked: ${state.readiness.blockers.map((item) => item.code).join(', ') || 'readiness failed'}`);
  state.audit = resolveNavisTagIsonotes(state.tableBuild, state.identityTrace, state.navisParse, state.config);
  state.identityTrace = attachNavisResolutionToIdentityTrace(state.identityTrace, state.audit);
  state.status = `ISONOTE resolution: ${state.audit.summary.resolvedCount} resolved, ${state.audit.summary.ambiguousCount} ambiguous, ${state.audit.summary.unresolvedCount} unresolved. End-to-end trace refreshed for ${state.identityTrace.summary.rowCount} table rows.`;
}
function tabDataState(state, id) {
  const has = {
    hierarchy: Boolean(state.tree?.summary?.nodeCount), identity: Boolean(state.identityTrace?.rows?.length),
    'identity-matched': Boolean(state.identityTrace?.matchedRows?.length), 'identity-ambiguous': Boolean(state.identityTrace?.ambiguousRows?.length), 'identity-rejected': Boolean(state.identityTrace?.rejectedRows?.length),
    augmented: Boolean(state.audit?.augmentedRows?.length), 'decision-matched': Boolean(state.audit?.matchedRows?.length), 'decision-ambiguous': Boolean(state.audit?.ambiguousRows?.length), 'decision-rejected': Boolean(state.audit?.rejectedRows?.length),
    candidates: Boolean(state.audit?.candidateLedger?.length), diagnostics: Boolean(state.tableBuild?.diagnostics?.length || state.identityTrace?.diagnostics?.length || state.navisParse?.diagnostics?.length || state.audit?.diagnostics?.length),
  }[id];
  return has ? (/ambiguous|rejected|diagnostics/.test(id) ? 'has-warning' : 'has-data') : '';
}
function bindFilters(root) {
  root.querySelectorAll('[data-nti-table-filter]').forEach((input) => input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    root.querySelectorAll(`.nti-filter-table-${input.dataset.ntiTableFilter} tbody tr`).forEach((row) => row.classList.toggle('is-filtered', Boolean(query && !row.textContent.toLowerCase().includes(query))));
  }));
  root.querySelectorAll('[data-nti-filter-target]').forEach((input) => input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    root.querySelectorAll(input.dataset.ntiFilterTarget).forEach((node) => node.classList.toggle('is-filtered', Boolean(query && !node.textContent.toLowerCase().includes(query))));
  }));
}
function downloadAudit(state) {
  const replacer = (key, value) => {
    if (['selectedEntry', 'tableRecord', 'node', 'raw', 'byId', 'byIdentity', 'byRoot'].includes(key)) return undefined;
    if (value instanceof Map) return [...value.entries()];
    return value;
  };
  downloadNavisTagFile('navis-tag-support-isonote-audit.json', JSON.stringify({
    audit: state.audit,
    readiness: state.readiness,
    hierarchySummary: state.tree?.summary,
    pathCatalogue: state.tree?.pathCatalogue,
    pathRecommendations: state.tree?.pathRecommendations,
    identityTrace: state.identityTrace,
    navisSummary: state.navisParse?.summary,
    sourceNames: state.sourceNames,
  }, replacer, 2), 'application/json');
}
function render(root, state) {
  const tabs = [
    ['inputs','Config & Index'], ['hierarchy','JSON Hierarchy'], ['identity','Identity Node Trace'], ['identity-matched','Identity Matched'], ['identity-ambiguous','Identity Ambiguous'], ['identity-rejected','Identity Rejected'],
    ['augmented','Augmented Table'], ['decision-matched','ISONOTE Matched'], ['decision-ambiguous','ISONOTE Ambiguous'], ['decision-rejected','ISONOTE Rejected'], ['candidates','Candidate Ledger'], ['diagnostics','Diagnostics'],
  ];
  root.innerHTML = `<div class="nti-tabs">${tabs.map(([id, label]) => `<button class="nti-tab ${state.activeTab === id ? 'is-active' : ''} ${tabDataState(state, id)}" data-nti-tab="${id}">${label}</button>`).join('')}</div><div class="nti-body">${renderNavisTagIsonotePane(state)}</div>`;
  root.querySelectorAll('[data-nti-tab]').forEach((button) => button.addEventListener(ACTIVATE, () => { state.activeTab = button.dataset.ntiTab; render(root, state); }));
  root.querySelector('[data-nti-action="save-config"]')?.addEventListener(ACTIVATE, () => { collectConfig(root, state); saveConfig(state.config); state.status = 'Mapping config saved.'; render(root, state); });
  root.querySelector('[data-nti-action="build"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); buildAll(state); } catch (error) { state.status = error?.message || String(error); } render(root, state); });
  root.querySelector('[data-nti-action="run"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); runResolution(state); state.activeTab = 'identity'; } catch (error) { state.status = error?.message || String(error); state.activeTab = 'inputs'; } render(root, state); });
  root.querySelector('[data-nti-action="download-csv"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote.csv', rowsToCsv(state.audit?.augmentedRows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-trace"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-end-to-end-identity-trace.csv', rowsToCsv(state.identityTrace?.rows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-audit"]')?.addEventListener(ACTIVATE, () => downloadAudit(state));
  root.querySelector('[data-nti-action="download-ambiguous"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote-ambiguous.csv', rowsToCsv(state.audit?.ambiguousRows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-rejected"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote-rejected.csv', rowsToCsv(state.audit?.rejectedRows || []), 'text/csv'));
  root.querySelectorAll('[data-nti-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    state.status = `Loading ${file.name}...`; render(root, state);
    try {
      if (input.dataset.ntiFile === 'table') { state.tableText = await readNavisTagTableFile(file); state.sourceNames.table = file.name; }
      if (input.dataset.ntiFile === 'navis') { state.navisText = await file.text(); state.sourceNames.navis = file.name; }
      if (input.dataset.ntiFile === 'staged') { state.stagedDocuments = await readNavisTagStagedFile(file); state.sourceNames.staged = file.name; }
      state.status = `${file.name} loaded. Build the index to refresh hierarchy and trace evidence.`;
    } catch (error) { state.status = `Load failed: ${error?.message || error}`; }
    render(root, state);
  }));
  bindFilters(root);
}
export function renderNavisTagIsonoteTab(container) {
  ensureNavisTagIsonoteStyle(container?.ownerDocument || document);
  const state = createState();
  render(container, state);
  return () => { container.innerHTML = ''; };
}
function renderLauncher() { return `<button type="button" class="psmap-card psmap-tile nti-launcher" data-nti-open="1" title="Open Navis Tag to ISONOTE"><span class="nti-launcher-icon" aria-hidden="true">TAG→ISO</span><b>Navis Tag to ISONOTE</b><span>Map Navis comments to support rows by configurable identity and proximity</span></button>`; }
function mountPopup(root, onClose) {
  ensureNavisTagIsonoteStyle(root?.ownerDocument || document);
  const modal = document.createElement('div'); modal.className = 'nti-backdrop';
  const dialog = document.createElement('section'); dialog.className = 'psmap-card nti-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  dialog.innerHTML = `<div class="nti-head"><div><b id="${POPUP_TITLE_ID}">Navis Tag to ISONOTE</b><span>Canonical staged JSON hierarchy, configurable identity/position mapping, end-to-end identity node trace, and Navis comment proximity.</span></div><button class="nti-close" data-nti-close="1">Close</button></div><div data-nti-host style="display:contents"></div>`;
  modal.appendChild(dialog); (document.body || root).appendChild(modal); renderNavisTagIsonoteTab(dialog.querySelector('[data-nti-host]'));
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
export const _test = Object.freeze({ renderLauncher, createState, buildAll, runResolution, tabDataState });

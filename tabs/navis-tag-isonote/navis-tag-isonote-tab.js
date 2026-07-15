import { DEFAULT_NAVIS_TAG_ISONOTE_CONFIG, normalizeConfig } from './navis-tag-isonote-contracts.js';
import { buildSupportTableRecords, parseSupportTableText, rowsToCsv } from './navis-tag-table-source.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from './navis-tag-staged-tree.js';
import { refineStagedSupportIndex } from './navis-tag-index-refinement.js';
import { buildResolutionSupportRecords } from './navis-tag-resolution-source.js';
import { parseNavisTagXml } from './navis-tag-xml-parser.js';
import { attachNavisResolutionToIdentityTrace, buildIdentityNodeTrace } from './navis-tag-identity-trace.js';
import { resolveNavisTagIsonotes } from './navis-tag-proximity-engine.js';
import { buildNavisTagIsonoteReadiness } from './navis-tag-readiness.js';
import { ensureNavisTagIsonoteStyle } from './navis-tag-isonote-ui-style.js';
import { renderNavisTagIsonotePane } from './navis-tag-isonote-ui-view.js';
import { renderNavisTagIsonoteEvidencePane } from './navis-tag-isonote-ui-evidence.js';
import { downloadNavisTagFile, readNavisTagStagedFile, readNavisTagTableFile } from './navis-tag-isonote-ui-io.js';

const POPUP_TITLE_ID = 'navis-tag-isonote-title';
const CONFIG_STORE = 'navisTagIsonote.config.v4';
const ACTIVATE = 'click';
function readConfig() { try { return normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_STORE) || '{}')); } catch { return normalizeConfig(DEFAULT_NAVIS_TAG_ISONOTE_CONFIG); } }
function saveConfig(config) { try { localStorage.setItem(CONFIG_STORE, JSON.stringify(config)); } catch {} }
function configSignature(config) { return JSON.stringify(normalizeConfig(config || {})); }
function markInputsDirty(state) { state.inputsDirty = true; state.audit = null; }
function createState() {
  return {
    config: readConfig(), activeTab: 'inputs', tableText: '', tableImport: null, navisText: '', stagedDocuments: [], sourceNames: { table: '', navis: '', staged: '' },
    tableParsed: null, tableBuild: null, resolutionBuild: null, tree: null, rawStagedIndex: null, stagedIndex: null, identityTrace: null, navisParse: null, readiness: null, audit: null,
    inputsDirty: true,
    status: 'Load Navis Tag XML and managed staged JSON/ZIP. The support table is optional unless table-only mode is selected.', running: false,
  };
}
function collectConfig(root, state) {
  const previousConfigSignature = configSignature(state.config);
  const next = { ...state.config };
  root.querySelectorAll('[data-nti-config]').forEach((input) => {
    const key = input.dataset.ntiConfig;
    if (input.type === 'number') next[key] = Number(input.value);
    else if (input.type === 'checkbox') next[key] = input.checked;
    else next[key] = input.value;
  });
  root.querySelectorAll('[data-nti-path-select]').forEach((select) => {
    next[select.dataset.ntiPathSelect] = [...select.selectedOptions].map((option) => option.value).filter(Boolean);
  });
  state.config = normalizeConfig(next);
  if (configSignature(state.config) !== previousConfigSignature) markInputsDirty(state);
  const table = root.querySelector('[data-nti-field="tableText"]');
  const navis = root.querySelector('[data-nti-field="navisText"]');
  if (table) {
    const nextText = table.value;
    if (nextText !== state.tableText) {
      state.tableImport = {
        kind: 'manual', fileName: '', sheetCount: 0, selectedSheetName: '', selectedSheetIndex: -1,
        headerRowNumber: nextText ? 1 : 0, candidateDataRowCount: Math.max(0, nextText.split(/\r?\n/).filter((line) => line.trim()).length - 1),
        identityValueCount: 0, selectionMode: 'MANUAL_TEXT', candidates: [], diagnostics: [],
      };
      state.sourceNames.table = nextText ? 'Pasted / edited table' : '';
      markInputsDirty(state);
    }
    state.tableText = nextText;
  }
  if (navis) {
    const nextText = navis.value;
    if (nextText !== state.navisText) markInputsDirty(state);
    state.navisText = nextText;
  }
}
function emptyTableBuild(config) {
  return {
    config,
    headers: [],
    records: [],
    diagnostics: [],
    summary: { rowCount: 0, identityCount: 0, referenceCount: 0, positionedRowCount: 0, pipeCount: 0 },
  };
}
function buildAll(state) {
  if (state.tableText.trim()) {
    state.tableParsed = parseSupportTableText(state.tableText);
    state.tableBuild = buildSupportTableRecords(state.tableParsed, state.config);
  } else {
    state.tableParsed = { delimiter: '\t', headers: [], rows: [], diagnostics: [] };
    state.tableBuild = emptyTableBuild(state.config);
  }
  if (state.tableImport?.diagnostics?.length) state.tableBuild.diagnostics.unshift(...state.tableImport.diagnostics);
  state.tree = buildStagedJsonHierarchy(state.stagedDocuments, state.config);
  state.rawStagedIndex = buildStagedSupportIndex(state.tree, state.config);
  state.stagedIndex = refineStagedSupportIndex(state.rawStagedIndex, state.tree, state.config);
  state.resolutionBuild = buildResolutionSupportRecords(state.tableBuild, state.stagedIndex, state.config);
  state.identityTrace = buildIdentityNodeTrace(state.resolutionBuild.records, state.stagedIndex, state.config);
  state.navisParse = parseNavisTagXml(state.navisText, state.config);
  state.readiness = buildNavisTagIsonoteReadiness({
    config: state.config,
    tableBuild: state.tableBuild,
    resolutionBuild: state.resolutionBuild,
    tableImport: state.tableImport,
    tree: state.tree,
    stagedIndex: state.stagedIndex,
    identityTrace: state.identityTrace,
    navisParse: state.navisParse,
    hasSourceText: Boolean(state.tableText || state.navisText || state.stagedDocuments.length),
  });
  state.audit = null;
  state.inputsDirty = false;
  const suppressed = (state.stagedIndex.summary.suppressedMirrorEntryCount || 0) + (state.stagedIndex.summary.suppressedDuplicateEntryCount || 0);
  const sheet = state.tableImport?.selectedSheetName ? ` from worksheet "${state.tableImport.selectedSheetName}"` : '';
  const resolutionSource = state.resolutionBuild.sourceKind === 'STAGED_JSON' ? 'staged JSON' : `support table${sheet}`;
  state.status = `${state.readiness.status}: Stage 1 has ${state.resolutionBuild.summary.rowCount} JSON resolution rows from ${resolutionSource}; Stage 2 has ${state.navisParse.summary.validTagCount} valid Navis tags; ${state.tree.summary.nodeCount} JSON nodes and ${state.stagedIndex.summary.indexedNodeCount} refined identity entries (${suppressed} mirrors/duplicates suppressed).`;
}
function needsRebuild(state) {
  return Boolean(state.inputsDirty || !state.identityTrace || !state.navisParse || !state.readiness || !state.resolutionBuild);
}
function runResolution(state) {
  if (needsRebuild(state)) buildAll(state);
  if (!state.readiness.canResolve) {
    const details = state.readiness.blockers.map((item) => `${item.code}: ${item.message}`).join(' | ') || 'readiness failed';
    throw new Error(`Resolution blocked. ${details}`);
  }
  state.audit = resolveNavisTagIsonotes(state.resolutionBuild, state.identityTrace, state.navisParse, state.config);
  state.identityTrace = attachNavisResolutionToIdentityTrace(state.identityTrace, state.audit);
  const source = state.resolutionBuild.sourceKind === 'STAGED_JSON' ? 'staged JSON coordinate groups' : 'support-table rows';
  state.status = `Stage 3 complete: ${state.audit.summary.resolvedCount} JSON ↔ Navis matches resolved, ${state.audit.summary.ambiguousCount} ambiguous, ${state.audit.summary.unresolvedCount} unresolved across ${state.identityTrace.summary.rowCount} ${source}.`;
}
function tabDataState(state, id) {
  const has = {
    hierarchy: Boolean(state.identityTrace?.rows?.length),
    identity: Boolean(state.navisParse?.tags?.length),
    candidates: Boolean(state.audit || state.identityTrace?.rows?.length),
    augmented: Boolean(state.audit?.augmentedRows?.length),
    diagnostics: Boolean(state.tableBuild?.diagnostics?.length || state.resolutionBuild?.diagnostics?.length || state.identityTrace?.diagnostics?.length || state.navisParse?.diagnostics?.length || state.audit?.diagnostics?.length),
  }[id];
  return has ? (id === 'diagnostics' ? 'has-warning' : 'has-data') : '';
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
    tableImport: state.tableImport,
    resolutionSource: state.resolutionBuild?.sourceKind || '',
    hierarchySummary: state.tree?.summary,
    rawIndexSummary: state.rawStagedIndex?.summary,
    refinedIndexSummary: state.stagedIndex?.summary,
    pathCatalogue: state.tree?.pathCatalogue,
    pathRecommendations: state.tree?.pathRecommendations,
    identityTrace: state.identityTrace,
    navisSummary: state.navisParse?.summary,
    navisTags: state.navisParse?.tags,
    sourceNames: state.sourceNames,
  }, replacer, 2), 'application/json');
}
function render(root, state) {
  const tabs = [
    ['inputs','Inputs & Mapping'],
    ['hierarchy','1. JSON Trace'],
    ['identity','2. Navis Tag Coordinates'],
    ['candidates','3. Tag ↔ JSON Match'],
    ['augmented','Export Results'],
    ['diagnostics','Diagnostics'],
  ];
  root.innerHTML = `<div class="nti-tabs">${tabs.map(([id, label]) => `<button class="nti-tab ${state.activeTab === id ? 'is-active' : ''} ${tabDataState(state, id)}" data-nti-tab="${id}">${label}</button>`).join('')}</div><div class="nti-body">${renderNavisTagIsonoteEvidencePane(state) ?? renderNavisTagIsonotePane(state)}</div>`;
  root.querySelectorAll('[data-nti-tab]').forEach((button) => button.addEventListener(ACTIVATE, () => { state.activeTab = button.dataset.ntiTab; render(root, state); }));
  root.querySelector('[data-nti-action="save-config"]')?.addEventListener(ACTIVATE, () => { collectConfig(root, state); saveConfig(state.config); state.status = state.inputsDirty ? 'Mapping config saved. Derived coordinates are stale; Parse or Run will rebuild them with the updated settings.' : 'Mapping config saved.'; render(root, state); });
  root.querySelector('[data-nti-action="build"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); buildAll(state); state.activeTab = 'hierarchy'; } catch (error) { state.status = error?.message || String(error); } render(root, state); });
  root.querySelector('[data-nti-action="run"]')?.addEventListener(ACTIVATE, () => { try { collectConfig(root, state); runResolution(state); state.activeTab = 'candidates'; } catch (error) { state.status = error?.message || String(error); state.activeTab = 'inputs'; } render(root, state); });
  root.querySelector('[data-nti-action="download-csv"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote.csv', rowsToCsv(state.audit?.augmentedRows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-trace"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-end-to-end-identity-trace.csv', rowsToCsv(state.identityTrace?.rows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-audit"]')?.addEventListener(ACTIVATE, () => downloadAudit(state));
  root.querySelector('[data-nti-action="download-ambiguous"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote-ambiguous.csv', rowsToCsv(state.audit?.ambiguousRows || []), 'text/csv'));
  root.querySelector('[data-nti-action="download-rejected"]')?.addEventListener(ACTIVATE, () => downloadNavisTagFile('navis-tag-support-isonote-rejected.csv', rowsToCsv(state.audit?.rejectedRows || []), 'text/csv'));
  root.querySelectorAll('[data-nti-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    state.status = `Loading ${file.name}...`; render(root, state);
    try {
      if (input.dataset.ntiFile === 'table') {
        const imported = await readNavisTagTableFile(file, {
          returnMetadata: true,
          identityColumns: state.config.tableIdentityColumns,
          referenceColumns: state.config.tableReferenceColumns,
          pipeColumns: state.config.tablePipeColumns,
          positionColumn: state.config.tablePositionColumn,
        });
        state.tableText = imported.text;
        state.tableImport = imported.meta;
        const sheet = imported.meta.selectedSheetName ? ` › ${imported.meta.selectedSheetName}` : '';
        state.sourceNames.table = `${file.name}${sheet}`;
        markInputsDirty(state);
        state.status = imported.meta.kind === 'workbook'
          ? `${file.name}: selected worksheet "${imported.meta.selectedSheetName || '(none)'}"; header row ${imported.meta.headerRowNumber || 0}; ${imported.meta.candidateDataRowCount || 0} candidate data rows. Parse sources to verify identities.`
          : `${file.name} loaded. Parse sources to refresh the three-stage evidence workflow.`;
      }
      if (input.dataset.ntiFile === 'navis') { state.navisText = await file.text(); state.sourceNames.navis = file.name; markInputsDirty(state); state.status = `${file.name} loaded. Parse sources to inspect Tag ID coordinate transformations.`; }
      if (input.dataset.ntiFile === 'staged') { state.stagedDocuments = await readNavisTagStagedFile(file); state.sourceNames.staged = file.name; markInputsDirty(state); state.status = `${file.name} loaded. Parse sources to build the JSON trace.`; }
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
function renderLauncher() { return `<button type="button" class="psmap-card psmap-tile nti-launcher" data-nti-open="1" title="Open Navis Tag to ISONOTE"><span class="nti-launcher-icon" aria-hidden="true">TAG→ISO</span><b>Navis Tag to ISONOTE</b><span>Trace JSON supports, transform Navis Tag coordinates, and review Tag ↔ JSON matches</span></button>`; }
function mountPopup(root, onClose) {
  ensureNavisTagIsonoteStyle(root?.ownerDocument || document);
  const modal = document.createElement('div'); modal.className = 'nti-backdrop';
  const dialog = document.createElement('section'); dialog.className = 'psmap-card nti-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', POPUP_TITLE_ID);
  dialog.innerHTML = `<div class="nti-head"><div><b id="${POPUP_TITLE_ID}">Navis Tag to ISONOTE</b><span>Three-stage evidence: JSON trace → Navis Tag coordinate transformation → Navis Tag ↔ JSON node match.</span></div><button class="nti-close" data-nti-close="1">Close</button></div><div data-nti-host style="display:contents"></div>`;
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
export const _test = Object.freeze({ renderLauncher, createState, buildAll, runResolution, tabDataState, configSignature, markInputsDirty, needsRebuild });

/** Composes immutable Trace/Parity controllers with the Edit Draft controller. */

import { asArray, cleanText, objectRecord } from './topology-validator-values.js';

const TRACE_KINDS = new Set(['source', 'canonical', 'ledger', 'inputXml']);
const PARITY_KINDS = new Set(['canonical', 'ledger', 'scene', 'parsed', 'report', 'ciiProjection']);
const WORKSPACE_TABS = new Set(['trace', 'edit', 'parity']);

/** @param {string} key @returns {Record<string,string>|null} */
function canonicalSelectionFromKey(key) {
  const value = cleanText(key);
  let match = value.match(/^canonical:(node|edge):(.+)$/);
  if (match) return { kind: match[1], id: match[2] };
  match = value.match(/^scene:(node|edge|support):(.+)$/);
  if (match) return { kind: match[1], id: match[2] };
  return null;
}

/** @param {Record<string, unknown>|null} selection @param {string} requestedKey @returns {ReadonlyArray<Record<string,string>>} */
function selectionRows(selection, requestedKey) {
  const record = objectRecord(selection), object = objectRecord(record.object);
  const keys = [requestedKey, ...asArray(record.keys), ...asArray(record.linkedObjectKeys), cleanText(record.objectKey), cleanText(object.objectKey)];
  const rows = keys.map(canonicalSelectionFromKey).filter(Boolean);
  if (!rows.length) {
    const nodeId = cleanText(object.canonicalNodeId), edgeId = cleanText(object.canonicalEdgeId), supportId = cleanText(object.canonicalSupportId);
    if (nodeId) rows.push({ kind: 'node', id: nodeId });
    if (edgeId) rows.push({ kind: 'edge', id: edgeId });
    if (supportId) rows.push({ kind: 'support', id: supportId });
  }
  const seen = new Set();
  return Object.freeze(rows.filter((row) => {
    const key = `${row.kind}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}

/** @param {Record<string, unknown>} traceController @param {Record<string, unknown>} editController @param {Record<string, unknown>} parityController @returns {Readonly<Record<string, unknown>>} */
export function createTopologyWorkspaceController(traceController, editController, parityController) {
  let activeTab = 'trace';

  async function loadArtifact(kind, text, fileName) {
    const results = {};
    if (TRACE_KINDS.has(kind)) results.trace = await traceController.loadArtifact(kind, text, fileName);
    if (PARITY_KINDS.has(kind)) results.parity = await parityController.loadArtifact(kind, text, fileName);
    if (!TRACE_KINDS.has(kind) && !PARITY_KINDS.has(kind)) throw new RangeError(`Unknown topology workspace artifact: ${kind}`);
    return Object.freeze(results);
  }

  async function loadFile(kind, file) {
    if (!file || typeof file.text !== 'function') throw new TypeError(`A file is required for ${kind}.`);
    return loadArtifact(kind, await file.text(), file.name);
  }

  function validate() {
    const trace = traceController.validate();
    const parity = parityController.validate();
    return Object.freeze({ trace, parity, edit: editController.evidence() });
  }

  /** @param {ReadonlyArray<Record<string,string>>} selection @param {string} source @returns {void} */
  function synchronizeCanonicalSelection(selection, source) {
    const rows = asArray(selection).map(objectRecord).filter((row) => cleanText(row.id));
    if (source !== 'edit') editController.setExternalSelection(rows);
    const active = rows.at(-1);
    if (!active) return;
    const kind = cleanText(active.kind), rawId = cleanText(active.id), id = kind === 'bend' ? rawId.replace(/^bend:/, '') : rawId;
    if (source !== 'trace' && ['node', 'edge'].includes(kind)) traceController.select(`canonical:${kind}:${id}`);
    if (source !== 'parity' && ['node', 'edge', 'support'].includes(kind)) parityController.select(`scene:${kind}:${id}`);
  }

  /** @param {string} objectKey @param {string} surface @returns {ReadonlyArray<Record<string,string>>} */
  function synchronizeSurfaceSelection(objectKey, surface) {
    const selection = surface === 'trace' ? traceController.select(objectKey) : parityController.select(objectKey);
    const rows = selectionRows(selection, objectKey);
    synchronizeCanonicalSelection(rows, surface);
    return rows;
  }

  /** @param {string} tab @param {ParentNode} root @returns {Promise<void>} */
  async function activateTab(tab, root) {
    const next = cleanText(tab);
    if (!WORKSPACE_TABS.has(next)) throw new RangeError(`Unknown topology workspace tab ${next}.`);
    activeTab = next;
    root.querySelectorAll('[data-ttv-workspace-tab]').forEach((button) => {
      const active = button.getAttribute('data-ttv-workspace-tab') === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    root.querySelectorAll('[data-ttv-workspace-panel]').forEach((panel) => {
      const active = panel.getAttribute('data-ttv-workspace-panel') === next;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    if (next === 'edit') await editController.initialize(traceController.evidence());
    else if (next === 'parity') parityController.render();
    else traceController.render();
  }

  function evidence() {
    return Object.freeze({
      trace: traceController.evidence(),
      edit: editController.evidence(),
      parity: parityController.evidence(),
      activeTab,
    });
  }

  function destroy() {
    traceController.destroy();
    editController.destroy();
    parityController.destroy();
  }

  return Object.freeze({
    loadArtifact,
    loadFile,
    validate,
    evidence,
    destroy,
    activateTab,
    synchronizeCanonicalSelection,
    synchronizeSurfaceSelection,
    render: traceController.render,
    select: traceController.select,
    focusSearchResult: traceController.focusSearchResult,
    zoomToObject: traceController.zoomToObject,
    setMode: traceController.setMode,
    setProjection: traceController.setProjection,
    setFilters: traceController.setFilters,
    setSearch: traceController.setSearch,
    setVisibility: traceController.setVisibility,
    setBottomTab: traceController.setBottomTab,
    fitView: traceController.fitView,
    zoomView: traceController.zoomView,
    assertNoMutation: traceController.assertNoMutation,
    downloadEnrichedInputXml: traceController.downloadEnrichedInputXml,
    edit: editController,
    parity: parityController,
  });
}

export const _test = Object.freeze({ TRACE_KINDS, PARITY_KINDS, WORKSPACE_TABS, canonicalSelectionFromKey, selectionRows });

/** Coordinates immutable topology loading, validation, rendering, filtering,
 * and selection. Missing required JSON stops with an actionable error;
 * optional InputXML remains NOT_EVALUATED. */

import { readCanonicalTopology, readTopologyInputXml, readTopologyTraceLedger } from './topology-artifact-reader.js';
import { validateTopologyArtifacts } from './topology-independent-validator.js';
import { renderTopologyBottomPanel, buildTopologyInspectorMarkup } from './topology-ledger-table.js';
import { readManagedTopologySource } from './topology-source-reader.js';
import { bindProducerSourceIdentity } from './topology-source-identity.js';
import { applyTopologyTraceSelection, wireTopologySvgInteractions } from './topology-svg-interactions.js';
import { wireTopologySvgNavigation } from './topology-svg-navigation.js';
import { buildTopologySvgViewModel, updateTopologySearchViewModel } from './topology-svg-view-model.js';
import { renderTopologySearchStatus, renderTopologySvg } from './topology-svg-renderer.js';
import { buildTopologySearchResultsMarkup } from './topology-search-panel.js';
import { GEOMETRY_TOLERANCE_MM, asArray, cleanText, objectRecord } from './topology-validator-values.js';
import { render3dViewer, select3dObject, dispose3dViewer } from './topology-3d-viewer-bridge.js?v=20260715-ttv-014-bend-fix';
import { artifactHash, escapeHtml, emptyNavigation, downloadEnrichedInputXml } from './topology-controller-helpers.js?v=20260715-ttv-015-native-caesar';
import { renderTopologySourceControls, syncTopologySourceControls } from './topology-source-controls.js';
/** @param {Record<string, Element>} elements @returns {Readonly<Record<string, unknown>>} */
export function createTopologyValidatorController(elements) {
  let artifacts = { source: null, canonical: null, ledger: null, inputXml: null };
  let hashes = { source: '', canonical: '', ledger: '', inputXml: '' };
  let fileNames = { source: '', canonical: '', ledger: '', inputXml: '' };
  let viewState = {
    mode: 'spatial', projection: 'XY', branch: '', selectedBranches: new Set(), types: [], disposition: '',
    searchName: '', searchRef: '', searchPath: '', labels: false, showComponentSymbols: false,
    visibility: { source: true, canonical: true, referenceConnections: false, pointFeatures: true, junctions: true, boundaries: true },
  };
  let validation = null, viewModel = null, selectedKey = '', activeBottomTab = 'summary';
  let destroySvgInteractions = () => {};
  let svgNavigation = emptyNavigation();
  /** @param {string} kind @param {string} text @param {string} fileName @returns {Promise<void>} */
  async function loadArtifact(kind, text, fileName) {
    try {
      if (kind === 'source') {
        artifacts = { source: readManagedTopologySource(JSON.parse(text)), canonical: null, ledger: null, inputXml: null };
        hashes = { source: '', canonical: '', ledger: '', inputXml: '' };
        fileNames = { source: fileName, canonical: '', ledger: '', inputXml: '' };
        resetCompanionView();
      }
      else if (kind === 'canonical') artifacts = { ...artifacts, canonical: readCanonicalTopology(JSON.parse(text)) };
      else if (kind === 'ledger') artifacts = { ...artifacts, ledger: readTopologyTraceLedger(JSON.parse(text)) };
      else if (kind === 'inputXml') artifacts = { ...artifacts, inputXml: readTopologyInputXml(text) };
      else throw new RangeError(`Unknown topology artifact kind: ${kind}`);
      if (artifacts.source && artifacts.ledger) {
        const originalSource = objectRecord(artifacts.source).raw;
        artifacts = {
          ...artifacts,
          source: bindProducerSourceIdentity(readManagedTopologySource(originalSource), artifacts.ledger),
        };
      }
      hashes = { ...hashes, [kind]: artifactHash(kind, artifacts[kind]) };
      fileNames = { ...fileNames, [kind]: fileName };
      validation = null;
      const fileStatus = elements.fileStatus.querySelector(`[data-ttv-file-status="${kind}"]`);
      if (fileStatus) fileStatus.textContent = fileName;
      if (kind === 'source') updateSourceControls();
      setStatus(`${fileName} loaded. Select Validate after required artifacts are ready.`, 'ready');
      updateMetricStrip();
    } catch (error) {
      setStatus(`${fileName}: ${error?.message || String(error)}`, 'error');
      throw error;
    }
  }
  /** @returns {void} */
  function resetCompanionView() {
    for (const kind of ['canonical', 'ledger', 'inputXml']) {
      const fileStatus = elements.fileStatus.querySelector(`[data-ttv-file-status="${kind}"]`);
      if (fileStatus) fileStatus.textContent = 'Not loaded';
    }
    destroySvgInteractions();
    svgNavigation.destroy();
    destroySvgInteractions = () => {};
    svgNavigation = emptyNavigation();
    elements.svgHost.innerHTML = '<div class="ttv-empty">Loading companion topology artifacts…</div>';
    elements.bottom.innerHTML = '';
    elements.inspector.innerHTML = '<div class="ttv-inspector-empty">Select an object after validation.</div>';
    validation = null;
    viewModel = null;
    selectedKey = '';
  }
  /** @param {string} kind @param {File} file @returns {Promise<void>} */
  async function loadFile(kind, file) {
    if (!file) throw new TypeError(`A file is required for ${kind}.`);
    await loadArtifact(kind, await file.text(), file.name);
  }

  /** @returns {Readonly<Record<string, unknown>>} */
  function validate() {
    if (!artifacts.source || !artifacts.canonical || !artifacts.ledger) {
      const missing = ['source', 'canonical', 'ledger'].filter((kind) => !artifacts[kind]);
      throw new Error(`Required artifacts not loaded: ${missing.join(', ')}.`);
    }
    assertNoMutation();
    validation = validateTopologyArtifacts(artifacts, GEOMETRY_TOLERANCE_MM);
    render();
    setStatus(`Validation complete: ${validation.metrics.issueCount} findings, ${validation.metrics.blockingIssueCount} blocking.`, validation.metrics.blockingIssueCount ? 'error' : 'pass');
    return validation;
  }

  /** @returns {void} */
  function render() {
    if (!validation) return;
    assertNoMutation();
    viewModel = buildTopologySvgViewModel({ ...artifacts, validation, state: viewState });
    if (viewState.projection !== '3D') {
      dispose3dViewer();
      destroySvgInteractions();
      svgNavigation.destroy();
      const svg = renderTopologySvg(elements.svgHost, viewModel);
      renderTopologyBottomPanel(elements.bottom, viewModel, activeBottomTab);
      svgNavigation = wireTopologySvgNavigation(svg);
      destroySvgInteractions = wireTopologySvgInteractions(svg, elements.traceRoot, objectRecord(viewModel.selectionLookup).byObjectKey, selectGroup);
    } else {
      destroySvgInteractions();
      svgNavigation.destroy();
      destroySvgInteractions = () => {};
      svgNavigation = emptyNavigation();
      renderTopologyBottomPanel(elements.bottom, viewModel, activeBottomTab);
      render3dViewer(elements, viewModel, selectedKey, select);
    }
    elements.searchResults.innerHTML = buildTopologySearchResultsMarkup(viewModel);
    elements.inspector.innerHTML = buildTopologyInspectorMarkup(viewModel, selectedKey ? objectRecord(objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey)[selectedKey]) : null);
    if (selectedKey && viewState.projection !== '3D') applyTopologyTraceSelection(elements.traceRoot, objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey), selectedKey);
    updateMetricStrip();
    updateSearchStatus();
  }

  /** @param {Record<string, unknown>|null} selection @returns {void} */
  function selectGroup(selection, objectKey) {
    selectedKey = selection ? cleanText(objectKey) : '';
    elements.inspector.innerHTML = buildTopologyInspectorMarkup(viewModel, selection);
  }

  /** @param {string} objectKey @returns {Record<string, unknown>|null} */
  function select(objectKey) {
    if (!viewModel) return null;
    selectedKey = objectKey;
    const selection = viewState.projection !== '3D'
      ? applyTopologyTraceSelection(elements.traceRoot, objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey), objectKey)
      : (objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey)[objectKey] ?? null);
    elements.inspector.innerHTML = buildTopologyInspectorMarkup(viewModel, selection);
    if (viewState.projection === '3D') {
      select3dObject(objectKey);
    }
    return selection;
  }

  /** @param {string} objectKey @returns {Record<string, unknown>|null} */
  function focusSearchResult(objectKey) {
    if (!viewModel) return null;
    const result = asArray(viewModel.searchResults).map(objectRecord).find((row) => cleanText(row.objectKey) === cleanText(objectKey));
    if (!result) throw new RangeError(`Search result is not available: ${objectKey}`);
    const branch = cleanText(result.branch);
    viewState = { ...viewState, branch, showComponentSymbols: true };
    selectedKey = cleanText(objectKey);
    syncBranchControls(branch, true);
    render();
    return select(selectedKey);
  }

  /** @param {string} objectKey @returns {void} */
  function zoomToObject(objectKey) {
    if (viewModel && svgNavigation.fitObjectKey) {
      svgNavigation.fitObjectKey(objectKey, true);
    }
  }

  /** @param {string} mode @returns {void} */
  function setMode(mode) {
    if (!['spatial', 'trace', 'junctions', 'issues'].includes(mode)) throw new RangeError(`Unsupported topology SVG mode: ${mode}`);
    viewState = { ...viewState, mode };
    render();
  }

  /** @param {string} projection @returns {void} */
  function setProjection(projection) {
    if (!['XY', 'XZ', 'YZ', '3D'].includes(projection)) throw new RangeError(`Unsupported projection: ${projection}`);
    viewState = { ...viewState, projection };
    render();
  }

  /** @param {Record<string, unknown>} patch @returns {void} */
  function setFilters(patch) {
    if ('branch' in patch) {
      const { multiSelect, ...filterPatch } = patch;
      if (multiSelect) {
        const set = new Set(viewState.selectedBranches);
        if (set.has(patch.branch)) set.delete(patch.branch);
        else set.add(patch.branch);
        viewState = { ...viewState, selectedBranches: set, ...filterPatch };
      } else {
        viewState = { ...viewState, branch: patch.branch, selectedBranches: patch.branch ? new Set([patch.branch]) : new Set(), ...filterPatch };
      }
    } else {
      viewState = { ...viewState, ...patch };
    }
    render();
  }

  /** @param {string} key @param {string} value @returns {void} */
  function setSearch(key, value) {
    if (!['searchName', 'searchRef', 'searchPath'].includes(key)) throw new RangeError(`Unknown topology search key: ${key}`);
    viewState = { ...viewState, [key]: value };
    if (!viewModel) return;
    assertNoMutation();
    viewModel = updateTopologySearchViewModel(viewModel, viewState);
    elements.searchResults.innerHTML = buildTopologySearchResultsMarkup(viewModel);
    const svg = elements.svgHost.querySelector('svg');
    if (svg) renderTopologySearchStatus(svg, viewModel);
    updateSearchStatus();
  }

  /** @returns {void} */
  function fitView() {
    svgNavigation.fit();
  }

  /** @param {string} direction @returns {void} */
  function zoomView(direction) {
    if (direction === 'in') svgNavigation.zoomIn();
    else if (direction === 'out') svgNavigation.zoomOut();
    else throw new RangeError(`Unknown topology zoom direction: ${direction}`);
  }

  /** @param {string} key @param {boolean} visible @returns {void} */
  function setVisibility(key, visible) {
    if (!Object.hasOwn(viewState.visibility, key)) throw new RangeError(`Unknown topology visibility key: ${key}`);
    viewState = { ...viewState, visibility: { ...viewState.visibility, [key]: visible } };
    render();
  }

  /** @param {string} tabId @returns {void} */
  function setBottomTab(tabId) {
    activeBottomTab = tabId;
    render();
  }

  /** @returns {void} */
  function assertNoMutation() {
    for (const kind of ['source', 'canonical', 'ledger', 'inputXml']) {
      if (!artifacts[kind]) continue;
      const current = artifactHash(kind, artifacts[kind]);
      if (current !== hashes[kind]) throw new Error(`Immutable ${kind} artifact changed after load (${hashes[kind]} -> ${current}).`);
    }
  }

  /** @returns {void} */
  function updateSourceControls() {
    viewState = { ...viewState, ...renderTopologySourceControls(elements, objectRecord(artifacts.source)) };
  }

  /** @param {string} branch @param {boolean} showComponentSymbols @returns {void} */
  function syncBranchControls(branch, showComponentSymbols) {
    syncTopologySourceControls(elements, objectRecord(artifacts.source), viewState, showComponentSymbols);
  }

  /** @returns {void} */
  function updateMetricStrip() {
    const metrics = objectRecord(validation?.metrics ?? objectRecord(artifacts.source).metrics);
    elements.metricStrip.innerHTML = [
      ['Branches', metrics.branchCount], ['Source', metrics.sourceComponentCount], ['Route', metrics.routeComponentCount],
      ['Supports', metrics.deferredSupportCount], ['Nodes', metrics.canonicalNodeCount], ['Edges', metrics.canonicalEdgeCount],
      ['Issues', metrics.issueCount], ['InputXML', validation?.inputXmlStatus ?? 'NOT_EVALUATED'],
    ].map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value ?? '—')}</span>`).join('');
  }

  /** @returns {void} */
  function updateSearchStatus() {
    const summary = objectRecord(viewModel?.filterSummary);
    if (summary.searchActive !== true) return;
    setStatus(`Search: ${summary.sourceMatchCount} matches listed; SVG scope ${summary.displayScope} remains unchanged with ${summary.displayedSourceCount} displayed source objects.`, summary.sourceMatchCount ? 'ready' : 'error');
  }

  /** @param {string} message @param {string} kind @returns {void} */
  function setStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.setAttribute('data-status', kind);
  }

  /** @returns {Readonly<Record<string, unknown>>} */
  function evidence() {
    return Object.freeze({ artifacts, hashes, fileNames, validation, viewModel, viewState, activeBottomTab });
  }

  /** @returns {void} */
  function destroy() {
    dispose3dViewer();
    destroySvgInteractions();
    svgNavigation.destroy();
  }

  updateMetricStrip();
  return Object.freeze({
    loadArtifact, loadFile, validate, render, select, focusSearchResult, zoomToObject, setMode, setProjection,
    setFilters, setSearch, setVisibility, setBottomTab, fitView, zoomView, assertNoMutation,
    evidence, downloadEnrichedInputXml: (exportSelection) => downloadEnrichedInputXml(artifacts, exportSelection ? viewState.selectedBranches : null), destroy
  });
}

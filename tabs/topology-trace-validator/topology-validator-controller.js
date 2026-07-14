/**
 * Functionality: coordinates browser file loading, independent validation,
 * immutable view-model creation, rendering, filtering, and selection. Inputs
 * are explicit DOM hosts. Output is a disposable controller API. Fallback:
 * validation stops with an actionable error until all three required JSON
 * artifacts are loaded; optional InputXML remains NOT_EVALUATED.
 */

import { readCanonicalTopology, readTopologyInputXml, readTopologyTraceLedger } from './topology-artifact-reader.js';
import { validateTopologyArtifacts } from './topology-independent-validator.js';
import { renderTopologyBottomPanel, buildTopologyInspectorMarkup } from './topology-ledger-table.js';
import { readManagedTopologySource } from './topology-source-reader.js';
import { applyTopologyTraceSelection, wireTopologySvgInteractions } from './topology-svg-interactions.js';
import { buildTopologySvgViewModel } from './topology-svg-view-model.js';
import { renderTopologySvg } from './topology-svg-renderer.js';
import { GEOMETRY_TOLERANCE_MM, asArray, cleanText, objectRecord, semanticHash } from './topology-validator-values.js';

/** @param {Record<string, Element>} elements @returns {Readonly<Record<string, unknown>>} */
export function createTopologyValidatorController(elements) {
  let artifacts = { source: null, canonical: null, ledger: null, inputXml: null };
  let hashes = { source: '', canonical: '', ledger: '', inputXml: '' };
  let viewState = {
    mode: 'spatial', projection: 'XY', branch: '', types: [], disposition: '',
    searchName: '', searchRef: '', searchPath: '', labels: true, showComponentSymbols: true,
    visibility: { source: true, canonical: true, pointFeatures: true, junctions: true, boundaries: true },
  };
  let validation = null, viewModel = null, selectedKey = '', activeBottomTab = 'summary';
  let destroySvgInteractions = () => {};

  /** @param {string} kind @param {string} text @param {string} fileName @returns {Promise<void>} */
  async function loadArtifact(kind, text, fileName) {
    try {
      if (kind === 'source') artifacts = { ...artifacts, source: readManagedTopologySource(JSON.parse(text)) };
      else if (kind === 'canonical') artifacts = { ...artifacts, canonical: readCanonicalTopology(JSON.parse(text)) };
      else if (kind === 'ledger') artifacts = { ...artifacts, ledger: readTopologyTraceLedger(JSON.parse(text)) };
      else if (kind === 'inputXml') artifacts = { ...artifacts, inputXml: readTopologyInputXml(text) };
      else throw new RangeError(`Unknown topology artifact kind: ${kind}`);
      hashes = { ...hashes, [kind]: artifactHash(kind, artifacts[kind]) };
      validation = null;
      elements.fileStatus.querySelector(`[data-ttv-file-status="${kind}"]`).textContent = fileName;
      if (kind === 'source') updateSourceControls();
      setStatus(`${fileName} loaded. Select Validate after required artifacts are ready.`, 'ready');
      updateMetricStrip();
    } catch (error) {
      setStatus(`${fileName}: ${error?.message || String(error)}`, 'error');
      throw error;
    }
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
    if (!cleanText(viewState.branch)) viewState = { ...viewState, branch: cleanText(objectRecord(asArray(artifacts.source.branches)[0]).name) };
    render();
    setStatus(`Validation complete: ${validation.metrics.issueCount} findings, ${validation.metrics.blockingIssueCount} blocking.`, validation.metrics.blockingIssueCount ? 'error' : 'pass');
    return validation;
  }

  /** @returns {void} */
  function render() {
    if (!validation) return;
    assertNoMutation();
    viewModel = buildTopologySvgViewModel({ ...artifacts, validation, state: viewState });
    destroySvgInteractions();
    const svg = renderTopologySvg(elements.svgHost, viewModel);
    renderTopologyBottomPanel(elements.bottom, viewModel, activeBottomTab);
    destroySvgInteractions = wireTopologySvgInteractions(svg, elements.traceRoot, objectRecord(viewModel.selectionLookup).byObjectKey, selectGroup);
    elements.inspector.innerHTML = buildTopologyInspectorMarkup(viewModel, selectedKey ? objectRecord(objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey)[selectedKey]) : null);
    if (selectedKey) applyTopologyTraceSelection(elements.traceRoot, objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey), selectedKey);
    updateMetricStrip();
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
    const selection = applyTopologyTraceSelection(elements.traceRoot, objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey), objectKey);
    elements.inspector.innerHTML = buildTopologyInspectorMarkup(viewModel, selection);
    return selection;
  }

  /** @param {string} mode @returns {void} */
  function setMode(mode) {
    if (!['spatial', 'trace', 'junctions', 'issues'].includes(mode)) throw new RangeError(`Unsupported topology SVG mode: ${mode}`);
    viewState = { ...viewState, mode };
    render();
  }

  /** @param {string} projection @returns {void} */
  function setProjection(projection) {
    if (!['XY', 'XZ', 'YZ'].includes(projection)) throw new RangeError(`Unsupported projection: ${projection}`);
    viewState = { ...viewState, projection };
    render();
  }

  /** @param {Record<string, unknown>} patch @returns {void} */
  function setFilters(patch) {
    viewState = { ...viewState, ...patch };
    render();
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
    const source = objectRecord(artifacts.source), branches = asArray(source.branches).map(objectRecord);
    elements.branchTree.innerHTML = `<button type="button" data-ttv-branch="">All branches<span>${branches.length}</span></button>${branches.map((branch, index) => `<button type="button" data-ttv-branch="${escapeAttribute(branch.name)}" class="${index === 0 ? 'is-active' : ''}">${escapeHtml(shortText(branch.name, 35))}<span>${asArray(branch.components).length}</span></button>`).join('')}`;
    const counts = objectRecord(objectRecord(source.metrics).componentCategoryCounts), types = Object.keys(counts);
    elements.typeFilters.innerHTML = types.map((type) => `<label><input type="checkbox" data-ttv-type="${escapeAttribute(type)}" checked>${escapeHtml(type)} <span>${counts[type]}</span></label>`).join('');
    viewState = { ...viewState, branch: cleanText(branches[0]?.name), types };
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

  /** @param {string} message @param {string} kind @returns {void} */
  function setStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.setAttribute('data-status', kind);
  }

  /** @returns {Readonly<Record<string, unknown>>} */
  function evidence() {
    return Object.freeze({ artifacts, hashes, validation, viewModel, viewState, activeBottomTab });
  }

  /** @returns {void} */
  function destroy() {
    destroySvgInteractions();
  }

  updateMetricStrip();
  return Object.freeze({ loadArtifact, loadFile, validate, render, select, setMode, setProjection, setFilters, setVisibility, setBottomTab, assertNoMutation, evidence, destroy });
}

/** @param {string} kind @param {unknown} artifact @returns {string} */
function artifactHash(kind, artifact) {
  if (kind === 'inputXml') return semanticHash(objectRecord(artifact).rawText);
  return semanticHash(objectRecord(artifact).raw);
}

/** @param {unknown} value @returns {string} */
function escapeHtml(value) {
  return cleanText(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** @param {unknown} value @returns {string} */
function escapeAttribute(value) {
  return escapeHtml(value);
}

/** @param {unknown} value @param {number} length @returns {string} */
function shortText(value, length) {
  const text = cleanText(value);
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

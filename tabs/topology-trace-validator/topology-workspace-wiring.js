/** Browser event wiring for the combined trace and topology parity workspace. */
import { loadTopologySourceFile } from './topology-companion-loader.js';
import { cleanText, objectRecord } from './topology-validator-values.js';
import { renderStagedJsonEnrichmentPanel } from './stagedjson-enrichment/stagedjson-enrichment-ui.js?v=20260715-ttv-005-css-fix';
import { wireLeftPanelResize, wireBottomPanelResize } from './topology-panel-resize.js';
import { loadTopologyProducerCore } from './topology-producer-loader.js';

export function wireTopologyWorkspace(root, controller) {
  const cleanups = [];
  cleanups.push(wireLeftPanelResize(root));
  cleanups.push(wireBottomPanelResize(root));
  const listen = (target, type, handler) => {
    if (!target) return;
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  wireWorkspaceTabs(root, controller, listen);
  wireEditControls(root, controller, listen);
  root.querySelectorAll('input[type="file"][data-ttv-file]').forEach((input) => listen(input, 'change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (input.dataset.ttvFile === 'source') {
        const windowRef = root.ownerDocument.defaultView;
        if (!windowRef?.fetch) throw new Error('Browser fetch is unavailable for automatic companion loading.');
        try {
          await loadTopologySourceFile(controller, file, root.ownerDocument.location.href, windowRef.fetch.bind(windowRef));
        } catch (error) {
          if (error.name === 'TopologyCompanionLoadError') setStatus(root, `${file.name} loaded. Build topology or load companion artifacts manually.`, 'ready');
          else throw error;
        }
      } else await controller.loadFile(input.dataset.ttvFile, file);
      await refreshCheckerIfReady(controller);
    } catch (error) { showWorkspaceError(root, error); }
  }));
  root.querySelectorAll('input[type="file"][data-ttv-parity-file]').forEach((input) => listen(input, 'change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try { await controller.parity.loadFile(input.dataset.ttvParityFile, file); }
    catch (error) { showWorkspaceError(root, error); }
  }));
  listen(root.querySelector('[data-ttv-validate]'), 'click', async () => {
    try { controller.validate(); await refreshCheckerIfReady(controller); } catch (error) { showWorkspaceError(root, error); }
  });
  wireEnrichment(root, controller, listen);
  listen(root.querySelector('[data-ttv-download-inputxml]'), 'click', () => {
    try { controller.downloadEnrichedInputXml(); } catch (error) { showWorkspaceError(root, error); }
  });
  listen(root.querySelector('[data-ttv-export-selection]'), 'click', () => {
    try { controller.downloadEnrichedInputXml(true); } catch (error) { showWorkspaceError(root, error); }
  });
  listen(root.querySelector('[data-ttv-build-topology]'), 'click', (event) => buildTopology(root, controller, event));
  listen(root.querySelector('[data-ttv-fit]'), 'click', () => controller.fitView());
  root.querySelectorAll('[data-ttv-zoom]').forEach((button) => listen(button, 'click', () => controller.zoomView(button.dataset.ttvZoom)));
  root.querySelectorAll('[data-ttv-mode]').forEach((button) => listen(button, 'click', () => {
    setActiveButtons(root, 'data-ttv-mode', button);
    const mode = button.dataset.ttvMode;
    const hideVis = mode === 'issues' || mode === 'trace';
    root.querySelectorAll('[data-ttv-vis]').forEach(btn => btn.disabled = hideVis);
    controller.setMode(mode);
  }));
  root.querySelectorAll('[data-ttv-projection]').forEach((button) => listen(button, 'click', () => {
    setActiveButtons(root, 'data-ttv-projection', button);
    const projection = button.dataset.ttvProjection;
    const is3D = projection === '3D';
    root.querySelectorAll('[data-ttv-zoom], [data-ttv-fit], [data-ttv-mode]').forEach(btn => btn.disabled = is3D);
    const compass = root.querySelector('[data-ttv-trace-root] [data-ttv-axis-compass]');
    if (compass) {
      compass.style.display = is3D ? 'none' : '';
      if (!is3D) {
        const hAxis = projection.charAt(0);
        const vAxis = projection.charAt(1);
        compass.innerHTML = `
          <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
          <line x1="0" y1="0" x2="35" y2="0" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)" style="color:#ef4444" />
          <text x="40" y="5" font-size="12" fill="#ef4444">${hAxis}</text>
          <line x1="0" y1="0" x2="0" y2="-35" stroke="#22c55e" stroke-width="2" marker-end="url(#arrow)" style="color:#22c55e" />
          <text x="-5" y="-40" font-size="12" fill="#22c55e">${vAxis}</text>
        `;
      }
    }
    controller.setProjection(projection);
  }));
  root.querySelectorAll('[data-ttv-vertical-axis]').forEach((select) => listen(select, 'change', (event) => {
    const verticalAxis = event.target.value;
    root.querySelectorAll('[data-ttv-vertical-axis]').forEach((el) => { el.value = verticalAxis; });
    controller.setFilters({ verticalAxis });
    if (controller.edit && typeof controller.edit.render === 'function') {
      controller.edit.render();
    }
  }));
  listen(root.querySelector('[data-ttv-labels]'), 'change', (event) => controller.setFilters({ labels: event.target.checked }));
  listen(root.querySelector('[data-ttv-component-symbols]'), 'change', (event) => controller.setFilters({ showComponentSymbols: event.target.checked }));
  listen(root.querySelector('[data-ttv-branch-tree]'), 'click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-ttv-branch]') : null;
    if (!button) return;
    const branch = button.dataset.ttvBranch;
    const multi = event.ctrlKey || event.metaKey;
    controller.setFilters({ branch, multiSelect: multi });
  });
  listen(root.querySelector('[data-ttv-type-ribbon]'), 'click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-ttv-type]') : null;
    if (!button) return;
    button.classList.toggle('is-active');
    controller.setFilters({
      types: [...root.querySelectorAll('[data-ttv-type].is-active')].map((btn) => btn.dataset.ttvType),
    });
  });
  listen(root.querySelector('[data-ttv-disposition]'), 'change', (event) => controller.setFilters({ disposition: event.target.value }));
  for (const key of ['searchName', 'searchRef', 'searchPath']) listen(root.querySelector(`[data-ttv-${toKebab(key)}]`), 'input', (event) => controller.setSearch(key, event.target.value));
  listen(root.querySelector('[data-ttv-search-results]'), 'click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-object-key]') : null;
    if (button) controller.focusSearchResult(cleanText(button.getAttribute('data-object-key')));
  });
  listen(root.querySelector('[data-ttv-svg-host]'), 'click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-object-key]') : null;
    if (target) controller.synchronizeSurfaceSelection(cleanText(target.getAttribute('data-object-key')), 'trace');
  });
  root.querySelectorAll('[data-ttv-vis]').forEach((button) => listen(button, 'click', () => {
    button.classList.toggle('is-active');
    controller.setVisibility(button.dataset.ttvVis, button.classList.contains('is-active'));
  }));
  listen(root.querySelector('[data-ttv-bottom]'), 'click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const collapseBtn = target ? target.closest('[data-ttv-bottom-collapse]') : null;
    if (collapseBtn) {
      const bottom = root.querySelector('.ttv-bottom');
      const content = root.querySelector('.ttv-bottom-content');
      if (content && bottom) {
        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? 'block' : 'none';
        bottom.style.height = isCollapsed ? '250px' : 'auto';
        collapseBtn.innerHTML = isCollapsed ? '▾' : '▴';
      }
      return;
    }
    const button = target ? target.closest('[data-ttv-bottom-tab]') : null;
    if (button) controller.setBottomTab(button.dataset.ttvBottomTab);
    const row = target ? target.closest('[data-object-key]') : null;
    if (row) {
      const key = cleanText(row.getAttribute('data-object-key'));
      controller.select(key);
      controller.zoomToObject(key);
    }
  });
  wireParityControls(root, controller, listen);
  listen(root.querySelector('[data-ttv-parity-svg-host]'), 'click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-object-key]') : null;
    if (target) controller.synchronizeSurfaceSelection(cleanText(target.getAttribute('data-object-key')), 'parity');
  });
  return cleanups;
}

function wireWorkspaceTabs(root, controller, listen) {
  root.querySelectorAll('[data-ttv-workspace-tab]').forEach((button) => listen(button, 'click', async () => {
    try { await controller.activateTab(button.dataset.ttvWorkspaceTab, root); }
    catch (error) { showWorkspaceError(root, error); showEditError(root, error); }
  }));
}

function wireEditControls(root, controller, listen) {
  const run = async (operation) => {
    try { await controller.edit.runOperation(operation); }
    catch (error) { showEditError(root, error); }
  };
  root.querySelectorAll('[data-ttv-edit-tool]').forEach((button) => listen(button, 'click', () => controller.edit.setTool(button.dataset.ttvEditTool)));
  root.querySelectorAll('[data-ttv-edit-operation]').forEach((button) => listen(button, 'click', () => run(button.dataset.ttvEditOperation)));
  root.querySelectorAll('[data-ttv-edit-projection]').forEach((button) => listen(button, 'click', () => {
    const projection = button.dataset.ttvEditProjection;
    controller.edit.setProjection(projection);
    const compass = root.querySelector('[data-ttv-edit-root] [data-ttv-axis-compass]');
    if (compass) {
      const hAxis = projection.charAt(0);
      const vAxis = projection.charAt(1);
      compass.innerHTML = `
        <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        <line x1="0" y1="0" x2="35" y2="0" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)" style="color:#ef4444" />
        <text x="40" y="5" font-size="12" fill="#ef4444">${hAxis}</text>
        <line x1="0" y1="0" x2="0" y2="-35" stroke="#22c55e" stroke-width="2" marker-end="url(#arrow)" style="color:#22c55e" />
        <text x="-5" y="-40" font-size="12" fill="#22c55e">${vAxis}</text>
      `;
    }
  }));
  root.querySelectorAll('[data-ttv-edit-selection-filter]').forEach((button) => listen(button, 'click', () => {
    button.classList.toggle('is-active');
    controller.edit.setSelectionFilter(button.dataset.ttvEditSelectionFilter, button.classList.contains('is-active'));
  }));
  listen(root.querySelector('[data-ttv-edit-3d]'), 'change', (event) => {
    const is3D = event.target.checked;
    controller.edit.set3dVisible(is3D);
  });
  listen(root.querySelector('[data-ttv-edit-undo]'), 'click', async () => { try { await controller.edit.undo(); } catch (error) { showEditError(root, error); } });
  listen(root.querySelector('[data-ttv-edit-redo]'), 'click', async () => { try { await controller.edit.redo(); } catch (error) { showEditError(root, error); } });
  listen(root.querySelector('[data-ttv-edit-fit]'), 'click', () => controller.edit.fit());
  root.querySelectorAll('[data-ttv-edit-zoom]').forEach((button) => listen(button, 'click', () => {
    if (button.dataset.ttvEditZoom === 'in') controller.edit.zoomIn(); else controller.edit.zoomOut();
  }));
  listen(root.querySelector('[data-ttv-edit-save]'), 'click', () => { try { controller.edit.saveDraft(); } catch (error) { showEditError(root, error); } });
  listen(root.querySelector('[data-ttv-edit-load]'), 'change', async (event) => {
    try { if (event.target.files?.[0]) await controller.edit.loadDraftFile(event.target.files[0]); }
    catch (error) { showEditError(root, error); }
  });
  listen(root.querySelector('[data-ttv-edit-export]'), 'click', async () => {
    try { await controller.edit.exportBundle(); } catch (error) { showEditError(root, error); }
  });
  listen(root.querySelector('[data-ttv-edit-inspector]'), 'change', (event) => {
    const context = event.target instanceof Element ? event.target.closest('[data-ttv-edit-context]') : null;
    if (context) controller.edit.setContextEdge(context.value);
  });
  listen(root.querySelector('[data-ttv-edit-inspector]'), 'click', (event) => {
    const action = event.target instanceof Element ? event.target.closest('[data-ttv-edit-inspector-action]') : null;
    if (action) run(action.dataset.ttvEditInspectorAction);
  });
}

function wireParityControls(root, controller, listen) {
  root.querySelectorAll('[data-ttv-parity-projection]').forEach((btn) => listen(btn, 'click', () => { setActiveButtons(root, 'data-ttv-parity-projection', btn); controller.parity.setProjection(btn.dataset.ttvParityProjection); }));
  root.querySelectorAll('[data-ttv-parity-zoom]').forEach((btn) => listen(btn, 'click', () => { if (btn.dataset.ttvParityZoom === 'in') controller.parity.zoomIn(); else controller.parity.zoomOut(); }));
  root.querySelectorAll('[data-ttv-parity-fit]').forEach((btn) => listen(btn, 'click', () => { const act = btn.dataset.ttvParityFit; if (act === 'all') controller.parity.fitAll(); else if (act === 'branch') controller.parity.fitBranch(); else if (act === 'issue') controller.parity.fitIssue(); }));
  listen(root.querySelector('[data-ttv-parity-labels]'), 'change', (ev) => controller.parity.setLabels(ev.target.checked));
  root.querySelectorAll('[data-ttv-parity-export]').forEach((btn) => listen(btn, 'click', () => { try { controller.parity.exportArtifact(btn.dataset.ttvParityExport); } catch (e) { showWorkspaceError(root, e); } }));
}

function wireEnrichment(root, controller, listen) {
  listen(root.querySelector('[data-ttv-enrich]'), 'click', () => {
    const overlay = root.ownerDocument.createElement('div');
    overlay.className = 'ttv-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const container = root.ownerDocument.createElement('div');
    container.className = 'ttv-modal-content';
    Object.assign(container.style, { width: '90vw', height: '90vh', background: 'var(--psmap-surface)', display: 'flex', flexDirection: 'column' });
    const header = root.ownerDocument.createElement('div');
    Object.assign(header.style, { padding: '10px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--psmap-border)' });
    const title = root.ownerDocument.createElement('h2'); title.textContent = 'Master File Enrichment Workbench'; title.style.margin = '0';
    const closeBtn = root.ownerDocument.createElement('button'); closeBtn.textContent = '✕ Close';
    const body = root.ownerDocument.createElement('div'); Object.assign(body.style, { flex: '1', overflow: 'hidden', position: 'relative' });
    header.append(title, closeBtn); container.append(header, body); overlay.appendChild(container); root.ownerDocument.body.appendChild(overlay);
    const dispose = renderStagedJsonEnrichmentPanel(body, { onApplyToWorkspace: async (json) => {
      try { dispose?.(); overlay.remove(); await controller.loadArtifact('source', JSON.stringify(json), 'enriched_source.json'); }
      catch (error) { showWorkspaceError(root, error); }
    } });
    closeBtn.addEventListener('click', () => { dispose?.(); overlay.remove(); });
  });
}

async function buildTopology(root, controller, event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  const originalText = button.textContent;
  try {
    button.textContent = '⚙️ Building...'; button.disabled = true;
    const evidence = controller.evidence(), source = evidence.trace.artifacts.source;
    if (!source) throw new Error('A Source JSON must be loaded before building topology.');
    const rawObj = source.raw, sourceText = JSON.stringify(Array.isArray(rawObj) ? rawObj : (rawObj.hierarchy || rawObj.branches || rawObj.objects || []));
    const { buildComponentTopologyArtifacts, topologyArtifactOutputs } = await loadTopologyProducerCore();
    setStatus(root, 'Building topology artifacts and exact parity report...', 'ready');
    const stem = cleanText(root.querySelector('[data-ttv-file-status="source"]')?.textContent).replace(/\.json$/i, '')
      || cleanText(objectRecord(evidence.trace.fileNames).source).replace(/\.json$/i, '') || 'generated';
    const built = await buildComponentTopologyArtifacts(sourceText, { sourceName: stem, jobName: 'Trace Validator Build', toleranceMm: 0.1, supportProjectionToleranceMm: 50, enrichmentConfig: {} });
    const outputs = topologyArtifactOutputs(built, { stem });
    const outputKind = (name) => name.includes('.canonical-topology.json') ? 'canonical'
      : name.includes('.topology-trace-ledger.json') ? 'ledger'
        : name.includes('.topology.input.xml') ? 'inputXml'
          : name.includes('.topology-svg-scene.json') ? 'scene'
            : name.includes('.parsed-inputxml-topology.json') ? 'parsed'
              : name.includes('.topology-parity-report.json') ? 'report' : '';
    await controller.loadArtifact('source', sourceText, `${stem}.json`);
    for (const output of outputs) {
      const kind = outputKind(output.name);
      if (kind) await controller.loadArtifact(kind, output.text, output.name);
    }
    controller.validate();
    await refreshCheckerIfReady(controller);
  } catch (error) {
    showWorkspaceError(root, error);
    root.ownerDocument.defaultView?.alert(`Build Failed: ${error?.message || String(error)}`);
  } finally { button.textContent = originalText; button.disabled = false; }
}

function setActiveButtons(root, attr, act) { root.querySelectorAll(`[${attr}]`).forEach((b) => b.classList.toggle('is-active', b === act)); }
function setStatus(root, msg, status) { const t = root.querySelector('[data-ttv-status]'); if (t) { t.textContent = msg; t.setAttribute('data-status', status); } }
function showWorkspaceError(root, error) { setStatus(root, error?.message || String(error), 'error'); }
function showEditError(root, error) { const t = root.querySelector('[data-ttv-edit-status]'); if (t) { t.textContent = error?.message || String(error); t.setAttribute('data-status', 'error'); } const l = root.querySelector('[data-ttv-edit-live]'); if (l) l.textContent = error?.message || String(error); }
async function refreshCheckerIfReady(controller) {
  const canonical = objectRecord(objectRecord(objectRecord(controller.evidence()).trace).artifacts).canonical;
  if (objectRecord(canonical).schema === 'CanonicalTopology.v1') await controller.checker?.refresh();
}
function toKebab(value) { return value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`); }

export const _test = Object.freeze({ wireWorkspaceTabs, wireEditControls, wireParityControls, buildTopology, setActiveButtons, setStatus, showWorkspaceError, showEditError, refreshCheckerIfReady, toKebab });

/**
 * Staged JSON load flow: worker parse → optional branch-scope popup (large
 * files) → scope filter → the normal source-artifact pipeline, so Trace,
 * Checker, and Edit Draft all see the same basis.
 */

import { createStagedJsonClient } from '../../workbench3d/workers/staged-json-worker-client.js';
import { openBranchScopePopup } from './topology-branch-scope-popup.js';
import { shouldOfferScopePopup } from './topology-staged-input-adapter.js';

function setEditStatus(root, message, status) {
  const target = root.querySelector('[data-ttv-edit-status]');
  if (target) { target.textContent = message; target.setAttribute('data-status', status); }
}

/**
 * @param {ParentNode} root workspace root (status targets)
 * @param {Record<string, unknown>} controller workspace controller
 * @param {File} file staged / managed-stage JSON file
 * @param {(controller:Record<string, unknown>)=>Promise<void>} refreshChecker
 * @returns {Promise<void>}
 */
export async function loadStagedJsonScoped(root, controller, file, refreshChecker) {
  const client = createStagedJsonClient();
  try {
    setEditStatus(root, `Parsing ${file.name} off the main thread…`, 'ready');
    const text = await file.text();
    const { stats, branchTree } = await client.parse(text);
    let scope = { wildcard: '', selectedIds: [] };
    if (shouldOfferScopePopup(Number(stats.componentCount ?? 0), text.length)) {
      const result = await openBranchScopePopup(root.ownerDocument, branchTree, {
        title: `Select branch scope · ${stats.branchCount} branches · ${stats.componentCount} components`,
      });
      if (result.cancelled) { setEditStatus(root, 'Staged JSON load cancelled.', 'idle'); return; }
      scope = result;
    }
    const { filtered, stats: filterStats } = await client.filter(scope);
    if (!filterStats.matched) throw new Error('Scope filter kept 0 branches — widen the wildcard or check more items.');
    setEditStatus(root, `Building edit basis from ${filterStats.matched}/${filterStats.scanned} branch(es)…`, 'ready');
    await controller.loadArtifact('source', JSON.stringify(filtered), file.name);
    await controller.activateTab('edit', root);
    await refreshChecker(controller);
    setEditStatus(root, `Staged JSON loaded: kept ${filterStats.matched}/${filterStats.scanned} branch(es), filtered ${filterStats.filtered}.`, 'pass');
  } finally { client.dispose(); }
}

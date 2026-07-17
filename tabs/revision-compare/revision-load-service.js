/**
 * Dual staged-JSON load service. Each revision slot owns an independent worker
 * client/current document so applying scope to Rev A cannot alter Rev B.
 * Outputs are ProjectDocument manifests plus the filtered immutable input.
 */

import { stagedDocumentStats } from '../../workbench3d/core/staged-json-core.js';
import { createStagedJsonClient } from '../../workbench3d/workers/staged-json-worker-client.js';
import { createProjectDocument, REVISION_SLOT_IDS } from './revision-session-contracts.js';
import { stagedDocumentMetadata } from './revision-document-metadata.js';
import { sha256Text } from './revision-hash.js';

function assertSlot(slotId) {
  if (!REVISION_SLOT_IDS.includes(slotId)) throw new RangeError(`Unknown revision slot: ${slotId}`);
}

function normalizeScope(scope) {
  const source = scope && typeof scope === 'object' ? scope : {};
  return Object.freeze({
    wildcard: String(source.wildcard ?? '').trim(),
    selectedIds: Object.freeze(Array.isArray(source.selectedIds) ? [...source.selectedIds] : []),
  });
}

function documentId(slotId, hash) { return `${slotId}:${hash.slice(0, 16)}`; }

/** Create a disposable two-slot loader using the provided Web Crypto object. */
export function createRevisionLoadService(cryptoRef) {
  const clients = new Map(REVISION_SLOT_IDS.map((slotId) => [slotId, createStagedJsonClient()]));
  const sources = new Map();

  async function buildDocument(slotId, filtered, filterStats, scope, now) {
    const source = sources.get(slotId);
    if (!source) throw new Error(`${slotId} revision has not been parsed.`);
    const metadata = stagedDocumentMetadata(filtered);
    const census = stagedDocumentStats(filtered);
    const scopedHash = await sha256Text(JSON.stringify(filtered), cryptoRef);
    return createProjectDocument({
      documentId: documentId(slotId, source.sourceHash), slotId, fileName: source.fileName,
      sourceHash: source.sourceHash, scopedHash, stagedSchema: metadata.stagedSchema,
      rootShape: metadata.rootShape, unit: metadata.unit, verticalAxis: metadata.verticalAxis,
      coordinateFrame: metadata.coordinateFrame, scope, createdAt: now,
      stats: { ...census, ...filterStats },
    });
  }

  async function applyScope(slotId, requestedScope, now) {
    assertSlot(slotId);
    if (!sources.has(slotId)) throw new Error(`${slotId} revision must be loaded before applying scope.`);
    const scope = normalizeScope(requestedScope);
    const { filtered, stats } = await clients.get(slotId).filter(scope);
    if (!Number(stats.matched)) throw new Error(`${slotId} scope retained 0 branches.`);
    const document = await buildDocument(slotId, filtered, stats, scope, now);
    return Object.freeze({ document, filtered, branchTree: sources.get(slotId).branchTree });
  }

  async function loadText(slotId, fileName, sourceText, now) {
    assertSlot(slotId);
    const text = String(sourceText ?? '');
    if (!text.trim()) throw new TypeError(`${slotId} revision text is empty.`);
    const sourceHash = await sha256Text(text, cryptoRef);
    const parsed = await clients.get(slotId).parse(text);
    sources.set(slotId, Object.freeze({ fileName: String(fileName || `${slotId}.json`), sourceHash, branchTree: parsed.branchTree }));
    return applyScope(slotId, { wildcard: '', selectedIds: [] }, now);
  }

  async function loadFile(slotId, file, now) {
    if (!file?.text) throw new TypeError(`${slotId} revision file is required.`);
    return loadText(slotId, file.name, await file.text(), now);
  }

  function dispose() {
    for (const client of clients.values()) client.dispose();
    clients.clear();
    sources.clear();
  }

  return Object.freeze({ loadFile, loadText, applyScope, dispose });
}


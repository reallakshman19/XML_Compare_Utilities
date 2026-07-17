/** Source-bound local crash-recovery storage for complete v2 edit drafts. */

import { parseTopologyEditSessionDraft, serializeTopologyEditSessionDraft } from './topology-edit-session-draft.js';

export const TOPOLOGY_RECOVERY_KEY_PREFIX = 'topology-edit-recovery.v2:';

function recoveryKey(documentId) {
  const value = String(documentId ?? '').trim();
  if (!value) throw new TypeError('Recovery documentId is required.');
  return `${TOPOLOGY_RECOVERY_KEY_PREFIX}${value}`;
}

/** Create an explicit Storage adapter; unavailable storage is a hard error. */
export function createTopologyDraftRecovery(storage) {
  if (!storage || !['getItem', 'setItem', 'removeItem'].every((key) => typeof storage[key] === 'function')) {
    throw new TypeError('Topology crash recovery requires a Storage-compatible adapter.');
  }
  const load = (documentId) => {
    const text = storage.getItem(recoveryKey(documentId));
    return text === null ? null : parseTopologyEditSessionDraft(text);
  };
  const save = (draft) => {
    const text = serializeTopologyEditSessionDraft(draft);
    storage.setItem(recoveryKey(draft.projectDocument.documentId), text);
    return draft;
  };
  const clear = (documentId) => storage.removeItem(recoveryKey(documentId));
  return Object.freeze({ load, save, clear });
}

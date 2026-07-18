/** Exact ReviewSession.v1 browser export/import without copied comparison payloads. */
import { assertJsonSafe, deepFreeze } from './revision-contract-utils.js';
import { assertValidReviewSession, REVIEW_SESSION_SCHEMA } from './revision-review-contracts.js';
import { sha256Text } from './revision-hash.js';
import { reattachReviewSession } from './revision-review-session.js';

export function serializeReviewSession(session) {
  assertJsonSafe(session, REVIEW_SESSION_SCHEMA);
  return `${JSON.stringify(session, null, 2)}\n`;
}
export function createReviewSessionExport(session) {
  if (!session) throw new Error('A review session is unavailable.');
  const copy = deepFreeze(JSON.parse(serializeReviewSession(session)));
  if (copy.schema !== REVIEW_SESSION_SCHEMA || copy.validation?.status !== 'READY') throw new TypeError('The review session is not export-ready.');
  return copy;
}
async function validateNoteHashes(session, cryptoRef) {
  for (const item of session.items) {
    if (await sha256Text(item.note, cryptoRef) !== item.noteHash) throw new TypeError(`${item.differenceId} note hash does not match its plain-text note.`);
  }
}
export async function parseReviewSessionJson(text, audit, importedAt, cryptoRef) {
  let parsed;
  try { parsed = JSON.parse(String(text ?? '')); }
  catch (error) { throw new TypeError(`Review session JSON is invalid: ${error.message}`); }
  const frozen = deepFreeze(parsed); assertValidReviewSession(frozen, audit); await validateNoteHashes(frozen, cryptoRef);
  return frozen.status === 'STALE' ? reattachReviewSession(frozen, audit, importedAt) : frozen;
}

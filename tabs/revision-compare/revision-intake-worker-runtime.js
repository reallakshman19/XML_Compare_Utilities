/** Stateful worker runtime; raw staged data never leaves except scoped filter results. */

import { filterStagedDocument, readStagedRevision } from './revision-staged-core.js';
import { stagedDocumentMetadata } from './revision-document-metadata.js';

export function createRevisionWorkerRuntime() {
  let currentDocument = null;

  function parse(message) {
    currentDocument = JSON.parse(String(message.text ?? ''));
    const revision = readStagedRevision(currentDocument);
    return { ...revision, metadata: stagedDocumentMetadata(currentDocument) };
  }

  function filter(message) {
    if (!currentDocument) throw new Error('No staged revision is loaded in this worker.');
    return filterStagedDocument(currentDocument, message.scope ?? {});
  }

  function reset() {
    currentDocument = null;
    return {};
  }

  function handle(message) {
    if (message.type === 'parse') return parse(message);
    if (message.type === 'filter') return filter(message);
    if (message.type === 'reset') return reset();
    throw new Error(`Unknown revision worker request: ${message.type}`);
  }

  return Object.freeze({ handle });
}

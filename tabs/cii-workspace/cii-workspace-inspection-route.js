/** I121-WP2: isolate Writer2 inspection integration from protected UI/engine files. */
import { createCiiWriter2InspectionWorkerClient } from './cii-workspace-inspection-worker-client.js';

export function writer2InspectionExpectedCustody(input, targetOriginalSha256) {
  if (!Array.isArray(input?.sources)) throw new Error('CII_WRITER2_INSPECT_SOURCE_SET_REQUIRED');
  return Object.freeze({
    sources: Object.freeze(input.sources.map((source) => Object.freeze({
      sourceId: String(source?.sourceId || ''),
      sha256: String(source?.originalSha256 || ''),
    }))),
    targetSha256: String(targetOriginalSha256 || ''),
  });
}

/** One owner per mounted Writer2 shell. Never silently run on the main thread. */
export function createCiiWriter2InspectionRoute({ workerFactory } = {}) {
  const client = createCiiWriter2InspectionWorkerClient({ workerFactory });
  let closed = false;
  function inspect(input, { targetOriginalSha256, onProgress, signal, options = {} } = {}) {
    if (closed) throw new Error('CII_WRITER2_INSPECT_ROUTE_DISPOSED');
    const expected = writer2InspectionExpectedCustody(input, targetOriginalSha256);
    // Caller already SHA-verifies files. Worker also independently re-verifies
    // every original SHA against the existing bridge result before acceptance.
    return client.run(input, { expected, onProgress, signal, options });
  }
  return Object.freeze({
    inspect,
    cancel: () => client.cancel(),
    dispose: () => { closed = true; client.dispose(); },
    get activeRunId() { return client.activeRunId; },
  });
}

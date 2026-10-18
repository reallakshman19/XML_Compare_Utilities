/** I121-WP1: dedicated, read-only full Writer2 source-set inspection worker. */
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from './cii-workspace-source-set.js';
import {
  CII_INSPECTION_WORKER_SCHEMA, validateCiiInspectionRun,
  verifyCiiInspectionWorkerResult,
} from './cii-workspace-inspection-worker-protocol.js';

function reply(runId, kind, detail = {}) {
  self.postMessage({ schema: CII_INSPECTION_WORKER_SCHEMA, runId, kind, ...detail });
}
self.addEventListener('message', async ({ data }) => {
  const runId = Number.isSafeInteger(data?.runId) ? data.runId : 0;
  try {
    if (data?.schema !== CII_INSPECTION_WORKER_SCHEMA || data?.kind !== 'RUN')
      throw new Error('CII_INSPECTION_WORKER_REQUEST_SCHEMA_INVALID');
    const expected = validateCiiInspectionRun(runId, data.input, data.expected);
    reply(runId, 'PROGRESS', { stage: 'INSPECTING' });
    // The existing inspector and nested frozen-version converter remain authoritative.
    // No mutation, physical BOUND qualification or Writer2 Apply exists in this worker.
    const result = await inspectCiiWorkspaceSourceSetWithVersionBridge(data.input, {
      ...(data.options || {}), cryptoRef: self.crypto,
    });
    verifyCiiInspectionWorkerResult(result, expected);
    reply(runId, 'RESULT', { result });
  } catch (error) {
    reply(runId, 'ERROR', {
      code: 'INSPECTION_FAILED', message: String(error?.message || error),
    });
  }
});

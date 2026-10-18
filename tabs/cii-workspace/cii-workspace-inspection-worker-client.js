/** I121-WP1: browser-only read-only Writer2 inspection worker client. */
import {
  CII_INSPECTION_WORKER_SCHEMA, validateCiiInspectionRun,
  verifyCiiInspectionWorkerResult, ciiInspectionWorkerError,
} from './cii-workspace-inspection-worker-protocol.js';

function defaultFactory() {
  if (typeof Worker !== 'function') throw ciiInspectionWorkerError('UNSUPPORTED');
  return new Worker(new URL('./cii-workspace-inspection.worker.js', import.meta.url), { type: 'module' });
}

export function createCiiWriter2InspectionWorkerClient({ workerFactory = defaultFactory } = {}) {
  let nextRunId = 0, active = null, disposed = false;
  function settle(record, error, result) {
    if (active !== record || record.done) return;
    record.done = true; active = null;
    record.signal?.removeEventListener('abort', record.abort);
    record.worker.removeEventListener('message', record.message);
    record.worker.removeEventListener('error', record.error);
    record.worker.terminate();
    if (error) record.reject(error); else record.resolve(result);
  }
  function cancel(code = 'CANCELLED') {
    if (!active) return false;
    settle(active, ciiInspectionWorkerError(code));
    return true;
  }
  function run(input, { expected, options = {}, signal, onProgress } = {}) {
    if (disposed) throw ciiInspectionWorkerError('DISPOSED');
    // Invalidate the former run even when the next request is malformed.
    cancel('SUPERSEDED');
    const runId = ++nextRunId, custody = validateCiiInspectionRun(runId, input, expected);
    if (signal?.aborted) throw ciiInspectionWorkerError('ABORTED');
    if (options == null || Array.isArray(options) || typeof options !== 'object')
      throw ciiInspectionWorkerError('OPTIONS_INVALID');
    if (onProgress != null && typeof onProgress !== 'function')
      throw ciiInspectionWorkerError('PROGRESS_HANDLER_INVALID');
    const { cryptoRef, instrumentation, ...cloneableOptions } = options;
    const worker = workerFactory();
    if (!worker || typeof worker.postMessage !== 'function' ||
        typeof worker.terminate !== 'function') throw ciiInspectionWorkerError('FACTORY_INVALID');
    const promise = new Promise((resolve, reject) => {
      const record = { runId, worker, signal, resolve, reject, done: false };
      record.abort = () => settle(record, ciiInspectionWorkerError('ABORTED'));
      record.error = (event) => settle(record,
        ciiInspectionWorkerError('RUNTIME_ERROR', String(event?.message || 'worker error')));
      record.message = ({ data }) => {
        if (active !== record || record.done) return;
        if (data?.schema !== CII_INSPECTION_WORKER_SCHEMA || data?.runId !== runId)
          return settle(record, ciiInspectionWorkerError('RESPONSE_IDENTITY_MISMATCH'));
        if (data.kind === 'PROGRESS') {
          try { onProgress?.({ runId, stage: String(data.stage || '') }); }
          catch (error) { settle(record, ciiInspectionWorkerError('PROGRESS_HANDLER_FAILED', error)); }
          return;
        }
        if (data.kind === 'ERROR')
          return settle(record, ciiInspectionWorkerError('INSPECTION_FAILED', data.message));
        if (data.kind !== 'RESULT')
          return settle(record, ciiInspectionWorkerError('RESPONSE_KIND_INVALID'));
        try { settle(record, null, verifyCiiInspectionWorkerResult(data.result, custody)); }
        catch (error) { settle(record, error); }
      };
      active = record;
      worker.addEventListener('message', record.message);
      worker.addEventListener('error', record.error);
      signal?.addEventListener('abort', record.abort, { once: true });
      try {
        worker.postMessage({ schema: CII_INSPECTION_WORKER_SCHEMA,
          kind: 'RUN', runId, input, expected: custody, options: cloneableOptions });
      } catch (error) { settle(record, ciiInspectionWorkerError('POST_FAILED', error)); }
    });
    return Object.freeze({ runId, promise, cancel: () => active?.runId === runId && cancel() });
  }
  return Object.freeze({
    run, cancel, dispose: () => { cancel('DISPOSED'); disposed = true; },
    get activeRunId() { return active?.runId || null; },
  });
}

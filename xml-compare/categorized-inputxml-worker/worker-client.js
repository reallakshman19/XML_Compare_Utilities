import {
  createWorkerCancel,
  createWorkerRequest,
  isWorkerOperation,
  validateWorkerResponse,
} from './worker-contracts.js';

export class CategorizedInputXmlWorkerClientError extends Error {
  constructor(message, context = {}) {
    super(String(message || 'CategorizedInputXML worker client failed.'));
    this.name = 'CategorizedInputXmlWorkerClientError';
    this.code = context.code || 'CLIENT_ERROR';
    this.operation = context.operation || '';
    this.requestId = context.requestId || '';
    this.retryable = Boolean(context.retryable);
  }
}

function clientError(code, message, context = {}) {
  return new CategorizedInputXmlWorkerClientError(message, { ...context, code });
}

export function createWorkerRequestIdFactory(prefix = 'cixw') {
  let sequence = 0;
  return () => `${String(prefix || 'cixw')}-${++sequence}`;
}

export function createCategorizedInputXmlBrowserWorker(options = {}) {
  const WorkerCtor = options.WorkerCtor || globalThis.Worker;
  if (typeof WorkerCtor !== 'function') throw clientError('WORKER_UNAVAILABLE', 'Browser Worker constructor is unavailable.');
  const url = options.url || new URL('./categorized-inputxml.worker.js', import.meta.url);
  return new WorkerCtor(url, {
    type: 'module',
    name: options.name || 'categorized-inputxml-api',
  });
}

function requireWorker(worker = {}) {
  for (const name of ['addEventListener', 'removeEventListener', 'postMessage']) {
    if (typeof worker[name] !== 'function') throw new TypeError(`Worker client requires ${name}().`);
  }
  return worker;
}

function responseError(message = {}) {
  const error = message.error || {};
  return clientError(error.code || 'WORKER_OPERATION_FAILED', error.message || 'Worker operation failed.', {
    operation: message.operation,
    requestId: message.requestId,
    retryable: error.retryable,
  });
}

function cleanupEntry(entry = {}) {
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  if (entry.signal && entry.abortListener) entry.signal.removeEventListener('abort', entry.abortListener);
}

function requestTimeout(options = {}) {
  const value = Number(options.timeoutMs || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function createCategorizedInputXmlWorkerClient(options = {}) {
  const worker = requireWorker(options.worker || createCategorizedInputXmlBrowserWorker(options));
  const nextRequestId = options.requestIdFactory || createWorkerRequestIdFactory(options.clientId || 'cixw');
  const pending = new Map();
  let closed = false;

  function finish(requestId, callback) {
    const entry = pending.get(requestId);
    if (!entry) return false;
    pending.delete(requestId);
    cleanupEntry(entry);
    callback(entry);
    return true;
  }

  function postCancel(requestId, reason) {
    try {
      worker.postMessage(createWorkerCancel({ requestId, reason }));
    } catch {
      // Client rejection is authoritative even when a terminating worker cannot receive cancellation.
    }
  }

  function rejectPending(requestId, code, message, reason = code) {
    return finish(requestId, (entry) => {
      postCancel(requestId, reason);
      entry.reject(clientError(code, message, {
        operation: entry.operation,
        requestId,
      }));
    });
  }

  function onMessage(event = {}) {
    const message = event.data;
    const validation = validateWorkerResponse(message);
    if (!validation.valid) {
      const requestId = message?.requestId || '';
      finish(requestId, (entry) => entry.reject(clientError(
        'WORKER_RESPONSE_INVALID', validation.message, { operation: entry.operation, requestId },
      )));
      return;
    }
    finish(message.requestId, (entry) => {
      if (message.ok) entry.resolve(message.result);
      else entry.reject(responseError(message));
    });
  }

  function rejectAll(code, message) {
    for (const requestId of [...pending.keys()]) {
      finish(requestId, (entry) => entry.reject(clientError(code, message, {
        operation: entry.operation,
        requestId,
      })));
    }
  }

  function onWorkerError(event = {}) {
    rejectAll('WORKER_RUNTIME_ERROR', event.message || 'Browser worker raised an error.');
  }

  function configureAbort(entry, signal) {
    if (!signal) return;
    entry.signal = signal;
    entry.abortListener = () => rejectPending(
      entry.requestId, 'REQUEST_ABORTED', 'Worker request was aborted.', signal.reason || 'abort-signal',
    );
    signal.addEventListener('abort', entry.abortListener, { once: true });
  }

  function configureTimeout(entry, timeoutMs) {
    if (!timeoutMs) return;
    entry.timeoutId = setTimeout(() => rejectPending(
      entry.requestId, 'REQUEST_TIMEOUT', `Worker request timed out after ${timeoutMs} ms.`, 'timeout',
    ), timeoutMs);
  }

  function request(operation, payload = null, requestOptions = {}) {
    if (closed) return Promise.reject(clientError('CLIENT_CLOSED', 'Worker client is closed.', { operation }));
    if (!isWorkerOperation(operation)) return Promise.reject(clientError('OPERATION_UNKNOWN', `Unsupported worker operation: ${operation}`, { operation }));
    if (requestOptions.signal?.aborted) return Promise.reject(clientError('REQUEST_ABORTED', 'Worker request was aborted before dispatch.', { operation }));
    const requestId = requestOptions.requestId || nextRequestId();
    if (pending.has(requestId)) return Promise.reject(clientError('REQUEST_DUPLICATE', 'Request ID is already pending.', { operation, requestId }));
    return new Promise((resolve, reject) => {
      const entry = { requestId, operation, resolve, reject, signal: null, abortListener: null, timeoutId: null };
      pending.set(requestId, entry);
      configureAbort(entry, requestOptions.signal);
      configureTimeout(entry, requestTimeout(requestOptions));
      try {
        worker.postMessage(createWorkerRequest({ requestId, operation, payload }));
      } catch (error) {
        finish(requestId, () => reject(clientError('WORKER_POST_FAILED', error.message, { operation, requestId })));
      }
    });
  }

  function close(closeOptions = {}) {
    if (closed) return;
    closed = true;
    worker.removeEventListener('message', onMessage);
    worker.removeEventListener('error', onWorkerError);
    rejectAll('CLIENT_CLOSED', 'Worker client was closed.');
    if (closeOptions.terminate !== false && typeof worker.terminate === 'function') worker.terminate();
  }

  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', onWorkerError);

  const categorized = Object.freeze({
    getCapabilities: (requestOptions) => request('categorized.capabilities', null, requestOptions),
    validate: (serviceRequest, requestOptions) => request('categorized.validate', serviceRequest, requestOptions),
    inspect: (serviceRequest, requestOptions) => request('categorized.inspect', serviceRequest, requestOptions),
    serialize: (serviceRequest, requestOptions) => request('categorized.serialize', serviceRequest, requestOptions),
    exportSourceInputXml: (serviceRequest, requestOptions) => request('categorized.exportSourceInputXml', serviceRequest, requestOptions),
  });
  const changeSet = Object.freeze({
    getCapabilities: (requestOptions) => request('changeset.capabilities', null, requestOptions),
    derive: (serviceRequest, requestOptions) => request('changeset.derive', serviceRequest, requestOptions),
    validate: (value, requestOptions) => request('changeset.validate', { changeSet: value }, requestOptions),
    apply: (serviceRequest, requestOptions) => request('changeset.apply', serviceRequest, requestOptions),
  });

  return Object.freeze({
    request,
    categorized,
    changeSet,
    close,
    pendingCount: () => pending.size,
    isClosed: () => closed,
  });
}

export const _test = Object.freeze({
  clientError,
  requireWorker,
  responseError,
  cleanupEntry,
  requestTimeout,
});

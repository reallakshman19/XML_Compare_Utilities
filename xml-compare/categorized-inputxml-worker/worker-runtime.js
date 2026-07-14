import { createCategorizedInputXmlWorkerDispatcher } from './worker-dispatcher.js';
import {
  createWorkerFailure,
  createWorkerResponse,
  validateWorkerInbound,
} from './worker-contracts.js';

function defaultSchedule(task) {
  return setTimeout(task, 0);
}

function requireWorkerScope(scope = {}) {
  for (const name of ['addEventListener', 'removeEventListener', 'postMessage']) {
    if (typeof scope[name] !== 'function') throw new TypeError(`Worker scope requires ${name}().`);
  }
  return scope;
}

function transportError(code, message, operation = '') {
  return Object.freeze({ code, message, operation, retryable: false, name: 'WorkerTransportError' });
}

function requestFailure(message, code, text) {
  return createWorkerFailure({
    requestId: message?.requestId || 'unassigned',
    operation: message?.operation || '',
    error: transportError(code, text, message?.operation || ''),
  });
}

function cancelledFailure(entry = {}) {
  return createWorkerFailure({
    requestId: entry.request?.requestId || 'unassigned',
    operation: entry.request?.operation || '',
    error: transportError('REQUEST_CANCELLED', entry.cancelReason || 'Request was cancelled.', entry.request?.operation || ''),
  });
}

export function installCategorizedInputXmlWorkerRuntime(options = {}) {
  const scope = requireWorkerScope(options.scope || globalThis);
  const dispatcher = options.dispatcher || createCategorizedInputXmlWorkerDispatcher();
  const schedule = options.schedule || defaultSchedule;
  const pending = new Map();
  let disposed = false;

  const post = (message) => scope.postMessage(message);

  async function execute(requestId) {
    const entry = pending.get(requestId);
    if (!entry || disposed) return;
    if (entry.cancelled) return completeCancelled(entry);
    try {
      const result = await dispatcher.dispatch(entry.request.operation, entry.request.payload);
      const current = pending.get(requestId);
      if (!current || disposed) return;
      if (current.cancelled) return completeCancelled(current);
      post(createWorkerResponse({
        requestId,
        operation: current.request.operation,
        result,
      }));
    } catch (error) {
      const current = pending.get(requestId) || entry;
      if (!disposed) post(createWorkerFailure({
        requestId,
        operation: current.request.operation,
        error,
      }));
    } finally {
      pending.delete(requestId);
    }
  }

  function completeCancelled(entry) {
    pending.delete(entry.request.requestId);
    if (!disposed) post(cancelledFailure(entry));
  }

  function queueRequest(message) {
    if (pending.has(message.requestId)) {
      post(requestFailure(message, 'REQUEST_DUPLICATE', 'Request ID is already pending.'));
      return;
    }
    pending.set(message.requestId, {
      request: message,
      cancelled: false,
      cancelReason: '',
    });
    schedule(() => void execute(message.requestId));
  }

  function cancelRequest(message) {
    const entry = pending.get(message.requestId);
    if (!entry) {
      post(requestFailure(message, 'REQUEST_NOT_PENDING', 'Request is not pending.'));
      return;
    }
    entry.cancelled = true;
    entry.cancelReason = message.reason || 'Request was cancelled.';
  }

  function handleMessage(event = {}) {
    if (disposed) return;
    const message = event.data;
    const validation = validateWorkerInbound(message);
    if (!validation.valid) {
      post(requestFailure(message, validation.code, validation.message));
      return;
    }
    if (message.kind === 'cancel') cancelRequest(message);
    else queueRequest(message);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    pending.clear();
    scope.removeEventListener('message', handleMessage);
  }

  scope.addEventListener('message', handleMessage);
  return Object.freeze({
    dispose,
    pendingCount: () => pending.size,
    isDisposed: () => disposed,
    getCapabilities: () => dispatcher.getCapabilities(),
  });
}

export const _test = Object.freeze({
  defaultSchedule,
  requireWorkerScope,
  transportError,
  requestFailure,
  cancelledFailure,
});

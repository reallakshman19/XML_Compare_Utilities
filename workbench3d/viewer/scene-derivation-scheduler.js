/** Latest-revision-only coordinator for the browser scene derivation worker. */

function defaultClock() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function clockFunction(value) {
  const result = value ?? defaultClock;
  if (typeof result !== 'function') throw new TypeError('Scene derivation clock must be a function.');
  return result;
}

function duration(startedAt, completedAt) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) return null;
  return Math.max(0, completedAt - startedAt);
}

export function createSceneDerivationScheduler(worker, onSnapshot, onError, options = {}) {
  if (!worker?.postMessage || !worker?.addEventListener) throw new TypeError('Scene derivation requires a browser Worker.');
  if (typeof onSnapshot !== 'function' || typeof onError !== 'function') throw new TypeError('Scene derivation callbacks are required.');
  const clock = clockFunction(options.clock);
  let requestedRevision = 0;
  let appliedRevision = 0;
  let requestedAt = null;
  let appliedAt = null;
  let derivationMs = null;

  const handleMessage = (event) => {
    const response = event.data;
    if (!Number.isInteger(response?.revision) || !response.snapshot) return;
    if (response.revision !== requestedRevision || response.revision <= appliedRevision) return;
    appliedRevision = response.revision;
    appliedAt = clock();
    derivationMs = duration(requestedAt, appliedAt);
    onSnapshot(response.snapshot, response.revision);
  };
  const handleError = (event) => onError(new Error(`Scene derivation worker failed: ${event.message || 'unknown error'}`));
  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);

  return Object.freeze({
    request(models) {
      requestedRevision += 1;
      requestedAt = clock();
      appliedAt = null;
      derivationMs = null;
      worker.postMessage({ revision: requestedRevision, models });
      return requestedRevision;
    },
    getState() {
      return Object.freeze({
        requestedRevision,
        appliedRevision,
        pending: requestedRevision !== appliedRevision,
        requestedAt,
        appliedAt,
        derivationMs,
      });
    },
    dispose() {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    },
  });
}

/** Focused factory contract consumed by revision-compare-viewer-adapter.js. */
export const REVISION_COMPARE_VIEWER_FACTORY_SCHEMA = 'RevisionCompareViewerFactory.v1';

export const REVISION_COMPARE_VIEWER_METHODS = Object.freeze([
  'setModels',
  'setStatuses',
  'setMode',
  'setSelection',
  'setVerticalAxis',
  'fitAll',
  'fitSelection',
  'reattach',
  'getStateSnapshot',
  'dispose',
]);

export function assertRevisionCompareViewer(value, label = 'Revision Compare viewer') {
  if (!value || typeof value !== 'object') throw new TypeError(`${label} must be an object.`);
  const missing = REVISION_COMPARE_VIEWER_METHODS.filter((method) => typeof value[method] !== 'function');
  if (missing.length) throw new TypeError(`${label} is missing: ${missing.join(', ')}.`);
  return value;
}

export function createRevisionCompareViewerFactory(factory, label) {
  if (typeof factory !== 'function') throw new TypeError(`${label} factory must be a function.`);
  return async (host, callbacks = {}) => assertRevisionCompareViewer(
    await factory(host, callbacks),
    label,
  );
}

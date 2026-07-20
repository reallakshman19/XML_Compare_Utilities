import assert from 'node:assert/strict';
import { createRevisionCompareViewerAdapter } from '../tabs/revision-compare/revision-compare-viewer-adapter.js';
import { createComparisonLifecycleState, setComparisonViewerBackend } from '../tabs/revision-compare/revision-compare-lifecycle.js';

function fakeFactory(name, log, options = {}) {
  return async (_host, callbacks) => {
    if (options.failMount) throw new Error(`${name} unavailable`);
    options.captureCallbacks?.push(callbacks);
    const state = { selected: [], mode: callbacks.initialSnapshot?.mode ?? null };
    log.push(`${name}:mount`);
    log.push(`${name}:initial:${state.mode ?? 'none'}`);
    return {
      setModels: () => log.push(`${name}:models`),
      setStatuses: () => log.push(`${name}:statuses`),
      setMode: (mode) => {
        if (options.failMode === mode) throw new Error(`${name} ${mode} unavailable`);
        state.mode = mode; log.push(`${name}:mode:${mode}`);
      },
      setSelection: (primary, related) => { state.selected = [primary, ...related].filter(Boolean); },
      setVerticalAxis: () => {},
      fitAll: () => log.push(`${name}:fitAll`),
      fitSelection: () => log.push(`${name}:fitSelection`),
      reattach: () => log.push(`${name}:reattach`),
      getStateSnapshot: () => ({ schema: `${name}.snapshot`, selectedIds: state.selected, mode: state.mode }),
      dispose: () => log.push(`${name}:dispose`),
    };
  };
}

const audit = {
  visualModels: {
    revA: { modelId: 'A', verticalAxis: 'Z', segments: [], markers: [] },
    revB: { modelId: 'B', verticalAxis: 'Z', segments: [], markers: [] },
    statusByObjectId: { A1: 'AMBIGUOUS', B1: 'NEW_IN_TARGET' },
  },
  differenceRows: [
    { differenceId: 'D1', visualRefs: { sourceObjectId: 'A1', targetObjectId: null } },
    { differenceId: 'D2', visualRefs: { sourceObjectId: null, targetObjectId: 'B1' } },
  ],
};

const log = [];
const adapter = createRevisionCompareViewerAdapter({
  webglViewerFactory: fakeFactory('WEBGL', log),
  svgViewerFactory: fakeFactory('SVG', log),
});
await adapter.render({}, audit);
adapter.setPresentationMode('side-by-side');
adapter.selectDifference('D1');
assert.equal(adapter.evidence().viewerBackend, 'WEBGL');
adapter.setBackend('SVG');
await adapter.render({}, audit);
assert(log.includes('WEBGL:dispose'));
assert(log.includes('SVG:mode:side-by-side'), 'SVG must honor the shared setMode contract');
adapter.previewPair('D1', 'D2');
const beforeFit = log.filter((item) => item.endsWith(':fitSelection')).length;
adapter.selectDifference('D1');
assert.equal(log.filter((item) => item.endsWith(':fitSelection')).length, beforeFit);
adapter.setPresentationMode('overlay');
assert(log.includes('SVG:mode:overlay'));
adapter.setBackend('WEBGL');
await adapter.render({}, audit);
assert(log.includes('WEBGL:mode:overlay'));
adapter.setPresentationMode('side-by-side');
adapter.setBackend('SVG');
await adapter.render({}, audit);
assert(log.includes('SVG:initial:overlay'), 'SVG backend snapshot must be supplied on remount');
assert.equal(adapter.evidence().presentationMode, 'side-by-side');
assert.equal(adapter.evidence().viewer.mode, 'side-by-side');

const failureLog = [];
const failureAdapter = createRevisionCompareViewerAdapter({
  webglViewerFactory: fakeFactory('WEBGL-F', failureLog),
  svgViewerFactory: fakeFactory('SVG-F', failureLog, { failMode: 'side-by-side' }),
});
failureAdapter.setBackend('SVG');
await failureAdapter.render({}, audit);
assert.equal(failureAdapter.setPresentationMode('side-by-side'), false);
assert.equal(failureAdapter.evidence().failed, true);
assert.match(failureAdapter.evidence().error, /side-by-side unavailable/);
failureAdapter.setBackend('WEBGL');
await failureAdapter.render({}, audit);
assert.equal(failureAdapter.evidence().failed, false);
assert.equal(failureAdapter.evidence().activeBackend, 'WEBGL');

const staleLog = [];
const staleCallbacks = [];
const stalePicks = [];
const staleAdapter = createRevisionCompareViewerAdapter({
  onPick: (differenceId) => stalePicks.push(differenceId),
  webglViewerFactory: fakeFactory('WEBGL-S', staleLog, { captureCallbacks: staleCallbacks }),
  svgViewerFactory: fakeFactory('SVG-S', staleLog),
});
await staleAdapter.render({}, audit);
assert.equal(staleCallbacks.length, 1);
staleAdapter.setBackend('SVG');
await staleAdapter.render({}, audit);
staleCallbacks[0].onPick({ objectId: 'A1' });
staleCallbacks[0].onRuntimeError(new Error('stale WebGL runtime error'));
assert.deepEqual(stalePicks, [], 'disposed backend picks must not reach the current adapter');
assert.equal(staleAdapter.evidence().failed, false, 'disposed backend errors must not replace current backend state');
assert.equal(staleAdapter.evidence().activeBackend, 'SVG');

const initial = createComparisonLifecycleState();
const auditIdentity = { auditId: 'audit:1' };
const reviewIdentity = { reviewSessionId: 'review:1' };
const decisionIdentity = { decisionLedgerId: 'decision:1' };
const state = Object.freeze({ ...initial, auditIdentity, reviewIdentity, decisionIdentity });
const switched = setComparisonViewerBackend(state, 'SVG');
assert.equal(switched.viewerBackend, 'SVG');
assert.equal(switched.auditIdentity, auditIdentity);
assert.equal(switched.reviewIdentity, reviewIdentity);
assert.equal(switched.decisionIdentity, decisionIdentity);
adapter.dispose();
failureAdapter.dispose();
staleAdapter.dispose();
console.log('revision-compare-svg-backend.test.mjs passed');

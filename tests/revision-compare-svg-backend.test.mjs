import assert from 'node:assert/strict';
import { createRevisionCompareViewerAdapter } from '../tabs/revision-compare/revision-compare-viewer-adapter.js';
import { createComparisonLifecycleState, setComparisonViewerBackend } from '../tabs/revision-compare/revision-compare-lifecycle.js';

function fakeFactory(name, log, fail = false) {
  return async (_host, callbacks) => {
    if (fail) throw new Error(`${name} unavailable`);
    const state = { selected: [], mode: null };
    log.push(`${name}:mount`);
    return {
      setModels: () => log.push(`${name}:models`), setStatuses: () => log.push(`${name}:statuses`),
      setMode: (mode) => { state.mode = mode; log.push(`${name}:mode:${mode}`); },
      setSelection: (primary, related) => { state.selected = [primary, ...related].filter(Boolean); },
      setVerticalAxis: () => {}, fitAll: () => log.push(`${name}:fitAll`), fitSelection: () => log.push(`${name}:fitSelection`),
      reattach: () => log.push(`${name}:reattach`),
      getStateSnapshot: () => ({ schema: `${name}.snapshot`, selectedIds: state.selected, mode: state.mode }),
      dispose: () => log.push(`${name}:dispose`), callbacks,
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
assert(log.includes('SVG:mode:overlay'));
adapter.previewPair('D1', 'D2');
const beforeFit = log.filter((item) => item.endsWith(':fitSelection')).length;
adapter.selectDifference('D1');
assert.equal(log.filter((item) => item.endsWith(':fitSelection')).length, beforeFit);
adapter.setBackend('WEBGL');
await adapter.render({}, audit);
assert(log.filter((item) => item.endsWith(':mount')).length === 3);
assert(log.includes('WEBGL:mode:side-by-side'));

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
console.log('revision-compare-svg-backend.test.mjs passed');

import assert from 'node:assert/strict';
import {
  createRevisionCompareSvgViewport,
  normalizeRevisionCompareSvgViewportState,
  revisionCompareSvgViewBox,
  zoomRevisionCompareSvgViewport,
} from '../tabs/revision-compare/revision-compare-svg-viewport.js';

class FakeRoot {
  constructor(viewBox = '0 0 1000 500') {
    this.attributes = new Map([['viewBox', viewBox]]);
    this.listeners = new Map();
    this.parentNode = null;
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener, options) {
    const capture = options === true || options?.capture === true;
    this.listeners.set(`${type}:${capture}`, listener);
  }
  removeEventListener(type, _listener, options) {
    const capture = options === true || options?.capture === true;
    this.listeners.delete(`${type}:${capture}`);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 500 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  dispatch(type, event = {}) {
    const value = {
      target: this, button: 0, pointerId: 1, clientX: 500, clientY: 250,
      deltaY: 0, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      stopImmediatePropagation() { this.stopped = true; },
      ...event,
    };
    this.listeners.get(`${type}:true`)?.(value);
    if (!value.stopped) this.listeners.get(`${type}:false`)?.(value);
    return value;
  }
}

const invalid = normalizeRevisionCompareSvgViewportState({
  zoom: Number.NaN,
  panX: Infinity,
  panY: -Infinity,
  minimumZoom: -1,
  maximumZoom: 0,
});
assert.equal(invalid.zoom, 1);
assert.equal(invalid.panX, 0);
assert.equal(invalid.panY, 0);
assert(invalid.minimumZoom > 0);
assert(invalid.maximumZoom >= invalid.minimumZoom);

const base = { x: 0, y: 0, width: 1000, height: 500 };
assert.deepEqual(revisionCompareSvgViewBox(base, invalid), base);
const anchored = zoomRevisionCompareSvgViewport(invalid, base, { x: 0.25, y: 0.75 }, 2);
const before = revisionCompareSvgViewBox(base, invalid);
const after = revisionCompareSvgViewBox(base, anchored);
assert.equal(before.x + (before.width * 0.25), after.x + (after.width * 0.25));
assert.equal(before.y + (before.height * 0.75), after.y + (after.height * 0.75));

const source = new FakeRoot();
const target = new FakeRoot();
const changes = [];
const controller = createRevisionCompareSvgViewport({ onChange: (state, reason) => changes.push({ state, reason }) });
controller.attachSurface('source', source);
controller.attachSurface('target', target);
assert.equal(controller.getResourceCounts().surfaces, 2);
assert.equal(controller.getResourceCounts().listeners, 12);
assert.equal(source.getAttribute('viewBox'), target.getAttribute('viewBox'));

source.dispatch('wheel', { clientX: 250, clientY: 375, deltaY: -400 });
const zoomed = controller.getState();
assert(zoomed.zoom > 1);
assert(zoomed.zoom <= zoomed.maximumZoom);
assert.equal(source.getAttribute('viewBox'), target.getAttribute('viewBox'));
assert.doesNotThrow(() => JSON.stringify(zoomed));

const beforePan = controller.getState();
source.dispatch('pointerdown', { clientX: 200, clientY: 200 });
source.dispatch('pointermove', { clientX: 240, clientY: 215 });
source.dispatch('pointerup', { clientX: 240, clientY: 215 });
const suppressed = source.dispatch('click');
assert.equal(suppressed.prevented, true);
assert.notEqual(controller.getState().panX, beforePan.panX);
assert.notEqual(controller.getState().panY, beforePan.panY);
assert.equal(source.getAttribute('viewBox'), target.getAttribute('viewBox'));

controller.reset('incremental-pan-baseline');
const incrementalBefore = controller.getState();
source.dispatch('pointerdown', { clientX: 100, clientY: 100 });
for (let step = 1; step <= 6; step += 1) {
  source.dispatch('pointermove', { clientX: 100 + step, clientY: 100 });
}
source.dispatch('pointerup', { clientX: 106, clientY: 100 });
assert.equal(source.dispatch('click').prevented, true);
assert.notEqual(controller.getState().panX, incrementalBefore.panX, 'incremental movement must cross the cumulative drag threshold');

source.dispatch('pointerdown', { clientX: 300, clientY: 200 });
source.dispatch('pointermove', { clientX: 320, clientY: 200 });
source.dispatch('pointercancel', { clientX: 320, clientY: 200 });
assert.equal(source.dispatch('click').prevented, false, 'pointer cancellation must not suppress the next unrelated click');

const stable = controller.getState();
source.dispatch('wheel', { deltaY: Number.NaN });
assert.deepEqual(controller.getState(), stable);
controller.setState({ zoom: 999, panX: 999, panY: -999 }, 'bounded-restore');
assert.equal(controller.getState().zoom, 32);
assert.equal(controller.getState().panX, 4);
assert.equal(controller.getState().panY, -4);
controller.reset('fit-all');
assert.equal(controller.getState().zoom, 1);
assert.equal(controller.getState().panX, 0);
assert.equal(controller.getState().panY, 0);
assert(changes.some((item) => item.reason === 'pan'));
assert(changes.some((item) => item.reason === 'zoom'));
assert(changes.some((item) => item.reason === 'fit-all'));
assert.equal(controller.dispose(), true);
assert.equal(controller.getResourceCounts().surfaces, 0);
assert.equal(controller.getResourceCounts().listeners, 0);
assert.equal(controller.dispose(), false);
console.log('revision-compare-svg-viewport.test.mjs passed');

import assert from 'node:assert/strict';
import { assertRevisionCompareViewer, REVISION_COMPARE_VIEWER_METHODS } from '../tabs/revision-compare/revision-compare-viewer-contract.js';
import { createRevisionCompareEngineeringSvgViewer } from '../tabs/revision-compare/revision-compare-engineering-svg-viewer.js';

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) { if (force) this.values.add(value); else this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}
class Element {
  constructor(documentRef, name) {
    this.ownerDocument = documentRef; this.localName = name; this.children = []; this.parentNode = null;
    this.attributes = new Map(); this.listeners = new Map(); this.classList = new ClassList();
    this.style = { pointerEvents: '', opacity: '', setProperty() {} };
    this.clientWidth = 800; this.clientHeight = 500; this.textContent = ''; this.className = '';
  }
  get firstElementChild() { return this.children[0] ?? null; }
  get parentElement() { return this.parentNode; }
  appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener, options) {
    const key = `${type}:${options === true || options?.capture === true}`;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(listener);
  }
  removeEventListener(type, listener, options) {
    this.listeners.get(`${type}:${options === true || options?.capture === true}`)?.delete(listener);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  dispatch(type, input = {}) {
    const event = { target: input.target ?? this, currentTarget: this, key: input.key,
      button: input.button ?? 0, pointerId: input.pointerId ?? 1,
      clientX: input.clientX ?? 400, clientY: input.clientY ?? 250, deltaY: input.deltaY ?? 0,
      ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...input };
    this.listeners.get(`${type}:true`)?.forEach((listener) => listener(event));
    this.listeners.get(`${type}:false`)?.forEach((listener) => listener(event));
  }
}
class Document {
  createElementNS(_namespace, name) { return new Element(this, name); }
  createElement(name) { return new Element(this, name); }
}
function descendants(root) { return root.children.flatMap((child) => [child, ...descendants(child)]); }
function byAttribute(root, name, value = null) {
  return descendants(root).filter((node) => node.getAttribute(name) != null
    && (value == null || node.getAttribute(name) === value));
}
function model(side, count = 1) {
  return { modelId: side, revisionId: `${side}:revision`, unit: 'mm', coordinateFrame: 'PLANT', verticalAxis: 'Z', markers: [],
    segments: Array.from({ length: count }, (_, index) => ({ objectId: `${side}:${index + 1}`,
      start: [index, side === 'A' ? 0 : 1, 0], end: [index + 1, side === 'A' ? 0 : 1, 0] })) };
}
function persistent(value) {
  return { schema: value.schema, zoom: value.zoom, panX: value.panX, panY: value.panY,
    minimumZoom: value.minimumZoom, maximumZoom: value.maximumZoom };
}

const documentRef = new Document(); const host = new Element(documentRef, 'div'); let pick = null;
const viewer = await createRevisionCompareEngineeringSvgViewer(host, { onPick: (value) => { pick = value; } });
assertRevisionCompareViewer(viewer);
assert(REVISION_COMPARE_VIEWER_METHODS.every((method) => typeof viewer[method] === 'function'));
viewer.setStatuses(new Map([['A:1', 'AMBIGUOUS'], ['B:1', 'NEW_IN_TARGET']]));
viewer.setModels({ source: model('A'), target: model('B') });
const overlay = byAttribute(host, 'data-revc-svg-overlay-root')[0];
assert.equal(overlay.getAttribute('role'), 'group');
assert.equal(overlay.getAttribute('tabindex'), '0');
assert.equal(overlay.getAttribute('aria-label'), 'Revision comparison Engineering SVG overlay');
assert.match(overlay.getAttribute('aria-keyshortcuts'), /Shift\+ArrowRight/);
assert.equal(byAttribute(host, 'data-revc-svg-keyboard-instructions').length, 1);
assert.equal(viewer.getStateSnapshot().resources.viewportListeners, 7);
const entity = byAttribute(host, 'data-engineering-svg-entity-id', 'A:1')[0];
assert.equal(entity.getAttribute('role'), 'button');
assert.equal(entity.getAttribute('tabindex'), '0');
assert.match(entity.getAttribute('aria-label'), /status: Ambiguous/);
overlay.dispatch('keydown', { target: entity, key: 'Enter' });
assert.deepEqual(pick, { objectId: 'A:1' });
pick = null; overlay.dispatch('keydown', { target: entity, key: ' ' });
assert.deepEqual(pick, { objectId: 'A:1' });

viewer.setSelection('A:1');
const fitBefore = viewer.getStateSnapshot().fitCounts.selection;
assert.equal(viewer.fitSelection(), true);
assert.equal(viewer.getStateSnapshot().fitCounts.selection, fitBefore + 1);
viewer.setSelection('missing');
const missingBefore = viewer.getStateSnapshot();
assert.equal(viewer.fitSelection(), false);
assert.equal(viewer.getStateSnapshot().fitCounts.noGeometry, missingBefore.fitCounts.noGeometry + 1);
assert.deepEqual(viewer.getStateSnapshot().viewportHistory.overlay, missingBefore.viewportHistory.overlay);

overlay.dispatch('keydown', { key: 'ArrowRight' });
overlay.dispatch('keydown', { key: '=' });
const overlayHistory = persistent(viewer.getStateSnapshot().viewportHistory.overlay);
assert(overlayHistory.panX > 0); assert(overlayHistory.zoom > 1);
viewer.setSelection('A:1', ['B:1']); viewer.setMode('side-by-side');
const panes = byAttribute(host, 'data-revc-svg-pane-root');
assert.equal(panes.length, 2);
assert.equal(byAttribute(host, 'data-revc-svg-keyboard-instructions').length, 2);
assert.equal(viewer.getStateSnapshot().resources.viewportListeners, 14);
assert.equal(panes[0].getAttribute('aria-label'), 'Revision comparison Rev A source Engineering SVG pane');
assert.equal(panes[1].getAttribute('aria-label'), 'Revision comparison Rev B target Engineering SVG pane');
const hidden = byAttribute(host, 'data-revc-hidden-fit-authority');
assert(hidden.every((node) => node.getAttribute('tabindex') === '-1' && node.getAttribute('aria-hidden') === 'true'));
panes[0].dispatch('keydown', { key: 'ArrowDown', shiftKey: true });
panes[1].dispatch('keydown', { key: '+' });
assert.equal(panes[0].getAttribute('viewBox'), panes[1].getAttribute('viewBox'));
assert(viewer.getStateSnapshot().viewportHistory['side-by-side'].panY > 0);
assert(viewer.getStateSnapshot().viewportHistory['side-by-side'].zoom > 1);
assert.deepEqual(persistent(viewer.getStateSnapshot().viewportHistory.overlay), overlayHistory);
panes[0].dispatch('keydown', { key: '0' });
assert.deepEqual(persistent(viewer.getStateSnapshot().viewportHistory['side-by-side']),
  { ...persistent(viewer.getStateSnapshot().viewportHistory['side-by-side']), zoom: 1, panX: 0, panY: 0 });
assert.deepEqual(persistent(viewer.getStateSnapshot().viewportHistory.overlay), overlayHistory);
panes[0].dispatch('wheel', { clientX: 250, clientY: 300, deltaY: -400 });
panes[0].dispatch('pointerdown', { clientX: 200, clientY: 200 });
panes[0].dispatch('pointermove', { clientX: 250, clientY: 225 });
panes[0].dispatch('pointerup', { clientX: 250, clientY: 225 });
assert.notEqual(viewer.getStateSnapshot().viewportHistory['side-by-side'].panX, 0);

const snapshot = structuredClone(viewer.getStateSnapshot()); const nextHost = new Element(documentRef, 'div');
viewer.reattach(nextHost);
assert.equal(byAttribute(host, 'data-engineering-svg-root').length, 0);
assert.equal(byAttribute(nextHost, 'data-revc-svg-pane-root').length, 2);
assert.deepEqual(viewer.getStateSnapshot().viewportHistory['side-by-side'], snapshot.viewportHistory['side-by-side']);
assert.equal(viewer.dispose(), true); assert.equal(viewer.dispose(), false);
assert.equal(byAttribute(nextHost, 'data-engineering-svg-root').length, 0);
assert.equal(byAttribute(nextHost, 'data-revc-svg-keyboard-instructions').length, 0);

const largeHost = new Element(documentRef, 'div');
const largeViewer = await createRevisionCompareEngineeringSvgViewer(largeHost);
largeViewer.setModels({ source: model('A', 2500), target: model('B', 2500) });
assert.equal(largeViewer.getStateSnapshot().entityCount, 5000);
assert.equal(largeViewer.getStateSnapshot().resources.viewportListeners, 7);
largeViewer.setMode('side-by-side');
assert.equal(largeViewer.getStateSnapshot().resources.viewportListeners, 14);
assert.equal(largeViewer.getStateSnapshot().visibleEntityCounts.source, 2500);
assert.equal(largeViewer.getStateSnapshot().hiddenFitAuthorityCounts.target, 2500);
assert.equal(byAttribute(largeHost, 'data-engineering-svg-entity-id').length, 10000);
assert.equal(largeViewer.dispose(), true);
assert.equal(byAttribute(largeHost, 'data-engineering-svg-root').length, 0);
console.log('revision-compare-svg-viewer-contract.test.mjs passed');

import assert from 'node:assert/strict';
import {
  assertRevisionCompareViewer,
  REVISION_COMPARE_VIEWER_METHODS,
} from '../tabs/revision-compare/revision-compare-viewer-contract.js';
import { createRevisionCompareEngineeringSvgViewer } from '../tabs/revision-compare/revision-compare-engineering-svg-viewer.js';

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) { if (force) this.values.add(value); else this.values.delete(value); }
}
class FakeStyle { constructor() { this.values = new Map(); } setProperty(name, value) { this.values.set(name, String(value)); } }
class FakeElement {
  constructor(ownerDocument, localName) {
    this.ownerDocument = ownerDocument; this.localName = localName; this.children = []; this.parentNode = null;
    this.attributes = new Map(); this.listeners = new Map(); this.classList = new FakeClassList(); this.style = new FakeStyle();
    this.clientWidth = 800; this.clientHeight = 500;
  }
  get firstElementChild() { return this.children[0] ?? null; }
  appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; }
  remove() { if (!this.parentNode) return; this.parentNode.children = this.parentNode.children.filter((item) => item !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, target = this) { this.listeners.get(type)?.forEach((listener) => listener({ target, key: type === 'keydown' ? 'Enter' : undefined, preventDefault() {} })); }
}
class FakeDocument { createElementNS(_namespace, name) { return new FakeElement(this, name); } createHost() { return new FakeElement(this, 'div'); } }

const documentRef = new FakeDocument();
const host = documentRef.createHost();
let pick = null;
const viewer = await createRevisionCompareEngineeringSvgViewer(host, { onPick: (value) => { pick = value; } });
assertRevisionCompareViewer(viewer);
assert(REVISION_COMPARE_VIEWER_METHODS.every((method) => typeof viewer[method] === 'function'));
viewer.setStatuses(new Map([['source:1', 'AMBIGUOUS'], ['target:1', 'NEW_IN_TARGET']]));
viewer.setModels({
  source: { modelId: 'source', revisionId: 'r1', unit: 'mm', coordinateFrame: 'PLANT', verticalAxis: 'Z', segments: [{ objectId: 'source:1', start: [0, 0, 0], end: [5, 0, 0] }], markers: [] },
  target: { modelId: 'target', revisionId: 'r2', unit: 'mm', coordinateFrame: 'PLANT', verticalAxis: 'Z', segments: [{ objectId: 'target:1', start: [0, 1, 0], end: [5, 1, 0] }], markers: [] },
});
assert.equal(host.children.length, 1);
viewer.setSelection('source:1', ['target:1']);
const before = viewer.getStateSnapshot().fitCounts.selection;
assert.equal(viewer.getStateSnapshot().selectedIds.length, 2);
viewer.fitSelection();
assert.equal(viewer.getStateSnapshot().fitCounts.selection, before + 1);
const svg = host.children[0];
const sourceNode = svg.children.flatMap((layer) => layer.children).find((node) => node.getAttribute('data-engineering-svg-entity-id') === 'source:1');
svg.dispatch('click', sourceNode);
assert.deepEqual(pick, { objectId: 'source:1' });
const hostB = documentRef.createHost();
viewer.reattach(hostB);
assert.equal(host.children.length, 0);
assert.equal(hostB.children.length, 1);
assert.equal(viewer.getStateSnapshot().selectedIds[0], 'source:1');
assert.doesNotThrow(() => JSON.stringify(viewer.getStateSnapshot()));
assert.equal(viewer.dispose(), true);
assert.equal(viewer.dispose(), false);
assert.equal(hostB.children.length, 0);
console.log('revision-compare-svg-viewer-contract.test.mjs passed');

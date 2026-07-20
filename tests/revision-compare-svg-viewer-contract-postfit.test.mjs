import assert from 'node:assert/strict';
import { createRevisionCompareEngineeringSvgViewer } from '../tabs/revision-compare/revision-compare-engineering-svg-viewer.js';

class Node {
  constructor(documentRef, name) {
    this.ownerDocument = documentRef; this.localName = name; this.children = []; this.parentNode = null;
    this.attributes = new Map(); this.listeners = new Map(); this.clientWidth = 800; this.clientHeight = 500;
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    this.style = { pointerEvents: '', opacity: '', setProperty() {} };
  }
  get firstElementChild() { return this.children[0] ?? null; }
  get parentElement() { return this.parentNode; }
  appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((item) => item !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener)); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 500 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  key(key) {
    const event = { target: this, currentTarget: this, key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault() {}, stopPropagation() {} };
    for (const listener of this.listeners.get('keydown') ?? []) listener(event);
  }
}
class Document {
  createElementNS(_namespace, name) { return new Node(this, name); }
  createElement(name) { return new Node(this, name); }
}
function nodes(root) { return root.children.flatMap((child) => [child, ...nodes(child)]); }
function attr(root, name) { return nodes(root).filter((node) => node.getAttribute(name) != null); }
const documentRef = new Document(); const host = new Node(documentRef, 'div');
const viewer = await createRevisionCompareEngineeringSvgViewer(host);
viewer.setModels({
  source: { modelId: 'A', revisionId: 'A1', unit: 'mm', coordinateFrame: 'PLANT', verticalAxis: 'Z',
    segments: [{ objectId: 'A1', start: [0, 0, 0], end: [10, 0, 0] }], markers: [] },
  target: { modelId: 'B', revisionId: 'B1', unit: 'mm', coordinateFrame: 'PLANT', verticalAxis: 'Z',
    segments: [{ objectId: 'B1', start: [0, 1, 0], end: [10, 1, 0] }], markers: [] },
});
viewer.setSelection('A1');
assert.equal(viewer.fitSelection(), true);
const overlay = attr(host, 'data-revc-svg-overlay-root')[0];
overlay.key('ArrowRight'); overlay.key('=');
const expected = structuredClone(viewer.getStateSnapshot().viewportHistory.overlay);
viewer.setMode('side-by-side');
const panes = attr(host, 'data-revc-svg-pane-root');
panes[0].key('ArrowDown'); panes[0].key('0');
assert.deepEqual(viewer.getStateSnapshot().viewportHistory.overlay, expected);
viewer.dispose();
console.log('revision-compare-svg-viewer-contract-postfit.test.mjs passed');

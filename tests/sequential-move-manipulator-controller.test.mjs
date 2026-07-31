import assert from 'node:assert/strict';
import { createSequentialMoveManipulatorController }
  from '../tabs/sequential-sketcher/scoped-edit/sequential-move-manipulator-controller.js';
import { SEQUENTIAL_SINGLE_ENTITY_MOVE_TARGET_SCHEMA }
  from '../tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-target.js';

function dataName(name) {
  return name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
function element(name = 'div') {
  const listeners = new Map();
  const value = {
    name, attrs: new Map(), dataset: {}, children: [], style: {}, hidden: false,
    value: '', textContent: '', parent: null, removed: false,
    setAttribute(key, raw) {
      this.attrs.set(key, String(raw));
      if (key.startsWith('data-')) this.dataset[dataName(key)] = String(raw);
    },
    getAttribute(key) { return this.attrs.get(key) ?? null; },
    appendChild(child) { child.parent = this; this.children.push(child); return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    remove() {
      this.removed = true;
      if (this.parent) this.parent.children = this.parent.children.filter((row) => row !== this);
    },
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener(type) { listeners.delete(type); },
    dispatch(type, event = {}) { listeners.get(type)?.({ target: this, ...event }); },
    closest(selector) {
      const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      let current = this;
      while (current && match) {
        const actual = current.getAttribute(match[1]);
        if (actual != null && (match[2] == null || actual === match[2])) return current;
        current = current.parent;
      }
      return null;
    },
    setPointerCapture() {},
  };
  value._listeners = listeners;
  return value;
}
function documentEnvironment() {
  const documentRef = {
    defaultView: {},
    createElementNS(_namespace, name) { return element(name); },
  };
  const host = element('host'); host.ownerDocument = documentRef;
  const constraint = element('select'); constraint.value = 'XY';
  const root = {
    querySelector(selector) {
      if (selector === '[data-ssk-draft-edit-3d-host]') return host;
      if (selector === '[data-ssk-single-move-constraint]') return constraint;
      return null;
    },
  };
  return { root, host, constraint };
}
function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}
function handle(host, id) {
  return descendants(host).find((row) => (
    row.getAttribute('data-ssk-move-manipulator-handle') === id
  ));
}
function pointerEvent(target, pointerId, x, y, type = 'pointermove') {
  return {
    type, target, pointerId, clientX: x, clientY: y,
    preventDefault() {}, stopImmediatePropagation() {},
  };
}

const target = Object.freeze({
  schema: SEQUENTIAL_SINGLE_ENTITY_MOVE_TARGET_SCHEMA,
  moveTargetId: 'MOVE-TARGET-1', componentId: 'PIPE-1', authorityId: 'AUTH-1',
  sceneRevision: 'SCENE-1', geometryFingerprint: 'GEOMETRY-1',
  geometryPartIds: ['PART-1'],
  geometryParts: Object.freeze([{
    geometryPartId: 'PART-1', role: 'primary',
    geometry: Object.freeze({ kind: 'segment',
      start: Object.freeze({ x: 0, y: 0, z: 0 }),
      end: Object.freeze({ x: 100, y: 0, z: 0 }) }),
  }]),
});
const environment = documentEnvironment();
const calls = [];
let currentTarget = target;
const viewer = {
  projectPoint([x, y, z]) { return { x: 200 + x + z * .5, y: 150 - y - z * .5 }; },
};
const controller = createSequentialMoveManipulatorController({
  root: environment.root,
  readViewer: () => viewer,
  readTarget: () => currentTarget,
  beginDrag(input) { calls.push(['begin', input]); return { status: 'dragging' }; },
  updateDrag(input) { calls.push(['update', input]); return { status: 'dragging' }; },
  endDrag(pointerId) { calls.push(['end', pointerId]); return { status: 'review' }; },
  cancelDrag(reason) { calls.push(['cancel', reason]); return { status: 'cancelled' }; },
});

assert.equal(controller.setActive(true), true);
assert.equal(controller.getState().visible, true);
assert.equal(controller.getState().overlay.handleCount, 6);
const svg = environment.host.children.find((row) => row.name === 'svg');
const xHandle = handle(environment.host, 'X');
assert.ok(xHandle);
svg._listeners.get('pointerdown')(pointerEvent(xHandle, 9, 250, 150, 'pointerdown'));
assert.equal(environment.constraint.value, 'X');
assert.equal(calls[0][0], 'begin');
assert.equal(calls[0][1].handleStart.handleId, 'X');
svg._listeners.get('pointermove')(pointerEvent(xHandle, 9, 275, 150));
svg._listeners.get('pointerup')(pointerEvent(xHandle, 9, 275, 150, 'pointerup'));
assert.deepEqual(calls.map((row) => row[0]), ['begin', 'update', 'end']);

environment.constraint.value = 'YZ';
environment.constraint.dispatch('change');
assert.equal(controller.getState().overlay.activeHandle, 'YZ');
svg._listeners.get('pointerdown')(
  pointerEvent(handle(environment.host, 'YZ'), 10, 220, 120, 'pointerdown'),
);
controller.cancel('escape');
assert.equal(calls.at(-1)[0], 'cancel');

currentTarget = null;
assert.equal(controller.refresh(), false);
assert.equal(controller.getState().visible, false);
assert.equal(controller.destroy(), true);
assert.equal(controller.destroy(), false);

console.log('Sequential move manipulator controller: ok');

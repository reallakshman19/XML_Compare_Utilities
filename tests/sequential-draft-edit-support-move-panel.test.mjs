import assert from 'node:assert/strict';
import { createSequentialDraftEditSupportMovePanel } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-support-move-panel.js';

class Element {
  constructor() {
    this.hidden = false; this.disabled = false; this.value = ''; this.textContent = '';
    this.style = { cssText: '' }; this.attributes = new Map(); this.listeners = new Map();
    this.removed = false; this.children = new Map(); this.inputs = []; this.buttons = [];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  removeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
  click() { return this.listeners.get('click')?.({ preventDefault() {} }); }
  querySelector(selector) { return this.children.get(selector) || null; }
  querySelectorAll(selector) {
    if (selector === 'input') return this.inputs;
    if (selector === 'button') return this.buttons;
    return [];
  }
  remove() { this.removed = true; }
  insertAdjacentHTML() { throw new Error('Panel should already exist in this focused fixture.'); }
}
function fixture() {
  const panel = new Element();
  const host = new Element();
  const target = new Element(); const status = new Element();
  const preview = new Element(); const cancel = new Element();
  const coordinates = new Element();
  const actor = new Element(); const reason = new Element(); const evidence = new Element();
  const xyz = Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, new Element()]));
  panel.children.set('[data-ssk-support-move-coordinates]', coordinates);
  panel.inputs = Object.values(xyz); panel.buttons = [preview, cancel];
  const selectors = new Map([
    ['[data-ssk-visual-stack]', host],
    ['[data-ssk-support-move-panel]', panel],
    ['[data-ssk-support-move-target]', target],
    ['[data-ssk-support-move-status]', status],
    ['[data-ssk-support-move-preview]', preview],
    ['[data-ssk-support-move-cancel]', cancel],
    ['[data-ssk-draft-edit-actor]', actor],
    ['[data-ssk-draft-edit-reason]', reason],
    ['[data-ssk-draft-edit-evidence]', evidence],
    ...['x', 'y', 'z'].map((axis) => [`[data-ssk-support-move-coordinate="${axis}"]`, xyz[axis]]),
  ]);
  const root = { querySelector: (selector) => selectors.get(selector) || null };
  let previews = 0; let cancels = 0; const inputs = [];
  const controller = createSequentialDraftEditSupportMovePanel({
    root,
    onPreview: (input) => {
      previews += 1; inputs.push(input);
      return Object.freeze({
        operationId: `DRAFT-${previews}`, delta: Object.freeze({ magnitude: 25 }),
      });
    },
    onCancel: () => { cancels += 1; },
  });
  return {
    controller, panel, target, status, preview, cancel, actor, reason, evidence, xyz,
    previews: () => previews, cancels: () => cancels, inputs,
  };
}
const TARGET = Object.freeze({
  supportMoveTargetId: 'TARGET-3H', supportId: 'SUPPORT-3H', familyId: 'FAMILY-3H',
  carrierId: 'PIPE-3H', entityId: 'ssk:support:SUPPORT-3H',
  originalPosition: Object.freeze({ x: 250, y: 0, z: 0 }),
});

{
  const test = fixture();
  test.controller.setActive(true);
  assert.equal(test.preview.disabled, true);
  test.controller.setTarget(TARGET);
  assert.equal(test.previews(), 0);
  assert.equal(test.preview.disabled, false);
  assert.equal(test.xyz.x.value, '250');
  assert.match(test.target.textContent, /SUPPORT-3H/);
  test.xyz.x.value = '275'; test.xyz.y.value = '0'; test.xyz.z.value = '0';
  test.actor.value = 'operator-3h';
  test.reason.value = 'Preview exact support move.';
  test.evidence.value = 'Support layout coordinates checked.';
  assert.equal(test.previews(), 0, 'typing alone must not create a draft');
  await test.preview.click();
  assert.equal(test.previews(), 1);
  assert.deepEqual(test.inputs[0], {
    position: { x: '275', y: '0', z: '0' },
    actorId: 'operator-3h', reason: 'Preview exact support move.',
    evidenceNote: 'Support layout coordinates checked.',
  });
  assert.equal(test.controller.getState().operationId, 'DRAFT-1');
  assert.equal(test.cancel.disabled, false);
  assert.match(test.status.textContent, /Nothing has been applied or published/);
  test.cancel.click();
  assert.equal(test.cancels(), 1);
  assert.equal(test.controller.getState().operationId, null);
  assert.match(test.status.textContent, /without authority mutation/);
  assert.equal(test.controller.getState().targetId, 'TARGET-3H');
  test.controller.destroy();
  assert.equal(test.panel.removed, true);
}

{
  const test = fixture();
  test.controller.setActive(true); test.controller.setTarget(TARGET);
  test.controller.clearTarget('authority changed');
  assert.equal(test.preview.disabled, true);
  assert.equal(test.controller.getState().targetId, null);
  assert.match(test.status.textContent, /authority changed/);
  test.controller.destroy();
}

console.log('Sequential SSK-TS-3H support move preview panel: ok');

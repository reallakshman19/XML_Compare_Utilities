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
function fixture(options = {}) {
  const panel = new Element(); const host = new Element();
  const target = new Element(); const status = new Element(); const review = new Element();
  const preview = new Element(); const apply = new Element(); const cancel = new Element();
  const coordinates = new Element();
  const actor = new Element(); const reason = new Element(); const evidence = new Element();
  const xyz = Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, new Element()]));
  panel.children.set('[data-ssk-support-move-coordinates]', coordinates);
  panel.inputs = Object.values(xyz); panel.buttons = [preview, apply, cancel];
  const selectors = new Map([
    ['[data-ssk-visual-stack]', host], ['[data-ssk-support-move-panel]', panel],
    ['[data-ssk-support-move-target]', target], ['[data-ssk-support-move-status]', status],
    ['[data-ssk-support-move-review]', review], ['[data-ssk-support-move-preview]', preview],
    ['[data-ssk-support-move-apply]', apply], ['[data-ssk-support-move-cancel]', cancel],
    ['[data-ssk-draft-edit-actor]', actor], ['[data-ssk-draft-edit-reason]', reason],
    ['[data-ssk-draft-edit-evidence]', evidence],
    ...['x', 'y', 'z'].map((axis) => [`[data-ssk-support-move-coordinate="${axis}"]`, xyz[axis]]),
  ]);
  const root = { querySelector: (selector) => selectors.get(selector) || null };
  let previews = 0; let applies = 0; let cancels = 0; const inputs = [];
  const prepared = Object.freeze({
    preparedId: 'SUPPORT-PREPARED-3I',
    expectedAuthority: Object.freeze({ authorityId: 'SAUTH-3I' }),
    candidate: Object.freeze({
      register: Object.freeze({ headFingerprint: 'REGISTER-3I' }),
      entry: Object.freeze({
        adjustmentId: 'ADJUSTMENT-3I', supportId: 'SUPPORT-3I', carrierId: 'PIPE-3I',
        fromPosition: Object.freeze({ x: 250, y: 0, z: 0 }),
        toPosition: Object.freeze({ x: 275, y: 0, z: 0 }),
        resolvedPosition: Object.freeze({ positionStatus: 'ON_CENTERLINE' }),
      }),
    }),
  });
  const controller = createSequentialDraftEditSupportMovePanel({
    root,
    onPreview: (input) => {
      previews += 1; inputs.push(input);
      return Object.freeze({
        preview: Object.freeze({ operationId: `DRAFT-${previews}`, delta: Object.freeze({ magnitude: 25 }) }),
        prepared,
      });
    },
    onApply: () => {
      applies += 1;
      return options.stale
        ? Object.freeze({ accepted: false, reasonCode: 'SUPPORT_ADJUSTMENT_AUTHORITY_STALE', publication: null })
        : Object.freeze({ accepted: true, reasonCode: null,
          publication: Object.freeze({ adjustmentId: 'ADJUSTMENT-3I' }) });
    },
    onCancel: () => { cancels += 1; },
  });
  return {
    controller, panel, target, status, review, preview, apply, cancel, actor, reason, evidence, xyz,
    previews: () => previews, applies: () => applies, cancels: () => cancels, inputs,
  };
}
const TARGET = Object.freeze({
  supportMoveTargetId: 'TARGET-3I', supportId: 'SUPPORT-3I', familyId: 'FAMILY-3I',
  carrierId: 'PIPE-3I', entityId: 'ssk:support:SUPPORT-3I',
  originalPosition: Object.freeze({ x: 250, y: 0, z: 0 }),
});

{
  const test = fixture();
  test.controller.setActive(true);
  assert.equal(test.preview.disabled, true); assert.equal(test.apply.disabled, true);
  test.controller.setTarget(TARGET);
  assert.equal(test.previews(), 0); assert.equal(test.preview.disabled, false);
  assert.equal(test.xyz.x.value, '250'); assert.match(test.target.textContent, /SUPPORT-3I/);
  test.xyz.x.value = '275'; test.xyz.y.value = '0'; test.xyz.z.value = '0';
  test.actor.value = 'operator-3i'; test.reason.value = 'Apply exact support adjustment.';
  test.evidence.value = 'Same carrier and coordinate verified.';
  assert.equal(test.previews(), 0, 'typing alone must not prepare or publish');
  await test.preview.click();
  assert.equal(test.previews(), 1); assert.equal(test.applies(), 0);
  assert.deepEqual(test.inputs[0], {
    position: { x: '275', y: '0', z: '0' }, actorId: 'operator-3i',
    reason: 'Apply exact support adjustment.', evidenceNote: 'Same carrier and coordinate verified.',
  });
  assert.equal(test.controller.getState().operationId, 'DRAFT-1');
  assert.equal(test.controller.getState().preparedId, 'SUPPORT-PREPARED-3I');
  assert.equal(test.apply.disabled, false); assert.equal(test.cancel.disabled, false);
  assert.match(test.review.textContent, /Adjustment ID: ADJUSTMENT-3I/);
  assert.match(test.review.textContent, /From: \(250, 0, 0\)/);
  assert.match(test.review.textContent, /To: \(275, 0, 0\)/);
  assert.match(test.status.textContent, /Nothing has been applied/);
  await test.apply.click();
  assert.equal(test.applies(), 1); assert.equal(test.controller.getState().accepted, true);
  assert.equal(test.controller.getState().targetId, null);
  assert.equal(test.controller.getState().preparedId, null);
  assert.match(test.status.textContent, /ADJUSTMENT-3I applied/);
  test.controller.destroy(); assert.equal(test.panel.removed, true);
}

{
  const test = fixture({ stale: true });
  test.controller.setActive(true); test.controller.setTarget(TARGET);
  test.xyz.x.value = '275'; test.xyz.y.value = '0'; test.xyz.z.value = '0';
  await test.preview.click(); await test.apply.click();
  assert.equal(test.controller.getState().accepted, false);
  assert.equal(test.controller.getState().targetId, 'TARGET-3I');
  assert.match(test.status.textContent, /AUTHORITY_STALE/);
  test.cancel.click();
  assert.equal(test.cancels(), 1); assert.equal(test.controller.getState().preparedId, null);
  assert.equal(test.controller.getState().targetId, 'TARGET-3I');
  assert.match(test.status.textContent, /without authority mutation/);
  test.controller.clearTarget('authority changed');
  assert.equal(test.preview.disabled, true); assert.equal(test.controller.getState().targetId, null);
  test.controller.destroy();
}

console.log('Sequential SSK-TS-3I support adjustment panel: ok');

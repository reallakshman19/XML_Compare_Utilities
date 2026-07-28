import assert from 'node:assert/strict';
import { createPointGeometry } from '../core/engineering-scene/index.js';
import {
  createSequentialSingleEntityMoveDragSession,
  SEQUENTIAL_SINGLE_ENTITY_MOVE_DRAG_SCHEMA,
} from '../tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-drag.js';
import { SEQUENTIAL_SINGLE_ENTITY_MOVE_TARGET_SCHEMA } from '../tabs/sequential-sketcher/scoped-edit/sequential-single-entity-move-target.js';

const target = Object.freeze({
  schema: SEQUENTIAL_SINGLE_ENTITY_MOVE_TARGET_SCHEMA,
  moveTargetId: 'MOVE-TARGET-1',
  geometryPartIds: ['part-1'],
  geometryParts: Object.freeze([{ geometryPartId: 'part-1', role: 'primary',
    geometry: createPointGeometry({ x: 0, y: 0, z: 0 }) }]),
});

function environment(rays, pickedObjectId = 'part-1') {
  let rayIndex = 0;
  let lockCount = 0;
  let releaseCount = 0;
  const previews = [];
  const viewer = {
    pickAt: () => pickedObjectId ? { objectId: pickedObjectId } : null,
    screenRay: () => rays[Math.min(rayIndex++, rays.length - 1)],
    acquireNavigationLock(owner) {
      assert.match(owner, /^ssk-3l:/);
      lockCount += 1;
      let released = false;
      return () => { if (!released) { released = true; releaseCount += 1; } };
    },
  };
  const session = createSequentialSingleEntityMoveDragSession({
    readViewer: () => viewer,
    onPreview(input) {
      const preview = Object.freeze({ operationId: input.operationId, delta: input.delta });
      previews.push({ input, preview });
      return preview;
    },
  });
  return {
    session, previews,
    lockCount: () => lockCount,
    releaseCount: () => releaseCount,
  };
}

const axis = environment([
  { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } },
  { origin: { x: 6, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } },
]);
const begun = axis.session.begin({
  target, constraint: 'X', pointerId: 7, clientX: 10, clientY: 20,
});
assert.equal(begun.schema, SEQUENTIAL_SINGLE_ENTITY_MOVE_DRAG_SCHEMA);
assert.equal(begun.status, 'dragging');
assert.equal(axis.lockCount(), 1);
const update = axis.session.update({ pointerId: 7, clientX: 30, clientY: 20 });
assert.deepEqual(update.preview.delta, { x: 6, y: 0, z: 0, magnitude: 6 });
assert.equal(axis.previews.length, 1);
assert.equal(update.state.previewOperationId, update.preview.operationId);
const review = axis.session.end(7);
assert.equal(review.status, 'review');
assert.equal(axis.releaseCount(), 1);
assert.equal(axis.previews.length, 1, 'pointer release must not publish or restage geometry');

const repeated = environment([
  { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } },
]);
const repeatedBegin = repeated.session.begin({
  target, constraint: 'X', pointerId: 1, clientX: 10, clientY: 20,
});
assert.equal(repeatedBegin.operationId, begun.operationId,
  'identical target, constraint and start ray must produce deterministic drag identity');
repeated.session.cancel('test');
assert.equal(repeated.releaseCount(), 1);
assert.equal(repeated.session.getState().status, 'cancelled');

const plane = environment([
  { origin: { x: 0, y: 0, z: 10 }, direction: { x: 0, y: 0, z: -1 } },
  { origin: { x: 3, y: 4, z: 10 }, direction: { x: 0, y: 0, z: -1 } },
]);
plane.session.begin({ target, constraint: 'XY', pointerId: 8, clientX: 0, clientY: 0 });
const planeUpdate = plane.session.update({ pointerId: 8, clientX: 5, clientY: 5 });
assert.deepEqual(planeUpdate.preview.delta, { x: 3, y: 4, z: 0, magnitude: 5 });
plane.session.cancel('escape');
assert.equal(plane.releaseCount(), 1);

const wrongPick = environment([
  { origin: { x: 0, y: 0, z: 10 }, direction: { x: 0, y: 0, z: -1 } },
], 'other-part');
assert.throws(
  () => wrongPick.session.begin({ target, constraint: 'XY', pointerId: 9, clientX: 0, clientY: 0 }),
  /must start on the selected confirmed component/,
);
assert.equal(wrongPick.lockCount(), 0);
assert.throws(
  () => axis.session.update({ pointerId: 99, clientX: 0, clientY: 0 }),
  /does not match the active move-preview pointer/,
);
assert.equal(axis.session.destroy(), true);
assert.equal(axis.session.destroy(), false);

console.log('Sequential single-entity move drag: ok');

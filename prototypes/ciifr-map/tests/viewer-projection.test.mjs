import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-0.160.0/three.module.min.js';
import {projectWorkbenchPoint} from '../../../workbench3d/viewer/workbench-viewer.js';

const origin = new THREE.Vector3(796000, 102000, 1329000);
const world = local => local.map((value, index) => value + origin.toArray()[index]);
function reference(camera, xyz, mode, pane, width = 1200, height = 600) {
  const nextDraw = camera.clone(false), paneWidth = mode === 'side-by-side' ? width / 2 : width;
  if (nextDraw.isPerspectiveCamera) nextDraw.aspect = paneWidth / height;
  else {const halfHeight = (nextDraw.top - nextDraw.bottom) / 2;
    nextDraw.left = -halfHeight * paneWidth / height; nextDraw.right = halfHeight * paneWidth / height;}
  nextDraw.updateProjectionMatrix(); nextDraw.updateMatrixWorld(true);
  const ndc = new THREE.Vector3(...xyz).sub(origin).project(nextDraw);
  if (ndc.z < -1 || ndc.z > 1) return null;
  const mappedWidth = mode === 'side-by-side' && pane !== 'full' ? paneWidth : width;
  return {x: (ndc.x + 1) * mappedWidth / 2 + (mode === 'side-by-side' && pane === 'target' ? paneWidth : 0),
    y: (1 - ndc.y) * height / 2};
}
function projector(camera) {
  const projectionCamera = camera.clone(false);
  return (point, mode, pane = 'full', width = 1200, height = 600) => projectWorkbenchPoint({THREE,
    camera, projectionCamera, xyz: world(point), origin, width, height, mode, pane});
}
function close(actual, expected) {
  assert.ok(actual && expected);
  assert.ok(Math.abs(actual.x - expected.x) < 1e-8, `${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-8, `${actual.y} != ${expected.y}`);
}
function perspective() {
  const camera = new THREE.PerspectiveCamera(90, 2, 1, 100);
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  return camera;
}

test('pending split and overlay mode switches project immediately without a draw or camera mutation', () => {
  const camera = perspective(), project = projector(camera), before = camera.projectionMatrix.toArray();
  close(project([1, 0, 0], 'side-by-side', 'source'), {x: 330, y: 300});
  close(project([1, 0, 0], 'side-by-side', 'target'), {x: 930, y: 300});
  close(project([1, 0, 0], 'overlay'), {x: 630, y: 300});
  assert.equal(camera.aspect, 2); assert.deepEqual(camera.projectionMatrix.toArray(), before,
    'annotation projection cannot alter the active draw or GPU-picker camera');
});

test('post-orbit lookAt uses the new camera pose before matrixWorldInverse is drawn', () => {
  const camera = perspective(), project = projector(camera);
  camera.position.set(10, 0, 0); camera.lookAt(0, 0, 0); // Deliberately no updateMatrixWorld/draw.
  const staleInverse = camera.matrixWorldInverse.toArray();
  const point = world([0, 0, 1]);
  close(project([0, 0, 1], 'side-by-side', 'source'), reference(camera, point, 'side-by-side', 'source'));
  close(project([0, 0, 1], 'overlay'), reference(camera, point, 'overlay', 'full'));
  assert.deepEqual(camera.matrixWorldInverse.toArray(), staleInverse);
});

test('orthographic panes synchronize pending layout and resized viewport while keeping zoom and height', () => {
  const camera = new THREE.OrthographicCamera(-4, 4, 2, -2, 1, 100);
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const project = projector(camera), before = camera.projectionMatrix.toArray();
  close(project([1, 0, 0], 'side-by-side', 'source'), {x: 450, y: 300});
  close(project([1, 0, 0], 'side-by-side', 'target'), {x: 1050, y: 300});
  close(project([1, 0, 0], 'side-by-side', 'source', 800, 600), {x: 350, y: 300});
  camera.zoom = 2;
  close(project([.5, 0, 0], 'side-by-side', 'target'), {x: 1050, y: 300});
  assert.equal(camera.left, -4); assert.equal(camera.right, 4);
  assert.deepEqual(camera.projectionMatrix.toArray(), before);
});

test('perspective and orthographic annotations honor near/far clip planes including points behind camera', () => {
  for (const camera of [perspective(), new THREE.OrthographicCamera(-4, 4, 2, -2, 1, 100)]) {
    camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
    const project = projector(camera);
    assert.equal(project([0, 0, 9.5], 'overlay'), null, 'closer than near clip');
    assert.equal(project([0, 0, 11], 'side-by-side', 'source'), null, 'behind camera');
    assert.equal(project([0, 0, -200], 'overlay'), null, 'beyond far clip');
    close(project([0, 0, 8], 'overlay'), {x: 600, y: 300});
  }
});

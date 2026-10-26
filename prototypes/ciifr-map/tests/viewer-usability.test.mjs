import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-0.160.0/three.module.min.js';
import {clampedPopupRect} from '../review-viewport.js';
import {feedbackGeometry, selectedFeedbackNodes, GEOMETRY_RGB} from '../viewer-feedback.js';
import {createWorkbenchNavigationControls} from '../../../workbench3d/viewer/workbench-navigation-controls.js';
import {createViewerNavigationState, normalizeVerticalAxis, validateViewerNavigationState} from '../../../workbench3d/viewer/workbench-navigation-state.js';
import {validateViewerNavigationState as validateContract} from '../../../workbench3d/contracts/contracts.js';
import {createGeoViewerBridge} from '../geo-viewer-bridge.js';
import {geometrySceneBinding} from '../geo-scene.js';

const fixture = () => {
  const point = [796867.2, 102409.6, 1329978];
  const mk = (side, id) => ({objectId: side + id, kind: 'NODE', nodeId: id, position: point});
  const model = (side, id) => ({markers: [mk(side, id)], segments: [], bounds: {min: point, max: point}});
  const objects = Object.fromEntries(['SOURCE', 'TARGET'].map(side =>
    [side + '5210', {objectId: side + '5210', kind: 'NODE', nodeId: '5210', side, sourceRows: ['5210']}]));
  const context = {epoch: 1, projection: 'XZ', source: {member: 's', sha256: 'a'.repeat(64)},
    target: {member: 't', sha256: 'b'.repeat(64)}, transform: {sourceComponent: 0, targetComponent: 0,
      anchors: [], rotation: [], translation: []}, candidates: {tolerance: {x: 1}, snapshot: 'same'}};
  context.viewerScene = {contract: 'CIIFR.GeometryDisplaySnapshot.v1', binding: geometrySceneBinding(context),
    models: {source: model('SOURCE', '5210'), target: model('TARGET', '5210'), registrationTranslation: [0, 0, 0]}, objects};
  return {point, context};
};

test('popup clipping uses local coordinates and contains full height/width after viewport shrink', () => {
  const bounds = {left: 100, top: 200, width: 900, height: 600};
  assert.deepEqual(clampedPopupRect(bounds, {left: 850, top: 650, width: 850, height: 500}),
    {width: 850, height: 500, left: 42, top: 92});
  assert.deepEqual(clampedPopupRect(bounds, {left: -50, top: -50, width: 1500, height: 900}),
    {width: 884, height: 584, left: 8, top: 8});
  const small = clampedPopupRect({left: 0, top: 0, width: 300, height: 200},
    {left: 550, top: 400, width: 850, height: 500});
  assert.ok(small.left + small.width <= 300 && small.top + small.height <= 200);
});

test('coincident SOURCE/TARGET preserve separate IDs and exact physical display coordinates', () => {
  const {point, context} = fixture(), before = JSON.stringify(context.viewerScene);
  const geometry = feedbackGeometry(context.viewerScene);
  assert.deepEqual(selectedFeedbackNodes(geometry, ['SOURCE5210', 'TARGET5210']).map(n => [n.side, n.nodeId]),
    [['SOURCE', '5210'], ['TARGET', '5210']]);
  assert.deepEqual(geometry.nodes.map(n => n.position), [point, point]);
  assert.deepEqual(geometry.center, point);
  assert.equal(JSON.stringify(context.viewerScene), before, 'feedback never snaps/offsets graph positions');
});

test('actual native navigation orbits around the selected pivot for X/Y/Z; vertical coordinate is invariant', () => {
  const pivot = new THREE.Vector3(10, 20, 30);
  for (const axis of ['X', 'Y', 'Z']) {
    const listeners = {}, windowRef = {addEventListener() {}, removeEventListener() {}};
    const dom = {clientHeight: 500, ownerDocument: {defaultView: windowRef},
      addEventListener: (name, fn) => {listeners[name] = fn;}, removeEventListener() {}};
    const camera = new THREE.PerspectiveCamera(55, 1, .1, 10000);
    camera.position.copy(pivot).add(new THREE.Vector3(...(axis === 'Z' ? [100, 0, 0] : [0, 0, 100])));
    const before = camera.position.clone();
    const controls = createWorkbenchNavigationControls({THREE, getCamera: () => camera, dom,
      getVerticalAxis: () => axis, onChange() {}, onGestureStart() {}, onGestureEnd() {}});
    controls.setPivot(pivot); controls.orbitBy(Math.PI / 2, 0);
    assert.ok(camera.position.distanceTo(before) > 100, axis + ' orbit actually moves');
    assert.ok(Math.abs(camera.position[axis.toLowerCase()] - pivot[axis.toLowerCase()]) < 1e-8);
    assert.ok(Math.abs(camera.position.distanceTo(pivot) - 100) < 1e-8);
    assert.deepEqual(controls.target.toArray(), pivot.toArray()); controls.dispose();
  }
});

test('X-up survives native and public navigation validators; unspecified default stays Z', () => {
  const state = createViewerNavigationState({cameraPositionWorld: [100, 200, 300],
    cameraTargetWorld: [10, 20, 30], pivotWorld: [10, 20, 30], cameraType: 'Orthographic',
    verticalAxis: 'X', projectionScale: 1});
  assert.deepEqual(validateViewerNavigationState(state), []);
  assert.deepEqual(validateContract(state), []);
  assert.equal(normalizeVerticalAxis(), 'Z'); assert.equal(normalizeVerticalAxis('y'), 'Y');
  assert.ok(validateViewerNavigationState({...state, verticalAxis: 'W'}).length);
});

test('bridge sets real side colours, maps evidence plane with X-up, restores camera and pivots exact primary node', async () => {
  const {context, point} = fixture(), calls = [];
  const nav = {cameraType: 'Orthographic', verticalAxis: 'X'};
  const viewer = Object.fromEntries(['setModels', 'setMode', 'fitAll', 'toggleCameraType', 'setStandardView',
    'setModelColors', 'setSourceOpacity', 'setVerticalAxis', 'setSelection', 'setPivotWorld', 'restoreNavigationState',
    'orbitBy', 'dispose'].map(name => [name, (...args) => calls.push([name, ...args])]));
  viewer.getStateSnapshot = () => ({runtimeRevision: 1, navigationState: nav});
  const bridge = createGeoViewerBridge({host: {replaceChildren() {}}, session: {current: () => context},
    onSelect() {}, onError(error) {throw error;}, makeViewer: async () => viewer});
  await bridge.enable({projection: 'XY', verticalAxis: 'X'});
  assert.ok(calls.some(c => c[0] === 'setModelColors' && c[1] === GEOMETRY_RGB));
  assert.ok(calls.some(c => c[0] === 'setStandardView' && c[1] === 'right'));
  bridge.setSelection('TARGET5210', ['SOURCE5210']);
  assert.deepEqual(calls.filter(c => c[0] === 'setPivotWorld').at(-1), ['setPivotWorld', point]);
  assert.equal(bridge.getCameraState(), nav);
  bridge.restoreCameraState(nav); assert.deepEqual(calls.at(-1), ['restoreNavigationState', nav]);
  bridge.disable(); calls.length = 0;
  await bridge.enable({cameraState: nav, verticalAxis: 'X'});
  assert.ok(calls.some(c => c[0] === 'restoreNavigationState' && c[1] === nav));
  assert.equal(calls.some(c => c[0] === 'setStandardView'), false, 'restoring tab camera must not reset preset');
  const saved = {...nav, verticalAxis: 'Y', cameraPositionWorld: [100, 200, 300]};
  calls.length = 0; await bridge.enable({cameraState: saved, verticalAxis: 'X'});
  const restored = calls.find(c => c[0] === 'restoreNavigationState')[1];
  assert.equal(restored.verticalAxis, 'X', 'global up-axis wins over saved tab axis');
  assert.deepEqual(restored.cameraPositionWorld, saved.cameraPositionWorld);
  assert.equal(saved.verticalAxis, 'Y', 'saved state is not mutated');
  bridge.disable();
});

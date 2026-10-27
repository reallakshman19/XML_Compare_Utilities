import test from 'node:test';
import assert from 'node:assert/strict';
import {buildXmlGraph} from '../xml-graph.js';
import {createGeometryScene, geometrySceneBinding, assertGeometrySceneCurrent} from '../geo-scene.js';
import {resolveGeometryPick} from '../geo-scene-pick.js';
import {registerMethodC} from '../../../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {findMethodCCandidates} from '../../../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import {methodCSvgScene} from '../../../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import {validateVisualGeometryModel} from '../../../workbench3d/contracts/contracts.js';
import {deriveSceneRuntimeSnapshot, SCENE_CHUNK_SIZE} from '../../../workbench3d/viewer/scene-runtime.js';

function graph(points, links, member = 'same-member', seeds = []) {
  const byId = new Map(points.map(([id, xyz]) => [String(id), xyz]));
  const elements = links.map(([a, b], index) => ({index, from: String(a), to: String(b),
    delta: byId.get(String(b)).map((v, axis) => v - byId.get(String(a))[axis]),
    od: 100, wall: 5, witness: 'DISCRIMINATING_ELEMENT_' + index}));
  return buildXmlGraph({elements, seeds, profile: 'TEST_NATIVE_MM', units: {length: 'mm'},
    claimedCii: {status: 'NOT_PRESENT'}}, {member, sha256: '1'.repeat(64), byteLength: 1});
}
function context(source, target, anchors, tolerance = {x: .001, y: .001, z: .001}) {
  const transform = registerMethodC(source, target, anchors);
  const candidates = findMethodCCandidates(source, target, transform, tolerance);
  return {source, target, transform, candidates, projection: 'XY', epoch: 7,
    scene: methodCSvgScene({source, target, transform, candidates, projection: 'XY'})};
}
const singleAnchor = [{source: '1', target: '1'}];
function simple() {
  const g = graph([[1, [0,0,0]], [2, [10,0,0]]], [[1,2]]);
  return context(g, g, singleAnchor);
}
const nodeObject = (scene, side, id) => Object.values(scene.objects)
  .find(o => o.side === side && o.kind === 'NODE' && o.nodeId === String(id));
const near = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-8, `${a} != ${b}`));

test('full 90deg pose appears once in copied display data and existing runtime accepts it', () => {
  const points = [[1,[0,0,0]], [2,[100,0,0]], [3,[100,70,0]], [4,[100,70,30]]];
  const expected = ([x,y,z]) => [-y+40,x-20,z+30];
  const source = graph(points, [[1,2],[2,3],[3,4]]);
  const target = graph(points.map(([id, xyz]) => [id, expected(xyz)]), [[1,2],[2,3],[3,4]],
    'target', [{node:'1',xyz:[40,-20,30]}]);
  const before = JSON.stringify([source.nodes, target.nodes, source.edges, target.edges]);
  const ctx = context(source, target, [1,2,3].map(id => ({source:String(id),target:String(id)})));
  const scene = createGeometryScene(ctx);
  near(scene.models.source.markers.find(n => n.nodeId === '4').position, [-30,80,60]);
  scene.models.source.markers.forEach(n => near(n.position, expected(source.nodeIndex.get(n.nodeId).xyz)));
  assert.deepEqual(scene.models.registrationTranslation, [0,0,0]);
  for (const side of ['source','target']) assert.deepEqual(validateVisualGeometryModel(scene.models[side]), []);
  const opts = {chunkSize: SCENE_CHUNK_SIZE, originGridMm: 1000, minimumCellMm: 100};
  const runtime = deriveSceneRuntimeSnapshot(scene.models, opts);
  assert.equal(runtime.drawableCount, 14);
  assert.deepEqual(deriveSceneRuntimeSnapshot(scene.models, opts, runtime).changedChunkIds, []);
  assert.equal(JSON.stringify([source.nodes, target.nodes, source.edges, target.edges]), before);
  assert(Object.isFrozen(scene.models.source.markers[0].position));
  assert.throws(() => scene.models.source.markers[0].position.push(9), TypeError);
  assert.equal(Object.isFrozen(source.nodes[0].xyz), false);
});

test('same hash/member/node IDs on opposite sides stay distinct and wrong/stale picks fail', () => {
  const ctx = simple(), scene = createGeometryScene(ctx);
  const s = nodeObject(scene, 'SOURCE', '1'), t = nodeObject(scene, 'TARGET', '1');
  assert.notEqual(s.objectId, t.objectId);
  assert.equal(resolveGeometryPick(scene, {modelId:'source', objectId:s.objectId, nodeId:'1'}, scene.binding), s);
  assert.throws(() => resolveGeometryPick(scene, {modelId:'target',objectId:s.objectId}, scene.binding), /IDENTITY_MISMATCH/);
  assert.throws(() => resolveGeometryPick(scene, {modelId:'source',objectId:s.objectId,nodeId:'999'}, scene.binding), /IDENTITY_MISMATCH/);
  assert.throws(() => resolveGeometryPick(scene, {modelId:'source',objectId:'missing'}, scene.binding), /UNKNOWN_IDENTITY/);
  assert.throws(() => resolveGeometryPick(scene, {modelId:'source',objectId:'toString'}, scene.binding), /UNKNOWN_IDENTITY/);
  assert.equal(resolveGeometryPick(scene, null, scene.binding), null);
  assert.throws(() => resolveGeometryPick(scene, null, 'old binding'), /STALE/);
  assert.throws(() => resolveGeometryPick(scene, null), /STALE/);
});

test('all target reuse rows survive pick resolution; segment-only stays an ELEMENT link', () => {
  const source = graph([[1,[0,0,0]],[2,[.05,0,0]]], [[1,2]]);
  const target = graph([[1,[0,0,0]],[2,[.1,0,0]]], [[1,2]], 'target');
  const scene = createGeometryScene(context(source,target,singleAnchor,{x:1,y:1,z:1}));
  const pick = nodeObject(scene, 'TARGET', '1');
  assert.deepEqual(resolveGeometryPick(scene,{modelId:'target',objectId:pick.objectId},scene.binding).sourceRows, ['1','2']);
  const midpoint = graph([[1,[0,0,0]],[2,[5,0,0]]], [[1,2]]);
  const long = graph([[1,[0,0,0]],[3,[10,0,0]]], [[1,3]], 'target');
  const segmentScene = createGeometryScene(context(midpoint,long,singleAnchor));
  assert.equal(segmentScene.models.target.markers.length, 2);
  assert.equal(nodeObject(segmentScene,'TARGET','2'), undefined);
  const element = Object.values(segmentScene.objects).find(o => o.side === 'TARGET' && o.kind === 'ELEMENT');
  assert(element.sourceRows.includes('2'));
  assert.equal(element.elementIndex, 0);
  assert.equal(segmentScene.physicalIdentityQualified, false);
});

test('only registered components are positioned; unregistered scope remains explicit', () => {
  const g = graph([[1,[0,0,0]],[2,[10,0,0]],[9,[100,0,0]],[10,[110,0,0]]], [[1,2],[9,10]]);
  const scene = createGeometryScene(context(g,g,singleAnchor));
  assert.deepEqual(scene.models.source.markers.map(n => n.nodeId), ['1','2']);
  assert.deepEqual(scene.inputs.source.unregisteredComponents,
    [{component:1,nodeCount:2,coordinateFrame:'RELATIVE_NO_XML_SEED'}]);
  assert.equal(Object.values(scene.objects).some(o => o.nodeId === '9'), false);
});

test('current scene rejects epoch/projection/pose/parameter changes and malformed inputs', () => {
  const ctx = simple(); ctx.viewerScene = createGeometryScene(ctx);
  assert.equal(assertGeometrySceneCurrent(ctx), ctx.viewerScene);
  for (const changed of [{epoch:8}, {projection:'XZ'},
    {transform:{...ctx.transform,translation:[1,0,0]}},
    {candidates:{...ctx.candidates,tolerance:{x:1,y:1,z:1}}}]) {
    const newer = {...ctx,...changed};
    assert.notEqual(geometrySceneBinding(newer), ctx.viewerScene.binding);
    assert.throws(() => assertGeometrySceneCurrent(newer), /STALE/);
  }
  assert.throws(() => createGeometryScene({...ctx,epoch:-1}), /CURRENT_CONTEXT/);
  const badUnit = {...ctx.source,units:{length:'in'}};
  assert.throws(() => createGeometryScene({...ctx,source:badUnit}), /MEASURED_MM/);
  const wrongAuthority = {...ctx.source,byteAuthority:'ORIGINAL_CII_BYTES_MEASURED'};
  assert.throws(() => createGeometryScene({...ctx,source:wrongAuthority}), /MEASURED_MM/);
  const duplicate = {...ctx.source,nodes:[...ctx.source.nodes,ctx.source.nodes[0]]};
  assert.throws(() => createGeometryScene({...ctx,source:duplicate}), /DUPLICATE_IDENTITY/);
  const badPoint = {...ctx.source,nodes:ctx.source.nodes.map((n,i) => i ? n : {...n,xyz:[NaN,0,0]})};
  assert.throws(() => createGeometryScene({...ctx,source:badPoint}), /NONFINITE_POINT/);
  const badEdge = {...ctx.source,edges:[...ctx.source.edges,ctx.source.edges[0]]};
  assert.throws(() => createGeometryScene({...ctx,source:badEdge}), /DUPLICATE_IDENTITY/);
});

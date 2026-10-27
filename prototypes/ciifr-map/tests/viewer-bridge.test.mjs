import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeoViewerBridge} from '../geo-viewer-bridge.js';
import {sourceRowsForTarget, selectedDetails} from '../view.js';

function fixtures() {
  const row = (source, target) => ({source, target, alternatives: [{target, targetWitness:[]}], sourceWitness:[]});
  return {candidates: {rows:[row('S1','T'),row('S2','T'),row('S3','OTHER')]},
    source:{edges:[],coordinateFrames:[{}]}, target:{edges:[],coordinateFrames:[{}]},
    transform:{sourceComponent:0,targetComponent:0}};
}
test('TARGET selection keeps all SOURCE rows, with an explicit ambiguity and witnesses', () => {
  const r = fixtures();
  assert.deepEqual(sourceRowsForTarget(r,'T'),['S1','S2']);
  assert.deepEqual(sourceRowsForTarget(r,'UNKNOWN'),[]);
  const details = JSON.parse(selectedDetails(r,['S1','S2'],{side:'TARGET',nodeId:'T'}));
  assert.equal(details.linkedSourceRowCount,2);
  assert.equal(details.ambiguityPreserved,true);
  assert.deepEqual(details.allLinkedSourceRows.map(row => row.source),['S1','S2']);
});

test('async viewer callback rejects revoked scene, disposes stale viewer, and preserves model zero translation', async () => {
  const obj={objectId:'physical-target', side:'TARGET', kind:'NODE',nodeId:'T',sourceRows:['S1','S2']};
  const snapshot={contract:'CIIFR.GeometryDisplaySnapshot.v1',binding:'stable',models:{source:{},target:{},registrationTranslation:[0,0,0]},objects:{'physical-target':obj}};
  let current=snapshot, resolveFirst, firstPick, livePick, wasDisposed=0;
  const session={current:()=>({viewerScene: current, epoch:1, source:{}, target:{}, transform:{}, candidates:{}})};
  // Currentness is enforced by real geometrySceneBinding. Use exact method context from a fixture-free
  // stub by recomputing the binding through its actual exported helper.
  const {geometrySceneBinding}=await import('../geo-scene.js');
  const state={epoch:1,projection:'XZ',source:{member:'source',sha256:'a'.repeat(64)},
    target:{member:'target',sha256:'b'.repeat(64)},transform:{sourceComponent:0,targetComponent:0,anchors:[],rotation:[],translation:[]},
    candidates:{tolerance:{x:1},snapshot:'A'}};
  snapshot.binding=geometrySceneBinding(state);
  session.current=()=>({...state,viewerScene:current});
  const host={replaceChildren:()=>{}};
  const picked=[], errors=[];
  const makeViewer=async (_, callbacks) => {
    if (!firstPick) { firstPick=callbacks.onPick; await new Promise(resolve => {resolveFirst=resolve;}); }
    else livePick = callbacks.onPick;
    return {setModels(models){assert.deepEqual(models.registrationTranslation,[0,0,0]);},setMode(){},toggleCameraType(){},
      setStandardView(){},fitAll(){callbacks.onCameraChange?.();},getStateSnapshot(){return {runtimeRevision:1};},
      setSelection(){},dispose(){wasDisposed++;}};
  };
  const bridge=createGeoViewerBridge({host,session,onSelect:pick=>picked.push(pick),onError:e=>errors.push(e),makeViewer});
  const pending=bridge.enable();
  bridge.disable(); resolveFirst();
  assert.equal(await pending,false); assert.equal(wasDisposed,1);
  await bridge.enable({projection:'XY'});
  livePick({objectId:'physical-target',modelId:'target',nodeId:'T'});
  assert.deepEqual(picked.at(-1)?.sourceRows,['S1','S2']);
  state.epoch++; // stale live epoch with old scene/binding
  livePick({objectId:'physical-target',modelId:'target',nodeId:'T'});
  assert.equal(picked.length,1);
  bridge.disable(); firstPick({objectId:'physical-target',modelId:'target',nodeId:'T'});
  assert.equal(picked.length,1); assert.equal(wasDisposed,2);
  assert.equal(errors.length,0);
});

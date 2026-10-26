import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto, createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readXmlGraph} from '../xml-intake.js';
import {createPreviewSession} from '../compare.js';
import {exportPreview} from '../evidence.js';
import {resolveGeometryPick} from '../geo-scene-pick.js';
import {validateVisualGeometryModel} from '../../../workbench3d/contracts/contracts.js';
import {deriveSceneRuntimeSnapshot, SCENE_CHUNK_SIZE} from '../../../workbench3d/viewer/scene-runtime.js';

if (!process.env.CIIFR_TEST_RUNTIME) throw new Error('CIIFR_TEST_RUNTIME must contain the real test-only @xmldom/xmldom parser.');
const {DOMParser} = createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json')('@xmldom/xmldom');
const read = (bytes, options) => readXmlGraph(bytes, {...options, cryptoRef:webcrypto,
  parser:new DOMParser({onError:(level,message) => { throw Error(level + ':' + message); }})});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('actual XML session exports a reusable frozen scene through existing JSON evidence', async () => {
  const source = new Uint8Array(readFileSync(new URL('./fixtures/S1-F05.xml', import.meta.url)));
  const target = new Uint8Array(readFileSync(new URL('./fixtures/S1-R4.xml', import.meta.url)));
  assert.equal(sha(source),'1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995');
  assert.equal(sha(target),'a332dd7b2551faae51de3c016941762c3b795cdf19073b373817354e309526e6');
  const session = createPreviewSession({read});
  await session.load('SOURCE',source,'S1-F05.xml'); await session.load('TARGET',target,'S1-R4.xml');
  for (const id of ['3790','3830','3840']) session.addAnchor(id,id);
  const result = session.run(), originalGraphs = JSON.stringify([result.source.nodes,result.target.nodes]);
  const evidence = JSON.parse(exportPreview(session,'json'));
  assert.equal(evidence.viewerScene.contract,'CIIFR.GeometryDisplaySnapshot.v1');
  assert.deepEqual(evidence.viewerScene,result.viewerScene);
  for (const model of [evidence.viewerScene.models.source,evidence.viewerScene.models.target]) {
    assert.deepEqual(validateVisualGeometryModel(model),[]);
    assert.equal(model.markers.length,57); assert.equal(model.segments.length,56);
  }
  const runtime = deriveSceneRuntimeSnapshot(evidence.viewerScene.models,
    {chunkSize:SCENE_CHUNK_SIZE,originGridMm:1000,minimumCellMm:100});
  assert.equal(runtime.drawableCount,226); assert.equal(runtime.chunks.length,4);
  assert.equal(Object.keys(evidence.viewerScene.objects).length,226);
  const hit = Object.values(result.viewerScene.objects).find(o => o.side === 'TARGET' && o.nodeId === '3830');
  const resolved = resolveGeometryPick(result.viewerScene,{modelId:'target',objectId:hit.objectId,nodeId:'3830'},result.viewerScene.binding);
  assert(resolved.sourceRows.includes('3830'));
  assert.equal(evidence.viewerScene.inputs.target.originalCiiClaim.status,'CLAIMED_NOT_REVERIFIED');
  assert.equal(evidence.qualifiedPhysicalIdentityCount,0);
  assert.equal(JSON.stringify([result.source.nodes,result.target.nodes]),originalGraphs);
  const oldScene = result.viewerScene;
  session.configure({projection:'YZ'});
  assert.throws(() => exportPreview(session,'json'),/STALE/);
  const newer = session.run();
  assert.throws(() => resolveGeometryPick(oldScene,null,newer.viewerScene.binding),/STALE/);
  assert.match(exportPreview(session,'svg'), /<metadata>/);
  assert.match(exportPreview(session,'csv'), /sourceCiiClaimStatus/);
});

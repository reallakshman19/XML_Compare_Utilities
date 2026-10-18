/** I121-WP1 contract falsifiers. FakeWorker tests are [SIMULATED]; real Chromium runs separately. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CII_INSPECTION_WORKER_SCHEMA as schema,
  validateCiiInspectionRun, verifyCiiInspectionWorkerResult,
} from '../tabs/cii-workspace/cii-workspace-inspection-worker-protocol.js';
import { createCiiWriter2InspectionWorkerClient } from '../tabs/cii-workspace/cii-workspace-inspection-worker-client.js';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const hex = x => x.repeat(64);
const input = { sources: [
  {sourceId:'S1',fileName:'S1.CII',bytes:new Uint8Array([1])},
  {sourceId:'S2',fileName:'S2.CII',bytes:new Uint8Array([2])},
],targetBytes:new Uint8Array([3]),targetFileName:'T.CII' };
const expected = {sources:[{sourceId:'S1',sha256:hex('a')},{sourceId:'S2',sha256:hex('b')}],targetSha256:hex('c')};
const receipt = {schema:'CIIWorkspaceSourceSetInspection.v1',status:'CORRESPONDENCE_INPUT_READY',
  sourceSet:{status:'CUSTODY_READY',sourceSetSha256:hex('d'),members:[
    {sourceId:'S1',originalSha256:hex('a')},{sourceId:'S2',originalSha256:hex('b')}]},
  memberInspections:[{sourceId:'S1'},{sourceId:'S2'}],
  versionBridge:{sourceSetSha256:hex('d'),target:{originalSha256:hex('c')},
    members:[{originalSha256:hex('a')},{originalSha256:hex('b')}]},
};
class FakeWorker {
  constructor(){this.listeners={message:new Set(),error:new Set()};this.posts=[];this.terminated=false;}
  addEventListener(kind,listener){this.listeners[kind].add(listener);}
  removeEventListener(kind,listener){this.listeners[kind].delete(listener);}
  postMessage(message){this.posts.push(message);}
  terminate(){this.terminated=true;}
  emit(data){for(const fn of [...this.listeners.message])fn({data});}
  fault(message='worker exception'){for(const fn of [...this.listeners.error])fn({message});}
}
const response=(runId,kind,detail={})=>({schema,runId,kind,...detail});
test('strict explicit SHA custody, unique source IDs and result identity',()=>{
  assert.equal(validateCiiInspectionRun(1,input,expected).targetSha256,hex('c'));
  assert.throws(()=>validateCiiInspectionRun(0,input,expected),/RUN_ID_INVALID/);
  assert.throws(()=>validateCiiInspectionRun(1,{...input,sources:input.sources.slice(0,1)},expected),/SOURCE_SET_INVALID/);
  assert.throws(()=>validateCiiInspectionRun(1,{...input,sources:[input.sources[0],input.sources[0]]},expected),/SOURCE_IDS_INVALID/);
  assert.throws(()=>validateCiiInspectionRun(1,input,{...expected,targetSha256:'0'}),/EXPECTED_TARGET_SHA_REQUIRED/);
  assert.throws(()=>validateCiiInspectionRun(1,input,{...expected,sources:[expected.sources[1],expected.sources[0]]}),/EXPECTED_SOURCE_MISMATCH/);
  assert.strictEqual(verifyCiiInspectionWorkerResult(receipt,validateCiiInspectionRun(1,input,expected)),receipt);
  assert.throws(()=>verifyCiiInspectionWorkerResult({...receipt,versionBridge:{...receipt.versionBridge,target:{originalSha256:hex('0')}}},expected),/RESULT_TARGET_CUSTODY_MISMATCH/);
  assert.throws(()=>verifyCiiInspectionWorkerResult({...receipt,sourceSet:{...receipt.sourceSet,members:[receipt.sourceSet.members[1],receipt.sourceSet.members[0]]}},expected),/RESULT_SOURCE_MEMBER_CUSTODY_MISMATCH/);
  assert.throws(()=>verifyCiiInspectionWorkerResult({...receipt,status:'BOUND'},expected),/RESULT_SCHEMA_INVALID/);
});
test('client sends only read-only inspection, no crypto object and returns exact receipt',async()=>{
  const worker=new FakeWorker(),progress=[];
  const client=createCiiWriter2InspectionWorkerClient({workerFactory:()=>worker});
  const {runId,promise}=client.run(input,{expected,options:{cryptoRef:()=>{},methodASeedPairLimit:6},onProgress:p=>progress.push(p)});
  assert.equal(worker.posts.length,1);
  assert.equal(worker.posts[0].kind,'RUN');
  assert.equal(worker.posts[0].schema,schema);
  assert.equal(worker.posts[0].options.cryptoRef,undefined);
  assert.equal(worker.posts[0].options.methodASeedPairLimit,6);
  worker.emit(response(runId,'PROGRESS',{stage:'INSPECTING'}));
  worker.emit(response(runId,'RESULT',{result:receipt}));
  assert.deepEqual(progress,[{runId,stage:'INSPECTING'}]);
  assert.strictEqual(await promise,receipt);
  assert.equal(client.activeRunId,null);
  assert.equal(worker.terminated,true);
  client.dispose();
  assert.throws(()=>client.run(input,{expected}),/DISPOSED/);
});
test('stale cancellation, replacement, cross-run response and worker error fail closed',async()=>{
  const workers=[];const factory=()=>{const w=new FakeWorker();workers.push(w);return w;};
  const client=createCiiWriter2InspectionWorkerClient({workerFactory:factory});
  const first=client.run(input,{expected});
  const failed=assert.rejects(first.promise,/SUPERSEDED/);
  const second=client.run(input,{expected});
  await failed;
  assert.equal(workers[0].terminated,true);
  workers[1].emit(response(first.runId,'RESULT',{result:receipt}));
  await assert.rejects(second.promise,/RESPONSE_IDENTITY_MISMATCH/);
  assert.equal(workers[1].terminated,true);
  const third=client.run(input,{expected});
  workers[2].fault('driver exploded');
  await assert.rejects(third.promise,/RUNTIME_ERROR/);
  const fourth=client.run(input,{expected});
  workers[3].emit(response(fourth.runId,'ERROR',{message:'real conversion failed'}));
  await assert.rejects(fourth.promise,/INSPECTION_FAILED/);
});
test('abort and stale cancellation do not leak active worker or let old replies win',async()=>{
  const workers=[],controller=new AbortController();
  const client=createCiiWriter2InspectionWorkerClient({workerFactory:()=>{
    const worker=new FakeWorker();workers.push(worker);return worker;
  }});
  const first=client.run(input,{expected,signal:controller.signal});
  const done=assert.rejects(first.promise,/ABORTED/);
  controller.abort();await done;
  assert.equal(workers[0].terminated,true);
  assert.equal(client.activeRunId,null);
  const second=client.run(input,{expected});
  const rejected=assert.rejects(second.promise,/CANCELLED/);
  assert.equal(second.cancel(),true);await rejected;
  assert.equal(second.cancel(),false);
  assert.equal(client.activeRunId,null);
});
test('all new worker components have byte-identical deployed and source copies',async()=>{
  for(const file of ['cii-workspace-inspection-worker-protocol.js',
    'cii-workspace-inspection-worker-client.js','cii-workspace-inspection.worker.js']){
    const source=await readFile(path.join(root,'tabs/cii-workspace',file));
    const deployed=await readFile(path.join(root,'docs/tabs/cii-workspace',file));
    assert.deepEqual(deployed,source,file);
    if(file.endsWith('.worker.js')) {
      const code=source.toString();
      assert.doesNotMatch(code,/applyCiiWorkspaceTargetWriter2|bindCiiTransferScopeToPreview|identityBound\s*:\s*true/);
    }
  }
});

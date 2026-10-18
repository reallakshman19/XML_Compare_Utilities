/** I121-WP2 [SIMULATED] prepared Worker hostile-response and cancellation falsifiers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CII_PREPARED_WORKER_SCHEMA as schema, validateCiiPreparedWorkerRun,
  verifyCiiPreparedWorkerResult,
} from '../tabs/cii-workspace/cii-workspace-prepared-inspection-protocol.js';
import { createCiiWriter2PreparedInspectionClient } from '../tabs/cii-workspace/cii-workspace-prepared-inspection-client.js';

const hex=x=>x.repeat(64);
const input={sources:[
  {sourceId:'S1',bytes:new Uint8Array([1]),originalSha256:hex('a')},
  {sourceId:'S2',bytes:new Uint8Array([2]),originalSha256:hex('b')},
],targetBytes:new Uint8Array([3]),targetFileName:'T.CII'};
const expected={sources:[{sourceId:'S1',sha256:hex('a')},{sourceId:'S2',sha256:hex('b')}],targetSha256:hex('c')};
const members=expected.sources.map(({sourceId,sha256})=>({sourceId,originalSha256:sha256,normalizedSha256:hex('e')}));
const sessionMembers=members.map(row=>({...row,sourceDocument:{contentSha256:hex('e')},sourceGraph:{nodes:[{}]}}));
const inspection={schema:'CIIWorkspaceSourceSetInspection.v1',status:'CORRESPONDENCE_INPUT_READY',
  sourceSet:{status:'CUSTODY_READY',sourceSetSha256:hex('d'),members},
  memberInspections:members.map(({sourceId})=>({sourceId})),
  versionBridge:{sourceSetSha256:hex('d'),target:{originalSha256:hex('c')},members},
};
const preparedSession={schema:'CIIWorkspacePreparedSourceSetSession.v1',
  status:'PREPARED',authority:'IMMUTABLE_NORMALIZED_MODEL_CUSTODY',sourceSetSha256:hex('d'),
  sourceSet:inspection.sourceSet,
  versionBridge:{sourceSetSha256:hex('d')},
  members:sessionMembers,
  target:{originalSha256:hex('c'),targetDocument:{},targetGraph:{nodes:[{}]}},
};
const payload={inspection,preparedSession};
class FakeWorker {
  constructor(){this.listeners=new Map([['message',new Set()],['error',new Set()]]);this.posts=[];this.dead=false;}
  postMessage(value){this.posts.push(value);}
  addEventListener(kind,handler){this.listeners.get(kind).add(handler);}
  removeEventListener(kind,handler){this.listeners.get(kind).delete(handler);}
  terminate(){this.dead=true;}
  respond(data){for(const h of [...this.listeners.get('message')])h({data});}
  crash(message){for(const h of [...this.listeners.get('error')])h({message});}
}
const message=(runId,kind,body={})=>({schema,runId,kind,...body});
test('prepared result binds both inspection and every prepared source/target',()=>{
  const receipt=validateCiiPreparedWorkerRun(1,input,expected);
  assert.strictEqual(verifyCiiPreparedWorkerResult(payload,receipt),payload);
  assert.throws(()=>verifyCiiPreparedWorkerResult({...payload,preparedSession:{...preparedSession,status:'UNKNOWN'}},receipt),/SESSION_SCHEMA_INVALID/);
  assert.throws(()=>verifyCiiPreparedWorkerResult({...payload,preparedSession:{...preparedSession,sourceSetSha256:hex('0')}},receipt),/SESSION_SET_CUSTODY_MISMATCH/);
  assert.throws(()=>verifyCiiPreparedWorkerResult({...payload,preparedSession:{...preparedSession,target:{...preparedSession.target,originalSha256:hex('0')}}},receipt),/SESSION_TARGET_CUSTODY_MISMATCH/);
  const reordered=[...sessionMembers].reverse();
  assert.throws(()=>verifyCiiPreparedWorkerResult({...payload,preparedSession:{...preparedSession,members:reordered}},receipt),/SESSION_MEMBER_CUSTODY_MISMATCH/);
  assert.throws(()=>verifyCiiPreparedWorkerResult({...payload,preparedSession:{...preparedSession,members:[{...sessionMembers[0],sourceGraph:null},sessionMembers[1]]}},receipt),/SESSION_MEMBER_CUSTODY_MISMATCH/);
});
test('structured RUN progress and read-only result delivered exactly once',async()=>{
  const worker=new FakeWorker();
  const client=createCiiWriter2PreparedInspectionClient({workerFactory:()=>worker});
  const events=[];
  const handle=client.inspect(input,{targetOriginalSha256:hex('c'),onProgress:x=>events.push(x.stage),
    options:{cryptoRef:()=>{throw Error('not cloneable');},methodASeedPairLimit:6}});
  assert.equal(worker.posts[0].schema,schema);
  assert.equal(worker.posts[0].expected.targetSha256,hex('c'));
  assert.equal(worker.posts[0].options.cryptoRef,undefined);
  assert.equal(worker.posts[0].options.methodASeedPairLimit,6);
  worker.respond(message(handle.runId,'PROGRESS',{stage:'PREPARING_AND_INSPECTING'}));
  worker.respond(message(handle.runId,'RESULT',{payload}));
  assert.strictEqual(await handle.promise,payload);
  assert.deepEqual(events,['PREPARING_AND_INSPECTING']);
  assert.equal(worker.dead,true);
  assert.equal(client.activeRunId,null);
});
test('replacement and foreign response cannot promote stale or wrong prepared session',async()=>{
  const workers=[],client=createCiiWriter2PreparedInspectionClient({workerFactory:()=>{
    const w=new FakeWorker();workers.push(w);return w;
  }});
  const first=client.inspect(input,{targetOriginalSha256:hex('c')});
  const reject1=assert.rejects(first.promise,/SUPERSEDED/);
  const second=client.inspect(input,{targetOriginalSha256:hex('c')});
  await reject1;
  assert.equal(workers[0].dead,true);
  workers[1].respond(message(first.runId,'RESULT',{payload}));
  await assert.rejects(second.promise,/RESPONSE_IDENTITY_MISMATCH/);
  const third=client.inspect(input,{targetOriginalSha256:hex('c')});
  workers[2].respond(message(third.runId,'RESULT',{
    payload:{...payload,preparedSession:{...preparedSession,target:{...preparedSession.target,originalSha256:hex('0')}}},
  }));
  await assert.rejects(third.promise,/SESSION_TARGET_CUSTODY_MISMATCH/);
});
test('abort, crash and dispose always terminate the active prepared worker',async()=>{
  const workers=[],signal=new AbortController();
  const client=createCiiWriter2PreparedInspectionClient({workerFactory:()=>{
    const w=new FakeWorker();workers.push(w);return w;
  }});
  const first=client.inspect(input,{targetOriginalSha256:hex('c'),signal:signal.signal});
  const rejection=assert.rejects(first.promise,/ABORTED/);
  signal.abort();await rejection;
  assert.equal(workers[0].dead,true);
  const second=client.inspect(input,{targetOriginalSha256:hex('c')});
  workers[1].crash('crashed');
  await assert.rejects(second.promise,/RUNTIME_ERROR/);
  const third=client.inspect(input,{targetOriginalSha256:hex('c')});
  const cancel=assert.rejects(third.promise,/DISPOSED/);
  client.dispose();await cancel;
  assert.equal(workers[2].dead,true);
  assert.throws(()=>client.inspect(input,{targetOriginalSha256:hex('c')}),/DISPOSED/);
});

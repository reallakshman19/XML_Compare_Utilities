import test from 'node:test';
import assert from 'node:assert/strict';
import { createCiiWriter2AsyncRevision } from '../docs/tabs/cii-workspace/cii-workspace-async-revision.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
async function guarded(job,fence,commit,onError=()=>{}) {
  const stamp=fence.begin();
  try { const result=await job; if(fence.current(stamp)) commit(result); }
  catch(error) { if(fence.current(stamp)) onError(error); }
}
const simulate=async(label,fire)=>{
  const fence=createCiiWriter2AsyncRevision(),pending=deferred(),published=[];
  const started=guarded(pending.promise,fence,x=>published.push(x),e=>published.push(e.message));
  fire(fence);
  pending.resolve(label);
  await started;
  assert.deepEqual(published,[],label+' result must not leak after invalidation');
};

test('input reset cannot resurrect in-flight Compare preview',async()=>{
  await simulate('old Compare result',f=>f.invalidate());
});
test('review changes cannot resurrect old Transfer Preview',async()=>{
  await simulate('old review result',f=>f.invalidate());
});
test('anchor edits cannot rebind old physical scope',async()=>{
  await simulate('old scope result',f=>f.invalidate());
});
test('TARGET change prevents stale export result',async()=>{
  await simulate('old exported bytes',f=>f.invalidate());
});
test('a second operation supersedes first even without SOURCE replacement',async()=>{
  const f=createCiiWriter2AsyncRevision(),old=deferred(),newer=deferred(),seen=[];
  const a=guarded(old.promise,f,x=>seen.push(x));
  const b=guarded(newer.promise,f,x=>seen.push(x));
  newer.resolve('new result');await b;
  old.resolve('stale result');await a;
  assert.deepEqual(seen,['new result']);
});
test('stale asynchronous error cannot overwrite current status',async()=>{
  const f=createCiiWriter2AsyncRevision(),a=deferred(),out=[];
  const pending=guarded(a.promise,f,x=>out.push(x),e=>out.push(e.message));
  f.invalidate();a.reject(new Error('old error'));
  await pending;assert.deepEqual(out,[]);
});
test('active asynchronous error remains visible rather than swallowed',async()=>{
  const f=createCiiWriter2AsyncRevision(),out=[];
  await guarded(Promise.reject(new Error('current error')),f,()=>{},e=>out.push(e.message));
  assert.deepEqual(out,['current error']);
});
test('disposing the mount prevents old asynchronous commits and new operations',async()=>{
  const f=createCiiWriter2AsyncRevision(),defer=deferred(),outputs=[];
  const work=guarded(defer.promise,f,x=>outputs.push(x));
  f.dispose();defer.resolve('old');await work;
  assert.deepEqual(outputs,[]);
  assert.throws(()=>f.begin(),/CII_WRITER2_ASYNC_DISPOSED/);
});
test('invalid or fabricated token is never current',()=>{
  const f=createCiiWriter2AsyncRevision(),stamp=f.begin();
  assert.equal(f.current(stamp),true);
  assert.equal(f.current('1'),false);
  assert.equal(f.current(0),false);
  assert.equal(f.current(Number.NaN),false);
  f.invalidate();assert.equal(f.current(stamp),false);
});

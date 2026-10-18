/** I121-WP2: per-shell client for full prepared-session inspection in a Worker. */
import {
  CII_PREPARED_WORKER_SCHEMA, validateCiiPreparedWorkerRun,
  verifyCiiPreparedWorkerResult,
} from './cii-workspace-prepared-inspection-protocol.js';
import { writer2InspectionExpectedCustody } from './cii-workspace-inspection-route.js';
const fail=(code,detail='')=>new Error('CII_PREPARED_WORKER_'+code+(detail?':'+detail:''));

function browserWorker() {
  if(typeof Worker!=='function') throw fail('UNSUPPORTED');
  return new Worker(new URL('./cii-workspace-prepared-inspection.worker.js',import.meta.url),{type:'module'});
}
export function createCiiWriter2PreparedInspectionClient({workerFactory=browserWorker}={}) {
  let epoch=0,active=null,disposed=false;
  function close(current,error,payload) {
    if(active!==current||current.done) return;
    current.done=true;active=null;
    current.signal?.removeEventListener('abort',current.abort);
    current.worker.removeEventListener('message',current.message);
    current.worker.removeEventListener('error',current.error);
    current.worker.terminate();
    if(error) current.reject(error); else current.resolve(payload);
  }
  function cancel(code='CANCELLED') {
    if(!active) return false;
    close(active,fail(code));
    return true;
  }
  function inspect(input,{targetOriginalSha256,options={},signal,onProgress}={}) {
    if(disposed) throw fail('DISPOSED');
    cancel('SUPERSEDED');
    const runId=++epoch;
    const expected=validateCiiPreparedWorkerRun(runId,input,
      writer2InspectionExpectedCustody(input,targetOriginalSha256));
    if(signal?.aborted) throw fail('ABORTED');
    if(options==null||Array.isArray(options)||typeof options!=='object')throw fail('OPTIONS_INVALID');
    if(onProgress!=null&&typeof onProgress!=='function')throw fail('PROGRESS_HANDLER_INVALID');
    const {cryptoRef,instrumentation,...payloadOptions}=options;
    const worker=workerFactory();
    if(!worker||typeof worker.postMessage!=='function'||typeof worker.terminate!=='function')
      throw fail('WORKER_INVALID');
    const promise=new Promise((resolve,reject)=>{
      const current={worker,runId,resolve,reject,signal,done:false};
      current.abort=()=>close(current,fail('ABORTED'));
      current.error=event=>close(current,fail('RUNTIME_ERROR',String(event?.message||'')));
      current.message=({data})=>{
        if(active!==current||current.done)return;
        if(data?.schema!==CII_PREPARED_WORKER_SCHEMA||data?.runId!==runId)
          return close(current,fail('RESPONSE_IDENTITY_MISMATCH'));
        if(data.kind==='PROGRESS'){
          try{onProgress?.({runId,stage:String(data.stage||'')});}
          catch(error){close(current,fail('PROGRESS_HANDLER_FAILED',String(error)));}
          return;
        }
        if(data.kind==='ERROR')return close(current,fail('INSPECTION_FAILED',String(data.message||'')));
        if(data.kind!=='RESULT')return close(current,fail('RESPONSE_KIND_INVALID'));
        try{close(current,null,verifyCiiPreparedWorkerResult(data.payload,expected));}
        catch(error){close(current,error);}
      };
      active=current;
      worker.addEventListener('message',current.message);
      worker.addEventListener('error',current.error);
      signal?.addEventListener('abort',current.abort,{once:true});
      try{worker.postMessage({schema:CII_PREPARED_WORKER_SCHEMA,kind:'RUN',
        runId,input,expected,options:payloadOptions});}
      catch(error){close(current,fail('POST_FAILED',String(error)));}
    });
    return Object.freeze({runId,promise,cancel:()=>active?.runId===runId&&cancel()});
  }
  return Object.freeze({
    inspect,cancel,dispose:()=>{cancel('DISPOSED');disposed=true;},
    get activeRunId(){return active?.runId??null;},
  });
}

/** I121-WP2: newest Writer2 source lifecycle, including prepared-session custody. */
import {
  CII_PREPARED_WORKER_SCHEMA, validateCiiPreparedWorkerRun,
  verifyCiiPreparedWorkerResult,
} from './cii-workspace-prepared-inspection-protocol.js';

function reply(runId,kind,details={}) {
  self.postMessage({schema:CII_PREPARED_WORKER_SCHEMA,runId,kind,...details});
}
self.addEventListener('message',async ({data})=>{
  const runId=Number.isSafeInteger(data?.runId)?data.runId:0;
  try {
    if(data?.schema!==CII_PREPARED_WORKER_SCHEMA || data?.kind!=='RUN')
      throw new Error('CII_PREPARED_WORKER_REQUEST_INVALID');
    const expected=validateCiiPreparedWorkerRun(runId,data.input,data.expected);
    const engine=await import('./cii-workspace-source-set.js');
    if(typeof engine.prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge!=='function')
      throw new Error('CII_PREPARED_WORKER_ENGINE_UNAVAILABLE');
    reply(runId,'PROGRESS',{stage:'PREPARING_AND_INSPECTING'});
    const payload=await engine.prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
      data.input,{...(data.options||{}),cryptoRef:self.crypto});
    verifyCiiPreparedWorkerResult(payload,expected);
    reply(runId,'RESULT',{payload});
  } catch(error) {
    reply(runId,'ERROR',{code:'PREPARED_INSPECTION_FAILED',message:String(error?.message||error)});
  }
});

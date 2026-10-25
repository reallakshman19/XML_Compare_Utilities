/**
 * Dedicated, bounded F2 shadow Worker. It never receives any Writer capability.
 * All input snapshots/graphs are structured clones. UI must verify authority
 * epoch after receiving output before presenting it.
 */
import {computeCiiF2CanonicalShadow} from './cii-workspace-f2-canonical-shadow.js';
self.onmessage=event=>{
 const {id,input}=event.data||{};
 try{
  const report=computeCiiF2CanonicalShadow(input);
  self.postMessage({id,ok:true,report});
 }catch(error){
  self.postMessage({id,ok:false,error:String(error?.message||error)});
 }
};

// Compose U2a and the merged U1 writer. Neither engine writes files here.
import {applyPsi116Edits} from '../../u1-psi116-uxml/engine/psi116-patchback.mjs';
import {planTransfer} from './plan.mjs';
import {attempt,require,sha256Hex} from '../kit/core.mjs';

const key=e=>`${e.ref.branchOrdinal}:${e.field.startsWith('Branch/')?'branch':e.ref.nodeOrdinal}:${e.field}`;
const identity=r=>[r.branchOrdinal,r.branchName,r.nodeOrdinal,r.nodeNumber,r.componentRefNo];
const sameEdit=(a,b)=>a.field===b.field&&a.before===b.before&&a.after===b.after&&JSON.stringify(identity(a.ref))===JSON.stringify(identity(b.ref));
const propagate=r=>{if(!r.ok)throw Object.assign(new Error('REFUSED'),{refusals:r.refusals});};

// writer and planner injection is only used by tests to exercise the refusal path.
export async function applyTransfer(sourceBytes,targetBytes,pairs,options={}, {writer=applyPsi116Edits,planner=planTransfer,sourceFile='source.xml',targetFile='target.xml',pairFileSha256}={}) {
 return attempt(async()=>{
  sourceBytes=new Uint8Array(sourceBytes);targetBytes=new Uint8Array(targetBytes);
  pairs=structuredClone(pairs);options=structuredClone(options);
  const [sourceSha256,targetSha256]=await Promise.all([sha256Hex(sourceBytes),sha256Hex(targetBytes)]);
  const plan=await planner(sourceBytes,targetBytes,pairs,options);propagate(plan);
  let applied;
  try{applied=await writer(targetBytes,plan.edits,{fileSha256:targetSha256});}
  catch(e){if(e.code&&/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(e.code))require(false,e.code,e.where??'U1 writer',e.detail??e.message);const code=/^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?=:|$)/.exec(e.message)?.[1];if(code)require(false,code,'U1 writer',e.message);throw e;}
  require(applied.bytes instanceof Uint8Array&&applied.sha256Before===targetSha256&&applied.sha256After===await sha256Hex(applied.bytes),'U2_ROUNDTRIP_MISMATCH','U1 receipt','Writer checksum mismatch.');
  const planned=new Map(plan.edits.map(e=>[key(e),e]));
  require(planned.size===plan.edits.length&&applied.changes.length===planned.size,'U2_ROUNDTRIP_MISMATCH','U1 receipt','Applied count differs from plan.');
  const seen=new Set();
  for(const c of applied.changes){const k=key(c);require(planned.has(k)&&!seen.has(k)&&sameEdit(planned.get(k),c)&&Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=0&&c.end>=c.start&&c.end<=targetBytes.length,'U2_ROUNDTRIP_MISMATCH',k,'U1 receipt differs from plan.');seen.add(k);}
  // The original Map remains immutable; only its target hash changes in this internal re-plan.
  const checkPairs=Array.isArray(pairs)?pairs:{...pairs,target:{...pairs.target,sha256:applied.sha256After}};
  const replan=await planner(sourceBytes,applied.bytes,checkPairs,options);
  require(replan.ok,'U2_ROUNDTRIP_MISMATCH','re-plan',JSON.stringify(replan.refusals??[]));
  const remaining=replan.edits.filter(e=>planned.has(key(e)));
  require(remaining.length===0,'U2_ROUNDTRIP_MISMATCH','re-plan','Applied fields still require edits: '+remaining.map(key).join(', '));
  // Preserve evidence for every edit, including all contributors to a shared branch field.
  const eligible=Array.isArray(pairs)?pairs.map((p,i)=>({...p,pairId:`raw-${i+1}`})):pairs.pairs.filter(p=>p.status==='approved');
  const changes=applied.changes.map(c=>({...c,lineNo:'[TBA]',evidence:{pairs:eligible.filter(p=>p.target.branchOrdinal===c.ref.branchOrdinal&&(c.field.startsWith('Branch/')||p.target.nodeOrdinal===c.ref.nodeOrdinal)).map(p=>({pairId:p.pairId,source:p.source,target:p.target}))}}));
  const ledger={format:'u2.transfer-receipt',version:1,createdAt:new Date().toISOString(),source:{fileName:sourceFile,sha256:sourceSha256},base:{fileName:targetFile,sha256:targetSha256},revised:{sha256:applied.sha256After},...(pairFileSha256?{pairFileSha256}:{}),options,changes,ambiguities:plan.ambiguities,refused:plan.refused,summary:plan.summary,roundtrip:{appliedRemaining:remaining.length,otherRemaining:replan.edits.filter(e=>!planned.has(key(e)))}};
  return {bytes:applied.bytes,ledger};
 });
}

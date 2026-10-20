/** Optional original-file browser lab: A geometry -> B physical evidence shadow.
 * This entrypoint is not installed into Writer2; it cannot grant BOUND or Apply.
 */
import { captureWriter2MethodCOriginals } from './cii-workspace-method-c-writer2-native-shell.js';
import { buildOriginalGraphFromBytes } from './cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from './cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from './cii-workspace-method-c-candidates.js';
import { createMethodCASidecar } from './cii-workspace-method-c-a-sidecar.js';
import { evaluateMethodCBShadow } from './cii-workspace-method-c-b-shadow-evidence.js';

const $ = id => document.getElementById(id);
const files = $('sources'), target = $('target'), member = $('member');
const sourceAnchor = $('sourceAnchor'), targetAnchor = $('targetAnchor');
const run = $('run'), save = $('save'), status = $('status');
const overview = $('overview'), ledger = $('ledger'), detail = $('detail');
let revision=0, last=null;
const clear = text => {
  revision+=1;last=null;save.disabled=true;
  overview.textContent='';ledger.replaceChildren();detail.textContent='';
  status.textContent=text;
};
for(const input of [files,target,member,sourceAnchor,targetAnchor])
  input.addEventListener('input',()=>clear('INVALIDATED — original file/member/anchor changed. Rerun shadow evaluation.'));
function visibleNode(row) {
  const root=document.createElement('button');
  root.type='button';
  root.textContent='SOURCE '+row.sourceNode+' · '+row.geometricStatus+
    ' · '+row.candidateCount+' physical TARGET hypotheses · B HOLD';
  root.addEventListener('click',()=>{
    detail.textContent=JSON.stringify(row,null,2);
    detail.focus();
  });
  return root;
}
function show(result) {
  overview.textContent='SHADOW ONLY — physical B policy not approved; '+
    result.rows.length+' original SOURCE observations, '+result.hypothesisCount+
    ' geometric hypotheses, '+result.contestedPhysicalTargetCandidates.length+
    ' contested TARGET candidates. Zero certified BOUND and zero Writer2 operations.';
  ledger.replaceChildren(...result.rows.map(visibleNode));
  detail.textContent='Select any SOURCE row to inspect original signed ELEMENT, length, OD/wall and missing B proof.';
  save.disabled=false;
}
run.addEventListener('click', async()=>{
  clear('Computing original-byte custody and signed B evidence alternatives…');
  const start=revision;run.disabled=true;
  try{
    const id=member.value,s=sourceAnchor.value.trim(),t=targetAnchor.value.trim();
    if(!/^S[123]$/.test(id)||!/^[0-9]+$/.test(s)||!/^[0-9]+$/.test(t))
      throw new Error('SOURCE_MEMBER_AND_EXPERIMENTAL_NODE_ANCHOR_REQUIRED');
    const snapshot=[...files.files,...target.files];
    const custody=await captureWriter2MethodCOriginals([...files.files],[...target.files]);
    if(revision!==start||[...files.files,...target.files].some((f,i)=>f!==snapshot[i]))
      return;
    const selected=custody.sources.find(x=>x.sourceId===id);
    if(!selected)throw new Error('SOURCE_MEMBER_NOT_IN_ORIGINALS');
    const [sourceGraph,targetGraph]=await Promise.all([
      buildOriginalGraphFromBytes({bytes:selected.bytes,member:id,expectedSha256:selected.originalSha256}),
      buildOriginalGraphFromBytes({bytes:custody.targetBytes,member:'T',expectedSha256:custody.targetOriginalSha256}),
    ]);
    if(revision!==start)return;
    const registration=registerMethodC(sourceGraph,targetGraph,
      [{source:s,target:t,role:'experimental-unverified'}],
      {orientationMode:'AUTO_GEOMETRIC_PREVIEW'});
    const tolerance={x:100,y:100,z:100};
    const candidates=registration.status==='HOLD'?null:
      findMethodCCandidates(sourceGraph,targetGraph,registration,tolerance);
    const a=createMethodCASidecar({
      sourceSetSha256:custody.sourceSetSha256,sourceId:id,sessionEpoch:start,
      sourceGraph,targetGraph,registration,candidates,tolerance,
    });
    const result=evaluateMethodCBShadow({aEvidence:a,sourceGraph,targetGraph});
    if(revision!==start)return;
    last=Object.freeze({schema:'MethodC.ShadowAlternativeTransfer.v1',
      aGeometry:a,bShadow:result});
    show(result);
    status.textContent=id+': ORIGINAL_BYTES_A_READY; physical B='+result.policyStatus+
      '; TARGET mutation=UNAVAILABLE';
  }catch(error){
    if(revision===start)clear('HOLD — '+String(error?.message||error));
  }finally{run.disabled=false;}
});
save.addEventListener('click',()=>{
  if(!last)return;
  const blob=new Blob([JSON.stringify(last,null,2)+'\n'],{type:'application/json'});
  const uri=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=uri;
  anchor.download='method-c-b-shadow-'+last.bShadow.sourceId+'-'+
    last.bShadow.sourceOriginalSha256.slice(0,12)+
    '-epoch'+last.bShadow.sessionEpoch+'.json';
  document.body.appendChild(anchor);
  try{anchor.click();}finally{anchor.remove();URL.revokeObjectURL(uri);}
});
clear('NOT_RUN — select authentic S1/S2/S3 and T originals to investigate physical B proof gaps.');

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerMethodCAutoReview, snapshotMethodCAutoEvidence,
  methodCAutoJsonExport } from '../tabs/cii-workspace/cii-workspace-method-c-auto-registration.js';
const I=[[1,0,0],[0,1,0],[0,0,1]],vectors=[[1000,30,100],[20,1400,0],
  [0,100,1750],[-900,250,30],[260,-450,2100]];
const mv=(R,p)=>R.map(row=>row.reduce((t,v,i)=>t+v*p[i],0));
const add=(a,b)=>a.map((x,i)=>x+b[i]);
function graph(matrix=I,t=[0,0,0],member='S',sha='a'.repeat(64)) {
  const points=[[50,60,70],...vectors.map(v=>add([50,60,70],v))];
  const nodes=points.map((p,i)=>({id:String(i+1),xyz:add(mv(matrix,p),t),component:0}));
  const edges=vectors.map((v,i)=>({from:'1',to:String(i+2),index:i,
    delta:mv(matrix,v),od:250+i*21,wall:9,
    witness:'ELEMENTS#'+(i+1)+':15rows:'+ (15*i+1)+'-'+(15*i+15)}));
  const adjacency=new Map(nodes.map(n=>[n.id,[]]));
  for(const edge of edges){adjacency.get(edge.from).push({to:edge.to,edge,sign:1});
    adjacency.get(edge.to).push({to:edge.from,edge,sign:-1});}
  return {nodes,edges,adjacency,nodeIndex:new Map(nodes.map(n=>[n.id,n])),
    components:[nodes.map(n=>n.id)],byteAuthority:'ORIGINAL_BYTES',member,sha256:sha};
}
const s=graph(),target=graph([[0,-1,0],[1,0,0],[0,0,1]],[500,700,-120],'T','b'.repeat(64));
const anchor={source:'1',target:'1',member:'S',sourceSha:s.sha256,targetSha:target.sha256,
  role:'independently-accepted',ownerProvided:true};
test('AUTO geometric export retains original signed D/H, no physical or writer promotion',()=>{
  const r=registerMethodCAutoReview(s,target,[anchor],{discoveryPolicy:{maxDepth:1}});
  assert.equal(r.status,'UNVERIFIED_GEOMETRIC_PREVIEW',r.reason);
  assert.equal(r.qualified,false);assert.equal(r.identified,false);
  assert.equal(r.ownerAnchorAuthenticated,false);assert.equal(r.writerEligible,false);
  const ticket=snapshotMethodCAutoEvidence(s,target,r);
  const json=JSON.parse(methodCAutoJsonExport(s,target,r,ticket));
  assert.equal(json.qualifiedPhysicalIdentityCount,0);
  assert.equal(json.sourceSha,s.sha256);assert.equal(json.targetSha,target.sha256);
  assert.equal(json.selectedPoseId,r.selectedPoseId);
  assert.ok(json.originalDiscovery.hypotheses[0].competingProposers[0].H.positive.length>=2);
});
test('snapshot refuses HOLD/positive evidence mutation and source SHA revision',()=>{
  const r=registerMethodCAutoReview(s,target,[anchor],{discoveryPolicy:{maxDepth:1}});
  const ticket=snapshotMethodCAutoEvidence(s,target,r);
  r.originalDiscovery.hypotheses[0].heldOut.positive[0].targetElement='FORGED';
  assert.throws(()=>methodCAutoJsonExport(s,target,r,ticket),/STALE_SNAPSHOT/);
  const unchanged=registerMethodCAutoReview(s,target,[anchor],{discoveryPolicy:{maxDepth:1}});
  const originalTicket=snapshotMethodCAutoEvidence(s,target,unchanged);
  assert.throws(()=>methodCAutoJsonExport({...s,sha256:'f'.repeat(64)},target,unchanged,originalTicket),/STALE_SNAPSHOT/);
});
test('invalid provenance HOLD remains downloadable and does not select rotation',()=>{
  const graphWithoutOriginal={...s,byteAuthority:'DERIVED'};
  const result=registerMethodCAutoReview(graphWithoutOriginal,target,[anchor]);
  assert.equal(result.status,'HOLD');assert.equal(result.rotation,null);
  const ticket=snapshotMethodCAutoEvidence(graphWithoutOriginal,target,result);
  const exportValue=JSON.parse(methodCAutoJsonExport(graphWithoutOriginal,target,result,ticket));
  assert.equal(exportValue.reason,'ORIGINAL_BYTES_REQUIRED');
  assert.equal(exportValue.rotation,null);assert.equal(exportValue.writerEligible,false);
});
test('forged host callbacks or caller role never authenticate OWNER mode',()=>{
  const r=registerMethodCAutoReview(s,target,[anchor],{
    orientationMode:'AUTO_OWNER_VERIFIED',verifyOwnerAnchor:()=>true,
    ownerProvided:true});
  assert.equal(r.status,'HOLD');
  assert.equal(r.reason,'OWNER_ANCHOR_AUTHENTICATION_UNAVAILABLE');
  assert.equal(r.qualified,false);assert.equal(r.ownerAnchorAuthenticated,false);
});
test('AUTO adapter exact source/deploy mirror',()=>{
  const a=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-method-c-auto-registration.js',import.meta.url));
  const b=readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-auto-registration.js',import.meta.url));
  assert.ok(a.equals(b));
});

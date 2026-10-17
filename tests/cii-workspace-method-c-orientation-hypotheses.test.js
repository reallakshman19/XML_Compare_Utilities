import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoverMethodCOriginalOrientations } from '../tabs/cii-workspace/cii-workspace-method-c-orientation-hypotheses.js';
const sha = x => String(x).repeat(64);
const d2r = x => x*Math.PI/180;
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const mv=(R,p)=>R.map(r=>dot(r,p));
function euler(x,y,z){
  const [cx,sx,cy,sy,cz,sz]=[Math.cos(d2r(x)),Math.sin(d2r(x)),Math.cos(d2r(y)),Math.sin(d2r(y)),Math.cos(d2r(z)),Math.sin(d2r(z))];
  return [[cz*cy,cz*sy*sx-sz*cx,cz*sy*cx+sz*sx],[sz*cy,sz*sy*sx+cz*cx,sz*sy*cx-cz*sx],[-sy,cy*sx,cy*cx]];
}
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const norm=x=>Math.hypot(...x);
const v=[[1300,170,150],[130,1700,80],[350,250,2100],[-800,1250,650],[570,-280,2700]];
function makeGraph(vectors, {R=[[1,0,0],[0,1,0],[0,0,1]],t=[0,0,0],reflection=false,wall=12,member='S',digest='a',equalOD=false}={}){
  const root=[120,210,-145];const matrix=reflection?[[ -1,0,0],[0,1,0],[0,0,1]]:R;
  const transformed=p=>add(mv(matrix,p),t);
  const nodes=[{id:'1',xyz:transformed(root),component:0}];
  const edges=vectors.map((delta,i)=>{
    nodes.push({id:String(i+2),xyz:transformed(add(root,delta)),component:0});
    const actual=mv(matrix,delta);
    return {from:'1',to:String(i+2),index:i,delta:actual,
      od:equalOD?150:150+i*17,wall,witness:'ELEMENTS#'+(i+1)+':15rows:'+(i*15+1)+'-'+((i+1)*15)};
  });
  const adjacency=new Map(nodes.map(n=>[n.id,[]]));
  for(const e of edges){adjacency.get(e.from).push({to:e.to,edge:e,sign:1});adjacency.get(e.to).push({to:e.from,edge:e,sign:-1});}
  return {nodes,edges,adjacency,nodeIndex:new Map(nodes.map(n=>[n.id,n])),components:[nodes.map(n=>n.id)],
    byteAuthority:'ORIGINAL_BYTES',member,sha256:sha(digest)};
}
const anchor={source:'1',target:'1',member:'S',sourceSha:sha('a'),targetSha:sha('b')};
const s=makeGraph(v);
for (const angles of [[-31,67,43],[125,41,-67]]) test('one original signed anchor recovers proper 3D pose '+angles,()=>{
  const R=euler(...angles),t=[500,-200,1200];
  const target=makeGraph(v,{R,t,member:'T',digest:'b',wall:19});
  const result=discoverMethodCOriginalOrientations(s,target,anchor,{maxDepth:1});
  assert.equal(result.status,'UNVERIFIED_GEOMETRIC_PREVIEW',JSON.stringify({reason:result.reason,counts:result.originalDiscovery?.counts}));
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(R[i][j]-result.rotation[i][j])<1e-8);
  t.forEach((value,i)=>assert.ok(Math.abs(value-result.translation[i])<1e-8));
  const e=result.originalDiscovery;
  assert.equal(e.counts.visited,e.counts.possible);
  assert.equal(e.admissiblePoseIds.length,1);assert.equal(result.identified,false);
  assert.equal(result.qualifiedIdentityCount,0);assert.equal(result.writerEligible,false);
  const pose=e.hypotheses.find(h=>h.poseId===result.selectedPoseId);
  assert.ok(pose.heldOut.positive.length>=2);
  assert.ok(pose.heldOut.signedOutOfPlaneWitness);
  assert.ok(pose.heldOut.positive.some(h=>h.engineeringStatus==='ENGINEERING_DIFFERENCE_NOT_IDENTITY'));
  const D=new Set(pose.selectedDiscovery.source.flatMap(p=>p.originalElements.map(e=>e.index)));
  assert.ok(pose.heldOut.positive.every(h=>!D.has(h.sourceIndex)));
});
test('improper mirror must HOLD despite matching pair lengths',()=>{
  const t=makeGraph(v,{reflection:true,member:'T',digest:'b'});
  const r=discoverMethodCOriginalOrientations(s,t,anchor,{maxDepth:1});
  assert.equal(r.status,'HOLD');assert.equal(r.rotation,null);
  assert.notEqual(r.reason,null);
});
test('symmetric pose alternatives must HOLD with full ledger',()=>{
  const regular=[[1000,0,0],[0,1000,0],[0,0,1000],[-577.350269,-577.350269,-577.350269]];
  const src=makeGraph(regular,{equalOD:true});const tgt=makeGraph(regular,{member:'T',digest:'b',equalOD:true});
  const original=discoverMethodCOriginalOrientations(src,tgt,anchor,{maxDepth:1});
  assert.equal(original.status,'HOLD');assert.equal(original.rotation,null);
  assert.ok(original.originalDiscovery.hypotheses.length>1);
});
test('raw bytes, anchor hash and complete competitor budgets fail closed',()=>{
  const t=makeGraph(v,{member:'T',digest:'b'});
  assert.equal(discoverMethodCOriginalOrientations({...s,byteAuthority:'DERIVED'},t,anchor).reason,'ORIGINAL_BYTES_REQUIRED');
  assert.equal(discoverMethodCOriginalOrientations(s,t,{...anchor,targetSha:sha('f')}).reason,'ANCHOR_ORIGINAL_CUSTODY_INVALID');
  assert.equal(discoverMethodCOriginalOrientations(s,t,anchor,{maxDepth:1,maxCombinations:2}).reason,'COMPETITOR_ENUMERATION_BUDGET_HOLD');
  assert.equal(discoverMethodCOriginalOrientations(s,t,anchor,{maxDepth:1,maxPaths:1}).reason,'PATH_ENUMERATION_BUDGET_HOLD');
});
test('signed source/deployed modules byte-identical',()=>{
  for(const name of ['signed-paths','orientation-hypotheses']){
    const a=readFileSync(new URL('../tabs/cii-workspace/cii-workspace-method-c-'+name+'.js',import.meta.url));
    const b=readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-'+name+'.js',import.meta.url));
    assert.ok(a.equals(b));
  }
});

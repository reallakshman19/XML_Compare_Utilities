import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readPsi116Graph } from '../engine/psi116-match.mjs';
import { pairPsi116,psi116PairToMapFile } from '../engine/psi116-pair.mjs';
import { approvePairs } from '../engine/approve.mjs';
import { makePsi116PairDoc } from './psi116-pair-fixtures.mjs';

const graph=bytes=>readPsi116Graph(bytes,{includeBore:true});
const load=async (opts={},src={})=>[await graph(makePsi116PairDoc(src)),await graph(makePsi116PairDoc(opts))];
const desc=(g,fileName)=>({fileName,sha256:g.sha256});
const mapOf=(r,s,t)=>psi116PairToMapFile(r,{sourceFile:desc(s,'s.xml'),targetFile:desc(t,'t.xml')});
const cli=fileURLToPath(new URL('../cli.mjs',import.meta.url));
const validator=fileURLToPath(new URL('../../../shared/topofix-formats/validate.mjs',import.meta.url));

test('P1.2c T1 identical PSI116 pairs 100%, including coincident endpoints',async()=>{
  const [s,t]=await load(),r=pairPsi116(s,t);
  assert.deepEqual([r.summary.paired,r.summary.unmatchedSource,r.summary.unmatchedTarget,r.summary.ambiguous,r.summary.boreRefused],[12,0,0,0,0]);
  assert.equal(r.summary.sourcePoints,10);assert.equal(r.summary.targetPoints,10);
  assert.ok(r.nodePairs.every(p=>p.distanceMm===0&&p.rule==='same-position'));
  assert.deepEqual(r.nodePairs.map(p=>p.source).sort((a,b)=>a.branchOrdinal-b.branchOrdinal||a.nodeOrdinal-b.nodeOrdinal),s.nodes.map(n=>n.ref));
  assert.ok(r.nodePairs.every(p=>JSON.stringify(p.source)===JSON.stringify(p.target)));
});
test('P1.2c T2 renumbered and reordered target still pairs by position',async()=>{
  const [s,t]=await load({renumber:1000,reverseBranches:true}),r=pairPsi116(s,t);
  assert.equal(r.summary.paired,12);assert.equal(r.summary.ambiguous,0);
  assert.ok(r.nodePairs.every(p=>Number(p.target.nodeNumber)===Number(p.source.nodeNumber)+1000&&p.source.componentRefNo===p.target.componentRefNo));
  assert.ok(r.nodePairs.some(p=>p.source.branchOrdinal!==p.target.branchOrdinal));
});
test('P1.2c T3 target moved 5 mm is named unmatched on both sides',async()=>{
  const [s,t]=await load({move:true}),r=pairPsi116(s,t);
  assert.deepEqual([r.summary.paired,r.summary.unmatchedSource,r.summary.unmatchedTarget,r.summary.ambiguous],[11,1,1,0]);
  for(const n of [...r.unmatchedNodesSource,...r.unmatchedNodesTarget])assert.equal(n.ref.componentRefNo,'R1-1');
  assert.equal(r.unmatchedNodesTarget[0].xyz[0]-r.unmatchedNodesSource[0].xyz[0],5);
});
test('P1.2c T4 optional bore check refuses exactly one OD mismatch and excludes its target branch from Map',async()=>{
  const [s,t]=await load({boreChange:true});assert.equal(pairPsi116(s,t).summary.paired,12);
  const r=pairPsi116(s,t,{bore:true});assert.deepEqual([r.summary.paired,r.summary.boreRefused,r.summary.unmatchedSource,r.summary.unmatchedTarget,r.summary.ambiguous],[8,1,4,4,0]);
  assert.equal(r.boreRefused[0].code,'MATCH_BORE_MISMATCH');assert.equal(r.boreRefused[0].source.componentRefNo,'R1-1');
  assert.deepEqual([r.boreRefused[0].sourceOD,r.boreRefused[0].targetOD],[60.3,88.9]);
  assert.deepEqual(r.boreBlockedTargetBranches,[{branchOrdinal:1,branchName:'B1'}]);assert.equal(r.boreBlockedPairs.length,3);
  const m=mapOf(r,s,t);assert.equal(m.pairs.length,8);assert.ok(m.pairs.every(p=>p.target.branchOrdinal!==1));
});
test('P1.2c T5 shared validator and real U2a planner accept approved XML Map',async()=>{
  const sb=makePsi116PairDoc({weight:2}),tb=makePsi116PairDoc({renumber:1000,reverseBranches:true});
  const s=await graph(sb),t=await graph(tb),m=mapOf(pairPsi116(s,t),s,t);
  assert.equal(m.source.kind,'xml');assert.equal(m.target.kind,'xml');assert.equal(m.pairs.length,12);assert.ok(m.pairs.every(p=>p.status==='candidate'));
  const dir=mkdtempSync(join(tmpdir(),'p12c-validator-'));
  try{
    const f=join(dir,'map.json');writeFileSync(f,JSON.stringify(m));const v=spawnSync(process.execPath,[validator,f],{encoding:'utf8'});assert.equal(v.status,0,v.stdout+v.stderr);assert.match(v.stdout,/OK/);
    // Integration-only, explicit Oracle exception to standalone card scope. Import
    // the real sibling planner read-only; the production engine has no dependency.
    const {planTransfer}=await import(new URL('../../u2-uxml-transfer/engine/plan.mjs',import.meta.url));
    const candidate=await planTransfer(sb,tb,m,{items:['weight']});assert.equal(candidate.ok,true);assert.equal(candidate.summary.pairs,0);
    const approved=approvePairs(m,m.pairs.map(p=>p.pairId),{by:'invented-test',at:'2026-11-13T00:00:00Z'});
    writeFileSync(f,JSON.stringify(approved));const v2=spawnSync(process.execPath,[validator,f],{encoding:'utf8'});assert.equal(v2.status,0,v2.stdout+v2.stderr);
    const p=await planTransfer(sb,tb,approved,{items:['weight'],bore:true});assert.equal(p.ok,true,JSON.stringify(p));
    assert.deepEqual([p.summary.pairs,p.summary.edits,p.summary.ambiguous,p.summary.refused],[12,12,0,0]);
    assert.ok(p.edits.every(e=>e.field==='Node/Weight'&&e.before==='1'&&e.after==='2'));
    const stale=await planTransfer(sb,makePsi116PairDoc(),approved,{items:['weight']});assert.equal(stale.refusals[0].code,'U2_MAP_FILE_MISMATCH');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('P1.2c supplemental: near grouping, overlong chain, and ambiguity counts',async()=>{
  const [s,t]=await load({extraPoint:true}),r=pairPsi116(s,t);assert.deepEqual([r.summary.paired,r.summary.unmatchedSource,r.summary.unmatchedTarget,r.summary.ambiguous],[11,1,2,1]);
  assert.equal(r.ambiguities[0].code,'MATCH_NODE_AMBIGUOUS');assert.throws(()=>mapOf(r,s,t),{code:'MATCH_NODE_AMBIGUOUS'});
  const raw=new TextDecoder().decode(makePsi116PairDoc({renumber:1000})).replace('<ComponentRefNo>R1-0</ComponentRefNo><Position>300 0 0','<ComponentRefNo>R1-0</ComponentRefNo><Position>300.0001 0 0');
  const n=await graph(new TextEncoder().encode(raw)),q=pairPsi116(s,n);assert.equal(q.summary.targetPoints,10);assert.equal(q.summary.paired,12);assert.ok(q.nodePairs.some(p=>p.distanceMm>0&&p.rule==='same-position'));
  const chain=[300.0008,300.0016].map((x,i)=>({ref:{...n.nodes[0].ref,nodeOrdinal:90+i},xyz:[x,0,0]}));
  const c=pairPsi116(s,{...n,nodes:[...n.nodes,...chain]});assert.equal(c.summary.ambiguous,1);assert.match(c.ambiguities[0].detail,/spans more than 0.001/);
  const [a,b]=await load({near:true});assert.ok(pairPsi116(a,b).nodePairs.some(p=>p.rule==='nearest-within-tolerance'&&p.distanceMm===0.5));
});
test('P1.2c supplemental: indistinguishable coincident records refuse, no ordinal guessing',async()=>{
  const bytes=n=>new TextEncoder().encode(`<PipeStressExport><Branch><Node><NodeNumber>${n}</NodeNumber><Position>0 0 0</Position></Node><Node><NodeNumber>${n+1}</NodeNumber><Position>0 0 0</Position></Node></Branch></PipeStressExport>`);
  const a=await graph(bytes(1)),b=await graph(bytes(11));const r=pairPsi116(a,b);
  assert.deepEqual([r.summary.paired,r.summary.ambiguous,r.summary.unmatchedSource,r.summary.unmatchedTarget],[0,1,2,2]);
  assert.throws(()=>mapOf(r,a,b),{code:'MATCH_NODE_AMBIGUOUS'});
  assert.equal(pairPsi116(a,a).summary.paired,2);
});
test('P1.2c supplemental: missing OD, invalid tolerances, stale descriptors, duplicate candidate refs',async()=>{
  const [s,t]=await load({missingOD:true});const r=pairPsi116(s,t,{bore:true});assert.equal(r.summary.boreRefused,1);assert.equal(r.boreRefused[0].targetOD,null);
  for(const toleranceMm of [0,-1,'abc',Infinity])assert.throws(()=>pairPsi116(s,t,{toleranceMm}),{code:'MATCH_TOLERANCE_INVALID'});
  assert.throws(()=>psi116PairToMapFile(r,{sourceFile:{fileName:'bad',sha256:'0'.repeat(64)},targetFile:desc(t,'t')}),{code:'MAP_EXPORT_INVALID'});
  assert.throws(()=>mapOf({...r,nodePairs:[...r.nodePairs,r.nodePairs[0]]},s,t),{code:'MAP_NOT_ONE_TO_ONE'});
});
test('P1.2c supplemental: CLI retains counts, only exports safe pairs and never overwrites',()=>{
  const dir=mkdtempSync(join(tmpdir(),'p12c-cli-'));try{
    const sp=join(dir,'s.xml'),tp=join(dir,'t.xml'),mp=join(dir,'map.json');writeFileSync(sp,makePsi116PairDoc());writeFileSync(tp,makePsi116PairDoc({boreChange:true}));
    const run=(...args)=>spawnSync(process.execPath,[cli,'pair-psi116',sp,tp,...args],{encoding:'utf8'});
    const v=run('--bore','--map',mp);assert.equal(v.status,0,v.stdout+v.stderr);const r=JSON.parse(v.stdout);assert.equal(r.summary.boreRefused,1);assert.equal(r.summary.paired,8);assert.equal(r.summary.boreBlockedTargetBranches,1);assert.equal(r.summary.boreBlockedPairs,3);assert.ok(r.summary.ms>=0);
    const before=readFileSync(mp,'utf8');assert.equal(JSON.parse(before).pairs.length,8);const duplicate=run('--bore','--map',mp);assert.equal(duplicate.status,1);assert.equal(JSON.parse(duplicate.stdout).summary.paired,8);assert.equal(readFileSync(mp,'utf8'),before);
    rmSync(mp);writeFileSync(tp,makePsi116PairDoc({extraPoint:true}));const diag=run();assert.equal(diag.status,0);assert.equal(JSON.parse(diag.stdout).summary.ambiguous,1);
    const fail=run('--map',mp);assert.equal(fail.status,1);assert.equal(JSON.parse(fail.stdout).summary.paired,11);assert.equal(existsSync(mp),false);
    const neg=run('--tol','-1');assert.equal(neg.status,1);assert.equal(JSON.parse(neg.stdout).refusals[0].code,'MATCH_TOLERANCE_INVALID');
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('P1.2c review: bore-blocked target branch cannot authorize U2a element transfers',async()=>{
  const {planTransfer}=await import(new URL('../../u2-uxml-transfer/engine/plan.mjs',import.meta.url));
  const doc=(temperature,od)=>new TextEncoder().encode(`<PipeStressExport><Branch><Branchname>L</Branchname><Temperature>${temperature}</Temperature>${[60.3,od].map((d,i)=>`<Node><NodeNumber>${i+1}</NodeNumber><ComponentRefNo>L${i}</ComponentRefNo><Position>${i*100} 0 0</Position><OutsideDiameter>${d}</OutsideDiameter><WallThickness>4</WallThickness><CorrosionAllowance>1</CorrosionAllowance><InsulationThickness>0</InsulationThickness></Node>`).join('')}</Branch></PipeStressExport>`);
  const sb=doc(200,60.3),tb=doc(20,88.9),s=await graph(sb),t=await graph(tb);
  const approve=m=>approvePairs(m,m.pairs.map(p=>p.pairId),{by:'test',at:'2026-11-13T00:00:00Z'});
  const plain=await planTransfer(sb,tb,approve(mapOf(pairPsi116(s,t),s,t)),{items:['element'],bore:true});
  assert.equal(plain.ok,true);assert.ok(plain.refused.some(p=>p.field==='Branch/Temperature'&&p.code==='U2_BORE_MISMATCH'));assert.equal(plain.edits.length,0);
  const r=pairPsi116(s,t,{bore:true});assert.deepEqual(r.boreBlockedTargetBranches,[{branchOrdinal:0,branchName:'L'}]);
  assert.equal(r.boreRefused.length,1);assert.equal(r.boreBlockedPairs.length,1);assert.equal(r.summary.paired,0);
  const m=mapOf(r,s,t);assert.equal(m.pairs.length,0);
  const dir=mkdtempSync(join(tmpdir(),'p12c-bore-review-'));try{
    const sp=join(dir,'s.xml'),tp=join(dir,'t.xml'),mp=join(dir,'map.json');writeFileSync(sp,sb);writeFileSync(tp,tb);
    const run=spawnSync(process.execPath,[cli,'pair-psi116',sp,tp,'--bore','--map',mp],{encoding:'utf8'});
    assert.equal(run.status,0,run.stdout+run.stderr);assert.deepEqual(JSON.parse(run.stdout).boreBlockedTargetBranches,r.boreBlockedTargetBranches);
    const actual=JSON.parse(readFileSync(mp,'utf8'));assert.deepEqual(actual.pairs,m.pairs);
    const safe=await planTransfer(sb,tb,approve(actual),{items:['element'],bore:true});assert.equal(safe.ok,true);assert.equal(safe.summary.pairs,0);assert.equal(safe.edits.length,0);
  }finally{rmSync(dir,{recursive:true,force:true});}
  assert.throws(()=>mapOf({...r,nodePairs:r.boreBlockedPairs},s,t),{code:'MAP_EXPORT_INVALID'});
});

test('P1.2c review: unequal coincident record counts are named',async()=>{
  const [s,t]=await load();const q=pairPsi116(s,{...t,nodes:t.nodes.filter(n=>n.ref.componentRefNo!=='R1-0')});
  assert.equal(q.summary.ambiguous,1);assert.match(q.ambiguities[0].detail,/record count differs \(2 vs 1\)/);
  assert.equal(q.ambiguities[0].sourceNodes.length,2);assert.equal(q.ambiguities[0].targetNodes.length,1);
  assert.throws(()=>mapOf(q,s,t),{code:'MATCH_NODE_AMBIGUOUS'});
});

test('P1.2c review: duplicate OutsideDiameter tags have their own refusal code',async()=>{
  const normal=makePsi116PairDoc(),raw=new TextDecoder().decode(normal).replace('<OutsideDiameter>60.3</OutsideDiameter>','<OutsideDiameter>60.3</OutsideDiameter><OutsideDiameter>60.3</OutsideDiameter>');
  const dup=new TextEncoder().encode(raw),a=await graph(normal),b=await graph(dup);
  for(const [s,t,side] of [[a,b,'target'],[b,a,'source']]){
    assert.equal(pairPsi116(s,t).summary.paired,12);
    const r=pairPsi116(s,t,{bore:true});assert.equal(r.summary.boreRefused,1);assert.equal(r.boreRefused[0].code,'MATCH_BORE_DUPLICATE_TAG');assert.match(r.boreRefused[0].detail,new RegExp(side));
    assert.deepEqual(r.boreBlockedTargetBranches,[{branchOrdinal:0,branchName:'B0'}]);assert.equal(mapOf(r,s,t).pairs.length,8);
  }
});

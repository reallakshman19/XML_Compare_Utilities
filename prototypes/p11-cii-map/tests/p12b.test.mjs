import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { readPsi116Graph, matchPsi116Cii, psi116MatchToMapFile } from '../engine/psi116-match.mjs';
import { makePsi116Case } from './psi116-fixtures.mjs';
import { approvePairs } from '../engine/approve.mjs';

const load=async opts=>{const b=makePsi116Case(opts);return [await readPsi116Graph(b.xml),await readCiiGraph(b.cii)];};
const desc=g=>({fileName:'invented',sha256:g.sha256});
const exportMap=(r,x,c)=>psi116MatchToMapFile(r,{xmlFile:desc(x),ciiFile:desc(c)});
const validator=fileURLToPath(new URL('../../../shared/topofix-formats/validate.mjs',import.meta.url));
const cli=fileURLToPath(new URL('../cli.mjs',import.meta.url));

test('P1.2b T1 all 3 x 4 nodes pair; shared positions and full refs retained',async()=>{
  const [x,c]=await load(), r=matchPsi116Cii(x,c);
  assert.equal(x.branchCount,3);assert.equal(r.summary.paired,12);assert.equal(r.summary.xmlPoints,10);assert.equal(r.summary.pairedCii,10);
  assert.equal(r.summary.unmatchedXml,0);assert.equal(r.summary.unmatchedCii,0);assert.equal(r.summary.ambiguous,0);
  assert.ok(r.nodePairs.every(p=>p.rule==='same-position'&&p.distanceMm===0));
  assert.equal(r.nodePairs.find(p=>p.xml.branchOrdinal===0&&p.xml.nodeOrdinal===3).cii,r.nodePairs.find(p=>p.xml.branchOrdinal===1&&p.xml.nodeOrdinal===0).cii);
  assert.deepEqual(r.nodePairs.map(p=>p.xml).sort((a,b)=>a.branchOrdinal-b.branchOrdinal||a.nodeOrdinal-b.nodeOrdinal),x.nodes.map(n=>n.ref));
});
test('P1.2b T2 moved node is unmatched on both sides and named',async()=>{
  const [x,c]=await load({move:true}),r=matchPsi116Cii(x,c);
  assert.equal(r.summary.paired,11);assert.equal(r.summary.unmatchedXml,1);assert.equal(r.summary.unmatchedCii,1);
  assert.deepEqual(r.unmatchedNodesXml[0].ref,{kind:'xml',branchOrdinal:1,branchName:'B1',nodeOrdinal:1,nodeNumber:'14',componentRefNo:'R1-1'});
  assert.deepEqual(r.unmatchedNodesCii,['14']);
});
test('P1.2b T3 ambiguous point is diagnosed and blocks Map export',async()=>{
  const [x,c]=await load({ambiguous:true}),r=matchPsi116Cii(x,c);
  assert.equal(r.summary.paired,11);assert.equal(r.summary.unmatchedXml,1);assert.equal(r.summary.unmatchedCii,2);
  assert.equal(r.summary.ambiguous,1);assert.equal(r.ambiguities[0].code,'MATCH_NODE_AMBIGUOUS');assert.match(r.ambiguities[0].where,/branch 0.*node 0/);
  assert.throws(()=>exportMap(r,x,c),{code:'MATCH_NODE_AMBIGUOUS'});
});
test('P1.2b T4 renumbering CII +1000 does not change geometry pairing',async()=>{
  const [x,c]=await load({renumber:1000}),r=matchPsi116Cii(x,c);
  assert.equal(r.summary.paired,12);assert.ok(r.nodePairs.every(p=>Number(p.cii)===Number(p.xml.nodeNumber)+1000));
});
test('P1.2b T5 candidate Map passes shared validator with real structural refs',async()=>{
  const [x,c]=await load(),m=exportMap(matchPsi116Cii(x,c),x,c);
  assert.equal(m.source.kind,'xml');assert.equal(m.target.kind,'cii');assert.equal(m.pairs.length,12);
  assert.ok(m.pairs.every(p=>p.status==='candidate'));assert.equal(new Set(m.pairs.map(p=>p.pairId)).size,12);
  assert.deepEqual(m.pairs.map(p=>p.source).sort((a,b)=>a.branchOrdinal-b.branchOrdinal||a.nodeOrdinal-b.nodeOrdinal),x.nodes.map(n=>n.ref));
  const dir=mkdtempSync(join(tmpdir(),'p12b-'));try{
    const path=join(dir,'map.json');writeFileSync(path,JSON.stringify(m));
    const v=spawnSync(process.execPath,[validator,path],{encoding:'utf8'});assert.equal(v.status,0,v.stdout+v.stderr);assert.match(v.stdout,/OK/);
    const same=m.pairs.filter(p=>p.target.node==='13').map(p=>p.pairId);assert.equal(same.length,2);
    assert.throws(()=>approvePairs(m,same,{by:'test',at:'2026-11-13T00:00:00Z'}),{code:'MAP_NOT_ONE_TO_ONE'});
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('P1.2b supplemental: nearest, bad tolerance, malformed position, competing distinct points',async()=>{
  const [x,c]=await load({nearest:true}),r=matchPsi116Cii(x,c);
  assert.equal(r.nodePairs.find(p=>p.xml.nodeNumber==='14').rule,'nearest-within-tolerance');
  for(const toleranceMm of [0,'abc',Infinity]) assert.throws(()=>matchPsi116Cii(x,c,{toleranceMm}),{code:'MATCH_TOLERANCE_INVALID'});
  const bad=new TextEncoder().encode('<PipeStressExport><Branch><Node><Position>0 0 0x1</Position></Node></Branch></PipeStressExport>');
  await assert.rejects(readPsi116Graph(bad),{code:'MATCH_XML_INVALID'});
  const extra={...x.nodes[0],ref:{...x.nodes[0].ref,nodeOrdinal:99},xyz:[0.1,0,0]};
  const a=matchPsi116Cii({...x,nodes:[...x.nodes,extra]},c);assert.equal(a.summary.ambiguous,2);assert.equal(a.ambiguities[0].code,'MATCH_NODE_AMBIGUOUS');assert.equal(a.summary.paired,11);assert.throws(()=>exportMap(a,x,c),{code:'MATCH_NODE_AMBIGUOUS'});
});
test('P1.2b supplemental: CLI counts, atomic Map and ambiguity refusal',()=>{
  const dir=mkdtempSync(join(tmpdir(),'p12b-cli-'));try{
    const xp=join(dir,'input.xml'),cp=join(dir,'input.cii'),mp=join(dir,'map.json'),b=makePsi116Case();
    writeFileSync(xp,b.xml);writeFileSync(cp,b.cii);
    const run=()=>spawnSync(process.execPath,[cli,'match-psi116',xp,cp,'--map',mp],{encoding:'utf8'});
    const v=run();assert.equal(v.status,0,v.stderr+v.stdout);const result=JSON.parse(v.stdout);assert.equal(result.summary.paired,12);assert.ok(result.summary.ms>=0);
    const before=readFileSync(mp,'utf8');assert.equal(JSON.parse(before).pairs.length,12);assert.equal(run().status,1);assert.equal(readFileSync(mp,'utf8'),before);
    rmSync(mp);writeFileSync(cp,makePsi116Case({ambiguous:true}).cii);const refused=run();assert.equal(refused.status,1);assert.equal(JSON.parse(refused.stdout).summary.ambiguous,1);assert.throws(()=>readFileSync(mp));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('P1.2b supplemental: nested branches, direct-node ordinals and different numbers at shared point',async()=>{
  const xml=new TextEncoder().encode('<PipeStressExport><Branch><Branchname>outer</Branchname><Node><NodeNumber>99</NodeNumber><Position>0 0 0</Position></Node><Group><Node><Position>999 999 999</Position></Node><Branch><Branchname>inner</Branchname><Node><NodeNumber>777</NodeNumber><Position>0.0 -0 0E0</Position></Node></Branch></Group><Node><NodeNumber>99</NodeNumber><Position>100 0 0</Position></Node></Branch></PipeStressExport>');
  const x=await readPsi116Graph(xml),c=await readCiiGraph(makePsi116Case().cii),r=matchPsi116Cii(x,c);
  assert.equal(x.branchCount,2);assert.equal(r.summary.xmlPoints,2);assert.equal(r.summary.paired,3);assert.equal(r.summary.pairedCii,2);
  assert.deepEqual(r.nodePairs.map(p=>[p.xml.branchOrdinal,p.xml.nodeOrdinal,p.xml.nodeNumber,p.cii]),[[0,0,'99','10'],[1,0,'777','10'],[0,1,'99','11']]);
});

test('P1.2b review: epsilon grouping of branch endpoints and overlong transitive chain',async()=>{
  const b=makePsi116Case({branches:2,nodes:11});
  const raw=new TextDecoder().decode(b.xml).replace('<ComponentRefNo>R1-0</ComponentRefNo><Position>1000 0 0','<ComponentRefNo>R1-0</ComponentRefNo><Position>1000.0001 0 0');
  const x=await readPsi116Graph(new TextEncoder().encode(raw)),c=await readCiiGraph(b.cii),r=matchPsi116Cii(x,c);
  assert.equal(r.summary.xmlPoints,21);assert.equal(r.summary.paired,22);assert.equal(r.summary.ambiguous,0);
  const ends=r.nodePairs.filter(p=>p.cii==='20');assert.equal(ends.length,2);assert.ok(ends.every(p=>p.rule==='same-position'));
  assert.ok(ends.some(p=>p.distanceMm>0&&p.distanceMm<0.001));assert.equal(exportMap(r,x,c).pairs.length,22);
  const extras=[1000.0008,1000.0016].map((v,i)=>({ref:{...x.nodes[0].ref,nodeOrdinal:99+i},xyz:[v,0,0]}));
  const chain=matchPsi116Cii({...x,nodes:[...x.nodes,...extras]},c);
  assert.equal(chain.summary.ambiguous,1);assert.match(chain.ambiguities[0].detail,/spans more than 0.001/);
  assert.equal(chain.summary.unmatchedXml,4);assert.throws(()=>exportMap(chain,x,c),{code:'MATCH_NODE_AMBIGUOUS'});
});

test('P1.2b review: three good points and one ambiguity print counts, block only Map, negative tolerance refuses',()=>{
  const dir=mkdtempSync(join(tmpdir(),'p12b-review-'));try{
    const xp=join(dir,'input.xml'),cp=join(dir,'input.cii'),mp=join(dir,'map.json'),b=makePsi116Case({branches:1,nodes:4,ambiguous:true});
    writeFileSync(xp,b.xml);writeFileSync(cp,b.cii);
    const run=(...args)=>spawnSync(process.execPath,[cli,'match-psi116',xp,cp,...args],{encoding:'utf8'});
    for(const map of [false,true]) {
      const v=run(...(map?['--map',mp]:[]));assert.equal(v.status,map?1:0,v.stdout+v.stderr);
      const r=JSON.parse(v.stdout);assert.equal(r.summary.paired,3);assert.equal(r.summary.unmatchedXml,1);assert.equal(r.summary.unmatchedCii,2);
      assert.equal(r.summary.ambiguous,1);assert.equal(r.ambiguities.length,1);assert.deepEqual(r.ambiguities[0].ciiNodes,['10','900000']);
      assert.equal(r.nodePairs.length,3);assert.throws(()=>readFileSync(mp));
    }
    for(const args of [['--tol','-0.5'],['--tol=-0.5']]) {
      const v=run(...args,'--map',mp);assert.equal(v.status,1,v.stdout+v.stderr);
      assert.equal(JSON.parse(v.stdout).refusals[0].code,'MATCH_TOLERANCE_INVALID');assert.throws(()=>readFileSync(mp));
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('P1.2d frame cii2019 reads PSI116 Position as the converter writes it (x, z, -y)', async () => {
  const xml = new TextEncoder().encode('<PipeStressExport><Pipe><Branch><Branchname>B</Branchname><Node><NodeNumber>10</NodeNumber><ComponentRefNo>R</ComponentRefNo><Position>1 2 3</Position></Node></Branch></Pipe></PipeStressExport>');
  assert.deepEqual((await readPsi116Graph(xml)).nodes[0].xyz, [1, 2, 3]);
  const g = await readPsi116Graph(xml, {frame: 'cii2019'});
  assert.deepEqual(g.nodes[0].xyz, [1, 3, -2]);
  assert.equal(g.frame, 'cii2019');
  await assert.rejects(readPsi116Graph(xml, {frame: 'other'}), /MATCH_FRAME_INVALID/);
});

test('P1.2e COORDS start points: within 6-25 mm drift is reported, beyond refuses, tolerance range enforced', async () => {
  const { reconcileSeeds } = await import('../engine/cii-graph.mjs');
  const els = [{from:'10',to:'20',delta:[1000,0,0]},{from:'20',to:'30',delta:[1000,0,0]}];
  const seeds = d => [{node:'10',xyz:[0,0,0]},{node:'30',xyz:[2000+d,0,0]}];
  const ok = reconcileSeeds(els, seeds(3.2));
  assert.equal(ok.drifts.length, 1); assert.ok(Math.abs(ok.drifts[0].missMm - 3.2) < 1e-9);
  assert.deepEqual(ok.seeds.map(s=>s.node), ['10']);
  assert.throws(() => reconcileSeeds(els, seeds(6.5)), /MAP_COORDS_SEED_DRIFT/);
  assert.equal(reconcileSeeds(els, seeds(20), 25).drifts.length, 1);
  assert.throws(() => reconcileSeeds(els, seeds(0), 5), /MAP_SEED_TOLERANCE_INVALID/);
  assert.throws(() => reconcileSeeds(els, seeds(0), 26), /MAP_SEED_TOLERANCE_INVALID/);
  assert.deepEqual(reconcileSeeds(els, seeds(0)).drifts, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { attempt, requireSha256 } from '../kit/core.mjs';
import { readBenchmark } from '../kit/node.mjs';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { readXmlGraph } from '../vendor/prototypes/ciifr-map/xml-intake.js';
import { matchXmlCii } from '../engine/xml-match.mjs';
import { xmlMatchToMapFile } from '../engine/xml-to-map.mjs';
import { readInputXmlGraph } from '../engine/xml-input.mjs';
import { xmlDomParser, makeCii } from './fixture-tools.mjs';

const hashes = {'X-F05':'1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995', 'X-S1':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b', 'X-S2':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd'};
const pinned = async id => {
  const {bytes} = await readBenchmark(id);
  await requireSha256(bytes, hashes[id], id);
  return bytes;
};
const xml = async bytes => readXmlGraph(bytes ?? await pinned('X-F05'), {member:'X-F05', cryptoRef:webcrypto, parser:xmlDomParser});
const cii = async (id = 'X-S1') => readCiiGraph(await pinned(id), {member:id});
const both = async () => [await xml(), await cii()];
const counts = r => [r.elementPairs.length, r.nodePairs.length, r.unmatchedElementsXml.length, r.unmatchedElementsCii.length, r.unmatchedNodesXml.length, r.unmatchedNodesCii.length];
const options = (x,c) => ({xmlFile:{fileName:'S1-F05.xml',sha256:x.sha256},ciiFile:{fileName:'S1.CII',sha256:c.sha256},createdAt:'2026-11-12T20:00:00Z'});
const refusal = async (fn, code, where) => {
  const r = await attempt(fn);
  assert.equal(r.ok,false); assert.equal(r.refusals[0].code,code); assert.equal(r.nodePairs,undefined); assert.equal(r.elementPairs,undefined);
  if (where) assert.match(r.refusals[0].where,where);
  return r.refusals[0];
};

test('P1.2 T1 X-F05 / X-S1 same-run matches every element and node', async () => {
  const [x,c] = await both(); const r = await attempt(() => matchXmlCii(x,c,{mode:'same-run'}));
  assert.equal(r.ok,true); assert.deepEqual(counts(r),[56,57,0,0,0,0]);
  assert.ok(r.elementPairs.every((p,k)=>p.k===k && p.cii.elementIndex===k && p.xml.from===p.cii.fromNode && p.xml.to===p.cii.toNode && p.rule==='same-run'));
  assert.ok(r.nodePairs.every(p=>p.xml===p.cii && p.distanceMm===0 && p.rule==='same-run'));
});
test('P1.2 T2 different model refuses at element count', async () => {
  const x=await xml(), c=await cii('X-S2');
  await refusal(()=>matchXmlCii(x,c,{mode:'same-run'}),'MATCH_SAME_RUN_BROKEN',/^element count$/);
});
test('P1.2 T3 edit XML text in memory: element 10 delta X +5 mm refuses', async () => {
  const original = new TextDecoder().decode(await pinned('X-F05'));
  const changed = original.replace(/(<PIPINGELEMENT index="11">[\s\S]*?<Field name="DELTA_X" value=")0\.000000("[^>]*?lex=") 0\.000000E\+00/, (_,a,b)=>a+'5.000000'+b+' 5.000000E+00');
  assert.notEqual(changed,original);
  const x=await xml(new TextEncoder().encode(changed)), c=await cii();
  assert.equal(x.edges[10].delta[0]-c.edges[10].delta[0],5);
  const r=await refusal(()=>matchXmlCii(x,c,{mode:'same-run'}),'MATCH_SAME_RUN_BROKEN',/^element 10 \(/); assert.match(r.detail,/delta X/);
});
test('P1.2 T4 geometry gives same refs as same-run', async () => {
  const [x,c]=await both(), a=matchXmlCii(x,c,{mode:'same-run'}), b=matchXmlCii(x,c,{mode:'geometry'});
  assert.deepEqual(counts(b),[56,57,0,0,0,0]);
  assert.deepEqual(b.elementPairs.map(({rule,reversed,...p})=>p),a.elementPairs.map(({rule,...p})=>p));
  assert.deepEqual(b.nodePairs.map(({rule,...p})=>p),a.nodePairs.map(({rule,...p})=>p));
  assert.ok(b.nodePairs.every(p=>p.rule==='same-position'));
});
const invented = (offset=0) => makeCii({elements:[{from:10+offset,to:20+offset,d:[100,0,0]},{from:20+offset,to:30+offset,d:[0,100,0]}],coords:[{node:10+offset,xyz:[0,0,0]}]});
test('P1.2 T5 geometry pairs invented nodes renumbered +1000; same-run refuses', async () => {
  const x=await readCiiGraph(invented()),c=await readCiiGraph(invented(1000));
  const r=matchXmlCii(x,c,{mode:'geometry'});
  assert.deepEqual(counts(r),[2,3,0,0,0,0]);
  assert.ok(r.nodePairs.every(p=>Number(p.cii)===Number(p.xml)+1000));
  await refusal(()=>matchXmlCii(x,c,{mode:'same-run'}),'MATCH_SAME_RUN_BROKEN',/^element 0 /);
});
test('P1.2 T6 exported node-only candidate Map validates via shared CLI', async () => {
  const [x,c]=await both(), map=xmlMatchToMapFile(matchXmlCii(x,c),options(x,c));
  assert.equal(map.pairs.length,57); assert.equal(map.source.kind,'xml'); assert.equal(map.target.kind,'cii');
  const dir=mkdtempSync(join(tmpdir(),'p12-map-'));
  try {
    const file=join(dir,'map.json'); writeFileSync(file,JSON.stringify(map));
    const validator=fileURLToPath(new URL('../../../shared/topofix-formats/validate.mjs',import.meta.url));
    const r=spawnSync(process.execPath,[validator,file],{encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+r.stderr); assert.equal(r.stdout.trim(),'OK');
    assert.ok(map.pairs.every((p,i)=>p.status==='candidate' && p.source.branchOrdinal===0 && p.source.nodeOrdinal===i && p.source.nodeNumber===x.nodes[i].id && p.target.kind==='cii-node' && p.evidence.detail==='0 mm'));
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('P1.2 T7 invalid tolerance refuses in both modes', async () => {
  const [x,c]=await both();
  for(const mode of ['same-run','geometry']) for(const toleranceMm of [0,'abc',NaN,Infinity,-1,'1']) await refusal(()=>matchXmlCii(x,c,{mode,toleranceMm}),'MATCH_TOLERANCE_INVALID');
});
test('P1.2 T8 two CII nodes 0.5 mm apart refuse even if one is exact', async () => {
  const x=await readCiiGraph(invented()), c=await readCiiGraph(makeCii({elements:[{from:10,to:20,d:[0.5,0,0]}]}));
  await refusal(()=>matchXmlCii(x,c,{mode:'geometry'}),'MATCH_NODE_AMBIGUOUS',/^XML node 10$/);
});
test('P1.2 additional: reject reused targets, parallel edges, invalid graph and mode', async () => {
  const x=await readCiiGraph(invented()), c=await readCiiGraph(invented());
  await refusal(()=>matchXmlCii(x,c,{mode:'wrong'}),'MATCH_MODE_INVALID');
  await refusal(()=>matchXmlCii({...x,nodes:[...x.nodes,x.nodes[0]]},c),'MATCH_GRAPH_INVALID');
  const crowded={...x,nodes:x.nodes.map(n=>n.id==='20'?{...n,xyz:[0.5,0,0]}:n)};
  await refusal(()=>matchXmlCii(crowded,c,{mode:'geometry'}),'MATCH_NODE_AMBIGUOUS');
  const parallel={...c,edges:[...c.edges,{...c.edges[0],index:2,ciiElementIndex:2}]};
  await refusal(()=>matchXmlCii(x,parallel,{mode:'geometry'}),'MATCH_ELEMENT_AMBIGUOUS');
});
test('P1.2 additional: reverse orientation, nearest rule and unmatched lists', async () => {
  const x=await readCiiGraph(invented()), c=await readCiiGraph(makeCii({elements:[{from:20,to:10,d:[-100.5,0,0]},{from:20,to:30,d:[0,100,0]}],coords:[{node:10,xyz:[0,0,0]}]}));
  const r=matchXmlCii(x,c,{mode:'geometry'}); assert.deepEqual(counts(r),[2,3,0,0,0,0]);
  assert.equal(r.elementPairs[0].reversed,true); assert.equal(r.nodePairs.find(p=>p.xml==='20').rule,'nearest-within-tolerance');
  const r2=matchXmlCii(x,c,{mode:'geometry',toleranceMm:0.1}); assert.deepEqual(counts(r2),[0,1,2,2,2,2]);
});
test('P1.2 additional: stale descriptors and malformed XML refuse; CLI writes only on success', async () => {
  const [x,c]=await both(), r=matchXmlCii(x,c), o=options(x,c);
  await refusal(()=>xmlMatchToMapFile(r,{...o,xmlFile:{...o.xmlFile,sha256:'0'.repeat(64)}}),'MAP_EXPORT_INVALID');
  await refusal(()=>xmlMatchToMapFile({...r,loopClosures:[{missMm:1}]},o),'MAP_EXPORT_INVALID',/^loop closures$/);
  await refusal(()=>readInputXmlGraph(new TextEncoder().encode('<broken>')),'MATCH_XML_INVALID');
  const dir=mkdtempSync(join(tmpdir(),'p12-cli-'));
  try {
    const path=join(dir,'map.json'), cli=fileURLToPath(new URL('../cli.mjs',import.meta.url));
    const xp=(await readBenchmark('X-F05')).path, cp=(await readBenchmark('X-S1')).path, wrong=(await readBenchmark('X-S2')).path;
    const run=(target,...args)=>spawnSync(process.execPath,[cli,'match-xml',xp,target,'--map',path,...args],{encoding:'utf8'});
    const bad=run(wrong); assert.equal(bad.status,1,bad.stderr); assert.equal(existsSync(path),false);
    const good=run(cp,'--mode','geometry'); assert.equal(good.status,0,good.stderr); assert.equal(JSON.parse(good.stdout).nodePairs.length,57);
    const before=readFileSync(path,'utf8'); assert.equal(JSON.parse(before).pairs.length,57);
    const again=run(cp); assert.equal(again.status,1); assert.equal(JSON.parse(again.stdout).refusals[0].code,'MATCH_MAP_WRITE_FAILED'); assert.equal(readFileSync(path,'utf8'),before);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

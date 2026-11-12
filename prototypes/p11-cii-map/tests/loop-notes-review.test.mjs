import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readBenchmark } from '../kit/node.mjs';
import { readCiiGraph } from '../engine/cii-graph.mjs';
import { compareCii } from '../engine/compare.mjs';
import { toMapFile } from '../engine/to-map.mjs';
import { matchXmlCii } from '../engine/xml-match.mjs';
import { xmlMatchToMapFile } from '../engine/xml-to-map.mjs';
import { makeCii } from './fixture-tools.mjs';
import { validate } from '../vendor/validate.mjs';

const desc = g => ({fileName:'invented', sha256:g.sha256});
const notes = p => JSON.parse(p.evidence.detail.split('): ')[1] || '[]');
const loop = miss => makeCii({elements:[
  {from:10,to:20,d:[1000,0,0]}, {from:20,to:30,d:[1000,0,0]},
  {from:30,to:40,d:[0,1000,0]}, {from:40,to:50,d:[-1000,0,0]},
  {from:50,to:20,d:[0,-1000+miss,0]}, {from:50,to:60,d:[0,0,1000]}
],coords:[{node:10,xyz:[0,0,0]}]});

test('P1.3 review: every loop element and node has both closure notes, not lead-in or spur', async () => {
  const g = await readCiiGraph(loop(1));
  assert.equal(g.loopClosures.length,1);
  const closure = g.loopClosures[0];
  assert.deepEqual(new Set(closure.elementIndices),new Set([1,2,3,4]));
  assert.deepEqual(new Set(closure.nodeIds),new Set(['20','30','40','50']));
  const result = compareCii(g,g), map = toMapFile(result,{sourceFile:desc(g),targetFile:desc(g)});
  for (const p of map.pairs) {
    const on = p.source.kind === 'cii' ? [1,2,3,4].includes(p.source.elementIndex) : ['20','30','40','50'].includes(p.source.node);
    assert.deepEqual(notes(p), on ? [{side:'source',closure},{side:'target',closure}] : []);
  }
  assert.deepEqual(validate(map),[]);
});

test('P1.2 review: XML export carries every affected target node closure note', async () => {
  const c = await readCiiGraph(loop(1)), x = await readCiiGraph(loop(0));
  const r = matchXmlCii(x,c,{mode:'geometry',toleranceMm:2});
  assert.equal(r.nodePairs.length,6);
  const map = xmlMatchToMapFile(r,{xmlFile:desc(x),ciiFile:desc(c)});
  for (const p of map.pairs) assert.deepEqual(notes(p), ['20','30','40','50'].includes(p.target.node) ? [{side:'target',closure:c.loopClosures[0]}] : []);
  assert.deepEqual(validate(map),[]);
  const unmatched = xmlMatchToMapFile({...r,nodePairs:r.nodePairs.filter(p=>p.cii==='10')},{xmlFile:desc(x),ciiFile:desc(c)});
  assert.deepEqual(notes(unmatched.pairs[0]),[{side:'target',closure:c.loopClosures[0]}]);
});

test('P1.2 review: same-run tolerance cap and summary, including CLI refusal', async () => {
  const g = await readCiiGraph(loop(0));
  assert.throws(()=>matchXmlCii(g,g,{toleranceMm:1.00001}),{code:'MATCH_TOLERANCE_INVALID'});
  assert.equal(matchXmlCii(g,g).summary.toleranceMm,0.01);
  assert.equal(matchXmlCii(g,g,{toleranceMm:1}).summary.toleranceMm,1);
  assert.equal(matchXmlCii(g,g,{mode:'geometry',toleranceMm:2}).summary.toleranceMm,2);
  const cli = fileURLToPath(new URL('../cli.mjs',import.meta.url));
  const xp=(await readBenchmark('X-F05')).path, cp=(await readBenchmark('X-S1')).path;
  const r=spawnSync(process.execPath,[cli,'match-xml',xp,cp,'--tol','1.01'],{encoding:'utf8'});
  assert.equal(r.status,1,r.stderr); assert.equal(JSON.parse(r.stdout).refusals[0].code,'MATCH_TOLERANCE_INVALID');
});

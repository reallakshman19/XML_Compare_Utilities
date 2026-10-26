import test from 'node:test';
import assert from 'node:assert/strict';
import {topologyCandidates, normalizeGraph} from '../tools/ciifr-geo-g2/topology.mjs';
import {reviewLedger} from '../tools/ciifr-geo-g2/ledger.mjs';
const h = a => a.repeat(64);
const graph = (hash, nodes, edges) => ({sha256: h(hash), nodes: nodes.map(id => ({id})),
  edges: edges.map(([from,to,delta]) => ({from,to,delta}))});
const s = graph('a', ['1','2','3'], [['1','2',[10,0,0]],['2','3',[0,20,0]]]);
const linked = {sourceSha256: h('a'), targetSha256: h('b')};
const t = graph('b', ['A','B','C','D','E','F'], [
  ['A','B',[0,10,0]], ['B','C',[-20,0,0]],
  ['D','E',[0,-10,0]],['E','F',[20,0,0]]]);
test('rotation/translation-independent weak topology preserves alternatives', () => {
  const r = topologyCandidates(s,t);
  assert.equal(r.pairs.length, 6); // both endpoints 2 alternatives, middle 2
  assert.equal(r.bySource.find(x => x.source === '2').alternatives, 2);
  assert.equal(r.spatialResidual,'NOT_EVALUATED');
  assert.equal(r.physicalIdentityQualified,false);
});
test('AND retains excluded alternatives and collisions instead of auto matching', () => {
  const r = reviewLedger(s,t,{...linked,manual:[{source:'2',target:'B'},{source:'3',target:'A'}],
    coordinate:[{source:'1',target:'A'},{source:'1',target:'D'}]},'AND');
  assert.equal(r.included.length,3);
  assert.equal(r.excluded.length,4);
  assert.ok(r.conflicts.some(x => x.type === 'SOURCE_ALTERNATIVES'));
  assert.ok(r.conflicts.some(x => x.type === 'TARGET_COLLISION'));
  assert.equal(r.qualifiedNodeMap.length,0);
});
test('manual hypothesis that contradicts topology stays visible as excluded', () => {
  const r = reviewLedger(s,t,{...linked,manual:[{source:'1',target:'B'}]},'AND');
  assert.equal(r.included.length,0);
  assert.ok(r.excluded.some(x => x.source === '1' && x.target === 'B'));
});
test('segment-only witness cannot become invented target node', () => {
  const r = reviewLedger(s,t,{...linked,coordinate:[{kind:'SEGMENT',source:'1',witness:'900 to 905'}]},'OR');
  assert.equal(r.nonNodeEvidence.length,1);
  assert.equal(r.included.length,6);
});
test('invalid/different source identity fails closed', () => {
  assert.throws(() => normalizeGraph({...s,sha256:'claimed'}), /SHA_REQUIRED/);
  assert.throws(() => normalizeGraph({...s,edges:[{from:'1',to:'unknown',delta:[1,0,0]}]}), /EDGE_ENDPOINT_INVALID/);
  assert.notEqual(reviewLedger(s,t).allEvidence[0].key,
    reviewLedger({...s,sha256:h('c')},t).allEvidence[0].key);
});
test('stale external hypotheses reject changed file hashes', () => {
  assert.throws(() => reviewLedger(s,t,{...linked,sourceSha256:h('f'),manual:[{source:'1',target:'A'}]}), /HYPOTHESES_SHA_MISMATCH/);
});
test('large candidate cartesian product fails without silent truncation', () => {
  const large = graph('d',Array.from({length:1450},(_,i)=>String(i)),[]);
  assert.throws(() => topologyCandidates(large,large), /PAIR_WORK_LIMIT/);
});

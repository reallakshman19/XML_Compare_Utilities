import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reviewSnapshotPick} from './review.mjs';

const hash = s => s.repeat(64);
const ids = {SOURCE:'source', TARGET:'target'};
const graphs = Object.fromEntries(['SOURCE','TARGET'].map(s => [ids[s],
  {member:`${s}:synthetic`, xmlSha256:hash(s==='SOURCE'?'a':'b'), byteAuthority:'XML_BYTES_MEASURED'}]));
const input = side => ({member:graphs[ids[side]].member, xmlSha256:graphs[ids[side]].xmlSha256});
const object = (side, kind, id, sourceRows) => {
  const info = input(side), objectId = JSON.stringify([side,info.member,info.xmlSha256,kind,String(id)]);
  return [objectId,{objectId,side,member:info.member,xmlSha256:info.xmlSha256,kind,
    ...(kind==='NODE'?{nodeId:String(id)}:{elementIndex:Number(id)}),sourceRows}];
};
function fixture() {
  const objects = Object.fromEntries([
    object('SOURCE','NODE','10',['10']), object('SOURCE','NODE','20',['20']),
    object('TARGET','NODE','90',['10','20']), object('TARGET','ELEMENT',4,['20'])]);
  return {schema:'CIIFR.XmlGeometryPreview.v1',epoch:2,graphs,
    candidates:{rows:[
      {source:'10',status:'AMBIGUOUS',alternatives:[{target:'90'}],sourceWitness:[]},
      {source:'20',status:'SEGMENT_ONLY',alternatives:[{target:'90',targetWitness:[4]}],segment:{element:4}}
    ]},
    viewerScene:{contract:'CIIFR.GeometryDisplaySnapshot.v1',epoch:2,binding:'snapshot binding',
      writerEligible:false,physicalIdentityQualified:false,inputs:{source:input('SOURCE'),target:input('TARGET')},objects}};
}
const pick = (data,side,kind,id) => reviewSnapshotPick(data,{side,kind,id});
const err = (code,fn) => assert.throws(fn,new RegExp('GEO_PICK_REVIEW_'+code));
const change = (fn) => {const f=fixture();fn(f);return f;};
const find = (d, side, kind) => Object.values(d.viewerScene.objects).find(o=>o.side===side&&o.kind===kind);

test('SYNTHETIC: reused TARGET NODE returns both SOURCE evidence rows, not first match', () => {
  const result=pick(fixture(),'TARGET','NODE','90');
  assert.deepEqual(result.sourceRows,['10','20']);
  assert.equal(result.sourceRowCount,2);
  assert.equal(result.conflict.reusedTarget,true);
  assert.equal(result.writerEligible,false);
  assert.equal(result.qualification,'OFFLINE_SNAPSHOT_ONLY');
});
test('SYNTHETIC: TARGET ELEMENT witness remains ELEMENT, does not make a NODE', () => {
  const d=fixture(), result=pick(d,'TARGET','ELEMENT',4);
  assert.deepEqual(result.sourceRows,['20']);
  assert.equal(result.picked.kind,'ELEMENT');
  err('OBJECT_NOT_FOUND',()=>pick(d,'TARGET','NODE','4'));
});
test('SYNTHETIC: SOURCE NODE cannot reuse TARGET numeric id or member',()=>{
  const result=pick(fixture(),'SOURCE','NODE','10');
  assert.deepEqual(result.sourceRows,['10']);
  err('OBJECT_NOT_FOUND',()=>pick(fixture(),'SOURCE','NODE','90'));
});
test('SYNTHETIC: first-row-only and fabricated links fail closed',()=>{
  for(const links of [['10'],['10','20','bogus'],['10','10'],['20',20]]) {
    const d=change(f=>{find(f,'TARGET','NODE').sourceRows=links;});
    err('INCOMPLETE_OR_CONFLICTING_LINKS',()=>pick(d,'TARGET','NODE','90'));
  }
});
test('SYNTHETIC: mismatched typed identity and duplicates fail',()=>{
  const d=change(f=>{find(f,'TARGET','NODE').objectId='wrong';});
  err('TYPED_IDENTITY_MISMATCH',()=>pick(d,'TARGET','NODE','90'));
  const e=change(f=>{f.viewerScene.objects.other={...find(f,'TARGET','NODE'),objectId:'other'};});
  err('DUPLICATE_OBJECT',()=>pick(e,'TARGET','NODE','90'));
});
test('SYNTHETIC: snapshot epoch, original XML measured identity and authority guards',()=>{
  err('STALE_SNAPSHOT',()=>pick(change(f=>{f.epoch=3;}),'TARGET','NODE','90'));
  err('SOURCE_PROVENANCE_MISMATCH',()=>pick(change(f=>{f.graphs.target.xmlSha256=hash('c');}),'TARGET','NODE','90'));
  err('ENGINEERING_AUTHORITY_INVALID',()=>pick(change(f=>{f.viewerScene.writerEligible=true;}),'TARGET','NODE','90'));
  err('SCHEMA_INVALID',()=>pick(change(f=>{f.schema='other';}),'TARGET','NODE','90'));
});
test('SYNTHETIC: incomplete ledger, wrong side and missing pick do not silently pass',()=>{
  err('LEDGER_INVALID',()=>pick(change(f=>{f.candidates.rows[1].source='10';}),'TARGET','NODE','90'));
  err('PICK_ARGUMENT_INVALID',()=>pick(fixture(),'ALIAS','NODE','90'));
  err('OBJECT_NOT_FOUND',()=>pick(fixture(),'TARGET','NODE','missing'));
});
test('SYNTHETIC: CLI produces same all-row report with valid JSON, no source edits',()=>{
  const folder=mkdtempSync(join(tmpdir(),'ciifr-pick-')),path=join(folder,'evidence.json');
  try {writeFileSync(path,JSON.stringify(fixture()));
    const r=spawnSync(process.execPath,[new URL('./cli.mjs',import.meta.url).pathname,path,'TARGET','NODE','90'],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout).sourceRows,['10','20']);
  } finally {rmSync(folder,{recursive:true,force:true});}
});

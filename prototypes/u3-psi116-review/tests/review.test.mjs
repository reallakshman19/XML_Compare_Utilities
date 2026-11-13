import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { comparePsi116, approvePsi116 } from '../review.mjs';
import { sha256Hex } from '../../_kit/core.mjs';
const xml = '<PipeStressExport><Pipe><Branch><Branchname>B &amp; C</Branchname><Temperature>100</Temperature><Node><NodeNumber>10</NodeNumber><ComponentRefNo>R1</ComponentRefNo><Weight> 10 </Weight><NodeName>A</NodeName></Node><Node><NodeNumber>10</NodeNumber><ComponentRefNo>R2</ComponentRefNo><Weight>20</Weight></Node></Branch><Branch><Branchname>B2</Branchname><Node><NodeNumber>10</NodeNumber><ComponentRefNo>R3</ComponentRefNo><Weight>30</Weight></Node></Branch></Pipe></PipeStressExport>';
const bytes = s => new TextEncoder().encode(s), a = bytes(xml);
const b = bytes(xml.replace(' 10 ', ' 12 ').replace('<Temperature>100', '<Temperature>120'));
const bad = bytes(xml.replace('<Pipe>', '<Pipe >'));
const review = (x, changes) => comparePsi116(a, x, changes);
const approve = (x, changes) => approvePsi116(a, x, changes);

test('U3a T1 exactly two rows, branch and node identities, counts and approval', async () => {
  const r = await review(b);
  assert.equal(r.changeCount, 2); assert.equal(r.rows.length, 2);
  assert.deepEqual({...r.fields}, {'Branch/Temperature': 1, 'Node/Weight': 1});
  assert.deepEqual(r.rows[0].ref, {branchOrdinal: 0, branchName: 'B & C'});
  assert.deepEqual(r.rows[1].ref, {branchOrdinal: 0, branchName: 'B & C', nodeOrdinal: 0, nodeNumber: '10', componentRefNo: 'R1'});
  assert.deepEqual(r.rows.map(x => [x.before,x.after]), [['100','120'],[' 10 ',' 12 ']]);
  const p = await approve(b); assert.deepEqual({...p.fields}, {...r.fields}); assert.equal(p.changeCount, 2);
  assert.equal(p.originalSha256, await sha256Hex(a)); assert.equal(p.revisedSha256, await sha256Hex(b)); assert.ok(Number.isFinite(Date.parse(p.approvedAt)));
});
test('U3a T2 markup changes refuse review and approval', async () => {
  for (const fn of [review, approve]) await assert.rejects(fn(bad), {code:'XML_MARKUP_CHANGED'});
  await assert.rejects(approve(bytes(xml.replace('<Weight>20</Weight>', '<Weight>20</Weight><Other/>'))), {code:'XML_STRUCTURE_CHANGED'});
});
test('U3a T3 changes hash mismatch refuses approval, matching aliases accepted', async () => {
  const sha256After = await sha256Hex(b), sha256Before = await sha256Hex(a);
  for (const fn of [review, approve]) await assert.rejects(fn(b, {revisedSha256:'0'.repeat(64)}), {code:'U3_SHA256_MISMATCH'});
  assert.equal((await approve(b, {sha256After, sha256Before})).changeCount, 2);
  assert.equal((await approve(b, {revisedSha256:sha256After, originalSha256:sha256Before})).changeCount, 2);
  await assert.rejects(approve(b, {sha256After, revisedSha256:'0'.repeat(64)}), {code:'U3_SHA256_MISMATCH'});
  await assert.rejects(approve(b, {}), {code:'U3_CHANGES_INVALID'});
  await assert.rejects(approve(b, {sha256After, sha256Before:'0'.repeat(64)}), {code:'U3_SHA256_MISMATCH'});
});
test('U3a T4 identical bytes approve zero changes', async () => {
  const r = await review(a); assert.equal(r.changeCount,0); assert.deepEqual(r.rows,[]); assert.deepEqual({...r.fields},{});
  const p = await approve(a); assert.equal(p.originalSha256,p.revisedSha256); assert.equal(p.changeCount,0);
});
test('U3a supplemental: repeated numbers, entity-only changes, nested values and hidden markup', async () => {
  const x = bytes(xml.replace('B &amp; C','B &#38; C').replace('<Weight>30','<Weight>31'));
  const r = await review(x); assert.equal(r.changeCount,2); assert.equal(r.rows[0].before,r.rows[0].after); assert.notEqual(r.rows[0].rawBefore,r.rows[0].rawAfter); assert.equal(r.rows[1].ref.branchOrdinal,1);
  await assert.rejects(approve(bytes(xml.replace('<Weight>20','<Weight><!-- hidden -->20'))), {code:'XML_MARKUP_CHANGED'});
  const nested = xml.replace('<Weight>20</Weight>','<Restraint><Gap>2</Gap></Restraint>');
  const n = await comparePsi116(bytes(nested),bytes(nested.replace('<Gap>2','<Gap>3'))); assert.equal(n.rows[0].field,'Node/Restraint/Gap'); assert.equal(n.rows[0].ref.nodeOrdinal,1);
  const attr = xml.replace('<Node>','<Node label="old">');
  assert.equal((await comparePsi116(bytes(attr),bytes(attr.replace('label="old"','label="new"')))).rows[0].field,'Node/@label');
});
test('U3a supplemental: CLI prints rows/counts, refuses without output', () => {
  const dir = mkdtempSync(join(tmpdir(),'u3a-'));
  try {
    const fa=join(dir,'a.xml'), fb=join(dir,'b.xml'), fc=join(dir,'c.json');
    writeFileSync(fa,a); writeFileSync(fb,b); writeFileSync(fc,JSON.stringify({revisedSha256:'0'.repeat(64)}));
    const run=(...args)=>spawnSync(process.execPath,['cli.mjs','diff',fa,fb,...args],{encoding:'utf8'});
    const ok=run(); assert.equal(ok.status,0,ok.stderr); assert.equal(JSON.parse(ok.stdout).changeCount,2);
    const refused=run('--changes',fc); assert.equal(refused.status,1); assert.equal(refused.stdout,''); assert.match(refused.stderr,/U3_SHA256_MISMATCH/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

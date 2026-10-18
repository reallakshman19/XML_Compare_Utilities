/** Issue #126: asynchronous selected-file custody must never resurrect stale Method C evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hashes = Object.freeze({
  S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const sourceSetHash = '5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3';
const original = fileURLToPath(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-writer2-native-shell.js', import.meta.url));
const nextTurn = () => new Promise(resolve => setImmediate(resolve));
class StubInput extends EventTarget {
  constructor(files=[]) {super();this.files=files;}
  select(files) {this.files=files;this.dispatchEvent(new Event('change'));}
  inspect() {this.dispatchEvent(new Event('click'));}
}
const fakeFile=(id, gate=null)=>({name:id+'.CII',async arrayBuffer(){if(gate)await gate;return new TextEncoder().encode(id).buffer;}});
const sourceFiles=()=>['S1','S2','S3'].map(id=>fakeFile(id));

async function fixture(t) {
  const root=await mkdtemp(path.join(tmpdir(),'i126-lifecycle-'));
  t.after(async()=>rm(root,{recursive:true,force:true}));
  const dir=path.join(root,'cii-workspace');await mkdir(dir);
  await writeFile(path.join(root,'package.json'),' {"type":"module"}\n');
  await writeFile(path.join(dir,'cii-workspace-method-c-writer2-native-shell.js'),await readFile(original));
  await writeFile(path.join(dir,'cii-workspace-v11-v14-converter.js'),
    `export async function ciiSha256(bytes){return ${JSON.stringify(hashes)}[new TextDecoder().decode(bytes)]||'0'.repeat(64);}\n`);
  await writeFile(path.join(dir,'cii-workspace-source-set.js'),
    `export async function ciiSourceSetSha256(members){return members.length===3&&['S1','S2','S3'].every((id,i)=>members[i].sourceId===id&&members[i].originalSha256===${JSON.stringify(hashes)}[id])?'5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3':'0'.repeat(64);}\n`);
  await writeFile(path.join(dir,'cii-workspace-multisource-nodename-authority.js'),
    `export const CII_MS_SOURCE_SET_SHA256='5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3';export const CII_MS_TARGET_SHA256='abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060';\n`);
  await writeFile(path.join(dir,'cii-workspace-method-c-writer2-bridge.js'),
    `export function mountMethodCWriter2ABridge(_container,opts){_container.bridge={get:opts.getCustody,invalidations:[],destroyed:false};return {invalidate(r){_container.bridge.invalidations.push(r);},destroy(){_container.bridge.destroyed=true;}};}\n`);
  const {mountMethodCWriter2NativeShell}=await import(pathToFileURL(path.join(dir,'cii-workspace-method-c-writer2-native-shell.js')));
  const source=new StubInput(sourceFiles()),target=new StubInput([fakeFile('T')]),inspect=new StubInput();
  const container={bridge:null,querySelector(sel){return ({'[data-ciiw-source]':source,'[data-ciiw-target]':target,'[data-ciiw-inspect]':inspect})[sel]||null;}};
  let coreDestroyed=false;
  const instance=mountMethodCWriter2NativeShell(container,{},()=>({destroy(){coreDestroyed=true;}}));
  return {source,target,inspect,container,instance,coreDestroyed:()=>coreDestroyed};
}
test('native shell captures same selected File objects only after explicit Inspect',async t=>{
  const f=await fixture(t);
  assert.equal(f.container.bridge.get(),null);
  f.inspect.inspect();await nextTurn();await nextTurn();
  assert.equal(f.container.bridge.get()?.sources?.length,3);
  assert.equal(f.container.bridge.get()?.targetOriginalSha256,hashes.T);
  assert.equal(f.container.bridge.get()?.sourceSetSha256,sourceSetHash);
  f.instance.destroy();
  assert.equal(f.coreDestroyed(),true);
  assert.equal(f.container.bridge.destroyed,true);
});
test('input revision invalidates custody; a previous pending Inspect cannot revive it',async t=>{
  const f=await fixture(t);let release;
  const gate=new Promise(resolve=>{release=resolve;});
  f.source.select([fakeFile('S1',gate),fakeFile('S2'),fakeFile('S3')]);
  f.inspect.inspect();
  f.target.select([fakeFile('T')]);
  release();await nextTurn();await nextTurn();
  assert.equal(f.container.bridge.get(),null);
  f.inspect.inspect();await nextTurn();await nextTurn();
  assert.equal(f.container.bridge.get()?.sources?.length,3);
  f.instance.destroy();
});
test('input revision and disposal stop retained-custody reuse even with matching names',async t=>{
  const f=await fixture(t);f.inspect.inspect();await nextTurn();await nextTurn();
  assert.ok(f.container.bridge.get());
  f.source.select(sourceFiles());
  assert.equal(f.container.bridge.get(),null);
  f.inspect.inspect();f.instance.destroy();await nextTurn();await nextTurn();
  assert.equal(f.container.bridge.get(),null);
  assert.equal(f.container.bridge.destroyed,true);
});

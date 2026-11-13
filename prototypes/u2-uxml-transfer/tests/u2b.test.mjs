import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {applyTransfer} from '../engine/apply.mjs';
import {planTransfer} from '../engine/plan.mjs';
import {applyPsi116Edits} from '../../u1-psi116-uxml/engine/psi116-patchback.mjs';
import {runCli} from '../cli.mjs';
import {sha256Hex} from '../kit/core.mjs';
import {scanXml,psi116Index,child,text} from '../kit/xmlspan.mjs';
import {validate} from '../vendor/validate.mjs';
import {node,branch,xml,pair,ref} from './fixtures.mjs';
const doc=(nodes,extra={})=>new TextEncoder().encode(new TextDecoder().decode(xml([branch(nodes,extra)])).replace('<PipeStressExport>','<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">'));
const pairs=[pair(0,0),pair(0,1)];
const values=(bytes,field)=>{const d=scanXml(bytes),i=psi116Index(d);const [scope,tag]=field.split('/');return (scope==='Branch'?i.branches:i.nodes.map(n=>n.element)).map(e=>text(d,child(e,tag,true)).value);};
function fixture(s,t,p=pairs){const dir=mkdtempSync(join(tmpdir(),'u2b-'));const [sp,tp,pp,out,changes,choices]=['s.xml','t.xml','pairs.json','out.xml','changes.json','choices.json'].map(n=>join(dir,n));writeFileSync(sp,s);writeFileSync(tp,t);writeFileSync(pp,JSON.stringify(p));return {dir,sp,tp,pp,out,changes,choices,args:['apply',sp,tp,pp,'--out',out,'--changes',changes],clean:()=>rmSync(dir,{recursive:true,force:true})};}
const cli=(...args)=>{const r=spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});return {status:r.status,result:JSON.parse(r.stdout),stderr:r.stderr};};
const checkRefusal=(r,code)=>{assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.refusals[0].code,code,JSON.stringify(r));assert.equal(r.bytes,undefined);assert.equal(r.ledger,undefined);};
const noFiles=f=>{assert.equal(existsSync(f.out),false);assert.equal(existsSync(f.changes),false);};

test('U2b T1 CLI weights, names and one branch Temperature; actual U1 parity and zero re-plan',async()=>{
 const s=doc([node('N-A',60.3,2),node('N-B',60.3,3)],{Temperature:200}),t=doc([node('OLD-A'),node('OLD-B')]),f=fixture(s,t);
 try{const {status,result}=cli(...f.args);assert.equal(status,0,JSON.stringify(result));const revised=readFileSync(f.out),receipt=JSON.parse(readFileSync(f.changes));assert.deepEqual(values(revised,'Node/NodeName'),['N-A','N-B']);assert.deepEqual(values(revised,'Node/Weight'),['2','3']);assert.deepEqual(values(revised,'Branch/Temperature'),['200']);assert.equal(receipt.changes.length,5);assert.equal(receipt.revised.sha256,await sha256Hex(revised));assert.equal(receipt.base.sha256,await sha256Hex(t));assert.equal(receipt.source.sha256,await sha256Hex(s));assert.deepEqual(receipt.changes.find(c=>c.field==='Branch/Temperature').evidence.pairs.map(p=>p.pairId),['raw-1','raw-2']);assert.ok(receipt.changes.every(c=>new TextDecoder().decode(t.slice(c.start,c.end))===c.before&&c.evidence.pairs.length));assert.equal((await planTransfer(s,revised,pairs)).edits.length,0);assert.equal(receipt.roundtrip.appliedRemaining,0);assert.deepEqual(new Uint8Array(readFileSync(f.tp)),t);}
 finally{f.clean();}
});
const partial=()=>[doc([node('X',60.3,'abc'),node('X',60.3,3)]),doc([node('OLD-A'),node('OLD-B')])];
test('U2b T2 ambiguity and invalid numeric row are listed, independent weight applied',async()=>{
 const [s,t]=partial(),f=fixture(s,t);try{const {status,result}=cli(...f.args);assert.equal(status,0,JSON.stringify(result));assert.equal(result.ambiguities.length,1);assert.equal(result.ambiguities[0].code,'U2_NAME_REPEATED');assert.equal(result.refused[0].code,'U2_VALUE_INVALID');assert.deepEqual(result.changes.map(c=>[c.field,c.ref.nodeOrdinal,c.after]),[['Node/Weight',1,'3']]);assert.deepEqual(values(readFileSync(f.out),'Node/NodeName'),['OLD-A','OLD-B']);assert.deepEqual(values(readFileSync(f.out),'Node/Weight'),['1','3']);}finally{f.clean();}
});
test('U2b T3 explicit popup choices apply selected name only',async()=>{const [s,t]=partial(),f=fixture(s,t);try{writeFileSync(f.choices,JSON.stringify({X:[ref(0,1)]}));const {status,result}=cli(...f.args,'--choices',f.choices);assert.equal(status,0,JSON.stringify(result));assert.equal(result.ambiguities.length,0);assert.equal(result.changes.length,2);assert.deepEqual(values(readFileSync(f.out),'Node/NodeName'),['OLD-A','X']);assert.equal(result.roundtrip.appliedRemaining,0);}finally{f.clean();}});
test('U2b T4 stale before reaches real U1 and no outputs are written',async()=>{const [s,t]=partial(),f=fixture(s,t);try{const writer=(b,e,o)=>applyPsi116Edits(b,e.map(x=>({...x,before:'STALE'})),o);const r=await runCli(f.args,{writer});checkRefusal(r,'U1_STALE_BEFORE');noFiles(f);}finally{f.clean();}});
test('U2b T5 existing either output or same path refused without overwriting',async()=>{const [s,t]=partial(),f=fixture(s,t);try{for(const path of [f.out,f.changes]){writeFileSync(path,'KEEP');checkRefusal((cli(...f.args)).result,'U2_OUTPUT_EXISTS');assert.equal(readFileSync(path,'utf8'),'KEEP');assert.equal(existsSync(path===f.out?f.changes:f.out),false);rmSync(path);}checkRefusal(cli(...f.args.slice(0,-1),f.out).result,'U2_OUTPUT_EXISTS');noFiles(f);}finally{f.clean();}});
test('U2b M1 re-plan detects a false writer receipt; neither file written',async()=>{const [s,t]=partial(),f=fixture(s,t);try{const writer=async(b,e,o)=>{const r=await applyPsi116Edits(b,e,o);return {...r,bytes:b,sha256After:await sha256Hex(b)};};checkRefusal(await runCli(f.args,{writer}),'U2_ROUNDTRIP_MISMATCH');noFiles(f);}finally{f.clean();}});
test('U2b approved XML Map hash-lock, evidence and internal revised hash re-plan',async()=>{const s=doc([node('N-A',60.3,2),node('N-B',60.3,3)]),t=doc([node('OLD-A'),node('OLD-B')]);const m={format:'topofix.map',version:1,createdAt:'2026-11-13T00:00:00Z',source:{kind:'xml',fileName:'s.xml',sha256:await sha256Hex(s)},target:{kind:'xml',fileName:'t.xml',sha256:await sha256Hex(t)},method:'manual',pairs:pairs.map((p,i)=>({pairId:`P${i}`,source:{kind:'xml',...p.source},target:{kind:'xml',...p.target},status:i?'candidate':'approved',evidence:{rule:'manual',detail:'invented'},...(i?{}:{approvedBy:'test',approvedAt:'2026-11-13T00:00:00Z'})}))};assert.deepEqual(validate(m),[]);const snapshot=structuredClone(m);const r=await applyTransfer(s,t,m);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.ledger.changes.length,2);assert.ok(r.ledger.changes.every(c=>c.evidence.pairs[0].pairId==='P0'));assert.deepEqual(m,snapshot);assert.deepEqual(values(r.bytes,'Node/NodeName'),['N-A','OLD-B']);assert.equal(r.ledger.roundtrip.appliedRemaining,0);m.target.sha256='0'.repeat(64);checkRefusal(await applyTransfer(s,t,m),'U2_MAP_FILE_MISMATCH');});
test('U2b U1 stricter value refusal rolls back all outputs',async()=>{const s=doc([node('NEW-A',60.3,'2e0'),node('NEW-B',60.3,3)]),t=doc([node('OLD-A'),node('OLD-B')]),f=fixture(s,t);try{checkRefusal(cli(...f.args).result,'U1_VALUE_INVALID');noFiles(f);}finally{f.clean();}});
test('U2b second output I/O failure rolls back first output',async()=>{const [s,t]=partial(),f=fixture(s,t);try{const missing=join(f.dir,'absent','receipt.json');checkRefusal(cli(...f.args.slice(0,-1),missing).result,'U2_IO_FAILED');noFiles(f);assert.equal(existsSync(missing),false);}finally{f.clean();}});
test('U2b zero edits still yields unchanged bytes and a receipt',async()=>{const t=doc([node('A'),node('B')]);const r=await applyTransfer(t,t,pairs);assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(r.bytes,t);assert.equal(r.ledger.changes.length,0);assert.equal(r.ledger.roundtrip.appliedRemaining,0);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {applyPsi116Edits,U1_FIELDS,verifyPsi116Parity} from '../engine/psi116-patchback.mjs';
import {scanXml,xmlDiff,psi116Index,locatePsi116} from '../../_kit/xmlspan.mjs';
import {mapPsi116ToUxml} from '../../../uxml/UxmlPsi116SchemaMapper.js';
import {fixture,edit,ref,options} from './fixture.mjs';
const decode=b=>new TextDecoder('utf-8',{ignoreBOM:true}).decode(b);
const encode=s=>new TextEncoder().encode(s);
const diff=(a,b)=>xmlDiff(scanXml(a),scanXml(b));
const mapped=r=>mapPsi116ToUxml(decode(r.bytes),{fileSha256:r.sha256After}).components.map(c=>c.rawAttributes.psi116);
const run=async (b,e)=>applyPsi116Edits(b,e,await options(b));
const weight=(after,b=0,n=0)=>edit('Node/Weight','10.0',after,b,n);

test('U1 T1 no edits preserves all bytes and hashes',async()=>{
  const b=fixture(), r=await run(b,[]); assert.deepEqual(r.bytes,b); assert.equal(r.sha256Before,r.sha256After); assert.deepEqual(r.changes,[]);
  assert.deepEqual((await run(b,[weight('10.0')])).bytes,b);
});
test('U1 T2 one weight changes precisely one span and maps',async()=>{
  const b=fixture(),r=await run(b,[weight('12.5',1,2)]),d=diff(b,r.bytes);
  assert.equal(d.length,1); assert.equal(d[0].before,'  10.0  '); assert.equal(d[0].after,'  12.5  ');
  assert.equal(mapped(r)[5].weight,12.5); assert.equal(mapped(r)[0].weight,10);
  assert.equal(r.changes[0].start,d[0].start+2);
});
test('U1 T3 mixed node and branch fields, equal branch values collapse',async()=>{
  const b=fixture(),e=[edit('Node/NodeName','N-0-0','renamed'),weight('22',0,1),edit('Node/WallThickness','5','6',1,2),edit('Branch/Temperature','100','125',0,0),edit('Branch/Temperature','100','125',0,2),edit('Branch/MaterialNumber','1','3',0,1)];
  const r=await run(b,e),d=diff(b,r.bytes),m=mapped(r);
  assert.equal(d.length,5); assert.equal(r.changes.length,5);
  assert.equal(m[0].nodeName,'renamed'); assert.equal(m[1].weight,22); assert.equal(m[5].wallThickness,6);
  assert.deepEqual(d.map(x=>x.after.trim()),['125','3','renamed','22','6']);
  assert.equal(m[3].weight,10); assert.equal(m[2].nodeName,'N-0-2');
});
test('U1 T4 escape ampersand and less-than, decoded parity',async()=>{
  const b=fixture(),value='A & B < C > D',r=await run(b,[edit('Node/NodeName','N-0-0',value)]);
  assert.match(decode(r.bytes),/<NodeName>A &amp; B &lt; C &gt; D<\/NodeName>/);
  const doc=scanXml(r.bytes); assert.equal(locatePsi116(doc,psi116Index(doc),ref(),'NodeName').span.value,value); assert.equal(mapped(r)[0].nodeName,value);
});
test('U1 T5 refusals are atomic and preserve input',async()=>{
  const b=fixture(),snapshot=b.slice(),o=await options(b),good=weight('11',1,2);
  const absent=encode(decode(b).replace('<Weight>  10.0  </Weight>',''));
  const cases=[['U1_FILE_SHA256_MISMATCH',b,[good],{fileSha256:'0'.repeat(64)}],['U1_FIELD_NOT_SUPPORTED',b,[edit('Node/Rigid','2','3')],o],['U1_FIELD_ABSENT',absent,[weight('12')],await options(absent)],['U1_STALE_BEFORE',b,[edit('Node/Weight','wrong','12')],o],['U1_VALUE_INVALID',b,[weight('Infinity')],o],['U1_BRANCH_FIELD_SPLIT',b,[edit('Branch/Temperature','100','101'),edit('Branch/Temperature','100','102',0,1)],o],['U1_CONFLICTING_EDITS',b,[weight('11'),weight('12')],o],['XML_REF_MISMATCH',b,[{...weight('12'),ref:{...ref(),componentRefNo:'wrong'}}],o]];
  for(const [code,input,edits,opts] of cases){const copy=input.slice();await assert.rejects(applyPsi116Edits(input,[good,...edits],opts),new RegExp('^'+ 'Error: '+code));assert.deepEqual(input,copy);}
  assert.deepEqual(b,snapshot);
});
test('U1 T6 BOM and CRLF remain byte-for-byte outside span',async()=>{
  const b=fixture(2,3,{bom:true,crlf:true});const r=await run(b,[weight('123.456')]);
  assert.deepEqual(r.bytes,encode(decode(b).replace('<Weight>  10.0  </Weight>','<Weight>  123.456  </Weight>')));
  assert.deepEqual((await run(b,[])).bytes,b);
});
test('U1 T7 parity refuses mapper-normalized branch identity even though XML span is valid (M4)',async()=>{
  const b=encode(decode(fixture()).replace('<Branchname>BR-0','<Branchname>\u00a0BR-0'));
  await assert.rejects(run(b,[{...weight('12'),ref:{...ref(),branchName:'\u00a0BR-0'}}]),/U1_PARITY_FAILED.*UXML component/);
});
test('U1 T8 all remaining supported fields and categories',async()=>{
  const b=fixture(),e=[edit('Node/OutsideDiameter','60','70'),edit('Node/CorrosionAllowance','1','2'),edit('Node/InsulationThickness','20','25'),edit('Branch/Pressure','2','3'),edit('Branch/FluidDensity','800','900'),edit('Branch/InsulationDensity','40','50')];
  const r=await run(b,e);assert.equal(diff(b,r.bytes).length,6);assert.equal(mapped(r)[0].outsideDiameter,70);assert.equal(Object.keys(U1_FIELDS).length,29);
});
test('U1 T9 CLI refusal writes no output; exclusive create preserves existing output',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'u1-'));try{
    const b=fixture(),input=join(dir,'in.xml'),json=join(dir,'edits.json'),out=join(dir,'out.xml');await writeFile(input,b);
    const cli=()=>spawnSync(process.execPath,['cli.mjs','apply',input,json,out],{encoding:'utf8'});
    await writeFile(json,JSON.stringify({edits:[weight('12')],fileSha256:'0'.repeat(64)}));let p=cli();assert.equal(p.status,1);assert.match(p.stderr,/U1_FILE_SHA256_MISMATCH/);assert.deepEqual((await readdir(dir)).sort(),['edits.json','in.xml']);
    await writeFile(json,JSON.stringify([weight('12')]));p=cli();assert.equal(p.status,1);assert.match(p.stderr,/U1_VALUE_INVALID/);assert.deepEqual((await readdir(dir)).sort(),['edits.json','in.xml']);
    await writeFile(json,JSON.stringify({edits:[weight('12')],...await options(b)}));p=cli();assert.equal(p.status,0,p.stderr);const result=await readFile(out);assert.equal(diff(b,result).length,1);
    p=cli();assert.equal(p.status,1);assert.match(p.stderr,/U1_OUTPUT_EXISTS/);assert.deepEqual(await readFile(out),result);
    const f=spawnSync(process.execPath,['cli.mjs','fields'],{encoding:'utf8'});assert.equal(f.status,0);assert.deepEqual(JSON.parse(f.stdout),U1_FIELDS);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('U1 T10 integer node identity, including leading zeros and branch edits',async()=>{
  const b=encode(decode(fixture()).replace('<NodeNumber>100</NodeNumber>','<NodeNumber>0100</NodeNumber>'));
  const r=await run(b,[{...weight('12'),ref:{...ref(),nodeNumber:100}},{...edit('Branch/Temperature','100','101'),ref:{...ref(),nodeNumber:'00100'}}]);
  assert.equal(mapped(r)[0].nodeNumber,100);assert.equal(mapped(r)[0].weight,12);assert.equal(diff(b,r.bytes).length,2);
  await assert.rejects(run(b,[{...weight('12'),ref:{...ref(),nodeNumber:101}}]),/XML_REF_MISMATCH/);
  await assert.rejects(run(b,[{...weight('12'),ref:{...ref(),nodeNumber:'100.0'}}]),/XML_REF_MISMATCH/);
});
test('U1 T11 reject NodeName normalization hazards up front',async()=>{
  const b=fixture();for(const name of ['A\rB',' A','A ','\u00a0A','A\u00a0','\u2003A','A\u202f','A\uFEFFB','\uFEFFA','A\uFEFF']) await assert.rejects(run(b,[edit('Node/NodeName','N-0-0',name)]),/^Error: U1_VALUE_INVALID/);
  assert.equal(mapped(await run(b,[edit('Node/NodeName','N-0-0','A\u00a0B')]))[0].nodeName,'A\u00a0B');
});
test('U1 T12 only finite plain decimal numeric values',async()=>{
  const b=fixture();for(const value of ['+3e2','5.','-0','-0.0',-0,'1e2','+3','.5',' 5','0x12','NaN','9'.repeat(400)]) await assert.rejects(run(b,[weight(value)]),/^Error: U1_VALUE_INVALID/);
  for(const value of ['0','12.50','-2.5',5]) assert.equal(mapped(await run(b,[weight(value)]))[0].weight,Number(value));
});
test('U1 T13 exact-span parity rejects an unplanned value change (M5)',async()=>{
  const b=fixture(),changed=encode(decode(b).replace('<Pressure>2</Pressure>','<Pressure>3</Pressure>'));
  const {fileSha256}=await options(changed);
  assert.throws(()=>verifyPsi116Parity(scanXml(b),changed,[],fileSha256),/U1_PARITY_FAILED.*diff count/);
});
test('U1 T14 real PSI116 load cases: nested Temperature1 and Pressure2 are edited in place',async()=>{
  const nested=t=>t.replace(/<Temperature>([^<]*)<\/Temperature>/g,'<Temperature><Temperature1>$1</Temperature1><Temperature2>-100000</Temperature2></Temperature>').replace(/<Pressure>([^<]*)<\/Pressure>/g,'<Pressure><Pressure1>$1</Pressure1><Pressure2>0</Pressure2></Pressure>');
  const b=encode(nested(decode(fixture())));
  const r=await run(b,[edit('Branch/Temperature/Temperature1','100','150',0,0),edit('Branch/Pressure/Pressure2','0','4.5',0,1)]),d=diff(b,r.bytes);
  assert.equal(d.length,2);assert.deepEqual(d.map(x=>x.after.trim()).sort(),['150','4.5']);
  await assert.rejects(run(b,[edit('Branch/Temperature','100','150',0,0)]),/U1_|XML_NOT_LEAF/);
});

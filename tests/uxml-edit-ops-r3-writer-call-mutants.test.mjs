/**
 * R3 real writer CALL-site mutants. Seed falsifies writer-only candidate views
 * in a disposable clone, so the independently imported verifier is separate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const WRITER='uxml/UxmlEditOpsPatchBack.js';
const TARGET='tests/uxml-edit-ops-patch-back.test.mjs';
const seedWrapper="import {mapCaesarInputXmlToUxmlStrict as baseS3} from './UxmlInputXmlSchemaMapper.js';\nimport {inventoryInputXml as baseInventory} from './UxmlEditOpsTypedInventory.js';\nconst isCandidate=source=>!source.includes('FROM_NODE=\"40\"');\nexport function mapCaesarInputXmlToUxmlStrict(source,opts){\n  const doc=baseS3(source,opts);\n  if(process.env.R3_WRITER_SEED==='S3'&&isCandidate(source)){\n    const from=doc.components[1]?.rawAttributes?.inputXml?.from;\n    if(!from)throw Error('R3 writer seed lacks candidate S3 position');\n    from.x+=0.004;\n  }\n  return doc;\n}\nexport function inventoryInputXml(source,opts){\n  const inv=baseInventory(source,opts);\n  if(process.env.R3_WRITER_SEED==='NUMERIC'&&isCandidate(source)){\n    const field=inv.items.find(c=>c.element==='PIPINGELEMENT'&&c.field==='DIAMETER');\n    if(!field)throw Error('R3 writer seed lacks typed property');\n    field.raw='999';\n  }\n  return inv;\n}\n";
const cases=[
 {id:'FULL_NUMERIC_CALL',seed:'NUMERIC',expected:'PARITY',
  name:'R3 writer fullNumericOracle call detects seeded candidate inventory fault',
  from:'fullNumericOracle(original,candidate,mapping,ledger);',
  to:'void candidate;'},
 {id:'S3_CANDIDATE_CALL',seed:'S3',expected:'PARITY',
  name:'R3 writer verifyS3Candidate call detects seeded S3 point drift',
  from:'verifyS3Candidate(original,candidate,mapping);',
  to:'void candidate;'},
];
const run=(dir,seed,pattern)=>spawnSync(process.execPath,
 ['--test','--test-name-pattern='+pattern,TARGET],{
   cwd:dir,encoding:'utf8',timeout:60000,
   env:Object.fromEntries([...Object.entries(process.env)
     .filter(([k])=>k!=='NODE_TEST_CONTEXT'),['R3_WRITER_SEED',seed]])});
for(const spec of cases){
 test('R3 writer CALL '+spec.id+' GREEN -> RED',()=>{
   const dir=mkdtempSync(join(tmpdir(),'xcu-r3-writer-call-'));
   try{
     cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
     cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
     mkdirSync(join(dir,'tests'),{recursive:true});
     cpSync(join(root,TARGET),join(dir,TARGET));
     writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
     const path=join(dir,WRITER);
     let code=readFileSync(path,'utf8');
     for(const [old,replacement] of [
       ["from './UxmlInputXmlSchemaMapper.js';","from './__R3WriterSeed.js';"],
       ["from './UxmlEditOpsTypedInventory.js';","from './__R3WriterSeed.js';"]
     ]){
       assert.equal(code.split(old).length-1,1,'unique seed import');
       code=code.replace(old,replacement);
     }
     writeFileSync(path,code);
     writeFileSync(join(dir,'uxml/__R3WriterSeed.js'),seedWrapper);
     const original=run(dir,'CONTROL','contract v1 envelope');
     assert.equal(original.status,0,'valid original must pass\n'+original.stdout+original.stderr);
     const added="\ntest("+JSON.stringify(spec.name)+",async()=>{"+
       "const source=fixture();await denied(source,payload(source),R."+spec.expected+");});\n";
     writeFileSync(join(dir,TARGET),readFileSync(join(dir,TARGET),'utf8')+added);
     const green=run(dir,spec.seed,spec.name);
     assert.equal(green.status,0,spec.id+' GREEN\n'+green.stdout+green.stderr);
     assert.match(green.stdout,/# pass 1\b/);
     code=readFileSync(path,'utf8');
     assert.equal(code.split(spec.from).length-1,1,'unique production call');
     writeFileSync(path,code.replace(spec.from,spec.to));
     const syntax=spawnSync(process.execPath,['--check',WRITER],{cwd:dir,encoding:'utf8'});
     assert.equal(syntax.status,0,syntax.stderr);
     const red=run(dir,spec.seed,spec.name),output=red.stdout+'\n'+red.stderr;
     assert.notEqual(red.status,0,spec.id+' survived\n'+output);
     assert.match(output,/^not ok 1 -/m);
     assert.doesNotMatch(output,/ERR_MODULE_NOT_FOUND|SyntaxError/);
   }finally{rmSync(dir,{recursive:true,force:true});}
 });
}

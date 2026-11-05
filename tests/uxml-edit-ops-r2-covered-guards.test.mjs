/**
 * R2 guard-accounting COVERED tests: removing a redundant guard must not
 * remove refusal because the documented independent covering layer remains.
 * Each test runs the real writer / real numeric oracle in an isolated clone.
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
const TEST='tests/uxml-edit-ops-patch-back.test.mjs';
const cases=[
  {
    id:'OWNER_PLANNER',name:'IR B6 mixed original owner spelling 20 vs 020 refuses LF',
    from:'need(ownerSpelling.length===1,R.OWNER,{opId:op.opId});',
    to:'need(true,R.OWNER,{opId:op.opId});',
    covering:'whole numeric oracle and independent B spelling',
  },
  {
    id:'REMAINED_WRITER',name:'R2 COVERED writer absorbed remainder by numeric identity oracle',
    from:'if(b.key!==null&&mapping.has(b.key))',
    to:'if(false)',
    covering:'numeric b.key===expected',
  },
  {
    id:'DUPLICATE_ABSORBED',name:'R2 COVERED duplicate absorbed id refuses by reservation or preflight',
    from:'need(!mapping.has(absorbed),R.CONFLICT,{opId:op.opId,absorbed});',
    to:'need(true,R.CONFLICT,{opId:op.opId,absorbed});',
    covering:'reserveField path conflict or strict preflight',
  },
  {
    id:'LEGACY_LOCAL_COINCIDENCE',name:'IR B4/F6 all pairs 0.0018 spread refuses anchored alias LF',
    from:'verifyCoincidence(doc,absorbed,owner,op.opId);',
    to:'void op;',
    covering:'mandatory owner-group 0.001-mm all-pairs gate',
  },
  {
    id:'WRITER_BYTE_PARITY',name:'R2 COVERED independent complement catches unledgered byte edit',
    from:'assertByteParity(oldBytes,candidateBytes,ledger);',
    to:'void ledger;',
    seed:'NON_LEDGER',
    covering:'independent originalByteProof on emitted bytes',
  },
];
const run=(dir,name)=>spawnSync(process.execPath,
  ['--test','--test-name-pattern='+name,TEST],{
    cwd:dir,encoding:'utf8',timeout:60000,
    env:Object.fromEntries(Object.entries(process.env)
      .filter(([k])=>k!=='NODE_TEST_CONTEXT')),
  });
for(const spec of cases){
  test('R2 COVERED '+spec.id+' -> '+spec.covering,()=>{
    const dir=mkdtempSync(join(tmpdir(),'xcu-r2-cover-'));
    try{
      cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
      cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
      mkdirSync(join(dir,'tests'),{recursive:true});
      cpSync(join(root,TEST),join(dir,TEST));
      writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
      if(spec.seed==='NON_LEDGER'){
        const path=join(dir,WRITER);
        let writer=readFileSync(path,'utf8');
        const seam='const candidateBytes=spliceOriginal(original,ledger);';
        assert.equal(writer.split(seam).length-1,1);
        const inject=seam+"\n    const marker=enc.encode('SAFE-COMMENT');"+
          "\n    const offset=candidateBytes.findIndex((v,i)=>"+
          "v===marker[0]&&marker.every((t,j)=>candidateBytes[i+j]===t));"+
          "\n    if(offset>=0)candidateBytes[offset]='X'.charCodeAt(0);";
        writer=writer.replace(seam,()=>inject);
        writeFileSync(path,writer);
        const testCode="\ntest('"+spec.name+"',async()=>{"+
          "const src=fixture()+'<!--SAFE-COMMENT-->';"+
          "await denied(src,payload(src),R.PARITY);});\n";
        writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+testCode);
      }
      const baseline=run(dir,spec.name),baseOutput=baseline.stdout+baseline.stderr;
      assert.equal(baseline.status,0,spec.id+' baseline named refusal\n'+baseOutput);
      assert.match(baseline.stdout,/# pass 1\b/,'exactly one real refusal control');
      const path=join(dir,WRITER);
      let writer=readFileSync(path,'utf8');
      assert.equal(writer.split(spec.from).length-1,1,spec.id+' unique deleted guard');
      writer=writer.replace(spec.from,()=>spec.to);
      writeFileSync(path,writer);
      const syntax=spawnSync(process.execPath,['--check',WRITER],{
        cwd:dir,encoding:'utf8'});
      assert.equal(syntax.status,0,syntax.stderr);
      const covered=run(dir,spec.name),output=covered.stdout+covered.stderr;
      assert.equal(covered.status,0,spec.id+' missing covering refusal\n'+output);
      assert.match(covered.stdout,/# pass 1\b/,
        spec.id+' refusal MUST survive guard deletion');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}

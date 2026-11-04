import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const sourcePath='uxml/UxmlEditOpsPatchBack.js';
const testPath='tests/uxml-edit-ops-patch-back.test.mjs';
const changes=[
  ['SCHEMA_REQUIRED',"payload.schema===UXML_EDIT_OPS_SCHEMA","true",
    'schema and op-field exactness refuses without bytes LF'],
  ['MEASURED_SHA',"fileSha256===measured&&","true&&",
    'stale original SHA, op SHA and op ID refuse LF'],
  ['STRICT_POLICY',"policy.minimum_confidence===0.95","true",
    'unwidenable TopoFix selection policy refuses LF'],
  ['OP_SHA',"op.fileSha256===measured,R.OP_SHA","true,R.OP_SHA",
    'stale original SHA, op SHA and op ID refuse LF'],
  ['OP_PARAMS',"op.params[0].operation==='ALIAS_NODE'","true",
    'invalid, forged and unaccounted alias params refuse LF'],
  ['UNKNOWN_RECORD',"need(byKey.has(key),R.UNKNOWN","need(true,R.UNKNOWN",
    'unknown/stale recordKey and incorrect targets refuse LF'],
  ['TARGET_SET',"sameArray([...op.targets].sort(),expected)","true",
    'unknown/stale recordKey and incorrect targets refuse LF'],
  ['ALL_DESCENDANT_NODE_REFERENCES',"if(!oldIds.has(node))continue;","if(true)continue;",
    'SIF source owner references and descendants of unedited records refuse LF'],
  ['ALL_SOURCE_LOSS_REFERENCES',
    "if([...raw.matchAll(rawNumber)].some(m=>oldIds.has(finiteNode(m[0]))))",
    "if(false)",'SIF source owner references and descendants of unedited records refuse LF'],
  ['SELF_LOOP',"need(planned.every(x=>x.from!==null&&x.to!==null&&x.from!==x.to),R.LOOP);",
    "need(true,R.LOOP);",'planned FROM==TO self-loop refuses before reread LF'],
  ['POST_PATCH_S3_REREAD',
    "reread=mapCaesarInputXmlToUxmlStrict(candidate,{fileSha256:await hash(result)});",
    "reread=doc;",'post-patch strict S3 reread conflict refuses LF'],
  ['EXACT_OFFSET',"const offset=match.index+match[0].indexOf(match[2])+1;",
    "const offset=match.index+match[0].indexOf(match[2])+2;",
    'alias happy sourceRef S3 reread, exact byte ranges and LF/CRLF LF'],
];
const run=(dir,args)=>spawnSync(process.execPath,args,{
  cwd:dir,encoding:'utf8',timeout:60000,
  env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT')),
});
for(const [name,oldText,replacement,pattern] of changes){
  test('edit-ops guard mutant '+name+' GREEN control and RED mutation',()=>{
    const dir=mkdtempSync(join(tmpdir(),'xcu-editops-mut-'));
    try{
      cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
      cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
      mkdirSync(join(dir,'tests','fixtures'),{recursive:true});
      cpSync(join(root,testPath),join(dir,testPath));
      cpSync(join(root,'tests/fixtures/uxml-s3-synthetic.workspace.input.xml'),
        join(dir,'tests/fixtures/uxml-s3-synthetic.workspace.input.xml'));
      writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
      const args=['--test','--test-name-pattern='+pattern,testPath];
      const green=run(dir,args);
      assert.equal(green.status,0,name+' control must be GREEN:\n'+green.stdout+'\n'+green.stderr);
      const path=join(dir,sourcePath),source=readFileSync(path,'utf8');
      assert.equal(source.split(oldText).length,2,
        name+' must replace exactly one known production seam');
      writeFileSync(path,source.replace(oldText,()=>replacement));
      const syntax=run(dir,['--check',sourcePath]);
      assert.equal(syntax.status,0,name+' mutant must remain valid JS:\n'+syntax.stderr);
      const red=run(dir,args);
      assert.notEqual(red.status,0,name+' should be RED but was GREEN:\n'+red.stdout);
      assert.match(red.stdout,/not ok /,name+' must fail a real test assertion');
      assert.doesNotMatch(red.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError/,
        name+' cannot be killed by a broken test environment');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}

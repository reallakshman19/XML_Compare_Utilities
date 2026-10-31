/** Permanent S3 isolated mutation-kill checks; no mutant committed to product. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const paths=[
  'uxml/UxmlConstants.js','uxml/UxmlTypes.js',
  'uxml/UxmlValidationGate.js','uxml/UxmlInputXmlSchemaMapper.js',
  'utils/line-no-metadata.js','tools/inputxml-to-uxml.mjs',
  'tests/uxml-s3-caesar-inputxml.test.mjs',
];
function isolated(fn) {
  const dest=mkdtempSync(join(tmpdir(),'uxml-s3-mutant-'));
  try {
    for(const sub of ['uxml','utils','tools','tests'])mkdirSync(join(dest,sub));
    for(const file of paths)copyFileSync(join(root,file),join(dest,file));
    writeFileSync(join(dest,'package.json'),'{"type":"module"}\n');
    return fn(dest);
  }finally{rmSync(dest,{recursive:true,force:true});}
}
function run(dest){
  return spawnSync(process.execPath,[
    '--test',
    '--test-name-pattern=strict source keys have unique zero-based record ordinal',
    'tests/uxml-s3-caesar-inputxml.test.mjs'
  ],{cwd:dest,encoding:'utf8',timeout:45000,
    env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT'))});
}
function killed(path,from,to,kind){
  isolated(dest=>{
    const green=run(dest);
    assert.equal(green.status,0,green.stdout+green.stderr);
    assert.match(green.stdout,/# pass 1\b/,'baseline selected test must really run');
    const destPath=join(dest,path),src=readFileSync(destPath,'utf8');
    assert.equal(src.split(from).length-1,1,'one precise production mutation seam');
    writeFileSync(destPath,src.replace(from,to));
    const red=run(dest),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,kind+' survived!\n'+output);
    assert.match(output,/^not ok \d+ -/m,'mutation must kill original test, not setup');
    assert.match(output,/# fail 1\b/,'exactly one targeted original test must fail');
    process.stdout.write('RED_VERIFIED '+kind+' status='+red.status+
      ' original regression # fail 1\n');
  });
}
test('S3_MUTANT_KILL_UNTRUSTED_ORIGIN: invented X=0 fails absolute source endpoint test',()=>{
  killed('uxml/UxmlInputXmlSchemaMapper.js',
    '  return {x,y,z};\n}\nfunction s3Loss',
    '  return {x:0,y,z};\n}\nfunction s3Loss',
    'ABSOLUTE_SOURCE_COORDINATE_MUTANT');
});
test('S3_MUTANT_KILL_RECORD_KEY: dropping source ordinal fails exact element identity test',()=>{
  killed('uxml/UxmlInputXmlSchemaMapper.js',
    "recordKey: 'E' + index + ':F' + encodeURIComponent(fromNode)",
    "recordKey: 'E0:F' + encodeURIComponent(fromNode)",
    'SOURCE_RECORD_ORDINAL_MUTANT');
});

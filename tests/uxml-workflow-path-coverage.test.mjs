/**
 * Fails closed if an isolated mutant clones a source file without its
 * owning workflow triggering on changes to that exact dependency.
 * Static grounded clone manifests (constant arrays + explicit directory copies).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const cases=[
  ['tests/uxml-s3-harden-mutants.test.mjs','.github/workflows/uxml-s3-harden-source-structure.yml'],
  ['tests/uxml-s3-caesar-mutants.test.mjs','.github/workflows/uxml-s3-inputxml.yml'],
  ['tests/uxml-s4-1-mutants.test.mjs','.github/workflows/uxml-s4-1-categorized-reader.yml'],
  ['tests/uxml-s4-2-mutants.test.mjs','.github/workflows/uxml-s4-2-patch-back.yml'],
  ['tests/uxml-s4-2-projection-mutants.test.mjs','.github/workflows/uxml-s4-2-slice2-projection.yml'],
  ['tests/uxml-b7-mutants.test.mjs','.github/workflows/uxml-b7-categorized-edit.yml'],
  ['tests/uxml-b8-mutants.test.mjs','.github/workflows/uxml-b8-categorized-coverage.yml'],
];
const escaped=s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&');
const matches=(pattern,path)=>{
  if(pattern.endsWith('/**'))return path.startsWith(pattern.slice(0,-2));
  const expr='^'+pattern.split('*').map(escaped).join('[^/]*')+'$';
  return new RegExp(expr).test(path);
};
function triggers(workflow){
  const lines=read(workflow).split(/\r?\n/);
  const start=lines.findIndex(x=>/^\s{4}paths:\s*$/.test(x));
  assert(start>=0,workflow+' is missing pull_request.paths');
  const found=[];
  for(let i=start+1;i<lines.length;i++){
    const m=/^\s{6}- ['"]([^'"]+)['"]/.exec(lines[i]);
    if(!m)break;
    found.push(m[1]);
  }
  assert(found.length>0,workflow+' has empty path trigger');
  return found;
}
function cloneManifest(harness){
  const code=read(harness);
  const firstFunction=code.indexOf('function ');
  assert(firstFunction>0,harness+' does not have a static clone prelude');
  const prelude=code.slice(0,firstFunction);
  const names=[...prelude.matchAll(/['"]((?:uxml|xml-compare|utils|tools|tests|docs|opt|converters|tabs)\/[a-zA-Z0-9_.\/-]+)['"]/g)].map(x=>x[1]);
  return [...new Set([harness,...names])];
}
function uncovered(paths,patterns){
  return paths.filter(path=>!patterns.some(pattern=>matches(pattern,path)));
}
for(const [harness,workflow] of cases){
  test('R2 workflow clone coverage '+harness,()=>{
    const clones=cloneManifest(harness),patterns=triggers(workflow);
    assert(clones.length>=6,'manifest must include a meaningful clone list');
    assert.deepEqual(uncovered(clones,patterns),[],workflow+' missed a cloned source');
    assert(clones.includes('uxml/UxmlInputXmlSourceFields.js'),
      'shared S3 source field dependency must be explicit');
  });
}
test('R2 B8 trigger covers cloned B7 controller test as well',()=>{
  assert.equal(uncovered(['tests/uxml-b7-controller.test.mjs'],
    triggers('.github/workflows/uxml-b8-categorized-coverage.yml')).length,0);
});
test('R2 original edit-ops workflow includes recursive cloned modules and source gate',()=>{
  const patterns=triggers('.github/workflows/uxml-edit-ops-patch-back.yml');
  const cloned=['uxml/UxmlInputXmlDeltaGraph.js','uxml/UxmlInputXmlSourceStructure.js',
    'uxml/UxmlInputXmlSourceFields.js','uxml/UxmlEditOpsPatchBack.js',
    'utils/line-no-metadata.js','docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
    'tests/fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml',
    'tests/uxml-edit-ops-step12-mutants.test.mjs',
    'tests/uxml-edit-ops-mutants.test.mjs'];
  assert.deepEqual(uncovered(cloned,patterns),[]);
  assert(patterns.includes('uxml/**')&&patterns.includes('utils/**'),
    'recursive uxml/ and utils/ clones must have recursive source triggers');
});
test('R2 coverage checker detects a missing source-field path',()=>{
  assert.deepEqual(uncovered(['uxml/UxmlInputXmlSourceFields.js'],
    ['uxml/UxmlInputXmlSchemaMapper.js']),['uxml/UxmlInputXmlSourceFields.js']);
});

/** S4.2 slice 2 isolated projection map and fail-closed mutation witness. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const patch='uxml/UxmlCategorizedPatchBack.js';
const map='uxml/UxmlCategorizedProjectionMap.js';
const files=[patch,map,'uxml/UxmlCategorizedInputXmlSchemaMapper.js',
  'uxml/UxmlInputXmlSchemaMapper.js','uxml/UxmlInputXmlSourceStructure.js',
  'uxml/UxmlInputXmlDeltaGraph.js','uxml/UxmlConstants.js','uxml/UxmlTypes.js',
  'uxml/UxmlValidationGate.js','xml-compare/CategorizedInputXmlConverter.js',
  'xml-compare/XmlCompareCoordinateSideload.js',
  'xml-compare/XmlCompareCoordinateDiagnostics.js','utils/line-no-metadata.js',
  'tests/uxml-s4-2-projection.test.mjs','tests/uxml-s4-2-patch-back.test.mjs',
  'docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
  'opt/mock-xml.xml','converters/scripts/pdf_inputxml_profile_bm_cii.xml'];
function kill({name,pattern,path=patch,edits}){
  const dir=mkdtempSync(join(tmpdir(),'s42-projection-mutant-'));
  try{
    for(const file of files){
      const target=join(dir,file);
      mkdirSync(dirname(target),{recursive:true});
      copyFileSync(join(root,file),target);
      if(process.env.S42_PROJECTION_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(file)){
        const original=readFileSync(target,'utf8');
        writeFileSync(target,original.replace(/\r?\n/g,'\r\n'));
      }
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const run=()=>spawnSync(process.execPath,[
      '--test','--test-name-pattern='+pattern,'tests/uxml-s4-2-projection.test.mjs'
    ],{cwd:dir,encoding:'utf8',timeout:70000,
      env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
    const green=run();
    assert.equal(green.status,0,'baseline not green '+name+'\n'+green.stdout+'\n'+green.stderr);
    assert.match(green.stdout,/# pass 1\b/,'exactly one original regression must run');
    let source=readFileSync(join(dir,path),'utf8').replace(/\r\n/g,'\n');
    for(const {old,replacement} of edits){
      assert.equal(source.split(old).length-1,1,'one exact mutation seam '+name);
      source=source.replace(old,replacement);
    }
    writeFileSync(join(dir,path),source);
    const red=run(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+name+'\n'+output);
    assert.match(output,/^not ok \d+ - S4\.2 slice2/m,'original test must be red');
    assert.match(output,/# fail 1\b/,'original test must fail, not just setup');
    process.stdout.write('RED_VERIFIED S4.2_SLICE2 '+name+
      ' original red simulatedCRLF='+Boolean(process.env.S42_PROJECTION_MUTANT_COPY_CRLF)+'\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const mutants=[
  {name:'PROJECTION_MAP_EXACT_ATTRIBUTE',path:map,
   pattern:'S4.2 slice2 S4.0 EXACT_MAP RouteGeometryBlock.DELTA_X',
   edits:[{old:"block:'RouteGeometryBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag",
     replacement:"block:'RouteGeometryBlock',tag,sourceTag:'PIPINGELEMENT',attribute:'DIAMETER'"}]},
  {name:'PROJECTION_VISIBLE_SOURCE_ORDINAL',
   pattern:'S4.2 slice2 REAL GRE DIAMETER middle eligible projection-only bytes',
   edits:[{old:"const row=sourceRows[ref?.elementIndex];",
     replacement:"const row=sourceRows[0];"}]},
  {name:'UNMAPPED_PROJECTION_REFUSAL',
   pattern:'S4.2 slice2 REFUSE unmapped/derived/line value edits and unknown tags',
   edits:[{old:"if(preflight.length)return fail(preflight[0].code,preflight);",
     replacement:"if(preflight.length)return fail(R.PARITY,preflight);"}]},
  {name:'CANONICAL_PROJECTION_ONLY_SHAPE',
   pattern:'S4.2 slice2 REFUSE mapped projection changed with an unrelated derived tag',
   edits:[
     {old:"if(preflight.length)return fail(preflight[0].code,preflight);",
      replacement:"if(false&&preflight.length)return fail(preflight[0].code,preflight);"},
     {old:"if(!projectionOnlyEquivalent&&editedCategorized!==canonical)",
      replacement:"if(false&& !projectionOnlyEquivalent&&editedCategorized!==canonical)"}
   ]},
  {name:'ROUNDTRIP_EXACT_TYPED_TEXT',
   pattern:'S4.2 slice2 REFUSE projection text that would be reformatted by S4.0',
   edits:[
     {old:"if(decoded===null||/[\\t\\r\\n]/.test(decoded)||\n         s40EscapeText(decoded)!==b.value){\n        errors.push(b8Refusal(R.ROUNDTRIP",
      replacement:"if(false&&(decoded===null||/[\\t\\r\\n]/.test(decoded)||\n         s40EscapeText(decoded)!==b.value)){\n        errors.push(b8Refusal(R.ROUNDTRIP"},
     {old:"if(!echo||echo.error||echo.value!==change.new)\n      return fail(R.ROUNDTRIP,[b8Refusal(R.ROUNDTRIP,\n        {row:change.index+1,",
      replacement:"if(false&&(!echo||echo.error||echo.value!==change.new))\n      return fail(R.ROUNDTRIP,[b8Refusal(R.ROUNDTRIP,\n        {row:change.index+1,"}
   ]},
  {name:'MIXED_SNAPSHOT_EXACT',
   pattern:'S4.2 slice2 REFUSE inconsistent projection plus mismatched OriginalElement',
   edits:[{old:"if(newSnapshots[i]!==oldSnapshots[i]&&\n       newSnapshots[i]!==snapshotBlock(canonicalElements[i].text))",
     replacement:"if(false&&(newSnapshots[i]!==oldSnapshots[i]&&\n       newSnapshots[i]!==snapshotBlock(canonicalElements[i].text)))"}]},
  {name:'ROW_CHILD_UNITS_IDENTITY',
   pattern:'S4.2 slice2 REFUSE modified UNITS directly below a source record',
   edits:[{old:"if(unit.name.toUpperCase()==='UNITS')",
     replacement:"if(false&&unit.name.toUpperCase()==='UNITS')"}]},
  {name:'NESTED_UNITS_ANCESTRY',
   pattern:'S4.2 slice2 REFUSE modified attribute below a nested UNITS child',
   edits:[{old:"if(unit.name.toUpperCase()==='UNITS')",
     replacement:"if(false&&unit.name.toUpperCase()==='UNITS')"}]},
  {name:'SIF_PER_BODY_OWNER_SCOPE',
   pattern:'S4.2 slice2 SIF ownership is local to each physical element body',
   edits:[{old:"if(tag==='SIF')return false;",
     replacement:"if(false&&tag==='SIF')return false;"}]},
  {name:'S40_CONVERSION_EXCEPTION_REFUSAL',
   pattern:'S4.2 slice2 REFUSE throwing S4.0 converter with named code and no bytes',
   edits:[{old:"try{authoritative=inputXmlToCategorizedInputXml(originalText);}\n  catch{return fail(R.CONVERTER);}",
     replacement:"try{authoritative=inputXmlToCategorizedInputXml(originalText);}\n  catch{throw Error('MUTATED_UNHANDLED_CONVERTER');}"}]},
  {name:'S40_MISMATCH_NAMED_CODE',
   pattern:'S4.2 slice2 PROJECTION_ONLY and consistent BOTH forms accept, snapshot-only stale refuses',
   edits:[{old:"if(regenerated!==editedCategorized)return fail(R.S40_MISMATCH);",
     replacement:"if(regenerated!==editedCategorized)return fail(R.DERIVED);"}]},
  {name:'OMITTED_PROJECTION_NO_INVENTION',
   pattern:'S4.2 slice2 REFUSE source field missing or absent from map',
   edits:[{old:"if(a?.error||b?.error||Boolean(a)!==Boolean(b)){\n        errors.push(b8Refusal(R.UNMAPPED",
     replacement:"if(false&&(a?.error||b?.error||Boolean(a)!==Boolean(b))){\n        errors.push(b8Refusal(R.UNMAPPED"},
     {old:"if(!a||a.value===b.value)continue;\n      const decoded=decodeValue(b.value);\n      if(decoded===null||/[\\t\\r\\n]/.test(decoded)||\n         s40EscapeText(decoded)!==b.value){",
      replacement:"if(a?.value===b?.value)continue;\n      const decoded=decodeValue(b.value);\n      if(decoded===null||/[\\t\\r\\n]/.test(decoded)||\n         s40EscapeText(decoded)!==b.value){"}]},
];
for(const mutant of mutants)test('S42_SLICE2_MUTANT_KILL_'+mutant.name,()=>kill(mutant));

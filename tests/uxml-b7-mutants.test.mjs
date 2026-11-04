import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const target='tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js';
const patchModules=[
  "uxml/UxmlCategorizedPatchBackSourceModel.js",
  "uxml/UxmlCategorizedPatchBackSourceIntegrity.js",
  "uxml/UxmlCategorizedPatchBackSlice1.js",
  "uxml/UxmlCategorizedPatchBackProjection.js",
  "uxml/UxmlCategorizedPatchBackCarry.js",
  "uxml/UxmlCategorizedPatchBackClassifier.js",
  "uxml/UxmlCategorizedPatchBackPreflight.js",
  "uxml/UxmlCategorizedPatchBackWriter.js"
];
const files=[...patchModules,target,'uxml/UxmlCategorizedPatchBack.js','uxml/UxmlCategorizedPatchBackProvenance.js',
  'uxml/UxmlCategorizedProjectionMap.js','uxml/UxmlCategorizedInputXmlSchemaMapper.js',
  'uxml/UxmlInputXmlSchemaMapper.js','uxml/UxmlInputXmlSourceStructure.js',
  'uxml/UxmlInputXmlDeltaGraph.js','uxml/UxmlConstants.js',
  'uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
  'xml-compare/CategorizedInputXmlConverter.js',
  'xml-compare/XmlCompareCoordinateSideload.js',
  'xml-compare/XmlCompareCoordinateDiagnostics.js',
  'utils/line-no-metadata.js','tests/uxml-b7-controller.test.mjs',
  'docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
  'opt/mock-xml.xml','converters/scripts/pdf_inputxml_profile_bm_cii.xml'];
const mutants=[
  {name:'DOWNLOAD_REQUIRES_CHECKED_EPOCH',
    pattern:'B7 failed/parity-wrong patch-back cannot release output bytes',
    old:'if(!current.canDownload)return null;',
    replacement:'if(false&&!current.canDownload)return null;'},
  {name:'EDIT_INVALIDATES_EVEN_IF_TEXT_RESTORED',
    pattern:'B7 input editing immediately invalidates download and revision',
    old:"if(String(value)!==edited){invalidate('ready');edited=String(value);}",
    replacement:"if(String(value)!==edited){edited=String(value);}"},
  {name:'DOWNLOAD_EXACT_ENGINE_BYTES',
    pattern:'B7 download is a defensive copy of engine result.bytes',
    old:'bytes:new Uint8Array(checked.bytes)',
    replacement:'bytes:utf8(checked.categorized)'},
  {name:'RELEASE_LAST_ASYNC_CHECK_EPOCH',
    pattern:'B7 release-last: an edit while Check pending blocks stale result',
    edits:[
      {old:'if(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256)\n      return snapshot();',
       replacement:'if(false&&(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256))\n      return snapshot();'},
      {old:'if(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256)return snapshot();',
       replacement:'if(false&&(ticket!==checkSerial||rev!==revision||value!==edited||sha!==fileSha256))return snapshot();'}
    ]},
  {name:'FILE_SWAP_INVALIDATES_VERIFIED_DOWNLOAD',
    pattern:'B7 new load starts by revoking old receipt before async file completion',
    old:"function beginLoad(){invalidate('loading');originalBytes=null;",
    replacement:"function beginLoad(){phase='loading';originalBytes=null;"},
  {name:'SOURCE_BYTES_SHA_REQUIRED',
    pattern:'B7 invalid measured SHA is refused before strict parser or binding',
    old:'if(!/^[a-f\\d]{64}$/i.test(String(sha)))return refuse(B7_REFUSALS.HASH);',
    replacement:'if(false&&!/^[a-f\\d]{64}$/i.test(String(sha)))return refuse(B7_REFUSALS.HASH);'},
  {name:'S3_SOURCE_ADMISSION_REQUIRED',
    pattern:'B7 strict reader with zero physical components refuses before categorized binder',
    old:'if(!parsed?.components?.length)return refuse(B7_REFUSALS.S3);',
    replacement:'if(false&&!parsed?.components?.length)return refuse(B7_REFUSALS.S3);'},
  {name:'S41_SOURCE_BIND_REQUIRED',
    pattern:'B7 a SOURCE_BOUND_READ_ONLY status with exportAllowed=true is still refused',
    old:'result.exportAllowed!==false',
    replacement:'false'},
  {name:'TEXTAREA_MIXED_EOL_SOURCE_WITNESS',
    pattern:'B7 HTML textarea CRLF normalization restores exact S4.0 mixed separators before Check',
    old:"return lines.map((line,i)=>line+(separators[i]??'')).join('');",
    replacement:'return domValue;'},
];
function runKill(mutant){
  const dir=mkdtempSync(join(tmpdir(),'uxml-b7-mutant-'));
  try{
    for(const file of files){
      const target=join(dir,file);
      mkdirSync(dirname(target),{recursive:true});
      copyFileSync(join(root,file),target);
      if(process.env.B7_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(file))
        writeFileSync(target,readFileSync(target,'utf8').replace(/\r?\n/g,'\r\n'));
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const run=()=>spawnSync(process.execPath,
      ['--test','--test-name-pattern='+mutant.pattern,
        'tests/uxml-b7-controller.test.mjs'],{
        cwd:dir,encoding:'utf8',timeout:85000,
        env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT')),
      });
    const green=run();
    assert.equal(green.status,0,'baseline not GREEN for '+mutant.name+'\n'+green.stdout+'\n'+green.stderr);
    const p=join(dir,target);
    let content=readFileSync(p,'utf8').replace(/\r\n/g,'\n');
    for(const edit of mutant.edits||[mutant]){
      assert.equal(content.split(edit.old).length-1,1,'one exact mutation seam '+mutant.name);
      content=content.replace(edit.old,edit.replacement);
    }
    writeFileSync(p,content);
    const red=run(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+mutant.name+'\n'+output);
    assert.match(output,/# fail [1-9]/,'original baseline regression must fail');
    assert.match(output,/not ok \d+ - B7 /,'B7 original test must be red');
    console.log('RED_VERIFIED B7 '+mutant.name+
      ' simulatedCRLF='+(process.env.B7_MUTANT_COPY_CRLF==='1'));
  }finally{rmSync(dir,{recursive:true,force:true});}
}
for(const mutant of mutants)test('B7_MUTANT_KILL_'+mutant.name,()=>runKill(mutant));

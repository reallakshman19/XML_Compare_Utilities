import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync}
  from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=[
  'uxml/UxmlCategorizedPatchBack.js','uxml/UxmlCategorizedProjectionMap.js',
  'uxml/UxmlCategorizedInputXmlSchemaMapper.js','uxml/UxmlInputXmlSchemaMapper.js',
  'uxml/UxmlInputXmlSourceStructure.js','uxml/UxmlInputXmlDeltaGraph.js',
  'uxml/UxmlConstants.js','uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
  'xml-compare/CategorizedInputXmlConverter.js',
  'xml-compare/XmlCompareCoordinateSideload.js',
  'xml-compare/XmlCompareCoordinateDiagnostics.js',
  'utils/line-no-metadata.js',
  'tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js',
  'tests/uxml-b8-extended.test.mjs','tests/uxml-b8-coverage.test.mjs',
  'tests/uxml-b7-controller.test.mjs',
  'docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
  'opt/mock-xml.xml','converters/scripts/pdf_inputxml_profile_bm_cii.xml',
];
const b8='tests/uxml-b8-extended.test.mjs';
const b7='tests/uxml-b7-controller.test.mjs';
const mutants=[
  {name:'LINE_MAP_ENTRY_MISSING',path:'uxml/UxmlCategorizedProjectionMap.js',
    pattern:'^B8 exact line map enumerates all',target:b8,
    edits:[{old:"...Array.from({length:9},(_,i)=>'PRESSURE'+(i+1)),",
      replacement:"...Array.from({length:0},(_,i)=>'PRESSURE'+(i+1)),"}]},
  {name:'ONE_EXPLICIT_HOLDER_SKIPPED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 source-bound exact S4.0 ProcessBlock.PRESSURE1$',target:b8,
    edits:[{old:'for(const item of active)addSource(item,decoded,location);',
      replacement:'for(const item of active.slice(0,1))addSource(item,decoded,location);'}]},
  {name:'SENTINEL_WRITTEN',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 source-bound exact S4.0 ProcessBlock.PRESSURE1$',target:b8,
    edits:[{old:'if(s40.isUnset(decodedOld))continue; // -1.0101 or empty carry-forward',
      replacement:'if(false&&s40.isUnset(decodedOld))continue; // MUTATED'}]},
  {name:'DERIVED_DISAGREEMENT_IGNORED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 inconsistent same-line explicit source values refuse',target:b8,
    edits:[{old:'if(s40EscapeText(decodedOld)!==old){',
      replacement:'if(false&&s40EscapeText(decodedOld)!==old){'}]},
  {name:'GLOBAL_SHARED_NOT_NAMED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 global stanza refusal and unrelated unmapped edits',target:b8,
    edits:[{old:'if(JSON.stringify(b8Allowable(old.text))!==JSON.stringify(b8Allowable(next.text))){',
      replacement:'if(false&&JSON.stringify(b8Allowable(old.text))!==JSON.stringify(b8Allowable(next.text))){'}]},
  {name:'REFUSAL_ROW_AND_TAG_OMITTED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 global stanza refusal and unrelated unmapped edits',target:b8,
    edits:[{old:'return {code,line,row,tag,reason};',
      replacement:'return {code,line:null,row:null,tag:null,reason};'}]},
  {name:'SOURCE_NAME_INVENTED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 physical existing NAME editable',target:b8,
    edits:[{old:"errors.push(b8Refusal(R.OMITTED,{...location,\n        reason:entry.tag==='NAME'\n          ?'S4.0 displays an element-key fallback; source NAME attribute is absent'",
      replacement:"errors.push(b8Refusal(R.UNMAPPED,{...location,\n        reason:entry.tag==='NAME'\n          ?'S4.0 displays an element-key fallback; source NAME attribute is absent'"}]},
  {name:'STALE_EDITOR_SNAPSHOT_TERM',path:'tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js',
    pattern:'^B8 controller snapshot terms reject stale editor',target:b8,
    edits:[{old:'checked.editor===edited&&checked.originalSha===fileSha256&&',
      replacement:'true&&checked.originalSha===fileSha256&&'}]},
  {name:'STALE_SOURCE_SHA_SNAPSHOT_TERM',path:'tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js',
    pattern:'^B8 controller snapshot terms reject stale original SHA',target:b8,
    edits:[{old:'checked.editor===edited&&checked.originalSha===fileSha256&&',
      replacement:'checked.editor===edited&&true&&'}]},
  {name:'CROSS_LINE_CARRY_CHAIN_BYPASS',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 cross-Line carry-forward sentinel cannot inherit',target:b8,
    edits:[{old:"if(downstream!==lineId){",
      replacement:"if(false&&downstream!==lineId){"}]},
  {name:'EQUAL_VALUE_CROSS_LINE_FALSE_HOLD',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 equal-value cross-Line explicitly breaks carry chain',target:b8,
    edits:[{old:"if(!s40.isUnset(rawValue))break; // a new explicit holder ends this chain",
      replacement:"if(false&&!s40.isUnset(rawValue))break; // MUTATED"}]},
  {name:'COMBINED_LINE_ELEMENT_REFUSAL_DROPPED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 global line preflight and mapped element bad typed value',target:b8,
    edits:[{old:"const errors=[...preflight];",replacement:"const errors=[];"}]},
  {name:'STRICT_S3_RECORD_KEY_PARITY_BYPASS',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 strict S3 recordKey parity requires',target:b8,
    edits:[{old:"export const s42StrictS3KeysEqual=(before,after)=>equalArray(refKeys(before),refKeys(after));",
      replacement:"export const s42StrictS3KeysEqual=(before,after)=>true;"}]},
  {name:'FORMATTING_REASON_LOST',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 same-Line formatting disagreement',target:b8,
    edits:[{old:"const formatOnly=Number.isFinite(Number(decodedOld))&&",
      replacement:"const formatOnly=false&&Number.isFinite(Number(decodedOld))&&"}]},
  {name:'TYPED_ROW_WITNESS_DROPPED',path:'uxml/UxmlCategorizedPatchBack.js',
    pattern:'^B8 source-bound exact S4.0 ProcessBlock.PRESSURE1$',target:b8,
    edits:[{old:"typedWitnesses.has(\n        JSON.stringify([x.recordKey,x.field.replace(/^PIPINGELEMENT\\./,''),x.new]))",
      replacement:"typedWitnesses.has(\n        JSON.stringify([undefined,x.field.replace(/^PIPINGELEMENT\\./,''),x.new]))"}]},
  {name:'UI_PARITY_GATE_BYPASSED',
    path:'tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js',
    pattern:'^B7 failed/parity-wrong patch-back cannot release output bytes',target:b7,
    edits:[{old:"if(result?.ok!==true||result.parity!=='EQUAL'||!(result.bytes instanceof Uint8Array))",
      replacement:"if(result?.ok!==true||false||!(result.bytes instanceof Uint8Array))"}]},
];
function kill(m){
  const dir=mkdtempSync(join(tmpdir(),'uxml-b8-mutant-'));
  try{
    for(const path of files){
      const target=join(dir,path);
      mkdirSync(dirname(target),{recursive:true});
      copyFileSync(join(root,path),target);
      if(process.env.B8_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(path))
        writeFileSync(target,readFileSync(target,'utf8').replace(/\r?\n/g,'\r\n'));
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const run=()=>spawnSync(process.execPath,['--test','--test-name-pattern='+m.pattern,m.target],
      {cwd:dir,encoding:'utf8',timeout:90000,
        env:Object.fromEntries(Object.entries(process.env)
          .filter(([k])=>k!=='NODE_TEST_CONTEXT'))});
    const green=run();
    assert.equal(green.status,0,'baseline test not green '+m.name+'\n'+green.stdout+'\n'+green.stderr);
    assert.match(green.stdout,/# pass 1\b/);
    let source=readFileSync(join(dir,m.path),'utf8').replace(/\r\n/g,'\n');
    for(const {old,replacement} of m.edits){
      assert.equal(source.split(old).length-1,1,'single mutation seam '+m.name+' '+old);
      source=source.replace(old,replacement);
    }
    writeFileSync(join(dir,m.path),source);
    const red=run(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+m.name+'\n'+output);
    assert.match(output,/^not ok \d+ - (?:B8|B7)/m);
    assert.match(output,/# fail 1\b/);
    console.log('RED_VERIFIED UXML_B8 '+m.name+
      ' simulatedCRLF='+Boolean(process.env.B8_MUTANT_COPY_CRLF));
  }finally{rmSync(dir,{recursive:true,force:true});}
}
for(const m of mutants)test('B8_MUTANT_KILL_'+m.name,()=>kill(m));

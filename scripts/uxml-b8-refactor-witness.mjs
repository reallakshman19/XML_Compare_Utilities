// B8-LEFTOVERS: source-authoritative semantic equivalence, BEFORE vs AFTER.
// Baseline is the exact merged B8 source file from immutable main commit.
// All public categorized section + Line leaves: never "approve" new behavior.
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,symlinkSync,rmSync}
  from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {inputXmlToCategorizedInputXml as s40}
  from '../xml-compare/CategorizedInputXmlConverter.js';
import {S42_PROJECTION_MAP,S42_LINE_FIELDS,categorizedLineRanges,
  categorizedElementRanges,projectionLeaf}
  from '../uxml/UxmlCategorizedProjectionMap.js';
import * as current from '../uxml/UxmlCategorizedPatchBack.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const BASE='ddd3ebc770359a25e9f0e74b2ea71fa2c063e272';
const samples=[
 ['GRE','docs/GREInputxml.xml'],['PLB314','docs/PLB314Inputxml.xml'],
 ['mock','opt/mock-xml.xml'],['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const stable=(x)=>JSON.parse(JSON.stringify(x));
function semantic(out){
  return stable({
    ok:out.ok,code:out.code||null,parity:out.parity||null,
    bytesSha256:out.bytes?hash(out.bytes):null,
    changes:(out.changes||[]).map(x=>({
      recordKey:x.recordKey,field:x.field,old:x.old,new:x.new,byteRange:x.byteRange,
      writtenExactlyAsTyped:x.writtenExactlyAsTyped===true,
    })),
    inheritedRows:(out.inheritedRows||[]).map(x=>({
      row:x.row,tag:x.tag,oldEffective:x.oldEffective,newEffective:x.newEffective,
    })),
    refusals:(out.refusals||[]).map(x=>({code:x.code,line:x.line,
      row:x.row,tag:x.tag})),
  });
}
function edit(baseline,choice){
  const sections=choice.key.startsWith('E:');
  const indexes=choice.key.split(':');
  const row=Number(indexes[1]),tag=indexes[2];
  const entry=sections?S42_PROJECTION_MAP.find(x=>x.tag===tag):
    S42_LINE_FIELDS.find(x=>x.tag===tag);
  const location=(sections?categorizedElementRanges(baseline):
    categorizedLineRanges(baseline))[row];
  if(!location||!entry)return null;
  const leaf=projectionLeaf(location.text,entry);
  if(!leaf||leaf.error||choice.probeValue===null)return null;
  return baseline.slice(0,location.start+leaf.start)+choice.probeValue+
    baseline.slice(location.start+leaf.end);
}
function prepareBaseline(){
  const dir=mkdtempSync(join(tmpdir(),'uxml-b8-baseline-'));
  mkdirSync(join(dir,'uxml'),{recursive:true});
  writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
  const git=spawnSync('git',['show',BASE+':uxml/UxmlCategorizedPatchBack.js'],
    {cwd:root,encoding:'utf8',maxBuffer:15_000_000});
  if(git.status!==0)throw Error('Exact merged-B8 source unavailable: '+git.stderr);
  writeFileSync(join(dir,'uxml/UxmlCategorizedPatchBack.js'),git.stdout);
  for(const name of readdirSync(join(root,'uxml'))){
    if(name==='UxmlCategorizedPatchBack.js')continue;
    symlinkSync(join(root,'uxml',name),join(dir,'uxml',name));
  }
  for(const name of ['xml-compare','utils']){
    symlinkSync(join(root,name),join(dir,name));
  }
  return {dir,baselineFileSha256:hash(git.stdout)};
}
const {dir,baselineFileSha256}=prepareBaseline();
try{
  const baselineModule=await import(pathToFileURL(join(dir,'uxml/UxmlCategorizedPatchBack.js')).href);
  const cases=[],totals={sections:0,lines:0,attempts:0,accepted:0,refused:0,skipped:0};
  for(const [name,path] of samples){
    const source=readFileSync(join(root,path),'utf8'),cat=s40(source),
      fileSha256=hash(source);
    const oldChoice=await baselineModule.classifyCategorizedEditableFields(
      source,cat,{fileSha256});
    const newChoice=await current.classifyCategorizedEditableFields(
      source,cat,{fileSha256});
    assert.equal(oldChoice.ok,true,name+' original must bind baseline');
    assert.equal(newChoice.ok,true,name+' original must bind current');
    const byKey=new Map(newChoice.choices.map(x=>[x.key,x]));
    for(const choice of oldChoice.choices){
      const section=/^E:\d+:(?:DIAMETER|WALL_THICK|INSUL_THICK)$/.test(choice.key);
      const line=choice.key.startsWith('L:');
      if(!section&&!line)continue;
      const now=byKey.get(choice.key);
      assert(now,name+': missing '+choice.key);
      assert.deepEqual(
        {editable:now.editable,code:now.code,probeValue:now.probeValue},
        {editable:choice.editable,code:choice.code,probeValue:choice.probeValue},
        name+': classifier changed acceptance '+choice.key);
      totals[section?'sections':'lines']++;
      const proposal=edit(cat,choice);
      if(proposal===null){
        totals.skipped++;
        cases.push({name,key:choice.key,skipped:'No meaningful typed probe',
          editable:choice.editable,code:choice.code});
        continue;
      }
      const before=semantic(await baselineModule.patchOriginalFromCategorized(
        source,cat,proposal,{fileSha256}));
      const after=semantic(await current.patchOriginalFromCategorized(
        source,cat,proposal,{fileSha256}));
      assert.deepEqual(after,before,name+': patch changed '+choice.key);
      if(before.ok)totals.accepted++;else totals.refused++;
      totals.attempts++;
      cases.push({name,key:choice.key,editable:choice.editable,
        before,after});
    }
  }
  const report={
    schema:'UXML_B8_LEFTOVERS_SEMANTIC_WITNESS_V2',base:BASE,
    baselineFileSha256,currentFileSha256:hash(readFileSync(
      join(root,'uxml/UxmlCategorizedPatchBack.js'))),
    exactEqual:true,totals,cases,
  };
  const output=join(root,'artifacts/uxml-b8-leftovers/refactor-before-after.json');
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log('B8_LEFTOVERS_BEFORE_AFTER '+JSON.stringify({
    base:BASE,baselineFileSha256,currentFileSha256:report.currentFileSha256,
    ...totals,semanticMismatches:0,artifact:output,
  }));
}finally{rmSync(dir,{recursive:true,force:true});}

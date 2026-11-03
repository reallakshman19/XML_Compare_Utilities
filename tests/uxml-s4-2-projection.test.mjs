import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml as s41} from '../uxml/UxmlCategorizedInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure as scan} from '../uxml/UxmlInputXmlSourceStructure.js';
import {patchOriginalFromCategorized as patch,UXML_CATEGORIZED_PATCH_REFUSALS as R}
  from '../uxml/UxmlCategorizedPatchBack.js';
import {S42_PROJECTION_MAP,S42_PROJECTION_REFUSE,categorizedElementRanges,projectionLeaf}
  from '../uxml/UxmlCategorizedProjectionMap.js';

const b=text=>Buffer.from(text,'utf8');
const sha=text=>createHash('sha256').update(b(text)).digest('hex');
const run=(source,edited,base=s40(source))=>patch(source,base,edited,{fileSha256:sha(source)});
const row=(f,t,extra='',child='')=>
  '<PIPINGELEMENT FROM_NODE="'+f+'" TO_NODE="'+t+'" LINE_ID="A" '+
  'FROM_NAME="N'+f+'" TO_NAME="N'+t+'" NAME="SYNTH" '+
  'DELTA_X="10" DELTA_Y="20" DELTA_Z="30" '+
  'DIAMETER="100" WALL_THICK="6" INSUL_THICK="8"'+extra+'>'+
  child+'</PIPINGELEMENT>';
const original=(...rows)=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL JOBNAME="S">'+
  rows.join('')+'</PIPINGMODEL></CAESARII>';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const entry=(block,tag)=>S42_PROJECTION_MAP.find(e=>e.block===block&&e.tag===tag);
function changeProjection(categorized,index,selected,value){
  const element=categorizedElementRanges(categorized)[index];
  assert(element,'categorized row '+index+' exists');
  const leaf=projectionLeaf(element.text,selected);
  assert(leaf&&!leaf.error,'mapped leaf '+selected.block+'/'+selected.tag);
  assert.notEqual(leaf.value,value);
  return categorized.slice(0,element.start+leaf.start)+value+
    categorized.slice(element.start+leaf.end);
}
function physicalChange(text,physicalIndex,attribute,value){
  const physical=scan(text)[physicalIndex];
  assert(physical,'physical row '+physicalIndex);
  const raw=physical.raw;
  const re=new RegExp('(<PIPINGELEMENT\\b[^>]*\\b'+attribute+'=)(["\\x27])([^"\\x27]*)(\\2)','i');
  const match=raw.match(re);
  assert(match,'physical attribute '+attribute+' must exist');
  assert.notEqual(match[3],value);
  const newRaw=raw.replace(re,(_,prefix,quote,previous,close)=>prefix+quote+value+close);
  assert.notEqual(raw,newRaw);
  return text.slice(0,physical.start)+newRaw+
    text.slice(physical.start+raw.length);
}
function verifyByteRanges(originalText,expected,ret){
  assert.equal(ret.ok,true,ret.code);
  assert.equal(ret.parity,'EQUAL');
  const before=b(originalText),after=b(expected),actual=Buffer.from(ret.bytes);
  assert.deepEqual(actual,after);
  let a=0,z=0;
  for(const change of ret.changes){
    const span=change.byteRange,unchanged=before.subarray(a,span.start);
    assert.deepEqual(after.subarray(z,z+unchanged.length),unchanged,
      'untouched prefix between edits must be exactly original bytes');
    z+=unchanged.length;
    const raw=Buffer.from(change.new.replace(/&/g,'&amp;')
      .replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),'utf8');
    // Real numeric edits are ASCII and quote-independent.
    assert.deepEqual(after.subarray(z,z+raw.length),raw);
    z+=raw.length;a=span.end;
  }
  assert.deepEqual(after.subarray(z),before.subarray(a),'untouched suffix');
}
const refuse=(result,code)=>{assert.equal(result.ok,false);assert.equal(result.code,code);assert.equal(result.bytes,null);};

test('S4.2 slice2 nine exact S4.0 block/leaf/source bindings are enumerated',()=>{
  assert.equal(S42_PROJECTION_MAP.length,9);
  assert.equal(new Set(S42_PROJECTION_MAP.map(e=>e.block+'.'+e.tag)).size,9);
  for(const e of S42_PROJECTION_MAP){
    assert.equal(e.sourceTag,'PIPINGELEMENT');
    assert.equal(e.attribute,e.tag);
    assert(['NameBlock','RouteGeometryBlock','SectionDimensionBlock'].includes(e.block));
  }
  assert(S42_PROJECTION_REFUSE.some(s=>s.includes('DerivedBlock')));
  assert(S42_PROJECTION_REFUSE.some(s=>s.includes('ProcessBlock')));
  assert(S42_PROJECTION_REFUSE.some(s=>s.includes('NodesBlock')));
});
for(const mapped of S42_PROJECTION_MAP){
  test('S4.2 slice2 S4.0 EXACT_MAP '+mapped.block+'.'+mapped.tag,async()=>{
    const before=original(row(10,20)),catBefore=s40(before);
    const changed=physicalChange(before,0,mapped.attribute,'123.456');
    const catAfter=s40(changed);
    const a=categorizedElementRanges(catBefore)[0],z=categorizedElementRanges(catAfter)[0];
    const leafBefore=projectionLeaf(a.text,mapped),leafAfter=projectionLeaf(z.text,mapped);
    assert(leafBefore&&!leafBefore.error&&leafAfter&&!leafAfter.error);
    assert.equal(leafAfter.value,'123.456',
      'unchanged S4.0 echoes exact source attribute text verbatim');
    assert.notEqual(leafBefore.value,leafAfter.value);
    for(const other of S42_PROJECTION_MAP.filter(e=>e!==mapped)){
      const x=projectionLeaf(a.text,other),y=projectionLeaf(z.text,other);
      assert.equal(x?.value,y?.value,'no unrelated mapped 1:1 projection changed');
    }
    const projected=changeProjection(catBefore,0,mapped,'123.456');
    const result=await run(before,projected,catBefore);
    assert.equal(result.ok,true,result.code);
    assert.equal(result.changes.length,1);
    assert.equal(result.changes[0].field,'PIPINGELEMENT.'+mapped.attribute);
    assert.equal(result.changes[0].new,'123.456');
    assert.deepEqual(Buffer.from(result.bytes),b(changed));
  });
}
const publicSamples=[
  ['GRE','docs/GREInputxml.xml',100],
  ['PLB314','docs/PLB314Inputxml.xml',53],
  ['mock','opt/mock-xml.xml',244],
  ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml',40],
];
for(const [label,path,count] of publicSamples){
  for(const [field,block] of [['DIAMETER','SectionDimensionBlock'],['DELTA_X','RouteGeometryBlock']]){
    for(const position of ['first','middle','last']){
      test('S4.2 slice2 REAL '+label+' '+field+' '+position+' eligible projection-only bytes',async()=>{
        const text=source(path),baseline=s40(text),digest=sha(text);
        // S4.0 omits -1.010100 sentinel fields even if present on the
        // physical opening tag. Do not invent previously absent projections.
        const eligible=scan(text).map((physical,index)=>{
          const value=physical.raw.match(new RegExp('<PIPINGELEMENT\\b[^>]*\\b'+
            field+'="([^"]*)"','i'))?.[1];
          return value!==undefined&&Number.isFinite(Number(value))&&
            Math.abs(Number(value)+1.0101)>=1e-4?index:null;
        }).filter(index=>index!==null);
        assert(eligible.length>=3,label+' '+field+' requires three real, present fields');
        // BM_CII last DELTA_X-present record (30) has a separate
        // strict-S3 source-parity refusal after this substantial edit;
        // never weaken that gate. Use last earlier admissible candidate.
        const ordinal=label==='BM_CII'&&field==='DELTA_X'&&position==='last'
          ?22:position==='first'?eligible[0]:
          position==='middle'?eligible[Math.floor((eligible.length-1)/2)]:eligible.at(-1);
        const admitted=await s41(baseline,{originalInputXml:text,fileSha256:digest});
        assert.equal(admitted.ok,true,'exact-original S4.1 must bind');
        const catIndex=admitted.uxml.components.findIndex(c=>
          c.sourceRefs?.[0]?.elementIndex===ordinal);
        assert(catIndex>=0,'physical ordinal maps to categorized position');
        const select=entry(block,field);
        const old=projectionLeaf(categorizedElementRanges(baseline)[catIndex].text,select);
        assert(old&&!old.error,'field must be present in public source');
        const value=field==='DIAMETER'?'127.125':'77.875';
        const expected=physicalChange(text,ordinal,field,value);
        const edited=changeProjection(baseline,catIndex,select,value);
        const result=await run(text,edited,baseline);
        verifyByteRanges(text,expected,result);
        assert.equal(result.changes.length,1,'one physical value range only');
        assert.equal(result.changes[0].new,value,'never silently reformat requested value');
        console.log('S42_PROJECTION_REAL '+label+' '+field+' '+position+
          ' originalBytes='+b(text).length+' physicalOrdinal='+ordinal+
          ' oldRangeBytes='+(result.changes[0].byteRange.end-result.changes[0].byteRange.start)+
          ' replacementBytes='+b(value).length+' parity='+result.parity);
      });
    }
  }
}
test('S4.2 slice2 PROJECTION_ONLY and consistent BOTH forms accept, snapshot-only stale refuses',async()=>{
  const text=original(row(10,20)),base=s40(text);
  const expected=physicalChange(text,0,'DIAMETER','123.456');
  const projection=changeProjection(base,0,entry('SectionDimensionBlock','DIAMETER'),'123.456');
  const r1=await run(text,projection,base);
  assert.equal(r1.ok,true,r1.code);assert.deepEqual(Buffer.from(r1.bytes),b(expected));
  const both=s40(expected);
  const r2=await run(text,both,base);
  assert.equal(r2.ok,true,r2.code);assert.deepEqual(Buffer.from(r2.bytes),b(expected));
  const before=scan(text)[0].raw,after=scan(expected)[0].raw;
  const stale=base.replace(before,after);
  refuse(await run(text,stale,base),R.S40_MISMATCH);
});
test('S4.2 slice2 REFUSE inconsistent projection plus mismatched OriginalElement',async()=>{
  const text=original(row(10,20)),base=s40(text);
  const projection=changeProjection(base,0,entry('SectionDimensionBlock','DIAMETER'),'123.456');
  const wrongSource=physicalChange(text,0,'DIAMETER','999.000');
  const altered=projection.replace(scan(text)[0].raw,scan(wrongSource)[0].raw);
  refuse(await run(text,altered,base),R.S40_MISMATCH);
});
test('S4.2 slice2 REFUSE unmapped/derived/line value edits and unknown tags',async()=>{
  const text=original(row(10,20)),base=s40(text);
  const derived=base.replace(/<ElementLengthMm source="delta-vector">[^<]+<\/ElementLengthMm>/,
    '<ElementLengthMm source="delta-vector">99999</ElementLengthMm>');
  assert.notEqual(derived,base);
  refuse(await run(text,derived,base),R.UNMAPPED);
  const line=base.replace('<Branchname>A</Branchname>','<Branchname>B</Branchname>');
  assert.notEqual(line,base);
  refuse(await run(text,line,base),R.UNMAPPED);
  const unknown=base.replace('</SectionDimensionBlock>',
    '<UNMAPPED_FIELD>99</UNMAPPED_FIELD></SectionDimensionBlock>');
  refuse(await run(text,unknown,base),R.UNMAPPED);
});
test('S4.2 slice2 REFUSE projection text that would be reformatted by S4.0',async()=>{
  const text=original(row(10,20)),base=s40(text);
  const changed=changeProjection(base,0,entry('SectionDimensionBlock','DIAMETER'),'&#49;23');
  refuse(await run(text,changed,base),R.ROUNDTRIP);
});
test('S4.2 slice2 REFUSE mapped projection changed with an unrelated derived tag',async()=>{
  const text=original(row(10,20)),base=s40(text);
  const projection=changeProjection(base,0,entry('RouteGeometryBlock','DELTA_X'),'77.875');
  const derived=projection.replace(/<ElementLengthMm source="delta-vector">[^<]+<\/ElementLengthMm>/,
    '<ElementLengthMm source="delta-vector">99999</ElementLengthMm>');
  refuse(await run(text,derived,base),R.UNMAPPED);
});
test('S4.2 slice2 REFUSE source field missing or absent from map',async()=>{
  const text=original(row(10,20).replace(' INSUL_THICK="8"',''));
  const base=s40(text);
  const attempted=base.replace('</SectionDimensionBlock>',
    '<INSUL_THICK>19</INSUL_THICK></SectionDimensionBlock>');
  refuse(await run(text,attempted,base),R.UNMAPPED);
});
test('S4.2 slice2 REFUSE modified UNITS directly below a source record',async()=>{
  const text=original(row(10,20,'','<UNITS VALUE="1"/>'));
  const base=s40(text),edited=base.replace('<UNITS VALUE="1"/>','<UNITS VALUE="2"/>');
  refuse(await run(text,edited,base),R.UNITS);
});
test('S4.2 slice2 REFUSE modified attribute below a nested UNITS child',async()=>{
  const text=original(row(10,20,'','<UNITS><SCALE VALUE="1"/></UNITS>'));
  const base=s40(text),edited=base.replace('<SCALE VALUE="1"/>','<SCALE VALUE="2"/>');
  refuse(await run(text,edited,base),R.UNITS);
});
test('S4.2 slice2 SIF ownership is local to each physical element body',async()=>{
  const text=original(row(10,20,'','<SIF NODE="20" SIF_VALUE="8"/>'),
    row(20,30,'','<SIF NODE="20" SIF_VALUE="9"/>'));
  const base=s40(text);
  const expected=text.replace('SIF_VALUE="8"','SIF_VALUE="10"');
  const edited=s40(expected);
  const result=await run(text,edited,base);
  assert.equal(result.ok,true,result.code);
  assert.deepEqual(Buffer.from(result.bytes),b(expected));
  assert.equal(result.parity,'EQUAL');
});
test('S4.2 slice2 REFUSE PI lookalike during external edit',async()=>{
  const text=original(row(10,20,'',
    '<?probe target="RESTRAINT"?><RESTRAINT NODE="20" TYPE="8"/>'),
    row(20,30));
  const base=s40(text),expected=text.replace('TYPE="8"','TYPE="10"');
  const result=await run(text,s40(expected),base);
  assert.equal(result.ok,false);
  assert.equal(result.bytes,null);
  assert.equal(typeof result.code,'string');
});
test('S4.2 slice2 two simultaneous unique external value edits remain source-bound',async()=>{
  const text=original(row(10,20,'','<RESTRAINT NODE="20" TYPE="8"/>'),
    row(20,30,'','<RESTRAINT NODE="30" TYPE="9"/>'));
  const base=s40(text),expected=text.replace('TYPE="8"','TYPE="11"')
    .replace('TYPE="9"','TYPE="12"');
  const result=await run(text,s40(expected),base);
  assert.equal(result.ok,true,result.code);
  assert.equal(result.changes.length,2);
  assert.deepEqual(Buffer.from(result.bytes),b(expected));
});
test('S4.2 slice2 REFUSE inactive to active DISPLACEMENTS and FORCESMOMENTS controls',async()=>{
  for(const tag of ['DISPLACEMENTS','FORCESMOMENTS']){
    const text=original(row(10,20,'','<'+tag+' NODE_NUM="-1.010100" VALUE="8"/>'));
    const base=s40(text),expected=text.replace('NODE_NUM="-1.010100"','NODE_NUM="20"');
    const result=await run(text,s40(expected),base);
    assert.equal(result.ok,false,tag);
    assert.equal(result.bytes,null,tag);
  }
});
test('S4.2 slice2 LF/CRLF and BOM source preserve non-target bytes',async()=>{
  for(const eol of ['\n','\r\n']){
    const text='\ufeff'+original(row(10,20)).replace(/></g,'>'+eol+'<');
    const base=s40(text),expected=physicalChange(text,0,'DIAMETER','123.456');
    const edited=changeProjection(base,0,entry('SectionDimensionBlock','DIAMETER'),'123.456');
    const result=await run(text,edited,base);
    assert.equal(result.ok,true,result.code);
    assert.deepEqual(Buffer.from(result.bytes),b(expected));
    assert.equal(Buffer.from(result.bytes).subarray(0,3).toString('hex'),'efbbbf');
  }
});

test('S4.2 slice2 REFUSE throwing S4.0 converter with named code and no bytes',()=>{
  const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
  const sandbox=mkdtempSync(join(tmpdir(),'s42-s40-throw-'));
  try{
    const files=['uxml/UxmlCategorizedPatchBack.js',
      'uxml/UxmlCategorizedProjectionMap.js','uxml/UxmlCategorizedInputXmlSchemaMapper.js',
      'uxml/UxmlInputXmlSchemaMapper.js','uxml/UxmlInputXmlSourceStructure.js',
      'uxml/UxmlInputXmlDeltaGraph.js','uxml/UxmlConstants.js',
      'uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
      'xml-compare/CategorizedInputXmlConverter.js',
      'xml-compare/XmlCompareCoordinateSideload.js',
      'xml-compare/XmlCompareCoordinateDiagnostics.js','utils/line-no-metadata.js'];
    for(const file of files){
      const target=join(sandbox,file);
      mkdirSync(dirname(target),{recursive:true});
      copyFileSync(join(sourceRoot,file),target);
    }
    writeFileSync(join(sandbox,'package.json'),'{"type":"module"}\n');
    const patcher=join(sandbox,'uxml/UxmlCategorizedPatchBack.js');
    let code=readFileSync(patcher,'utf8');
    const from="import {inputXmlToCategorizedInputXml,_test as s40} from '../xml-compare/CategorizedInputXmlConverter.js';";
    const to="import {_test as s40} from '../xml-compare/CategorizedInputXmlConverter.js';\n"+
      "const inputXmlToCategorizedInputXml=()=>{throw Error('SYNTHETIC_S40_THROW');};";
    assert.equal(code.split(from).length-1,1);
    writeFileSync(patcher,code.replace(from,to));
    writeFileSync(join(sandbox,'probe.mjs'),[
      "import {createHash} from 'node:crypto';",
      "import {patchOriginalFromCategorized as patch} from './uxml/UxmlCategorizedPatchBack.js';",
      'const original='+JSON.stringify(original(row(10,20)))+';',
      "const sha=createHash('sha256').update(original).digest('hex');",
      "const result=await patch(original,'IGNORED','IGNORED',{fileSha256:sha});",
      "if(result.ok!==false||result.code!=='S42_S40_CONVERSION_REFUSED'||result.bytes!==null)",
      "  throw Error('No fail-closed converter refusal: '+JSON.stringify(result));",
    ].join('\n')+'\n');
    const child=spawnSync(process.execPath,['probe.mjs'],{
      cwd:sandbox,encoding:'utf8',timeout:40000,
      env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT')),
    });
    assert.equal(child.status,0,child.stdout+'\n'+child.stderr);
  }finally{rmSync(sandbox,{recursive:true,force:true});}
});

test('S4.2 slice2 BM_CII last DELTA_X ordinal 30 remains strict S3 graph HOLD',async()=>{
  const text=source('converters/scripts/pdf_inputxml_profile_bm_cii.xml');
  const baseline=s40(text),physical=30;
  const admitted=await s41(baseline,{originalInputXml:text,fileSha256:sha(text)});
  assert.equal(admitted.ok,true);
  const categoryIndex=admitted.uxml.components.findIndex(c=>
    c.sourceRefs?.[0]?.elementIndex===physical);
  assert(categoryIndex>=0);
  const select=entry('RouteGeometryBlock','DELTA_X');
  assert(projectionLeaf(categorizedElementRanges(baseline)[categoryIndex].text,select));
  const result=await run(text,changeProjection(baseline,categoryIndex,select,'77.875'),baseline);
  refuse(result,R.GRAPH);
  assert(result.refusals?.some(x=>x.row===categoryIndex+1&&x.tag==='DELTA_X'),
    'named physical categorized row and DELTA_X tag required; no bytes released');
});

test('S4.2 slice2 REFUSE isolated snapshot-only stale DIAMETER projection with mismatch code',async()=>{
  const text=original(row(10,20));
  const baseline=s40(text);
  const newText=physicalChange(text,0,'DIAMETER','123.456');
  const oldRaw=scan(text)[0].raw,newRaw=scan(newText)[0].raw;
  assert(baseline.includes(oldRaw));
  const edited=baseline.replace(oldRaw,newRaw);
  assert.notEqual(edited,baseline);
  const result=await run(text,edited,baseline);
  refuse(result,R.S40_MISMATCH);
});

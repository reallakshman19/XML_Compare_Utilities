import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as categorize} from '../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized as patch,UXML_CATEGORIZED_PATCH_REFUSALS as R}
  from '../uxml/UxmlCategorizedPatchBack.js';
import {scanOriginalInputXmlStructure as scan} from '../uxml/UxmlInputXmlSourceStructure.js';

const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const b=s=>Buffer.from(s,'utf8');
const inputs=[
  ['GRE', 'docs/GREInputxml.xml',100],
  ['PLB314','docs/PLB314Inputxml.xml',53],
  ['mock','opt/mock-xml.xml',244],
  ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml',40],
];
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const row=(f,t,line='A',extra='')=>
  '<PIPINGELEMENT FROM_NODE="'+f+'" TO_NODE="'+t+'" LINE_ID="'+line+
  '" DELTA_X="10" DELTA_Y="-1.010100" DELTA_Z="-1.010100"'+
  ' DIAMETER="100" WALL_THICK="6" MATERIAL_NAME="STEEL" NAME="ORIGINAL">'+
  extra+'</PIPINGELEMENT>';
const input=(...parts)=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL JOBNAME="SYNTH">'+
  parts.join('')+'</PIPINGMODEL></CAESARII>';
const simple=()=>input(row(10,20,'A'),row(20,30,'B'));
const expectRefused=(res,code)=>{assert.equal(res.ok,false,code);assert.equal(res.code,code);assert.equal(res.bytes,null);};
const write=(src,edit,baseline=categorize(src),options={})=>
  patch(src,baseline,edit,{fileSha256:sha(src),...options});
function replaceInPhysicalRow(src,index,field,newValue,child=false){
  const entries=scan(src);
  assert(entries&&entries[index],'must have physical row index '+index);
  const r=entries[index];
  const snippet=src.slice(r.start,r.start+r.raw.length);
  assert.equal(snippet,r.raw,'scan offset is exact original text');
  const target=child
    ? new RegExp('(<'+child+'\\b[^>]*\\b'+field+'=")([^"]*)(")')
    : new RegExp('(<PIPINGELEMENT\\b[^>]*\\b'+field+'=")([^"]*)(")');
  let matched=false;
  const modified=snippet.replace(target,(_,a,value,c)=>{
    matched=true;assert.notEqual(value,newValue,'edit must be material');
    return a+newValue+c;
  });
  assert(matched,'attribute '+field+' must exist in scanned row '+index);
  return src.slice(0,r.start)+modified+src.slice(r.start+r.raw.length);
}
function assertPatchBytes(src,ret){
  assert.equal(ret.ok,true,ret.code);
  const old=b(src),patched=Buffer.from(ret.bytes);
  let sourceCursor=0,outputCursor=0;
  for(const change of ret.changes){
    const {start,end}=change.byteRange;
    assert(start>=sourceCursor&&end>=start,'byte ranges nonoverlapping and ascending');
    const unchanged=old.subarray(sourceCursor,start);
    assert.deepEqual(patched.subarray(outputCursor,outputCursor+unchanged.length),
      unchanged,'unchanged bytes before authorized range are identical');
    outputCursor+=unchanged.length;
    const quote=String.fromCharCode(old[start-1]);
    assert(quote==='"'||quote==="'",'attribute quote style anchored in original');
    const replacement=change.new.replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,quote==='"'?'&quot;':'"')
      .replace(/'/g,quote==="'"?'&apos;':"'");
    const insert=b(replacement);
    assert.deepEqual(patched.subarray(outputCursor,outputCursor+insert.length),insert,
      'only the expected XML-escaped value is substituted');
    outputCursor+=insert.length;
    sourceCursor=end;
  }
  assert.deepEqual(patched.subarray(outputCursor),old.subarray(sourceCursor),
    'all bytes after final patch are identical');
  return ret.changes.map(c=>c.byteRange.end-c.byteRange.start);
}

test('S4.2 REFUSE stale baseline before any write',async()=>{
  const src=simple(),baseline=categorize(src);
  expectRefused(await write(src,baseline,baseline.replace('STEEL','ALLOY')),R.BASELINE);
});
test('S4.2 REFUSE original SHA mismatch before source binding',async()=>{
  const src=simple(),cat=categorize(src);
  expectRefused(await write(src,cat,cat,{fileSha256:'0'.repeat(64)}),R.HASH);
});
for(const [name,path,count] of inputs){
  test('S4.2 '+name+' no-edit preserves original UTF-8 bytes exactly',async()=>{
    const src=source(path),cat=categorize(src);
    const ret=await write(src,cat);
    assert.equal(ret.ok,true,name+': '+ret.code);
    assert.equal(ret.parity,'EQUAL');
    assert.deepEqual(Buffer.from(ret.bytes),b(src),name+' entire source');
    assert.deepEqual(ret.changes,[]);
    assert.equal(scan(src)?.length,count);
    console.log('S42_REAL_NOEDIT '+name+' count='+count+' exactBytes='+b(src).length+' diffBytes=0');
  });
  test('S4.2 '+name+' one numeric physical attribute byte-range patch',async()=>{
    const src=source(path),cat=categorize(src);
    const target=replaceInPhysicalRow(src,0,'DELTA_X','777.123456');
    const ret=await write(src,categorize(target),cat);
    assert.equal(ret.ok,true,name+': '+ret.code);
    assert.equal(ret.changes.length,1);
    assert.deepEqual(Buffer.from(ret.bytes),b(target));
    assertPatchBytes(src,ret);
    assert.equal(ret.changes[0].field,'PIPINGELEMENT.DELTA_X');
    assert(ret.changes[0].recordKey.startsWith('E0:'));
    console.log('S42_REAL_NUMERIC '+name+' count='+count+
      ' replacedOldBytes='+(ret.changes[0].byteRange.end-ret.changes[0].byteRange.start)+
      ' replacementBytes='+b('777.123456').length);
  });
  test('S4.2 '+name+' three physical record edits preserve every other byte',async()=>{
    const src=source(path),cat=categorize(src);
    let target=src;
    for(const [index,value] of [[0,'777.000001'],[1,'888.000002'],[count-1,'999.000003']])
      target=replaceInPhysicalRow(target,index,'DELTA_X',value);
    const ret=await write(src,categorize(target),cat);
    assert.equal(ret.ok,true,name+': '+ret.code);
    assert.equal(ret.changes.length,3);
    assert.deepEqual(Buffer.from(ret.bytes),b(target));
    assertPatchBytes(src,ret);
    assert.equal(new Set(ret.changes.map(c=>c.recordKey)).size,3);
    const oldSizes=ret.changes.map(c=>c.byteRange.end-c.byteRange.start);
    console.log('S42_REAL_MULTI '+name+' count='+count+
      ' changedRanges=3 oldByteSizes='+oldSizes.join(',')+
      ' outputBytes='+ret.bytes.length);
  });
}
test('S4.2 direct child RIGID existing attribute plain value can patch',async()=>{
  const src=input(row(10,20,'A','<RIGID WEIGHT="1.5" TYPE="Flange"/>'),
    row(20,30,'B')),cat=categorize(src);
  const modified=replaceInPhysicalRow(src,0,'WEIGHT','12.75','RIGID');
  const ret=await write(src,categorize(modified),cat);
  assert.equal(ret.ok,true,ret.code);
  assert.deepEqual(Buffer.from(ret.bytes),b(modified));
  assert.equal(ret.changes[0].field,'RIGID.WEIGHT');
});
test('S4.2 escaped attribute values (&, <, double quote) round-trip',async()=>{
  const src=simple(),cat=categorize(src);
  const modified=replaceInPhysicalRow(src,0,'NAME','A&amp;B&lt;C&quot;D');
  const ret=await write(src,categorize(modified),cat);
  assert.equal(ret.ok,true,ret.code);
  assert.deepEqual(Buffer.from(ret.bytes),b(modified));
  assert.equal(ret.changes[0].new,'A&B<C"D');
});
test('S4.2 LF, CRLF and BOM originals retain non-target bytes',async()=>{
  for(const eol of ['\n','\r\n']){
    const src='\ufeff'+simple().replace(/></g,'>'+eol+'<');
    const target=replaceInPhysicalRow(src,0,'DELTA_X','13.25');
    const ret=await write(src,categorize(target));
    assert.equal(ret.ok,true,ret.code);
    assert.deepEqual(Buffer.from(ret.bytes),b(target));
    assertPatchBytes(src,ret);
    assert.equal(Buffer.from(ret.bytes).subarray(0,3).toString('hex'),'efbbbf');
    assert(target.includes(eol));
  }
});
test('S4.2 REFUSE added or removed Categorized element',async()=>{
  const src=simple(),cat=categorize(src),match=cat.match(/<Element\b[\s\S]*?<\/Element>/);
  assert(match);
  expectRefused(await write(src,cat.replace(match[0],'')),R.STRUCTURE);
  expectRefused(await write(src,cat.replace(match[0],match[0]+match[0])),R.STRUCTURE);
});
test('S4.2 REFUSE changed Categorized element order',async()=>{
  const src=input(row(10,20,'A'),row(20,30,'A')),cat=categorize(src);
  const blocks=cat.match(/<Element\b[\s\S]*?<\/Element>/g);
  const changed=cat.replace(blocks[0],'__ELEMENT_TMP__')
    .replace(blocks[1],blocks[0]).replace('__ELEMENT_TMP__',blocks[1]);
  expectRefused(await write(src,changed),R.REORDER);
});
test('S4.2 REFUSE independently edited DerivedBlock value or Line projection',async()=>{
  const src=simple(),cat=categorize(src);
  const derived=cat.replace('<MaterialName source="existing-field">STEEL</MaterialName>',
    '<MaterialName source="existing-field">ALLOY</MaterialName>');
  assert.notEqual(derived,cat);
  expectRefused(await write(src,derived),R.DERIVED);
  const line=cat.replace('<Branchname>A</Branchname>','<Branchname>MANUAL</Branchname>');
  assert.notEqual(line,cat);
  expectRefused(await write(src,line),R.DERIVED);
});
test('S4.2 REFUSE duplicated external stanza ownership across source rows',async()=>{
  const a='<RESTRAINT NUM="1" NODE="20" TYPE="8" TAG="A"/>';
  const bb='<RESTRAINT NUM="2" NODE="20" TYPE="9" TAG="B"/>';
  const src=input(row(10,20,'A',a),row(20,30,'B',bb));
  const cat=categorize(src);
  const changed=replaceInPhysicalRow(src,0,'TYPE','10','RESTRAINT');
  const ret=await write(src,categorize(changed),cat);
  expectRefused(ret,R.EXTERNAL);
});
test('S4.2 REFUSE edited non-record UNITS source witness',async()=>{
  const src=source('docs/PLB314Inputxml.xml'),cat=categorize(src);
  const changed=cat.replace('<UNITS>','<UNITS MODIFIED="1">');
  assert.notEqual(changed,cat);
  expectRefused(await write(src,changed),R.UNITS);
});
test('S4.2 REFUSE FROM_NODE/TO_NODE and LINE_ID identity changes',async()=>{
  const src=simple(),cat=categorize(src);
  for(const [field,changed] of [['FROM_NODE','11'],['TO_NODE','21'],['LINE_ID','CHANGED']]){
    const newOriginal=replaceInPhysicalRow(src,0,field,changed);
    // Only mutate the XML source snapshot inside the Categorized Element;
    // the Line/Element identity in the envelope remains pinned to original.
    const altered=cat.replace(src.match(/<PIPINGELEMENT[\s\S]*?<\/PIPINGELEMENT>/)[0],
      scan(newOriginal)[0].raw);
    assert.notEqual(altered,cat);
    expectRefused(await write(src,altered),R.IDENTITY);
  }
});
test('S4.2 REFUSE existing attribute deletion or added stanza markup',async()=>{
  const src=simple(),cat=categorize(src);
  const before=scan(src)[0].raw;
  for(const altered of [before.replace(' WALL_THICK="6"',''),
    before.replace(' NAME="ORIGINAL"',' NAME="ORIGINAL" NEW="1"'),
    before.replace('</PIPINGELEMENT>','<BEND ANGLE="1"/></PIPINGELEMENT>')]){
    const changed=cat.replace(before,altered);
    assert.notEqual(changed,cat);
    expectRefused(await write(src,changed),R.STRUCTURE);
  }
});
test('S4.2 REFUSE unbound duplicate physical record source',async()=>{
  const duplicate=row(10,20,'A'),src=input(duplicate,duplicate),cat=categorize(src);
  expectRefused(await write(src,cat),R.UNBOUND);
});
test('S4.2 REFUSE unsafe raw XML attribute-value characters',async()=>{
  const src=simple(),cat=categorize(src);
  const changed=cat.replace('NAME="ORIGINAL"','NAME="A & B"');
  assert.notEqual(changed,cat);
  expectRefused(await write(src,changed),R.VALUE);
});

test('S4.2 preserves single-quoted attribute style when escaping XML values',async()=>{
  const src=simple().replace('NAME="ORIGINAL"',"NAME='ORIGINAL'");
  const target=src.replace("NAME='ORIGINAL'","NAME='A&amp;B&apos;C'");
  const result=await write(src,categorize(target));
  assert.equal(result.ok,true,result.code);
  assert.deepEqual(Buffer.from(result.bytes),b(target));
  assertPatchBytes(src,result);
  assert.equal(result.changes[0].new,"A&B'C");
});
test('S4.2 REFUSE post-edit duplicate physical snapshots despite same S3 key-set',async()=>{
  const first=row(10,20,'A').replace('NAME="ORIGINAL"','NAME="FIRST"');
  const second=row(10,20,'A').replace('NAME="ORIGINAL"','NAME="SECOND"');
  const src=input(first,second),cat=categorize(src);
  const target=src.replace('NAME="SECOND"','NAME="FIRST"');
  expectRefused(await write(src,categorize(target),cat),R.PARITY);
});
test('S4.2 REFUSE invalid input types without output bytes',async()=>{
  const src=simple(),cat=categorize(src);
  expectRefused(await patch(null,cat,cat,{fileSha256:sha(src)}),R.INPUT);
  expectRefused(await patch(src,cat,cat,null),R.INPUT);
});

test('S4.2 REFUSE source offset that does not exactly match original bytes (isolated scanner seam)',()=>{
  const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
  const sandbox=mkdtempSync(join(tmpdir(),'s42-offset-falsifier-'));
  try{
    const files=[
      'uxml/UxmlCategorizedPatchBack.js',
      'uxml/UxmlCategorizedInputXmlSchemaMapper.js',
      'uxml/UxmlInputXmlSchemaMapper.js',
      'uxml/UxmlInputXmlSourceStructure.js',
      'uxml/UxmlInputXmlDeltaGraph.js',
      'uxml/UxmlConstants.js','uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
      'xml-compare/CategorizedInputXmlConverter.js',
      'xml-compare/XmlCompareCoordinateSideload.js',
      'xml-compare/XmlCompareCoordinateDiagnostics.js',
      'utils/line-no-metadata.js',
    ];
    for(const file of files){
      const path=join(sandbox,file);
      mkdirSync(dirname(path),{recursive:true});
      copyFileSync(join(sourceRoot,file),path);
    }
    writeFileSync(join(sandbox,'package.json'),'{"type":"module"}\n');
    const mapper=join(sandbox,'uxml/UxmlCategorizedPatchBack.js');
    let sourceText=readFileSync(mapper,'utf8').replace(/\r\n/g,'\n');
    const from="import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';";
    const to="import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructureTampered.js';";
    assert.equal(sourceText.split(from).length-1,1);
    writeFileSync(mapper,sourceText.replace(from,to));
    writeFileSync(join(sandbox,'uxml/UxmlInputXmlSourceStructureTampered.js'),[
      "import {scanOriginalInputXmlStructure as canonical} from './UxmlInputXmlSourceStructure.js';",
      'export function scanOriginalInputXmlStructure(text,options){',
      '  const records=canonical(text,options);',
      '  if(records?.length)records[0].start+=1; // synthetic corrupted source witness',
      '  return records;',
      '}',
    ].join('\n')+'\n');
    writeFileSync(join(sandbox,'probe.mjs'),[
      "import {createHash} from 'node:crypto';",
      "import {inputXmlToCategorizedInputXml as categorize} from './xml-compare/CategorizedInputXmlConverter.js';",
      "import {patchOriginalFromCategorized as patch} from './uxml/UxmlCategorizedPatchBack.js';",
      'const original='+JSON.stringify(simple())+';',
      "const sha=createHash('sha256').update(original).digest('hex');",
      "const changed=original.replace('DELTA_X=\"10\"','DELTA_X=\"12\"');",
      'const result=await patch(original,categorize(original),categorize(changed),{fileSha256:sha});',
      "if(result.ok!==false||result.code!=='S42_SOURCE_OFFSET_NOT_EXACT'||result.bytes!==null)",
      "  throw Error('Tampered source offset was not refused: '+JSON.stringify(result));",
    ].join('\n')+'\n');
    const result=spawnSync(process.execPath,['probe.mjs'],{
      cwd:sandbox,encoding:'utf8',timeout:45000,
      env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT')),
    });
    assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  }finally{rmSync(sandbox,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCategorizedEditController,B7_REFUSALS,B7_REFUSAL_MESSAGES,b7Reason,patchedOriginalFilename} from '../tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js';
import {UXML_CATEGORIZED_PATCH_REFUSALS as R} from '../uxml/UxmlCategorizedPatchBack.js';
import {UXML_CATEGORIZED_INPUTXML_REFUSALS as S41} from '../uxml/UxmlCategorizedInputXmlSchemaMapper.js';
import {inputXmlToCategorizedInputXml as categorize} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCaesarInputXmlToUxmlStrict} from '../uxml/UxmlInputXmlSchemaMapper.js';

const xml=(extra='')=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL JOBNAME="S">'+
  '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="A" '+
  'FROM_NAME="PS-1" TO_NAME="PS-2" NAME="SPAN" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" '+
  'DIAMETER="100" WALL_THICK="6" INSUL_THICK="8"'+extra+'/>'+
  '</PIPINGMODEL></CAESARII>';
const bytes=s=>new TextEncoder().encode(s);
const digest=buf=>createHash('sha256').update(buf).digest('hex');
const change=(cat,tag,value)=>{
  const needle=new RegExp('(<'+tag+'>)([^<]+)(</'+tag+'>)');
  assert(needle.test(cat),'present projection '+tag);
  return cat.replace(needle,(_,a,_old,z)=>a+value+z);
};
const make=()=>createCategorizedEditController();
async function loaded(source=xml(),name='original.xml'){
  const c=make();const result=await c.loadBytes(bytes(source),name);
  assert.equal(result.phase,'ready',result.code+': '+result.detail);
  assert.equal(result.canCheck,true);return c;
}
function defer(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}

test('B7 full live S4.2 + S4.1 refusal code messages and all B7 refusals have distinct plain explanations',()=>{
  for(const codes of [R,S41,B7_REFUSALS])for(const code of Object.values(codes)){
    assert.equal(typeof B7_REFUSAL_MESSAGES[code],'string',code);
    assert(B7_REFUSAL_MESSAGES[code].length>25,code);
    assert(!b7Reason(code).includes('without generating any downloadable output'),code);
  }
  assert.equal('DERIVED' in R,false,'deprecated unused code is retired');
  assert.match(b7Reason('INPUT_XML_SOURCE_STRUCTURE_REFUSED'),/S3/);
  assert.match(b7Reason('INPUT_XML_ANCHORED_DELTA_GRAPH_CONFLICT:E3'),/S3/);
});
test('B7 original filenames remain local leaf names and gain only a suffix',()=>{
  assert.equal(patchedOriginalFilename('folder/foo.xml'),'foo-patched.xml');
  assert.equal(patchedOriginalFilename('source.input.xml'),'source.input-patched.xml');
  assert.equal(patchedOriginalFilename('pipe.inputxml'),'pipe.inputxml-patched.xml');
});
test('B7 real S3 + S4.1 load measures SHA and keeps baseline independently of editor',async()=>{
  const source='\ufeff'+xml().replace(/></g,'>\r\n<');
  const c=await loaded(source,'sample.xml');
  const view=c.snapshot();
  assert.equal(view.sourceSha256,digest(bytes(source)));
  assert.equal(view.baseline,categorize(source));
  assert.equal(view.edited,view.baseline);
  assert.equal(view.canDownload,false);
  assert.equal(view.phase,'ready');
});
test('B7 projection-only Check reports exact change, byte download, Reset and continued edit',async()=>{
  const source=xml(),c=await loaded(source,'pipe.xml');
  const edited=change(c.snapshot().edited,'DIAMETER','127.125');
  c.edit(edited);
  assert.equal(c.snapshot().canDownload,false);
  const checked=await c.check();
  assert.equal(checked.phase,'checked',checked.code);
  assert.equal(checked.canDownload,true);
  assert.equal(checked.changes.length,1);
  assert.equal(checked.changes[0].field,'PIPINGELEMENT.DIAMETER');
  assert.equal(checked.changes[0].new,'127.125');
  assert.deepEqual(c.download().bytes,bytes(source.replace('DIAMETER="100"','DIAMETER="127.125"')));
  assert.equal(c.snapshot().phase,'downloaded');
  assert.equal(c.snapshot().canDownload,true,'re-download same verified bytes is permitted');
  const moved=await c.continueEditing();
  assert.equal(moved.canDownload,false,'new source revision invalidates prior bytes');
  assert.equal(moved.phase,'ready',moved.code);
  assert.equal(moved.baseline,categorize(source.replace('DIAMETER="100"','DIAMETER="127.125"')));
  c.reset();
  assert.equal(c.snapshot().canDownload,false);
  assert.equal(c.snapshot().edited,c.snapshot().baseline);
});
test('B7 Check refusal returns code and never exposes output bytes',async()=>{
  const c=await loaded();
  c.edit(c.snapshot().edited.replace('</SectionDimensionBlock>',
    '<UNKNOWN>99</UNKNOWN></SectionDimensionBlock>'));
  const result=await c.check();
  assert.equal(result.canDownload,false);
  assert.equal(result.phase,'refused');
  assert.equal(result.code,R.UNMAPPED);
  assert.match(result.reason,/unlisted/);
  assert.equal(c.download(),null);
});
test('B7 input editing immediately invalidates download and revision, including editing back',async()=>{
  const c=await loaded();
  c.edit(change(c.snapshot().edited,'DIAMETER','127.125'));await c.check();
  const prev=c.snapshot(),originalEditor=prev.edited;
  assert(prev.canDownload);
  c.edit(originalEditor+' ');
  assert.equal(c.download(),null);
  assert(c.snapshot().revision>prev.revision);
  c.edit(originalEditor);
  assert.equal(c.download(),null,'restoring identical text is not restoring a check receipt');
  await c.check();
  assert.equal(c.snapshot().canDownload,true);
  c.reset();assert.equal(c.snapshot().canDownload,false);
});
test('B7 release-last: an edit while Check pending blocks stale result even when engine says EQUAL',async()=>{
  const delayed=defer(),source=xml();
  const c=createCategorizedEditController({patch:()=>delayed.promise});
  await c.loadBytes(bytes(source),'a.xml');
  const old=change(c.snapshot().edited,'DIAMETER','127.125');c.edit(old);
  const pending=c.check();
  c.edit(old.replace('<DIAMETER>127.125</DIAMETER>','<DIAMETER>177.125</DIAMETER>'));
  delayed.resolve({ok:true,parity:'EQUAL',bytes:bytes(source),changes:[]});
  await pending;
  assert.equal(c.snapshot().canDownload,false);
  assert.equal(c.download(),null);
});
test('B7 two overlapping Checks: last issued controls release even if first settles later',async()=>{
  const a=defer(),b=defer(),calls=[];
  const c=createCategorizedEditController({patch:()=>{const d=calls.length?b:a;calls.push(d);return d.promise;}});
  await c.loadBytes(bytes(xml()),'pipe.xml');
  const first=c.check(),second=c.check();
  assert.equal(calls.length,2,'both Checks must call patch independently');
  b.resolve({ok:true,parity:'EQUAL',bytes:bytes(xml()),changes:[]});
  await Promise.race([second,new Promise((_,reject)=>
    setTimeout(()=>reject(Error('Second Check did not complete')),2000))]);
  assert.equal(c.snapshot().canDownload,true);
  a.resolve({ok:false,code:R.PARITY,bytes:null});await first;
  assert.equal(c.snapshot().canDownload,true,'earlier failed result cannot revoke newer success');
});
test('B7 download is a defensive copy of engine result.bytes, never a regenerated XML string',async()=>{
  const source=xml().replace('DIAMETER="100"','DIAMETER="101.007"');
  const original=xml();
  const c=createCategorizedEditController({patch:()=>Promise.resolve({ok:true,parity:'EQUAL',
    bytes:bytes(source),changes:[{recordKey:'E0:F10:T20',field:'PIPINGELEMENT.DIAMETER',
      old:'100',new:'101.007',byteRange:{start:0,end:0}}]})});
  await c.loadBytes(bytes(original),'only.xml');
  const check=await c.check();assert.equal(check.canDownload,true,check.code);
  const copy=c.download();
  assert.equal(copy.filename,'only-patched.xml');
  assert.deepEqual(copy.bytes,bytes(source));
  copy.bytes[0]=1;
  assert.deepEqual(c.download().bytes,bytes(source),'caller may not mutate cached engine bytes');
});
test('B7 failed/parity-wrong patch-back cannot release output bytes',async()=>{
  for(const result of [
    {ok:true,parity:'DIFFERENT',bytes:bytes(xml()),changes:[]},
    {ok:true,parity:'EQUAL',bytes:null,changes:[]},
    {ok:false,code:R.PARITY,bytes:null},
  ]){
    const c=createCategorizedEditController({patch:()=>Promise.resolve(result)});
    await c.loadBytes(bytes(xml()));
    const view=await c.check();assert.equal(view.canDownload,false);
    assert.equal(c.download(),null);
  }
});
test('B7 new load starts by revoking old receipt before async file completion',async()=>{
  const c=await loaded();c.edit(change(c.snapshot().edited,'DIAMETER','127.125'));
  await c.check();assert.equal(c.snapshot().canDownload,true);
  const ticket=c.beginLoad();
  assert.equal(c.snapshot().canDownload,false);
  const newer=c.beginLoad();
  await c.loadBytes(bytes(xml()),'old.xml',ticket);
  assert.equal(c.snapshot().phase,'loading','stale upload must not rehydrate old source');
  await c.loadBytes(bytes(xml()),'new.xml',newer);
  assert.equal(c.snapshot().filename,'new.xml');
  assert.equal(c.snapshot().canDownload,false);
});
test('B7 invalid raw bytes, S3 errors and S4.1 refused code never release download',async()=>{
  const c=make();
  assert.equal((await c.loadBytes(Uint8Array.from([0xff]))).code,B7_REFUSALS.UTF8);
  assert.equal(c.snapshot().canDownload,false);
  const s3=make();
  assert.equal((await s3.loadBytes(bytes('<WRONG/>'))).code,'INPUT_XML_SOURCE_STRUCTURE_REFUSED');
  const reject=createCategorizedEditController({bind:async()=>({ok:false,code:S41.EXTERNAL_DUPLICATE})});
  assert.equal((await reject.loadBytes(bytes(xml()))).code,S41.EXTERNAL_DUPLICATE);
  assert.equal(reject.download(),null);
});
test('B7 FROM_NAME duplicate label creates non-blocking warning after successful Check',async()=>{
  const source='<CAESARII><PIPINGMODEL>'+
    '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" FROM_NAME="ONE" TO_NAME="TWO" NAME="A" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" DIAMETER="100" WALL_THICK="6"/>'+
    '<PIPINGELEMENT FROM_NODE="20" TO_NODE="30" FROM_NAME="TWO" TO_NAME="THREE" NAME="B" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" DIAMETER="100" WALL_THICK="6"/>'+
    '</PIPINGMODEL></CAESARII>';
  const c=await loaded(source);
  c.edit(change(c.snapshot().edited,'FROM_NAME','THREE'));
  const checked=await c.check();
  assert.equal(checked.canDownload,true,checked.code);
  assert.match(checked.warning.join('\n'),/also used by another node/);
});
for(const [label,path] of [
  ['GRE','docs/GREInputxml.xml'],['PLB314','docs/PLB314Inputxml.xml'],
  ['mock','opt/mock-xml.xml'],['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml']
]){
  test('B7 public original '+label+' projection-only DIAMETER keeps every non-target byte',async()=>{
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const c=await loaded(source,label+'.xml');
    const cat=c.snapshot().edited;
    const match=/<DIAMETER>([^<]+)<\/DIAMETER>/.exec(cat);
    assert(match,'visible DIAMETER in '+label);
    const value='127.125',editor=cat.replace(match[0],'<DIAMETER>'+value+'</DIAMETER>');
    c.edit(editor);
    const result=await c.check();assert.equal(result.canDownload,true,result.code);
    assert.equal(result.changes.length,1);
    const written=c.download();
    const expected=source.replace(/(DIAMETER=")[^"]+(")/,(_,a,z)=>a+value+z);
    assert.deepEqual(written.bytes,bytes(expected));
    assert.equal(result.changes[0].new,value);
    console.log('B7_PUBLIC_CONTROLLER '+label+' sourceBytes='+bytes(source).length+
      ' resultBytes='+written.bytes.length+' parity=EQUAL');
  });
}

test('B7 invalid measured SHA is refused before strict parser or binding',async()=>{
  const c=createCategorizedEditController({hash:async()=>'INVALID'});
  const result=await c.loadBytes(bytes(xml()),'sha.xml');
  assert.equal(result.code,B7_REFUSALS.HASH);
  assert.equal(result.canDownload,false);
});
test('B7 strict reader with zero physical components refuses before categorized binder',async()=>{
  const c=createCategorizedEditController({strict:async()=>({components:[]})});
  const result=await c.loadBytes(bytes(xml()),'s3-empty.xml');
  assert.equal(result.code,B7_REFUSALS.S3);
  assert.equal(result.canDownload,false);
});
test('B7 a SOURCE_BOUND_READ_ONLY status with exportAllowed=true is still refused',async()=>{
  const c=createCategorizedEditController({bind:async()=>({
    ok:true,status:'SOURCE_BOUND_READ_ONLY',exportAllowed:true,uxml:{components:[{}]}})});
  const result=await c.loadBytes(bytes(xml()),'s41-authority.xml');
  assert.equal(result.code,B7_REFUSALS.S41);
  assert.equal(result.canDownload,false);
});

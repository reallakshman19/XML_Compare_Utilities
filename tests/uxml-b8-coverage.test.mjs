import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized as patch} from '../uxml/UxmlCategorizedPatchBack.js';
import {categorizedElementRanges,projectionLeaf,S42_PROJECTION_MAP} from '../uxml/UxmlCategorizedProjectionMap.js';
import {scanOriginalInputXmlStructure as scan} from '../uxml/UxmlInputXmlSourceStructure.js';
import {mapCaesarInputXmlToUxmlStrict as s3} from '../uxml/UxmlInputXmlSchemaMapper.js';
import {mapCategorizedInputXmlToUxml as s41} from '../uxml/UxmlCategorizedInputXmlSchemaMapper.js';

const sha=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const run=(src,edited)=>patch(src,s40(src),edited,{fileSha256:sha(src)});
const element=(from,to,process,material)=>'<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+'" LINE_ID="LINE-A" NAME="SPAN" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" DIAMETER="100" WALL_THICK="6" '+process+' '+material+'/>';
const source=(eol='')=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+
  element(10,20,'PRESSURE1="1.0" TEMP_EXP_C1="100"','MATERIAL_NAME="STEEL" MODULUS="3"')+eol+
  element(20,30,'PRESSURE1="1.0" TEMP_EXP_C1="-1.010100"','MATERIAL_NAME="STEEL" MODULUS="3"')+eol+
  element(30,40,'PRESSURE1="-1.010100" TEMP_EXP_C1="-1.010100"','MATERIAL_NAME="-1.010100" MODULUS="3"')+
  '</PIPINGMODEL></CAESARII>';
function lineChange(cat,tag,value){
  const re=new RegExp('(<'+tag+'>)([^<]+)(<\\/'+tag+'>)');
  assert.match(cat,re);
  return cat.replace(re,(_m,a,_old,z)=>a+value+z);
}
test('B8 original-red: line-level PRESSURE1 updates all explicit agreeing holders and skips carry-forward sentinel',async()=>{
  const original=source();
  const edited=lineChange(s40(original),'PRESSURE1','9.25');
  const out=await run(original,edited);
  assert.equal(out.ok,true,out.code);
  assert.equal(out.parity,'EQUAL');
  const expected=original.replaceAll('PRESSURE1="1.0"','PRESSURE1="9.25"');
  assert.deepEqual(Buffer.from(out.bytes),Buffer.from(expected));
  assert.equal(out.changes.length,2);
  assert.equal(s40(expected),s40(Buffer.from(out.bytes).toString('utf8')));
});
test('B8 original-red: globally shared AllowableStress edit refuses by named code, Line and tag',async()=>{
  const original=source().replace('</PIPINGMODEL>','<ALLOWABLESTRESS ALLOWABLE_1="100" NODE="10"/></PIPINGMODEL>');
  const cat=s40(original);
  assert.match(cat,/AllowableStressBlock/);
  const edited=cat.replace('ALLOWABLE_1="100"','ALLOWABLE_1="200"');
  const out=await run(original,edited);
  assert.equal(out.ok,false);
  assert.equal(out.code,'S42_GLOBAL_SHARED_STANZA_READ_ONLY');
  assert.equal(out.bytes,null);
  assert(out.refusals?.some(x=>x.tag==='ALLOWABLESTRESS'&&x.line==='LINE-A'));
});
test('B8 public sample exploratory diagnostics: DELTA_Y and existing NAME first available',async()=>{
  const samples=[
    ['GRE','docs/GREInputxml.xml'],['PLB314','docs/PLB314Inputxml.xml'],
    ['mock','opt/mock-xml.xml'],['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
  ];
  for(const [label,path] of samples){
    const original=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const baseline=s40(original),elements=categorizedElementRanges(baseline);
    for(const tag of ['DELTA_Y','NAME']){
      const entry=S42_PROJECTION_MAP.find(x=>x.tag===tag);
      const selected=elements.map((x,i)=>({i,span:x,leaf:projectionLeaf(x.text,entry)}))
        .find(x=>x.leaf&&!x.leaf.error);
      if(!selected){console.log('B8_PUBLIC_DIAGNOSTIC '+label+' '+tag+' NO_VISIBLE_LEAF');continue;}
      const {span,leaf}=selected;
      const value=tag==='DELTA_Y'?String(Number(leaf.value)+1):leaf.value+'-B8';
      if(value===leaf.value){console.log('B8_PUBLIC_DIAGNOSTIC '+label+' '+tag+' NOT_NUMERIC');continue;}
      const edited=baseline.slice(0,span.start+leaf.start)+value+baseline.slice(span.start+leaf.end);
      const result=await run(original,edited);
      console.log('B8_PUBLIC_DIAGNOSTIC '+label+' '+tag+' '+(result.ok?'EQUAL':result.code));
      assert.equal(result.ok?result.parity:'REFUSED',result.ok?'EQUAL':'REFUSED');
    }
  }
});

test('B8 BM_CII public DELTA_Y first-row parity diagnosis by independent S3/S4.1 gates',async()=>{
  const original=readFileSync(new URL('../converters/scripts/pdf_inputxml_profile_bm_cii.xml',import.meta.url),'utf8');
  const baseline=s40(original),elements=categorizedElementRanges(baseline);
  const entry=S42_PROJECTION_MAP.find(x=>x.tag==='DELTA_Y');
  const selected=elements.map((x,i)=>({i,span:x,leaf:projectionLeaf(x.text,entry)}))
    .find(x=>x.leaf&&!x.leaf.error);
  assert(selected,'first public DELTA_Y exists');
  const next=String(Number(selected.leaf.value)+1);
  // BM_CII has one physical Line; its first categorized Element is the
  // first source row. Diagnose the two gates independently, without
  // allowing a failed S4.1 baseline to abort the diagnostic test.
  const physical=scan(original)[selected.i],before=physical.raw;
  const replacement=before.replace(/(DELTA_Y=")[^"]*(")/,(_a,l,z)=>l+next+z);
  assert.notEqual(replacement,before);
  const candidate=original.slice(0,physical.start)+replacement+
    original.slice(physical.start+before.length);
  let baselineS41='ACCEPTED';
  try{
    const bound=await s41(baseline,{originalInputXml:original,fileSha256:sha(original)});
    if(!bound.ok)baselineS41=bound.code||bound.status||'REFUSED';
  }catch(error){baselineS41=String(error.message).split(':')[0];}
  let s3Code='ACCEPTED';
  try{s3(candidate,{fileSha256:sha(candidate)});}
  catch(error){s3Code=String(error.message).split(':')[0];}
  const newCategorized=s40(candidate);
  let s41Code='ACCEPTED';
  try{
    const reb=await s41(newCategorized,{originalInputXml:candidate,fileSha256:sha(candidate)});
    if(!reb.ok)s41Code=reb.code||reb.status||'REFUSED';
  }catch(error){s41Code=String(error.message).split(':')[0];}
  const edited=baseline.slice(0,selected.span.start+selected.leaf.start)+next+
    baseline.slice(selected.span.start+selected.leaf.end);
  const result=await run(original,edited);
  console.log('B8_BM_CII_REAL_GATES baselineS41='+baselineS41+
    ' candidateS3='+s3Code+' candidateS41='+s41Code+
    ' actualPatch='+String(result.code||result.parity));
  assert.equal(s3Code,'INPUT_XML_DELTA_PATH_CONFLICT','independent strict S3 witness');
  assert.equal(result.ok,false,'first real BM_CII DELTA_Y +1 must remain fail-closed');
  assert.equal(result.code,'S42_SOURCE_GRAPH_CONFLICT');
  assert.equal(result.bytes,null);
  assert(result.refusals.some(x=>x.row===selected.i+1&&x.tag==='DELTA_Y'&&
    x.reason==='INPUT_XML_DELTA_PATH_CONFLICT'));


});

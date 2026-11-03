import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized as patch,classifyCategorizedEditableFields,
  UXML_CATEGORIZED_PATCH_REFUSALS as R} from '../uxml/UxmlCategorizedPatchBack.js';
import {S42_PROJECTION_MAP,S42_LINE_FIELDS,categorizedElementRanges,
  categorizedLineRanges,projectionLeaf} from '../uxml/UxmlCategorizedProjectionMap.js';
const sha=src=>createHash('sha256').update(src).digest('hex');
const row=(a,b,line,extra='')=>'<PIPINGELEMENT FROM_NODE="'+a+'" TO_NODE="'+b+
  '" LINE_ID="'+line+'" NAME="SPAN" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" DIAMETER="100" WALL_THICK="6" '+extra+'/>';
const wrap=(...rows)=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+rows.join('')+'</PIPINGMODEL></CAESARII>';
const section=(a,b,line,tag,value)=>{
  const xml=row(a,b,line),re=new RegExp('\\b'+tag+'="[^"]*"');
  if(value===null)return xml.replace(re,'');
  return re.test(xml)?xml.replace(re,tag+'="'+value+'"'):
    xml.replace('/>',' '+tag+'="'+value+'"/>');
};
const replaceElement=(cat,index,tag,next)=>{
  const el=categorizedElementRanges(cat)[index],entry=S42_PROJECTION_MAP.find(x=>x.tag===tag);
  assert(el&&entry);
  const leaf=projectionLeaf(el.text,entry);assert(leaf,'visible '+tag);
  return cat.slice(0,el.start+leaf.start)+next+cat.slice(el.start+leaf.end);
};
const run=(src,edited)=>patch(src,s40(src),edited,{fileSha256:sha(src)});
for(const tag of ['DIAMETER','WALL_THICK','INSUL_THICK']){
  const old=tag==='DIAMETER'?'100':tag==='WALL_THICK'?'6':'2';
  const next=tag==='DIAMETER'?'120':tag==='WALL_THICK'?'7':'3';
  for(const inherited of ['-1.010100',null]){
    for(const [eol,sep] of [['LF',''],['CRLF','\r\n']]){
      test('B8 R2 section cross-Line '+tag+' '+String(inherited)+' '+eol,async()=>{
        const src=wrap(section(10,20,'A',tag,old),sep+section(20,30,'B',tag,inherited));
        const result=await run(src,replaceElement(s40(src),0,tag,next));
        assert.equal(result.ok,false);assert.equal(result.code,R.CROSS_LINE);
        assert.equal(result.bytes,null);
        assert(result.refusals.some(x=>x.line==='A'&&x.row===2&&x.tag===tag&&
          x.reason.includes('Line B')));
      });
      test('B8 R2 section same-Line '+tag+' '+String(inherited)+' '+eol,async()=>{
        const src=wrap(section(10,20,'A',tag,old),sep+section(20,30,'A',tag,inherited));
        const result=await run(src,replaceElement(s40(src),0,tag,next));
        assert.equal(result.ok,false);assert.equal(result.code,R.ELEMENT_CARRY);
        assert.equal(result.bytes,null);
        assert(result.refusals.some(x=>x.line==='A'&&x.row===2&&x.tag===tag));
      });
    }
  }
  test('B8 R2 section explicit equal-value cross-Line green '+tag,async()=>{
    const src=wrap(section(10,20,'A',tag,old),section(20,30,'B',tag,old));
    const cat=s40(src),result=await run(src,replaceElement(cat,0,tag,next));
    assert.equal(result.ok,true,result.code+' '+JSON.stringify(result.refusals));
    assert.equal(result.parity,'EQUAL');assert.equal(result.changes.length,1);
    const after=s40(Buffer.from(result.bytes).toString('utf8'));
    assert.equal(categorizedLineRanges(after).find(x=>x.id==='B').text,
      categorizedLineRanges(cat).find(x=>x.id==='B').text);
  });
}
test('B8 R2 N-1 earlier sentinel in Line A was inherited from Line B',async()=>{
  for(const inherited of ['-1.010100',null]){
    const src=wrap(row(10,20,'B','PRESSURE1="20"'),
      row(20,30,'A',inherited===null?'':'PRESSURE1="'+inherited+'"'),
      row(30,40,'A','PRESSURE1="10"'));
    const cat=s40(src),line=categorizedLineRanges(cat).find(x=>x.id==='A');
    const entry=S42_LINE_FIELDS.find(x=>x.tag==='PRESSURE1'),leaf=projectionLeaf(line.text,entry);
    assert.equal(leaf?.value,'10');
    const edited=cat.slice(0,line.start+leaf.start)+'15'+cat.slice(line.start+leaf.end);
    const result=await run(src,edited);
    assert.equal(result.ok,false);assert.equal(result.code,R.CROSS_LINE);
    assert(result.refusals.some(x=>x.row===2&&x.line==='A'&&
      x.tag==='PRESSURE1'&&x.reason.includes('Line B')));
  }
});
test('B8 R2 N-1 explicit A holder before another explicit A holder green',async()=>{
  const src=wrap(row(10,20,'B','PRESSURE1="20"'),
    row(20,30,'A','PRESSURE1="10"'),row(30,40,'A','PRESSURE1="10"'));
  const cat=s40(src),line=categorizedLineRanges(cat).find(x=>x.id==='A');
  const leaf=projectionLeaf(line.text,S42_LINE_FIELDS.find(x=>x.tag==='PRESSURE1'));
  const out=await run(src,cat.slice(0,line.start+leaf.start)+'15'+cat.slice(line.start+leaf.end));
  assert.equal(out.ok,true,out.code);assert.equal(out.changes.length,2);
});
test('B8 R2 FAST classifier-only section cross-Line mutant must go RED',async()=>{
  const src=wrap(section(10,20,'A','DIAMETER','100'),
    section(20,30,'B','DIAMETER','-1.010100'));
  const baseline=s40(src),classified=await classifyCategorizedEditableFields(src,baseline,
    {fileSha256:sha(src)});
  assert.equal(classified.ok,true);
  const choice=classified.choices.find(x=>x.key==='E:0:DIAMETER');
  assert.equal(choice?.editable,false);assert.equal(choice?.code,R.CROSS_LINE);
  const out=await run(src,replaceElement(baseline,0,'DIAMETER','120'));
  assert.equal(out.code,choice.code);assert.equal(out.bytes,null);
});
test('B8 R2 FAST classifier-only same-Line section inheritance',async()=>{
  const src=wrap(section(10,20,'A','WALL_THICK','6'),
    section(20,30,'A','WALL_THICK',null));
  const classified=await classifyCategorizedEditableFields(src,s40(src),
    {fileSha256:sha(src)});
  assert.equal(classified.ok,true);
  assert.equal(classified.choices.find(x=>x.key==='E:0:WALL_THICK')?.code,R.ELEMENT_CARRY);
});
test('B8 R2 N-5 numeric rejects text, padded, exponent, and sentinel source values',async()=>{
  const src=wrap(row(10,20,'A','PRESSURE1="5" INSUL_THICK="2"')),cat=s40(src);
  for(const bad of ['abc',' 15','1e1','15 ','-1.010100']){
    const result=await run(src,replaceElement(cat,0,'DIAMETER',bad));
    assert.equal(result.ok,false);assert.equal(result.code,R.NUMERIC);
    assert.equal(result.bytes,null);
    assert(result.refusals.some(x=>x.row===1&&x.tag==='DIAMETER'));
  }
  assert.equal((await run(src,replaceElement(cat,0,'DIAMETER','120.25'))).ok,true);
  const line=categorizedLineRanges(cat)[0];
  const field=projectionLeaf(line.text,S42_LINE_FIELDS.find(x=>x.tag==='PRESSURE1'));
  for(const bad of ['abc',' 15','1e1']){
    const edited=cat.slice(0,line.start+field.start)+bad+cat.slice(line.start+field.end);
    const result=await run(src,edited);
    assert.equal(result.ok,false);assert.equal(result.code,R.NUMERIC);
    assert(result.refusals.some(x=>x.line==='A'&&x.tag==='PRESSURE1'));
  }
});
test('B8 R2 N-2 graph and unrelated projection refusals must both appear',async()=>{
  const src=readFileSync(new URL('../converters/scripts/pdf_inputxml_profile_bm_cii.xml',import.meta.url),'utf8');
  const cat=s40(src),el=categorizedElementRanges(cat)[0];
  const leaf=projectionLeaf(el.text,S42_PROJECTION_MAP.find(x=>x.tag==='DELTA_Y'));
  assert(leaf);
  let edited=replaceElement(cat,0,'DELTA_Y',String(Number(leaf.value)+1));
  assert.match(edited,/<DerivedBlock>/);
  edited=edited.replace('</DerivedBlock>',
    '<B8_R2_INVALID>1</B8_R2_INVALID></DerivedBlock>');
  const result=await run(src,edited);
  assert.equal(result.ok,false);assert.equal(result.bytes,null);
  assert(result.refusals.some(x=>x.code===R.UNMAPPED&&x.tag==='B8_R2_INVALID'));
  assert(result.refusals.some(x=>x.code===R.GRAPH&&x.tag==='DELTA_Y'));
});

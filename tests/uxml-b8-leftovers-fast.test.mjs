import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {classifyCategorizedEditableFields as classify,
  patchOriginalFromCategorized as patch,UXML_CATEGORIZED_PATCH_REFUSALS as R}
  from '../uxml/UxmlCategorizedPatchBack.js';
import {categorizedLineRanges,categorizedElementRanges,projectionLeaf,
  S42_LINE_FIELDS,S42_PROJECTION_MAP} from '../uxml/UxmlCategorizedProjectionMap.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const record=(from,to,line,extra='')=>
  '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+
  '" LINE_ID="'+line+'" NAME="SPAN" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" '+
  'DIAMETER="100" WALL_THICK="6" '+extra+'/>';
const source=(rows,eol='')=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+
  rows.join(eol)+'</PIPINGMODEL></CAESARII>';
const patchIt=(original,edit)=>patch(original,s40(original),edit,{fileSha256:hash(original)});
const classifyIt=original=>classify(original,s40(original),{fileSha256:hash(original)});
const lineEdit=(cat,lineId,tag,value)=>{
  const line=categorizedLineRanges(cat).find(x=>x.id===lineId);
  const entry=S42_LINE_FIELDS.find(x=>x.tag===tag);
  assert(line&&entry);
  const leaf=projectionLeaf(line.text,entry);
  assert(leaf,'Line '+lineId+'/'+tag+' visible');
  return cat.slice(0,line.start+leaf.start)+value+cat.slice(line.start+leaf.end);
};
const elementEdit=(cat,index,tag,value)=>{
  const el=categorizedElementRanges(cat)[index];
  const entry=S42_PROJECTION_MAP.find(x=>x.tag===tag);
  assert(el&&entry);
  const leaf=projectionLeaf(el.text,entry);
  assert(leaf,'element '+index+'/'+tag+' visible');
  return cat.slice(0,el.start+leaf.start)+value+cat.slice(el.start+leaf.end);
};
for(const [kind,eol] of [['LF','\n'],['CRLF','\r\n']]){
  test('B8 leftovers FAST Line classifier and writer cross-Line carry '+kind,async()=>{
    const src=source([
      record(10,20,'A','PRESSURE1="10"'),
      record(20,30,'B','PRESSURE1="-1.010100"'),
    ],eol);
    const choices=await classifyIt(src);
    assert.equal(choices.ok,true);
    const a=choices.choices.find(x=>x.key==='L:0:PRESSURE1');
    assert(a,'physical A Line choice must exist');
    assert.equal(a.editable,false,'must refuse before the UI offers an edit');
    assert.equal(a.code,R.CROSS_LINE);
    const out=await patchIt(src,lineEdit(s40(src),'A','PRESSURE1','15'));
    assert.equal(out.ok,false);assert.equal(out.code,a.code);
    assert.equal(out.bytes,null);
    assert(out.refusals.some(x=>x.line==='A'&&x.tag==='PRESSURE1'&&
      x.fileRow===2),'foreign-Line physical row must be shown');
  });
  test('B8 leftovers FAST Line holder disagreement classifier and writer '+kind,async()=>{
    const src=source([
      record(10,20,'A','PRESSURE1="10"'),
      record(20,30,'A','PRESSURE1="11"'),
    ],eol);
    const classified=await classifyIt(src);
    const a=classified.choices.find(x=>x.key==='L:0:PRESSURE1');
    assert.equal(a?.editable,false);
    assert.equal(a?.code,R.LINE_DERIVED);
    const out=await patchIt(src,lineEdit(s40(src),'A','PRESSURE1','15'));
    assert.equal(out.ok,false);assert.equal(out.code,R.LINE_DERIVED);
    assert.equal(out.bytes,null);
  });
  test('B8 leftovers FAST explicit holder and B boundary GREEN '+kind,async()=>{
    const src=source([
      record(10,20,'A','PRESSURE1="10"'),
      record(20,30,'A','PRESSURE1="10"'),
      record(30,40,'B','PRESSURE1="20"'),
    ],eol);
    const a=(await classifyIt(src)).choices.find(x=>x.key==='L:0:PRESSURE1');
    assert.equal(a?.editable,true);
    const out=await patchIt(src,lineEdit(s40(src),'A','PRESSURE1','15'));
    assert.equal(out.ok,true,out.code);assert.equal(out.parity,'EQUAL');
    assert.equal(out.changes.length,2);
    assert.deepEqual(out.changes.map(x=>x.fileRow),[1,2]);
    assert(out.changes.every(x=>x.line==='A'&&Number.isInteger(x.viewRow)));
  });
  test('B8 leftovers non-canonical numeric proposals offer plain form '+kind,async()=>{
    const src=source([record(10,20,'A','PRESSURE1="5"')],eol);
    for(const [value,plain] of [
      ['1.5E+02','150'],['100.','100'],['+5','5'],
    ]){
      const out=await patchIt(src,elementEdit(s40(src),0,'DIAMETER',value));
      assert.equal(out.ok,false);assert.equal(out.code,R.NUMERIC);
      assert.equal(out.bytes,null);
      assert(out.refusals.some(x=>x.tag==='DIAMETER'&&
        x.reason.includes('type '+plain)),value+' needs specific plain form');
    }
  });
}
test('B8 leftovers interleaved A/B/A physical and view rows diverge',async()=>{
  const src=source([
    record(10,20,'A','PRESSURE1="10"'),
    record(20,30,'B','PRESSURE1="20"'),
    record(30,40,'A','PRESSURE1="10"'),
    record(40,50,'A','PRESSURE1="10"'),
  ],'\n');
  const cat=s40(src),view=categorizedElementRanges(cat);
  assert.equal(view.length,4);
  const out=await patchIt(src,elementEdit(cat,1,'NAME','CHANGED-A-ROW3'));
  assert.equal(out.ok,true,out.code);
  assert.equal(out.changes.length,1);
  assert.deepEqual([out.changes[0].viewRow,out.changes[0].fileRow,
    out.changes[0].line],[2,3,'A']);
  // Same-Line section inherited effective value in file row 4, view row 3.
  const sectional=await patchIt(src,elementEdit(cat,1,'DIAMETER','120'));
  if(sectional.ok){
    assert(sectional.inheritedRows.every(x=>Number.isInteger(x.viewRow)&&
      Number.isInteger(x.fileRow)&&typeof x.line==='string'));
  }else assert.equal(sectional.bytes,null);
});
test('B8 leftovers removed Categorized element reports affected row/count',async()=>{
  const src=source([record(10,20,'A'),record(20,30,'A')],'\n');
  const cat=s40(src),edited=cat.replace(/<Element\b[^>]*>[\s\S]*?<\/Element>/,'');
  assert.notEqual(edited,cat);
  const out=await patchIt(src,edited);
  assert.equal(out.ok,false);assert.equal(out.code,R.STRUCTURE);
  assert.equal(out.bytes,null);
  assert((out.refusals||[]).length>0,'UI must have structural detail');
  assert(out.refusals.some(x=>Number.isInteger(x.viewRow)||
    Number.isInteger(x.fileRow)||/count/i.test(x.reason)));
});

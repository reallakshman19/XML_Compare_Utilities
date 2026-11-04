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
      ['1.5E+02','150'],['100.','100'],['+5','5'],['0x10','16'],
    ]){
      const out=await patchIt(src,elementEdit(s40(src),0,'DIAMETER',value));
      assert.equal(out.ok,false);assert.equal(out.code,R.NUMERIC);
      assert.equal(out.bytes,null);
      assert(out.refusals.some(x=>x.tag==='DIAMETER'&&
        x.reason.includes('type '+plain)),value+' needs specific plain form');
      const typed=await patchIt(src,elementEdit(s40(src),0,'DIAMETER',plain));
      assert.equal(typed.ok,true,value+' hint must be accepted when typed');
    }
    for(const value of ['1e-7','1E21']){
      const out=await patchIt(src,elementEdit(s40(src),0,'DIAMETER',value));
      assert.equal(out.ok,false);assert.equal(out.code,R.NUMERIC);
      assert.equal(out.bytes,null);
      const reason=out.refusals.find(x=>x.tag==='DIAMETER')?.reason;
      assert.match(reason,/^Numeric field requires an exact finite decimal/);
      assert.equal(reason.includes('; type '),false,
        value+' must have generic refusal (no non-canonical hint)');
    }
  });
}

const withChild=(from,to,line,child)=>
  record(from,to,line).replace(/\/>$/,'>'+child+'</PIPINGELEMENT>');
for(const [kind,eol] of [['LF','\n'],['CRLF','\r\n']]){
  for(const [label,markup] of [
    ['comment RESTRAINT','<!-- <RESTRAINT NODE="99" TYPE="9"/> -->'],
    ['CDATA RESTRAINT','<![CDATA[<RESTRAINT NODE="99" TYPE="9"/>]]>'],
    ['comment SIF','<!-- <SIF NODE="99" SIF_VALUE="9"/> -->'],
  ]){
    test('B8 leftovers FAST S4.0 hidden markup refuses '+label+' '+kind,async()=>{
      const src=source([
        withChild(10,20,'A','<RESTRAINT NODE="20" TYPE="8"/>'),
        withChild(20,30,'B',markup),
      ],eol);
      const target=src.replace('TYPE="8"','TYPE="10"');
      assert.notEqual(target,src);
      const out=await patchIt(src,s40(target));
      assert.equal(out.ok,false,label+' '+kind);
      assert.equal(out.code,R.EXTERNAL,label+' '+kind);
      assert.equal(out.bytes,null,'refusal must not write bytes');
    });
  }
  test('B8 leftovers FAST S4.0 nested harvest refuses '+kind,async()=>{
    const src=source([
      withChild(10,20,'A','<RESTRAINT NODE="20" TYPE="8"/>'),
      withChild(20,30,'B',
        '<BEND RADIUS="1"><RESTRAINT NODE="99" TYPE="9"/></BEND>'),
    ],eol);
    const target=src.replace('TYPE="8"','TYPE="10"');
    assert.notEqual(target,src);
    const out=await patchIt(src,s40(target));
    assert.equal(out.ok,false,kind);
    assert.equal(out.code,R.EXTERNAL,kind);
    assert.equal(out.bytes,null);
  });
  test('B8 leftovers FAST interleaved cross-Line carry refusal coordinates '+kind,async()=>{
    const src=source([
      record(10,20,'A'),
      record(20,30,'B').replace('DIAMETER="100"','DIAMETER="-1.010100"'),
      record(30,40,'A'),
      record(40,50,'A'),
    ],eol);
    const cat=s40(src),view=categorizedElementRanges(cat);
    assert.equal(view.length,4);
    const out=await patchIt(src,elementEdit(cat,0,'DIAMETER','120'));
    assert.equal(out.ok,false);
    assert.equal(out.code,R.CROSS_LINE);
    assert.equal(out.bytes,null);
    assert(out.refusals.some(x=>x.line==='A'&&x.tag==='DIAMETER'&&
      x.row===2&&x.fileRow===2&&x.viewRow===4),
      'physical B row 2 must map to Categorized view row 4');
  });
}

test('B8 leftovers interleaved A/B/A physical and view rows diverge',async()=>{
  const src=source([
    record(10,20,'A','PRESSURE1="10"'),
    record(20,30,'B','PRESSURE1="20"'),
    record(30,40,'A','PRESSURE1="10"'),
    record(40,50,'A','PRESSURE1="10"').replace('DIAMETER="100"','DIAMETER="-1.010100"'),
  ],'\n');
  const cat=s40(src),view=categorizedElementRanges(cat);
  assert.equal(view.length,4);
  const out=await patchIt(src,elementEdit(cat,1,'NAME','CHANGED-A-ROW3'));
  assert.equal(out.ok,true,out.code);
  assert.equal(out.changes.length,1);
  assert.deepEqual([out.changes[0].viewRow,out.changes[0].fileRow,
    out.changes[0].line],[2,3,'A']);
  // A(row 3) changes; A(row 4) inherits without a source byte edit.
  const sectional=await patchIt(src,elementEdit(cat,1,'DIAMETER','120'));
  assert.equal(sectional.ok,true,sectional.code);
  assert.equal(sectional.parity,'EQUAL');
  assert.deepEqual(sectional.changes.map(x=>[x.viewRow,x.fileRow]),[[2,3]]);
  assert.deepEqual(sectional.inheritedRows,[{
    row:4,fileRow:4,viewRow:3,line:'A',tag:'DIAMETER',
    oldEffective:'100',newEffective:'120',
  }]);
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

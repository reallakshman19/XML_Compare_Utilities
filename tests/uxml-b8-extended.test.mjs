import {b7VerifiedReceiptCurrent} from '../tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40,_test as s40Test}
  from '../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized as patch,UXML_CATEGORIZED_PATCH_REFUSALS as R}
  from '../uxml/UxmlCategorizedPatchBack.js';
import {S42_LINE_FIELDS,S42_LINE_PROJECTION_MAP,categorizedLineRanges,projectionLeaf,
  S42_PROJECTION_MAP,categorizedElementRanges} from '../uxml/UxmlCategorizedProjectionMap.js';
import {scanOriginalInputXmlStructure as scan}
  from '../uxml/UxmlInputXmlSourceStructure.js';
import {_test as workspaceUi} from '../tabs/inputxml-workspace/inputxml-workspace-tab.js';

const b=text=>Buffer.from(text,'utf8');
const sha=text=>createHash('sha256').update(b(text)).digest('hex');
const run=(source,edited)=>patch(source,s40(source),edited,{fileSha256:sha(source)});
const row=(from,to,extra='')=>'<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+'" LINE_ID="L" NAME="SPAN" DELTA_X="10" DELTA_Y="20" DELTA_Z="30" DIAMETER="100" WALL_THICK="6" '+extra+'/>';
const original=(...rows)=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+rows.join('')+'</PIPINGMODEL></CAESARII>';
const edit=(cat,tag,newValue)=>{
  const re=new RegExp('(<'+tag+'>)([^<]*)(<\\/'+tag+'>)');
  assert.match(cat,re,'present '+tag);
  return cat.replace(re,(_all,a,_old,z)=>a+newValue+z);
};
function checkByteRanges(source,actual){
  let oldPos=0,newPos=0;
  const next=b(new TextDecoder('utf8').decode(actual.bytes)),before=b(source);
  for(const change of actual.changes){
    assert.equal(typeof change.recordKey,'string');
    assert.match(change.field,/^PIPINGELEMENT\./);
    const unchanged=before.subarray(oldPos,change.byteRange.start);
    assert.deepEqual(next.subarray(newPos,newPos+unchanged.length),unchanged);
    newPos+=unchanged.length;
    const replacement=b(change.new);
    assert.deepEqual(next.subarray(newPos,newPos+replacement.length),replacement);
    newPos+=replacement.length;oldPos=change.byteRange.end;
  }
  assert.deepEqual(next.subarray(newPos),before.subarray(oldPos));
}
test('B8 exact line map enumerates all and only unchanged S4.0 Process/Material field lists',()=>{
  const set=new Set(S42_LINE_FIELDS.map(e=>e.block+'.'+e.tag));
  assert.equal(set.size,S42_LINE_FIELDS.length);
  assert.equal(S42_LINE_PROJECTION_MAP.ProcessBlock.length,27);
  assert.equal(S42_LINE_PROJECTION_MAP.MaterialBlock.length,18);
  for(const e of S42_LINE_FIELDS){
    assert.equal(e.attribute,e.tag);
    assert.equal(e.sourceTag,'PIPINGELEMENT');
    const attrs={LINE_ID:'L',[e.tag]:'5.125'};
    const merged=s40Test.mergeLineAttrs({},attrs);
    assert.equal(merged[e.tag],'5.125');
    const rendered=s40Test.lineBlocksXml(merged);
    assert.match(rendered,new RegExp('<'+e.tag+'>5\\.125</'+e.tag+'>'));
    assert.equal(s40Test.mergeLineAttrs(merged,{[e.tag]:'99'})[e.tag],'5.125',
      'first non-sentinel wins without rewriting disagreement');
    assert.equal(s40Test.mergeLineAttrs({}, {[e.tag]:'-1.010100'})[e.tag],undefined,
      'unset never establishes a line field');
  }
});
for(const e of S42_LINE_FIELDS){
  test('B8 source-bound exact S4.0 '+e.block+'.'+e.tag,async()=>{
    const isText=/NAME|WELD/.test(e.tag),old=isText?'MATERIAL_A':'5.125',next=isText?'MATERIAL_B':'9.25';
    const source=original(row(10,20,e.tag+'="'+old+'"'),
      row(20,30,e.tag+'="'+old+'"'),row(30,40,e.tag+'="-1.010100"'));
    const canonical=s40(source);
    const lines=categorizedLineRanges(canonical);
    assert.equal(lines.length,1);
    const field=projectionLeaf(lines[0].text,e);
    assert.equal(field?.value,old,'unchanged S4.0 field echo');
    const result=await run(source,edit(canonical,e.tag,next));
    assert.equal(result.ok,true,e.tag+': '+result.code+' '+JSON.stringify(result.refusals));
    assert.equal(result.parity,'EQUAL');
    const expected=source.replaceAll(e.tag+'="'+old+'"',e.tag+'="'+next+'"');
    assert.deepEqual(b(expected),Buffer.from(result.bytes));
    assert.equal(result.changes.length,2,'only two explicit holders change');
    assert(result.changes.every(c=>c.field==='PIPINGELEMENT.'+e.tag&&
      c.writtenExactlyAsTyped===true));
    checkByteRanges(source,result);
    assert.equal(s40(expected),s40(Buffer.from(result.bytes).toString('utf8')));
  });
}
test('B8 multi-line independent source bindings never write another Line',async()=>{
  const source='<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+
    row(10,20,'PRESSURE1="1.5"').replace('LINE_ID="L"','LINE_ID="LINE-A"')+
    row(30,40,'PRESSURE1="2.5"').replace('LINE_ID="L"','LINE_ID="LINE-B"')+
    '</PIPINGMODEL></CAESARII>';
  const cat=s40(source),line=categorizedLineRanges(cat).find(x=>x.id==='LINE-B');
  assert(line);
  const field=projectionLeaf(line.text,S42_LINE_FIELDS.find(x=>x.tag==='PRESSURE1'));
  assert(field);
  const edited=cat.slice(0,line.start+field.start)+'7.5'+cat.slice(line.start+field.end);
  const result=await run(source,edited);
  assert.equal(result.ok,true,result.code);
  assert.deepEqual(b(source.replace('PRESSURE1="2.5"','PRESSURE1="7.5"')),
    Buffer.from(result.bytes));
  assert.equal(result.changes.length,1);
});
test('B8 inconsistent same-line explicit source values refuse: no global overwrite',async()=>{
  const src=original(row(10,20,'PRESSURE1="1.5" MODULUS="5"'),
    row(20,30,'PRESSURE1="2.5" MODULUS="6"'));
  const cat=s40(src);
  const edited=edit(edit(cat,'PRESSURE1','7.5'),'MODULUS','9');
  const result=await run(src,edited);
  assert.equal(result.ok,false);
  assert.equal(result.code,R.LINE_DERIVED);
  assert.equal(result.bytes,null);
  assert.deepEqual(new Set(result.refusals.map(x=>x.tag)),new Set(['PRESSURE1','MODULUS']));
  assert(result.refusals.every(x=>x.line==='L'));
});
test('B8 global stanza refusal and unrelated unmapped edits name every offending Line/row/tag',async()=>{
  const src=original(row(10,20,'PRESSURE1="1.5"')).replace('</PIPINGMODEL>',
    '<ALLOWABLESTRESS NODE="10" ALLOWABLE_1="100"/></PIPINGMODEL>');
  const cat=s40(src);
  assert.match(cat,/ALLOWABLESTRESS/);
  const edited=cat.replace('ALLOWABLE_1="100"','ALLOWABLE_1="200"')
    .replace('</DerivedBlock>','<UNMAPPED_B8>7</UNMAPPED_B8></DerivedBlock>');
  const result=await run(src,edited);
  assert.equal(result.ok,false);
  assert.equal(result.bytes,null);
  assert(result.refusals.some(x=>x.code===R.GLOBAL&&x.tag==='ALLOWABLESTRESS'&&x.line==='L'));
  assert(result.refusals.some(x=>x.tag==='UNMAPPED_B8'&&x.row===1));
});
test('B8 physical existing NAME editable; omitted NAME fallback refuses with source reason',async()=>{
  const existing=original(row(10,20));
  let out=await run(existing,edit(s40(existing),'NAME','NEW-SPAN'));
  assert.equal(out.ok,true,out.code);
  const omitted=original(row(10,20).replace(' NAME="SPAN"',''));
  out=await run(omitted,edit(s40(omitted),'NAME','NEW-SPAN'));
  assert.equal(out.ok,false);
  assert.equal(out.bytes,null);
  assert.equal(out.code,R.OMITTED);
  assert(out.refusals.some(x=>x.row===1&&x.tag==='NAME'));
});
test('B8 four public sources, LF/CRLF, line tag exact value write and non-target byte preservation',async()=>{
  const inputs=[
    ['GRE','docs/GREInputxml.xml'],['PLB314','docs/PLB314Inputxml.xml'],
    ['mock','opt/mock-xml.xml'],
    ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
  ];
  for(const [name,path] of inputs){
    const raw=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    for(const [eol,source] of [['LF',raw.replace(/\r\n/g,'\n')],
      ['CRLF',raw.replace(/\r?\n/g,'\r\n')]]){
      const cat=s40(source),line=categorizedLineRanges(cat)[0];
      const entry=S42_LINE_FIELDS.find(x=>x.tag==='PRESSURE1');
      const field=projectionLeaf(line.text,entry);
      assert(field,name+' has a public PRESSURE1');
      const next='4.56875';
      const result=await run(source,edit(cat,'PRESSURE1',next));
      assert.equal(result.ok,true,name+'/'+eol+': '+result.code+' '+JSON.stringify(result.refusals));
      assert.equal(result.parity,'EQUAL');
      const sourceRows=scan(source);
      const expectedRows=sourceRows.filter(x=>
        /\bPRESSURE1="(?!-1\.0101)[^"]+"/.test(x.open));
      assert.equal(result.changes.length,expectedRows.length);
      assert(result.changes.every(x=>x.field==='PIPINGELEMENT.PRESSURE1'));
      checkByteRanges(source,result);
      const patched=Buffer.from(result.bytes).toString('utf8');
      assert.equal(s40(patched).includes('<PRESSURE1>'+next+'</PRESSURE1>'),true);
      console.log('B8_PUBLIC '+name+' '+eol+' explicitHolders='+expectedRows.length+
        ' changed='+result.changes.length+' parity=EQUAL');
    }
  }
});

test('B8 editor classifies mapped root fields, omitted NAME and globally shared AllowableStress read-only',()=>{
  const src=original(row(10,20,'PRESSURE1="1.5"').replace(' NAME="SPAN"',''))
    .replace('</PIPINGMODEL>',
      '<ALLOWABLESTRESS NODE="10" ALLOWABLE_1="100"/></PIPINGMODEL>');
  const choices=workspaceUi.b8EditableChoices(s40(src));
  const pressure=choices.find(x=>x.tag==='PRESSURE1'&&x.where==='Line L');
  assert.equal(pressure?.editable,true,'explicit ProcessBlock source attribute');
  const name=choices.find(x=>x.tag==='NAME'&&x.where==='Element 1');
  assert.equal(name?.editable,false,'source NAME absent, element-key fallback cannot be edited');
  const global=choices.find(x=>x.tag==='ALLOWABLESTRESS');
  assert.equal(global?.editable,false,'global shared stanza must not expose a writable value box');
  assert.equal(global?.where,'Line L');
});

test('B8 existing empty NAME attribute uses exact S4.0 fallback but is writable without adding markup',async()=>{
  const src=original(row(10,20).replace(' NAME="SPAN"',' NAME=""'));
  const cat=s40(src),field=projectionLeaf(categorizedElementRanges(cat)[0].text,
    S42_PROJECTION_MAP.find(x=>x.tag==='NAME'));
  assert(field,'S4.0 shows elementKey fallback for empty source NAME');
  const edited=cat.slice(0,categorizedElementRanges(cat)[0].start+field.start)+
    'B8-NEW-NAME'+cat.slice(categorizedElementRanges(cat)[0].start+field.end);
  const result=await run(src,edited);
  assert.equal(result.ok,true,result.code+' '+JSON.stringify(result.refusals));
  assert.deepEqual(Buffer.from(result.bytes),b(src.replace('NAME=""','NAME="B8-NEW-NAME"')));
  assert.equal(result.changes[0].field,'PIPINGELEMENT.NAME');
  assert.equal(result.changes[0].writtenExactlyAsTyped,true);
});
test('B8 four public samples first NAME edit stays one exact existing source attribute',async()=>{
  const sources=[
    ['GRE','docs/GREInputxml.xml'],['PLB314','docs/PLB314Inputxml.xml'],
    ['mock','opt/mock-xml.xml'],['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
  ];
  for(const [label,path] of sources){
    const src=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const cat=s40(src),element=categorizedElementRanges(cat)[0];
    const field=projectionLeaf(element.text,S42_PROJECTION_MAP.find(x=>x.tag==='NAME'));
    assert(field,label+' has NAME display');
    const next='B8-PUBLIC-NAME';
    const edited=cat.slice(0,element.start+field.start)+next+
      cat.slice(element.start+field.end);
    const result=await run(src,edited);
    assert.equal(result.ok,true,label+' '+result.code+' '+JSON.stringify(result.refusals));
    assert.equal(result.parity,'EQUAL');
    assert.equal(result.changes.length,1);
    assert.equal(result.changes[0].field,'PIPINGELEMENT.NAME');
    checkByteRanges(src,result);
    console.log('B8_PUBLIC_NAME '+label+' changed=1 parity=EQUAL');
  }
});

for(const mapping of S42_LINE_FIELDS){
  for(const [position,index] of [['first',0],['middle',1],['last',2]]){
    test('B8 first/middle/last explicit source holder '+mapping.tag+' '+position,async()=>{
      const old=/NAME|WELD/.test(mapping.tag)?'MAT-A':'5.125';
      const next=/NAME|WELD/.test(mapping.tag)?'MAT-B':'8.625';
      const rows=[
        row(10,20,mapping.tag+'="-1.010100"'),
        row(20,30,mapping.tag+'="-1.010100"'),
        row(30,40,mapping.tag+'="-1.010100"'),
      ];
      rows[index]=rows[index].replace(mapping.tag+'="-1.010100"',
        mapping.tag+'="'+old+'"');
      const src=original(...rows),cat=s40(src);
      const visible=projectionLeaf(categorizedLineRanges(cat)[0].text,mapping);
      assert.equal(visible?.value,old,'unchanged S4.0 must locate this one holder');
      const result=await run(src,edit(cat,mapping.tag,next));
      assert.equal(result.ok,true,mapping.tag+'/'+position+': '+result.code);
      assert.equal(result.parity,'EQUAL');
      assert.equal(result.changes.length,1);
      assert.equal(result.changes[0].recordKey?.startsWith('E'+index+':'),true);
      assert.deepEqual(Buffer.from(result.bytes),
        b(src.replace(mapping.tag+'="'+old+'"',mapping.tag+'="'+next+'"')));
      checkByteRanges(src,result);
    });
  }
}

test('B8 controller snapshot terms reject stale editor independent of epoch and source SHA',()=>{
  const checked={revision:4,editor:'edited',originalSha:'a'.repeat(64),
    ok:true,parity:'EQUAL',bytes:new Uint8Array([1]),changes:[]};
  assert.equal(b7VerifiedReceiptCurrent(checked,{revision:4,edited:'edited',fileSha256:'a'.repeat(64)}),true);
  assert.equal(b7VerifiedReceiptCurrent(checked,{revision:4,edited:'other',fileSha256:'a'.repeat(64)}),false);
});
test('B8 controller snapshot terms reject stale original SHA independent of epoch and editor',()=>{
  const checked={revision:4,editor:'edited',originalSha:'a'.repeat(64),
    ok:true,parity:'EQUAL',bytes:new Uint8Array([1]),changes:[]};
  assert.equal(b7VerifiedReceiptCurrent(checked,{revision:4,edited:'edited',fileSha256:'a'.repeat(64)}),true);
  assert.equal(b7VerifiedReceiptCurrent(checked,{revision:4,edited:'edited',fileSha256:'b'.repeat(64)}),false);
});

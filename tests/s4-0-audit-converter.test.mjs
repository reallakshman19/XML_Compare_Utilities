/** S4.0 read-only audit: every matrix row has a named executable test.
 * PASS can prove source loss. All fixtures are synthetic or GRE/PLB public.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputXmlToCategorizedInputXml as forward,
 categorizedInputXmlToInputXml as reverse,_test as internal}
 from '../docs/xml-compare/CategorizedInputXmlConverter.js';

const BOM='\uFEFF',CRLF='\r\n';
const E1='<PIPINGELEMENT B="second" FROM_NODE="10.000000" A="first" TO_NODE="20.000000" LINE_ID="LINE-91261" DELTA_X="10.000000" MATERIAL_NAME="ORIGINAL">'+CRLF+
 '  <!-- S4_INSIDE -->'+CRLF+'  <NOTE TEXT="A&amp;B"/>'+CRLF+
 '  <RESTRAINT NODE="20.000000" TYPE="8.000000" TAG="R-A"/>'+CRLF+'</PIPINGELEMENT>';
const E2='<PIPINGELEMENT FROM_NODE="30.000000" TO_NODE="40.000000" LINE_ID="LINE-B" DELTA_X="20.000000"/>';
const DECL='<?xml version="1.0" encoding="ISO-8859-1" standalone="yes"?>';
const SRC=[
 BOM+DECL,'<!DOCTYPE CAESARII [<!ENTITY synt "S4_SAFETY">]>',
 '<CAESARII VERSION="14.00" XML_TYPE="Input" Z="tail" A="head">',
 '<!-- S4_OUTSIDE -->','<HEADER KEEP="YES"/>',
 '<PIPINGMODEL JOBNAME="S4-GENERATED" CUSTOM="S4-HEADER" NUMELT="2">',
 E1,E2,'</PIPINGMODEL>','<OTHER_SECTION KEEP="YES"/>','</CAESARII>',
].join(CRLF)+CRLF;
const CAT=forward(SRC,{sourceName:'S4-Synthetic'});
const OUT=reverse(CAT);
const embedDocument=source=>CAT.replace('</CategorizedInputXML>',
 '<OriginalDocument><![CDATA['+source.replaceAll(']]>',']]]]><![CDATA[>')+
 ']]></OriginalDocument></CategorizedInputXML>');
const EXACT=reverse(embedDocument(SRC));

test('S4-F-SOURCE element source is carried in OriginalElement CDATA, not as authoritative edits',()=>{
 assert.ok(CAT.includes('<OriginalElement><![CDATA['+E1));
 assert.equal((CAT.match(/<OriginalElement>/g)||[]).length,2);
 assert.ok(!CAT.includes('<OriginalDocument>'));
});
const forwardRows=[
 ['DECL',()=>{assert.ok(CAT.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));assert.ok(!CAT.includes(DECL));}],
 ['ROOT',()=>{assert.ok(CAT.includes('<CategorizedInputXML schema='));assert.ok(!CAT.includes('<CAESARII VERSION='));}],
 ['HEADER',()=>{assert.ok(!CAT.includes('JOBNAME="S4-GENERATED"'));assert.ok(!CAT.includes('CUSTOM="S4-HEADER"'));}],
 ['TOP',()=>{assert.ok(!CAT.includes('<HEADER KEEP='));assert.ok(!CAT.includes('<OTHER_SECTION'));}],
 ['COMMENTS',()=>{assert.ok(!CAT.includes('S4_OUTSIDE'));assert.ok(CAT.includes('<!-- S4_INSIDE -->'));}],
 ['ENTITIES',()=>{assert.ok(!CAT.includes('<!ENTITY synt'));assert.ok(CAT.includes('TEXT="A&amp;B"'));}],
 ['CDATA',()=>{
  const src='<CAESARII><PIPINGMODEL><PIPINGELEMENT FROM_NODE="1" TO_NODE="2"><NOTE><![CDATA[S4CDATA]]></NOTE></PIPINGELEMENT></PIPINGMODEL></CAESARII>';
  const cat=forward(src);assert.ok(cat.includes(']]]]><![CDATA[>'));
  assert.ok(!cat.includes('<OriginalElement><![CDATA[<PIPINGELEMENT FROM_NODE="1" TO_NODE="2"><NOTE><![CDATA[S4CDATA]]></NOTE></PIPINGELEMENT>]]></OriginalElement>'));
 }],
 ['EOL',()=>{assert.ok(CAT.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));assert.ok(CAT.includes('<!-- S4_INSIDE -->'+CRLF));}],
 ['BOM',()=>{assert.ok(!CAT.startsWith(BOM));}],
 ['ORDER',()=>{assert.ok(CAT.includes('B="second" FROM_NODE="10.000000" A="first" TO_NODE="20.000000"'));}],
 ['SPACE',()=>{assert.ok(CAT.includes('  <!-- S4_INSIDE -->'+CRLF));assert.ok(!CAT.includes(CRLF+'<HEADER KEEP='));}],
];
for(const [id,fn] of forwardRows)test('S4-F-'+id+' forward loss/preservation contract',fn);

const docRows=[
 ['DECL',()=>assert.ok(EXACT.startsWith(BOM+DECL))],
 ['ROOT',()=>assert.ok(EXACT.includes('<CAESARII VERSION="14.00" XML_TYPE="Input" Z="tail" A="head">'))],
 ['HEADER',()=>assert.ok(EXACT.includes('JOBNAME="S4-GENERATED" CUSTOM="S4-HEADER"'))],
 ['TOP',()=>assert.ok(EXACT.includes('<OTHER_SECTION KEEP="YES"/>'))],
 ['COMMENTS',()=>{assert.ok(EXACT.includes('S4_INSIDE'));assert.ok(EXACT.includes('S4_OUTSIDE'));}],
 ['ENTITIES',()=>{assert.ok(EXACT.includes('<!ENTITY synt'));assert.ok(EXACT.includes('TEXT="A&amp;B"'));}],
 ['EOL',()=>assert.ok(EXACT.includes(CRLF))],
 ['BOM',()=>assert.ok(EXACT.startsWith(BOM))],
 ['ORDER',()=>assert.ok(EXACT.includes('B="second" FROM_NODE="10.000000" A="first"'))],
 ['SPACE',()=>assert.equal(EXACT,SRC)],
];
for(const [id,fn] of docRows)test('S4-D-'+id+' OriginalDocument exact-string bypass',()=>{
 assert.equal(EXACT,SRC);fn();
});
test('S4-D-CDATA embedded CDATA terminator defeats unconditional exactness',()=>{
 const withCdata=SRC.replace('<NOTE TEXT="A&amp;B"/>','<NOTE><![CDATA[S4CDATA]]></NOTE>');
 assert.notEqual(reverse(embedDocument(withCdata)),withCdata);
});
test('S4-D-DERIVED edited Material/Coordinates blocks ignored even with OriginalDocument',()=>{
 const changed=embedDocument(SRC).replace('<DerivedBlock>','<DerivedBlock><MaterialName>EDIT_S4</MaterialName>');
 assert.equal(reverse(changed),SRC);
});

const noDocRows=[
 ['DECL',()=>{assert.ok(OUT.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));assert.ok(!OUT.includes(DECL));}],
 ['ROOT',()=>{assert.ok(OUT.includes('<CAESARII XML_TYPE="Input">\n<PIPINGMODEL>'));assert.ok(!OUT.includes('Z="tail" A="head"'));}],
 ['HEADER',()=>{assert.ok(!OUT.includes('JOBNAME="S4-GENERATED"'));assert.ok(!OUT.includes('CUSTOM="S4-HEADER"'));}],
 ['TOP',()=>{assert.ok(!OUT.includes('<OTHER_SECTION'));assert.ok(!OUT.includes('<HEADER KEEP='));}],
 ['COMMENTS',()=>{assert.ok(!OUT.includes('S4_OUTSIDE'));assert.ok(OUT.includes('S4_INSIDE'));}],
 ['ENTITIES',()=>{assert.ok(!OUT.includes('<!ENTITY synt'));assert.ok(OUT.includes('TEXT="A&amp;B"'));}],
 ['CDATA',()=>{
  const src='<CAESARII><PIPINGMODEL><PIPINGELEMENT FROM_NODE="1" TO_NODE="2"><NOTE><![CDATA[S4CDATA]]></NOTE></PIPINGELEMENT></PIPINGMODEL></CAESARII>';
  const expected='<PIPINGELEMENT FROM_NODE="1" TO_NODE="2"><NOTE><![CDATA[S4CDATA]]></NOTE></PIPINGELEMENT>';
  assert.ok(!reverse(forward(src)).includes(expected));
 }],
 ['EOL',()=>{assert.ok(OUT.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));assert.ok(OUT.includes('<!-- S4_INSIDE -->'+CRLF));}],
 ['BOM',()=>assert.ok(!OUT.startsWith(BOM))],
 ['ORDER',()=>{assert.ok(OUT.includes('B="second" FROM_NODE="10.000000" A="first"'));assert.ok(!OUT.includes('<CAESARII VERSION='));}],
 ['SPACE',()=>{assert.ok(OUT.endsWith('</CAESARII>\n'));assert.ok(!OUT.includes(CRLF+'<OTHER_SECTION'));}],
];
for(const [id,fn] of noDocRows)test('S4-N-'+id+' reverse without OriginalDocument loss/preservation',fn);

test('S4-N-DERIVED edit Coordinates/Material is silently dropped',()=>{
 const altered=CAT.replace('<DerivedBlock>','<DerivedBlock><MaterialName>S4_CHANGED</MaterialName>')
  .replace('<RouteGeometryBlock>','<RouteGeometryBlock><DELTA_X>99999</DELTA_X>');
 const output=reverse(altered);
 assert.ok(altered.includes('S4_CHANGED'));
 assert.ok(!output.includes('S4_CHANGED'));
 assert.ok(!output.includes('99999'));
 assert.ok(output.includes('MATERIAL_NAME="ORIGINAL"'));
});
test('S4-N-HEADER-LOSS rebuild drops original header and nonexternal top-level sections',()=>{
 assert.notEqual(OUT,SRC);
 assert.ok(!OUT.includes('JOBNAME='));
 assert.ok(!OUT.includes('OTHER_SECTION'));
});
test('S4-EXT-MULTIBRANCH collects raw external blocks globally, exact-trim dedup; source copies are duplicated',()=>{
 const a='<RESTRAINT NODE="20" TYPE="8" TAG="R1"/>';
 const b='<RESTRAINT NODE="50" TYPE="8" TAG="R2"/>';
 const input='<CAESARII><PIPINGMODEL>'+
 '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="A">'+a+'</PIPINGELEMENT>'+
 '<PIPINGELEMENT FROM_NODE="20" TO_NODE="30" LINE_ID="A">'+a+'</PIPINGELEMENT>'+
 '<PIPINGELEMENT FROM_NODE="40" TO_NODE="50" LINE_ID="B">'+b+'</PIPINGELEMENT>'+
 '</PIPINGMODEL></CAESARII>';
 const cat=forward(input);
 assert.equal((cat.match(/<Line id=/g)||[]).length,2);
 assert.deepEqual(internal.categorizedExternalBlocks(cat),[a,b]);
 const out=reverse(cat);
 assert.equal((out.match(/<RESTRAINT NODE="20"/g)||[]).length,3);
 assert.equal((out.match(/<RESTRAINT NODE="50"/g)||[]).length,2);
});
test('S4-PUBLIC-GRE-PLB314 actual public CAESAR samples use snapshot path and lose header on reverse',async()=>{
 for(const [file,n] of [['GREInputxml.xml',100],['PLB314Inputxml.xml',53]]){
  const src=await readFile(new URL('../docs/'+file,import.meta.url),'utf8');
  const cat=forward(src);
  assert.equal((cat.match(/<OriginalElement>/g)||[]).length,n,file);
  const out=reverse(cat);
  assert.ok(out.includes('<CAESARII XML_TYPE="Input">'),file);
  assert.ok(!out.includes('JOBNAME='),file);
 }
});

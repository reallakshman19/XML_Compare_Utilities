/** Strict S3 source-envelope refusals, shared S4.1 structural authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mapCaesarInputXmlToUxmlStrict as strict} from '../uxml/UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure as scan} from '../uxml/UxmlInputXmlSourceStructure.js';

const base='ee04cc9c3503ea8a21c683fdab1b85ece79cc443';
const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const element=(from,to,dx='100')=>
  '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+
  '" DELTA_X="'+dx+'" DELTA_Y="-1.010100" DELTA_Z="-1.010100"'+
  ' DIAMETER="100" WALL_THICK="6.02"/>';
const model=(inner)=>'<CAESARII><PIPINGMODEL>'+inner+'</PIPINGMODEL></CAESARII>';
const valid=()=>model(element('10','20')+element('20','30'));

const s3Attrs=(from,to,fx,tx)=>[
  'FROM_NODE="'+from+'"','TO_NODE="'+to+'"',
  'FROM_X="'+fx+'"','FROM_Y="0"','FROM_Z="0"',
  'TO_X="'+tx+'"','TO_Y="0"','TO_Z="0"',
  'DELTA_X="'+(tx-fx)+'"','DELTA_Y="-1.010100"','DELTA_Z="-1.010100"',
  'DIAMETER="100"','WALL_THICK="6.02"','EXTRA_SOURCE_ATTR="retained"',
].join(' ');
// Exact S3 fixture contract from tests/uxml-s3-caesar-inputxml.test.mjs.
const strictS3Fixture=()=> '<?xml version="1.0"?><CAESARII xmlns="COADE"><PIPINGMODEL xmlns="" LINE_ID="L-1">' +
  '<PIPINGELEMENT '+s3Attrs(10,20,100,200)+'><RESTRAINT NODE="20" TYPE="0" /></PIPINGELEMENT>' +
  '<PIPINGELEMENT '+s3Attrs(20,30,200,300)+'><BEND RADIUS="45"/></PIPINGELEMENT>' +
  '</PIPINGMODEL></CAESARII>';

const refused=(xml,pattern=/^INPUT_XML_SOURCE_STRUCTURE_REFUSED$/)=>{
  assert.equal(scan(xml),null,'expected shared scanner refusal');
  assert.throws(()=>strict(xml,{fileSha256:sha(xml)}),error=>{
    assert.match(String(error.message),pattern);
    return true;
  });
};
const nameFixture=(file)=>readFileSync(new URL('../docs/'+file,import.meta.url),'utf8');
const repoFixture=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('S3 STRUCTURE REFUSE complete PIPINGELEMENT inside comment alongside real record',()=>{
  refused(model(element('10','20')+'<!--'+element('30','40')+'-->'));
});
test('S3 STRUCTURE REFUSE comment-only physical record',()=>{
  refused(model('<!--'+element('10','20')+'-->'));
});
test('S3 STRUCTURE REFUSE complete PIPINGELEMENT inside processing instruction',()=>{
  refused(model(element('10','20')+'<?probe '+element('30','40')+'?>'));
});
test('S3 STRUCTURE REFUSE PI-only physical record',()=>{
  refused(model('<?probe '+element('10','20')+'?>'));
});
test('S3 STRUCTURE REFUSE complete PIPINGELEMENT inside CDATA',()=>{
  refused(model(element('10','20')+'<![CDATA['+element('30','40')+']]>'));
});
test('S3 STRUCTURE REFUSE complete PIPINGELEMENT inside DOCTYPE subset',()=>{
  refused('<!DOCTYPE CAESARII [<!ENTITY fake "'+element('40','50')+'">]>'+valid());
});
test('S3 STRUCTURE REFUSE element after closing CAESARII',()=>{
  refused(valid()+element('30','40'));
});
test('S3 STRUCTURE REFUSE element between closing PIPINGMODEL and CAESARII',()=>{
  refused(valid().replace('</PIPINGMODEL>','</PIPINGMODEL>'+element('30','40')));
});
test('S3 STRUCTURE REFUSE nested row in model wrapper',()=>{
  refused(model('<WRAPPER>'+element('10','20')+'</WRAPPER>'));
});
test('S3 STRUCTURE REFUSE duplicate root',()=>{
  refused(valid()+valid());
});
test('S3 STRUCTURE REFUSE duplicate PIPINGMODEL under root',()=>{
  refused(valid().replace('</CAESARII>',
    '<PIPINGMODEL>'+element('30','40')+'</PIPINGMODEL></CAESARII>'));
});
test('S3 STRUCTURE REFUSE unmatched closing tags',()=>{
  refused(model(element('10','20')).replace('</PIPINGMODEL>','</WRONG>'));
});
test('S3 STRUCTURE REFUSE trailing nonwhitespace text',()=>{
  refused(valid()+'trailer');
});
test('S3 STRUCTURE REFUSE XML reserved prefix PI xml-foo',()=>{
  refused('<?xml-foo?>'+valid());
});
test('S3 STRUCTURE REFUSE duplicated element attribute',()=>{
  refused(valid().replace('FROM_NODE="10"','FROM_NODE="10" FROM_NODE="10"'));
});
test('S3 STRUCTURE REFUSE raw less-than inside attribute value',()=>{
  refused(valid().replace('FROM_NODE="10"','FROM_NODE="10<11"'));
});
test('S3 ACCEPT public GRE and PLB314 UNITS siblings while S4.1 remains records-only',()=>{
  for(const [name,count] of [['GREInputxml.xml',100],['PLB314Inputxml.xml',53]]){
    const src=nameFixture(name);
    assert.match(src,/<UNITS\b/,name+' uses a legitimate non-record child');
    const physical=scan(src);
    assert.equal(physical?.length,count,name+' source physical rows');
    const doc=strict(src,{fileSha256:sha(src)});
    assert.equal(doc.components.length,count,name+' S3 record count');
    assert.equal(doc.ports.length,2*count,name+' S3 two ports per row');
    assert.equal(scan(src,{recordsOnlyModel:true}),null,
      name+' remains refused by S4.1 records-only source contract');
  }
});
test('S3 STRUCTURE REFUSE a complete PIPINGELEMENT nested inside UNITS',()=>{
  const src=model(
    '<UNITS><PIPINGELEMENT FROM_NODE="70" TO_NODE="80" DELTA_X="100" DELTA_Y="-1.010100" DELTA_Z="-1.010100"/></UNITS>'+
    element('10','20'));
  refused(src);
});
test('S3 ACCEPT legitimate UNITS placed before source-record rows',()=>{
  const src=model('<UNITS><LENGTH LABEL="mm." FACTOR="1.000000"/></UNITS>'+
    element('10','20')+element('20','30'));
  assert.equal(scan(src)?.length,2);
  const doc=strict(src,{fileSha256:sha(src)});
  assert.deepEqual(doc.components.map(c=>c.sourceRefs[0].recordKey),[
    'E0:F10:T20','E1:F20:T30']);
  assert.equal(scan(src,{recordsOnlyModel:true}),null);
});
test('S3 accepts valid original, trailing comment, and preserves physical ordinals',()=>{
  const src='<?xml version="1.0"?>'+valid()+'<!-- allowed trailing comment -->';
  const result=strict(src,{fileSha256:sha(src)});
  assert.deepEqual(result.components.map(c=>c.sourceRefs[0].recordKey),[
    'E0:F10:T20','E1:F20:T30']);
  assert.equal(result.sources[0].sourceText,src);
});
test('S3 valid anchored source retains intact topology fields',()=>{
  const src=model(
    '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" FROM_X="100" FROM_Y="0" FROM_Z="0"'+
    ' TO_X="200" TO_Y="0" TO_Z="0" DELTA_X="100" DELTA_Y="-1.010100"'+
    ' DELTA_Z="-1.010100"><BEND RADIUS="45"/></PIPINGELEMENT>'+
    '<PIPINGELEMENT FROM_NODE="20" TO_NODE="30" FROM_X="200" FROM_Y="0" FROM_Z="0"'+
    ' TO_X="300" TO_Y="0" TO_Z="0" DELTA_X="100" DELTA_Y="-1.010100"'+
    ' DELTA_Z="-1.010100" />');
  const doc=strict(src,{fileSha256:sha(src)});
  assert.equal(doc.components.length,2);
  assert.equal(doc.ports.length,4);
  assert.deepEqual(doc.components.map(c=>c.sourceRefs[0].recordKey),[
    'E0:F10:T20','E1:F20:T30']);
});
test('S3 output-identity: accepted fixture JSON bytes exactly equal pinned merged main',async()=>{
  // The workflow fetches full history; source code is read from the exact Owner-
  // merged base, never a test-authored approximation of the old implementation.
  const oldSource=execFileSync('git',['show',base+':uxml/UxmlInputXmlSchemaMapper.js'],
    {cwd:new URL('../',import.meta.url),encoding:'utf8'});
  const mapperUrl=new URL('../uxml/UxmlInputXmlSchemaMapper.js',import.meta.url);
  const baseline=oldSource.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_,quote,relative)=>'from '+quote+new URL(relative,mapperUrl).href+quote);
  const oldModule=await import('data:text/javascript;base64,'+
    Buffer.from(baseline,'utf8').toString('base64'));
  const fixtures=[
    ['s3_existing_anchored_restraint_bend',strictS3Fixture()],
    ['s3_existing_unanchored',strictS3Fixture().replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,'')],
    ['public_GRE_100',nameFixture('GREInputxml.xml')],
    ['public_PLB314_53',nameFixture('PLB314Inputxml.xml')],
    ['public_opt_mock_244',repoFixture('opt/mock-xml.xml')],
    ['public_BM_CII_40',repoFixture('converters/scripts/pdf_inputxml_profile_bm_cii.xml')],
    ['synthetic_UNITS_before_records',model(
      '<UNITS><LENGTH LABEL="mm." FACTOR="1.000000"/></UNITS>'+
      element('10','20')+element('20','30'))],
    ['synthetic_unanchored',valid()],
    ['synthetic_trailing_comment',valid()+'<!-- comment -->'],
    ['synthetic_xml_declaration','<?xml version="1.0"?>'+valid()],
    ['synthetic_anchored_nested',model(
      '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" FROM_X="100" FROM_Y="0" FROM_Z="0"'+
      ' TO_X="200" TO_Y="0" TO_Z="0" DELTA_X="100" DELTA_Y="-1.010100"'+
      ' DELTA_Z="-1.010100"><BEND RADIUS="45"/></PIPINGELEMENT>')],
  ];
  for(const [label,src] of fixtures){
    assert(scan(src),label+' structurally admitted');
    const oldDoc=oldModule.mapCaesarInputXmlToUxmlStrict(src,{fileSha256:sha(src)});
    const newDoc=strict(src,{fileSha256:sha(src)});
    const a=Buffer.from(JSON.stringify(oldDoc),'utf8');
    const b=Buffer.from(JSON.stringify(newDoc),'utf8');
    assert.deepEqual(b,a,label+' entire S3 output JSON bytes must be identical');
    assert.deepEqual(newDoc.components.map(c=>c.sourceRefs[0].recordKey),
      oldDoc.components.map(c=>c.sourceRefs[0].recordKey),label+' record keys');
  }
  // Public exports are not malformed just because PIPINGMODEL contains
  // a non-row UNITS sibling. Both current strict S3 and pinned main accept.
  for(const [name,src,count] of [
    ['GRE',nameFixture('GREInputxml.xml'),100],
    ['PLB314',nameFixture('PLB314Inputxml.xml'),53],
    ['opt/mock-xml',repoFixture('opt/mock-xml.xml'),244],
    ['BM_CII',repoFixture('converters/scripts/pdf_inputxml_profile_bm_cii.xml'),40],
  ]){
    const current=strict(src,{fileSha256:sha(src)});
    assert.equal(current.components.length,count,name+' real CAESAR II row count');
    assert.equal(current.ports.length,2*count,name+' real CAESAR II port count');
    assert.equal(scan(src)?.length,count,name+' source tree record count');
    assert.equal(scan(src,{recordsOnlyModel:true}),null,
      name+' intentionally still incompatible with S4.1 records-only mode');
  }
});

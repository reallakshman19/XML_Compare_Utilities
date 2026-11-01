import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {mapCaesarInputXmlToUxmlStrict,mapInputXmlToUxml} from '../uxml/UxmlInputXmlSchemaMapper.js';
import {createUxmlDocument} from '../uxml/UxmlTypes.js';

const sha = x => createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const attrs=(from,to,fx,tx)=>[
  'FROM_NODE="'+from+'"','TO_NODE="'+to+'"',
  'FROM_X="'+fx+'"','FROM_Y="0"','FROM_Z="0"',
  'TO_X="'+tx+'"','TO_Y="0"','TO_Z="0"',
  'DELTA_X="'+(tx-fx)+'"','DELTA_Y="-1.010100"','DELTA_Z="-1.010100"',
  'DIAMETER="100"','WALL_THICK="6.02"','EXTRA_SOURCE_ATTR="retained"',
].join(' ');
function fixture() {
  return '<?xml version="1.0"?><CAESARII xmlns="COADE"><PIPINGMODEL xmlns="" LINE_ID="L-1">' +
    '<PIPINGELEMENT '+attrs(10,20,100,200)+'><RESTRAINT NODE="20" TYPE="0" /></PIPINGELEMENT>' +
    '<PIPINGELEMENT '+attrs(20,30,200,300)+'><BEND RADIUS="45"/></PIPINGELEMENT>' +
    '</PIPINGMODEL></CAESARII>';
}
test('strict source keys have unique zero-based record ordinal and literal FROM/TO identity',()=>{
  const xml=fixture(),doc=mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha(xml)});
  assert.equal(doc.schemaVersion,'uxml-topology-v1');
  assert.equal(doc.profile,'UXML-TOPOLOGY-FULL');
  assert.equal(doc.sources[0].format,'INPUT_XML');
  assert.equal(doc.sources[0].sourceText,xml);
  assert.equal(doc.sources[0].hash,sha(xml));
  assert.equal(doc.inputXml.elementCount,2);
  assert.deepEqual(doc.components.map(c=>c.sourceRefs[0].recordKey),
    ['E0:F10:T20','E1:F20:T30']);
  assert.equal(doc.ports.length,4);
  assert.deepEqual(doc.ports.map(p=>p.sourceRefs[0].endpoint),['FROM','TO','FROM','TO']);
  for(const comp of doc.components){
    const info=comp.rawAttributes.inputXml;
    assert.equal(info.wallThickness,6.02);
    assert.equal(info.outsideDiameter,100);
    assert.equal(comp.sourceRefs[0].fileSha256,sha(xml));
    assert.equal(info.recordKey,comp.sourceRefs[0].recordKey);
    assert.deepEqual(comp.portIds.map(id=>doc.ports.find(p=>p.id===id).sourceRefs[0].recordKey),
      [info.recordKey,info.recordKey]);
  }
  assert.deepEqual(doc.ports.map(p=>p.point.x),[100,200,200,300]);
  assert.equal(doc.components[0].rawAttributes.inputXml.hasRestraint,true);
  assert.equal(doc.supports.length,1);
  assert(doc.lossContract.some(x=>x.details.field==='@EXTRA_SOURCE_ATTR'));
  assert(doc.lossContract.some(x=>x.details.field==='BEND'));
  assert(doc.lossContract.some(x=>x.details.field==='@RADIUS'));
  const extended=xml.replace('<BEND RADIUS="45"/>','<BEND RADIUS="45"/><UNKNOWN_VENDOR EXT="preserve"/>');
  const witness=mapCaesarInputXmlToUxmlStrict(extended,{fileSha256:sha(extended)});
  assert(witness.lossContract.some(x=>x.details.field==='UNKNOWN_VENDOR'));
  assert(witness.lossContract.some(x=>x.details.field==='@EXT'));
  assert.equal(doc.validation.coordinateAuthority,'ANCHORED_OR_UNANCHORED_DELTA_GRAPH');
  assert.equal(doc.inputXml.runs.length,1);
  assert.equal(doc.inputXml.runs[0].anchored,true);
  assert.equal(doc.coordinateFrame.hub,'PSI116_XYZ_MM');
});
test('duplicate FROM/TO pairs are still unique by ordinal and source SHA',()=>{
  const xml=fixture().replace(attrs(20,30,200,300),attrs(10,20,100,200));
  const doc=mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha(xml)});
  assert.equal(new Set(doc.components.map(x=>x.sourceRefs[0].recordKey)).size,2);
  assert.deepEqual(doc.components.map(x=>x.sourceRefs[0].recordKey),['E0:F10:T20','E1:F10:T20']);
});
test('strict reader rejects unreliable absolute positions, conflicting deltas, missing IDs and sha',()=>{
  const src=fixture();
  for(const [name,invalid,pattern] of [
    ['partial anchor',src.replace('FROM_X="100"',''),/INCOMPLETE_ABSOLUTE_ANCHOR/],
    ['partial to',src.replace('TO_Z="0"',''),/INCOMPLETE_ABSOLUTE_ANCHOR/],
    ['contradictory delta',src.replace('DELTA_X="100"','DELTA_X="900"'),/DELTA_PATH_CONFLICT|ANCHOR_DELTA_CONFLICT/],
    ['missing identity',src.replace('FROM_NODE="10"','FROM_NODE=""'),/NODE_IDENTITY_REQUIRED/],
    ['conflicting reused node',src.replace('FROM_X="200"','FROM_X="201"'),/REUSED_NODE_ABSOLUTE_CONFLICT/],
  ]) assert.throws(()=>mapCaesarInputXmlToUxmlStrict(invalid,{fileSha256:sha(invalid)}),pattern,name);
  assert.throws(()=>mapCaesarInputXmlToUxmlStrict(src,{fileSha256:'bad'}),/SHA256_REQUIRED/);
});
test('legacy mapper remains opt-out and continues existing sourceRef string contract',()=>{
  const doc=createUxmlDocument();
  const run=mapInputXmlToUxml(fixture(),doc,'ORIGINAL-SOURCE');
  assert.equal(run.ok,true);
  assert.equal(run.doc,doc);
  assert(doc.components.length >= 2);
  assert(doc.components.every(c=>JSON.stringify(c.sourceRefs)===JSON.stringify(['ORIGINAL-SOURCE'])));
  assert.notEqual(doc.ports[0].point.x,100,'legacy delta-only path intentionally unchanged');
});
test('CLI hashes exact BOM+CRLF bytes and validates every source port',()=>{
  const root=mkdtempSync(join(tmpdir(),'uxml-s3-strict-'));
  try{
    const xml='\uFEFF'+fixture().replace(/></g,'>\r\n<');
    const file=join(root,'inputxml.xml');writeFileSync(file,Buffer.from(xml,'utf8'));
    const run=spawnSync(process.execPath,['tools/inputxml-to-uxml.mjs',file],
      {cwd:new URL('../',import.meta.url),encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const doc=JSON.parse(run.stdout);
    assert.equal(doc.sources[0].sourceText,xml);
    assert.equal(doc.sources[0].hash,sha(xml));
    assert.equal(doc.ports.length,4);
    assert.equal(doc.validation.gate.blockerCodes.length,0);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('CAESAR deltas reconstruct hub XYZ and preserve run-local UNANCHORED labels',()=>{
  const src=fixture().replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,'');
  const doc=mapCaesarInputXmlToUxmlStrict(src,{fileSha256:sha(src)});
  assert.equal(doc.inputXml.runs.length,1);
  assert.equal(doc.inputXml.runs[0].anchored,false);
  assert.equal(doc.coordinateFrame.unanchoredRunCount,1);
  assert.deepEqual(doc.ports.map(p=>p.point),[
    {x:0,y:0,z:0},{x:100,y:0,z:0},
    {x:100,y:0,z:0},{x:200,y:0,z:0},
  ]);
  assert(doc.components.every(c=>c.sourceRefs[0].anchored===false &&
    c.rawAttributes.inputXml.runId==='RUN-0000'));
  assert(doc.ports.every(p=>p.anchored===false && p.runId==='RUN-0000'));
});
test('multi-run restarts stay independent, and cyclic bad delta is explicitly refused',()=>{
  const a=attrs(10,20,100,200);
  const b=attrs(20,30,200,300);
  const c=attrs(100,110,1100,1150);
  const root=openings=>'<CAESARII><PIPINGMODEL>'+openings+'</PIPINGMODEL></CAESARII>';
  const elem=attrs=>'<PIPINGELEMENT '+attrs+'></PIPINGELEMENT>';
  const standalone=root([a,b,c].map(x=>elem(x.replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,''))).join(''));
  const doc=mapCaesarInputXmlToUxmlStrict(standalone,{fileSha256:sha(standalone)});
  assert.equal(doc.inputXml.runs.length,2);
  assert.deepEqual(doc.inputXml.runs.map(r=>r.anchored),[false,false]);
  assert.equal(doc.ports[4].point.x,0,'second disconnected run has its OWN local zero');
  assert.notEqual(doc.components[0].sourceRefs[0].runId,doc.components[2].sourceRefs[0].runId);
  const cycle=root([elem(a.replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,'')),
    elem(b.replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,'')),
    elem(attrs(30,10,300,100).replace(/\s+(?:FROM|TO)_[XYZ]="[^"]*"/g,'').replace('DELTA_X="-200"','DELTA_X="-150"'))].join(''));
  assert.throws(()=>mapCaesarInputXmlToUxmlStrict(cycle,{fileSha256:sha(cycle)}),
    /INPUT_XML_DELTA_PATH_CONFLICT/);
});
test('both public CAESAR14 samples are accepted as 1 UNANCHORED run (100 and 53 elements)',()=>{
  for(const [file,count] of [['GREInputxml.xml',100],['PLB314Inputxml.xml',53]]){
    const xml=readFileSync(new URL('../docs/'+file,import.meta.url),'utf8');
    const doc=mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha(xml)});
    assert.equal(doc.inputXml.elementCount,count,file);
    assert.equal(doc.components.length,count,file);
    assert.equal(doc.ports.length,count*2,file);
    assert.equal(doc.inputXml.runs.length,1,file);
    assert.equal(doc.inputXml.runs[0].anchored,false,file);
    assert.equal(doc.coordinateFrame.unanchoredRunCount,1,file);
    assert(doc.ports.every(p=>p.anchored===false && p.coordinateFrame==='PSI116_XYZ_MM'));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
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
  assert.equal(doc.validation.coordinateAuthority,'EXPLICIT_ABSOLUTE_SOURCE');
});
test('duplicate FROM/TO pairs are still unique by ordinal and source SHA',()=>{
  const xml=fixture().replace('FROM_NODE="20" TO_NODE="30"','FROM_NODE="10" TO_NODE="20"');
  const doc=mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha(xml)});
  assert.equal(new Set(doc.components.map(x=>x.sourceRefs[0].recordKey)).size,2);
  assert.deepEqual(doc.components.map(x=>x.sourceRefs[0].recordKey),['E0:F10:T20','E1:F10:T20']);
});
test('strict reader rejects unreliable absolute positions, conflicting deltas, missing IDs and sha',()=>{
  const src=fixture();
  for(const [name,invalid,pattern] of [
    ['no from x',src.replace('FROM_X="100"',''),/ABSOLUTE_COORDINATE_REQUIRED/],
    ['partial to',src.replace('TO_Z="0"',''),/ABSOLUTE_COORDINATE_REQUIRED/],
    ['contradictory delta',src.replace('DELTA_X="100"','DELTA_X="900"'),/ABSOLUTE_DELTA_CONFLICT/],
    ['missing identity',src.replace('FROM_NODE="10"','FROM_NODE=""'),/NODE_IDENTITY_REQUIRED/],
  ]) assert.throws(()=>mapCaesarInputXmlToUxmlStrict(invalid,{fileSha256:sha(invalid)}),pattern,name);
  assert.throws(()=>mapCaesarInputXmlToUxmlStrict(src,{fileSha256:'bad'}),/SHA256_REQUIRED/);
});
test('legacy mapper remains opt-out and continues existing sourceRef string contract',()=>{
  const doc=createUxmlDocument();
  const run=mapInputXmlToUxml(fixture(),doc,'ORIGINAL-SOURCE');
  assert.equal(run.ok,true);
  assert.equal(run.doc,doc);
  assert.deepEqual(doc.components.map(c=>c.sourceRefs),[['ORIGINAL-SOURCE'],['ORIGINAL-SOURCE']]);
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

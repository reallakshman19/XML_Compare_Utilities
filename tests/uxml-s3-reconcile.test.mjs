/** UXML-S3 final bounded r1: tests describe ONLY source-backed reader facts.
 * These tests intentionally FAIL at the 31-Oct 21:21 S3 head d8cf5228.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mapCaesarInputXmlToUxmlStrict} from '../uxml/UxmlInputXmlSchemaMapper.js';
const path=new URL('./fixtures/uxml-s3-synthetic.workspace.input.xml',import.meta.url);
const bytes=readFileSync(path);
const xml=bytes.toString('utf8');
const sha=createHash('sha256').update(bytes).digest('hex');
const mapped=()=>mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha});
test('r1 PROVENANCE inherited diameter and wall are traced to explicit previous route record',()=>{
  const doc=mapped(), components=doc.components;
  assert.equal(components.length,6);
  const explicit=components[0].rawAttributes.inputXml.physicalEvidence;
  assert.deepEqual([explicit.outsideDiameter.value,explicit.wallThickness.value],[100,6.02]);
  assert.equal(explicit.outsideDiameter.mode,'EXPLICIT');
  for(const index of [1,2,3]){
    const fields=components[index].rawAttributes.inputXml.physicalEvidence;
    assert.deepEqual([fields.outsideDiameter.value,fields.wallThickness.value],[100,6.02]);
    assert.equal(fields.outsideDiameter.mode,'INHERITED');
    assert.equal(fields.wallThickness.mode,'INHERITED');
    assert.equal(fields.outsideDiameter.sourceElementIndex,0);
    assert.equal(fields.wallThickness.sourceElementIndex,0);
    assert.equal(fields.outsideDiameter.sourceField,'PIPINGELEMENT@DIAMETER');
    assert.equal(fields.wallThickness.sourceField,'PIPINGELEMENT@WALL_THICK');
  }
  assert.equal(components[4].rawAttributes.inputXml.physicalEvidence.outsideDiameter.mode,'EXPLICIT',
    'tee branch first PIPINGELEMENT reintroduces source physical context');
  assert.equal(components[5].rawAttributes.inputXml.physicalEvidence.wallThickness.mode,'EXPLICIT',
    'disconnected restart must NOT inherit another route context');
});
test('r1 PROVENANCE BEND@RADIUS belongs to the element TO node, not synthetic source type',()=>{
  const info=mapped().components[2].rawAttributes.inputXml;
  assert.equal(info.toNode,'50.000000');
  assert.equal(info.bendEvidence.radius,150);
  assert.equal(info.bendEvidence.sourceElementIndex,2);
  assert.equal(info.bendEvidence.sourceField,'PIPINGELEMENT/BEND@RADIUS');
  assert.equal(info.bendEvidence.endpoint,'TO');
});
test('r1 PROVENANCE SIF@TYPE stays literal and cannot be silently cast to TEE',()=>{
  const info=mapped().components[0].rawAttributes.inputXml;
  assert(info.sifEvidence.some(item=>item.sourceField==='PIPINGELEMENT/SIF@TYPE' &&
    item.typeCode===5 && item.node==='20.000000'));
  assert.equal(info.componentType,'OLET','source is SIF code 5; TEE would be unjustified inference');
});

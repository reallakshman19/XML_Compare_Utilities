import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mapPsi116ToUxml} from '../uxml/UxmlPsi116SchemaMapper.js';
import {detectUxmlProfile} from '../uxml/UxmlProfileDetector.js';
import {UXML_SCHEMA_VERSION, XML_PROFILES, SOURCE_FORMATS} from '../uxml/UxmlConstants.js';
import {validateUxmlDocument} from '../uxml/UxmlValidationGate.js';

const NS = 'http://aveva.com/pipeStress116.xsd';
const ALT = 'http://aveva.com/pipestress116.xsd';
const hash = text => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
function fixture({ns = NS, prefix = '', withLoss = false} = {}) {
  const tag = prefix ? prefix + ':' : '';
  const xmlns = prefix ? 'xmlns:' + prefix : 'xmlns';
  return '<?xml version="1.0" encoding="UTF-8"?>\r\n' +
    '<' + tag + 'PipeStressExport ' + xmlns + '="' + ns + '"' +
    (withLoss ? ' misc="KEEP-RAW"' : '') + '>\r\n<'+tag+'Pipe><'+tag+'Branch>' +
    '<'+tag+'Branchname>BR-0</'+tag+'Branchname>\r\n' +
    '<'+tag+'Node><'+tag+'NodeNumber>120</'+tag+'NodeNumber>' +
    '<'+tag+'NodeName>/X-120</'+tag+'NodeName>' +
    '<'+tag+'Endpoint>1</'+tag+'Endpoint><'+tag+'ComponentType>FLAN</'+tag+'ComponentType>' +
    '<'+tag+'ComponentRefNo>V</'+tag+'ComponentRefNo>' +
    '<'+tag+'Position>0 0 0</'+tag+'Position>' +
    '<'+tag+'OutsideDiameter>114.3</'+tag+'OutsideDiameter>' +
    '<'+tag+'WallThickness>6.02</'+tag+'WallThickness>' +
    '<'+tag+'Rigid>0</'+tag+'Rigid><'+tag+'Weight>0</'+tag+'Weight>' +
    (withLoss ? '<'+tag+'UnmappedField x="y">extra</'+tag+'UnmappedField>' : '') +
    '</'+tag+'Node>\r\n' +
    '<'+tag+'Node><'+tag+'NodeNumber>6880</'+tag+'NodeNumber>' +
    '<'+tag+'Endpoint>2</'+tag+'Endpoint><'+tag+'ComponentType>RIGID</'+tag+'ComponentType>' +
    '<'+tag+'ComponentRefNo>V</'+tag+'ComponentRefNo>' +
    '<'+tag+'ConnectionType>CLOS</'+tag+'ConnectionType>' +
    '<'+tag+'Position>100 0 0</'+tag+'Position>' +
    '<'+tag+'OutsideDiameter>114.3</'+tag+'OutsideDiameter>' +
    '<'+tag+'WallThickness>6.02</'+tag+'WallThickness>' +
    '<'+tag+'Restraint><'+tag+'Translational>TRUE</'+tag+'Translational></'+tag+'Restraint>' +
    '</'+tag+'Node>\r\n</'+tag+'Branch></'+tag+'Pipe>\r\n</'+tag+'PipeStressExport>\r\n';
}
test('strict PSI116 detector recognises only two verified namespace spellings', () => {
  for (const ns of [NS, ALT]) {
    const text = fixture({ns});
    assert.equal(detectUxmlProfile(text).profile, XML_PROFILES.PSI116);
    assert.equal(detectUxmlProfile(fixture({ns, prefix: 'ps'})).profile, XML_PROFILES.PSI116);
  }
  for (const ns of ['urn:wrong','http://aveva.com/pipeStress117.xsd','']) {
    const text = fixture({ns});
    const report = detectUxmlProfile(text);
    assert.equal(report.profile, XML_PROFILES.UNKNOWN_XML);
    assert.deepEqual(report.blockers, ['PSI116_UNVERIFIED_NAMESPACE']);
    assert.throws(() => mapPsi116ToUxml(text, {fileSha256: hash(text)}), /VERIFIED_NAMESPACE/);
  }
  assert.equal(detectUxmlProfile('<UXML/>').profile, XML_PROFILES.UXML);
  assert.equal(detectUxmlProfile('<Project><Component/></Project>').profile, XML_PROFILES.STANDARD_XML);
  assert.equal(detectUxmlProfile('<InputXML><Node/></InputXML>').profile, XML_PROFILES.INPUT_XML);
});
test('record sourceRefs exactly reproduce TopoFix zero-based keys and CLOS text', () => {
  const xml = fixture(), sha = hash(xml);
  const doc = mapPsi116ToUxml(xml, {fileSha256: sha});
  assert.equal(doc.schemaVersion, UXML_SCHEMA_VERSION);
  assert.equal(doc.profile, 'UXML-TOPOLOGY-FULL');
  assert.equal(doc.sources[0].format, SOURCE_FORMATS.PSI116);
  assert.equal(doc.sources[0].sourceText, xml);
  assert.equal(doc.sources[0].hash, sha);
  assert.equal(doc.psi116.branchCount, 1);
  assert.equal(doc.psi116.sourceNodeRecordCount, 2);
  assert.equal(doc.components.length, 2);
  assert.deepEqual(doc.components.map(c => c.sourceRefs[0].recordKey),
    ['B0:N120:S0', 'B0:N6880:S1']);
  assert.deepEqual(doc.ports.map(p => p.sourceRefs[0].recordKey),
    ['B0:N120:S0', 'B0:N6880:S1']);
  for (const c of doc.components) {
    const r = c.sourceRefs[0];
    assert.equal(r.format, 'PSI116'); assert.equal(r.fileSha256, sha);
    assert.equal(r.branchName, 'BR-0'); assert.equal(r.nodeNumber > 0, true);
    assert.equal(c.rawAttributes.psi116.recordKey, r.recordKey);
    assert.match(c.rawAttributes.psi116.rawXml, /<Node>/);
  }
  assert.equal(doc.components[1].rawAttributes.psi116.connectionType, 'CLOS');
  assert.equal(doc.components[1].rawAttributes.psi116.wallThickness, 6.02);
  assert.equal(doc.components[1].rawAttributes.psi116.hasRestraint, true);
  assert.equal(doc.topologyHints.length, 1);
  assert.equal(doc.supports.length, 1);
  assert.deepEqual(doc.topologyHints[0].sourceRefs[0], doc.components[1].sourceRefs[0]);
  assert.deepEqual(doc.validation.blockerCodes, []);
  assert.equal(validateUxmlDocument(doc).ready, true);
});
test('lossContract names uncarried element/attribute and never silently drops its original source', () => {
  const xml = fixture({withLoss: true});
  const doc = mapPsi116ToUxml(xml, {fileSha256: hash(xml)});
  const losses = doc.lossContract.map(x => x.details);
  assert(losses.some(x => x.kind === 'ELEMENT' && x.sourcePath.includes('UnmappedField')));
  assert(losses.some(x => x.kind === 'ELEMENT' && x.sourcePath.includes('/Pipe[')),
    'PSI116 Pipe wrapper is uncarried and must be in the loss ledger');
  assert(losses.some(x => x.kind === 'ATTRIBUTE' && x.sourcePath.endsWith('/@misc')));
  assert(losses.some(x => x.kind === 'ATTRIBUTE' && x.sourcePath.endsWith('/@x')));
  assert.equal(doc.sources[0].sourceText, xml);
  assert.equal(doc.validation.ready, true);
});
test('missing NodeNumber key is literally none, and branch index/source index reset like parser.py', () => {
  const src = '<PipeStressExport xmlns="' + NS + '"><Pipe><Branch>' +
    '<Branchname>FIRST</Branchname><Node><Position>0 0 0</Position></Node>' +
    '<Node><NodeNumber>-1</NodeNumber></Node></Branch><Branch>' +
    '<Branchname>SECOND</Branchname><Node><NodeNumber>10</NodeNumber>' +
    '<Position>1 2 3</Position></Node></Branch></Pipe></PipeStressExport>';
  const doc = mapPsi116ToUxml(src, {fileSha256: hash(src)});
  assert.deepEqual(doc.components.map(x => x.sourceRefs[0].recordKey),
    ['B0:Nnone:S0', 'B0:N-1:S1', 'B1:N10:S0']);
  assert.equal(doc.psi116.branchCount, 2);
  assert.deepEqual(doc.validation.blockerCodes, []);
});
test('CLI stdout is only UTF-8 UXML JSON and hashes original CRLF bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uxml-psi116-s1-'));
  try {
    const xml = fixture();
    const input = join(dir, 'synthetic.xml');
    writeFileSync(input, Buffer.from(xml,'utf8'));
    const result = spawnSync(process.execPath, ['tools/psi116-to-uxml.mjs', input],
      {cwd: new URL('../', import.meta.url), encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const doc = JSON.parse(result.stdout);
    assert.equal(doc.sources[0].hash, hash(xml));
    assert.equal(doc.sources[0].sourceText, xml);
    assert.equal(doc.components.length, 2);
  } finally {rmSync(dir, {recursive:true,force:true});}
});
test('unknown namespace and malformed/dangerous source fail without UXML output', () => {
  for (const xml of [
    fixture({ns:'urn:unknown'}),
    '<!DOCTYPE PipeStressExport [<!ENTITY x "leak">]><PipeStressExport xmlns="' + NS + '"/>',
    '<PipeStressExport xmlns="' + NS + '"><Branch>',
  ]) {
    assert.throws(() => mapPsi116ToUxml(xml, {fileSha256:hash(xml)}));
  }
  assert.throws(() => mapPsi116ToUxml(fixture(), {fileSha256:'wrong'}), /SHA256_REQUIRED/);
});

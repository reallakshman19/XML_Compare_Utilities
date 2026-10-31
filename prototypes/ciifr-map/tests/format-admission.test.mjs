import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto, createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {admitXmlFormat, admitXmlBytes, isStaleAdmission, ADMISSION_STATUS} from '../xml-format-admission.js';

if (!process.env.CIIFR_TEST_RUNTIME) throw new Error('Set CIIFR_TEST_RUNTIME to a test-only npm prefix containing @xmldom/xmldom. Product uses browser DOMParser.');
const require = createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json');
const {DOMParser} = require('@xmldom/xmldom');
const f05 = readFileSync(new URL('./fixtures/S1-F05.xml', import.meta.url), 'utf8');
const r4 = readFileSync(new URL('./fixtures/S1-R4.xml', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('./fixtures/manifest.json', import.meta.url), 'utf8'));
const parse = () => new DOMParser({onError: (level, message) => { throw new Error('XML_PARSE_ERROR:' + level + ':' + message); }});
const admit = (text, options = {}) => admitXmlFormat(text, {cryptoRef: webcrypto, parser: parse(), ...options});
const admitBytes = (bytes, options = {}) => admitXmlBytes(bytes, {cryptoRef: webcrypto, parser: parse(), ...options});
const f05Bytes = new Uint8Array(readFileSync(new URL('./fixtures/S1-F05.xml', import.meta.url)));
// SYNTHETIC GLRD-shaped document written for this test only (RichInput P1 v1 root, 3 elements).
// It is NOT the Owner's private GLRD file and makes no claim about GLRD's real field layout.
const glrdElement = (i, from, to) => '<PIPINGELEMENT index="' + i + '"><Numeric row="1"><Field name="FROM_NODE" value="' + from +
  '"/><Field name="TO_NODE" value="' + to + '"/><Field name="DELTA_X" value="100"/></Numeric></PIPINGELEMENT>';
const syntheticGlrd = '<?xml version="1.0" encoding="utf-8"?><CAESARII XML_TYPE="RichInput" DIALECT="CII-V14" SCHEMA="RichInputXML-P1.v1">' +
  '<PIPINGMODEL NUMELT="3"><SECTIONS><SECTION name="ELEMENTS" records="3">' +
  glrdElement(1, 10, 20) + glrdElement(2, 20, 30) + glrdElement(3, 30, 40) + '</SECTION></SECTIONS></PIPINGMODEL></CAESARII>';
const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const {ADMITTED, UNSUPPORTED_INPUT, INVALID} = ADMISSION_STATUS;
const notAdmitted = (result, label) => {
  assert.notEqual(result.status, ADMITTED, label);
  assert.equal(result.elementCount, null, label); assert.equal(result.nodeCount, null, label);
  assert.equal(result.edges.length, 0, label); assert.equal(result.diagnostics[0].severity, 'ERROR', label);
};
// Independent oracle: the raw fixture text, read without the parser under test.
const rawField = (xml, recordOpen, field) => {
  const start = xml.indexOf(recordOpen); assert(start > 0, recordOpen);
  return new RegExp('<Field name="' + field + '"[^>]*?\\bvalue="([^"]*)"').exec(xml.slice(start))[1];
};
function mutateR4Element2(fn) {
  const doc = parse().parseFromString(r4, 'application/xml');
  const record = Array.from(doc.getElementsByTagName('Record')).find(rec => rec.getAttribute('id') === 'element-000002');
  const fields = Array.from(record.getElementsByTagName('Field'));
  fn((name, value) => fields.find(field => field.getAttribute('name') === name).setAttribute('value', value));
  return doc.toString();
}

test('public S1 F05 and R4 are each ADMITTED with 56 source elements, 56 edges and 57 nodes', async () => {
  for (const [file, text, profile] of [['S1-F05.xml', f05, 'F05 RichInputXML-P1.v1.1'], ['S1-R4.xml', r4, 'R4 RichInputXMLv2.1']]) {
    const result = await admit(text, {name: file});
    assert.equal(result.status, ADMITTED, file); assert.equal(result.admittedProfile, profile);
    assert.equal(result.elementCount, 56); assert.equal(result.edges.length, 56); assert.equal(result.nodeCount, 57);
    assert.equal(result.digest.sha256, manifest.files[file].sha256); assert.equal(result.digest.byteLength, manifest.files[file].bytes);
    assert.equal(result.generationId, 'TOPO-B-ADM:' + manifest.files[file].sha256 + ':0');
    assert.equal(result.digest.authority, 'DECODED_TEXT_REENCODED_UTF8');
    assert(result.edges.every(edge => edge.kind === 'SOURCE_ELEMENT' && edge.engineeringApproved === false));
    assert.equal(result.writerEligible, false); assert.equal(result.reason, null);
    const node = result.nodes.find(item => item.id === '3830');
    assert.deepEqual(node.xyz, [798423, 100237, 1126376]); assert.equal(node.coordinateStatus, 'ABSOLUTE_EXPLICIT_SEED');
    assert(Object.isFrozen(result) && Object.isFrozen(result.edges[0].sourceFields.from));
  }
  const [a, b] = [await admit(f05), await admit(r4)];
  assert.deepEqual(a.nodes.map(n => [n.id, n.xyz]), b.nodes.map(n => [n.id, n.xyz]));
  assert.equal(a.claimedCii.status, 'NOT_PRESENT'); assert.equal(b.claimedCii.status, 'CLAIMED_NOT_REVERIFIED');
});

test('pinned element 2 FROM/TO/delta trace to their exact source fields in F05 and R4', async () => {
  const f = (await admit(f05)).edges[1], r = (await admit(r4)).edges[1];
  for (const edge of [f, r]) {
    assert.equal(edge.from, '3830'); assert.equal(edge.to, '3840'); assert.deepEqual(edge.delta, [0, -1500, 0]);
  }
  assert.equal(f.sourceFields.from.address, 'ELEMENTS/PIPINGELEMENT[2]/Numeric[1]/Field[1]@FROM_NODE');
  assert.equal(f.sourceFields.to.address, 'ELEMENTS/PIPINGELEMENT[2]/Numeric[1]/Field[2]@TO_NODE');
  assert.equal(f.sourceFields.deltaY.address, 'ELEMENTS/PIPINGELEMENT[2]/Numeric[1]/Field[4]@DELTA_Y');
  assert.equal(r.sourceFields.from.address, 'ELEMENTS/element-000002/Row[1]/Field[1]@from_node');
  assert.equal(r.sourceFields.deltaY.address, 'ELEMENTS/element-000002/Row[1]/Field[4]@delta_y');
  assert.equal(r.sourceFields.from.sourceLine, '84');
  for (const [field, name] of [['from', 'FROM_NODE'], ['to', 'TO_NODE'], ['deltaY', 'DELTA_Y']])
    assert.equal(f.sourceFields[field].value, rawField(f05, '<PIPINGELEMENT index="2">', name));
  for (const [field, name] of [['from', 'from_node'], ['to', 'to_node'], ['deltaY', 'delta_y']])
    assert.equal(r.sourceFields[field].value, rawField(r4, '<Record id="element-000002"', name));
});

test('unknown root is UNSUPPORTED_INPUT, never a zero-element success (deliberate-failure guard)', async () => {
  const result = await admit('<Plant><Pipe id="1"/></Plant>', {name: 'foreign.xml'});
  assert.equal(result.status, UNSUPPORTED_INPUT);
  assert.equal(result.reason, 'UNKNOWN_ROOT_NOT_ADMITTED:Plant');
  notAdmitted(result, 'unknown root');
});

test('GLRD-shaped, PSI116, conventional InputXML and other versions are recognized but UNSUPPORTED_INPUT', async () => {
  const cases = [
    ['synthetic GLRD', syntheticGlrd, 'GLRD_RICHINPUT_P1_V1_DISCOVER_FIRST_NOT_ADMITTED'],
    ['P1 version', f05.replace('SCHEMA="RichInputXML-P1.v1.1"', 'SCHEMA="RichInputXML-P1.v2"'), 'RICHINPUT_P1_VERSION_NOT_ADMITTED:RichInputXML-P1.v2'],
    ['F05 dialect', f05.replace('DIALECT="CII-V14"', 'DIALECT="CII-V13"'), 'RICHINPUT_P1_V1_1_DIALECT_NOT_ADMITTED:CII-V13'],
    ['R4 profile', r4.replace('profile="CII-V14-ASCII-CRLF-B001"', 'profile="CII-V13-X"'), 'RICHINPUT_V2_1_PROFILE_NOT_ADMITTED:CII-V13-X'],
    ['PSI116', '<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd"><Branch><Node/></Branch></PipeStressExport>', 'PSI116_RECOGNIZED_NOT_ADMITTED'],
    ['PSI116 bare', '<PipeStressExport><Branch/></PipeStressExport>', 'PSI116_SHAPED_UNVERIFIED_NAMESPACE_NOT_ADMITTED'],
    ['InputXML', '<CAESARII><PIPINGMODEL><PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1"/></PIPINGMODEL></CAESARII>', 'CONVENTIONAL_INPUTXML_RECOGNIZED_NOT_ADMITTED'],
    ['R4 version', r4.replace('schema="RichInputXMLv2.1"', 'schema="RichInputXMLv2.2"'), 'RICHINPUT_V2_VERSION_NOT_ADMITTED:RichInputXMLv2.2']
  ];
  for (const [label, text, reason] of cases) {
    const result = await admit(text, {name: label});
    assert.equal(result.status, UNSUPPORTED_INPUT, label); assert.equal(result.reason, reason, label);
    assert.doesNotMatch(String(result.recognizedFormat), /^(F05|R4) /, label);
    notAdmitted(result, label);
  }
});

test('empty and zero-element models are never success', async () => {
  for (const text of ['', '   \n']) notAdmitted(await admit(text), 'empty');
  assert.equal((await admit('')).reason, 'XML_EMPTY_INPUT');
  const doc = parse().parseFromString(r4, 'application/xml');
  const elements = Array.from(doc.getElementsByTagName('Section')).find(s => s.getAttribute('name') === 'ELEMENTS');
  Array.from(elements.childNodes).forEach(child => elements.removeChild(child));
  const zero = doc.toString().replace(/(<Field name="elements"[^>]*?\bvalue=")[^"]*"/, '$10"');
  const result = await admit(zero);
  assert.equal(result.status, INVALID); assert.equal(result.reason, 'XML_ELEMENT_COUNT_MISMATCH'); notAdmitted(result, 'zero R4');
  const numelt = await admit(f05.replace('NUMELT="56"', 'NUMELT="0"'));
  assert.equal(numelt.status, INVALID); assert.match(numelt.reason, /^XML_INTEGER_INVALID:NUMELT/);
});

test('DTD, entity, malformed, wrong units, wrong count and wrong namespace are INVALID', async () => {
  const cases = [
    ['DTD', '<!DOCTYPE x>' + r4, /^XML_DTD_OR_ENTITY_FORBIDDEN$/],
    ['entity', '<!ENTITY x "y">' + r4, /^XML_DTD_OR_ENTITY_FORBIDDEN$/],
    ['malformed', r4.slice(0, -40), /^XML_PARSE_ERROR/],
    ['units', r4.replace('value="mm."', 'value="in."'), /^XML_UNSUPPORTED_OR_INCONSISTENT_NATIVE_MM_UNITS$/],
    ['count', r4.replace(/(<Field name="elements"[^>]*?\bvalue=")[^"]*"/, '$157"'), /^XML_ELEMENT_COUNT_MISMATCH$/],
    ['F05 count', f05.replace('NUMELT="56"', 'NUMELT="55"'), /^XML_ELEMENT_COUNT_MISMATCH$/],
    ['namespace', r4.replace('<RichInputXMLv2 ', '<RichInputXMLv2 xmlns="urn:not-richinput" '), /^XML_UNSUPPORTED_NAMESPACE:urn:not-richinput$/],
    ['F05 namespace', f05.replace('<CAESARII ', '<CAESARII xmlns="urn:x" '), /^XML_UNSUPPORTED_NAMESPACE:urn:x$/]
  ];
  for (const [label, text, reason] of cases) {
    const result = await admit(text, {name: label});
    assert.equal(result.status, INVALID, label); assert.match(result.reason, reason, label);
    notAdmitted(result, label);
  }
});

test('endpoint reversal keeps geometry only with the opposite signed delta', async () => {
  const original = await admit(r4);
  const xyz = result => new Map(result.nodes.map(node => [node.id, node.xyz]));
  const flipped = await admit(mutateR4Element2(set => { set('from_node', '3840'); set('to_node', '3830'); set('delta_y', '1500'); }));
  assert.equal(flipped.status, ADMITTED);
  assert.equal(flipped.edges[1].from, '3840'); assert.deepEqual(flipped.edges[1].delta, [0, 1500, 0]);
  assert.deepEqual([...xyz(flipped)], [...xyz(original)]);
  const swapOnly = await admit(mutateR4Element2(set => { set('from_node', '3840'); set('to_node', '3830'); }));
  assert.equal(swapOnly.status, ADMITTED);
  assert.equal(xyz(swapOnly).get('3840')[1] - xyz(original).get('3840')[1], 3000);
  assert.notEqual(swapOnly.digest.sha256, original.digest.sha256);
});

test('stale epoch, different digest and expected-digest mismatch are detectable', async () => {
  const a = await admit(f05, {epoch: 3}), b = await admit(r4, {epoch: 3});
  assert.equal(isStaleAdmission(a, {sha256: sha(f05), epoch: 3}), false);
  assert.equal(isStaleAdmission(a, {sha256: sha(f05), epoch: 4}), true);
  assert.equal(isStaleAdmission(a, {sha256: b.digest.sha256, epoch: 3}), true);
  assert.notEqual(a.generationId, b.generationId);
  const mismatch = await admit(r4, {expectedSha256: a.digest.sha256});
  assert.equal(mismatch.status, INVALID); assert.equal(mismatch.reason, 'XML_SHA256_MISMATCH');
  assert.equal(isStaleAdmission(mismatch, {sha256: a.digest.sha256, epoch: 0}), true);
});

test('admission does not mutate the input text', async () => {
  const before = sha(r4), length = r4.length;
  await admit(r4); await admit(f05);
  assert.equal(sha(r4), before); assert.equal(r4.length, length);
  assert.equal(sha(f05), manifest.files['S1-F05.xml'].sha256);
});

test('seedless components are labelled relative, never absolute', async () => {
  const doc = parse().parseFromString(f05, 'application/xml');
  const coords = Array.from(doc.getElementsByTagName('SECTION')).find(s => s.getAttribute('name') === 'COORDS');
  const records = Array.from(coords.childNodes).filter(child => child.nodeType === 1);
  records.slice(1).forEach(record => coords.removeChild(record));
  const text = doc.toString().replace(/(<Field name="COORD_COUNT"[^>]*?\bvalue=")[^"]*"/, '$10"');
  const result = await admit(text);
  assert.equal(result.status, ADMITTED); assert.equal(result.nodeCount, 57);
  assert(result.nodes.every(node => node.coordinateStatus === 'RELATIVE_NO_SEED'));
  assert(result.diagnostics.some(d => d.code === 'COMPONENT_RELATIVE_NO_SEED'));
});

test('bytes entry point hashes the exact file bytes, records a BOM and refuses invalid UTF-8', async () => {
  const plain = await admitBytes(f05Bytes, {name: 'S1-F05.xml'});
  assert.equal(plain.status, ADMITTED); assert.equal(plain.digest.authority, 'XML_FILE_BYTES_MEASURED');
  assert.equal(plain.digest.sha256, manifest.files['S1-F05.xml'].sha256); assert.equal(plain.digest.utf8Bom, 'ABSENT');
  const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, ...f05Bytes]);
  const bom = await admitBytes(withBom, {name: 'bom.xml'});
  assert.equal(bom.status, ADMITTED); assert.equal(bom.nodeCount, 57); assert.equal(bom.digest.utf8Bom, 'PRESENT');
  assert.equal(bom.digest.sha256, createHash('sha256').update(withBom).digest('hex'));
  assert.equal(bom.digest.byteLength, manifest.files['S1-F05.xml'].bytes + 3);
  assert.notEqual(bom.digest.sha256, plain.digest.sha256);
  assert.deepEqual(withBom.slice(0, 3), new Uint8Array([0xEF, 0xBB, 0xBF]));
  const bad = new Uint8Array(f05Bytes); bad[Buffer.from(f05Bytes).indexOf('MUCN328')] = 0xFF;
  const invalid = await admitBytes(bad);
  assert.equal(invalid.status, INVALID); assert.equal(invalid.reason, 'XML_INVALID_UTF8');
  assert.equal(invalid.digest.sha256, createHash('sha256').update(bad).digest('hex')); notAdmitted(invalid, 'utf8');
  notAdmitted(await admitBytes(new Uint8Array(0)), 'empty bytes');
  assert.equal((await admitBytes('<x/>')).reason, 'XML_BYTES_REQUIRED');
});

test('a BOM left in decoded text is stripped for parsing and labelled as re-encoded text', async () => {
  const result = await admit('\uFEFF' + f05);
  assert.equal(result.status, ADMITTED); assert.equal(result.digest.utf8Bom, 'PRESENT_IN_TEXT');
  assert.equal(result.digest.authority, 'DECODED_TEXT_REENCODED_UTF8');
  assert.equal(result.digest.sha256, sha('\uFEFF' + f05));
});

test('browser-style parsererror document is INVALID, and non-XML_ internal faults are rethrown', async () => {
  // Chrome can produce a partial F05 document whose root still looks valid, with parsererror inside it.
  // A root-only classifier would incorrectly admit this partial model.
  const errorDoc = parse().parseFromString(f05, 'application/xml');
  const parserError = errorDoc.createElement('parsererror');
  parserError.textContent = 'Synthetic Chrome-like parse failure';
  errorDoc.documentElement.appendChild(parserError);
  assert.equal(errorDoc.documentElement.localName, 'CAESARII');
  const stub = await admit(f05, {parser: {parseFromString: () => errorDoc}});
  assert.equal(stub.status, INVALID); assert.equal(stub.reason, 'XML_PARSE_ERROR'); notAdmitted(stub, 'parsererror');
  const real = parse().parseFromString(f05, 'application/xml');
  const bind = (target, fault) => new Proxy(target, {get(obj, prop) {
    if (prop === fault) throw new TypeError('STUB_DOM_FAULT');
    const value = Reflect.get(obj, prop, obj);
    return typeof value === 'function' ? value.bind(obj) : value;
  }});
  const root = bind(real.documentElement, 'childNodes');
  const doc = new Proxy(real, {get: (obj, prop) => prop === 'documentElement' ? root :
    (typeof obj[prop] === 'function' ? obj[prop].bind(obj) : obj[prop])});
  await assert.rejects(admit(f05, {parser: {parseFromString: () => doc}}), /STUB_DOM_FAULT/);
});

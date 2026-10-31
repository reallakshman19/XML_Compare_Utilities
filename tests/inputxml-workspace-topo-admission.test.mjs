import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTopologyAdmission, topologyPreviewGate} from '../tabs/inputxml-workspace/inputxml-workspace-topo-admission.js';

const admitted = (overrides = {}) => ({
  status: 'ADMITTED', epoch: 3, admittedProfile: 'F05 RichInputXML-P1.v1.1',
  elementCount: 56, nodeCount: 57, units: 'mm',
  digest: {sha256: 'a'.repeat(64), authority: 'XML_FILE_BYTES_MEASURED'},
  nodes: Array.from({length: 57}, (_, i) => ({id: String(i), coordinateStatus: 'ABSOLUTE_EXPLICIT_SEED'})),
  edges: Array.from({length: 56}, (_, i) => ({index: i + 1, recordId: `PIPINGELEMENT[${i + 1}]`, from: '3790', to: '3830', delta: [0, 0, 1348]})),
  writerEligible: false, physicalIdentityQualified: false,
  ...overrides,
});

test('F05 admission banner reports source evidence and measured digest, never Apply', () => {
  const html = renderTopologyAdmission({phase: 'ready', admission: admitted(), epoch: 3});
  assert.equal(topologyPreviewGate(admitted(), 3).allowed, true);
  assert.match(html, /Admitted · F05 v1\.1 · 56 elements \/ 57 nodes · absolute/);
  assert.match(html, /SHA-256: aaaaaaaaaaaa \(measured file bytes\)/);
  assert.match(html, /3790/); assert.match(html, /1348/);
  assert.doesNotMatch(html, /data-ixw-action="(?:apply|convert|build)/);
});

test('R4 banner keeps the declared profile and an unseeded frame is not called absolute', () => {
  const r4 = admitted({admittedProfile: 'R4 RichInputXMLv2.1', nodes: admitted().nodes.map(n => ({...n, coordinateStatus: 'RELATIVE_NO_SEED'}))});
  const html = renderTopologyAdmission({admission: r4, epoch: 3});
  assert.match(html, /Admitted · R4 v2\.1 · 56 elements \/ 57 nodes · relative \(no global seed\)/);
});

test('unknown root and GLRD are explicitly refused, never zero-elements PASS', () => {
  for (const reason of ['UNKNOWN_ROOT_NOT_ADMITTED:Plant', 'GLRD_RICHINPUT_P1_V1_DISCOVER_FIRST_NOT_ADMITTED']) {
    const result = admitted({status: 'UNSUPPORTED_INPUT', reason, elementCount: null, nodeCount: null, edges: [], nodes: [], recognizedFormat: 'unknown'});
    const html = renderTopologyAdmission({admission: result, epoch: 3});
    assert.match(html, /Not supported/); assert.match(html, new RegExp(reason));
    assert.match(html, /No topology evidence preview/); assert.doesNotMatch(html, /Source-element preview/);
    assert.doesNotMatch(html, /Admitted/);
  }
});

test('malformed XML is invalid and blocks preview with escaped reason text', () => {
  const html = renderTopologyAdmission({admission: admitted({status: 'INVALID', reason: 'XML_PARSE_ERROR:<script>alert(1)</script>'}), epoch: 3});
  assert.match(html, /Invalid XML/); assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/); assert.doesNotMatch(html, /Source-element preview/);
});

test('stale replacement, missing measured digest, empty graph and write capability all fail closed', () => {
  assert.equal(topologyPreviewGate(admitted(), 4).reason, 'STALE_ADMISSION');
  assert.equal(topologyPreviewGate(admitted({digest: {sha256: 'a'.repeat(64), authority: 'DECODED_TEXT_REENCODED_UTF8'}}), 3).reason, 'BYTE_IDENTITY_NOT_MEASURED');
  assert.equal(topologyPreviewGate(admitted({edges: []}), 3).reason, 'EMPTY_OR_INCONSISTENT_GRAPH');
  assert.equal(topologyPreviewGate(admitted({writerEligible: true}), 3).reason, 'UNEXPECTED_WRITE_AUTHORITY');
  assert.equal(topologyPreviewGate(null, 3).reason, 'NO_ADMISSION');
  const checking = renderTopologyAdmission({phase: 'checking', admission: admitted(), epoch: 3});
  assert.match(checking, /Previous topology evidence cleared/);
  assert.doesNotMatch(checking, /Admitted/);
});

test('incomplete admission and a parser failure never expose an older graph', () => {
  assert.match(renderTopologyAdmission({phase: 'failed', error: 'XML_PARSER_UNAVAILABLE'}), /Preview blocked/);
  assert.doesNotMatch(renderTopologyAdmission({phase: 'idle'}), /Source-element preview/);
  const fail = renderTopologyAdmission({admission: admitted({status: 'INVALID', reason: 'XML_INVALID_UTF8'}), epoch: 3});
  assert.match(fail, /XML_INVALID_UTF8/);
});

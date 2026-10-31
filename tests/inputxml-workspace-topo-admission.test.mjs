import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {admitWorkspaceSourceUpload, renderTopologyAdmission, revokeTopologyAdmission, topologyPreviewGate, workspaceTopologyGate} from '../tabs/inputxml-workspace/inputxml-workspace-topo-admission.js';

const admitted = (overrides = {}) => ({
  status: 'ADMITTED', epoch: 3, admittedProfile: 'F05 RichInputXML-P1.v1.1',
  elementCount: 56, nodeCount: 57, units: {length: 'mm', diameter: 'mm'},
  digest: {sha256: 'a'.repeat(64), authority: 'XML_FILE_BYTES_MEASURED'},
  nodes: Array.from({length: 57}, (_, i) => ({id: String(i), coordinateStatus: 'ABSOLUTE_EXPLICIT_SEED'})),
  edges: Array.from({length: 56}, (_, i) => ({index: i + 1, recordId: `PIPINGELEMENT[${i + 1}]`, from: '3790', to: '3830', delta: [0, 0, 1348]})),
  writerEligible: false, physicalIdentityQualified: false,
  ...overrides,
});

const boundView = (input, options = {}) => renderTopologyAdmission({
  admission: input, epoch: 3, sourceXmlText: '<same-source/>',
  sourceSnapshot: '<same-source/>', sourceKind: 'normal-source', ...options,
});
const sourceState = (overrides = {}) => ({
  topologyAdmissionEpoch: 0, topologyAdmission: null, topologyAdmissionError: '',
  topologyAdmissionPhase: 'idle', topologyAdmissionSourceText: null,
  topologyAdmissionSourceKind: null, sourceXmlText: '', ...overrides,
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {resolve = a; reject = b;});
  return {promise, resolve, reject};
}
function fileFrom(text, read = null) {
  const bytes = new TextEncoder().encode(text);
  return {name: 'source.xml', arrayBuffer: () => read?.promise ?? Promise.resolve(bytes.buffer),
    text: () => {throw new Error('FORBIDDEN_FILE_TEXT_PATH');}};
}

test('F05 admission banner reports source evidence and measured digest, never Apply', () => {
  const html = boundView(admitted(), {phase: 'ready'});
  assert.equal(topologyPreviewGate(admitted(), 3).allowed, true);
  assert.match(html, /Admitted · F05 v1\.1 · 56 elements \/ 57 nodes · absolute/);
  assert.match(html, /SHA-256: aaaaaaaaaaaa \(measured file bytes\)/);
  assert.match(html, /units: mm/);
  assert.match(html, /3790/); assert.match(html, /1348/);
  assert.doesNotMatch(html, /data-ixw-action="(?:apply|convert|build)/);
});

test('R4 banner keeps the declared profile and an unseeded frame is not called absolute', () => {
  const r4 = admitted({admittedProfile: 'R4 RichInputXMLv2.1', nodes: admitted().nodes.map(n => ({...n, coordinateStatus: 'RELATIVE_NO_SEED'}))});
  const html = boundView(r4);
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

test('normal Workspace handler snapshots File.arrayBuffer bytes and updates existing textarea source', async () => {
  const state = sourceState(), events = [];
  const input = '<?xml version="1.0"?><CAESARII>F05 source</CAESARII>';
  const source = fileFrom(input);
  const verdict = await admitWorkspaceSourceUpload({
    state, file: source,
    admitBytes: async (bytes, {name, epoch}) => {
      assert(bytes instanceof Uint8Array, 'source must use Uint8Array file bytes');
      assert.deepEqual(bytes, new TextEncoder().encode(input));
      assert.equal(name, 'source.xml'); assert.equal(epoch, 1);
      return admitted({epoch});
    },
    onSourceText: (decoded, name) => {
      assert.equal(name, source.name); state.sourceXmlText = decoded; events.push('source-text');
    },
    notify: () => events.push('render'),
  });
  assert.equal(verdict.status, 'ADMITTED');
  assert.equal(state.sourceXmlText, input);
  assert.equal(state.topologyAdmissionSourceText, input);
  assert.equal(state.topologyAdmissionSourceKind, 'normal-source');
  assert.equal(workspaceTopologyGate(state).allowed, true);
  assert.equal(state.topologyAdmissionPhase, 'ready');
  assert(events.indexOf('source-text') > events.indexOf('render'));
  assert.equal(events.filter(e => e === 'render').length, 3);
});

test('clear-on-change is synchronous, before bytes arrive; replacing source revokes prior graph', async () => {
  const prior = admitted({epoch: 8});
  const state = sourceState({topologyAdmissionEpoch: 8, topologyAdmission: prior,
    topologyAdmissionSourceKind: 'normal-source', topologyAdmissionSourceText: 'old', sourceXmlText: 'old'});
  const read = deferred();
  const job = admitWorkspaceSourceUpload({state, file: fileFrom('new', read),
    admitBytes: async () => admitted({epoch: 9})});
  assert.equal(state.topologyAdmissionEpoch, 9);
  assert.equal(state.topologyAdmission, null, 'old graph MUST disappear synchronously');
  assert.equal(state.topologyAdmissionSourceText, null);
  assert.equal(state.topologyAdmissionPhase, 'checking');
  assert.equal(workspaceTopologyGate(state).allowed, false);
  read.resolve(new TextEncoder().encode('new').buffer);
  await job;
});

test('epoch guard after file I/O prevents a stale read from invoking admission or overwriting newer text', async () => {
  const state = sourceState(), slowRead = deferred();
  const called = [], texts = [];
  const admitBytes = async (_bytes, {name, epoch}) => {called.push(epoch); return admitted({epoch});};
  const first = admitWorkspaceSourceUpload({state, file: fileFrom('first', slowRead),
    admitBytes, onSourceText: t => texts.push(t)});
  const second = admitWorkspaceSourceUpload({state, file: fileFrom('second'),
    admitBytes, onSourceText: t => {state.sourceXmlText = t; texts.push(t);}});
  await second;
  slowRead.resolve(new TextEncoder().encode('first').buffer);
  await first;
  assert.deepEqual(called, [2], 'the superseded first read must not even invoke the parser');
  assert.deepEqual(texts, ['second'], 'the superseded source must not be adopted');
  assert.equal(state.topologyAdmission.epoch, 2);
  assert.equal(workspaceTopologyGate(state).allowed, true);
});

test('epoch guard after async admission prevents a stale verdict from resurrecting its graph', async () => {
  const state = sourceState(), oldParse = deferred();
  const admitBytes = async (_bytes, {epoch}) => epoch === 1 ? oldParse.promise : admitted({epoch});
  const onSourceText = t => {state.sourceXmlText = t;};
  const first = admitWorkspaceSourceUpload({state, file: fileFrom('first'), admitBytes, onSourceText});
  // Wait until the old call has reached its parser promise.
  await Promise.resolve(); await Promise.resolve();
  const second = admitWorkspaceSourceUpload({state, file: fileFrom('second'), admitBytes, onSourceText});
  await second;
  oldParse.resolve(admitted({epoch: 1}));
  await first;
  assert.equal(state.topologyAdmission.epoch, 2, 'late old outcome MUST NOT overwrite the replacement');
  assert.equal(state.topologyAdmissionSourceText, 'second');
  assert.equal(workspaceTopologyGate(state).allowed, true);
});

test('same-source gate refuses changed paste text, wrong source lane, stale epoch and unreadable byte claims', () => {
  const state = sourceState({topologyAdmissionEpoch: 3, topologyAdmission: admitted(),
    topologyAdmissionSourceKind: 'normal-source', topologyAdmissionSourceText: 'original',
    sourceXmlText: 'original'});
  assert.equal(workspaceTopologyGate(state).allowed, true);
  state.sourceXmlText = 'edited';
  assert.equal(workspaceTopologyGate(state).reason, 'SOURCE_BYTES_OR_TEXT_CHANGED');
  state.sourceXmlText = 'original'; state.topologyAdmissionSourceKind = 'other-upload';
  assert.equal(workspaceTopologyGate(state).reason, 'SOURCE_BYTES_OR_TEXT_CHANGED');
  state.topologyAdmissionSourceKind = 'normal-source';
  revokeTopologyAdmission(state);
  assert.equal(state.topologyAdmission, null);
  assert.equal(workspaceTopologyGate(state).allowed, false);
});

test('normal-upload wiring is not bypassed by a legacy 5B independent paste/file picker', () => {
  const tab = readFileSync(new URL('../tabs/inputxml-workspace/inputxml-workspace-tab.js', import.meta.url), 'utf8');
  assert.match(tab, /admitWorkspaceSourceUpload\(/);
  assert.match(tab, /revokeTopologyAdmission\(state\)/);
  assert.doesNotMatch(tab, /renderXmlCiiTopology5BPanel|data-ixw-5b-host|topologySource/);
  const denied = boundView(admitted(), {sourceSnapshot: '<different/>'});
  assert.match(denied, /SOURCE_BYTES_OR_TEXT_CHANGED/);
  assert.doesNotMatch(denied, /Source-element preview/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {renderXmlCiiTopology5BPanel} from '../tabs/model-converters/xml-cii-topology-5b-panel.js';
import {admitWorkspaceSourceUpload, renderTopologyAdmission, renderWorkspace5BMount, revokeTopologyAdmission, sameTextareaSource, topologyPreviewGate, workspaceTopologyGate} from '../tabs/inputxml-workspace/inputxml-workspace-topo-admission.js';

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
  admission: input, epoch: 3, sourceDigest: input.digest?.sha256,
  sourceEpoch: 3, sourceKind: 'normal-source', ...options,
});
const sourceState = (overrides = {}) => ({
  topologyAdmissionEpoch: 0, topologyAdmission: null, topologyAdmissionError: '',
  topologyAdmissionPhase: 'idle', topologyAdmissionSourceText: null,
  topologyAdmissionSourceKind: null, topologyAdmissionDigest: null,
  topologyAdmissionSourceEpoch: null, sourceXmlText: '', ...overrides,
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

test('current digest/epoch gate survives line-ending presentation but refuses wrong bytes or source lane', () => {
  const state = sourceState({topologyAdmissionEpoch: 3, topologyAdmission: admitted(),
    topologyAdmissionSourceKind: 'normal-source', topologyAdmissionDigest: 'a'.repeat(64),
    topologyAdmissionSourceEpoch: 3, topologyAdmissionSourceText: 'original\r\n',
    sourceXmlText: 'original\n'});
  assert.equal(workspaceTopologyGate(state).allowed, true);
  state.topologyAdmissionDigest = 'b'.repeat(64);
  assert.equal(workspaceTopologyGate(state).reason, 'SOURCE_BYTE_IDENTITY_CHANGED');
  state.topologyAdmissionDigest = 'a'.repeat(64);
  state.topologyAdmissionSourceEpoch = 2;
  assert.equal(workspaceTopologyGate(state).reason, 'SOURCE_BYTE_IDENTITY_CHANGED');
  state.topologyAdmissionSourceEpoch = 3;
  state.topologyAdmissionSourceKind = 'other-upload';
  assert.equal(workspaceTopologyGate(state).reason, 'SOURCE_BYTE_IDENTITY_CHANGED');
  assert.equal(sameTextareaSource('original\r\n', 'original\n'), true);
  assert.equal(sameTextareaSource('original\r\n', 'edited\n'), false);
  revokeTopologyAdmission(state);
  assert.equal(state.topologyAdmission, null);
  assert.equal(state.topologyAdmissionDigest, null);
  assert.equal(workspaceTopologyGate(state).allowed, false);
});

test('normal-upload wiring calls real admitXmlBytes with raw bytes: no injection into tab path', () => {
  const tab = readFileSync(new URL('../tabs/inputxml-workspace/inputxml-workspace-tab.js', import.meta.url), 'utf8');
  const from = tab.indexOf('function bindFileInputs(dialog, state)');
  const to = tab.indexOf(`dialog.querySelector('[data-ixw-file="accdbHelper"]')`, from);
  assert(from > -1 && to > from, 'actual normal Source XML file handler required');
  const handler = tab.slice(from, to);
  assert.match(handler, /\[data-ixw-file="sourceXml"\]/);
  assert.match(handler, /admitWorkspaceSourceUpload\(\{[\s\S]*?admitBytes:\s*async\s*\(bytes,\s*options\)\s*=>\s*\{[\s\S]*?const\s*\{\s*admitXmlBytes\s*\}\s*=\s*await\s+import\('\.\.\/\.\.\/prototypes\/ciifr-map\/xml-format-admission\.js'\);[\s\S]*?return\s+admitXmlBytes\(bytes,\s*options\)/);
  assert.doesNotMatch(handler, /admitXmlFormat|file\.text\s*\(|new\s+TextEncoder/);
  assert.doesNotMatch(handler, /data-ixw-file="topologySource"/);
  assert.match(handler, /if\s*\(!file\)\s*return\s*;/, 'file picker cancel must be inert');
});

test('5B native panel mounts only on admitted digest+epoch and has no independent upload bypass', () => {
  const good = sourceState({topologyAdmissionEpoch: 3, topologyAdmission: admitted(),
    topologyAdmissionSourceEpoch: 3, topologyAdmissionDigest: 'a'.repeat(64),
    topologyAdmissionSourceKind: 'normal-source'});
  assert.equal(workspaceTopologyGate(good).allowed, true);
  assert.match(renderWorkspace5BMount(good), /data-ixw-5b-host/);
  const host = {innerHTML: ''};
  const result = renderXmlCiiTopology5BPanel(host, {readOnlyAdmission: {
    verdict: good.topologyAdmission, byteSha256: good.topologyAdmissionDigest, epoch: 3,
  }});
  assert.equal(result.kind, 'ADMITTED_SOURCE_ELEMENTS_READ_ONLY');
  assert.match(host.innerHTML, /5B Topology/);
  assert.doesNotMatch(host.innerHTML, /data-xml-cii-5b-file|data-xml-cii-5b-paste/);
  const refused = {...good, topologyAdmission: admitted({status: 'UNSUPPORTED_INPUT', reason: 'UNKNOWN_ROOT_NOT_ADMITTED:Plant'})};
  assert.equal(workspaceTopologyGate(refused).allowed, false);
  assert.doesNotMatch(renderWorkspace5BMount(refused), /data-ixw-5b-host/);
  assert.match(renderWorkspace5BMount(refused), /Ported 5B Topology blocked/);
  const badHost = {innerHTML: ''};
  assert.equal(renderXmlCiiTopology5BPanel(badHost, {readOnlyAdmission: {
    verdict: refused.topologyAdmission, byteSha256: good.topologyAdmissionDigest, epoch: 3,
  }}), null);
  assert.match(badHost.innerHTML, /blocked/);
  const tab = readFileSync(new URL('../tabs/inputxml-workspace/inputxml-workspace-tab.js', import.meta.url), 'utf8');
  assert.match(tab, /renderWorkspace5BMount\(state\)/);
  assert.match(tab, /host5b\s*&&\s*workspaceTopologyGate\(state\)\.allowed/);
  assert.match(tab, /renderXmlCiiTopology5BPanel\(host5b,\s*\{readOnlyAdmission:/);
});

test('canceling normal file pick leaves source text, byte admission and epoch unchanged', async () => {
  const state = sourceState({topologyAdmissionEpoch: 3, topologyAdmission: admitted(),
    topologyAdmissionSourceKind: 'normal-source', topologyAdmissionDigest: 'a'.repeat(64),
    topologyAdmissionSourceEpoch: 3, topologyAdmissionSourceText: 'old', sourceXmlText: 'old'});
  const before = {...state};
  let notified = 0;
  await admitWorkspaceSourceUpload({state, file: null, admitBytes: () => {
    throw new Error('must not admit on canceled selection');
  }, notify: () => {notified++;}});
  assert.deepEqual(state, before);
  assert.equal(notified, 0);
  assert.equal(workspaceTopologyGate(state).allowed, true);
});

test('public S1 F05 CRLF file remains admitted after textarea LF tab-switch readback', async () => {
  // The repository's pinned public fixture, not private Owner source.
  // This test isolates the Workspace's byte/epoch UI binding; strict B1 parsing
  // and real Chromium DOMParser remain separate validation responsibilities.
  const original = readFileSync(new URL('../prototypes/ciifr-map/tests/fixtures/S1-F05.xml', import.meta.url), 'utf8');
  const crlf = original.replace(/\r\n?|\n/g, '\r\n');
  assert.match(crlf, /\r\n/);
  const bytes = new TextEncoder().encode(crlf);
  const file = {name: 'S1-F05-CRLF.xml',
    arrayBuffer: async () => bytes.buffer,
    text: () => {throw new Error('DISALLOWED_TEXT_PATH');}};
  const expectedDigest = createHash('sha256').update(bytes).digest('hex');
  const state = sourceState();
  await admitWorkspaceSourceUpload({
    state, file, onSourceText: value => {state.sourceXmlText = value;},
    admitBytes: async (actualBytes, {epoch}) => {
      assert.deepEqual(actualBytes, bytes, 'the exact CRLF-bearing bytes must be admitted');
      return admitted({epoch, digest: {authority: 'XML_FILE_BYTES_MEASURED', sha256: expectedDigest}});
    },
  });
  assert.equal(state.topologyAdmissionDigest, expectedDigest);
  assert.equal(workspaceTopologyGate(state).allowed, true);
  const before = state.sourceXmlText;
  state.sourceXmlText = state.sourceXmlText.replace(/\r\n?/g, '\n'); // browser textarea readback
  assert.notEqual(before, state.sourceXmlText);
  assert.equal(sameTextareaSource(before, state.sourceXmlText), true);
  assert.equal(workspaceTopologyGate(state).allowed, true, 'CRLF-only tab switch must retain original-byte admission');
  assert.match(renderWorkspace5BMount(state), /data-ixw-5b-host/);
  const html = renderTopologyAdmission({phase: state.topologyAdmissionPhase,
    admission: state.topologyAdmission, epoch: state.topologyAdmissionEpoch,
    sourceDigest: state.topologyAdmissionDigest, sourceEpoch: state.topologyAdmissionSourceEpoch,
    sourceKind: state.topologyAdmissionSourceKind});
  assert.match(html, /Admitted · F05 v1\.1 · 56 elements \/ 57 nodes · absolute/);
  const tab = readFileSync(new URL('../tabs/inputxml-workspace/inputxml-workspace-tab.js', import.meta.url), 'utf8');
  assert.match(tab, /!sameTextareaSource\(before\.sourceXmlText, state\.sourceXmlText\)/);
  assert.match(tab, /revokeTopologyAdmission\(state\)/);
});

test('5B read-only graph uses only admitted source IDs/coordinates and never renders legacy file picker', () => {
  const base = admitted();
  const nodes = [
    {id: '3790', xyz: [0, 0, 0]},
    {id: '3830', xyz: [0, 0, 1348]},
    ...Array.from({length: 55}, (_, i) => ({id: String(4000 + i), xyz: [i, i * 3, i * 10]})),
  ];
  const projection = {...base, nodes};
  const host = {innerHTML: ''};
  const result = renderXmlCiiTopology5BPanel(host, {readOnlyAdmission: {
    verdict: projection, byteSha256: base.digest.sha256, epoch: 3,
  }});
  assert.equal(result.elementCount, 56);
  assert.match(host.innerHTML, /data-xml-cii-5b-source-graph/);
  assert.match(host.innerHTML, /source-element geometry only/);
  assert.doesNotMatch(host.innerHTML, /data-xml-cii-5b-file|data-xml-cii-5b-paste/);
  const denied = {innerHTML: ''};
  assert.equal(renderXmlCiiTopology5BPanel(denied, {readOnlyAdmission: {
    verdict: projection, byteSha256: '0'.repeat(64), epoch: 3,
  }}), null);
  assert.match(denied.innerHTML, /blocked/);
});

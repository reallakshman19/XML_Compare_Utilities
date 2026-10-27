import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto, createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readXmlGraph} from '../xml-intake.js';
import {createPreviewSession} from '../compare.js';
import {exportPreview} from '../evidence.js';

if (!process.env.CIIFR_TEST_RUNTIME) throw new Error('Set CIIFR_TEST_RUNTIME to a test-only npm prefix containing @xmldom/xmldom. Product uses browser DOMParser.');
const require = createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json');
const {DOMParser} = require('@xmldom/xmldom');
const f05 = new Uint8Array(readFileSync(new URL('./fixtures/S1-F05.xml', import.meta.url)));
const r4 = new Uint8Array(readFileSync(new URL('./fixtures/S1-R4.xml', import.meta.url)));
const parse = () => new DOMParser({onError: (level, message) => { throw new Error('XML_PARSE_ERROR:' + level + ':' + message); }});
const read = (bytes, options) => readXmlGraph(bytes, {...options, cryptoRef: webcrypto, parser: parse()});
const bytes = text => new TextEncoder().encode(text);
const text = payload => new TextDecoder().decode(payload);
const sha = payload => createHash('sha256').update(payload).digest('hex');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
async function loaded() {
  const session = createPreviewSession({read});
  await Promise.all([session.load('SOURCE', f05, 'S1-F05.xml'), session.load('TARGET', r4, 'S1-R4.xml')]);
  return session;
}

test('real public-original-derived F05/R4 XML reaches unchanged Method C and metric SVG', async () => {
  const session = await loaded(), {SOURCE: source, TARGET: target} = session.state.graphs;
  assert.equal(source.nodes.length, 57); assert.equal(source.edges.length, 56);
  assert.deepEqual(source.nodes.map(node => [node.id,node.xyz]), target.nodes.map(node => [node.id,node.xyz]));
  assert.deepEqual(source.nodeIndex.get('3830').xyz, [798423,100237,1126376]);
  assert.deepEqual(source.edges[1].delta, [0,-1500,0]);
  assert.equal(source.sha256, sha(f05)); assert.equal(target.sha256, sha(r4));
  assert.equal(source.byteAuthority, 'XML_BYTES_MEASURED');
  assert.equal(source.claimedCii.status, 'NOT_PRESENT');
  assert.equal(target.claimedCii.status, 'CLAIMED_NOT_REVERIFIED');
  for (const id of ['3790','3830','3840']) session.addAnchor(id, id);
  session.configure({tolerance: {x:.01,y:.01,z:.01}});
  const result = session.run();
  assert.equal(result.candidates.nearSourceCount, 57);
  assert.equal(result.transform.determinant, 1); assert.equal(result.transform.scale, 1);
  assert.match(result.scene.svg, /data-metric="true"/);
  const evidence = JSON.parse(exportPreview(session, 'json'));
  assert.equal(evidence.qualifiedPhysicalIdentityCount, 0);
  assert.equal(evidence.graphs.source.edges[0].xmlWitness.fields[0].name, 'FROM_NODE');
  assert.equal(evidence.nextConsumer, 'WBS3.2/G2/M14_GRAPH_AND_CORRESPONDENCE_LEDGER');
  assert.match(exportPreview(session, 'svg'), /<metadata>/);
  assert.match(exportPreview(session, 'svg'), new RegExp(source.sha256));
  assert.match(exportPreview(session, 'csv'), /sourceCiiClaimStatus/);
  session.configure({projection: 'ISO'}); assert.throws(() => exportPreview(session, 'json'), /STALE/);
  assert.equal(session.run().scene.metric, false);
});

test('source-bound sign falsifier changes XML identity and supplied geometry, never CII claim authority', async () => {
  const original = await read(r4, {member:'SOURCE:before'});
  const xml = text(r4), old = 'name="delta_y"';
  const doc = parse().parseFromString(xml, 'application/xml');
  const field = Array.from(doc.getElementsByTagName('Field')).find(f => f.getAttribute('name') === 'delta_y' && Number(f.getAttribute('value')) === -1500);
  assert(field); field.setAttribute('value', '1500.000');
  const changed = bytes(doc.toString());
  assert(xml.includes(old));
  const altered = await read(changed, {member:'SOURCE:after'});
  assert.notEqual(altered.sha256, original.sha256);
  assert.equal(altered.edges[1].delta[1], 1500);
  assert.equal(altered.nodeIndex.get('3840').xyz[1] - original.nodeIndex.get('3840').xyz[1], 3000);
  assert.deepEqual(altered.claimedCii, original.claimedCii);
  assert.equal(altered.claimedCii.status, 'CLAIMED_NOT_REVERIFIED');
  await assert.rejects(read(changed, {member:'SOURCE:wrong expected',expectedXmlSha256:original.sha256}), /XML_SHA256_MISMATCH/);
});

test('unsupported schema/units, malformed XML, DTD, entities, fields and counts fail closed', async () => {
  const xml = text(r4);
  const invalid = [
    ['schema', xml.replace('schema="RichInputXMLv2.1"', 'schema="unknown"'), /UNSUPPORTED_R4_PROFILE/],
    ['units', xml.replace('value="mm."', 'value="in."'), /UNSUPPORTED_OR_INCONSISTENT_NATIVE_MM_UNITS/],
    ['malformed', xml.slice(0, -40), /XML_PARSE_ERROR/],
    ['DTD', '<!DOCTYPE test>' + xml, /DTD_OR_ENTITY_FORBIDDEN/],
    ['entity', '<!ENTITY test "x">' + xml, /DTD_OR_ENTITY_FORBIDDEN/],
    ['nonfinite', xml.replace(/(<Field name="delta_x"[^>]*?\bvalue=")[^"]*"/, '$1Infinity"'), /NUMBER_INVALID/],
    ['count', xml.replace(/(<Field name="elements"[^>]*?\bvalue=")[^"]*"/, '$157"'), /ELEMENT_COUNT_MISMATCH/]
  ];
  for (const [name, payload, error] of invalid) {
    assert.ok(payload !== xml, name + ' mutation must occur');
    await assert.rejects(read(bytes(payload), {member:name}), error);
  }
});

test('reversed XML endpoint occurrence preserves the same signed physical geometry', async () => {
  const original = await read(r4, {member:'SOURCE:original'});
  const doc = parse().parseFromString(text(r4), 'application/xml');
  const record = Array.from(doc.getElementsByTagName('Record')).find(rec => rec.getAttribute('id') === 'element-000002');
  const fields = Array.from(record.getElementsByTagName('Field'));
  const set = (name, value) => fields.find(field => field.getAttribute('name') === name).setAttribute('value', value);
  set('from_node','3840'); set('to_node','3830'); set('delta_y','1500');
  const reversed = await read(bytes(doc.toString()), {member:'SOURCE:reversed'});
  assert.deepEqual(reversed.nodes.map(node => [node.id,node.xyz]), original.nodes.map(node => [node.id,node.xyz]));
  assert.equal(reversed.edges[1].from, '3840'); assert.equal(reversed.edges[1].to, '3830');
  assert.deepEqual(reversed.edges[1].delta, [0,1500,0]);
});

test('file-read reservation immediately removes old graphs/anchors/exports and rejects late stale failure', async () => {
  const session = await loaded(); session.addAnchor('3790','3790'); session.run();
  const old = deferred(), first = session.load('SOURCE', old.promise, 'old-delayed-file.xml');
  assert.equal(session.state.graphs.SOURCE, null); assert(session.state.pending.has('SOURCE'));
  assert.equal(session.state.anchors.length, 0);
  assert.throws(() => session.run(), /BOTH_XML_FILES_REQUIRED/);
  assert.throws(() => exportPreview(session, 'json'), /STALE/);
  await session.load('SOURCE', r4, 'new-file.xml');
  const current = session.state.graphs.SOURCE;
  old.reject(new Error('late old arrayBuffer failure'));
  assert.equal(await first, false); assert.equal(session.state.graphs.SOURCE, current);
  assert.equal(current.member, 'SOURCE:new-file.xml'); assert.equal(session.state.pending.size, 0);
});

test('delayed XML digest completion cannot replace the newer file revision', async () => {
  const gate = deferred(); let calls = 0;
  const session = createPreviewSession({read: async (payload, options) => {
    if (++calls === 1) await gate.promise;
    return read(payload, options);
  }});
  const old = session.load('SOURCE', f05, 'older.xml');
  await Promise.resolve();
  await session.load('SOURCE', r4, 'newer.xml'); gate.resolve();
  assert.equal(await old, false); assert.equal(session.state.graphs.SOURCE.sha256, sha(r4));
});

test('one/two anchor warnings, duplicate custody and parameter/anchor revocation stay honest', async () => {
  const session = await loaded(); session.addAnchor('3790','3790');
  assert.match(session.run().transform.status, /ORIENTATION_UNDETERMINED/);
  assert.throws(() => session.addAnchor('3790','3830'), /DUPLICATE_ANCHOR_CUSTODY/);
  assert.throws(() => exportPreview(session, 'svg'), /STALE/);
  session.addAnchor('3830','3830');
  assert.match(session.run().transform.status, /TWIST_UNDETERMINED/);
  session.removeAnchor(1); assert.throws(() => exportPreview(session, 'csv'), /STALE/);
  session.run(); assert.throws(() => session.configure({tolerance:{x:NaN,y:1,z:1}}), /TOLERANCE/);
  assert.throws(() => exportPreview(session, 'json'), /STALE/);
});

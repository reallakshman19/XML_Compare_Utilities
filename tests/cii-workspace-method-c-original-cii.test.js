// WP2: pinned ORIGINAL CII files; never substitute demo fixtures or inferred mappings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { buildOriginalGraphFromBytes, graphRoute } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';

const sha = {
  S1: '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2: '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3: 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T: 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const expectedCounts = { S1: [56, 57], S2: [46, 47], S3: [45, 46], T: [1614, 1619] };
async function original(name) {
  const raw = await readFile(new URL('../Benchmark/' + name + '.CII', import.meta.url));
  const independentlyComputed = createHash('sha256').update(raw).digest('hex');
  assert.equal(independentlyComputed, sha[name], name + ' ORIGINAL byte digest changed');
  const graph = await buildOriginalGraphFromBytes({
    bytes: raw, member: name, expectedSha256: sha[name], cryptoRef: webcrypto,
  });
  assert.equal(graph.sha256, sha[name]);
  assert.equal(graph.byteLength, raw.length);
  assert.equal(graph.byteAuthority, 'ORIGINAL_BYTES');
  assert.deepEqual([graph.edges.length, graph.nodes.length], expectedCounts[name]);
  assert.ok(graph.edges.every((edge) => edge.witness?.startsWith('ELEMENTS#')));
  assert.ok(graph.nodes.every((node) => node.member === name && node.sha256 === sha[name]));
  return { graph, raw };
}
test('S1/S2/S3/T original bytes, fixed-width elements and physical component census', async () => {
  const results = {};
  for (const member of Object.keys(sha)) results[member] = await original(member);
  assert.deepEqual(results.T.graph.components.map((c) => c.length), [767, 40, 511, 236, 65]);
  const at875 = results.T.graph.nodeIndex.get('875');
  assert.ok(at875 && results.T.graph.components[at875.component].length === 767);
  const s = graphRoute(results.S1.graph, '3910', '5110');
  const t = graphRoute(results.T.graph, '875', '1095');
  assert.equal(s.ids.length, 45); assert.equal(t.ids.length, 45);
  assert.equal(s.elementCount, 44); assert.equal(t.elementCount, 44);
  assert.ok(Math.abs(s.developedLength - 229794) < 0.001);
  assert.ok(Math.abs(t.developedLength - 229493.43) < 0.001);
  assert.ok(results.S1.graph.edges.some((e) => e.pointer > 0 && e.fromName));
  assert.equal(results.S1.graph.coordinateFrames.find((c) => c.witnesses.includes('3790'))?.coordinateFrame, 'ORIGINAL_CII_COORDS_SEED');
});
test('RED control: one flipped original byte is rejected before decoding', async () => {
  const bytes = await readFile(new URL('../Benchmark/S1.CII', import.meta.url));
  const corruption = new Uint8Array(bytes);
  corruption[77] ^= 1;
  await assert.rejects(buildOriginalGraphFromBytes({
    bytes: corruption, member: 'S1', expectedSha256: sha.S1, cryptoRef: webcrypto,
  }), /ORIGINAL_SHA256_MISMATCH/);
});

/**
 * Issue #126 — independent ORIGINAL CII NodeName pointer-custody regression.
 *
 * The expected pointer/NodeNames come from the existing test-only independent
 * CII fixed-field decoder and raw ORIGINAL bytes, never the Method C graph.
 * Intentionally RED against PR138 ancestor's wrong ELEMENTS +12:0 pointer.
 * Does not qualify same-asset identity, Method C BOUND or Writer2 mutation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildOriginalGraphFromBytes } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import { parseIndependentNodeNameState } from './cii-workspace-multisource-texpected-oracle.js';

const original = Object.freeze({
  S1: ['9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b', 56, 57, 38],
  S2: ['7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd', 46, 47, 34],
  S3: ['c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa', 45, 46, 32],
  T: ['abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060', 1614, 1619, 950],
});
const hash = raw => createHash('sha256').update(raw).digest('hex');
const bytesFor = member => readFileSync(new URL('../Benchmark/' + member + '.CII', import.meta.url));
const graphFor = (member, bytes) => buildOriginalGraphFromBytes({
  bytes, member, expectedSha256: hash(bytes), cryptoRef: webcrypto,
});

function independentEvidence(member) {
  const bytes = bytesFor(member), [sha, edges, nodes, names] = original[member];
  assert.equal(hash(bytes), sha, member + ': exact original file changed');
  const oracle = parseIndependentNodeNameState(bytes.toString('latin1'));
  assert.deepEqual([oracle.elements.length, oracle.names.size, oracle.conflicts.length],
    [edges, names, 0], member + ': independent fixed-field original names');
  return { bytes, oracle, nodes };
}

function reverseWholeElementBlocks(bytes) {
  const text = bytes.toString('latin1');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const rows = text.split(/\r?\n/);
  const start = rows.indexOf('#$ ELEMENTS');
  assert(start >= 0);
  let end = start + 1;
  while (end < rows.length && !/^\s*#\$\s+\S+/.test(rows[end])) end++;
  const elements = rows.slice(start + 1, end);
  assert.equal(elements.length % 15, 0);
  const blocks = [];
  for (let i = 0; i < elements.length; i += 15) blocks.push(elements.slice(i, i + 15));
  const shuffled = [...rows.slice(0, start + 1), ...blocks.reverse().flat(), ...rows.slice(end)];
  const changed = Buffer.from(shuffled.join(eol), 'latin1');
  assert.notEqual(hash(changed), hash(bytes));
  return changed;
}

test('all original Method C edge NODENAME pointers agree with independent native ELEMENT +13 field5', async () => {
  for (const member of Object.keys(original)) {
    const { bytes, oracle, nodes } = independentEvidence(member);
    const graph = await graphFor(member, bytes);
    assert.deepEqual([graph.edges.length, graph.nodes.length], [oracle.elements.length, nodes]);
    assert.equal(graph.nameConflicts.length, 0, member + ': conflict-free real NodeNames');
    for (let i = 0; i < oracle.elements.length; i++) {
      const expected = oracle.elements[i], actual = graph.edges[i];
      assert.equal(actual.pointer, expected.pointer, member + ': ELEMENT#' + (i + 1) + ' pointer');
      assert.equal(actual.fromName, expected.fromName, member + ': FROM name ELEMENT#' + (i + 1));
      assert.equal(actual.toName, expected.toName, member + ': TO name ELEMENT#' + (i + 1));
      assert.equal(actual.from, expected.from);
      assert.equal(actual.to, expected.to);
    }
    for (const [id, name] of oracle.names)
      assert.equal(graph.nodeIndex.get(id)?.nodeName, name, member + ': original NODE ' + id);
    assert.equal(graph.nodes.filter(n => n.nodeName).length, oracle.names.size);
    assert.equal(graph.byteAuthority, 'ORIGINAL_BYTES');
  }
});

test('named original physical nodes must be assigned from the right source/target occurrence', async () => {
  const cases = [['S1', '3910', 'SL-098.7'], ['S3', '1370', 'PS-010.1'], ['T', '30', 'PS02352.1']];
  for (const [member, node, name] of cases) {
    const { bytes, oracle } = independentEvidence(member);
    assert.equal(oracle.names.get(node), name, member + ':' + node + ': independent raw witness');
    const graph = await graphFor(member, bytes);
    assert.equal(graph.nodeIndex.get(node)?.nodeName, name, member + ':' + node);
  }
});

test('complete 15-row ELEMENT-block permutation preserves original physical names, edges and topology', async () => {
  for (const member of ['S1', 'T']) {
    const bytes = bytesFor(member);
    const before = await graphFor(member, bytes);
    const shuffled = reverseWholeElementBlocks(bytes);
    const after = await graphFor(member, shuffled);
    const oracle = parseIndependentNodeNameState(shuffled.toString('latin1'));
    assert.equal(oracle.conflicts.length, 0);
    assert.equal(after.nodes.length, before.nodes.length);
    assert.deepEqual(after.components.map(g => g.length).sort((a, b) => a - b),
      before.components.map(g => g.length).sort((a, b) => a - b));
    const edgeKey = e => JSON.stringify([e.from, e.to, e.delta, e.od, e.wall, e.pointer,
      e.fromName, e.toName]);
    assert.deepEqual(after.edges.map(edgeKey).sort(), before.edges.map(edgeKey).sort());
    for (const [id, name] of oracle.names)
      assert.equal(after.nodeIndex.get(id)?.nodeName, name, member + ':' + id);
    for (const node of before.nodes)
      assert.equal(after.nodeIndex.get(node.id)?.nodeName, node.nodeName, member + ':' + node.id);
  }
});

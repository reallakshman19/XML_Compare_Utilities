import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { buildOriginalGraphFromBytes, graphRoute } from '../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';

function encodeRow(fields = []) {
  return '  ' + Array.from({ length: 6 }, (_, index) => Number(fields[index] ?? 0).toExponential(6).toUpperCase().padStart(13)).join('');
}
function makeCii(elements, options = {}) {
  const rows = [];
  for (const [source, target, x, y, z] of elements) {
    const block = Array.from({ length: 15 }, () => encodeRow());
    block[0] = encodeRow([source, target, x, y, z, 273]);
    block[1] = encodeRow([25.4]);
    rows.push(...block);
  }
  const sections = ['#$ CONTROL', encodeRow([elements.length]), '#$ UNITS', options.units ?? '  SI (mm)', '#$ ELEMENTS', ...rows, '#$ NODENAME'];
  return new TextEncoder().encode(sections.join('\r\n') + '\r\n');
}
async function parse(bytes, options = {}) {
  return buildOriginalGraphFromBytes({ bytes, member: 'S1', expectedSha256: createHash('sha256').update(bytes).digest('hex'), cryptoRef: webcrypto, ...options });
}
test('original bytes reconstruct forward and reverse signed 3D physical centerline', async () => {
  const graph = await parse(makeCii([[100, 105, 110, 20, -30], [105, 110, -15, 40, 10]]));
  assert.equal(graph.nodes.length, 3);
  assert.deepEqual(graph.nodeIndex.get('110').xyz, [95, 60, -20]);
  assert.equal(graphRoute(graph, '110', '100').developedLength, Math.hypot(110, 20, -30) + Math.hypot(-15, 40, 10));
  assert.equal(graph.edges[0].witness, 'ELEMENTS#1:15rows:1-15');
  assert.equal(graph.byteAuthority, 'ORIGINAL_BYTES');
});
test('independent disconnected component remains physically disjoint', async () => {
  const graph = await parse(makeCii([[100, 105, 1, 0, 0], [300, 305, 0, 5, 0]]));
  assert.deepEqual(graph.components.map((x) => x.length), [2, 2]);
  assert.throws(() => graphRoute(graph, '105', '305'), /ENDPOINT_NOT_CONNECTED/);
});
test('wrong original hash and unit interpretation fail closed', async () => {
  const bytes = makeCii([[100, 105, 5, 0, 0]]);
  await assert.rejects(parse(bytes, { expectedSha256: '0'.repeat(64) }), /ORIGINAL_SHA256_MISMATCH/);
  await assert.rejects(parse(makeCii([[100, 105, 5, 0, 0]], { units: '  Imperial (in)' })), /UNSUPPORTED_OR_MISSING_CII_NATIVE_MM_UNITS/);
});
test('cycle contradiction is rejected and cannot mint an extra node', async () => {
  await assert.rejects(parse(makeCii([[100, 105, 5, 0, 0], [105, 110, 5, 0, 0], [110, 100, -11, 0, 0]])), /CII_SIGNED_VECTOR_CYCLE_CONFLICT/);
});
test('corrupt original bytes and invalid element count are refused', async () => {
  await assert.rejects(buildOriginalGraphFromBytes({ bytes: new Uint8Array(), member: 'S1', cryptoRef: webcrypto }), /EMPTY_ORIGINAL_CII_BYTES/);
  await assert.rejects(parse(new TextEncoder().encode('#$ UNITS\r\n  SI (mm)\r\n#$ ELEMENTS\r\n  invalid\r\n#$ NODENAME\r\n')), /INVALID_15_ROW_ELEMENTS_SECTION/);
});

test('native element CONTROL counts reject missing/extra records', async () => {
  const bytes = makeCii([[100, 105, 5, 0, 0]]);
  const damaged = new TextEncoder().encode(new TextDecoder().decode(bytes).replace(encodeRow([1]), encodeRow([2])));
  await assert.rejects(parse(damaged), /CII_CONTROL_ELEMENTS_COUNT_MISMATCH/);
});
test('NODENAME pointer uses native row-13 first field and fails when out of range', async () => {
  const raw = new TextDecoder().decode(makeCii([[100, 105, 5, 0, 0]]));
  const lines = raw.split('\r\n');
  const elementIndex = lines.indexOf('#$ ELEMENTS');
  lines[elementIndex + 1 + 12] = encodeRow([1, 0, 0, 0, 0, 0]);
  const i = lines.indexOf('#$ NODENAME');
  lines.splice(i + 1, 0, '  FROM-NAME                    TO-NAME');
  const good = await parse(new TextEncoder().encode(lines.join('\r\n')));
  assert.equal(good.edges[0].pointer, 1);
  assert.equal(good.edges[0].fromName, 'FROM-NAME');
  lines[elementIndex + 1 + 12] = encodeRow([2, 0, 0, 0, 0, 0]);
  await assert.rejects(parse(new TextEncoder().encode(lines.join('\r\n'))), /BAD_NODENAME_POINTER_0/);
});

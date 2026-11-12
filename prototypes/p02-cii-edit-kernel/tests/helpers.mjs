// Shared test helpers: Change set builders, fixture and benchmark loading, refusal assertions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '../kit/core.mjs';
import { CARD_DIR, readBenchmark } from '../kit/node.mjs';

export const fixture = name => new Uint8Array(readFileSync(join(CARD_DIR, 'tests', 'fixtures', name)));
const cache = new Map();
export async function bench(id) {
  if (!cache.has(id)) cache.set(id, (await readBenchmark(id)).bytes);
  return cache.get(id);
}

let n = 0;
/** A valid, approved change (override any key). */
export function change(over = {}) {
  return {
    changeId: over.changeId || 'C' + (++n),
    target: over.target,
    field: over.field || 'RIGID/WEIGHT',
    unit: 'kg',
    oldToken: over.oldToken,
    newValue: over.newValue,
    evidence: { source: 'manual', detail: 'test' },
    approval: over.approval || { approved: true, by: 'test.engineer', at: '2026-11-12T10:00:00Z' },
    ...(over.span ? { span: over.span } : {}),
  };
}
export const elRef = (e) => ({ kind: 'cii', elementIndex: e.index, fromNode: String(e.from), toNode: String(e.to) });
export const nodeRef = (node) => ({ kind: 'cii-node', node: String(node) });

/** A Change set for `bytes` (sha256 computed unless given). */
export async function changeset(bytes, changes, base = {}) {
  return {
    format: 'topofix.changeset', version: 1, createdAt: '2026-11-12T10:00:00Z',
    base: { kind: 'cii', fileName: 'test.cii', sha256: await sha256Hex(bytes), ...base },
    changes,
  };
}

/** Assert an all-or-nothing refusal that includes `code`: ok false, no bytes, nothing applied. */
export function expectRefusal(r, code) {
  assert.equal(r.ok, false, 'expected a refusal ' + code + ', got ok');
  assert.equal(r.bytes, undefined, 'a refusal must carry no output bytes');
  assert.deepEqual(r.applied || [], []);
  assert.ok(r.refusals.some(x => x.code === code), 'expected ' + code + ', got ' + JSON.stringify(r.refusals));
}

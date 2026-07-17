import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  attachProjectDocument, createProjectDocument, createProjectSession,
  projectSessionPreflight, serializeProjectSession, validateProjectDocument, validateProjectSession,
} from '../tabs/revision-compare/revision-session-contracts.js';
import { createRevisionLoadService } from '../tabs/revision-compare/revision-load-service.js';
import { sha256Text } from '../tabs/revision-compare/revision-hash.js';

const NOW = '2026-07-17T10:28:00.000Z';
const simulated = (suffix) => ({
  schema: 'inputxml-managed-stage/v1', unit: 'mm', verticalAxis: 'Z', coordinateFrame: 'PLANT',
  branches: [
    { name: `/LINE-A${suffix}`, attributes: { NAME: `/LINE-A${suffix}` }, children: [{ type: 'PIPE' }, { type: 'VALV' }] },
    { name: `/LINE-B${suffix}`, attributes: { NAME: `/LINE-B${suffix}` }, children: [{ type: 'FLAN' }] },
  ],
});

assert.equal(await sha256Text('revision', globalThis.crypto), '2b214ddf3326016519afcb268f63623b80b91a65265277668e4d020d87dd9078');

const service = createRevisionLoadService(globalThis.crypto);
const baselineResult = await service.loadText('baseline', 'rev-a.json', JSON.stringify(simulated('')), NOW);
const candidateResult = await service.loadText('candidate', 'rev-b.json', JSON.stringify(simulated('-B')), NOW);
assert.deepEqual(validateProjectDocument(baselineResult.document), []);
assert.equal(baselineResult.document.stats.branchCount, 2);
assert.equal(baselineResult.document.stats.componentCount, 3);
assert.equal(baselineResult.document.rootShape, 'branches');
assert.equal(baselineResult.document.unit, 'MM');

let session = createProjectSession({ sessionId: 'session-1', createdAt: NOW });
session = attachProjectDocument(session, baselineResult.document, NOW);
session = attachProjectDocument(session, candidateResult.document, NOW);
assert.deepEqual(validateProjectSession(session), []);
assert.equal(projectSessionPreflight(session).status, 'READY');

const scoped = await service.applyScope('baseline', { wildcard: '/LINE-A', selectedIds: [] }, NOW);
assert.equal(scoped.document.stats.branchCount, 1);
assert.equal(scoped.document.stats.matched, 1);
assert.equal(candidateResult.document.stats.branchCount, 2, 'candidate scope must remain independent');
session = attachProjectDocument(session, scoped.document, NOW);
const manifest = serializeProjectSession(session);
assert.match(manifest, /"preflight":/);
assert.doesNotMatch(manifest, /"children":/, 'session manifest must not contain raw staged data');

const incompatible = createProjectDocument({ ...candidateResult.document, unit: 'IN', createdAt: NOW });
const blockedSession = attachProjectDocument(
  attachProjectDocument(createProjectSession({ sessionId: 'session-2', createdAt: NOW }), baselineResult.document, NOW),
  incompatible,
  NOW,
);
assert.equal(projectSessionPreflight(blockedSession).status, 'BLOCKED');
assert.match(projectSessionPreflight(blockedSession).blockers.join(' '), /Unit mismatch/);
service.dispose();
console.log('[SIMULATED] Revision session, independent scope, metadata, hash, and preflight contracts passed.');

const moduleDirectory = fileURLToPath(new URL('../tabs/revision-compare/', import.meta.url));
const moduleFiles = readdirSync(moduleDirectory).filter((name) => name.endsWith('.js'));
assert(moduleFiles.length >= 7);
for (const name of moduleFiles) {
  const source = readFileSync(path.join(moduleDirectory, name), 'utf8');
  assert(source.split(/\r?\n/).length <= 300, `${name} exceeds 300 lines`);
  assert.doesNotMatch(source, /export\s+default/, `${name} must use named exports`);
  assert.doesNotMatch(source, /(?:from\s+|import\s*)['"]node:|require\(|process\./, `${name} must remain browser-only`);
  await import(new URL(`../tabs/revision-compare/${name}`, import.meta.url));
}
const registry = readFileSync(fileURLToPath(new URL('../tabs/psnm-utility-tab.js', import.meta.url)), 'utf8');
assert.match(registry, /installRevisionCompareTile/);
assert.match(registry, /destroyRevisionCompare/);

const realFixture = fileURLToPath(new URL('../../3D_Converters/Benchmarks/1885_NC/1885_NC.json', import.meta.url));
if (!existsSync(realFixture)) {
  console.log(`Revision Compare real-data acceptance SKIPPED: fixture not found at ${realFixture}`);
} else {
  const realService = createRevisionLoadService(globalThis.crypto);
  const text = readFileSync(realFixture, 'utf8');
  const real = await realService.loadText('baseline', '1885_NC.json', text, NOW);
  assert.equal(real.document.stats.branchCount, 278);
  assert.equal(real.document.stats.componentCount, 4320);
  assert.equal(real.document.sourceHash.length, 64);
  realService.dispose();
  console.log(`Revision Compare real-data acceptance passed: ${real.document.stats.branchCount} branches · ${real.document.stats.componentCount} components.`);
}

console.log('revision-compare-foundation.test.mjs passed');

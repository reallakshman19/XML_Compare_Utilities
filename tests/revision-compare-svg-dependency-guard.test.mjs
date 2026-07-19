import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'tabs/revision-compare/revision-compare-engineering-svg-scene.js',
  'tabs/revision-compare/revision-compare-engineering-svg-viewer.js',
  'tabs/revision-compare/revision-compare-svg-styles.js',
  'tabs/revision-compare/revision-compare-viewer-backend.js',
  'tabs/revision-compare/revision-compare-viewer-contract.js',
];
const forbidden = [
  'command-gateway', 'edit-runtime', 'edit-coordinator', 'draft-store', 'property-mutation',
  'interaction-session', 'snap-acquisition', 'precision-geometry-mutation', 'workbench3d/',
];
for (const path of files) {
  const source = await readFile(path, 'utf8');
  assert(source.split('\n').length < 300, `${path} must remain below 300 lines`);
  assert.equal(/export\s+default/.test(source), false, `${path} must use named exports`);
  for (const token of forbidden) assert.equal(source.includes(token), false, `${path} reaches forbidden ${token}`);
}
console.log('revision-compare-svg-dependency-guard.test.mjs passed');

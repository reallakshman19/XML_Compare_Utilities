import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildSupportSteelRelationshipBundle } from '../tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js';
import { SUPPORT_STEEL_DEFAULT_CONFIG } from '../tabs/support-steel-relationship-builder/support-steel-relationship-contracts.js';
import {
  buildSupportSteelProjectMigration,
  supportSteelProjectArtifacts,
} from '../tabs/support-steel-relationship-builder/support-steel-project-adapter.js';
import { supportSteelSampleText } from '../tabs/support-steel-relationship-builder/support-steel-relationship-samples.js';
import { parseSupportSteelJson } from '../tabs/support-steel-relationship-builder/support-steel-source-utils.js';

const combinedSourceText = supportSteelSampleText();
const combinedInput = parseSupportSteelJson(combinedSourceText, 'Combined staged model source');
const bundle = buildSupportSteelRelationshipBundle({
  combinedInput,
  config: SUPPORT_STEEL_DEFAULT_CONFIG,
});
const artifacts = supportSteelProjectArtifacts(bundle);

assert.equal(artifacts.length, 8);
for (const artifact of artifacts) {
  assert.equal(typeof artifact.text, 'string');
  assert.ok(artifact.text.length > 0, `${artifact.name} must have preview text`);
}

const migration = await buildSupportSteelProjectMigration({
  bundle,
  combinedSourceText,
  sourceName: 'support-steel-sources.json',
  createdAt: '2026-07-17T13:38:53.000Z',
  cryptoRef: globalThis.crypto,
});
assert.equal(migration.exportPlan.gate.status, 'READY');
assert.deepEqual(migration.outputs.map((row) => row.text), artifacts.map((row) => row.text));

const tab = readFileSync('tabs/support-steel-relationship-builder/support-steel-relationship-tab.js', 'utf8');
const utility = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
assert.match(tab, /const combinedSourceText = modal\.querySelector/);
assert.match(tab, /bundle: state\.bundle,\s*combinedSourceText,/);
assert.doesNotMatch(tab, /supportSourceText:\s*supportText|steelSourceText:\s*steelText/);
assert.match(tab, /support-steel-project-adapter\.js\?v=20260717-ssrb-preview-export-fix-1/);
assert.match(utility, /support-steel-relationship-tab\.js\?v=20260717-ssrb-preview-export-fix-1/);

console.log('support-steel preview export flow tests passed');

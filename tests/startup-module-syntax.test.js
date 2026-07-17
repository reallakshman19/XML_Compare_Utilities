import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const CACHE_TOKEN = '20260717-startup-parse-hotfix-1';
const syntaxFiles = [
  'main-rhbg-fitguard.js',
  'core/app.js',
  'tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-addon.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-view.js',
  'tabs/support-steel-relationship-builder/support-steel-restraint-evidence-bundle.js',
  'tabs/support-steel-relationship-builder/support-restraint-function-engine.js',
  'tabs/support-steel-relationship-builder/support-restraint-evidence.js',
  'tabs/support-steel-relationship-builder/support-restraint-intent.js',
  'tabs/support-steel-relationship-builder/support-restraint-local-frame.js',
  'tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js',
  'tabs/ps-family-clash-audit/ps-family-native-audit-pipeline-addon.js',
  'tabs/ps-family-clash-audit/ps-family-restraint-function-addon.js',
];

for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file} failed JavaScript parsing:\n${result.stderr || result.stdout}`);
}

for (const file of [
  'index.html',
  'main-rhbg-fitguard.js',
  'core/app.js',
  'tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js',
  'tabs/ps-family-clash-audit/ps-family-evidence-audit-bootstrap.js',
]) {
  assert.match(readFileSync(file, 'utf8'), new RegExp(CACHE_TOKEN), `${file} must carry the startup hotfix cache token`);
}

console.log(`startup module syntax gate passed for ${syntaxFiles.length} JavaScript files`);

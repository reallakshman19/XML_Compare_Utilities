import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8');
const identity = read('pipeline-3d-model-identity.js');
const config = read('pipeline-3d-model-config.js');
const xml = read('pipeline-3d-model-xml-builder.js');
const ui = read('pipeline-3d-model-elastic-bend-ui.js');
const adapter = read('pipeline-3d-model-project-adapter.js');
const profile = read('pipeline-3d-model-profile-propagation.js');

for (const [name, source] of Object.entries({ identity, config, xml, ui, adapter, profile })) {
  assert.ok(source.split(/\r?\n/).length < 300, `${name} must remain below 300 lines`);
  assert.doesNotMatch(source, /export\s+default/);
}

assert.match(identity, /PipelineIdentityContext\.v1/);
assert.match(identity, /DEFAULT_PIPELINE_BRANCH_NAME = 'B1'/);
assert.match(config, /key: 'branchName'.*default: 'B1'/);
assert.match(xml, /'BranchName', 'LineNo', 'NodeNumber'/);
assert.match(xml, /attr\('LINE', branchInfo\.lineNo \|\| fromRow\.lineNo \|\| ''\)/);
assert.match(ui, /resolvePipelineIdentityContext/);
assert.doesNotMatch(ui, /branchInfo\.branchName = branchInfo\.lineNo/);
assert.match(adapter, /pipeline-identity-ledger\.tsv/);
assert.match(adapter, /lineNo: nativeOutput\.identity\.lineNo/);
assert.match(profile, /buildPipelineIdentityLedgerText/);

console.log('Pipeline local identity static guards passed.');

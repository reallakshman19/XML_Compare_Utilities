import assert from 'node:assert/strict';

import {
  buildIsoRecipeSampleWorkflow,
  renderIsoRecipeSamplePanel,
  TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA,
} from '../tabs/xml-compare-table-categorized-iso-sample-loader.js';

assert.equal(TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA, 'table-categorized-iso-sample-loader/v1-visible-sidecar');

const workflow = buildIsoRecipeSampleWorkflow();
assert.equal(workflow.schema, 'IsoRecipeSampleWorkflow.v1');
assert.equal(workflow.savedRecipe.recipeId, 'ISOrecipe');
assert.equal(workflow.savedRecipe.connectorKeyField, 'connectorKey');

assert.equal(workflow.sourceAArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceAArtifact.exportResult.diagnostics, null, 2));
assert.equal(workflow.sourceBArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceBArtifact.exportResult.diagnostics, null, 2));
assert.match(workflow.sourceAArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceBArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceAArtifact.xmlText, /<guideGapMm>25<\/guideGapMm>/);
assert.match(workflow.sourceBArtifact.xmlText, /<guideGapMm>15<\/guideGapMm>/);

assert.equal(workflow.sourceA.records[0].connectorKey, 'SL-14143');
assert.equal(workflow.sourceB.records[0].connectorKey, 'SL-14143');
assert.equal(workflow.connector.ok, true, JSON.stringify(workflow.connector.diagnostics, null, 2));
assert.equal(workflow.connector.preview.sourceUid, 'SourceA:SL-14143');
assert.equal(workflow.connector.preview.targetUid, 'SourceB:SL-14143');

const html = renderIsoRecipeSamplePanel(workflow);
assert.match(html, /ISOrecipe Dual-Source Sample/);
assert.match(html, /Source A \/ XML1/);
assert.match(html, /Source B \/ XML2/);
assert.match(html, /SL-14143/);
assert.match(html, /25 mm/);
assert.match(html, /15 mm/);
assert.match(html, /Download ISOrecipe JSON/);
assert.match(html, /Download XML1/);
assert.match(html, /Download XML2/);
assert.match(html, /Download Source A\/B Handoff JSON/);

console.log('table-categorized-iso-sample-loader.test.js passed');

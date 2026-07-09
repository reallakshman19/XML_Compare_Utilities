import assert from 'node:assert/strict';

import {
  buildIsoRecipeSampleWorkflow,
  createIsoRecipeTemplateState,
  renderIsoRecipeSamplePanel,
  TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA,
} from '../tabs/xml-compare-table-categorized-iso-sample-loader.js';

assert.equal(TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA, 'table-categorized-iso-sample-loader/v2-editable-template');

const template = createIsoRecipeTemplateState();
assert.match(template.table1Text, /ISONOTE/);
assert.match(template.table2Text, /ISONOTE/);
assert.match(template.savedRecipeJson, /"recipeId": "ISOrecipe"/);

const workflow = buildIsoRecipeSampleWorkflow(template);
assert.equal(workflow.schema, 'IsoRecipeSampleWorkflow.v2');
assert.equal(workflow.savedRecipe.recipeId, 'ISOrecipe');
assert.equal(workflow.savedRecipe.connectorKeyField, 'connectorKey');

assert.equal(workflow.sourceAArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceAArtifact.exportResult.diagnostics, null, 2));
assert.equal(workflow.sourceBArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceBArtifact.exportResult.diagnostics, null, 2));
assert.match(workflow.sourceAArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceBArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceAArtifact.xmlText, /<guideGapMm>25<\/guideGapMm>/);
assert.match(workflow.sourceBArtifact.xmlText, /<guideGapMm>15<\/guideGapMm>/);

const editedWorkflow = buildIsoRecipeSampleWorkflow({
  ...template,
  table1Text: template.table1Text.replace('25mm', '30mm'),
  table2Text: template.table2Text.replace('15mm', '30mm'),
});
assert.match(editedWorkflow.sourceAArtifact.xmlText, /<guideGapMm>30<\/guideGapMm>/, 'edited Table 1 must drive XML1 output');
assert.match(editedWorkflow.sourceBArtifact.xmlText, /<guideGapMm>30<\/guideGapMm>/, 'edited Table 2 must drive XML2 output');
assert.equal(editedWorkflow.sourceA.records[0].fields.guideGapMm, 30);
assert.equal(editedWorkflow.sourceB.records[0].fields.guideGapMm, 30);

assert.equal(workflow.sourceA.records[0].connectorKey, 'SL-14143');
assert.equal(workflow.sourceB.records[0].connectorKey, 'SL-14143');
assert.equal(workflow.connector.ok, true, JSON.stringify(workflow.connector.diagnostics, null, 2));
assert.equal(workflow.connector.preview.sourceUid, 'SourceA:SL-14143');
assert.equal(workflow.connector.preview.targetUid, 'SourceB:SL-14143');

const html = renderIsoRecipeSamplePanel(workflow);
assert.match(html, /ISOrecipe Editable Template Sample/);
assert.match(html, /Recipe = template/);
assert.match(html, /Table 1 → XML1 → Source A/);
assert.match(html, /Table 2 → XML2 → Source B/);
assert.match(html, /data-table-categorized-iso-sample-field="table1"/);
assert.match(html, /data-table-categorized-iso-sample-field="table2"/);
assert.match(html, /data-table-categorized-iso-sample-field="recipe"/);
assert.match(html, /Confirm \/ Rebuild XML1 \+ XML2/);
assert.match(html, /SL-14143/);
assert.match(html, /25 mm/);
assert.match(html, /15 mm/);
assert.match(html, /Download ISOrecipe JSON/);
assert.match(html, /Download XML1/);
assert.match(html, /Download XML2/);
assert.match(html, /Download Source A\/B Handoff JSON/);

console.log('table-categorized-iso-sample-loader.test.js passed');

import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildIsoRecipeSampleWorkflow,
  createIsoRecipeTemplateState,
  loadIsoTableIntoRuntime,
  renderIsoRecipeSamplePanel,
  TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA,
} from '../tabs/xml-compare-table-categorized-iso-sample-loader.js';

assert.equal(TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA, 'table-categorized-iso-sample-loader/v4-real-runtime-source-load');
assert.equal(typeof loadIsoTableIntoRuntime, 'function');

const moduleSource = fs.readFileSync(new URL('../tabs/xml-compare-table-categorized-iso-sample-loader.js', import.meta.url), 'utf8');
assert.match(moduleSource, /data-table-categorized-source-text/, 'loader must target the real app source textarea');
assert.match(moduleSource, /data-table-categorized-source-name/, 'loader must target the real app source name input');
assert.match(moduleSource, /data-table-categorized-active-source/, 'loader must target the real app active-source selector');
assert.match(moduleSource, /data-table-categorized-action=\"add-source\"/, 'Target B loader must use the runtime add-source action when a second source does not exist');
assert.match(moduleSource, /data-table-categorized-action=\"parse\"/, 'loader must trigger the runtime parse action after filling the table');

const template = createIsoRecipeTemplateState();
assert.match(template.table1Text, /JOBNAME\tLinenoinCII\tPIPEAXIS\tNODE_NUM\tNODE_NAME\tNPS\tTYPE\tSupportISONOTE\tRemarks/);
assert.match(template.table2Text, /JOBNAME\tLinenoinCII\tPIPEAXIS\tNODE_NUM\tNODE_NAME\tNPS\tTYPE\tSupportISONOTE\tRemarks/);
assert.match(template.table1Text, /SL-14307\.15/);
assert.match(template.table2Text, /SL-14307\.15/);
assert.match(template.savedRecipeJson, /"recipeId": "ISOrecipe"/);
assert.match(template.savedRecipeJson, /"SupportISONOTE"/);

const workflow = buildIsoRecipeSampleWorkflow(template);
assert.equal(workflow.schema, 'IsoRecipeSampleWorkflow.v4');
assert.equal(workflow.savedRecipe.recipeId, 'ISOrecipe');
assert.equal(workflow.savedRecipe.connectorKeyField, 'connectorKey');
assert.equal(workflow.sourceAArtifact.source.rows.length, 17);
assert.equal(workflow.sourceBArtifact.source.rows.length, 17);

assert.equal(workflow.sourceAArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceAArtifact.exportResult.diagnostics, null, 2));
assert.equal(workflow.sourceBArtifact.exportResult.ok, true, JSON.stringify(workflow.sourceBArtifact.exportResult.diagnostics, null, 2));
assert.match(workflow.sourceAArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceBArtifact.xmlText, /<connectorKey>SL-14143<\/connectorKey>/);
assert.match(workflow.sourceAArtifact.xmlText, /<guideGapMm>25<\/guideGapMm>/);
assert.match(workflow.sourceBArtifact.xmlText, /<guideGapMm>15<\/guideGapMm>/);
assert.match(workflow.sourceAArtifact.xmlText, /<jobName>SYS-002C<\/jobName>/);
assert.match(workflow.sourceAArtifact.xmlText, /<supportType>Rigid \+Y; Rigid LIM; Rigid GUI w\/gap<\/supportType>/);

const editedWorkflow = buildIsoRecipeSampleWorkflow({
  ...template,
  table1Text: template.table1Text.replace('GUIDE GAP=25mm', 'GUIDE GAP=30mm'),
  table2Text: template.table2Text.replace('GUIDE GAP=15mm', 'GUIDE GAP=30mm'),
});
assert.match(editedWorkflow.sourceAArtifact.xmlText, /<guideGapMm>30<\/guideGapMm>/, 'edited Rev 1 table must drive XML1 output');
assert.match(editedWorkflow.sourceBArtifact.xmlText, /<guideGapMm>30<\/guideGapMm>/, 'edited Rev 2 table must drive XML2 output');
assert.equal(editedWorkflow.sourceA.records.find((record) => record.connectorKey === 'SL-14143').fields.guideGapMm, 30);
assert.equal(editedWorkflow.sourceB.records.find((record) => record.connectorKey === 'SL-14143').fields.guideGapMm, 30);

assert.equal(workflow.sourceA.records.find((record) => record.connectorKey === 'SL-14143').connectorKey, 'SL-14143');
assert.equal(workflow.sourceB.records.find((record) => record.connectorKey === 'SL-14143').connectorKey, 'SL-14143');
assert.equal(workflow.connector.ok, true, JSON.stringify(workflow.connector.diagnostics, null, 2));
assert.equal(workflow.connector.preview.sourceUid, 'SourceA:SL-14143');
assert.equal(workflow.connector.preview.targetUid, 'SourceB:SL-14143');

const html = renderIsoRecipeSamplePanel(workflow);
assert.match(html, /ISOrecipe Editable Template Sample/);
assert.match(html, /Recipe = template/);
assert.match(html, /Load Table 1 as Source A/);
assert.match(html, /Load Table 2 as Target B/);
assert.match(html, /Rev 1 full table → XML1 → Source A/);
assert.match(html, /Rev 2 full table → XML2 → Target B/);
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

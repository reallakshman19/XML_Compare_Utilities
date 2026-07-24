import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = path.join(root, 'tabs/pipeline-3d-model');
const names = ['pipeline-3d-model-inputxml-profile-authority.js',
  'pipeline-3d-model-inputxml-document.js', 'pipeline-3d-model-xml-builder.js'];
const sources = Object.fromEntries(names.map((name) => [name,
  fs.readFileSync(path.join(production, name), 'utf8')]));
for (const [name, source] of Object.entries(sources)) {
  const lines = source.trimEnd().split(/\r?\n/);
  assert.ok(lines.length < 300, `${name} must remain below 300 lines`);
  assert.ok(lines.length > 100, `${name} must remain normally formatted`);
  assert.ok(Math.max(...lines.map((line) => line.length)) < 320, `${name} contains an unreviewable physical line`);
  assert.doesNotMatch(source, /export\s+default/);
  assert.doesNotMatch(source, /\bDate\b|Math\.random|performance\.now|localeCompare/);
  assert.doesNotMatch(source, /pipeline-3d-model-(profile-propagation|project-adapter|export-context|tab)\.js/);
}
const authority = sources[names[0]], document = sources[names[1]], writer = sources[names[2]];
assert.match(authority, /PipelineInputXmlProfileAuthorityPlan\.v1/);
assert.match(authority, /PipelineInputXmlProfileSectionAuthority\.v1/);
assert.match(authority, /PipelineInputXmlProfileElementAuthority\.v1/);
assert.match(authority, /PipelineInputXmlFittingAuthority\.v1/);
for (const code of ['AUTHORITY_INPUT_INVALID', 'AUTHORITY_SCHEMA_INVALID', 'AUTHORITY_OWNERSHIP_INVALID',
  'AUTHORITY_COVERAGE_INVALID', 'DIAMETER_CONFLICT', 'PROPERTY_CONFLICT',
  'FITTING_AUTHORITY_UNRESOLVED', 'FITTING_GEOMETRY_CONFLICT', 'GRE_BEND_GEOMETRY_REQUIRED', 'WRITER_BLOCKED']) {
  assert.match(authority, new RegExp(`PIPELINE_INPUTXML_${code}`));
}
assert.match(document, /profileAuthorityPlans/);
assert.match(document, /profileAuthorityPlans !== undefined/);
assert.match(document, /GRE_BEND_POLICY_NOT_IMPLEMENTED/);
assert.match(document, /caesarDiameterMm/);
assert.match(writer, /profileWriterDiagnostic/);
assert.match(writer, /PIPELINE_INPUTXML_WRITER_BLOCKED/);
assert.doesNotMatch(writer, /\b(PROFILE|PIPING_CODE|VENDOR|SERIES|QUALIFICATION|ANALYSIS_SECTION)\b.*attr\(/);
for (const runtimeName of ['pipeline-3d-model-profile-propagation.js', 'pipeline-3d-model-project-adapter.js',
  'pipeline-3d-model-export-context.js', 'pipeline-3d-model-tab.js']) {
  const runtimePath = path.join(production, runtimeName);
  if (fs.existsSync(runtimePath)) assert.equal(fs.readFileSync(runtimePath, 'utf8').includes('pipeline-3d-model-inputxml-profile-authority.js'), false);
}
console.log('pipeline-3d-model InputXML profile static: PASS');

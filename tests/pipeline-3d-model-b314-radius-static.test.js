import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractsPath = path.join(root, 'tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-contracts.js');
const resolutionPath = path.join(root, 'tabs/pipeline-3d-model/pipeline-3d-model-b314-radius-resolution.js');
const contracts = fs.readFileSync(contractsPath, 'utf8');
const resolution = fs.readFileSync(resolutionPath, 'utf8');
for (const [name, source] of [['contracts', contracts], ['resolution', resolution]]) {
  assert.ok(source.trimEnd().split('\n').length < 300, `${name} must remain below 300 lines`);
  assert.equal(/export\s+default/.test(source), false);
  assert.equal(/localStorage|sessionStorage|document\.|window\.|XMLSerializer|inputxml|xml-builder/i.test(source), false);
  assert.equal(/normal-fitting|gre-|branchInfo\.boreMm|nominalPipeSizeNps\s*\*/i.test(source), false);
  assert.equal(/Date\(|Math\.random|performance\.|localeCompare/.test(source), false);
}
assert.match(contracts, /PipelineB314RadiusPolicyRegistry\.v1/);
assert.match(contracts, /PipelineB314RadiusMigration\.v1/);
assert.match(contracts, /PipelineB314RadiusPlan\.v1/);
assert.match(contracts, /PipelineB314RadiusResolution\.v1/);
assert.match(contracts, /B31_4_ELASTIC_GOVERNING/);
assert.match(contracts, /B31_4_COLD_FIELD_SIZE_BAND_GOVERNING/);
assert.match(contracts, /B31_4_COLD_FIELD_PROJECT_RADIUS_D/);
assert.match(resolution, /PIPELINE_ANALYSIS_SECTION_SCHEMA/);
assert.match(resolution, /PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA/);
assert.match(resolution, /PIPELINE_DIAMETER_MIGRATION_SCHEMA/);
assert.match(resolution, /PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA/);
assert.match(resolution, /PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA/);
assert.match(resolution, /Candidate overrides may target only exact B31\.4 candidates/);
assert.match(resolution, /including provenance/);
assert.match(resolution, /observedD/);
assert.match(resolution, /observedMm/);
const allProduction = fs.readdirSync(path.join(root, 'tabs/pipeline-3d-model'))
  .filter((name) => name.endsWith('.js') && !name.includes('b314-radius'))
  .map((name) => fs.readFileSync(path.join(root, 'tabs/pipeline-3d-model', name), 'utf8')).join('\n');
assert.equal(allProduction.includes('pipeline-3d-model-b314-radius-contracts'), false);
assert.equal(allProduction.includes('pipeline-3d-model-b314-radius-resolution'), false);
console.log('pipeline-3d-model B31.4 radius static: PASS');

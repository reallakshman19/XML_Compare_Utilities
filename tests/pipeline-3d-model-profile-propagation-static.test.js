import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = [
  'pipeline-3d-model-profile-coordinate-map.js',
  'pipeline-3d-model-profile-events.js',
  'pipeline-3d-model-profile-output.js',
  'pipeline-3d-model-profile-propagation.js',
  'pipeline-3d-model-profile-propagation-runtime.js',
  'pipeline-3d-model-warning-log.js',
].map((name) => ({
  name,
  text: fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8'),
}));

for (const source of sources) {
  const lines = source.text.split(/\r?\n/).length;
  assert.ok(lines < 300, `${source.name} must stay below 300 lines, got ${lines}`);
  assert.doesNotMatch(source.text, /export\s+default/);
  assert.doesNotMatch(source.text, /core\/workbench-viewport/);
  assert.doesNotMatch(source.text, /inputxml_to_cii2019|converters\/scripts/);
  assert.doesNotMatch(source.text, /setInterval|setTimeout\s*\(/);
}

const propagation = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation.js').text;
assert.match(propagation, /PipelineProfileModel\.fromRaw/);
assert.match(propagation, /buildDepthRules/);
assert.match(propagation, /table3MarkerRules/);
assert.match(propagation, /warnings: Object\.freeze/);
assert.match(propagation, /elevationAuthority: 'TABLE_2'/);
assert.match(propagation, /materializeProfileEvents\(events, context, gradeRows\)/);
assert.match(propagation, /assertPlausibleProfileSegments\(combined, context\.total, context\.warnings\)/);
assert.match(propagation, /sanitizeTable1Label/);
assert.match(propagation, /T1-\$\{String\(index \+ 1\)\.padStart\(3, '0'\)\}/);
assert.match(propagation, /PLACEHOLDER_POINT_LABEL/);
assert.match(propagation, /resolvePipelineElasticBends/);
assert.match(propagation, /buildElasticBendLedgerText/);
assert.match(propagation, /buildInputXmlPipingModelXml\(branchInfo, elasticBends\.geometryRows, elasticBends\)/);
assert.match(propagation, /inputXmlCoordinateRows: elasticBends\.geometryRows/);
assert.match(propagation, /markerRowsExcludedFromInputXml/);

const coordinateMap = sources.find((source) => source.name === 'pipeline-3d-model-profile-coordinate-map.js').text;
assert.match(coordinateMap, /table3_h_clamped/);
assert.match(coordinateMap, /route_distance_clamped/);
assert.match(coordinateMap, /station_alignment_quality/);
assert.match(coordinateMap, /grade_profile_extrapolated/);
assert.match(coordinateMap, /warnGradeCoverage/);
assert.doesNotMatch(coordinateMap, /throw new RangeError\(`Table 3 H/);

const events = sources.find((source) => source.name === 'pipeline-3d-model-profile-events.js').text;
assert.match(events, /geometryRole: 'MARKER_ONLY'/);
assert.match(events, /table3-z-start-marker/);
assert.match(events, /table3-z-end-marker/);
assert.match(events, /const z = grade;/);
assert.match(events, /elevationAuthority: 'TABLE_2'/);
assert.doesNotMatch(events, /GRADE END|GRADE START/);
assert.doesNotMatch(events, /activeDepthRule/);
assert.doesNotMatch(events, /grade \+ \(rule\?\.zOffset/);

const output = sources.find((source) => source.name === 'pipeline-3d-model-profile-output.js').text;
assert.match(output, /originEvidence/);
assert.match(output, /hText: '0\.0'/);
assert.match(output, /\.\.\.originEvidence\(profile\)/);

const warningLog = sources.find((source) => source.name === 'pipeline-3d-model-warning-log.js').text;
assert.match(warningLog, /createElement\('details'\)/);
assert.match(warningLog, /data-p3d-warning-log/);
assert.match(warningLog, /Warning Log/);
assert.doesNotMatch(warningLog, /\.open\s*=\s*true|setAttribute\(['"]open/);

const runtime = sources.find((source) => source.name === 'pipeline-3d-model-profile-propagation-runtime.js').text;
assert.match(runtime, /new AbortController\(\)/);
assert.match(runtime, /event\.stopImmediatePropagation\(\)/);
assert.match(runtime, /createTable3XSVG\(output\.table3XText\)/);
assert.match(runtime, /raw\.dispatchEvent\(new Event\('input'/);
assert.match(runtime, /renderPipelineWarningLog/);
assert.match(runtime, /XML was downloaded with missing Line \/ Branch fields/);
assert.doesNotMatch(runtime, /Cannot download XML/);
assert.doesNotMatch(runtime, /MutationObserver/);

const adapter = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js', import.meta.url), 'utf8');
assert.match(adapter, /input\?\.profileRaw/);
assert.match(adapter, /buildAuthoritativePipelineOutputs/);
assert.match(adapter, /20260719-bend-hardening-1/);
assert.match(adapter, /Pipeline3DModelTables\.v1/);
assert.match(adapter, /pipeline-elastic-bends\.tsv/);
assert.match(adapter, /if \(!output\.xmlText\) return \[\]/);

const addon = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-addon.js', import.meta.url), 'utf8');
assert.match(addon, /installPipelineProfilePropagation\(dialog\)/);
assert.match(addon, /installPipelineElasticBendSettingsUi\(dialog\)/);
assert.match(addon, /Table 2 station\/elevation values are the sole generated-geometry Z authority/);
assert.match(addon, /Table 3 HLength, Z text and PMS values are marker evidence only/);
assert.match(addon, /20260719-bend-hardening-1/);

const utilityTab = fs.readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /pipeline-3d-model-table-paste-addon\.js\?v=20260719-bend-hardening-1/);

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.match(packageJson.scripts['test:pipeline-table-paste'], /test:pipeline-profile-propagation/);
assert.match(packageJson.scripts['test:pipeline-profile-propagation'], /pipeline-3d-model-elastic-bend\.test\.js/);
assert.match(packageJson.scripts['test:pipeline-profile-propagation'], /pipeline-3d-model-elastic-bend-static\.test\.js/);

console.log('Pipeline profile propagation static guards passed.');

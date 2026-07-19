import assert from 'node:assert/strict';
import fs from 'node:fs';

const names = [
  'pipeline-3d-model-bend-policy.js',
  'pipeline-3d-model-elastic-bend-settings.js',
  'pipeline-3d-model-elastic-bend.js',
  'pipeline-3d-model-elastic-bend-ui.js',
];
const sources = Object.fromEntries(names.map((name) => [
  name,
  fs.readFileSync(new URL(`../tabs/pipeline-3d-model/${name}`, import.meta.url), 'utf8'),
]));
for (const [name, text] of Object.entries(sources)) {
  assert.ok(text.split(/\r?\n/).length < 300, `${name} must stay below 300 lines`);
  assert.doesNotMatch(text, /export\s+default/);
}

const policy = sources['pipeline-3d-model-bend-policy.js'];
assert.match(policy, /ASME B31\.4/);
assert.match(policy, /edition: '2025'/);
assert.match(policy, /radiusReference: '404\.2\.2'/);
assert.match(policy, /tangentReference: '434\.7\.1\(d\)'/);
assert.match(policy, /if \(nps === 14\) return 21/);
assert.match(policy, /if \(nps === 16\) return 24/);
assert.match(policy, /if \(nps === 18\) return 27/);
assert.match(policy, /if \(nps >= 20\) return 30/);
assert.match(policy, /qualificationEvidenceRequired/);

const core = sources['pipeline-3d-model-elastic-bend.js'];
assert.match(core, /youngsModulusMpa \* outsideDiameterMm/);
assert.match(core, /2 \* settings\.allowableBendingStressMpa/);
assert.match(core, /practicalRadiusMultiplierD \* outsideDiameterMm/);
assert.match(core, /Math\.tan\(\(turnAngleDeg \/ DEG\) \/ 2\)/);
assert.match(core, /values\.includes\('vertex'\) \|\| values\.includes\('table2'\)/);
assert.doesNotMatch(core, /depthRule|zOffset/i);
assert.match(core, /INPUTXML_NODE_START \+ geometryIndex \* INPUTXML_NODE_STEP/);
assert.match(core, /retainedStraightAllowanceMm/);
assert.match(core, /BEND_GEOMETRY_INFEASIBLE/);
assert.match(core, /COLD_FIELD_BEND_QUALIFICATION_REQUIRED/);
assert.match(core, /PipelineElasticBendResolution\.v2/);
assert.match(core, /markerRowsExcludedBefore/);
assert.match(core, /role: 'NEAR_POINT'/);
assert.match(core, /role: 'MIDPOINT'/);

const settings = sources['pipeline-3d-model-elastic-bend-settings.js'];
assert.match(settings, /PipelineElasticBendSettings\.v2/);
assert.match(settings, /pipeline-3d-model-elastic-bend-settings-v2/);
assert.match(settings, /pipeline-3d-model-elastic-bend-settings-v1/);
assert.match(settings, /bendClass: 'elastic'/);
assert.match(settings, /coldFieldProjectRadiusMultiplierD: 40/);
assert.match(settings, /retainedStraightAllowanceMm: 0/);
assert.match(settings, /preferredStraightTangentMm: 2000/);
assert.match(settings, /emitNearPointNode: true/);
assert.match(settings, /emitMidpointNode: true/);
assert.doesNotMatch(settings, /maximumTangentUtilization/);

const ui = sources['pipeline-3d-model-elastic-bend-ui.js'];
assert.match(ui, /Pipeline Bend Settings/);
assert.match(ui, /ASME B31\.4-2025 404\.2\.2/);
assert.match(ui, /qualified 18D alternative/);
assert.match(ui, /Table 3 remains marker-only and is excluded from InputXML geometry/);
assert.match(ui, /Mandatory retained straight/);
assert.match(ui, /Preferred straight tangent/);
assert.match(ui, /pipeline-elastic-bends\.tsv/);
assert.match(ui, /installPipelineElasticBendSettingsUi/);

const xml = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-xml-builder.js', import.meta.url), 'utf8');
assert.match(xml, /function usableCurvatureNodes/);
assert.match(xml, /angle < turnAngleDeg - 1e-7/);
assert.match(xml, /attr\('NUM_MITER', '0'\)/);
assert.match(xml, /assertBendExportReady/);
assert.match(xml, /bendByIncomingElementIndex/);
assert.match(xml, /radius <= 0/);

const adapter = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-project-adapter.js', import.meta.url), 'utf8');
assert.match(adapter, /inputXmlCoordinateRows: elasticBends\.geometryRows/);
assert.match(adapter, /if \(elasticBends\.hasBlockingErrors\) return ''/);
assert.match(adapter, /PipelineElasticBendResolution\.v2/);
assert.match(adapter, /markerRowsExcludedFromInputXml/);
assert.match(adapter, /bendBlockingErrorCount/);

const profile = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-profile-propagation.js', import.meta.url), 'utf8');
assert.match(profile, /inputXmlCoordinateRows: elasticBends\.geometryRows/);
assert.match(profile, /\[BLOCKING\]/);
assert.match(profile, /markerRowsExcludedFromInputXml/);

const addon = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-table-paste-addon.js', import.meta.url), 'utf8');
assert.match(addon, /pipeline-3d-model-elastic-bend-ui\.js\?v=20260719-bend-hardening-1/);
assert.match(addon, /installPipelineElasticBendSettingsUi\(dialog\)/);

console.log('Pipeline authoritative bend static guards passed.');

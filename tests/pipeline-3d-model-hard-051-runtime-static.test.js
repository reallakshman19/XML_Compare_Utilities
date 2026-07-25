import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-core-runtime.js', import.meta.url), 'utf8');
const propagation = fs.readFileSync(new URL('../tabs/pipeline-3d-model/pipeline-3d-model-profile-propagation-runtime.js', import.meta.url), 'utf8');
assert.match(runtime, /buildGeometryRoute/);
assert.match(runtime, /resolvePipelineSectionAwareBends/);
assert.match(runtime, /resolveSectionAwareBends/);
assert.match(propagation, /canonicalAnalysisSectionPlan/);
assert.match(propagation, /sectionPropertyAssignmentPlan/);
assert.match(propagation, /sectionProfileRoutingPlan/);
assert.match(propagation, /inputXmlProfileAuthorityPlan/);
console.log('pipeline-3d-model P3D-HARD-051 runtime static: PASS');

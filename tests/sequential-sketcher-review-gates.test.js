import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const classifier = read('tabs/sequential-sketcher/construction/sequential-boundary-reference-classifier.js');
assert.match(classifier, /EXTERNAL_REFERENCE_CLASSIFIED/);
assert.match(classifier, /EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED/);
assert.match(classifier, /CONTROLLED_NOZZLE_SUFFIX/);
assert.match(classifier, /CONTROLLED_CONNECTION_SUFFIX/);
assert.match(classifier, /PHYSICAL_BOUNDARY_ROLE_NOT_PROVEN/);
assert.doesNotMatch(classifier, /substring|includes\([^)]*target|startsWith\([^)]*target/);

const engine = read('tabs/sequential-sketcher/construction/sequential-source-boundary-engine.js');
assert.match(engine, /EXTERNAL_BOUNDARY_ACTIVE_ENDPOINT_MISSING/);
assert.match(engine, /EXTERNAL_BOUNDARY_POSITION_MISSING/);
assert.match(engine, /EXTERNAL_BOUNDARY_POSITION_MISMATCH/);
assert.match(engine, /externalBoundaryExactToleranceMm/);
assert.match(engine, /SOURCE_PHYSICAL_BOUNDARY_EVIDENCE/);
assert.match(engine, /USER_MANUAL/);
assert.doesNotMatch(engine, /sj-pipe-support|buildPipeSupportProjectionBundle/);

const acceptance = read('tabs/sequential-sketcher/construction/sequential-construction-acceptance.js');
assert.match(acceptance, /EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED/);
assert.match(acceptance, /POSITION_CONFIRMED/);
assert.match(acceptance, /confidence/);
assert.match(acceptance, /basis/);
assert.match(acceptance, /positionGapMm/);

const adapter = read('tabs/sequential-sketcher/integration/sequential-carrier-evidence-adapter.js');
assert.match(adapter, /ConfirmedSequentialConstruction\.v1/);
assert.match(adapter, /ANALYTICAL_GEOMETRY_COMPLETE/);
assert.match(adapter, /ANALYTICAL_GEOMETRY_PARTIAL/);
assert.match(adapter, /DISPLAY_GEOMETRY_ONLY/);
assert.match(adapter, /MASS_PROPERTIES_COMPLETE/);
assert.match(adapter, /MASS_PROPERTIES_INCOMPLETE/);
assert.match(adapter, /supportProjectionConsumed:\s*false/);
assert.doesNotMatch(adapter, /sequential-construction-runtime|advanceConstruction|applyConstructionDecision/);

console.log('sequential sketcher review correction gates passed');

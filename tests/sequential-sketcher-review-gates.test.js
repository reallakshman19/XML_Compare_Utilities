import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const policy = read('tabs/sequential-sketcher/policy/sequential-external-boundary-policy.js');
assert.match(policy, /SequentialExternalBoundaryPolicy\.v1/);
assert.match(policy, /AVEVA_1885_NC_EXTERNAL_BOUNDARY/);
assert.match(policy, /CONTROLLED_DASH_NOZZLE_REFERENCE/);
assert.match(policy, /CONTROLLED_NAMED_CONNECTION_REFERENCE/);
assert.match(policy, /DIRECTIONAL_EQUIPMENT_PORT/);
assert.match(policy, /EQUIPMENT_REFERENCE_SHAPE/);
assert.match(policy, /EXTERNAL_REFERENCE_CLASSIFIED/);
assert.match(policy, /EXTERNAL_PHYSICAL_BOUNDARY_CONFIRMED/);
assert.match(policy, /CONTROLLED_NOZZLE_SUFFIX/);
assert.match(policy, /CONTROLLED_CONNECTION_SUFFIX/);
assert.match(policy, /PHYSICAL_BOUNDARY_ROLE_NOT_PROVEN/);
assert.match(policy, /policyFingerprint/);
assert.match(policy, /validateSequentialExternalBoundaryPolicy/);

const classifier = read('tabs/sequential-sketcher/construction/sequential-boundary-reference-classifier.js');
assert.match(classifier, /SEQUENTIAL_EXTERNAL_BOUNDARY_POLICY/);
assert.match(classifier, /matchSequentialExternalBoundaryPolicy/);
assert.match(classifier, /policySchema/);
assert.match(classifier, /policyId/);
assert.match(classifier, /policyRevision/);
assert.match(classifier, /policyFingerprint/);
assert.doesNotMatch(classifier, /new RegExp|EQUIPMENT_REFERENCE_SHAPE|CONTROLLED_NOZZLE_SUFFIX/,
  'classifier must consume the versioned policy rather than own suffix rules');
assert.doesNotMatch(classifier, /substring|includes\([^)]*target|startsWith\([^)]*target/);

const engine = read('tabs/sequential-sketcher/construction/sequential-source-boundary-engine.js');
assert.match(engine, /EXTERNAL_BOUNDARY_ACTIVE_ENDPOINT_MISSING/);
assert.match(engine, /EXTERNAL_BOUNDARY_POSITION_MISSING/);
assert.match(engine, /EXTERNAL_BOUNDARY_POSITION_MISMATCH/);
assert.match(engine, /externalBoundaryExactToleranceMm/);
assert.match(engine, /SOURCE_PHYSICAL_BOUNDARY_EVIDENCE/);
assert.match(engine, /USER_MANUAL/);
assert.match(engine, /patternId/);
assert.match(engine, /policyFingerprint/);
assert.doesNotMatch(engine, /sj-pipe-support|buildPipeSupportProjectionBundle/);

const fingerprint = read('tabs/sequential-sketcher/construction/sequential-session-fingerprint.js');
assert.match(fingerprint, /policySchema/);
assert.match(fingerprint, /policyId/);
assert.match(fingerprint, /policyRevision/);
assert.match(fingerprint, /policyDialect/);
assert.match(fingerprint, /policyFingerprint/);

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

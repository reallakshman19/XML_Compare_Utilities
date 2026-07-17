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

const tolerancePolicy = read('tabs/sequential-sketcher/policy/sequential-construction-tolerance-policy.js');
assert.match(tolerancePolicy, /SequentialConstructionTolerancePolicy\.v1/);
assert.match(tolerancePolicy, /branchEndpointMm/);
assert.match(tolerancePolicy, /referenceBoundaryMm/);
assert.match(tolerancePolicy, /fittingPortMm/);
assert.match(tolerancePolicy, /transformNoiseMm/);
assert.match(tolerancePolicy, /maximumMm:\s*25/);
assert.match(tolerancePolicy, /resolveSequentialConstructionTolerances/);
assert.match(tolerancePolicy, /policyFingerprint/);

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
assert.match(engine, /resolveSequentialConstructionTolerances/);
assert.match(engine, /REFERENCE_BOUNDARY_EQUIVALENCE/);
assert.match(engine, /tolerancePolicyFingerprint/);
assert.match(engine, /SOURCE_PHYSICAL_BOUNDARY_EVIDENCE/);
assert.match(engine, /USER_MANUAL/);
assert.match(engine, /patternId/);
assert.match(engine, /policyFingerprint/);
assert.doesNotMatch(engine, /sj-pipe-support|buildPipeSupportProjectionBundle/);

const boundaryResolver = read('tabs/sequential-sketcher/construction/sequential-boundary-resolver.js');
assert.match(boundaryResolver, /resolveSequentialConstructionTolerances/);
assert.match(boundaryResolver, /referenceBoundaryEquivalenceMm/);
assert.match(boundaryResolver, /REFERENCE_BOUNDARY_EQUIVALENCE/);
assert.match(boundaryResolver, /automaticRepairMm/);
assert.doesNotMatch(boundaryResolver, /autoRepairToleranceMm\s*=\s*25/,
  'repair limit must come from the versioned tolerance policy');

const fingerprint = read('tabs/sequential-sketcher/construction/sequential-session-fingerprint.js');
assert.match(fingerprint, /policySchema/);
assert.match(fingerprint, /policyId/);
assert.match(fingerprint, /policyRevision/);
assert.match(fingerprint, /policyDialect/);
assert.match(fingerprint, /policyFingerprint/);
assert.match(fingerprint, /toleranceEvidenceType/);
assert.match(fingerprint, /tolerancePolicyId/);
assert.match(fingerprint, /tolerancePolicyFingerprint/);

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

import {
  PIPELINE_GRE_CAESAR_BEND_QUALIFICATION_PLAN_SCHEMA,
  PIPELINE_GRE_CAESAR_BEND_QUALIFICATION_PROFILE_SCHEMA,
  clonePipelineGreCaesarQualificationValue as clone,
  createPipelineGreCaesarBendQualificationPlanRecord,
  createPipelineGreCaesarBendQualificationProfileRecord,
  createPipelineGreCaesarDiagnostic as diagnostic,
  safePipelineGreCaesarQualificationInput as safe,
} from './pipeline-3d-model-gre-caesar-qualification-contracts.js';
import {
  buildPipelineGreCaesarFixtureInventoryJson,
  createRepositoryGreInputXmlFixtureEvidence,
} from './pipeline-3d-model-gre-caesar-fixture-evidence.js';
import {
  buildPipelineGreCaesarBendFieldMatrixTsv,
  createPipelineGreCaesarBendFieldMapping,
} from './pipeline-3d-model-gre-caesar-bend-field-mapping.js';
import {
  buildPipelineGreCaesarTopologyMatrixTsv,
  createPipelineGreCaesarBendTopologyMapping,
} from './pipeline-3d-model-gre-caesar-bend-topology-mapping.js';

export { PIPELINE_GRE_CAESAR_BEND_QUALIFICATION_PLAN_SCHEMA,
  PIPELINE_GRE_CAESAR_BEND_QUALIFICATION_PROFILE_SCHEMA };

const text = (value) => typeof value === 'string' ? value.trim() : '';
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function indexed(values, key, errors) {
  const map = Object.create(null);
  values.forEach((item) => {
    const id = text(item?.[key]);
    if (!id || map[id]) errors.push(diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT', { key, id }));
    else map[id] = item;
  });
  return map;
}

export function createPipelineGreCaesarBendQualificationProfile(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics];
  const field = source.fieldMapping, topology = source.topologyMapping;
  if (!text(source.profileId) || !field || !topology) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_QUALIFICATION_INCOMPLETE', { profileId: text(source.profileId) }));
  if (field?.ready !== true) errors.push(...(field?.diagnostics || [diagnostic(
    'PIPELINE_GRE_CAESAR_BEND_TYPE_UNRESOLVED', { profileId: text(source.profileId) })]));
  if (topology?.ready !== true) errors.push(...(topology?.diagnostics || [diagnostic(
    'PIPELINE_GRE_CAESAR_TOPOLOGY_UNRESOLVED', { profileId: text(source.profileId) })]));
  const identity = ['caesarVersion', 'pipingCodeId', 'pipingCodeEdition', 'laminateClassification'];
  if (field && identity.some((key) => text(source[key]) !== text(field[key]))) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT', { profileId: text(source.profileId), field: 'IDENTITY' }));
  const compatibility = topology?.currentP3dGre055Compatibility || 'UNRESOLVED';
  const writerEligible = ['DIRECTLY_WRITER_COMPATIBLE', 'COMPATIBLE_AFTER_IDENTITY_REMAP']
    .includes(compatibility) && field?.ready === true && topology?.ready === true;
  if (!writerEligible) errors.push(diagnostic('PIPELINE_GRE_CAESAR_QUALIFICATION_INCOMPLETE', {
    profileId: text(source.profileId), compatibility }));
  return createPipelineGreCaesarBendQualificationProfileRecord({ profileId: text(source.profileId),
    caesarVersion: text(source.caesarVersion), pipingCodeId: text(source.pipingCodeId),
    pipingCodeName: text(source.pipingCodeName), pipingCodeEdition: text(source.pipingCodeEdition),
    laminateClassification: text(source.laminateClassification),
    fieldMappingId: text(field?.mappingId), topologyMappingId: text(topology?.topologyMappingId),
    fixtureIds: clone(source.fixtureIds || []), currentP3dGre055Compatibility: compatibility,
    writerEligible, sourceAuthority: text(source.sourceAuthority),
    sourceReferences: clone(source.sourceReferences || []),
  }, errors);
}

export function buildPipelineGreCaesarBendQualificationPlan(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics];
  const fixtures = [...(source.fixtures || [])].sort((a, b) => compare(a.fixtureId, b.fixtureId));
  const fields = [...(source.fieldMappings || [])].sort((a, b) => compare(a.mappingId, b.mappingId));
  const topologies = [...(source.topologyMappings || [])]
    .sort((a, b) => compare(a.topologyMappingId, b.topologyMappingId));
  const fixtureById = indexed(fixtures, 'fixtureId', errors);
  const fieldById = indexed(fields, 'mappingId', errors);
  const topologyById = indexed(topologies, 'topologyMappingId', errors);
  const profileInputs = [...(source.qualificationProfiles || [])]
    .sort((a, b) => compare(a.profileId, b.profileId));
  const profiles = profileInputs.map((profile) => {
    const fixtureIds = [...new Set((profile.fixtureIds || []).map(text).filter(Boolean))];
    if (!fixtureIds.length || fixtureIds.some((id) => !fixtureById[id])) errors.push(diagnostic(
      'PIPELINE_GRE_CAESAR_FIXTURE_REQUIRED', { profileId: text(profile.profileId) }));
    return createPipelineGreCaesarBendQualificationProfile({ ...profile, fixtureIds,
      fieldMapping: fieldById[profile.fieldMappingId], topologyMapping: topologyById[profile.topologyMappingId] });
  });
  errors.push(...fixtures.flatMap((item) => item.diagnostics || []),
    ...fields.flatMap((item) => item.diagnostics || []), ...topologies.flatMap((item) => item.diagnostics || []),
    ...profiles.flatMap((item) => item.diagnostics || []));
  const qualified = profiles.filter((item) => item.ready === true && item.writerEligible === true);
  const reconciliation = profiles.some((item) => item.currentP3dGre055Compatibility
    === 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION'
    && fieldById[item.fieldMappingId]?.ready === true && topologyById[item.topologyMappingId]?.ready === true);
  const outcome = qualified.length ? 'QUALIFIED'
    : reconciliation ? 'TOPOLOGY_RECONCILIATION_REQUIRED' : 'STILL_BLOCKED';
  if (!qualified.length) errors.push(diagnostic('PIPELINE_GRE_CAESAR_QUALIFICATION_INCOMPLETE', { outcome }));
  const compatibility = qualified[0]?.currentP3dGre055Compatibility
    || (reconciliation ? 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION' : 'UNRESOLVED');
  return createPipelineGreCaesarBendQualificationPlanRecord({
    governingBaseline: text(source.governingBaseline), fixtures, fieldMappings: fields,
    topologyMappings: topologies, qualificationProfiles: profiles,
    currentP3dGre055Compatibility: compatibility,
    derivedTopologyAssessment: outcome === 'STILL_BLOCKED'
      ? 'INFERENCE_ONLY: CAESAR documentation and repository export indicate a shared far-point node; no import fixture qualifies reprojection.' : '',
    qualificationOutcome: outcome,
  }, errors);
}

export function createRepositoryGreCaesarQualificationPlan() {
  const fixture = createRepositoryGreInputXmlFixtureEvidence();
  const field = createPipelineGreCaesarBendFieldMapping({ mappingId: 'candidate:repo-gre-v14-code36',
    caesarVersion: '14.00', pipingCodeId: '36', pipingCodeName: '', pipingCodeEdition: '',
    laminateClassification: '', bendTypeDisposition: 'EMIT_NUMERIC', bendTypeValue: 3,
    bendTypeMeaning: 'UNQUALIFIED_REPOSITORY_OBSERVATION',
    numMiterDisposition: 'PRESERVE_QUALIFIED_SENTINEL', numMiterValue: -1.0101,
    numMiterMeaning: 'UNQUALIFIED_REPOSITORY_OBSERVATION',
    curvatureNodeDisposition: 'EXACT_CURVATURE_NODES_REQUIRED',
    curvatureNodes: [{ angle: -2.0202, node: 1499 }, { angle: 0, node: 1498 }],
    overallTurnAngleDisposition: 'OVERALL_ANGLE_EVIDENCE_ONLY',
    fittingThicknessDisposition: 'EMIT_AUTHENTICATED_VALUE', radiusDisposition: 'EMIT_AUTHENTICATED_VALUE',
    sourceAuthority: 'REPOSITORY_EXPORT_OBSERVATION',
    sourceReferences: ['docs/GREInputxml.xml:representative bend record'],
    fixtureIds: [fixture.fixtureId], fixtures: [fixture] });
  const topology = createPipelineGreCaesarBendTopologyMapping({
    topologyMappingId: 'candidate:repo-gre-shared-node',
    caesarTopologyMode: 'CONSECUTIVE_SHARED_LOGICAL_NODE',
    enteringElementFromRole: 'UPSTREAM_ROUTE_NODE', enteringElementToRole: 'CAESAR_FAR_POINT',
    leavingElementFromRole: 'CAESAR_FAR_POINT', leavingElementToRole: 'DOWNSTREAM_ROUTE_NODE',
    nearPointRole: 'CAESAR_DERIVED_NEAR_POINT', farPointRole: 'SHARED_LOGICAL_NODE',
    sharedLogicalNodeRole: 'ENTERING_TO_AND_LEAVING_FROM', inactiveCornerDisposition: 'NOT_SERIALIZED',
    incomingTangencyDisposition: 'UNRESOLVED', outgoingTangencyDisposition: 'UNRESOLVED',
    continuityRequirement: 'ENTERING_TO_EQUALS_LEAVING_FROM',
    sourceAuthority: 'REPOSITORY_EXPORT_OBSERVATION',
    sourceReferences: ['docs/GREInputxml.xml:1450-1500 followed by 1500-1550'],
    fixtureIds: [fixture.fixtureId], fixtures: [fixture] });
  return buildPipelineGreCaesarBendQualificationPlan({
    governingBaseline: '7256f81b3cd029282fe4cce697aa54da6c4693bf', fixtures: [fixture],
    fieldMappings: [field], topologyMappings: [topology], qualificationProfiles: [{
      profileId: 'candidate:repo-gre-v14-code36', caesarVersion: '14.00', pipingCodeId: '36',
      pipingCodeName: '', pipingCodeEdition: '', laminateClassification: '',
      fieldMappingId: field.mappingId, topologyMappingId: topology.topologyMappingId,
      fixtureIds: [fixture.fixtureId], sourceAuthority: 'REPOSITORY_EXPORT_OBSERVATION',
      sourceReferences: ['docs/GREInputxml.xml'] }],
  });
}

export function buildPipelineGreCaesarFixtureRequestMarkdown() {
  return `# CAESAR GRE bend qualification fixture request\n\n`
    + `Create each fixture in the same documented CAESAR II build and unit file. Preserve the native job, exported InputXML, re-imported job, re-exported InputXML, screenshots, and operator log.\n\n`
    + `| ID | Required case |\n|---|---|\n`
    + `| F1 | ISO 14692-2005, 90-degree bend, no user curvature nodes |\n`
    + `| F2 | ISO 14692-2017, 90-degree bend, no user curvature nodes |\n`
    + `| F3 | Project GRE code and edition, non-90-degree bend |\n`
    + `| F4 | Project GRE code and edition, explicit midpoint curvature node |\n`
    + `| F5 | Project GRE code and edition, fitting thickness different from pipe |\n`
    + `| F6 | P3D tangency-separated topology import attempt |\n`
    + `| F7 | CAESAR-native consecutive entering/leaving-element control |\n\n`
    + `For every fixture record CAESAR version/build, XML version, unit file, numeric piping-code ID, authoritative code name and edition, laminate classification, element and bend counts, exact BEND attributes, logical node continuity, and SHA-256 hashes. Import the exported XML into a clean job, record acceptance or every diagnostic, then re-export and compare semantic bend ownership, TYPE, NUM_MITER, curvature nodes, radius, fitting thickness, element count, bend count, and node continuity. Do not normalize sentinel values or edit XML between steps.\n`;
}

export { buildPipelineGreCaesarFixtureInventoryJson,
  buildPipelineGreCaesarBendFieldMatrixTsv, buildPipelineGreCaesarTopologyMatrixTsv };

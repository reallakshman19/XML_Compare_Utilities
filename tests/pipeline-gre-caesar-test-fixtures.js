import { createPipelineGreCaesarFixtureEvidence } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-fixture-evidence.js';
import { createPipelineGreCaesarBendFieldMapping } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-bend-field-mapping.js';
import { createPipelineGreCaesarBendTopologyMapping } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-bend-topology-mapping.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

export function qualifiedFixture(overrides = {}) {
  const mode = overrides.mode || 'TANGENCY_SEPARATED_BRIDGE';
  const shared = mode !== 'TANGENCY_SEPARATED_BRIDGE';
  const curvatureNodes = overrides.curvatureNodes || [];
  return createPipelineGreCaesarFixtureEvidence({
    fixtureId: overrides.fixtureId || 'fixture:F1', fixturePath: overrides.fixturePath || 'fixtures/F1.xml',
    fixtureSha256: overrides.fixtureSha256 || HASH_A, sourceClassification: 'CAESAR_OPERATOR_ROUND_TRIP',
    caesarVersion: overrides.caesarVersion || '14.00', xmlVersion: '14.00',
    pipingCodeId: overrides.pipingCodeId || '36', pipingCodeName: overrides.pipingCodeName || 'ISO 14692',
    pipingCodeEdition: overrides.pipingCodeEdition || '2005',
    laminateClassification: overrides.laminateClassification || 'CSM_AND_MULTI_FILAMENT',
    elementCount: 2, bendCount: 1, bendRecords: [{ bendRecordId: 'bend:F1',
      ownerFromNode: 100, ownerToNode: 110, radius: 300,
      typeAttributePresent: overrides.typeAttributePresent ?? true,
      typeValue: overrides.typeValue ?? 3,
      numMiterAttributePresent: overrides.numMiterAttributePresent ?? false,
      numMiterValue: overrides.numMiterValue ?? null,
      fittingThicknessAttributePresent: true, fittingThicknessValue: 12,
      curvatureNodes }],
    continuityRecords: [{ continuityRecordId: 'continuity:F1', enteringFromNode: 100,
      enteringToNode: 110, leavingFromNode: shared ? 110 : 120, leavingToNode: 130,
      sharedLogicalNode: shared, observedTopologyMode: mode }],
    importEvidence: { status: 'PROVEN', evidenceId: 'import:F1', caesarVersion: '14.00',
      result: 'ACCEPTED', sourceReference: 'operator-log:F1' },
    roundTripEvidence: { status: 'PROVEN', evidenceId: 'roundtrip:F1', caesarVersion: '14.00',
      semanticEquivalent: true, reexportSha256: overrides.reexportSha256 || HASH_B,
      sourceReference: 'operator-log:F1' },
    authorityLevel: 'CAESAR_IMPORT_AND_ROUND_TRIP', sourceReferences: ['operator-log:F1'],
    ...overrides.fixtureOverrides,
  });
}

export function qualifiedFieldMapping(fixture, overrides = {}) {
  return createPipelineGreCaesarBendFieldMapping({ mappingId: overrides.mappingId || 'mapping:F1',
    caesarVersion: fixture.caesarVersion, pipingCodeId: fixture.pipingCodeId,
    pipingCodeName: fixture.pipingCodeName, pipingCodeEdition: fixture.pipingCodeEdition,
    laminateClassification: fixture.laminateClassification,
    bendTypeDisposition: overrides.bendTypeDisposition || 'EMIT_NUMERIC',
    bendTypeValue: overrides.bendTypeValue ?? 3, bendTypeMeaning: 'ISO_14692_2005_LAMINATE',
    numMiterDisposition: overrides.numMiterDisposition || 'OMIT_ATTRIBUTE',
    numMiterValue: overrides.numMiterValue ?? null, numMiterMeaning: 'NO_MITER_CUTS_ATTRIBUTE_OMITTED',
    curvatureNodeDisposition: overrides.curvatureNodeDisposition || 'NO_CURVATURE_NODES_REQUIRED',
    curvatureNodes: overrides.curvatureNodes || [],
    overallTurnAngleDisposition: 'OVERALL_ANGLE_EVIDENCE_ONLY',
    fittingThicknessDisposition: 'EMIT_AUTHENTICATED_VALUE', radiusDisposition: 'EMIT_AUTHENTICATED_VALUE',
    sourceAuthority: 'CAESAR_IMPORT_AND_ROUND_TRIP', sourceReferences: ['operator-log:F1'],
    fixtureIds: [fixture.fixtureId], fixtures: [fixture] });
}

export function qualifiedTopologyMapping(fixture, overrides = {}) {
  const mode = overrides.mode || fixture.continuityRecords[0].observedTopologyMode;
  return createPipelineGreCaesarBendTopologyMapping({
    topologyMappingId: overrides.topologyMappingId || 'topology:F1', caesarTopologyMode: mode,
    enteringElementFromRole: 'UPSTREAM_ROUTE_NODE', enteringElementToRole: 'CAESAR_LOGICAL_BEND_NODE',
    leavingElementFromRole: mode === 'TANGENCY_SEPARATED_BRIDGE'
      ? 'OUTGOING_TANGENCY' : 'CAESAR_LOGICAL_BEND_NODE', leavingElementToRole: 'DOWNSTREAM_ROUTE_NODE',
    nearPointRole: 'CAESAR_DERIVED_NEAR_POINT', farPointRole: 'CAESAR_LOGICAL_BEND_NODE',
    sharedLogicalNodeRole: mode === 'TANGENCY_SEPARATED_BRIDGE' ? 'NONE' : 'ENTERING_TO_AND_LEAVING_FROM',
    inactiveCornerDisposition: 'NOT_SERIALIZED', incomingTangencyDisposition: mode === 'TANGENCY_SEPARATED_BRIDGE'
      ? 'ENTERING_ELEMENT_TO' : 'CAESAR_DERIVED_NEAR_POINT',
    outgoingTangencyDisposition: mode === 'TANGENCY_SEPARATED_BRIDGE'
      ? 'LEAVING_ELEMENT_FROM' : 'CAESAR_FAR_POINT',
    continuityRequirement: mode === 'TANGENCY_SEPARATED_BRIDGE'
      ? 'BEND_BRIDGES_DISTINCT_TANGENCIES' : 'ENTERING_TO_EQUALS_LEAVING_FROM',
    sourceAuthority: 'CAESAR_IMPORT_AND_ROUND_TRIP', sourceReferences: ['operator-log:F1'],
    fixtureIds: [fixture.fixtureId], fixtures: [fixture] });
}

import {
  PIPELINE_GRE_CAESAR_BEND_TOPOLOGY_MAPPING_SCHEMA,
  PIPELINE_GRE_CAESAR_COMPATIBILITY,
  PIPELINE_GRE_CAESAR_TOPOLOGY_MODES,
  clonePipelineGreCaesarQualificationValue as clone,
  createPipelineGreCaesarBendTopologyMappingRecord,
  createPipelineGreCaesarDiagnostic as diagnostic,
  safePipelineGreCaesarQualificationInput as safe,
} from './pipeline-3d-model-gre-caesar-qualification-contracts.js';

export { PIPELINE_GRE_CAESAR_BEND_TOPOLOGY_MAPPING_SCHEMA };

const text = (value) => typeof value === 'string' ? value.trim() : '';
const requiredRoles = Object.freeze(['enteringElementFromRole', 'enteringElementToRole',
  'leavingElementFromRole', 'leavingElementToRole', 'nearPointRole', 'farPointRole',
  'sharedLogicalNodeRole', 'inactiveCornerDisposition', 'incomingTangencyDisposition',
  'outgoingTangencyDisposition', 'continuityRequirement']);

function selectedFixtures(source, errors) {
  const fixtures = Array.isArray(source.fixtures) ? source.fixtures : [];
  const ids = Array.isArray(source.fixtureIds) ? source.fixtureIds.map(text).filter(Boolean) : [];
  const unique = [...new Set(ids)], byId = Object.fromEntries(fixtures.map((item) => [item.fixtureId, item]));
  const selected = unique.map((id) => byId[id]).filter(Boolean);
  if (!unique.length || unique.length !== ids.length) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_FIXTURE_REQUIRED', { topologyMappingId: text(source.topologyMappingId) }));
  if (selected.length !== unique.length || selected.some((item) => item.ready !== true)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED', {
      topologyMappingId: text(source.topologyMappingId) }));
  return selected;
}

function observedModeMatches(mode, fixtures) {
  const records = fixtures.flatMap((fixture) => fixture.continuityRecords || []);
  if (!records.length) return false;
  return records.every((record) => record.observedTopologyMode === mode
    && (mode === 'TANGENCY_SEPARATED_BRIDGE' ? record.sharedLogicalNode === false
      : record.sharedLogicalNode === true));
}

function compatibilityFor(source, authenticated) {
  if (!authenticated) return 'UNRESOLVED';
  if (source.caesarTopologyMode === 'TANGENCY_SEPARATED_BRIDGE') return 'DIRECTLY_WRITER_COMPATIBLE';
  if (source.caesarTopologyMode === 'CAESAR_SPECIFIC_REPROJECTED_TOPOLOGY') {
    return 'COMPATIBLE_AFTER_IDENTITY_REMAP';
  }
  if (['CONSECUTIVE_SHARED_LOGICAL_NODE', 'CAESAR_FAR_POINT_SHARED_NODE']
    .includes(source.caesarTopologyMode)) return 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION';
  return 'INCOMPATIBLE';
}

export function createPipelineGreCaesarBendTopologyMapping(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics];
  const fixtures = selectedFixtures(source, errors), mode = text(source.caesarTopologyMode);
  if (!text(source.topologyMappingId) || !PIPELINE_GRE_CAESAR_TOPOLOGY_MODES.includes(mode)
    || requiredRoles.some((field) => !text(source[field])) || !text(source.sourceAuthority)
    || !Array.isArray(source.sourceReferences) || source.sourceReferences.some((item) => !text(item))) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_TOPOLOGY_UNRESOLVED', {
      topologyMappingId: text(source.topologyMappingId), reason: 'CONTRACT_FIELDS' }));
  const observed = observedModeMatches(mode, fixtures);
  if (!observed) errors.push(diagnostic('PIPELINE_GRE_CAESAR_TOPOLOGY_UNRESOLVED', {
    topologyMappingId: text(source.topologyMappingId), reason: 'FIXTURE_MODE_CONFLICT' }));
  const authenticated = errors.length === 0;
  const compatibility = compatibilityFor(source, authenticated);
  if (!PIPELINE_GRE_CAESAR_COMPATIBILITY.includes(compatibility)) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_TOPOLOGY_UNRESOLVED', { topologyMappingId: text(source.topologyMappingId) }));
  return createPipelineGreCaesarBendTopologyMappingRecord({
    topologyMappingId: text(source.topologyMappingId), caesarTopologyMode: mode,
    enteringElementFromRole: text(source.enteringElementFromRole),
    enteringElementToRole: text(source.enteringElementToRole),
    leavingElementFromRole: text(source.leavingElementFromRole),
    leavingElementToRole: text(source.leavingElementToRole), nearPointRole: text(source.nearPointRole),
    farPointRole: text(source.farPointRole), sharedLogicalNodeRole: text(source.sharedLogicalNodeRole),
    inactiveCornerDisposition: text(source.inactiveCornerDisposition),
    incomingTangencyDisposition: text(source.incomingTangencyDisposition),
    outgoingTangencyDisposition: text(source.outgoingTangencyDisposition),
    continuityRequirement: text(source.continuityRequirement),
    currentP3dGre055Compatibility: compatibility,
    currentP3dGre055Questions: clone({ incomingTangencyCanRemainEnteringTo:
      compatibility === 'DIRECTLY_WRITER_COMPATIBLE', outgoingTangencyCanRemainLeavingFrom:
      compatibility === 'DIRECTLY_WRITER_COMPATIBLE', distinctTangencyNodeNumbersAllowed:
      compatibility === 'DIRECTLY_WRITER_COMPATIBLE', sharedLogicalNodeRequired:
      ['CONSECUTIVE_SHARED_LOGICAL_NODE', 'CAESAR_FAR_POINT_SHARED_NODE'].includes(mode),
      syntheticCaesarBendNodeRequired: compatibility === 'REQUIRES_CAESAR_TOPOLOGY_REPROJECTION',
      originalConstructionCornerMayRemainInactive: source.inactiveCornerDisposition === 'NOT_SERIALIZED',
      caesarDerivesNearFarPoints: ['CONSECUTIVE_SHARED_LOGICAL_NODE',
        'CAESAR_FAR_POINT_SHARED_NODE'].includes(mode) }),
    sourceAuthority: text(source.sourceAuthority), sourceReferences: clone(source.sourceReferences || []),
    fixtureIds: clone(source.fixtureIds || []),
  }, errors);
}

export function buildPipelineGreCaesarTopologyMatrixTsv(mappings) {
  const header = ['TopologyMappingId', 'Mode', 'EnteringToRole', 'LeavingFromRole',
    'SharedLogicalNodeRole', 'InactiveCornerDisposition', 'P3DGre055Compatibility', 'Ready', 'Blockers'];
  const rows = [...mappings].sort((a, b) => a.topologyMappingId < b.topologyMappingId ? -1
    : a.topologyMappingId > b.topologyMappingId ? 1 : 0).map((item) => [item.topologyMappingId,
    item.caesarTopologyMode, item.enteringElementToRole, item.leavingElementFromRole,
    item.sharedLogicalNodeRole, item.inactiveCornerDisposition,
    item.currentP3dGre055Compatibility, item.ready, (item.blockerCodes || []).join('|')]);
  return [header, ...rows].map((row) => row.map((value) => value ?? '').join('\t')).join('\n');
}

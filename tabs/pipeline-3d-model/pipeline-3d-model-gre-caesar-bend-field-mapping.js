import {
  PIPELINE_GRE_CAESAR_BEND_FIELD_MAPPING_SCHEMA,
  PIPELINE_GRE_CAESAR_FIELD_DISPOSITIONS,
  clonePipelineGreCaesarQualificationValue as clone,
  createPipelineGreCaesarBendFieldMappingRecord,
  createPipelineGreCaesarDiagnostic as diagnostic,
  safePipelineGreCaesarQualificationInput as safe,
} from './pipeline-3d-model-gre-caesar-qualification-contracts.js';

export { PIPELINE_GRE_CAESAR_BEND_FIELD_MAPPING_SCHEMA };

const text = (value) => typeof value === 'string' ? value.trim() : '';
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function fixtureSelection(source, errors) {
  const fixtures = Array.isArray(source.fixtures) ? source.fixtures : [];
  const wanted = Array.isArray(source.fixtureIds) ? source.fixtureIds.map(text).filter(Boolean) : [];
  const unique = [...new Set(wanted)];
  if (!unique.length || unique.length !== wanted.length) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_FIXTURE_REQUIRED', { mappingId: text(source.mappingId) }));
  const byId = Object.fromEntries(fixtures.map((item) => [item.fixtureId, item]));
  const selected = unique.map((id) => byId[id]).filter(Boolean);
  if (selected.length !== unique.length || selected.some((item) => item.ready !== true)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED', { mappingId: text(source.mappingId) }));
  return selected;
}

function identityValid(source, fixtures, errors) {
  const fields = ['caesarVersion', 'pipingCodeId', 'pipingCodeName', 'pipingCodeEdition',
    'laminateClassification'];
  fields.forEach((field) => {
    if (!text(source[field]) || fixtures.some((fixture) => fixture[field] !== text(source[field]))) errors.push(
      diagnostic(field === 'caesarVersion' ? 'PIPELINE_GRE_CAESAR_VERSION_UNRESOLVED'
        : field === 'pipingCodeId' ? 'PIPELINE_GRE_CAESAR_CODE_ID_UNRESOLVED'
          : field === 'pipingCodeEdition' ? 'PIPELINE_GRE_CAESAR_CODE_EDITION_UNRESOLVED'
            : field === 'laminateClassification' ? 'PIPELINE_GRE_CAESAR_LAMINATE_UNRESOLVED'
              : 'PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT', { mappingId: text(source.mappingId), field }));
  });
}

function allBends(fixtures) {
  return fixtures.flatMap((fixture) => fixture.bendRecords || []);
}

function numericDisposition(source, bends, prefix, blocker, errors) {
  const disposition = source[`${prefix}Disposition`], value = source[`${prefix}Value`];
  const presentField = prefix === 'bendType' ? 'typeAttributePresent' : 'numMiterAttributePresent';
  const valueField = prefix === 'bendType' ? 'typeValue' : 'numMiterValue';
  let valid = false;
  if (disposition === 'EMIT_NUMERIC') valid = finite(value)
    && bends.every((bend) => bend[presentField] === true && bend[valueField] === value);
  if (disposition === 'OMIT_ATTRIBUTE') valid = value == null
    && bends.every((bend) => bend[presentField] === false);
  if (disposition === 'PRESERVE_QUALIFIED_SENTINEL') valid = finite(value)
    && value < 0 && bends.every((bend) => bend[presentField] === true && bend[valueField] === value);
  if (!valid) errors.push(diagnostic(blocker, { mappingId: text(source.mappingId), disposition }));
}

function curvatureValid(source, bends, errors) {
  const disposition = source.curvatureNodeDisposition;
  const nodes = Array.isArray(source.curvatureNodes) ? source.curvatureNodes : [];
  let valid = false;
  if (disposition === 'NO_CURVATURE_NODES_REQUIRED') valid = nodes.length === 0
    && bends.every((bend) => (bend.curvatureNodes || []).length === 0);
  if (disposition === 'EXACT_CURVATURE_NODES_REQUIRED') valid = nodes.length > 0
    && bends.every((bend) => same(bend.curvatureNodes || [], nodes));
  if (disposition === 'OPTIONAL_QUALIFIED_CURVATURE_NODES') valid = bends.every((bend) =>
    same(bend.curvatureNodes || [], nodes) || (bend.curvatureNodes || []).length === 0);
  if (!valid || source.overallTurnAngleDisposition !== 'OVERALL_ANGLE_EVIDENCE_ONLY') errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_CURVATURE_NODE_POLICY_UNRESOLVED', {
      mappingId: text(source.mappingId), disposition }));
}

export function createPipelineGreCaesarBendFieldMapping(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics];
  const fixtures = fixtureSelection(source, errors), bends = allBends(fixtures);
  if (!fixtures.length || fixtures.some((item) => item.ready !== true)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_BEND_TYPE_UNRESOLVED', { mappingId: text(source.mappingId) }),
    diagnostic('PIPELINE_GRE_CAESAR_NUM_MITER_UNRESOLVED', { mappingId: text(source.mappingId) }),
    diagnostic('PIPELINE_GRE_CAESAR_CURVATURE_NODE_POLICY_UNRESOLVED', { mappingId: text(source.mappingId) }));
  if (!text(source.mappingId) || !text(source.sourceAuthority)
    || !Array.isArray(source.sourceReferences) || source.sourceReferences.some((item) => !text(item))) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED', { mappingId: text(source.mappingId) }));
  identityValid(source, fixtures, errors);
  numericDisposition(source, bends, 'bendType', 'PIPELINE_GRE_CAESAR_BEND_TYPE_UNRESOLVED', errors);
  numericDisposition(source, bends, 'numMiter', 'PIPELINE_GRE_CAESAR_NUM_MITER_UNRESOLVED', errors);
  curvatureValid(source, bends, errors);
  if (source.fittingThicknessDisposition !== 'EMIT_AUTHENTICATED_VALUE'
    || source.radiusDisposition !== 'EMIT_AUTHENTICATED_VALUE') errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT', { mappingId: text(source.mappingId), field: 'RADIUS_OR_THICKNESS' }));
  if (![source.bendTypeDisposition, source.numMiterDisposition, source.curvatureNodeDisposition,
    source.overallTurnAngleDisposition, source.fittingThicknessDisposition, source.radiusDisposition]
    .every((item) => PIPELINE_GRE_CAESAR_FIELD_DISPOSITIONS.includes(item))) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_FIXTURE_CONFLICT', { mappingId: text(source.mappingId), field: 'DISPOSITION' }));
  return createPipelineGreCaesarBendFieldMappingRecord({ mappingId: text(source.mappingId),
    caesarVersion: text(source.caesarVersion), pipingCodeId: text(source.pipingCodeId),
    pipingCodeName: text(source.pipingCodeName), pipingCodeEdition: text(source.pipingCodeEdition),
    laminateClassification: text(source.laminateClassification),
    bendTypeDisposition: text(source.bendTypeDisposition), bendTypeCode: Object.hasOwn(source, 'bendTypeValue') ? source.bendTypeValue : null,
    bendTypeMeaning: text(source.bendTypeMeaning), numMiterDisposition: text(source.numMiterDisposition),
    numMiterValue: Object.hasOwn(source, 'numMiterValue') ? source.numMiterValue : null, numMiterMeaning: text(source.numMiterMeaning),
    curvatureNodeDisposition: text(source.curvatureNodeDisposition),
    curvatureNodes: clone(source.curvatureNodes || []),
    overallTurnAngleDisposition: text(source.overallTurnAngleDisposition),
    fittingThicknessDisposition: text(source.fittingThicknessDisposition),
    radiusDisposition: text(source.radiusDisposition), sourceAuthority: text(source.sourceAuthority),
    sourceReferences: clone(source.sourceReferences || []), fixtureIds: clone(source.fixtureIds || []),
  }, errors);
}

export function buildPipelineGreCaesarBendFieldMatrixTsv(mappings) {
  const header = ['MappingId', 'CaesarVersion', 'PipingCodeId', 'CodeEdition', 'Laminate',
    'TypeDisposition', 'TypeCode', 'NumMiterDisposition', 'NumMiterValue',
    'CurvatureNodeDisposition', 'Ready', 'Blockers'];
  const rows = [...mappings].sort((a, b) => a.mappingId < b.mappingId ? -1 : a.mappingId > b.mappingId ? 1 : 0)
    .map((item) => [item.mappingId, item.caesarVersion, item.pipingCodeId, item.pipingCodeEdition,
      item.laminateClassification, item.bendTypeDisposition, item.bendTypeCode,
      item.numMiterDisposition, item.numMiterValue, item.curvatureNodeDisposition,
      item.ready, (item.blockerCodes || []).join('|')]);
  return [header, ...rows].map((row) => row.map((value) => value ?? '').join('\t')).join('\n');
}

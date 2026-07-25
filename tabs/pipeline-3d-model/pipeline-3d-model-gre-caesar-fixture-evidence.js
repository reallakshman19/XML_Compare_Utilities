import {
  PIPELINE_GRE_CAESAR_FIXTURE_EVIDENCE_SCHEMA,
  clonePipelineGreCaesarQualificationValue as clone,
  createPipelineGreCaesarDiagnostic as diagnostic,
  createPipelineGreCaesarFixtureEvidenceRecord,
  safePipelineGreCaesarQualificationInput as safe,
} from './pipeline-3d-model-gre-caesar-qualification-contracts.js';

export { PIPELINE_GRE_CAESAR_FIXTURE_EVIDENCE_SCHEMA };
export const PIPELINE_GRE_CAESAR_AUDITED_VERSIONS = Object.freeze(['14.00', '15.00']);

const text = (value) => typeof value === 'string' ? value.trim() : '';
const plain = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const sha256 = (value) => /^[a-f0-9]{64}$/.test(text(value));

function evidenceProven(value, expectedVersion) {
  return plain(value) && value.status === 'PROVEN' && text(value.evidenceId)
    && text(value.sourceReference) && text(value.caesarVersion) === expectedVersion;
}

function bendRecordValid(record) {
  if (!plain(record) || !text(record.bendRecordId) || !positiveInteger(record.ownerFromNode)
    || !positiveInteger(record.ownerToNode) || !(Number(record.radius) > 0)
    || typeof record.typeAttributePresent !== 'boolean'
    || typeof record.numMiterAttributePresent !== 'boolean') return false;
  const pairs = Array.isArray(record.curvatureNodes) ? record.curvatureNodes : [];
  return pairs.every((item) => plain(item) && Number.isFinite(item.angle)
    && Number.isSafeInteger(item.node) && item.node > 0);
}

function continuityRecordValid(record) {
  return plain(record) && text(record.continuityRecordId)
    && positiveInteger(record.enteringFromNode) && positiveInteger(record.enteringToNode)
    && positiveInteger(record.leavingFromNode) && positiveInteger(record.leavingToNode)
    && typeof record.sharedLogicalNode === 'boolean' && text(record.observedTopologyMode);
}

function missingAuthority(source) {
  const errors = [];
  if (!text(source.fixtureId) || !text(source.fixturePath) || !sha256(source.fixtureSha256)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED', { fixtureId: text(source.fixtureId) }));
  if (!PIPELINE_GRE_CAESAR_AUDITED_VERSIONS.includes(text(source.caesarVersion))
    || text(source.xmlVersion) !== text(source.caesarVersion)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_VERSION_UNRESOLVED', { fixtureId: text(source.fixtureId) }));
  if (!text(source.pipingCodeId)) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_CODE_ID_UNRESOLVED', { fixtureId: text(source.fixtureId) }));
  if (!text(source.pipingCodeEdition)) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_CODE_EDITION_UNRESOLVED', { fixtureId: text(source.fixtureId) }));
  if (!text(source.laminateClassification)) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_LAMINATE_UNRESOLVED', { fixtureId: text(source.fixtureId) }));
  return errors;
}

export function createPipelineGreCaesarFixtureEvidence(input = {}) {
  const safeValue = safe(input), source = safeValue.source, errors = [...safeValue.diagnostics,
    ...missingAuthority(source)];
  const bends = Array.isArray(source.bendRecords) ? source.bendRecords : [];
  const continuity = Array.isArray(source.continuityRecords) ? source.continuityRecords : [];
  if (!positiveInteger(source.elementCount) || !nonnegativeInteger(source.bendCount)
    || bends.length !== source.bendCount || !bends.every(bendRecordValid)
    || continuity.length !== source.bendCount || !continuity.every(continuityRecordValid)) errors.push(
    diagnostic('PIPELINE_GRE_CAESAR_FIXTURE_UNAUTHENTICATED', { fixtureId: text(source.fixtureId),
      reason: 'FIXTURE_RECORD_COVERAGE' }));
  if (!evidenceProven(source.importEvidence, text(source.caesarVersion))
    || source.importEvidence?.result !== 'ACCEPTED') errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_IMPORT_NOT_PROVEN', { fixtureId: text(source.fixtureId) }));
  if (!evidenceProven(source.roundTripEvidence, text(source.caesarVersion))
    || source.roundTripEvidence?.semanticEquivalent !== true
    || !sha256(source.roundTripEvidence?.reexportSha256)) errors.push(diagnostic(
    'PIPELINE_GRE_CAESAR_ROUND_TRIP_NOT_PROVEN', { fixtureId: text(source.fixtureId) }));
  return createPipelineGreCaesarFixtureEvidenceRecord({
    fixtureId: text(source.fixtureId), fixturePath: text(source.fixturePath),
    fixtureSha256: text(source.fixtureSha256), fixtureGitBlobSha1: text(source.fixtureGitBlobSha1),
    sourceClassification: text(source.sourceClassification), caesarVersion: text(source.caesarVersion),
    xmlVersion: text(source.xmlVersion), pipingCodeId: text(source.pipingCodeId),
    pipingCodeName: text(source.pipingCodeName), pipingCodeEdition: text(source.pipingCodeEdition),
    laminateClassification: text(source.laminateClassification),
    elementCount: nonnegativeInteger(source.elementCount) ? source.elementCount : 0,
    bendCount: nonnegativeInteger(source.bendCount) ? source.bendCount : 0,
    bendRecords: clone(bends), continuityRecords: clone(continuity),
    importEvidence: clone(source.importEvidence || {}),
    roundTripEvidence: clone(source.roundTripEvidence || {}),
    authorityLevel: text(source.authorityLevel), sourceReferences: clone(source.sourceReferences || []),
  }, errors);
}

export function createRepositoryGreInputXmlFixtureEvidence() {
  return createPipelineGreCaesarFixtureEvidence({
    fixtureId: 'repo-gre-inputxml-v14', fixturePath: 'docs/GREInputxml.xml', fixtureSha256: '',
    fixtureGitBlobSha1: 'e7dc8ff9b1082d489609980bb495ced048a81679',
    sourceClassification: 'CAESAR_EXPORTED_REPOSITORY_FIXTURE', caesarVersion: '14.00',
    xmlVersion: '14.00', pipingCodeId: '36', pipingCodeName: '', pipingCodeEdition: '',
    laminateClassification: '', elementCount: 100, bendCount: 12,
    bendRecords: [{ bendRecordId: 'repo-gre-inputxml-v14:representative:1450-1500',
      ownerFromNode: 1450, ownerToNode: 1500, radius: 1206, typeAttributePresent: true,
      typeValue: 3, numMiterAttributePresent: true, numMiterValue: -1.0101,
      fittingThicknessAttributePresent: true, fittingThicknessValue: -1.0101,
      curvatureNodes: [{ angle: -2.0202, node: 1499 }, { angle: 0, node: 1498 }],
      recordCoverage: 'REPRESENTATIVE_ONLY' }],
    continuityRecords: [{ continuityRecordId: 'repo-gre-inputxml-v14:continuity:1500',
      enteringFromNode: 1450, enteringToNode: 1500, leavingFromNode: 1500,
      leavingToNode: 1550, sharedLogicalNode: true,
      observedTopologyMode: 'CONSECUTIVE_SHARED_LOGICAL_NODE' }],
    importEvidence: { status: 'MISSING' }, roundTripEvidence: { status: 'MISSING' },
    authorityLevel: 'REPOSITORY_EXPORT_OBSERVATION', sourceReferences: [
      'docs/GREInputxml.xml:root PIPINGMODEL NUMELT=100 NUMBEND=12',
      'docs/GREInputxml.xml:representative BEND owner 1450-1500 and leaving 1500-1550',
    ],
  });
}

export function buildPipelineGreCaesarFixtureInventoryJson(fixtures) {
  const ordered = [...fixtures].sort((a, b) => a.fixtureId < b.fixtureId ? -1 : a.fixtureId > b.fixtureId ? 1 : 0);
  return JSON.stringify({ schema: 'PipelineGreCaesarFixtureInventory.v1', fixtures: ordered }, null, 2);
}

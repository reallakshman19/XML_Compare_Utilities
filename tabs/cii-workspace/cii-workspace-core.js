import { CII_WORKSPACE_SCHEMAS, deepFreeze, stableStringify } from './cii-workspace-contracts.js';
import { intakeCiiWorkspaceDocument } from './cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from './cii-workspace-topology-adapter.js';
import { qualifyCiiGeometryTransform } from './cii-workspace-geometry.js';
import { suggestCiiLandmarks } from './cii-workspace-landmarks.js';
import { suggestCiiBaseAnchorPairs } from './cii-workspace-anchor-suggestions.js';
import { buildCiiAutomaticPathAudit, compareLockedCiiAnchorSpan } from './cii-workspace-topology.js';
import { propagateSingleCiiAnchorCorrespondence } from './cii-workspace-propagation.js';
import { buildCiiPathCandidateAudit } from './cii-workspace-path-candidates.js';
import { applyCiiNodeCustodyGates } from './cii-workspace-node-custody.js';
import { attachCiiComponentCorrespondence } from './cii-workspace-components.js';
import { bindCiiCorrespondenceIdentity } from './cii-workspace-identity.js';
import { buildCiiEngineeringDeltas } from './cii-workspace-engineering-delta.js';
import { augmentCiiEngineeringDeltasWithWriter1BFields } from './cii-workspace-writer1b-deltas.js';
import { augmentCiiEngineeringDeltasWithRestraintPairing } from './cii-workspace-restraint-transfer.js';
import { augmentCiiEngineeringDeltasWithRestraintSlots } from './cii-workspace-restraint-slot-transfer.js';
import { buildCiiCompareReviewModel } from './cii-workspace-compare-review.js';
import { createCiiTransferPreview } from './cii-workspace-transfer-plan.js';
import { normalizeCiiWorkspaceReview } from './cii-workspace-review.js';
import { createCiiWorkspaceStageModel } from './cii-workspace-placeholders.js';
import { applyCiiTargetWriter1A } from './cii-workspace-target-writer.js';
import { applyCiiTargetWriter1B, ciiWriter1BReadiness } from './cii-workspace-target-writer-1b.js';
import { ciiWorkspaceArtifactBundle } from './cii-workspace-export.js';

function nodeIndex(graph) { return new Map((graph.nodes || []).map((node) => [String(node.id), node])); }
function normalizeAnchorPairs(pairs) {
  return deepFreeze((pairs || []).map((pair) => ({ schema: CII_WORKSPACE_SCHEMAS.anchor,
    sourceNodeId: String(pair.sourceNodeId), targetNodeId: String(pair.targetNodeId), status: 'LOCKED', authority: 'USER_LOCKED', locked: true })));
}
async function intakePair(input, options) {
  const sourceDocument = await intakeCiiWorkspaceDocument(input?.sourceText, input?.sourceFileName, { side: 'SOURCE', cryptoRef: options.cryptoRef });
  const targetDocument = await intakeCiiWorkspaceDocument(input?.targetText, input?.targetFileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  return { sourceDocument, targetDocument,
    sourceGraph: adaptCiiDocumentToTopologyGraph(sourceDocument), targetGraph: adaptCiiDocumentToTopologyGraph(targetDocument) };
}
function geometryPairs(sourceGraph, targetGraph, anchors) {
  const source = nodeIndex(sourceGraph); const target = nodeIndex(targetGraph);
  return anchors.flatMap((pair) => {
    const left = source.get(pair.sourceNodeId)?.position; const right = target.get(pair.targetNodeId)?.position;
    return left && right ? [{ source: left, target: right, sourceNodeId: pair.sourceNodeId, targetNodeId: pair.targetNodeId }] : [];
  });
}
function buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, engineeringDeltas, compareReview, transferPlan, landmarks, writerReadiness) {
  return deepFreeze({ schema: CII_WORKSPACE_SCHEMAS.audit, direction: 'SOURCE_TO_TARGET',
    source: Object.freeze({ fileName: sourceDocument.fileName, contentSha256: sourceDocument.contentSha256, summary: sourceDocument.summary }),
    target: Object.freeze({ fileName: targetDocument.fileName, contentSha256: targetDocument.contentSha256, summary: targetDocument.summary }),
    lockedAnchors: anchors, landmarkSuggestions: landmarks, geometry, automaticPathAudit: pathAudit, correspondence, review, engineeringDeltas,
    compareReview, transferPreview: transferPlan, writerReadiness, mutationAuthority: Object.freeze({
      stage06: writerReadiness.ready ? 'WRITER_1B_READY' : 'WRITER_1B_BLOCKED',
      modifiedTargetCiiExport: writerReadiness.ready ? 'WRITER_1B_CONDITIONAL' : 'BLOCKED',
    }) });
}
function inspectionSummary(document, graph) {
  const componentCounts = {};
  for (const edge of graph?.edges || []) componentCounts[edge.componentKind] = (componentCounts[edge.componentKind] || 0) + 1;
  return deepFreeze({ ...document.summary,
    terminalCount: (graph?.nodes || []).filter((node) => Number(node.degree) === 1).length,
    branchCount: (graph?.nodes || []).filter((node) => Number(node.degree) >= 3).length, componentCounts });
}
function inspectionSide(document, graph, options) {
  return Object.freeze({ fileName: document.fileName, contentSha256: document.contentSha256, summary: inspectionSummary(document, graph),
    landmarks: suggestCiiLandmarks(graph, options) });
}
function buildBaseCorrespondence(sourceGraph, targetGraph, anchors, options) {
  if (anchors.length === 1) return propagateSingleCiiAnchorCorrespondence(sourceGraph, targetGraph, anchors[0], options);
  return compareLockedCiiAnchorSpan(sourceGraph, targetGraph, anchors, options);
}
function sameNumber(a, b, tolerance = 1e-9) {
  const left = Number(a); const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= Math.max(tolerance, Math.abs(right) * 1e-12);
}

const ELEMENT_FIELD_MAP = Object.freeze({
  OD: 'od', WT: 'wall', 'Insulation thickness': 'insul', 'Corrosion allowance': 'corrosion',
  P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4', P5: 'P5', P6: 'P6', P7: 'P7', P8: 'P8', P9: 'P9',
  T1: 'T1', T2: 'T2', T3: 'T3', T4: 'T4', T5: 'T5', T6: 'T6', T7: 'T7', T8: 'T8', T9: 'T9',
  'Insulation density': 'insulationDensity', 'Fluid density': 'fluidDensity', 'Hydro pressure': 'hydroPressure',
});
const MUTABLE_ELEMENT_FIELDS = Object.freeze([...new Set(Object.values(ELEMENT_FIELD_MAP))]);
function elementMutationMap(writerResult, targetGraph) {
  const edges = new Map((targetGraph?.edges || []).map((edge) => [String(edge.elementId), edge])); const out = new Map();
  for (const mutation of writerResult?.mutations || []) {
    if (mutation.section !== 'ELEMENTS') continue;
    const edge = edges.get(String(mutation.elementId)); if (!edge) continue;
    const index = Number(edge.parsedElementIndex); if (!out.has(index)) out.set(index, {});
    const field = ELEMENT_FIELD_MAP[mutation.field]; if (field) out.get(index)[field] = Number(mutation.proposed);
  }
  return out;
}
function rigidMutationMap(writerResult) {
  return new Map((writerResult?.mutations || []).filter((item) => item.section === 'RIGID').map((item) => [Number(item.pointer), Number(item.proposed)]));
}
function restraintMutationMap(writerResult) {
  const out = new Map();
  for (const item of writerResult?.mutations || []) {
    if (item.section !== 'RESTRANT') continue;
    out.set(`${Number(item.pointer)}:${Number(item.slot)}:${item.field}`, Number(item.proposed));
  }
  return out;
}
function restraintSlotModes(writerResult) {
  const out = new Map();
  for (const item of writerResult?.mutations || []) {
    if (item.section !== 'RESTRANT' || !item.slotMode) continue;
    out.set(`${Number(item.pointer)}:${Number(item.slot)}`, item.slotMode);
  }
  return out;
}
function restraintRecordMap(document) {
  return new Map((document?.auxiliaryEvidence?.restraints?.records || []).map((record) => [`${Number(record.pointer)}:${Number(record.slot)}`, record]));
}
function validateElementCustody(beforeDocument, afterDocument, targetGraph, writerResult, errors) {
  const before = beforeDocument?.parsed?.elements || []; const after = afterDocument?.parsed?.elements || [];
  if (before.length !== after.length) { errors.push('ELEMENT_COUNT_CHANGED'); return; }
  const mutations = elementMutationMap(writerResult, targetGraph); const immutableFields = ['from', 'to', 'dx', 'dy', 'dz'];
  before.forEach((left, index) => {
    const right = after[index]; const allowed = mutations.get(index) || {};
    for (const field of immutableFields) if (!sameNumber(left[field], right?.[field])) errors.push(`ELEMENT_${index}_${field}_UNEXPECTED_CHANGE`);
    for (const field of MUTABLE_ELEMENT_FIELDS) {
      const expected = Object.hasOwn(allowed, field) ? allowed[field] : left[field];
      if (!sameNumber(expected, right?.[field])) errors.push(`ELEMENT_${index}_${field}_EXPECTED_VALUE_MISMATCH`);
    }
  });
}
function validateRigidCustody(beforeDocument, afterDocument, writerResult, errors) {
  const before = beforeDocument?.auxiliaryEvidence?.rigids?.byPointer || {}; const after = afterDocument?.auxiliaryEvidence?.rigids?.byPointer || {};
  const beforeKeys = Object.keys(before).sort(); const afterKeys = Object.keys(after).sort();
  if (stableStringify(beforeKeys) !== stableStringify(afterKeys)) { errors.push('RIGID_POINTER_SET_CHANGED'); return; }
  const mutations = rigidMutationMap(writerResult);
  for (const key of beforeKeys) {
    const pointer = Number(key); const expected = mutations.has(pointer) ? mutations.get(pointer) : Number(before[key]?.weight);
    if (!sameNumber(expected, after[key]?.weight)) errors.push(`RIGID_${pointer}_EXPECTED_WEIGHT_MISMATCH`);
  }
}
function expectedRestraintKeys(beforeKeys, modes) {
  const expected = new Set(beforeKeys);
  for (const [key, mode] of modes) {
    if (mode === 'CREATE') expected.add(key);
    else if (mode === 'CLEAR') expected.delete(key);
  }
  return [...expected].sort();
}
function recordMetadataEmpty(record) { return !String(record?.tag?.text || '').trim() && !String(record?.guid?.text || '').trim(); }
function validateRecordFields(key, left, right, mutations, errors) {
  const prefix = key;
  const scalar = [['typeCode', 'Restraint typeCode'], ['stiffness', 'Restraint stiffness'], ['gap', 'Restraint gap'],
    ['friction', 'Restraint friction'], ['connectingNode', 'Restraint connectingNode']];
  const directions = [['x', 'Restraint direction X'], ['y', 'Restraint direction Y'], ['z', 'Restraint direction Z']];
  for (const [property, field] of scalar) {
    const mutationKey = `${prefix}:${field}`; const expected = mutations.has(mutationKey) ? mutations.get(mutationKey) : Number(left?.[property]);
    if (!sameNumber(expected, right?.[property])) errors.push(`RESTRAINT_${prefix}_${property}_EXPECTED_VALUE_MISMATCH`);
  }
  for (const [axis, field] of directions) {
    const mutationKey = `${prefix}:${field}`; const expected = mutations.has(mutationKey) ? mutations.get(mutationKey) : Number(left?.directionCosines?.[axis]);
    if (!sameNumber(expected, right?.directionCosines?.[axis])) errors.push(`RESTRAINT_${prefix}_direction_${axis}_EXPECTED_VALUE_MISMATCH`);
  }
}
function validateRestraintCustody(beforeDocument, afterDocument, writerResult, errors) {
  const before = restraintRecordMap(beforeDocument); const after = restraintRecordMap(afterDocument);
  const beforeKeys = [...before.keys()].sort(); const afterKeys = [...after.keys()].sort(); const modes = restraintSlotModes(writerResult);
  if (stableStringify(expectedRestraintKeys(beforeKeys, modes)) !== stableStringify(afterKeys)) errors.push('RESTRAINT_POINTER_SLOT_SET_UNEXPECTED_CHANGE');
  if (Number(beforeDocument?.auxiliaryEvidence?.restraints?.sectionRowCount) !== Number(afterDocument?.auxiliaryEvidence?.restraints?.sectionRowCount)) errors.push('RESTRAINT_SECTION_CARDINALITY_CHANGED');
  const mutations = restraintMutationMap(writerResult);
  for (const key of afterKeys) {
    const left = before.get(key); const right = after.get(key); const mode = modes.get(key);
    if (mode === 'CREATE') {
      if (!recordMetadataEmpty(right)) errors.push(`RESTRAINT_${key}_CREATED_METADATA_NOT_EMPTY`);
      validateRecordFields(key, Object.freeze({ typeCode: 0, stiffness: 0, gap: 0, friction: 0, connectingNode: 0,
        directionCosines: Object.freeze({ x: 0, y: 0, z: 0 }) }), right, mutations, errors);
      continue;
    }
    if (!left || !right) { errors.push(`RESTRAINT_${key}_UNEXPECTED_RECORD_STATE`); continue; }
    if (String(left.node) !== String(right.node)) errors.push(`RESTRAINT_${key}_NODE_UNEXPECTED_CHANGE`);
    if (stableStringify(left.tag) !== stableStringify(right.tag)) errors.push(`RESTRAINT_${key}_TAG_UNEXPECTED_CHANGE`);
    if (stableStringify(left.guid) !== stableStringify(right.guid)) errors.push(`RESTRAINT_${key}_GUID_UNEXPECTED_CHANGE`);
    validateRecordFields(key, left, right, mutations, errors);
  }
  for (const [key, mode] of modes) {
    if (mode === 'CLEAR' && before.has(key) && !recordMetadataEmpty(before.get(key))) errors.push(`RESTRAINT_${key}_CLEARED_METADATA_WAS_NOT_EMPTY`);
  }
}
function validateNegativeAssurance(beforeDocument, afterDocument, targetGraph, writerResult, writerLabel) {
  const errors = [];
  validateElementCustody(beforeDocument, afterDocument, targetGraph, writerResult, errors);
  validateRigidCustody(beforeDocument, afterDocument, writerResult, errors);
  validateRestraintCustody(beforeDocument, afterDocument, writerResult, errors);
  if (stableStringify(beforeDocument?.parsed?.nodes || {}) !== stableStringify(afterDocument?.parsed?.nodes || {})) errors.push('NODE_GEOMETRY_CHANGED');
  if (stableStringify(beforeDocument?.nodeNames || {}) !== stableStringify(afterDocument?.nodeNames || {})) errors.push('NODE_NAMES_CHANGED');
  const beforePointers = Object.values(beforeDocument?.auxiliaryEvidence?.elements || {}).map((item) => item.pointers);
  const afterPointers = Object.values(afterDocument?.auxiliaryEvidence?.elements || {}).map((item) => item.pointers);
  if (stableStringify(beforePointers) !== stableStringify(afterPointers)) errors.push('AUXILIARY_POINTER_OWNERSHIP_CHANGED');
  if (errors.length) throw new Error(`CII_${writerLabel}_NEGATIVE_ASSURANCE_FAILED:${errors.join('|')}`);
  return deepFreeze({ schema: `CIIWorkspace${writerLabel}Validation.v1`, status: 'PASS', unexpectedSemanticDeltaCount: 0, checks: Object.freeze([
    'ELEMENT_COUNT_UNCHANGED', 'NODE_NUMBERS_AND_GEOMETRY_UNCHANGED', 'FROM_TO_DX_DY_DZ_UNCHANGED',
    'ONLY_EXPLICIT_ELEMENT_FIELDS_CHANGED', 'AUXILIARY_POINTER_OWNERSHIP_UNCHANGED', 'RIGID_POINTER_SET_UNCHANGED',
    'RESTRAINT_SECTION_CARDINALITY_UNCHANGED', 'RESTRAINT_SLOT_SET_CHANGED_ONLY_AS_APPROVED', 'RESTRAINT_TAG_GUID_UNCHANGED',
  ]) });
}

export async function inspectCiiWorkspaceModels(input, options = {}) {
  const pair = await intakePair(input, options);
  return deepFreeze({ schema: CII_WORKSPACE_SCHEMAS.inspection, source: inspectionSide(pair.sourceDocument, pair.sourceGraph, options),
    target: inspectionSide(pair.targetDocument, pair.targetGraph, options), baseAnchorSuggestions: suggestCiiBaseAnchorPairs(pair.sourceGraph, pair.targetGraph, options) });
}

export async function createCiiWorkspacePreview(input, options = {}) {
  const { sourceDocument, targetDocument, sourceGraph, targetGraph } = await intakePair(input, options);
  const anchors = normalizeAnchorPairs(input?.anchorPairs);
  const landmarks = deepFreeze({ source: suggestCiiLandmarks(sourceGraph, options), target: suggestCiiLandmarks(targetGraph, options) });
  const geometry = qualifyCiiGeometryTransform(geometryPairs(sourceGraph, targetGraph, anchors), options);
  const pathAudit = deepFreeze({ structural: buildCiiAutomaticPathAudit(sourceGraph, targetGraph, options), candidates: buildCiiPathCandidateAudit(sourceGraph, targetGraph, options) });
  const baseCorrespondence = buildBaseCorrespondence(sourceGraph, targetGraph, anchors, { ...options, geometryTransform: geometry });
  const nodeGatedCorrespondence = applyCiiNodeCustodyGates(baseCorrespondence, sourceGraph);
  const componentCorrespondence = attachCiiComponentCorrespondence(nodeGatedCorrespondence, sourceGraph, targetGraph);
  const correspondence = bindCiiCorrespondenceIdentity(componentCorrespondence, sourceDocument, targetDocument, anchors);
  const review = normalizeCiiWorkspaceReview(input?.review, sourceDocument, targetDocument, anchors, correspondence);
  const baseDeltas = buildCiiEngineeringDeltas(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, { ...options, geometryTransform: geometry });
  const writer1BDeltas = augmentCiiEngineeringDeltasWithWriter1BFields(baseDeltas, sourceGraph, targetGraph, correspondence, options);
  const pairedDeltas = augmentCiiEngineeringDeltasWithRestraintPairing(writer1BDeltas, sourceDocument, targetDocument, correspondence, options);
  const engineeringDeltas = augmentCiiEngineeringDeltasWithRestraintSlots(pairedDeltas, sourceDocument, targetDocument, correspondence,
    input?.sourceText, input?.targetText, options);
  const compareReview = buildCiiCompareReviewModel(sourceDocument, targetDocument, correspondence, review, engineeringDeltas);
  const transferPlan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, engineeringDeltas, options);
  const writerReadiness = ciiWriter1BReadiness(transferPlan);
  const audit = buildAudit(sourceDocument, targetDocument, anchors, geometry, pathAudit, correspondence, review, engineeringDeltas, compareReview, transferPlan, landmarks, writerReadiness);
  const result = { stages: createCiiWorkspaceStageModel(writerReadiness), sourceDocument, targetDocument, landmarks, correspondence, review,
    engineeringDeltas, compareReview, transferPlan, writerReadiness, audit };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return deepFreeze(result);
}

async function currentTargetFor(preview, targetText, options, label) {
  if (!preview?.targetDocument || !preview?.transferPlan || !preview?.correspondence) throw new Error(`CII_${label}_PREVIEW_REQUIRED`);
  const currentTarget = await intakeCiiWorkspaceDocument(targetText, preview.targetDocument.fileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  if (currentTarget.contentSha256 !== preview.targetDocument.contentSha256) throw new Error(`CII_${label}_STALE_TARGET_HASH`);
  return currentTarget;
}
export async function applyCiiWorkspaceTargetWriter1A(preview, targetText, options = {}) {
  const currentTarget = await currentTargetFor(preview, targetText, options, 'WRITER_1A'); const targetGraph = adaptCiiDocumentToTopologyGraph(currentTarget);
  const writerResult = applyCiiTargetWriter1A({ targetText, targetGraph, correspondence: preview.correspondence, transferPlan: preview.transferPlan });
  const modifiedTarget = await intakeCiiWorkspaceDocument(writerResult.text, preview.targetDocument.fileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  const validation = validateNegativeAssurance(currentTarget, modifiedTarget, targetGraph, writerResult, 'WRITER_1A');
  return deepFreeze({ schema: 'CIIWorkspaceTargetApplyResult.v1', status: 'PASS', fileName: `Modified_${preview.targetDocument.fileName}`, text: writerResult.text,
    sourceTargetSha256: currentTarget.contentSha256, modifiedTargetSha256: modifiedTarget.contentSha256,
    mutationCount: writerResult.mutationCount, mutations: writerResult.mutations, validation });
}
export async function applyCiiWorkspaceTargetWriter1B(preview, targetText, options = {}) {
  const currentTarget = await currentTargetFor(preview, targetText, options, 'WRITER_1B'); const targetGraph = adaptCiiDocumentToTopologyGraph(currentTarget);
  const writerResult = applyCiiTargetWriter1B({ targetText, targetGraph, correspondence: preview.correspondence, transferPlan: preview.transferPlan });
  const modifiedTarget = await intakeCiiWorkspaceDocument(writerResult.text, preview.targetDocument.fileName, { side: 'TARGET', cryptoRef: options.cryptoRef });
  const validation = validateNegativeAssurance(currentTarget, modifiedTarget, targetGraph, writerResult, 'WRITER_1B');
  return deepFreeze({ schema: 'CIIWorkspaceTargetApplyResult.v1', status: 'PASS', writer: 'WRITER_1B',
    fileName: `Modified_${preview.targetDocument.fileName}`, text: writerResult.text,
    sourceTargetSha256: currentTarget.contentSha256, modifiedTargetSha256: modifiedTarget.contentSha256,
    mutationCount: writerResult.mutationCount, mutations: writerResult.mutations, validation });
}

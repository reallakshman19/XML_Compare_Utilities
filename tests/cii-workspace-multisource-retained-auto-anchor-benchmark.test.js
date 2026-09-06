import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { ciiCanonicalWriter2MutationSelection } from '../tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js';
import { parseCiiMsBm001 } from '../tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js';
import { createCiiExpectedNodeNameSourceSetSelection } from '../tabs/cii-workspace/cii-workspace-multisource-scope.js';
import { bindCiiTransferScopeToPreview } from '../tabs/cii-workspace/cii-workspace-transfer-scope.js';
import { applyCiiWorkspaceTargetWriter2WithVersionBridge } from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';
import {
  deriveExactNameRelocations,
  deriveExpectedNodeNameDelta,
} from './cii-workspace-multisource-texpected-oracle.js';
import {
  evaluatePartialTExpectedPostimage,
  expectedStructuralTransferKeys,
  structuralTransferKey,
  validateAppliedRawIdentity,
  validateRawMutationIdentity,
} from './cii-workspace-multisource-partial-texpected-oracle.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({
  sourceId: `S${index + 1}`, fileName, bytes: readFileSync(benchmark(fileName)),
}));
const sourceTextsById = Object.fromEntries(sources.map((source) => [source.sourceId, source.bytes.toString('latin1')]));
const targetBytes = readFileSync(benchmark('T.CII'));
const targetText = targetBytes.toString('latin1');
const expectedText = readFileSync(benchmark('TEXPECTED-PARTIALLLYDONE.CII'), 'latin1');
const expectedDelta = deriveExpectedNodeNameDelta(targetText, expectedText);
const expectedKeys = expectedStructuralTransferKeys(expectedDelta.rows);
const expectedRelocations = deriveExactNameRelocations(expectedDelta.rows);
const bmRows = parseCiiMsBm001();

function autoBaseLoops(inspection) {
  const choices = []; const loops = {};
  for (const member of inspection.memberInspections || []) {
    const choice = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
    choices.push(Object.freeze({ sourceId: member.sourceId, ...choice }));
    if (choice.status === 'READY') loops[member.sourceId] = choice.baseLoops;
  }
  return Object.freeze({ choices: Object.freeze(choices), loops: Object.freeze(loops) });
}
function automaticReviewBySource(preview) {
  return Object.fromEntries((preview?.memberPreviews || []).map(({ sourceId, preview: member }) => {
    const rows = member?.compareReview?.rows || [];
    return [sourceId, {
      reviewedCorrespondenceIds: rows.filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).map((row) => row.correspondenceId),
      lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
      rejectedCorrespondenceIds: [],
    }];
  }));
}
function candidateOperations(plan) {
  const byId = new Map();
  for (const operation of [...(plan?.operations || []), ...(plan?.excludedOperations || [])]) {
    const id = String(operation?.operationId || '').trim();
    if (id && !byId.has(id)) byId.set(id, operation);
  }
  return byId;
}
function operationValue(operation) {
  return String(operation?.action === 'CREATE' ? (operation?.proposed ?? operation?.sourceEvidence?.value)
    : (operation?.before ?? operation?.targetEvidence?.value) ?? '').trim();
}
function physicalTransferKey(operation) {
  const action = String(operation?.action || '').trim();
  const target = String(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId || '').trim();
  return structuralTransferKey(action, target, operationValue(operation));
}
function canonicalPhysicalTransfer(preview) {
  const candidates = candidateOperations(preview.transferPlan);
  const canonical = ciiCanonicalWriter2MutationSelection([...candidates.values()]);
  const operations = canonical.appliedOperationIds.map((id) => candidates.get(id));
  const keys = operations.map(physicalTransferKey).sort();
  return Object.freeze({ canonical, operations: Object.freeze(operations), keys: Object.freeze(keys) });
}
function checkpointDiagnostics(preview) {
  const pairs = [['8870', '9040'], ['10350', '10190'], ['1005', '925']];
  const nodeRows = preview?.correspondence?.nodeRows || [];
  return Object.freeze(pairs.map(([fromNodeId, toNodeId]) => {
    const correspondenceMatches = nodeRows.filter((row) => String(row?.sourceNodeId) === fromNodeId && String(row?.targetNodeId) === toNodeId)
      .map((row) => ({ sourceId: row.sourceId, correspondenceId: row.correspondenceId, status: row.status, confidence: row.confidence }));
    const exactNameRelocation = expectedRelocations.find((row) => row.fromNodeId === fromNodeId && row.toNodeId === toNodeId) || null;
    return Object.freeze({ fromNodeId, toNodeId, correspondenceMatches: Object.freeze(correspondenceMatches), exactNameRelocation });
  }));
}

const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
  sources, targetBytes, targetFileName: 'T.CII',
}, { cryptoRef });
const automatic = autoBaseLoops(inspection);
assert.equal(automatic.choices.length, 3, 'retained Auto Anchor test requires S1/S2/S3 independently');
for (const choice of automatic.choices) {
  assert.equal(choice.status, 'READY', `${choice.sourceId} Auto Anchor must resolve a unique HIGH/MEDIUM topology base: ${choice.reason}`);
  assert(choice.baseLoops.length > 0, `${choice.sourceId} Auto Anchor must project at least one qualified Method A/B loop`);
}
assert.deepEqual(Object.keys(automatic.loops).sort(), ['S1', 'S2', 'S3'], 'no manual/benchmark anchor may be needed for retained Auto Anchor path');

const previewInput = (reviewBySource = undefined) => ({
  sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: automatic.loops,
  ...(reviewBySource ? { reviewBySource } : {}),
});
const discoveryPreview = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef });
const reviewBySource = automaticReviewBySource(discoveryPreview);
const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(reviewBySource), { cryptoRef });
assert.equal(preview.correspondence.status, 'READY', `Auto Anchor correspondence must be READY: ${(preview.correspondence.blockers || []).join(',')}`);
assert.equal(preview.correspondence.conflicts.length, 0, 'Auto Anchor correspondence must not accept cross-source target conflicts');

const physical = canonicalPhysicalTransfer(preview);
assert.equal(physical.canonical.conflicts.length, 0, 'Transfer must have zero competing exact physical NODENAME proposals');
assert.equal(new Set(physical.keys).size, physical.keys.length, 'canonical physical Transfer APPLY keys must be unique');
assert.equal(physical.keys.length, expectedKeys.length, 'Transfer tab physical APPLY row count must equal independent T→partial-expected structural benchmark count');
assert.deepEqual(physical.keys, [...expectedKeys], 'Transfer tab action/target/name-family set must equal the independent partial expected structural set');
const rawMutationIdentity = validateRawMutationIdentity(physical.operations, sourceTextsById, targetText, bmRows);
assert.equal(rawMutationIdentity.status, 'READY', `Transfer exact raw identity failed: ${JSON.stringify(rawMutationIdentity.errors.slice(0, 10))}`);

const exactScope = await createCiiExpectedNodeNameSourceSetSelection(preview.transferPlan, { cryptoRef });
assert.equal(exactScope.authority.correspondenceCoverage.status, 'READY', 'all 329 BM-001 correspondence rows must be covered before Writer2 scope can bind');
assert.equal(exactScope.authority.correspondenceCoverage.missingRowNumbers.length, 0);
assert.equal(exactScope.appliedOperationIds.length, expectedKeys.length, 'bound scope APPLY cardinality must equal independent benchmark Transfer cardinality');
const scopedPreview = bindCiiTransferScopeToPreview(preview, exactScope.selection);
assert.equal(scopedPreview.writerReadiness.ready, true, `Writer2 readiness blocked: ${(scopedPreview.writerReadiness.blockers || []).join(',')}`);

const applied = await applyCiiWorkspaceTargetWriter2WithVersionBridge(scopedPreview, targetBytes, { cryptoRef });
assert.equal(applied.versionBridgeValidation.status, 'PASS');
const structuralPostimage = evaluatePartialTExpectedPostimage(targetText, applied.byteString, expectedText);
const emittedRawIdentity = validateAppliedRawIdentity(applied.byteString, physical.operations);
const checkpointEvidence = checkpointDiagnostics(preview);
const diagnostics = Object.freeze({
  autoAnchor: automatic.choices.map((choice) => ({
    sourceId: choice.sourceId, status: choice.status, sourceNodeId: choice.sourceNodeId, targetNodeId: choice.targetNodeId,
    confidence: choice.confidence, basisMethod: choice.basisMethod, outcomeSignature: choice.outcomeSignature,
  })),
  correspondence: { status: preview.correspondence.status, nodeRows: preview.correspondence.nodeRows.length, conflicts: preview.correspondence.conflicts.length },
  transfer: {
    expectedApplyRowCount: expectedKeys.length, actualApplyRowCount: physical.keys.length,
    duplicateCorroborationCount: physical.canonical.duplicateOperationIds.length,
    conflictCount: physical.canonical.conflicts.length,
    rawMutationIdentity: rawMutationIdentity.status,
  },
  bm001: exactScope.authority.correspondenceCoverage,
  compare: {
    structuralStatus: structuralPostimage.status,
    structuralEncodingDifferences: structuralPostimage.encoding.differences.length,
    structuralSemanticDifferences: structuralPostimage.semantics.differences.length,
    exactRawEmissionStatus: emittedRawIdentity.status,
    exactRawEmissionDifferences: emittedRawIdentity.errors.length,
    familyExpansions: structuralPostimage.encoding.familyExpansions.length,
    unrelatedTargetDifferences: structuralPostimage.preservation.differences.length,
  },
  ownerCheckpointEvidence: checkpointEvidence,
});
console.log(JSON.stringify(diagnostics, null, 2));

assert.equal(structuralPostimage.preservation.status, 'READY', 'Writer2 output must preserve original T outside NODENAME authority');
assert.equal(structuralPostimage.encoding.differences.length, 0, 'Writer2 CONTROL/pointer/NODENAME placement must match the partial expected structural oracle');
assert.equal(structuralPostimage.semantics.differences.length, 0, 'Writer2 node placement/name family must match the partial expected structural oracle');
assert.equal(emittedRawIdentity.status, 'READY', `final Writer2 output must emit each exact selected raw source name: ${JSON.stringify(emittedRawIdentity.errors.slice(0, 10))}`);
assert.equal(structuralPostimage.status, 'READY', 'retained Writer2 structural benchmark must match the partial expected artifact and preserve original target elsewhere');

console.log('CII retained-real Auto Anchor -> Transfer -> Writer2 -> partial-expected structure + exact raw identity benchmark passed.');

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
import { deriveExactNameRelocations, deriveExpectedNodeNameDelta } from './cii-workspace-multisource-texpected-oracle.js';
import {
  evaluatePartialTExpectedPostimage,
  expectedNodeNameTransferKeys,
  validateAppliedRawIdentity,
  validateKnownPositiveNodeNames,
  validateRawMutationIdentity,
} from './cii-workspace-multisource-partial-texpected-oracle.js';
import {
  additionalTransferKeys,
  missingRequiredTransferKeys,
  physicalTransferKeys,
  selectedOperationDeltas,
} from './cii-workspace-multisource-lower-bound-helpers.js';
import { validateIndependentMixedNodeNameByteClosure } from './cii-workspace-multisource-byte-closure-oracle.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({ sourceId: `S${index + 1}`, fileName, bytes: readFileSync(benchmark(fileName)) }));
const sourceTextsById = Object.fromEntries(sources.map((source) => [source.sourceId, source.bytes.toString('latin1')]));
const targetBytes = readFileSync(benchmark('T.CII'));
const targetText = targetBytes.toString('latin1');
const expectedText = readFileSync(benchmark('TEXPECTED-PARTIALLLYDONE.CII'), 'latin1');
const expectedDelta = deriveExpectedNodeNameDelta(targetText, expectedText);
const expectedKeys = expectedNodeNameTransferKeys(expectedDelta.rows);
const expectedRelocations = deriveExactNameRelocations(expectedDelta.rows);
const bmRows = parseCiiMsBm001();

assert.equal(expectedDelta.rows.length, 36, 'retained lower-bound oracle must remain 36 known-positive NodeName deltas');
assert.equal(expectedDelta.rows.filter((row) => row.action === 'REPLACE').length, 35, 'retained lower-bound oracle must remain 35 known-positive replacements');
assert.equal(expectedDelta.rows.filter((row) => row.action === 'CREATE').length, 1, 'retained lower-bound oracle must remain one known-positive create');
assert.equal(expectedDelta.rows.filter((row) => row.action === 'DELETE').length, 0, 'retained lower-bound oracle must remain zero known-positive deletes');

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
      ...(member?.review || {}),
      reviewedCorrespondenceIds: rows.filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).map((row) => row.correspondenceId),
      lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
      rejectedCorrespondenceIds: [],
    }];
  }));
}
function candidateOperations(plan) {
  const byId = new Map();
  for (const operation of [...(plan?.operations || []), ...(plan?.excludedOperations || [])]) {
    const id = String(operation?.operationId || '').trim(); if (id && !byId.has(id)) byId.set(id, operation);
  }
  return byId;
}
function canonicalPhysicalTransfer(preview) {
  const candidates = candidateOperations(preview.transferPlan);
  const canonical = ciiCanonicalWriter2MutationSelection([...candidates.values()]);
  const operations = canonical.appliedOperationIds.map((id) => candidates.get(id));
  return Object.freeze({ canonical, operations: Object.freeze(operations), keys: physicalTransferKeys(operations) });
}
function checkpointDiagnostics(preview) {
  const pairs = [['8870', '9040'], ['10350', '10190'], ['1005', '925']]; const nodeRows = preview?.correspondence?.nodeRows || [];
  return Object.freeze(pairs.map(([fromNodeId, toNodeId]) => Object.freeze({
    fromNodeId, toNodeId,
    correspondenceMatches: Object.freeze(nodeRows.filter((row) => String(row?.sourceNodeId) === fromNodeId && String(row?.targetNodeId) === toNodeId)
      .map((row) => ({ sourceId: row.sourceId, correspondenceId: row.correspondenceId, status: row.status, confidence: row.confidence }))),
    exactNameRelocation: expectedRelocations.find((row) => row.fromNodeId === fromNodeId && row.toNodeId === toNodeId) || null,
  })));
}

const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({ sources, targetBytes, targetFileName: 'T.CII' }, { cryptoRef });
const automatic = autoBaseLoops(inspection);
assert.equal(automatic.choices.length, 3, 'retained Auto Anchor test requires S1/S2/S3 independently');
for (const choice of automatic.choices) {
  assert.equal(choice.status, 'READY', `${choice.sourceId} Auto Anchor must resolve a unique qualified base: ${choice.reason}`);
  assert(choice.baseLoops.length > 0, `${choice.sourceId} Auto Anchor must project at least one qualified Method A/B loop`);
}
assert.deepEqual(Object.keys(automatic.loops).sort(), ['S1', 'S2', 'S3'], 'no manual/benchmark anchor may be needed for retained Auto Anchor path');

const previewInput = (reviewBySource = undefined) => ({
  sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: automatic.loops,
  ...(reviewBySource ? { reviewBySource } : {}),
});
const discoveryPreview = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(), { cryptoRef });
const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput(automaticReviewBySource(discoveryPreview)), { cryptoRef });
assert.equal(preview.correspondence.status, 'READY', `Auto Anchor correspondence must be READY: ${(preview.correspondence.blockers || []).join(',')}`);
assert.equal(preview.correspondence.conflicts.length, 0, 'Auto Anchor correspondence must not accept cross-source target conflicts');

const physical = canonicalPhysicalTransfer(preview);
const missingKnownPositiveKeys = missingRequiredTransferKeys(physical.keys, expectedKeys);
const additionalQualifiedKeys = additionalTransferKeys(physical.keys, expectedKeys);
const replacementCount = physical.operations.filter((operation) => operation.action === 'COPY').length;
const structuralCount = physical.operations.filter((operation) => ['CREATE', 'DELETE'].includes(operation.action)).length;
assert.equal(physical.canonical.conflicts.length, 0, 'Transfer must have zero competing exact physical NODENAME proposals');
assert.equal(new Set(physical.keys).size, physical.keys.length, 'canonical physical Transfer APPLY keys must be unique');
assert.deepEqual(missingKnownPositiveKeys, [], 'every T→TEXPECTED known-positive action/target must be recovered');
assert(replacementCount >= 35, 'selected qualified transfer must include all 35 known-positive replacements');
assert(physical.operations.filter((operation) => operation.action === 'CREATE').length >= 1, 'selected qualified transfer must include the known-positive CREATE');
const rawMutationIdentity = validateRawMutationIdentity(physical.operations, sourceTextsById, targetText, bmRows);
assert.equal(rawMutationIdentity.status, 'READY', `every selected mutation must have exact raw source/target identity: ${JSON.stringify(rawMutationIdentity.errors.slice(0, 10))}`);

const exactScope = await createCiiExpectedNodeNameSourceSetSelection(preview.transferPlan, { cryptoRef });
assert.equal(exactScope.authority.rowCount, 329, 'frozen BM-001 authority must remain exactly 329 rows');
assert.equal(exactScope.authority.correspondenceCoverage.status, 'READY', 'every observed BM-001 claim must be an exact frozen-table row');
assert.equal(exactScope.authority.correspondenceCoverage.invalidOperationIds.length, 0, 'no observed BM-001 claim may be invalid');
assert(exactScope.authority.correspondenceCoverage.matchedRowCount > 0, 'retained path must expose observed BM-001 evidence');
assert.deepEqual([...exactScope.appliedOperationIds].sort(), [...physical.canonical.appliedOperationIds].sort(), 'explicit scope APPLY must equal the full canonical physical mutation selection, not the partial benchmark cardinality');
const scopedPreview = bindCiiTransferScopeToPreview(preview, exactScope.selection);
assert.equal(scopedPreview.writerReadiness.ready, true, `mixed Writer1C/Writer2 readiness blocked: ${(scopedPreview.writerReadiness.blockers || []).join(',')}`);
assert.equal(scopedPreview.writerReadiness.familyMutationCounts.nodeNameReplace, replacementCount, 'readiness replacement count must equal canonical selected replacements');
assert.equal(scopedPreview.writerReadiness.familyMutationCounts.nodeNameStructural, structuralCount, 'readiness structural count must equal canonical selected CREATE/DELETE operations');

const applied = await applyCiiWorkspaceTargetWriter2WithVersionBridge(scopedPreview, targetBytes, { cryptoRef });
assert.equal(applied.versionBridgeValidation.status, 'PASS');
const structuralPostimage = evaluatePartialTExpectedPostimage(targetText, applied.byteString, expectedText, physical.operations);
const emittedRawIdentity = validateAppliedRawIdentity(applied.byteString, physical.operations);
const knownPositiveNames = validateKnownPositiveNodeNames(applied.byteString, expectedDelta.rows, physical.operations);
const byteClosure = validateIndependentMixedNodeNameByteClosure(targetText, applied.byteString, {
  expectedDeltas: selectedOperationDeltas(physical.operations),
  selectedOperations: physical.operations,
});
const diagnostics = Object.freeze({
  autoAnchor: automatic.choices.map((choice) => ({
    sourceId: choice.sourceId, status: choice.status, sourceNodeId: choice.sourceNodeId, targetNodeId: choice.targetNodeId,
    confidence: choice.confidence, basisMethod: choice.basisMethod, outcomeSignature: choice.outcomeSignature,
  })),
  correspondence: { status: preview.correspondence.status, nodeRows: preview.correspondence.nodeRows.length, conflicts: preview.correspondence.conflicts.length },
  transfer: {
    knownPositiveLowerBoundCount: expectedKeys.length,
    actualApplyRowCount: physical.keys.length,
    additionalQualifiedCount: additionalQualifiedKeys.length,
    additionalQualifiedKeys,
    replacementCount,
    structuralCount,
    duplicateCorroborationCount: physical.canonical.duplicateOperationIds.length,
    conflictCount: physical.canonical.conflicts.length,
    rawMutationIdentity: rawMutationIdentity.status,
    sourceOnlyCreateOperationIds: rawMutationIdentity.sourceOnlyCreateOperationIds,
  },
  bm001: exactScope.authority.correspondenceCoverage,
  compare: {
    lowerBoundPostimageStatus: structuralPostimage.status,
    structuralEncodingDifferences: structuralPostimage.encoding.differences.length,
    knownPositiveSemanticDifferences: structuralPostimage.semantics.differences.length,
    exactRawEmissionStatus: emittedRawIdentity.status,
    exactRawEmissionDifferences: emittedRawIdentity.errors.length,
    knownPositiveNameStatus: knownPositiveNames.status,
    knownPositiveNameDifferences: knownPositiveNames.differences.length,
    byteClosureStatus: byteClosure.status,
    byteClosureDifferences: byteClosure.differences.length,
    unrelatedTargetDifferences: structuralPostimage.preservation.differences.length,
    unselectedNodeNamePayloadDifferences: structuralPostimage.nodeNamePayloadPreservation.differences.length,
  },
  ownerCheckpointEvidence: checkpointDiagnostics(preview),
});
console.log(JSON.stringify(diagnostics, null, 2));

assert.equal(structuralPostimage.preservation.status, 'READY', 'mixed output must preserve original T outside NodeName mutation authority');
assert.equal(structuralPostimage.nodeNamePayloadPreservation.status, 'READY', 'mixed output must preserve unselected original NODENAME payloads');
assert.equal(structuralPostimage.encoding.differences.length, 0, 'selected output must remain structurally well-formed');
assert.equal(structuralPostimage.semantics.differences.length, 0, 'all partial TEXPECTED known-positive NodeName mutations must be present');
assert.equal(emittedRawIdentity.status, 'READY', `final mixed output must emit every selected raw source name exactly: ${JSON.stringify(emittedRawIdentity.errors.slice(0, 10))}`);
assert.equal(knownPositiveNames.status, 'READY', `all 36 lower-bound positives must be recovered: ${JSON.stringify(knownPositiveNames.differences.slice(0, 10))}`);
assert.equal(byteClosure.status, 'READY', `independent raw-byte closure for the full selected mutation set failed: ${JSON.stringify(byteClosure.differences.slice(0, 10))}`);
assert.equal(structuralPostimage.status, 'READY', 'retained mixed Writer1C/Writer2 output must satisfy the lower-bound oracle and preserve unrelated target state');

console.log('CII retained-real Auto Anchor -> canonical transfer -> mixed Writer1C/Writer2 lower-bound + full selected byte-closure benchmark passed.');

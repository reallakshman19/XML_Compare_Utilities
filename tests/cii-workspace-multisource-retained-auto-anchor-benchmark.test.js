import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { ciiCanonicalWriter2MutationSelection } from '../tabs/cii-workspace/cii-workspace-multisource-bm001-correspondence.js';
import { createCiiExpectedNodeNameSourceSetSelection } from '../tabs/cii-workspace/cii-workspace-multisource-scope.js';
import { bindCiiTransferScopeToPreview } from '../tabs/cii-workspace/cii-workspace-transfer-scope.js';
import { applyCiiWorkspaceTargetWriter2WithVersionBridge } from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';
import {
  deriveExactNameRelocations,
  deriveExpectedNodeNameDelta,
  evaluateWriter2BenchmarkPostimage,
  expectedTransferKeys,
} from './cii-workspace-multisource-texpected-oracle.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => fileURLToPath(new URL(`../Benchmark/${name}`, import.meta.url));
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({
  sourceId: `S${index + 1}`, fileName, bytes: readFileSync(benchmark(fileName)),
}));
const targetBytes = readFileSync(benchmark('T.CII'));
const targetText = readFileSync(benchmark('T.CII'), 'latin1');
const expectedText = readFileSync(benchmark('TEXPECTED-PARTIALLLYDONE.CII'), 'latin1');
const expectedDelta = deriveExpectedNodeNameDelta(targetText, expectedText);
const expectedKeys = expectedTransferKeys(expectedDelta.rows);
const expectedRelocations = deriveExactNameRelocations(expectedDelta.rows);

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
    const id = String(operation?.operationId || '').trim(); if (id && !byId.has(id)) byId.set(id, operation);
  }
  return byId;
}
function physicalTransferKey(operation) {
  const action = String(operation?.action || '').trim();
  const target = String(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId || '').trim();
  const value = String(action === 'CREATE' ? (operation?.proposed ?? operation?.sourceEvidence?.value)
    : (operation?.before ?? operation?.targetEvidence?.value) ?? '').trim();
  return `${action}|${target}|${value}`;
}
function canonicalPhysicalTransfer(preview) {
  const candidates = candidateOperations(preview.transferPlan);
  const canonical = ciiCanonicalWriter2MutationSelection([...candidates.values()]);
  const keys = canonical.appliedOperationIds.map((id) => physicalTransferKey(candidates.get(id))).sort();
  return Object.freeze({ canonical, keys: Object.freeze(keys) });
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
assert.equal(physical.keys.length, expectedKeys.length, 'Transfer tab physical APPLY row count must equal independent T→TEXPECTED benchmark count');
assert.deepEqual(physical.keys, [...expectedKeys], 'Transfer tab physical APPLY set must exactly equal independent T→TEXPECTED benchmark set');

const exactScope = await createCiiExpectedNodeNameSourceSetSelection(preview.transferPlan, { cryptoRef });
assert.equal(exactScope.authority.correspondenceCoverage.status, 'READY', 'all 329 BM-001 correspondence rows must be covered before Writer2 scope can bind');
assert.equal(exactScope.authority.correspondenceCoverage.missingRowNumbers.length, 0);
assert.equal(exactScope.appliedOperationIds.length, expectedKeys.length, 'bound scope APPLY cardinality must equal independent benchmark Transfer cardinality');
const scopedPreview = bindCiiTransferScopeToPreview(preview, exactScope.selection);
assert.equal(scopedPreview.writerReadiness.ready, true, `Writer2 readiness blocked: ${(scopedPreview.writerReadiness.blockers || []).join(',')}`);

const applied = await applyCiiWorkspaceTargetWriter2WithVersionBridge(scopedPreview, targetBytes, { cryptoRef });
assert.equal(applied.versionBridgeValidation.status, 'PASS');
const exactPostimage = evaluateWriter2BenchmarkPostimage(targetText, applied.byteString, expectedText);
const suffixDiagnostic = evaluateWriter2BenchmarkPostimage(targetText, applied.byteString, expectedText, { allowSuffixOnly: true });
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
  },
  bm001: exactScope.authority.correspondenceCoverage,
  compare: {
    exactStatus: exactPostimage.status,
    authorizedEncodingDifferences: exactPostimage.benchmark.nonSuffix.length,
    semanticDifferences: exactPostimage.semantics.nonSuffix.length,
    suffixOnlyDifferences: suffixDiagnostic.benchmark.suffixOnly.length,
    unrelatedTargetDifferences: exactPostimage.preservation.differences.length,
  },
  ownerCheckpointEvidence: checkpointDiagnostics(preview),
});
console.log(JSON.stringify(diagnostics, null, 2));

assert.equal(exactPostimage.preservation.status, 'READY', 'Writer2 output must preserve original T outside NODENAME authority');
assert.equal(exactPostimage.semantics.nonSuffix.length, 0, 'Writer2 NODENAME physical semantics must exactly match TEXPECTED');
assert.equal(exactPostimage.benchmark.nonSuffix.length, 0, 'Writer2-authorized CONTROL/pointer/NODENAME encoding must exactly match TEXPECTED');
assert.equal(exactPostimage.benchmark.suffixOnly.length, 0, 'final exact benchmark must retain every dotted suffix');
assert.equal(exactPostimage.status, 'READY', 'final retained Writer2 benchmark must be exact within authority and preserve original target elsewhere');

console.log('CII retained-real Auto Anchor -> Transfer -> Writer2 -> Compare benchmark passed.');

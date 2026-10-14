#!/usr/bin/env node
/** A0 authentic retained source-set replay; read-only: no writer or TARGET mutation. */
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {
  createCiiCommonAnalysisCache, createCiiWriter2SourceSetPreviewFromPreparedSession,
} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import { parseCiiMsBm001, CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256 } from '../tabs/cii-workspace/cii-workspace-multisource-nodename-authority.js';
import { deriveExpectedNodeNameDelta } from '../tests/cii-workspace-multisource-texpected-oracle.js';
import { partialExpectedNameMatch } from '../tests/cii-workspace-multisource-partial-texpected-oracle.js';
import { reconcileCiiSnapshot, compareCiiNodeCensuses } from './cii-architecture-snapshot-ledger.mjs';

const ROOT = fileURLToPath(new URL('../Benchmark/', import.meta.url));
const fixedSha = Object.freeze({
  'S1.CII': '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII': '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII': 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII': 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = Object.fromEntries(Object.keys(fixedSha).map((file) => {
  const bytes = readFileSync(new URL('../Benchmark/' + file, import.meta.url));
  assert.equal(sha256(bytes), fixedSha[file], 'original fixture SHA256 drifted: ' + file);
  return [file, bytes];
}));
const sources = [1, 2, 3].map((number) => ({
  sourceId: 'S' + number, fileName: 'S' + number + '.CII', bytes: raw['S' + number + '.CII'],
}));
const targetBytes = raw['T.CII'];
assert.equal(sha256(targetBytes), CII_MS_TARGET_SHA256);
const expectedBytes = readFileSync(new URL('../Benchmark/TEXPECTED-PARTIALLLYDONE.CII', import.meta.url));
const expectedRows = deriveExpectedNodeNameDelta(targetBytes.toString('latin1'), expectedBytes.toString('latin1')).rows;
assert.equal(expectedRows.length, 36, 'partial postimage must have 36 known-positive changes');
for (const [action, count] of [['REPLACE', 35], ['CREATE', 1], ['DELETE', 0]]) {
  assert.equal(expectedRows.filter((row) => row.action === action).length, count, action + ' retained oracle drift');
}
assert.equal(parseCiiMsBm001().length, 329, 'BM-001 is lexical oracle, not NODE census');

const { inspection, preparedSession } = await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII' }, { cryptoRef: webcrypto },
);
const automatic = Object.fromEntries((inspection?.memberInspections || []).map((member) => {
  const selection = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
  assert.equal(selection.status, 'READY', member.sourceId + ': independent automatic base required for A0 comparison');
  assert(selection.baseLoops.length > 0, member.sourceId + ': no selected automatic loops');
  return [member.sourceId, selection.baseLoops];
}));
assert.deepEqual(Object.keys(automatic).sort(), ['S1', 'S2', 'S3']);

const cache = createCiiCommonAnalysisCache();
const inputs = [
  Object.freeze({
    mode: 'AUTO_ONLY',
    input: Object.freeze({ baseLoopsBySource: automatic }),
    description: 'Retained default automatic bases, not the current screenshot manual configuration',
  }),
  Object.freeze({
    mode: 'UI_MIXED_BASE_PROXY',
    input: Object.freeze({
      baseLoopsBySource: { S1: automatic.S1 },
      anchorPairsBySource: {
        S2: [{ sourceNodeId: '420', targetNodeId: '415' }],
        S3: [{ sourceNodeId: '1580', targetNodeId: '7880' }],
      },
    }),
    description: 'Reconstructed base selection only: S1 auto and screenshot S2/S3 manual locks; not an exact restored review/session snapshot',
  }),
];
const results = [];

function approvedReview(preview) {
  return Object.fromEntries((preview?.memberPreviews || []).map(({ sourceId, preview: member }) => {
    const rows = member.compareReview?.rows || [];
    return [sourceId, {
      ...(member.review || {}),
      reviewedCorrespondenceIds: rows.filter((row) => row.identityBound && ['HIGH', 'MEDIUM'].includes(row.confidence)).map((row) => row.correspondenceId),
      lockedCorrespondenceIds: rows.filter((row) => row.decision === 'LOCKED').map((row) => row.correspondenceId),
      rejectedCorrespondenceIds: [],
    }];
  }));
}
async function take(mode, input) {
  const preview = await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession, input, {
    cryptoRef: webcrypto, commonAnalysisCache: cache,
  });
  assert.equal(preview.sourceSetSha256, CII_MS_SOURCE_SET_SHA256);
  assert.equal(preview.targetAuthority.originalSha256, CII_MS_TARGET_SHA256);
  const audit = buildCiiSourceTargetAudit(preview);
  assert.equal(audit.summary.totalSourceNodes, 150, mode + ' must enumerate physical 150 SOURCE nodes');
  const counts = Object.fromEntries(audit.summary.bySource.map((member) => [member.sourceId, member.enumeratedNodeCount]));
  assert.deepEqual(counts, { S1: 57, S2: 47, S3: 46 }, mode + ': exact physical SOURCE inventory mismatch');
  return { preview, audit, summary: reconcileCiiSnapshot(preview, audit, { mode }) };
}
for (const variant of inputs) {
  const discovery = await take(variant.mode + '_DISCOVERY', variant.input);
  const reviewed = await take(variant.mode + '_REVIEW_PROXY',
    { ...variant.input, reviewBySource: approvedReview(discovery.preview) });
  results.push(Object.freeze({
    mode: variant.mode,
    description: variant.description,
    selectedAutomaticBases: Object.keys(variant.input.baseLoopsBySource || {}).sort(),
    manualPairsBySource: variant.input.anchorPairsBySource || {},
    discovery: discovery.summary,
    reviewed: reviewed.summary,
  }));
}
const left = results[0], right = results[1];
const difference = compareCiiNodeCensuses(left.reviewed, right.reviewed);
// Compare action + physical TARGET first. An independent partial oracle may
// intentionally use an abbreviated family name; exact field-value equality
// alone must not be misreported as physical-mutation non-recovery.
const actionTargetKey = (nodeId, action) =>
  JSON.stringify([String(nodeId ?? ''), action === 'COPY' ? 'REPLACE' : String(action ?? '')]);
function goldenReconciliation(snapshot) {
  const actualByTarget = new Map(snapshot.mutation.canonicalOperations.map((row) =>
    [actionTargetKey(row.targetIdentity, row.originalAction), row]));
  const expectedKeys = new Set(expectedRows.map((row) => actionTargetKey(row.nodeId, row.action)));
  const actionTargetMatches = [];
  const missing = [];
  const beforeMismatch = [];
  for (const expected of expectedRows) {
    const key = actionTargetKey(expected.nodeId, expected.action);
    const candidate = actualByTarget.get(key);
    if (!candidate) { missing.push(key); continue; }
    if (candidate.before !== expected.oldValue) {
      beforeMismatch.push(Object.freeze({ key, expectedBefore: expected.oldValue, candidateBefore: candidate.before }));
      continue;
    }
    const compatibility = partialExpectedNameMatch(candidate.proposed, expected.newValue);
    actionTargetMatches.push(Object.freeze({
      key, valueCompatibility: compatibility.kind,
      valueCompatible: compatibility.match, proposedRawName: candidate.proposed, partialOracleName: expected.newValue,
    }));
  }
  const additional = [...actualByTarget.keys()].filter((key) => !expectedKeys.has(key)).sort();
  return Object.freeze({
    classification: 'PARTIAL_KNOWN_POSITIVE_ORACLE_NOT_COMPLETE_MAPPING',
    knownPositiveCount: expectedKeys.size,
    actionTargetMatchedCount: expectedKeys.size - missing.length,
    compatibleKnownPositiveCount: actionTargetMatches.filter((row) => row.valueCompatible).length,
    exactNameMatchedCount: actionTargetMatches.filter((row) => row.valueCompatibility === 'EXACT').length,
    familyOnlyNameCompatibleCount: actionTargetMatches.filter((row) => row.valueCompatibility === 'PARTIAL_EXPECTED_FAMILY').length,
    missingActionTargetKeys: missing.sort(),
    beforeValueMismatches: beforeMismatch,
    incompatibleValueEvidence: actionTargetMatches.filter((row) => !row.valueCompatible),
    additionalCandidateActionTargetKeysNotNecessarilyInvalid: additional,
  });
}
const report = {
  schema: 'CiiRetainedArchitectureA0Evidence.v1',
  createdFrom: 'AUTHENTIC_FROZEN_BENCHMARK_READ_ONLY_NODE_REPLAY',
  fixtureSha256: Object.fromEntries(Object.entries(raw).map(([file, bytes]) => [file, sha256(bytes)])),
  partialExpectedTargetSha256: sha256(expectedBytes),
  sourceSetSha256: CII_MS_SOURCE_SET_SHA256, targetOriginalSha256: CII_MS_TARGET_SHA256,
  knownPositivePostimage: { count: expectedRows.length, replace: 35, create: 1, delete: 0 },
  independentBm001LexicalRowCount: 329,
  modes: results,
  reviewedModeDifference: difference,
  exactPartialPostimageComparison: Object.fromEntries(results.map((result) => [
    result.mode, goldenReconciliation(result.reviewed),
  ])),
  limitations: [
    'NOT_OWNER_SESSION_EXACT_REVIEW_STATE', 'NO_ADDITIVE_AUTO_PLUS_MANUAL_RESOLUTION_ATTEMPTED',
    'NOT_PHYSICAL_CERTIFICATION', 'NO_SCOPE_BINDING_OR_WRITER_EXECUTION',
    'NO_AUTOMATIC_CORRECTION_OF_OWNER_LOCKS', 'NO_POSTIMAGE_OUTPUT_APPLIED',
  ],
};
const json = JSON.stringify(report, null, 2) + '\n';
const outFlag = process.argv.find((arg) => arg.startsWith('--out='));
if (outFlag) {
  const location = resolve(outFlag.slice('--out='.length));
  // Evidence destination only, never a Benchmark/ source or original TARGET.
  if (!outFlag.slice('--out='.length) || location.startsWith(ROOT)) throw new Error('A0_EVIDENCE_OUTPUT_MUST_NOT_BE_BENCHMARK');
  mkdirSync(dirname(location), { recursive: true });
  writeFileSync(location, json, 'utf8');
}
console.log(JSON.stringify({
  schema: report.schema, fixtureSha256: report.fixtureSha256,
  modes: results.map((item) => ({
    mode: item.mode, discovery: item.discovery.physicalNodeCensus.states,
    reviewed: item.reviewed.physicalNodeCensus.states,
    candidateByWriterFamily: item.reviewed.mutation.potentialByWriterFamily,
    correspondenceStatus: item.reviewed.correspondenceStatus,
    scope: item.reviewed.scope.state,
    bm001MatchedRows: item.reviewed.bm001Observation.matchedRows,
    knownPositiveActionTargetMatched: goldenReconciliation(item.reviewed).actionTargetMatchedCount,
    knownPositiveValueCompatible: goldenReconciliation(item.reviewed).compatibleKnownPositiveCount,
    knownPositiveExactName: goldenReconciliation(item.reviewed).exactNameMatchedCount,
    knownPositiveFamilyOnly: goldenReconciliation(item.reviewed).familyOnlyNameCompatibleCount,
  })),
  differingNodeAssignmentsBetweenModes: difference.differences.length,
  savedReport: outFlag ? resolve(outFlag.slice('--out='.length)) : 'NO_FILE_WRITE',
}, null, 2));

import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  canonicalCiiCommonAnalysisAuthorityPreimage,
  ciiCommonAnalysisAuthorityKey,
  ciiCommonAnalysisOptions,
} from '../tabs/cii-workspace/cii-workspace-common-analysis-key.js';

const cryptoRef = globalThis.crypto || webcrypto;
const hex = (char) => char.repeat(64);

function session(overrides = {}) {
  const source = {
    sourceId: 'SRC_A',
    fileName: 'source-a.cii',
    originalVersion: 14,
    normalizedVersion: 11,
    originalSha256: hex('b'),
    normalizedSha256: hex('c'),
    baselineCanonicalSha256: hex('d'),
    ...(overrides.source || {}),
  };
  const target = {
    fileName: 'target.cii',
    originalVersion: 14,
    normalizedVersion: 11,
    originalSha256: hex('e'),
    normalizedSha256: hex('f'),
    baselineCanonicalSha256: hex('1'),
    ...(overrides.target || {}),
  };
  return {
    schema: 'CIIWorkspacePreparedSourceSetSession.v1',
    status: 'PREPARED',
    sourceSetSha256: overrides.sourceSetSha256 || hex('a'),
    members: overrides.members || [
      source,
      {
        sourceId: 'SRC_B',
        fileName: 'source-b.cii',
        originalVersion: 11,
        normalizedVersion: 11,
        originalSha256: hex('2'),
        normalizedSha256: hex('2'),
        baselineCanonicalSha256: hex('2'),
      },
    ],
    target,
    versionBridge: {
      conversionSource: {
        repository: 'example/converter',
        commit: 'deadbeef',
        policy: 'FROZEN',
      },
    },
  };
}

const methodA = {
  method: 'METHOD_A_SPATIAL',
  baseId: 'A-1',
  anchorPairs: [
    { sourceNodeId: '30', targetNodeId: '300' },
    { sourceNodeId: '10', targetNodeId: '100' },
    { sourceNodeId: '20', targetNodeId: '200' },
  ],
  probePoints: [{ x: 5, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
};
const methodB = {
  method: 'METHOD_B_NETWORK',
  baseId: 'B-1',
  anchorPairs: [{ sourceNodeId: '40', targetNodeId: '400' }],
};

const baseArgs = {
  preparedSession: session(),
  sourceId: 'SRC_A',
  input: { baseLoops: [methodA, methodB] },
  options: {
    winnerGap: '8',
    odToleranceFactor: 2,
    engineeringGeometryToleranceMm: 0.01,
    registrationProbePoints: [{ x: 9, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
    writerVersion: '2',
    baseAnchorDisplayLimit: 5,
    methodAPhysicalCandidateLimit: 10,
    review: { reviewedCorrespondenceIds: ['ignored'] },
    instrumentation: { record() {} },
    bm001ExpectedRows: ['ignored'],
  },
};

const basePreimage = canonicalCiiCommonAnalysisAuthorityPreimage(baseArgs);
const baseKey = await ciiCommonAnalysisAuthorityKey(baseArgs, cryptoRef);
assert.match(baseKey, /^cii-common-analysis-v1:[0-9a-f]{64}$/);

// Explicit Method-A + Method-B loop order and anchor order are canonical.
const reordered = {
  ...baseArgs,
  input: {
    baseLoops: [
      { ...methodB },
      {
        ...methodA,
        anchorPairs: [...methodA.anchorPairs].reverse(),
        probePoints: [...methodA.probePoints].reverse(),
      },
    ],
  },
  options: {
    ...baseArgs.options,
    registrationProbePoints: [...baseArgs.options.registrationProbePoints].reverse(),
  },
};
assert.equal(
  canonicalCiiCommonAnalysisAuthorityPreimage(reordered),
  basePreimage,
  'loop/pair/probe order must not change the preimage',
);
assert.equal(await ciiCommonAnalysisAuthorityKey(reordered, cryptoRef), baseKey);

// Method aliases normalize.
const aliases = {
  ...baseArgs,
  input: {
    baseLoops: [
      { ...methodA, method: 'A' },
      { ...methodB, method: 'B' },
    ],
  },
};
assert.equal(await ciiCommonAnalysisAuthorityKey(aliases, cryptoRef), baseKey);

// Writer/review/transfer/display/oracle-only changes are excluded.
const excludedOnly = {
  ...baseArgs,
  input: {
    ...baseArgs.input,
    review: { reviewedCorrespondenceIds: ['x'], rejectedCorrespondenceIds: ['y'] },
    transferScope: { selectedOperationIds: ['op-1'] },
    texpected: [{ node: 'oracle-only' }],
    benchmark: 'BM-IGNORED',
  },
  options: {
    ...baseArgs.options,
    writerVersion: '1C',
    allowNodeNameOverwrite: true,
    baseAnchorDisplayLimit: 99,
    methodAPhysicalCandidateLimit: 24,
    baseAnchorSuggestionLimit: 1,
    instrumentation: { record() { throw new Error('must not be read'); } },
    cryptoRef: null,
    texpectedRows: ['oracle-only'],
    bm001ExpectedRows: ['oracle-only-2'],
  },
};
assert.equal(await ciiCommonAnalysisAuthorityKey(excludedOnly, cryptoRef), baseKey);

// Analysis-affecting option changes must change the key.
const changedWinnerGap = {
  ...baseArgs,
  options: { ...baseArgs.options, winnerGap: 9 },
};
assert.notEqual(await ciiCommonAnalysisAuthorityKey(changedWinnerGap, cryptoRef), baseKey);

// Numeric strings canonicalize to the same semantic value.
const numericNormalized = {
  ...baseArgs,
  options: { ...baseArgs.options, odToleranceFactor: '2', engineeringGeometryToleranceMm: '0.01' },
};
assert.equal(await ciiCommonAnalysisAuthorityKey(numericNormalized, cryptoRef), baseKey);

// A changed anchor pair changes authority.
const changedAnchor = {
  ...baseArgs,
  input: {
    baseLoops: [
      {
        ...methodA,
        anchorPairs: [
          { sourceNodeId: '10', targetNodeId: '100' },
          { sourceNodeId: '20', targetNodeId: '200' },
          { sourceNodeId: '30', targetNodeId: '301' },
        ],
      },
      methodB,
    ],
  },
};
assert.notEqual(await ciiCommonAnalysisAuthorityKey(changedAnchor, cryptoRef), baseKey);

// A changed sourceId or prepared-session custody changes the key.
assert.notEqual(
  await ciiCommonAnalysisAuthorityKey({ ...baseArgs, sourceId: 'SRC_B' }, cryptoRef),
  baseKey,
);
assert.notEqual(
  await ciiCommonAnalysisAuthorityKey({
    ...baseArgs,
    preparedSession: session({ sourceSetSha256: hex('9') }),
  }, cryptoRef),
  baseKey,
);
assert.notEqual(
  await ciiCommonAnalysisAuthorityKey({
    ...baseArgs,
    preparedSession: session({ target: { normalizedSha256: hex('8') } }),
  }, cryptoRef),
  baseKey,
);

// Prepared member order is irrelevant when custody and sourceId are unchanged.
const reorderedMembersSession = session();
reorderedMembersSession.members = [...reorderedMembersSession.members].reverse();
assert.equal(
  await ciiCommonAnalysisAuthorityKey({ ...baseArgs, preparedSession: reorderedMembersSession }, cryptoRef),
  baseKey,
);

// Independent USER_LOCKED manual seeds are order invariant.
const manual1 = {
  preparedSession: session(),
  sourceId: 'SRC_A',
  input: {
    anchorPairMode: 'INDEPENDENT_SEEDS',
    anchorPairs: [
      { sourceNodeId: '7', targetNodeId: '70' },
      { sourceNodeId: '5', targetNodeId: '50' },
      { sourceNodeId: '6', targetNodeId: '60' },
    ],
  },
  options: { winnerGap: 8 },
};
const manual2 = {
  ...manual1,
  input: { ...manual1.input, anchorPairs: [...manual1.input.anchorPairs].reverse() },
  options: { writerVersion: '1C', winnerGap: '8', baseAnchorDisplayLimit: 1 },
};
assert.equal(
  await ciiCommonAnalysisAuthorityKey(manual1, cryptoRef),
  await ciiCommonAnalysisAuthorityKey(manual2, cryptoRef),
);

// Independent manual seeds and legacy anchors are distinct authority modes.
const legacy = {
  ...manual1,
  input: { anchorPairs: manual1.input.anchorPairs },
};
assert.notEqual(
  await ciiCommonAnalysisAuthorityKey(manual1, cryptoRef),
  await ciiCommonAnalysisAuthorityKey(legacy, cryptoRef),
);

// Empty explicit base-loop authority is distinct from empty legacy authority.
const emptyLoops = { preparedSession: session(), sourceId: 'SRC_A', input: { baseLoops: [] }, options: {} };
const emptyLegacy = { preparedSession: session(), sourceId: 'SRC_A', input: {}, options: {} };
assert.notEqual(
  await ciiCommonAnalysisAuthorityKey(emptyLoops, cryptoRef),
  await ciiCommonAnalysisAuthorityKey(emptyLegacy, cryptoRef),
);

// Options helper exposes only the designed writer-independent allowlist.
const selectedOptions = ciiCommonAnalysisOptions({
  winnerGap: 8,
  engineeringMassTolerance: 1e-6,
  writerVersion: '2',
  baseAnchorDisplayLimit: 5,
  methodAPhysicalCandidateLimit: 10,
  arbitraryFutureUiOption: 'ignored',
});
assert.deepEqual(selectedOptions, {
  engineeringMassTolerance: 1e-6,
  winnerGap: 8,
});

// Custody failures are fail-closed.
assert.throws(
  () => canonicalCiiCommonAnalysisAuthorityPreimage({
    ...baseArgs,
    preparedSession: { ...session(), sourceSetSha256: 'bad' },
  }),
  /SOURCE_SET_SHA256_REQUIRED/,
);
assert.throws(
  () => canonicalCiiCommonAnalysisAuthorityPreimage({ ...baseArgs, sourceId: 'MISSING' }),
  /SOURCE_MEMBER_REQUIRED/,
);

console.log('CII deterministic common-analysis authority key checks: PASS');

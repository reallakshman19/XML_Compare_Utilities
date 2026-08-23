# PR1027 — Writer 2 partial H>1 HANGER physical compaction

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1026
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1026
PR: #1027
BRANCH: agent/cii-writer2-hanger-partial-physical
BASE_MAIN: ae1de402db129e32cd6d7811a4e4707d64512bd4
GROUNDING_EPOCH: GE-1027-002
CURRENT_STAGE: TARGET0_CRYPTOGRAPHIC_BYTE_CUSTODY_HARDENED_REVIEW_READY
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 is merged and its positional HANGER record-binding authority is consumed read-only.

## Current engineering transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ canonical BOUND transaction representation
  - operations[] present
  - excludedOperations[] present
  - mutable operations rows APPLY only
  - KEEP rows operations-only and KEEP only
  - excludedOperations rows mutable and EXCLUDE only
  - APPLY and EXCLUDE IDs disjoint
  - operation IDs globally unique across both containers
+ untouched TARGET0 original bytes
  - physical byte length verified
  - declared contentSha256 must be lowercase SHA-256
  - SHA-256 independently recomputed from original TARGET0 byte string
  - recomputed hash must equal targetDocument + transferPlan + transferScope target hashes
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix
   - preserve two default rows
   - repack exact retained raw I13 fields across five packed arrays
   - require exact active-fields-only packed source rows
   - preserve qualified INTERLEAVED/GROUPED HGRDAT/TAG/GUID order class
   - retain IHGRFREE by the same positional record map
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> independent complete-postimage reconstruction
-> exact final-byte equality
-> independently verify Writer mutation/record/scope/hash testimony
```

`countAfter == 0` remains the existing delete-all writer. Semantic authority remains `NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY`. Product/composite/UI partial HANGER remains blocked.

## Current batch — TARGET0 cryptographic byte custody

### Finding

Production intake already creates `contentSha256` from the exact physical bytes:

```text
tabs/cii-workspace/cii-workspace-intake.js
  intakeCiiWorkspaceDocument()
    -> createCiiPhysicalFile(rawInput)
    -> ciiPhysicalFileBytes(physicalFile)
    -> crypto.subtle.digest('SHA-256', bytes)
    -> document.contentSha256
```

Before this batch, the partial-HANGER component checked only equality among declared hash strings:

```text
transferPlan.targetDocument.contentSha256
transferScope.targetSha256
targetDocument.contentSha256
```

That proves testimony consistency, not byte identity. A forged caller-supplied BOUND object could make all three strings agree while the actual untouched TARGET0 bytes differed.

This is a component trust-boundary defect. The upstream intake implementation is unchanged.

### Synchronous byte-string SHA-256 primitive

New path:

```text
tabs/cii-workspace/cii-workspace-byte-sha256.js
```

Current implementation commit:

```text
3470e9871469fae1a2a13cbc916c6c328bd8168c
```

The primitive hashes the repository physical-file `originalByteString` representation one byte per code unit. This matches `cii-workspace-physical-file.js`, which creates that binary string from the original bytes using `String.fromCharCode` and reconstructs bytes with the low 8 bits.

API:

```text
sha256CiiByteString(byteString)
isCiiSha256Hex(value)
```

It is plain JavaScript and does not add Node-only production dependencies. Non-byte code units are rejected rather than truncated.

A transient setup commit `9168c5d7ee8a9ba978aaf76e1a1c1db94b7aa784` briefly created this path empty via the contents API. It was immediately superseded by `3470e987...`; current file content is the implemented SHA primitive.

### Writer TARGET0 gate

Commit:

```text
39e6770a70f284c0f36400425f19789e430fb9fa
CII: bind partial HANGER writer to TARGET0 byte hash
```

Before invoking the merged PR1025 planner, the Writer now requires:

```text
targetDocument.contentSha256
  -> lowercase 64-hex SHA-256

physicalFile.byteLength
  == originalByteString.length

targetDocument.byteLength, when present
  == originalByteString.length

actualSha256
  = SHA256(originalByteString bytes)

actualSha256
  == targetDocument.contentSha256
  == transferPlan.targetDocument.contentSha256
  == transferScope.targetSha256
```

Authority:

```text
SHA256_ORIGINAL_TARGET0_BYTES
```

Writer result testimony now includes:

```text
target0HashCustody = {
  authority: SHA256_ORIGINAL_TARGET0_BYTES,
  contentSha256: <recomputed digest>,
  byteLength: <untouched TARGET0 byte length>
}
```

### Independent validator TARGET0 gate

Commit:

```text
4d34f7699f46fd1025c3cba52ae16335dff87448
CII: independently rehash partial HANGER TARGET0 preimage
```

The validator independently recomputes SHA-256 from `before.physicalFile.originalByteString`, independently checks physical/document byte length, and independently requires the transfer-plan/scope target hashes to equal the recomputed digest.

The validator does not import or call the Writer's custody helper. It separately checks `writerResult.target0HashCustody` against its independently rebuilt custody object.

PASS checklist now includes:

```text
INDEPENDENT_TARGET0_SHA256
```

### SOURCE hash boundary

This batch deliberately does **not** claim independent SOURCE-byte rehash. The partial-HANGER component API receives TARGET0 physical bytes but not SOURCE physical bytes. SOURCE hash equality remains inherited BOUND-scope testimony from upstream intake. Reconstructing or inventing unavailable SOURCE bytes would weaken rather than strengthen custody.

## SHA qualification and F40-F45

New test path:

```text
tests/cii-workspace-byte-sha256.test.js
```

Commits:

```text
12eebcc1a2e7dbdd0f5c61f57f20ab2df2b16c66  standard-vector test authored
3c820eb73639c76be22c1cde824c911732728ea8  TARGET0 custody F40-F44
3652e38832f626755e1f99c308f94fe42b558682  F45 Writer hash testimony
```

Standard SHA-256 vectors included:

```text
""
  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

"abc"
  ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad

"The quick brown fox jumps over the lazy dog"
  d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592
```

Falsifiers:

```text
F40 CONSISTENTLY_FORGED_DECLARED_TARGET_HASHES
  all declared target hashes agree on a false 64-hex digest
  -> recomputed TARGET0 digest differs
  -> Writer + independent validator reject

F41 STALE_TARGET0_PHYSICAL_BYTES_WITH_OLD_DIGEST
  physical bytes drift while previous valid digest remains declared
  -> Writer + validator reject

F42 NON_SHA_PLACEHOLDER_TARGET_HASH
  placeholder such as target-sha
  -> not cryptographic custody
  -> Writer + validator reject

F43 PHYSICAL_BYTE_LENGTH_TESTIMONY_MISMATCH
  physicalFile.byteLength != originalByteString.length
  -> Writer + validator reject

F44 DOCUMENT_BYTE_LENGTH_TESTIMONY_MISMATCH
  document.byteLength, when present, != originalByteString.length
  -> Writer + validator reject

F45 FORGED_WRITER_TARGET0_HASH_TESTIMONY
  final CII bytes remain exactly correct but Writer target0HashCustody is forged
  -> independent validator rejects TARGET0_HASH_TESTIMONY_MISMATCH
```

Observation class:

```text
production intake SHA basis                         PASS_SOURCE_INSPECTION
SHA primitive source                                PASS_SOURCE_INSPECTION
standard vectors using equivalent local implementation PASS_EQUIVALENT_IMPLEMENTATION
exact committed SHA test runtime                    NOT_RUN_ENVIRONMENT
Writer TARGET0 gate                                 PASS_SOURCE_INSPECTION
independent validator TARGET0 gate                  PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F40-F45 source                                      AUTHORED / PASS_SOURCE_INSPECTION
F40-F45 exact current-head runtime                  NOT_RUN_ENVIRONMENT
```

No runtime PASS is inferred from source inspection or from the equivalent local vector calculation.

## Synthetic fixture migration

The stricter TARGET0 gate correctly makes labels such as `target-sha` invalid preimage authority. Existing synthetic H>1 fixtures that actually invoke the partial Writer were therefore migrated to hash their exact CRLF byte strings:

```text
54a8b52ff17eb577d4e3bc500cc4e2e5fdf13d92
  tests/cii-workspace-writer2-hanger-partial-physical.test.js

64d36923160fb4b76c095da53a57b7752f094094
  tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js

7458a8f700d0d982b01e4b0de4888a5ffdde5b53
  tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

The frozen-oracle test required no migration: it already computes the constructed TARGET0 hash independently with Node `crypto.createHash('sha256')`, compares it with frozen `target0Sha256`, and passes that actual digest into the preimage document.

Postimage test labels such as `post-sha` are not promoted to preimage authority; the current cryptographic gate is specifically TARGET0 custody before mutation.

## Retained authority from previous batches

Canonical BOUND operation-container custody remains:

```text
operations[] required
excludedOperations[] required
mutable operations -> APPLY only
KEEP operations -> KEEP only
excludedOperations -> mutable EXCLUDE only
KEEP forbidden in excludedOperations
PLAN APPLY ∩ EXCLUDE = empty
SCOPE APPLY ∩ EXCLUDE = empty
operationId globally unique across both containers
```

Production:

```text
4a9f2f7daf6b7c50f776a4b8ad569df76ada1106  Writer
c6fb4d2c1b8d415581eb14d876f4d84f7a70708b  independent validator
4def181b64e70b348bd3540d505765090ece02c2  F31-F39 extension
```

Packed-row source authority remains:

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
non-final packed row = exactly 2 + 6*13 bytes
final packed row     = exactly 2 + usedFields*13 bytes
trailing source bytes = 0
```

Real-source census remains:

```text
repository CII assets = 9
H=0 = 7
H=1 = 2
H>1 = 0
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

## Historical qualification retained at original observation class

```text
mandatory H=2/3/6/7/8/12/13 packing matrix     PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED/GROUPED representative cases        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 +12 preservation                        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
frozen independent postimage SHA oracles        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27 / F29-F30                               PASS / FAIL_CLOSED as recorded
F28 product/composite gate                      PASS_SOURCE_INSPECTION_AT_TIME
deleted-record testimony falsifier              PASS_FAIL_CLOSED_RECONSTRUCTED_AT_TIME
real BM_CII_SOURCE HANGER slice                 PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
F31-F39 scope/container suite source            PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
```

Historical PASS is not relabelled as current-head native execution.

## Changed-file ledger

Current intended Issue #1026 paths:

```text
agents/MASTER_INDEX.md
agents/PR1027_workreport.md
agents/claims/PR1027.yaml
agents/status/PR1027.yaml
docs/cii-writer2-hanger-partial-physical.md
docs/cii-writer2-hanger-real-source-census.csv
tabs/cii-workspace/cii-workspace-byte-sha256.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js
tests/cii-workspace-byte-sha256.test.js
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/cii-workspace-writer2-hanger-partial-scope-disjoint.test.js
tests/cii-workspace-writer2-hanger-real-source-census.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

Expected reconciliation:

```text
actual: 17
intended: 17
unexplained: 0
new paths this batch: 2
existing production paths hardened this batch: 2
existing test fixture paths migrated this batch: 3
intake changes: 0
physical-file changes: 0
upstream transfer-scope changes: 0
upstream HANGER planner changes: 0
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
protected parser/converter changes: 0
```

## Current validation truth

```text
production intake SHA basis                      PASS_SOURCE_INSPECTION
SHA primitive                                    PASS_SOURCE_INSPECTION
SHA exact committed standard-vector test          NOT_RUN_ENVIRONMENT
F40-F45                                          PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F31-F39                                          PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
synchronizer active-only emitter authority       PASS_SOURCE_INSPECTION
repository real-source census                    PASS_SOURCE_INSPECTION
real repository H>1 source                       NOT_AVAILABLE
real H>1 physical partial-delete roundtrip       NOT_RUN_NO_REAL_SOURCE
focused current-head native tests                NOT_RUN_ENVIRONMENT
full BM_CII_SOURCE exact intake/write/re-intake  NOT_RUN_ENVIRONMENT
broader Writer2/product integration              NOT_RUN_ENVIRONMENT
repository-wide npm test                         NOT_RUN_ENVIRONMENT
```

## Negative assurance

No new authority for:

```text
SOURCE-byte cryptographic rehash without SOURCE bytes
intake implementation mutation
physical-file representation mutation
transfer-scope builder mutation
merged HANGER planner mutation
product/core partial-HANGER apply
composite partial HANGER
UI execution
HANGER CREATE/value editing
HGRDAT engineering semantics
SIF CREATE
Writer3 topology
protected parser/converter mutation
package scripts
workflows
```

Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Review / merge disposition

```text
COMPONENT IMPLEMENTATION                    COMPLETE
INDEPENDENT VALIDATOR                       COMPLETE
TARGET0 CRYPTOGRAPHIC BYTE CUSTODY          HARDENED
F40-F45                                     AUTHORED / NOT_RUN_ENVIRONMENT
CANONICAL OPERATION-CONTAINER CUSTODY       HARDENED
F31-F39                                     AUTHORED / NOT_RUN_ENVIRONMENT
PACKED SOURCE-SHAPE AUTHORITY               QUALIFIED
REAL-SOURCE CENSUS                          COMPLETE
REAL H>1 SOURCE                             NOT_AVAILABLE
REAL H>1 ROUNDTRIP                          NOT_RUN_NO_REAL_SOURCE
CURRENT-HEAD NATIVE TEST EXECUTION          NOT_RUN_ENVIRONMENT
RUNTIME ADOPTION                            NONE / COMPONENT_ISOLATED
HANDOVER READINESS                          READY
REVIEW READINESS                            READY_WITH_EXPLICIT_EVIDENCE_LIMITATIONS
MERGE AUTHORITY                             OWNER_ONLY
MERGE AUTHORIZED                            FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Explain why equality among three declared SHA strings is not cryptographic proof of TARGET0 byte identity.
2. Derive the exact byte representation hashed by intake and show why `originalByteString` is a valid synchronous representation of the same bytes.
3. Explain F40 versus F41: consistently forged declared hash testimony versus stale physical bytes carrying a previously valid digest.
4. Explain why F45 is required even though exact final-byte equality is already the primary postimage oracle.
5. Explain why this batch does not claim independent SOURCE-byte rehash and why inventing SOURCE bytes would violate fail-closed custody.
6. Derive H=7 -> H'=6 and explain why all five packed families repack retained raw I13 fields instead of deleting one packed row per logical record.
7. Distinguish F31/F32 set overlap from F33-F39 physical operation-container contradictions.
8. Explain `SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY` and why it is stricter than merged PR1025 planner tolerance.
9. Explain why `semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY` must remain unchanged after cryptographic hardening.
10. State every current NOT_RUN/NOT_AVAILABLE evidence class that a takeover agent must not upgrade without execution/source evidence.

Threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single component stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production coding.
- 2026-08-22: physical partial writer, independent validator, mandatory matrix/falsifier tests and frozen postimage SHA oracles authored.
- 2026-08-23: deleted-record Writer testimony gap found, fixed and falsified.
- 2026-08-23: packed-row source shape narrowed fail-closed to active-fields-only using synchronizer emitter + real H=1 evidence.
- 2026-08-23: repository real-source census frozen; no H>1 source exists; future H>1 discovery became a qualification trigger.
- 2026-08-23: APPLY/EXCLUDE overlap and full operation-container custody hardened through F31-F39.
- 2026-08-23: TARGET0 declared-hash-only trust gap found; synchronous original-byte SHA-256 primitive added; Writer and independent validator now rehash TARGET0; synthetic Writer fixtures migrated to real digests; F40-F45 authored.

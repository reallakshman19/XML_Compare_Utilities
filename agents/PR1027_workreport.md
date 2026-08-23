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
CURRENT_STAGE: POSTIMAGE_CRYPTOGRAPHIC_BYTE_CUSTODY_HARDENED_REVIEW_READY
CURRENT_BLOCKER: NONE_FOR_COMPONENT_REVIEW
EVIDENCE_LIMITATION: NO_REAL_REPOSITORY_H_GT_1_CII_PREIMAGE
RUNTIME_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 component stack. PR1025 is merged and its positional HANGER record-binding authority is consumed read-only.

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
  - physical/document byte lengths verified
  - SHA-256 recomputed from exact original byte string
  - recomputed hash == target document == transfer-plan target == bound-scope target
  - authority = SHA256_ORIGINAL_TARGET0_BYTES
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix + 2 default rows
   - repack exact retained raw I13 fields across all five packed arrays
   - require active-fields-only packed source rows
   - preserve INTERLEAVED/GROUPED HGRDAT/TAG/GUID order class
   - retain IHGRFREE by positional record map
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> Writer SHA-256 final byteString
   - authority = SHA256_WRITER2_POSTIMAGE_BYTES
-> independent validator
   - independently rehash TARGET0
   - independently rebuild entire expected postimage
   - exact final-byte equality
   - independently rehash actual after.originalByteString
   - require after.contentSha256 and byte lengths match actual bytes
   - independently verify Writer mutation/record/scope/TARGET0/postimage testimony
```

`countAfter == 0` remains the existing delete-all writer. Semantic authority remains `NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY`. Product/composite/UI partial HANGER remains blocked.

# CURRENT BATCH — POSTIMAGE CRYPTOGRAPHIC BYTE CUSTODY

## Finding

Before this batch the validator already rebuilt the complete expected final CII and required exact byte equality. However the re-intaken `after` document's `contentSha256` and byte-length testimony were not bound to those physical bytes, and Writer result had no final digest custody object.

Therefore a byte-perfect `after.physicalFile.originalByteString` could carry a stale or forged `after.contentSha256` without failing validation. This is a custody/audit defect, not a physical-mutation defect.

## Writer hardening

Commit:

```text
b93835388b5f27c2044ecd20c91084c7a5f1b38c
CII: bind partial HANGER postimage SHA custody
```

Writer now computes:

```text
postimageHashCustody = {
  authority: SHA256_WRITER2_POSTIMAGE_BYTES,
  contentSha256: SHA256(final byteString),
  byteLength: final byteString.length
}
```

The hash is over the exact byte string produced by the one TARGET0 mutation pass. No reserialization is inserted between mutation and digest.

## Independent validator hardening

Commit:

```text
c2cd7bd114d09027feb3a413a7ec244751ba56e2
CII: independently validate partial HANGER postimage SHA
```

The validator independently requires:

```text
after.contentSha256 is lowercase 64-hex SHA-256
after.physicalFile.byteLength == after.originalByteString.length
after.byteLength, when present, == after.originalByteString.length
independentSha = SHA256(after.physicalFile.originalByteString)
after.contentSha256 == independentSha
writerResult.postimageHashCustody == independently rebuilt custody
```

PASS checklist now includes:

```text
INDEPENDENT_POSTIMAGE_SHA256
```

The validator does not import a Writer postimage-custody helper.

## F46-F50

SHA suite extension:

```text
09864fcb3df5c70146c8c093cfefdcb43a057c34
```

Cases:

```text
F46 FORGED_WELL_FORMED_POSTIMAGE_HASH
  actual bytes are correct
  after.contentSha256 is another valid 64-hex digest
  -> reject POSTIMAGE_SHA256_MISMATCH

F47 NON_SHA_POSTIMAGE_HASH_PLACEHOLDER
  after.contentSha256 = post-sha
  -> reject POSTIMAGE_SHA256_FORMAT_REQUIRED

F48 POSTIMAGE_PHYSICAL_BYTE_LENGTH_MISMATCH
  physicalFile.byteLength != actual byte-string length
  -> reject

F49 POSTIMAGE_DOCUMENT_BYTE_LENGTH_MISMATCH
  after.byteLength, when present, != actual byte-string length
  -> reject

F50 FORGED_WRITER_POSTIMAGE_HASH_TESTIMONY
  final bytes + after.contentSha256 remain correct
  Writer postimageHashCustody forged
  -> independent validator rejects POSTIMAGE_HASH_TESTIMONY_MISMATCH
```

F50 commit:

```text
cd6bd81105e00cf2513ae5d2cf9520501080161c
```

## Postimage fixture migration

Existing synthetic re-intake builders already know how to compute SHA-256 from exact byte strings. Legacy explicit labels were removed where validation consumes the `after` document:

```text
4b8d47abaaa7c9d3f7a3f5bc32da5f65d58bca48
  tests/cii-workspace-writer2-hanger-partial-physical.test.js

181a11da248286007f3b46e22803cdf2469232ef
  tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js

cd6bd81105e00cf2513ae5d2cf9520501080161c
  tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

The frozen postimage oracle remains untouched because it is an independent expected-final-SHA oracle, not a synthetic re-intake label.

## Current batch observation class

```text
Writer postimage hash source                   PASS_SOURCE_INSPECTION
independent validator postimage hash source    PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F46-F50 source                                 AUTHORED / PASS_SOURCE_INSPECTION
F46-F50 exact current-head runtime             NOT_RUN_ENVIRONMENT
```

No runtime PASS is inferred from source inspection.

# RETAINED HARDENING / AUTHORITY

## TARGET0 cryptographic custody — F40-F45

```text
3470e9871469fae1a2a13cbc916c6c328bd8168c  byte-string SHA-256 primitive
39e6770a70f284c0f36400425f19789e430fb9fa  Writer TARGET0 gate
4d34f7699f46fd1025c3cba52ae16335dff87448  independent validator TARGET0 rehash
3c820eb73639c76be22c1cde824c911732728ea8  F40-F44
3652e38832f626755e1f99c308f94fe42b558682  F45
```

Authority:

```text
SHA256_ORIGINAL_TARGET0_BYTES
```

SOURCE physical bytes are not supplied to the partial-HANGER component API; independent SOURCE-byte rehash is not claimed.

## Canonical BOUND operation-container custody — F31-F39

```text
4a9f2f7daf6b7c50f776a4b8ad569df76ada1106  Writer canonical-container gate
c6fb4d2c1b8d415581eb14d876f4d84f7a70708b  independent validator gate
4def181b64e70b348bd3540d505765090ece02c2  F31-F39 suite
```

Rules retained:

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

## Packed-row source authority

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
non-final packed row = exactly 2 + 6*13 bytes
final packed row     = exactly 2 + usedFields*13 bytes
trailing source bytes = 0
```

Source basis:

```text
converters/scripts/cii2019_hanger_miscel_control.py::_pack_i
Benchmark/CIICompare/BM_CII_SOURCE.CII
converters/scripts/inputxml_profile_bm_cii_2019.cii
```

Retained values are moved as exact original 13-byte I13 fields, never parse-and-reserialize.

## Real-source census

```text
repository CII assets = 9
H=0 = 7
H=1 = 2
H>1 = 0
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

First real H>1 discovery must trigger dedicated qualification; no synthetic case is represented as real-source evidence.

# HISTORICAL QUALIFICATION — ORIGINAL OBSERVATION CLASS ONLY

```text
mandatory H=2/3/6/7/8/12/13 packing matrix     PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED/GROUPED representative cases        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 +12 preservation                        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
frozen independent postimage SHA oracles        PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27 / F29-F30                               PASS / FAIL_CLOSED as recorded
F28 product/composite gate                      PASS_SOURCE_INSPECTION_AT_TIME
deleted-record testimony falsifier              PASS_FAIL_CLOSED_RECONSTRUCTED_AT_TIME
real BM_CII_SOURCE HANGER slice                 PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
F31-F39 source                                  PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F40-F45 source                                  PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
F46-F50 source                                  PASS_SOURCE_INSPECTION_TEST_AUTHORED_NOT_RUN
```

Historical PASS is not relabelled as current-head native execution.

# CHANGED-FILE LEDGER

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
new paths this batch: 0
production paths hardened this batch: 2
existing test paths changed this batch: 4
intake changes: 0
physical-file changes: 0
upstream transfer-scope changes: 0
upstream HANGER planner changes: 0
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
protected parser/converter changes: 0
```

# CURRENT VALIDATION TRUTH

```text
production intake SHA basis                       PASS_SOURCE_INSPECTION
SHA primitive                                     PASS_SOURCE_INSPECTION
Writer TARGET0 hash gate                          PASS_SOURCE_INSPECTION
validator TARGET0 hash gate                       PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
Writer postimage hash custody                     PASS_SOURCE_INSPECTION
validator postimage hash custody                  PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
SHA/F40-F50 exact committed runtime               NOT_RUN_ENVIRONMENT
F31-F39 exact committed runtime                   NOT_RUN_ENVIRONMENT
packed-tail integrated test                       NOT_RUN_ENVIRONMENT
real-source census test                           NOT_RUN_ENVIRONMENT
focused current-head native tests                 NOT_RUN_ENVIRONMENT
full BM_CII_SOURCE exact intake/write/re-intake   NOT_RUN_ENVIRONMENT
broader Writer2/product integration               NOT_RUN_ENVIRONMENT
repository-wide npm test                          NOT_RUN_ENVIRONMENT
real repository H>1 source                        NOT_AVAILABLE
real H>1 physical partial-delete roundtrip        NOT_RUN_NO_REAL_SOURCE
browser/product                                   NOT_APPLICABLE_UNCHANGED_ROUTE
```

# NEGATIVE ASSURANCE

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

# REVIEW / MERGE DISPOSITION

```text
COMPONENT IMPLEMENTATION                    COMPLETE
INDEPENDENT VALIDATOR                       COMPLETE
TARGET0 CRYPTOGRAPHIC BYTE CUSTODY          HARDENED
POSTIMAGE CRYPTOGRAPHIC BYTE CUSTODY        HARDENED
F40-F50                                     AUTHORED / NOT_RUN_ENVIRONMENT
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

1. Explain why equality among declared TARGET0 hashes is not proof of TARGET0 byte identity.
2. Explain why exact final-byte equality alone did not make `after.contentSha256` trustworthy before F46-F50.
3. Distinguish `SHA256_ORIGINAL_TARGET0_BYTES` from `SHA256_WRITER2_POSTIMAGE_BYTES` and state when each digest is computed.
4. Explain F46 versus F50: forged `after.contentSha256` versus forged Writer postimage testimony with correct `after` hash.
5. Explain why the validator must independently hash `after.physicalFile.originalByteString` rather than trust Writer `postimageHashCustody`.
6. Explain why SOURCE-byte rehash remains outside this component API.
7. Derive H=7 -> H'=6 and explain why all five packed families repack retained raw I13 fields.
8. Distinguish F31/F32 set overlap from F33-F39 operation-container contradictions.
9. Explain why `semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY` remains unchanged after cryptographic hardening.
10. State every current NOT_RUN / NOT_AVAILABLE evidence class that must not be upgraded without new evidence.

Threshold: 92/100 overall and each answer >=17/20.

# DURABLE HISTORY

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as the single component stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production coding.
- 2026-08-22: physical partial writer, independent validator, mandatory matrix/F01-F30 and frozen postimage SHA oracles authored.
- 2026-08-23: top-level deleted-record testimony gap found, fixed and falsified.
- 2026-08-23: packed-row source shape narrowed fail-closed to active-fields-only using emitter + real H=1 evidence.
- 2026-08-23: repository real-source census frozen; no H>1 source exists; future H>1 discovery became a qualification trigger.
- 2026-08-23: APPLY/EXCLUDE overlap and full operation-container custody hardened through F31-F39.
- 2026-08-23: TARGET0 declared-hash-only trust gap found; original-byte SHA-256 custody added through F40-F45.
- 2026-08-23: postimage declared-hash custody gap found; Writer final SHA testimony + independent after rehash added through F46-F50.

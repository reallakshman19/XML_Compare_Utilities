# CII Writer 2 — partial H>1 HANGER physical compaction

## Scope

Issue #1026 / PR #1027 qualifies the **component-level** physical transaction for deleting one or more existing HANGER records when:

```text
H > 1
0 < deleted records < H
H' > 0
layout = CAESAR_SYNCHRONIZER_IHGRNODE_FIRST
```

Planner/positional binding authority is inherited read-only from merged PR #1025 at `main@ae1de402db129e32cd6d7811a4e4707d64512bd4`.

No product/composite/UI partial-HANGER route is added. HANGER CREATE/value editing, SIF CREATE, Writer3 topology, protected parsers/converters, package scripts and workflows remain outside this PR.

## Governing record authority

A physical partial transaction requires:

```text
plannerPartialRecordAuthority = true
partialRecordCompactionAuthorized = true
recordBindingAuthority =
  PHYSICAL_ROW_SHAPE_PLUS_DUAL_EMITTER_ORDER+POSITIONAL_HANGER_ARRAY_RECORD_INDEX
semanticAuthority = NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY
```

Original record index `i` binds:

```text
IHGRNODE[i]
HGRDAT1/HGRDAT2 record i
TAG/GUID record i
IHGRFREE row i
IHGRNUM[i]
IHGRTABLE[i]
IHGRSHORT[i]
IHGRCN[i]
```

The writer relocates already-qualified physical records. It does not infer HGRDAT engineering semantics.

## Canonical BOUND transaction custody

A caller-supplied BOUND transaction is treated as untrusted component input even though the upstream `applyCiiTransferScope()` builder is canonical by construction.

Required representation:

```text
operations[]
  mutable rows -> scopeDecision = APPLY
  KEEP rows    -> scopeDecision = KEEP

excludedOperations[]
  mutable rows only -> scopeDecision = EXCLUDE

PLAN APPLY ∩ EXCLUDE = empty
SCOPE APPLY ∩ EXCLUDE = empty
operationId globally unique across both containers
```

Writer and independent validator enforce these rules separately. F31-F39 falsify overlap, wrong-container rows, wrong decisions, KEEP exclusion, missing containers, blank IDs and KEEP/mutable ID aliasing.

## Cryptographic byte custody model

PR1027 now has two distinct SHA-256 authorities around the one-pass physical mutation:

```text
TARGET0 before planning/mutation
  authority = SHA256_ORIGINAL_TARGET0_BYTES

Writer2 final postimage
  authority = SHA256_WRITER2_POSTIMAGE_BYTES
```

These authorities bind different byte states. Neither digest substitutes for the exact full-byte postimage oracle.

### TARGET0 cryptographic custody

Production intake computes `document.contentSha256` from `ciiPhysicalFileBytes(physicalFile)`, i.e. the exact original physical bytes.

Before planner execution Writer2 requires:

```text
targetDocument.contentSha256 is lowercase 64-hex SHA-256
physicalFile.byteLength == originalByteString.length
targetDocument.byteLength, when present, == originalByteString.length

actualTarget0Sha = SHA256(originalByteString bytes)

actualTarget0Sha == targetDocument.contentSha256
actualTarget0Sha == transferPlan.targetDocument.contentSha256
actualTarget0Sha == transferScope.targetSha256
```

Writer testimony:

```text
target0HashCustody = {
  authority: SHA256_ORIGINAL_TARGET0_BYTES,
  contentSha256: actualTarget0Sha,
  byteLength: originalByteString.length
}
```

The validator independently recomputes TARGET0 SHA-256 from `before.physicalFile.originalByteString` and checks Writer testimony only after rebuilding its own custody object.

F40-F45 cover consistent forged declared hashes, stale TARGET0 bytes, malformed digest labels, physical/document length contradictions, and forged Writer TARGET0 testimony.

### Postimage cryptographic custody

Exact postimage byte equality was already the primary physical acceptance criterion, but prior to the postimage hardening the re-intaken `after.contentSha256` and postimage length testimony were not themselves bound to the actual postimage bytes.

Writer now computes immediately from the final one-pass result:

```text
postimageHashCustody = {
  authority: SHA256_WRITER2_POSTIMAGE_BYTES,
  contentSha256: SHA256(final byteString),
  byteLength: final byteString.length
}
```

The independent validator separately requires:

```text
after.contentSha256 is lowercase 64-hex SHA-256
after.physicalFile.byteLength == after.originalByteString.length
after.byteLength, when present, == after.originalByteString.length

actualPostimageSha = SHA256(after.physicalFile.originalByteString)
after.contentSha256 == actualPostimageSha
writerResult.postimageHashCustody == independently rebuilt custody
```

The validator PASS checklist includes:

```text
INDEPENDENT_TARGET0_SHA256
INDEPENDENT_POSTIMAGE_SHA256
```

F46-F50 cover a forged but well-formed postimage digest, a non-SHA placeholder, physical/document postimage length contradictions, and forged Writer postimage testimony while the final bytes and declared `after` digest remain correct.

### SOURCE hash boundary

SOURCE physical bytes are not supplied to this component API. PR1027 therefore does **not** claim independent SOURCE-byte rehash. SOURCE hash equality remains inherited BOUND-scope testimony from upstream intake. Manufacturing surrogate SOURCE bytes merely to satisfy a local hash check would violate fail-closed custody.

## SHA implementation and qualification

Neutral production utility:

```text
tabs/cii-workspace/cii-workspace-byte-sha256.js
```

`sha256CiiByteString()` hashes the physical-file `originalByteString` representation one byte per JavaScript code unit and rejects code units greater than `0xff` rather than truncating them.

Standard vectors and adversarial custody tests are in:

```text
tests/cii-workspace-byte-sha256.test.js
```

Falsifiers:

```text
F40 CONSISTENTLY_FORGED_DECLARED_TARGET_HASHES
F41 STALE_TARGET0_PHYSICAL_BYTES_WITH_OLD_DIGEST
F42 NON_SHA_PLACEHOLDER_TARGET_HASH
F43 PHYSICAL_BYTE_LENGTH_TESTIMONY_MISMATCH
F44 DOCUMENT_BYTE_LENGTH_TESTIMONY_MISMATCH
F45 FORGED_WRITER_TARGET0_HASH_TESTIMONY
F46 FORGED_WELL_FORMED_POSTIMAGE_HASH
F47 NON_SHA_POSTIMAGE_HASH_PLACEHOLDER
F48 POSTIMAGE_PHYSICAL_BYTE_LENGTH_MISMATCH
F49 POSTIMAGE_DOCUMENT_BYTE_LENGTH_MISMATCH
F50 FORGED_WRITER_POSTIMAGE_HASH_TESTIMONY
```

Current observation class:

```text
production intake SHA basis                         PASS_SOURCE_INSPECTION
SHA utility source                                  PASS_SOURCE_INSPECTION
Writer TARGET0 hash gate                            PASS_SOURCE_INSPECTION
validator TARGET0 hash gate                         PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
Writer postimage hash custody                       PASS_SOURCE_INSPECTION
validator postimage hash custody                    PASS_SOURCE_INSPECTION_INDEPENDENT_IMPLEMENTATION
F40-F50 test source                                 AUTHORED / PASS_SOURCE_INSPECTION
exact committed SHA/F40-F50 runtime                 NOT_RUN_ENVIRONMENT
```

No runtime PASS is inferred from source inspection.

## One-TARGET0 physical transaction

The writer uses one untouched TARGET0 and constructs exactly two original-coordinate replacements:

```text
CONTROL_HANGER_COUNT
  CONTROL.NOHGRS: H -> H'

MISCEL_1_HANGER_PARTIAL_COMPACT_PAYLOAD
  complete HANGER-region reconstruction
```

Both preimages are checked and both replacements are applied in one splice pass. No sequential family writer chaining or downstream offset-adjust authority is used.

## Physical row model

```text
rrmatRows  = ceil(NUMELT / 6)
nozzleRows = NUMNOZ * 4
packedRows = ceil(H / 6)

hangerRows(H)
 = 2 + packedRows + 4*H + H + 4*packedRows
 = 2 + 5*H + 5*ceil(H/6)
```

MISCEL_1 order:

```text
RRMAT / VFLEX prefix
2 default hanger rows
IHGRNODE packed rows
HGRDAT / TAG / GUID envelope
IHGRFREE rows
IHGRNUM packed rows
IHGRTABLE packed rows
IHGRSHORT packed rows
IHGRCN packed rows
4 execution rows
```

## Exact raw-I13 repacking

Packed arrays:

```text
IHGRNODE
IHGRNUM
IHGRTABLE
IHGRSHORT
IHGRCN
```

Compaction is field repacking, not logical-row deletion. Every retained 13-byte field is copied lexically and all five families use the same retained-record sequence. A token such as `"          +12"` must remain byte-identical; numeric parse/reformat is not equivalent.

## Packed-row source-shape authority

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

Rule:

```text
non-final row length = 2 + 6*13 = 80 bytes
final row length     = 2 + usedFields*13 bytes
unused physical fields = omitted
extra trailing bytes = forbidden
```

Source basis:

```text
converters/scripts/cii2019_hanger_miscel_control.py::_pack_i
Benchmark/CIICompare/BM_CII_SOURCE.CII
converters/scripts/inputxml_profile_bm_cii_2019.cii
```

This physical-write authority is intentionally stricter than merged PR1025 planner tolerance.

## Tail-order and IHGRFREE preservation

Qualified HGRDAT/TAG/GUID forms:

```text
INTERLEAVED
GROUPED
```

The original order class is preserved. When H'=1, postimage order is `SINGLE_RECORD_ORDER_EQUIVALENT`; Writer testimony still records the qualified preimage order.

IHGRFREE is one physical row per HANGER record and retained rows follow the same `retainedRecordIndices` used by the tail and all five packed arrays.

## Delete-all boundary

The partial writer rejects `countAfter == 0`. That remains the unchanged delete-all writer path.

## Independent complete-postimage validator

The validator does not import or call partial Writer payload/repacking helpers. From TARGET0 + BOUND scope + merged planner authority it independently rebuilds:

```text
canonical operation-container custody
APPLY/EXCLUDE disjointness
TARGET0 SHA-256 custody
partial delete plan
record map
CONTROL replacement
all five raw-I13 packed arrays
HGRDAT/TAG/GUID retained rows
IHGRFREE retained rows
complete MISCEL_1
complete final CII byte string
postimage SHA-256 custody
```

Primary physical acceptance criterion remains:

```text
actual final bytes === independently reconstructed expected final bytes
```

Cryptographic postimage custody additionally proves the `after` document hash/length metadata and Writer final-digest testimony refer to those same bytes. Writer testimony remains secondary evidence.

## Synthetic fixture hash migration

Synthetic tests that call the partial Writer now derive TARGET0 hashes from exact CRLF byte strings. Re-intaken postimages used by validator tests likewise derive `contentSha256` from the exact postimage bytes rather than labels such as `post-sha` or `tampered-post`.

Affected suites:

```text
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
```

The frozen-oracle test remains unchanged: its independent expected-final-SHA oracle is a separate qualification mechanism and already uses Node `crypto.createHash('sha256')` for its frozen comparisons.

## Real repository source census

Frozen ledger:

```text
docs/cii-writer2-hanger-real-source-census.csv
```

Current evidence:

```text
repository CII assets = 9
NOHGRS=0 = 7
NOHGRS=1 = 2
NOHGRS>1 = 0
```

Therefore:

```text
REAL_REPOSITORY_H_GT_1_CII_SOURCE = NOT_AVAILABLE
REAL_H_GT_1_PARTIAL_DELETE_ROUNDTRIP = NOT_RUN_NO_REAL_SOURCE
```

The census test fails with `REAL_H_GT_1_HANGER_SOURCE_DISCOVERED_REQUIRES_QUALIFICATION` when the first real H>1 source appears.

## Current evidence boundary

Historical reconstructed evidence retains its original classification; it is not relabelled as current-head native PASS.

```text
F40-F50 exact runtime                              NOT_RUN_ENVIRONMENT
F31-F39 exact runtime                              NOT_RUN_ENVIRONMENT
packed-tail integrated test                        NOT_RUN_ENVIRONMENT
real-source census test                            NOT_RUN_ENVIRONMENT
focused current-head native tests                  NOT_RUN_ENVIRONMENT
full BM_CII_SOURCE exact intake/roundtrip          NOT_RUN_ENVIRONMENT
broader Writer2/product regression                 NOT_RUN_ENVIRONMENT
repository-wide npm test                           NOT_RUN_ENVIRONMENT
real repository H>1 source                         NOT_AVAILABLE
real H>1 physical roundtrip                        NOT_RUN_NO_REAL_SOURCE
```

## Product/runtime boundary

The partial Writer and validator remain component-isolated. Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Release disposition

```text
component implementation                    COMPLETE
independent complete-postimage design        COMPLETE
TARGET0 cryptographic byte custody           HARDENED
postimage cryptographic byte custody         HARDENED
canonical operation-container custody        HARDENED
packed source-shape authority                QUALIFIED
real HANGER source census                    COMPLETE
real H>1 repository source                   NOT_AVAILABLE
real H>1 roundtrip evidence                  NOT_RUN_NO_REAL_SOURCE
current-head native execution                NOT_RUN_ENVIRONMENT
runtime product adoption                     NONE
merge authority                              OWNER_ONLY
merge authorized                             FALSE
```

Do not merge without fresh owner authorization.
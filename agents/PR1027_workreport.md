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
CURRENT_STAGE: PACKED_SOURCE_SHAPE_HARDENED_REVIEW_PENDING
CURRENT_BLOCKER: NONE_FOR_SOURCE_REVIEW
REMAINING_LIMITATION: CURRENT_HEAD_NATIVE_EXECUTION_NOT_AVAILABLE
```

PR1027 remains the single Issue #1026 stack. PR1025 planner/record-binding authority is merged and consumed read-only.

## Current component transaction

```text
qualified merged-PR1025 partial H>1 HANGER plan
+ untouched TARGET0
-> CONTROL.NOHGRS H -> H'
-> complete MISCEL_1 reconstruction
   - preserve RRMAT/VFLEX prefix bytes
   - preserve two default rows
   - repack exact raw I13 fields across five packed families
   - require source packed rows to match active-fields-only physical shape
   - retain HGRDAT/TAG/GUID in qualified original order class
   - retain IHGRFREE by the same positional record sequence
   - preserve four execution rows
-> apply exactly two original-coordinate replacements once
-> independent complete-postimage reconstruction
-> exact final-byte equality
```

`countAfter == 0` remains the existing delete-all writer path. Semantic authority remains `NONE_POSITIONAL_PHYSICAL_CUSTODY_ONLY`.

## Batch finding — packed-row unused-field authority

Issue #1026 requires the last packed row's unused-field representation to be source-qualified and deterministic.

Merged PR1025 planner parsing was broader than the physical writer should be: its trailing-data check can tolerate whitespace-only bytes after the active fields. PR1027 previously rebuilt post rows as active fields only but did not explicitly prove that source shape.

The source authority was traced to two independent repository sources.

### Source A — synchronizer emitter

`converters/scripts/cii2019_hanger_miscel_control.py` defines:

```python
def _format_i(values):
    return "  " + "".join(f"{int(value):13d}" for value in values)

def _pack_i(values, width=6):
    return [_format_i(values[index:index + width])
            for index in range(0, len(values), width)]
```

The final chunk therefore contains only active values.

### Source B — real vendor benchmark

`Benchmark/CIICompare/BM_CII_SOURCE.CII` H=1 MISCEL_1 shows active-only packed rows:

```text
IHGRNODE = 205
IHGRNUM / IHGRTABLE / IHGRSHORT / IHGRCN = one active I13 each
unused padded I13 slots = absent
```

Qualified physical authority:

```text
SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY
```

For every source packed row:

```text
non-final row length = 2 + 6*13 = 80 bytes
final row length     = 2 + usedFields*13 bytes
extra trailing bytes = 0
```

Spaces, tabs and arbitrary trailing bytes are not silently normalized. The physical writer fails closed even where the merged planner had sufficient positional custody to continue planning.

## Batch production changes

### Writer

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js`

- exports `CII_WRITER_2_HANGER_PACKED_TAIL_AUTHORITY = SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY`;
- validates the exact active-only length of **every** packed source row for all five families;
- still copies each retained raw 13-byte field lexically;
- emits active fields only in every post packed row;
- records `packedTailAuthority` in writer testimony.

Relevant batch commits:

```text
b4afb09ce82e614b27e28fa7ced0d7df04f631f8
  initial packed-row tail custody gate

ec86dea37b40ca04ced47e769cd42fd5932bea88
  fail closed on unqualified packed-row padding
```

### Independent validator

`tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js`

- defines the active-only authority locally; it does not import the writer constant;
- independently derives expected row count and exact source row length;
- independently reconstructs active-only post rows;
- exact final-byte equality still remains the primary oracle;
- separately rejects forged `packedTailAuthority` testimony.

Relevant batch commits:

```text
26e527df52da7d77930b424cd983bf1585ad987e
  initial independent packed-tail validation

d0159b06d22b7f727e58225b9266980efac17838
  independently enforce active-only packed rows
```

### Integrated qualification test

```text
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
```

Current test basis is commit:

```text
4cd43b7bb698669d2e70021da1f3aeab00bc1e01
```

It exercises as one coherent suite:

- H=8 active-only source, delete record2 -> H'=7; all five final rows become `2X + 1*I13`;
- H=6 full six-field row, delete record1 -> H'=5; all five final rows become `2X + 5*I13`;
- all five families reject planner-tolerated space padding at the physical writer gate;
- tab padding rejects fail-closed;
- forged `packedTailAuthority` rejects;
- postimage padding reintroduced after writing rejects via exact-byte equality.

## Runtime observation class for this batch

The execution container still cannot resolve `github.com`, and no native private-repository checkout can be created. No PR-triggered engineering workflow is available.

Therefore the new packed-source-shape batch is classified:

```text
SOURCE_AUTHORITY_AUDITED
PRODUCTION_SOURCE_AUDITED
INDEPENDENT_VALIDATOR_SOURCE_AUDITED
INTEGRATED_TEST_AUTHORED
CURRENT_HEAD_RUNTIME: NOT_RUN_ENVIRONMENT
```

Do **not** infer runtime PASS for the current packed-shape head.

## Previously established qualification

Before the packed-source-shape production changes, the following passed under explicit reconstructed-source observation classes:

```text
frozen independent TARGET0/final SHA oracles       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
mandatory H=2/3/6/7/8/12/13 matrix                 PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
INTERLEAVED representative cases                   PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
GROUPED representative cases                       PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
raw-I13 lexical +12 preservation                    PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
independent complete-postimage validator           PASS_RECONSTRUCTED_DEPENDENCY_CLOSURE
F01-F27                                             PASS / FAIL_CLOSED as expected
F28 product/composite gate                         PASS_SOURCE_INSPECTION_CURRENT_HEAD_AT_TIME
F29-F30                                             PASS
pre-merge deleted-record testimony falsifier       PASS_FAIL_CLOSED_RECONSTRUCTED_CURRENT_HEAD_SOURCE_AT_TIME
inherited planner/delete-all regression             PASS_RECONSTRUCTED_CURRENT_HEAD_SOURCE_AT_TIME
real BM_CII_SOURCE HANGER slice                    PASS_RECONSTRUCTED_BENCHMARK_HANGER_SLICE
```

These historical results are retained with their original observation class; they are not relabelled as execution of the new packed-shape head.

## Earlier pre-merge testimony defect

The 2026-08-23 review audit found that top-level writer `deletedRecordIndices` testimony was not separately checked.

Fixed at:

```text
8ea0c9dfd2f09ccac0b5bdb6ec0e5c05ab5bea84
```

Dedicated falsifier:

```text
172467f96f4f417dc2639adeec2a5d8ba558fa61
```

Observed result: valid H=3 delete-record2 PASS; forged top-level deleted-record testimony FAIL_CLOSED.

## Changed-file ledger

Current intended Issue #1026 paths:

```text
agents/MASTER_INDEX.md
agents/PR1027_workreport.md
agents/claims/PR1027.yaml
agents/status/PR1027.yaml
docs/cii-writer2-hanger-partial-physical.md
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-validation.js
tabs/cii-workspace/cii-workspace-writer2-hanger-partial-write.js
tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js
tests/cii-workspace-writer2-hanger-partial-frozen-oracle.test.js
tests/cii-workspace-writer2-hanger-partial-packed-tail.test.js
tests/cii-workspace-writer2-hanger-partial-physical.test.js
tests/fixtures/cii-writer2-hanger-partial-postimage-oracles.json
```

Expected reconciliation:

```text
actual: 12
intended: 12
unexplained: 0
workflow changes: 0
package.json changes: 0
product/composite/UI route changes: 0
```

## Explicit NOT_RUN

```text
new packed-row active-only qualification suite on exact PR1027 checkout
all focused PR1027 tests on a native exact checkout after this batch
full-file BM_CII_SOURCE.CII intake -> write -> re-intake
broader Writer2/product integration regression
repository-wide npm test
```

## Negative assurance

No new authority for product/core partial-HANGER apply, composite partial HANGER, UI execution, HANGER CREATE/value editing, HGRDAT semantics, SIF CREATE, Writer3 topology, protected parsers/converters, package scripts or workflows.

Existing product/composite partial HANGER remains blocked by `WRITER_2_HANGER_DELETE_ALL_SCOPE_REQUIRED`.

## Review / merge disposition

```text
COMPONENT IMPLEMENTATION                    COMPLETE
PACKED SOURCE-SHAPE AUTHORITY               QUALIFIED
PACKED SOURCE-SHAPE IMPLEMENTATION          COMPLETE
PACKED SOURCE-SHAPE INTEGRATED TEST         AUTHORED / NOT_RUN_ENVIRONMENT
INDEPENDENT VALIDATOR DESIGN                COMPLETE
RUNTIME ADOPTION                            NONE / COMPONENT_ISOLATED
HANDOVER READINESS                          READY
REVIEW READINESS                            READY_WITH_CURRENT_HEAD_NOT_RUN_LIMITATION
MERGE AUTHORITY                             OWNER_ONLY
MERGE AUTHORIZED                            FALSE
```

Do not merge without fresh owner authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

1. Explain why retained I13 fields are copied lexically and derive H=7->6.
2. Derive GROUPED H=3 delete-record2 HGRDAT/TAG/GUID retention.
3. Explain why `SYNCHRONIZER_PACK_I_ACTIVE_FIELDS_ONLY` is stricter than PR1025 planner tolerance, citing both emitter and real benchmark evidence.
4. Explain how writer and validator independently reject source padding, post padding and forged packed-tail testimony.
5. Explain why countAfter==0 remains delete-all and product/composite partial HANGER remains blocked.

Threshold: 92/100 overall and each answer >=17/20.

## Durable history

- 2026-08-22: Issue #1026 grounded; PR1027 allocated as single stack.
- 2026-08-22: PR1025 merged at `ae1de402...`; PR1027 re-grounded before production code.
- 2026-08-22: component writer, independent validator, packing/falsifier tests and frozen SHA oracles authored.
- 2026-08-22: frozen-oracle target-hash harness defect fixed without weakening production.
- 2026-08-22/23: packing matrix, F01-F30 coverage and predecessor slices qualified under explicit observation classes.
- 2026-08-23: top-level deleted-record testimony gap found, fixed and directly falsified.
- 2026-08-23: next hardening batch traced packed-row source shape to synchronizer `_pack_i()` and real `BM_CII_SOURCE.CII`; writer and independent validator narrowed physical authority to exact active-only rows; integrated qualification test added; current-head execution remains NOT_RUN_ENVIRONMENT.
